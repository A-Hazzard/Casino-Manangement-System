/**
 * Collection Report Operations Helper
 *
 * This file contains helper functions for collection report operations,
 * including updating reports, cascading timestamp changes, and deleting reports.
 */

import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { recalculateMachineCollections } from './recalculation';
import { computeTotalVariation } from './calculations';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { GamingLocations } from '../../models/gaminglocations';
import { CollectionReportDocument } from '../../types';
import { Meters } from '../../models/meters';

/**
 * Updates collection report timestamp and cascades changes to related collections and gaming locations
 *
 * @param {string} reportId - The collection report ID
 * @param {Date} newTimestamp - The new timestamp to apply
 * @param {string} [locationId] - The location ID associated with the report
 * @returns {Promise<void>}
 */
async function cascadeTimestampUpdate(
  reportId: string,
  newTimestamp: Date,
  locationId?: string
): Promise<void> {
  if (!reportId) {
    console.error('[cascadeTimestampUpdate] reportId is required');
    return;
  }
  if (!newTimestamp) {
    console.error('[cascadeTimestampUpdate] newTimestamp is required');
    return;
  }
  // Update all collections with the new timestamp
  const collections = await Collections.find({
    locationReportId: reportId,
  });

  for (const collection of collections) {
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    await Collections.findOneAndUpdate(
      { _id: collection._id },
      {
        collectionTime: newTimestamp,
        timestamp: newTimestamp,
        updatedAt: new Date(),
      }
    );
  }

  // Update gaming location's previousCollectionTime if this is the latest report
  if (locationId) {
    const latestReport = await CollectionReport.findOne({
      location: locationId,
    }).sort({ timestamp: -1 });

    if (latestReport && latestReport.locationReportId === reportId) {
      // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
      await GamingLocations.findOneAndUpdate(
        { _id: locationId },
        {
          previousCollectionTime: newTimestamp,
          updatedAt: new Date(),
        }
      );
    }
  }
}

/**
 * Gets all machine IDs affected by a collection report
 *
 * @param {string} reportId - The collection report ID
 * @returns {Promise<string[]>} - Array of machine IDs
 */
async function getAffectedMachineIds(reportId: string): Promise<string[]> {
  if (!reportId) {
    console.error('[getAffectedMachineIds] reportId is required');
    return [];
  }
  try {
    const machineIds = await Collections.distinct('machineId', {
      locationReportId: reportId,
      machineId: { $exists: true, $ne: null },
    });
    return machineIds.map(id => (typeof id === 'string' ? id : String(id)));
  } catch (error) {
    console.error('Failed to fetch machine IDs for cascade update:', error);
    return [];
  }
}

/**
 * Recalculates collections for multiple machines
 *
 * @param {string[]} machineIds - Array of machine IDs to recalculate
 * @returns {Promise<void>}
 */
async function recalculateMultipleMachineCollections(
  machineIds: string[]
): Promise<void> {
  if (!machineIds?.length) {
    console.error(
      '[recalculateMultipleMachineCollections] machineIds is required and cannot be empty'
    );
    return;
  }
  for (const machineId of machineIds) {
    try {
      // writeSasMeters=true: this is called from updateCollectionReport which
      // runs after the report is already finalized (post-submit edit).
      await recalculateMachineCollections(machineId, true);
    } catch (error) {
      console.error(
        `Failed to cascade recalculation for machine ${machineId}:`,
        error
      );
      // Continue with other machines even if one fails
    }
  }
}

/**
 * Removes collection history entries associated with a specific report ID from all machines
 *
 * @param {string} reportId - The report ID (locationReportId or _id) to remove
 * @returns {Promise<{ success: boolean; removedCount: number; error?: string }>}
 */
export async function removeCollectionHistoryFromMachines(
  reportId: string
): Promise<{ success: boolean; removedCount: number; error?: string }> {
  if (!reportId) {
    console.error('[removeCollectionHistoryFromMachines] reportId is required');
    return { success: false, removedCount: 0, error: 'reportId is required' };
  }
  try {
    // Try to remove by locationReportId first (new format)
    let updateResult = await Machine.updateMany(
      { 'collectionMetersHistory.locationReportId': reportId },
      {
        $pull: {
          collectionMetersHistory: {
            locationReportId: reportId,
          },
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    // If no matches found, try with string _id (old format)
    if (updateResult.modifiedCount === 0) {
      updateResult = await Machine.updateMany(
        { 'collectionMetersHistory._id': reportId },
        {
          $pull: {
            collectionMetersHistory: {
              _id: reportId,
            },
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    }

    return {
      success: true,
      removedCount: updateResult.modifiedCount,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[removeCollectionHistoryFromMachines] Error:', errorMsg);
    return { success: false, removedCount: 0, error: errorMsg };
  }
}

/**
 * Finds the previous collection for a machine to determine revert values
 *
 * @param {string} machineId - The machine ID
 * @param {Date} currentCollectionTime - The current collection timestamp
 * @returns {Promise<{ metersIn: number; metersOut: number } | null>}
 */
async function findPreviousCollectionForRevert(
  machineId: string,
  currentCollectionTime: Date
): Promise<{ metersIn: number; metersOut: number } | null> {
  if (!machineId) {
    console.error('[findPreviousCollectionForRevert] machineId is required');
    return null;
  }
  if (!currentCollectionTime) {
    console.error(
      '[findPreviousCollectionForRevert] currentCollectionTime is required'
    );
    return null;
  }
  const previousCollection = await Collections.findOne({
    machineId,
    $and: [
      {
        $or: [
          { collectionTime: { $lt: currentCollectionTime } },
          { timestamp: { $lt: currentCollectionTime } },
        ],
      },
      {
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      },
      { isCompleted: true },
    ],
  })
    .sort({ collectionTime: -1, timestamp: -1 })
    .lean<CollectionDocument>();

  if (previousCollection) {
    return {
      metersIn: previousCollection.metersIn || 0,
      metersOut: previousCollection.metersOut || 0,
    };
  }

  return null;
}

/**
 * Reverts collection meters for machines associated with a collection report
 *
 * When reverting, if there's no other collection for the machine, preserve the
 * collectionMeters to the prevIn/prevOut of the collection being deleted.
 * Collections should be deleted AFTER preserving the machine collectionMeters.
 *
 * @param {Array<{ machineId?: string; collectionTime?: Date; timestamp?: Date; prevIn?: number; prevOut?: number }>} collections - Array of collections to revert
 * @returns {Promise<{ success: boolean; revertedCount: number; errors: string[] }>}
 */
export async function revertMachineCollectionMeters(
  collections: Array<{
    machineId?: string;
    collectionTime?: Date;
    timestamp?: Date;
    prevIn?: number;
    prevOut?: number;
  }>
): Promise<{ success: boolean; revertedCount: number; errors: string[] }> {
  if (!collections || collections.length === 0) {
    console.warn(
      '[revertMachineCollectionMeters] No collections to revert - skipping'
    );
    return { success: true, revertedCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let revertedCount = 0;

  for (const collection of collections) {
    if (!collection.machineId) {
      continue;
    }

    try {
      const collectionTime =
        collection.collectionTime || collection.timestamp || new Date();
      const previousCollection = await findPreviousCollectionForRevert(
        collection.machineId,
        collectionTime
      );

      // CRITICAL: If no previous collection exists, use the prevIn/prevOut from the collection being deleted
      // This preserves the machine's state before this collection was created
      const revertToMetersIn =
        previousCollection?.metersIn ?? collection.prevIn ?? 0;
      const revertToMetersOut =
        previousCollection?.metersOut ?? collection.prevOut ?? 0;

      const updateResult = await Machine.findOneAndUpdate(
        { _id: collection.machineId },
        {
          $set: {
            'collectionMeters.metersIn': revertToMetersIn,
            'collectionMeters.metersOut': revertToMetersOut,
            updatedAt: new Date(),
          },
        }
      );

      if (!updateResult) {
        console.warn(
          `[revertMachineCollectionMeters] Machine ${collection.machineId} not found in database — skipping meter revert`
        );
        continue;
      }

      revertedCount++;
    } catch (error) {
      const errorMsg = `Failed to revert collection meters for machine ${collection.machineId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[revertMachineCollectionMeters] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  return {
    success: errors.length === 0,
    revertedCount,
    errors,
  };
}
/**
 * Updates a collection report with the provided data
 *
 * @param {string} reportId - The collection report ID
 * @param {Partial<CreateCollectionReportPayload>} updateData - The data to update
 * @returns {Promise<{ success: boolean; data?: unknown; error?: string }>}
 */
export async function updateCollectionReport(
  reportId: string,
  updateData: Partial<CreateCollectionReportPayload>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (!reportId) {
    console.error('[updateCollectionReport] reportId is required');
    return { success: false, error: 'Missing required parameters' };
  }
  if (!updateData) {
    console.error('[updateCollectionReport] updateData is required');
    return { success: false, error: 'Missing required parameters' };
  }
  const existingReport = await CollectionReport.findOne({
    locationReportId: reportId,
  });
  if (!existingReport) {
    return {
      success: false,
      error: 'Collection Report not found',
    };
  }

  // Check if timestamp is being changed
  const isTimestampChanged =
    updateData.timestamp &&
    new Date(updateData.timestamp).getTime() !==
      existingReport.timestamp.getTime();

  // CRITICAL: Do not update the collector field during edit
  delete updateData.collector;
  delete updateData.collectorName;

  // Update the report
  const updatedReport = await CollectionReport.findOneAndUpdate(
    { locationReportId: reportId },
    {
      ...updateData,
      updatedAt: new Date(),
    },
    { new: true }
  );

  if (!updatedReport) {
    return {
      success: false,
      error: 'Failed to update collection report',
    };
  }

  // Cascade timestamp changes if needed
  if (isTimestampChanged && updateData.timestamp) {
    try {
      await cascadeTimestampUpdate(
        reportId,
        new Date(updateData.timestamp),
        updatedReport.location
      );
    } catch (error) {
      console.error(
        'Error updating related data after timestamp change:',
        error
      );
    }
  }

  // Recalculate affected machines
  const affectedMachineIds = await getAffectedMachineIds(reportId);
  await recalculateMultipleMachineCollections(affectedMachineIds);

  // Compute and store total variation from collections after recalculation
  try {
    const totalVariationValue = await computeTotalVariation(
      reportId,
      updatedReport.location
    );
    await CollectionReport.findOneAndUpdate(
      { locationReportId: reportId },
      { $set: { totalVariation: Number(totalVariationValue.toFixed(2)) } }
    );
    console.log(
      `[updateCollectionReport] totalVariation stored: ${totalVariationValue}`
    );
  } catch (varErr) {
    console.warn(
      '[updateCollectionReport] totalVariation update failed (non-fatal):',
      varErr
    );
  }

  const finalReport = await CollectionReport.findOne({
    locationReportId: reportId,
  });

  return {
    success: true,
    data: finalReport ?? updatedReport,
  };
}

/**
 * Find & Delete Meters per collection report being deleted
 * @param {string} locationReportId - Unique identifier for the CR
 * @returns {Promise<{success: boolean; error?: string}>} - Returns success or error message
 */
export async function deleteManualMetersPerCollection(
  locationReportId: CollectionReportDocument['locationReportId'],
  archive?: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!locationReportId) {
    console.error(
      '[deleteManualMetersPerCollection] locationReportId is required'
    );
    return { success: false, error: 'locationReportId is required' };
  }

  try {
    const collections = await Collections.find({ locationReportId }).lean<
      CollectionDocument[]
    >();
    console.log(
      `[deleteManualMetersPerCollection] Found ${collections.length} collections to clean up meters for`
    );

    for (const collection of collections) {
      // Delete RAM clear meter if it exists (only for collections with RAM clear)
      if (collection.ramClearMeterId) {
        let ramClearResult;
        if (archive) {
          ramClearResult = await Meters.findOneAndUpdate(
            { _id: collection.ramClearMeterId },
            { $set: { deletedAt: new Date() } },
            { new: true }
          );
        } else {
          ramClearResult = await Meters.findOneAndDelete({
            _id: collection.ramClearMeterId,
          });
        }
        if (ramClearResult) {
          console.log(
            `[deleteManualMetersPerCollection] ${archive ? 'Archived' : 'Deleted'} ramClear meter ${collection.ramClearMeterId}`
          );
        } else {
          console.warn(
            `[deleteManualMetersPerCollection] ramClear meter ${collection.ramClearMeterId} not found — may have already been deleted/archived`
          );
        }
      }

      // Delete regular meter (all collections should have this)
      if (collection.meterId) {
        let meterResult;
        if (archive) {
          meterResult = await Meters.findOneAndUpdate(
            { _id: collection.meterId },
            { $set: { deletedAt: new Date() } },
            { new: true }
          );
        } else {
          meterResult = await Meters.findOneAndDelete({
            _id: collection.meterId,
          });
        }
        if (meterResult) {
          console.log(
            `[deleteManualMetersPerCollection] ${archive ? 'Archived' : 'Deleted'} meter ${collection.meterId}`
          );
        } else {
          console.warn(
            `[deleteManualMetersPerCollection] meter ${collection.meterId} not found — may have already been deleted/archived`
          );
        }
      } else {
        console.warn(
          `[deleteManualMetersPerCollection] Collection ${collection._id} has no meterId set`
        );
      }
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[deleteManualMetersPerCollection] Error:', errorMsg);
    return { success: false, error: errorMsg };
  }

  return { success: true };
}
