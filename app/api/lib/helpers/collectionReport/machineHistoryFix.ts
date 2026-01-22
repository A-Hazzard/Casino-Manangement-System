/**
 * Machine Collection History Fix Helpers
 *
 * This module provides functions for fixing machine collection history issues:
 * - Analyzing collection history for duplicates, missing entries, and timestamp mismatches
 * - Finding and removing duplicate collections
 * - Rebuilding collection history from actual collections
 *
 * @module app/api/lib/helpers/machineCollectionHistoryFix
 */

import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';

type CollectionRecord = Record<string, unknown>;
type HistoryEntry = Record<string, unknown>;

/**
 * Enhanced collection history fix for a given machine or all machines
 *
 * Flow:
 * 1. Get machines to process (specific machine or all machines with history)
 * 2. For each machine, fetch actual collections and current history
 * 3. Analyze history for issues (duplicates, missing entries, timestamp mismatches)
 * 4. Remove duplicate collections from database if found
 * 5. Rebuild history from cleaned actual collections
 * 6. Update machine with new history and corrected collection meters
 * 7. Return detailed results for each machine processed
 *
 * @param targetMachineId - Optional machine ID to fix specific machine
 * @returns Object containing processing summary and detailed results
 */
export async function fixMachineCollectionHistory(
  targetMachineId?: string | null
): Promise<{
  totalMachinesProcessed: number;
  machinesFixed: number;
  totalDuplicatesRemoved: number;
  totalHistoryEntriesRebuilt: number;
  detailedResults: Array<{
    machineId: string;
    machineName: string;
    issues: string[];
    actions: string[];
    duplicatesRemoved: number;
    historyEntriesRebuilt: number;
  }>;
}> {
  console.warn('🔧 Starting enhanced collection history fix process...');

  // Get machines to process
  let machinesToProcess: Array<CollectionRecord> = [];
  if (targetMachineId) {
    // Process specific machine
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const machine = await Machine.findOne({ _id: targetMachineId });
    if (machine) {
      machinesToProcess = [machine];
      console.warn(`🎯 Processing specific machine: ${targetMachineId}`);
    } else {
      throw new Error('Machine not found');
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
    const machineId = String((machine as CollectionRecord)._id || '');
    const machineData = machine as CollectionRecord;
    const machineName = String(
      machineData.serialNumber ||
        (machineData.custom as CollectionRecord)?.name ||
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
        issues.push('No actual collections found');

        // Clear the collection history if no actual collections exist
        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        await Machine.findOneAndUpdate({ _id: machineId }, {
          $unset: { collectionMetersHistory: 1 },
        });

        actions.push('Cleared empty collection history');
        detailedResults.push({
          machineId,
          machineName,
          issues,
          actions,
          duplicatesRemoved: 0,
          historyEntriesRebuilt: 0,
        });
        continue;
      }

      // Get current collection history
      const currentHistory =
        (machineData.collectionMetersHistory as Array<HistoryEntry>) || [];
      console.warn(`   📋 Current history has ${currentHistory.length} entries`);

      // Analyze the history for issues
      const historyAnalysis = analyzeCollectionHistory(
        actualCollections,
        currentHistory
      );

      if (historyAnalysis.hasIssues) {
        issues.push(...historyAnalysis.issues);
        console.warn(
          `   ⚠️ Found issues: ${historyAnalysis.issues.join(', ')}`
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
            const idsToRemove = duplicateGroup.duplicates.map(d => d._id);
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

        console.warn(`   🔧 Rebuilding history: ${newHistory.length} entries`);
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
        // CRITICAL: Use findOne with _id instead of findById (repo rule)
        const currentMachineState = await Machine.findOne({ _id: machineId }).lean();
        const machineState = currentMachineState as CollectionRecord | null;
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

        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        await Machine.findOneAndUpdate({ _id: machineId }, {
          $set: {
            collectionMetersHistory: newHistory,
            collectionTime:
              mostRecentCollection.collectionTime ||
              mostRecentCollection.timestamp,
            previousCollectionTime: previousCollection
              ? previousCollection.collectionTime ||
                previousCollection.timestamp
              : undefined,
            'collectionMeters.metersIn': expectedMetersIn,
            'collectionMeters.metersOut': expectedMetersOut,
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
        actions.push('No issues found - history is accurate');
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
              : 'Unknown error'
          }`,
        ],
        actions: [],
        duplicatesRemoved: 0,
        historyEntriesRebuilt: 0,
      });
    }
  }

  console.warn('\n🎉 Enhanced Collection History Fix Complete!');
  console.warn(`   Total machines processed: ${totalMachinesProcessed}`);
  console.warn(`   Machines fixed: ${totalMachinesFixed}`);
  console.warn(`   Total duplicates removed: ${totalDuplicatesRemoved}`);
  console.warn(
    `   Total history entries rebuilt: ${totalHistoryEntriesRebuilt}`
  );

  return {
    totalMachinesProcessed,
    machinesFixed: totalMachinesFixed,
    totalDuplicatesRemoved,
    totalHistoryEntriesRebuilt,
    detailedResults,
  };
}

/**
 * Analyzes collection history for issues by comparing with actual collections
 *
 * Checks for:
 * - Duplicate timestamps in history
 * - Orphaned history entries (not in actual collections)
 * - Missing history entries (in collections but not in history)
 * - Chronological order issues
 * - Incorrect previous meter values
 *
 * @param actualCollections - Array of actual collection documents
 * @param currentHistory - Current collection history entries
 * @returns Object with hasIssues flag and array of issue descriptions
 */
function analyzeCollectionHistory(
  actualCollections: Array<CollectionRecord>,
  currentHistory: Array<HistoryEntry>
): {
  hasIssues: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let hasIssues = false;

  // Check for duplicate timestamps in history
  const timestampCounts = new Map<string, number>();
  currentHistory.forEach(entry => {
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
  actualCollections.forEach(collection => {
    const key = `${collection.locationReportId}_${collection.metersIn}_${collection.metersOut}`;
    actualCollectionMap.set(key, collection);
  });

  const historyMap = new Map();
  currentHistory.forEach(entry => {
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
    issues.push('History entries are not in chronological order');
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
 *
 * Strategy:
 * - Group collections by timestamp
 * - For each group with duplicates, determine which entry to keep:
 *   1. Prefer entries with locationReportId (real collections)
 *   2. Prefer entries with higher meter values (more recent)
 *   3. Prefer entries with earlier creation time
 * - Return groups of duplicates to remove
 *
 * @param actualCollections - Array of actual collection documents
 * @returns Array of duplicate groups with timestamp, duplicates to remove, and entry to keep
 */
function findDuplicateCollections(
  actualCollections: Array<CollectionRecord>
): Array<{
  timestamp: string;
  duplicates: Array<CollectionRecord>;
  keepEntry: CollectionRecord;
}> {
  // Group collections by timestamp
  const timestampGroups: Record<string, Array<CollectionRecord>> = {};
  actualCollections.forEach(collection => {
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
    duplicates: Array<CollectionRecord>;
    keepEntry: CollectionRecord;
  }> = [];

  Object.keys(timestampGroups).forEach(timestamp => {
    const entries = timestampGroups[timestamp];
    if (entries.length > 1) {
      // Sort entries by priority:
      // 1. Entries with locationReportId (real collections)
      // 2. Entries with higher meter values (more recent)
      // 3. Entries with earlier creation time
      const sortedEntries = entries.sort((a, b) => {
        // Prefer entries with locationReportId
        const aLocationReportId = String(a.locationReportId || '');
        const bLocationReportId = String(b.locationReportId || '');
        const aHasReport = aLocationReportId && aLocationReportId.trim() !== '';
        const bHasReport = bLocationReportId && bLocationReportId.trim() !== '';

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
 *
 * Creates history entries with correct previous meter values by:
 * - Sorting collections chronologically
 * - For each collection, calculating prevIn/prevOut from the previous collection
 * - First collection has prevIn/prevOut of 0
 *
 * @param actualCollections - Array of actual collection documents (already sorted chronologically)
 * @returns Array of history entries with correct previous meter values
 */
function rebuildHistoryFromCollections(
  actualCollections: Array<CollectionRecord>
): Array<HistoryEntry> {
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
      locationReportId: collection.locationReportId || '',
      createdAt: collection.createdAt || collection.timestamp,
    };
  });
}


