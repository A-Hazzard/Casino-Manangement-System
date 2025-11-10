require('dotenv').config();
const { MongoClient } = require('mongodb');

async function fixMachines() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    const result = await db.collection('machines').updateMany(
      { gamingLocation: '691166b455fe4b9b7ae3e702' },
      { $set: { deletedAt: new Date('1969-12-31') } }
    );
    
    console.log('Updated', result.modifiedCount, 'machines');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixMachines().catch(console.error);

