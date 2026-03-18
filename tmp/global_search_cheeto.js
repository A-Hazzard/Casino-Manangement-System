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
    
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const name = col.name;
      const count = await db.collection(name).countDocuments({
        $or: [
          { name: { $regex: 'cheeto', $options: 'i' } },
          { locationName: { $regex: 'cheeto', $options: 'i' } },
          { _id: { $regex: 'cheeto', $options: 'i' } }
        ]
      });
      if (count > 0) {
        console.log(`Found ${count} matches in collection: ${name}`);
        const docs = await db.collection(name).find({
          $or: [
            { name: { $regex: 'cheeto', $options: 'i' } },
            { locationName: { $regex: 'cheeto', $options: 'i' } },
            { _id: { $regex: 'cheeto', $options: 'i' } }
          ]
        }).toArray();
        console.log(JSON.stringify(docs, null, 2));
      }
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);
