/**
 * Cleanup Script: Remove All Collections Not Related to Dueces
 * 
 * Purpose: Delete collections that either:
 * 1. Reference machines that don't exist anymore
 * 2. Reference machines that exist but don't belong to Dueces location
 * 
 * Safety: Dry-run mode by default
 * 
 * Usage:
 * - Dry run: node scripts/cleanup-orphaned-non-dueces-collections.js
 * - Execute: node scripts/cleanup-orphaned-non-dueces-collections.js --execute
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const DUECES_LOCATION_ID = 'b393ebf50933d1688c3fe2a7';
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
    const collectionsCol = db.collection('collections');
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '⚠️  EXECUTE MODE');
    console.log('='.repeat(80));
    console.log('');

    console.log(`Dueces Location ID: ${DUECES_LOCATION_ID}\n`);

    // Get all collections
    const allCollections = await collectionsCol.find({}).toArray();
    console.log(`📊 Total collections in database: ${allCollections.length}`);
    console.log('');

    const collectionsToDelete = [];
    const collectionsToKeep = [];
    let orphanedCollections = 0;
    let nonDuecesCollections = 0;

    console.log('🔍 Analyzing collections...\n');

    for (const collection of allCollections) {
      // Find the machine this collection belongs to
      const machine = await machinesCol.findOne({ _id: collection.machineId });

      if (!machine) {
        // Machine doesn't exist - orphaned collection
        collectionsToDelete.push({
          _id: collection._id,
          machineId: collection.machineId,
          reason: 'Machine not found (orphaned)',
          serialNumber: collection.serialNumber || 'N/A',
        });
        orphanedCollections++;
      } else {
        // Machine exists - check if it belongs to Dueces
        if (machine.gamingLocation !== DUECES_LOCATION_ID) {
          // Machine belongs to different location - delete collection
          collectionsToDelete.push({
            _id: collection._id,
            machineId: collection.machineId,
            reason: `Machine at location: ${machine.gamingLocation} (not Dueces)`,
            serialNumber: collection.serialNumber || machine.serialNumber || 'N/A',
          });
          nonDuecesCollections++;
        } else {
          // Machine belongs to Dueces - keep collection
          collectionsToKeep.push(collection._id);
        }
      }
    }

    console.log('='.repeat(80));
    console.log('📊 ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total collections: ${allCollections.length}`);
    console.log(`✅ Dueces collections (keep): ${collectionsToKeep.length}`);
    console.log(`❌ Orphaned collections (delete): ${orphanedCollections}`);
    console.log(`❌ Non-Dueces collections (delete): ${nonDuecesCollections}`);
    console.log(`❌ Total to delete: ${collectionsToDelete.length}`);
    console.log('');

    if (collectionsToDelete.length > 0) {
      console.log('='.repeat(80));
      console.log('🗑️  COLLECTIONS TO DELETE');
      console.log('='.repeat(80));
      console.log('');

      // Show first 20 examples
      const samplesToShow = Math.min(20, collectionsToDelete.length);
      for (let i = 0; i < samplesToShow; i++) {
        const item = collectionsToDelete[i];
        console.log(`${i + 1}. Collection: ${item._id}`);
        console.log(`   Machine: ${item.machineId}`);
        console.log(`   Serial: ${item.serialNumber}`);
        console.log(`   Reason: ${item.reason}`);
        console.log('');
      }

      if (collectionsToDelete.length > samplesToShow) {
        console.log(`... and ${collectionsToDelete.length - samplesToShow} more\n`);
      }

      if (DRY_RUN) {
        console.log('🔍 DRY RUN: No data was deleted');
        console.log('');
        console.log('⚠️  TO EXECUTE DELETION:');
        console.log('   node scripts/cleanup-orphaned-non-dueces-collections.js --execute');
        console.log('');
      } else {
        console.log('⚠️  EXECUTING DELETION...\n');

        const idsToDelete = collectionsToDelete.map(item => item._id);
        const result = await collectionsCol.deleteMany({
          _id: { $in: idsToDelete },
        });

        console.log(`✅ Deleted ${result.deletedCount} collections\n`);

        // Verify
        const remainingCollections = await collectionsCol.countDocuments({});
        const duecesCollections = await collectionsCol.countDocuments({
          machineId: { $in: await (async () => {
            const duecesMachines = await machinesCol.find({
              gamingLocation: DUECES_LOCATION_ID
            }).toArray();
            return duecesMachines.map(m => m._id);
          })() }
        });

        console.log('='.repeat(80));
        console.log('✅ VERIFICATION');
        console.log('='.repeat(80));
        console.log('');
        console.log(`Remaining total collections: ${remainingCollections}`);
        console.log(`Dueces collections: ${duecesCollections}`);
        console.log('');

        if (remainingCollections === duecesCollections) {
          console.log('✅ SUCCESS: Only Dueces collections remain!');
        } else {
          console.warn(`⚠️  WARNING: ${remainingCollections - duecesCollections} non-Dueces collections may still exist`);
        }
        console.log('');
      }
    } else {
      console.log('✅ No orphaned or non-Dueces collections found!');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

cleanupOrphanedCollections();


