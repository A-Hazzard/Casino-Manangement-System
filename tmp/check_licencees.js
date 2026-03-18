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
    const licencees = await db.collection('licencees').find({}, { projection: { name: 1, subtractJackpot: 1 } }).toArray();
    console.log(JSON.stringify(licencees, null, 2));
  } finally {
    await client.close();
  }
}

run().catch(console.error);
