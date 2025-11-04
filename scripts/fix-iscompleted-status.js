/**
 * Cleanup Script: Fix isCompleted Status
 *
 * Purpose: Update collections with isCompleted: false to true
 * when they have valid locationReportId and belong to finalized reports
 *
 * Safety Measures:
 * - Validates each collection has a valid report before updating
 * - Logs all changes
 * - Can be run in dry-run mode (no actual updates)
 *
 * Usage:
 * - Dry run: node scripts/fix-iscompleted-status.js
 * - Actual update: node scripts/fix-iscompleted-status.js --execute
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const DRY_RUN = !process.argv.includes('--execute');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function fixIsCompletedStatus() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collectionsCol = db.collection('collections');
    const collectionReportsCol = db.collection('collectionreports');

    console.log('='.repeat(80));
    console.log(
      DRY_RUN
        ? '🔍 DRY RUN MODE - No changes will be made'
        : '⚠️  EXECUTE MODE - Changes will be applied'
    );
    console.log('='.repeat(80));
    console.log('');

    // Find all collections with isCompleted: false
    const incompleteCollections = await collectionsCol
      .find({ isCompleted: false })
      .toArray();

    console.log(
      `📊 Found ${incompleteCollections.length} collections with isCompleted: false`
    );
    console.log('');

    const toUpdate = [];
    const toSkip = [];

    // Validate each collection
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
          toUpdate.push({
            collection,
            report,
          });
        } else {
          toSkip.push({
            collection,
            reason: 'Report not found',
          });
        }
      } else {
        toSkip.push({
          collection,
          reason: 'No locationReportId',
        });
      }
    }

    console.log(`✅ Collections to UPDATE: ${toUpdate.length}`);
    console.log(`⚠️  Collections to SKIP: ${toSkip.length}`);
    console.log('');

    if (toUpdate.length > 0) {
      console.log('='.repeat(80));
      console.log('COLLECTIONS TO UPDATE');
      console.log('='.repeat(80));
      console.log('');

      // Group by report for better visibility
      const byReport = {};
      for (const item of toUpdate) {
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
        console.log(`📍 Report: ${data.report.locationName}`);
        console.log(`   ReportId: ${reportId}`);
        console.log(
          `   Date: ${new Date(data.report.timestamp).toLocaleString()}`
        );
        console.log(`   Collections: ${data.collections.length}`);
        console.log('');
      }

      if (DRY_RUN) {
        console.log(
          '🔍 DRY RUN: Would update these collections to isCompleted: true'
        );
        console.log('   Run with --execute flag to apply changes');
        console.log('');
      } else {
        console.log('⚙️  Updating collections...');
        console.log('');

        const collectionIds = toUpdate.map(item => item.collection._id);

        const result = await collectionsCol.updateMany(
          { _id: { $in: collectionIds } },
          {
            $set: {
              isCompleted: true,
              updatedAt: new Date(),
            },
          }
        );

        console.log(`✅ Updated ${result.modifiedCount} collections`);
        console.log('');

        // Verify the update
        const remainingIncomplete = await collectionsCol.countDocuments({
          _id: { $in: collectionIds },
          isCompleted: false,
        });

        if (remainingIncomplete === 0) {
          console.log(
            '✅ VERIFICATION PASSED: All targeted collections now have isCompleted: true'
          );
        } else {
          console.warn(
            `⚠️  VERIFICATION WARNING: ${remainingIncomplete} collections still have isCompleted: false`
          );
        }
        console.log('');
      }
    }

    if (toSkip.length > 0) {
      console.log('='.repeat(80));
      console.log('COLLECTIONS SKIPPED (Not Updated)');
      console.log('='.repeat(80));
      console.log('');

      for (const item of toSkip) {
        console.log(`⚠️  Collection ${item.collection._id}`);
        console.log(`   Reason: ${item.reason}`);
        console.log(
          `   locationReportId: ${item.collection.locationReportId || '(empty)'}`
        );
        console.log('');
      }
    }

    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Analyzed: ${incompleteCollections.length}`);
    console.log(`Updated: ${DRY_RUN ? 0 : toUpdate.length}`);
    console.log(`Skipped: ${toSkip.length}`);
    console.log('');

    if (DRY_RUN && toUpdate.length > 0) {
      console.log('🔧 To apply changes, run:');
      console.log('   node scripts/fix-iscompleted-status.js --execute');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

fixIsCompletedStatus();
