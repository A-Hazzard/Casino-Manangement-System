require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

/**
 * Performance Testing: Dashboard API Query Approaches
 * 
 * Compares different querying strategies for the /api/dashboard/totals endpoint:
 * 1. Current approach (sequential location processing)
 * 2. Parallel batch processing
 * 3. Single aggregation pipeline
 * 
 * Run with: node scripts/performance/test-dashboard-api-approaches.js
 */

const CONFIG = {
  TEST_LOCATIONS_LIMIT: 50, // Test with subset for faster iterations
  ITERATIONS: 3,
  TIME_PERIOD: 'Today',
  BATCH_SIZE: 20,
};

// Helper to get time range for Today with gaming day offset
function getTodayRange(gameDayOffset = 8) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(gameDayOffset, 0, 0, 0);
  
  if (now.getHours() < gameDayOffset) {
    startOfDay.setDate(startOfDay.getDate() - 1);
  }
  
  return { start: startOfDay, end: now };
}

// APPROACH 1: Current Sequential Processing (SLOW)
async function currentSequentialApproach(db, locations) {
  let totalMoneyIn = 0;
  let totalMoneyOut = 0;
  let totalGross = 0;
  
  // Process each location sequentially (current implementation)
  for (const location of locations) {
    const locationId = location._id.toString();
    const gameDayOffset = location.gameDayOffset || 8;
    const timeRange = getTodayRange(gameDayOffset);
    
    // Get machines for this location
    const machines = await db.collection('machines')
      .find({
        gamingLocation: locationId,
        $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
      }, { projection: { _id: 1 } })
      .toArray();
    
    if (machines.length === 0) continue;
    
    const machineIds = machines.map(m => m._id);
    
    // Get meter data for these machines
    const metricsResult = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: machineIds },
          readAt: { $gte: timeRange.start, $lte: timeRange.end },
        },
      },
      {
        $group: {
          _id: null,
          totalDrop: { $sum: '$movement.drop' },
          totalCancelled: { $sum: '$movement.totalCancelledCredits' },
        },
      },
    ]).toArray();
    
    const metrics = metricsResult[0] || { totalDrop: 0, totalCancelled: 0 };
    
    totalMoneyIn += metrics.totalDrop;
    totalMoneyOut += metrics.totalCancelled;
    totalGross += (metrics.totalDrop - metrics.totalCancelled);
  }
  
  return {
    moneyIn: totalMoneyIn,
    moneyOut: totalMoneyOut,
    gross: totalGross,
  };
}

// APPROACH 2: Parallel Batch Processing (OPTIMIZED)
async function parallelBatchApproach(db, locations) {
  const results = [];
  const BATCH_SIZE = CONFIG.BATCH_SIZE;
  
  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(async (location) => {
        const locationId = location._id.toString();
        const gameDayOffset = location.gameDayOffset || 8;
        const timeRange = getTodayRange(gameDayOffset);
        
        // Fetch machines and meters in parallel
        const [machines, metricsResult] = await Promise.all([
          db.collection('machines')
            .find({
              gamingLocation: locationId,
              $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
            }, { projection: { _id: 1 } })
            .toArray(),
          
          (async () => {
            const machineIds = await db.collection('machines')
              .find({ gamingLocation: locationId }, { projection: { _id: 1 } })
              .toArray()
              .then(docs => docs.map(d => d._id));
            
            if (machineIds.length === 0) {
              return [{ totalDrop: 0, totalCancelled: 0 }];
            }
            
            return db.collection('meters').aggregate([
              {
                $match: {
                  machine: { $in: machineIds },
                  readAt: { $gte: timeRange.start, $lte: timeRange.end },
                },
              },
              {
                $group: {
                  _id: null,
                  totalDrop: { $sum: '$movement.drop' },
                  totalCancelled: { $sum: '$movement.totalCancelledCredits' },
                },
              },
            ]).toArray();
          })(),
        ]);
        
        const metrics = metricsResult[0] || { totalDrop: 0, totalCancelled: 0 };
        
        return {
          moneyIn: metrics.totalDrop,
          moneyOut: metrics.totalCancelled,
          gross: metrics.totalDrop - metrics.totalCancelled,
        };
      })
    );
    
    results.push(...batchResults);
  }
  
  // Sum all results
  return results.reduce(
    (acc, curr) => ({
      moneyIn: acc.moneyIn + curr.moneyIn,
      moneyOut: acc.moneyOut + curr.moneyOut,
      gross: acc.gross + curr.gross,
    }),
    { moneyIn: 0, moneyOut: 0, gross: 0 }
  );
}

// APPROACH 3: Single Aggregation (if possible with uniform gaming day offset)
async function singleAggregationApproach(db, locations) {
  // NOTE: This approach assumes all locations have the same gaming day offset
  // In reality, this may not be accurate if locations have different offsets
  const locationIds = locations.map(loc => loc._id.toString());
  const timeRange = getTodayRange(8); // Assumes 8 AM for all
  
  const result = await db.collection('gaminglocations').aggregate([
    { $match: { _id: { $in: locationIds } } },
    {
      $lookup: {
        from: 'machines',
        let: { locationId: { $toString: '$_id' } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$gamingLocation', '$$locationId'] },
              $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
            },
          },
        ],
        as: 'machines',
      },
    },
    {
      $addFields: {
        machineIds: { $map: { input: '$machines', as: 'm', in: '$$m._id' } },
      },
    },
    {
      $lookup: {
        from: 'meters',
        let: { machineIds: '$machineIds' },
        pipeline: [
          {
            $match: {
              $expr: { $in: ['$machine', '$$machineIds'] },
              readAt: { $gte: timeRange.start, $lte: timeRange.end },
            },
          },
          {
            $group: {
              _id: null,
              totalDrop: { $sum: '$movement.drop' },
              totalCancelled: { $sum: '$movement.totalCancelledCredits' },
            },
          },
        ],
        as: 'metersData',
      },
    },
    {
      $group: {
        _id: null,
        moneyIn: { $sum: { $ifNull: [{ $arrayElemAt: ['$metersData.totalDrop', 0] }, 0] } },
        moneyOut: { $sum: { $ifNull: [{ $arrayElemAt: ['$metersData.totalCancelled', 0] }, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        moneyIn: 1,
        moneyOut: 1,
        gross: { $subtract: ['$moneyIn', '$moneyOut'] },
      },
    },
  ], { allowDiskUse: true }).toArray();
  
  return result[0] || { moneyIn: 0, moneyOut: 0, gross: 0 };
}

// Test runner
async function runTest(testName, testFn, db, locations) {
  const start = Date.now();
  const results = await testFn(db, locations);
  const duration = Date.now() - start;
  
  return {
    testName,
    duration,
    results,
    avgPerLocation: (duration / locations.length).toFixed(2),
  };
}

// Main
async function main() {
  console.log('\n🚀 Dashboard API Performance Testing\n');
  console.log(`Config: ${CONFIG.TEST_LOCATIONS_LIMIT} locations, ${CONFIG.ITERATIONS} iterations\n`);
  
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Get test locations with gameDayOffset
    const locations = await db.collection('gaminglocations')
      .find({
        $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
      }, { projection: { _id: 1, gameDayOffset: 1 } })
      .limit(CONFIG.TEST_LOCATIONS_LIMIT)
      .toArray();
    
    console.log(`✅ Testing with ${locations.length} locations\n`);
    
    const allResults = {
      current: [],
      parallel: [],
      aggregation: [],
    };
    
    // Test each approach
    for (let i = 0; i < CONFIG.ITERATIONS; i++) {
      console.log(`\n━━━ Iteration ${i + 1}/${CONFIG.ITERATIONS} ━━━\n`);
      
      // Current sequential approach
      console.log('Testing: Current Sequential Processing...');
      const currentResult = await runTest('Current Sequential', currentSequentialApproach, db, locations);
      allResults.current.push(currentResult);
      console.log(`  ⏱️  ${currentResult.duration}ms (${currentResult.avgPerLocation}ms/loc)`);
      console.log(`  💰 MoneyIn: $${currentResult.results.moneyIn.toFixed(2)}\n`);
      
      // Parallel batch processing
      console.log('Testing: Parallel Batch Processing...');
      const parallelResult = await runTest('Parallel Batching', parallelBatchApproach, db, locations);
      allResults.parallel.push(parallelResult);
      console.log(`  ⏱️  ${parallelResult.duration}ms (${parallelResult.avgPerLocation}ms/loc)`);
      console.log(`  💰 MoneyIn: $${parallelResult.results.moneyIn.toFixed(2)}\n`);
      
      // Single aggregation
      console.log('Testing: Single Aggregation Pipeline...');
      const aggregationResult = await runTest('Single Aggregation', singleAggregationApproach, db, locations);
      allResults.aggregation.push(aggregationResult);
      console.log(`  ⏱️  ${aggregationResult.duration}ms (${aggregationResult.avgPerLocation}ms/loc)`);
      console.log(`  💰 MoneyIn: $${aggregationResult.results.moneyIn.toFixed(2)}\n`);
      
      console.log(`  ⚠️  NOTE: Aggregation may differ if locations have different gameDayOffsets`);
    }
    
    // Calculate averages
    const avgCurrent = allResults.current.reduce((sum, r) => sum + r.duration, 0) / CONFIG.ITERATIONS;
    const avgParallel = allResults.parallel.reduce((sum, r) => sum + r.duration, 0) / CONFIG.ITERATIONS;
    const avgAggregation = allResults.aggregation.reduce((sum, r) => sum + r.duration, 0) / CONFIG.ITERATIONS;
    
    // Results
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(80));
    console.log(`\n1. Current Sequential Processing: ${avgCurrent.toFixed(2)}ms avg`);
    console.log(`2. Parallel Batch Processing:     ${avgParallel.toFixed(2)}ms avg`);
    console.log(`3. Single Aggregation Pipeline:   ${avgAggregation.toFixed(2)}ms avg`);
    
    // Find fastest
    const fastest = Math.min(avgCurrent, avgParallel, avgAggregation);
    let winner = '';
    if (fastest === avgCurrent) winner = 'Current Sequential Processing';
    else if (fastest === avgParallel) winner = 'Parallel Batch Processing';
    else winner = 'Single Aggregation Pipeline';
    
    console.log(`\n🏆 FASTEST: ${winner} (${fastest.toFixed(2)}ms)`);
    
    // Calculate speedup
    const speedupVsCurrent = (avgCurrent / fastest).toFixed(2);
    if (fastest !== avgCurrent) {
      console.log(`\n🚀 SPEEDUP: ${speedupVsCurrent}x faster than current implementation`);
      console.log(`   Time saved: ${(avgCurrent - fastest).toFixed(2)}ms per request`);
    }
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

