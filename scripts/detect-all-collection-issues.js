require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🔍 Starting collection issue detection...\n');
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    const collections = db.collection('collections');
    const collectionReports = db.collection('collectionreports');

    // Get all collection reports
    const reports = await collectionReports
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    console.log(`📊 Found ${reports.length} total collection reports\n`);

    const issueReport = {
      timestamp: new Date().toISOString(),
      totalReports: reports.length,
      reportsWithIssues: 0,
      totalIssues: 0,
      issuesByType: {
        sasTimeIssues: 0,
        collectionHistoryIssues: 0,
        missingPreviousCollection: 0,
        invertedSasTimes: 0,
        missingSasStartTime: 0,
      },
      detailedReports: [],
    };

    // Process each report
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      const reportNumber = i + 1;

      console.log(
        `\n[${reportNumber}/${reports.length}] Checking report: ${report.locationReportId}`
      );
      console.log(`   Location: ${report.location}`);
      console.log(
        `   Date: ${new Date(report.timestamp).toLocaleDateString()}`
      );

      // Get all collections for this report
      const reportCollections = await collections
        .find({
          locationReportId: report.locationReportId,
          isCompleted: true,
        })
        .sort({ timestamp: 1 })
        .toArray();

      console.log(`   Collections: ${reportCollections.length} machines`);

      if (reportCollections.length === 0) {
        console.log('   ⚠️ No collections found for this report');
        continue;
      }

      // Get ALL collections for SAS time checking (across all reports)
      const allCollections = await collections
        .find({
          isCompleted: true,
          locationReportId: { $exists: true, $ne: '' },
        })
        .sort({ timestamp: 1 })
        .toArray();

      const reportIssues = {
        locationReportId: report.locationReportId,
        location: report.location,
        timestamp: report.timestamp,
        collector: report.collector,
        totalMachines: reportCollections.length,
        machinesWithIssues: 0,
        issues: [],
      };

      // Check each collection
      for (const collection of reportCollections) {
        const machineIssues = {
          machineId: collection.machineId,
          machineName: collection.machineName || collection.serialNumber,
          serialNumber: collection.serialNumber,
          collectionId: collection._id,
          sasTimeIssues: [],
          collectionHistoryIssues: [],
        };

        let hasIssues = false;

        // 1. Check SAS Times
        if (collection.sasMeters) {
          const { sasStartTime, sasEndTime } = collection.sasMeters;
          const collectionTime = new Date(collection.timestamp);

          // Find previous collection for this machine
          const previousCollection = allCollections
            .filter(
              c =>
                c.machineId === collection.machineId &&
                new Date(c.timestamp) < collectionTime &&
                c._id !== collection._id
            )
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

          if (!previousCollection) {
            machineIssues.sasTimeIssues.push({
              type: 'MISSING_PREVIOUS_COLLECTION',
              message: 'No previous collection found',
            });
            hasIssues = true;
            issueReport.issuesByType.missingPreviousCollection++;
          } else if (sasStartTime && sasEndTime) {
            const sasStart = new Date(sasStartTime);
            const sasEnd = new Date(sasEndTime);
            const expectedStart = previousCollection.sasMeters?.sasEndTime
              ? new Date(previousCollection.sasMeters.sasEndTime)
              : null;

            // Check for inverted times
            if (sasStart > sasEnd) {
              machineIssues.sasTimeIssues.push({
                type: 'INVERTED_SAS_TIMES',
                message: 'SAS start time is after SAS end time',
                actual: { start: sasStartTime, end: sasEndTime },
              });
              hasIssues = true;
              issueReport.issuesByType.invertedSasTimes++;
            }

            // Check if SAS start matches previous SAS end
            if (expectedStart) {
              const timeDiffMs = Math.abs(sasStart - expectedStart);
              const timeDiffMinutes = timeDiffMs / (1000 * 60);

              if (timeDiffMinutes > 5) {
                // Allow 5 minutes tolerance
                machineIssues.sasTimeIssues.push({
                  type: 'SAS_START_MISMATCH',
                  message: `SAS start time doesn't match previous end time`,
                  expected: expectedStart.toISOString(),
                  actual: sasStartTime,
                  differenceMinutes: Math.round(timeDiffMinutes),
                });
                hasIssues = true;
                issueReport.issuesByType.sasTimeIssues++;
              }
            }
          } else if (!sasStartTime) {
            machineIssues.sasTimeIssues.push({
              type: 'MISSING_SAS_START_TIME',
              message: 'Missing SAS start time',
            });
            hasIssues = true;
            issueReport.issuesByType.missingSasStartTime++;
          }
        }

        // 2. Check Collection History (from machine document)
        // This requires fetching the machine document
        const machinesCollection = db.collection('machines');
        const machine = await machinesCollection.findOne({
          _id: collection.machineId,
        });

        if (machine && machine.collectionMetersHistory) {
          const historyEntry = machine.collectionMetersHistory.find(
            h => h.locationReportId === report.locationReportId
          );

          if (historyEntry) {
            // Check if history matches collection
            if (historyEntry.metersIn !== collection.metersIn) {
              machineIssues.collectionHistoryIssues.push({
                type: 'METERS_IN_MISMATCH',
                message: "History metersIn doesn't match collection",
                history: historyEntry.metersIn,
                collection: collection.metersIn,
              });
              hasIssues = true;
              issueReport.issuesByType.collectionHistoryIssues++;
            }

            if (historyEntry.metersOut !== collection.metersOut) {
              machineIssues.collectionHistoryIssues.push({
                type: 'METERS_OUT_MISMATCH',
                message: "History metersOut doesn't match collection",
                history: historyEntry.metersOut,
                collection: collection.metersOut,
              });
              hasIssues = true;
              issueReport.issuesByType.collectionHistoryIssues++;
            }

            if (historyEntry.prevMetersIn !== collection.prevIn) {
              machineIssues.collectionHistoryIssues.push({
                type: 'PREV_METERS_IN_MISMATCH',
                message: "History prevMetersIn doesn't match collection prevIn",
                history: historyEntry.prevMetersIn,
                collection: collection.prevIn,
              });
              hasIssues = true;
              issueReport.issuesByType.collectionHistoryIssues++;
            }

            if (historyEntry.prevMetersOut !== collection.prevOut) {
              machineIssues.collectionHistoryIssues.push({
                type: 'PREV_METERS_OUT_MISMATCH',
                message:
                  "History prevMetersOut doesn't match collection prevOut",
                history: historyEntry.prevMetersOut,
                collection: collection.prevOut,
              });
              hasIssues = true;
              issueReport.issuesByType.collectionHistoryIssues++;
            }
          }
        }

        if (hasIssues) {
          reportIssues.issues.push(machineIssues);
          reportIssues.machinesWithIssues++;
          issueReport.totalIssues +=
            machineIssues.sasTimeIssues.length +
            machineIssues.collectionHistoryIssues.length;
        }
      }

      if (reportIssues.machinesWithIssues > 0) {
        issueReport.reportsWithIssues++;
        issueReport.detailedReports.push(reportIssues);
        console.log(
          `   ⚠️ Found ${reportIssues.machinesWithIssues} machines with issues`
        );
      } else {
        console.log('   ✅ No issues detected');
      }
    }

    // Generate report file
    const reportPath = path.join(__dirname, 'COLLECTION_ISSUES_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(issueReport, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('📊 DETECTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Reports Scanned: ${issueReport.totalReports}`);
    console.log(`Reports with Issues: ${issueReport.reportsWithIssues}`);
    console.log(`Total Issues Found: ${issueReport.totalIssues}`);
    console.log('\nIssues by Type:');
    console.log(`  SAS Time Issues: ${issueReport.issuesByType.sasTimeIssues}`);
    console.log(
      `  Collection History Issues: ${issueReport.issuesByType.collectionHistoryIssues}`
    );
    console.log(
      `  Missing Previous Collection: ${issueReport.issuesByType.missingPreviousCollection}`
    );
    console.log(
      `  Inverted SAS Times: ${issueReport.issuesByType.invertedSasTimes}`
    );
    console.log(
      `  Missing SAS Start Time: ${issueReport.issuesByType.missingSasStartTime}`
    );
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Full report saved to: ${reportPath}`);

    // Generate human-readable summary
    const summaryPath = path.join(__dirname, 'COLLECTION_ISSUES_SUMMARY.md');
    let summary = `# Collection Issues Detection Report\n\n`;
    summary += `**Generated:** ${new Date().toLocaleString()}\n`;
    summary += `**Total Reports Scanned:** ${issueReport.totalReports}\n`;
    summary += `**Reports with Issues:** ${issueReport.reportsWithIssues}\n`;
    summary += `**Total Issues Found:** ${issueReport.totalIssues}\n\n`;

    summary += `## Issues by Type\n\n`;
    summary += `| Issue Type | Count |\n`;
    summary += `|------------|-------|\n`;
    summary += `| SAS Time Issues | ${issueReport.issuesByType.sasTimeIssues} |\n`;
    summary += `| Collection History Issues | ${issueReport.issuesByType.collectionHistoryIssues} |\n`;
    summary += `| Missing Previous Collection | ${issueReport.issuesByType.missingPreviousCollection} |\n`;
    summary += `| Inverted SAS Times | ${issueReport.issuesByType.invertedSasTimes} |\n`;
    summary += `| Missing SAS Start Time | ${issueReport.issuesByType.missingSasStartTime} |\n\n`;

    if (issueReport.reportsWithIssues > 0) {
      summary += `## Reports with Issues\n\n`;

      for (const reportDetail of issueReport.detailedReports) {
        summary += `### ${reportDetail.location} - ${new Date(reportDetail.timestamp).toLocaleDateString()}\n`;
        summary += `- **Report ID:** \`${reportDetail.locationReportId}\`\n`;
        summary += `- **Collector:** ${reportDetail.collector || 'Unknown'}\n`;
        summary += `- **Total Machines:** ${reportDetail.totalMachines}\n`;
        summary += `- **Machines with Issues:** ${reportDetail.machinesWithIssues}\n\n`;

        for (const machineIssue of reportDetail.issues) {
          summary += `#### Machine: ${machineIssue.machineName} (${machineIssue.serialNumber})\n`;

          if (machineIssue.sasTimeIssues.length > 0) {
            summary += `**SAS Time Issues:**\n`;
            for (const issue of machineIssue.sasTimeIssues) {
              summary += `- ${issue.type}: ${issue.message}\n`;
              if (issue.expected)
                summary += `  - Expected: ${issue.expected}\n`;
              if (issue.actual) summary += `  - Actual: ${issue.actual}\n`;
              if (issue.differenceMinutes)
                summary += `  - Difference: ${issue.differenceMinutes} minutes\n`;
            }
            summary += `\n`;
          }

          if (machineIssue.collectionHistoryIssues.length > 0) {
            summary += `**Collection History Issues:**\n`;
            for (const issue of machineIssue.collectionHistoryIssues) {
              summary += `- ${issue.type}: ${issue.message}\n`;
              summary += `  - History: ${issue.history}\n`;
              summary += `  - Collection: ${issue.collection}\n`;
            }
            summary += `\n`;
          }
        }
      }
    } else {
      summary += `## ✅ No Issues Found\n\nAll collection reports are in good condition!\n`;
    }

    fs.writeFileSync(summaryPath, summary);
    console.log(`✅ Human-readable summary saved to: ${summaryPath}\n`);
  } catch (error) {
    console.error('❌ Detection failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
