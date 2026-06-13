/**
 * Collection Report V2 — Variation Checker Helper
 *
 * Compares machine gross (movement delta from collector-entered meters) against
 * SAS gross (aggregated meter documents within the sasStartTime/sasEndTime window)
 * for each SMIB machine in a session.
 *
 * Mirrors V1's check-variations route logic, adapted for the V2 ReportedMachine model.
 *
 * @module app/api/lib/helpers/collectionReportV2/variationChecker
 */

import { Meters } from '@/app/api/lib/models/meters';
import { Licencee } from '@/app/api/lib/models/licencee';
import type { ReportedMachineDocument } from '@/app/api/lib/models/reportedMachines';
import type { VariationResult, VariationMachineResult } from '@/app/api/lib/types/collectionReportV2';

// ============================================================================
// Types
// ============================================================================

type MeterAggResult = {
  _id: string;
  totalDrop: number;
  totalCancelled: number;
  totalJackpot: number;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Compute per-machine variation between machine gross and SAS gross for a session.
 * Only machines that have a sasStartTime, sasEndTime, and non-null sasMetersIn
 * are included (no-SMIB and skipped machines are excluded).
 */
export async function checkSessionVariations(
  machines: ReportedMachineDocument[],
  licenceeId: string
): Promise<VariationResult> {
  const eligibleMachines = machines.filter(
    m =>
      m.sasStartTime &&
      m.sasEndTime &&
      (m.sasMetersIn as number | null) != null &&
      m.status !== 'skipped'
  );

  if (eligibleMachines.length === 0) {
    return { hasVariations: false, totalVariation: 0, machines: [] };
  }

  const includeJackpot = await fetchIncludeJackpot(licenceeId);
  const meterDataMap = await aggregateMetersByMachine(eligibleMachines);

  let totalVariation = 0;
  const machineResults: VariationMachineResult[] = [];

  for (const machine of eligibleMachines) {
    const machineId = String(machine.machineId);
    const movement = machine.movement as { machineGross?: number } | undefined;
    const meterGross = movement?.machineGross ?? 0;
    const meterData = meterDataMap.get(machineId);

    if (!meterData) {
      machineResults.push({
        machineId,
        machineName: String(machine.machineName),
        variation: meterGross,
        meterGross,
        sasGross: null,
        sasStartTime: machine.sasStartTime as Date | undefined,
        sasEndTime: machine.sasEndTime as Date | undefined,
      });
      totalVariation += meterGross;
      continue;
    }

    const rawSasGross = meterData.totalDrop - meterData.totalCancelled;
    const adjustedSasGross = includeJackpot
      ? rawSasGross - meterData.totalJackpot
      : rawSasGross;
    const variation = meterGross - adjustedSasGross;
    totalVariation += variation;

    machineResults.push({
      machineId,
      machineName: String(machine.machineName),
      variation,
      meterGross,
      sasGross: adjustedSasGross,
      sasStartTime: machine.sasStartTime as Date | undefined,
      sasEndTime: machine.sasEndTime as Date | undefined,
    });
  }

  return {
    hasVariations: Math.abs(totalVariation) > 0.001,
    totalVariation,
    machines: machineResults,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function fetchIncludeJackpot(licenceeId: string): Promise<boolean> {
  if (!licenceeId) return false;
  const licenceeDoc = await Licencee.findOne({ _id: licenceeId })
    .select('includeJackpot')
    .lean<{ includeJackpot?: boolean }>();
  return licenceeDoc?.includeJackpot ?? false;
}

async function aggregateMetersByMachine(
  machines: ReportedMachineDocument[]
): Promise<Map<string, { totalDrop: number; totalCancelled: number; totalJackpot: number }>> {
  const conditions = machines.map(m => {
    const startTime = new Date(m.sasStartTime as unknown as string);
    const endTime = new Date(m.sasEndTime as unknown as string);
    return {
      machine: String(m.machineId),
      readAt: {
        $gte: new Date(startTime.getTime() - 60000),
        $lte: endTime,
      },
      $or: [
        { meterSource: { $ne: 'COLLECTION_REPORT' } },
        {
          meterSource: 'COLLECTION_REPORT',
          isSupplemental: true,
          readAt: endTime,
        },
      ],
    };
  });

  const cursor = Meters.aggregate<MeterAggResult>([
    { $match: { $or: conditions } },
    {
      $group: {
        _id: '$machine',
        totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
        totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
      },
    },
  ]).cursor({ batchSize: 1000 });

  const result = new Map<string, { totalDrop: number; totalCancelled: number; totalJackpot: number }>();
  for await (const doc of cursor) {
    result.set(String(doc._id), {
      totalDrop: doc.totalDrop,
      totalCancelled: doc.totalCancelled,
      totalJackpot: doc.totalJackpot,
    });
  }
  return result;
}
