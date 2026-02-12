/**
 * Vault Denomination Utilities
 * 
 * Provides licensee-specific denomination lists for currency handling.
 */

import type { Denomination } from '@/shared/types/vault';

// Licensee Constants
export const LICENSEE_IDS = {
  TTG: '9a5db2cb29ffd2d962fd1d91',
  CABANA: 'c03b094083226f216b3fc39c',
  BARBADOS: '732b094083226f216b3fc11a'
} as const;

// Denomination Mapping
const LICENSEE_DENOMINATIONS: Record<string, number[]> = {
  [LICENSEE_IDS.TTG]: [100, 50, 20, 10, 5, 1],
  [LICENSEE_IDS.CABANA]: [5000, 1000, 500, 50, 20, 10, 5, 1],
  [LICENSEE_IDS.BARBADOS]: [50, 20, 10, 5, 2, 1]
};

// Default denominations if licensee not found
const DEFAULT_DENOMINATIONS = [100, 50, 20, 10, 5, 1];

/**
 * Get the list of bill denominations for a specific licensee.
 * 
 * @param licenseeId The ID of the licensee
 * @returns Array of denomination values sorted descending
 */
export function getDenominationValues(licenseeId?: string): number[] {
  if (!licenseeId) return DEFAULT_DENOMINATIONS;
  return LICENSEE_DENOMINATIONS[licenseeId] || DEFAULT_DENOMINATIONS;
}

/**
 * Initialize a record of denominations with zero quantities based on licensee.
 * 
 * @param licenseeId The ID of the licensee
 * @returns Record of denominations as keys and 0 as values
 */
export function getInitialDenominationRecord(licenseeId?: string): Record<string, number> {
  const values = getDenominationValues(licenseeId);
  const record: Record<string, number> = {};
  values.forEach(v => {
    record[v.toString()] = 0;
  });
  return record;
}

/**
 * Convert a record of denominations to a Denomination array.
 */
export function recordToDenominations(record: Record<string, number>): Denomination[] {
  return Object.entries(record)
    .filter(([_, qty]) => qty > 0)
    .map(([val, qty]) => ({
      denomination: Number(val) as Denomination['denomination'],
      quantity: qty
    }));
}
