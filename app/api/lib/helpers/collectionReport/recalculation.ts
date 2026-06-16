import mongoose from 'mongoose';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';

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

type V2SessionSnapshot = {
  _id: string;
  sessionId: string;
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  manualMetersIn?: number | null;
  manualMetersOut?: number | null;
  prevSasMetersIn?: number;
  prevSasMetersOut?: number;
  sasEndTime?: Date;
  sessionEndTime?: Date;
  metersMatch?: boolean;
  machineId: string;
};

type HistoryEntry = {
  _id: mongoose.Types.ObjectId;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  timestamp: Date;
  locationReportId: string;
  reportVersion?: number;
};

/**
 * Recalculates the collectionMetersHistory for a machine from all collections
 * (V1) and submitted sessions (V2), merging both into a unified chronological
 * history array. Updates Machine.collectionMeters and collectionMetersHistory.
 *
 * @param machineId      - The machine to recalculate.
 * @param writeSasMeters - When true, also updates sasMeters.drop and
 *                         sasMeters.totalCancelledCredits for noSMIB/offline
 *                         machines. Only true from finalising paths.
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

  const isNoSmibMachine = !machine.relayId;
  const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000;
  const isOffline =
    !!machine.relayId &&
    (!machine.lastActivity ||
      new Date().getTime() - new Date(machine.lastActivity).getTime() >=
        OFFLINE_THRESHOLD_MS);

  // ==========================================================================
  // Query V1 collections + V2 submitted sessions
  // ==========================================================================
  const v1Collections = await Collections.find({
    machineId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }).lean<CollectionSnapshot[]>();

  const v2Sessions = await ReportedMachine.find({
    machineId,
    sessionStatus: 'submitted',
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .sort({ sasEndTime: 1 })
    .lean<V2SessionSnapshot[]>();

  // ==========================================================================
  // Build unified history from both sources
  // ==========================================================================
  const historyEntries: HistoryEntry[] = [];

  // V1 entries
  for (const col of v1Collections) {
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
      reportVersion: 1,
    });
  }

  // V2 entries
  for (const rm of v2Sessions) {
    const hasRelay = !!machine.relayId;
    const useManualAsBaseline = !hasRelay || rm.metersMatch === false;
    const metersIn = useManualAsBaseline
      ? (rm.manualMetersIn ?? rm.sasMetersIn ?? 0)
      : (rm.sasMetersIn ?? 0);
    const metersOut = useManualAsBaseline
      ? (rm.manualMetersOut ?? rm.sasMetersOut ?? 0)
      : (rm.sasMetersOut ?? 0);

    historyEntries.push({
      _id: new mongoose.Types.ObjectId(),
      metersIn,
      metersOut,
      prevMetersIn: rm.prevSasMetersIn ?? 0,
      prevMetersOut: rm.prevSasMetersOut ?? 0,
      timestamp:
        (rm.sasEndTime as Date | undefined) ??
        (rm.sessionEndTime as Date | undefined) ??
        new Date(),
      locationReportId: rm.sessionId,
      reportVersion: 2,
    });
  }

  // ==========================================================================
  // No entries at all — clear meters and history
  // ==========================================================================
  if (historyEntries.length === 0) {
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

  // ==========================================================================
  // Sort by timestamp chronologically
  // ==========================================================================
  historyEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const lastEntry = historyEntries[historyEntries.length - 1];
  const secondLastEntry =
    historyEntries.length >= 2
      ? historyEntries[historyEntries.length - 2]
      : null;

  const finalMetersIn = lastEntry.metersIn;
  const finalMetersOut = lastEntry.metersOut;

  const collectionTime = lastEntry.timestamp;
  const previousCollectionTime = secondLastEntry?.timestamp ?? null;

  // ==========================================================================
  // Apply updates to Machine
  // ==========================================================================
  const machineSetUpdate: Record<string, unknown> = {
    'collectionMeters.metersIn': finalMetersIn,
    'collectionMeters.metersOut': finalMetersOut,
    collectionMetersHistory: historyEntries,
    collectionTime,
    previousCollectionTime,
    updatedAt: new Date(),
  };

  if ((isNoSmibMachine || isOffline) && writeSasMeters) {
    machineSetUpdate['sasMeters.drop'] = finalMetersIn;
    machineSetUpdate['sasMeters.totalCancelledCredits'] = finalMetersOut;
  }

  await Machine.findOneAndUpdate(
    { _id: machineId },
    { $set: machineSetUpdate },
    { new: true }
  );
}
