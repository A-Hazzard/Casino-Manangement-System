/**
 * Cash Monitoring Helper Functions
 *
 * This file contains helper functions for cash monitoring operations.
 * It supports:
 * - Calculating total cash on premises
 * - Getting denomination breakdown
 *
 * @module app/api/lib/helpers/vault/cashMonitoring
 */

import { Denomination } from '@/app/api/lib/models/denominations';
import type { DenominationBreakdown } from '@/app/api/lib/types/vault';

/**
 * Calculate total cash on premises for a location
 * @param locationId - Location ID
 * @param dateRange - Optional date range filter
 * @returns Object with total cash and denomination breakdown
 */
export async function calculateTotalCashOnPremises(
  locationId: string,
  dateRange?: { start: Date; end: Date }
): Promise<{
  totalCash: number;
  denominationBreakdown: DenominationBreakdown;
}> {
  const matchStage: Record<string, unknown> = {
    locationId,
  };

  if (dateRange) {
    matchStage.date = {
      $gte: dateRange.start,
      $lte: dateRange.end,
    };
  }

  const denominations = await Denomination.find(matchStage)
    .sort({ date: -1 })
    .lean();

  const breakdown: DenominationBreakdown = {};
  let totalCash = 0;

  for (const denom of denominations) {
    const valueKey = String(denom.value);
    breakdown[valueKey] = (breakdown[valueKey] || 0) + (denom.amount || 0);
    totalCash += denom.amount || 0;
  }

  return {
    totalCash,
    denominationBreakdown: breakdown,
  };
}

/**
 * Get denomination breakdown for a location
 * @param locationId - Location ID
 * @param dateRange - Optional date range filter
 * @returns Denomination breakdown object
 */
export async function getDenominationBreakdown(
  locationId: string,
  dateRange?: { start: Date; end: Date }
): Promise<DenominationBreakdown> {
  const result = await calculateTotalCashOnPremises(locationId, dateRange);
  return result.denominationBreakdown;
}
