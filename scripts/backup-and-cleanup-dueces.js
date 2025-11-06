/**
 * Backup Dueces Data and Clean Non-Dueces Data
 * 
 * Purpose: 
 * 1. Backup all Dueces-related data to JSON files
 * 2. Delete all non-Dueces data from all collections
 * 
 * Safety: 
 * - Backs up Dueces data FIRST before any deletion
 * - Dry-run mode by default
 * - Verifies backup integrity before proceeding
 * 
 * Usage:
 * - Dry run: node scripts/backup-and-cleanup-dueces.js
 * - Execute: node scripts/backup-and-cleanup-dueces.js --execute
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

const MONGODB_URI = process.env.MONGO_URI;
const DUECES_LOCATION_ID = 'b393ebf50933d1688c3fe2a7';
const DRY_RUN = !process.argv.includes('--execute');
const BACKUP_DIR = path.join(__dirname, '..', 'backup', `dueces-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

// Collections to backup and clean
const COLLECTIONS_TO_PROCESS = [
  'gaminglocations',
  'machines',
  'collections',
  'collectionreports',
  'meters',
  'sashourly',
  'members',
  'machinesessions',
  'machineevents',
  'acceptedbills',
  'movementrequests'
];

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`✅ Backup directory created: ${BACKUP_DIR}\n`);
  } catch (error) {
    console.error('❌ Failed to create backup directory:', error);
    throw error;
  }
}

async function backupDuecesData(db) {
  console.log('='.repeat(80));
  console.log('📦 BACKING UP DUECES DATA');
  console.log('='.repeat(80));
  console.log('');

  const backupSummary = {};

  // Get Dueces machines first
  const machines = db.collection('machines');
  const duecesMachines = await machines.find({
    gamingLocation: DUECES_LOCATION_ID
  }).toArray();
  const duecesMachineIds = duecesMachines.map(m => m._id);
  
  console.log(`✅ Found ${duecesMachines.length} Dueces machines\n`);

  // 1. Backup Gaming Location
  console.log('📦 Backing up gaminglocations...');
  const location = await db.collection('gaminglocations').findOne({
    _id: DUECES_LOCATION_ID
  });
  if (location) {
    await fs.writeFile(
      path.join(BACKUP_DIR, 'gaminglocations.json'),
      JSON.stringify([location], null, 2)
    );
    backupSummary.gaminglocations = 1;
    console.log('   ✅ 1 location backed up');
  }

  // 2. Backup Machines
  console.log('📦 Backing up machines...');
  await fs.writeFile(
    path.join(BACKUP_DIR, 'machines.json'),
    JSON.stringify(duecesMachines, null, 2)
  );
  backupSummary.machines = duecesMachines.length;
  console.log(`   ✅ ${duecesMachines.length} machines backed up`);

  // 3. Backup Collections
  console.log('📦 Backing up collections...');
  const duecesCollections = await db.collection('collections').find({
    machineId: { $in: duecesMachineIds }
  }).toArray();
  await fs.writeFile(
    path.join(BACKUP_DIR, 'collections.json'),
    JSON.stringify(duecesCollections, null, 2)
  );
  backupSummary.collections = duecesCollections.length;
  console.log(`   ✅ ${duecesCollections.length} collections backed up`);

  // 4. Backup Collection Reports
  console.log('📦 Backing up collectionreports...');
  const duecesReports = await db.collection('collectionreports').find({
    location: DUECES_LOCATION_ID
  }).toArray();
  await fs.writeFile(
    path.join(BACKUP_DIR, 'collectionreports.json'),
    JSON.stringify(duecesReports, null, 2)
  );
  backupSummary.collectionreports = duecesReports.length;
  console.log(`   ✅ ${duecesReports.length} collection reports backed up`);

  // 5. Backup Meters
  console.log('📦 Backing up meters...');
  const duecesMeters = await db.collection('meters').find({
    $or: [
      { location: DUECES_LOCATION_ID },
      { machine: { $in: duecesMachineIds } }
    ]
  }).toArray();
  await fs.writeFile(
    path.join(BACKUP_DIR, 'meters.json'),
    JSON.stringify(duecesMeters, null, 2)
  );
  backupSummary.meters = duecesMeters.length;
  console.log(`   ✅ ${duecesMeters.length} meters backed up`);

  // 6. Backup SAS Hourly (if exists)
  const sasCollection = db.collection('sashourly');
  const sasExists = await db.listCollections({ name: 'sashourly' }).hasNext();
  if (sasExists) {
    console.log('📦 Backing up sashourly...');
    const duecesSasHourly = await sasCollection.find({
      machine: { $in: duecesMachineIds }
    }).toArray();
    await fs.writeFile(
      path.join(BACKUP_DIR, 'sashourly.json'),
      JSON.stringify(duecesSasHourly, null, 2)
    );
    backupSummary.sashourly = duecesSasHourly.length;
    console.log(`   ✅ ${duecesSasHourly.length} SAS hourly records backed up`);
  }

  // 7. Backup Members
  console.log('📦 Backing up members...');
  const duecesMembers = await db.collection('members').find({
    gamingLocation: DUECES_LOCATION_ID
  }).toArray();
  await fs.writeFile(
    path.join(BACKUP_DIR, 'members.json'),
    JSON.stringify(duecesMembers, null, 2)
  );
  backupSummary.members = duecesMembers.length;
  console.log(`   ✅ ${duecesMembers.length} members backed up`);

  // 8. Backup Machine Sessions (if exists)
  const sessionsCollection = db.collection('machinesessions');
  const sessionsExists = await db.listCollections({ name: 'machinesessions' }).hasNext();
  if (sessionsExists) {
    console.log('📦 Backing up machinesessions...');
    const duecesSessions = await sessionsCollection.find({
      machineId: { $in: duecesMachineIds }
    }).toArray();
    await fs.writeFile(
      path.join(BACKUP_DIR, 'machinesessions.json'),
      JSON.stringify(duecesSessions, null, 2)
    );
    backupSummary.machinesessions = duecesSessions.length;
    console.log(`   ✅ ${duecesSessions.length} machine sessions backed up`);
  }

  // 9. Backup Machine Events (if exists)
  const eventsCollection = db.collection('machineevents');
  const eventsExists = await db.listCollections({ name: 'machineevents' }).hasNext();
  if (eventsExists) {
    console.log('📦 Backing up machineevents...');
    const duecesEvents = await eventsCollection.find({
      machineId: { $in: duecesMachineIds }
    }).toArray();
    await fs.writeFile(
      path.join(BACKUP_DIR, 'machineevents.json'),
      JSON.stringify(duecesEvents, null, 2)
    );
    backupSummary.machineevents = duecesEvents.length;
    console.log(`   ✅ ${duecesEvents.length} machine events backed up`);
  }

  // 10. Backup Accepted Bills (if exists)
  const billsCollection = db.collection('acceptedbills');
  const billsExists = await db.listCollections({ name: 'acceptedbills' }).hasNext();
  if (billsExists) {
    console.log('📦 Backing up acceptedbills...');
    const duecesBills = await billsCollection.find({
      machineId: { $in: duecesMachineIds }
    }).toArray();
    await fs.writeFile(
      path.join(BACKUP_DIR, 'acceptedbills.json'),
      JSON.stringify(duecesBills, null, 2)
    );
    backupSummary.acceptedbills = duecesBills.length;
    console.log(`   ✅ ${duecesBills.length} accepted bills backed up`);
  }

  // 11. Backup Movement Requests (if exists)
  const movementCollection = db.collection('movementrequests');
  const movementExists = await db.listCollections({ name: 'movementrequests' }).hasNext();
  if (movementExists) {
    console.log('📦 Backing up movementrequests...');
    const duecesMovement = await movementCollection.find({
      machineId: { $in: duecesMachineIds }
    }).toArray();
    await fs.writeFile(
      path.join(BACKUP_DIR, 'movementrequests.json'),
      JSON.stringify(duecesMovement, null, 2)
    );
    backupSummary.movementrequests = duecesMovement.length;
    console.log(`   ✅ ${duecesMovement.length} movement requests backed up`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ BACKUP COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  
  return { backupSummary, duecesMachineIds };
}

async function cleanupNonDuecesData(db, duecesMachineIds) {
  console.log('='.repeat(80));
  console.log('🗑️  CLEANING UP NON-DUECES DATA');
  console.log('='.repeat(80));
  console.log('');

  const deletionResults = {};
  const duecesMachineIdsArray = Array.from(duecesMachineIds);

  // 1. Delete non-Dueces locations
  console.log('🗑️  Deleting non-Dueces locations...');
  const locationsResult = await db.collection('gaminglocations').deleteMany({
    _id: { $ne: DUECES_LOCATION_ID }
  });
  deletionResults.gaminglocations = locationsResult.deletedCount;
  console.log(`   ✅ Deleted ${locationsResult.deletedCount} locations`);

  // 2. Delete non-Dueces machines
  console.log('🗑️  Deleting non-Dueces machines...');
  const machinesResult = await db.collection('machines').deleteMany({
    gamingLocation: { $ne: DUECES_LOCATION_ID }
  });
  deletionResults.machines = machinesResult.deletedCount;
  console.log(`   ✅ Deleted ${machinesResult.deletedCount} machines`);

  // 3. Delete non-Dueces collections
  console.log('🗑️  Deleting non-Dueces collections...');
  const collectionsResult = await db.collection('collections').deleteMany({
    machineId: { $nin: duecesMachineIdsArray }
  });
  deletionResults.collections = collectionsResult.deletedCount;
  console.log(`   ✅ Deleted ${collectionsResult.deletedCount} collections`);

  // 4. Delete non-Dueces collection reports
  console.log('🗑️  Deleting non-Dueces collection reports...');
  const reportsResult = await db.collection('collectionreports').deleteMany({
    location: { $ne: DUECES_LOCATION_ID }
  });
  deletionResults.collectionreports = reportsResult.deletedCount;
  console.log(`   ✅ Deleted ${reportsResult.deletedCount} collection reports`);

  // 5. Delete non-Dueces meters
  console.log('🗑️  Deleting non-Dueces meters...');
  const metersResult = await db.collection('meters').deleteMany({
    $and: [
      { location: { $ne: DUECES_LOCATION_ID } },
      { machine: { $nin: duecesMachineIdsArray } }
    ]
  });
  deletionResults.meters = metersResult.deletedCount;
  console.log(`   ✅ Deleted ${metersResult.deletedCount} meters`);

  // 6. Delete non-Dueces SAS hourly
  const sasExists = await db.listCollections({ name: 'sashourly' }).hasNext();
  if (sasExists) {
    console.log('🗑️  Deleting non-Dueces SAS hourly records...');
    const sasResult = await db.collection('sashourly').deleteMany({
      machine: { $nin: duecesMachineIdsArray }
    });
    deletionResults.sashourly = sasResult.deletedCount;
    console.log(`   ✅ Deleted ${sasResult.deletedCount} SAS hourly records`);
  }

  // 7. Delete non-Dueces members
  console.log('🗑️  Deleting non-Dueces members...');
  const membersResult = await db.collection('members').deleteMany({
    gamingLocation: { $ne: DUECES_LOCATION_ID }
  });
  deletionResults.members = membersResult.deletedCount;
  console.log(`   ✅ Deleted ${membersResult.deletedCount} members`);

  // 8. Delete non-Dueces machine sessions
  const sessionsExists = await db.listCollections({ name: 'machinesessions' }).hasNext();
  if (sessionsExists) {
    console.log('🗑️  Deleting non-Dueces machine sessions...');
    const sessionsResult = await db.collection('machinesessions').deleteMany({
      machineId: { $nin: duecesMachineIdsArray }
    });
    deletionResults.machinesessions = sessionsResult.deletedCount;
    console.log(`   ✅ Deleted ${sessionsResult.deletedCount} machine sessions`);
  }

  // 9. Delete non-Dueces machine events
  const eventsExists = await db.listCollections({ name: 'machineevents' }).hasNext();
  if (eventsExists) {
    console.log('🗑️  Deleting non-Dueces machine events...');
    const eventsResult = await db.collection('machineevents').deleteMany({
      machineId: { $nin: duecesMachineIdsArray }
    });
    deletionResults.machineevents = eventsResult.deletedCount;
    console.log(`   ✅ Deleted ${eventsResult.deletedCount} machine events`);
  }

  // 10. Delete non-Dueces accepted bills
  const billsExists = await db.listCollections({ name: 'acceptedbills' }).hasNext();
  if (billsExists) {
    console.log('🗑️  Deleting non-Dueces accepted bills...');
    const billsResult = await db.collection('acceptedbills').deleteMany({
      machineId: { $nin: duecesMachineIdsArray }
    });
    deletionResults.acceptedbills = billsResult.deletedCount;
    console.log(`   ✅ Deleted ${billsResult.deletedCount} accepted bills`);
  }

  // 11. Delete non-Dueces movement requests
  const movementExists = await db.listCollections({ name: 'movementrequests' }).hasNext();
  if (movementExists) {
    console.log('🗑️  Deleting non-Dueces movement requests...');
    const movementResult = await db.collection('movementrequests').deleteMany({
      machineId: { $nin: duecesMachineIdsArray }
    });
    deletionResults.movementrequests = movementResult.deletedCount;
    console.log(`   ✅ Deleted ${movementResult.deletedCount} movement requests`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ CLEANUP COMPLETE');
  console.log('='.repeat(80));
  console.log('');

  return deletionResults;
}

async function verifyBackupIntegrity(backupSummary) {
  console.log('='.repeat(80));
  console.log('🔍 VERIFYING BACKUP INTEGRITY');
  console.log('='.repeat(80));
  console.log('');

  let allFilesValid = true;

  for (const [collection, count] of Object.entries(backupSummary)) {
    const filePath = path.join(BACKUP_DIR, `${collection}.json`);
    try {
      const stats = await fs.stat(filePath);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      if (data.length === count) {
        console.log(`   ✅ ${collection}: ${count} records verified`);
      } else {
        console.error(`   ❌ ${collection}: Expected ${count} records, found ${data.length}`);
        allFilesValid = false;
      }
    } catch (error) {
      console.error(`   ❌ ${collection}: Failed to verify - ${error.message}`);
      allFilesValid = false;
    }
  }

  console.log('');
  
  if (allFilesValid) {
    console.log('✅ All backup files verified successfully!\n');
  } else {
    console.error('❌ Backup verification failed! Aborting cleanup.\n');
    throw new Error('Backup verification failed');
  }

  return allFilesValid;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '⚠️  EXECUTE MODE - WILL BACKUP AND DELETE DATA!');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Dueces Location ID: ${DUECES_LOCATION_ID}`);
    console.log(`Backup Directory: ${BACKUP_DIR}`);
    console.log('');

    // Create backup directory
    await ensureBackupDir();

    // PHASE 1: Backup Dueces data
    const { backupSummary, duecesMachineIds } = await backupDuecesData(db);

    // PHASE 2: Verify backup integrity
    const backupValid = await verifyBackupIntegrity(backupSummary);

    if (!backupValid) {
      console.error('❌ Backup verification failed. Aborting.');
      process.exit(1);
    }

    if (DRY_RUN) {
      console.log('='.repeat(80));
      console.log('🔍 DRY RUN SUMMARY');
      console.log('='.repeat(80));
      console.log('');
      console.log('✅ Backup completed successfully');
      console.log('✅ Backup verified successfully');
      console.log('');
      console.log('📊 Backed up:');
      Object.entries(backupSummary).forEach(([collection, count]) => {
        console.log(`   ${collection}: ${count} records`);
      });
      console.log('');
      console.log('⚠️  TO EXECUTE CLEANUP:');
      console.log('   node scripts/backup-and-cleanup-dueces.js --execute');
      console.log('');
      console.log('⚠️  WARNING: Cleanup will permanently delete non-Dueces data!');
      console.log('');
    } else {
      // PHASE 3: Cleanup non-Dueces data
      const deletionResults = await cleanupNonDuecesData(db, duecesMachineIds);

      console.log('='.repeat(80));
      console.log('📊 FINAL SUMMARY');
      console.log('='.repeat(80));
      console.log('');
      console.log('✅ BACKUP SUMMARY:');
      Object.entries(backupSummary).forEach(([collection, count]) => {
        console.log(`   ${collection}: ${count} records backed up`);
      });
      console.log('');
      console.log('✅ DELETION SUMMARY:');
      Object.entries(deletionResults).forEach(([collection, count]) => {
        console.log(`   ${collection}: ${count} records deleted`);
      });
      console.log('');
      console.log(`💾 Backup Location: ${BACKUP_DIR}`);
      console.log('');
      console.log('✅ Operation completed successfully!');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

main();

