import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/middleware/db";
import { Collections } from "../../../lib/models/collections";
import { CollectionReport } from "../../../lib/models/collectionReport";
import { Machine } from "../../../lib/models/machines";
import { getUserIdFromServer, getUserById } from "../../../lib/helpers/users";

/**
 * Fix collection history issues for a specific collection report
 * This specifically targets prevIn/prevOut issues in collectionMetersHistory
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    await connectDB();
    const { reportId } = await params;
    console.warn(`🔧 Starting fix-collection-history for report: ${reportId}`);

    // Check authentication (skip in development mode)
    if (process.env.NODE_ENV !== "development") {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if user has admin access
      if (
        !user.roles?.includes("admin") &&
        !user.roles?.includes("evolution admin")
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    } else {
      console.warn("⚠️ Running in development mode - skipping authentication");
    }

    // Find the report
    const report = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    console.warn(
      `📊 Found report: ${report.locationName} - ${report.timestamp}`
    );

    // Get all collections for this report
    const reportCollections = await Collections.find({
      locationReportId: reportId,
    });

    if (reportCollections.length === 0) {
      return NextResponse.json(
        { error: "No collections found for this report" },
        { status: 404 }
      );
    }

    console.warn(`📊 Found ${reportCollections.length} collections in report`);

    // Get unique machine IDs from this report
    const machineIds = [...new Set(reportCollections.map((c) => c.machineId))];

    let totalHistoryRebuilt = 0;
    let machinesFixedCount = 0;
    let machinesWithIssues = 0;

    // Process each machine
    for (const machineId of machineIds) {
      if (!machineId) continue;

      try {
        console.warn(`🔧 Processing machine: ${machineId}`);

        // Get the machine document
        const machine = await Machine.findById(machineId);
        if (!machine) {
          console.warn(`   ⚠️ Machine ${machineId} not found`);
          continue;
        }
        console.warn(
          `   ✅ Found machine: ${machine.serialNumber || machineId}`
        );

        // Get all collections for this machine (not just this report)
        const machineCollections = await Collections.find({
          machineId: machineId,
          deletedAt: { $exists: false },
        })
          .sort({ timestamp: 1 })
          .lean();

        if (machineCollections.length === 0) {
          console.warn(`   ⚠️ No collections found for machine ${machineId}`);
          continue;
        }

        console.warn(
          `   📊 Found ${machineCollections.length} total collections for machine ${machineId}`
        );

        // Check if machine has collectionMetersHistory issues
        if (
          !machine.collectionMetersHistory ||
          machine.collectionMetersHistory.length === 0
        ) {
          console.warn(
            `   ⚠️ Machine ${machineId} has no collectionMetersHistory`
          );
          continue;
        }

        // Check if machine has issues
        let machineHasIssues = false;
        for (let i = 1; i < machine.collectionMetersHistory.length; i++) {
          const entry = machine.collectionMetersHistory[i];
          const prevIn = entry.prevIn || 0;
          const prevOut = entry.prevOut || 0;

          if (
            (prevIn === 0 || prevIn === undefined || prevIn === null) &&
            (prevOut === 0 || prevOut === undefined || prevOut === null)
          ) {
            machineHasIssues = true;
            break;
          }
        }

        if (machineHasIssues) {
          machinesWithIssues++;
          console.warn(
            `   🔧 Fixing collectionMetersHistory for machine ${machineId}`
          );

          // Rebuild history with correct prevIn/prevOut
          const newHistory = machineCollections.map(
            (collection, index: number) => {
              let prevIn = 0;
              let prevOut = 0;

              if (index > 0) {
                const previousCollection = machineCollections[index - 1];
                prevIn = previousCollection.metersIn || 0;
                prevOut = previousCollection.metersOut || 0;
              }

              return {
                locationReportId: collection.locationReportId,
                metersIn: collection.metersIn || 0,
                metersOut: collection.metersOut || 0,
                prevIn: prevIn,
                prevOut: prevOut,
                timestamp: new Date(collection.timestamp),
                createdAt: new Date(
                  collection.createdAt || collection.timestamp
                ),
              };
            }
          );

          // Update the machine document
          const mostRecentCollection =
            machineCollections[machineCollections.length - 1];
          console.warn(
            `   🔧 Attempting to update machine ${machineId} with ${newHistory.length} history entries`
          );

          // Use raw MongoDB driver instead of Mongoose to ensure update works
          const mongoose = await import("mongoose");
          const db = mongoose.default.connection.db;
          if (!db) throw new Error("Database connection not available");

          const updateResult = await db
            .collection("machines")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .updateOne({ _id: machineId } as any, {
              $set: {
                collectionMetersHistory: newHistory,
                collectionTime: mostRecentCollection
                  ? new Date(mostRecentCollection.timestamp)
                  : undefined,
                previousCollectionTime:
                  machineCollections.length > 1
                    ? new Date(
                        machineCollections[
                          machineCollections.length - 2
                        ].timestamp
                      )
                    : undefined,
                "collectionMeters.metersIn":
                  mostRecentCollection?.metersIn || 0,
                "collectionMeters.metersOut":
                  mostRecentCollection?.metersOut || 0,
                updatedAt: new Date(),
              },
            });

          console.warn(`   📊 Update result:`, {
            acknowledged: updateResult.acknowledged,
            modifiedCount: updateResult.modifiedCount,
            matchedCount: updateResult.matchedCount,
            machineId: machineId,
            historyEntries: newHistory.length,
          });

          if (updateResult.modifiedCount > 0) {
            machinesFixedCount++;
            totalHistoryRebuilt += newHistory.length;
            console.warn(
              `   ✅ Fixed ${newHistory.length} entries in collectionMetersHistory for machine ${machineId}`
            );
          } else if (updateResult.matchedCount > 0) {
            console.warn(
              `   ⚠️ Machine ${machineId} matched but not modified (data may be identical)`
            );
          } else {
            console.warn(
              `   ❌ Failed to update machine ${machineId} - no documents matched`
            );
          }
        } else {
          console.warn(
            `   ✅ Machine ${machineId} - No collectionMetersHistory issues found`
          );
        }
      } catch (machineError) {
        console.error(
          `   ❌ Error processing machine ${machineId}:`,
          machineError
        );
      }
    }

    console.warn("🎉 Fix Collection History Complete!");
    console.warn(`   Total machines in report: ${machineIds.length}`);
    console.warn(`   Machines with issues: ${machinesWithIssues}`);
    console.warn(`   Machines fixed: ${machinesFixedCount}`);
    console.warn(`   Total history entries rebuilt: ${totalHistoryRebuilt}`);

    return NextResponse.json({
      success: true,
      message: "Collection history fix completed successfully",
      summary: {
        totalMachinesInReport: machineIds.length,
        machinesWithIssues: machinesWithIssues,
        machinesFixed: machinesFixedCount,
        totalHistoryRebuilt: totalHistoryRebuilt,
      },
    });
  } catch (error) {
    console.error("❌ Error in fix-collection-history:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix collection history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
