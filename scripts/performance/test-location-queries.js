require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

// Simple color helpers (no external dependencies)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const chalk = {
  red: (text) => colors.red + text + colors.reset,
  green: (text) => colors.green + text + colors.reset,
  yellow: (text) => colors.yellow + text + colors.reset,
  blue: (text) => colors.blue + text + colors.reset,
  cyan: (text) => colors.cyan + text + colors.reset,
  bold: (text) => colors.bold + text + colors.reset,
};

/**
 * Performance Testing Suite for Location Queries
 * 
 * This script tests different querying approaches to determine the most performant method
 * for fetching location data with machines and meters.
 * 
 * Run with: node scripts/performance/test-location-queries.js
 */

// Test configuration
const CONFIG = {
  // Number of locations to test with
  TEST_LOCATION_COUNT: 20,
  // Number of times to run each test for averaging
  TEST_ITERATIONS: 3,
  // Batch sizes to test
  BATCH_SIZES: [5, 10, 20, 30, 50],
  // Time period for meter queries
  TIME_PERIOD: 'Today',
};

// Helper function to calculate time range
function getTimeRange() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(8, 0, 0, 0); // 8 AM Trinidad time
  
  if (now.getHours() < 8) {
    // Before 8 AM, use previous day
    startOfDay.setDate(startOfDay.getDate() - 1);
  }
  
  return {
    start: startOfDay,
    end: now,
  };
}

// TEST 1: Sequential Processing (OLD APPROACH)
async function testSequential(db, locations, timeRange) {
  const results = [];
  
  for (const location of locations) {
    const locationId = location._id.toString();
    
    // Get machines
    const machines = await db.collection('machines').find({
      gamingLocation: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).toArray();
    
    // Get machine IDs
    const machineIds = machines.map(m => m._id.toString());
    
    // Get metrics
    let metrics = [{ moneyIn: 0, moneyOut: 0 }];
    if (machineIds.length > 0) {
      metrics = await db.collection('meters').aggregate([
        {
          $match: {
            machine: { $in: machineIds },
            readAt: {
              $gte: timeRange.start,
              $lte: timeRange.end,
            },
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
    }
    
    results.push({
      locationId,
      machines: machines.length,
      moneyIn: metrics[0]?.moneyIn || 0,
      moneyOut: metrics[0]?.moneyOut || 0,
    });
  }
  
  return results;
}

// TEST 2: Parallel Batch Processing (CURRENT OPTIMIZED APPROACH)
async function testParallelBatch(db, locations, timeRange, batchSize) {
  const results = [];
  
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (location) => {
        const locationId = location._id.toString();
        
        // Parallel fetch of machines and metrics
        const [machines, metrics] = await Promise.all([
          db.collection('machines').find({
            gamingLocation: locationId,
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          }).toArray(),
          
          (async () => {
            const machineIds = await db.collection('machines')
              .find(
                { gamingLocation: locationId },
                { projection: { _id: 1 } }
              )
              .toArray()
              .then(docs => docs.map(d => d._id.toString()));
            
            if (machineIds.length === 0) {
              return [{ moneyIn: 0, moneyOut: 0 }];
            }
            
            return db.collection('meters').aggregate([
              {
                $match: {
                  machine: { $in: machineIds },
                  readAt: {
                    $gte: timeRange.start,
                    $lte: timeRange.end,
                  },
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
        
        return {
          locationId,
          machines: machines.length,
          moneyIn: metrics[0]?.moneyIn || 0,
          moneyOut: metrics[0]?.moneyOut || 0,
        };
      })
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

// TEST 3: Single Aggregation Pipeline (IDEAL BUT COMPLEX)
async function testSingleAggregation(db, locations, timeRange) {
  const locationIds = locations.map(loc => loc._id.toString());
  
  const results = await db.collection('gaminglocations').aggregate([
    // Match locations
    {
      $match: {
        _id: { $in: locationIds },
      },
    },
    // Lookup machines
    {
      $lookup: {
        from: 'machines',
        let: { locationId: { $toString: '$_id' } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$gamingLocation', '$$locationId'] },
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            },
          },
        ],
        as: 'machines',
      },
    },
    // Add machine IDs array
    {
      $addFields: {
        machineIds: {
          $map: {
            input: '$machines',
            as: 'm',
            in: { $toString: '$$m._id' },
          },
        },
      },
    },
    // Lookup meters
    {
      $lookup: {
        from: 'meters',
        let: { machineIds: '$machineIds' },
        pipeline: [
          {
            $match: {
              $expr: { $in: ['$machine', '$$machineIds'] },
              readAt: {
                $gte: timeRange.start,
                $lte: timeRange.end,
              },
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
    // Project final structure
    {
      $project: {
        locationId: { $toString: '$_id' },
        machines: { $size: '$machines' },
        moneyIn: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
        moneyOut: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0] },
      },
    },
  ]).toArray();
  
  return results;
}

// TEST 4: Optimized Single Aggregation (with $facet for parallel)
async function testOptimizedAggregation(db, locations, timeRange) {
  const locationIds = locations.map(loc => loc._id.toString());
  
  const results = await db.collection('gaminglocations').aggregate([
    {
      $match: {
        _id: { $in: locationIds },
      },
    },
    {
      $lookup: {
        from: 'machines',
        let: { locationId: { $toString: '$_id' } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$gamingLocation', '$$locationId'] },
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            },
          },
          {
            $facet: {
              // Get machine list
              machines: [
                { $project: { _id: 1, assetNumber: 1, serialNumber: 1 } },
              ],
              // Get machine IDs for meter lookup
              machineIds: [
                { $project: { _id: { $toString: '$_id' } } },
                { $group: { _id: null, ids: { $push: '$_id' } } },
              ],
            },
          },
        ],
        as: 'machineData',
      },
    },
    {
      $addFields: {
        machines: {
          $ifNull: [
            { $arrayElemAt: ['$machineData.machines', 0] },
            [],
          ],
        },
        machineIds: {
          $ifNull: [
            { $arrayElemAt: [{ $arrayElemAt: ['$machineData.machineIds.ids', 0] }, 0] },
            [],
          ],
        },
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
              readAt: {
                $gte: timeRange.start,
                $lte: timeRange.end,
              },
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
        locationId: { $toString: '$_id' },
        machines: { $size: { $ifNull: ['$machines', []] } },
        moneyIn: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
        moneyOut: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0] },
      },
    },
  ], { allowDiskUse: true }).toArray();
  
  return results;
}

// Run a single test iteration
async function runTest(testName, testFn, ...args) {
  const start = Date.now();
  const results = await testFn(...args);
  const duration = Date.now() - start;
  
  return {
    testName,
    duration,
    resultsCount: results.length,
    avgPerLocation: duration / results.length,
  };
}

// Main test runner
async function runPerformanceTests() {
  console.log(chalk.bold(chalk.blue('\n🚀 Starting Location Query Performance Tests\n')));
  console.log('Configuration:');
  console.log(`  Test Locations: ${CONFIG.TEST_LOCATION_COUNT}`);
  console.log(`  Iterations per test: ${CONFIG.TEST_ITERATIONS}`);
  console.log(`  Time Period: ${CONFIG.TIME_PERIOD}\n`);
  
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    console.log(chalk.green('✅ Connected to database\n'));
    
    const db = client.db();
    const timeRange = getTimeRange();
    
    // Get test locations
    console.log('📍 Fetching test locations...');
    const locations = await db.collection('gaminglocations')
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .limit(CONFIG.TEST_LOCATION_COUNT)
      .toArray();
    
    console.log(chalk.green(`✅ Found ${locations.length} locations for testing\n`));
    
    // Store all test results
    const allResults = [];
    
    // TEST 1: Sequential Processing
    console.log(chalk.yellow('━'.repeat(80)));
    console.log(chalk.bold(chalk.yellow('TEST 1: Sequential Processing (OLD APPROACH)')));
    console.log(chalk.yellow('━'.repeat(80)));
    
    const sequentialResults = [];
    for (let i = 0; i < CONFIG.TEST_ITERATIONS; i++) {
      console.log(`  Iteration ${i + 1}/${CONFIG.TEST_ITERATIONS}...`);
      const result = await runTest(
        'Sequential',
        testSequential,
        db,
        locations,
        timeRange
      );
      sequentialResults.push(result);
      console.log(`  ⏱️  ${result.duration}ms (${result.avgPerLocation.toFixed(2)}ms/location)`);
    }
    
    const sequentialAvg = sequentialResults.reduce((sum, r) => sum + r.duration, 0) / sequentialResults.length;
    allResults.push({
      name: 'Sequential Processing',
      avgTime: sequentialAvg,
      results: sequentialResults,
    });
    console.log(chalk.green(`  📊 Average: ${sequentialAvg.toFixed(2)}ms\n`));
    
    // TEST 2: Parallel Batch Processing (test different batch sizes)
    console.log(chalk.yellow('━'.repeat(80)));
    console.log(chalk.bold(chalk.yellow('TEST 2: Parallel Batch Processing (CURRENT)')));
    console.log(chalk.yellow('━'.repeat(80)));
    
    for (const batchSize of CONFIG.BATCH_SIZES) {
      console.log(chalk.cyan(`\n  Batch Size: ${batchSize}`));
      const batchResults = [];
      
      for (let i = 0; i < CONFIG.TEST_ITERATIONS; i++) {
        console.log(`    Iteration ${i + 1}/${CONFIG.TEST_ITERATIONS}...`);
        const result = await runTest(
          `Parallel Batch (${batchSize})`,
          testParallelBatch,
          db,
          locations,
          timeRange,
          batchSize
        );
        batchResults.push(result);
        console.log(`    ⏱️  ${result.duration}ms (${result.avgPerLocation.toFixed(2)}ms/location)`);
      }
      
      const batchAvg = batchResults.reduce((sum, r) => sum + r.duration, 0) / batchResults.length;
      allResults.push({
        name: `Parallel Batch (size: ${batchSize})`,
        avgTime: batchAvg,
        results: batchResults,
      });
      console.log(chalk.green(`    📊 Average: ${batchAvg.toFixed(2)}ms`));
    }
    
    // TEST 3: Single Aggregation Pipeline
    console.log('\n' + chalk.yellow('━'.repeat(80)));
    console.log(chalk.bold(chalk.yellow('TEST 3: Single Aggregation Pipeline')));
    console.log(chalk.yellow('━'.repeat(80)));
    
    const aggregationResults = [];
    for (let i = 0; i < CONFIG.TEST_ITERATIONS; i++) {
      console.log(`  Iteration ${i + 1}/${CONFIG.TEST_ITERATIONS}...`);
      const result = await runTest(
        'Single Aggregation',
        testSingleAggregation,
        db,
        locations,
        timeRange
      );
      aggregationResults.push(result);
      console.log(`  ⏱️  ${result.duration}ms (${result.avgPerLocation.toFixed(2)}ms/location)`);
    }
    
    const aggregationAvg = aggregationResults.reduce((sum, r) => sum + r.duration, 0) / aggregationResults.length;
    allResults.push({
      name: 'Single Aggregation Pipeline',
      avgTime: aggregationAvg,
      results: aggregationResults,
    });
    console.log(chalk.green(`  📊 Average: ${aggregationAvg.toFixed(2)}ms\n`));
    
    // TEST 4: Optimized Aggregation
    console.log(chalk.yellow('━'.repeat(80)));
    console.log(chalk.bold(chalk.yellow('TEST 4: Optimized Aggregation (with $facet)')));
    console.log(chalk.yellow('━'.repeat(80)));
    
    const optimizedResults = [];
    for (let i = 0; i < CONFIG.TEST_ITERATIONS; i++) {
      console.log(`  Iteration ${i + 1}/${CONFIG.TEST_ITERATIONS}...`);
      const result = await runTest(
        'Optimized Aggregation',
        testOptimizedAggregation,
        db,
        locations,
        timeRange
      );
      optimizedResults.push(result);
      console.log(`  ⏱️  ${result.duration}ms (${result.avgPerLocation.toFixed(2)}ms/location)`);
    }
    
    const optimizedAvg = optimizedResults.reduce((sum, r) => sum + r.duration, 0) / optimizedResults.length;
    allResults.push({
      name: 'Optimized Aggregation',
      avgTime: optimizedAvg,
      results: optimizedResults,
    });
    console.log(chalk.green(`  📊 Average: ${optimizedAvg.toFixed(2)}ms\n`));
    
    // FINAL COMPARISON
    console.log('\n' + chalk.blue('='.repeat(80)));
    console.log(chalk.bold(chalk.blue('📊 PERFORMANCE COMPARISON SUMMARY')));
    console.log(chalk.blue('='.repeat(80)));
    
    // Sort by performance (fastest first)
    allResults.sort((a, b) => a.avgTime - b.avgTime);
    
    const fastest = allResults[0];
    const slowest = allResults[allResults.length - 1];
    
    console.log('\n' + chalk.bold('Rankings (Fastest to Slowest):\n'));
    
    allResults.forEach((result, index) => {
      const speedup = (slowest.avgTime / result.avgTime).toFixed(2);
      const vsSequential = (sequentialAvg / result.avgTime).toFixed(2);
      const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      
      console.log(`${emoji} ${chalk.bold((index + 1) + '.')} ${result.name}`);
      console.log(`   Time: ${chalk.cyan(result.avgTime.toFixed(2) + 'ms')}`);
      console.log(`   Speedup vs Sequential: ${chalk.green(vsSequential + 'x faster')}`);
      console.log(`   Speedup vs Slowest: ${chalk.green(speedup + 'x faster')}`);
      console.log();
    });
    
    // Recommendations
    console.log(chalk.blue('='.repeat(80)));
    console.log(chalk.bold('💡 RECOMMENDATIONS:'));
    console.log(chalk.blue('='.repeat(80)));
    console.log();
    console.log(`${chalk.green('✅ FASTEST METHOD:')} ${chalk.bold(fastest.name)}`);
    console.log(`   Average Time: ${chalk.cyan(fastest.avgTime.toFixed(2) + 'ms')}`);
    console.log(`   Performance Gain: ${chalk.green((slowest.avgTime / fastest.avgTime).toFixed(2) + 'x faster')} than slowest method`);
    console.log();
    
    // Find best batch size if parallel batch is fastest
    const batchResults = allResults.filter(r => r.name.includes('Parallel Batch'));
    if (batchResults.length > 0) {
      const bestBatch = batchResults.sort((a, b) => a.avgTime - b.avgTime)[0];
      console.log(`${chalk.green('✅ OPTIMAL BATCH SIZE:')} ${bestBatch.name}`);
      console.log(`   Average Time: ${chalk.cyan(bestBatch.avgTime.toFixed(2) + 'ms')}`);
      console.log();
    }
    
    console.log(chalk.yellow('💡 Implementation Advice:'));
    if (fastest.name.includes('Aggregation')) {
      console.log('   • Single aggregation pipeline is fastest');
      console.log('   • Consider refactoring API to use this approach');
      console.log('   • Reduces network roundtrips and database load');
    } else if (fastest.name.includes('Parallel Batch')) {
      console.log('   • Parallel batch processing provides best performance');
      console.log('   • Current implementation is already optimized');
      console.log('   • Consider adjusting batch size based on results');
    }
    console.log();
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
    process.exit(1);
  } finally {
    await client.close();
    console.log(chalk.green('\n✅ Tests complete!\n'));
  }
}

// Run the tests
runPerformanceTests().catch(console.error);

