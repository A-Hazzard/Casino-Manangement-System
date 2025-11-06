/**
 * Backfill Script: Fix machineCustomName and Add game Field to Existing Collections
 * 
 * Purpose: Update existing collection documents with correct machineCustomName and game fields
 * 
 * Issues Fixed:
 * 1. Collections created with machineCustomName = machine._id instead of custom.name
 * 2. Collections created before game field was added to schema
 * 
 * Safety: Dry-run mode by default
 * 
 * Usage:
 * - Dry run: node scripts/backfill-collection-machine-fields.js
 * - Execute: node scripts/backfill-collection-machine-fields.js --execute
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const DRY_RUN = !process.argv.includes('--execute');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function backfillCollectionMachineFields() {
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

    // Find all collections
    const allCollections = await collectionsCol.find({}).toArray();
    console.log(`📊 Total collections: ${allCollections.length}`);
    console.log('');

    let needsCustomNameFix = 0;
    let needsGameField = 0;
    let cantFindMachine = 0;
    const updates = [];

    for (const collection of allCollections) {
      const issues = [];
      const updateFields = {};

      // Check if machineCustomName looks like a machine _id (24+ hex chars)
      const customNameLooksLikeId =
        collection.machineCustomName &&
        collection.machineCustomName.length >= 24 &&
        /^[a-f0-9]+$/.test(collection.machineCustomName);

      // Check if machineCustomName equals serialNumber (wrong!)
      const customNameIsSerialNumber =
        collection.machineCustomName &&
        collection.serialNumber &&
        collection.machineCustomName === collection.serialNumber;

      // Check if game field is missing or empty
      const needsGame = !collection.game || collection.game.trim() === '';

      if (customNameLooksLikeId || customNameIsSerialNumber || needsGame) {
        // Fetch the machine document to get correct values
        const machine = await machinesCol.findOne({ _id: collection.machineId });

        if (!machine) {
          console.warn(
            `⚠️  Collection ${collection._id}: Machine not found (${collection.machineId})`
          );
          cantFindMachine++;
          continue;
        }

        // Fix machineCustomName if needed
        if (customNameLooksLikeId) {
          issues.push('machineCustomName is machine _id');
          updateFields.machineCustomName = machine.custom?.name || machine.name || machine.serialNumber || '';
          needsCustomNameFix++;
        } else if (customNameIsSerialNumber) {
          issues.push('machineCustomName equals serialNumber');
          updateFields.machineCustomName = machine.custom?.name || '';
          needsCustomNameFix++;
        }

        // Add game field if missing
        if (needsGame) {
          issues.push('missing game field');
          updateFields.game = machine.game || machine.installedGame || '';
          needsGameField++;
        }

        // Add to updates list
        if (Object.keys(updateFields).length > 0) {
          updates.push({
            _id: collection._id,
            machineId: collection.machineId,
            serialNumber: collection.serialNumber,
            currentCustomName: collection.machineCustomName,
            currentGame: collection.game,
            newCustomName: updateFields.machineCustomName,
            newGame: updateFields.game,
            issues: issues.join(', '),
            updateFields,
          });
        }
      }
    }

    console.log('='.repeat(80));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total collections analyzed: ${allCollections.length}`);
    console.log(`Collections needing custom name fix: ${needsCustomNameFix}`);
    console.log(`Collections needing game field: ${needsGameField}`);
    console.log(`Collections with missing machines: ${cantFindMachine}`);
    console.log(`Total collections to update: ${updates.length}`);
    console.log('');

    if (updates.length > 0) {
      console.log('='.repeat(80));
      console.log('🔧 COLLECTIONS TO UPDATE');
      console.log('='.repeat(80));
      console.log('');

      // Show first 10 as examples
      const samplesToShow = Math.min(10, updates.length);
      for (let i = 0; i < samplesToShow; i++) {
        const update = updates[i];
        console.log(`${i + 1}. Collection: ${update._id}`);
        console.log(`   Machine: ${update.machineId}`);
        console.log(`   Serial: ${update.serialNumber}`);
        console.log(`   Issues: ${update.issues}`);
        if (update.newCustomName !== undefined) {
          console.log(`   Current customName: "${update.currentCustomName}"`);
          console.log(`   New customName: "${update.newCustomName}"`);
        }
        if (update.newGame !== undefined) {
          console.log(`   Current game: "${update.currentGame || '(empty)'}"`);
          console.log(`   New game: "${update.newGame}"`);
        }
        console.log('');
      }

      if (updates.length > samplesToShow) {
        console.log(`... and ${updates.length - samplesToShow} more`);
        console.log('');
      }

      if (DRY_RUN) {
        console.log('🔍 DRY RUN: No data was updated');
        console.log('');
        console.log('⚠️  TO EXECUTE UPDATES:');
        console.log('   node scripts/backfill-collection-machine-fields.js --execute');
        console.log('');
      } else {
        console.log('⚠️  EXECUTING UPDATES...');
        console.log('');

        let updated = 0;
        let failed = 0;

        for (const update of updates) {
          try {
            await collectionsCol.updateOne(
              { _id: update._id },
              { $set: { ...update.updateFields, updatedAt: new Date() } }
            );
            updated++;
            if (updated % 100 === 0) {
              console.log(`   Progress: ${updated}/${updates.length} updated...`);
            }
          } catch (error) {
            console.error(`   ❌ Failed to update ${update._id}:`, error.message);
            failed++;
          }
        }

        console.log('');
        console.log('='.repeat(80));
        console.log('✅ UPDATE COMPLETE');
        console.log('='.repeat(80));
        console.log('');
        console.log(`✅ Successfully updated: ${updated} collections`);
        if (failed > 0) {
          console.log(`❌ Failed to update: ${failed} collections`);
        }
        console.log('');
      }
    } else {
      console.log('✅ No collections need updating!');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

backfillCollectionMachineFields();


