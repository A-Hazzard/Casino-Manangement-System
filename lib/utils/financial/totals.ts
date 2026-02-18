/**
 * Financial Calculation Utilities
 *
 * Utility functions for aggregating financial totals across locations and cabinets.
 *
 * Features:
 * - Calculate financial totals from location data
 * - Calculate financial totals from cabinet data
 * - Aggregate money in, money out, and gross revenue
 * - Handle null/empty data gracefully
 */

import type { AggregatedLocation, GamingMachine as Cabinet } from '@/shared/types/entities';

export type FinancialTotals = {
  moneyIn: number;
  moneyOut: number;
  gross: number;
};

/**
 * Calculates financial totals from location data
 * @param locations - Array of location objects with financial data
 * @returns Aggregated financial totals or null if no data
 */
export function calculateLocationFinancialTotals(
  locations: AggregatedLocation[]
): FinancialTotals {
  if (!locations || !Array.isArray(locations) || locations.length === 0) {
    return { moneyIn: 0, moneyOut: 0, gross: 0 };
  }

  const totals = locations.reduce(
    (acc, location) => {
      const moneyIn = location.moneyIn || 0;
      const moneyOut = location.moneyOut || 0;
      const gross = location.gross || moneyIn - moneyOut;

      return {
        moneyIn: acc.moneyIn + moneyIn,
        moneyOut: acc.moneyOut + moneyOut,
        gross: acc.gross + gross,
      };
    },
    { moneyIn: 0, moneyOut: 0, gross: 0 }
  );

  return totals;
}

/**
 * Calculates financial totals from cabinet data
 * @param cabinets - Array of cabinet objects with financial data
 * @returns Aggregated financial totals
 */
export function calculateCabinetFinancialTotals(
  cabinets: Cabinet[]
): FinancialTotals {
  if (!cabinets || !Array.isArray(cabinets) || cabinets.length === 0) {
    return { moneyIn: 0, moneyOut: 0, gross: 0 };
  }

  const totals = cabinets.reduce(
    (acc, cabinet) => {
      // Use the financial metrics directly from the aggregation API
      const moneyIn = cabinet.moneyIn || 0;
      const moneyOut = cabinet.moneyOut || 0;
      // Gross is calculated as moneyIn - moneyOut according to financial metrics guide
      const gross = cabinet.gross || moneyIn - moneyOut;

      return {
        moneyIn: acc.moneyIn + moneyIn,
        moneyOut: acc.moneyOut + moneyOut,
        gross: acc.gross + gross,
      };
    },
    { moneyIn: 0, moneyOut: 0, gross: 0 }
  );

  return totals;
}

