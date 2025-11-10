require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkMeterFields() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    const sample = await db.collection('meters').findOne({ 
      location: '691142e37f88af78f4193b6d' 
    });
    
    if (sample) {
      console.log('\nSample meter fields:', Object.keys(sample));
      console.log('\nHas readAt field?', sample.readAt ? 'YES' : 'NO');
      console.log('Has timestamp field?', sample.timestamp ? 'YES' : 'NO');
      
      if (sample.readAt) {
        console.log('readAt value:', sample.readAt);
      }
      if (sample.timestamp) {
        console.log('timestamp value:', sample.timestamp);
      }
    } else {
      console.log('No meters found for Cabana location');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkMeterFields().catch(console.error);

