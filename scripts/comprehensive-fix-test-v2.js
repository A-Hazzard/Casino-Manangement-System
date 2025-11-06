/**
 * Comprehensive Collection History Fix Test Script V2
 * Enhanced with better tracking and verification
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');
const fs = require('fs');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Extract database name from MONGO_URI
const DB_NAME = (() => {
  const match = MONGO_URI.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'test';
})();

// Test data IDs
const TEST_MACHINE_ID = new ObjectId();
const TEST_LOCATION_ID = 'test-location-id';
const BACKUP_FILE = `backup-comprehensive-test-${Date.now()}.json`;
const MACHINE_ID_FILE = 'test-machine-id.txt';

// Mode flags
const isDryRun = !process.argv.includes('--execute');
const shouldCleanup = !process.argv.includes('--no-cleanup');
const shouldRevert = process.argv.includes('--revert');

console.log('\n🧪 ========================================');
console.log('   COMPREHENSIVE FIX-REPORT API TEST V2');
console.log('=========================================\n');

if (isDryRun) {
  console.log('🔍 DRY-RUN MODE - No data will be modified');
  console.log('   Use --execute to actually create test data\n');
}

/**
 * Generate test data with multiple types of corruptions
 */
function generateTestData() {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // Report IDs
  const reportIds = {
    oct21: `report-oct21-${Date.now()}`,
    oct28: `report-oct28-${Date.now()}`,
    oct29: `report-oct29-${Date.now()}`,
    oct30: `report-oct30-${Date.now()}`,
    orphaned: `report-orphaned-${Date.now()}`,
  };

  // Machine document
  const machine = {
    _id: TEST_MACHINE_ID.toString(), // String _id
    serialNumber: 'TEST-MACHINE-001',
    custom: { name: 'Test Machine 001' },
    isSasMachine: true,
    gamingLocation: TEST_LOCATION_ID,
    collectionMeters: {
      metersIn: 444773,
      metersOut: 361214.4,
    },
    collectionMetersHistory: [
      // CORRUPTION 1: Duplicate locationReportId (oct30 appears twice)
      {
        _id: new ObjectId().toString(),
        metersIn: 450000,
        metersOut: 365000,
        prevMetersIn: 450000, // CORRUPTION: Wrong prevMeters (should be 444773)
        prevMetersOut: 365000, // CORRUPTION: Wrong prevMeters (should be 361214.4)
        timestamp: new Date(now - 7 * day), // Oct 30
        locationReportId: reportIds.oct30,
      },
      {
        _id: new ObjectId().toString(),
        metersIn: 450000,
        metersOut: 365000,
        prevMetersIn: 450000, // CORRUPTION: Wrong prevMeters
        prevMetersOut: 365000, // CORRUPTION: Wrong prevMeters
        timestamp: new Date(now), // Today (DUPLICATE!)
        locationReportId: reportIds.oct30, // DUPLICATE locationReportId!
      },
      // CORRUPTION 2: Duplicate date (Oct 29 has two entries)
      {
        _id: new ObjectId().toString(),
        metersIn: 444773,
        metersOut: 361214.4,
        prevMetersIn: 444014,
        prevMetersOut: 360151.65,
        timestamp: new Date(now - 8 * day), // Oct 29
        locationReportId: reportIds.oct29,
      },
      {
        _id: new ObjectId().toString(),
        metersIn: 440000, // Different meters
        metersOut: 358000, // Different meters
        prevMetersIn: 440104,
        prevMetersOut: 357417.65,
        timestamp: new Date(now - 8 * day), // Oct 29 (DUPLICATE DATE!)
        locationReportId: `duplicate-date-${Date.now()}`, // Different report ID
      },
      // Valid entry (Oct 28)
      {
        _id: new ObjectId().toString(),
        metersIn: 444014,
        metersOut: 360151.65,
        prevMetersIn: 440104,
        prevMetersOut: 357417.65,
        timestamp: new Date(now - 9 * day), // Oct 28
        locationReportId: reportIds.oct28,
      },
      // Valid entry (Oct 21)
      {
        _id: new ObjectId().toString(),
        metersIn: 440104,
        metersOut: 357417.65,
        prevMetersIn: 0,
        prevMetersOut: 0,
        timestamp: new Date(now - 16 * day), // Oct 21
        locationReportId: reportIds.oct21,
      },
      // CORRUPTION 5: Orphaned entry (no collection exists for this report)
      {
        _id: new ObjectId().toString(),
        metersIn: 400000,
        metersOut: 350000,
        prevMetersIn: 390000,
        prevMetersOut: 340000,
        timestamp: new Date(now - 20 * day), // Oct 17
        locationReportId: reportIds.orphaned, // No collection exists!
      },
    ],
    assetStatus: 'functional',
    createdAt: new Date(now - 30 * day),
    updatedAt: now,
  };

  // Collection documents
  const collections = [
    // Oct 21 - First collection (valid)
    {
      _id: new ObjectId().toString(), // String _id
      machineId: TEST_MACHINE_ID.toString(),
      locationReportId: reportIds.oct21,
      isCompleted: true,
      metersIn: 440104,
      metersOut: 357417.65,
      prevIn: 0,
      prevOut: 0,
      movement: {
        metersIn: 440104,
        metersOut: 357417.65,
        gross: 82686.35,
      },
      timestamp: new Date(now - 16 * day),
      collectionTime: new Date(now - 16 * day),
      location: 'Test Location',
      collector: 'Test Admin',
      serialNumber: 'TEST-MACHINE-001',
      createdAt: new Date(now - 16 * day),
      updatedAt: new Date(now - 16 * day),
    },
    // Oct 28 - Second collection (valid)
    {
      _id: new ObjectId().toString(), // String _id
      machineId: TEST_MACHINE_ID.toString(),
      locationReportId: reportIds.oct28,
      isCompleted: true,
      metersIn: 444014,
      metersOut: 360151.65,
      prevIn: 440104,
      prevOut: 357417.65,
      movement: {
        metersIn: 3910,
        metersOut: 2734,
        gross: 1176,
      },
      timestamp: new Date(now - 9 * day),
      collectionTime: new Date(now - 9 * day),
      location: 'Test Location',
      collector: 'Test Admin',
      serialNumber: 'TEST-MACHINE-001',
      createdAt: new Date(now - 9 * day),
      updatedAt: new Date(now - 9 * day),
    },
    // Oct 29 - Third collection (valid)
    {
      _id: new ObjectId().toString(), // String _id
      machineId: TEST_MACHINE_ID.toString(),
      locationReportId: reportIds.oct29,
      isCompleted: true,
      metersIn: 444773,
      metersOut: 361214.4,
      prevIn: 444014,
      prevOut: 360151.65,
      movement: {
        metersIn: 759,
        metersOut: 1062.75,
        gross: -303.75,
      },
      timestamp: new Date(now - 8 * day),
      collectionTime: new Date(now - 8 * day),
      location: 'Test Location',
      collector: 'Test Admin',
      serialNumber: 'TEST-MACHINE-001',
      createdAt: new Date(now - 8 * day),
      updatedAt: new Date(now - 8 * day),
    },
    // Oct 30 - Fourth collection
    // CORRUPTION 4: Wrong prevIn/prevOut (references itself instead of Oct 29!)
    {
      _id: new ObjectId().toString(), // String _id
      machineId: TEST_MACHINE_ID.toString(),
      locationReportId: reportIds.oct30,
      isCompleted: true,
      metersIn: 450000, // Different from Oct 29 (actual movement)
      metersOut: 365000, // Different from Oct 29 (actual movement)
      prevIn: 450000, // WRONG! References itself! Should be 444773 (from Oct 29)
      prevOut: 365000, // WRONG! References itself! Should be 361214.4 (from Oct 29)
      movement: {
        metersIn: 0, // Wrong calculation (should be 5227)
        metersOut: 0, // Wrong calculation (should be 3785.6)
        gross: 0, // Wrong calculation (should be 1441.4)
      },
      timestamp: new Date(now - 7 * day),
      collectionTime: new Date(now - 7 * day),
      location: 'Test Location',
      collector: 'Test Admin',
      serialNumber: 'TEST-MACHINE-001',
      createdAt: new Date(now - 7 * day),
      updatedAt: new Date(now - 7 * day),
    },
  ];

  // Collection Reports
  const collectionReports = collections.map(c => ({
    _id: new ObjectId().toString(), // String _id
    locationReportId: c.locationReportId,
    timestamp: c.timestamp,
    location: c.location,
    collector: c.collector,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return {
    machine,
    collections,
    collectionReports,
    reportIds,
  };
}

/**
 * Check machine history immediately after fix
 */
async function checkMachineHistoryNow(db) {
  console.log('🔍 IMMEDIATE CHECK: Machine history state...\n');
  
  const machine = await db.collection('machines').findOne({ _id: TEST_MACHINE_ID.toString() });
  
  if (!machine) {
    console.log('❌ Machine not found immediately after fix!');
    return;
  }
  
  const history = machine.collectionMetersHistory || [];
  console.log(`History entries: ${history.length}`);
  
  // Group by locationReportId
  const groups = {};
  history.forEach((entry, i) => {
    const id = entry.locationReportId || 'NO_ID';
    if (!groups[id]) groups[id] = [];
    groups[id].push({ index: i, timestamp: new Date(entry.timestamp).toLocaleDateString() });
  });
  
  for (const [reportId, entries] of Object.entries(groups)) {
    if (entries.length > 1) {
      console.log(`⚠️ DUPLICATE: ${reportId.substring(0, 30)}... (${entries.length} entries)`);
      entries.forEach(e => console.log(`   [${e.index}] ${e.timestamp}`));
    }
  }
  
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  let client;

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    console.log(`✅ Connected to database: ${DB_NAME}\n`);

    if (shouldRevert) {
      console.log('🔄 REVERT MODE - Cleaning up test data...\n');

      // Read machine ID from file
      let machineIdToClean = TEST_MACHINE_ID.toString();
      if (fs.existsSync(MACHINE_ID_FILE)) {
        machineIdToClean = fs.readFileSync(MACHINE_ID_FILE, 'utf8').trim();
        console.log(`Using machine ID from file: ${machineIdToClean}\n`);
      }

      if (!isDryRun) {
        // Delete test data
        const machineResult = await db.collection('machines').deleteOne({ _id: machineIdToClean });
        const collectionsResult = await db
          .collection('collections')
          .deleteMany({ machineId: machineIdToClean });
        const reportsResult = await db.collection('collectionreports').deleteMany({
          locationReportId: { $regex: '^report-' },
        });

        console.log(`✅ Deleted ${machineResult.deletedCount} machine`);
        console.log(`✅ Deleted ${collectionsResult.deletedCount} collections`);
        console.log(`✅ Deleted ${reportsResult.deletedCount} collection reports`);

        if (fs.existsSync(MACHINE_ID_FILE)) {
          fs.unlinkSync(MACHINE_ID_FILE);
          console.log('✅ Machine ID file deleted\n');
        }
        if (fs.existsSync(BACKUP_FILE)) {
          fs.unlinkSync(BACKUP_FILE);
          console.log('✅ Backup file deleted\n');
        }
      }

      console.log('✅ Revert complete!');
      return;
    }

    // STEP 1: Generate test data
    console.log('📝 STEP 1: Generating test data...\n');
    const testData = generateTestData();

    // Save machine ID to file for later cleanup
    fs.writeFileSync(MACHINE_ID_FILE, TEST_MACHINE_ID.toString());

    console.log('Generated test data:');
    console.log(`  - Machine ID: ${TEST_MACHINE_ID}`);
    console.log(`  - Collections: ${testData.collections.length}`);
    console.log(
      `  - History entries: ${testData.machine.collectionMetersHistory.length}`
    );
    console.log(
      `  - Collection reports: ${testData.collectionReports.length}\n`
    );

    console.log('Intentional corruptions:');
    console.log(
      '  ✗ Duplicate locationReportId in history (oct30 appears twice)'
    );
    console.log('  ✗ Duplicate date in history (Oct 29 has two entries)');
    console.log('  ✗ Wrong prevIn/prevOut in Oct 30 collection');
    console.log('  ✗ Wrong prevMetersIn/prevMetersOut in history entries');
    console.log('  ✗ Orphaned history entry (no collection exists)');
    console.log('  ✗ No collection report for duplicate date entry\n');

    if (isDryRun) {
      console.log('🔍 DRY-RUN: Would insert test data into database');
      console.log('   Run with --execute to actually create test data\n');
      return;
    }

    // STEP 2: Insert test data
    console.log('💾 STEP 2: Inserting test data into database...\n');

    // Create backup
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(testData, null, 2));
    console.log(`✅ Backup created: ${BACKUP_FILE}`);
    console.log(`✅ Machine ID saved: ${MACHINE_ID_FILE}\n`);

    await db.collection('machines').insertOne(testData.machine);
    console.log('✅ Machine inserted');

    await db.collection('collections').insertMany(testData.collections);
    console.log('✅ Collections inserted');

    await db
      .collection('collectionreports')
      .insertMany(testData.collectionReports);
    console.log('✅ Collection reports inserted\n');

    // STEP 3: Verify data was inserted
    console.log('🔍 STEP 3: Verifying data insertion...\n');
    
    const machineCheck = await db.collection('machines').findOne({ _id: TEST_MACHINE_ID.toString() });
    const collectionsCheck = await db.collection('collections').find({ machineId: TEST_MACHINE_ID.toString() }).toArray();
    
    console.log(`Machine exists: ${!!machineCheck ? '✅ YES' : '❌ NO'}`);
    console.log(`Collections found: ${collectionsCheck.length}`);
    console.log(`History entries: ${machineCheck?.collectionMetersHistory?.length || 0}\n`);

    // STEP 4: Check issues before fix
    console.log('🔍 STEP 4: Checking issues via check-all-issues API...\n');

    try {
      const checkResponse = await axios.get(
        'http://localhost:3000/api/collection-reports/check-all-issues',
        {
          params: {
            machineId: TEST_MACHINE_ID.toString(),
          },
        }
      );

      console.log('✅ check-all-issues API Response (BEFORE):');
      console.log(JSON.stringify(checkResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.warn('⚠️ check-all-issues API call failed');
      console.warn(`   Error: ${error.message}\n`);
    }

    // STEP 5: Run fix-report API
    console.log('🔧 STEP 5: Running fix-report API...\n');

    try {
      const fixResponse = await axios.post(
        'http://localhost:3000/api/collection-reports/fix-report',
        {
          machineId: TEST_MACHINE_ID.toString(),
        }
      );

      console.log('✅ fix-report API Response:');
      console.log(JSON.stringify(fixResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.warn('⚠️ fix-report API call failed');
      console.warn(`   Error: ${error.message}`);
      if (error.response?.data) {
        console.warn('   Response:', JSON.stringify(error.response.data, null, 2));
      }
      console.log('');
    }

    // STEP 6: Check machine history immediately after fix
    await checkMachineHistoryNow(db);

    // STEP 7: Check issues after fix
    console.log('🔍 STEP 7: Checking issues after fix...\n');

    try {
      const checkResponse = await axios.get(
        'http://localhost:3000/api/collection-reports/check-all-issues',
        {
          params: {
            machineId: TEST_MACHINE_ID.toString(),
          },
        }
      );

      console.log('✅ check-all-issues API Response (AFTER):');
      console.log(JSON.stringify(checkResponse.data, null, 2));

      const hasIssues =
        checkResponse.data.totalIssues > 0 ||
        checkResponse.data.hasMachineHistoryIssues ||
        (checkResponse.data.machines &&
          checkResponse.data.machines.some(m => m.issues && m.issues.length > 0));

      if (hasIssues) {
        console.log('\n⚠️ ISSUES STILL EXIST AFTER FIX!');
        console.log(
          '   The fix API needs enhancement to handle these cases.\n'
        );
      } else {
        console.log('\n✅✅✅ ALL ISSUES RESOLVED! Fix API working perfectly! ✅✅✅\n');
      }
    } catch (error) {
      console.warn('⚠️ check-all-issues API call failed');
      console.warn(`   Error: ${error.message}\n`);
    }

    // STEP 8: Final verification in database
    console.log('🔍 STEP 8: Final database verification...\n');

    const machine = await db
      .collection('machines')
      .findOne({ _id: TEST_MACHINE_ID.toString() });
    const collections = await db
      .collection('collections')
      .find({
        machineId: TEST_MACHINE_ID.toString(),
      })
      .toArray();

    if (!machine) {
      console.log('❌ Machine not found in final verification!');
    } else {
      console.log(
        `Machine history entries: ${machine.collectionMetersHistory.length}`
      );
      console.log(`Collections: ${collections.length}`);

      // Check for duplicates
      const locationReportIds = machine.collectionMetersHistory.map(
        h => h.locationReportId
      );
      const uniqueLocationReportIds = [...new Set(locationReportIds)];
      const hasDuplicateIds =
        locationReportIds.length !== uniqueLocationReportIds.length;

      console.log(`Unique locationReportIds: ${uniqueLocationReportIds.length}`);
      console.log(
        `Duplicate locationReportIds: ${hasDuplicateIds ? 'YES ❌' : 'NO ✅'}`
      );

      // Check Oct 30 collection prevIn/prevOut
      const oct30 = collections.find(
        c => c.locationReportId === testData.reportIds.oct30
      );
      if (oct30) {
        const oct29 = collections.find(
          c => c.locationReportId === testData.reportIds.oct29
        );
        const expectedPrevIn = oct29 ? oct29.metersIn : 0;
        const expectedPrevOut = oct29 ? oct29.metersOut : 0;

        const prevInCorrect = oct30.prevIn === expectedPrevIn;
        const prevOutCorrect = oct30.prevOut === expectedPrevOut;

        console.log(`\nOct 30 Collection prevIn/prevOut:`);
        console.log(
          `  Current: prevIn=${oct30.prevIn}, prevOut=${oct30.prevOut}`
        );
        console.log(
          `  Expected: prevIn=${expectedPrevIn}, prevOut=${expectedPrevOut}`
        );
        console.log(
          `  Status: ${prevInCorrect && prevOutCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`
        );
      }

      console.log('');
    }

    // STEP 9: Cleanup
    if (shouldCleanup) {
      console.log('🧹 STEP 9: Cleaning up test data...\n');

      await db.collection('machines').deleteOne({ _id: TEST_MACHINE_ID.toString() });
      await db
        .collection('collections')
        .deleteMany({ machineId: TEST_MACHINE_ID.toString() });
      await db.collection('collectionreports').deleteMany({
        locationReportId: { $in: Object.values(testData.reportIds) },
      });

      console.log('✅ Test data removed from database');

      if (fs.existsSync(BACKUP_FILE)) {
        fs.unlinkSync(BACKUP_FILE);
        console.log('✅ Backup file deleted');
      }
      if (fs.existsSync(MACHINE_ID_FILE)) {
        fs.unlinkSync(MACHINE_ID_FILE);
        console.log('✅ Machine ID file deleted\n');
      }
    } else {
      console.log('⚠️ Cleanup skipped (--no-cleanup flag set)');
      console.log(`   Machine ID: ${TEST_MACHINE_ID}`);
      console.log(`   Machine ID file: ${MACHINE_ID_FILE}`);
      console.log(
        `   To manually clean up later, run: pnpm test:comprehensive:revert\n`
      );
    }

    console.log('✅ TEST COMPLETE!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

main();

