/**
 * Collection Report Creation Helper
 */

import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { calculateCollectionReportTotals } from '@/lib/helpers/collectionReportCalculations';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import mongoose from 'mongoose';

/**
 * Validates collection report payload
 *
 * @param body - The collection report payload
 * @returns { isValid: boolean; error?: string }
 */
export function validateCollectionReportPayload(
  body: Partial<CreateCollectionReportPayload>
): { isValid: boolean; error?: string } {
  const requiredFields = [
    'variance',
    'previousBalance',
    'currentBalance',
    'amountToCollect',
    'amountCollected',
    'amountUncollected',
    'partnerProfit',
    'taxes',
    'advance',
    'collector', // User ID (changed from collectorName)
    'locationName',
    'locationReportId',
    'location',
    'timestamp',
  ];

  for (const field of requiredFields) {
    if (
      body[field as keyof CreateCollectionReportPayload] === undefined ||
      body[field as keyof CreateCollectionReportPayload] === null
    ) {
      return {
        isValid: false,
        error: `Missing required field: ${field}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Sanitizes string fields in collection report payload
 *
 * @param body - The collection report payload
 * @returns Sanitized payload
 */
export function sanitizeCollectionReportPayload(
  body: CreateCollectionReportPayload
): CreateCollectionReportPayload {
  const stringFields = [
    'collector',
    'locationName',
    'locationReportId',
    'location',
    'varianceReason',
    'reasonForShortagePayment',
    'balanceCorrectionReas',
  ];

  const bodyRecord: Record<string, unknown> = body as Record<string, unknown>;
  stringFields.forEach(field => {
    if (bodyRecord[field] && typeof bodyRecord[field] === 'string') {
      bodyRecord[field] = (bodyRecord[field] as string).trim();
    }
  });

  return bodyRecord as CreateCollectionReportPayload;
}

/**
 * Updates collection documents with locationReportId
 *
 * @param machines - Array of machines from the payload
 * @param locationReportId - The location report ID
 * @returns Promise<void>
 */
export async function updateCollectionsWithReportId(
  machines: Array<{
    machineId?: string;
    metersIn?: number;
    metersOut?: number;
  }>,
  locationReportId: string
): Promise<void> {
  for (const m of machines) {
    if (!m.machineId) continue;

    const normalizedMetersIn = Number(m.metersIn) || 0;
    const normalizedMetersOut = Number(m.metersOut) || 0;

    await Collections.updateMany(
      {
        machineId: m.machineId,
        metersIn: normalizedMetersIn,
        metersOut: normalizedMetersOut,
        $or: [
          { locationReportId: '' },
          { locationReportId: { $exists: false } },
        ],
      },
      {
        $set: {
          locationReportId,
          isCompleted: true,
          updatedAt: new Date(),
        },
      }
    ).catch((err: unknown) => {
      console.warn(
        `Failed to update collection documents for machine ${m.machineId}:`,
        err
      );
    });
  }
}

/**
 * Updates machine collection meters and history for a single machine
 *
 * @param machineId - The machine ID
 * @param metersIn - Meters in value
 * @param metersOut - Meters out value
 * @param collectionTime - Collection timestamp
 * @param locationReportId - The location report ID
 * @returns Promise<void>
 */
export async function updateMachineCollectionData(
  machineId: string,
  metersIn: number,
  metersOut: number,
  collectionTime: Date,
  locationReportId: string
): Promise<void> {
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const currentMachine = await Machine.findOne({ _id: machineId }).lean();
  if (!currentMachine) return;

  const currentMachineData = currentMachine as Record<string, unknown>;
  const currentCollectionMeters = currentMachineData.collectionMeters as
    | { metersIn: number; metersOut: number }
    | undefined;
  const currentMachineCollectionTime = currentMachineData.collectionTime as
    | Date
    | undefined;

  // Find the collection document we just marked as completed
  const collectionDocument = await Collections.findOne({
    machineId,
    locationReportId,
    metersIn,
    metersOut,
  }).sort({ timestamp: -1 });

  // Determine true previous meters from the latest completed collection
  const previousCompletedCollection = await Collections.findOne({
    machineId,
    isCompleted: true,
    locationReportId: { $exists: true, $ne: '' },
    ...(collectionDocument?._id
      ? { _id: { $ne: collectionDocument._id } }
      : {}),
    $or: [
      { collectionTime: { $lt: collectionTime } },
      { timestamp: { $lt: collectionTime } },
    ],
  })
    .sort({ collectionTime: -1, timestamp: -1 })
    .lean();

  const baselinePrevIn =
    previousCompletedCollection?.metersIn ??
    currentCollectionMeters?.metersIn ??
    0;
  const baselinePrevOut =
    previousCompletedCollection?.metersOut ??
    currentCollectionMeters?.metersOut ??
    0;

  // Update collection document with prevIn/prevOut
  if (collectionDocument?._id) {
    await Collections.updateOne(
      { _id: collectionDocument._id },
      {
        $set: {
          prevIn: baselinePrevIn,
          prevOut: baselinePrevOut,
        },
      }
    ).catch((err: unknown) => {
      console.error(
        `Failed to update prevIn/prevOut for collection ${collectionDocument._id}:`,
        err
      );
    });
  }

  // Update machine collectionMeters + timestamps
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        'collectionMeters.metersIn': metersIn,
        'collectionMeters.metersOut': metersOut,
        collectionTime,
        previousCollectionTime: currentMachineCollectionTime || undefined,
        updatedAt: new Date(),
      },
    }
  ).catch((err: unknown) => {
    console.error(
      `Failed to update collectionMeters for machine ${machineId}:`,
      err
    );
  });

  // Backfill locationReportId for any pre-existing history entries
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        'collectionMetersHistory.$[elem].locationReportId': locationReportId,
      },
    },
    {
      arrayFilters: [
        {
          'elem.metersIn': metersIn,
          'elem.metersOut': metersOut,
          $or: [
            { 'elem.locationReportId': '' },
            { 'elem.locationReportId': { $exists: false } },
          ],
        },
      ],
      new: true,
    }
  ).catch((err: unknown) => {
    console.error(
      `Failed to update history entry identifiers for machine ${machineId}:`,
      err
    );
  });

  // Create collection history entry
  const historyEntry = {
    _id: new mongoose.Types.ObjectId(),
    metersIn,
    metersOut,
    prevMetersIn: baselinePrevIn,
    prevMetersOut: baselinePrevOut,
    timestamp: collectionTime,
    locationReportId,
  };

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $push: {
        collectionMetersHistory: historyEntry,
      },
    }
  );

  // Update gaming location's previousCollectionTime
  const gamingLocationId = currentMachineData.gamingLocation as string;
  if (gamingLocationId) {
    const { GamingLocations } = await import(
      '@/app/api/lib/models/gaminglocations'
    );
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    await GamingLocations.findOneAndUpdate(
      { _id: gamingLocationId },
      {
        $set: {
          previousCollectionTime: collectionTime,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).catch((err: unknown) => {
      console.error(
        `Failed to update previousCollectionTime for gaming location ${gamingLocationId}:`,
        err
      );
    });
  }
}

/**
 * Creates a collection report and updates all related data
 *
 * @param body - The collection report payload
 * @returns Promise<{ success: boolean; data?: unknown; error?: string }>
 */
export async function createCollectionReport(
  body: CreateCollectionReportPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // Calculate totals on backend
    const calculated = await calculateCollectionReportTotals(body);

    // Convert timestamp fields
    const doc = {
      ...body,
      ...calculated,
      _id: body.locationReportId,
      timestamp: new Date(body.timestamp),
      previousCollectionTime: body.previousCollectionTime
        ? new Date(body.previousCollectionTime)
        : undefined,
    };

    const created = await CollectionReport.create(doc);

    // Update all collection documents with the locationReportId
    if (body.machines && Array.isArray(body.machines)) {
      await updateCollectionsWithReportId(
        body.machines.map(
          (m: {
            machineId: string;
            metersIn: number | string;
            metersOut: number | string;
          }) => ({
            machineId: m.machineId,
            metersIn:
              typeof m.metersIn === 'string'
                ? parseFloat(m.metersIn)
                : (m.metersIn ?? 0),
            metersOut:
              typeof m.metersOut === 'string'
                ? parseFloat(m.metersOut)
                : (m.metersOut ?? 0),
          })
        ),
        body.locationReportId
      );

      // Update machine collection data for each machine
      for (const m of body.machines) {
        if (!m.machineId) continue;

        const normalizedMetersIn = Number(m.metersIn) || 0;
        const normalizedMetersOut = Number(m.metersOut) || 0;
        const collectionTimestamp = new Date(
          m.collectionTime || body.timestamp
        );

        await updateMachineCollectionData(
          m.machineId,
          normalizedMetersIn,
          normalizedMetersOut,
          collectionTimestamp,
          body.locationReportId
        );
      }
    }

    return { success: true, data: created._id };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
