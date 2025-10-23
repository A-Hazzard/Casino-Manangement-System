const { MongoClient, ObjectId } = require('mongodb');

async function checkIncompleteCollection() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('sas-dev');
    const collections = db.collection('collections');
    
    // Find the incomplete collection
    const incompleteCollection = await collections.findOne({
      _id: new ObjectId('68f45ac0307d8d312d331e2c')
    });
    
    console.log('🔍 Incomplete Collection Found:');
    console.log(JSON.stringify(incompleteCollection, null, 2));
    
    // Check if there are other incomplete collections
    const incompleteCollections = await collections.find({
      isCompleted: false
    }).toArray();
    
    console.log('\n📊 Total Incomplete Collections:', incompleteCollections.length);
    incompleteCollections.forEach((col, index) => {
      console.log(`${index + 1}. Machine: ${col.machineName}, Location: ${col.location}, Timestamp: ${col.timestamp}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkIncompleteCollection();
