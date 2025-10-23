import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { Collections } from "../../lib/models/collections";
import { Machine } from "../../lib/models/machines";
import { getUserIdFromServer, getUserById } from "../../lib/helpers/users";

/**
 * Enhanced collection history fix script that:
 * 1. Compares actual collections with collectionMetersHistory
 * 2. Detects duplicates, missing entries, and timestamp mismatches
 * 3. Rebuilds the history to match the actual collection data
 * 4. Removes orphaned history entries
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    console.warn("🔧 Starting enhanced collection history fix process...");

    // Parse request body to get machine ID (optional - if not provided, fix all machines)
    const body = await request.json().catch(() => ({}));
    const targetMachineId = body.machineId || null;

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

    // Get machines to process
    let machinesToProcess: Array<Record<string, unknown>> = [];
    if (targetMachineId) {
      // Process specific machine
      const machine = await Machine.findById(targetMachineId);
      if (machine) {
        machinesToProcess = [machine];
        console.warn(`🎯 Processing specific machine: ${targetMachineId}`);
      } else {
        return NextResponse.json(
          { error: "Machine not found" },
          { status: 404 }
        );
      }
    } else {
      // Process all machines with collection history
      machinesToProcess = await Machine.find({
        collectionMetersHistory: { $exists: true, $ne: [] },
      });
      console.warn(
        `🔍 Found ${machinesToProcess.length} machines with collection history`
      );
    }

    let totalMachinesProcessed = 0;
    let totalMachinesFixed = 0;
    let totalDuplicatesRemoved = 0;
    let totalHistoryEntriesRebuilt = 0;
    const detailedResults: Array<{
      machineId: string;
      machineName: string;
      issues: string[];
      actions: string[];
      duplicatesRemoved: number;
      historyEntriesRebuilt: number;
    }> = [];

    // Process each machine
    for (const machine of machinesToProcess) {
      totalMachinesProcessed++;
      const machineId = String((machine as Record<string, unknown>)._id || "");
      const machineData = machine as Record<string, unknown>;
      const machineName = String(
        machineData.serialNumber ||
          (machineData.custom as Record<string, unknown>)?.name ||
          machineId
      );

      console.warn(`\n🔧 Processing machine: ${machineName} (${machineId})`);

      const issues: string[] = [];
      const actions: string[] = [];
      let duplicatesRemoved = 0;
      let historyEntriesRebuilt = 0;

      try {
        // Get all actual collections for this machine, sorted chronologically
        let actualCollections = await Collections.find({
          machineId: machineId,
          deletedAt: { $exists: false },
        })
          .sort({
            collectionTime: 1,
            timestamp: 1,
          })
          .lean();

        console.warn(
          `   📊 Found ${actualCollections.length} actual collections`
        );

        if (actualCollections.length === 0) {
          console.warn(
            `   ⚠️ No actual collections found - clearing collection history`
          );
          issues.push("No actual collections found");

          // Clear the collection history if no actual collections exist
          await Machine.findByIdAndUpdate(machineId, {
            $unset: { collectionMetersHistory: 1 },
          });

          actions.push("Cleared empty collection history");
          continue;
        }

        // Get current collection history
        const currentHistory =
          (machineData.collectionMetersHistory as Array<
            Record<string, unknown>
          >) || [];
        console.warn(
          `   📋 Current history has ${currentHistory.length} entries`
        );

        // Analyze the history for issues
        const historyAnalysis = analyzeCollectionHistory(
          actualCollections,
          currentHistory
        );

        if (historyAnalysis.hasIssues) {
          issues.push(...historyAnalysis.issues);
          console.warn(
            `   ⚠️ Found issues: ${historyAnalysis.issues.join(", ")}`
          );

          // Check for duplicate collections and remove them first
          const duplicateCollections =
            findDuplicateCollections(actualCollections);
          if (duplicateCollections.length > 0) {
            console.warn(
              `   🗑️ Found ${duplicateCollections.length} duplicate collections to remove`
            );

            // Remove duplicate collections from database
            for (const duplicateGroup of duplicateCollections) {
              const idsToRemove = duplicateGroup.duplicates.map((d) => d._id);
              await Collections.deleteMany({ _id: { $in: idsToRemove } });
              console.warn(
                `   ✅ Removed ${duplicateGroup.duplicates.length} duplicates for timestamp ${duplicateGroup.timestamp}`
              );
            }

            // Refresh actual collections after deduplication
            actualCollections = await Collections.find({
              machineId: machineId,
              deletedAt: { $exists: false },
            })
              .sort({
                collectionTime: 1,
                timestamp: 1,
              })
              .lean();

            actions.push(
              `Removed ${duplicateCollections.reduce(
                (sum, group) => sum + group.duplicates.length,
                0
              )} duplicate collections`
            );
          }

          // Rebuild history from actual collections (now cleaned)
          const newHistory = rebuildHistoryFromCollections(actualCollections);

          // Calculate what was removed
          duplicatesRemoved = currentHistory.length - newHistory.length;
          historyEntriesRebuilt = newHistory.length;

          console.warn(
            `   🔧 Rebuilding history: ${newHistory.length} entries`
          );
          console.warn(
            `   🗑️ Removing ${duplicatesRemoved} duplicate/orphaned entries`
          );

          // Update machine with new history and current collection meters
          const mostRecentCollection =
            actualCollections[actualCollections.length - 1];
          const previousCollection =
            actualCollections.length > 1
              ? actualCollections[actualCollections.length - 2]
              : null;

          // Validate collection meters before update
          const currentMachineState = await Machine.findById(machineId).lean();
          const machineState = currentMachineState as Record<
            string,
            unknown
          > | null;
          const currentCollectionMeters = machineState?.collectionMeters as
            | { metersIn: number; metersOut: number }
            | undefined;

          const expectedMetersIn = mostRecentCollection.metersIn || 0;
          const expectedMetersOut = mostRecentCollection.metersOut || 0;
          const actualMetersIn = currentCollectionMeters?.metersIn || 0;
          const actualMetersOut = currentCollectionMeters?.metersOut || 0;

          if (
            actualMetersIn !== expectedMetersIn ||
            actualMetersOut !== expectedMetersOut
          ) {
            issues.push(
              `Collection meters mismatch: Expected ${expectedMetersIn}/${expectedMetersOut}, Got ${actualMetersIn}/${actualMetersOut}`
            );
            actions.push(
              `Updated collection meters from ${actualMetersIn}/${actualMetersOut} to ${expectedMetersIn}/${expectedMetersOut}`
            );
          }

          await Machine.findByIdAndUpdate(machineId, {
            $set: {
              collectionMetersHistory: newHistory,
              collectionTime:
                mostRecentCollection.collectionTime ||
                mostRecentCollection.timestamp,
              previousCollectionTime: previousCollection
                ? previousCollection.collectionTime ||
                  previousCollection.timestamp
                : undefined,
              "collectionMeters.metersIn": expectedMetersIn,
              "collectionMeters.metersOut": expectedMetersOut,
              updatedAt: new Date(),
            },
          });

          actions.push(
            `Rebuilt ${newHistory.length} history entries from actual collections`
          );
          if (duplicatesRemoved > 0) {
            actions.push(
              `Removed ${duplicatesRemoved} duplicate/orphaned entries`
            );
          }

          totalMachinesFixed++;
          totalDuplicatesRemoved += duplicatesRemoved;
          totalHistoryEntriesRebuilt += historyEntriesRebuilt;
        } else {
          console.warn(`   ✅ No issues found - history is accurate`);
          actions.push("No issues found - history is accurate");
        }

        detailedResults.push({
          machineId,
          machineName,
          issues,
          actions,
          duplicatesRemoved,
          historyEntriesRebuilt,
        });
      } catch (machineError) {
        console.error(
          `   ❌ Error processing machine ${machineId}:`,
          machineError
        );
        detailedResults.push({
          machineId,
          machineName,
          issues: [
            `Error: ${
              machineError instanceof Error
                ? machineError.message
                : "Unknown error"
            }`,
          ],
          actions: [],
          duplicatesRemoved: 0,
          historyEntriesRebuilt: 0,
        });
      }
    }

    console.warn("\n🎉 Enhanced Collection History Fix Complete!");
    console.warn(`   Total machines processed: ${totalMachinesProcessed}`);
    console.warn(`   Machines fixed: ${totalMachinesFixed}`);
    console.warn(`   Total duplicates removed: ${totalDuplicatesRemoved}`);
    console.warn(
      `   Total history entries rebuilt: ${totalHistoryEntriesRebuilt}`
    );

    return NextResponse.json({
      success: true,
      message: "Enhanced collection history fix completed successfully",
      summary: {
        totalMachinesProcessed,
        machinesFixed: totalMachinesFixed,
        totalDuplicatesRemoved,
        totalHistoryEntriesRebuilt,
      },
      detailedResults,
    });
  } catch (error) {
    console.error("❌ Error in enhanced collection history fix:", error);
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

/**
 * Analyzes collection history for issues by comparing with actual collections
 */
function analyzeCollectionHistory(
  actualCollections: Array<Record<string, unknown>>,
  currentHistory: Array<Record<string, unknown>>
): {
  hasIssues: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let hasIssues = false;

  // Check for duplicate timestamps in history
  const timestampCounts = new Map<string, number>();
  currentHistory.forEach((entry) => {
    const timestampValue = entry.timestamp;
    const timestamp = new Date(String(timestampValue)).toISOString();
    timestampCounts.set(timestamp, (timestampCounts.get(timestamp) || 0) + 1);
  });

  const duplicateTimestamps = Array.from(timestampCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([timestamp, _]) => timestamp);

  if (duplicateTimestamps.length > 0) {
    hasIssues = true;
    issues.push(
      `Duplicate timestamps found: ${duplicateTimestamps.length} timestamps have duplicates`
    );
  }

  // Check if history entries match actual collections
  const actualCollectionMap = new Map();
  actualCollections.forEach((collection) => {
    const key = `${collection.locationReportId}_${collection.metersIn}_${collection.metersOut}`;
    actualCollectionMap.set(key, collection);
  });

  const historyMap = new Map();
  currentHistory.forEach((entry) => {
    const key = `${entry.locationReportId}_${entry.metersIn}_${entry.metersOut}`;
    historyMap.set(key, entry);
  });

  // Find orphaned history entries (not in actual collections)
  const orphanedEntries = [];
  for (const [key, historyEntry] of historyMap) {
    if (!actualCollectionMap.has(key)) {
      orphanedEntries.push(historyEntry);
    }
  }

  if (orphanedEntries.length > 0) {
    hasIssues = true;
    issues.push(
      `${orphanedEntries.length} orphaned history entries (not in actual collections)`
    );
  }

  // Find missing history entries (in actual collections but not in history)
  const missingEntries = [];
  for (const [key, collection] of actualCollectionMap) {
    if (!historyMap.has(key)) {
      missingEntries.push(collection);
    }
  }

  if (missingEntries.length > 0) {
    hasIssues = true;
    issues.push(
      `${missingEntries.length} missing history entries (in collections but not in history)`
    );
  }

  // Check chronological order
  const sortedHistory = [...currentHistory].sort(
    (a, b) =>
      new Date(String(a.timestamp)).getTime() -
      new Date(String(b.timestamp)).getTime()
  );

  let isChronologicallyCorrect = true;
  for (let i = 0; i < sortedHistory.length; i++) {
    if (
      JSON.stringify(sortedHistory[i]) !== JSON.stringify(currentHistory[i])
    ) {
      isChronologicallyCorrect = false;
      break;
    }
  }

  if (!isChronologicallyCorrect) {
    hasIssues = true;
    issues.push("History entries are not in chronological order");
  }

  // Check previous meter values accuracy
  let incorrectPrevValues = 0;
  for (let i = 1; i < currentHistory.length; i++) {
    const currentEntry = currentHistory[i];
    const prevEntry = currentHistory[i - 1];

    if (
      currentEntry.prevMetersIn !== prevEntry.metersIn ||
      currentEntry.prevMetersOut !== prevEntry.metersOut
    ) {
      incorrectPrevValues++;
    }
  }

  if (incorrectPrevValues > 0) {
    hasIssues = true;
    issues.push(
      `${incorrectPrevValues} entries with incorrect previous meter values`
    );
  }

  return { hasIssues, issues };
}

/**
 * Finds duplicate collections by timestamp and returns groups of duplicates
 */
function findDuplicateCollections(
  actualCollections: Array<Record<string, unknown>>
): Array<{
  timestamp: string;
  duplicates: Array<Record<string, unknown>>;
  keepEntry: Record<string, unknown>;
}> {
  // Group collections by timestamp
  const timestampGroups: Record<string, Array<Record<string, unknown>>> = {};
  actualCollections.forEach((collection) => {
    const timestampValue = collection.timestamp;
    const timestamp = new Date(String(timestampValue)).toISOString();
    if (!timestampGroups[timestamp]) {
      timestampGroups[timestamp] = [];
    }
    timestampGroups[timestamp].push(collection);
  });

  // Find groups with duplicates
  const duplicateGroups: Array<{
    timestamp: string;
    duplicates: Array<Record<string, unknown>>;
    keepEntry: Record<string, unknown>;
  }> = [];

  Object.keys(timestampGroups).forEach((timestamp) => {
    const entries = timestampGroups[timestamp];
    if (entries.length > 1) {
      // Sort entries by priority:
      // 1. Entries with locationReportId (real collections)
      // 2. Entries with higher meter values (more recent)
      // 3. Entries with earlier creation time
      const sortedEntries = entries.sort((a, b) => {
        // Prefer entries with locationReportId
        const aLocationReportId = String(a.locationReportId || "");
        const bLocationReportId = String(b.locationReportId || "");
        const aHasReport = aLocationReportId && aLocationReportId.trim() !== "";
        const bHasReport = bLocationReportId && bLocationReportId.trim() !== "";

        if (aHasReport && !bHasReport) return -1;
        if (!aHasReport && bHasReport) return 1;

        // If both have or don't have reports, prefer higher meter values
        const aMeterTotal =
          (Number(a.metersIn) || 0) + (Number(a.metersOut) || 0);
        const bMeterTotal =
          (Number(b.metersIn) || 0) + (Number(b.metersOut) || 0);

        if (aMeterTotal !== bMeterTotal) {
          return bMeterTotal - aMeterTotal; // Higher values first
        }

        // If meter totals are the same, sort by creation time (earliest first)
        return (
          new Date(String(a.createdAt || a.timestamp)).getTime() -
          new Date(String(b.createdAt || b.timestamp)).getTime()
        );
      });

      const keepEntry = sortedEntries[0];
      const duplicates = sortedEntries.slice(1);

      duplicateGroups.push({
        timestamp,
        duplicates,
        keepEntry,
      });
    }
  });

  return duplicateGroups;
}

/**
 * Rebuilds collection history from actual collections data
 */
function rebuildHistoryFromCollections(
  actualCollections: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return actualCollections.map((collection, index) => {
    let prevMetersIn = 0;
    let prevMetersOut = 0;

    if (index > 0) {
      const previousCollection = actualCollections[index - 1];
      prevMetersIn = Number(previousCollection.metersIn) || 0;
      prevMetersOut = Number(previousCollection.metersOut) || 0;
    }

    return {
      _id: collection._id, // Use the actual collection ID
      metersIn: collection.metersIn || 0,
      metersOut: collection.metersOut || 0,
      prevMetersIn: prevMetersIn,
      prevMetersOut: prevMetersOut,
      timestamp: collection.collectionTime || collection.timestamp,
      locationReportId: collection.locationReportId || "",
      createdAt: collection.createdAt || collection.timestamp,
    };
  });
}
