/**
 * @module app/api/collection-reports/collections/wow-meters/batch
 *
 * - Batch WOW meter pre-fill for all machines in one request.
 * - Reduces N sequential GET calls from the auto-report hook to a single POST.
 * - Uses aggregation to fetch current + baseline meters in 3 total DB round-trips.
 *
 * POST /api/collection-reports/collections/wow-meters/batch
 * Body: { machineIds: string[], endTime?: string, startTime?: string }
 * Returns: { data: Record<machineId, BatchMeterResult> }
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { NextRequest, NextResponse } from 'next/server';

type BatchMeterResult = {
  metersIn: number | null;
  metersOut: number | null;
  prevIn: number | null;
  prevOut: number | null;
  hasPrevious: boolean;
  currentReadAt: Date | null;
  /** Timestamp the prevIn reading corresponds to — used as the persisted sasStartTime. */
  baselineAt: Date | null;
  jackpot?: number | null;
};

type MeterAggRow = {
  _id: string;
  drop: number | null;
  totalCancelledCredits: number | null;
  readAt: Date | null;
  jackpot?: number | null;
};

type MachineDoc = {
  _id: string;
  collectionMetersHistory?: Array<{
    metersIn?: number;
    metersOut?: number;
    timestamp?: Date;
  }>;
  collectionTime?: Date;
};

/**
 * Default lookback (days) for a machine's FIRST-EVER collection when no explicit
 * start is picked and the machine has no prior collectionTime. The previous
 * approach (the second-latest WOW_SYNC reading) produced seconds-long windows for
 * machines that sync continuously — adjust here to widen/narrow the first-report period.
 */
const FIRST_REPORT_LOOKBACK_DAYS = 1;

/**
 * POST handler — batch WOW meter pre-fill.
 *
 * Flow:
 * 1. Parse and validate body (machineIds required).
 * 2. Fetch all current WOW_SYNC meters in one aggregation (latest ≤ endTime per machine).
 * 3. Fetch all machines' collectionMetersHistory in one find.
 * 4. Identify first-report machines (no history); fetch baseline meters in one aggregation.
 * 5. Build and return result map.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  return withApiAuth(request, async () => {
    // ========================================================================
    // STEP 1: Parse body
    // ========================================================================
    let body: { machineIds?: unknown; endTime?: unknown; startTime?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { machineIds, endTime: endTimeRaw, startTime: startTimeRaw } = body;
    if (!Array.isArray(machineIds) || machineIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'machineIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const ids = machineIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (ids.length === 0) {
      return NextResponse.json({ success: false, data: {} });
    }

    const endDate = endTimeRaw ? new Date(String(endTimeRaw)) : new Date();
    const startDate = startTimeRaw ? new Date(String(startTimeRaw)) : null;

    // Resolve includeJackpot config for each machine in the batch
    type MachineLocationProjection = { _id: string; gamingLocation?: string };
    type LocationProjection = { _id: string; rel?: { licencee?: string } };
    type LicenceeProjection = { _id: string; includeJackpot?: boolean };

    const machinesWithLocations = await Machine.find(
      { _id: { $in: ids } },
      { gamingLocation: 1 }
    ).lean<MachineLocationProjection[]>();

    const locationIds = [...new Set(machinesWithLocations.map(m => String(m.gamingLocation)).filter(Boolean))];

    const { GamingLocations } = await import('@/app/api/lib/models/gaminglocations');
    const { Licencee } = await import('@/app/api/lib/models/licencee');

    const locations = await GamingLocations.find({ _id: { $in: locationIds } }, { 'rel.licencee': 1 }).lean<LocationProjection[]>();
    const licenceeIds = [...new Set(locations.map(l => String(l.rel?.licencee)).filter(Boolean))];

    const licencees = await Licencee.find({ _id: { $in: licenceeIds } }, { includeJackpot: 1 }).lean<LicenceeProjection[]>();
    const licenceeIncludeJackpotMap = new Map(licencees.map(l => [String(l._id), !!l.includeJackpot]));

    const locationToIncludeJackpotMap = new Map();
    locations.forEach(l => {
      const isInclude = licenceeIncludeJackpotMap.get(String(l.rel?.licencee)) ?? false;
      locationToIncludeJackpotMap.set(String(l._id), isInclude);
    });

    const machineToIncludeJackpotMap = new Map();
    machinesWithLocations.forEach(m => {
      const isInclude = locationToIncludeJackpotMap.get(String(m.gamingLocation)) ?? false;
      machineToIncludeJackpotMap.set(String(m._id), isInclude);
    });

    // ========================================================================
    // STEP 2: Batch-fetch current WOW_SYNC meters (latest ≤ endTime per machine)
    // ========================================================================
    const currentMeterRows: MeterAggRow[] = [];
    const currentCursor = Meters.aggregate<MeterAggRow>([
      {
        $match: {
          machine: { $in: ids },
          meterSource: 'WOW_SYNC',
          readAt: { $lte: endDate },
        },
      },
      { $sort: { readAt: -1 } },
      {
        $group: {
          _id: '$machine',
          drop: { $first: '$drop' },
          totalCancelledCredits: { $first: '$totalCancelledCredits' },
          readAt: { $first: '$readAt' },
          jackpot: { $first: '$jackpot' },
        },
      },
    ]).cursor({ batchSize: 1000 });

    for await (const doc of currentCursor) {
      currentMeterRows.push(doc);
    }

    const currentMeterMap = new Map(currentMeterRows.map(row => [String(row._id), row]));

    // ========================================================================
    // STEP 3: Batch-fetch machine collection history
    // ========================================================================
    const machineDocs = await Machine.find(
      { _id: { $in: ids } },
      { collectionMetersHistory: 1, collectionTime: 1 }
    ).lean<MachineDoc[]>();

    const machineHistoryMap = new Map(machineDocs.map(doc => [String(doc._id), doc]));

    // Identify machines with no history — need a meter-derived baseline.
    const firstReportIds = ids.filter(machineId => {
      const doc = machineHistoryMap.get(machineId);
      const history = (doc?.collectionMetersHistory ?? []).filter(entry => entry.timestamp);
      return history.length === 0;
    });

    // ========================================================================
    // STEP 4: Resolve meter-derived baselines
    //
    // Per-machine baseline date priority:
    //   1. Explicit startDate from the request (Custom Time) — honoured for ALL
    //      machines, even those with history (the picked period start wins).
    //   2. First-report machines only: Machine.collectionTime, else an
    //      FIRST_REPORT_LOOKBACK_DAYS lookback from endDate.
    //
    // The baseline READING is the latest WOW_SYNC at/before that date; sasStartTime
    // is set to that reading's readAt (below) so prevIn aligns exactly with the
    // first in-window sync and Machine Gross reconciles to SAS Gross.
    //
    // (History machines with no startDate keep their previous-collection baseline —
    // handled in STEP 5, no meter lookup needed.)
    // ========================================================================
    const baselineMap = new Map<
      string,
      { drop: number | null; totalCancelledCredits: number | null; readAt: Date | null; jackpot?: number | null }
    >();

    // When an explicit start is picked, every machine resolves from meters; otherwise
    // only first-report machines do (history machines use their previous collection).
    const meterBaselineIds = startDate ? ids : firstReportIds;

    const machineBaselineDates = new Map<string, Date>();
    for (const machineId of meterBaselineIds) {
      let baselineDate: Date;
      if (startDate) {
        baselineDate = startDate;
      } else {
        const doc = machineHistoryMap.get(machineId);
        baselineDate = doc?.collectionTime
          ? new Date(doc.collectionTime)
          : new Date(endDate.getTime() - FIRST_REPORT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      }
      machineBaselineDates.set(machineId, baselineDate);
    }

    // Group machine IDs by their baseline date timestamp to minimise round-trips.
    const baselineDateGroups = new Map<number, string[]>();
    for (const [machineId, baselineDate] of machineBaselineDates) {
      const ts = baselineDate.getTime();
      if (!baselineDateGroups.has(ts)) baselineDateGroups.set(ts, []);
      baselineDateGroups.get(ts)!.push(machineId);
    }

    // One aggregation per unique baseline date.
    for (const [baselineTs, groupIds] of baselineDateGroups) {
      const baselineDate = new Date(baselineTs);

      const baselineRows: MeterAggRow[] = [];
      const baselineCursor = Meters.aggregate<MeterAggRow>([
        {
          $match: {
            machine: { $in: groupIds },
            meterSource: 'WOW_SYNC',
            readAt: { $lte: baselineDate },
          },
        },
        { $sort: { readAt: -1 } },
        {
          $group: {
            _id: '$machine',
            drop: { $first: '$drop' },
            totalCancelledCredits: { $first: '$totalCancelledCredits' },
            readAt: { $first: '$readAt' },
            jackpot: { $first: '$jackpot' },
          },
        },
      ]).cursor({ batchSize: 1000 });

      for await (const doc of baselineCursor) {
        baselineRows.push(doc);
      }

      const foundBaselineIds = new Set(baselineRows.map(row => String(row._id)));
      baselineRows.forEach(row =>
        baselineMap.set(String(row._id), {
          drop: row.drop,
          totalCancelledCredits: row.totalCancelledCredits,
          readAt: row.readAt,
          jackpot: row.jackpot,
        })
      );

      // No sync at/before the baseline date → earliest sync after it (machine that
      // came online after the requested start).
      const missingIds = groupIds.filter(id => !foundBaselineIds.has(id));
      if (missingIds.length > 0) {
        const fallbackCursor = Meters.aggregate<MeterAggRow>([
          {
            $match: {
              machine: { $in: missingIds },
              meterSource: 'WOW_SYNC',
              readAt: { $gt: baselineDate },
            },
          },
          { $sort: { readAt: 1 } },
          {
            $group: {
              _id: '$machine',
              drop: { $first: '$drop' },
              totalCancelledCredits: { $first: '$totalCancelledCredits' },
              readAt: { $first: '$readAt' },
              jackpot: { $first: '$jackpot' },
            },
          },
        ]).cursor({ batchSize: 1000 });

        for await (const doc of fallbackCursor) {
          baselineMap.set(String(doc._id), {
            drop: doc.drop,
            totalCancelledCredits: doc.totalCancelledCredits,
            readAt: doc.readAt,
            jackpot: doc.jackpot,
          });
        }
      }
    }

    // ========================================================================
    // STEP 5: Build result map
    // ========================================================================
    const result: Record<string, BatchMeterResult> = {};

    for (const machineId of ids) {
      const includeJackpot = machineToIncludeJackpotMap.get(machineId) ?? false;

      const currentRow = currentMeterMap.get(machineId);
      const metersIn = currentRow?.drop ?? null;
      const rawMetersOut = currentRow?.totalCancelledCredits ?? null;
      const currentJackpot = currentRow?.jackpot ?? 0;
      const metersOut = rawMetersOut !== null
        ? rawMetersOut + (includeJackpot ? currentJackpot : 0)
        : null;
      const currentReadAt = currentRow?.readAt ?? null;

      const doc = machineHistoryMap.get(machineId);
      const history = (doc?.collectionMetersHistory ?? [])
        .filter(entry => entry.timestamp)
        .sort(
          (entryA, entryB) =>
            new Date(entryB.timestamp as Date).getTime() -
            new Date(entryA.timestamp as Date).getTime()
        );

      let prevIn: number | null = null;
      let prevOut: number | null = null;
      let hasPrevious = false;
      let baselineAt: Date | null = null;

      // History baseline applies only when the caller did NOT pick an explicit
      // start — a picked Custom start wins for every machine (resolved in STEP 4).
      if (!startDate && history.length > 0) {
        prevIn = history[0].metersIn ?? null;
        prevOut = history[0].metersOut ?? null;
        hasPrevious = true;
        baselineAt = (history[0].timestamp as Date | undefined) ?? null;
      } else {
        const baseline = baselineMap.get(machineId);
        prevIn = baseline?.drop ?? null;
        const rawBaselineOut = baseline?.totalCancelledCredits ?? null;
        const baselineJackpot = baseline?.jackpot ?? 0;
        prevOut = rawBaselineOut !== null
          ? rawBaselineOut + (includeJackpot ? baselineJackpot : 0)
          : null;
        // sasStartTime = the baseline reading's actual readAt, so prevIn aligns with
        // the sync immediately before the first in-window reading (gross reconciles).
        baselineAt = baseline?.readAt ?? null;
        hasPrevious = baseline?.drop != null;
      }

      result[machineId] = {
        metersIn,
        metersOut,
        prevIn,
        prevOut,
        hasPrevious,
        currentReadAt,
        baselineAt,
        jackpot: currentJackpot,
      };
    }

    if (Date.now() - startTime > 1000) {
      console.warn(`[wow-meters/batch] Slow response: ${Date.now() - startTime}ms for ${ids.length} machines`);
    }

    return NextResponse.json({ success: true, data: result });
  });
}
