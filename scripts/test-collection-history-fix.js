/**
 * Test Collection History Fix Script
 *
 * Purpose: Test if the fix-report API properly syncs collectionMetersHistory
 *          with collection documents
 *
 * Test Flow:
 * 1. Find collections for machine "AARON BOARD" (68f90c0c98e7920bc598e945)
 * 2. Backup current state
 * 3. Modify prevIn/prevOut in collection to 0 (if not already)
 * 4. Add/modify collectionMetersHistory with wrong values
 * 5. Call fix-report API
 * 6. Verify history was updated to match collection
 * 7. Option to revert changes
 *
 * Usage:
 * - Test: node scripts/test-collection-history-fix.js
 * - Revert: node scripts/test-collection-history-fix.js --revert
 *
 * @author Aaron Hazzard - Senior Software Engineer
 * @created November 6, 2025
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');

const MONGODB_URI = process.env.MONGO_URI;
const TEST_MACHINE_ID = '69ee59c4b8a19640bd047ce0'; // GM02295
const BACKUP_FILE = 'backup-gm02295-test.json';
const fs = require('fs');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function testCollectionHistoryFix() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collectionsCol = db.collection('collections');
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log('🧪 TESTING COLLECTION HISTORY FIX');
    console.log('='.repeat(80));
    console.log(`📋 Machine ID: ${TEST_MACHINE_ID} (GM02295)`);
    console.log('');

    // Step 1: Get machine document
    console.log('🔍 Step 1: Fetching machine document...');
    const machine = await machinesCol.findOne({ _id: TEST_MACHINE_ID });

    if (!machine) {
      console.error('❌ Machine not found');
      process.exit(1);
    }

    console.log(
      `   ✅ Found machine: ${machine.serialNumber || machine.custom?.name || 'Unknown'}`
    );
    console.log(
      `   Current collectionMetersHistory entries: ${machine.collectionMetersHistory?.length || 0}`
    );
    console.log('');

    // Step 2: Find collections for this machine
    console.log('🔍 Step 2: Finding collections for this machine...');
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
      console.log('ℹ️  No collections found for this machine.');
      console.log(
        '   Create a collection report for this machine first, then run this test.'
      );
      process.exit(0);
    }

    // Show collection details
    console.log('');
    console.log('   Collection Details:');
    collections.forEach((c, i) => {
      console.log(
        `   ${i + 1}. Timestamp: ${new Date(c.timestamp).toISOString().split('T')[0]}`
      );
      console.log(`      metersIn: ${c.metersIn}, metersOut: ${c.metersOut}`);
      console.log(`      prevIn: ${c.prevIn}, prevOut: ${c.prevOut}`);
      console.log(`      locationReportId: ${c.locationReportId}`);
    });
    console.log('');

    // Step 3: Backup current state
    console.log('🔍 Step 3: Backing up current state...');
    const backup = {
      machine: {
        _id: machine._id,
        serialNumber: machine.serialNumber,
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

    // Step 4: Create test scenario - modify history to have WRONG values
    console.log('🔍 Step 4: Creating test scenario...');
    console.log('   Setting up intentionally WRONG history values to test fix');
    console.log('');

    // Use the first collection for testing
    const testCollection = collections[0];

    console.log(`   Test Collection:`);
    console.log(`      _id: ${testCollection._id}`);
    console.log(`      metersIn: ${testCollection.metersIn}`);
    console.log(`      metersOut: ${testCollection.metersOut}`);
    console.log(
      `      prevIn: ${testCollection.prevIn} (CORRECT value in collection)`
    );
    console.log(
      `      prevOut: ${testCollection.prevOut} (CORRECT value in collection)`
    );
    console.log(`      locationReportId: ${testCollection.locationReportId}`);
    console.log('');

    // Check if history entry exists for this collection
    const existingHistoryEntry = machine.collectionMetersHistory?.find(
      h => h.locationReportId === testCollection.locationReportId
    );

    const wrongPrevIn =
      testCollection.prevIn !== 0 ? testCollection.prevIn + 100000 : 347900;
    const wrongPrevOut =
      testCollection.prevOut !== 0 ? testCollection.prevOut + 100000 : 262500;

    if (!existingHistoryEntry) {
      console.log('   ℹ️  No history entry exists for this collection');
      console.log(
        '   Creating WRONG history entry with incorrect prevMetersIn/prevMetersOut'
      );
      console.log('');

      // Create a history entry with WRONG values
      const wrongHistoryEntry = {
        _id: new ObjectId(),
        metersIn: testCollection.metersIn,
        metersOut: testCollection.metersOut,
        prevMetersIn: wrongPrevIn, // WRONG VALUE
        prevMetersOut: wrongPrevOut, // WRONG VALUE
        timestamp: testCollection.timestamp,
        locationReportId: testCollection.locationReportId,
      };

      await machinesCol.updateOne(
        { _id: TEST_MACHINE_ID },
        { $push: { collectionMetersHistory: wrongHistoryEntry } }
      );

      console.log(`   ✅ Created WRONG history entry:`);
      console.log(
        `      prevMetersIn: ${wrongPrevIn} (WRONG - should be ${testCollection.prevIn})`
      );
      console.log(
        `      prevMetersOut: ${wrongPrevOut} (WRONG - should be ${testCollection.prevOut})`
      );
    } else {
      console.log('   ✅ History entry exists');
      console.log(`   Current values in history:`);
      console.log(`      prevMetersIn: ${existingHistoryEntry.prevMetersIn}`);
      console.log(`      prevMetersOut: ${existingHistoryEntry.prevMetersOut}`);
      console.log('');

      // Update it to have WRONG values
      console.log('   Updating history with WRONG values for testing...');
      await machinesCol.updateOne(
        {
          _id: TEST_MACHINE_ID,
        },
        {
          $set: {
            'collectionMetersHistory.$[elem].prevMetersIn': wrongPrevIn,
            'collectionMetersHistory.$[elem].prevMetersOut': wrongPrevOut,
          },
        },
        {
          arrayFilters: [
            { 'elem.locationReportId': testCollection.locationReportId },
          ],
        }
      );

      console.log(`   ✅ Updated history with WRONG values:`);
      console.log(
        `      prevMetersIn: ${wrongPrevIn} (WRONG - should be ${testCollection.prevIn})`
      );
      console.log(
        `      prevMetersOut: ${wrongPrevOut} (WRONG - should be ${testCollection.prevOut})`
      );
    }
    console.log('');

    // Step 5: Verify the WRONG state
    console.log('🔍 Step 5: Verifying WRONG state before fix...');
    const machineBeforeFix = await machinesCol.findOne({
      _id: TEST_MACHINE_ID,
    });
    const historyBeforeFix = machineBeforeFix.collectionMetersHistory.find(
      h => h.locationReportId === testCollection.locationReportId
    );

    console.log('   State BEFORE fix:');
    console.log(
      `   Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}`
    );
    console.log(
      `   History: prevMetersIn=${historyBeforeFix.prevMetersIn}, prevMetersOut=${historyBeforeFix.prevMetersOut}`
    );
    console.log(
      `   Match? ${historyBeforeFix.prevMetersIn === testCollection.prevIn && historyBeforeFix.prevMetersOut === testCollection.prevOut ? '✅ YES' : '❌ NO (this is intentional for testing)'}`
    );
    console.log('');

    // Step 6: Call the fix API
    console.log('🔧 Step 6: Calling fix-report API...');
    console.log('   POST /api/collection-reports/fix-report');
    console.log(`   Body: { machineId: "${TEST_MACHINE_ID}" }`);
    console.log('');

    try {
      const fixResponse = await axios.post(
        'http://localhost:32081/api/collection-reports/fix-report',
        {
          machineId: TEST_MACHINE_ID,
        },
        {
          timeout: 60000, // 60 second timeout
        }
      );

      console.log('   ✅ Fix API completed successfully');
      console.log(`   Response:`, JSON.stringify(fixResponse.data, null, 2));
      console.log(
        `   Issues Fixed:`,
        JSON.stringify(fixResponse.data.results?.issuesFixed, null, 2)
      );
    } catch (error) {
      console.error('   ❌ Fix API failed:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('   No response received. Is the API server running?');
        console.error('   Request:', error.message);
      } else {
        console.error('   Error:', error.message);
      }
      console.log('');
      console.log(
        '⚠️  Fix failed, but backup is saved. Run with --revert to restore.'
      );
      process.exit(1);
    }
    console.log('');

    // Step 7: Verify the fix worked
    console.log('🔍 Step 7: Verifying fix worked...');
    const machineAfterFix = await machinesCol.findOne({ _id: TEST_MACHINE_ID });
    const historyAfterFix = machineAfterFix.collectionMetersHistory.find(
      h => h.locationReportId === testCollection.locationReportId
    );

    console.log('   State AFTER fix:');
    console.log(
      `   Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}`
    );
    console.log(
      `   History: prevMetersIn=${historyAfterFix.prevMetersIn}, prevMetersOut=${historyAfterFix.prevMetersOut}`
    );
    console.log(
      `   Match? ${historyAfterFix.prevMetersIn === testCollection.prevIn && historyAfterFix.prevMetersOut === testCollection.prevOut ? '✅ YES - FIX WORKED!' : '❌ NO - FIX FAILED!'}`
    );
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Before Fix:`);
    console.log(
      `  Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}`
    );
    console.log(
      `  History:    prevMetersIn=${historyBeforeFix.prevMetersIn}, prevMetersOut=${historyBeforeFix.prevMetersOut}`
    );
    console.log(
      `  Status: ${historyBeforeFix.prevMetersIn === testCollection.prevIn ? '✅ Match' : '❌ Mismatch'}`
    );
    console.log('');
    console.log(`After Fix:`);
    console.log(
      `  Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}`
    );
    console.log(
      `  History:    prevMetersIn=${historyAfterFix.prevMetersIn}, prevMetersOut=${historyAfterFix.prevMetersOut}`
    );
    console.log(
      `  Status: ${historyAfterFix.prevMetersIn === testCollection.prevIn && historyAfterFix.prevMetersOut === testCollection.prevOut ? '✅ Match - FIX WORKED!' : '❌ Mismatch - FIX FAILED!'}`
    );
    console.log('='.repeat(80));
    console.log('');

    if (
      historyAfterFix.prevMetersIn === testCollection.prevIn &&
      historyAfterFix.prevMetersOut === testCollection.prevOut
    ) {
      console.log(
        '🎉 SUCCESS! The fix properly synced collectionMetersHistory with collection document'
      );
      console.log('');
      console.log('✅ The fix-report API is working correctly!');
    } else {
      console.log(
        '❌ FAILED! The fix did NOT sync collectionMetersHistory properly'
      );
      console.log('');
      console.log('🔧 Debugging info:');
      console.log(
        `   Expected: prevMetersIn=${testCollection.prevIn}, prevMetersOut=${testCollection.prevOut}`
      );
      console.log(
        `   Got:      prevMetersIn=${historyAfterFix.prevMetersIn}, prevMetersOut=${historyAfterFix.prevMetersOut}`
      );
    }
    console.log('');
    console.log(`💾 Backup saved to ${BACKUP_FILE}`);
    console.log(
      '   To revert changes: node scripts/test-collection-history-fix.js --revert'
    );
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

async function revertChanges() {
  const client = new MongoClient(MONGODB_URI);

  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.error('❌ Backup file not found. Cannot revert.');
      process.exit(1);
    }

    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log('🔄 REVERTING TEST CHANGES');
    console.log('='.repeat(80));
    console.log('');

    // Load backup
    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));

    console.log('📥 Loading backup...');
    console.log(`   Machine: ${backup.machine.serialNumber || 'Unknown'}`);
    console.log(`   Collections backed up: ${backup.collections.length}`);
    console.log(
      `   History entries backed up: ${backup.machine.collectionMetersHistory.length}`
    );
    console.log('');

    // Restore collectionMetersHistory
    console.log('🔄 Restoring collectionMetersHistory...');
    await machinesCol.updateOne(
      { _id: backup.machine._id },
      {
        $set: {
          collectionMetersHistory: backup.machine.collectionMetersHistory,
          updatedAt: new Date(),
        },
      }
    );

    console.log('   ✅ Restored collectionMetersHistory');
    console.log('');
    console.log('✅ Revert complete!');
    console.log(`   Backup file: ${BACKUP_FILE} (you can delete this now)`);
  } catch (error) {
    console.error('❌ Error during revert:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Check if --revert flag is passed
const shouldRevert = process.argv.includes('--revert');

if (shouldRevert) {
  revertChanges();
} else {
  testCollectionHistoryFix();
}
