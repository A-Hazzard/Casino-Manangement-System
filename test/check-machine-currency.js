/**
 * Check what currency the machine values are in
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
    
    // Get the location
    const location = await db.collection('gaminglocations').findOne({
      _id: 'cff1c69a7cafced1fa09f117'
    });
    
    if (!location) {
      console.error('❌ Location not found');
      return;
    }
    
    console.log('📍 Location:', location.name);
    console.log('   Licensee:', location.rel?.licencee || 'null (unassigned)');
    console.log('   Country ID:', location.country);
    
    // Get country name
    if (location.country) {
      const country = await db.collection('countries').findOne({
        _id: location.country
      });
      console.log('   Country Name:', country?.name || 'Unknown');
    }
    
    // Get the machine
    const machine = await db.collection('machines').findOne({
      serialNumber: 'GM02295'
    });
    
    if (!machine) {
      console.error('❌ Machine not found');
      return;
    }
    
    console.log('\n🎰 Machine: GM02295');
    console.log('   Location:', machine.gamingLocation);
    
    // Get meters for Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(12, 0, 0, 0);
    const today = new Date(yesterday);
    today.setUTCDate(today.getUTCDate() + 1);
    today.setUTCHours(11, 59, 59, 999);
    
    const meters = await db.collection('meters').aggregate([
      {
        $match: {
          machine: machine._id,
          readAt: {
            $gte: yesterday,
            $lte: today,
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
    
    const result = meters[0] || { totalDrop: 0, totalCancelled: 0, meterCount: 0 };
    
    console.log('\n💰 Raw Meter Data (from database):');
    console.log('   Money In (drop):', result.totalDrop);
    console.log('   Money Out (cancelled):', result.totalCancelled);
    console.log('   Gross:', result.totalDrop - result.totalCancelled);
    console.log('   Meter Count:', result.meterCount);
    
    console.log('\n📊 Expected Values:');
    console.log('   Location Details API: $177.44');
    console.log('   Machines Aggregation API: $0.853');
    console.log('   Ratio:', 177.44 / 0.853);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check().catch(console.error);

