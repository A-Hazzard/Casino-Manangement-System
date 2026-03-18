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
    const l = await db.collection('licencees').find({}).toArray();
    console.log(JSON.stringify(l, null, 2));
  } finally {
    await client.close();
  }
}

run().catch(console.error);
