const { MongoClient } = require('mongodb');

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';

async function checkReportCollections() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');

    const db = client.db('sas-prod-local');
    const collectionsCollection = db.collection('collections');

    // Get collections in the report
    const reportId = '4e36a006-1784-48dd-ad43-b4745fef7c1e';
    const collections = await collectionsCollection
      .find({
        locationReportId: reportId,
      })
      .toArray();

    console.log(`\n📋 Collections in report ${reportId}:`);
    console.log(`Total collections: ${collections.length}`);

    // Group by machineId
    const machineIds = [...new Set(collections.map(c => c.machineId))];
    console.log(`Unique machine IDs: ${machineIds.length}`);

    machineIds.forEach((machineId, index) => {
      const machineCollections = collections.filter(
        c => c.machineId === machineId
      );
      console.log(`\nMachine ${index + 1}: ${machineId}`);
      console.log(`  Collections: ${machineCollections.length}`);
      console.log(`  First timestamp: ${machineCollections[0]?.timestamp}`);
      console.log(
        `  Last timestamp: ${
          machineCollections[machineCollections.length - 1]?.timestamp
        }`
      );
    });

    // Check if our target machine is in this report
    const targetMachineId = '5769366190e560cdab9b8e51';
    const targetMachineInReport = collections.some(
      c => c.machineId === targetMachineId
    );
    console.log(
      `\n🎯 Target machine ${targetMachineId} in report: ${
        targetMachineInReport ? 'YES' : 'NO'
      }`
    );

    if (targetMachineInReport) {
      const targetCollections = collections.filter(
        c => c.machineId === targetMachineId
      );
      console.log(
        `  Collections for target machine: ${targetCollections.length}`
      );
    }
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    await client.close();
  }
}

checkReportCollections().catch(console.error);
