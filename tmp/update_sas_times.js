const { MongoClient } = require('mongodb');

async function updateCollections() {
  const uri = "mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('sas-prod');
    const collections = db.collection('collections');

    const locationReportId = "2acae64f-07d0-4a4b-b851-fb59a317e6f2";
    
    // I will use exact ISO strings for the SAS meters as they are stored as strings.
    const sasStartTime = new Date("2026-03-12T08:00:00").toISOString(); 
    const sasEndTime = new Date("2026-03-13T07:59:00").toISOString();

    console.log(`Updating collections for report: ${locationReportId}`);
    console.log(`Setting sasStartTime: ${sasStartTime}`);
    console.log(`Setting sasEndTime: ${sasEndTime}`);

    const result = await collections.updateMany(
      { locationReportId: locationReportId },
      {
        $set: {
          "sasMeters.sasStartTime": sasStartTime,
          "sasMeters.sasEndTime": sasEndTime,
          "timestamp": new Date(sasEndTime),
          "collectionTime": new Date(sasEndTime),
          "updatedAt": new Date()
        }
      }
    );

    console.log(`Successfully updated ${result.modifiedCount} documents.`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

updateCollections();
