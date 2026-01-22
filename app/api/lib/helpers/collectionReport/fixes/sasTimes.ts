/**
 * SAS Times Fix Helper
 *
 * This file contains helper functions for fixing SAS time issues in collection reports,
 * including fixing prevIn/prevOut, recalculating movement, and rebuilding machine history.
 */

import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { calculateMovement } from '@/lib/utils/movement';

/**
 * Fixes prevIn/prevOut for a collection by finding the actual previous collection
 *
 * @param collection - The collection to fix
 * @param reportTimestamp - The report timestamp
 * @returns Promise<{ correctPrevIn: number; correctPrevOut: number; wasFixed: boolean }>
 */
async function fixPreviousMeters(
  collection: {
    _id: string;
    machineId?: string;
    prevIn?: number;
    prevOut?: number;
    metersIn?: number;
    metersOut?: number;
  },
  reportTimestamp: Date
): Promise<{
  correctPrevIn: number;
  correctPrevOut: number;
  wasFixed: boolean;
}> {
  const machineId = collection.machineId;
  if (!machineId) {
    return {
      correctPrevIn: collection.prevIn || 0,
      correctPrevOut: collection.prevOut || 0,
      wasFixed: false,
    };
  }

  const previousCollections = await Collections.find({
    machineId,
    timestamp: { $lt: reportTimestamp },
    deletedAt: { $exists: false },
  })
    .sort({ timestamp: -1 })
    .limit(1);

  if (previousCollections && previousCollections.length > 0) {
    const actualPrevCollection = previousCollections[0];
    const actualPrevIn = actualPrevCollection.metersIn || 0;
    const actualPrevOut = actualPrevCollection.metersOut || 0;

    if (
      collection.prevIn !== actualPrevIn ||
      collection.prevOut !== actualPrevOut
    ) {
      return {
        correctPrevIn: actualPrevIn,
        correctPrevOut: actualPrevOut,
        wasFixed: true,
      };
    }
  } else {
    // No previous collection - should be 0
    if (collection.prevIn !== 0 || collection.prevOut !== 0) {
      return {
        correctPrevIn: 0,
        correctPrevOut: 0,
        wasFixed: true,
      };
    }
  }

  return {
    correctPrevIn: collection.prevIn || 0,
    correctPrevOut: collection.prevOut || 0,
    wasFixed: false,
  };
}

/**
 * Recalculates movement for a collection
 *
 * @param collection - The collection
 * @param prevIn - Previous meters in
 * @param prevOut - Previous meters out
 * @returns Recalculated movement
 */
function recalculateCollectionMovement(
  collection: {
    metersIn?: number;
    metersOut?: number;
    ramClear?: boolean;
    ramClearMetersIn?: number;
    ramClearMetersOut?: number;
  },
  prevIn: number,
  prevOut: number
) {
  return calculateMovement(
    collection.metersIn || 0,
    collection.metersOut || 0,
    {
      metersIn: prevIn,
      metersOut: prevOut,
    },
    collection.ramClear,
    undefined, // ramClearCoinIn
    undefined, // ramClearCoinOut
    collection.ramClearMetersIn,
    collection.ramClearMetersOut
  );
}

/**
 * Rebuilds collectionMetersHistory for a machine based on actual collections
 *
 * @param machineId - The machine ID
 * @returns Promise<number> - Number of history entries created
 */
async function rebuildMachineHistory(machineId: string): Promise<number> {
  const machineCollections = await Collections.find({
    machineId,
    deletedAt: { $exists: false },
  }).sort({ timestamp: 1 });

  const newHistory = machineCollections.map((collection, index) => {
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
      prevIn,
      prevOut,
      timestamp: new Date(collection.timestamp),
      createdAt: new Date(collection.createdAt || collection.timestamp),
    };
  });

  const mostRecentCollection =
    machineCollections[machineCollections.length - 1];

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      collectionMetersHistory: newHistory,
      collectionTime:
        machineCollections.length > 0
          ? new Date(
              machineCollections[machineCollections.length - 1].timestamp
            )
          : undefined,
      previousCollectionTime:
        machineCollections.length > 1
          ? new Date(
              machineCollections[machineCollections.length - 2].timestamp
            )
          : undefined,
      'collectionMeters.metersIn': mostRecentCollection?.metersIn || 0,
      'collectionMeters.metersOut': mostRecentCollection?.metersOut || 0,
    }
  );

  return newHistory.length;
}

/**
 * Fixes SAS times for a single collection
 *
 * @param collection - The collection to fix
 * @param report - The collection report
 * @returns Promise<{ success: boolean; error?: string }>
 */
async function fixCollectionSasTimes(
  collection: {
    _id: string;
    machineId?: string;
    timestamp?: Date;
    prevIn?: number;
    prevOut?: number;
    metersIn?: number;
    metersOut?: number;
    movement?: { metersIn: number; metersOut: number; gross: number };
    ramClear?: boolean;
    ramClearMetersIn?: number;
    ramClearMetersOut?: number;
    sasMeters?: {
      machine?: string;
      sasStartTime?: string;
      sasEndTime?: string;
    };
    machineName?: string;
  },
  report: { locationReportId: string; timestamp: Date }
): Promise<{ success: boolean; error?: string }> {
  const machineId = collection.machineId;
  if (!machineId) return { success: false, error: 'No machine ID' };
  
  try {
    // Fix prevIn/prevOut
    const {
      correctPrevIn,
      correctPrevOut,
      wasFixed: prevFixed,
    } = await fixPreviousMeters(collection, report.timestamp);

    // Recalculate movement if prevIn/prevOut changed
    let updatedMovement = collection.movement;
    if (prevFixed) {
      updatedMovement = recalculateCollectionMovement(
        collection,
        correctPrevIn,
        correctPrevOut
      );
    }

    // Recalculate SAS time range
    const { getSasTimePeriod, calculateSasMetrics } = await import(
      '../creation'
    );

    const { sasStartTime, sasEndTime } = await getSasTimePeriod(
      machineId,
      undefined, // customStartTime
      new Date(collection.timestamp || report.timestamp) // customEndTime
    );

    // Validate SAS time range
    if (sasStartTime >= sasEndTime) {
      return {
        success: false,
        error: `Invalid SAS time range: start >= end`,
      };
    }

    // Recalculate SAS metrics
    const newSasMetrics = await calculateSasMetrics(
      machineId,
      sasStartTime,
      sasEndTime
    );

    // Update collection document
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    await Collections.findOneAndUpdate(
      { _id: collection._id },
      {
        prevIn: correctPrevIn,
        prevOut: correctPrevOut,
        movement: updatedMovement,
        sasMeters: {
          ...newSasMetrics,
          machine:
            collection.sasMeters?.machine || collection.machineName || '',
          sasStartTime: sasStartTime.toISOString(),
          sasEndTime: sasEndTime.toISOString(),
        },
        updatedAt: new Date(),
      }
    );

    // Update machine collectionMetersHistory
    try {
      await Machine.findOneAndUpdate(
        {
          _id: machineId,
          'collectionMetersHistory.locationReportId': report.locationReportId,
        },
        {
          $set: {
            'collectionMetersHistory.$[elem].metersIn':
              collection.metersIn || 0,
            'collectionMetersHistory.$[elem].metersOut':
              collection.metersOut || 0,
            'collectionMetersHistory.$[elem].timestamp': new Date(
              collection.timestamp || report.timestamp
            ),
          },
        },
        {
          arrayFilters: [{ 'elem.locationReportId': report.locationReportId }],
          new: true,
        }
      );
    } catch (machineUpdateError) {
      console.error(
        `Failed to update machine history for machine ${machineId}:`,
        machineUpdateError
      );
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Processes all reports chronologically to fix SAS times
 *
 * @param reportId - The starting report ID
 * @returns Promise<FixSasTimesResult>
 */
export async function fixSasTimesForReport(reportId: string): Promise<{
  success: boolean;
  totalFixedCount: number;
  totalSkippedCount: number;
  totalHistoryFixedCount: number;
  errors: string[];
  processedReports: string[];
  futureReportsAffected: number;
  error?: string;
}> {
  // Find current collection report
  const currentReport = await CollectionReport.findOne({
    locationReportId: reportId,
  });

  if (!currentReport) {
    return {
      success: false,
      totalFixedCount: 0,
      totalSkippedCount: 0,
      totalHistoryFixedCount: 0,
      errors: [],
      processedReports: [],
      futureReportsAffected: 0,
      error: 'Collection report not found',
    };
  }

  // Find all future reports after current report's timestamp
  const futureReports = await CollectionReport.find({
    timestamp: { $gt: currentReport.timestamp },
  }).sort({ timestamp: 1 });

  const allReportsToProcess = [currentReport, ...futureReports];

  let totalFixedCount = 0;
  let totalSkippedCount = 0;
  let totalHistoryFixedCount = 0;
  const allErrors: string[] = [];
  const processedReports: string[] = [];

  // Process reports chronologically
  for (const report of allReportsToProcess) {
    const reportCollections = await Collections.find({
      locationReportId: report.locationReportId,
    });

    if (reportCollections.length === 0) {
      continue;
    }

    let reportFixedCount = 0;
    let reportSkippedCount = 0;
    const reportErrors: string[] = [];

    // Process each collection in this report
    for (const collection of reportCollections) {
      if (!collection.machineId) {
        reportSkippedCount++;
        reportErrors.push(`Collection ${collection._id}: No machine ID`);
        continue;
      }

      const result = await fixCollectionSasTimes(collection, report);

      if (result.success) {
        reportFixedCount++;
      } else {
        reportSkippedCount++;
        reportErrors.push(
          `Collection ${collection._id}: ${result.error || 'Unknown error'}`
        );
      }
    }

    // Rebuild collectionMetersHistory for all machines in this report
    let reportHistoryFixedCount = 0;
    try {
      const machineIds = [
        ...new Set(reportCollections.map(c => c.machineId).filter(Boolean)),
      ];

      for (const machineId of machineIds) {
        const historyCount = await rebuildMachineHistory(machineId);
        reportHistoryFixedCount += historyCount;
      }
    } catch (historyError) {
      reportErrors.push(
        `History rebuild failed: ${
          historyError instanceof Error ? historyError.message : 'Unknown error'
        }`
      );
    }

    totalFixedCount += reportFixedCount;
    totalSkippedCount += reportSkippedCount;
    totalHistoryFixedCount += reportHistoryFixedCount;
    allErrors.push(...reportErrors);
    processedReports.push(report.locationReportId);
  }

  return {
    success: true,
    totalFixedCount,
    totalSkippedCount,
    totalHistoryFixedCount,
    errors: allErrors,
    processedReports,
    futureReportsAffected: futureReports.length,
  };
}

/**
 * Checks if a machine has collection history issues
 *
 * @param machine - The machine document
 * @returns boolean indicating if machine has issues
 */
function hasCollectionHistoryIssues(machine: {
  collectionMetersHistory?: Array<{
    prevIn?: number;
    prevOut?: number;
  }>;
}): boolean {
  if (
    !machine.collectionMetersHistory ||
    machine.collectionMetersHistory.length === 0
  ) {
    return false;
  }

  // Check if any entry (except first) has prevIn/prevOut as 0 or undefined
  for (let i = 1; i < machine.collectionMetersHistory.length; i++) {
    const entry = machine.collectionMetersHistory[i];
    const prevIn = entry.prevIn || 0;
    const prevOut = entry.prevOut || 0;

    if (
      (prevIn === 0 || prevIn === undefined || prevIn === null) &&
      (prevOut === 0 || prevOut === undefined || prevOut === null)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Fixes collection history for a specific report
 *
 * @param reportId - The report ID
 * @returns Promise<FixCollectionHistoryResult>
 */
export async function fixCollectionHistoryForReport(reportId: string): Promise<{
  success: boolean;
  totalHistoryRebuilt: number;
  machinesFixedCount: number;
  machinesWithIssues: number;
  totalMachinesInReport: number;
  error?: string;
}> {
  const report = await CollectionReport.findOne({
    locationReportId: reportId,
  });

  if (!report) {
    return {
      success: false,
      totalHistoryRebuilt: 0,
      machinesFixedCount: 0,
      machinesWithIssues: 0,
      totalMachinesInReport: 0,
      error: 'Report not found',
    };
  }

  const reportCollections = await Collections.find({
    locationReportId: reportId,
  });

  if (reportCollections.length === 0) {
    return {
      success: false,
      totalHistoryRebuilt: 0,
      machinesFixedCount: 0,
      machinesWithIssues: 0,
      totalMachinesInReport: 0,
      error: 'No collections found for this report',
    };
  }

  const machineIds = [
    ...new Set(reportCollections.map(c => c.machineId).filter(Boolean)),
  ];

  let totalHistoryRebuilt = 0;
  let machinesFixedCount = 0;
  let machinesWithIssues = 0;

  for (const machineId of machineIds) {
    if (!machineId) continue;

    try {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const machine = await Machine.findOne({ _id: machineId });
      if (!machine) {
        continue;
      }

      // Check if machine has issues
      if (hasCollectionHistoryIssues(machine)) {
        machinesWithIssues++;

        // Rebuild history
        const historyCount = await rebuildMachineHistory(machineId);
        if (historyCount > 0) {
          machinesFixedCount++;
          totalHistoryRebuilt += historyCount;
        }
      }
    } catch (machineError) {
      console.error(`Error processing machine ${machineId}:`, machineError);
    }
  }

  return {
    success: true,
    totalHistoryRebuilt,
    machinesFixedCount,
    machinesWithIssues,
    totalMachinesInReport: machineIds.length,
  };
}
