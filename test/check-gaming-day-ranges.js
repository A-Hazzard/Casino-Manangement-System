/**
 * Check if per-location gaming day ranges are causing the discrepancy
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found');
  process.exit(1);
}

// Simplified gaming day range calculation (matching the actual implementation)
function getGamingDayRangeForPeriod(timePeriod, gameDayOffset = 8) {
  const now = new Date();
  const timezoneOffset = -4; // Trinidad time UTC-4
  
  // Convert to Trinidad time
  const nowLocal = new Date(now.getTime() + timezoneOffset * 60 * 60 * 1000);
  
  let today, yesterday;
  
  if (timePeriod === 'Yesterday') {
    yesterday = new Date(nowLocal);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(gameDayOffset, 0, 0, 0);
    yesterday.setUTCMinutes(0);
    yesterday.setUTCSeconds(0);
    yesterday.setUTCMilliseconds(0);
    
    today = new Date(yesterday);
    today.setUTCDate(today.getUTCDate() + 1);
    today.setUTCHours(gameDayOffset, 0, 0, 0);
    today.setUTCMinutes(0);
    today.setUTCSeconds(0);
    today.setUTCMilliseconds(0);
    today.setUTCMilliseconds(today.getUTCMilliseconds() - 1);
    
    // Convert back to UTC
    yesterday = new Date(yesterday.getTime() - timezoneOffset * 60 * 60 * 1000);
    today = new Date(today.getTime() - timezoneOffset * 60 * 60 * 1000);
  }
  
  return { rangeStart: yesterday, rangeEnd: today };
}

async function check() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    const db = client.db();
    
    // Get all locations with their gameDayOffset
    const locations = await db.collection('gaminglocations').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }, { projection: { _id: 1, name: 1, gameDayOffset: 1 } }).toArray();
    
    console.log(`📊 Found ${locations.length} locations\n`);
    
    // Check gaming day ranges for each location
    console.log(`🔍 Gaming Day Ranges for Yesterday (per location):`);
    const ranges = new Map();
    
    locations.forEach(loc => {
      const gameDayOffset = loc.gameDayOffset ?? 8;
      const range = getGamingDayRangeForPeriod('Yesterday', gameDayOffset);
      ranges.set(loc._id.toString(), range);
      
      console.log(`   ${loc.name || 'Unknown'}:`);
      console.log(`     gameDayOffset: ${gameDayOffset}`);
      console.log(`     Range: ${range.rangeStart.toISOString()} to ${range.rangeEnd.toISOString()}`);
    });
    
    // Now aggregate using per-location ranges (Dashboard method)
    console.log(`\n🔍 Aggregating with per-location ranges (Dashboard method):`);
    let totalMoneyIn = 0;
    
    for (const location of locations) {
      const locationId = location._id;
      const range = ranges.get(locationId.toString());
      
      // Get machines for this location
      const machines = await db.collection('machines').find({
        gamingLocation: locationId,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }, { projection: { _id: 1 } }).toArray();
      
      if (machines.length === 0) continue;
      
      const machineIds = machines.map(m => m._id);
      
      // Aggregate meters using this location's specific range
      const aggregation = await db.collection('meters').aggregate([
        {
          $match: {
            machine: { $in: machineIds },
            readAt: {
              $gte: range.rangeStart,
              $lte: range.rangeEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: '$movement.drop' },
          },
        },
      ]).toArray();
      
      const result = aggregation[0] || { totalDrop: 0 };
      const moneyIn = result.totalDrop || 0;
      
      if (moneyIn > 0) {
        console.log(`   ${location.name || 'Unknown'}: $${moneyIn.toFixed(2)}`);
        totalMoneyIn += moneyIn;
      }
    }
    
    console.log(`\n📊 Total (per-location ranges): $${totalMoneyIn.toFixed(2)}`);
    console.log(`📊 Dashboard shows: $104.82`);
    
    if (Math.abs(totalMoneyIn - 104.82) < 0.1) {
      console.log(`\n✅ MATCH! Per-location ranges explain the $104.82 value`);
    } else {
      console.log(`\n❌ Still doesn't match. Difference: $${Math.abs(totalMoneyIn - 104.82).toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check().catch(console.error);

