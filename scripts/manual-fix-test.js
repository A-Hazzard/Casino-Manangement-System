const { MongoClient } = require('mongodb');

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';

async function manualFixTest() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');

    const db = client.db('sas-prod-local');
    const machinesCollection = db.collection('machines');
    const collectionsCollection = db.collection('collections');

    // Get machine 1309
    const machineId = '5769366190e560cdab9b8e51';
    const machine = await machinesCollection.findOne({ _id: machineId });

    if (!machine) {
      console.log('❌ Machine 1309 not found');
      return;
    }

    console.log(`\n📋 Machine 1309 (${machine.serialNumber}) - BEFORE FIX:`);

    // Get collections for this machine
    const collections = await collectionsCollection
      .find({
        machineId: machineId,
      })
      .sort({ timestamp: 1 })
      .toArray();

    console.log(`Found ${collections.length} collections for this machine`);

    // Rebuild history with correct prevIn/prevOut
    const newHistory = collections.map((collection, index) => {
      let prevIn = 0;
      let prevOut = 0;

      if (index > 0) {
        const previousCollection = collections[index - 1];
        prevIn = previousCollection.metersIn || 0;
        prevOut = previousCollection.metersOut || 0;
      }

      return {
        locationReportId: collection.locationReportId,
        metersIn: collection.metersIn || 0,
        metersOut: collection.metersOut || 0,
        prevIn: prevIn,
        prevOut: prevOut,
        timestamp: new Date(collection.timestamp),
        createdAt: new Date(collection.createdAt || collection.timestamp),
      };
    });

    console.log('\n🔧 Rebuilt history:');
    newHistory.forEach((entry, index) => {
      console.log(
        `  Entry ${index + 1}: prevIn=${entry.prevIn}, prevOut=${entry.prevOut}`
      );
    });

    // Update the machine document
    const mostRecentCollection = collections[collections.length - 1];
    const updateResult = await machinesCollection.updateOne(
      { _id: machineId },
      {
        $set: {
          collectionMetersHistory: newHistory,
          collectionTime: mostRecentCollection
            ? new Date(mostRecentCollection.timestamp)
            : undefined,
          previousCollectionTime:
            collections.length > 1
              ? new Date(collections[collections.length - 2].timestamp)
              : undefined,
          'collectionMeters.metersIn': mostRecentCollection?.metersIn || 0,
          'collectionMeters.metersOut': mostRecentCollection?.metersOut || 0,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`\n✅ Update result:`, updateResult);

    // Verify the update
    const updatedMachine = await machinesCollection.findOne({ _id: machineId });
    console.log(`\n📋 Machine 1309 - AFTER FIX:`);

    if (
      updatedMachine.collectionMetersHistory &&
      updatedMachine.collectionMetersHistory.length > 0
    ) {
      updatedMachine.collectionMetersHistory.forEach((entry, index) => {
        console.log(
          `  Entry ${index + 1}: prevIn=${entry.prevIn}, prevOut=${
            entry.prevOut
          }`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    await client.close();
  }
}

manualFixTest().catch(console.error);
