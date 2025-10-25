const { MongoClient } = require('mongodb');

async function testMachineMetersUpdate() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('sas-dev');
    const machines = db.collection('machines');
    const collections = db.collection('collections');

    // Find a machine to test with
    const testMachine = await machines.findOne({
      name: '1007', // Use machine 1007 from the user's example
    });

    if (!testMachine) {
      console.log('❌ Test machine 1007 not found');
      return;
    }

    console.log('🔍 Test Machine 1007 Current State:');
    console.log('Machine ID:', testMachine._id);
    console.log('Current collectionMeters:', testMachine.collectionMeters);

    // Check for any recent collections for this machine
    const recentCollections = await collections
      .find({
        machineId: String(testMachine._id),
        isCompleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log('\n📊 Recent Incomplete Collections for Machine 1007:');
    recentCollections.forEach((col, index) => {
      console.log(`${index + 1}. Collection ID: ${col._id}`);
      console.log(`   MetersIn: ${col.metersIn}, MetersOut: ${col.metersOut}`);
      console.log(`   PrevIn: ${col.prevIn}, PrevOut: ${col.prevOut}`);
      console.log(`   IsCompleted: ${col.isCompleted}`);
      console.log(`   CreatedAt: ${col.createdAt}`);
      console.log('   ---');
    });

    // Check if machine's collectionMeters match any recent collection
    if (recentCollections.length > 0) {
      const mostRecent = recentCollections[0];
      console.log('\n🔍 Comparing Machine Meters vs Most Recent Collection:');
      console.log(
        `Machine collectionMeters: ${testMachine.collectionMeters?.metersIn}, ${testMachine.collectionMeters?.metersOut}`
      );
      console.log(
        `Most recent collection meters: ${mostRecent.metersIn}, ${mostRecent.metersOut}`
      );

      const machineMatchesCollection =
        testMachine.collectionMeters?.metersIn === mostRecent.metersIn &&
        testMachine.collectionMeters?.metersOut === mostRecent.metersOut;

      if (machineMatchesCollection) {
        console.log(
          '❌ ISSUE: Machine collectionMeters match the most recent collection'
        );
        console.log(
          '   This means the machine meters were updated when the collection was created'
        );
        console.log(
          '   This should NOT happen - machine meters should only update when report is created'
        );
      } else {
        console.log(
          '✅ GOOD: Machine collectionMeters do NOT match the most recent collection'
        );
        console.log(
          '   This means machine meters were NOT updated when the collection was created'
        );
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testMachineMetersUpdate();
