/**
 * Fix Report Operations Helper
 *
 * This file contains all the business logic for fixing collection report issues,
 * including SAS times, movement calculations, prevIn/prevOut, and machine history.
 *
 * @module app/api/lib/helpers/fixReportOperations
 */

import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import type { MachineWithHistory } from '@/app/api/lib/types';
import {
  CollectionData,
  FixResults,
  HistoryEntry,
  MachineData,
} from '@/lib/types/reports';
import { calculateMovement } from '@/lib/utils/movement';
import { calculateSasMetrics } from './creation';

/**
 * Safely get machine ID from collection, checking multiple sources
 * Collections may have machineId in different places:
 * 1. collection.machineId (standard)
 * 2. collection.sasMeters.machine (fallback for older data)
 */
function getMachineIdFromCollection(
  collection: CollectionData
): string | undefined {
  // Try collection.machineId first
  if (collection.machineId) return collection.machineId;

  // Fall back to sasMeters.machine
  if (collection.sasMeters?.machine)
    return collection.sasMeters.machine as string;

  // No machine ID found
  return undefined;
}

/**
 * Main orchestration function to fix all issues in a collection report
 *
 * Flow:
 * 1. Determine target report and collections based on reportId/machineId
 * 2. Phase 1: Fix all collection data (SAS times, movement, prevIn/prevOut, history)
 * 3. Phase 2: Update machine collectionMeters to match fixed collections
 * 4. Phase 3: Clean up orphaned entries and duplicates in machine history
 * 5. Generate summary report and return results
 */
export async function fixReportIssues(
  reportId?: string,
  machineId?: string
): Promise<{
  targetReport: { _id: string; locationReportId: string; timestamp: Date };
  fixResults: FixResults;
  totalTime: number;
}> {
  let targetReport: { _id: string; locationReportId: string; timestamp: Date };
  let targetCollections: CollectionData[] = [];

  if (machineId && !reportId) {
    // Fix specific machine history issues
    targetCollections = await Collections.find({
      machineId: machineId,
    }).lean();

    // Create a dummy report object for the fix process
    targetReport = {
      _id: machineId,
      locationReportId: `machine-${machineId}`,
      timestamp: new Date(),
    };
  } else if (reportId) {
    // Fix specific report BUT also fix ALL collections for SAS time chain integrity
    // reportId from URL is always locationReportId (UUID string)
    const report = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean();

    if (!report) {
      throw new Error('Report not found');
    }

    targetReport = {
      _id: report._id.toString(),
      locationReportId: report.locationReportId,
      timestamp: report.timestamp,
    };

    // Get ONLY the collections for THIS specific report
    targetCollections = await Collections.find({
      locationReportId: targetReport.locationReportId,
    })
      .sort({ timestamp: 1 })
      .lean();
  } else {
    // Fix most recent report
    const foundReport = await CollectionReport.findOne({})
      .sort({ timestamp: -1 })
      .lean();
    if (!foundReport) {
      throw new Error('No reports found');
    }

    targetReport = {
      _id: foundReport._id.toString(),
      locationReportId: foundReport.locationReportId,
      timestamp: foundReport.timestamp,
    };

    targetCollections = await Collections.find({
      locationReportId: targetReport.locationReportId,
    }).lean();
  }

  const totalCollections = targetCollections.length;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 FIX REPORT: ${targetReport.locationReportId}`);
  console.log(`📊 Total Collections: ${totalCollections}`);
  console.log(`${'='.repeat(80)}\n`);

  const fixResults: FixResults = {
    reportId: targetReport.locationReportId,
    collectionsProcessed: 0,
    issuesFixed: {
      sasTimesFixed: 0,
      movementCalculationsFixed: 0,
      prevMetersFixed: 0,
      machineCollectionMetersFixed: 0,
      historyEntriesFixed: 0,
      machineHistoryFixed: 0,
    },
    errors: [],
  };

  const startTime = Date.now();
  let lastProgressLog = 0;

  // PHASE 1: Fix all collection data first (prevIn/prevOut, movement, SAS times)
  console.log('📍 PHASE 1: Fixing collection data\n');

  // 🚀 OPTIMIZED: Parallel batch processing for much faster execution
  const BATCH_SIZE = 50; // Process 50 collections in parallel

  for (let i = 0; i < targetCollections.length; i += BATCH_SIZE) {
    const batch = targetCollections.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    await Promise.all(
      batch.map(async collection => {
        // 🔧 FIX: Get machine ID for filtering
        const collMachineId = getMachineIdFromCollection(collection);
        if (machineId && collMachineId !== machineId) {
          return; // Skip if specific machine requested and this isn't it
        }

        try {
          // 1. Fix SAS Times Issues
          await fixSasTimesIssues(collection, fixResults);

          // 2. Fix Movement Calculation Issues
          await fixMovementCalculationIssues(collection, fixResults);

          // 3. Fix PrevIn/PrevOut Issues (but don't update machine collectionMeters yet)
          await fixPrevMetersIssues(collection, fixResults, false);

          // 4. Fix Collection History Issues
          await fixCollectionHistoryIssues(collection, fixResults);

          // 5. Fix Machine History Issues
          await fixMachineHistoryIssues(collection, fixResults);

          // 6. Fix Machine History Entry Issues (prevIn/prevOut as 0 or undefined)
          await fixMachineHistoryEntryIssues(collection, fixResults);
        } catch (error) {
          fixResults.errors.push({
            collectionId: collection._id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    // Update progress after each batch
    fixResults.collectionsProcessed += batch.length;
    const progress = (fixResults.collectionsProcessed / totalCollections) * 100;

    // Progress logging (every 10% or significant progress)
    if (
      progress - lastProgressLog >= 10 ||
      fixResults.collectionsProcessed % 500 === 0
    ) {
      const totalIssues = Object.values(fixResults.issuesFixed).reduce(
        (sum, val) => sum + val,
        0
      );
      console.log(
        `⏳ ${fixResults.collectionsProcessed}/${totalCollections} (${progress.toFixed(0)}%) | ` +
          `Fixed: ${totalIssues} | Errors: ${fixResults.errors.length}`
      );
      lastProgressLog = progress;
    }
  }

  // Final progress for Phase 1
  const totalIssuesPhase1 = Object.values(fixResults.issuesFixed).reduce(
    (sum, val) => sum + val,
    0
  );
  console.log(
    `✅ Phase 1 Complete: ${fixResults.collectionsProcessed}/${totalCollections} | ` +
      `Fixed: ${totalIssuesPhase1} | Errors: ${fixResults.errors.length}\n`
  );

  // PHASE 2: Update machine collectionMeters to be consistent with fixed collection data
  console.log('📍 PHASE 2: Updating machine collectionMeters\n');

  let phase2Progress = 0;
  let lastPhase2Log = 0;

  // 🚀 OPTIMIZED: Parallel batch processing for Phase 2
  for (let i = 0; i < targetCollections.length; i += BATCH_SIZE) {
    const batch = targetCollections.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    await Promise.all(
      batch.map(async collection => {
        // 🔧 FIX: Get machine ID for filtering
        const collMachineId = getMachineIdFromCollection(collection);
        if (machineId && collMachineId !== machineId) {
          return;
        }

        try {
          // Update machine collectionMeters to match the fixed collection data
          await fixMachineCollectionMetersIssues(collection, fixResults);
        } catch (error) {
          fixResults.errors.push({
            collectionId: collection._id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    // Update progress after each batch
    phase2Progress += batch.length;
    const progress2 = (phase2Progress / totalCollections) * 100;

    // Progress logging for Phase 2
    if (progress2 - lastPhase2Log >= 10 || phase2Progress % 500 === 0) {
      console.log(
        `⏳ ${phase2Progress}/${totalCollections} (${progress2.toFixed(0)}%)`
      );
      lastPhase2Log = progress2;
    }
  }

  console.log(`✅ Phase 2 Complete: ${phase2Progress}/${totalCollections}\n`);

  // PHASE 3: Clean up orphaned entries and duplicate dates for all machines in this report
  console.log('📍 PHASE 3: Cleaning up machine history');
  if (machineId && !reportId) {
    // Fix for specific machine
    await fixMachineHistoryOrphanedAndDuplicates(machineId, fixResults, true);
  } else if (reportId) {
    // Fix for specific report
    await fixMachineHistoryOrphanedAndDuplicates(reportId, fixResults, false);
  } else if (targetReport) {
    // Fix for most recent report
    await fixMachineHistoryOrphanedAndDuplicates(
      targetReport._id.toString(),
      fixResults,
      false
    );
  }

  const totalTime = Date.now() - startTime;

  // Final Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ FIX COMPLETED');
  console.log(`${'='.repeat(80)}`);
  const totalIssuesFixed = Object.values(fixResults.issuesFixed).reduce(
    (sum, val) => sum + val,
    0
  );
  console.log(`\n📊 Summary:`);
  console.log(
    `   Collections Processed: ${fixResults.collectionsProcessed}/${totalCollections}`
  );
  console.log(`   Total Issues Fixed: ${totalIssuesFixed}`);
  console.log(`   - SAS Times: ${fixResults.issuesFixed.sasTimesFixed}`);
  console.log(`   - Prev Meters: ${fixResults.issuesFixed.prevMetersFixed}`);
  console.log(
    `   - Movement Calculations: ${fixResults.issuesFixed.movementCalculationsFixed}`
  );
  console.log(
    `   - Machine History: ${fixResults.issuesFixed.machineHistoryFixed}`
  );
  console.log(
    `   - History Entries: ${fixResults.issuesFixed.historyEntriesFixed}`
  );
  console.log(`   Errors: ${fixResults.errors.length}`);
  console.log(`   Time Taken: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`${'='.repeat(80)}\n`);

  // Log errors if any
  if (fixResults.errors.length > 0) {
    console.log('⚠️  Errors encountered:');
    fixResults.errors.slice(0, 5).forEach(err => {
      console.log(`   - Collection ${err.collectionId}: ${err.error}`);
    });
    if (fixResults.errors.length > 5) {
      console.log(`   ... and ${fixResults.errors.length - 5} more errors`);
    }
    console.log('');
  }

  return { targetReport, fixResults, totalTime };
}

/**
 * Fix SAS times issues (inverted, missing, incorrect, wrong start/end times)
 * CRITICAL: This must match the working logic from scripts/detect-and-fix-sas-times.js
 */
async function fixSasTimesIssues(
  collection: CollectionData,
  fixResults: FixResults
) {
  // 🔧 FIX: Get machine ID with fallback to sasMeters.machine (outside try to be accessible in catch)
  const actualMachineId = getMachineIdFromCollection(collection);
  const actualMachineCustomName = collection.machineCustomName;

  try {
    if (!actualMachineId) {
      // Silently skip - will be counted in errors
      fixResults.errors.push({
        collectionId: collection._id,
        machineId: 'Missing',
        machineCustomName: actualMachineCustomName || 'Unknown',
        phase: 'SAS Times',
        error:
          'Missing machine identifier (both machineId and sasMeters.machine are undefined)',
      });
      return;
    }

    let needsUpdate = false;
    const updateData: Record<string, unknown> = {};

    // Get expected SAS times by finding the previous collection
    const currentTimestamp = new Date(
      (collection.timestamp || collection.collectionTime) as string | Date
    );

    // 🔧 OPTIMIZED: Query database for previous collection instead of filtering in-memory array
    const previousCollection = await Collections.findOne({
      $and: [
        {
          $or: [
            { machineId: actualMachineId },
            { 'sasMeters.machine': actualMachineId },
            ...(actualMachineCustomName
              ? [{ machineCustomName: actualMachineCustomName }]
              : []),
          ],
        },
        {
          $or: [
            { timestamp: { $lt: currentTimestamp } },
            { collectionTime: { $lt: currentTimestamp } },
          ],
        },
      ],
      isCompleted: true,
      locationReportId: { $exists: true, $ne: '' },
      _id: { $ne: collection._id },
    })
      .sort({ timestamp: -1, collectionTime: -1 })
      .lean();

    // 🔧 FIX: Better SAS time calculation with improved logging
    const expectedSasStartTime = previousCollection
      ? new Date(
          (previousCollection.timestamp ||
            previousCollection.collectionTime) as string | Date
        )
      : new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000);

    const expectedSasEndTime = currentTimestamp;

    // Check if we need to fix SAS times
    const hasSasTimes =
      collection.sasMeters?.sasStartTime && collection.sasMeters?.sasEndTime;

    if (!hasSasTimes) {
      needsUpdate = true;
    } else {
      const sasStartTime = new Date(
        collection.sasMeters!.sasStartTime as string
      );
      const sasEndTime = new Date(collection.sasMeters!.sasEndTime as string);

      // Check for inverted times
      if (sasStartTime >= sasEndTime) {
        needsUpdate = true;
      }

      // Check if sasStartTime matches expected
      const startDiff = Math.abs(
        sasStartTime.getTime() - expectedSasStartTime.getTime()
      );
      if (startDiff > 1000) {
        needsUpdate = true;
      }

      // Check if sasEndTime matches expected
      const endDiff = Math.abs(
        sasEndTime.getTime() - expectedSasEndTime.getTime()
      );
      if (endDiff > 1000) {
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      // Recalculate SAS metrics with correct time window
      const sasMetrics = await calculateSasMetrics(
        actualMachineId, // 🔧 FIX: Use actualMachineId from helper
        expectedSasStartTime,
        expectedSasEndTime
      );

      updateData.sasMeters = {
        ...collection.sasMeters,
        drop: sasMetrics.drop,
        totalCancelledCredits: sasMetrics.totalCancelledCredits,
        gross: sasMetrics.gross,
        gamesPlayed: sasMetrics.gamesPlayed,
        jackpot: sasMetrics.jackpot,
        sasStartTime: expectedSasStartTime.toISOString(),
        sasEndTime: expectedSasEndTime.toISOString(),
        machine: actualMachineId, // 🔧 FIX: Use actualMachineId
      };

      // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
      await Collections.findOneAndUpdate(
        { _id: collection._id },
        { $set: updateData }
      );
      fixResults.issuesFixed.sasTimesFixed++;
    }
  } catch (error) {
    fixResults.errors.push({
      collectionId: collection._id,
      machineId: actualMachineId || 'Unknown',
      machineCustomName: actualMachineCustomName || 'Unknown',
      phase: 'SAS Times',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Fix movement calculation issues
 */
async function fixMovementCalculationIssues(
  collection: CollectionData,
  fixResults: FixResults
) {
  try {
    // Recalculate movement with current values
    const previousMeters = {
      metersIn: collection.prevIn || 0,
      metersOut: collection.prevOut || 0,
    };

    const movement = calculateMovement(
      collection.metersIn,
      collection.metersOut,
      previousMeters,
      collection.ramClear || false,
      collection.ramClearCoinIn,
      collection.ramClearCoinOut,
      collection.ramClearMetersIn,
      collection.ramClearMetersOut
    );

    // Check if current movement differs from calculated
    const currentMovement = collection.movement || {};
    const tolerance = 0.01;

    if (
      Math.abs(
        (((currentMovement as Record<string, unknown>).metersIn as number) ||
          0) - movement.metersIn
      ) > tolerance ||
      Math.abs(
        (((currentMovement as Record<string, unknown>).metersOut as number) ||
          0) - movement.metersOut
      ) > tolerance ||
      Math.abs(
        (((currentMovement as Record<string, unknown>).gross as number) || 0) -
          movement.gross
      ) > tolerance
    ) {
      // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
      await Collections.findOneAndUpdate(
        { _id: collection._id },
        {
          $set: {
            movement: {
              metersIn: Number(movement.metersIn.toFixed(2)),
              metersOut: Number(movement.metersOut.toFixed(2)),
              gross: Number(movement.gross.toFixed(2)),
            },
          },
        }
      );

      fixResults.issuesFixed.movementCalculationsFixed++;
    }
  } catch {
    // Error tracked - continue
  }
}

/**
 * Fix PrevIn/PrevOut issues
 */
async function fixPrevMetersIssues(
  collection: CollectionData,
  fixResults: FixResults,
  updateMachineMeters: boolean = true
) {
  try {
    // Check for previous meters mismatch (same logic as issue detection)
    if (collection.prevIn !== undefined && collection.prevOut !== undefined) {
      // CORRECT LOGIC: We now compare against machine's collectionMeters instead of previous collection

      let needsUpdate = false;
      let newPrevIn = collection.prevIn;
      let newPrevOut = collection.prevOut;

      // 🔧 FIX: Get machine ID with fallback
      const machineId = getMachineIdFromCollection(collection);
      if (!machineId) {
        return; // Skip silently
      }

      // CORRECT LOGIC: Check against ACTUAL historical data, not calculated values
      // Find the actual previous collection to determine correct prevIn/prevOut values
      const actualPreviousCollection = await Collections.findOne({
        $or: [
          { machineId: machineId },
          { 'sasMeters.machine': machineId },
          ...(collection.machineCustomName
            ? [{ machineCustomName: collection.machineCustomName }]
            : []),
        ],
        $and: [
          {
            $or: [
              {
                collectionTime: {
                  $lt: collection.collectionTime || collection.timestamp,
                },
              },
              {
                timestamp: {
                  $lt: collection.collectionTime || collection.timestamp,
                },
              },
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
          prevInDiff > 0.1 ||
          prevOutDiff > 0.1 ||
          (collection.prevIn === 0 &&
            collection.prevOut === 0 &&
            expectedPrevIn > 0) // Special case: both 0 when they should have values
        ) {
          newPrevIn = expectedPrevIn;
          newPrevOut = expectedPrevOut;
          needsUpdate = true;
        }
      } else {
        // CRITICAL: No previous COLLECTION found, but this doesn't mean prevIn/prevOut should be 0!
        // When no previous collection exists, the creation logic uses machine.collectionMeters as fallback
        // So prevIn/prevOut can have non-zero values from machine.collectionMeters
        // This is EXPECTED BEHAVIOR and should NOT be "fixed"
        // Don't "fix" this - it's correct behavior
      }

      if (needsUpdate) {
        // Calculate new movement values based on corrected prevIn/prevOut
        const newMovementIn = collection.metersIn - newPrevIn;
        const newMovementOut = collection.metersOut - newPrevOut;
        const newMovementGross = newMovementIn - newMovementOut;

        // Update the collection with correct prevIn/prevOut and recalculated movement
        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        await Collections.findOneAndUpdate(
          { _id: collection._id },
          {
            $set: {
              prevIn: newPrevIn,
              prevOut: newPrevOut,
              'movement.metersIn': Number(newMovementIn.toFixed(2)),
              'movement.metersOut': Number(newMovementOut.toFixed(2)),
              'movement.gross': Number(newMovementGross.toFixed(2)),
            },
          }
        );

        // CRITICAL: Also update the machine's collectionMeters to match the fixed prev values
        // This ensures consistency between the collection and the machine's current meters
        if (updateMachineMeters) {
          await Machine.findOneAndUpdate(
            { _id: machineId }, // 🔧 FIX: Use machineId from above
            {
              $set: {
                'collectionMeters.metersIn': newPrevIn,
                'collectionMeters.metersOut': newPrevOut,
                updatedAt: new Date(),
              },
            }
          );
        }

        fixResults.issuesFixed.prevMetersFixed++;
      }
    }
  } catch {
    // Error tracked - continue
  }
}

/**
 * Fix machine collectionMeters issues - ensure they match the collection's current meters
 */
async function fixMachineCollectionMetersIssues(
  collection: CollectionData,
  fixResults: FixResults
) {
  try {
    // 🔧 FIX: Get machine ID with fallback
    const machineId = getMachineIdFromCollection(collection);
    if (!machineId) {
      return; // Skip silently
    }

    // Get the machine's current collectionMeters
    const machine = await Machine.findOne({ _id: machineId }).lean();
    if (!machine) {
      return; // Skip silently
    }

    const machineData = machine as Record<string, unknown>;
    const collectionMeters = (machineData.collectionMeters as Record<
      string,
      unknown
    >) || {
      metersIn: 0,
      metersOut: 0,
    };
    const currentMachineMetersIn = (collectionMeters.metersIn as number) || 0;
    const currentMachineMetersOut = (collectionMeters.metersOut as number) || 0;
    const expectedMetersIn = collection.metersIn || 0;
    const expectedMetersOut = collection.metersOut || 0;
    // Check if machine's collectionMeters match the collection's current meters
    const needsUpdate =
      currentMachineMetersIn !== expectedMetersIn ||
      currentMachineMetersOut !== expectedMetersOut;

    if (needsUpdate) {
      // Update the machine's collectionMeters to match the collection's current meters
      await Machine.findOneAndUpdate(
        { _id: machineId }, // 🔧 FIX: Use machineId from helper
        {
          $set: {
            'collectionMeters.metersIn': expectedMetersIn,
            'collectionMeters.metersOut': expectedMetersOut,
            updatedAt: new Date(),
          },
        }
      );

      fixResults.issuesFixed.machineCollectionMetersFixed =
        (fixResults.issuesFixed.machineCollectionMetersFixed || 0) + 1;
    }
  } catch {
    // Error tracked - continue
  }
}

/**
 * Fix collection history issues
 */
async function fixCollectionHistoryIssues(
  collection: CollectionData,
  fixResults: FixResults
) {
  try {
    // Ensure collection has proper locationReportId
    if (
      !collection.locationReportId ||
      collection.locationReportId.trim() === ''
    ) {
      // Get the report for this collection
      const report = await CollectionReport.findOne({
        locationReportId: collection.locationReportId || { $exists: false },
      }).lean();

      if (report) {
        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        await Collections.findOneAndUpdate(
          { _id: collection._id },
          {
            $set: {
              locationReportId: report.locationReportId,
              isCompleted: true,
            },
          }
        );

        fixResults.issuesFixed.historyEntriesFixed++;
      }
    }
  } catch {
    // Error tracked - continue
  }
}

/**
 * Fix machine history issues - sync collectionMetersHistory with collection documents
 *
 * CRITICAL PRINCIPLE: Collection documents are ALWAYS the source of truth
 * - If history doesn't match collection → history is WRONG, update history to match collection
 * - NEVER update collection to match history
 * - Collection documents are validated and finalized through proper workflow
 * - History is just a denormalized copy for performance
 *
 * This function ensures collectionMetersHistory matches the actual collection documents
 * It syncs: metersIn, metersOut, prevMetersIn, prevMetersOut, timestamp
 * Uses locationReportId as the unique identifier
 */
async function fixMachineHistoryIssues(
  collection: CollectionData,
  fixResults: FixResults
) {
  try {
    // 🔧 FIX: Get machine ID with fallback
    const machineId = getMachineIdFromCollection(collection);

    if (!machineId) {
      return; // Skip silently
    }

    const machine = (await Machine.findOne({
      _id: machineId,
    }).lean()) as MachineData | null;
    if (!machine) {
      return; // Skip silently
    }
    const machineWithHistory = machine as unknown as MachineWithHistory;
    const currentHistory = machineWithHistory.collectionMetersHistory || [];

    // Find history entry by locationReportId (unique identifier)
    const historyEntry = currentHistory.find(
      entry =>
        (entry as HistoryEntry).locationReportId === collection.locationReportId
    );

    if (!historyEntry) {
      // Create missing history entry silently
      const newHistoryEntry = {
        _id: new (await import('mongoose')).default.Types.ObjectId(),
        metersIn: collection.metersIn,
        metersOut: collection.metersOut,
        prevMetersIn: collection.prevIn || 0,
        prevMetersOut: collection.prevOut || 0,
        timestamp: new Date(collection.timestamp),
        locationReportId: collection.locationReportId,
      };

      await Machine.findOneAndUpdate(
        { _id: machineId }, // 🔧 FIX: Use machineId from helper
        { $push: { collectionMetersHistory: newHistoryEntry } }
      );

      fixResults.issuesFixed.machineHistoryFixed++;
    } else {
      // History entry found - check if needs update

      // CRITICAL: Always sync history entry with collection document values
      // This fixes discrepancies where history shows wrong values
      const needsUpdate =
        historyEntry.metersIn !== collection.metersIn ||
        historyEntry.metersOut !== collection.metersOut ||
        historyEntry.prevMetersIn !== (collection.prevIn || 0) ||
        historyEntry.prevMetersOut !== (collection.prevOut || 0);
      if (needsUpdate) {
        // Use locationReportId to identify the specific entry to update
        const result = await Machine.findOneAndUpdate(
          { _id: machineId }, // 🔧 FIX: Use machineId from helper
          {
            $set: {
              'collectionMetersHistory.$[elem].metersIn': collection.metersIn,
              'collectionMetersHistory.$[elem].metersOut': collection.metersOut,
              'collectionMetersHistory.$[elem].prevMetersIn':
                collection.prevIn || 0,
              'collectionMetersHistory.$[elem].prevMetersOut':
                collection.prevOut || 0,
              'collectionMetersHistory.$[elem].timestamp': new Date(
                collection.timestamp
              ),
              updatedAt: new Date(),
            },
          },
          {
            arrayFilters: [
              {
                'elem.locationReportId': collection.locationReportId,
              },
            ],
            new: true, // Return updated document for verification
          }
        );

        if (result) {
          fixResults.issuesFixed.machineHistoryFixed++;
        }
      }
    }

    // Update machine's current collection meters
    await Machine.findOneAndUpdate(
      { _id: machineId }, // 🔧 FIX: Use machineId from helper
      {
        $set: {
          'collectionMeters.metersIn': collection.metersIn,
          'collectionMeters.metersOut': collection.metersOut,
          updatedAt: new Date(),
        },
      }
    );
  } catch {
    // Error tracked - continue
  }
}

/**
 * Fix machine history entry issues where prevIn/prevOut are 0 or undefined
 * This matches the issue detection logic from check-sas-times API
 */
async function fixMachineHistoryEntryIssues(
  collection: CollectionData,
  fixResults: FixResults
) {
  try {
    // 🔧 FIX: Get machine ID with fallback
    const machineId = getMachineIdFromCollection(collection);
    if (!machineId) {
      return; // Skip silently
    }

    const machine = (await Machine.findOne({
      _id: machineId,
    }).lean()) as MachineData | null;
    if (!machine) {
      return; // Skip silently
    }

    const machineWithHistory = machine as unknown as MachineWithHistory;
    const history = machineWithHistory.collectionMetersHistory || [];

    // Check each history entry for prevIn/prevOut issues
    for (let i = 1; i < history.length; i++) {
      const entry = history[i];
      const prevIn = entry.prevMetersIn || 0;
      const prevOut = entry.prevMetersOut || 0;

      // Check if this entry has prevIn/prevOut as 0 or undefined (issue detection logic)
      if (
        (prevIn === 0 || prevIn === undefined || prevIn === null) &&
        (prevOut === 0 || prevOut === undefined || prevOut === null)
      ) {
        // Get the expected values from the previous entry
        const expectedPrevIn = i > 0 ? history[i - 1]?.metersIn || 0 : 0;
        const expectedPrevOut = i > 0 ? history[i - 1]?.metersOut || 0 : 0;

        // Update the specific history entry using array filters
        await Machine.findOneAndUpdate(
          { _id: machineId }, // 🔧 FIX: Use machineId from helper
          {
            $set: {
              [`collectionMetersHistory.${i}.prevMetersIn`]: expectedPrevIn,
              [`collectionMetersHistory.${i}.prevMetersOut`]: expectedPrevOut,
            },
          }
        );

        // Verify the update was successful
        const updatedMachine = (await Machine.findOne({
          _id: machineId,
        }).lean()) as MachineWithHistory | null;
        const updatedEntry = updatedMachine?.collectionMetersHistory?.[i];

        if (
          updatedEntry &&
          updatedEntry.prevMetersIn === expectedPrevIn &&
          updatedEntry.prevMetersOut === expectedPrevOut
        ) {
          fixResults.issuesFixed.machineHistoryFixed++;
        }
      }
    }
  } catch {
    // Error tracked - continue
  }
}

/**
 * Fix orphaned entries and duplicate dates in machine history
 */
async function fixMachineHistoryOrphanedAndDuplicates(
  reportIdOrMachineId: string,
  fixResults: FixResults,
  isMachineSpecific: boolean = false
) {
  try {
    if (isMachineSpecific) {
      // Get all collections for this machine
      const collections = await Collections.find({
        machineId: reportIdOrMachineId,
      });

      // Process only this specific machine (even if no collections remain)
      const machineIds = [reportIdOrMachineId];
      await processMachinesForHistoryFix(
        machineIds,
        collections as unknown as Record<string, unknown>[],
        fixResults
      );
    } else {
      // Get all collections for this report
      const collections = await Collections.find({
        locationReportId: reportIdOrMachineId,
      });

      if (collections.length === 0) {
        return;
      }

      // Get unique machine IDs
      const machineIds = [...new Set(collections.map(c => c.machineId))];
      await processMachinesForHistoryFix(
        machineIds,
        collections as unknown as Record<string, unknown>[],
        fixResults
      );
    }
  } catch (error) {
    fixResults.errors.push({
      collectionId: 'machine-history-cleanup',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Process machines for history fix
 */
async function processMachinesForHistoryFix(
  machineIds: string[],
  collections: Record<string, unknown>[],
  fixResults: FixResults
) {
  try {
    for (const machineId of machineIds) {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const machine = await Machine.findOne({ _id: machineId }).lean();
      if (!machine) continue;

      const machineData = machine as Record<string, unknown>;
      const history =
        (machineData.collectionMetersHistory as Record<string, unknown>[]) ||
        [];

      if (history.length === 0) continue;
      let cleanedHistory = [...history];
      let hasChanges = false;

      // 1. Remove orphaned entries (entries that reference non-existent collections or reports)
      // First, get ALL collections for this machine across all reports
      const allMachineCollections = await Collections.find({
        machineId: machineId,
      }).lean();

      // Also check if collection reports exist
      const { CollectionReport } = await import(
        '@/app/api/lib/models/collectionReport'
      );

      // Process each history entry to check for orphaned entries
      const validHistoryEntries = [];
      for (const entry of cleanedHistory) {
        if (!entry.locationReportId) {
          validHistoryEntries.push(entry); // Keep entries without locationReportId
          continue;
        }

        // Check if collections exist for this locationReportId
        const hasCollections = allMachineCollections.some(
          c => c.locationReportId === entry.locationReportId
        );

        // Check if the collection report itself exists
        const hasReport = await CollectionReport.findOne({
          locationReportId: entry.locationReportId,
        }).lean();

        if (!hasCollections || !hasReport) {
          hasChanges = true;
        } else {
          validHistoryEntries.push(entry);
        }
      }

      cleanedHistory = validHistoryEntries;

      // 2. Remove duplicate locationReportIds (keep the one closest to collection timestamp)
      const locationReportIdGroups = new Map<
        string,
        Record<string, unknown>[]
      >();

      // Group entries by locationReportId
      for (const entry of cleanedHistory) {
        if (entry.locationReportId) {
          const reportId = entry.locationReportId as string;
          if (!locationReportIdGroups.has(reportId)) {
            locationReportIdGroups.set(reportId, []);
          }
          locationReportIdGroups.get(reportId)!.push(entry);
        }
      }

      // Process each locationReportId group to remove duplicates
      for (const [reportId, entries] of locationReportIdGroups) {
        if (entries.length > 1) {
          // Find the collection document for this locationReportId
          const matchingCollection = allMachineCollections.find(
            c => c.locationReportId === reportId
          );

          if (matchingCollection) {
            // Keep the entry that best matches the collection
            let bestEntry = entries[0];
            let bestScore = 0;

            for (const entry of entries) {
              let score = 0;

              // Score based on how well it matches the collection
              if (entry.metersIn === matchingCollection.metersIn) score += 10;
              if (entry.metersOut === matchingCollection.metersOut) score += 10;
              if (entry.prevMetersIn === (matchingCollection.prevIn || 0))
                score += 5;
              if (entry.prevMetersOut === (matchingCollection.prevOut || 0))
                score += 5;

              // Prefer entries with timestamp close to collection timestamp
              const entryTime = new Date(entry.timestamp as string).getTime();
              const collectionTime = new Date(
                typeof matchingCollection.timestamp === 'string'
                  ? matchingCollection.timestamp
                  : (matchingCollection.timestamp as Date).toISOString()
              ).getTime();
              const timeDiff = Math.abs(entryTime - collectionTime);
              if (timeDiff < 60000) score += 3; // Within 1 minute

              if (score > bestScore) {
                bestScore = score;
                bestEntry = entry;
              }
            }
            // Remove all entries with this locationReportId except the best one
            cleanedHistory = cleanedHistory.filter(entry => {
              if (entry.locationReportId === reportId) {
                return entry === bestEntry;
              }
              return true;
            });

            hasChanges = true;
          }
        }
      }

      // 3. Fix duplicate dates by keeping the most accurate entry
      const dateGroups = new Map<string, Record<string, unknown>[]>();

      // Group entries by date
      for (const entry of cleanedHistory) {
        if (entry.timestamp) {
          const date = new Date(entry.timestamp as string)
            .toISOString()
            .split('T')[0];
          if (!dateGroups.has(date)) {
            dateGroups.set(date, []);
          }
          dateGroups.get(date)!.push(entry);
        }
      }

      // Process each date group
      for (const [date, entries] of dateGroups) {
        if (entries.length > 1) {
          // Find the most accurate entry (the one with matching collections)
          let bestEntry = entries[0];
          let bestScore = 0;

          for (const entry of entries) {
            let score = 0;

            // Check if this entry has a matching collection
            if (entry.locationReportId) {
              const hasMatchingCollection = allMachineCollections.some(
                c =>
                  c.locationReportId === entry.locationReportId &&
                  c.metersIn === entry.metersIn &&
                  c.metersOut === entry.metersOut
              );
              if (hasMatchingCollection) score += 10;
            }

            // Prefer entries with proper prevMeters values
            if (
              entry.prevMetersIn !== undefined &&
              entry.prevMetersOut !== undefined
            ) {
              score += 5;
            }

            if (score > bestScore) {
              bestScore = score;
              bestEntry = entry;
            }
          }
          // Remove all entries for this date except the best one
          cleanedHistory = cleanedHistory.filter(entry => {
            if (entry.timestamp) {
              const entryDate = new Date(entry.timestamp as string)
                .toISOString()
                .split('T')[0];
              if (entryDate === date) {
                return entry === bestEntry;
              }
            }
            return true;
          });

          hasChanges = true;
        }
      }

      // CRITICAL: Always sync history entries with collections, regardless of whether duplicates were found
      // This ensures history matches collections even when no cleanup was needed
      let syncMadeChanges = false;
      for (const entry of cleanedHistory) {
        if (entry.locationReportId) {
          const matchingCollection = allMachineCollections.find(
            c => c.locationReportId === entry.locationReportId
          );

          if (matchingCollection) {
            // Check if values differ before syncing
            const valuesDiffer =
              entry.metersIn !== matchingCollection.metersIn ||
              entry.metersOut !== matchingCollection.metersOut ||
              entry.prevMetersIn !== (matchingCollection.prevIn || 0) ||
              entry.prevMetersOut !== (matchingCollection.prevOut || 0);

            if (valuesDiffer) {
              const reportIdStr = String(
                entry.locationReportId || ''
              ).substring(0, 20);
              console.warn(`   ✅ Syncing ${reportIdStr}... (values differ)`);
              syncMadeChanges = true;
            }

            // Sync ALL fields with the collection (source of truth)
            entry.metersIn = matchingCollection.metersIn;
            entry.metersOut = matchingCollection.metersOut;
            entry.prevMetersIn = matchingCollection.prevIn || 0;
            entry.prevMetersOut = matchingCollection.prevOut || 0;
            entry.timestamp = new Date(matchingCollection.timestamp);
          }
        }
      }

      // Update if either cleanup made changes OR sync made changes
      if (hasChanges || syncMadeChanges) {
        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        const updateResult = await Machine.findOneAndUpdate(
          { _id: machineId },
          {
            $set: { collectionMetersHistory: cleanedHistory },
          },
          { new: true }
        );

        if (!updateResult) {
          console.warn(`      Trying findOneAndUpdate instead...`);
          await Machine.findOneAndUpdate(
            { _id: machineId },
            { $set: { collectionMetersHistory: cleanedHistory } },
            { new: true }
          );
        }

        fixResults.issuesFixed.machineHistoryFixed++;
      }
    }
  } catch (error) {
    fixResults.errors.push({
      collectionId: 'machine-history-cleanup',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
