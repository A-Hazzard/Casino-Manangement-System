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
 * ## Previous meter fallback
 *   1. First checks the most recent *submitted* ReportedMachine for this machine.
 *   2. If none found, falls back to Machine.collectionMeters.metersIn/Out.
 *   3. If still no data, defaults to 0.
 *
 * Flow:
 *   1. Look up the most recent submitted ReportedMachine (excluding current session).
 *   2. Fall back to Machine.collectionMeters if no prior V2 report exists.
 *   3. Compute deltas and return the movement object + prev values + sasGross.
 */

import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
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
  sasEndTime?: Date
): Promise<MovementResult> {
  // === STEP 1: Check Machine.collectionMetersHistory for the current session ===
  // If a history entry for this session already exists, its prevMetersIn/Out
  // are the ground-truth "before this session" values — written once at
  // first-submit and never mutated, even though Machine.collectionMeters gets
  // overwritten on every submit. Using those prevents the poisoned
  // collectionMeters from corrupting movement on re-edits.
  const machineForHistory = await Machine.findOne(
    { _id: machineId },
    'collectionMeters collectionMetersHistory'
  ).lean<{
    collectionMeters?: { metersIn?: number; metersOut?: number };
    collectionMetersHistory?: Array<{
      locationReportId?: string;
      prevMetersIn?: number;
      prevMetersOut?: number;
    }>;
  }>();

  const historyEntryForSession =
    machineForHistory?.collectionMetersHistory?.find(
      entry => entry.locationReportId === currentSessionId
    );

  // === STEP 2: Look up the most recent submitted V2 report for this machine ===
  const prevDoc = await ReportedMachine.findOne(
    {
      machineId,
      sessionId: { $ne: currentSessionId },
      sessionStatus: 'submitted',
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    },
    'sasMetersIn sasMetersOut'
  )
    .sort({ sasEndTime: -1 })
    .lean<{
      sasMetersIn: number;
      sasMetersOut: number;
    }>();

  // === STEP 3: Resolve previous values ===
  // Priority:
  //   1. collectionMetersHistory entry for this session (edit mode ground truth)
  //   2. Most recent other submitted ReportedMachine for this machine
  //   3. Machine.collectionMeters (first-ever capture fallback)
  let prevSasIn: number;
  let prevSasOut: number;

  if (historyEntryForSession?.prevMetersIn !== undefined) {
    // Edit mode: use the frozen prev values from the history entry
    prevSasIn = historyEntryForSession.prevMetersIn;
    prevSasOut = historyEntryForSession.prevMetersOut ?? 0;
  } else if (prevDoc) {
    prevSasIn = prevDoc.sasMetersIn ?? 0;
    prevSasOut = prevDoc.sasMetersOut ?? 0;
  } else {
    // First-time report: use the collection meters stored on the Machine document
    prevSasIn = machineForHistory?.collectionMeters?.metersIn ?? 0;
    prevSasOut = machineForHistory?.collectionMeters?.metersOut ?? 0;
  }

  const prevMeters: PrevMeters = {
    prevSasMetersIn: prevSasIn,
    prevSasMetersOut: prevSasOut,
  };

  // Resolve missing sasStartTime
  let resolvedSasStartTime = sasStartTime;
  if (!resolvedSasStartTime) {
    const prevSub = await ReportedMachine.findOne({
      machineId,
      sessionId: { $ne: currentSessionId },
      sessionStatus: 'submitted',
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .sort({ sasEndTime: -1 })
      .select('sasEndTime')
      .lean<{ sasEndTime?: Date }>();

    if (prevSub?.sasEndTime) {
      resolvedSasStartTime = prevSub.sasEndTime;
    } else {
      const machineDoc = await Machine.findOne({ _id: machineId })
        .select('collectionTime')
        .lean<{ collectionTime?: Date }>();
      resolvedSasStartTime = machineDoc?.collectionTime ?? undefined;
    }
  }

  // === STEP 3: Compute resolved sas + manual values and movement deltas ===
  let resolvedSasMetersIn: number | null = currentSasIn;
  let resolvedSasMetersOut: number | null = currentSasOut;
  let sasGross: number | null = 0;
  let manualMovIn = 0;
  let manualMovOut = 0;

  // Find machine to get its locationId to check noSMIBLocation
  const machine = await Machine.findOne(
    { _id: machineId },
    'gamingLocation'
  ).lean<{ gamingLocation?: string }>();
  let isNoSMIBLocation = false;
  if (machine?.gamingLocation) {
    const { GamingLocations } =
      await import('@/app/api/lib/models/gaminglocations');
    const locDoc = await GamingLocations.findOne(
      { _id: machine.gamingLocation },
      'noSMIBLocation'
    ).lean<{ noSMIBLocation?: boolean }>();
    isNoSMIBLocation = locDoc?.noSMIBLocation === true;
  }

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

    manualMovIn = effectiveManualIn - prevSasIn;
    manualMovOut = effectiveManualOut - prevSasOut;
  } else if (metersMatch === true) {
    // Meters match: manual === sas
    const effectiveManualIn = currentSasIn;
    const effectiveManualOut = currentSasOut;

    manualMovIn = effectiveManualIn - prevSasIn;
    manualMovOut = effectiveManualOut - prevSasOut;

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
    manualMovIn = effectiveManualIn - prevSasIn;
    manualMovOut = effectiveManualOut - prevSasOut;
  }

  const movement: ReportedMachineMovement = {
    manualMetersIn: manualMovIn,
    manualMetersOut: manualMovOut,
    machineGross: manualMovIn - manualMovOut,
  };

  return {
    prevMeters,
    movement,
    sasGross,
    resolvedSasMetersIn,
    resolvedSasMetersOut,
  };
}
