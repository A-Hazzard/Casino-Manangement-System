const { MongoClient } = require('mongodb');

async function checkRecentCollections() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('sas-dev');
    const collections = db.collection('collections');

    console.log('🔍 Recent Collections:');

    const recentCollections = await collections
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    if (recentCollections.length === 0) {
      console.log('❌ No collections found');
      return;
    }

    recentCollections.forEach((col, index) => {
      console.log(`${index + 1}. Collection ID: ${col._id}`);
      console.log(`   Machine ID: ${col.machineId}`);
      console.log(`   Machine Name: ${col.machineName}`);
      console.log(`   MetersIn: ${col.metersIn}, MetersOut: ${col.metersOut}`);
      console.log(`   PrevIn: ${col.prevIn}, PrevOut: ${col.prevOut}`);
      console.log(`   IsCompleted: ${col.isCompleted}`);
      console.log(`   CreatedAt: ${col.createdAt}`);
      console.log('   ---');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkRecentCollections();
