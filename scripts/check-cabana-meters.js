require('dotenv').config();
const { MongoClient } = require('mongodb');

const CABANA_LOCATION_ID = '691142e37f88af78f4193b6d';

async function checkCabanaMeters() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== CHECKING CABANA METERS ===\n');
    console.log('Current server time:', new Date().toISOString());
    console.log('Location ID:', CABANA_LOCATION_ID);
    
    // Get all meters for Cabana location
    const meters = await db.collection('meters').find({
      location: CABANA_LOCATION_ID
    }).sort({ timestamp: -1 }).limit(10).toArray();
    
    console.log(`\nFound ${meters.length} recent meters:\n`);
    
    meters.forEach((meter, idx) => {
      console.log(`${idx + 1}. Machine: ${meter.machine}`);
      console.log(`   Timestamp: ${meter.timestamp.toISOString()}`);
      console.log(`   Coin In: ${meter.sasMeters.coinIn}`);
      console.log(`   Coin Out: ${meter.sasMeters.coinOut}`);
      console.log('');
    });
    
    // Get total count
    const totalCount = await db.collection('meters').countDocuments({
      location: CABANA_LOCATION_ID
    });
    
    console.log(`Total meters for Cabana: ${totalCount}`);
    
    // Check date range
    const oldestMeter = await db.collection('meters').find({
      location: CABANA_LOCATION_ID
    }).sort({ timestamp: 1 }).limit(1).toArray();
    
    const newestMeter = await db.collection('meters').find({
      location: CABANA_LOCATION_ID
    }).sort({ timestamp: -1 }).limit(1).toArray();
    
    if (oldestMeter.length > 0 && newestMeter.length > 0) {
      console.log(`\nDate range:`);
      console.log(`  Oldest: ${oldestMeter[0].timestamp.toISOString()}`);
      console.log(`  Newest: ${newestMeter[0].timestamp.toISOString()}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCabanaMeters().catch(console.error);

