/**
 * Collection Operations Helper Functions
 *
 * Provides extracted business logic for CRUD operations on individual
 * collections, including date normalization, collection data building,
 * previous meter resolution, RAM clear toggling, SAS recalculation,
 * post-update propagation, and deletion propagation.
 *
 * Features:
 * - Normalizes SAS times, timestamps, and collection times from payloads
 * - Builds complete collection document data for creation
 * - Resolves previous meters from historical collections or machine fallback
 * - Handles RAM clear toggle with meter creation/deletion
 * - Recalculates SAS metrics when timestamp, meters, or SAS window changes
 * - Propagates post-update meter changes and successor updates
 * - Propagates single collection deletion (SMIB fix, meter cleanup, successor)
 *
 * @module app/api/lib/helpers/collectionReport/collectionOperations
 */

import { Collections } from '@/app/api/lib/models/collections'
import { Machine } from '@/app/api/lib/models/machines'
import { Meters } from '@/app/api/lib/models/meters'
import { generateMongoId } from '@/lib/utils/id'
import {
  calculateSasMetrics,
  getSasTimePeriod,
} from './creation'
import { fixSmibMeterAfterSupplementalDeletion } from './smibMeterFix'
import { propagateCRDeletionForward } from './deletionPropagation'
import {
  calculateChanges,
  logActivity,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger'
import { getUserFromServer } from '@/app/api/lib/helpers/users/users'
import { getClientIP } from '@/lib/utils/ipAddress'
import type {
  CollectionDocument,
  CreateCollectionPayload,
} from '@/lib/types/collection'
import type { GamingMachine, MeterDocument } from '@shared/types'
import type { NextRequest } from 'next/server'

// ============================================================================
// Type Definitions
// ============================================================================

type NormalizedCollectionDates = {
  sasStartTime: Date | undefined
  sasEndTime: Date | undefined
  timestamp: Date
  collectionTime: Date
}

type SasMetersCalculationResult = {
  drop: number
  totalCancelledCredits: number
  gross: number
  gamesPlayed: number
  jackpot: number
  sasStartTime: Date
  sasEndTime: Date
}

type MovementCalculationResult = {
  metersIn: number
  metersOut: number
  gross: number
}

type PreviousMetersResult = {
  metersIn: number
  metersOut: number
}

type CollectionDataForCreate = {
  _id: string
  isCompleted: boolean
  metersIn: unknown
  metersOut: unknown
  prevIn: number
  prevOut: number
  softMetersIn: unknown
  softMetersOut: unknown
  notes: string
  timestamp: Date
  collectionTime: Date
  location: unknown
  collector: string
  locationReportId: string
  sasMeters: {
    machine: string
    drop: number
    totalCancelledCredits: number
    gross: number
    gamesPlayed: number
    jackpot: number
    sasStartTime: Date
    sasEndTime: Date
  }
  movement: MovementCalculationResult
  machineCustomName: string
  custom: { name: string }
  machineId: unknown
  machineName: string
  game: string
  ramClear: boolean
  ramClearMetersIn: unknown
  ramClearMetersOut: unknown
  serialNumber: string
  wasOnline?: boolean
  createdAt: Date
  updatedAt: Date
}

type RamClearToggleResult = {
  unsetData: Record<string, number>
}

// ============================================================================
// Date Normalization
// ============================================================================

/**
 * Extracts and normalizes SAS times, timestamp, and collectionTime from a
 * collection creation payload, converting string dates to Date objects.
 *
 * @param {CreateCollectionPayload} payload - The raw collection payload from the client
 * @returns {NormalizedCollectionDates} Normalized date values ready for calculation
 */
export function normalizeCollectionDates(
  payload: CreateCollectionPayload
): NormalizedCollectionDates {
  const payloadWithSasMeters = payload as CreateCollectionPayload & {
    sasMeters?: { sasStartTime?: string | Date; sasEndTime?: string | Date }
  }

  const rawSasStartTime =
    payloadWithSasMeters.sasMeters?.sasStartTime ??
    payload.sasStartTime ??
    undefined
  const rawSasEndTime =
    payloadWithSasMeters.sasMeters?.sasEndTime ??
    payload.sasEndTime ??
    (payload.timestamp ? new Date(payload.timestamp) : undefined)

  const sasStartTime = rawSasStartTime
    ? typeof rawSasStartTime === 'string'
      ? new Date(rawSasStartTime)
      : rawSasStartTime
    : undefined
  const sasEndTime = rawSasEndTime
    ? typeof rawSasEndTime === 'string'
      ? new Date(rawSasEndTime)
      : rawSasEndTime
    : undefined

  const timestamp = payload.timestamp
    ? typeof payload.timestamp === 'string'
      ? new Date(payload.timestamp)
      : new Date(payload.timestamp)
    : new Date()

  const collectionTime = payload.collectionTime
    ? typeof payload.collectionTime === 'string'
      ? new Date(payload.collectionTime)
      : new Date(payload.collectionTime)
    : payload.timestamp
      ? typeof payload.timestamp === 'string'
        ? new Date(payload.timestamp)
        : new Date(payload.timestamp)
      : new Date()

  return { sasStartTime, sasEndTime, timestamp, collectionTime }
}

// ============================================================================
// Collection Data Builder
// ============================================================================

/**
 * Builds the complete collection document data for creation, combining machine
 * data with calculated SAS metrics, movement, and previous meter values.
 *
 * @param {Record<string, unknown>} calculationPayload - The normalized calculation payload
 * @param {GamingMachine} machine - The machine document from the database
 * @param {SasMetersCalculationResult} sasMeters - Calculated SAS metrics
 * @param {MovementCalculationResult} movement - Calculated movement values
 * @param {PreviousMetersResult} previousMeters - Resolved previous meter values
 * @param {string} effectiveCollector - The collector user ID
 * @param {string} finalLocationReportId - The location report ID (empty for drafts)
 * @returns {Promise<CollectionDataForCreate>} Complete collection document data
 */
export async function buildCollectionData(
  calculationPayload: Record<string, unknown>,
  machine: GamingMachine,
  sasMeters: SasMetersCalculationResult,
  movement: MovementCalculationResult,
  previousMeters: PreviousMetersResult,
  effectiveCollector: string,
  finalLocationReportId: string
): Promise<CollectionDataForCreate> {
  const machineData = machine as Record<string, unknown>

  const machineDisplayName =
    (calculationPayload.machineCustomName as string) ||
    (machineData.custom as { name?: string })?.name ||
    (machineData.machineName as string) ||
    (machineData.serialNumber as string) ||
    'Unknown Machine'

  return {
    _id: await generateMongoId(),
    isCompleted: (calculationPayload.isCompleted as boolean) ?? false,
    metersIn: calculationPayload.metersIn,
    metersOut: calculationPayload.metersOut,
    prevIn:
      calculationPayload.prevIn !== undefined
        ? (calculationPayload.prevIn as number)
        : previousMeters.metersIn,
    prevOut:
      calculationPayload.prevOut !== undefined
        ? (calculationPayload.prevOut as number)
        : previousMeters.metersOut,
    softMetersIn: calculationPayload.metersIn,
    softMetersOut: calculationPayload.metersOut,
    notes: (calculationPayload.notes as string) || '',
    timestamp: calculationPayload.timestamp as Date,
    collectionTime: calculationPayload.collectionTime as Date,
    location: calculationPayload.location,
    collector: effectiveCollector,
    locationReportId: finalLocationReportId,
    sasMeters: {
      machine:
        (machineData.serialNumber as string) ||
        (machineData.custom as { name?: string })?.name ||
        (machineData.machineName as string) ||
        (calculationPayload.machineId as string),
      drop: sasMeters.drop,
      totalCancelledCredits: sasMeters.totalCancelledCredits,
      gross: sasMeters.gross,
      gamesPlayed: sasMeters.gamesPlayed,
      jackpot: sasMeters.jackpot,
      sasStartTime: sasMeters.sasStartTime,
      sasEndTime: sasMeters.sasEndTime,
    },
    movement: {
      metersIn: movement.metersIn,
      metersOut: movement.metersOut,
      gross: movement.gross,
    },
    machineCustomName: machineDisplayName,
    custom: { name: machineDisplayName },
    machineId: calculationPayload.machineId,
    machineName:
      (calculationPayload.machineName as string) ||
      (machineData.custom as { name?: string })?.name ||
      (machineData.machineName as string) ||
      (machineData.serialNumber as string) ||
      'Unknown Machine',
    game:
      (machineData.game as string) ||
      (machineData.installedGame as string) ||
      '',
    ramClear: (calculationPayload.ramClear as boolean) || false,
    ramClearMetersIn: calculationPayload.ramClearMetersIn,
    ramClearMetersOut: calculationPayload.ramClearMetersOut,
    serialNumber:
      (calculationPayload.serialNumber as string) ||
      (machineData.serialNumber as string) ||
      '',
    wasOnline: calculationPayload.wasOnline as boolean | undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================================================
// Previous Meter Resolution (PATCH)
// ============================================================================

/**
 * Resolves previous meter values and recalculates movement when meters change
 * during a collection PATCH. Looks up the actual previous completed collection,
 * falling back to machine.sasMeters or machine.collectionMeters if none exists.
 *
 * Mutates updateData with resolved prevIn, prevOut, and movement fields.
 *
 * @param {CollectionDocument} originalCollection - The existing collection being updated
 * @param {Record<string, unknown>} updateData - The update payload (mutated in place)
 * @param {string} collectionId - The collection ID being updated
 * @returns {Promise<void>}
 */
export async function resolvePreviousMetersForPatch(
  originalCollection: CollectionDocument,
  updateData: Record<string, unknown>,
  collectionId: string
): Promise<void> {
  if (!originalCollection) {
    console.error('[resolvePreviousMetersForPatch] originalCollection is required')
    return
  }
  if (!updateData) {
    console.error('[resolvePreviousMetersForPatch] updateData is required')
    return
  }
  if (!collectionId) {
    console.error('[resolvePreviousMetersForPatch] collectionId is required')
    return
  }

  const prevInProvided =
    updateData.prevIn !== undefined && updateData.prevIn !== null
  const prevOutProvided =
    updateData.prevOut !== undefined && updateData.prevOut !== null

  if (!prevInProvided || !prevOutProvided) {
    const previousCollection = await Collections.findOne({
      machineId: originalCollection.machineId,
      timestamp: {
        $lt:
          originalCollection.timestamp || originalCollection.collectionTime,
      },
      isCompleted: true,
      locationReportId: { $exists: true, $ne: '' },
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      _id: { $ne: collectionId },
    })
      .sort({ timestamp: -1 })
      .lean<CollectionDocument>()

    if (previousCollection) {
      if (!prevInProvided)
        updateData.prevIn = previousCollection.metersIn ?? 0
      if (!prevOutProvided)
        updateData.prevOut = previousCollection.metersOut ?? 0
    } else {
      // Fallback: check unified collectionMetersHistory for most recent entry before this collection
      const collectionTime =
        (originalCollection.collectionTime as Date) ||
        (originalCollection.timestamp as Date)

      const editMachine = await Machine.findOne({
        _id: originalCollection.machineId,
      })
        .select('sasMeters collectionMeters collectionMetersHistory')
        .lean<GamingMachine & {
          collectionMetersHistory?: Array<{
            metersIn?: number;
            metersOut?: number;
            timestamp?: Date;
          }>;
        }>()

      const historyBeforeThis = (editMachine?.collectionMetersHistory ?? [])
        .filter(
          entry =>
            entry.timestamp && collectionTime &&
            new Date(entry.timestamp).getTime() < new Date(collectionTime).getTime()
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
        )

      const previousHistoryEntry = historyBeforeThis[0]

      const sasMetersData = editMachine?.sasMeters as
        | Record<string, unknown>
        | undefined
      const collectionMetersData = editMachine?.collectionMeters as
        | Record<string, unknown>
        | undefined

      const historyMetersIn = previousHistoryEntry?.metersIn
      const historyMetersOut = previousHistoryEntry?.metersOut
      const sasIn = (sasMetersData?.drop as number) ?? null
      const sasOut = (sasMetersData?.totalCancelledCredits as number) ?? null
      const legacyIn = (collectionMetersData?.metersIn as number) ?? null
      const legacyOut = (collectionMetersData?.metersOut as number) ?? null

      if (!prevInProvided) {
        updateData.prevIn =
          historyMetersIn ??
          (legacyIn !== null && legacyIn > 0 ? legacyIn : (sasIn ?? 0))
      }
      if (!prevOutProvided) {
        updateData.prevOut =
          historyMetersOut ??
          (legacyOut !== null && legacyOut > 0 ? legacyOut : (sasOut ?? 0))
      }
    }
  }

  const currentMetersIn =
    (updateData.metersIn as number) ?? originalCollection.metersIn
  const currentMetersOut =
    (updateData.metersOut as number) ?? originalCollection.metersOut
  const ramClear =
    (updateData.ramClear as boolean) ?? originalCollection.ramClear
  const ramClearMetersIn =
    (updateData.ramClearMetersIn as number) ??
    originalCollection.ramClearMetersIn
  const ramClearMetersOut =
    (updateData.ramClearMetersOut as number) ??
    originalCollection.ramClearMetersOut

  let movementIn: number
  let movementOut: number

  if (ramClear) {
    if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
      movementIn =
        ramClearMetersIn - (updateData.prevIn as number) + currentMetersIn
      movementOut =
        ramClearMetersOut - (updateData.prevOut as number) + currentMetersOut
    } else {
      movementIn = currentMetersIn
      movementOut = currentMetersOut
    }
  } else {
    movementIn = currentMetersIn - (updateData.prevIn as number)
    movementOut = currentMetersOut - (updateData.prevOut as number)
  }

  updateData.movement = {
    metersIn: Number(movementIn.toFixed(2)),
    metersOut: Number(movementOut.toFixed(2)),
    gross: Number((movementIn - movementOut).toFixed(2)),
  }
}

// ============================================================================
// RAM Clear Toggle Handler
// ============================================================================

/**
 * Handles the RAM clear checkbox toggle during a collection PATCH. When RAM
 * clear is unchecked, deletes existing meters and creates a single regular meter.
 * When checked, deletes existing meters and creates two RAM clear meters.
 *
 * Mutates updateData with new meterId/ramClearMeterId and returns fields to $unset.
 *
 * @param {CollectionDocument} originalCollection - The existing collection being updated
 * @param {Record<string, unknown>} updateData - The update payload (mutated in place)
 * @param {string} locationId - The gaming location ID for meter creation
 * @param {string | Date | undefined} explicitSasEndTime - Explicit SAS end time for readAt
 * @returns {Promise<RamClearToggleResult>} Fields to $unset on the collection document
 */
export async function handleRamClearToggle(
  originalCollection: CollectionDocument,
  updateData: Record<string, unknown>,
  locationId: string,
  explicitSasEndTime: string | Date | undefined
): Promise<RamClearToggleResult> {
  if (!originalCollection) {
    console.error('[handleRamClearToggle] originalCollection is required')
    return { unsetData: {} }
  }
  if (!updateData) {
    console.error('[handleRamClearToggle] updateData is required')
    return { unsetData: {} }
  }

  const unsetData: Record<string, number> = {}

  if (originalCollection.ramClear === true && updateData.ramClear === false) {
    console.log(
      `[handleRamClearToggle] RAM clear unchecked for collection ${originalCollection._id}`
    )

    if (originalCollection.meterId) {
      await Meters.findOneAndDelete({ _id: originalCollection.meterId })
    }
    if (originalCollection.ramClearMeterId) {
      await Meters.findOneAndDelete({ _id: originalCollection.ramClearMeterId })
    }

    const currentMeterId = await generateMongoId()
    const newMetersIn =
      (updateData.metersIn as number) ?? originalCollection.metersIn ?? 0
    const newMetersOut =
      (updateData.metersOut as number) ?? originalCollection.metersOut ?? 0
    const newPrevIn =
      (updateData.prevIn as number) ?? originalCollection.prevIn ?? 0
    const newPrevOut =
      (updateData.prevOut as number) ?? originalCollection.prevOut ?? 0

    const movementIn = newMetersIn - newPrevIn
    const movementOut = newMetersOut - newPrevOut

    const collectionTimestamp = updateData.timestamp
      ? new Date(updateData.timestamp as string)
      : new Date(originalCollection.timestamp)

    await Meters.create({
      _id: currentMeterId,
      machine: originalCollection.machineId,
      location: locationId,
      movement: {
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        totalHandPaidCancelledCredits: 0,
        totalCancelledCredits: movementOut,
        gamesPlayed: 0,
        gamesWon: 0,
        currentCredits: 0,
        totalWonCredits: 0,
        drop: movementIn,
      },
      coinIn: 0,
      coinOut: 0,
      jackpot: 0,
      totalHandPaidCancelledCredits: 0,
      totalCancelledCredits: newMetersOut,
      gamesPlayed: 0,
      gamesWon: 0,
      currentCredits: 0,
      totalWonCredits: 0,
      drop: newMetersIn,
      meterSource: 'COLLECTION_REPORT' as const,
      readAt:
        explicitSasEndTime !== undefined
          ? new Date(explicitSasEndTime as Date)
          : collectionTimestamp,
      createdAt: new Date(),
    })

    updateData.meterId = currentMeterId
    unsetData.ramClearMeterId = 1
    unsetData.ramClearMetersIn = 1
    unsetData.ramClearMetersOut = 1

    delete updateData.ramClearMeterId
    delete updateData.ramClearMetersIn
    delete updateData.ramClearMetersOut
  } else if (
    (originalCollection.ramClear === false || !originalCollection.ramClear) &&
    updateData.ramClear === true
  ) {
    console.log(
      `[handleRamClearToggle] RAM clear checked for collection ${originalCollection._id}`
    )

    if (originalCollection.meterId) {
      await Meters.findOneAndDelete({ _id: originalCollection.meterId })
    }
    if (originalCollection.ramClearMeterId) {
      await Meters.findOneAndDelete({ _id: originalCollection.ramClearMeterId })
    }

    const ramClearMeterId = await generateMongoId()
    const currentMeterId = await generateMongoId()

    const newMetersIn =
      (updateData.metersIn as number) ?? originalCollection.metersIn ?? 0
    const newMetersOut =
      (updateData.metersOut as number) ?? originalCollection.metersOut ?? 0
    const newPrevIn =
      (updateData.prevIn as number) ?? originalCollection.prevIn ?? 0
    const newPrevOut =
      (updateData.prevOut as number) ?? originalCollection.prevOut ?? 0
    const newRamClearMetersIn =
      (updateData.ramClearMetersIn as number) ??
      originalCollection.ramClearMetersIn ??
      0
    const newRamClearMetersOut =
      (updateData.ramClearMetersOut as number) ??
      originalCollection.ramClearMetersOut ??
      0

    const ramClearMovementIn = newRamClearMetersIn - newPrevIn
    const ramClearMovementOut = newRamClearMetersOut - newPrevOut
    const postResetMovementIn = newMetersIn
    const postResetMovementOut = newMetersOut

    const collectionTimestamp = updateData.timestamp
      ? new Date(updateData.timestamp as string)
      : new Date(originalCollection.timestamp)

    const baseReadAt =
      explicitSasEndTime !== undefined
        ? new Date(explicitSasEndTime as Date)
        : collectionTimestamp
    const baseCreatedAt = new Date()

    await Meters.create({
      _id: ramClearMeterId,
      machine: originalCollection.machineId,
      location: locationId,
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
      totalCancelledCredits: newRamClearMetersOut,
      gamesPlayed: 0,
      gamesWon: 0,
      currentCredits: 0,
      totalWonCredits: 0,
      drop: newRamClearMetersIn,
      meterSource: 'COLLECTION_REPORT' as const,
      isRamClear: true,
      readAt: new Date(baseReadAt.getTime() - 1000),
      createdAt: baseCreatedAt,
    })

    await Meters.create({
      _id: currentMeterId,
      machine: originalCollection.machineId,
      location: locationId,
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
      totalCancelledCredits: newMetersOut,
      gamesPlayed: 0,
      gamesWon: 0,
      currentCredits: 0,
      totalWonCredits: 0,
      drop: newMetersIn,
      meterSource: 'COLLECTION_REPORT' as const,
      readAt: baseReadAt,
      createdAt: new Date(baseCreatedAt.getTime() + 1000),
    })

    updateData.ramClearMeterId = ramClearMeterId
    updateData.meterId = currentMeterId
  }

  return { unsetData }
}

// ============================================================================
// SAS Metrics Recalculation (PATCH)
// ============================================================================

/**
 * Recalculates SAS metrics when the timestamp, meter values, or SAS window times
 * change during a collection PATCH. Resolves the SAS time period and queries
 * meters for the new window, then updates updateData.sasMeters.
 *
 * @param {CollectionDocument} originalCollection - The existing collection being updated
 * @param {Record<string, unknown>} updateData - The update payload (mutated with sasMeters)
 * @returns {Promise<void>}
 */
export async function recalculateSasMetricsForPatch(
  originalCollection: CollectionDocument,
  updateData: Record<string, unknown>
): Promise<void> {
  if (!originalCollection) {
    console.error('[recalculateSasMetricsForPatch] originalCollection is required')
    return
  }
  if (!updateData) {
    console.error('[recalculateSasMetricsForPatch] updateData is required')
    return
  }

  try {
    const collectionTimestamp = updateData.timestamp
      ? new Date(updateData.timestamp as string | Date)
      : originalCollection.timestamp

    const customStartTime = updateData.sasStartTime
      ? new Date(updateData.sasStartTime as string | Date)
      : undefined
    const customEndTime = updateData.sasEndTime
      ? new Date(updateData.sasEndTime as string | Date)
      : (collectionTimestamp as Date)

    const { sasStartTime, sasEndTime } = await getSasTimePeriod(
      originalCollection.machineId as string,
      customStartTime,
      customEndTime || (collectionTimestamp as Date)
    )

    const sasMetrics = await calculateSasMetrics(
      originalCollection.machineId as string,
      sasStartTime,
      sasEndTime
    )

    const existingSasMetersObj = originalCollection.sasMeters || {}

    updateData.sasMeters = {
      ...existingSasMetersObj,
      drop: sasMetrics.drop,
      totalCancelledCredits: sasMetrics.totalCancelledCredits,
      gross: sasMetrics.gross,
      gamesPlayed: sasMetrics.gamesPlayed,
      jackpot: sasMetrics.jackpot,
      sasStartTime: sasMetrics.sasStartTime,
      sasEndTime: sasMetrics.sasEndTime,
      machine:
        existingSasMetersObj.machine || originalCollection.machineId,
    }
  } catch (sasError) {
    console.error(
      '[recalculateSasMetricsForPatch] Error:',
      sasError instanceof Error ? sasError.message : 'Unknown error'
    )
  }
}

// ============================================================================
// Post-Update Propagation
// ============================================================================

/**
 * After a collection is updated, propagates meter changes to the linked
 * Meters documents, forward-propagates to the next chronological report,
 * and re-syncs the machine's collection state.
 *
 * @param {CollectionDocument} updatedCollection - The updated collection document
 * @returns {Promise<void>}
 */
export async function runPostUpdatePropagation(
  updatedCollection: CollectionDocument
): Promise<void> {
  if (!updatedCollection) {
    console.error('[runPostUpdatePropagation] updatedCollection is required')
    return
  }

  const {
    updateRegularAndRamClearMeters: updateMetersMovement,
    propagateMetersToNextReport,
  } = await import('./reportCreation')
  await updateMetersMovement(updatedCollection)

  try {
    await propagateMetersToNextReport(
      String(updatedCollection.machineId),
      String(updatedCollection.location),
      updatedCollection.collectionTime ||
        updatedCollection.timestamp ||
        new Date(),
      updatedCollection.metersIn || 0,
      updatedCollection.metersOut || 0
    )
  } catch (propagateError) {
    console.error(
      '[runPostUpdatePropagation] Failed to propagate meters to next report:',
      propagateError instanceof Error
        ? propagateError.message
        : 'Unknown error'
    )
  }

  if (updatedCollection.machineId) {
    try {
      const { recalculateMachineCollections } = await import(
        './recalculation'
      )
      await recalculateMachineCollections(
        String(updatedCollection.machineId),
        true
      )
    } catch (recalcError) {
      console.error(
        '[runPostUpdatePropagation] Failed to recalculate machine collections:',
        recalcError instanceof Error ? recalcError.message : 'Unknown error'
      )
    }
  }
}

// ============================================================================
// Single Collection Deletion Propagation
// ============================================================================

/**
 * Propagates a single collection deletion: fixes SMIB supplemental meters,
 * deletes associated Meters documents, updates the successor collection's
 * prevIn/prevOut, and recalculates machine collection state.
 *
 * @param {CollectionDocument} collectionToDelete - The collection being deleted
 * @returns {Promise<void>}
 */
export async function propagateSingleCollectionDeletion(
  collectionToDelete: CollectionDocument
): Promise<void> {
  if (!collectionToDelete) {
    console.error(
      '[propagateSingleCollectionDeletion] collectionToDelete is required'
    )
    return
  }
  if (!collectionToDelete.machineId) {
    console.error(
      '[propagateSingleCollectionDeletion] collectionToDelete.machineId is required'
    )
    return
  }

  try {
    if (collectionToDelete.meterId) {
      const supplementalMeter = await Meters.findOne({
        _id: collectionToDelete.meterId,
      }).lean<MeterDocument>()
      if (supplementalMeter?.isSupplemental && collectionToDelete.machineId) {
        let earliestReadAt: Date = supplementalMeter.readAt
        if (collectionToDelete.ramClearMeterId) {
          const ramMeter = await Meters.findOne({
            _id: collectionToDelete.ramClearMeterId,
          }).lean<MeterDocument>()
          if (
            ramMeter?.readAt &&
            new Date(ramMeter.readAt) < new Date(earliestReadAt)
          ) {
            earliestReadAt = ramMeter.readAt
          }
        }
        await fixSmibMeterAfterSupplementalDeletion(
          collectionToDelete.machineId,
          supplementalMeter.readAt,
          earliestReadAt
        )
      }
    }

    if (collectionToDelete.meterId) {
      await Meters.findOneAndDelete({ _id: collectionToDelete.meterId })
    }
    if (collectionToDelete.ramClearMeterId) {
      await Meters.findOneAndDelete({ _id: collectionToDelete.ramClearMeterId })
    }

    await propagateCRDeletionForward([collectionToDelete])
  } catch (propagationError) {
    console.error(
      '[propagateSingleCollectionDeletion] Error:',
      propagationError instanceof Error
        ? propagationError.message
        : 'Unknown error'
    )
  }
}

// ============================================================================
// Change Detection
// ============================================================================

type CollectionChangeFlags = {
  metersChanged: boolean
  timestampChanged: boolean
  sasTimesChanged: boolean
}

/**
 * Detects which fields changed in a collection PATCH request to determine
 * which recalculation steps are needed.
 *
 * @param {CollectionDocument} originalCollection - The existing collection
 * @param {Record<string, unknown>} updateData - The incoming update payload
 * @returns {CollectionChangeFlags} Flags indicating which field groups changed
 */
export function detectCollectionChanges(
  originalCollection: CollectionDocument,
  updateData: Record<string, unknown>
): CollectionChangeFlags {
  const metersChanged =
    (updateData.metersIn !== undefined && updateData.metersIn !== originalCollection.metersIn) ||
    (updateData.metersOut !== undefined && updateData.metersOut !== originalCollection.metersOut) ||
    (updateData.ramClear !== undefined && updateData.ramClear !== originalCollection.ramClear) ||
    updateData.ramClearMetersIn !== undefined ||
    updateData.ramClearMetersOut !== undefined

  const timestampChanged =
    (updateData.timestamp !== undefined &&
      new Date(updateData.timestamp as string | Date).getTime() !== new Date(originalCollection.timestamp).getTime()) ||
    (updateData.collectionTime !== undefined &&
      new Date(updateData.collectionTime as string | Date).getTime() !==
        new Date(originalCollection.collectionTime || originalCollection.timestamp).getTime())

  const existingSasStartTime = originalCollection.sasMeters?.sasStartTime
    ? new Date(originalCollection.sasMeters.sasStartTime as Date).getTime()
    : null
  const existingSasEndTime = originalCollection.sasMeters?.sasEndTime
    ? new Date(originalCollection.sasMeters.sasEndTime as Date).getTime()
    : null
  const sasTimesChanged =
    (updateData.sasStartTime !== undefined &&
      new Date(updateData.sasStartTime as Date).getTime() !== existingSasStartTime) ||
    (updateData.sasEndTime !== undefined &&
      new Date(updateData.sasEndTime as Date).getTime() !== existingSasEndTime)

  return { metersChanged, timestampChanged, sasTimesChanged }
}

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * Logs a collection CRUD activity with consistent metadata and change tracking.
 * Handles user resolution internally to avoid duplication across handlers.
 *
 * @param {'CREATE' | 'UPDATE' | 'DELETE'} action - The CRUD action performed
 * @param {CollectionDocument} collection - The affected collection document
 * @param {NextRequest} req - The incoming request (for IP extraction)
 * @param {Record<string, unknown>} [previousData] - Original data for UPDATE/DELETE
 * @param {Record<string, unknown>} [newData] - New data for CREATE/UPDATE
 * @param {string} [detailsOverride] - Optional override for the details string
 * @returns {Promise<void>}
 */
export async function logCollectionActivity(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  collection: CollectionDocument,
  req: NextRequest,
  previousData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null,
  detailsOverride?: string
): Promise<void> {
  const currentUser = await getUserFromServer()
  if (!currentUser?.emailAddress) return

  try {
    let changes: unknown[]
    if (action === 'CREATE') {
      changes = calculateChanges({}, newData || {}).filter(
        c => !['_id', '__v', 'createdAt', 'updatedAt', 'collector', 'locationReportId', 'isCompleted'].includes(c.field)
      )
    } else if (action === 'DELETE') {
      changes = mapDeletedFieldsToChanges(previousData || {})
    } else {
      changes = calculateChanges(previousData || {}, newData || {})
    }

    const details = detailsOverride ||
      `${action === 'CREATE' ? 'Created' : action === 'UPDATE' ? 'Updated' : 'Deleted'} collection for machine ${collection.machineId} at location ${collection.location}`

    const userId = (currentUser._id || currentUser.id || currentUser.sub) as string

    await logActivity({
      action,
      details,
      ipAddress: getClientIP(req) || undefined,
      userId,
      username: currentUser.emailAddress as string,
      metadata: {
        resource: 'collection',
        resourceId: String(collection._id),
        resourceName: `${collection.machineCustomName || collection.machineName || collection.machineId} at ${collection.location}`,
        userId,
        username: currentUser.emailAddress as string,
        changes,
        previousData: previousData ?? null,
        newData: newData ?? null,
      },
    })
  } catch (logError) {
    console.error('[logCollectionActivity] Failed to log activity:', logError)
  }
}
