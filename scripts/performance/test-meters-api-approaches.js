require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

/**
 * Performance Testing: Meters API Query Approaches
 * 
 * Compares different querying strategies for the /api/metrics/meters endpoint:
 * 1. Current approach (complex aggregation pipeline)
 * 2. Simplified aggregation with better indexes
 * 3. Direct grouping without lookups
 * 
 * Run with: node scripts/performance/test-meters-api-approaches.js
 */

const CONFIG = {
  ITERATIONS: 3,
  TIME_PERIOD: '7d',
  LICENSEE: 'c03b094083226f216b3fc39c', // Cabana
};

// Helper to get 7-day date range
function get7DayRange() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7);
  return { startDate, endDate: now };
}

// APPROACH 1: Current Complex Aggregation (SLOW - times out)
async function currentComplexApproach(db, dateRange, licensee) {
  try {
    const result = await db.collection('meters').aggregate([
      {
        $match: {
          readAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $lookup: {
          from: 'machines',
          let: { machine: '$machine' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$machine'] } } },
          ],
          as: 'machineDetails',
        },
      },
      { $unwind: { path: '$machineDetails', preserveNullOnEmpty: true } },
      {
        $lookup: {
          from: 'gaminglocations',
          let: { locationId: '$machineDetails.gamingLocation' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$locationId'] } } },
          ],
          as: 'locationDetails',
        },
      },
      { $unwind: { path: '$locationDetails', preserveNullOnEmpty: true } },
      {
        $match: { 'locationDetails.rel.licencee': licensee },
      },
      {
        $addFields: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$readAt' } },
        },
      },
      {
        $group: {
          _id: { day: '$day' },
          totalDrop: { $sum: '$movement.drop' },
          totalCancelledCredits: { $sum: '$movement.totalCancelledCredits' },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          time: '00:00',
          drop: '$totalDrop',
          totalCancelledCredits: '$totalCancelledCredits',
          gross: { $subtract: ['$totalDrop', '$totalCancelledCredits'] },
        },
      },
      { $sort: { day: 1 } },
    ], { 
      allowDiskUse: true,
      maxTimeMS: 60000 // 60 second timeout
    }).toArray();
    
    return result;
  } catch (error) {
    console.error('   ⚠️  Current approach error:', error.message);
    return [];
  }
}

// APPROACH 2: Pre-filter machines by location first (OPTIMIZED)
async function preFilteredApproach(db, dateRange, licensee) {
  try {
    // Step 1: Get all machines for this licensee's locations
    const locations = await db.collection('gaminglocations')
      .find(
        { 'rel.licencee': licensee },
        { projection: { _id: 1 } }
      )
      .toArray();
    
    const locationIds = locations.map(loc => loc._id.toString());
    
    if (locationIds.length === 0) {
      return [];
    }
    
    const machines = await db.collection('machines')
      .find(
        { gamingLocation: { $in: locationIds } },
        { projection: { _id: 1 } }
      )
      .toArray();
    
    const machineIds = machines.map(m => m._id.toString());
    
    if (machineIds.length === 0) {
      return [];
    }
    
    // Step 2: Aggregate meters directly (no lookups!)
    const result = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: machineIds },
          readAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $addFields: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$readAt' } },
        },
      },
      {
        $group: {
          _id: { day: '$day' },
          totalDrop: { $sum: '$movement.drop' },
          totalCancelledCredits: { $sum: '$movement.totalCancelledCredits' },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          time: '00:00',
          drop: '$totalDrop',
          totalCancelledCredits: '$totalCancelledCredits',
          gross: { $subtract: ['$totalDrop', '$totalCancelledCredits'] },
        },
      },
      { $sort: { day: 1 } },
    ], { 
      allowDiskUse: true,
      maxTimeMS: 60000
    }).toArray();
    
    return result;
  } catch (error) {
    console.error('   ⚠️  Pre-filtered approach error:', error.message);
    return [];
  }
}

// APPROACH 3: Direct meters query with machine string matching (SIMPLEST)
async function directQueryApproach(db, dateRange, licensee) {
  try {
    // Step 1: Get machine IDs in one query
    const pipeline = [
      {
        $match: {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          let: { gamingLoc: '$gamingLocation' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$gamingLoc'] },
                'rel.licencee': licensee,
              },
            },
          ],
          as: 'location',
        },
      },
      { $match: { location: { $ne: [] } } },
      { $project: { _id: 1 } },
    ];
    
    const machines = await db.collection('machines').aggregate(pipeline).toArray();
    const machineIds = machines.map(m => m._id.toString());
    
    if (machineIds.length === 0) {
      return [];
    }
    
    // Step 2: Query meters directly
    const result = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: machineIds },
          readAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $project: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$readAt' } },
          drop: '$movement.drop',
          cancelled: '$movement.totalCancelledCredits',
        },
      },
      {
        $group: {
          _id: '$day',
          totalDrop: { $sum: '$drop' },
          totalCancelled: { $sum: '$cancelled' },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id',
          time: '00:00',
          drop: '$totalDrop',
          totalCancelledCredits: '$totalCancelled',
          gross: { $subtract: ['$totalDrop', '$totalCancelled'] },
        },
      },
      { $sort: { day: 1 } },
    ], {
      allowDiskUse: true,
      maxTimeMS: 60000
    }).toArray();
    
    return result;
  } catch (error) {
    console.error('   ⚠️  Direct query approach error:', error.message);
    return [];
  }
}

// Test runner
async function runTest(testName, testFn, db, dateRange, licensee) {
  const start = Date.now();
  const results = await testFn(db, dateRange, licensee);
  const duration = Date.now() - start;
  
  return {
    testName,
    duration,
    resultsCount: results.length,
    sampleResult: results[0],
    success: results.length > 0,
  };
}

// Main
async function main() {
  console.log('\n🚀 Meters API Performance Testing\n');
  console.log(`Config: ${CONFIG.TIME_PERIOD} period, ${CONFIG.ITERATIONS} iterations\n`);
  
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const dateRange = get7DayRange();
    
    console.log(`✅ Testing with licensee: ${CONFIG.LICENSEE}`);
    console.log(`📅 Date range: ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}\n`);
    
    const allResults = {
      current: [],
      preFiltered: [],
      direct: [],
    };
    
    // Test each approach
    for (let i = 0; i < CONFIG.ITERATIONS; i++) {
      console.log(`\n━━━ Iteration ${i + 1}/${CONFIG.ITERATIONS} ━━━\n`);
      
      // Current approach (likely to timeout)
      console.log('Testing: Current Complex Aggregation...');
      const currentResult = await runTest('Current Complex', currentComplexApproach, db, dateRange, CONFIG.LICENSEE);
      allResults.current.push(currentResult);
      if (currentResult.success) {
        console.log(`  ⏱️  ${currentResult.duration}ms - ${currentResult.resultsCount} days`);
        console.log(`  💰 Sample: ${JSON.stringify(currentResult.sampleResult)}\n`);
      } else {
        console.log(`  ❌ FAILED or TIMEOUT\n`);
      }
      
      // Pre-filtered approach
      console.log('Testing: Pre-filtered (Get machines first)...');
      const preFilteredResult = await runTest('Pre-filtered', preFilteredApproach, db, dateRange, CONFIG.LICENSEE);
      allResults.preFiltered.push(preFilteredResult);
      if (preFilteredResult.success) {
        console.log(`  ⏱️  ${preFilteredResult.duration}ms - ${preFilteredResult.resultsCount} days`);
        console.log(`  💰 Sample: ${JSON.stringify(preFilteredResult.sampleResult)}\n`);
      } else {
        console.log(`  ❌ FAILED\n`);
      }
      
      // Direct query approach
      console.log('Testing: Direct Query (Lookup machines once)...');
      const directResult = await runTest('Direct Query', directQueryApproach, db, dateRange, CONFIG.LICENSEE);
      allResults.direct.push(directResult);
      if (directResult.success) {
        console.log(`  ⏱️  ${directResult.duration}ms - ${directResult.resultsCount} days`);
        console.log(`  💰 Sample: ${JSON.stringify(directResult.sampleResult)}\n`);
      } else {
        console.log(`  ❌ FAILED\n`);
      }
    }
    
    // Calculate averages (only for successful runs)
    const avgCurrent = allResults.current.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / allResults.current.filter(r => r.success).length || 0;
    const avgPreFiltered = allResults.preFiltered.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / allResults.preFiltered.filter(r => r.success).length || 0;
    const avgDirect = allResults.direct.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / allResults.direct.filter(r => r.success).length || 0;
    
    // Results
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(80));
    console.log(`\n1. Current Complex Aggregation:  ${avgCurrent > 0 ? avgCurrent.toFixed(2) + 'ms avg' : 'FAILED/TIMEOUT'}`);
    console.log(`   Success rate: ${allResults.current.filter(r => r.success).length}/${CONFIG.ITERATIONS}`);
    console.log(`\n2. Pre-filtered Approach:        ${avgPreFiltered > 0 ? avgPreFiltered.toFixed(2) + 'ms avg' : 'FAILED'}`);
    console.log(`   Success rate: ${allResults.preFiltered.filter(r => r.success).length}/${CONFIG.ITERATIONS}`);
    console.log(`\n3. Direct Query Approach:        ${avgDirect > 0 ? avgDirect.toFixed(2) + 'ms avg' : 'FAILED'}`);
    console.log(`   Success rate: ${allResults.direct.filter(r => r.success).length}/${CONFIG.ITERATIONS}`);
    
    // Find fastest
    const validResults = [
      { name: 'Current Complex Aggregation', avg: avgCurrent },
      { name: 'Pre-filtered Approach', avg: avgPreFiltered },
      { name: 'Direct Query Approach', avg: avgDirect },
    ].filter(r => r.avg > 0);
    
    if (validResults.length > 0) {
      const fastest = validResults.reduce((min, r) => r.avg < min.avg ? r : min);
      console.log(`\n🏆 FASTEST: ${fastest.name} (${fastest.avg.toFixed(2)}ms)`);
      
      if (avgCurrent > 0) {
        const speedup = (avgCurrent / fastest.avg).toFixed(2);
        console.log(`\n🚀 SPEEDUP: ${speedup}x faster than current implementation`);
        console.log(`   Time saved: ${(avgCurrent - fastest.avg).toFixed(2)}ms per request`);
      }
    } else {
      console.log(`\n❌ ALL APPROACHES FAILED!`);
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

