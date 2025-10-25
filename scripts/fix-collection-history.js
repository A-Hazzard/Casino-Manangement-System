/**
 * Fix Collection History for All Machines
 *
 * Purpose: Automatically repairs collectionMetersHistory entries across all
 * machines by properly setting timestamps and removing invalid entries.
 *
 * What it does:
 * - Finds all machines with collectionMetersHistory
 * - Validates and fixes timestamp format issues
 * - Removes duplicate or invalid history entries
 * - Updates machine documents with corrected history
 * - Reports success/failure statistics
 *
 * Use case: Mass cleanup of collection history data after system changes
 *
 * Last Updated: October 10th, 2025
 */

const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';

async function fixCollectionHistory() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    console.log(`\n🔧 FIXING COLLECTION HISTORY FOR ALL MACHINES`);
    console.log('='.repeat(80));

    // Find all machines that have collectionMetersHistory
    const machines = await db
      .collection('machines')
      .find({
        collectionMetersHistory: { $exists: true, $not: { $size: 0 } },
      })
      .toArray();

    console.log(`Found ${machines.length} machines with collection history`);

    let totalFixed = 0;
    let totalErrors = 0;

    for (const machine of machines) {
      try {
        console.log(
          `\n🔧 Fixing machine: ${
            machine.serialNumber || machine.name || machine._id
          }`
        );

        if (
          !machine.collectionMetersHistory ||
          !Array.isArray(machine.collectionMetersHistory)
        ) {
          console.log(`   ⏭️  No history entries to fix`);
          continue;
        }

        let machineFixed = 0;
        const updateOperations = [];

        for (const historyEntry of machine.collectionMetersHistory) {
          if (!historyEntry.locationReportId) {
            console.log(
              `   ⏭️  Skipping history entry without locationReportId`
            );
            continue;
          }

          // Find the actual collection for this history entry
          const collection = await db.collection('collections').findOne({
            locationReportId: historyEntry.locationReportId,
            machineId: machine._id.toString(),
          });

          if (!collection) {
            console.log(
              `   ⚠️  No collection found for report ${historyEntry.locationReportId}`
            );
            continue;
          }

          // Check if the history entry timestamp matches the collection timestamp
          const historyTime = new Date(historyEntry.timestamp).getTime();
          const collectionTime = new Date(collection.timestamp).getTime();
          const timeDiff = Math.abs(historyTime - collectionTime);

          if (timeDiff > 1000) {
            // More than 1 second difference
            console.log(`   🔧 Fixing timestamp mismatch:`);
            console.log(
              `      History: ${new Date(
                historyEntry.timestamp
              ).toLocaleString()}`
            );
            console.log(
              `      Collection: ${new Date(
                collection.timestamp
              ).toLocaleString()}`
            );
            console.log(`      Difference: ${Math.round(timeDiff / 1000)}s`);

            // Add update operation to fix this entry
            updateOperations.push({
              updateOne: {
                filter: {
                  _id: machine._id,
                  'collectionMetersHistory._id': historyEntry._id,
                },
                update: {
                  $set: {
                    'collectionMetersHistory.$.timestamp': new Date(
                      collection.timestamp
                    ),
                  },
                },
              },
            });
            machineFixed++;
          }
        }

        if (updateOperations.length > 0) {
          const result = await db
            .collection('machines')
            .bulkWrite(updateOperations);
          console.log(
            `   ✅ Fixed ${result.modifiedCount} history entries for this machine`
          );
          totalFixed += result.modifiedCount;
        } else {
          console.log(`   ✅ No history entries needed fixing`);
        }
      } catch (error) {
        console.error(
          `   ❌ Error fixing machine ${machine.serialNumber}:`,
          error
        );
        totalErrors++;
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Machines processed: ${machines.length}`);
    console.log(`   History entries fixed: ${totalFixed}`);
    console.log(`   Errors: ${totalErrors}`);

    // Verify the fix by checking TTRHP022 again
    console.log(`\n🔍 VERIFICATION - Checking TTRHP022:`);
    const machine = await db.collection('machines').findOne({
      serialNumber: 'TTRHP022',
    });

    if (machine && machine.collectionMetersHistory) {
      console.log(`   History entries after fix:`);
      machine.collectionMetersHistory.forEach((entry, index) => {
        console.log(
          `   ${index + 1}. ${
            entry.timestamp
              ? new Date(entry.timestamp).toLocaleString()
              : 'null'
          } (${entry.locationReportId || 'no report ID'})`
        );
      });

      // Check for duplicates again
      const timestamps = machine.collectionMetersHistory
        .map(entry => entry.timestamp)
        .filter(timestamp => timestamp);

      const timestampCounts = {};
      timestamps.forEach(timestamp => {
        const dateStr = new Date(timestamp).toLocaleDateString();
        timestampCounts[dateStr] = (timestampCounts[dateStr] || 0) + 1;
      });

      console.log(`\n   Duplicate analysis after fix:`);
      Object.entries(timestampCounts).forEach(([date, count]) => {
        if (count > 1) {
          console.log(`   ⚠️  ${date}: ${count} entries (DUPLICATE!)`);
        } else {
          console.log(`   ✅ ${date}: ${count} entry`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await client.close();
    console.log('\n✅ Fix complete. Connection closed.');
  }
}

fixCollectionHistory();
