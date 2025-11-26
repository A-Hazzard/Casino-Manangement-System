/**
 * Check if the Dashboard API's date range calculation is correct
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found');
  process.exit(1);
}

async function check() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    const db = client.db();
    
    // Get all locations
    const locations = await db.collection('gaminglocations').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }, { projection: { _id: 1, name: 1, gameDayOffset: 1 } }).toArray();
    
    console.log(`📊 Found ${locations.length} locations\n`);
    
    // Check what date range the Dashboard API is actually using
    // From logs: 2025-11-24T12:00:00.000Z to 2025-11-25T11:59:59.999Z
    const dashboardRangeStart = new Date('2025-11-24T12:00:00.000Z');
    const dashboardRangeEnd = new Date('2025-11-25T11:59:59.999Z');
    
    console.log(`📅 Dashboard API Range (from logs):`);
    console.log(`   Start: ${dashboardRangeStart.toISOString()}`);
    console.log(`   End: ${dashboardRangeEnd.toISOString()}\n`);
    
    // Get all machines
    const allMachines = await db.collection('machines').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }, { projection: { _id: 1, gamingLocation: 1 } }).toArray();
    
    console.log(`📊 Found ${allMachines.length} machines\n`);
    
    // Check meters in Dashboard range
    const allMachineIds = allMachines.map(m => m._id);
    const dashboardAggregation = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: allMachineIds },
          readAt: {
            $gte: dashboardRangeStart,
            $lte: dashboardRangeEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDrop: { $sum: '$movement.drop' },
          totalCancelled: { $sum: '$movement.totalCancelledCredits' },
          meterCount: { $sum: 1 },
        },
      },
    ]).toArray();
    
    const dashboardResult = dashboardAggregation[0] || {
      totalDrop: 0,
      totalCancelled: 0,
      meterCount: 0,
    };
    
    console.log(`💰 Meters in Dashboard Range:`);
    console.log(`   Money In: $${(dashboardResult.totalDrop || 0).toFixed(2)}`);
    console.log(`   Money Out: $${(dashboardResult.totalCancelled || 0).toFixed(2)}`);
    console.log(`   Meter Count: ${dashboardResult.meterCount || 0}`);
    console.log(`   Dashboard shows: $104.82\n`);
    
    // Check all meters for Yesterday (wider range)
    const yesterdayStart = new Date('2025-11-24T00:00:00.000Z');
    const yesterdayEnd = new Date('2025-11-25T23:59:59.999Z');
    
    const allAggregation = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: allMachineIds },
          readAt: {
            $gte: yesterdayStart,
            $lte: yesterdayEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDrop: { $sum: '$movement.drop' },
          totalCancelled: { $sum: '$movement.totalCancelledCredits' },
          meterCount: { $sum: 1 },
        },
      },
    ]).toArray();
    
    const allResult = allAggregation[0] || {
      totalDrop: 0,
      totalCancelled: 0,
      meterCount: 0,
    };
    
    console.log(`💰 Meters in Full Day Range (00:00 to 23:59):`);
    console.log(`   Money In: $${(allResult.totalDrop || 0).toFixed(2)}`);
    console.log(`   Money Out: $${(allResult.totalCancelled || 0).toFixed(2)}`);
    console.log(`   Meter Count: ${allResult.meterCount || 0}\n`);
    
    // Check what meters exist outside the Dashboard range but within the day
    const outsideRange = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: allMachineIds },
          readAt: {
            $gte: yesterdayStart,
            $lt: dashboardRangeStart,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDrop: { $sum: '$movement.drop' },
          meterCount: { $sum: 1 },
        },
      },
    ]).toArray();
    
    const outsideResult = outsideRange[0] || { totalDrop: 0, meterCount: 0 };
    
    console.log(`🔍 Meters BEFORE Dashboard Range (00:00 to 12:00):`);
    console.log(`   Money In: $${(outsideResult.totalDrop || 0).toFixed(2)}`);
    console.log(`   Meter Count: ${outsideResult.meterCount || 0}\n`);
    
    const afterRange = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: allMachineIds },
          readAt: {
            $gt: dashboardRangeEnd,
            $lte: yesterdayEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDrop: { $sum: '$movement.drop' },
          meterCount: { $sum: 1 },
        },
      },
    ]).toArray();
    
    const afterResult = afterRange[0] || { totalDrop: 0, meterCount: 0 };
    
    console.log(`🔍 Meters AFTER Dashboard Range (12:00 to 23:59):`);
    console.log(`   Money In: $${(afterResult.totalDrop || 0).toFixed(2)}`);
    console.log(`   Meter Count: ${afterResult.meterCount || 0}\n`);
    
    const totalInRange = (dashboardResult.totalDrop || 0) + (outsideResult.totalDrop || 0) + (afterResult.totalDrop || 0);
    console.log(`📊 Total (sum of all ranges): $${totalInRange.toFixed(2)}`);
    console.log(`📊 Full day query: $${(allResult.totalDrop || 0).toFixed(2)}`);
    
    if (Math.abs(totalInRange - (allResult.totalDrop || 0)) > 0.01) {
      console.log(`\n⚠️  Ranges don't add up correctly`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check().catch(console.error);

