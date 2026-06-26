/**
 * Shared collection-report variation computation.
 *
 * Single source of truth for per-machine variation (Machine Gross vs SAS Gross),
 * used by BOTH the report detail page (`getCollectionReportById`) and the pre-submit
 * variation checker (`/api/collection-reports/check-variations`), so the numbers the
 * checker streams match exactly what the saved report shows.
 *
 * @module app/api/lib/helpers/collectionReport/variation
 */

import { Meters } from '../../models/meters';

// ============================================================================
// Types
// ============================================================================

export type MeterWindowQuery = {
  machineId: string;
  startTime: Date;
  endTime: Date;
};

export type MeterWindowSums = {
  drop: number;
  cancelled: number;
  jackpot: number;
  count: number;
};

type MeterGroupDoc = {
  _id: string;
  totalDrop: number;
  totalCancelled: number;
  totalJackpot: number;
  meterCount: number;
  firstDrop: number;
  lastDrop: number;
  firstTcc: number;
  lastTcc: number;
  anyWowSync: number;
};

export type MachineVariationInput = {
  metersIn?: number | null;
  metersOut?: number | null;
  prevIn?: number | null;
  prevOut?: number | null;
  /** Pre-computed movement gross from a collection (preferred — matches RAM-clear math). */
  movementGross?: number | null;
  sasStartTime?: Date | string | null;
  sasEndTime?: Date | string | null;
};

export type MachineVariationFlags = {
  includeJackpot: boolean;
  hasRelay: boolean;
  isWow: boolean;
  /** When true (no-SMIB-location default), every machine is treated as SMIB-equivalent */
  isNoSMIBLocation?: boolean;
};

export type MachineVariationResult = {
  meterGross: number;
  /** Adjusted SAS gross (jackpot applied), or null when there is no SAS data / no SMIB. */
  sasGross: number | null;
  /** Machine Gross − SAS Gross for SMIB machines, or null for non-SMIB machines. */
  variation: number | null;
  hasNoSasData: boolean;
  hasSmib: boolean;
};

// ============================================================================
// Windowed meter aggregation
// ============================================================================

/**
 * Sums per-machine meter movement for each collection window.
 *
 * Index-driven scan ({ machine: 1, readAt: 1 }) narrowed to the machine set + global
 * date range, then per-machine exact-window filtering via `$switch` and DB-side
 * `$group` so only one row per machine crosses the wire (vs. streaming every dense
 * WOW_SYNC document into Node).
 *
 * Inclusion rule: any non-COLLECTION_REPORT reading, OR a supplemental
 * COLLECTION_REPORT reading stamped at the window end. The lower bound is EXCLUSIVE
 * (`$gt`) — the reading at exactly sasStartTime is the baseline (prevIn); its movement
 * accrued before the window, so counting it would double-count and inflate variation.
 */
export async function aggregateMeterDataForWindows(
  meterQueries: MeterWindowQuery[]
): Promise<Map<string, MeterWindowSums>> {
  const meterDataMap = new Map<string, MeterWindowSums>();
  if (meterQueries.length === 0) return meterDataMap;

  const meterMachineIds = [...new Set(meterQueries.map(query => query.machineId))];
  const globalMin = new Date(
    Math.min(...meterQueries.map(query => query.startTime.getTime()))
  );
  const globalMax = new Date(
    Math.max(...meterQueries.map(query => query.endTime.getTime()))
  );

  const startSwitch = {
    $switch: {
      branches: meterQueries.map(query => ({
        case: { $eq: ['$machine', query.machineId] },
        then: query.startTime,
      })),
      default: null,
    },
  };
  const endSwitch = {
    $switch: {
      branches: meterQueries.map(query => ({
        case: { $eq: ['$machine', query.machineId] },
        then: query.endTime,
      })),
      default: null,
    },
  };

  const cursor = Meters.aggregate<MeterGroupDoc>(
    [
      {
        $match: {
          machine: { $in: meterMachineIds },
          readAt: { $gte: globalMin, $lte: globalMax },
        },
      },
      { $addFields: { _wStart: startSwitch, _wEnd: endSwitch } },
      {
        $match: {
          $expr: {
            $and: [
              { $ne: ['$_wStart', null] },
              { $gt: ['$readAt', '$_wStart'] },
              { $lte: ['$readAt', '$_wEnd'] },
              {
                $or: [
                  { $ne: ['$meterSource', 'COLLECTION_REPORT'] },
                  {
                    $and: [
                      { $eq: ['$meterSource', 'COLLECTION_REPORT'] },
                      { $eq: ['$isSupplemental', true] },
                      { $eq: ['$readAt', '$_wEnd'] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $sort: { readAt: 1 } },
      {
        $group: {
          _id: '$machine',
          totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
          totalCancelled: {
            $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
          },
          totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          meterCount: { $sum: 1 },
          firstDrop: { $first: { $ifNull: ['$drop', 0] } },
          lastDrop: { $last: { $ifNull: ['$drop', 0] } },
          firstTcc: { $first: { $ifNull: ['$totalCancelledCredits', 0] } },
          lastTcc: { $last: { $ifNull: ['$totalCancelledCredits', 0] } },
          anyWowSync: {
            $max: {
              $cond: [{ $eq: ['$meterSource', 'WOW_SYNC'] }, 1, 0],
            },
          },
        },
      },
    ],
    { allowDiskUse: true, maxTimeMS: 120000 }
  ).cursor({ batchSize: 1000 });

  for await (const doc of cursor) {
    // WOW_SYNC records store cumulative absolute drop/cancelled with
    // movement.drop always 0 — compute the window delta from first/last.
    // Non-WOW records store per-reading deltas in movement.* — sum them.
    const drop =
      doc.anyWowSync && doc.totalDrop === 0
        ? (doc.lastDrop || 0) - (doc.firstDrop || 0)
        : doc.totalDrop;
    const cancelled =
      doc.anyWowSync && doc.totalCancelled === 0
        ? (doc.lastTcc || 0) - (doc.firstTcc || 0)
        : doc.totalCancelled;

    meterDataMap.set(doc._id, {
      drop,
      cancelled,
      jackpot: doc.totalJackpot,
      count: doc.meterCount,
    });
  }

  return meterDataMap;
}

// ============================================================================
// Per-machine variation
// ============================================================================

/**
 * Computes one machine's Machine Gross, SAS Gross and Variation.
 *
 * Mirrors the per-machine logic in `getCollectionReportById`:
 *   - Machine Gross prefers the stored movement.gross, else the raw meter delta.
 *   - SAS Gross = windowed (drop − cancelled), jackpot-adjusted when includeJackpot.
 *   - A machine counts as SMIB if it has a relay, is a WOW machine, OR is at a
 *     no-SMIB location (where the WOW sync provides meter data).
 *   - Variation = Machine Gross − SAS Gross for SMIB machines (0 SAS when no data),
 *     and null for non-SMIB machines.
 */
export function computeMachineVariation(
  entry: MachineVariationInput,
  meterSums: MeterWindowSums | undefined,
  flags: MachineVariationFlags
): MachineVariationResult {
  const hasSmib = flags.hasRelay || flags.isWow || (flags.isNoSMIBLocation ?? false);

  const meterGross =
    entry.movementGross !== undefined && entry.movementGross !== null
      ? entry.movementGross
      : (entry.metersIn || 0) -
        (entry.prevIn || 0) -
        ((entry.metersOut || 0) - (entry.prevOut || 0));

  const hasNoSasData =
    !entry.sasStartTime || !entry.sasEndTime || !meterSums;

  const rawSasGross = meterSums ? meterSums.drop - meterSums.cancelled : 0;
  const jackpot = meterSums?.jackpot ?? 0;
  const adjustedSasGross = flags.includeJackpot
    ? rawSasGross - jackpot
    : rawSasGross;

  const variation = hasSmib
    ? meterGross - (hasNoSasData ? 0 : adjustedSasGross)
    : 0;

  return {
    meterGross,
    sasGross: hasSmib && !hasNoSasData ? adjustedSasGross : null,
    variation: hasSmib ? variation : null,
    hasNoSasData,
    hasSmib,
  };
}
