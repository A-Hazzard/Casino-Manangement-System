const { MongoClient } = require('mongodb');

async function testMachineMetersUpdate() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('sas-dev');
    const machines = db.collection('machines');
    const collections = db.collection('collections');

    // Find any machine with recent collections
    const recentCollections = await collections
      .find({
        isCompleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    if (recentCollections.length === 0) {
      console.log('❌ No incomplete collections found to test with');
      return;
    }

    console.log('📊 Recent Incomplete Collections:');
    recentCollections.forEach((col, index) => {
      console.log(`${index + 1}. Machine ID: ${col.machineId}`);
      console.log(`   Collection ID: ${col._id}`);
      console.log(`   MetersIn: ${col.metersIn}, MetersOut: ${col.metersOut}`);
      console.log(`   PrevIn: ${col.prevIn}, PrevOut: ${col.prevOut}`);
      console.log(`   IsCompleted: ${col.isCompleted}`);
      console.log(`   CreatedAt: ${col.createdAt}`);
      console.log('   ---');
    });

    // Test with the first machine that has incomplete collections
    const testCollection = recentCollections[0];
    const machineId = testCollection.machineId;

    console.log(`\n🔍 Testing Machine ${machineId}:`);

    const testMachine = await machines.findOne({
      _id: new require('mongodb').ObjectId(machineId),
    });

    if (!testMachine) {
      console.log('❌ Test machine not found');
      return;
    }

    console.log('Machine Current State:');
    console.log('Machine ID:', testMachine._id);
    console.log('Current collectionMeters:', testMachine.collectionMeters);

    console.log('\n🔍 Comparing Machine Meters vs Most Recent Collection:');
    console.log(
      `Machine collectionMeters: ${testMachine.collectionMeters?.metersIn}, ${testMachine.collectionMeters?.metersOut}`
    );
    console.log(
      `Most recent collection meters: ${testCollection.metersIn}, ${testCollection.metersOut}`
    );

    const machineMatchesCollection =
      testMachine.collectionMeters?.metersIn === testCollection.metersIn &&
      testMachine.collectionMeters?.metersOut === testCollection.metersOut;

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
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testMachineMetersUpdate();
