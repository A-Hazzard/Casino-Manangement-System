/**
 * Get Report ID for Test Machine
 * 
 * Quick script to get the locationReportId for navigating to report details page
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const TEST_MACHINE_ID = '69ee59c4b8a19640bd047ce0'; // GM02295

async function getReportId() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collectionsCol = db.collection('collections');

    const collection = await collectionsCol.findOne({
      machineId: TEST_MACHINE_ID,
      isCompleted: true,
      locationReportId: { $exists: true, $ne: '' },
    });

    if (!collection) {
      console.log('No collection found for this machine');
      process.exit(0);
    }

    console.log('');
    console.log('📋 Collection Report Details:');
    console.log(`   Location Report ID: ${collection.locationReportId}`);
    console.log(`   Machine: ${collection.machineName || collection.machineCustomName || 'GM02295'}`);
    console.log(`   Location: ${collection.location}`);
    console.log('');
    console.log('🌐 URLs to visit:');
    console.log(`   Report Details: http://localhost:32081/collection-report/report/${collection.locationReportId}`);
    console.log(`   Cabinet Details: http://localhost:32081/machines/${TEST_MACHINE_ID}`);
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

getReportId();

