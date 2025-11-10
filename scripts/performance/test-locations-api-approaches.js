require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

/**
 * Performance Testing: Locations API Query Approaches
 * 
 * Compares different querying strategies for the /api/reports/locations endpoint:
 * 1. Current approach (parallel batching)
 * 2. Single aggregation pipeline
 * 3. Optimized aggregation with facet
 * 
 * Run with: node scripts/performance/test-locations-api-approaches.js
 */

const CONFIG = {
  TEST_LOCATIONS_LIMIT: 50, // Test with subset for faster iterations
  ITERATIONS: 3,
  TIME_PERIOD: 'Today',
  BATCH_SIZE: 20,
};

// Helper to get time range for Today
function getTodayRange() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(8, 0, 0, 0);
  
  if (now.getHours() < 8) {
    startOfDay.setDate(startOfDay.getDate() - 1);
  }
  
  return { start: startOfDay, end: now };
}

// APPROACH 1: Current Parallel Batch Processing
async function currentApproach(db, locations, timeRange) {
  const results = [];
  const BATCH_SIZE = CONFIG.BATCH_SIZE;
  
  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(async (location) => {
        const locationId = location._id.toString();
        
        const [machines, metrics] = await Promise.all([
          db.collection('machines').find({
            gamingLocation: locationId,
            $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
          }).toArray(),
          
          (async () => {
            const machineIds = await db.collection('machines')
              .find({ gamingLocation: locationId }, { projection: { _id: 1 } })
              .toArray()
              .then(docs => docs.map(d => d._id.toString()));
            
            if (machineIds.length === 0) {
              return [{ moneyIn: 0, moneyOut: 0 }];
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
                  moneyIn: { $sum: '$movement.drop' },
                  moneyOut: { $sum: '$movement.totalCancelledCredits' },
                },
              },
            ]).toArray();
          })(),
        ]);
        
        const metricsData = metrics[0] || { moneyIn: 0, moneyOut: 0 };
        return {
          _id: locationId,
          locationName: location.name,
          totalMachines: machines.length,
          moneyIn: metricsData.moneyIn,
          moneyOut: metricsData.moneyOut,
          gross: metricsData.moneyIn - metricsData.moneyOut,
        };
      })
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

// APPROACH 2: Single Aggregation Pipeline
async function singleAggregationApproach(db, locations, timeRange) {
  const locationIds = locations.map(loc => loc._id.toString());
  
  const results = await db.collection('gaminglocations').aggregate([
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
        machineIds: { $map: { input: '$machines', as: 'm', in: { $toString: '$$m._id' } } },
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
              moneyIn: { $sum: '$movement.drop' },
              moneyOut: { $sum: '$movement.totalCancelledCredits' },
            },
          },
        ],
        as: 'metersData',
      },
    },
    {
      $project: {
        _id: { $toString: '$_id' },
        locationName: '$name',
        totalMachines: { $size: '$machines' },
        moneyIn: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
        moneyOut: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0] },
        gross: {
          $subtract: [
            { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
            { $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0] },
          ],
        },
      },
    },
  ], { allowDiskUse: true }).toArray();
  
  return results;
}

// APPROACH 3: Optimized Aggregation with Parallel Lookups
async function optimizedAggregationApproach(db, locations, timeRange) {
  const locationIds = locations.map(loc => loc._id.toString());
  
  const results = await db.collection('gaminglocations').aggregate([
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
          {
            $facet: {
              machineList: [{ $project: { _id: 1 } }],
              machineCount: [{ $count: 'total' }],
            },
          },
        ],
        as: 'machineData',
      },
    },
    {
      $addFields: {
        machineIds: {
          $map: {
            input: { $arrayElemAt: ['$machineData.machineList', 0] },
            as: 'm',
            in: { $toString: '$$m._id' },
          },
        },
        totalMachines: { $ifNull: [{ $arrayElemAt: [{ $arrayElemAt: ['$machineData.machineCount.total', 0] }, 0] }, 0] },
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
              moneyIn: { $sum: '$movement.drop' },
              moneyOut: { $sum: '$movement.totalCancelledCredits' },
            },
          },
        ],
        as: 'metersData',
      },
    },
    {
      $project: {
        _id: { $toString: '$_id' },
        locationName: '$name',
        totalMachines: 1,
        moneyIn: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
        moneyOut: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0] },
        gross: {
          $subtract: [
            { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
            { $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0] },
          ],
        },
      },
    },
  ], { allowDiskUse: true, maxTimeMS: 60000 }).toArray();
  
  return results;
}

// Test runner
async function runTest(testName, testFn, db, locations, timeRange) {
  const start = Date.now();
  const results = await testFn(db, locations, timeRange);
  const duration = Date.now() - start;
  
  return {
    testName,
    duration,
    resultsCount: results.length,
    avgPerLocation: (duration / results.length).toFixed(2),
  };
}

// Main
async function main() {
  console.log('\n🚀 Locations API Performance Testing\n');
  console.log(`Config: ${CONFIG.TEST_LOCATIONS_LIMIT} locations, ${CONFIG.ITERATIONS} iterations\n`);
  
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const timeRange = getTodayRange();
    
    // Get test locations
    const locations = await db.collection('gaminglocations')
      .find({
        $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
      })
      .limit(CONFIG.TEST_LOCATIONS_LIMIT)
      .toArray();
    
    console.log(`✅ Testing with ${locations.length} locations\n`);
    
    const allResults = {
      current: [],
      single: [],
      optimized: [],
    };
    
    // Test each approach
    for (let i = 0; i < CONFIG.ITERATIONS; i++) {
      console.log(`\n━━━ Iteration ${i + 1}/${CONFIG.ITERATIONS} ━━━\n`);
      
      // Current approach
      console.log('Testing: Current Parallel Batching...');
      const currentResult = await runTest('Current', currentApproach, db, locations, timeRange);
      allResults.current.push(currentResult);
      console.log(`  ⏱️  ${currentResult.duration}ms (${currentResult.avgPerLocation}ms/loc)\n`);
      
      // Single aggregation
      console.log('Testing: Single Aggregation Pipeline...');
      const singleResult = await runTest('Single Aggregation', singleAggregationApproach, db, locations, timeRange);
      allResults.single.push(singleResult);
      console.log(`  ⏱️  ${singleResult.duration}ms (${singleResult.avgPerLocation}ms/loc)\n`);
      
      // Optimized aggregation
      console.log('Testing: Optimized Aggregation...');
      const optimizedResult = await runTest('Optimized Aggregation', optimizedAggregationApproach, db, locations, timeRange);
      allResults.optimized.push(optimizedResult);
      console.log(`  ⏱️  ${optimizedResult.duration}ms (${optimizedResult.avgPerLocation}ms/loc)\n`);
    }
    
    // Calculate averages
    const avgCurrent = allResults.current.reduce((sum, r) => sum + r.duration, 0) / CONFIG.ITERATIONS;
    const avgSingle = allResults.single.reduce((sum, r) => sum + r.duration, 0) / CONFIG.ITERATIONS;
    const avgOptimized = allResults.optimized.reduce((sum, r) => sum + r.duration, 0) / CONFIG.ITERATIONS;
    
    // Results
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(80));
    console.log(`\n1. Current Parallel Batching:    ${avgCurrent.toFixed(2)}ms avg`);
    console.log(`2. Single Aggregation Pipeline:  ${avgSingle.toFixed(2)}ms avg`);
    console.log(`3. Optimized Aggregation:        ${avgOptimized.toFixed(2)}ms avg`);
    
    // Find fastest
    const fastest = Math.min(avgCurrent, avgSingle, avgOptimized);
    let winner = '';
    if (fastest === avgCurrent) winner = 'Current Parallel Batching';
    else if (fastest === avgSingle) winner = 'Single Aggregation Pipeline';
    else winner = 'Optimized Aggregation';
    
    console.log(`\n🏆 FASTEST: ${winner} (${fastest.toFixed(2)}ms)`);
    console.log(`\nSpeedup vs slowest: ${(Math.max(avgCurrent, avgSingle, avgOptimized) / fastest).toFixed(2)}x`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

