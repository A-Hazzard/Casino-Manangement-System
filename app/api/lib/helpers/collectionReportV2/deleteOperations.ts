/**
 * Collection Report V2 — Delete Operations Helper
 *
 * Handles machine meter state reversion when a V2 session is permanently deleted.
 * Mirrors the V1 revertMachineCollectionMeters + removeCollectionHistoryFromMachines
 * operations, adapted for the V2 ReportedMachine/session model.
 *
 * @module app/api/lib/helpers/collectionReportV2/deleteOperations
 */

import { Machine } from '@/app/api/lib/models/machines';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import type { ReportedMachineDocument } from '@/app/api/lib/models/reportedMachines';

// ============================================================================
// Types
// ============================================================================

type MachineRevertTarget = {
  machineId: string;
  prevSasMetersIn: number;
  prevSasMetersOut: number;
  sasEndTime: Date | undefined;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * After a V2 session is deleted:
 * 1. Reverts Machine.collectionMeters to the previous session's meter values.
 * 2. Removes the deleted session's entry from Machine.collectionMetersHistory.
 *
 * Must be called BEFORE ReportedMachine.deleteMany so machine data is accessible.
 */
export async function revertMachineMetersAfterSessionDelete(
  sessionId: string,
  machines: ReportedMachineDocument[]
): Promise<void> {
  const uniqueMachineIds = [...new Set(machines.map(m => String(m.machineId)))];
  const revertTargets: MachineRevertTarget[] = buildRevertTargets(
    uniqueMachineIds,
    machines
  );

  await Promise.all(revertTargets.map(target => revertSingleMachine(sessionId, target)));
}

// ============================================================================
// Internal Helpers
// ============================================================================

function buildRevertTargets(
  uniqueMachineIds: string[],
  machines: ReportedMachineDocument[]
): MachineRevertTarget[] {
  return uniqueMachineIds.map(machineId => {
    const machine = machines.find(m => String(m.machineId) === machineId)!;
    return {
      machineId,
      prevSasMetersIn: (machine.prevSasMetersIn as number | undefined) ?? 0,
      prevSasMetersOut: (machine.prevSasMetersOut as number | undefined) ?? 0,
      sasEndTime: machine.sasEndTime as Date | undefined,
    };
  });
}

async function revertSingleMachine(
  sessionId: string,
  target: MachineRevertTarget
): Promise<void> {
  const { machineId, sasEndTime } = target;
  let revertToIn = target.prevSasMetersIn;
  let revertToOut = target.prevSasMetersOut;

  if (sasEndTime) {
    const previousSession = await ReportedMachine.findOne({
      machineId,
      sessionStatus: 'submitted',
      sessionId: { $ne: sessionId },
      sasEndTime: { $lt: sasEndTime },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .sort({ sasEndTime: -1 })
      .select('sasMetersIn sasMetersOut manualMetersIn manualMetersOut')
      .lean<ReportedMachineDocument>();

    if (previousSession) {
      revertToIn =
        (previousSession.sasMetersIn as number | null | undefined) ??
        (previousSession.manualMetersIn as number | null | undefined) ??
        revertToIn;
      revertToOut =
        (previousSession.sasMetersOut as number | null | undefined) ??
        (previousSession.manualMetersOut as number | null | undefined) ??
        revertToOut;
    }
  }

  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        'collectionMeters.metersIn': revertToIn,
        'collectionMeters.metersOut': revertToOut,
        updatedAt: new Date(),
      },
      $pull: {
        collectionMetersHistory: { locationReportId: sessionId },
      },
    }
  ).catch(error => {
    console.error(
      `[revertMachineMetersAfterSessionDelete] Failed to revert machine ${machineId}:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
  });
}
