import mongoose from 'mongoose';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';

import type { GamingMachine } from '@/shared/types';

type CollectionSnapshot = {
  _id: mongoose.Types.ObjectId | string;
  metersIn?: number;
  metersOut?: number;
  prevIn?: number;
  prevOut?: number;
  collectionTime?: Date;
  timestamp?: Date;
  softMetersIn?: number;
  softMetersOut?: number;
  ramClear?: boolean;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  locationReportId?: string;
};

function getCollectionSortTime(collection: CollectionSnapshot): number {
  const raw = collection.collectionTime ?? collection.timestamp ?? new Date(0);
  return new Date(raw).getTime();
}

function getObjectIdTime(collection: CollectionSnapshot): number {
  if (
    typeof collection._id === 'object' &&
    collection._id !== null &&
    'getTimestamp' in collection._id
  ) {
    return (collection._id as mongoose.Types.ObjectId).getTimestamp().getTime();
  }
  return 0;
}

/**
 * Retrieves all collections of a machine in chronological order and updates machine collectionMetersHistory.
 * No longer cascades/recalculates subsequent collections' meters — it only updates the Machine doc.
 *
 * @param {string | null} [machineId] - The machine to update history for.
 * @param {string} [anchorCollectionId] - Unused (kept for compatibility with callers).
 */
/**
 * Recalculates the collectionMetersHistory for a machine from all its collections.
 *
 * @param machineId      - The machine to recalculate.
 * @param writeSasMeters - When true, also updates sasMeters.drop and
 *                         sasMeters.totalCancelledCredits for noSMIB locations.
 *                         Must only be true when called from a finalising path
 *                         (submit / post-submit edit) — never during mid-wizard
 *                         per-machine saves where the report is still open.
 */
export async function recalculateMachineCollections(
  machineId?: string | null,
  writeSasMeters = false
) {
  if (!machineId) {
    console.error('[recalculateMachineCollections] machineId is required');
    return;
  }

  const machine = await Machine.findOne({
    _id: machineId,
  }).lean<GamingMachine>();
  if (!machine) {
    return;
  }

  // Per-machine SMIB check: the machine has a relay if it has a relayId.
  // Non-relay machines mirror their meter values into sasMeters.
  // Offline SMIB machines (relay present but stale lastActivity) also get updated.
  const isNoSmibMachine = !machine.relayId;
  const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes for testing (TODO: restore 72h)
  const isOffline =
    !!machine.relayId &&
    (!machine.lastActivity ||
      new Date().getTime() - new Date(machine.lastActivity).getTime() >=
        OFFLINE_THRESHOLD_MS);

  const collections = await Collections.find({
    machineId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }).lean<CollectionSnapshot[]>();

  if (!collections.length) {
    await Machine.findOneAndUpdate(
      { _id: machineId },
      {
        $set: {
          'collectionMeters.metersIn': 0,
          'collectionMeters.metersOut': 0,
          collectionMetersHistory: [],
          collectionTime: null,
          previousCollectionTime: null,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );
    return;
  }

  const sorted = [...collections].sort((a, b) => {
    const timeDiff = getCollectionSortTime(a) - getCollectionSortTime(b);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return getObjectIdTime(a) - getObjectIdTime(b);
  });

  const historyEntries: Array<{
    _id: mongoose.Types.ObjectId;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    timestamp: Date;
    locationReportId: string;
  }> = [];

  for (
    let collectionIndex = 0;
    collectionIndex < sorted.length;
    collectionIndex++
  ) {
    const col = sorted[collectionIndex];
    historyEntries.push({
      _id: new mongoose.Types.ObjectId(),
      metersIn: Number(col.metersIn ?? 0),
      metersOut: Number(col.metersOut ?? 0),
      prevMetersIn: Number(col.prevIn ?? 0),
      prevMetersOut: Number(col.prevOut ?? 0),
      timestamp:
        (col.collectionTime as Date | undefined) ??
        (col.timestamp as Date | undefined) ??
        new Date(),
      locationReportId: col.locationReportId ?? '',
    });
  }

  const lastCol = sorted[sorted.length - 1];
  const secondLastCol = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  const finalMetersIn = lastCol ? Number(lastCol.metersIn ?? 0) : 0;
  const finalMetersOut = lastCol ? Number(lastCol.metersOut ?? 0) : 0;

  const collectionTime = lastCol
    ? ((lastCol.collectionTime as Date | undefined) ??
      (lastCol.timestamp as Date | undefined) ??
      null)
    : null;
  const previousCollectionTime = secondLastCol
    ? ((secondLastCol.collectionTime as Date | undefined) ??
      (secondLastCol.timestamp as Date | undefined) ??
      null)
    : null;

  // Prepare update operations
  const machineSetUpdate: Record<string, unknown> = {
    'collectionMeters.metersIn': finalMetersIn,
    'collectionMeters.metersOut': finalMetersOut,
    collectionMetersHistory: historyEntries,
    collectionTime,
    previousCollectionTime,
    updatedAt: new Date(),
  };

  // For noSMIB locations AND offline SMIB locations, mirror the final values into
  // sasMeters so dashboard queries stay in sync — but ONLY when called from a
  // finalising path. During mid-wizard per-machine saves the report is still
  // open, so sasMeters must not be touched until the collector presses Submit.
  if ((isNoSmibMachine || isOffline) && writeSasMeters) {
    machineSetUpdate['sasMeters.drop'] = finalMetersIn;
    machineSetUpdate['sasMeters.totalCancelledCredits'] = finalMetersOut;
  }

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate(
    { _id: machineId },
    { $set: machineSetUpdate },
    { new: true }
  );
}
