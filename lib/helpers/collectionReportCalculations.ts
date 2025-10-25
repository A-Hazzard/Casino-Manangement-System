import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type { CollectionReportMachineEntry } from '@/lib/types/collections';
import type { GamingMachine as MachineType } from '@/shared/types/entities';

/**
 * Calculates totalDrop, totalCancelled, totalGross, and totalSasGross for a collection report.
 * @param payload - The raw payload from the frontend.
 * @returns An object with calculated totals.
 */
export async function calculateCollectionReportTotals(
  payload: CreateCollectionReportPayload & {
    machines?: CollectionReportMachineEntry[];
  }
) {
  const machines: CollectionReportMachineEntry[] = payload.machines || [];
  let totalDrop = 0;
  let totalCancelled = 0;

  for (const m of machines) {
    // Fetch previous meters from the machine
    const machineDocRaw = await Machine.findOne({ _id: m.machineId }).lean();
    const machineDoc =
      machineDocRaw && !Array.isArray(machineDocRaw)
        ? (machineDocRaw as unknown as MachineType)
        : null;
    const prevIn = machineDoc?.collectionMeters?.metersIn || 0;
    const prevOut = machineDoc?.collectionMeters?.metersOut || 0;
    const currIn = Number(m.metersIn) || 0;
    const currOut = Number(m.metersOut) || 0;
    totalDrop += currIn - prevIn;
    totalCancelled += currOut - prevOut;
  }
  const totalGross = totalDrop - totalCancelled;

  // Calculate SAS Gross: sum of all movement.drop - sum of all movement.totalCancelledCredits for all meters of these machines
  let sasDrop = 0;
  let sasCancelled = 0;
  for (const m of machines) {
    const meterDocs = await Meters.find({ machine: m.machineId }).lean();
    for (const meter of meterDocs) {
      sasDrop += meter?.movement?.drop || 0;
      sasCancelled += meter?.movement?.totalCancelledCredits || 0;
    }
  }
  const totalSasGross = sasDrop - sasCancelled;

  return {
    totalDrop,
    totalCancelled,
    totalGross,
    totalSasGross,
  };
}
