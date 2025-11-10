require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');

(async () => {
  console.log('📊 Counting collection reports...\n');
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    const collectionReports = db.collection('collectionreports');

    // Count total reports
    const totalCount = await collectionReports.countDocuments({});
    
    console.log(`Total Collection Reports: ${totalCount}`);
    
    // Get first and last report
    const firstReport = await collectionReports.findOne({}, { sort: { timestamp: 1 } });
    const lastReport = await collectionReports.findOne({}, { sort: { timestamp: -1 } });
    
    if (firstReport) {
      console.log(`\nFirst Report:`);
      console.log(`  ID: ${firstReport.locationReportId}`);
      console.log(`  Date: ${new Date(firstReport.timestamp).toLocaleString()}`);
      console.log(`  Location: ${firstReport.location || 'N/A'}`);
    }
    
    if (lastReport) {
      console.log(`\nLast Report:`);
      console.log(`  ID: ${lastReport.locationReportId}`);
      console.log(`  Date: ${new Date(lastReport.timestamp).toLocaleString()}`);
      console.log(`  Location: ${lastReport.location || 'N/A'}`);
    }
    
    // Date range
    if (firstReport && lastReport) {
      const daysDiff = Math.ceil((new Date(lastReport.timestamp) - new Date(firstReport.timestamp)) / (1000 * 60 * 60 * 24));
      console.log(`\nDate Range: ${daysDiff} days`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
})();

