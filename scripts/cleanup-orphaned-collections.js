/**
 * Cleanup Script: Remove Orphaned Collections
 * 
 * Purpose: Delete collections that have locationReportId but the report doesn't exist
 * These are leftover from deleted reports
 * 
 * Safety: Dry-run mode by default
 * 
 * Usage:
 * - Dry run: node scripts/cleanup-orphaned-collections.js
 * - Execute: node scripts/cleanup-orphaned-collections.js --execute
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const DRY_RUN = !process.argv.includes('--execute');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function cleanupOrphanedCollections() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '⚠️  EXECUTE MODE');
    console.log('='.repeat(80));
    console.log('');

    // Find all collections with isCompleted: false and non-empty locationReportId
    const collectionsCol = db.collection('collections');
    const reportsCol = db.collection('collectionreports');

    const allCollections = await collectionsCol.find({
      isCompleted: false,
      locationReportId: { $exists: true, $ne: '' },
    }).toArray();

    console.log(`📊 Found ${allCollections.length} collections with locationReportId and isCompleted: false`);
    console.log('');

    const orphaned = [];

    for (const collection of allCollections) {
      const report = await reportsCol.findOne({
        locationReportId: collection.locationReportId,
      });

      if (!report) {
        orphaned.push(collection);
      }
    }

    console.log(`⚠️  Orphaned collections (report doesn't exist): ${orphaned.length}`);
    console.log('');

    if (orphaned.length > 0) {
      if (DRY_RUN) {
        console.log('Would delete these orphaned collections:');
        orphaned.slice(0, 10).forEach(c => {
          console.log(`   - ${c.machineId} | Report: ${c.locationReportId} (NOT FOUND)`);
        });
        if (orphaned.length > 10) {
          console.log(`   ... and ${orphaned.length - 10} more`);
        }
        console.log('');
        console.log('Run with --execute to delete');
      } else {
        const result = await collectionsCol.deleteMany({
          _id: { $in: orphaned.map(c => c._id) },
        });

        console.log(`✅ Deleted ${result.deletedCount} orphaned collections`);
        console.log('');

        // Verify
        const remaining = await collectionsCol.countDocuments({
          isCompleted: false,
          locationReportId: { $exists: true, $ne: '' },
        });

        console.log(`Remaining collections with orphaned reportId: ${remaining}`);
        if (remaining > 0) {
          console.warn('⚠️  Some orphaned collections still remain - may need manual review');
        }
      }
    } else {
      console.log('✅ No orphaned collections found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

cleanupOrphanedCollections();


