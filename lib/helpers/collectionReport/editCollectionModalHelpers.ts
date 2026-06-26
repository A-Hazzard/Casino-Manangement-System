/**
 * Edit Collection Modal Helpers
 *
 * Helper functions for the Edit Collection Modal hook.
 * Contains API calls and utility functions extracted from useEditCollectionModal.
 */

import { updateMachineCollectionHistory } from '@/lib/helpers/cabinets';
import type { CollectionDocument } from '@/lib/types/collection';
import { calculateCabinetMovement } from '@/lib/utils/movement';
import axios from 'axios';

// Note: fetchCollectionReportById is exported from './fetching' to avoid duplication

/**
 * Fetch collections by report ID
 */
export async function fetchCollectionsByReportId(
  reportId: string
): Promise<CollectionDocument[]> {
  const res = await axios.get(
    `/api/collection-reports/collections?locationReportId=${reportId}&_t=${Date.now()}`
  );
  return res.data;
}

/**
 * Delete machine collection and update history
 */
export async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  const collection = await axios.get(
    `/api/collection-reports/collections?id=${id}`
  );
  const collectionData = collection.data;

  const res = await axios.delete(
    `/api/collection-reports/collections?id=${id}`
  );

  if (collectionData && collectionData.machineId) {
    await updateMachineCollectionHistory(
      collectionData.machineId,
      undefined,
      'delete',
      id
    );
  }

  return res.data;
}

/**
 * Delete multiple machine collections and update their cabinet history entries in one request
 */
export async function deleteMachineCollectionBatch(
  ids: string[]
): Promise<{ success: boolean; deleted: number }> {
  const res = await axios.delete('/api/collection-reports/collections/batch', {
    data: { ids, updateCabinetHistory: true },
  });
  return res.data;
}

/**
 * Utility function for proper alphabetical and numerical sorting
 */
export function sortMachinesAlphabetically<
  T extends { name?: string; serialNumber?: string },
>(machines: T[]): T[] {
  return machines.sort((a, b) => {
    const nameA = (a.name || a.serialNumber || '').toString();
    const nameB = (b.name || b.serialNumber || '').toString();

    // Extract the base name and number parts
    const matchA = nameA.match(/^(.+?)(\d+)?$/);
    const matchB = nameB.match(/^(.+?)(\d+)?$/);

    if (!matchA || !matchB) {
      return nameA.localeCompare(nameB);
    }

    const [, baseA, numA] = matchA;
    const [, baseB, numB] = matchB;

    // First compare the base part alphabetically
    const baseCompare = baseA.localeCompare(baseB);
    if (baseCompare !== 0) {
      return baseCompare;
    }

    // If base parts are the same, compare numerically
    const numAInt = numA ? parseInt(numA, 10) : 0;
    const numBInt = numB ? parseInt(numB, 10) : 0;

    return numAInt - numBInt;
  });
}

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

/**
 * Determine the effective SAS end time based on mode and captured values.
 *
 * In simple mode: capturedEndTime is the user-selected collectionTime.
 * In advanced mode: capturedEndTime is the custom sasEndTime set by the user.
 * Falls back to defaultTime only if no capturedEndTime exists.
 */
export function getSasEndTime(
  showAdvanced: boolean,
  capturedEndTime: Date | null,
  defaultTime: Date
): Date {
  if (capturedEndTime) {
    return capturedEndTime instanceof Date
      ? capturedEndTime
      : new Date(String(capturedEndTime));
  }
  return defaultTime;
}

/**
 * Calculate total movement data from collected machine entries.
 * Returns aggregated drop, cancelledCredits, gross, and sasGross sums.
 */
export function calculateTotalMovementFromEntries(
  entries: CollectionDocument[]
): {
  drop: number;
  cancelledCredits: number;
  gross: number;
  sasGross: number;
} {
  const totalMovementData = entries.map(entry => {
    const movement = calculateCabinetMovement(
      entry.metersIn || 0,
      entry.metersOut || 0,
      entry.prevIn || 0,
      entry.prevOut || 0,
      entry.ramClear || false,
      undefined,
      undefined,
      entry.ramClearMetersIn,
      entry.ramClearMetersOut
    );
    return {
      drop: movement.metersIn,
      cancelledCredits: movement.metersOut,
      gross: movement.gross,
      sasGross: entry.sasMeters?.gross || 0,
    };
  });

  return totalMovementData.reduce(
    (prev, curr) => ({
      drop: prev.drop + curr.drop,
      cancelledCredits: prev.cancelledCredits + curr.cancelledCredits,
      gross: prev.gross + curr.gross,
      sasGross: prev.sasGross + curr.sasGross,
    }),
    { drop: 0, cancelledCredits: 0, gross: 0, sasGross: 0 }
  );
}

/**
 * Calculate the amount to collect for a collection report.
 *
 * Formula:
 *   partnerProfit = floor((gross - variance - advance) * profitShare / 100) - taxes
 *   amountToCollect = gross - variance - advance - partnerProfit + previousBalance
 */
export function calculateAmountToCollect(params: {
  gross: number;
  variance: number;
  advance: number;
  taxes: number;
  profitShare: number;
  previousBalance: number;
}): number {
  const partnerProfit =
    Math.floor(
      ((params.gross - params.variance - params.advance) *
        params.profitShare) /
        100
    ) - params.taxes;

  return (
    params.gross -
    params.variance -
    params.advance -
    partnerProfit +
    params.previousBalance
  );
}
