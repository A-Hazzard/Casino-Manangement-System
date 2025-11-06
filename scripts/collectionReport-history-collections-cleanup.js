/**
 * Cleanup Script: Remove Collections Older Than 2025
 *
 * Purpose: Delete all collections, collection reports, and collection history
 *          from machines that are older than January 1, 2025
 *
 * What it deletes:
 * 1. Collections with timestamp < 2025-01-01
 * 2. Collection reports with timestamp < 2025-01-01
 * 3. Collection meters history entries from machines with timestamp < 2025-01-01
 *
 * Safety: Dry-run mode by default
 *
 * Usage:
 * - Dry run: node scripts/cleanup-old-collections.js
 * - Execute: node scripts/cleanup-old-collections.js --execute
 *
 * WARNING: This operation is irreversible. Always backup your database first.
 *
 * @author Aaron Hazzard - Senior Software Engineer
 * @created November 6, 2025
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const DRY_RUN = !process.argv.includes('--execute');
const CUTOFF_DATE = new Date('2025-01-01T00:00:00.000Z');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function cleanupOldCollections() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collectionsCol = db.collection('collections');
    const reportsCol = db.collection('collectionreports');
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '⚠️  EXECUTE MODE');
    console.log('='.repeat(80));
    console.log(`📅 Cutoff date: ${CUTOFF_DATE.toISOString()}`);
    console.log('');

    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE: No data will be deleted');
      console.log('   Run with --execute flag to actually delete data');
      console.log(
        '   WARNING: Always backup your database before running with --execute'
      );
      console.log('');
    } else {
      console.log('⚠️⚠️⚠️  EXECUTE MODE: Data WILL BE DELETED ⚠️⚠️⚠️');
      console.log('   This operation is irreversible!');
      console.log('');
    }

    // Step 1: Find and delete old collections
    console.log('🔍 Step 1: Finding collections older than 2025...');
    const oldCollections = await collectionsCol
      .find({
        timestamp: { $lt: CUTOFF_DATE },
      })
      .toArray();

    console.log(`   Found ${oldCollections.length} collections to delete`);

    if (oldCollections.length > 0) {
      // Show sample
      console.log('   Sample collections:');
      oldCollections.slice(0, 5).forEach(c => {
        console.log(
          `      - ${c.machineId || c.machineName || 'Unknown'} | ${new Date(c.timestamp).toISOString().split('T')[0]}`
        );
      });
      if (oldCollections.length > 5) {
        console.log(`      ... and ${oldCollections.length - 5} more`);
      }
      console.log('');

      if (!DRY_RUN) {
        const deleteResult = await collectionsCol.deleteMany({
          timestamp: { $lt: CUTOFF_DATE },
        });
        console.log(`   ✅ Deleted ${deleteResult.deletedCount} collections\n`);
      } else {
        console.log(`   Would delete ${oldCollections.length} collections\n`);
      }
    } else {
      console.log('   ℹ️  No old collections found\n');
    }

    // Step 2: Find and delete old collection reports
    console.log('🔍 Step 2: Finding collection reports older than 2025...');
    const oldReports = await reportsCol
      .find({
        timestamp: { $lt: CUTOFF_DATE },
      })
      .toArray();

    console.log(`   Found ${oldReports.length} collection reports to delete`);

    if (oldReports.length > 0) {
      // Show sample
      console.log('   Sample reports:');
      oldReports.slice(0, 5).forEach(r => {
        console.log(
          `      - ${r.locationName || 'Unknown'} | ${new Date(r.timestamp).toISOString().split('T')[0]} | Report ID: ${r.locationReportId || r._id}`
        );
      });
      if (oldReports.length > 5) {
        console.log(`      ... and ${oldReports.length - 5} more`);
      }
      console.log('');

      if (!DRY_RUN) {
        const deleteResult = await reportsCol.deleteMany({
          timestamp: { $lt: CUTOFF_DATE },
        });
        console.log(
          `   ✅ Deleted ${deleteResult.deletedCount} collection reports\n`
        );
      } else {
        console.log(
          `   Would delete ${oldReports.length} collection reports\n`
        );
      }
    } else {
      console.log('   ℹ️  No old collection reports found\n');
    }

    // Step 3: Clean up collection history from machines
    console.log('🔍 Step 3: Finding machines with old collection history...');

    const machinesWithOldHistory = await machinesCol
      .find({
        'collectionMetersHistory.timestamp': { $lt: CUTOFF_DATE },
      })
      .toArray();

    console.log(
      `   Found ${machinesWithOldHistory.length} machines with old history entries`
    );

    if (machinesWithOldHistory.length > 0) {
      // Count total history entries to be removed
      let totalHistoryEntries = 0;
      const machineDetails = [];

      for (const machine of machinesWithOldHistory) {
        if (machine.collectionMetersHistory) {
          const oldEntries = machine.collectionMetersHistory.filter(
            entry => new Date(entry.timestamp) < CUTOFF_DATE
          );
          totalHistoryEntries += oldEntries.length;

          if (machineDetails.length < 5) {
            machineDetails.push({
              id: machine.serialNumber || machine.customName || machine._id,
              count: oldEntries.length,
              totalEntries: machine.collectionMetersHistory.length,
            });
          }
        }
      }

      console.log(
        `   Found ${totalHistoryEntries} history entries to remove across ${machinesWithOldHistory.length} machines`
      );

      // Show sample
      console.log('   Sample machines:');
      machineDetails.forEach(m => {
        console.log(
          `      - ${m.id} | ${m.count} old entries (of ${m.totalEntries} total)`
        );
      });
      if (machinesWithOldHistory.length > 5) {
        console.log(
          `      ... and ${machinesWithOldHistory.length - 5} more machines`
        );
      }
      console.log('');

      if (!DRY_RUN) {
        const updateResult = await machinesCol.updateMany(
          { 'collectionMetersHistory.timestamp': { $lt: CUTOFF_DATE } },
          {
            $pull: {
              collectionMetersHistory: {
                timestamp: { $lt: CUTOFF_DATE },
              },
            },
          }
        );
        console.log(
          `   ✅ Removed ${totalHistoryEntries} history entries from ${updateResult.modifiedCount} machines\n`
        );
      } else {
        console.log(
          `   Would remove ${totalHistoryEntries} history entries from ${machinesWithOldHistory.length} machines\n`
        );
      }
    } else {
      console.log('   ℹ️  No machines with old history entries\n');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(80));
    console.log(
      `Collections ${DRY_RUN ? 'to delete' : 'deleted'}:        ${oldCollections.length}`
    );
    console.log(
      `Collection reports ${DRY_RUN ? 'to delete' : 'deleted'}: ${oldReports.length}`
    );
    console.log(
      `Machines ${DRY_RUN ? 'to update' : 'updated'}:           ${machinesWithOldHistory.length}`
    );

    if (machinesWithOldHistory.length > 0) {
      let totalHistoryEntries = 0;
      for (const machine of machinesWithOldHistory) {
        if (machine.collectionMetersHistory) {
          const oldEntries = machine.collectionMetersHistory.filter(
            entry => new Date(entry.timestamp) < CUTOFF_DATE
          );
          totalHistoryEntries += oldEntries.length;
        }
      }
      console.log(
        `History entries ${DRY_RUN ? 'to remove' : 'removed'}:    ${totalHistoryEntries}`
      );
    }
    console.log('='.repeat(80));
    console.log('');

    const totalItems =
      oldCollections.length +
      oldReports.length +
      (machinesWithOldHistory.length > 0
        ? machinesWithOldHistory.reduce((sum, machine) => {
            if (machine.collectionMetersHistory) {
              return (
                sum +
                machine.collectionMetersHistory.filter(
                  entry => new Date(entry.timestamp) < CUTOFF_DATE
                ).length
              );
            }
            return sum;
          }, 0)
        : 0);

    if (DRY_RUN) {
      console.log(`🎉 Would clean up ${totalItems} total items`);
      console.log('');
      console.log('To actually delete this data, run:');
      console.log('   node scripts/cleanup-old-collections.js --execute');
    } else {
      console.log(`✅ Cleanup completed successfully!`);
      console.log(`🎉 Total items cleaned up: ${totalItems}`);
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the script
cleanupOldCollections();
