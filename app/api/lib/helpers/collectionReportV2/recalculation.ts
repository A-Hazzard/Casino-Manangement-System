/**
 * Collection Report V2 — Machine Edit Cascade
 *
 * When a machine in a submitted session is edited mid-wizard, this helper
 * cascades the changes to the Machine document only:
 *   1. Machine.collectionMetersHistory entry for this session
 *   2. Machine.collectionMeters (only if this session is the most recent
 *      history entry for this machine)
 *
 * Meter document creation/replacement is intentionally NOT done here.
 * Meters are only written once — by the submit route — after the user
 * presses the final Submit button. This prevents duplicate or premature
 * meter records from being created on every per-machine wizard save.
 */

import { Machine } from '@/app/api/lib/models/machines';

import { Meters } from '@/app/api/lib/models/meters';
import { generateMongoId } from '@/lib/utils/id';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';

type CascadeInput = {
  machineId: string;
  sessionId: string;
  locationId: string;
  locationName: string;
  sasEndTime?: Date;
  manualMetersIn?: number | null;
  manualMetersOut?: number | null;
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  prevSasMetersIn?: number;
  prevSasMetersOut?: number;
  ramClear?: boolean;
  ramClearMetersIn?: number | null;
  ramClearMetersOut?: number | null;
};

export async function cascadeMachineEdit(input: CascadeInput): Promise<void> {
  const {
    machineId,
    sessionId,
    locationId,
    sasEndTime,
    manualMetersIn,
    manualMetersOut,
    prevSasMetersIn,
    prevSasMetersOut,
  } = input;

  // Per-machine SMIB check: look up the machine's relayId directly.
  // If the machine has a relayId it has a SAS relay and manual meters should
  // NOT be written to Meter documents. Non-relay machines behave like noSMIB.
  const machineDoc = await Machine.findOne({ _id: machineId }, 'relayId').lean<{
    relayId?: string | null;
  }>();
  const isNoSMIBLocation = !machineDoc?.relayId;

  const targetMetersIn = isNoSMIBLocation
    ? (manualMetersIn ?? input.sasMetersIn)
    : input.sasMetersIn;
  const targetMetersOut = isNoSMIBLocation
    ? (manualMetersOut ?? input.sasMetersOut)
    : input.sasMetersOut;

  const now = new Date();
  const timestamp = sasEndTime ?? now;
  const prevIn = prevSasMetersIn ?? 0;
  const prevOut = prevSasMetersOut ?? 0;

  if (isNoSMIBLocation) {
    // Delete existing meters for this machine and session
    await Meters.deleteMany({
      machine: machineId,
      locationSession: sessionId,
    }).catch(deleteErr => {
      console.error(
        `[cascadeMachineEdit] Failed to delete existing Meters for machine ${machineId} session ${sessionId}:`,
        deleteErr
      );
    });

    const baseReadAt = timestamp;
    const isRamClear =
      input.ramClear === true &&
      input.ramClearMetersIn !== undefined &&
      input.ramClearMetersIn !== null &&
      input.ramClearMetersOut !== undefined &&
      input.ramClearMetersOut !== null;

    if (isRamClear) {
      // 1. RAM clear meter - captures drop up to reset point
      const ramClearMeterId = await generateMongoId();
      const ramClearMeterDoc = {
        _id: ramClearMeterId,
        machine: machineId,
        location: locationId,
        locationSession: sessionId,
        isRamClear: true,
        movement: {
          coinIn: 0,
          coinOut: 0,
          totalCancelledCredits: Number(input.ramClearMetersOut) - prevOut,
          totalHandPaidCancelledCredits: 0,
          totalWonCredits: 0,
          drop: Number(input.ramClearMetersIn) - prevIn,
          jackpot: 0,
          currentCredits: 0,
          gamesPlayed: 0,
          gamesWon: 0,
        },
        coinIn: 0,
        coinOut: 0,
        totalCancelledCredits: Number(input.ramClearMetersOut),
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: 0,
        drop: Number(input.ramClearMetersIn),
        jackpot: 0,
        currentCredits: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        meterSource: 'COLLECTION_REPORT' as const,
        readAt: new Date(baseReadAt.getTime() - 1000), // 1 second behind
        createdAt: new Date(),
      };

      await Meters.create(ramClearMeterDoc).catch(meterCreateError => {
        console.error(
          `[cascadeMachineEdit] Failed to create RAM-clear Meter for machine ${machineId}:`,
          meterCreateError
        );
      });

      // 2. Current meter - captures drop from 0 after reset
      const currentMeterId = await generateMongoId();
      const currentMeterDoc = {
        _id: currentMeterId,
        machine: machineId,
        location: locationId,
        locationSession: sessionId,
        isRamClear: false,
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
        readAt: baseReadAt, // exactly at collection time
        createdAt: new Date(new Date().getTime() + 1000),
      };

      await Meters.create(currentMeterDoc).catch(meterCreateError => {
        console.error(
          `[cascadeMachineEdit] Failed to create post-RAM-clear Meter for machine ${machineId}:`,
          meterCreateError
        );
      });
    } else {
      // Non-RAM-clear path: single Meter doc with the normal delta
      const meterId = await generateMongoId();
      const meterDoc = {
        _id: meterId,
        machine: machineId,
        location: locationId,
        locationSession: sessionId,
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
        readAt: baseReadAt,
        createdAt: new Date(),
      };

      await Meters.create(meterDoc).catch(meterCreateError => {
        console.error(
          `[cascadeMachineEdit] Failed to create Meter document for machine ${machineId}:`,
          meterCreateError
        );
      });
    }
  }

  // ============================================================================
  // 1. Update Machine's collectionMetersHistory entry for this session
  // ============================================================================
  const historyEntry = {
    metersIn: targetMetersIn ?? 0,
    metersOut: targetMetersOut ?? 0,
    prevMetersIn: prevIn,
    prevMetersOut: prevOut,
    timestamp,
    locationReportId: sessionId,
  };

  await Machine.findOneAndUpdate(
    { _id: machineId, 'collectionMetersHistory.locationReportId': sessionId },
    {
      $set: {
        'collectionMetersHistory.$.metersIn': historyEntry.metersIn,
        'collectionMetersHistory.$.metersOut': historyEntry.metersOut,
        'collectionMetersHistory.$.prevMetersIn': historyEntry.prevMetersIn,
        'collectionMetersHistory.$.prevMetersOut': historyEntry.prevMetersOut,
        'collectionMetersHistory.$.timestamp': historyEntry.timestamp,
      },
    }
  ).catch(err => {
    console.error(
      `[cascadeMachineEdit] Failed to update collectionMetersHistory for machine ${machineId}:`,
      err
    );
  });

  // ============================================================================
  // 2. Update collectionMeters (and sasMeters for noSMIB) only if this session
  //    is the MOST RECENT history entry for this machine
  // ============================================================================
  const currentMachine = await Machine.findOne(
    { _id: machineId },
    'collectionMetersHistory collectionMeters'
  ).lean<{
    collectionMetersHistory?: Array<{
      locationReportId?: string;
      timestamp?: Date;
    }>;
    collectionMeters?: { metersIn?: number; metersOut?: number };
  }>();

  if (currentMachine?.collectionMetersHistory?.length) {
    const sorted = [...currentMachine.collectionMetersHistory].sort(
      (a, b) =>
        new Date(b.timestamp ?? 0).getTime() -
        new Date(a.timestamp ?? 0).getTime()
    );
    const mostRecent = sorted[0];

    if (mostRecent?.locationReportId === sessionId) {
      const mostRecentFields: Record<string, unknown> = {
        'collectionMeters.metersIn': targetMetersIn ?? null,
        'collectionMeters.metersOut': targetMetersOut ?? null,
      };

      // For noSMIB locations mirror the entered values into sasMeters so
      // dashboard queries (which read sasMeters.drop / totalCancelledCredits)
      // stay in sync. SMIB locations own these fields via the live relay.
      if (isNoSMIBLocation) {
        mostRecentFields['sasMeters.drop'] = targetMetersIn ?? null;
        mostRecentFields['sasMeters.totalCancelledCredits'] =
          targetMetersOut ?? null;
      }

      await Machine.findOneAndUpdate(
        { _id: machineId },
        { $set: mostRecentFields }
      ).catch(err => {
        console.error(
          `[cascadeMachineEdit] Failed to update collectionMeters for machine ${machineId}:`,
          err
        );
      });
    }
  }
}

export async function propagateV2MetersToNextSession(
  machineId: string,
  currentSessionId: string,
  targetMetersIn: number | null,
  targetMetersOut: number | null,
  sasEndTime: Date | undefined
): Promise<void> {
  if (!sasEndTime) return;

  const nextReport = await ReportedMachine.findOne({
    machineId,
    sessionStatus: 'submitted',
    sessionId: { $ne: currentSessionId },
    sasEndTime: { $gt: sasEndTime },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .sort({ sasEndTime: 1 })
    .lean();

  if (!nextReport) return;

  const resolvedPrevIn = targetMetersIn ?? 0;
  const resolvedPrevOut = targetMetersOut ?? 0;

  let manualMovIn = 0;
  let manualMovOut = 0;
  const effectiveManualIn =
    nextReport.manualMetersIn ?? nextReport.sasMetersIn ?? 0;
  const effectiveManualOut =
    nextReport.manualMetersOut ?? nextReport.sasMetersOut ?? 0;

  if (
    nextReport.ramClear &&
    nextReport.ramClearMetersIn !== undefined &&
    nextReport.ramClearMetersOut !== undefined
  ) {
    manualMovIn =
      nextReport.ramClearMetersIn - resolvedPrevIn + effectiveManualIn;
    manualMovOut =
      nextReport.ramClearMetersOut - resolvedPrevOut + effectiveManualOut;
  } else {
    manualMovIn = effectiveManualIn - resolvedPrevIn;
    manualMovOut = effectiveManualOut - resolvedPrevOut;
  }

  const updatedMovement = {
    manualMetersIn: manualMovIn,
    manualMetersOut: manualMovOut,
    machineGross: manualMovIn - manualMovOut,
  };

  await ReportedMachine.updateOne(
    { _id: nextReport._id },
    {
      $set: {
        prevSasMetersIn: resolvedPrevIn,
        prevSasMetersOut: resolvedPrevOut,
        movement: updatedMovement,
      },
    }
  );
}
