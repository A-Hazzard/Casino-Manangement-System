/**
 * Bulk Collection History Fix Helpers
 *
 * This module provides functions for fixing collectionMetersHistory issues across all machines:
 * - Checking for prevIn/prevOut issues (entries with 0 or undefined values)
 * - Rebuilding history from actual collections
 * - Batch processing all machines from all reports
 *
 * @module app/api/lib/helpers/bulkCollectionHistoryFix
 */

import mongoose from 'mongoose';
import { Collections } from '../models/collections';
import { CollectionReport } from '../models/collectionReport';
import { Machine } from '../models/machines';

type CollectionDocument = {
  _id: unknown;
  machineId?: string;
  locationReportId?: string;
  timestamp: Date;
  metersIn: number;
  metersOut: number;
  createdAt?: Date;
  deletedAt?: Date;
};

type MachineDocument = {
  _id: string;
  collectionMetersHistory?: Array<{
    prevMetersIn?: number;
    prevMetersOut?: number;
  }>;
};

/**
 * Fix all collection history issues across all collection reports
 *
 * Flow:
 * 1. Get all collection reports
 * 2. Extract all unique machine IDs from all collections
 * 3. For each machine:
 *    - Check if collectionMetersHistory has issues (0/undefined prevIn/prevOut)
 *    - Rebuild history from actual collections with correct prevIn/prevOut
 *    - Update machine document with new history and collection times
 * 4. Return detailed summary of fixes
 *
 * @returns Object containing processing summary
 */
export async function fixAllCollectionHistoryData(): Promise<{
  totalHistoryRebuilt: number;
  machinesFixedCount: number;
  reportsProcessed: number;
  totalMachines: number;
  errors: Array<{ machineId: string; error: string }>;
}> {
  console.warn('🔧 Starting fix-all-collection-history process...');

  // Get all collection reports, sorted chronologically
  const allReports = await CollectionReport.find({})
    .sort({ timestamp: 1 })
    .lean();

  console.warn(`📊 Found ${allReports.length} collection reports to process`);

  let totalHistoryRebuilt = 0;
  let machinesFixedCount = 0;
  const reportsProcessed = allReports.length;
  const errors: Array<{ machineId: string; error: string }> = [];

  // Get all unique machine IDs from all reports
  const allMachineIds = new Set<string>();
  for (const report of allReports) {
    const reportCollections = (await Collections.find({
      locationReportId: report.locationReportId,
    })) as CollectionDocument[];
    reportCollections.forEach(collection => {
      if (collection.machineId) {
        allMachineIds.add(collection.machineId);
      }
    });
  }

  console.warn(`🔍 Found ${allMachineIds.size} unique machines to process`);

  // Process each machine individually
  for (const machineId of allMachineIds) {
    try {
      console.warn(`🔧 Processing machine: ${machineId}`);

      // Get all collections for this machine, sorted by timestamp
      const machineCollections = (await Collections.find({
        machineId: machineId,
        deletedAt: { $exists: false },
      })
        .sort({ timestamp: 1 })
        .lean()) as CollectionDocument[];

      if (machineCollections.length === 0) {
        console.warn(`   ⚠️ No collections found for machine ${machineId}`);
        continue;
      }

      console.warn(
        `   📊 Found ${machineCollections.length} collections for machine ${machineId}`
      );

      // Check if this machine actually has collectionMetersHistory issues
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const machine = (await Machine.findOne({ _id: machineId })) as
        | MachineDocument
        | null;
      if (
        !machine ||
        !machine.collectionMetersHistory ||
        machine.collectionMetersHistory.length === 0
      ) {
        console.warn(
          `   ⚠️ Machine ${machineId} has no collectionMetersHistory`
        );
        continue;
      }

      // Check if machine has issues
      const machineHasIssues = checkMachineHistoryForIssues(machine);

      if (!machineHasIssues) {
        console.warn(
          `   ✅ Machine ${machineId} - No collectionMetersHistory issues found`
        );
        continue;
      }

      console.warn(
        `   🔧 Fixing collectionMetersHistory for machine ${machineId}`
      );

      // Rebuild history with correct prevIn/prevOut
      const newHistory = rebuildHistoryForMachine(machineCollections);

      // Update the machine document
      const mostRecentCollection =
        machineCollections[machineCollections.length - 1];

      // Use raw MongoDB driver to ensure update works
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not available');

      const updateResult = await db
        .collection('machines')
        .updateOne({ _id: machineId as unknown as mongoose.Types.ObjectId }, {
          $set: {
            collectionMetersHistory: newHistory,
            collectionTime: mostRecentCollection
              ? new Date(mostRecentCollection.timestamp)
              : undefined,
            previousCollectionTime:
              machineCollections.length > 1
                ? new Date(
                    machineCollections[machineCollections.length - 2].timestamp
                  )
                : undefined,
            'collectionMeters.metersIn': mostRecentCollection?.metersIn || 0,
            'collectionMeters.metersOut': mostRecentCollection?.metersOut || 0,
            updatedAt: new Date(),
          },
        });

      if (updateResult.modifiedCount > 0) {
        machinesFixedCount++;
        totalHistoryRebuilt += newHistory.length;
        console.warn(
          `   ✅ Fixed ${newHistory.length} entries in collectionMetersHistory for machine ${machineId}`
        );
      } else if (updateResult.matchedCount > 0) {
        console.warn(
          `   ⚠️ Machine ${machineId} was matched but no changes were made (history already correct?)`
        );
      } else {
        console.warn(`   ⚠️ Machine ${machineId} was not found in the database`);
      }
    } catch (machineError) {
      console.error(`   ❌ Error processing machine ${machineId}:`, machineError);
      errors.push({
        machineId,
        error:
          machineError instanceof Error
            ? machineError.message
            : 'Unknown error',
      });
    }
  }

  console.warn('\n🎉 FIX ALL COLLECTION HISTORY COMPLETED:');
  console.warn(`   📊 Total reports processed: ${reportsProcessed}`);
  console.warn(`   📊 Total machines processed: ${allMachineIds.size}`);
  console.warn(`   🔧 Machines fixed: ${machinesFixedCount}`);
  console.warn(`   ✅ Total history entries rebuilt: ${totalHistoryRebuilt}`);
  console.warn(`   ❌ Errors: ${errors.length}`);

  return {
    totalHistoryRebuilt,
    machinesFixedCount,
    reportsProcessed,
    totalMachines: allMachineIds.size,
    errors,
  };
}

/**
 * Check if machine collectionMetersHistory has issues
 *
 * Issues include:
 * - Entries with prevMetersIn = 0/undefined/null
 * - Entries with prevMetersOut = 0/undefined/null
 * (except for the first entry, which should have prevIn/prevOut = 0)
 *
 * @param machine - Machine document with collectionMetersHistory
 * @returns True if issues found, false otherwise
 */
function checkMachineHistoryForIssues(machine: MachineDocument): boolean {
  if (!machine.collectionMetersHistory) return false;

  for (let i = 1; i < machine.collectionMetersHistory.length; i++) {
    const entry = machine.collectionMetersHistory[i];
    const prevMetersIn = entry.prevMetersIn || 0;
    const prevMetersOut = entry.prevMetersOut || 0;

    if (
      (prevMetersIn === 0 ||
        prevMetersIn === undefined ||
        prevMetersIn === null) &&
      (prevMetersOut === 0 ||
        prevMetersOut === undefined ||
        prevMetersOut === null)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Rebuild collectionMetersHistory for a machine from its actual collections
 *
 * Creates history entries with correct prevIn/prevOut by:
 * - Sorting collections chronologically
 * - For each collection, calculating prevIn/prevOut from the previous collection
 * - First collection has prevIn/prevOut of 0
 *
 * @param collections - Array of collection documents for the machine (already sorted chronologically)
 * @returns Array of history entries with correct prevIn/prevOut
 */
function rebuildHistoryForMachine(
  collections: CollectionDocument[]
): Array<{
  locationReportId?: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  timestamp: Date;
  createdAt: Date;
}> {
  return collections.map((collection, index) => {
    let prevIn = 0;
    let prevOut = 0;

    if (index > 0) {
      const previousCollection = collections[index - 1];
      prevIn = previousCollection.metersIn || 0;
      prevOut = previousCollection.metersOut || 0;
    }

    return {
      locationReportId: collection.locationReportId,
      metersIn: collection.metersIn || 0,
      metersOut: collection.metersOut || 0,
      prevMetersIn: prevIn,
      prevMetersOut: prevOut,
      timestamp: new Date(collection.timestamp),
      createdAt: new Date(collection.createdAt || collection.timestamp),
    };
  });
}


