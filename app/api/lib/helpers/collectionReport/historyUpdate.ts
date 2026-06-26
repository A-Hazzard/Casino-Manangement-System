/**
 * Report History Update Helpers
 *
 * This module provides functions for updating machine collectionMetersHistory from collection reports:
 * - Validating collections belong to the report
 * - Updating or creating history entries with correct prevIn/prevOut
 * - Updating machine current meters
 * - Marking collections as completed
 *
 * @module app/api/lib/helpers/reportHistoryUpdate
 */

import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { calculateMovement } from '@/lib/utils/movement';
import type { GamingMachine } from '@/shared/types';

export type MachineChange = {
  machineId: string;
  locationReportId: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  collectionId: string;
  timestamp?: Date;
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
};

export type UpdateHistoryPayload = {
  changes: MachineChange[];
};

/**
 * Update machine collectionMetersHistory from a collection report
 *
 * Flow:
 * 1. Verify report exists
 * 2. For each change:
 *    - Validate collection belongs to report and machine
 *    - Fetch actual collection to get correct prevIn/prevOut
 *    - Check if history entry exists
 *    - Update or create history entry
 *    - Update machine current meters
 *    - Mark collection as completed
 * 3. Return results summary
 *
 * @param reportId - Collection report ID (locationReportId)
 * @param changes - Array of machine changes to apply
 * @returns Object containing update summary and any errors
 */
export async function updateReportMachineHistories(
  reportId: string,
  changes: MachineChange[]
): Promise<{
  updated: number;
  failed: number;
  errors: Array<{ machineId: string; error: string }>;
}> {
  if (!reportId) {
    console.error('[updateReportMachineHistories] reportId is required');
    throw new Error('[updateReportMachineHistories] reportId is required');
  }
  if (!Array.isArray(changes)) {
    console.error('[updateReportMachineHistories] changes is required');
    throw new Error('[updateReportMachineHistories] changes is required');
  }

  // Verify report exists
  const report = await CollectionReport.findOne({
    locationReportId: reportId,
  });
  if (!report) {
    throw new Error('Collection report not found');
  }

  console.warn(
    `🔄 Starting batch history update for report ${reportId} with ${changes.length} changes`
  );

  const results = {
    updated: 0,
    failed: 0,
    errors: [] as Array<{ machineId: string; error: string }>,
  };

  // Load helpers once and process all machine changes in parallel.
  // Each change targets a different machine within the same report, so the
  // per-machine recalculations and meter updates are independent.
  const [{ recalculateMachineCollections }, { updateRegularAndRamClearMeters }] =
    await Promise.all([
      import('./recalculation'),
      import('./reportCreation'),
    ]);

  const changeResults = await Promise.all(
    changes.map(change =>
      processSingleMachineChange(
        reportId,
        change,
        recalculateMachineCollections,
        updateRegularAndRamClearMeters
      )
    )
  );

  for (const changeResult of changeResults) {
    if (changeResult.success) {
      results.updated++;
    } else {
      results.failed++;
      results.errors.push({
        machineId: changeResult.machineId,
        error: changeResult.error || 'Unknown error',
      });
    }
  }

  console.warn(
    `✅ Machine history updates completed: ${results.updated} succeeded, ${results.failed} failed`
  );

  return results;
}

type ChangeResult = {
  machineId: string;
  success: boolean;
  error?: string;
};

/**
 * Process a single machine change: validate, update/create history, update meters
 *
 * @param reportId - Collection report ID
 * @param change - Machine change to process
 * @param recalculateMachineCollections - Recalculation helper
 * @param updateRegularAndRamClearMeters - Meter upsert helper
 */
async function processSingleMachineChange(
  reportId: string,
  change: MachineChange,
  recalculateMachineCollections: (
    machineId: string,
    writeSasMeters?: boolean
  ) => Promise<void>,
  updateRegularAndRamClearMeters: (
    collectionDocument: import('@/lib/types/collection').CollectionDocument
  ) => Promise<{ success: boolean }>
): Promise<ChangeResult> {
  if (!reportId) {
    console.error('[processSingleMachineChange] reportId is required');
    return { machineId: change?.machineId || '', success: false, error: 'reportId is required' };
  }
  if (!change) {
    console.error('[processSingleMachineChange] change is required');
    return { machineId: '', success: false, error: 'change is required' };
  }
  const { machineId, collectionId } = change;

  // Verify the collection exists and belongs to this report
  console.warn(`🔍 Validating collection:`, {
    collectionId,
    reportId,
    machineId,
  });

  const collection = await Collections.findOne({
    _id: collectionId,
    locationReportId: reportId,
    machineId: machineId,
  });

  if (!collection) {
    // Try to find the collection with just _id to see if it exists at all
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const collectionById = await Collections.findOne({ _id: collectionId });

    console.error(`⚠️ Collection validation failed:`, {
      collectionId,
      expectedReportId: reportId,
      expectedMachineId: machineId,
      collectionExists: !!collectionById,
      actualLocationReportId: collectionById?.locationReportId,
      actualMachineId: collectionById?.machineId,
      machineIdMatch: collectionById?.machineId === machineId,
      reportIdMatch: collectionById?.locationReportId === reportId,
    });

    return {
      machineId,
      success: false,
      error: `Collection not found or mismatch. Collection exists: ${!!collectionById}, ReportId match: ${collectionById?.locationReportId === reportId}, MachineId match: ${collectionById?.machineId === machineId}`,
    };
  }

  console.warn(`✅ Collection validated successfully for machine ${machineId}`);

  // Retrieve the Machine document to check online/offline status
  const machineDoc = await Machine.findOne({ _id: machineId }).lean<GamingMachine>();
  const hasRelay = !!machineDoc?.relayId?.trim();
  const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000;
  const isOffline =
    hasRelay &&
    (!machineDoc?.lastActivity ||
      Date.now() - new Date(machineDoc.lastActivity).getTime() >= OFFLINE_THRESHOLD_MS);

  const isActuallyOffline = isOffline || !!collection.meterId;

  // Calculate the new movement values
  const previousMeters = {
    metersIn: Number(change.prevMetersIn),
    metersOut: Number(change.prevMetersOut),
  };
  const movement = calculateMovement(
    Number(change.metersIn),
    Number(change.metersOut),
    previousMeters,
    change.ramClear,
    undefined,
    undefined,
    change.ramClearMetersIn,
    change.ramClearMetersOut
  );

  const roundedMovement = {
    metersIn: Number(movement.metersIn.toFixed(2)),
    metersOut: Number(movement.metersOut.toFixed(2)),
    gross: Number(movement.gross.toFixed(2)),
  };

  // ============================================================================
  // STEP 1: Synchronize collection document with values from frontend
  // ============================================================================
  // The frontend payload (change object) contains the most up-to-date meter values
  // entered by the user. We must persist these to the Collections document first
  // to serve as the anchor for recalculation.
  const syncedCollection = await Collections.findOneAndUpdate(
    { _id: collectionId },
    {
      $set: {
        metersIn: Number(change.metersIn),
        metersOut: Number(change.metersOut),
        prevIn: Number(change.prevMetersIn),
        prevOut: Number(change.prevMetersOut),
        collectionTime: change.timestamp
          ? new Date(change.timestamp)
          : undefined,
        timestamp: change.timestamp ? new Date(change.timestamp) : undefined,
        ramClear: change.ramClear,
        ramClearMetersIn: change.ramClearMetersIn,
        ramClearMetersOut: change.ramClearMetersOut,
        movement: roundedMovement,
        editedWhileOnline: !isActuallyOffline,
        ...(isActuallyOffline
          ? {
              'sasMeters.drop': roundedMovement.metersIn,
              'sasMeters.totalCancelledCredits': roundedMovement.metersOut,
              'sasMeters.gross': roundedMovement.gross,
            }
          : {}),
        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!syncedCollection) {
    console.error(`❌ Failed to sync collection ${collectionId}`);
    return {
      machineId,
      success: false,
      error: 'Failed to synchronize collection data',
    };
  }

  // ============================================================================
  // STEP 2: Trigger recalculation cascade
  // ============================================================================
  // Use recalculateMachineCollections with the current collection as an anchor.
  // This calculates movement, softMeters, and propagates prevMeters to any
  // future collections of this machine. It also updates the Machine document's
  // current meters and its entire collectionMetersHistory array.
  try {
    // writeSasMeters=true: this is the finalising path (submit), so sasMeters
    // must be updated for noSMIB locations.
    await recalculateMachineCollections(machineId, true);
    console.warn(`🔄 Recalculation cascade completed for machine ${machineId}`);
  } catch (recalcError) {
    console.error(
      '[processSingleMachineChange] Error:',
      recalcError instanceof Error ? recalcError.message : 'Unknown error'
    );
    // Continue even if cascade fails, as the current report entry is already synced
  }

  // ============================================================================
  // STEP 2.5: Ensure manual Meters documents exist / recreate if missing
  // ============================================================================
  // For no-SMIB locations, Meters documents are created manually and may have
  // been soft-deleted or hard-deleted. Call updateRegularAndRamClearMeters to
  // update existing meters or recreate them if they are missing from the DB.
  try {
    await updateRegularAndRamClearMeters(syncedCollection);
    console.warn(
      `🔄 Meters recreated/updated for machine ${machineId} collection ${collectionId}`
    );
  } catch (metersError) {
    console.error(
      '[processSingleMachineChange] Error updating/recreating Meters documents:',
      metersError instanceof Error ? metersError.message : 'Unknown error'
    );
    // Non-fatal: meter recreation failure should not roll back the collection update
  }

  // ============================================================================
  // STEP 3: Mark collection as completed and update machine timestamp
  // ============================================================================
  // Mark the collection as completed since it's part of a finalized report
  await Collections.findOneAndUpdate(
    { _id: collectionId },
    {
      $set: {
        isCompleted: true,
        updatedAt: new Date(),
      },
    }
  );

  // Update machine's collectionTime to match this finalized collection
  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        collectionTime:
          syncedCollection.collectionTime ||
          syncedCollection.timestamp ||
          new Date(),
        updatedAt: new Date(),
      },
    }
  );

  console.warn(
    `✅ Successfully finalized machine ${machineId} and updated history chain`
  );
  return { machineId, success: true };
}
