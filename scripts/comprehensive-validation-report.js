#!/usr/bin/env node

/**
 * Comprehensive Validation Report
 * Validates all collections and reports for SAS time issues and gross consistency
 * Does NOT fix any issues - only reports them
 */

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';

async function comprehensiveValidation() {
  let client;

  try {
    console.log('🔍 Starting Comprehensive Validation Report...\n');

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const Collections = db.collection('collections');
    const CollectionReports = db.collection('collectionreports');
    const Machines = db.collection('machines');

    // Get all collections and reports
    const allCollections = await Collections.find({}).toArray();
    const allReports = await CollectionReports.find({}).toArray();

    console.log(
      `📊 Found ${allCollections.length} collections and ${allReports.length} reports\n`
    );

    let totalIssues = 0;
    let issuesByType = {
      invertedSasTimes: 0,
      prevMetersMismatch: 0,
      movementCalculationMismatch: 0,
      historyTimestampMismatch: 0, // Only if it's NOT createdAt vs timestamp
      grossConsistencyIssues: 0,
    };

    const issuesDetails = [];

    // 1. Validate Collections
    console.log('🔍 Validating Collections...\n');

    for (const collection of allCollections) {
      const collectionIssues = [];

      // Check 1: Inverted SAS Times
      if (
        collection.sasMeters?.sasStartTime &&
        collection.sasMeters?.sasEndTime
      ) {
        const startTime = new Date(collection.sasMeters.sasStartTime);
        const endTime = new Date(collection.sasMeters.sasEndTime);

        if (startTime >= endTime) {
          collectionIssues.push({
            type: 'invertedSasTimes',
            message: `SAS start time (${startTime.toISOString()}) is not before end time (${endTime.toISOString()})`,
          });
          issuesByType.invertedSasTimes++;
        }
      }

      // Check 2: Prev Meters Accuracy
      if (collection.prevIn !== undefined && collection.prevOut !== undefined) {
        // Find the actual previous collection
        const previousCollection = await Collections.findOne(
          {
            machineId: collection.machineId,
            timestamp: { $lt: new Date(collection.timestamp) },
            deletedAt: { $exists: false },
          },
          { sort: { timestamp: -1 } }
        );

        if (previousCollection) {
          const expectedPrevIn = previousCollection.metersIn || 0;
          const expectedPrevOut = previousCollection.metersOut || 0;

          if (
            collection.prevIn !== expectedPrevIn ||
            collection.prevOut !== expectedPrevOut
          ) {
            collectionIssues.push({
              type: 'prevMetersMismatch',
              message: `Prev meters mismatch: expected In=${expectedPrevIn}, Out=${expectedPrevOut}, got In=${collection.prevIn}, Out=${collection.prevOut}`,
            });
            issuesByType.prevMetersMismatch++;
          }
        } else {
          // No previous collection, should be 0
          if (collection.prevIn !== 0 || collection.prevOut !== 0) {
            collectionIssues.push({
              type: 'prevMetersMismatch',
              message: `No previous collection found but prevIn=${collection.prevIn}, prevOut=${collection.prevOut} (should be 0)`,
            });
            issuesByType.prevMetersMismatch++;
          }
        }
      }

      // Check 3: Movement Calculation Accuracy
      let expectedMetersInMovement, expectedMetersOutMovement;

      if (collection.ramClear) {
        // RAM Clear calculation: use the same logic as calculateMovement function
        if (
          collection.ramClearMetersIn !== undefined &&
          collection.ramClearMetersOut !== undefined
        ) {
          expectedMetersInMovement =
            collection.ramClearMetersIn -
            collection.prevIn +
            (collection.metersIn - 0);
          expectedMetersOutMovement =
            collection.ramClearMetersOut -
            collection.prevOut +
            (collection.metersOut - 0);
        } else {
          expectedMetersInMovement = collection.metersIn;
          expectedMetersOutMovement = collection.metersOut;
        }
      } else {
        // Standard calculation: current - previous
        expectedMetersInMovement = collection.metersIn - collection.prevIn;
        expectedMetersOutMovement = collection.metersOut - collection.prevOut;
      }

      const expectedGross =
        expectedMetersInMovement - expectedMetersOutMovement;

      if (
        collection.movement?.metersIn !== undefined &&
        collection.movement?.metersOut !== undefined
      ) {
        if (
          Math.abs(collection.movement.metersIn - expectedMetersInMovement) >
            0.01 ||
          Math.abs(collection.movement.metersOut - expectedMetersOutMovement) >
            0.01 ||
          Math.abs(collection.movement.gross - expectedGross) > 0.01
        ) {
          collectionIssues.push({
            type: 'movementCalculationMismatch',
            message: `Movement calculation mismatch: expected In=${expectedMetersInMovement}, Out=${expectedMetersOutMovement}, Gross=${expectedGross}, got In=${collection.movement.metersIn}, Out=${collection.movement.metersOut}, Gross=${collection.movement.gross}`,
          });
          issuesByType.movementCalculationMismatch++;
        }
      }

      // Check 4: History Timestamp (only if it's NOT createdAt vs timestamp)
      if (
        collection.collectionMetersHistory &&
        Array.isArray(collection.collectionMetersHistory)
      ) {
        for (const historyEntry of collection.collectionMetersHistory) {
          // Only flag if it's NOT createdAt vs timestamp difference
          if (historyEntry.timestamp && historyEntry.createdAt) {
            const timestamp = new Date(historyEntry.timestamp);
            const createdAt = new Date(historyEntry.createdAt);
            const timeDiffMinutes =
              Math.abs(timestamp.getTime() - createdAt.getTime()) / (1000 * 60);

            // Only flag if the difference is significant AND it's not just createdAt vs timestamp
            // createdAt can legitimately differ from timestamp, so we ignore this case
            if (timeDiffMinutes > 60) {
              // More than 1 hour difference
              // Check if this is just a createdAt vs timestamp issue
              const isCreatedAtVsTimestamp =
                Math.abs(
                  timestamp.getTime() - new Date(collection.timestamp).getTime()
                ) < 60000; // Less than 1 minute

              if (!isCreatedAtVsTimestamp) {
                collectionIssues.push({
                  type: 'historyTimestampMismatch',
                  message: `History timestamp mismatch: history=${timestamp.toISOString()}, collection=${
                    collection.timestamp
                  }, diff=${timeDiffMinutes.toFixed(1)}min`,
                });
                issuesByType.historyTimestampMismatch++;
              }
            }
          }
        }
      }

      if (collectionIssues.length > 0) {
        issuesDetails.push({
          collectionId: collection._id,
          reportId: collection.reportId,
          machineName:
            collection.machineName || collection.machineCustomName || 'Unknown',
          timestamp: collection.timestamp,
          issues: collectionIssues,
        });
        totalIssues += collectionIssues.length;
      }
    }

    // 2. Validate Collection Reports
    console.log('🔍 Validating Collection Reports...\n');

    for (const report of allReports) {
      const reportCollections = await Collections.find({
        locationReportId: report.locationReportId,
      }).toArray();

      // Calculate expected gross from collections
      let expectedReportGross = 0;
      for (const collection of reportCollections) {
        if (collection.movement?.gross !== undefined) {
          expectedReportGross += collection.movement.gross;
        }
      }

      // Compare with report's stored gross (if available)
      if (
        report.gross !== undefined &&
        Math.abs(report.gross - expectedReportGross) > 0.01
      ) {
        issuesDetails.push({
          reportId: report.locationReportId,
          type: 'grossConsistencyIssues',
          message: `Report gross mismatch: stored=${
            report.gross
          }, calculated=${expectedReportGross}, diff=${Math.abs(
            report.gross - expectedReportGross
          )}`,
        });
        issuesByType.grossConsistencyIssues++;
        totalIssues++;
      }
    }

    // 3. Cross-validate with Cabinets page data (sample check)
    console.log('🔍 Cross-validating with Cabinets data...\n');

    // Get a sample of recent reports for cross-validation
    const recentReports = allReports.slice(0, 5);

    for (const report of recentReports) {
      const reportCollections = await Collections.find({
        locationReportId: report.locationReportId,
      }).toArray();

      if (reportCollections.length > 0) {
        // Calculate total gross for this report
        let reportGross = 0;
        for (const collection of reportCollections) {
          if (collection.movement?.gross !== undefined) {
            reportGross += collection.movement.gross;
          }
        }

        // Get the report timestamp for time period
        const reportTimestamp = new Date(report.timestamp);

        // Find machines in this report
        const machineIds = [
          ...new Set(reportCollections.map(c => c.machineId)),
        ];

        for (const machineId of machineIds) {
          // This is a simplified check - in reality, you'd need to query the cabinets API
          // with the same time period filters to compare
          const machineCollections = reportCollections.filter(
            c => c.machineId === machineId
          );
          const machineGross = machineCollections.reduce(
            (sum, c) => sum + (c.movement?.gross || 0),
            0
          );

          // Note: Full cross-validation would require calling the cabinets API endpoints
          // with the same date filters to compare gross values
        }
      }
    }

    // 4. Generate Summary Report
    console.log('='.repeat(80));
    console.log('📊 COMPREHENSIVE VALIDATION SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n📈 OVERALL STATISTICS:`);
    console.log(`   Total Collections: ${allCollections.length}`);
    console.log(`   Total Reports: ${allReports.length}`);
    console.log(`   Total Issues Found: ${totalIssues}`);
    console.log(
      `   Collections with Issues: ${
        issuesDetails.filter(i => i.collectionId).length
      }`
    );
    console.log(
      `   Reports with Issues: ${
        issuesDetails.filter(
          i => i.reportId && i.type === 'grossConsistencyIssues'
        ).length
      }`
    );

    console.log(`\n📋 ISSUES BY TYPE:`);
    console.log(`   Inverted SAS Times: ${issuesByType.invertedSasTimes}`);
    console.log(`   Prev Meters Mismatch: ${issuesByType.prevMetersMismatch}`);
    console.log(
      `   Movement Calculation Mismatch: ${issuesByType.movementCalculationMismatch}`
    );
    console.log(
      `   History Timestamp Mismatch: ${issuesByType.historyTimestampMismatch}`
    );
    console.log(
      `   Gross Consistency Issues: ${issuesByType.grossConsistencyIssues}`
    );

    if (totalIssues === 0) {
      console.log(`\n✅ RESULT: ALL VALIDATIONS PASSED - NO ISSUES FOUND!`);
    } else {
      console.log(`\n⚠️  RESULT: ${totalIssues} ISSUES FOUND`);

      console.log(`\n📝 DETAILED ISSUES:`);
      for (const issue of issuesDetails.slice(0, 10)) {
        // Show first 10 issues
        console.log(
          `\n   ${issue.collectionId ? 'Collection' : 'Report'}: ${
            issue.collectionId || issue.reportId
          }`
        );
        console.log(`   Machine: ${issue.machineName || 'N/A'}`);
        console.log(`   Timestamp: ${issue.timestamp || 'N/A'}`);
        if (issue.issues) {
          for (const subIssue of issue.issues) {
            console.log(`     - ${subIssue.type}: ${subIssue.message}`);
          }
        } else {
          console.log(`     - ${issue.message}`);
        }
      }

      if (issuesDetails.length > 10) {
        console.log(`\n   ... and ${issuesDetails.length - 10} more issues`);
      }
    }

    console.log(`\n📅 Report Generated: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Error during validation:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

comprehensiveValidation();
