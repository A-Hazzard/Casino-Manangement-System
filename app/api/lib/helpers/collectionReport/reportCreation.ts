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
import { Machine } from '@/app/api/lib/models/machines';
import UserModel from '@/app/api/lib/models/user';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import mongoose from 'mongoose';
import {
  calculateCollectionReportTotals,
  computeTotalVariation,
} from './calculations';
import { generateMongoId } from '../../../../../lib/utils/id';
import { Meters } from '../../models/meters';
import type { MetersData, GamingMachine } from '../../../../../shared/types';
import { Collections } from '../../models/collections';
import { GamingLocations } from '../../models/gaminglocations';

/**
 * Validates collection report payload
 *
 * @param {Partial<CreateCollectionReportPayload>} body - The collection report payload
 * @returns {{ isValid: boolean; error?: string }}
 */
export function validateCollectionReportPayload(
  body: Partial<CreateCollectionReportPayload>
): { isValid: boolean; error?: string } {
  if (!body) {
    return { isValid: false, error: 'Invalid payload: body is required' };
  }
  if (typeof body !== 'object') {
    return { isValid: false, error: 'Invalid payload: body must be an object' };
  }

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
 * @param {CreateCollectionReportPayload} body - The collection report payload
 * @returns {CreateCollectionReportPayload}
 */
export function sanitizeCollectionReportPayload(
  body: CreateCollectionReportPayload
): CreateCollectionReportPayload {
  if (!body) {
    console.error('[sanitizeCollectionReportPayload] body is required');
    return body;
  }
  if (typeof body !== 'object') {
    console.error('[sanitizeCollectionReportPayload] body must be an object');
    return body;
  }

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
 * @param {CreateCollectionReportPayload['machines']} machines - Array of machines from the payload
 * @param {string} locationReportId - The location report ID
 * @param {string[]} [collectionIds] - Optional array of specific collection IDs from the frontend
 * @returns {Promise<void>}
 */
async function updateCollectionsWithReportId(
  machines: CreateCollectionReportPayload['machines'],
  locationReportId: string,
  collectionIds?: string[]
): Promise<void> {
  if (!machines || !Array.isArray(machines)) {
    console.error('[updateCollectionsWithReportId] machines is required');
    return;
  }

  if (!locationReportId) {
    console.error(
      '[updateCollectionsWithReportId] locationReportId is required'
    );
    return;
  }

  // If we have collectionIds, update them directly by ID (most precise)
  if (collectionIds && collectionIds.length > 0) {
    await Collections.updateMany(
      { _id: { $in: collectionIds } },
      {
        $set: {
          locationReportId,
          isCompleted: true,
          updatedAt: new Date(),
        },
      }
    ).catch((err: unknown) => {
      console.warn(
        `Failed to update specific collection documents with reportId ${locationReportId}:`,
        err
      );
    });
    return;
  }

  // Fallback to fuzzy matching if no IDs provided
  for (const machine of machines) {
    if (!machine.machineId) continue;

    const normalizedMetersIn = Number(machine.metersIn) || 0;
    const normalizedMetersOut = Number(machine.metersOut) || 0;

    await Collections.updateMany(
      {
        machineId: machine.machineId,
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
        `Failed to update collection documents for machine ${machine.machineId}:`,
        err
      );
    });
  }
}

/**
 * Updates machine collection meters and history for a single machine
 *
 * CREATION FLOW ONLY — called when user clicks "Create Report" button.
 * Updates machine.collectionMeters and pushes to collectionMetersHistory.
 *
 * Do NOT use for EDIT flow — use PATCH /api/collection-reports/collections/[id]
 * @see PATCH /api/collection-reports/collections/[id] — for EDIT flow
 *
 * @param {string} machineId - The machine ID
 * @param {number} metersIn - Meters in value
 * @param {number} metersOut - Meters out value
 * @param {Date} collectionTime - Collection timestamp
 * @param {string} locationReportId - The location report ID
 * @param {string} [collectionId] - Optional collection document ID
 * @returns {Promise<void>}
 */
async function updateMachineCollectionData(
  machineId: string,
  metersIn: number,
  metersOut: number,
  collectionTime: Date,
  locationReportId: string,
  collectionId?: string
): Promise<void> {
  if (!machineId) {
    console.error('[updateMachineCollectionData] machineId is required');
    return;
  }

  if (!locationReportId) {
    console.error('[updateMachineCollectionData] locationReportId is required');
    return;
  }

  if (typeof metersIn !== 'number' || !Number.isFinite(metersIn)) {
    console.error(
      '[updateMachineCollectionData] metersIn must be a valid number'
    );
    return;
  }

  if (typeof metersOut !== 'number' || !Number.isFinite(metersOut)) {
    console.error(
      '[updateMachineCollectionData] metersOut must be a valid number'
    );
    return;
  }

  if (!collectionTime || !(collectionTime instanceof Date)) {
    console.error(
      '[updateMachineCollectionData] collectionTime must be a valid Date'
    );
    return;
  }

  // Run initial queries in parallel for better performance
  const [currentMachine, collectionDocument] = await Promise.all([
    Machine.findOne({ _id: machineId }).lean<GamingMachine>(),
    collectionId && locationReportId
      ? Collections.findOne({ _id: collectionId, locationReportId })
      : Collections.findOne({
          machineId,
          locationReportId,
          metersIn,
          metersOut,
          $or: [
            { collectionTime: collectionTime },
            { timestamp: collectionTime },
          ],
        }).sort({ timestamp: -1 }),
  ]);

  if (!currentMachine) return;

  // Fetch location to check for noSMIBLocation flag
  const gamingLocation = currentMachine.gamingLocation
    ? await GamingLocations.findOne({
        _id: currentMachine.gamingLocation,
      }).lean<{ noSMIBLocation?: boolean }>()
    : null;
  const isNoSasLocation = gamingLocation?.noSMIBLocation === true;

  const currentCollectionMeters = currentMachine.collectionMeters;
  const currentMachineCollectionTime = currentMachine.collectionTime;

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
    .lean<CollectionDocument>();

  const baselinePrevIn =
    previousCompletedCollection?.metersIn ??
    currentCollectionMeters?.metersIn ??
    0;
  const baselinePrevOut =
    previousCompletedCollection?.metersOut ??
    currentCollectionMeters?.metersOut ??
    0;

  // ============================================================================
  // IDEMPOTENCY CHECK: Check if this history entry already exists
  // ============================================================================
  const existingHistoryEntry = (
    currentMachine.collectionMetersHistory ?? []
  ).find(entry => entry.locationReportId === locationReportId);

  if (existingHistoryEntry)
    console.warn(
      `[updateMachineCollectionData] History entry for report ${locationReportId} already exists on machine ${machineId}. Skipping push.`
    );

  // Create collection history entry
  const historyEntry = {
    _id: new mongoose.Types.ObjectId().toHexString(),
    metersIn,
    metersOut,
    prevMetersIn: baselinePrevIn,
    prevMetersOut: baselinePrevOut,
    timestamp: collectionTime,
    locationReportId,
  };

  // Prepare all update operations
  const updatePromises: Promise<unknown>[] = [];

  // Prepare machine update
  const machineSetUpdate: Record<string, unknown> = {
    'collectionMeters.metersIn': metersIn,
    'collectionMeters.metersOut': metersOut,
    collectionTime,
    previousCollectionTime: currentMachineCollectionTime || undefined,
    updatedAt: new Date(),
  };

  // CRITICAL: Only update sasMeters directly if it's a "No SAS" location
  // For SAS locations, these fields must only be updated by the live SMIB relay
  if (isNoSasLocation) {
    machineSetUpdate['sasMeters.drop'] = metersIn;
    machineSetUpdate['sasMeters.totalCancelledCredits'] = metersOut;
  }

  const machineUpdateOps: Record<string, unknown> = {
    $set: machineSetUpdate,
  };

  // Only push if it doesn't already exist
  if (!existingHistoryEntry) {
    machineUpdateOps.$push = {
      collectionMetersHistory: historyEntry,
    };
  }

  // Update machine collectionMeters + timestamps
  updatePromises.push(
    Machine.findOneAndUpdate({ _id: machineId }, machineUpdateOps).catch(
      err => {
        console.error(
          '[updateMachineCollectionData] Error:',
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
    )
  );

  // Backfill locationReportId for any pre-existing history entries
  updatePromises.push(
    Machine.findOneAndUpdate(
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
    ).catch(err => {
      console.error(
        '[updateMachineCollectionData] Error:',
        err instanceof Error ? err.message : 'Unknown error'
      );
    })
  );

  // Execute all updates in parallel
  await Promise.all(updatePromises);
}

/**
 * Append meter IDs to the collections for reference
 *
 * @param {CreateCollectionReportPayload['machines'][number]['collectionId']} collectionId - The collection's _id
 * @param {MetersData[]} meters - Array of meters, either with ram clear or not
 * @returns {Promise<{ success: boolean }>}
 */
async function appendMeterIdsToCollections(
  collectionId: CreateCollectionReportPayload['machines'][number]['collectionId'],
  meters: MetersData[]
): Promise<{ success: boolean }> {
  if (!collectionId) {
    console.error('[appendMeterIdsToCollections] collectionId is required');
    return { success: false };
  }

  if (!meters || !Array.isArray(meters) || meters.length === 0) {
    console.error(
      '[appendMeterIdsToCollections] meters array is required and cannot be empty'
    );
    return { success: false };
  }

  try {
    //Ram clear meters would be of length 2 only
    if (meters.length == 2) {
      await Collections.updateOne(
        { _id: collectionId },
        {
          $set: {
            ramClearMeterId: meters[0]._id,
            meterId: meters[1]._id,
          },
        }
      );

      return { success: true };
    }

    await Collections.updateOne(
      { _id: collectionId },
      {
        $set: {
          meterId: meters[0]._id,
        },
      }
    );

    return { success: true };
  } catch (e) {
    console.error(
      '[appendMeterIdsToCollections] Error:',
      e instanceof Error ? e.message : 'Unknown error'
    );
    return { success: false };
  }
}

/**
 * Creates manual meter objects for each machine in the meters collection
 *
 * @param {CreateCollectionReportPayload['machines']} machines - The collection report payload
 * @param {Date} [sasEndTime] - Optional SAS end time to use for readAt
 * @returns {Promise<{ success: boolean }>}
 */
async function createManualMetersForEachMachine(
  machines: CreateCollectionReportPayload['machines'],
  sasEndTime?: Date
): Promise<{ success: boolean }> {
  if (!machines || !Array.isArray(machines)) {
    console.warn('[createManualMetersForEachMachine] No machines provided');
    return { success: true };
  }

  const metersToCreate: MetersData[] = [];

  console.log(
    `🔄 [createManualMetersForEachMachine] Starting meter creation for ${machines?.length || 0} machines`
  );

  const finalReadAt = sasEndTime || new Date();

  for (const machine of machines ?? []) {
    console.log(
      `🔄 [createManualMetersForEachMachine] Processing machine: ${machine.machineId}, ramClear: ${machine.ramClear}`
    );

    const collectionId = machine.collectionId;
    const baseReadAt = finalReadAt;
    const baseCreatedAt = new Date();

    // Shared variables used in BOTH RAM clear and non-RAM clear blocks
    const currentMetersIn = machine.metersIn;
    const currentMetersOut = machine.metersOut;
    const previousMetersIn = machine.prevMetersIn || 0;
    const previousMetersOut = machine.prevMetersOut || 0;

    // Standard movement values (used only in non-RAM clear path)
    const movementIn = currentMetersIn - previousMetersIn;
    const movementOut = currentMetersOut - previousMetersOut;

    if (machine.ramClear) {
      // RAM CLEAR: Create 2 meters
      // Meter 1 (RAM clear meter): captures movement from previous collection up to the reset point
      // Meter 2 (current meter): captures movement from 0 (after reset) to current reading
      const ramClearMetersIn = machine.ramClearMetersIn || 0;
      const ramClearMetersOut = machine.ramClearMetersOut || 0;

      // RAM clear meter movement = peak before reset minus previous collection baseline
      const ramClearMovementIn = ramClearMetersIn - previousMetersIn;
      const ramClearMovementOut = ramClearMetersOut - previousMetersOut;

      // RAM Clear Meter (holds RAM clear movement values)
      const ramClearMeterId = await generateMongoId();
      console.log(
        `🔄 [createManualMetersForEachMachine] Generated RAM clear meter ID: ${ramClearMeterId}`
      );

      const ramClearMeter = {
        _id: ramClearMeterId,
        machine: machine.machineId,
        location: machine.locationId,
        movement: {
          coinIn: 0,
          coinOut: 0,
          jackpot: 0,
          totalHandPaidCancelledCredits: 0,
          totalCancelledCredits: ramClearMovementOut,
          gamesPlayed: 0,
          gamesWon: 0,
          currentCredits: 0,
          totalWonCredits: 0,
          drop: ramClearMovementIn,
        },
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        totalHandPaidCancelledCredits: 0,
        totalCancelledCredits: ramClearMetersOut,
        gamesPlayed: 0,
        gamesWon: 0,
        currentCredits: 0,
        totalWonCredits: 0,
        drop: ramClearMetersIn,
        meterSource: 'COLLECTION_REPORT' as const,
        isRamClear: true,
        readAt: baseReadAt, // This is now sasEndTime if provided
        createdAt: baseCreatedAt,
      };

      metersToCreate.push(ramClearMeter);
      console.log(
        `✅ [createManualMetersForEachMachine] Added RAM clear meter`
      );

      // Current Meter (uses currentMetersIn/Out for main fields, movement uses calculated values)
      const currentMeterId = await generateMongoId();
      console.log(
        `🔄 [createManualMetersForEachMachine] Generated current meter ID: ${currentMeterId}`
      );

      const currentMeterReadAt = new Date(baseReadAt.getTime() + 1000);
      const currentMeterCreatedAt = new Date(baseCreatedAt.getTime() + 1000);

      // After a RAM clear the machine resets to 0, so post-reset movement = currentMeters - 0
      const postResetMovementIn = currentMetersIn;
      const postResetMovementOut = currentMetersOut;

      const currentMeter = {
        _id: currentMeterId,
        machine: machine.machineId,
        location: machine.locationId,
        movement: {
          coinIn: 0,
          coinOut: 0,
          jackpot: 0,
          totalHandPaidCancelledCredits: 0,
          totalCancelledCredits: postResetMovementOut,
          gamesPlayed: 0,
          gamesWon: 0,
          currentCredits: 0,
          totalWonCredits: 0,
          drop: postResetMovementIn,
        },
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        totalHandPaidCancelledCredits: 0,
        totalCancelledCredits: currentMetersOut,
        gamesPlayed: 0,
        gamesWon: 0,
        currentCredits: 0,
        totalWonCredits: 0,
        drop: currentMetersIn,
        meterSource: 'COLLECTION_REPORT' as const,
        readAt: currentMeterReadAt,
        createdAt: currentMeterCreatedAt,
      };

      metersToCreate.push(currentMeter);
      console.log(
        `✅ [createManualMetersForEachMachine] Added current meter (RAM clear)`
      );

      // Append 2 meter IDs (RAM clear + current)
      const thisMachineMeters = metersToCreate.slice(-2);
      await appendMeterIdsToCollections(collectionId, thisMachineMeters);
      console.log(
        `[createManualMetersForEachMachine] Appended 2 meter IDs for collection ${collectionId}`
      );
    } else {
      // NOT RAM CLEAR: Create 1 meter only
      const currentMeterId = await generateMongoId();
      console.log(
        `🔄 [createManualMetersForEachMachine] Generated current meter ID: ${currentMeterId}`
      );

      const currentMeter = {
        _id: currentMeterId,
        machine: machine.machineId,
        location: machine.locationId,
        movement: {
          coinIn: 0,
          coinOut: 0,
          jackpot: 0,
          totalHandPaidCancelledCredits: 0,
          totalCancelledCredits: movementOut, // movement.totalCancelledCredits
          gamesPlayed: 0,
          gamesWon: 0,
          currentCredits: 0,
          totalWonCredits: 0,
          drop: movementIn, // movement.drop
        },
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        totalHandPaidCancelledCredits: 0,
        totalCancelledCredits: currentMetersOut, // NOT movementOut
        gamesPlayed: 0,
        gamesWon: 0,
        currentCredits: 0,
        totalWonCredits: 0,
        drop: currentMetersIn, // NOT movementIn
        meterSource: 'COLLECTION_REPORT' as const,
        readAt: baseReadAt,
        createdAt: baseCreatedAt,
      };

      metersToCreate.push(currentMeter);
      console.log(
        `✅ [createManualMetersForEachMachine] Added current meter (non-RAM clear)`
      );

      // Append 1 meter ID
      const thisMachineMeters = metersToCreate.slice(-1);
      await appendMeterIdsToCollections(collectionId, thisMachineMeters);
      console.log(
        `[createManualMetersForEachMachine] Appended 1 meter ID for collection ${collectionId}`
      );
    }
  }

  // ============================================================================
  // INSERT ALL METERS INTO DATABASE
  // ============================================================================
  try {
    if (metersToCreate.length === 0) {
      console.log('ℹ️ [createManualMetersForEachMachine] No meters to create');
      return { success: true };
    }

    console.log(
      `🔄 [createManualMetersForEachMachine] Inserting ${metersToCreate.length} meters into database.\n\n\n${metersToCreate}`
    );
    const createdMeters = await Meters.insertMany(metersToCreate);
    console.log(
      `✅ [createManualMetersForEachMachine] Successfully created ${createdMeters.length} meters`
    );
    createdMeters.forEach((meter, index) => {
      console.log(
        `   Meter ${index + 1}: ID=${(meter as Record<string, unknown>)._id}, machine=${(meter as Record<string, unknown>).machine}`
      );
    });

    return { success: true };
  } catch (error) {
    console.error(
      '[createManualMetersForEachMachine] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return { success: false };
  }
}

/**
 * Updates regular and ram clear meters per machine collection
 * @param {CollectionDocument} collectionDocument - The colllection to be updated for the report
 * @param {string} [ramClearMeterId] - The ram clear meter ID used for collectionDocument that were ramCleared
 * @returns {Promise<{success: true}>}
 */
export async function updateRegularAndRamClearMeters(
  collectionDocument: CollectionDocument
): Promise<{ success: boolean }> {
  if (!collectionDocument) {
    console.error(
      '[updateRegularAndRamClearMeters] collectionDocument is required'
    );
    return { success: false };
  }
  if (!collectionDocument._id) {
    console.error(
      '[updateRegularAndRamClearMeters] collectionDocument._id is required'
    );
    return { success: false };
  }

  console.log(
    `[updateRegularAndRamClearMeters] Processing collection ${collectionDocument._id}`,
    {
      ramClearMeterId: collectionDocument.ramClearMeterId,
      meterId: collectionDocument.meterId,
      ramClearMetersIn: collectionDocument.ramClearMetersIn,
      ramClearMetersOut: collectionDocument.ramClearMetersOut,
      metersIn: collectionDocument.metersIn,
      metersOut: collectionDocument.metersOut,
      prevIn: collectionDocument.prevIn,
      prevOut: collectionDocument.prevOut,
    }
  );

  if (collectionDocument.ramClearMeterId || collectionDocument.meterId) {
    try {
      const operations = [];
      let ramClearMovementData = {};

      console.log('[updateRegularAndRamClearMeters] Check RAM clear:', {
        hasRamClearMeterId: !!collectionDocument.ramClearMeterId,
        hasMeterId: !!collectionDocument.meterId,
        ramClearMetersIn: collectionDocument.ramClearMetersIn,
        hasBoth: !!(
          collectionDocument.ramClearMetersIn &&
          collectionDocument.ramClearMetersOut
        ),
      });

      if (
        collectionDocument.ramClearMetersIn &&
        collectionDocument.ramClearMetersOut
      ) {
        const prevInVal = collectionDocument.prevIn || 0;
        const prevOutVal = collectionDocument.prevOut || 0;

        // Validate RAM clear meters are not less than previous values
        if (collectionDocument.ramClearMetersIn < prevInVal) {
          console.warn(
            `[updateRegularAndRamClearMeters] WARNING: RAM clear metersIn (${collectionDocument.ramClearMetersIn}) is less than previous value (${prevInVal})`
          );
        }
        if (collectionDocument.ramClearMetersOut < prevOutVal) {
          console.warn(
            `[updateRegularAndRamClearMeters] WARNING: RAM clear metersOut (${collectionDocument.ramClearMetersOut}) is less than previous value (${prevOutVal})`
          );
        }

        ramClearMovementData = {
          'movement.drop': collectionDocument.ramClearMetersIn - prevInVal,
          'movement.totalCancelledCredits':
            collectionDocument.ramClearMetersOut - prevOutVal,
          drop: collectionDocument.ramClearMetersIn,
          totalCancelledCredits: collectionDocument.ramClearMetersOut,
        };
        console.log(
          '[updateRegularAndRamClearMeters] RAM clear movement:',
          ramClearMovementData
        );
      }

      const regularPrevIn = collectionDocument.ramClear ? 0 : (collectionDocument.prevIn || 0);
      const regularPrevOut = collectionDocument.ramClear ? 0 : (collectionDocument.prevOut || 0);
      const movementData = {
        'movement.drop': collectionDocument.metersIn - regularPrevIn,
        'movement.totalCancelledCredits':
          collectionDocument.metersOut - regularPrevOut,
        drop: collectionDocument.metersIn,
        totalCancelledCredits: collectionDocument.metersOut,
      };
      console.log(
        '[updateRegularAndRamClearMeters] Regular movement:',
        movementData
      );

      const newReadAtVal =
        collectionDocument.sasMeters?.sasEndTime ??
        collectionDocument.timestamp ??
        new Date();
      const newReadAt =
        typeof newReadAtVal === 'string'
          ? new Date(newReadAtVal)
          : newReadAtVal;
      const now = new Date();

      console.log(
        `[updateRegularAndRamClearMeters] Setting readAt → ${newReadAt.toISOString()}, updatedAt → ${now.toISOString()}`
      );

      if (collectionDocument.ramClearMeterId) {
        console.log(
          '[updateRegularAndRamClearMeters] Adding RAM clear update filter:',
          { _id: collectionDocument.ramClearMeterId }
        );
        operations.push({
          updateOne: {
            filter: { _id: collectionDocument.ramClearMeterId },
            update: {
              $set: {
                ...ramClearMovementData,
                readAt: newReadAt,
                updatedAt: now,
              },
            },
          },
        });
      }

      if (collectionDocument.meterId) {
        console.log(
          '[updateRegularAndRamClearMeters] Adding regular update filter:',
          { _id: collectionDocument.meterId }
        );

        // Debug: Check if these meters exist
        const ramCheck = await Meters.findOne({
          _id: collectionDocument.ramClearMeterId,
        }).lean();
        const regCheck = await Meters.findOne({
          _id: collectionDocument.meterId,
        }).lean();
        console.log('[updateRegularAndRamClearMeters] Meter lookup:', {
          ramExists: !!ramCheck,
          regExists: !!regCheck,
          ramId: collectionDocument.ramClearMeterId,
          regId: collectionDocument.meterId,
        });

        operations.push({
          updateOne: {
            filter: { _id: collectionDocument.meterId },
            update: {
              $set: {
                ...movementData,
                readAt: newReadAt,
                updatedAt: now,
              },
            },
          },
        });
      }

      console.log(
        '[updateRegularAndRamClearMeters] Operations:',
        operations.length
      );

      if (operations.length > 0) {
        const result = await Meters.bulkWrite(operations);
        console.log('[updateRegularAndRamClearMeters] BulkWrite result:', {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }
    } catch (e) {
      console.error(
        '[updateRegularAndRamClearMeters] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return { success: false };
    }
  } else {
    console.warn(
      '[updateRegularAndRamClearMeters] No meter IDs on collection - skipping'
    );
  }

  return { success: true };
}

/**
 * Creates a collection report and updates all related data
 *
 * @param {CreateCollectionReportPayload} body - The collection report payload
 * @returns {Promise<{ success: boolean; report?: unknown; error?: string }>}
 */
export async function createCollectionReport(
  body: CreateCollectionReportPayload
): Promise<{ success: boolean; report?: unknown; error?: string }> {
  if (!body) {
    console.error('[createCollectionReport] body is required');
    return { success: false, error: 'body is required' };
  }

  const startTime = Date.now();

  try {
    console.log('🔄 [createCollectionReport] Starting report creation...', {
      locationReportId: body.locationReportId,
      machinesCount: body.machines?.length || 0,
      collectionIdsCount: body.collectionIds?.length || 0,
      collectionIds: body.collectionIds,
    });

    // Calculate totals
    console.log('🔄 [createCollectionReport] Calculating totals...');
    const payloadWithMachines: CreateCollectionReportPayload = body.machines
      ? {
          ...body,
          machines: body.machines.map(machine => ({
            collectionId: machine.collectionId,
            machineId: machine.machineId,
            locationId: machine.locationId,
            metersIn: machine.metersIn,
            metersOut: machine.metersOut,
            prevMetersIn:
              (machine as unknown as { prevMetersIn?: number }).prevMetersIn ??
              0,
            prevMetersOut:
              (machine as unknown as { prevMetersOut?: number })
                .prevMetersOut ?? 0,
            timestamp: machine.timestamp ?? body.timestamp,
            locationReportId: machine.locationReportId ?? body.locationReportId,
            ramClear: machine.ramClear,
            ramClearMetersIn: machine.ramClearMetersIn,
            ramClearMetersOut: machine.ramClearMetersOut,
          })), //Summary of Machines added to the collections (api/lib/models/collections.ts)
        }
      : body;
    console.log('payloadWithMachines', payloadWithMachines);
    const calculated = await calculateCollectionReportTotals(
      payloadWithMachines as CreateCollectionReportPayload & {
        machines?: never;
        collectionIds?: string[];
      }
    );
    console.log('✅ [createCollectionReport] Totals calculated:', calculated);

    // Look up collector details if body.collector (User ID) is provided
    let resolvedCollectorName = body.collectorName;
    if (!resolvedCollectorName && body.collector) {
      try {
        const userDoc = await UserModel.findOne({ _id: body.collector }).lean<{ username?: string }>();
        if (userDoc?.username) {
          resolvedCollectorName = userDoc.username;
        }
      } catch (error) {
        console.error('Failed to look up collector user:', error);
      }
    }

    // Convert timestamp fields
    const doc = {
      ...body,
      collectorName: resolvedCollectorName,
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
        body.machines,
        body.locationReportId,
        body.collectionIds
      );
      console.log(
        '✅ [createCollectionReport] Collections updated with report ID'
      );

      // Update machine collection data for all machines in parallel
      const machinesToUpdate = body.machines.filter(
        machine => machine.machineId
      );
      const collectionIds = body.collectionIds || [];
      console.log(
        `🔄 [createCollectionReport] Updating machine collection data for ${machinesToUpdate.length} machines in parallel...`
      );
      const machineUpdatePromises = machinesToUpdate.map(
        async (machine, index) => {
          try {
            const normalizedMetersIn = Number(machine.metersIn) || 0;
            const normalizedMetersOut = Number(machine.metersOut) || 0;
            const collectionTimestamp = new Date(body.timestamp);
            // Use collection ID if available to ensure we update the correct document
            const collectionId = collectionIds[index] || undefined;

            console.log(
              `🔄 [createCollectionReport] Updating machine ${index + 1}/${machinesToUpdate.length}: ${machine.machineId}${collectionId ? ` (collectionId: ${collectionId})` : ''}`
            );
            await updateMachineCollectionData(
              machine.machineId!,
              normalizedMetersIn,
              normalizedMetersOut,
              collectionTimestamp,
              body.locationReportId,
              collectionId
            );
            return { success: true, machineId: machine.machineId };
          } catch (machineError) {
            console.error(
              '[createCollectionReport] Error:',
              machineError instanceof Error
                ? machineError.message
                : 'Unknown error'
            );
            return {
              success: false,
              machineId: machine.machineId,
              error: machineError,
            };
          }
        }
      );

      const machineUpdateResults = await Promise.all(machineUpdatePromises);
      const successful = machineUpdateResults.filter(
        result => result.success
      ).length;
      const failed = machineUpdateResults.filter(
        result => !result.success
      ).length;

      console.log(
        `✅ [createCollectionReport] Machine collection data updated: ${successful} successful, ${failed} failed`
      );

      if (failed > 0) {
        console.warn(
          `⚠️ [createCollectionReport] ${failed} machine(s) failed to update:`,
          machineUpdateResults
            .filter(result => !result.success)
            .map(result => result.machineId)
        );
      }
    }

    // Compute and store total variation from collections
    try {
      const totalVariationValue = await computeTotalVariation(
        body.locationReportId,
        body.location
      );
      await CollectionReport.findOneAndUpdate(
        { locationReportId: body.locationReportId },
        { $set: { totalVariation: Number(totalVariationValue.toFixed(2)) } }
      );
      console.log(
        `✅ [createCollectionReport] totalVariation stored: ${totalVariationValue}`
      );
    } catch (varErr) {
      console.error(
        '[createCollectionReport] totalVariation update failed (non-fatal):',
        varErr instanceof Error ? varErr.message : 'Unknown error'
      );
    }

    // Only create manual meters for no-SMIB locations
    const reportLocation = await GamingLocations.findOne({
      _id: body.location,
    }).lean<{ noSMIBLocation?: boolean }>();
    if (reportLocation?.noSMIBLocation) {
      const collectionIds = body.collectionIds || [];

      // Use each machine's timestamp from the payload directly — it is the authoritative
      // collection end time set by the user and already stored on the collection document.
      // Re-querying the DB and pulling sasMeters.sasEndTime introduced stale timestamps.
      const machinesWithCollectionIds = body.machines?.map(
        (machine, index) => ({
          ...machine,
          collectionId: collectionIds[index],
        })
      );

      const firstMachine = machinesWithCollectionIds?.[0];
      const sasEndTime = firstMachine?.timestamp
        ? new Date(firstMachine.timestamp)
        : new Date();
      await createManualMetersForEachMachine(
        machinesWithCollectionIds,
        sasEndTime
      );
    } else
      console.log(
        '[createCollectionReport] Skipping manual meter creation — location is not a SMIB location'
      );

    // ============================================================================
    // Update the GamingLocation's previousCollectionTime with the most recent sasEndTime
    // ============================================================================
    if (body.collectionIds && body.collectionIds.length > 0) {
      try {
        const collections = await Collections.find({ _id: { $in: body.collectionIds } }).lean<{ sasMeters?: { sasEndTime?: Date } }[]>();
        let maxSasEndTime: Date | undefined;
        for (const col of collections) {
          if (col.sasMeters?.sasEndTime) {
            const colSasTime = new Date(col.sasMeters.sasEndTime);
            if (!maxSasEndTime || colSasTime > maxSasEndTime) {
              maxSasEndTime = colSasTime;
            }
          }
        }
        if (maxSasEndTime) {
          await GamingLocations.findOneAndUpdate(
            { _id: body.location },
            { $set: { previousCollectionTime: maxSasEndTime } }
          );
          console.log(`✅ [createCollectionReport] Updated GamingLocation previousCollectionTime to ${maxSasEndTime}`);
        }
      } catch (locationUpdateErr) {
        console.error(
          '[createCollectionReport] Failed to update GamingLocation previousCollectionTime:',
          locationUpdateErr instanceof Error ? locationUpdateErr.message : 'Unknown error'
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ [createCollectionReport] Report creation completed successfully in ${duration}ms`
    );

    return { success: true, report: created };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[createCollectionReport] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
