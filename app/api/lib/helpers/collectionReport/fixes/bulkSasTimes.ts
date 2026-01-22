/**
 * Bulk SAS Times Fix Helpers
 *
 * This module provides functions for fixing SAS times across all collection reports:
 * - Checking and fixing inverted SAS times
 * - Correcting prevIn/prevOut values
 * - Recalculating movement (including RAM Clear scenarios)
 * - Rebuilding collectionMetersHistory for all affected machines
 *
 * @module app/api/lib/helpers/bulkSasTimesFix
 */

import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { calculateMovement } from '@/lib/utils/movement';

type CollectionDocument = {
  _id: unknown;
  machineId?: string;
  timestamp: Date;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  movement: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  sasMeters?: {
    drop?: number;
    totalCancelledCredits?: number;
    gross?: number;
    gamesPlayed?: number;
    jackpot?: number;
    sasStartTime?: string | Date;
    sasEndTime?: string | Date;
  };
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  createdAt?: Date;
  locationReportId?: string;
  deletedAt?: Date;
};

type ReportDocument = {
  locationReportId: string;
  timestamp: Date;
  locationName?: string;
};

/**
 * Fix SAS times for all collection reports
 *
 * Flow:
 * 1. Get all collection reports sorted by timestamp
 * 2. For each report, find all collections
 * 3. For each collection, check for issues:
 *    - Inverted SAS times
 *    - prevIn/prevOut mismatch
 *    - Movement calculation inaccuracy
 * 4. If issues found, fix them:
 *    - Correct prevIn/prevOut
 *    - Recalculate movement (handle RAM Clear)
 *    - Fix SAS time range
 * 5. Rebuild collectionMetersHistory for all affected machines
 * 6. Return detailed summary of fixes
 *
 * @returns Object containing processing summary and detailed results
 */
export async function fixAllSasTimesData(): Promise<{
  totalReportsProcessed: number;
  totalReportsFixed: number;
  totalCollectionsFixed: number;
  totalHistoryRebuilt: number;
  totalErrors: number;
  fixedReports: string[];
  errors: string[];
}> {
  console.warn(`🔧 Starting bulk SAS time fix for all reports...`);

  // Get all collection reports, sorted by timestamp
  const allReports = (await CollectionReport.find({})
    .sort({ timestamp: 1 })
    .lean()) as ReportDocument[];

  console.warn(`📋 Found ${allReports.length} collection reports to process`);

  let totalReportsProcessed = 0;
  let totalReportsFixed = 0;
  let totalCollectionsFixed = 0;
  let totalErrors = 0;
  const errors: string[] = [];
  const fixedReports: string[] = [];

  // Process each report
  for (const report of allReports) {
    try {
      console.warn(`\n🔍 Processing report: ${report.locationReportId}`);
      console.warn(`   Date: ${new Date(report.timestamp).toLocaleString()}`);
      console.warn(`   Location: ${report.locationName || 'Unknown'}`);

      // Find all collections for this report
      const collections = (await Collections.find({
        locationReportId: report.locationReportId,
      })) as CollectionDocument[];

      if (collections.length === 0) {
        console.warn(`   ⚠️  No collections found for this report`);
        continue;
      }

      console.warn(`   📦 Found ${collections.length} collections`);

      let reportHasIssues = false;
      let collectionsFixedInReport = 0;

      // Process each collection in this report
      for (const collection of collections) {
        try {
          const machineId = collection.machineId;
          if (!machineId) continue;

          // Check if this collection has issues
          const issueCheckResult = await checkCollectionIssues(
            collection,
            machineId,
            report
          );

          if (issueCheckResult.hasIssues) {
            reportHasIssues = true;

            // Fix the collection
            await fixCollection(collection, machineId, report);

            collectionsFixedInReport++;
            console.warn(
              `      ✅ Fixed issues in collection ${collection._id}`
            );
          }
        } catch (collectionError) {
          console.error(
            `      ❌ Error fixing collection ${collection._id}:`,
            collectionError
          );
          totalErrors++;
          errors.push(
            `Collection ${collection._id}: ${
              collectionError instanceof Error
                ? collectionError.message
                : 'Unknown error'
            }`
          );
        }
      }

      if (reportHasIssues && collectionsFixedInReport > 0) {
        totalReportsFixed++;
        totalCollectionsFixed += collectionsFixedInReport;
        fixedReports.push(report.locationReportId);
        console.warn(
          `   ✅ Fixed ${collectionsFixedInReport} collections in report ${report.locationReportId}`
        );
      } else if (reportHasIssues) {
        console.warn(
          `   ⚠️  Report ${report.locationReportId} had issues but couldn't be fixed`
        );
      } else {
        console.warn(`   ✅ Report ${report.locationReportId} has no issues`);
      }

      totalReportsProcessed++;
    } catch (reportError) {
      console.error(
        `❌ Error processing report ${report.locationReportId}:`,
        reportError
      );
      totalErrors++;
      errors.push(
        `Report ${report.locationReportId}: ${
          reportError instanceof Error ? reportError.message : 'Unknown error'
        }`
      );
    }
  }

  // Rebuild collectionMetersHistory for all machines
  console.warn(`\n🔄 Rebuilding collectionMetersHistory for all machines...`);
  const totalHistoryRebuilt = await rebuildAllMachineHistories(allReports);

  // Final summary
  console.warn(`\n🎉 BULK FIX COMPLETED:`);
  console.warn(`   📊 Total reports processed: ${totalReportsProcessed}`);
  console.warn(`   🔧 Reports fixed: ${totalReportsFixed}`);
  console.warn(`   📦 Collections fixed: ${totalCollectionsFixed}`);
  console.warn(`   ❌ Errors: ${totalErrors}`);

  if (fixedReports.length > 0) {
    console.warn(`   📋 Fixed reports: ${fixedReports.join(', ')}`);
  }

  return {
    totalReportsProcessed,
    totalReportsFixed,
    totalCollectionsFixed,
    totalHistoryRebuilt,
    totalErrors,
    fixedReports,
    errors,
  };
}

/**
 * Check collection for issues (inverted SAS times, prevIn/prevOut mismatch, movement calculation)
 *
 * @param collection - Collection document to check
 * @param machineId - Machine ID for the collection
 * @param report - Parent report document
 * @returns Object with hasIssues flag and issue details
 */
async function checkCollectionIssues(
  collection: CollectionDocument,
  machineId: string,
  report: ReportDocument
): Promise<{
  hasIssues: boolean;
  hasInvertedSasTimes: boolean;
  hasPrevMismatch: boolean;
  hasMovementMismatch: boolean;
}> {
  let hasIssues = false;
  let hasInvertedSasTimes = false;
  let hasPrevMismatch = false;
  let hasMovementMismatch = false;

  // Check 1: Inverted SAS times
  if (
    collection.sasMeters?.sasStartTime &&
    collection.sasMeters?.sasEndTime
  ) {
    const sasStartTime = new Date(collection.sasMeters.sasStartTime);
    const sasEndTime = new Date(collection.sasMeters.sasEndTime);

    if (sasStartTime >= sasEndTime) {
      hasIssues = true;
      hasInvertedSasTimes = true;
      console.warn(
        `      ❌ Collection ${collection._id} has inverted SAS times`
      );
    }
  }

  // Check 2: prevIn/prevOut mismatch
  if (
    collection.prevIn !== undefined &&
    collection.prevOut !== undefined
  ) {
    const previousCollections = (await Collections.find({
      machineId: machineId,
      timestamp: { $lt: new Date(report.timestamp) },
      deletedAt: { $exists: false },
    })
      .sort({ timestamp: -1 })
      .limit(1)) as CollectionDocument[];

    if (previousCollections.length > 0) {
      const actualPrevCollection = previousCollections[0];
      const actualPrevIn = actualPrevCollection.metersIn || 0;
      const actualPrevOut = actualPrevCollection.metersOut || 0;

      if (
        collection.prevIn !== actualPrevIn ||
        collection.prevOut !== actualPrevOut
      ) {
        hasIssues = true;
        hasPrevMismatch = true;
        console.warn(
          `      ❌ Collection ${collection._id} has prevIn/prevOut mismatch`
        );
      }
    }
  }

  // Check 3: Movement calculation accuracy (handle RAM Clear)
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

  const expectedGross = expectedMetersInMovement - expectedMetersOutMovement;

  if (
    Math.abs(collection.movement.metersIn - expectedMetersInMovement) > 0.01 ||
    Math.abs(collection.movement.metersOut - expectedMetersOutMovement) >
      0.01 ||
    Math.abs(collection.movement.gross - expectedGross) > 0.01
  ) {
    hasIssues = true;
    hasMovementMismatch = true;
    console.warn(
      `      ❌ Collection ${collection._id} has movement calculation mismatch`
    );
  }

  return {
    hasIssues,
    hasInvertedSasTimes,
    hasPrevMismatch,
    hasMovementMismatch,
  };
}

/**
 * Fix collection issues (prevIn/prevOut, movement, SAS times)
 *
 * @param collection - Collection document to fix
 * @param machineId - Machine ID for the collection
 * @param report - Parent report document
 */
async function fixCollection(
  collection: CollectionDocument,
  machineId: string,
  report: ReportDocument
): Promise<void> {
  console.warn(`      🔧 Fixing collection ${collection._id}...`);

  // Step 1: Fix prevIn/prevOut
  const { correctPrevIn, correctPrevOut } = await fixPrevInOut(
    collection,
    machineId,
    report
  );

  // Step 2: Recalculate movement
  const updatedMovement = await recalculateMovement(
    collection,
    correctPrevIn,
    correctPrevOut
  );

  // Step 3: Fix SAS time range
  const { sasStartTime, sasEndTime } = await fixSasTimes(
    collection,
    machineId
  );

  const newSasMetrics = {
    ...collection.sasMeters,
    drop: updatedMovement?.metersIn || 0,
    totalCancelledCredits: updatedMovement?.metersOut || 0,
    gross: updatedMovement?.gross || 0,
    gamesPlayed: collection.sasMeters?.gamesPlayed || 0,
    jackpot: collection.sasMeters?.jackpot || 0,
    sasStartTime: sasStartTime.toISOString(),
    sasEndTime: sasEndTime.toISOString(),
  };

  // Update the collection
  console.warn(`      🔧 Updating collection ${collection._id} with:`, {
    prevIn: correctPrevIn,
    prevOut: correctPrevOut,
    movement: updatedMovement,
    sasMeters: newSasMetrics,
  });

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Collections.findOneAndUpdate({ _id: collection._id }, {
    prevIn: correctPrevIn,
    prevOut: correctPrevOut,
    movement: updatedMovement,
    sasMeters: newSasMetrics,
    updatedAt: new Date(),
  });
}

/**
 * Fix prevIn/prevOut values by finding the actual previous collection
 *
 * @param collection - Collection document
 * @param machineId - Machine ID
 * @param report - Parent report document
 * @returns Object with correct prevIn and prevOut values
 */
async function fixPrevInOut(
  collection: CollectionDocument,
  machineId: string,
  report: ReportDocument
): Promise<{ correctPrevIn: number; correctPrevOut: number }> {
  let correctPrevIn = collection.prevIn;
  let correctPrevOut = collection.prevOut;

  const previousCollections = (await Collections.find({
    machineId: machineId,
    timestamp: { $lt: new Date(report.timestamp) },
    deletedAt: { $exists: false },
  })
    .sort({ timestamp: -1 })
    .limit(1)) as CollectionDocument[];

  if (previousCollections.length > 0) {
    const actualPrevCollection = previousCollections[0];
    const actualPrevIn = actualPrevCollection.metersIn || 0;
    const actualPrevOut = actualPrevCollection.metersOut || 0;

    if (
      collection.prevIn !== actualPrevIn ||
      collection.prevOut !== actualPrevOut
    ) {
      correctPrevIn = actualPrevIn;
      correctPrevOut = actualPrevOut;
    }
  } else {
    // Only set to 0 if it's not a RAM Clear scenario
    if (
      !collection.ramClear &&
      (collection.prevIn !== 0 || collection.prevOut !== 0)
    ) {
      correctPrevIn = 0;
      correctPrevOut = 0;
    }
  }

  return { correctPrevIn, correctPrevOut };
}

/**
 * Recalculate movement using the correct prevIn/prevOut values
 *
 * @param collection - Collection document
 * @param correctPrevIn - Correct previous metersIn value
 * @param correctPrevOut - Correct previous metersOut value
 * @returns Recalculated movement object
 */
async function recalculateMovement(
  collection: CollectionDocument,
  correctPrevIn: number,
  correctPrevOut: number
): Promise<{ metersIn: number; metersOut: number; gross: number }> {
  console.warn(`      🔧 Recalculating movement for ${collection._id}...`);

  try {
    console.warn(`      📊 Movement calculation inputs:`, {
      metersIn: collection.metersIn || 0,
      metersOut: collection.metersOut || 0,
      prevIn: correctPrevIn,
      prevOut: correctPrevOut,
      ramClear: collection.ramClear,
    });

    const updatedMovement = calculateMovement(
      collection.metersIn || 0,
      collection.metersOut || 0,
      {
        metersIn: correctPrevIn,
        metersOut: correctPrevOut,
      },
      collection.ramClear,
      undefined, // ramClearCoinIn
      undefined, // ramClearCoinOut
      collection.ramClearMetersIn,
      collection.ramClearMetersOut
    );

    console.warn(`      📊 Movement calculation result:`, {
      metersIn: updatedMovement.metersIn,
      metersOut: updatedMovement.metersOut,
      gross: updatedMovement.gross,
    });

    return updatedMovement;
  } catch (calcError) {
    console.error(
      `      ❌ Error calculating movement for ${collection._id}:`,
      calcError
    );
    // Return original movement if calculation fails
    return collection.movement;
  }
}

/**
 * Fix SAS time range based on previous collection timestamp
 *
 * @param collection - Collection document
 * @param machineId - Machine ID
 * @returns Object with corrected sasStartTime and sasEndTime
 */
async function fixSasTimes(
  collection: CollectionDocument,
  machineId: string
): Promise<{ sasStartTime: Date; sasEndTime: Date }> {
  let sasStartTime = new Date(collection.timestamp);
  const sasEndTime = new Date(collection.timestamp);

  const previousCollections = (await Collections.find({
    machineId: machineId,
    timestamp: { $lt: new Date(collection.timestamp) },
    deletedAt: { $exists: false },
  })
    .sort({ timestamp: -1 })
    .limit(1)) as CollectionDocument[];

  if (previousCollections.length > 0) {
    sasStartTime = new Date(previousCollections[0].timestamp);
  } else {
    // If no previous collection, start from 24 hours before collection time
    sasStartTime = new Date(
      collection.timestamp.getTime() - 24 * 60 * 60 * 1000
    );
  }

  return { sasStartTime, sasEndTime };
}

/**
 * Rebuild collectionMetersHistory for all machines affected by the reports
 *
 * @param allReports - All collection reports processed
 * @returns Total number of history entries rebuilt
 */
async function rebuildAllMachineHistories(
  allReports: ReportDocument[]
): Promise<number> {
  let totalHistoryRebuilt = 0;

  try {
    // Get all unique machine IDs from all processed reports
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

    for (const machineId of allMachineIds) {
      try {
        // Rebuild history based on actual collections for this machine
        const machineCollections = (await Collections.find({
          machineId: machineId,
          deletedAt: { $exists: false },
        }).sort({ timestamp: 1 })) as CollectionDocument[];

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
            prevIn: prevIn,
            prevOut: prevOut,
            timestamp: new Date(collection.timestamp),
            createdAt: new Date(collection.createdAt || collection.timestamp),
          };
        });

        // Update machine with rebuilt history
        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        await Machine.findOneAndUpdate({ _id: machineId }, {
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
          // Sync collectionMeters with most recent collection
          'collectionMeters.metersIn':
            machineCollections.length > 0
              ? machineCollections[machineCollections.length - 1].metersIn || 0
              : 0,
          'collectionMeters.metersOut':
            machineCollections.length > 0
              ? machineCollections[machineCollections.length - 1].metersOut ||
                0
              : 0,
        });

        totalHistoryRebuilt += newHistory.length;
        console.warn(
          `    ✅ Rebuilt history for machine ${machineId}: ${newHistory.length} entries`
        );
      } catch (machineError) {
        console.error(
          `    ❌ Error rebuilding history for machine ${machineId}:`,
          machineError
        );
      }
    }

    console.warn(
      `    🎉 Total collectionMetersHistory entries rebuilt: ${totalHistoryRebuilt}`
    );
  } catch (historyError) {
    console.error(`❌ Error rebuilding collectionMetersHistory:`, historyError);
  }

  return totalHistoryRebuilt;
}




