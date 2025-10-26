const { MongoClient } = require('mongodb');

async function checkAvailableMachines() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('sas-dev');
    const machines = db.collection('machines');
    
    console.log('🔍 Available Machines:');
    
    const allMachines = await machines.find({}).limit(10).toArray();
    
    allMachines.forEach((machine, index) => {
      console.log(`${index + 1}. ID: ${machine._id}`);
      console.log(`   Name: ${machine.name}`);
      console.log(`   Serial: ${machine.serialNumber}`);
      console.log(`   CollectionMeters: ${machine.collectionMeters?.metersIn}, ${machine.collectionMeters?.metersOut}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAvailableMachines();
