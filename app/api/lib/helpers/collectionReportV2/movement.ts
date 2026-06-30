/**
 * Collection Report V2 — Movement Delta Calculation Helper
 *
 * Calculates the movement (delta) between the current meter readings and the
 * previous submitted session's readings for each machine.
 *
 * ## Movement definition
 *
 * movement.manualMetersIn  = currentManualIn  - prevSasMetersIn
 * movement.manualMetersOut = currentManualOut - prevSasMetersOut
 * movement.machineGross    = movement.manualMetersIn - movement.manualMetersOut
 *
 * SAS/system values (sasMetersIn, sasMetersOut, sasGross) are stored at the
 * top level of the ReportedMachine document — NOT inside movement.
 *
 * ## When `metersMatch === true`
 *   - The collector confirmed the picture matches the meter display.
 *   - manualMetersIn/Out = sasMetersIn/Out (they're the same).
 *   - movement.manualMetersIn  = sasMetersIn  - prevSasMetersIn
 *   - movement.manualMetersOut = sasMetersOut - prevSasMetersOut
 *   - sasGross = SUM of meters.movement.drop - SUM of meters.movement.totalCancelledCredits
 *                queried over [sasStartTime, sasEndTime] for this machine.
 *
 * ## When `metersMatch === false`
 *   - The collector entered their own manual values.
 *   - sasMetersIn  = Machine.sasMeters.drop
 *   - sasMetersOut = Machine.sasMeters.totalCancelledCredits
 *   - sasGross     = sasMetersIn - sasMetersOut
 *   - movement.manualMetersIn  = currentManualIn  - prevSasMetersIn
 *   - movement.manualMetersOut = currentManualOut - prevSasMetersOut
 *
 * ## When `ramClear === true` (any branch)
 *   - The machine's meters were reset between collections.
 *   - ramClearMetersIn/Out hold the pre-reset peak; current meters start from 0.
 *   - movement.manualMetersIn  = (ramClearMetersIn  - prevSasMetersIn)  + effectiveIn
 *   - movement.manualMetersOut = (ramClearMetersOut - prevSasMetersOut) + effectiveOut
 *   - sasGross calculation is unchanged.
 *
 * ## Previous meter fallback (unified history)
 *   1. collectionMetersHistory entry for this session (edit mode ground truth)
 *   2. Most recent collectionMetersHistory entry chronologically before this session
 *      (unified — includes both V1 collections and V2 sessions)
 *   3. Machine.collectionMeters.metersIn/Out (first-ever fallback)
 *   4. 0
 *
 * ## SAS start time fallback
 *   1. Provided sasStartTime
 *   2. Previous V2 ReportedMachine.sasEndTime
 *   3. Previous V1 Collections.sasMeters.sasEndTime
 *   4. Machine.previousCollectionTime → Machine.collectionTime
 *
 * Flow:
 *   1. Look up the most recent submitted ReportedMachine (excluding current session).
 *   2. Fall back to Machine.collectionMeters if no prior V2 report exists.
 *   3. Compute deltas and return the movement object + prev values + sasGross.
 */

import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { Collections } from '@/app/api/lib/models/collections';
import type { ReportedMachineMovement } from '@/app/api/lib/models/reportedMachines';

type PrevMeters = {
  prevSasMetersIn: number;
  prevSasMetersOut: number;
};

type MovementResult = {
  prevMeters: PrevMeters;
  movement: ReportedMachineMovement;
  /** Computed sasGross to store at the top level of the ReportedMachine */
  sasGross: number | null;
  /** Resolved top-level sasMetersIn (may be overridden for metersMatch false) */
  resolvedSasMetersIn: number | null;
  /** Resolved top-level sasMetersOut (may be overridden for metersMatch false) */
  resolvedSasMetersOut: number | null;
  isSupplemental?: boolean;
};

/**
 * Fetch the previous submitted meter readings for a machine and compute the
 * movement delta given the current (just-captured) meter values.
 *
 * @param machineId         - The machine being collected
 * @param currentSessionId  - The in-progress session ID (excluded from the lookup)
 * @param currentSasIn      - SAS metersIn read from the machine at capture time
 * @param currentSasOut     - SAS metersOut read from the machine at capture time
 * @param currentManualIn   - Manual metersIn entered by the collector (undefined = same as SAS)
 * @param currentManualOut  - Manual metersOut entered by the collector (undefined = same as SAS)
 * @param metersMatch       - Whether the collector confirmed meters match the photo
 * @param sasStartTime      - Start of the SAS reading window (for time-range aggregation)
 * @param sasEndTime        - End of the SAS reading window (for time-range aggregation)
 * @param ramClear          - True if the machine's meters were reset between collections
 * @param ramClearMetersIn  - Pre-reset peak metersIn (only meaningful when ramClear===true)
 * @param ramClearMetersOut - Pre-reset peak metersOut (only meaningful when ramClear===true)
 */
export async function computeMovement(
  machineId: string,
  currentSessionId: string,
  currentSasIn: number,
  currentSasOut: number,
  currentManualIn: number | undefined,
  currentManualOut: number | undefined,
  metersMatch: boolean | undefined,
  sasStartTime?: Date,
  sasEndTime?: Date,
  ramClear?: boolean,
  ramClearMetersIn?: number,
  ramClearMetersOut?: number,
  softMetersIn?: number | null,
  softMetersOut?: number | null
): Promise<MovementResult> {
  // === STEP 1: Check Machine.collectionMetersHistory for the current session ===
  // If a history entry for this session already exists, its prevMetersIn/Out
  // are the ground-truth "before this session" values — written once at
  // first-submit and never mutated, even though Machine.collectionMeters gets
  // overwritten on every submit. Using those prevents the poisoned
  // collectionMeters from corrupting movement on re-edits.
  // Also loads the full history array for prev-value fallback across V1/V2.
  const machineForHistory = await Machine.findOne(
    { _id: machineId },
    'collectionMeters collectionMetersHistory'
  ).lean<{
    collectionMeters?: { metersIn?: number; metersOut?: number };
    collectionMetersHistory?: Array<{
      locationReportId?: string;
      metersIn?: number;
      metersOut?: number;
      prevMetersIn?: number;
      prevMetersOut?: number;
      timestamp?: Date;
    }>;
  }>();

  const historyEntryForSession =
    machineForHistory?.collectionMetersHistory?.find(
      entry => entry.locationReportId === currentSessionId
    );

  // === STEP 2: Find the most recent history entry chronologically BEFORE this session ===
  // Uses the unified collectionMetersHistory (contains both V1 and V2 entries
  // thanks to recalculateMachineCollections merging both timelines).
  const referenceTime = sasEndTime ?? new Date();
  const historyArray = machineForHistory?.collectionMetersHistory ?? [];
  const sortedHistory = [...historyArray]
    .filter(entry => entry.timestamp && entry.timestamp < referenceTime)
    .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));

  const previousHistoryEntry = sortedHistory[0];

  // === STEP 3: Resolve previous values ===
  // Priority:
  //   1. collectionMetersHistory entry for this session (edit mode ground truth)
  //   2. Most recent collectionMetersHistory entry before this session (unified V1+V2),
  //      cross-checked against Machine.collectionMeters to guard against stale history
  //   3. Machine.collectionMeters (first-ever capture fallback)
  //
  // Math.max guards: collectionMeters is the ground truth updated by every report
  // finalization. History entries can lag behind when meters advance via orphan V1
  // documents or other paths that don't update history. Using the larger value
  // ensures we never go backwards.
  let prevSasIn: number;
  let prevSasOut: number;

  if (historyEntryForSession?.prevMetersIn !== undefined) {
    // Edit mode: use the frozen prev values from the history entry
    prevSasIn = historyEntryForSession.prevMetersIn;
    prevSasOut = historyEntryForSession.prevMetersOut ?? 0;
  } else if (previousHistoryEntry) {
    prevSasIn = Math.max(
      previousHistoryEntry.metersIn ?? 0,
      machineForHistory?.collectionMeters?.metersIn ?? 0
    );
    prevSasOut = Math.max(
      previousHistoryEntry.metersOut ?? 0,
      machineForHistory?.collectionMeters?.metersOut ?? 0
    );
  } else {
    // First-time report: use the collection meters stored on the Machine document
    prevSasIn = machineForHistory?.collectionMeters?.metersIn ?? 0;
    prevSasOut = machineForHistory?.collectionMeters?.metersOut ?? 0;
  }

  const prevMeters: PrevMeters = {
    prevSasMetersIn: prevSasIn,
    prevSasMetersOut: prevSasOut,
  };

  // Resolve missing sasStartTime — query both V1 and V2, pick the MOST RECENT
  // regardless of which version it came from.
  let resolvedSasStartTime = sasStartTime;
  if (!resolvedSasStartTime) {
    const [prevV2, prevV1] = await Promise.all([
      ReportedMachine.findOne({
        machineId,
        sessionId: { $ne: currentSessionId },
        sessionStatus: 'submitted',
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
        .sort({ sasEndTime: -1 })
        .select('sasEndTime')
        .lean<{ sasEndTime?: Date }>(),
      Collections.findOne({
        machineId,
        isCompleted: true,
        'sasMeters.sasEndTime': { $exists: true },
      })
        .sort({ 'sasMeters.sasEndTime': -1 })
        .select('sasMeters.sasEndTime')
        .lean<{ sasMeters?: { sasEndTime?: Date } }>(),
    ]);

    const v2Time = prevV2?.sasEndTime?.getTime() ?? 0;
    const v1Time = prevV1?.sasMeters?.sasEndTime?.getTime() ?? 0;

    if (v2Time > 0 && v1Time > 0) {
      resolvedSasStartTime = v2Time > v1Time
        ? prevV2!.sasEndTime!
        : prevV1!.sasMeters!.sasEndTime!;
    } else if (v2Time > 0) {
      resolvedSasStartTime = prevV2!.sasEndTime!;
    } else if (v1Time > 0) {
      resolvedSasStartTime = prevV1!.sasMeters!.sasEndTime!;
    } else {
      const machineDoc = await Machine.findOne({ _id: machineId })
        .select('collectionTime previousCollectionTime')
        .lean<{ collectionTime?: Date; previousCollectionTime?: Date }>();
      resolvedSasStartTime = machineDoc?.previousCollectionTime ?? machineDoc?.collectionTime ?? undefined;
    }
  }

  // === STEP 3: Compute resolved sas + manual values and movement deltas ===
  let resolvedSasMetersIn: number | null = currentSasIn;
  let resolvedSasMetersOut: number | null = currentSasOut;
  let sasGross: number | null = 0;
  let manualMovIn = 0;
  let manualMovOut = 0;

  // Find machine to get its relayId (per-machine SMIB detection) and offline status.
  const machine = await Machine.findOne(
    { _id: machineId },
    'gamingLocation relayId lastActivity'
  ).lean<{
    gamingLocation?: string;
    relayId?: string | null;
    lastActivity?: Date | string;
  }>();
  const hasRelay = !!machine?.relayId;
  const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000;
  const isOffline =
    hasRelay &&
    (!machine?.lastActivity ||
      new Date().getTime() - new Date(machine.lastActivity).getTime() >=
        OFFLINE_THRESHOLD_MS);
  // Non-relay machines (no relayId) behave like noSMIB: manual meters used.
  const isNoSMIBLocation = !hasRelay;

  if (isNoSMIBLocation) {
    const effectiveManualIn = currentManualIn ?? currentSasIn;
    const effectiveManualOut = currentManualOut ?? currentSasOut;

    // noSMIB: there is no SAS relay, so sasMetersIn/Out must be null.
    // Storing the manual values there caused them to leak into SAS columns
    // ("Lifetime SAS In", "Movement SAS") if the location was later switched
    // to SMIB. Manual values belong only in manualMetersIn/Out.
    resolvedSasMetersIn = null;
    resolvedSasMetersOut = null;
    sasGross = null;

    if (
      ramClear &&
      ramClearMetersIn !== undefined &&
      ramClearMetersOut !== undefined
    ) {
      manualMovIn = ramClearMetersIn - prevSasIn + effectiveManualIn;
      manualMovOut = ramClearMetersOut - prevSasOut + effectiveManualOut;
    } else {
      manualMovIn = effectiveManualIn - prevSasIn;
      manualMovOut = effectiveManualOut - prevSasOut;
    }
  } else if (metersMatch === true) {
    // Meters match: manual === sas
    const effectiveManualIn = currentSasIn;
    const effectiveManualOut = currentSasOut;

    if (
      ramClear &&
      ramClearMetersIn !== undefined &&
      ramClearMetersOut !== undefined
    ) {
      manualMovIn = ramClearMetersIn - prevSasIn + effectiveManualIn;
      manualMovOut = ramClearMetersOut - prevSasOut + effectiveManualOut;
    } else {
      manualMovIn = effectiveManualIn - prevSasIn;
      manualMovOut = effectiveManualOut - prevSasOut;
    }

    // sasGross = SUM of meters.movement.drop - SUM of meters.movement.totalCancelledCredits
    // over the [sasStartTime, sasEndTime] window
    if (resolvedSasStartTime && sasEndTime) {
      const [agg] = await Meters.aggregate<{
        totalDrop: number;
        totalCancelledCredits: number;
      }>([
        {
          $match: {
            machine: machineId,
            readAt: { $gte: resolvedSasStartTime, $lte: sasEndTime },
          },
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelledCredits: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
          },
        },
      ]);
      const sumDrop = agg?.totalDrop ?? 0;
      const sumCancelled = agg?.totalCancelledCredits ?? 0;
      sasGross = sumDrop - sumCancelled;
    } else {
      // Fallback if times not provided
      sasGross = currentSasIn - currentSasOut;
    }
  } else {
    // Meters do NOT match: use sasMeters from the Machine document as the authoritative SAS values
    const machineDoc = await Machine.findOne(
      { _id: machineId },
      'sasMeters'
    ).lean<{
      sasMeters?: { drop?: number; totalCancelledCredits?: number };
    }>();

    resolvedSasMetersIn = machineDoc?.sasMeters?.drop ?? currentSasIn;
    resolvedSasMetersOut =
      machineDoc?.sasMeters?.totalCancelledCredits ?? currentSasOut;
    sasGross = resolvedSasMetersIn - resolvedSasMetersOut;

    const effectiveManualIn = currentManualIn ?? currentSasIn;
    const effectiveManualOut = currentManualOut ?? currentSasOut;
    if (
      ramClear &&
      ramClearMetersIn !== undefined &&
      ramClearMetersOut !== undefined
    ) {
      manualMovIn = ramClearMetersIn - prevSasIn + effectiveManualIn;
      manualMovOut = ramClearMetersOut - prevSasOut + effectiveManualOut;
    } else {
      manualMovIn = effectiveManualIn - prevSasIn;
      manualMovOut = effectiveManualOut - prevSasOut;
    }
  }

  const softIn = softMetersIn ?? 0;
  const softOut = softMetersOut ?? 0;
  const movement: ReportedMachineMovement = {
    manualMetersIn: manualMovIn,
    manualMetersOut: manualMovOut,
    machineGross: manualMovIn - manualMovOut + softIn - softOut,
  };

  return {
    prevMeters,
    movement,
    sasGross,
    resolvedSasMetersIn,
    resolvedSasMetersOut,
    isSupplemental: isOffline,
  };
}
