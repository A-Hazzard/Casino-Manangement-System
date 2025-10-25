const { MongoClient } = require('mongodb');

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';

async function verifyFixResults() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');

    const db = client.db('sas-prod-local');
    const machinesCollection = db.collection('machines');

    // Check machine 1309 specifically
    const machineId = '5769366190e560cdab9b8e51';
    const machine = await machinesCollection.findOne({ _id: machineId });

    if (!machine) {
      console.log('❌ Machine 1309 not found');
      return;
    }

    console.log(
      `\n📋 Machine 1309 (${machine.serialNumber}) collectionMetersHistory:`
    );
    console.log('='.repeat(60));

    if (
      machine.collectionMetersHistory &&
      machine.collectionMetersHistory.length > 0
    ) {
      machine.collectionMetersHistory.forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`  Timestamp: ${entry.timestamp}`);
        console.log(`  MetersIn: ${entry.metersIn}`);
        console.log(`  MetersOut: ${entry.metersOut}`);
        console.log(`  PrevIn: ${entry.prevIn}`);
        console.log(`  PrevOut: ${entry.prevOut}`);
        console.log(`  Movement: ${entry.movement?.gross || 'N/A'}`);
      });

      // Check if prevIn/prevOut are still 0 or undefined
      const hasIssues = machine.collectionMetersHistory.some((entry, index) => {
        if (index === 0) return false; // First entry should have prevIn/prevOut as 0

        const prevInIsZero =
          entry.prevIn === 0 ||
          entry.prevIn === undefined ||
          entry.prevIn === null;
        const prevOutIsZero =
          entry.prevOut === 0 ||
          entry.prevOut === undefined ||
          entry.prevOut === null;

        return prevInIsZero || prevOutIsZero;
      });

      console.log(`\n🔍 Analysis:`);
      console.log(
        `  Has prevIn/prevOut issues: ${hasIssues ? '❌ YES' : '✅ NO'}`
      );

      if (hasIssues) {
        console.log(`\n❌ ISSUES FOUND - The fix did not work properly`);

        // Show which entries have issues
        machine.collectionMetersHistory.forEach((entry, index) => {
          if (index > 0) {
            const prevInIsZero =
              entry.prevIn === 0 ||
              entry.prevIn === undefined ||
              entry.prevIn === null;
            const prevOutIsZero =
              entry.prevOut === 0 ||
              entry.prevOut === undefined ||
              entry.prevOut === null;

            if (prevInIsZero || prevOutIsZero) {
              console.log(
                `  Entry ${index + 1}: prevIn=${entry.prevIn}, prevOut=${
                  entry.prevOut
                }`
              );
              console.log(
                `    Expected: prevIn=${
                  machine.collectionMetersHistory[index - 1].metersIn
                }, prevOut=${
                  machine.collectionMetersHistory[index - 1].metersOut
                }`
              );
            }
          }
        });
      } else {
        console.log(`\n✅ NO ISSUES FOUND - The fix worked correctly`);
      }
    } else {
      console.log('❌ No collectionMetersHistory found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    await client.close();
  }
}

verifyFixResults().catch(console.error);
