/**
 * Collection Report V2 — Machine Edit Cascade
 *
 * When a machine in a submitted session is edited mid-wizard, this helper
 * cascades the changes to the Machine document and Meter documents:
 *   1. Machine.collectionMetersHistory entry for this session
 *   2. Machine.collectionMeters (only if this session is the most recent
 *      history entry for this machine)
 *   3. Meter documents for offline/no-SMIB machines (replaceOne upsert)
 */

import { Machine } from '@/app/api/lib/models/machines';

import { Meters } from '@/app/api/lib/models/meters';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import type { ReportedMachineDocument } from '@/app/api/lib/models/reportedMachines';

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

  // Per-machine SMIB check: look up the machine's relayId and lastActivity.
  // If the machine has a relayId it has a SAS relay and manual meters should
  // NOT be written to Meter documents. Non-relay machines behave like noSMIB.
  // Offline SMIB machines (relay present but stale lastActivity) also get updated.
  const machineDoc = await Machine.findOne({ _id: machineId }, 'relayId lastActivity gamingLocation').lean<{
    relayId?: string | null;
    lastActivity?: Date;
    gamingLocation?: string;
  }>();
  const isNoSMIBLocation = !machineDoc?.relayId;
  const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes for testing (TODO: restore 72h)
  const isOffline =
    !!machineDoc?.relayId &&
    (!machineDoc.lastActivity ||
      new Date().getTime() - new Date(machineDoc.lastActivity).getTime() >=
        OFFLINE_THRESHOLD_MS);

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

  if (isNoSMIBLocation || isOffline) {
    // Use replaceOne with upsert instead of deleteMany+create for idempotency.
    // Concurrent calls with the same machine+session target the same document
    // atomically — no duplicate meters possible.

    const baseReadAt = timestamp;
    const isRamClear =
      input.ramClear === true &&
      input.ramClearMetersIn !== undefined &&
      input.ramClearMetersIn !== null &&
      input.ramClearMetersOut !== undefined &&
      input.ramClearMetersOut !== null;

    if (isRamClear) {
      // 1. RAM clear meter - captures drop up to reset point
      const ramClearFilter = {
        machine: machineId,
        locationSession: sessionId,
        isRamClear: true as const,
      };
      const ramClearMeterDoc = {
        machine: machineId,
        location: String(machineDoc?.gamingLocation || locationId || ''),
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

      await Meters.replaceOne(ramClearFilter, ramClearMeterDoc, {
        upsert: true,
      }).catch(meterCreateError => {
        console.error(
          `[cascadeMachineEdit] Failed to upsert RAM-clear Meter for machine ${machineId}:`,
          meterCreateError
        );
      });

      // 2. Current meter - captures drop from 0 after reset
      const currentFilter = {
        machine: machineId,
        locationSession: sessionId,
        isRamClear: false as const,
      };
      const currentMeterDoc = {
        machine: machineId,
        location: String(machineDoc?.gamingLocation || locationId || ''),
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

      await Meters.replaceOne(currentFilter, currentMeterDoc, {
        upsert: true,
      }).catch(meterCreateError => {
        console.error(
          `[cascadeMachineEdit] Failed to upsert post-RAM-clear Meter for machine ${machineId}:`,
          meterCreateError
        );
      });
    } else {
      // Non-RAM-clear path: single Meter doc with the normal delta
      const meterFilter = {
        machine: machineId,
        locationSession: sessionId,
        isRamClear: false as const,
      };
      const meterDoc = {
        machine: machineId,
        location: String(machineDoc?.gamingLocation || locationId || ''),
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

      await Meters.replaceOne(meterFilter, meterDoc, {
        upsert: true,
      }).catch(meterCreateError => {
        console.error(
          `[cascadeMachineEdit] Failed to upsert Meter document for machine ${machineId}:`,
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
    reportVersion: 2,
  };

  // Use find-modify-save to reliably update subdocument fields including new ones.
  const machine = await Machine.findOne({ _id: machineId });
  if (machine) {
    const historyArray = machine.collectionMetersHistory as Array<{
      locationReportId?: string;
      metersIn: number;
      metersOut: number;
      prevMetersIn: number;
      prevMetersOut: number;
      timestamp: Date;
      reportVersion?: number;
    }> | undefined;
    const entry = historyArray?.find(
      (item) => item.locationReportId === sessionId
    );
    if (entry) {
      entry.metersIn = historyEntry.metersIn;
      entry.metersOut = historyEntry.metersOut;
      entry.prevMetersIn = historyEntry.prevMetersIn;
      entry.prevMetersOut = historyEntry.prevMetersOut;
      entry.timestamp = historyEntry.timestamp;
      entry.reportVersion = historyEntry.reportVersion;
      await machine.save().catch((err: unknown) => {
        console.error(
          `[cascadeMachineEdit] Failed to update collectionMetersHistory for machine ${machineId}:`,
          err instanceof Error ? err.message : 'Unknown error'
        );
      });
    }
  }

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

      // For noSMIB locations AND offline SMIB locations, mirror the entered values
      // into sasMeters so dashboard queries (which read sasMeters.drop /
      // totalCancelledCredits) stay in sync. Online SMIB machines own these fields
      // via the live relay.
      if (isNoSMIBLocation || isOffline) {
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
    .lean<ReportedMachineDocument>();

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
