/**
 * SAS Times Detection and Fix Script
 *
 * This script detects and fixes SAS time issues in collection reports.
 *
 * Modes:
 * - backup: Export collections and reports to JSON backup files
 * - detect: Scan and report all SAS time issues
 * - test/dry-run: Simulate fixes without writing to database
 * - fix: Apply fixes to database
 * - restore: Restore from backup
 *
 * Usage:
 * node scripts/detect-and-fix-sas-times.js --mode=backup
 * node scripts/detect-and-fix-sas-times.js --mode=detect
 * node scripts/detect-and-fix-sas-times.js --mode=test
 * node scripts/detect-and-fix-sas-times.js --mode=fix
 * node scripts/detect-and-fix-sas-times.js --mode=restore --backup-dir=./backups/2025-11-07_xxx
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const mode =
  args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'detect';
const backupDir = args
  .find(arg => arg.startsWith('--backup-dir='))
  ?.split('=')[1];

// Validate mode
const validModes = ['backup', 'detect', 'test', 'dry-run', 'fix', 'restore'];
if (!validModes.includes(mode)) {
  console.error(`❌ Invalid mode: ${mode}`);
  console.error(`Valid modes: ${validModes.join(', ')}`);
  process.exit(1);
}

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

// Define schemas (simplified for script)
const collectionsSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'collections' }
);
const collectionReportsSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'collectionreports' }
);
const metersSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'meters' }
);
const machinesSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'machines' }
);

const Collections = mongoose.model('Collections', collectionsSchema);
const CollectionReports = mongoose.model(
  'CollectionReports',
  collectionReportsSchema
);
const Meters = mongoose.model('Meters', metersSchema);
const Machines = mongoose.model('Machines', machinesSchema);

// Helper functions
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function formatDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${message} (yes/no): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Get machine identifier with priority: serialNumber -> customName -> machineId
 */
async function getMachineIdentifier(machineId) {
  const machine = await Machines.findById(machineId).lean();
  if (!machine) {
    return machineId;
  }
  return machine.serialNumber || machine.customName || machineId;
}

/**
 * Calculate SAS metrics from meters collection
 */
async function calculateSasMetrics(machineId, sasStartTime, sasEndTime) {
  const machineIdentifier = await getMachineIdentifier(machineId);

  // Query all meters within the SAS time period
  const metersInPeriod = await Meters.find({
    machine: machineIdentifier,
    readAt: { $gte: sasStartTime, $lte: sasEndTime },
  })
    .sort({ readAt: 1 })
    .lean();

  if (metersInPeriod.length === 0) {
    return {
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
      gamesPlayed: 0,
      jackpot: 0,
    };
  }

  // Sum all movement fields
  const drop = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.drop || 0),
    0
  );
  const totalCancelledCredits = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.totalCancelledCredits || 0),
    0
  );
  const gamesPlayed = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.gamesPlayed || 0),
    0
  );
  const jackpot = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.jackpot || 0),
    0
  );

  return {
    drop: Number(drop.toFixed(2)),
    totalCancelledCredits: Number(totalCancelledCredits.toFixed(2)),
    gross: Number((drop - totalCancelledCredits).toFixed(2)),
    gamesPlayed: Number(gamesPlayed.toFixed(2)),
    jackpot: Number(jackpot.toFixed(2)),
  };
}

/**
 * Get SAS time period for a collection
 */
async function getSasTimePeriod(collection, allCollections) {
  const sasEndTime = new Date(collection.timestamp);

  // Find previous collection for this machine
  const previousCollection = allCollections
    .filter(
      c =>
        c.machineId.toString() === collection.machineId.toString() &&
        new Date(c.timestamp) < sasEndTime &&
        c.isCompleted === true &&
        c.locationReportId &&
        c.locationReportId.trim() !== ''
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  const sasStartTime = previousCollection
    ? new Date(previousCollection.timestamp)
    : new Date(sasEndTime.getTime() - 24 * 60 * 60 * 1000);

  return { sasStartTime, sasEndTime };
}

/**
 * Detect SAS time issues in a collection
 */
function detectIssues(collection, expectedSasStart, expectedSasEnd) {
  const issues = [];

  const currentStart = collection.sasMeters?.sasStartTime
    ? new Date(collection.sasMeters.sasStartTime)
    : null;
  const currentEnd = collection.sasMeters?.sasEndTime
    ? new Date(collection.sasMeters.sasEndTime)
    : null;

  if (!currentStart || !currentEnd) {
    issues.push({
      type: 'missing_sas_times',
      message: 'SAS times are missing',
    });
    return issues;
  }

  // Check for inverted times
  if (currentStart >= currentEnd) {
    issues.push({
      type: 'inverted',
      message: `SAS start time (${formatDate(currentStart)}) >= end time (${formatDate(currentEnd)})`,
      currentStart: formatDate(currentStart),
      currentEnd: formatDate(currentEnd),
      expectedStart: formatDate(expectedSasStart),
      expectedEnd: formatDate(expectedSasEnd),
    });
  }

  // Check if start time matches expected
  const startDiff = Math.abs(
    currentStart.getTime() - expectedSasStart.getTime()
  );
  if (startDiff > 1000) {
    // Allow 1 second tolerance
    issues.push({
      type: 'wrong_start_time',
      message: `SAS start time doesn't match previous collection's timestamp`,
      currentStart: formatDate(currentStart),
      expectedStart: formatDate(expectedSasStart),
      difference: formatDuration(startDiff),
    });
  }

  // Check if end time matches expected
  const endDiff = Math.abs(currentEnd.getTime() - expectedSasEnd.getTime());
  if (endDiff > 1000) {
    // Allow 1 second tolerance
    issues.push({
      type: 'wrong_end_time',
      message: `SAS end time doesn't match collection timestamp`,
      currentEnd: formatDate(currentEnd),
      expectedEnd: formatDate(expectedSasEnd),
      difference: formatDuration(endDiff),
    });
  }

  // Check for unreasonable time spans
  // NOTE: Only flag if there's ALSO a mismatch in start/end times
  // Long spans (> 48 hours) are valid for weekly/monthly collections
  // We only care about incorrectly calculated time windows
  const duration = currentEnd - currentStart;
  const hours = duration / (1000 * 60 * 60);

  if (hours < 0.5) {
    issues.push({
      type: 'too_short',
      message: `SAS time span is too short (${formatDuration(duration)})`,
      duration: formatDuration(duration),
    });
  }

  // Only flag long spans if start/end times don't match expected
  // (Long spans are valid for infrequent collections)
  const hasTimeMismatch = issues.some(
    i => i.type === 'wrong_start_time' || i.type === 'wrong_end_time'
  );

  if (hours > 720 && hasTimeMismatch) {
    // 30 days - only flag extremely long spans
    issues.push({
      type: 'extremely_long',
      message: `SAS time span is extremely long (${formatDuration(duration)}) - likely indicates data error`,
      duration: formatDuration(duration),
    });
  }

  return issues;
}

/**
 * Mode 1: Backup collections and reports
 */
async function backupData() {
  console.log('\n📦 Starting backup...\n');

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(
    __dirname,
    '..',
    'backups',
    `sas-times-backup-${timestamp}`
  );

  // Create backup directory
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }

  // Backup collections
  console.log('Backing up collections...');
  const collections = await Collections.find({}).lean();
  fs.writeFileSync(
    path.join(backupPath, 'collections.json'),
    JSON.stringify(collections, null, 2)
  );
  console.log(`✅ Backed up ${collections.length} collections`);

  // Backup collection reports
  console.log('Backing up collection reports...');
  const reports = await CollectionReports.find({}).lean();
  fs.writeFileSync(
    path.join(backupPath, 'collectionreports.json'),
    JSON.stringify(reports, null, 2)
  );
  console.log(`✅ Backed up ${reports.length} collection reports`);

  // Create metadata file
  const metadata = {
    timestamp: new Date().toISOString(),
    collectionsCount: collections.length,
    reportsCount: reports.length,
    mongoUri: MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials
  };
  fs.writeFileSync(
    path.join(backupPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`\n✅ Backup complete: ${backupPath}\n`);
  return backupPath;
}

/**
 * Mode 2: Detect SAS time issues
 */
async function detectIssuesMode(collections = null) {
  console.log('\n🔍 Scanning for SAS time issues...\n');

  // Load all collections if not provided (for test mode)
  if (!collections) {
    collections = await Collections.find({
      isCompleted: true,
      locationReportId: { $exists: true, $ne: '' },
    })
      .sort({ timestamp: 1 })
      .lean();
  }

  // Group collections by locationReportId (since CollectionReports might not exist)
  const reportGroups = {};
  for (const collection of collections) {
    const reportId = collection.locationReportId;
    if (!reportGroups[reportId]) {
      reportGroups[reportId] = {
        locationReportId: reportId,
        locationName: collection.location || 'Unknown',
        timestamp: collection.timestamp,
        collections: [],
      };
    }
    reportGroups[reportId].collections.push(collection);
    // Use earliest timestamp for the report
    if (
      new Date(collection.timestamp) <
      new Date(reportGroups[reportId].timestamp)
    ) {
      reportGroups[reportId].timestamp = collection.timestamp;
    }
  }

  const reports = Object.values(reportGroups).sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  console.log(
    `Found ${reports.length} reports with ${collections.length} total collections\n`
  );

  const issuesByReport = {};
  let totalIssues = 0;

  // Process each report chronologically
  for (const report of reports) {
    const reportCollections = report.collections;

    if (reportCollections.length === 0) continue;

    const reportIssues = [];

    // Check each collection in this report
    for (const collection of reportCollections) {
      const { sasStartTime: expectedStart, sasEndTime: expectedEnd } =
        await getSasTimePeriod(collection, collections);

      const issues = detectIssues(collection, expectedStart, expectedEnd);

      if (issues.length > 0) {
        reportIssues.push({
          collectionId: collection._id,
          machineId: collection.machineId,
          machineName:
            collection.machineName || collection.machineCustomName || 'Unknown',
          issues,
          expectedStart: formatDate(expectedStart),
          expectedEnd: formatDate(expectedEnd),
          currentStart: collection.sasMeters?.sasStartTime
            ? formatDate(collection.sasMeters.sasStartTime)
            : 'N/A',
          currentEnd: collection.sasMeters?.sasEndTime
            ? formatDate(collection.sasMeters.sasEndTime)
            : 'N/A',
        });
        totalIssues += issues.length;
      }
    }

    if (reportIssues.length > 0) {
      issuesByReport[report.locationReportId] = {
        reportId: report._id,
        locationReportId: report.locationReportId,
        locationName: report.locationName,
        timestamp: formatDate(report.timestamp),
        machinesWithIssues: reportIssues.length,
        totalIssues: reportIssues.reduce((sum, r) => sum + r.issues.length, 0),
        collections: reportIssues,
      };
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    DETECTION SUMMARY                      ');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (Object.keys(issuesByReport).length === 0) {
    console.log('✅ No SAS time issues detected!\n');
    return { issuesByReport, totalIssues: 0 };
  }

  console.log(
    `❌ Found issues in ${Object.keys(issuesByReport).length} reports\n`
  );

  // Print detailed issues
  for (const [reportId, reportData] of Object.entries(issuesByReport)) {
    console.log(
      `\n📊 Report: ${reportData.locationName} - ${reportData.timestamp}`
    );
    console.log(`   Location Report ID: ${reportId}`);
    console.log(`   Machines with issues: ${reportData.machinesWithIssues}`);
    console.log(`   Total issues: ${reportData.totalIssues}\n`);

    for (const collectionIssue of reportData.collections) {
      console.log(`   🔧 Machine: ${collectionIssue.machineName}`);
      console.log(`      Collection ID: ${collectionIssue.collectionId}`);
      console.log(
        `      Current SAS: ${collectionIssue.currentStart} → ${collectionIssue.currentEnd}`
      );
      console.log(
        `      Expected SAS: ${collectionIssue.expectedStart} → ${collectionIssue.expectedEnd}`
      );

      for (const issue of collectionIssue.issues) {
        console.log(`      ❌ ${issue.type}: ${issue.message}`);
      }
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Total issues found: ${totalIssues}\n`);

  return { issuesByReport, totalIssues };
}

/**
 * Mode 3: Test/Dry-run - Simulate fixes
 */
async function testFixMode() {
  console.log('\n🧪 TEST MODE: Simulating fixes (no database writes)\n');

  // First, detect current issues
  const { issuesByReport: beforeIssues, totalIssues: beforeCount } =
    await detectIssuesMode();

  if (beforeCount === 0) {
    console.log('✅ No issues to fix!\n');
    return;
  }

  console.log(`\n🔧 Simulating fixes for ${beforeCount} issues...\n`);

  // Load all collections
  const collections = await Collections.find({
    isCompleted: true,
    locationReportId: { $exists: true, $ne: '' },
  })
    .sort({ timestamp: 1 })
    .lean();

  // Create a copy for simulation
  const simulatedCollections = JSON.parse(JSON.stringify(collections));
  let fixedCount = 0;

  // Apply fixes to simulated data
  for (let i = 0; i < simulatedCollections.length; i++) {
    const collection = simulatedCollections[i];
    const { sasStartTime: expectedStart, sasEndTime: expectedEnd } =
      await getSasTimePeriod(collection, simulatedCollections);

    const issues = detectIssues(collection, expectedStart, expectedEnd);

    if (issues.length > 0) {
      // Simulate fix
      console.log(
        `   Fixing collection ${collection._id} for machine ${collection.machineName || collection.machineCustomName}`
      );

      // Recalculate SAS metrics
      const sasMetrics = await calculateSasMetrics(
        collection.machineId,
        expectedStart,
        expectedEnd
      );

      // Update simulated data
      collection.sasMeters = {
        ...collection.sasMeters,
        ...sasMetrics,
        sasStartTime: expectedStart.toISOString(),
        sasEndTime: expectedEnd.toISOString(),
      };

      fixedCount++;
    }
  }

  console.log(`\n✅ Simulated ${fixedCount} fixes\n`);

  // Re-run detection on simulated data
  console.log('🔍 Re-running detection on simulated fixed data...\n');
  const { totalIssues: afterCount } =
    await detectIssuesMode(simulatedCollections);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    TEST RESULTS                           ');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Issues before fix: ${beforeCount}`);
  console.log(`Issues after fix:  ${afterCount}`);
  console.log(`Issues resolved:   ${beforeCount - afterCount}\n`);

  if (afterCount === 0) {
    console.log('✅ All issues would be resolved by applying fixes!\n');
  } else {
    console.log(
      '⚠️  Some issues would remain after fixing. Review detection logic.\n'
    );
  }
}

/**
 * Mode 4: Fix - Apply fixes to database
 */
async function fixMode() {
  console.log('\n🔧 FIX MODE: Applying fixes to database\n');

  // First, detect issues
  const { issuesByReport, totalIssues } = await detectIssuesMode();

  if (totalIssues === 0) {
    console.log('✅ No issues to fix!\n');
    return;
  }

  console.log(`\n⚠️  Found ${totalIssues} issues to fix\n`);

  // Confirm before proceeding
  const confirmed = await promptConfirmation(
    'Do you want to apply fixes to the database?'
  );
  if (!confirmed) {
    console.log('\n❌ Fix cancelled by user\n');
    return;
  }

  console.log('\n📝 Applying fixes...\n');

  // Load all collections sorted chronologically
  const collections = await Collections.find({
    isCompleted: true,
    locationReportId: { $exists: true, $ne: '' },
  })
    .sort({ timestamp: 1 })
    .lean();

  let fixedCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process each collection chronologically
  for (const collection of collections) {
    try {
      const { sasStartTime: expectedStart, sasEndTime: expectedEnd } =
        await getSasTimePeriod(collection, collections);

      const issues = detectIssues(collection, expectedStart, expectedEnd);

      if (issues.length > 0) {
        console.log(
          `   Fixing collection ${collection._id} for machine ${collection.machineName || collection.machineCustomName}`
        );

        // Recalculate SAS metrics with correct time window
        const sasMetrics = await calculateSasMetrics(
          collection.machineId,
          expectedStart,
          expectedEnd
        );

        // Update collection in database
        await Collections.findByIdAndUpdate(collection._id, {
          'sasMeters.sasStartTime': expectedStart.toISOString(),
          'sasMeters.sasEndTime': expectedEnd.toISOString(),
          'sasMeters.drop': sasMetrics.drop,
          'sasMeters.totalCancelledCredits': sasMetrics.totalCancelledCredits,
          'sasMeters.gross': sasMetrics.gross,
          'sasMeters.gamesPlayed': sasMetrics.gamesPlayed,
          'sasMeters.jackpot': sasMetrics.jackpot,
          updatedAt: new Date(),
        });

        // Also update machine collectionMetersHistory if it exists
        const machine = await Machines.findById(collection.machineId);
        if (machine && machine.collectionMetersHistory) {
          const historyEntry = machine.collectionMetersHistory.find(
            h => h.locationReportId === collection.locationReportId
          );

          if (historyEntry) {
            await Machines.findByIdAndUpdate(
              collection.machineId,
              {
                $set: {
                  'collectionMetersHistory.$[elem].timestamp': new Date(
                    collection.timestamp
                  ),
                  updatedAt: new Date(),
                },
              },
              {
                arrayFilters: [
                  { 'elem.locationReportId': collection.locationReportId },
                ],
              }
            );
          }
        }

        fixedCount++;
        console.log(`      ✅ Fixed (${fixedCount}/${totalIssues})`);
      }
    } catch (error) {
      errorCount++;
      errors.push({
        collectionId: collection._id,
        error: error.message,
      });
      console.log(
        `      ❌ Error fixing collection ${collection._id}: ${error.message}`
      );
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    FIX RESULTS                            ');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Issues fixed:  ${fixedCount}`);
  console.log(`Errors:        ${errorCount}\n`);

  if (errorCount > 0) {
    console.log('Errors encountered:');
    errors.forEach(err => {
      console.log(`   - Collection ${err.collectionId}: ${err.error}`);
    });
    console.log('');
  }

  if (fixedCount > 0) {
    console.log('✅ Fixes applied successfully!\n');
    console.log(
      '💡 Run detection again to verify: node scripts/detect-and-fix-sas-times.js --mode=detect\n'
    );
  }
}

/**
 * Mode 5: Restore from backup
 */
async function restoreMode() {
  if (!backupDir) {
    console.error('❌ --backup-dir parameter is required for restore mode');
    console.error(
      'Example: node scripts/detect-and-fix-sas-times.js --mode=restore --backup-dir=./backups/sas-times-backup-2025-11-07T...'
    );
    process.exit(1);
  }

  console.log(`\n📥 Restoring from backup: ${backupDir}\n`);

  // Check if backup directory exists
  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  // Load metadata
  const metadataPath = path.join(backupDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Backup metadata not found. Invalid backup directory.');
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log('Backup information:');
  console.log(`   Timestamp: ${metadata.timestamp}`);
  console.log(`   Collections: ${metadata.collectionsCount}`);
  console.log(`   Reports: ${metadata.reportsCount}\n`);

  // Confirm restore
  const confirmed = await promptConfirmation(
    '⚠️  This will OVERWRITE current data. Are you sure?'
  );
  if (!confirmed) {
    console.log('\n❌ Restore cancelled by user\n');
    return;
  }

  console.log('\n📝 Restoring data...\n');

  // Load backup data
  const collectionsPath = path.join(backupDir, 'collections.json');
  const reportsPath = path.join(backupDir, 'collectionreports.json');

  if (!fs.existsSync(collectionsPath) || !fs.existsSync(reportsPath)) {
    console.error('❌ Backup files not found');
    process.exit(1);
  }

  const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));
  const reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));

  // Delete current data
  console.log('Deleting current collections...');
  await Collections.deleteMany({});
  console.log('Deleting current reports...');
  await CollectionReports.deleteMany({});

  // Restore from backup - Use raw MongoDB to preserve string _ids
  console.log('Restoring collections...');
  const db = mongoose.connection.db;
  await db.collection('collections').insertMany(collections);
  console.log(`✅ Restored ${collections.length} collections`);

  console.log('Restoring reports...');
  await db.collection('collectionreports').insertMany(reports);
  console.log(`✅ Restored ${reports.length} reports`);

  console.log('\n✅ Restore complete!\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           SAS Times Detection and Fix Script              ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log('═══════════════════════════════════════════════════════════');

    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Execute based on mode
    switch (mode) {
      case 'backup':
        await backupData();
        break;
      case 'detect':
        await detectIssuesMode();
        break;
      case 'test':
      case 'dry-run':
        await testFixMode();
        break;
      case 'fix':
        await fixMode();
        break;
      case 'restore':
        await restoreMode();
        break;
    }

    console.log('✅ Script completed successfully\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run main function
main();
