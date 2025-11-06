/**
 * Setup Test Scenario for Collection History Fix
 * 
 * Purpose: Intentionally corrupt collectionMetersHistory with WRONG values
 *          to test the fix-report functionality
 * 
 * What it corrupts:
 * - metersIn (set to wrong value)
 * - metersOut (set to wrong value)
 * - prevMetersIn (set to wrong value)
 * - prevMetersOut (set to wrong value)
 * 
 * Usage:
 * - Corrupt: node scripts/setup-test-scenario.js
 * - Revert: node scripts/setup-test-scenario.js --revert
 * 
 * @author Aaron Hazzard - Senior Software Engineer
 * @created November 6, 2025
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const TEST_MACHINE_ID = '69ee59c4b8a19640bd047ce0'; // GM02295
const BACKUP_FILE = 'backup-test-scenario.json';
const fs = require('fs');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function setupTestScenario() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collectionsCol = db.collection('collections');
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log('🎭 SETTING UP TEST SCENARIO - CORRUPTING HISTORY');
    console.log('='.repeat(80));
    console.log(`📋 Machine ID: ${TEST_MACHINE_ID} (GM02295)`);
    console.log('');

    // Step 1: Get machine
    console.log('🔍 Step 1: Fetching machine...');
    const machine = await machinesCol.findOne({ _id: TEST_MACHINE_ID });
    
    if (!machine) {
      console.error('❌ Machine not found');
      process.exit(1);
    }

    console.log(`   ✅ Found machine: ${machine.serialNumber || machine.custom?.name}`);
    console.log('');

    // Step 2: Get collections
    console.log('🔍 Step 2: Finding collections...');
    const collections = await collectionsCol
      .find({
        machineId: TEST_MACHINE_ID,
        isCompleted: true,
        locationReportId: { $exists: true, $ne: '' },
      })
      .sort({ timestamp: 1 })
      .toArray();

    console.log(`   Found ${collections.length} collections`);

    if (collections.length === 0) {
      console.log('');
      console.log('ℹ️  No collections found. Create a collection report first.');
      process.exit(0);
    }
    console.log('');

    // Step 3: Backup
    console.log('🔍 Step 3: Creating backup...');
    const backup = {
      machine: {
        _id: machine._id,
        serialNumber: machine.serialNumber,
        customName: machine.custom?.name,
        collectionMetersHistory: machine.collectionMetersHistory || [],
      },
      collections: collections.map(c => ({
        _id: c._id,
        metersIn: c.metersIn,
        metersOut: c.metersOut,
        prevIn: c.prevIn,
        prevOut: c.prevOut,
        locationReportId: c.locationReportId,
      })),
    };

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
    console.log(`   ✅ Backup saved to ${BACKUP_FILE}`);
    console.log('');

    // Step 4: Corrupt history with WRONG values for ALL fields
    console.log('🎭 Step 4: Corrupting history with WRONG values...');
    console.log('');

    for (const collection of collections) {
      const historyEntry = machine.collectionMetersHistory?.find(
        h => h.locationReportId === collection.locationReportId
      );

      // Generate obviously wrong values
      const wrongMetersIn = collection.metersIn + 99999;
      const wrongMetersOut = collection.metersOut + 88888;
      const wrongPrevIn = collection.prevIn !== 0 ? collection.prevIn + 100000 : 347900;
      const wrongPrevOut = collection.prevOut !== 0 ? collection.prevOut + 100000 : 262500;

      console.log(`   Collection: ${collection.locationReportId.substring(0, 8)}...`);
      console.log(`   ✅ CORRECT values in collection document:`);
      console.log(`      metersIn: ${collection.metersIn}`);
      console.log(`      metersOut: ${collection.metersOut}`);
      console.log(`      prevIn: ${collection.prevIn}`);
      console.log(`      prevOut: ${collection.prevOut}`);
      console.log('');

      if (!historyEntry) {
        console.log(`   Creating history entry with ALL WRONG values...`);
        
        const wrongEntry = {
          _id: new ObjectId(),
          metersIn: wrongMetersIn,
          metersOut: wrongMetersOut,
          prevMetersIn: wrongPrevIn,
          prevMetersOut: wrongPrevOut,
          timestamp: collection.timestamp,
          locationReportId: collection.locationReportId,
        };

        await machinesCol.updateOne(
          { _id: TEST_MACHINE_ID },
          { $push: { collectionMetersHistory: wrongEntry } }
        );

        console.log(`   ✅ Created WRONG history entry:`);
      } else {
        console.log(`   Updating existing history entry with ALL WRONG values...`);
        
        await machinesCol.updateOne(
          { _id: TEST_MACHINE_ID },
          {
            $set: {
              'collectionMetersHistory.$[elem].metersIn': wrongMetersIn,
              'collectionMetersHistory.$[elem].metersOut': wrongMetersOut,
              'collectionMetersHistory.$[elem].prevMetersIn': wrongPrevIn,
              'collectionMetersHistory.$[elem].prevMetersOut': wrongPrevOut,
            },
          },
          {
            arrayFilters: [{ 'elem.locationReportId': collection.locationReportId }],
          }
        );

        console.log(`   ✅ Updated history with WRONG values:`);
      }

      console.log(`      ❌ metersIn: ${wrongMetersIn} (should be ${collection.metersIn})`);
      console.log(`      ❌ metersOut: ${wrongMetersOut} (should be ${collection.metersOut})`);
      console.log(`      ❌ prevMetersIn: ${wrongPrevIn} (should be ${collection.prevIn})`);
      console.log(`      ❌ prevMetersOut: ${wrongPrevOut} (should be ${collection.prevOut})`);
      console.log('');
    }

    // Verify corruption
    console.log('🔍 Verifying history is corrupted...');
    const corruptedMachine = await machinesCol.findOne({ _id: TEST_MACHINE_ID });
    
    for (const collection of collections) {
      const historyEntry = corruptedMachine.collectionMetersHistory.find(
        h => h.locationReportId === collection.locationReportId
      );

      const hasIssues =
        historyEntry.metersIn !== collection.metersIn ||
        historyEntry.metersOut !== collection.metersOut ||
        historyEntry.prevMetersIn !== (collection.prevIn || 0) ||
        historyEntry.prevMetersOut !== (collection.prevOut || 0);

      console.log(`   Report ${collection.locationReportId.substring(0, 8)}... has issues? ${hasIssues ? '✅ YES (intentional)' : '❌ NO'}`);
    }
    console.log('');

    // Instructions
    console.log('='.repeat(80));
    console.log('✅ TEST SCENARIO READY');
    console.log('='.repeat(80));
    console.log('');
    console.log('🌐 Now visit the collection report details page:');
    console.log(`   http://localhost:32081/collection-report/report/[reportId]`);
    console.log('');
    console.log('   Or visit cabinet details:');
    console.log(`   http://localhost:32081/machines/${TEST_MACHINE_ID}`);
    console.log('');
    console.log('📋 What to check:');
    console.log('   1. Yellow warning banner should appear about history issues');
    console.log('   2. Machine metrics should show wrong values in table');
    console.log('   3. Click "Fix Report" or "Fix History" button');
    console.log('   4. Refresh page');
    console.log('   5. Values should now match collection document (correct values)');
    console.log('   6. Warning banner should disappear');
    console.log('');
    console.log('💾 Backup saved to:', BACKUP_FILE);
    console.log('   To revert: node scripts/setup-test-scenario.js --revert');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed\n');
  }
}

async function revertChanges() {
  const client = new MongoClient(MONGODB_URI);

  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
      process.exit(1);
    }

    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log('🔄 REVERTING TO ORIGINAL STATE');
    console.log('='.repeat(80));
    console.log('');

    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    
    console.log('📥 Loading backup...');
    console.log(`   Machine: ${backup.machine.serialNumber || backup.machine.customName}`);
    console.log(`   Restoring ${backup.machine.collectionMetersHistory.length} history entries`);
    console.log('');

    await machinesCol.updateOne(
      { _id: backup.machine._id },
      {
        $set: {
          collectionMetersHistory: backup.machine.collectionMetersHistory,
          updatedAt: new Date(),
        },
      }
    );

    console.log('   ✅ Restored original collectionMetersHistory');
    console.log('');
    console.log('✅ Revert complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed\n');
  }
}

const shouldRevert = process.argv.includes('--revert');

if (shouldRevert) {
  revertChanges();
} else {
  setupTestScenario();
}

