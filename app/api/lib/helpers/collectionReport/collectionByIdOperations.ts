/**
 * Collection by ID Operations Helper
 *
 * Extracted business logic for the PATCH /api/collection-reports/collections/[id] route.
 * Handles RAM clear toggle with relay checks, SAS time field extraction, movement and
 * SAS metrics recalculation, machine history updates, and activity logging.
 *
 * Features:
 * - Relay-aware RAM clear toggle handling
 * - SAS time field extraction and dot-notation payload building
 * - Movement recalculation with 4 SAS time resolution cases
 * - Machine collectionMetersHistory update with previous collection lookup
 * - Detailed activity logging with field-level change detection
 *
 * @module app/api/lib/helpers/collectionReport/collectionByIdOperations
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { handleRamClearToggle } from '@/app/api/lib/helpers/collectionReport/collectionOperations';
import { recalculateMachineCollections } from '@/app/api/lib/helpers/collectionReport/recalculation';
import { updateRegularAndRamClearMeters } from '@/app/api/lib/helpers/collectionReport/reportCreation';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { getClientIP } from '@/lib/utils/ipAddress';
import { calculateMovement } from '@/lib/utils/movement';
import type {
  CollectionDocument,
  PreviousCollectionMeters,
} from '@/lib/types/collection';
import type { GamingMachine } from '@/shared/types';
import type { NextRequest } from 'next/server';

// ============================================================================
// Type Definitions
// ============================================================================

type SasTimeExtractionResult = {
  payloadSasEndTime: string | Date | undefined;
  payloadSasStartTime: string | Date | undefined;
  hasPayloadSasEndTime: boolean;
  hasPayloadSasStartTime: boolean;
};

type RecalculationFlags = {
  shouldRecalculate: boolean;
  hasTimestampChange: boolean;
  needsSasTimeRecalculation: boolean;
};

type RamClearToggleResult = {
  unsetData: Record<string, number>;
};

// ============================================================================
// Relay Check
// ============================================================================

/**
 * Checks if a machine has a relay (SMIB device) by querying the relayId field.
 *
 * @param {string} machineId - The machine ID to check
 * @returns {Promise<boolean>} True if the machine has a relay
 */
export async function checkMachineHasRelay(machineId: string): Promise<boolean> {
  if (!machineId) {
    console.error('[checkMachineHasRelay] machineId is required');
    return false;
  }

  const machineDoc = await Machine.findOne(
    { _id: machineId },
    'relayId'
  ).lean<{ relayId?: string | null }>();

  return !!machineDoc?.relayId;
}

// ============================================================================
// RAM Clear Toggle with Relay Guard
// ============================================================================

/**
 * Handles RAM clear toggle for the collection-by-ID PATCH route. Only processes
 * the toggle for non-relay machines (relay machines have SMIB-managed meters).
 *
 * @param {CollectionDocument} originalCollection - The existing collection being updated
 * @param {Record<string, unknown>} updateData - The update payload (mutated in place)
 * @param {string | Date | undefined} explicitSasEndTime - Explicit SAS end time for readAt
 * @returns {Promise<RamClearToggleResult>} Fields to $unset on the collection document
 */
export async function handleRamClearToggleWithRelayGuard(
  originalCollection: CollectionDocument,
  updateData: Record<string, unknown>,
  explicitSasEndTime: string | Date | undefined
): Promise<RamClearToggleResult> {
  if (!originalCollection) {
    console.error('[handleRamClearToggleWithRelayGuard] originalCollection is required');
    return { unsetData: {} };
  }
  if (!updateData) {
    console.error('[handleRamClearToggleWithRelayGuard] updateData is required');
    return { unsetData: {} };
  }

  const ramClearChanged =
    updateData.ramClear !== undefined &&
    updateData.ramClear !== originalCollection.ramClear;

  if (!ramClearChanged) {
    return { unsetData: {} };
  }

  const hasRelay = originalCollection.machineId
    ? await checkMachineHasRelay(originalCollection.machineId)
    : false;

  if (hasRelay) {
    return { unsetData: {} };
  }

  return handleRamClearToggle(
    originalCollection,
    updateData,
    originalCollection.location,
    explicitSasEndTime
  );
}

// ============================================================================
// SAS Time Field Extraction
// ============================================================================

/**
 * Extracts SAS time fields from the update payload and removes them from the
 * top-level data to prevent Mongoose strict-mode from silently dropping them.
 * Also strips collector/collectorName to prevent ownership reassignment.
 *
 * @param {Record<string, unknown>} safeUpdateData - The update payload (mutated: SAS fields removed)
 * @returns {SasTimeExtractionResult} Extracted SAS time values and presence flags
 */
export function extractSasTimeFieldsFromPayload(
  safeUpdateData: Record<string, unknown>
): SasTimeExtractionResult {
  const payloadSasEndTime = safeUpdateData.sasEndTime as string | Date | undefined;
  const payloadSasStartTime = safeUpdateData.sasStartTime as string | Date | undefined;

  delete safeUpdateData.sasEndTime;
  delete safeUpdateData.sasStartTime;
  delete safeUpdateData.collector;
  delete safeUpdateData.collectorName;

  return {
    payloadSasEndTime,
    payloadSasStartTime,
    hasPayloadSasEndTime: payloadSasEndTime !== undefined,
    hasPayloadSasStartTime: payloadSasStartTime !== undefined,
  };
}

// ============================================================================
// Recalculation Flags
// ============================================================================

/**
 * Determines which recalculation steps are needed based on the update payload.
 *
 * @param {Record<string, unknown>} updateData - The raw update payload
 * @param {SasTimeExtractionResult} sasFields - Extracted SAS time field flags
 * @returns {RecalculationFlags} Flags indicating which recalculations to perform
 */
export function determineRecalculationFlags(
  updateData: Record<string, unknown>,
  sasFields: SasTimeExtractionResult
): RecalculationFlags {
  const shouldRecalculate =
    updateData.metersIn !== undefined ||
    updateData.metersOut !== undefined ||
    updateData.timestamp !== undefined ||
    updateData.collectionTime !== undefined ||
    updateData.ramClear !== undefined ||
    updateData.ramClearMetersIn !== undefined ||
    updateData.ramClearMetersOut !== undefined ||
    updateData.ramClearCoinIn !== undefined ||
    updateData.ramClearCoinOut !== undefined;

  const hasTimestampChange = updateData.timestamp !== undefined;
  const needsSasTimeRecalculation =
    hasTimestampChange && !sasFields.hasPayloadSasStartTime && !sasFields.hasPayloadSasEndTime;

  return { shouldRecalculate, hasTimestampChange, needsSasTimeRecalculation };
}

// ============================================================================
// SAS Time Resolution
// ============================================================================

function toDateSafe(val: Date | string | undefined): Date {
  if (!val) return new Date();
  return typeof val === 'string' ? new Date(val) : val;
}

/**
 * Resolves SAS time range based on 4 priority cases:
 * 1. Both SAS times explicitly provided
 * 2. Only sasEndTime provided (simple mode) - calculates sasStartTime
 * 3. Timestamp changed - recalculates both SAS times and metrics
 * 4. No changes - keeps existing times
 *
 * @param {CollectionDocument} updatedCollection - The collection after first update
 * @param {SasTimeExtractionResult} sasFields - Extracted SAS time fields
 * @param {RecalculationFlags} flags - Recalculation flags
 * @param {Record<string, unknown>} updateData - The raw update payload
 * @returns {Promise<{ finalSasStartTime: Date; finalSasEndTime: Date; sasMetersData: Record<string, unknown> | null }>}
 */
async function resolveSasTimeRange(
  updatedCollection: CollectionDocument,
  sasFields: SasTimeExtractionResult,
  flags: RecalculationFlags,
  updateData: Record<string, unknown>
): Promise<{
  finalSasStartTime: Date;
  finalSasEndTime: Date;
  sasMetersData: Record<string, unknown> | null;
}> {
  if (!updatedCollection.sasMeters) {
    return {
      finalSasStartTime: new Date(),
      finalSasEndTime: new Date(),
      sasMetersData: null,
    };
  }

  const existingSasMeters = updatedCollection.sasMeters;
  let sasMetersData: Record<string, unknown> = {
    ...existingSasMeters,
    machine: existingSasMeters.machine || updatedCollection.machineName || '',
    jackpot: Number((existingSasMeters.jackpot || 0).toFixed(2)),
    gamesPlayed: existingSasMeters.gamesPlayed || 0,
  };

  let finalSasStartTime = toDateSafe(existingSasMeters?.sasStartTime as Date | undefined);
  let finalSasEndTime = toDateSafe(existingSasMeters?.sasEndTime as Date | undefined);

  if (sasFields.hasPayloadSasStartTime && sasFields.hasPayloadSasEndTime) {
    finalSasStartTime = toDateSafe(sasFields.payloadSasStartTime as string | Date);
    finalSasEndTime = toDateSafe(sasFields.payloadSasEndTime as string | Date);
  } else if (sasFields.hasPayloadSasEndTime) {
    const userProvidedEndTime = toDateSafe(sasFields.payloadSasEndTime as string | Date);
    const { getSasTimePeriod } = await import('@/app/api/lib/helpers/collectionReport/creation');
    const { sasStartTime: calculatedStartTime } = await getSasTimePeriod(
      updatedCollection.machineId,
      undefined,
      userProvidedEndTime
    );
    finalSasStartTime = toDateSafe(calculatedStartTime);
    finalSasEndTime = userProvidedEndTime;
  } else if (flags.needsSasTimeRecalculation) {
    const newTimestamp = toDateSafe(updateData.timestamp as string | Date);
    const { getSasTimePeriod, calculateSasMetrics } = await import(
      '@/app/api/lib/helpers/collectionReport/creation'
    );
    const { sasStartTime: calculatedStartTime, sasEndTime: calculatedEndTime } =
      await getSasTimePeriod(updatedCollection.machineId, undefined, newTimestamp);
    finalSasStartTime = toDateSafe(calculatedStartTime);
    finalSasEndTime = toDateSafe(calculatedEndTime);

    const newSasMetrics = await calculateSasMetrics(
      updatedCollection.machineId,
      finalSasStartTime,
      finalSasEndTime
    );
    sasMetersData = { ...sasMetersData, ...newSasMetrics };
  }

  sasMetersData.sasStartTime = finalSasStartTime;
  sasMetersData.sasEndTime = finalSasEndTime;

  return { finalSasStartTime, finalSasEndTime, sasMetersData };
}

// ============================================================================
// Movement and SAS Recalculation
// ============================================================================

/**
 * Recalculates movement and SAS metrics for a collection after the first update.
 * Handles movement calculation, soft meters, SAS time resolution (4 cases),
 * applies the second update, and triggers post-update propagation.
 *
 * @param {string} collectionId - The collection ID being updated
 * @param {CollectionDocument} updatedCollection - The collection after first update
 * @param {Record<string, unknown>} updateData - The raw update payload
 * @param {SasTimeExtractionResult} sasFields - Extracted SAS time fields
 * @param {RecalculationFlags} flags - Recalculation flags
 * @returns {Promise<CollectionDocument | null>} The final updated collection, or null if not found
 */
export async function recalculateMovementAndSasForPatch(
  collectionId: string,
  updatedCollection: CollectionDocument,
  updateData: Record<string, unknown>,
  sasFields: SasTimeExtractionResult,
  flags: RecalculationFlags
): Promise<CollectionDocument | null> {
  if (!collectionId) {
    console.error('[recalculateMovementAndSasForPatch] collectionId is required');
    return null;
  }
  if (!updatedCollection) {
    console.error('[recalculateMovementAndSasForPatch] updatedCollection is required');
    return null;
  }

  const previousMeters: PreviousCollectionMeters = {
    metersIn:
      updateData.prevIn !== undefined
        ? (updateData.prevIn as number)
        : updatedCollection.prevIn || 0,
    metersOut:
      updateData.prevOut !== undefined
        ? (updateData.prevOut as number)
        : updatedCollection.prevOut || 0,
  };

  const movement = calculateMovement(
    updatedCollection.metersIn || 0,
    updatedCollection.metersOut || 0,
    previousMeters,
    updatedCollection.ramClear,
    undefined,
    undefined,
    updatedCollection.ramClearMetersIn,
    updatedCollection.ramClearMetersOut
  );

  const roundedMovement = {
    metersIn: Number(movement.metersIn.toFixed(2)),
    metersOut: Number(movement.metersOut.toFixed(2)),
    gross: Number(movement.gross.toFixed(2)),
  };

  const softMetersIn =
    updatedCollection.ramClear && updatedCollection.ramClearMetersIn
      ? updatedCollection.ramClearMetersIn
      : updatedCollection.metersIn || 0;

  const softMetersOut =
    updatedCollection.ramClear && updatedCollection.ramClearMetersOut
      ? updatedCollection.ramClearMetersOut
      : updatedCollection.metersOut || 0;

  const recalculatedData: Record<string, unknown> = {
    movement: roundedMovement,
    softMetersIn,
    softMetersOut,
    updatedAt: new Date(),
  };

  if (updatedCollection.sasMeters) {
    const { sasMetersData } = await resolveSasTimeRange(
      updatedCollection,
      sasFields,
      flags,
      updateData
    );

    if (sasMetersData) {
      sasMetersData.drop = roundedMovement.metersIn;
      sasMetersData.totalCancelledCredits = roundedMovement.metersOut;
      sasMetersData.gross = roundedMovement.gross;
      recalculatedData.sasMeters = sasMetersData;
    }
  }

  const finalUpdatedCollection = await Collections.findOneAndUpdate(
    { _id: collectionId },
    { $set: recalculatedData },
    { new: true, runValidators: true }
  );

  if (finalUpdatedCollection) {
    await updateRegularAndRamClearMeters(finalUpdatedCollection);

    try {
      const { propagateMetersToNextReport } = await import(
        '@/app/api/lib/helpers/collectionReport/reportCreation'
      );
      await propagateMetersToNextReport(
        String(finalUpdatedCollection.machineId),
        String(finalUpdatedCollection.location),
        finalUpdatedCollection.collectionTime ||
          finalUpdatedCollection.timestamp ||
          new Date(),
        finalUpdatedCollection.metersIn || 0,
        finalUpdatedCollection.metersOut || 0
      );
    } catch (propagateError) {
      console.error(
        '[recalculateMovementAndSasForPatch] Failed to propagate meters:',
        propagateError instanceof Error ? propagateError.message : 'Unknown error'
      );
    }
  }

  return finalUpdatedCollection;
}

// ============================================================================
// Machine Collection History Update
// ============================================================================

/**
 * Updates the machine's collectionMetersHistory entry when meters are changed
 * during a collection PATCH. Looks up the previous collection for correct
 * prevMetersIn/prevMetersOut values, then updates via arrayFilters.
 *
 * @param {CollectionDocument} updatedCollection - The updated collection document
 * @param {Record<string, unknown>} updateData - The raw update payload
 * @returns {Promise<void>}
 */
export async function updateMachineHistoryForPatch(
  updatedCollection: CollectionDocument,
  updateData: Record<string, unknown>
): Promise<void> {
  if (!updatedCollection) {
    console.error('[updateMachineHistoryForPatch] updatedCollection is required');
    return;
  }

  const metersChanged =
    updateData.metersIn !== undefined || updateData.metersOut !== undefined;

  if (!updatedCollection.machineId || !metersChanged) {
    return;
  }

  try {
    const currentMachine = await Machine.findOne({
      _id: updatedCollection.machineId,
    }).lean<GamingMachine | null>();

    if (!currentMachine) return;

    type HistoryEntry = {
      locationReportId: string;
      prevMetersIn?: number;
      prevMetersOut?: number;
      metersIn?: number;
      metersOut?: number;
      timestamp?: Date;
    };

    const historyEntries = (
      currentMachine as GamingMachine & {
        collectionMetersHistory?: HistoryEntry[];
      }
    ).collectionMetersHistory;

    const existingHistoryEntry = historyEntries?.find(
      (entry: HistoryEntry) =>
        entry.locationReportId === updatedCollection.locationReportId
    );

    if (!existingHistoryEntry) return;

    const collectionTimeForComparison =
      updatedCollection.collectionTime || updatedCollection.timestamp;

    const previousCollection = await Collections.findOne(
      {
        machineId: updatedCollection.machineId,
        $or: [
          { collectionTime: { $lt: collectionTimeForComparison } },
          { timestamp: { $lt: collectionTimeForComparison } },
        ],
        deletedAt: { $exists: false },
      },
      {
        sort: {
          collectionTime: -1,
          timestamp: -1,
        },
      }
    );

    const prevMetersIn = previousCollection?.metersIn || 0;
    const prevMetersOut = previousCollection?.metersOut || 0;

    const updateResult = await Machine.findOneAndUpdate(
      { _id: updatedCollection.machineId },
      {
        $set: {
          updatedAt: new Date(),
          'collectionMetersHistory.$[elem].metersIn':
            updatedCollection.metersIn || 0,
          'collectionMetersHistory.$[elem].metersOut':
            updatedCollection.metersOut || 0,
          'collectionMetersHistory.$[elem].prevMetersIn': prevMetersIn,
          'collectionMetersHistory.$[elem].prevMetersOut': prevMetersOut,
          'collectionMetersHistory.$[elem].timestamp':
            updatedCollection.collectionTime ||
            updatedCollection.timestamp ||
            new Date(),
        },
      },
      {
        arrayFilters: [
          {
            'elem.locationReportId':
              updatedCollection.locationReportId || '',
          },
        ],
        new: true,
      }
    );

    if (updateResult) {
      console.warn(
        '[updateMachineHistoryForPatch] Updated collectionMetersHistory entry:',
        {
          machineId: updatedCollection.machineId,
          locationReportId: updatedCollection.locationReportId,
        }
      );
    }
  } catch (machineUpdateError) {
    console.error(
      '[updateMachineHistoryForPatch] Error:',
      machineUpdateError instanceof Error
        ? machineUpdateError.message
        : 'Unknown error'
    );
  }
}

// ============================================================================
// Cascade Recalculation
// ============================================================================

/**
 * Triggers cascade recalculation to related collections when meters change.
 *
 * @param {CollectionDocument} updatedCollection - The updated collection document
 * @param {boolean} shouldRecalculate - Whether recalculation is needed
 * @returns {Promise<void>}
 */
export async function cascadeRecalculationForPatch(
  updatedCollection: CollectionDocument,
  shouldRecalculate: boolean
): Promise<void> {
  if (!shouldRecalculate || !updatedCollection?.machineId) return;

  try {
    await recalculateMachineCollections(
      String(updatedCollection.machineId),
      true
    );
  } catch (recalcError) {
    console.error(
      '[cascadeRecalculationForPatch] Error:',
      recalcError instanceof Error ? recalcError.message : 'Unknown error'
    );
  }
}

// ============================================================================
// Activity Logging
// ============================================================================

type TrackedField = {
  key: string;
  label: string;
  getValue: (doc: Record<string, unknown>) => unknown;
};

const TRACKED_FIELDS: TrackedField[] = [
  { key: 'metersIn', label: 'metersIn', getValue: (doc) => doc.metersIn },
  { key: 'metersOut', label: 'metersOut', getValue: (doc) => doc.metersOut },
  { key: 'prevIn', label: 'prevIn', getValue: (doc) => doc.prevIn },
  { key: 'prevOut', label: 'prevOut', getValue: (doc) => doc.prevOut },
  { key: 'notes', label: 'notes', getValue: (doc) => doc.notes },
  { key: 'ramClear', label: 'ramClear', getValue: (doc) => doc.ramClear },
  {
    key: 'ramClearMetersIn',
    label: 'ramClearMetersIn',
    getValue: (doc) => doc.ramClearMetersIn,
  },
  {
    key: 'ramClearMetersOut',
    label: 'ramClearMetersOut',
    getValue: (doc) => doc.ramClearMetersOut,
  },
  { key: 'timestamp', label: 'timestamp', getValue: (doc) => doc.timestamp },
  {
    key: 'collectionTime',
    label: 'collectionTime',
    getValue: (doc) => doc.collectionTime,
  },
  {
    key: 'sasStartTime',
    label: 'sasStartTime',
    getValue: (doc) => (doc.sasMeters as Record<string, unknown>)?.sasStartTime,
  },
  {
    key: 'sasEndTime',
    label: 'sasEndTime',
    getValue: (doc) => (doc.sasMeters as Record<string, unknown>)?.sasEndTime,
  },
];

function isDifferentValue(oldVal: unknown, newVal: unknown): boolean {
  if (oldVal === newVal) return false;
  if (oldVal == null || newVal == null) {
    return (oldVal == null) !== (newVal == null);
  }

  const isDateLike = (val: unknown): boolean => {
    if (val instanceof Date) return true;
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      return !isNaN(parsed) && val.includes('-');
    }
    return false;
  };

  if (isDateLike(oldVal) || isDateLike(newVal)) {
    try {
      const firstTime = new Date(oldVal as string | number | Date).getTime();
      const secondTime = new Date(newVal as string | number | Date).getTime();
      if (!isNaN(firstTime) && !isNaN(secondTime)) return firstTime !== secondTime;
    } catch {
      // fall through
    }
  }
  if (typeof oldVal === 'number' || typeof newVal === 'number') {
    return Number(oldVal) !== Number(newVal);
  }
  if (typeof oldVal === 'boolean' || typeof newVal === 'boolean') {
    return Boolean(oldVal) !== Boolean(newVal);
  }
  if (typeof oldVal === 'string' && typeof newVal === 'string') {
    return oldVal.trim() !== newVal.trim();
  }
  return String(oldVal).trim() !== String(newVal).trim();
}

/**
 * Logs activity for a collection PATCH with detailed field-level change tracking.
 * Compares original collection values against the update payload to produce
 * a structured change log.
 *
 * @param {NextRequest} request - The incoming request (for IP/user-agent extraction)
 * @param {CollectionDocument} updatedCollection - The collection after update
 * @param {Record<string, unknown> | null} originalCollectionDoc - The original collection as plain object
 * @param {Record<string, unknown>} updateData - The raw update payload
 * @param {CollectionDocument | null} finalUpdatedCollection - The final collection after recalculation
 * @param {string} collectionId - The collection ID
 * @returns {Promise<void>}
 */
export async function logCollectionPatchActivity(
  request: NextRequest,
  updatedCollection: CollectionDocument,
  originalCollectionDoc: Record<string, unknown> | null,
  updateData: Record<string, unknown>,
  finalUpdatedCollection: CollectionDocument | null,
  collectionId: string
): Promise<void> {
  if (!request) {
    console.error('[logCollectionPatchActivity] request is required');
    return;
  }
  if (!updatedCollection) {
    console.error('[logCollectionPatchActivity] updatedCollection is required');
    return;
  }
  if (!collectionId) {
    console.error('[logCollectionPatchActivity] collectionId is required');
    return;
  }

  const currentUser = await getUserFromServer();
  if (!currentUser?.emailAddress) return;

  try {
    const updateChanges: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];

    for (const trackedField of TRACKED_FIELDS) {
      const newValue = updateData[trackedField.key];
      if (newValue === undefined || !originalCollectionDoc) continue;

      const oldValue = trackedField.getValue(originalCollectionDoc);
      if (isDifferentValue(oldValue, newValue)) {
        updateChanges.push({
          field: trackedField.label,
          oldValue,
          newValue,
        });
      }
    }

    const machineDisplayName =
      updatedCollection.serialNumber ||
      updatedCollection.machineName ||
      updatedCollection.machineId;

    const reportSuffix = updatedCollection.locationReportId
      ? ` (report: ${updatedCollection.locationReportId})`
      : '';

    const changeCount = updateChanges.length;
    const pluralSuffix = changeCount !== 1 ? 's' : '';

    await logActivity({
      action: 'UPDATE',
      details: `Updated machine ${machineDisplayName} in collection report${reportSuffix} — ${changeCount} change${pluralSuffix}`,
      ipAddress: getClientIP(request) || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      userId: currentUser._id as string,
      username: currentUser.emailAddress as string,
      metadata: {
        userId: currentUser._id as string,
        userEmail: currentUser.emailAddress as string,
        userRole: (currentUser.roles as string[])?.[0] || 'user',
        resource: 'collection',
        resourceId: collectionId,
        resourceName:
          updatedCollection.serialNumber ||
          String(updatedCollection.machineId),
        locationReportId: updatedCollection.locationReportId || '',
        location: updatedCollection.location || '',
        changes: updateChanges,
        previousData: originalCollectionDoc,
        newData: finalUpdatedCollection,
      },
    });
  } catch (logError) {
    console.error(
      '[logCollectionPatchActivity] Error:',
      logError instanceof Error ? logError.message : 'Unknown error'
    );
  }
}
