/**
 * Collection Report V2 — Meter Document Upsert
 *
 * Single source of truth for creating/updating Meter documents during V2
 * submit and post-submit cascade. Both code paths delegate here so they share
 * the same upsert filter strategy, prevIn resolution, and deduplication guard.
 *
 * @module app/api/lib/helpers/collectionReportV2/meterDocuments
 */

import { Meters } from '@/app/api/lib/models/meters';
import { generateMongoId } from '@/lib/utils/id';
import type { MeterDocument } from '@/shared/types';

// ============================================================================
// Types
// ============================================================================

export type HistoryPrevSnapshot = {
  prevMetersIn?: number;
  prevMetersOut?: number;
};

export type SupplementalMeterFields = {
  coinIn: number;
  coinOut: number;
  totalHandPaidCancelledCredits: number;
  totalWonCredits: number;
  jackpot: number;
  currentCredits: number;
  gamesPlayed: number;
  gamesWon: number;
};

export type UpsertCollectionReportMetersInput = {
  machineId: string;
  locationId: string;
  sessionId: string;
  readAt: Date;
  manualMetersIn?: number | null;
  manualMetersOut?: number | null;
  historyEntry?: HistoryPrevSnapshot;
  prevSasMetersIn?: number;
  prevSasMetersOut?: number;
  ramClear?: boolean;
  ramClearMetersIn?: number | null;
  ramClearMetersOut?: number | null;
  isSupplemental?: boolean;
  supplementalFields?: SupplementalMeterFields;
  logContext: string;
};

type MeterCandidate = {
  _id: string;
  isRamClear?: boolean;
  createdAt?: Date;
};

export const EMPTY_SUPPLEMENTAL_FIELDS: SupplementalMeterFields = {
  coinIn: 0,
  coinOut: 0,
  totalHandPaidCancelledCredits: 0,
  totalWonCredits: 0,
  jackpot: 0,
  currentCredits: 0,
  gamesPlayed: 0,
  gamesWon: 0,
};

// ============================================================================
// Prev Meter Resolution
// ============================================================================

/**
 * Resolves prevIn/prevOut using the same priority as submit and movement helpers:
 *   1. Frozen collectionMetersHistory entry for this session
 *   2. ReportedMachine.prevSasMetersIn/Out
 *   3. 0
 */
export function resolvePrevMeters(
  historyEntry: HistoryPrevSnapshot | undefined,
  prevSasMetersIn?: number,
  prevSasMetersOut?: number
): { prevIn: number; prevOut: number } {
  return {
    prevIn: historyEntry?.prevMetersIn ?? prevSasMetersIn ?? 0,
    prevOut: historyEntry?.prevMetersOut ?? prevSasMetersOut ?? 0,
  };
}

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Finds the canonical meter _id for a machine+session+isRamClear slot and
 * removes duplicate orphan documents. Prefers explicit isRamClear match, then
 * the newest createdAt (correct post-race document wins).
 *
 * Also cleans up orphan V1 meters: documents for the same machine with no
 * `locationSession` field (created by the old V1 report creation path which
 * never set this field). These orphans are invisible to the primary
 * `{ locationSession: sessionId }` query, so they must be caught separately.
 */
export async function findCanonicalMeterId(
  machineId: string,
  sessionId: string,
  isRamClear: boolean,
  logContext: string
): Promise<string> {
  // For non-RAM-clear, use $ne: true to catch false, null, and absent —
  // all three appear in the wild depending on which code path created the doc.
  const ramClearFilter = isRamClear
    ? { isRamClear: true }
    : { isRamClear: { $ne: true } };

  // Primary: session-scoped meters (V2 code path)
  const candidates = await Meters.find({
    machine: machineId,
    locationSession: sessionId,
    ...ramClearFilter,
  })
    .select('_id isRamClear createdAt')
    .lean<MeterCandidate[]>()
    .catch(() => [] as MeterCandidate[]);

  // Secondary: orphan meters (V1-created, no locationSession field at all)
  const orphanCandidates = await Meters.find({
    machine: machineId,
    locationSession: { $exists: false },
    ...ramClearFilter,
  })
    .select('_id isRamClear createdAt')
    .lean<MeterCandidate[]>()
    .catch(() => [] as MeterCandidate[]);

  // Merge both sets, deduplicating by _id
  const allCandidatesMap = new Map<string, MeterCandidate>();
  for (const candidate of [...orphanCandidates, ...candidates]) {
    allCandidatesMap.set(candidate._id, candidate);
  }
  const allCandidates = [...allCandidatesMap.values()];

  if (allCandidates.length === 0) {
    return generateMongoId();
  }

  const sorted = [...allCandidates].sort((left, right) => {
    const leftExplicit = left.isRamClear === isRamClear ? 1 : 0;
    const rightExplicit = right.isRamClear === isRamClear ? 1 : 0;
    if (rightExplicit !== leftExplicit) {
      return rightExplicit - leftExplicit;
    }
    return (
      (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0)
    );
  });

  const canonicalId = sorted[0]._id;
  const duplicateIds = sorted.slice(1).map(candidate => candidate._id);

  if (duplicateIds.length > 0) {
    await Meters.deleteMany({ _id: { $in: duplicateIds } }).catch(
      dedupeError => {
        console.error(
          `[${logContext}] Failed to remove duplicate meters for machine ${machineId} session ${sessionId}:`,
          dedupeError
        );
      }
    );
  }

  return canonicalId;
}

// ============================================================================
// Supplemental Field Loader
// ============================================================================

/**
 * Loads absolute supplemental meter fields from the most recent prior meter
 * document for offline/supplemental machines.
 */
export async function loadSupplementalMeterFields(
  machineId: string,
  sessionId: string,
  readAt: Date
): Promise<SupplementalMeterFields> {
  const prevMeterDoc = await Meters.findOne({
    machine: machineId,
    locationSession: { $ne: sessionId },
    readAt: { $lt: readAt },
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  })
    .sort({ readAt: -1 })
    .lean<MeterDocument>();

  if (!prevMeterDoc) {
    return EMPTY_SUPPLEMENTAL_FIELDS;
  }

  return {
    coinIn: prevMeterDoc.coinIn || 0,
    coinOut: prevMeterDoc.coinOut || 0,
    totalHandPaidCancelledCredits:
      prevMeterDoc.totalHandPaidCancelledCredits || 0,
    totalWonCredits: prevMeterDoc.totalWonCredits || 0,
    jackpot: prevMeterDoc.jackpot || 0,
    currentCredits: prevMeterDoc.currentCredits || 0,
    gamesPlayed: prevMeterDoc.gamesPlayed || 0,
    gamesWon: prevMeterDoc.gamesWon || 0,
  };
}

// ============================================================================
// Upsert
// ============================================================================

async function replaceMeterDoc(
  filter: Record<string, unknown>,
  doc: Record<string, unknown>,
  logContext: string,
  machineId: string,
  label: string
): Promise<void> {
  await Meters.replaceOne(filter, doc, { upsert: true }).catch(
    meterCreateError => {
      console.error(
        `[${logContext}] Failed to upsert ${label} Meter for machine ${machineId}:`,
        meterCreateError
      );
    }
  );
}

/**
 * Creates or updates Meter document(s) for a no-relay or offline SMIB machine.
 * Handles normal delta and RAM-clear (two meter docs) scenarios idempotently.
 */
export async function upsertCollectionReportMeters(
  input: UpsertCollectionReportMetersInput
): Promise<void> {
  const {
    machineId,
    locationId,
    sessionId,
    readAt,
    manualMetersIn,
    manualMetersOut,
    historyEntry,
    prevSasMetersIn,
    prevSasMetersOut,
    ramClear,
    ramClearMetersIn,
    ramClearMetersOut,
    isSupplemental,
    supplementalFields = EMPTY_SUPPLEMENTAL_FIELDS,
    logContext,
  } = input;

  const { prevIn, prevOut } = resolvePrevMeters(
    historyEntry,
    prevSasMetersIn,
    prevSasMetersOut
  );

  const isRamClearScenario =
    ramClear === true &&
    ramClearMetersIn !== undefined &&
    ramClearMetersIn !== null &&
    ramClearMetersOut !== undefined &&
    ramClearMetersOut !== null;

  if (isRamClearScenario) {
    const ramClearMeterId = await findCanonicalMeterId(
      machineId,
      sessionId,
      true,
      logContext
    );
    const ramClearFilter = {
      _id: ramClearMeterId,
      machine: machineId,
      locationSession: sessionId,
      isRamClear: true as const,
    };
    const ramClearMeterDoc = {
      _id: ramClearMeterId,
      machine: machineId,
      location: locationId,
      locationSession: sessionId,
      isRamClear: true as const,
      movement: {
        coinIn: 0,
        coinOut: 0,
        totalCancelledCredits: Number(ramClearMetersOut) - prevOut,
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: 0,
        drop: Number(ramClearMetersIn) - prevIn,
        jackpot: 0,
        currentCredits: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      },
      coinIn: supplementalFields.coinIn,
      coinOut: supplementalFields.coinOut,
      totalCancelledCredits: Number(ramClearMetersOut),
      totalHandPaidCancelledCredits:
        supplementalFields.totalHandPaidCancelledCredits,
      totalWonCredits: supplementalFields.totalWonCredits,
      drop: Number(ramClearMetersIn),
      jackpot: supplementalFields.jackpot,
      currentCredits: supplementalFields.currentCredits,
      gamesPlayed: supplementalFields.gamesPlayed,
      gamesWon: supplementalFields.gamesWon,
      meterSource: 'COLLECTION_REPORT' as const,
      isSupplemental: isSupplemental === true,
      readAt: new Date(readAt.getTime() - 1000),
      createdAt: new Date(),
    };

    await replaceMeterDoc(
      ramClearFilter,
      ramClearMeterDoc,
      logContext,
      machineId,
      'RAM-clear'
    );

    const currentMeterId = await findCanonicalMeterId(
      machineId,
      sessionId,
      false,
      logContext
    );
    const currentFilter = {
      _id: currentMeterId,
      machine: machineId,
      locationSession: sessionId,
      isRamClear: false as const,
    };
    const currentMeterDoc = {
      _id: currentMeterId,
      machine: machineId,
      location: locationId,
      locationSession: sessionId,
      isRamClear: false as const,
      movement: {
        coinIn: 0,
        coinOut: 0,
        totalCancelledCredits: manualMetersOut ?? 0,
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: 0,
        drop: manualMetersIn ?? 0,
        jackpot: 0,
        currentCredits: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      },
      coinIn: 0,
      coinOut: 0,
      totalCancelledCredits: manualMetersOut ?? null,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 0,
      drop: manualMetersIn ?? null,
      jackpot: 0,
      currentCredits: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      meterSource: 'COLLECTION_REPORT' as const,
      isSupplemental: isSupplemental === true,
      readAt,
      createdAt: new Date(new Date().getTime() + 1000),
    };

    await replaceMeterDoc(
      currentFilter,
      currentMeterDoc,
      logContext,
      machineId,
      'post-RAM-clear'
    );
    return;
  }

  const meterId = await findCanonicalMeterId(
    machineId,
    sessionId,
    false,
    logContext
  );
  const meterFilter = {
    _id: meterId,
    machine: machineId,
    locationSession: sessionId,
    isRamClear: false as const,
  };
  const meterDoc = {
    _id: meterId,
    machine: machineId,
    location: locationId,
    locationSession: sessionId,
    isRamClear: false as const,
    movement: {
      coinIn: 0,
      coinOut: 0,
      totalCancelledCredits: (manualMetersOut ?? 0) - prevOut,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 0,
      drop: (manualMetersIn ?? 0) - prevIn,
      jackpot: 0,
      currentCredits: 0,
      gamesPlayed: 0,
      gamesWon: 0,
    },
    coinIn: supplementalFields.coinIn,
    coinOut: supplementalFields.coinOut,
    totalCancelledCredits: manualMetersOut ?? null,
    totalHandPaidCancelledCredits:
      supplementalFields.totalHandPaidCancelledCredits,
    totalWonCredits: supplementalFields.totalWonCredits,
    drop: manualMetersIn ?? null,
    jackpot: supplementalFields.jackpot,
    currentCredits: supplementalFields.currentCredits,
    gamesPlayed: supplementalFields.gamesPlayed,
    gamesWon: supplementalFields.gamesWon,
    meterSource: 'COLLECTION_REPORT' as const,
    isSupplemental: isSupplemental === true,
    readAt,
    createdAt: new Date(),
  };

  await replaceMeterDoc(
    meterFilter,
    meterDoc,
    logContext,
    machineId,
    'collection-report'
  );
}
