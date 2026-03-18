const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const name = col.name;
      const count = await db.collection(name).countDocuments({ subtractJackpot: true });
      if (count > 0) {
        console.log(`Found ${count} documents with subtractJackpot: true in collection: ${name}`);
        const docs = await db.collection(name).find({ subtractJackpot: true }).toArray();
        docs.forEach(d => {
            console.log(`- ID: ${d._id}, Name: ${d.name || d.locationName || 'N/A'}`);
        });
      }
      
      const countStr = await db.collection(name).countDocuments({ subtractJackpot: "true" });
      if (countStr > 0) {
        console.log(`Found ${countStr} documents with subtractJackpot: "true" (string) in collection: ${name}`);
      }
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);
