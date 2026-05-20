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
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';

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

  const isNoSMIBLocation = locationId
    ? await GamingLocations.findOne({ _id: locationId }, 'noSMIBLocation')
        .lean<{ noSMIBLocation?: boolean }>()
        .then(r => r?.noSMIBLocation === true)
    : false;

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
