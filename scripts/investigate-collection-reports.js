/**
 * Collection Reports Investigation Script
 * 
 * Purpose: Investigate collection reports for data integrity issues:
 *   - Previous meters mismatch
 *   - Collection meters history inconsistencies
 *   - Movement calculation accuracy
 *   - SAS time validation
 * 
 * Usage:
 *   node scripts/investigate-collection-reports.js [reportId]
 *   node scripts/investigate-collection-reports.js                    // Most recent report
 *   node scripts/investigate-collection-reports.js abc123-def456      // Specific report
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = 'sas-prod';

async function investigateCollectionReport(reportId = null) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);

    // Get report
    let report;
    if (reportId) {
      report = await db
        .collection('collectionreports')
        .findOne({ locationReportId: reportId });
    } else {
      report = await db
        .collection('collectionreports')
        .findOne({}, { sort: { timestamp: -1 } });
    }

    if (!report) {
      console.log('❌ No collection report found');
      return;
    }

    const locationReportId = report.locationReportId;

    console.log('📋 COLLECTION REPORT INVESTIGATION');
    console.log('='.repeat(120));
    console.log(`\n📍 Location: ${report.locationName}`);
    console.log(`   Report ID: ${locationReportId}`);
    console.log(`   Collector: ${report.collectorName}`);
    console.log(
      `   Date: ${new Date(report.timestamp).toLocaleString()}`
    );
    console.log(`   Total Machines: ${report.machinesCollected || 'N/A'}`);

    // Get all collections for this report
    const collections = await db
      .collection('collections')
      .find({ locationReportId })
      .sort({ timestamp: 1 })
      .toArray();

    console.log(`   Collections Found: ${collections.length}`);
    console.log('\n' + '='.repeat(120));

    let issuesFound = 0;
    const issuesList = [];

    for (const collection of collections) {
      const machineName =
        collection.machineCustomName ||
        collection.machineName ||
        collection.serialNumber ||
        collection.machineId;

      console.log(`\n\n🎰 Machine: ${machineName}`);
      console.log(`   Collection ID: ${collection._id}`);
      console.log(`   Machine ID: ${collection.machineId}`);
      console.log('-'.repeat(120));

      // Get machine document
      const machine = await db
        .collection('machines')
        .findOne({ _id: collection.machineId });

      const issues = [];

      // 1. Check Previous Meters Mismatch
      console.log('\n1️⃣ PREVIOUS METERS CHECK:');
      console.log(`   Collection prevIn:  ${collection.prevIn || 0}`);
      console.log(`   Collection prevOut: ${collection.prevOut || 0}`);

      // Find actual previous collection
      const previousCollection = await db
        .collection('collections')
        .findOne(
          {
            machineId: collection.machineId,
            timestamp: { $lt: collection.timestamp },
          },
          { sort: { timestamp: -1 } }
        );

      if (previousCollection) {
        console.log(
          `   Actual prev In:     ${previousCollection.metersIn || 0}`
        );
        console.log(
          `   Actual prev Out:    ${previousCollection.metersOut || 0}`
        );

        const prevInDiff = Math.abs(
          (collection.prevIn || 0) - (previousCollection.metersIn || 0)
        );
        const prevOutDiff = Math.abs(
          (collection.prevOut || 0) - (previousCollection.metersOut || 0)
        );

        if (prevInDiff > 0.1 || prevOutDiff > 0.1) {
          console.log(
            `   ⚠️  MISMATCH: prevIn diff = ${prevInDiff.toFixed(2)}, prevOut diff = ${prevOutDiff.toFixed(2)}`
          );
          issues.push({
            type: 'PREV_METERS_MISMATCH',
            details: `Expected prevIn=${previousCollection.metersIn}, got ${collection.prevIn}. Expected prevOut=${previousCollection.metersOut}, got ${collection.prevOut}`,
          });
        } else {
          console.log('   ✅ Previous meters match');
        }
      } else {
        console.log('   📌 First collection (no previous)');
        if (
          (collection.prevIn || 0) !== 0 ||
          (collection.prevOut || 0) !== 0
        ) {
          console.log(
            `   ⚠️  ISSUE: First collection should have prevIn=0, prevOut=0, but has prevIn=${collection.prevIn}, prevOut=${collection.prevOut}`
          );
          issues.push({
            type: 'FIRST_COLLECTION_PREV_NOT_ZERO',
            details: `First collection has non-zero prev meters: prevIn=${collection.prevIn}, prevOut=${collection.prevOut}`,
          });
        }
      }

      // 2. Check Movement Calculation
      console.log('\n2️⃣ MOVEMENT CALCULATION CHECK:');
      const currentMetersIn = collection.metersIn || 0;
      const currentMetersOut = collection.metersOut || 0;
      const prevIn = collection.prevIn || 0;
      const prevOut = collection.prevOut || 0;

      let expectedMovementIn, expectedMovementOut;

      if (collection.ramClear && collection.ramClearMetersIn !== undefined) {
        expectedMovementIn =
          collection.ramClearMetersIn - prevIn + (currentMetersIn - 0);
        expectedMovementOut =
          collection.ramClearMetersOut - prevOut + (currentMetersOut - 0);
        console.log('   Type: RAM Clear (with ramClearMeters)');
      } else if (collection.ramClear) {
        expectedMovementIn = currentMetersIn;
        expectedMovementOut = currentMetersOut;
        console.log('   Type: RAM Clear (without ramClearMeters)');
      } else {
        expectedMovementIn = currentMetersIn - prevIn;
        expectedMovementOut = currentMetersOut - prevOut;
        console.log('   Type: Standard');
      }

      const expectedGross = expectedMovementIn - expectedMovementOut;
      const actualMovementIn = collection.movement?.metersIn || 0;
      const actualMovementOut = collection.movement?.metersOut || 0;
      const actualGross = collection.movement?.gross || 0;

      console.log(`   Expected movementIn:  ${expectedMovementIn.toFixed(2)}`);
      console.log(`   Actual movementIn:    ${actualMovementIn.toFixed(2)}`);
      console.log(`   Expected movementOut: ${expectedMovementOut.toFixed(2)}`);
      console.log(`   Actual movementOut:   ${actualMovementOut.toFixed(2)}`);
      console.log(`   Expected gross:       ${expectedGross.toFixed(2)}`);
      console.log(`   Actual gross:         ${actualGross.toFixed(2)}`);

      const movementInDiff = Math.abs(expectedMovementIn - actualMovementIn);
      const movementOutDiff = Math.abs(expectedMovementOut - actualMovementOut);
      const grossDiff = Math.abs(expectedGross - actualGross);

      if (movementInDiff > 0.1 || movementOutDiff > 0.1 || grossDiff > 0.1) {
        console.log(
          `   ⚠️  MISMATCH: in diff = ${movementInDiff.toFixed(2)}, out diff = ${movementOutDiff.toFixed(2)}, gross diff = ${grossDiff.toFixed(2)}`
        );
        issues.push({
          type: 'MOVEMENT_CALCULATION_MISMATCH',
          details: `Expected gross=${expectedGross.toFixed(2)}, got ${actualGross.toFixed(2)}`,
        });
      } else {
        console.log('   ✅ Movement calculation correct');
      }

      // 3. Check Collection Meters History
      console.log('\n3️⃣ COLLECTION METERS HISTORY CHECK:');
      if (machine && machine.collectionMetersHistory) {
        const historyEntry = machine.collectionMetersHistory.find(
          h => h.locationReportId === locationReportId
        );

        if (historyEntry) {
          console.log('   ✅ History entry found');
          console.log(
            `      metersIn:     ${historyEntry.metersIn} (expected: ${currentMetersIn})`
          );
          console.log(
            `      metersOut:    ${historyEntry.metersOut} (expected: ${currentMetersOut})`
          );
          console.log(
            `      prevMetersIn: ${historyEntry.prevMetersIn} (expected: ${prevIn})`
          );
          console.log(
            `      prevMetersOut: ${historyEntry.prevMetersOut} (expected: ${prevOut})`
          );

          if (
            Math.abs(historyEntry.metersIn - currentMetersIn) > 0.1 ||
            Math.abs(historyEntry.metersOut - currentMetersOut) > 0.1 ||
            Math.abs(historyEntry.prevMetersIn - prevIn) > 0.1 ||
            Math.abs(historyEntry.prevMetersOut - prevOut) > 0.1
          ) {
            console.log('   ⚠️  History entry values mismatch');
            issues.push({
              type: 'HISTORY_ENTRY_MISMATCH',
              details: 'Collection meters history values do not match collection',
            });
          } else {
            console.log('   ✅ History entry values match');
          }
        } else {
          console.log('   ⚠️  No history entry found for this report');
          issues.push({
            type: 'HISTORY_ENTRY_MISSING',
            details: 'No history entry in machine.collectionMetersHistory',
          });
        }

        // Check for duplicate history entries
        const duplicates = machine.collectionMetersHistory.filter(
          h => h.locationReportId === locationReportId
        );
        if (duplicates.length > 1) {
          console.log(
            `   ⚠️  DUPLICATE: Found ${duplicates.length} history entries for this report`
          );
          issues.push({
            type: 'HISTORY_DUPLICATES',
            details: `${duplicates.length} duplicate entries`,
          });
        }
      } else {
        console.log('   ⚠️  Machine has no collectionMetersHistory array');
        issues.push({
          type: 'HISTORY_MISSING',
          details: 'Machine.collectionMetersHistory is missing',
        });
      }

      // 4. Check SAS Times
      console.log('\n4️⃣ SAS TIME WINDOW CHECK:');
      if (collection.sasMeters) {
        console.log(`   SAS Start: ${collection.sasMeters.sasStartTime}`);
        console.log(`   SAS End:   ${collection.sasMeters.sasEndTime}`);

        const sasStart = new Date(collection.sasMeters.sasStartTime);
        const sasEnd = new Date(collection.sasMeters.sasEndTime);

        if (sasStart >= sasEnd) {
          console.log('   ⚠️  INVERTED: SAS start time >= end time');
          issues.push({
            type: 'SAS_TIMES_INVERTED',
            details: `Start (${sasStart.toISOString()}) >= End (${sasEnd.toISOString()})`,
          });
        } else {
          console.log('   ✅ SAS times valid');
        }
      } else {
        console.log('   📌 No SAS meters (non-SAS machine or no data)');
      }

      // Summary for this machine
      if (issues.length > 0) {
        console.log(`\n❌ ISSUES FOUND: ${issues.length}`);
        issues.forEach(issue => {
          console.log(`   • ${issue.type}: ${issue.details}`);
        });
        issuesFound += issues.length;
        issuesList.push({ machine: machineName, issues });
      } else {
        console.log('\n✅ NO ISSUES - All checks passed');
      }

      console.log('\n' + '-'.repeat(120));
    }

    // Final Summary
    console.log('\n\n📊 INVESTIGATION SUMMARY:');
    console.log('='.repeat(120));
    console.log(`   Report ID: ${locationReportId}`);
    console.log(`   Location: ${report.locationName}`);
    console.log(`   Total Collections: ${collections.length}`);
    console.log(`   Total Issues Found: ${issuesFound}`);

    if (issuesList.length > 0) {
      console.log('\n⚠️  MACHINES WITH ISSUES:');
      issuesList.forEach(({ machine, issues }) => {
        console.log(`\n   ${machine}:`);
        issues.forEach(issue => {
          console.log(`      • ${issue.type}: ${issue.details}`);
        });
      });
    } else {
      console.log('\n✅ NO ISSUES DETECTED - Report is clean!');
    }

    console.log('\n' + '='.repeat(120));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Get report ID from command line argument
const reportId = process.argv[2] || null;

if (reportId) {
  console.log(`🔍 Investigating specific report: ${reportId}\n`);
} else {
  console.log('🔍 Investigating MOST RECENT collection report\n');
}

investigateCollectionReport(reportId);

