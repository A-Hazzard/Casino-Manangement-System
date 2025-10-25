import { Machine } from '@/app/api/lib/models/machines';
import { Collections } from '@/app/api/lib/models/collections';
import { calculateMovement } from '@/lib/utils/movementCalculation';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type { CollectionReportMachineEntry } from '@/lib/types/collections';
import type { GamingMachine as MachineType } from '@/shared/types/entities';

/**
 * Calculates totalDrop, totalCancelled, totalGross, and totalSasGross for a collection report.
 * This function sums up the metrics from individual collection documents that were already created.
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
  let totalSasDrop = 0;
  let totalSasCancelled = 0;

  // Calculate meter movement totals using proper movement calculation
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

    // Use the same movement calculation logic as the backend
    const movement = calculateMovement(
      currIn,
      currOut,
      { metersIn: prevIn, metersOut: prevOut },
      m.ramClear || false,
      m.ramClearCoinIn,
      m.ramClearCoinOut,
      m.ramClearMetersIn,
      m.ramClearMetersOut
    );

    totalDrop += movement.metersIn;
    totalCancelled += movement.metersOut;
  }
  const totalGross = totalDrop - totalCancelled;

  // Get SAS metrics from the individual collection documents that were already created
  // These collections were created via /api/collections POST and have properly calculated SAS metrics
  if (payload.locationReportId) {
    console.warn(
      `🔍 Querying collections for locationReportId: ${payload.locationReportId}`
    );

    const collections = await Collections.find({
      locationReportId: payload.locationReportId,
    }).lean();

    console.warn(
      `📊 Found ${collections.length} collections for SAS metrics calculation`
    );

    if (collections.length > 0) {
      console.warn(
        `📋 Sample SAS metrics from collections:`,
        collections.map(c => ({
          machineId: c.machineId,
          drop: c.sasMeters?.drop,
          cancelled: c.sasMeters?.totalCancelledCredits,
          gross: c.sasMeters?.gross,
        }))
      );
    }

    for (const collection of collections) {
      // Sum up the SAS metrics from each collection
      totalSasDrop += collection.sasMeters?.drop || 0;
      totalSasCancelled += collection.sasMeters?.totalCancelledCredits || 0;
    }
  } else {
    console.warn(
      `⚠️ No locationReportId provided to calculateCollectionReportTotals`
    );
  }

  const totalSasGross = totalSasDrop - totalSasCancelled;

  console.warn(
    `💰 Final SAS totals: drop=${totalSasDrop}, cancelled=${totalSasCancelled}, gross=${totalSasGross}`
  );

  return {
    totalDrop,
    totalCancelled,
    totalGross,
    totalSasGross,
  };
}
