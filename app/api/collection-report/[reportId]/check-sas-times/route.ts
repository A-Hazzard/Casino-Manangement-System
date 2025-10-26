import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/middleware/db";
import { Collections } from "../../../lib/models/collections";
import { CollectionReport } from "../../../lib/models/collectionReport";
import type {
  CollectionIssue,
  CollectionIssueDetails,
} from "@/shared/types/entities";

/**
 * GET /api/collection-report/[reportId]/check-sas-times
 * Check for SAS time issues in a collection report and return detailed issue information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    await connectDB();

    const { reportId } = await params;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Find collection report
    const collectionReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!collectionReport) {
      return NextResponse.json(
        { success: false, error: "Collection report not found" },
        { status: 404 }
      );
    }

    // Find all collections for this report
    const collections = await Collections.find({
      locationReportId: reportId,
    });

    if (collections.length === 0) {
      return NextResponse.json({
        issues: [],
        summary: {
          totalIssues: 0,
          affectedMachines: 0,
          affectedReports: 0,
        },
      });
    }

    const issues: CollectionIssue[] = [];
    const affectedMachines = new Set<string>();

    // Check each collection for issues
    for (const collection of collections) {
      const machineId = collection.machineId;
      if (!machineId) continue;

      affectedMachines.add(machineId);

      // Check for inverted SAS times
      if (
        collection.sasMeters?.sasStartTime &&
        collection.sasMeters?.sasEndTime
      ) {
        const sasStartTime = new Date(collection.sasMeters.sasStartTime);
        const sasEndTime = new Date(collection.sasMeters.sasEndTime);

        if (sasStartTime >= sasEndTime) {
          issues.push({
            collectionId: collection._id.toString(),
            machineName:
              collection.machineName ||
              collection.machineCustomName ||
              "Unknown",
            issueType: "inverted_times",
            details: {
              current: {
                sasStartTime: sasStartTime.toISOString(),
                sasEndTime: sasEndTime.toISOString(),
              },
              expected: {
                sasStartTime: "Should be before sasEndTime",
                sasEndTime: "Should be after sasStartTime",
              },
              explanation:
                "SAS start time is after or equal to SAS end time, creating an invalid time range",
            },
          });
        }
      }

      // Check for previous meters mismatch
      if (collection.prevIn !== undefined && collection.prevOut !== undefined) {
        // CORRECT LOGIC: Check against ACTUAL historical data, not calculated values
        // Find the actual previous collection to determine correct prevIn/prevOut values
        const actualPreviousCollection = await Collections.findOne({
          machineId: machineId,
          $and: [
            {
              $or: [
                { collectionTime: { $lt: collection.collectionTime || collection.timestamp } },
                { timestamp: { $lt: collection.collectionTime || collection.timestamp } },
              ],
            },
            {
              $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
            },
            // Only look for completed collections (from finalized reports)
            { isCompleted: true },
          ],
        })
          .sort({ collectionTime: -1, timestamp: -1 })
          .lean();

        if (actualPreviousCollection) {
          // There IS a previous collection, so prevIn/prevOut should match its meters
          const expectedPrevIn = actualPreviousCollection.metersIn || 0;
          const expectedPrevOut = actualPreviousCollection.metersOut || 0;

      // Allow for minor precision differences (within 0.1)
      const prevInDiff = Math.abs(collection.prevIn - expectedPrevIn);
      const prevOutDiff = Math.abs(collection.prevOut - expectedPrevOut);
      
      if (
        (prevInDiff > 0.1) ||
        (prevOutDiff > 0.1) ||
        (collection.prevIn === 0 && collection.prevOut === 0 && expectedPrevIn > 0) // Special case: both 0 when they should have values
      ) {
        issues.push({
          collectionId: collection._id.toString(),
          machineName:
            collection.machineName ||
            collection.machineCustomName ||
            "Unknown",
          issueType: "prev_meters_mismatch",
          details: {
            current: {
              prevIn: collection.prevIn,
              prevOut: collection.prevOut,
            },
            expected: {
              prevIn: expectedPrevIn,
              prevOut: expectedPrevOut,
              previousCollectionTime: actualPreviousCollection.timestamp,
            },
            explanation: `Previous meters don't match the actual meters from the previous collection (${new Date(
              actualPreviousCollection.timestamp
            ).toLocaleDateString()})`,
          },
        });
      }
        } else {
          // No previous collection exists, so prevIn/prevOut should be 0
          if (collection.prevIn !== 0 || collection.prevOut !== 0) {
            issues.push({
              collectionId: collection._id.toString(),
              machineName:
                collection.machineName ||
                collection.machineCustomName ||
                "Unknown",
              issueType: "prev_meters_mismatch",
              details: {
                current: {
                  prevIn: collection.prevIn,
                  prevOut: collection.prevOut,
                },
                expected: {
                  prevIn: 0,
                  prevOut: 0,
                },
                explanation: "No previous collection found, but prevIn/prevOut are not zero",
              },
            });
          }
        }
      }

      // Check for movement calculation accuracy (handle RAM Clear)
      let expectedMetersInMovement, expectedMetersOutMovement;

      if (collection.ramClear) {
        // RAM Clear calculation: use the same logic as calculateMovement function
        if (
          collection.ramClearMetersIn !== undefined &&
          collection.ramClearMetersOut !== undefined
        ) {
          // Formula: (ramClearMeters - prevMeters) + (currentMeters - 0)
          expectedMetersInMovement =
            collection.ramClearMetersIn -
            collection.prevIn +
            (collection.metersIn - 0);
          expectedMetersOutMovement =
            collection.ramClearMetersOut -
            collection.prevOut +
            (collection.metersOut - 0);
        } else {
          // Use current values directly (meters reset to 0)
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
        Math.abs(collection.movement.metersIn - expectedMetersInMovement) >
          0.01 ||
        Math.abs(collection.movement.metersOut - expectedMetersOutMovement) >
          0.01 ||
        Math.abs(collection.movement.gross - expectedGross) > 0.01
      ) {
        issues.push({
          collectionId: collection._id.toString(),
          machineName:
            collection.machineName || collection.machineCustomName || "Unknown",
          issueType: "prev_meters_mismatch",
          details: {
            current: {
              movementMetersIn: collection.movement.metersIn,
              movementMetersOut: collection.movement.metersOut,
              movementGross: collection.movement.gross,
            },
            expected: {
              movementMetersIn: expectedMetersInMovement,
              movementMetersOut: expectedMetersOutMovement,
              movementGross: expectedGross,
            },
            explanation: `Movement calculation doesn't match expected values (MetersIn - PrevIn = ${expectedMetersInMovement.toFixed(
              2
            )}, MetersOut - PrevOut = ${expectedMetersOutMovement.toFixed(
              2
            )}, Gross = ${expectedGross.toFixed(2)})`,
          },
        });
      }

      // Note: Negative movements are expected in the system, not errors

      // Note: collectionMetersHistory timestamp mismatches are not checked
      // because createdAt can legitimately differ from timestamp
    }

    // Check for collectionMetersHistory issues at the machine level
    // ONLY check machines that are in this report
    console.warn(
      "🔍 Checking collectionMetersHistory issues at machine level (for machines in this report only)..."
    );

    try {
      // Get unique machine IDs from collections in this report
      const machineIdsInReport = [...new Set(collections.map(c => c.machineId))];
      console.warn(
        `Checking ${machineIdsInReport.length} machines from this report: ${machineIdsInReport.join(', ')}`
      );

      // Use raw MongoDB driver to avoid caching issues
      const mongoose = await import("mongoose");
      const db = mongoose.default.connection.db;
      if (!db) throw new Error("Database connection not available");
      
      // Only fetch machines that are in this report
      const machineObjectIds = machineIdsInReport.map(id => {
        try {
          return new mongoose.default.Types.ObjectId(id);
        } catch {
          // If it's not a valid ObjectId, return null and we'll filter it out
          return null;
        }
      }).filter(Boolean);
      
      const machinesWithHistory = await db
        .collection("machines")
        .find({
          $or: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: { $in: machineObjectIds as any } },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _id: { $in: machineIdsInReport as any } } // Also try as strings
          ],
          collectionMetersHistory: { $exists: true, $ne: [] },
        })
        .toArray();

      console.warn(
        `Found ${machinesWithHistory.length} machines with collectionMetersHistory in this report`
      );

      for (const machine of machinesWithHistory) {
        const history = machine.collectionMetersHistory || [];

        for (let i = 1; i < history.length; i++) {
          const entry = history[i];
          const prevIn = entry.prevMetersIn || 0;
          const prevOut = entry.prevMetersOut || 0;

          // Check if this is suspicious (not first entry but both zeros or undefined)
          if (
            (prevIn === 0 || prevIn === undefined || prevIn === null) &&
            (prevOut === 0 || prevOut === undefined || prevOut === null)
          ) {
            // This machine is already in the report, so add the issue
            issues.push({
              collectionId: `machine-${machine._id}-history-${i}`,
              machineName:
                machine.serialNumber ||
                machine.custom?.name ||
                machine.origSerialNumber ||
                machine._id.toString(),
              issueType: "prev_meters_mismatch",
              details: {
                current: {
                  prevMetersIn: entry.prevMetersIn,
                  prevMetersOut: entry.prevMetersOut,
                  entryIndex: i,
                },
                expected: {
                  prevMetersIn: i > 0 ? history[i - 1]?.metersIn || 0 : 0,
                  prevMetersOut: i > 0 ? history[i - 1]?.metersOut || 0 : 0,
                  entryIndex: i,
                },
                explanation: `Collection history entry ${
                  i + 1
                } has prevIn/prevOut as 0 or undefined, but should reference the meters from the previous collection (entry ${i}).`,
              },
            });

            affectedMachines.add(machine._id.toString());
            break; // Only count this machine once
          }
        }
      }
    } catch (error) {
      console.error("Error checking collectionMetersHistory:", error);
    }

    const result: CollectionIssueDetails = {
      issues,
      summary: {
        totalIssues: issues.length,
        affectedMachines: affectedMachines.size,
        affectedReports: 1, // Only checking current report
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking SAS time issues:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
