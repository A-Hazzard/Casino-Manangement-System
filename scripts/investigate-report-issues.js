/**
 * Investigation Script for Collection Report Issues
 *
 * This script investigates the most recent collection report and identifies
 * all issues with SAS times, history, and prevIn/prevOut values.
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 17th, 2025
 */

const { MongoClient } = require("mongodb");

// MongoDB connection
const MONGODB_URI =
  process.env.MONGO_URI ||
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

async function investigateReportIssues() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("🔍 Connected to MongoDB");

    const db = client.db();
    console.log("📊 Database connected, checking collection reports...");

    // Get the most recent collection report
    const mostRecentReport = await db
      .collection("collectionreports")
      .findOne({}, { sort: { timestamp: -1 } });

    if (!mostRecentReport) {
      console.log("❌ No collection reports found");
      return;
    }

    console.log(
      `\n📊 Investigating Report: ${mostRecentReport.locationReportId}`
    );
    console.log(`Location: ${mostRecentReport.locationName}`);
    console.log(`Date: ${mostRecentReport.timestamp}`);
    console.log(`Collector: ${mostRecentReport.collectorName}`);

    // Get all collections for this report
    const reportCollections = await db
      .collection("collections")
      .find({ locationReportId: mostRecentReport.locationReportId })
      .sort({ timestamp: 1 })
      .toArray();

    console.log(
      `\n📋 Found ${reportCollections.length} collections in this report`
    );

    const issues = [];
    const machinesWithIssues = new Set();

    // Investigate each collection
    for (const collection of reportCollections) {
      console.log(`\n🔍 Investigating Collection: ${collection._id}`);
      console.log(`   Machine: ${collection.machineId}`);
      console.log(
        `   Meters In: ${collection.metersIn}, Out: ${collection.metersOut}`
      );
      console.log(
        `   Prev In: ${collection.prevIn}, Prev Out: ${collection.prevOut}`
      );

      const collectionIssues = [];

      // 1. Check SAS Times Issues
      if (collection.sasMeters) {
        const sasStart = new Date(collection.sasMeters.sasStartTime);
        const sasEnd = new Date(collection.sasMeters.sasEndTime);

        if (sasStart >= sasEnd) {
          collectionIssues.push({
            type: "SAS_TIMES_INVERTED",
            description: "SAS start time is after or equal to end time",
            details: {
              sasStartTime: collection.sasMeters.sasStartTime,
              sasEndTime: collection.sasMeters.sasEndTime,
            },
          });
        }

        // Check for missing SAS times
        if (
          !collection.sasMeters.sasStartTime ||
          !collection.sasMeters.sasEndTime
        ) {
          collectionIssues.push({
            type: "SAS_TIMES_MISSING",
            description: "SAS start or end time is missing",
            details: {
              sasStartTime: collection.sasMeters.sasStartTime,
              sasEndTime: collection.sasMeters.sasEndTime,
            },
          });
        }
      } else {
        collectionIssues.push({
          type: "SAS_METERS_MISSING",
          description: "SAS meters data is completely missing",
          details: {},
        });
      }

      // 2. Check Movement Calculation Issues
      if (collection.movement) {
        let expectedMetersInMovement, expectedMetersOutMovement;

        if (collection.ramClear) {
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
          expectedMetersInMovement = collection.metersIn - collection.prevIn;
          expectedMetersOutMovement = collection.metersOut - collection.prevOut;
        }

        const expectedGross =
          expectedMetersInMovement - expectedMetersOutMovement;

        if (
          Math.abs(collection.movement.metersIn - expectedMetersInMovement) >
            0.01 ||
          Math.abs(collection.movement.metersOut - expectedMetersOutMovement) >
            0.01 ||
          Math.abs(collection.movement.gross - expectedGross) > 0.01
        ) {
          collectionIssues.push({
            type: "MOVEMENT_CALCULATION_WRONG",
            description: "Movement calculation does not match expected values",
            details: {
              actual: {
                metersIn: collection.movement.metersIn,
                metersOut: collection.movement.metersOut,
                gross: collection.movement.gross,
              },
              expected: {
                metersIn: expectedMetersInMovement,
                metersOut: expectedMetersOutMovement,
                gross: expectedGross,
              },
            },
          });
        }
      }

      // 3. Check PrevIn/PrevOut Issues
      if (
        collection.prevIn === 0 ||
        collection.prevIn === undefined ||
        collection.prevIn === null ||
        collection.prevOut === 0 ||
        collection.prevOut === undefined ||
        collection.prevOut === null
      ) {
        collectionIssues.push({
          type: "PREV_METERS_ZERO_OR_UNDEFINED",
          description: "Previous meter values are 0 or undefined",
          details: {
            prevIn: collection.prevIn,
            prevOut: collection.prevOut,
          },
        });
      }

      // 4. Check Machine History Issues
      const machine = await db
        .collection("machines")
        .findOne({ _id: collection.machineId });
      if (machine && machine.collectionMetersHistory) {
        const historyEntry = machine.collectionMetersHistory.find(
          (entry) =>
            entry.metersIn === collection.metersIn &&
            entry.metersOut === collection.metersOut &&
            entry.locationReportId === collection.locationReportId
        );

        if (!historyEntry) {
          collectionIssues.push({
            type: "HISTORY_ENTRY_MISSING",
            description: "No corresponding history entry found in machine",
            details: {
              machineId: collection.machineId,
              metersIn: collection.metersIn,
              metersOut: collection.metersOut,
              locationReportId: collection.locationReportId,
            },
          });
        } else {
          // Check if history entry has correct prevIn/prevOut
          if (
            historyEntry.prevMetersIn !== collection.prevIn ||
            historyEntry.prevMetersOut !== collection.prevOut
          ) {
            collectionIssues.push({
              type: "HISTORY_PREV_METERS_MISMATCH",
              description:
                "History entry prevIn/prevOut does not match collection",
              details: {
                collection: {
                  prevIn: collection.prevIn,
                  prevOut: collection.prevOut,
                },
                history: {
                  prevIn: historyEntry.prevMetersIn,
                  prevOut: historyEntry.prevMetersOut,
                },
              },
            });
          }
        }
      }

      if (collectionIssues.length > 0) {
        issues.push({
          collectionId: collection._id,
          machineId: collection.machineId,
          issues: collectionIssues,
        });
        machinesWithIssues.add(collection.machineId);
      }
    }

    // Summary
    console.log(`\n📊 INVESTIGATION SUMMARY:`);
    console.log(`   Report ID: ${mostRecentReport.locationReportId}`);
    console.log(`   Total Collections: ${reportCollections.length}`);
    console.log(`   Collections with Issues: ${issues.length}`);
    console.log(`   Machines with Issues: ${machinesWithIssues.size}`);

    if (issues.length > 0) {
      console.log(`\n🚨 ISSUES FOUND:`);
      issues.forEach((issue, index) => {
        console.log(
          `\n   ${index + 1}. Collection ${issue.collectionId} (Machine: ${
            issue.machineId
          }):`
        );
        issue.issues.forEach((issueDetail) => {
          console.log(
            `      - ${issueDetail.type}: ${issueDetail.description}`
          );
          if (Object.keys(issueDetail.details).length > 0) {
            console.log(
              `        Details:`,
              JSON.stringify(issueDetail.details, null, 2)
            );
          }
        });
      });
    } else {
      console.log(`\n✅ No issues found in the most recent report!`);
    }
  } catch (error) {
    console.error("❌ Investigation failed:", error);
  } finally {
    await client.close();
  }
}

// Run the investigation
investigateReportIssues().catch(console.error);
