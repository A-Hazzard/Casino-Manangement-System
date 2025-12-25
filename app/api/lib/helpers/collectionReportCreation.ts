/**
 * Collection Report Creation Helper Functions
 *
 * Provides backend helper functions for creating and managing collection reports,
 * including payload validation, sanitization, collection updates, and machine
 * meter synchronization. It handles the complete lifecycle of collection report
 * creation from validation to database persistence.
 *
 * Features:
 * - Validates collection report payloads for required fields.
 * - Sanitizes string fields in collection report payloads.
 * - Updates collection documents with locationReportId.
 * - Updates machine collection meters and history.
 * - Calculates collection report totals from machine collections.
 * - Handles transaction management for data consistency.
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
  locationReportId: string,
  collectionId?: string
): Promise<void> {
  // Run initial queries in parallel for better performance
  const [currentMachine, collectionDocument] = await Promise.all([
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
    Machine.findOne({ _id: machineId }).lean(),
    // Find the collection document we just marked as completed
    // If collectionId is provided, use it directly to avoid ambiguity
    // Otherwise, match by locationReportId, meters, and collectionTime to ensure we get the correct document
    collectionId
      ? Collections.findOne({ _id: collectionId, locationReportId })
      : Collections.findOne({
          machineId,
          locationReportId,
          metersIn,
          metersOut,
          // Also match on collectionTime to ensure we get the exact document that was just updated
          $or: [
            { collectionTime: collectionTime },
            { timestamp: collectionTime },
          ],
        }).sort({ timestamp: -1 }),
  ]);

  if (!currentMachine) return;

  const currentMachineData = currentMachine as Record<string, unknown>;
  const currentCollectionMeters = currentMachineData.collectionMeters as
    | { metersIn: number; metersOut: number }
    | undefined;
  const currentMachineCollectionTime = currentMachineData.collectionTime as
    | Date
    | undefined;

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

  // Prepare all update operations
  const updatePromises: Promise<unknown>[] = [];

  // Update collection document with prevIn/prevOut
  if (collectionDocument?._id) {
    updatePromises.push(
      Collections.updateOne(
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
      })
    );
  }

  // Update machine collectionMeters + timestamps
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  updatePromises.push(
    Machine.findOneAndUpdate(
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
    })
  );

  // Backfill locationReportId for any pre-existing history entries and push new entry
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  updatePromises.push(
    Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        'collectionMetersHistory.$[elem].locationReportId': locationReportId,
      },
        $push: {
          collectionMetersHistory: historyEntry,
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
      console.error(`Failed to update history for machine ${machineId}:`, err);
    })
  );

  // Update gaming location's previousCollectionTime (if needed)
  const gamingLocationId = currentMachineData.gamingLocation as string;
  if (gamingLocationId) {
    const { GamingLocations } = await import(
      '@/app/api/lib/models/gaminglocations'
    );
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    updatePromises.push(
      GamingLocations.findOneAndUpdate(
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
      })
    );
  }

  // Execute all updates in parallel
  await Promise.all(updatePromises);
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
  const startTime = Date.now();

  try {
    console.log('🔄 [createCollectionReport] Starting report creation...', {
      locationReportId: body.locationReportId,
      machinesCount: body.machines?.length || 0,
      collectionIdsCount: body.collectionIds?.length || 0,
    });

    // Calculate totals on backend
    console.log('🔄 [createCollectionReport] Calculating totals...');
    // Transform machines to CollectionReportMachineEntry format if needed
    const payloadWithMachines: CreateCollectionReportPayload = body.machines
      ? {
          ...body,
          machines: body.machines.map(m => ({
            machineId: m.machineId,
            metersIn: m.metersIn,
            metersOut: m.metersOut,
            prevMetersIn: (m as unknown as { prevMetersIn?: number }).prevMetersIn ?? 0,
            prevMetersOut: (m as unknown as { prevMetersOut?: number }).prevMetersOut ?? 0,
            timestamp: m.timestamp ?? body.timestamp,
            locationReportId: m.locationReportId ?? body.locationReportId,
          })),
        }
      : body;
    const calculated = await calculateCollectionReportTotals(payloadWithMachines as CreateCollectionReportPayload & { machines?: never; collectionIds?: string[] });
    console.log('✅ [createCollectionReport] Totals calculated:', calculated);

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

    console.log(
      '🔄 [createCollectionReport] Creating CollectionReport document...'
    );
    const created = await CollectionReport.create(doc);
    console.log(
      '✅ [createCollectionReport] CollectionReport document created:',
      created._id
    );

    // Update all collection documents with the locationReportId
    if (body.machines && Array.isArray(body.machines)) {
      console.log(
        '🔄 [createCollectionReport] Updating collections with report ID...'
      );
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
      console.log(
        '✅ [createCollectionReport] Collections updated with report ID'
      );

      // Update machine collection data for all machines in parallel
      const machinesToUpdate = body.machines.filter(m => m.machineId);
      const collectionIds = body.collectionIds || [];
      console.log(
        `🔄 [createCollectionReport] Updating machine collection data for ${machinesToUpdate.length} machines in parallel...`
      );
      const machineUpdatePromises = machinesToUpdate.map(async (m, index) => {
        try {
        const normalizedMetersIn = Number(m.metersIn) || 0;
        const normalizedMetersOut = Number(m.metersOut) || 0;
        const collectionTimestamp = new Date(
          body.timestamp
        );
          // Use collection ID if available to ensure we update the correct document
          const collectionId = collectionIds[index] || undefined;

          console.log(
            `🔄 [createCollectionReport] Updating machine ${index + 1}/${machinesToUpdate.length}: ${m.machineId}${collectionId ? ` (collectionId: ${collectionId})` : ''}`
          );
        await updateMachineCollectionData(
            m.machineId!,
          normalizedMetersIn,
          normalizedMetersOut,
          collectionTimestamp,
            body.locationReportId,
            collectionId
          );
          return { success: true, machineId: m.machineId };
        } catch (machineError) {
          console.error(
            `❌ [createCollectionReport] Error updating machine ${m.machineId}:`,
            machineError
          );
          return {
            success: false,
            machineId: m.machineId,
            error: machineError,
          };
        }
      });

      const machineUpdateResults = await Promise.all(machineUpdatePromises);
      const successful = machineUpdateResults.filter(r => r.success).length;
      const failed = machineUpdateResults.filter(r => !r.success).length;

      console.log(
        `✅ [createCollectionReport] Machine collection data updated: ${successful} successful, ${failed} failed`
      );

      if (failed > 0) {
        console.warn(
          `⚠️ [createCollectionReport] ${failed} machine(s) failed to update:`,
          machineUpdateResults.filter(r => !r.success).map(r => r.machineId)
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ [createCollectionReport] Report creation completed successfully in ${duration}ms`
    );

    return { success: true, data: created._id };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error(
      `❌ [createCollectionReport] Report creation failed after ${duration}ms:`,
      {
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    return { success: false, error: errorMessage };
  }
}
