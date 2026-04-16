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
  jackpot?: number;
  netGross?: number;
  _raw?: {
    moneyIn: number;
    moneyOut: number;
    jackpot: number;
    gross: number;
  };
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
    return { moneyIn: 0, moneyOut: 0, gross: 0, jackpot: 0 };
  }

  const totals = locations.reduce(
    (acc: FinancialTotals, location) => {
      const moneyIn = location.moneyIn || 0;
      const moneyOut = location.moneyOut || 0;
      const jackpot = location.jackpot || 0;
      const gross = location.gross !== undefined ? location.gross : (moneyIn - moneyOut);
      const netGross = location.netGross || 0;
      
      const newAcc = {
        moneyIn: acc.moneyIn + moneyIn,
        moneyOut: acc.moneyOut + moneyOut,
        gross: acc.gross + gross,
        jackpot: (acc.jackpot || 0) + jackpot,
        netGross: (acc.netGross || 0) + netGross,
      };

      const locRaw = (location as { _raw?: { moneyIn?: number; moneyOut?: number; jackpot?: number; gross?: number } })._raw;
      if (locRaw) {
        const currentRaw = acc._raw || { moneyIn: 0, moneyOut: 0, jackpot: 0, gross: 0 };
        return {
          ...newAcc,
          _raw: {
            moneyIn: currentRaw.moneyIn + (locRaw.moneyIn || 0),
            moneyOut: currentRaw.moneyOut + (locRaw.moneyOut || 0),
            jackpot: currentRaw.jackpot + (locRaw.jackpot || 0),
            gross: currentRaw.gross + (locRaw.gross || 0),
          }
        };
      }

      return newAcc;
    },
    { moneyIn: 0, moneyOut: 0, gross: 0, jackpot: 0, netGross: 0 }
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
    return { moneyIn: 0, moneyOut: 0, gross: 0, jackpot: 0 };
  }

  const totals = cabinets.reduce(
    (acc: FinancialTotals, cabinet) => {
      // Use the financial metrics directly from the aggregation API
      const moneyIn = cabinet.moneyIn || 0;
      const moneyOut = cabinet.moneyOut || 0;
      const jackpot = cabinet.jackpot || 0;
      // Gross is calculated as moneyIn - moneyOut according to financial metrics guide
      const gross = cabinet.gross !== undefined ? cabinet.gross : (moneyIn - moneyOut);
      const netGross = cabinet.netGross || 0;
      
      const newAcc = {
        moneyIn: acc.moneyIn + moneyIn,
        moneyOut: acc.moneyOut + moneyOut,
        gross: acc.gross + gross,
        jackpot: (acc.jackpot || 0) + jackpot,
        netGross: (acc.netGross || 0) + netGross,
      };

      const cabRaw = (cabinet as { _raw?: { moneyIn?: number; moneyOut?: number; jackpot?: number; gross?: number } })._raw;
      if (cabRaw) {
        const currentRaw = acc._raw || { moneyIn: 0, moneyOut: 0, jackpot: 0, gross: 0 };
        return {
          ...newAcc,
          _raw: {
            moneyIn: currentRaw.moneyIn + (cabRaw.moneyIn || 0),
            moneyOut: currentRaw.moneyOut + (cabRaw.moneyOut || 0),
            jackpot: currentRaw.jackpot + (cabRaw.jackpot || 0),
            gross: currentRaw.gross + (cabRaw.gross || 0),
          }
        };
      }

      return newAcc;
    },
    { moneyIn: 0, moneyOut: 0, gross: 0, jackpot: 0, netGross: 0 }
  );

  return totals;
}

