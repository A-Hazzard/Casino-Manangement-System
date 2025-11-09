import { calculateSasMetrics } from '@/lib/helpers/collectionCreation';
import {
  CollectionData,
  FixResults,
  HistoryEntry,
  MachineData,
} from '@/lib/types/fixReport';
import { calculateMovement } from '@/lib/utils/movementCalculation';
import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUserIdFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';
import { CollectionReport } from '../../lib/models/collectionReport';
import { Collections } from '../../lib/models/collections';
import { Machine } from '../../lib/models/machines';

// Type for machine document with collectionMetersHistory
type MachineWithHistory = {
  _id: string;
  collectionMetersHistory: Array<{
    _id: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn?: number;
    prevMetersOut?: number;
    timestamp: Date;
    locationReportId?: string;
  }>;
};

/**
 * Unified Fix Report API
 *
 * This endpoint automatically detects and fixes ALL issues with a collection report:
 * - SAS times issues (inverted, missing, incorrect)
 * - Movement calculation issues
 * - PrevIn/PrevOut issues
 * - Collection history issues
 * - Machine history synchronization
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 17th, 2025
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    console.warn('🔧 Starting unified fix report process...');

    const body = await request.json().catch(() => ({}));
    const { reportId, machineId } = body;
    console.warn(
      `🔧 FIX-REPORT API CALLED: machineId=${machineId}, reportId=${reportId}`
    );

    // Check authentication
    if (process.env.NODE_ENV !== 'development') {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (
        !user.roles?.includes('admin') &&
        !user.roles?.includes('developer')
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    let targetReport;
    let targetCollections = [];

    if (machineId && !reportId) {
      // Fix specific machine history issues
      console.warn(`🔧 Fixing machine history for machine: ${machineId}`);

      // Get all collections for this machine
      targetCollections = await Collections.find({
        machineId: machineId,
      }).lean();

      if (targetCollections.length === 0) {
        return NextResponse.json(
          { error: 'No collections found for this machine' },
          { status: 404 }
        );
      }

      // Create a dummy report object for the fix process
      targetReport = {
        _id: machineId,
        locationReportId: `machine-${machineId}`,
        timestamp: new Date(),
      };
    } else if (reportId) {
      // Fix specific report BUT also fix ALL collections for SAS time chain integrity
      // reportId can be either MongoDB _id or locationReportId (UUID)
      // Try to find by locationReportId first (most common case from frontend)
      targetReport = await CollectionReport.findOne({
        locationReportId: reportId,
      }).lean();

      // If not found, try by MongoDB _id
      if (!targetReport) {
        try {
          targetReport = await CollectionReport.findById(reportId).lean();
        } catch {
          // Invalid ObjectId format, ignore
        }
      }

      if (!targetReport) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }

      // CRITICAL: Get ALL completed collections across ALL reports for SAS time chain integrity
      // SAS times depend on previous collections, so we must process ALL chronologically
      // This ensures each collection's SAS times are calculated from the correct previous collection
      console.warn(
        `🔧 Requested fix for report: ${targetReport.locationReportId}`
      );
      console.warn(
        `🔧 But will fix ALL collections chronologically for data integrity`
      );

      targetCollections = await Collections.find({
        isCompleted: true,
        locationReportId: { $exists: true, $ne: '' },
      })
        .sort({ timestamp: 1 })
        .lean();

      console.warn(
        `🔧 Processing ${targetCollections.length} total collections across all reports`
      );
    } else {
      // Fix most recent report
      targetReport = await CollectionReport.findOne({})
        .sort({ timestamp: -1 })
        .lean();
      if (!targetReport) {
        return NextResponse.json(
          { error: 'No reports found' },
          { status: 404 }
        );
      }

      targetCollections = await Collections.find({
        locationReportId: targetReport.locationReportId,
      }).lean();

      console.warn(
        `🔧 Fixing most recent report: ${targetReport.locationReportId}`
      );
    }

    console.warn(`📊 Found ${targetCollections.length} collections to process`);

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

    // PHASE 1: Fix all collection data first (prevIn/prevOut, movement, SAS times)
    for (const collection of targetCollections) {
      if (machineId && collection.machineId !== machineId) {
        continue; // Skip if specific machine requested and this isn't it
      }

      fixResults.collectionsProcessed++;
      console.warn(
        `\n🔍 PHASE 1 - Processing collection: ${collection._id} (Machine: ${collection.machineId})`
      );

      try {
        // 1. Fix SAS Times Issues
        await fixSasTimesIssues(collection, fixResults, targetCollections);

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
        console.error(
          `❌ Error processing collection ${collection._id}:`,
          error
        );
        fixResults.errors.push({
          collectionId: collection._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // PHASE 2: Update machine collectionMeters to be consistent with fixed collection data
    console.warn(
      `\n🔍 PHASE 2 - Updating machine collectionMeters for consistency`
    );
    for (const collection of targetCollections) {
      if (machineId && collection.machineId !== machineId) {
        continue;
      }

      try {
        // Update machine collectionMeters to match the fixed collection data
        await fixMachineCollectionMetersIssues(collection, fixResults);
      } catch (error) {
        console.error(
          `❌ Error updating machine collectionMeters for collection ${collection._id}:`,
          error
        );
        fixResults.errors.push({
          collectionId: collection._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // PHASE 3: Clean up orphaned entries and duplicate dates for all machines in this report
    console.warn(`\n🔍 PHASE 3 - Cleaning up machine history`);
    if (machineId && !reportId) {
      // Fix for specific machine
      console.warn(
        `   🔧 Calling fixMachineHistoryOrphanedAndDuplicates with machineId: ${machineId}`
      );
      await fixMachineHistoryOrphanedAndDuplicates(machineId, fixResults, true);
      console.warn(
        `   ✅ Phase 3 completed. machineHistoryFixed: ${fixResults.issuesFixed.machineHistoryFixed}`
      );
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

    console.warn(`\n✅ Fix report completed:`);
    console.warn(
      `   Collections processed: ${fixResults.collectionsProcessed}`
    );
    console.warn(`   SAS times fixed: ${fixResults.issuesFixed.sasTimesFixed}`);
    console.warn(
      `   Movement calculations fixed: ${fixResults.issuesFixed.movementCalculationsFixed}`
    );
    console.warn(
      `   Prev meters fixed: ${fixResults.issuesFixed.prevMetersFixed}`
    );
    console.warn(
      `   History entries fixed: ${fixResults.issuesFixed.historyEntriesFixed}`
    );
    console.warn(
      `   Machine history fixed: ${fixResults.issuesFixed.machineHistoryFixed}`
    );
    console.warn(`   Errors: ${fixResults.errors.length}`);

    return NextResponse.json({
      success: true,
      message: 'Report fix completed',
      results: fixResults,
    });
  } catch (error) {
    console.error('❌ Fix report failed:', error);
    return NextResponse.json(
      {
        error: 'Fix report failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Fix SAS times issues (inverted, missing, incorrect, wrong start/end times)
 * CRITICAL: This must match the working logic from scripts/detect-and-fix-sas-times.js
 */
async function fixSasTimesIssues(
  collection: CollectionData,
  fixResults: FixResults,
  allCollections: CollectionData[]
) {
  try {
    let needsUpdate = false;
    const updateData: Record<string, unknown> = {};

    // Get expected SAS times by finding the previous collection
    const currentTimestamp = new Date(
      (collection.timestamp || collection.collectionTime) as string | Date
    );

    // Find the previous collection for this machine
    const previousCollection = allCollections
      .filter(
        c =>
          c.machineId === collection.machineId &&
          new Date((c.timestamp || c.collectionTime) as string | Date) <
            currentTimestamp &&
          c.isCompleted === true &&
          c.locationReportId &&
          c.locationReportId.trim() !== '' &&
          c._id.toString() !== collection._id.toString()
      )
      .sort((a, b) => {
        const aTime = new Date(
          (a.timestamp || a.collectionTime) as string | Date
        ).getTime();
        const bTime = new Date(
          (b.timestamp || b.collectionTime) as string | Date
        ).getTime();
        return bTime - aTime; // descending
      })[0];

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
      // Missing SAS times
      console.warn(
        `   🔧 Fixing missing SAS times for collection ${collection._id}`
      );
      needsUpdate = true;
    } else {
      const sasStartTime = new Date(
        collection.sasMeters!.sasStartTime as string
      );
      const sasEndTime = new Date(collection.sasMeters!.sasEndTime as string);

      // Check for inverted times
      if (sasStartTime >= sasEndTime) {
        console.warn(
          `   🔧 Fixing inverted SAS times for collection ${collection._id}`
        );
        needsUpdate = true;
      }

      // Check if sasStartTime matches expected
      const startDiff = Math.abs(
        sasStartTime.getTime() - expectedSasStartTime.getTime()
      );
      if (startDiff > 1000) {
        console.warn(
          `   🔧 Fixing wrong SAS start time for collection ${collection._id} (off by ${Math.round(startDiff / 1000 / 60)} minutes)`
        );
        needsUpdate = true;
      }

      // Check if sasEndTime matches expected
      const endDiff = Math.abs(
        sasEndTime.getTime() - expectedSasEndTime.getTime()
      );
      if (endDiff > 1000) {
        console.warn(
          `   🔧 Fixing wrong SAS end time for collection ${collection._id} (off by ${Math.round(endDiff / 1000 / 60)} minutes)`
        );
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      // Recalculate SAS metrics with correct time window
      const sasMetrics = await calculateSasMetrics(
        collection.machineId,
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
        machine: collection.sasMeters?.machine || collection.machineId,
      };

      await Collections.findByIdAndUpdate(collection._id, { $set: updateData });
      console.warn(`   ✅ Fixed SAS times for collection ${collection._id}`);
      fixResults.issuesFixed.sasTimesFixed++;
    }
  } catch (error) {
    console.error(
      `   ❌ Error fixing SAS times for collection ${collection._id}:`,
      error
    );
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
      console.warn(
        `   🔧 Fixing movement calculation for collection ${collection._id}`
      );

      await Collections.findByIdAndUpdate(collection._id, {
        $set: {
          movement: {
            metersIn: Number(movement.metersIn.toFixed(2)),
            metersOut: Number(movement.metersOut.toFixed(2)),
            gross: Number(movement.gross.toFixed(2)),
          },
        },
      });

      fixResults.issuesFixed.movementCalculationsFixed++;
      console.warn(
        `   ✅ Fixed movement calculation for collection ${collection._id}`
      );
    }
  } catch (error) {
    console.error(
      `   ❌ Error fixing movement calculation for collection ${collection._id}:`,
      error
    );
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

      // CORRECT LOGIC: Check against ACTUAL historical data, not calculated values
      // Find the actual previous collection to determine correct prevIn/prevOut values
      const actualPreviousCollection = await Collections.findOne({
        machineId: collection.machineId,
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

        console.warn(
          `   🔍 Checking prev meters for collection ${collection._id}:`,
          {
            currentPrevIn: collection.prevIn,
            currentPrevOut: collection.prevOut,
            expectedPrevIn,
            expectedPrevOut,
            previousCollectionId: actualPreviousCollection._id,
            previousCollectionTime: actualPreviousCollection.timestamp,
          }
        );

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
        console.warn(
          `   ℹ️ No previous collection found for collection ${collection._id}, prevIn=${collection.prevIn}, prevOut=${collection.prevOut} (from machine.collectionMeters, expected behavior)`
        );
        // Don't "fix" this - it's correct behavior
      }

      if (needsUpdate) {
        console.warn(
          `   🔧 Fixing prevIn/prevOut for collection ${collection._id}: ${collection.prevIn}, ${collection.prevOut} → ${newPrevIn}, ${newPrevOut}`
        );

        // Calculate new movement values based on corrected prevIn/prevOut
        const newMovementIn = collection.metersIn - newPrevIn;
        const newMovementOut = collection.metersOut - newPrevOut;
        const newMovementGross = newMovementIn - newMovementOut;

        console.warn(`   🔧 Recalculating movement values:`, {
          metersIn: collection.metersIn,
          metersOut: collection.metersOut,
          prevIn: newPrevIn,
          prevOut: newPrevOut,
          movementIn: newMovementIn,
          movementOut: newMovementOut,
          movementGross: newMovementGross,
        });

        // Update the collection with correct prevIn/prevOut and recalculated movement
        await Collections.findByIdAndUpdate(collection._id, {
          $set: {
            prevIn: newPrevIn,
            prevOut: newPrevOut,
            'movement.metersIn': Number(newMovementIn.toFixed(2)),
            'movement.metersOut': Number(newMovementOut.toFixed(2)),
            'movement.gross': Number(newMovementGross.toFixed(2)),
          },
        });

        // CRITICAL: Also update the machine's collectionMeters to match the fixed prev values
        // This ensures consistency between the collection and the machine's current meters
        if (updateMachineMeters) {
          const { Machine } = await import('@/app/api/lib/models/machines');
          await Machine.findByIdAndUpdate(collection.machineId, {
            $set: {
              'collectionMeters.metersIn': newPrevIn,
              'collectionMeters.metersOut': newPrevOut,
              updatedAt: new Date(),
            },
          });

          console.warn(
            `   🔧 Updated machine ${collection.machineId} collectionMeters to match fixed prev values: ${newPrevIn}, ${newPrevOut}`
          );
        } else {
          console.warn(
            `   🔧 Skipped machine collectionMeters update (will be done in Phase 2): ${newPrevIn}, ${newPrevOut}`
          );
        }

        fixResults.issuesFixed.prevMetersFixed++;
        console.warn(
          `   ✅ Fixed prevIn/prevOut, movement, and machine collectionMeters for collection ${collection._id}`
        );
      }
    }
  } catch (error) {
    console.error(
      `   ❌ Error fixing prevIn/prevOut for collection ${collection._id}:`,
      error
    );
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
    const { Machine } = await import('@/app/api/lib/models/machines');

    // Get the machine's current collectionMeters
    const machine = await Machine.findById(collection.machineId).lean();
    if (!machine) {
      console.warn(
        `   ⚠️ Machine ${collection.machineId} not found, skipping collectionMeters fix`
      );
      return;
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

    console.warn(
      `   🔍 Checking machine collectionMeters for collection ${collection._id}:`,
      {
        currentMachineMetersIn,
        currentMachineMetersOut,
        expectedMetersIn,
        expectedMetersOut,
        machineId: collection.machineId,
      }
    );

    // Check if machine's collectionMeters match the collection's current meters
    const needsUpdate =
      currentMachineMetersIn !== expectedMetersIn ||
      currentMachineMetersOut !== expectedMetersOut;

    if (needsUpdate) {
      console.warn(
        `   🔧 Fixing machine collectionMeters for collection ${collection._id}: ` +
          `${currentMachineMetersIn}, ${currentMachineMetersOut} → ${expectedMetersIn}, ${expectedMetersOut}`
      );

      // Update the machine's collectionMeters to match the collection's current meters
      await Machine.findByIdAndUpdate(collection.machineId, {
        $set: {
          'collectionMeters.metersIn': expectedMetersIn,
          'collectionMeters.metersOut': expectedMetersOut,
          updatedAt: new Date(),
        },
      });

      fixResults.issuesFixed.machineCollectionMetersFixed =
        (fixResults.issuesFixed.machineCollectionMetersFixed || 0) + 1;
      console.warn(
        `   ✅ Fixed machine collectionMeters for collection ${collection._id}`
      );
    } else {
      console.warn(
        `   ✅ Machine collectionMeters already correct for collection ${collection._id}`
      );
    }
  } catch (error) {
    console.error(
      `   ❌ Error fixing machine collectionMeters for collection ${collection._id}:`,
      error
    );
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
      console.warn(
        `   🔧 Fixing missing locationReportId for collection ${collection._id}`
      );

      // Get the report for this collection
      const report = await CollectionReport.findOne({
        locationReportId: collection.locationReportId || { $exists: false },
      }).lean();

      if (report) {
        await Collections.findByIdAndUpdate(collection._id, {
          $set: {
            locationReportId: report.locationReportId,
            isCompleted: true,
          },
        });

        fixResults.issuesFixed.historyEntriesFixed++;
        console.warn(
          `   ✅ Fixed locationReportId for collection ${collection._id}`
        );
      }
    }
  } catch (error) {
    console.error(
      `   ❌ Error fixing collection history for collection ${collection._id}:`,
      error
    );
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
    console.warn(`\n🔍 [fixMachineHistoryIssues] Processing collection:`);
    console.warn(`   Collection ID: ${collection._id}`);
    console.warn(`   locationReportId: ${collection.locationReportId}`);
    console.warn(
      `   Collection prevIn/prevOut: ${collection.prevIn}/${collection.prevOut}`
    );
    console.warn(
      `   Machine ID: ${collection.machineId} (type: ${typeof collection.machineId})`
    );

    let machine = (await Machine.findById(
      collection.machineId
    ).lean()) as MachineData | null;
    if (!machine) {
      console.warn(
        `   ❌ Machine not found with findById: ${collection.machineId}`
      );
      console.warn(`   ⚠️ Trying findOne instead...`);
      machine = (await Machine.findOne({
        _id: collection.machineId,
      }).lean()) as MachineData | null;
      if (!machine) {
        console.warn(`   ❌ Machine STILL not found with findOne!`);
        return;
      }
      console.warn(`   ✅ Machine found with findOne!`);
    }

    const currentHistory = machine.collectionMetersHistory || [];
    console.warn(`   Machine has ${currentHistory.length} history entries`);

    // Find history entry by locationReportId (unique identifier)
    const historyEntry = currentHistory.find(
      (entry: HistoryEntry) =>
        entry.locationReportId === collection.locationReportId
    );

    if (!historyEntry) {
      console.warn(
        `   ⚠️ No history entry found for locationReportId: ${collection.locationReportId}`
      );
      console.warn(`   Available locationReportIds in history:`);
      currentHistory.forEach((e: HistoryEntry, i: number) => {
        console.warn(`     [${i}] ${e.locationReportId}`);
      });
      console.warn(
        `   🔧 Creating missing history entry for collection ${collection._id}`
      );

      const newHistoryEntry = {
        _id: new (await import('mongoose')).default.Types.ObjectId(),
        metersIn: collection.metersIn,
        metersOut: collection.metersOut,
        prevMetersIn: collection.prevIn || 0,
        prevMetersOut: collection.prevOut || 0,
        timestamp: new Date(collection.timestamp),
        locationReportId: collection.locationReportId,
      };

      await Machine.findByIdAndUpdate(collection.machineId, {
        $push: { collectionMetersHistory: newHistoryEntry },
      });

      fixResults.issuesFixed.machineHistoryFixed++;
      console.warn(
        `   ✅ Created history entry for collection ${collection._id}`
      );
    } else {
      console.warn(`   ✅ Found history entry`);
      console.warn(
        `      History prevMetersIn/prevMetersOut: ${historyEntry.prevMetersIn}/${historyEntry.prevMetersOut}`
      );
      console.warn(
        `      Collection prevIn/prevOut: ${collection.prevIn || 0}/${collection.prevOut || 0}`
      );

      // CRITICAL: Always sync history entry with collection document values
      // This fixes discrepancies where history shows wrong values
      const needsUpdate =
        historyEntry.metersIn !== collection.metersIn ||
        historyEntry.metersOut !== collection.metersOut ||
        historyEntry.prevMetersIn !== (collection.prevIn || 0) ||
        historyEntry.prevMetersOut !== (collection.prevOut || 0);

      console.warn(`   needsUpdate: ${needsUpdate}`);

      if (needsUpdate) {
        console.warn(
          `   🔧 Syncing history entry with collection ${collection._id}:`
        );
        console.warn(
          `      Collection: metersIn=${collection.metersIn}, metersOut=${collection.metersOut}, prevIn=${collection.prevIn || 0}, prevOut=${collection.prevOut || 0}`
        );
        console.warn(
          `      History: metersIn=${historyEntry.metersIn}, metersOut=${historyEntry.metersOut}, prevMetersIn=${historyEntry.prevMetersIn}, prevMetersOut=${historyEntry.prevMetersOut}`
        );
        console.warn(`   🔧 Attempting update with arrayFilters...`);
        console.warn(
          `      arrayFilter: { 'elem.locationReportId': '${collection.locationReportId}' }`
        );

        // Use locationReportId to identify the specific entry to update
        const result = await Machine.findByIdAndUpdate(
          collection.machineId,
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

        if (!result) {
          console.warn(`   ❌ UPDATE FAILED! findByIdAndUpdate returned null`);
          console.warn(
            `      This usually means document not found or update didn't match any elements`
          );
        } else {
          console.warn(`   ✅ UPDATE SUCCESSFUL!`);
          const updatedEntry = result.collectionMetersHistory?.find(
            (e: HistoryEntry) =>
              e.locationReportId === collection.locationReportId
          );
          if (updatedEntry) {
            console.warn(
              `   ✅ Verified - New prevMetersIn: ${updatedEntry.prevMetersIn}, prevMetersOut: ${updatedEntry.prevMetersOut}`
            );
          } else {
            console.warn(
              `   ⚠️ Could not verify update - entry not found in result`
            );
          }
        }

        fixResults.issuesFixed.machineHistoryFixed++;
        console.warn(
          `   ✅ Synced history entry with collection ${collection._id}: prevMetersIn=${collection.prevIn || 0}, prevMetersOut=${collection.prevOut || 0}`
        );
      } else {
        console.warn(
          `   ℹ️ History entry already matches collection ${collection._id}, no sync needed`
        );
      }
    }

    // Update machine's current collection meters
    await Machine.findByIdAndUpdate(collection.machineId, {
      $set: {
        'collectionMeters.metersIn': collection.metersIn,
        'collectionMeters.metersOut': collection.metersOut,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(
      `   ❌ Error fixing machine history for collection ${collection._id}:`,
      error
    );
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
    const machine = (await Machine.findById(
      collection.machineId
    ).lean()) as MachineData | null;
    if (!machine) return;

    const history = machine.collectionMetersHistory || [];
    let hasFixedIssues = false;

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

        console.warn(
          `   🔧 Fixing machine history entry ${i} for machine ${collection.machineId}: prevIn/prevOut ${prevIn}/${prevOut} → ${expectedPrevIn}/${expectedPrevOut}`
        );

        // Update the specific history entry using array filters
        await Machine.findByIdAndUpdate(collection.machineId, {
          $set: {
            [`collectionMetersHistory.${i}.prevMetersIn`]: expectedPrevIn,
            [`collectionMetersHistory.${i}.prevMetersOut`]: expectedPrevOut,
          },
        });

        // Verify the update was successful
        const updatedMachine = (await Machine.findById(
          collection.machineId
        ).lean()) as MachineWithHistory | null;
        const updatedEntry = updatedMachine?.collectionMetersHistory?.[i];

        if (
          updatedEntry &&
          updatedEntry.prevMetersIn === expectedPrevIn &&
          updatedEntry.prevMetersOut === expectedPrevOut
        ) {
          hasFixedIssues = true;
          fixResults.issuesFixed.machineHistoryFixed++;
          console.warn(
            `   ✅ Fixed machine history entry ${i} for machine ${collection.machineId}`
          );
        } else {
          console.error(
            `   ❌ Failed to update machine history entry ${i} for machine ${collection.machineId}`
          );
        }
      }
    }

    if (!hasFixedIssues) {
      console.warn(
        `   ℹ️ No machine history entry issues found for machine ${collection.machineId}`
      );
    }
  } catch (error) {
    console.error(
      `   ❌ Error fixing machine history entry issues for collection ${collection._id}:`,
      error
    );
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
      console.warn(
        `🔧 Fixing orphaned entries and duplicate dates for machine ${reportIdOrMachineId}`
      );

      // Get all collections for this machine
      const collections = await Collections.find({
        machineId: reportIdOrMachineId,
      });

      if (collections.length === 0) {
        console.warn(
          `   ℹ️ No collections found for machine ${reportIdOrMachineId}`
        );
        return;
      }

      // Process only this specific machine
      const machineIds = [reportIdOrMachineId];
      await processMachinesForHistoryFix(
        machineIds,
        collections as unknown as Record<string, unknown>[],
        fixResults
      );
    } else {
      console.warn(
        `🔧 Fixing orphaned entries and duplicate dates for report ${reportIdOrMachineId}`
      );

      // Get all collections for this report
      const collections = await Collections.find({
        locationReportId: reportIdOrMachineId,
      });

      if (collections.length === 0) {
        console.warn(
          `   ℹ️ No collections found for report ${reportIdOrMachineId}`
        );
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
    console.error(
      `❌ Error fixing orphaned entries and duplicate dates:`,
      error
    );
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
      const machine = await Machine.findById(machineId).lean();
      if (!machine) continue;

      const machineData = machine as Record<string, unknown>;
      const history =
        (machineData.collectionMetersHistory as Record<string, unknown>[]) ||
        [];

      if (history.length === 0) continue;

      console.warn(
        `   🔧 Processing machine ${machineData.serialNumber || machineId} with ${history.length} history entries`
      );

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
          console.warn(
            `   🗑️ Removing orphaned history entry: ${entry.locationReportId} (hasCollections: ${!!hasCollections}, hasReport: ${!!hasReport})`
          );
          hasChanges = true;
        } else {
          console.warn(
            `   ✅ Keeping valid history entry: ${entry.locationReportId} (hasCollections: ${!!hasCollections}, hasReport: ${!!hasReport})`
          );
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
          console.warn(
            `   🔧 Found ${entries.length} duplicate entries with locationReportId ${reportId}`
          );

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

            console.warn(
              `   ✅ Keeping best entry (score: ${bestScore}), removing ${entries.length - 1} duplicates`
            );

            // Remove all entries with this locationReportId except the best one
            cleanedHistory = cleanedHistory.filter(entry => {
              if (entry.locationReportId === reportId) {
                return entry === bestEntry;
              }
              return true;
            });

            hasChanges = true;
          } else {
            console.warn(
              `   ⚠️ No matching collection found for locationReportId ${reportId}, keeping all entries`
            );
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
          console.warn(
            `   🔧 Found ${entries.length} duplicate entries for date ${date}`
          );

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

          console.warn(
            `   ✅ Keeping best entry for date ${date}, removing ${entries.length - 1} duplicates`
          );

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
      console.warn(
        `   🔄 Syncing ALL history entries with their collections...`
      );
      console.warn(`   Total cleaned entries: ${cleanedHistory.length}`);
      console.warn(
        `   Total collections available: ${allMachineCollections.length}`
      );

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
              console.warn(
                `      Before: prevMetersIn=${entry.prevMetersIn}, prevMetersOut=${entry.prevMetersOut}`
              );
              syncMadeChanges = true;
            }

            // Sync ALL fields with the collection (source of truth)
            entry.metersIn = matchingCollection.metersIn;
            entry.metersOut = matchingCollection.metersOut;
            entry.prevMetersIn = matchingCollection.prevIn || 0;
            entry.prevMetersOut = matchingCollection.prevOut || 0;
            entry.timestamp = new Date(matchingCollection.timestamp);

            if (valuesDiffer) {
              console.warn(
                `      After: prevMetersIn=${entry.prevMetersIn}, prevMetersOut=${entry.prevMetersOut}`
              );
            }
          } else {
            console.warn(
              `   ⚠️ No matching collection found for ${entry.locationReportId}`
            );
          }
        }
      }

      // Update if either cleanup made changes OR sync made changes
      if (hasChanges || syncMadeChanges) {
        console.warn(
          `   💾 Saving history to database... (hasChanges=${hasChanges}, syncMadeChanges=${syncMadeChanges})`
        );
        const updateResult = await Machine.findByIdAndUpdate(
          machineId,
          {
            $set: { collectionMetersHistory: cleanedHistory },
          },
          { new: true }
        );

        if (!updateResult) {
          console.warn(
            `   ❌ Phase 3 update FAILED! findByIdAndUpdate returned null`
          );
          console.warn(`      Trying findOneAndUpdate instead...`);
          const updateResultAlt = await Machine.findOneAndUpdate(
            { _id: machineId },
            { $set: { collectionMetersHistory: cleanedHistory } },
            { new: true }
          );
          if (!updateResultAlt) {
            console.warn(`   ❌ findOneAndUpdate ALSO FAILED!`);
          } else {
            console.warn(`   ✅ findOneAndUpdate SUCCEEDED!`);
          }
        } else {
          console.warn(`   ✅ Phase 3 update successful!`);
        }

        fixResults.issuesFixed.machineHistoryFixed++;
        console.warn(
          `   ✅ Fixed and synced machine history for machine ${machineData.serialNumber || machineId}`
        );
      } else {
        console.warn(
          `   ℹ️ No changes needed for machine ${machineData.serialNumber || machineId} - history already matches collections`
        );
      }
    }
  } catch (error) {
    console.error(
      `❌ Error fixing orphaned entries and duplicate dates:`,
      error
    );
    fixResults.errors.push({
      collectionId: 'machine-history-cleanup',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
