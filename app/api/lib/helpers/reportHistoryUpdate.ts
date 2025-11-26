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

import mongoose from 'mongoose';
import { CollectionReport } from '../models/collectionReport';
import { Collections } from '../models/collections';
import { Machine } from '../models/machines';

export type MachineChange = {
  machineId: string;
  locationReportId: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  collectionId: string;
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
  const { machineId, locationReportId, collectionId } = change;

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

  // Check if machine exists
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const machine = await Machine.findOne({ _id: machineId });
  if (!machine) {
    console.warn(`⚠️ Machine ${machineId} not found`);
    results.failed++;
    results.errors.push({
      machineId,
      error: 'Machine not found',
    });
    return;
  }

  // Fetch the actual collection document to get CORRECT prevIn/prevOut
  // The collection's prevIn/prevOut may have been recalculated by the backend
  // Don't trust the frontend payload which may have stale values
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const actualCollection = await Collections.findOne({ _id: collectionId });
  if (!actualCollection) {
    console.error(`❌ Collection ${collectionId} not found`);
    results.failed++;
    results.errors.push({
      machineId,
      error: 'Collection not found',
    });
    return;
  }

  const historyEntryExists = machine.collectionMetersHistory?.some(
    (h: { locationReportId: string }) => h.locationReportId === locationReportId
  );

  if (historyEntryExists) {
    // UPDATE existing history entry
    await updateExistingHistoryEntry(
      machineId,
      locationReportId,
      actualCollection,
      results
    );
  } else {
    // CREATE new history entry
    await createNewHistoryEntry(
      machineId,
      locationReportId,
      actualCollection,
      results
    );
  }

  // Update machine's current collectionMeters
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate({ _id: machineId }, {
    $set: {
      'collectionMeters.metersIn': actualCollection.metersIn,
      'collectionMeters.metersOut': actualCollection.metersOut,
      collectionTime: new Date(),
      updatedAt: new Date(),
    },
  });

  // Mark the collection as completed since it's part of a finalized report
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Collections.findOneAndUpdate({ _id: collectionId }, {
    $set: {
      isCompleted: true,
      updatedAt: new Date(),
    },
  });

  console.warn(
    `✅ Updated machine ${machineId} history, meters, and marked collection as completed`
  );
  results.updated++;
}

/**
 * Update existing history entry for a machine
 *
 * @param machineId - Machine ID
 * @param locationReportId - Report ID for the history entry
 * @param actualCollection - Actual collection document with correct values
 * @param results - Results object to update on failure
 */
async function updateExistingHistoryEntry(
  machineId: string,
  locationReportId: string,
  actualCollection: { metersIn: number; metersOut: number; prevIn: number; prevOut: number },
  results: {
    failed: number;
    errors: Array<{ machineId: string; error: string }>;
  }
): Promise<void> {
  console.warn(
    `🔄 Updating existing history entry for machine ${machineId}, reportId ${locationReportId}`
  );

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  const historyUpdateResult = await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        'collectionMetersHistory.$[elem].metersIn': actualCollection.metersIn,
        'collectionMetersHistory.$[elem].metersOut':
          actualCollection.metersOut,
        'collectionMetersHistory.$[elem].prevMetersIn':
          actualCollection.prevIn,
        'collectionMetersHistory.$[elem].prevMetersOut':
          actualCollection.prevOut,
        'collectionMetersHistory.$[elem].timestamp': new Date(),
        updatedAt: new Date(),
      },
    },
    {
      arrayFilters: [
        {
          'elem.locationReportId': locationReportId,
        },
      ],
      new: true,
    }
  );

  if (!historyUpdateResult) {
    console.warn(`⚠️ Failed to update history for machine ${machineId}`);
    results.failed++;
    results.errors.push({
      machineId,
      error: 'Failed to update machine history',
    });
  }
}

/**
 * Create new history entry for a machine
 *
 * @param machineId - Machine ID
 * @param locationReportId - Report ID for the history entry
 * @param actualCollection - Actual collection document with correct values
 * @param results - Results object to update on failure
 */
async function createNewHistoryEntry(
  machineId: string,
  locationReportId: string,
  actualCollection: { metersIn: number; metersOut: number; prevIn: number; prevOut: number },
  results: {
    failed: number;
    errors: Array<{ machineId: string; error: string }>;
  }
): Promise<void> {
  console.warn(
    `✨ Creating NEW history entry for machine ${machineId}, reportId ${locationReportId}`
  );

  const historyEntry = {
    _id: new mongoose.Types.ObjectId(),
    metersIn: actualCollection.metersIn,
    metersOut: actualCollection.metersOut,
    prevMetersIn: actualCollection.prevIn,
    prevMetersOut: actualCollection.prevOut,
    timestamp: new Date(),
    locationReportId: locationReportId,
  };

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  const historyCreateResult = await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $push: {
        collectionMetersHistory: historyEntry,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!historyCreateResult) {
    console.warn(`⚠️ Failed to create history for machine ${machineId}`);
    results.failed++;
    results.errors.push({
      machineId,
      error: 'Failed to create machine history',
    });
  }
}

