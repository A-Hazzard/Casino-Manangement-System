/**
 * Backup Script: Export All Dueces-Related Data
 * 
 * Purpose: Create complete backup of all data related to Dueces location
 * before cleaning up non-Dueces data
 * 
 * Safety: READ-ONLY - Creates backup files in backup/ folder
 * 
 * Exports:
 * - Dueces location document
 * - All machines at Dueces location
 * - All collections for Dueces machines
 * - All collection reports for Dueces
 * - All collection meters history for Dueces machines
 * 
 * Usage: node scripts/backup-dueces-data.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGO_URI;
const DUECES_LOCATION_ID = 'b393ebf50933d1688c3fe2a7';
const BACKUP_DIR = path.join(__dirname, '../backup');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function backupDuecesData() {
  const client = new MongoClient(MONGODB_URI);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`✅ Created backup directory: ${BACKUP_DIR}\n`);
    }

    console.log('='.repeat(80));
    console.log('📦 BACKUP: Dueces Location Data');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Dueces Location ID: ${DUECES_LOCATION_ID}`);
    console.log(`Backup Directory: ${BACKUP_DIR}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log('');

    // 1. Backup Dueces location document
    console.log('📍 Step 1: Backing up Dueces location document...');
    const location = await db.collection('gaminglocations').findOne({
      _id: DUECES_LOCATION_ID,
    });

    if (!location) {
      console.error('❌ Dueces location not found! Check the DUECES_LOCATION_ID constant.');
      process.exit(1);
    }

    fs.writeFileSync(
      path.join(BACKUP_DIR, `dueces-location-${timestamp}.json`),
      JSON.stringify(location, null, 2)
    );
    console.log(`✅ Backed up Dueces location: ${location.name}`);
    console.log('');

    // 2. Backup all machines at Dueces
    console.log('🎰 Step 2: Backing up machines at Dueces...');
    const machines = await db
      .collection('machines')
      .find({ gamingLocation: DUECES_LOCATION_ID })
      .toArray();

    console.log(`Found ${machines.length} machines at Dueces`);

    fs.writeFileSync(
      path.join(BACKUP_DIR, `dueces-machines-${timestamp}.json`),
      JSON.stringify(machines, null, 2)
    );

    const machineIds = machines.map(m => m._id);
    console.log(`✅ Backed up ${machines.length} machines`);
    console.log('');

    // 3. Backup all collections for Dueces machines
    console.log('📊 Step 3: Backing up collections for Dueces machines...');
    const collections = await db
      .collection('collections')
      .find({ machineId: { $in: machineIds } })
      .toArray();

    console.log(`Found ${collections.length} collections`);

    fs.writeFileSync(
      path.join(BACKUP_DIR, `dueces-collections-${timestamp}.json`),
      JSON.stringify(collections, null, 2)
    );
    console.log(`✅ Backed up ${collections.length} collections`);
    console.log('');

    // 4. Backup all collection reports for Dueces
    console.log('📋 Step 4: Backing up collection reports for Dueces...');
    const reports = await db
      .collection('collectionreports')
      .find({ location: DUECES_LOCATION_ID })
      .toArray();

    console.log(`Found ${reports.length} collection reports`);

    fs.writeFileSync(
      path.join(BACKUP_DIR, `dueces-collection-reports-${timestamp}.json`),
      JSON.stringify(reports, null, 2)
    );
    console.log(`✅ Backed up ${reports.length} collection reports`);
    console.log('');

    // 5. Backup collectionMetersHistory from machines
    console.log('📈 Step 5: Backing up collection meters history...');
    const machinesWithHistory = machines.map(m => ({
      _id: m._id,
      serialNumber: m.serialNumber,
      name: m.custom?.name || m.serialNumber,
      collectionMetersHistory: m.collectionMetersHistory || [],
      collectionMeters: m.collectionMeters || {},
    }));

    fs.writeFileSync(
      path.join(BACKUP_DIR, `dueces-collection-history-${timestamp}.json`),
      JSON.stringify(machinesWithHistory, null, 2)
    );
    console.log(`✅ Backed up collection history for ${machines.length} machines`);
    console.log('');

    // 6. Create summary file
    const summary = {
      backupDate: new Date().toISOString(),
      duecesLocationId: DUECES_LOCATION_ID,
      duecesLocationName: location.name,
      counts: {
        machines: machines.length,
        collections: collections.length,
        collectionReports: reports.length,
      },
      machineIds: machineIds,
      files: [
        `dueces-location-${timestamp}.json`,
        `dueces-machines-${timestamp}.json`,
        `dueces-collections-${timestamp}.json`,
        `dueces-collection-reports-${timestamp}.json`,
        `dueces-collection-history-${timestamp}.json`,
      ],
    };

    fs.writeFileSync(
      path.join(BACKUP_DIR, `backup-summary-${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('='.repeat(80));
    console.log('📊 BACKUP SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Location: ${location.name} (${DUECES_LOCATION_ID})`);
    console.log(`Machines: ${machines.length}`);
    console.log(`Collections: ${collections.length}`);
    console.log(`Collection Reports: ${reports.length}`);
    console.log('');
    console.log('📁 Backup Files Created:');
    summary.files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   ✅ ${file} (${sizeKB} KB)`);
    });
    console.log('');
    console.log(`✅ All Dueces data backed up to: ${BACKUP_DIR}`);
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('   1. Verify backup files are complete');
    console.log('   2. Run: node scripts/cleanup-non-dueces-data.js (dry-run)');
    console.log('   3. Review what will be deleted');
    console.log('   4. Run: node scripts/cleanup-non-dueces-data.js --execute');
    console.log('');

  } catch (error) {
    console.error('❌ Error during backup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

backupDuecesData();


