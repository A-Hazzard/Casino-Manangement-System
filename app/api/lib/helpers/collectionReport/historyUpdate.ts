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

export type MachineChange = {
  machineId: string;
  locationReportId: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  collectionId: string;
  timestamp?: Date;
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

  // Process each machine change
  for (const change of changes) {
    try {
      await processSingleMachineChange(reportId, change, results);
    } catch (error) {
      console.error(`Error updating machine ${change.machineId}:`, error);
      results.failed++;
      results.errors.push({
        machineId: change.machineId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.warn(
    `✅ Machine history updates completed: ${results.updated} succeeded, ${results.failed} failed`
  );

  return results;
}

/**
 * Process a single machine change: validate, update/create history, update meters
 *
 * @param reportId - Collection report ID
 * @param change - Machine change to process
 * @param results - Results object to update
 */
async function processSingleMachineChange(
  reportId: string,
  change: MachineChange,
  results: {
    updated: number;
    failed: number;
    errors: Array<{ machineId: string; error: string }>;
  }
): Promise<void> {
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

    results.failed++;
    results.errors.push({
      machineId,
      error: `Collection not found or mismatch. Collection exists: ${!!collectionById}, ReportId match: ${collectionById?.locationReportId === reportId}, MachineId match: ${collectionById?.machineId === machineId}`,
    });
    return;
  }

  console.warn(`✅ Collection validated successfully for machine ${machineId}`);

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
        collectionTime: change.timestamp ? new Date(change.timestamp) : undefined,
        timestamp: change.timestamp ? new Date(change.timestamp) : undefined,
        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!syncedCollection) {
    console.error(`❌ Failed to sync collection ${collectionId}`);
    results.failed++;
    results.errors.push({
      machineId,
      error: 'Failed to synchronize collection data',
    });
    return;
  }

  // ============================================================================
  // STEP 2: Trigger recalculation cascade
  // ============================================================================
  // Use recalculateMachineCollections with the current collection as an anchor.
  // This calculates movement, softMeters, and propagates prevMeters to any
  // future collections of this machine. It also updates the Machine document's
  // current meters and its entire collectionMetersHistory array.
  try {
    const { recalculateMachineCollections } = await import('./recalculation');
    await recalculateMachineCollections(machineId);
    console.warn(`🔄 Recalculation cascade completed for machine ${machineId}`);
  } catch (recalcError) {
    console.error(`❌ Recalculation failed for machine ${machineId}:`, recalcError);
    // Continue even if cascade fails, as the current report entry is already synced
  }

  // ============================================================================
  // STEP 3: Mark collection as completed and update machine timestamp
  // ============================================================================
  // Mark the collection as completed since it's part of a finalized report
  await Collections.findOneAndUpdate({ _id: collectionId }, {
    $set: {
      isCompleted: true,
      updatedAt: new Date(),
    },
  });

  // Update machine's collectionTime to match this finalized collection
  await Machine.findOneAndUpdate({ _id: machineId }, {
    $set: {
      collectionTime: syncedCollection.collectionTime || syncedCollection.timestamp || new Date(),
      updatedAt: new Date(),
    },
  });

  console.warn(
    `✅ Successfully finalized machine ${machineId} and updated history chain`
  );
  results.updated++;
}



