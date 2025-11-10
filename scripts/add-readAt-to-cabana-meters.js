require('dotenv').config();
const { MongoClient } = require('mongodb');

const CABANA_LOCATION_ID = '691142e37f88af78f4193b6d';

async function addReadAtField() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== ADDING readAt FIELD TO CABANA METERS ===\n');
    
    // Update all Cabana meters to have readAt = timestamp
    const result = await db.collection('meters').updateMany(
      { 
        location: CABANA_LOCATION_ID,
        readAt: { $exists: false }
      },
      [
        {
          $set: {
            readAt: '$timestamp'
          }
        }
      ]
    );
    
    console.log(`✅ Updated ${result.modifiedCount} meters`);
    console.log(`   Matched: ${result.matchedCount}`);
    
    // Verify
    const sample = await db.collection('meters').findOne({
      location: CABANA_LOCATION_ID
    });
    
    if (sample) {
      console.log('\nVerification:');
      console.log('  Has readAt?', sample.readAt ? 'YES ✅' : 'NO ❌');
      console.log('  readAt value:', sample.readAt);
      console.log('  timestamp value:', sample.timestamp);
      console.log('  Match?', sample.readAt?.getTime() === sample.timestamp?.getTime() ? 'YES ✅' : 'NO ❌');
    }
    
    console.log('\n✅ Done! Refresh the browser to see the data.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

addReadAtField().catch(console.error);

