/**
 * Investigation Script: isCompleted: false Collections
 *
 * Purpose: Analyze all collections with isCompleted: false to determine
 * which ones should be updated to true based on their locationReportId status
 *
 * Safety: READ-ONLY - does not modify any data
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function investigateIsCompletedFalse() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collectionsCol = db.collection('collections');
    const collectionReportsCol = db.collection('collectionreports');
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log('INVESTIGATION: Collections with isCompleted: false');
    console.log('='.repeat(80));
    console.log('');

    // Find all collections with isCompleted: false
    const incompleteCollections = await collectionsCol
      .find({ isCompleted: false })
      .toArray();

    console.log(
      `📊 Total collections with isCompleted: false: ${incompleteCollections.length}`
    );
    console.log('');

    // Categorize them
    const withLocationReportId = [];
    const withoutLocationReportId = [];
    const withInvalidLocationReportId = [];

    for (const collection of incompleteCollections) {
      if (
        collection.locationReportId &&
        collection.locationReportId.trim() !== ''
      ) {
        // Check if the report actually exists
        const report = await collectionReportsCol.findOne({
          locationReportId: collection.locationReportId,
        });

        if (report) {
          withLocationReportId.push({
            collection,
            report,
          });
        } else {
          withInvalidLocationReportId.push(collection);
        }
      } else {
        withoutLocationReportId.push(collection);
      }
    }

    console.log('📋 CATEGORIZATION:');
    console.log('─'.repeat(80));
    console.log(
      `✅ With VALID locationReportId (report exists): ${withLocationReportId.length}`
    );
    console.log(
      `⚠️  With INVALID locationReportId (report doesn't exist): ${withInvalidLocationReportId.length}`
    );
    console.log(
      `❌ Without locationReportId (truly incomplete): ${withoutLocationReportId.length}`
    );
    console.log('');

    // Analyze collections with VALID locationReportId (should be isCompleted: true)
    if (withLocationReportId.length > 0) {
      console.log('='.repeat(80));
      console.log('✅ COLLECTIONS THAT SHOULD BE isCompleted: true');
      console.log('='.repeat(80));
      console.log('');
      console.log(
        `Found ${withLocationReportId.length} collections with valid reports that should be marked complete:`
      );
      console.log('');

      // Group by report
      const byReport = {};
      for (const item of withLocationReportId) {
        const reportId = item.collection.locationReportId;
        if (!byReport[reportId]) {
          byReport[reportId] = {
            report: item.report,
            collections: [],
          };
        }
        byReport[reportId].collections.push(item.collection);
      }

      for (const [reportId, data] of Object.entries(byReport)) {
        console.log(`📍 Report: ${data.report.locationName} (${reportId})`);
        console.log(
          `   Date: ${new Date(data.report.timestamp).toLocaleString()}`
        );
        console.log(`   Collections in report: ${data.collections.length}`);

        for (const col of data.collections) {
          const machine = await machinesCol.findOne({ _id: col.machineId });
          console.log(
            `   - Machine: ${machine?.serialNumber || col.machineId}`
          );
          console.log(`     Meters: In=${col.metersIn}, Out=${col.metersOut}`);
          console.log(`     PrevIn=${col.prevIn}, PrevOut=${col.prevOut}`);
          console.log(`     isCompleted: ${col.isCompleted} ← SHOULD BE true`);
        }
        console.log('');
      }

      console.log('✅ RECOMMENDATION: Update these to isCompleted: true');
      console.log('');
    }

    // Analyze collections with INVALID locationReportId
    if (withInvalidLocationReportId.length > 0) {
      console.log('='.repeat(80));
      console.log('⚠️  COLLECTIONS WITH ORPHANED locationReportId');
      console.log('='.repeat(80));
      console.log('');
      console.log(
        `Found ${withInvalidLocationReportId.length} collections with locationReportId but no matching report:`
      );
      console.log('');

      for (const col of withInvalidLocationReportId) {
        const machine = await machinesCol.findOne({ _id: col.machineId });
        console.log(`📍 Machine: ${machine?.serialNumber || col.machineId}`);
        console.log(
          `   locationReportId: ${col.locationReportId} (REPORT NOT FOUND)`
        );
        console.log(`   Meters: In=${col.metersIn}, Out=${col.metersOut}`);
        console.log(`   Created: ${new Date(col.createdAt).toLocaleString()}`);
        console.log(
          `   ⚠️  RECOMMENDATION: Clear locationReportId (set to empty string)`
        );
        console.log('');
      }
    }

    // Analyze collections WITHOUT locationReportId
    // Group by age (define outside if block for summary)
    const now = new Date();
    let recent = []; // < 7 days
    let old = []; // >= 7 days

    if (withoutLocationReportId.length > 0) {
      console.log('='.repeat(80));
      console.log('❌ COLLECTIONS WITHOUT locationReportId (Truly Incomplete)');
      console.log('='.repeat(80));
      console.log('');
      console.log(
        `Found ${withoutLocationReportId.length} collections without locationReportId:`
      );
      console.log('');

      for (const col of withoutLocationReportId) {
        const age = (now - new Date(col.createdAt)) / (1000 * 60 * 60 * 24); // days
        if (age < 7) {
          recent.push(col);
        } else {
          old.push(col);
        }
      }

      console.log(`📅 Recent (< 7 days): ${recent.length}`);
      console.log(`📅 Old (>= 7 days): ${old.length}`);
      console.log('');

      if (old.length > 0) {
        console.log('OLD COLLECTIONS (>= 7 days old without report):');
        for (const col of old.slice(0, 10)) {
          // Show first 10
          const machine = await machinesCol.findOne({ _id: col.machineId });
          const age = Math.floor(
            (now - new Date(col.createdAt)) / (1000 * 60 * 60 * 24)
          );
          console.log(
            `   - Machine: ${machine?.serialNumber || col.machineId}`
          );
          console.log(`     Age: ${age} days`);
          console.log(
            `     Created: ${new Date(col.createdAt).toLocaleString()}`
          );
          console.log(
            `     ⚠️  RECOMMENDATION: Consider deleting (likely abandoned)`
          );
        }
        if (old.length > 10) {
          console.log(`   ... and ${old.length - 10} more old collections`);
        }
        console.log('');
      }

      if (recent.length > 0) {
        console.log('RECENT COLLECTIONS (< 7 days without report):');
        for (const col of recent) {
          const machine = await machinesCol.findOne({ _id: col.machineId });
          const age = Math.floor(
            (now - new Date(col.createdAt)) / (1000 * 60 * 60 * 24)
          );
          console.log(
            `   - Machine: ${machine?.serialNumber || col.machineId}`
          );
          console.log(`     Age: ${age} days`);
          console.log(
            `     Created: ${new Date(col.createdAt).toLocaleString()}`
          );
          console.log(
            `     ℹ️  RECOMMENDATION: Keep (might be work in progress)`
          );
        }
        console.log('');
      }
    }

    // FINAL SUMMARY
    console.log('='.repeat(80));
    console.log('📊 FINAL SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Collections Analyzed: ${incompleteCollections.length}`);
    console.log('');
    console.log(`✅ SAFE TO UPDATE (isCompleted: false → true):`);
    console.log(
      `   ${withLocationReportId.length} collections with valid reports`
    );
    console.log('');
    console.log(`⚠️  NEEDS CLEANUP (orphaned locationReportId):`);
    console.log(`   ${withInvalidLocationReportId.length} collections`);
    console.log('');
    console.log(`ℹ️  LEAVE AS-IS (no locationReportId):`);
    console.log(
      `   ${recent.length} recent collections (< 7 days, might be WIP)`
    );
    console.log(
      `   ${old.length} old collections (>= 7 days, consider deleting)`
    );
    console.log('');

    if (withLocationReportId.length > 0) {
      console.log('🔧 NEXT STEPS:');
      console.log('   1. Review the list above');
      console.log(
        '   2. Run cleanup script to update isCompleted: true for validated collections'
      );
      console.log(
        '   3. Fix edit modal to set isCompleted: true when updating reports'
      );
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

investigateIsCompletedFalse();
