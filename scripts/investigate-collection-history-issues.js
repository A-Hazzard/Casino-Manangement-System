/**
 * Investigation Script: Collection History Issues
 * 
 * Purpose: Investigate why machines show "Orphaned or Duplicate History" issues
 * on the collection report details page by querying the same API that the page uses
 * 
 * This script will:
 * 1. Query the check-all-issues API for a specific report
 * 2. Show detailed breakdown of what issues were detected
 * 3. Compare machine document history with collections table
 * 4. Identify the root cause of false positives or actual issues
 * 
 * Usage: node scripts/investigate-collection-history-issues.js [reportId] [machineId]
 * Example: node scripts/investigate-collection-history-issues.js b130f19a-7d41-4628-9ea9-9b38d141814a 757dbf3c2bcba141dca75a10
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const REPORT_ID = process.argv[2];
const MACHINE_ID = process.argv[3]; // Optional: specific machine to investigate

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

if (!REPORT_ID) {
  console.error('❌ Please provide a report ID');
  console.error('Usage: node scripts/investigate-collection-history-issues.js [reportId] [machineId]');
  console.error('Example: node scripts/investigate-collection-history-issues.js b130f19a-7d41-4628-9ea9-9b38d141814a 757dbf3c2bcba141dca75a10');
  process.exit(1);
}

async function investigateHistoryIssues() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log('🔍 INVESTIGATING COLLECTION HISTORY ISSUES');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Report ID: ${REPORT_ID}`);
    if (MACHINE_ID) {
      console.log(`Machine ID: ${MACHINE_ID}`);
    }
    console.log('');

    // Step 1: Get the collection report
    const report = await db.collection('collectionreports').findOne({
      locationReportId: REPORT_ID
    });

    if (!report) {
      console.error(`❌ Collection report not found: ${REPORT_ID}`);
      return;
    }

    console.log('📋 Collection Report Found:');
    console.log(`   Location: ${report.location}`);
    console.log(`   Date: ${report.date || 'N/A'}`);
    console.log(`   Total Gross: ${report.totalGross || 0}`);
    console.log('');

    // Step 2: Get all collections for this report
    const collections = await db.collection('collections').find({
      locationReportId: REPORT_ID
    }).toArray();

    console.log(`📊 Found ${collections.length} collection(s) for this report\n`);

    // Filter to specific machine if provided
    const collectionsToCheck = MACHINE_ID 
      ? collections.filter(c => c.machineId === MACHINE_ID)
      : collections;

    if (MACHINE_ID && collectionsToCheck.length === 0) {
      console.error(`❌ No collections found for machine ${MACHINE_ID} in report ${REPORT_ID}`);
      return;
    }

    console.log(`🔍 Checking ${collectionsToCheck.length} collection(s)...\n`);

    // Step 3: For each collection, check for history issues
    for (const collection of collectionsToCheck) {
      console.log('='.repeat(80));
      console.log(`🔍 Investigating Collection: ${collection._id}`);
      console.log('='.repeat(80));
      console.log('');

      // Get the machine
      const machine = await db.collection('machines').findOne({
        _id: collection.machineId
      });

      if (!machine) {
        console.error(`   ❌ Machine not found: ${collection.machineId}`);
        console.error(`   This collection is ORPHANED (no machine exists)`);
        console.log('');
        continue;
      }

      console.log(`   Machine: ${machine.serialNumber || machine.custom?.name || collection.machineId}`);
      console.log(`   Machine ID: ${machine._id}`);
      console.log('');

      console.log('   Collection Data:');
      console.log(`      Collection ID: ${collection._id}`);
      console.log(`      Timestamp: ${collection.timestamp}`);
      console.log(`      metersIn: ${collection.metersIn}`);
      console.log(`      metersOut: ${collection.metersOut}`);
      console.log(`      prevIn: ${collection.prevIn}`);
      console.log(`      prevOut: ${collection.prevOut}`);
      console.log(`      locationReportId: ${collection.locationReportId}`);
      console.log('');

      // Check machine's collectionMetersHistory
      const history = machine.collectionMetersHistory || [];
      console.log(`   Machine History Entries: ${history.length}`);
      console.log('');

      // Find corresponding history entry
      const correspondingHistory = history.find(
        h => h.locationReportId === REPORT_ID
      );

      if (!correspondingHistory) {
        console.log('   ⚠️  ISSUE: Missing History');
        console.log('   Collection exists in collections table, but no matching history entry on machine');
        console.log('   This happens when:');
        console.log('      - Collection was created but history entry failed to save');
        console.log('      - /update-history endpoint was never called');
        console.log('      - History entry was manually deleted');
        console.log('');
      } else {
        console.log('   ✅ Corresponding History Entry Found:');
        console.log(`      History Entry ID: ${correspondingHistory._id}`);
        console.log(`      metersIn: ${correspondingHistory.metersIn}`);
        console.log(`      metersOut: ${correspondingHistory.metersOut}`);
        console.log(`      prevMetersIn: ${correspondingHistory.prevMetersIn}`);
        console.log(`      prevMetersOut: ${correspondingHistory.prevMetersOut}`);
        console.log(`      timestamp: ${correspondingHistory.timestamp}`);
        console.log(`      locationReportId: ${correspondingHistory.locationReportId}`);
        console.log('');

        // Compare collection vs history
        const metersInMatch = Math.abs(collection.metersIn - correspondingHistory.metersIn) < 0.1;
        const metersOutMatch = Math.abs(collection.metersOut - correspondingHistory.metersOut) < 0.1;
        const prevInMatch = Math.abs(collection.prevIn - correspondingHistory.prevMetersIn) < 0.1;
        const prevOutMatch = Math.abs(collection.prevOut - correspondingHistory.prevMetersOut) < 0.1;

        console.log('   🔍 Data Integrity Check:');
        console.log(`      metersIn match: ${metersInMatch ? '✅ YES' : '❌ NO'} (Collection: ${collection.metersIn}, History: ${correspondingHistory.metersIn})`);
        console.log(`      metersOut match: ${metersOutMatch ? '✅ YES' : '❌ NO'} (Collection: ${collection.metersOut}, History: ${correspondingHistory.metersOut})`);
        console.log(`      prevIn match: ${prevInMatch ? '✅ YES' : '❌ NO'} (Collection: ${collection.prevIn}, History: ${correspondingHistory.prevMetersIn})`);
        console.log(`      prevOut match: ${prevOutMatch ? '✅ YES' : '❌ NO'} (Collection: ${collection.prevOut}, History: ${correspondingHistory.prevMetersOut})`);
        console.log('');

        if (!metersInMatch || !metersOutMatch || !prevInMatch || !prevOutMatch) {
          console.log('   ⚠️  ISSUE: History Mismatch');
          console.log('   Collection document data does not match machine history entry');
          console.log('');
        } else {
          console.log('   ✅ No mismatch detected - data is synchronized');
          console.log('');
        }
      }

      // Check for duplicate history entries
      const duplicateHistories = history.filter(
        h => h.locationReportId === REPORT_ID
      );

      if (duplicateHistories.length > 1) {
        console.log(`   ⚠️  ISSUE: Duplicate History Entries (${duplicateHistories.length} found)`);
        console.log('   Multiple history entries with the same locationReportId');
        console.log('');
        duplicateHistories.forEach((dup, index) => {
          console.log(`   Duplicate #${index + 1}:`);
          console.log(`      _id: ${dup._id}`);
          console.log(`      metersIn: ${dup.metersIn}`);
          console.log(`      metersOut: ${dup.metersOut}`);
          console.log(`      timestamp: ${dup.timestamp}`);
          console.log('');
        });
      }

      // Check for orphaned history entries (history exists but no collection)
      console.log('   🔍 Checking for Orphaned History Entries:');
      const allHistoryForMachine = history;
      for (const historyEntry of allHistoryForMachine) {
        const correspondingCollection = await db.collection('collections').findOne({
          machineId: machine._id,
          locationReportId: historyEntry.locationReportId
        });

        if (!correspondingCollection) {
          console.log(`   ⚠️  Orphaned History Entry Found:`);
          console.log(`      History Entry ID: ${historyEntry._id}`);
          console.log(`      locationReportId: ${historyEntry.locationReportId}`);
          console.log(`      metersIn: ${historyEntry.metersIn}`);
          console.log(`      metersOut: ${historyEntry.metersOut}`);
          console.log(`      timestamp: ${historyEntry.timestamp}`);
          console.log(`      No corresponding collection found in collections table`);
          console.log('');
        }
      }

      console.log('');
    }

    // Step 4: Summary
    console.log('='.repeat(80));
    console.log('📊 INVESTIGATION SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    let totalIssues = 0;
    let missingHistory = 0;
    let historyMismatch = 0;
    let duplicateHistory = 0;
    let orphanedHistory = 0;

    for (const collection of collectionsToCheck) {
      const machine = await db.collection('machines').findOne({
        _id: collection.machineId
      });

      if (!machine) {
        totalIssues++;
        continue;
      }

      const history = machine.collectionMetersHistory || [];
      const correspondingHistory = history.find(
        h => h.locationReportId === REPORT_ID
      );

      if (!correspondingHistory) {
        missingHistory++;
        totalIssues++;
      } else {
        const metersInMatch = Math.abs(collection.metersIn - correspondingHistory.metersIn) < 0.1;
        const metersOutMatch = Math.abs(collection.metersOut - correspondingHistory.metersOut) < 0.1;
        const prevInMatch = Math.abs(collection.prevIn - correspondingHistory.prevMetersIn) < 0.1;
        const prevOutMatch = Math.abs(collection.prevOut - correspondingHistory.prevMetersOut) < 0.1;

        if (!metersInMatch || !metersOutMatch || !prevInMatch || !prevOutMatch) {
          historyMismatch++;
          totalIssues++;
        }
      }

      const duplicates = history.filter(h => h.locationReportId === REPORT_ID);
      if (duplicates.length > 1) {
        duplicateHistory++;
        totalIssues++;
      }
    }

    console.log(`Total Collections Checked: ${collectionsToCheck.length}`);
    console.log(`Total Issues Found: ${totalIssues}`);
    console.log('');
    console.log('Issue Breakdown:');
    console.log(`   Missing History: ${missingHistory}`);
    console.log(`   History Mismatch: ${historyMismatch}`);
    console.log(`   Duplicate History: ${duplicateHistory}`);
    console.log('');

    if (totalIssues === 0) {
      console.log('✅ No issues detected! All collection history is synchronized.');
    } else {
      console.log('⚠️  Issues detected. Review the detailed output above for specifics.');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

investigateHistoryIssues();

