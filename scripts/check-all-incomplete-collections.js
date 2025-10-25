const { MongoClient } = require('mongodb');

async function checkAllIncompleteCollections() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('sas-dev');
    const collections = db.collection('collections');

    // Find all incomplete collections
    const incompleteCollections = await collections
      .find({
        isCompleted: false,
      })
      .toArray();

    console.log(
      '📊 Total Incomplete Collections:',
      incompleteCollections.length
    );

    if (incompleteCollections.length > 0) {
      console.log('\n🔍 Incomplete Collections:');
      incompleteCollections.forEach((col, index) => {
        console.log(`${index + 1}. ID: ${col._id}`);
        console.log(`   Machine: ${col.machineName || 'N/A'}`);
        console.log(`   Location: ${col.location || 'N/A'}`);
        console.log(`   Timestamp: ${col.timestamp}`);
        console.log(`   MetersIn: ${col.metersIn}`);
        console.log(`   MetersOut: ${col.metersOut}`);
        console.log(`   PrevIn: ${col.prevIn}`);
        console.log(`   PrevOut: ${col.prevOut}`);
        console.log(`   Collector: ${col.collector || 'N/A'}`);
        console.log('   ---');
      });
    } else {
      console.log('\n✅ No incomplete collections found');
    }

    // Also check for collections with isCompleted: true but no locationReportId
    const collectionsWithoutReport = await collections
      .find({
        isCompleted: true,
        $or: [
          { locationReportId: { $exists: false } },
          { locationReportId: null },
          { locationReportId: '' },
        ],
      })
      .toArray();

    console.log(
      '\n📊 Collections without locationReportId:',
      collectionsWithoutReport.length
    );
    if (collectionsWithoutReport.length > 0) {
      collectionsWithoutReport.forEach((col, index) => {
        console.log(
          `${index + 1}. ID: ${col._id}, Machine: ${col.machineName}, Location: ${col.location}`
        );
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAllIncompleteCollections();
