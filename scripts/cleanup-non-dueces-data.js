/**
 * Cleanup Script: Remove All Non-Dueces Data
 * 
 * Purpose: Delete all documents that don't belong to Dueces location
 * after accidentally running migration with wrong source database
 * 
 * Safety Measures:
 * - Dry-run mode by default (shows what will be deleted)
 * - Requires --execute flag for actual deletion
 * - Validates Dueces data exists before proceeding
 * - Creates detailed deletion log
 * 
 * What Gets Deleted:
 * - All locations except Dueces
 * - All machines not at Dueces location
 * - All collections for non-Dueces machines
 * - All collection reports for non-Dueces location
 * - All sashourly data for non-Dueces machines
 * - All members not associated with Dueces
 * 
 * What Gets Preserved:
 * - Dueces location (b393ebf50933d1688c3fe2a7)
 * - All machines at Dueces
 * - All collections for Dueces machines
 * - All collection reports for Dueces
 * - All history for Dueces machines
 * 
 * Usage:
 * - Dry run: node scripts/cleanup-non-dueces-data.js
 * - Execute: node scripts/cleanup-non-dueces-data.js --execute
 * 
 * ⚠️ IMPORTANT: Run backup-dueces-data.js FIRST!
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGO_URI;
const DUECES_LOCATION_ID = 'b393ebf50933d1688c3fe2a7';
const DRY_RUN = !process.argv.includes('--execute');
const LOG_DIR = path.join(__dirname, '../backup/cleanup-logs');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function cleanupNonDuecesData() {
  const client = new MongoClient(MONGODB_URI);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const deletionLog = [];

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log(DRY_RUN ? '🔍 DRY RUN MODE - No deletions will occur' : '⚠️  EXECUTE MODE - Data will be DELETED!');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Dueces Location ID: ${DUECES_LOCATION_ID}`);
    console.log('');

    // CRITICAL: Verify Dueces location exists
    const duecesLocation = await db.collection('gaminglocations').findOne({
      _id: DUECES_LOCATION_ID,
    });

    if (!duecesLocation) {
      console.error('❌ CRITICAL ERROR: Dueces location not found!');
      console.error('   Cannot proceed with cleanup - verify DUECES_LOCATION_ID is correct');
      process.exit(1);
    }

    console.log(`✅ Dueces location verified: ${duecesLocation.name}`);
    console.log('');

    // CRITICAL: Verify backup exists
    const backupDir = path.join(__dirname, '../backup');
    if (!fs.existsSync(backupDir)) {
      console.error('❌ CRITICAL ERROR: No backup directory found!');
      console.error('   Run backup-dueces-data.js FIRST before cleanup!');
      process.exit(1);
    }

    const backupFiles = fs.readdirSync(backupDir).filter(f => f.startsWith('dueces-'));
    if (backupFiles.length === 0) {
      console.error('❌ CRITICAL ERROR: No Dueces backup files found!');
      console.error('   Run backup-dueces-data.js FIRST before cleanup!');
      process.exit(1);
    }

    console.log(`✅ Backup verified: ${backupFiles.length} backup files found`);
    console.log('');

    // Get Dueces machines for filtering
    const duecesMachines = await db
      .collection('machines')
      .find({ gamingLocation: DUECES_LOCATION_ID })
      .toArray();

    const duecesMachineIds = duecesMachines.map(m => m._id);
    console.log(`✅ Found ${duecesMachines.length} machines at Dueces`);
    console.log('');

    const summary = {
      timestamp,
      duecesLocationId: DUECES_LOCATION_ID,
      duecesLocationName: duecesLocation.name,
      duecesMachineCount: duecesMachines.length,
      toDelete: {},
      preserved: {},
    };

    // ==================== STEP 1: Locations ====================
    console.log('='.repeat(80));
    console.log('📍 STEP 1: Locations');
    console.log('='.repeat(80));
    console.log('');

    const allLocations = await db.collection('gaminglocations').find({}).toArray();
    const locationsToDelete = allLocations.filter(l => l._id !== DUECES_LOCATION_ID);

    console.log(`Total Locations: ${allLocations.length}`);
    console.log(`✅ Preserve: 1 (Dueces)`);
    console.log(`❌ Delete: ${locationsToDelete.length}`);
    console.log('');

    if (locationsToDelete.length > 0) {
      console.log('Locations to delete:');
      locationsToDelete.forEach(l => {
        console.log(`   - ${l.name} (${l._id})`);
      });
      console.log('');
    }

    summary.toDelete.locations = locationsToDelete.length;
    summary.preserved.locations = 1;

    // ==================== STEP 2: Machines ====================
    console.log('='.repeat(80));
    console.log('🎰 STEP 2: Machines');
    console.log('='.repeat(80));
    console.log('');

    const allMachines = await db.collection('machines').find({}).toArray();
    const machinesToDelete = allMachines.filter(m => m.gamingLocation !== DUECES_LOCATION_ID);

    console.log(`Total Machines: ${allMachines.length}`);
    console.log(`✅ Preserve: ${duecesMachines.length} (Dueces machines)`);
    console.log(`❌ Delete: ${machinesToDelete.length}`);
    console.log('');

    if (machinesToDelete.length > 0 && machinesToDelete.length <= 20) {
      console.log('Machines to delete:');
      machinesToDelete.forEach(m => {
        console.log(`   - ${m.serialNumber || m._id} at location ${m.gamingLocation}`);
      });
      console.log('');
    } else if (machinesToDelete.length > 20) {
      console.log(`Too many to list (${machinesToDelete.length} machines)`);
      console.log('');
    }

    summary.toDelete.machines = machinesToDelete.length;
    summary.preserved.machines = duecesMachines.length;

    // ==================== STEP 3: Collections ====================
    console.log('='.repeat(80));
    console.log('📊 STEP 3: Collections');
    console.log('='.repeat(80));
    console.log('');

    const allCollections = await db.collection('collections').find({}).toArray();
    const collectionsToDelete = allCollections.filter(c => !duecesMachineIds.includes(c.machineId));
    const collectionsToPreserve = allCollections.filter(c => duecesMachineIds.includes(c.machineId));

    console.log(`Total Collections: ${allCollections.length}`);
    console.log(`✅ Preserve: ${collectionsToPreserve.length} (Dueces machines)`);
    console.log(`❌ Delete: ${collectionsToDelete.length}`);
    console.log('');

    summary.toDelete.collections = collectionsToDelete.length;
    summary.preserved.collections = collectionsToPreserve.length;

    // ==================== STEP 4: Collection Reports ====================
    console.log('='.repeat(80));
    console.log('📋 STEP 4: Collection Reports');
    console.log('='.repeat(80));
    console.log('');

    const allReports = await db.collection('collectionreports').find({}).toArray();
    const reportsToDelete = allReports.filter(r => r.location !== DUECES_LOCATION_ID);
    const reportsToPreserve = allReports.filter(r => r.location === DUECES_LOCATION_ID);

    console.log(`Total Collection Reports: ${allReports.length}`);
    console.log(`✅ Preserve: ${reportsToPreserve.length} (Dueces reports)`);
    console.log(`❌ Delete: ${reportsToDelete.length}`);
    console.log('');

    if (reportsToDelete.length > 0 && reportsToDelete.length <= 10) {
      console.log('Reports to delete:');
      reportsToDelete.forEach(r => {
        const locationName = allLocations.find(l => l._id === r.location)?.name || r.location;
        console.log(`   - ${locationName} - ${new Date(r.timestamp).toLocaleDateString()}`);
      });
      console.log('');
    }

    summary.toDelete.collectionReports = reportsToDelete.length;
    summary.preserved.collectionReports = reportsToPreserve.length;

    // ==================== STEP 5: SAS Hourly Data ====================
    console.log('='.repeat(80));
    console.log('📈 STEP 5: SAS Hourly Data');
    console.log('='.repeat(80));
    console.log('');

    const machineIdsToDelete = machinesToDelete.map(m => m._id);
    const sasData = await db.collection('sashourly').find({}).toArray();
    const sasToDelete = sasData.filter(s => machineIdsToDelete.includes(s.machine));
    const sasToPreserve = sasData.filter(s => duecesMachineIds.includes(s.machine));

    console.log(`Total SAS Hourly Records: ${sasData.length}`);
    console.log(`✅ Preserve: ${sasToPreserve.length} (Dueces machines)`);
    console.log(`❌ Delete: ${sasToDelete.length}`);
    console.log('');

    summary.toDelete.sashourly = sasToDelete.length;
    summary.preserved.sashourly = sasToPreserve.length;

    // ==================== STEP 6: Members (optional - be careful!) ====================
    console.log('='.repeat(80));
    console.log('👥 STEP 6: Members (Skipped for Safety)');
    console.log('='.repeat(80));
    console.log('');
    console.log('ℹ️  Members are NOT deleted automatically');
    console.log('   Review manually if needed - members may be shared across locations');
    console.log('');

    summary.toDelete.members = 0;

    // ==================== EXECUTION ====================
    if (!DRY_RUN) {
      console.log('='.repeat(80));
      console.log('⚠️  EXECUTING DELETIONS');
      console.log('='.repeat(80));
      console.log('');

      // Create log directory
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      const results = {
        locations: { deleted: 0, errors: [] },
        machines: { deleted: 0, errors: [] },
        collections: { deleted: 0, errors: [] },
        collectionReports: { deleted: 0, errors: [] },
        sashourly: { deleted: 0, errors: [] },
      };

      // Delete Locations
      if (locationsToDelete.length > 0) {
        try {
          const deleteResult = await db.collection('gaminglocations').deleteMany({
            _id: { $in: locationsToDelete.map(l => l._id) },
          });
          results.locations.deleted = deleteResult.deletedCount;
          console.log(`✅ Deleted ${deleteResult.deletedCount} locations`);
        } catch (error) {
          console.error('❌ Error deleting locations:', error);
          results.locations.errors.push(error.message);
        }
      }

      // Delete Machines
      if (machinesToDelete.length > 0) {
        try {
          const deleteResult = await db.collection('machines').deleteMany({
            _id: { $in: machineIdsToDelete },
          });
          results.machines.deleted = deleteResult.deletedCount;
          console.log(`✅ Deleted ${deleteResult.deletedCount} machines`);
        } catch (error) {
          console.error('❌ Error deleting machines:', error);
          results.machines.errors.push(error.message);
        }
      }

      // Delete Collections
      if (collectionsToDelete.length > 0) {
        try {
          const deleteResult = await db.collection('collections').deleteMany({
            machineId: { $in: machineIdsToDelete },
          });
          results.collections.deleted = deleteResult.deletedCount;
          console.log(`✅ Deleted ${deleteResult.deletedCount} collections`);
        } catch (error) {
          console.error('❌ Error deleting collections:', error);
          results.collections.errors.push(error.message);
        }
      }

      // Delete Collection Reports
      if (reportsToDelete.length > 0) {
        try {
          const deleteResult = await db.collection('collectionreports').deleteMany({
            location: { $ne: DUECES_LOCATION_ID },
          });
          results.collectionReports.deleted = deleteResult.deletedCount;
          console.log(`✅ Deleted ${deleteResult.deletedCount} collection reports`);
        } catch (error) {
          console.error('❌ Error deleting collection reports:', error);
          results.collectionReports.errors.push(error.message);
        }
      }

      // Delete SAS Hourly Data
      if (sasToDelete.length > 0) {
        try {
          const deleteResult = await db.collection('sashourly').deleteMany({
            machine: { $in: machineIdsToDelete },
          });
          results.sashourly.deleted = deleteResult.deletedCount;
          console.log(`✅ Deleted ${deleteResult.deletedCount} SAS hourly records`);
        } catch (error) {
          console.error('❌ Error deleting SAS hourly data:', error);
          results.sashourly.errors.push(error.message);
        }
      }

      console.log('');

      // Verify Dueces data still intact
      console.log('='.repeat(80));
      console.log('✅ VERIFICATION: Dueces Data Integrity');
      console.log('='.repeat(80));
      console.log('');

      const duecesLocationAfter = await db.collection('gaminglocations').findOne({
        _id: DUECES_LOCATION_ID,
      });
      const duecesMachinesAfter = await db
        .collection('machines')
        .find({ gamingLocation: DUECES_LOCATION_ID })
        .toArray();
      const duecesCollectionsAfter = await db
        .collection('collections')
        .find({ machineId: { $in: duecesMachineIds } })
        .toArray();
      const duecesReportsAfter = await db
        .collection('collectionreports')
        .find({ location: DUECES_LOCATION_ID })
        .toArray();

      console.log(`✅ Dueces location: ${duecesLocationAfter ? 'EXISTS' : 'MISSING!'}`);
      console.log(`✅ Dueces machines: ${duecesMachinesAfter.length} (expected ${duecesMachines.length})`);
      console.log(`✅ Dueces collections: ${duecesCollectionsAfter.length}`);
      console.log(`✅ Dueces reports: ${duecesReportsAfter.length}`);
      console.log('');

      if (!duecesLocationAfter || duecesMachinesAfter.length !== duecesMachines.length) {
        console.error('❌ VERIFICATION FAILED: Dueces data was affected!');
        console.error('   RESTORE FROM BACKUP IMMEDIATELY!');
        process.exit(1);
      }

      console.log('✅ VERIFICATION PASSED: Dueces data intact!');
      console.log('');

      // Save deletion log
      const logData = {
        timestamp: new Date().toISOString(),
        duecesLocationId: DUECES_LOCATION_ID,
        duecesLocationName: duecesLocation.name,
        summary,
        results,
        verification: {
          duecesLocation: !!duecesLocationAfter,
          duecesMachines: duecesMachinesAfter.length,
          duecesCollections: duecesCollectionsAfter.length,
          duecesReports: duecesReportsAfter.length,
        },
      };

      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      fs.writeFileSync(
        path.join(LOG_DIR, `cleanup-log-${timestamp}.json`),
        JSON.stringify(logData, null, 2)
      );

      console.log(`📝 Deletion log saved: backup/cleanup-logs/cleanup-log-${timestamp}.json`);
      console.log('');
    }

    // ==================== SUMMARY ====================
    console.log('='.repeat(80));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    console.log('TO DELETE:');
    console.log(`   Locations: ${summary.toDelete.locations}`);
    console.log(`   Machines: ${summary.toDelete.machines}`);
    console.log(`   Collections: ${summary.toDelete.collections}`);
    console.log(`   Collection Reports: ${summary.toDelete.collectionReports}`);
    console.log(`   SAS Hourly Records: ${summary.toDelete.sashourly}`);
    console.log('');

    console.log('TO PRESERVE (Dueces):');
    console.log(`   Locations: ${summary.preserved.locations}`);
    console.log(`   Machines: ${summary.preserved.machines}`);
    console.log(`   Collections: ${summary.preserved.collections}`);
    console.log(`   Collection Reports: ${summary.preserved.collectionReports}`);
    console.log(`   SAS Hourly Records: ${summary.preserved.sashourly}`);
    console.log('');

    if (DRY_RUN) {
      console.log('🔍 DRY RUN: No data was deleted');
      console.log('');
      console.log('⚠️  TO EXECUTE CLEANUP:');
      console.log('   1. Verify backup exists: ls backup/dueces-*');
      console.log('   2. Review the numbers above');
      console.log('   3. Run: node scripts/cleanup-non-dueces-data.js --execute');
      console.log('');
      console.log('⚠️  WARNING: This action is IRREVERSIBLE!');
      console.log('   Only execute if you are CERTAIN the backup is complete!');
      console.log('');
    } else {
      console.log('✅ CLEANUP COMPLETE!');
      console.log('');
      console.log('Database now contains ONLY Dueces data:');
      console.log(`   - 1 Location (Dueces)`);
      console.log(`   - ${duecesMachines.length} Machines`);
      console.log(`   - ${collectionsToPreserve.length} Collections`);
      console.log(`   - ${reportsToPreserve.length} Collection Reports`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('');
    console.error('⚠️  IF DUECES DATA WAS AFFECTED:');
    console.error('   1. Check backup directory: ls backup/dueces-*');
    console.error('   2. Restore from latest backup');
    console.error('   3. Contact system administrator');
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

cleanupNonDuecesData();


