const { MongoClient } = require('mongodb');

async function testMachineMetersTiming() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('sas-dev');
    const machines = db.collection('machines');
    const collections = db.collection('collections');
    
    console.log('🔍 Testing Machine Meters Timing...');
    
    // Find a machine to test with
    const testMachine = await machines.findOne({
      name: { $regex: /^[0-9]+$/ } // Find a machine with numeric name
    });
    
    if (!testMachine) {
      console.log('❌ No test machine found');
      return;
    }
    
    console.log('📊 Test Machine Found:');
    console.log('Machine ID:', testMachine._id);
    console.log('Machine Name:', testMachine.name);
    console.log('Current collectionMeters:', testMachine.collectionMeters);
    
    // Check for recent collections for this machine
    const recentCollections = await collections.find({
      machineId: String(testMachine._id)
    }).sort({ createdAt: -1 }).limit(3).toArray();
    
    console.log('\n📊 Recent Collections for this Machine:');
    recentCollections.forEach((col, index) => {
      console.log(`${index + 1}. Collection ID: ${col._id}`);
      console.log(`   MetersIn: ${col.metersIn}, MetersOut: ${col.metersOut}`);
      console.log(`   PrevIn: ${col.prevIn}, PrevOut: ${col.prevOut}`);
      console.log(`   IsCompleted: ${col.isCompleted}`);
      console.log(`   CreatedAt: ${col.createdAt}`);
      console.log('   ---');
    });
    
    if (recentCollections.length > 0) {
      const mostRecent = recentCollections[0];
      console.log('\n🔍 Comparing Machine Meters vs Most Recent Collection:');
      console.log(`Machine collectionMeters: ${testMachine.collectionMeters?.metersIn}, ${testMachine.collectionMeters?.metersOut}`);
      console.log(`Most recent collection meters: ${mostRecent.metersIn}, ${mostRecent.metersOut}`);
      
      const machineMatchesCollection = 
        testMachine.collectionMeters?.metersIn === mostRecent.metersIn &&
        testMachine.collectionMeters?.metersOut === mostRecent.metersOut;
      
      if (machineMatchesCollection) {
        console.log('❌ ISSUE: Machine collectionMeters match the most recent collection');
        console.log('   This means the machine meters were updated when the collection was created');
        console.log('   This should NOT happen - machine meters should only update when report is created');
        
        if (!mostRecent.isCompleted) {
          console.log('   🚨 CRITICAL: The collection is NOT completed but machine meters were updated!');
        }
      } else {
        console.log('✅ GOOD: Machine collectionMeters do NOT match the most recent collection');
        console.log('   This means machine meters were NOT updated when the collection was created');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testMachineMetersTiming();
