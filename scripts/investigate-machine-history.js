require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('sas-prod');
  
  const machine = await db.collection('machines').findOne({ 
    _id: '7da1d143fd1868f4a3bac0b0' 
  });
  
  console.log('Machine Serial:', machine?.serialNumber);
  console.log('Machine Name:', machine?.custom?.name);
  console.log('\nCollection History:');
  
  if (machine?.collectionMetersHistory) {
    console.log(`Total entries: ${machine.collectionMetersHistory.length}\n`);
    machine.collectionMetersHistory.slice(0, 10).forEach((h, i) => {
      console.log(`[${i}] Report: ${h.locationReportId}`);
      console.log(`    metersIn: ${h.metersIn} (type: ${typeof h.metersIn})`);
      console.log(`    metersOut: ${h.metersOut} (type: ${typeof h.metersOut})`);
      console.log(`    prevMetersIn: ${h.prevMetersIn} (type: ${typeof h.prevMetersIn})`);
      console.log(`    prevMetersOut: ${h.prevMetersOut} (type: ${typeof h.prevMetersOut})`);
      console.log('');
    });
  } else {
    console.log('  No history found');
  }
  
  // Also check the collection for the report in question
  const collection = await db.collection('collections').findOne({
    machineId: '7da1d143fd1868f4a3bac0b0',
    locationReportId: 'aee5f72f-fd6a-432f-bc58-8373f390fa5d'
  });
  
  if (collection) {
    console.log('\nCollection document for that report:');
    console.log(`  metersIn: ${collection.metersIn} (type: ${typeof collection.metersIn})`);
    console.log(`  metersOut: ${collection.metersOut} (type: ${typeof collection.metersOut})`);
    console.log(`  prevIn: ${collection.prevIn} (type: ${typeof collection.prevIn})`);
    console.log(`  prevOut: ${collection.prevOut} (type: ${typeof collection.prevOut})`);
  }
  
  await client.close();
})();

