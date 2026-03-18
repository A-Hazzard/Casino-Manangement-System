const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('--- Searching for "cheeto" in gaminglocations ---');
    const locations = await db.collection('gaminglocations').find({
      $or: [
        { name: { $regex: 'cheeto', $options: 'i' } },
        { locationName: { $regex: 'cheeto', $options: 'i' } }
      ]
    }).toArray();
    console.log(JSON.stringify(locations, null, 2));
    
    console.log('\n--- Searching for "cheeto" in licencees ---');
    const licencees = await db.collection('licencees').find({
      name: { $regex: 'cheeto', $options: 'i' }
    }).toArray();
    console.log(JSON.stringify(licencees, null, 2));

  } finally {
    await client.close();
  }
}

run().catch(console.error);
