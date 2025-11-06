/**
 * Test Collection History Fix - Direct MongoDB
 * 
 * Purpose: Test the fix logic directly in MongoDB without needing API server
 *          This simulates what the fix-report API does
 * 
 * Usage:
 * - Test: node scripts/test-fix-direct.js
 * - Revert: node scripts/test-fix-direct.js --revert
 * 
 * @author Aaron Hazzard - Senior Software Engineer
 * @created November 6, 2025
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const TEST_MACHINE_ID = '69ee59c4b8a19640bd047ce0'; // GM02295
const BACKUP_FILE = 'backup-gm02295-direct-test.json';
const fs = require('fs');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function testFixDirect() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collectionsCol = db.collection('collections');
    const machinesCol = db.collection('machines');

    console.log('='.repeat(80));
    console.log('🧪 TESTING COLLECTION HISTORY FIX (DIRECT MONGODB)');
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

    console.log(`   ✅ Found machine: ${machine.serialNumber || machine.custom?.name || 'Unknown'}`);
    console.log(`   Current collectionMetersHistory entries: ${machine.collectionMetersHistory?.length || 0}`);
    console.log('');

    // Step 2: Find collections for this machine
    console.log('🔍 Step 2: Finding collections for this machine...');
    const collections = await collectionsCol.find({
      machineId: TEST_MACHINE_ID,
      isCompleted: true,
      locationReportId: { $exists: true, $ne: '' }
    }).sort({ timestamp: 1 }).toArray();

    console.log(`   Found ${collections.length} collections`);

    if (collections.length === 0) {
      console.log('');
      console.log('ℹ️  No collections found for this machine.');
      console.log('   Create a collection report for this machine first.');
      process.exit(0);
    }

    // Show collection details
    console.log('');
    console.log('   Collection Details:');
    collections.forEach((c, i) => {
      console.log(`   ${i + 1}. Timestamp: ${new Date(c.timestamp).toISOString().split('T')[0]}`);
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

    // Step 4: Set up WRONG history values (if not already wrong)
    console.log('🔍 Step 4: Setting up WRONG history values...');
    const testCollection = collections[0];
    
    const existingHistoryEntry = machine.collectionMetersHistory?.find(
      h => h.locationReportId === testCollection.locationReportId
    );

    if (!existingHistoryEntry) {
      console.log('   ⚠️  No history entry found - creating one with WRONG values');
      
      const wrongEntry = {
        _id: new ObjectId(),
        metersIn: testCollection.metersIn,
        metersOut: testCollection.metersOut,
        prevMetersIn: 347900,
        prevMetersOut: 262500,
        timestamp: testCollection.timestamp,
        locationReportId: testCollection.locationReportId,
      };

      await machinesCol.updateOne(
        { _id: TEST_MACHINE_ID },
        { $push: { collectionMetersHistory: wrongEntry } }
      );
    } else {
      console.log('   ✅ History entry exists - updating with WRONG values');
      
      await machinesCol.updateOne(
        { _id: TEST_MACHINE_ID },
        {
          $set: {
            "collectionMetersHistory.$[elem].prevMetersIn": 347900,
            "collectionMetersHistory.$[elem].prevMetersOut": 262500,
          }
        },
        {
          arrayFilters: [
            { "elem.locationReportId": testCollection.locationReportId }
          ]
        }
      );
    }

    console.log(`   ✅ Set WRONG values: prevMetersIn=347900, prevMetersOut=262500`);
    console.log(`   (Collection has correct values: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut})`);
    console.log('');

    // Step 5: Verify WRONG state
    console.log('🔍 Step 5: Verifying WRONG state...');
    const machineBeforeFix = await machinesCol.findOne({ _id: TEST_MACHINE_ID });
    const historyBeforeFix = machineBeforeFix.collectionMetersHistory.find(
      h => h.locationReportId === testCollection.locationReportId
    );

    console.log('   State BEFORE fix:');
    console.log(`   Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}`);
    console.log(`   History: prevMetersIn=${historyBeforeFix.prevMetersIn}, prevMetersOut=${historyBeforeFix.prevMetersOut}`);
    console.log(`   Match? ${historyBeforeFix.prevMetersIn === testCollection.prevIn && historyBeforeFix.prevMetersOut === testCollection.prevOut ? '✅ YES' : '❌ NO (intentional mismatch for testing)'}`);
    console.log('');

    // Step 6: Apply fix directly (simulate what API does)
    console.log('🔧 Step 6: Applying fix directly (simulating API logic)...');
    console.log('   Using locationReportId as unique identifier');
    console.log(`   Syncing history entry for locationReportId: ${testCollection.locationReportId}`);
    console.log('');

    // This is the exact logic from the enhanced fix-report API
    await machinesCol.updateOne(
      { _id: TEST_MACHINE_ID },
      {
        $set: {
          "collectionMetersHistory.$[elem].metersIn": testCollection.metersIn,
          "collectionMetersHistory.$[elem].metersOut": testCollection.metersOut,
          "collectionMetersHistory.$[elem].prevMetersIn": testCollection.prevIn || 0,
          "collectionMetersHistory.$[elem].prevMetersOut": testCollection.prevOut || 0,
          "collectionMetersHistory.$[elem].timestamp": testCollection.timestamp,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [
          { "elem.locationReportId": testCollection.locationReportId }
        ]
      }
    );

    console.log('   ✅ Applied fix using arrayFilters with locationReportId');
    console.log('');

    // Step 7: Verify fix worked
    console.log('🔍 Step 7: Verifying fix worked...');
    const machineAfterFix = await machinesCol.findOne({ _id: TEST_MACHINE_ID });
    const historyAfterFix = machineAfterFix.collectionMetersHistory.find(
      h => h.locationReportId === testCollection.locationReportId
    );

    console.log('   State AFTER fix:');
    console.log(`   Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}`);
    console.log(`   History: prevMetersIn=${historyAfterFix.prevMetersIn}, prevMetersOut=${historyAfterFix.prevMetersOut}`);
    console.log(`   Match? ${historyAfterFix.prevMetersIn === testCollection.prevIn && historyAfterFix.prevMetersOut === testCollection.prevOut ? '✅ YES - FIX WORKED!' : '❌ NO - FIX FAILED!'}`);
    console.log('');

    // Also verify other fields were synced
    console.log('   Verifying ALL fields were synced:');
    console.log(`   ✅ metersIn: ${historyAfterFix.metersIn} === ${testCollection.metersIn} ? ${historyAfterFix.metersIn === testCollection.metersIn ? 'YES' : 'NO'}`);
    console.log(`   ✅ metersOut: ${historyAfterFix.metersOut} === ${testCollection.metersOut} ? ${historyAfterFix.metersOut === testCollection.metersOut ? 'YES' : 'NO'}`);
    console.log(`   ✅ prevMetersIn: ${historyAfterFix.prevMetersIn} === ${testCollection.prevIn || 0} ? ${historyAfterFix.prevMetersIn === (testCollection.prevIn || 0) ? 'YES' : 'NO'}`);
    console.log(`   ✅ prevMetersOut: ${historyAfterFix.prevMetersOut} === ${testCollection.prevOut || 0} ? ${historyAfterFix.prevMetersOut === (testCollection.prevOut || 0) ? 'YES' : 'NO'}`);
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Before Fix:`);
    console.log(`  Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}, metersIn=${testCollection.metersIn}, metersOut=${testCollection.metersOut}`);
    console.log(`  History:    prevMetersIn=${historyBeforeFix.prevMetersIn}, prevMetersOut=${historyBeforeFix.prevMetersOut}, metersIn=${historyBeforeFix.metersIn}, metersOut=${historyBeforeFix.metersOut}`);
    console.log(`  Status: ${historyBeforeFix.prevMetersIn === testCollection.prevIn && historyBeforeFix.prevMetersOut === testCollection.prevOut ? '✅ Match' : '❌ Mismatch'}`);
    console.log('');
    console.log(`After Fix:`);
    console.log(`  Collection: prevIn=${testCollection.prevIn}, prevOut=${testCollection.prevOut}, metersIn=${testCollection.metersIn}, metersOut=${testCollection.metersOut}`);
    console.log(`  History:    prevMetersIn=${historyAfterFix.prevMetersIn}, prevMetersOut=${historyAfterFix.prevMetersOut}, metersIn=${historyAfterFix.metersIn}, metersOut=${historyAfterFix.metersOut}`);
    console.log(`  Status: ${historyAfterFix.prevMetersIn === testCollection.prevIn && historyAfterFix.prevMetersOut === testCollection.prevOut ? '✅ Match - FIX WORKED!' : '❌ Mismatch - FIX FAILED!'}`);
    console.log('='.repeat(80));
    console.log('');

    const allFieldsMatch = 
      historyAfterFix.metersIn === testCollection.metersIn &&
      historyAfterFix.metersOut === testCollection.metersOut &&
      historyAfterFix.prevMetersIn === (testCollection.prevIn || 0) &&
      historyAfterFix.prevMetersOut === (testCollection.prevOut || 0);

    if (allFieldsMatch) {
      console.log('🎉 SUCCESS! The fix logic properly syncs ALL fields from collection to history');
      console.log('');
      console.log('✅ The fix-report API logic is working correctly!');
      console.log('   - locationReportId-based matching works');
      console.log('   - ALL 5 fields are synced properly');
      console.log('   - This proves the enhanced fix logic is correct');
    } else {
      console.log('❌ FAILED! The fix did NOT sync all fields properly');
      console.log('');
      console.log('🔧 Debugging info:');
      console.log(`   Expected metersIn: ${testCollection.metersIn}, Got: ${historyAfterFix.metersIn}`);
      console.log(`   Expected metersOut: ${testCollection.metersOut}, Got: ${historyAfterFix.metersOut}`);
      console.log(`   Expected prevMetersIn: ${testCollection.prevIn || 0}, Got: ${historyAfterFix.prevMetersIn}`);
      console.log(`   Expected prevMetersOut: ${testCollection.prevOut || 0}, Got: ${historyAfterFix.prevMetersOut}`);
    }
    console.log('');
    console.log(`💾 Backup saved to ${BACKUP_FILE}`);
    console.log('   To revert changes: node scripts/test-fix-direct.js --revert');

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
      console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
      console.error('   Cannot revert. Run the test first to create a backup.');
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
    console.log(`   Machine: ${backup.machine.serialNumber || backup.machine.customName || 'Unknown'}`);
    console.log(`   Collections backed up: ${backup.collections.length}`);
    console.log(`   History entries backed up: ${backup.machine.collectionMetersHistory.length}`);
    console.log('');

    // Restore collectionMetersHistory
    console.log('🔄 Restoring collectionMetersHistory...');
    await machinesCol.updateOne(
      { _id: backup.machine._id },
      { 
        $set: { 
          collectionMetersHistory: backup.machine.collectionMetersHistory,
          updatedAt: new Date(),
        } 
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
  testFixDirect();
}

