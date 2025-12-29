/**
 * Collection Report Operations Helper
 *
 * This file contains helper functions for collection report operations,
 * including updating reports, cascading timestamp changes, and deleting reports.
 */

import { CollectionReport } from '../models/collectionReport';
import { Collections } from '../models/collections';
import { Machine } from '../models/machines';
import { recalculateMachineCollections } from './collectionRecalculation';
import type { CreateCollectionReportPayload } from '@/lib/types/api';

/**
 * Updates collection report timestamp and cascades changes to related collections and gaming locations
 *
 * @param reportId - The collection report ID
 * @param newTimestamp - The new timestamp to apply
 * @param locationId - The location ID associated with the report
 * @returns Promise<void>
 */
async function cascadeTimestampUpdate(
  reportId: string,
  newTimestamp: Date,
  locationId?: string
): Promise<void> {
  // Update all collections with the new timestamp
  const collections = await Collections.find({
    locationReportId: reportId,
  });

  for (const collection of collections) {
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    await Collections.findOneAndUpdate({ _id: collection._id }, {
      collectionTime: newTimestamp,
      timestamp: newTimestamp,
      updatedAt: new Date(),
    });
  }

  // Update gaming location's previousCollectionTime if this is the latest report
  if (locationId) {
    const latestReport = await CollectionReport.findOne({
      location: locationId,
    }).sort({ timestamp: -1 });

    if (
      latestReport &&
      latestReport.locationReportId === reportId
    ) {
      const GamingLocations = (
        await import('@/app/api/lib/models/gaminglocations')
      ).GamingLocations;
      // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
      await GamingLocations.findOneAndUpdate({ _id: locationId }, {
        previousCollectionTime: newTimestamp,
        updatedAt: new Date(),
      });
    }
  }
}

/**
 * Gets all machine IDs affected by a collection report
 *
 * @param reportId - The collection report ID
 * @returns Promise<string[]> - Array of machine IDs
 */
async function getAffectedMachineIds(
  reportId: string
): Promise<string[]> {
  try {
    const machineIds = await Collections.distinct('machineId', {
      locationReportId: reportId,
      machineId: { $exists: true, $ne: null },
    });
    return machineIds.map(id => (typeof id === 'string' ? id : String(id)));
  } catch (error) {
    console.error(
      'Failed to fetch machine IDs for cascade update:',
      error
    );
    return [];
  }
}

/**
 * Recalculates collections for multiple machines
 *
 * @param machineIds - Array of machine IDs to recalculate
 * @returns Promise<void>
 */
async function recalculateMultipleMachineCollections(
  machineIds: string[]
): Promise<void> {
  for (const machineId of machineIds) {
    try {
      await recalculateMachineCollections(machineId);
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
 * Removes collection history entries from machines for a given report ID
 *
 * @param reportId - The collection report ID
 * @returns Promise<number> - Number of machines updated
 */
export async function removeCollectionHistoryFromMachines(
  reportId: string
): Promise<number> {
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

    return updateResult.modifiedCount;
  } catch (error) {
    console.error('Failed to remove collection history entries:', error);
    return 0;
  }
}

/**
 * Finds the previous collection for a machine to determine revert values
 *
 * @param machineId - The machine ID
 * @param currentCollectionTime - The current collection timestamp
 * @returns Promise<{ metersIn: number; metersOut: number } | null>
 */
async function findPreviousCollectionForRevert(
  machineId: string,
  currentCollectionTime: Date
): Promise<{ metersIn: number; metersOut: number } | null> {
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
    .lean();

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
 * @param collections - Array of collections to revert
 * @returns Promise<void>
 */
export async function revertMachineCollectionMeters(
  collections: Array<{ machineId?: string; collectionTime?: Date; timestamp?: Date }>
): Promise<void> {
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

      const revertToMetersIn = previousCollection?.metersIn || 0;
      const revertToMetersOut = previousCollection?.metersOut || 0;

      // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
      await Machine.findOneAndUpdate({ _id: collection.machineId }, {
        $set: {
          'collectionMeters.metersIn': revertToMetersIn,
          'collectionMeters.metersOut': revertToMetersOut,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(
        `Failed to revert collection meters for machine ${collection.machineId}:`,
        error
      );
      // Continue with other machines even if one fails
    }
  }
}

/**
 * Updates a collection report with the provided data
 *
 * @param reportId - The collection report ID
 * @param updateData - The data to update
 * @returns Promise<{ success: boolean; data?: unknown; error?: string }>
 */
export async function updateCollectionReport(
  reportId: string,
  updateData: Partial<CreateCollectionReportPayload>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
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

  // Update the report
  const updatedReport = await CollectionReport.findOneAndUpdate(
    { locationReportId: reportId },
    {
      ...updateData,
      isEditing: false, // Mark as NOT editing when report is finalized
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

  return {
    success: true,
    data: updatedReport,
  };
}

