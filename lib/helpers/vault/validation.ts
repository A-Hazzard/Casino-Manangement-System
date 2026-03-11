/**
 * Vault Balance Validation Helper Functions
 *
 * Utilities for validating vault balance and denomination availability
 * before approving float requests.
 *
 * @module lib/helpers/vault/validation
 */

import type { Denomination } from '@/shared/types/vault';

// ============================================================================
// Types
// ============================================================================

export type DenominationMap = Record<string, number>;

export type ValidationResult = {
  valid: boolean;
  insufficientDenominations: string[];
  availableDenominations: DenominationMap;
  shortfall?: number;
};

export type BalanceValidationResult = {
  valid: boolean;
  shortfall?: number;
};

// ============================================================================
// Denomination Validation
// ============================================================================

/**
 * Validate if vault has sufficient denominations for a float request
 *
 * @param requestedDenominations - Requested denomination quantities
 * @param vaultDenominations - Available vault denomination quantities
 * @returns Validation result with insufficient denominations list
 */
export function validateVaultDenominations(
  requestedDenominations: Denomination[],
  vaultDenominations: Denomination[]
): ValidationResult {
  const insufficient: string[] = [];
  const available: DenominationMap = {};

  // Convert arrays to maps for easier comparison
  const requestedMap: DenominationMap = {};
  requestedDenominations.forEach(d => {
    requestedMap[d.denomination.toString()] = d.quantity;
  });

  const vaultMap: DenominationMap = {};
  vaultDenominations.forEach(d => {
    vaultMap[d.denomination.toString()] = d.quantity;
    available[d.denomination.toString()] = d.quantity;
  });

  // Check each requested denomination
  for (const [denom, requestedQty] of Object.entries(requestedMap)) {
    const vaultQty = vaultMap[denom] || 0;

    const vQty = Number(vaultQty);
    const rQty = Number(requestedQty);

    if (vQty < rQty) {
      insufficient.push(`$${denom} (need ${requestedQty}, have ${vaultQty})`);
    }
  }

  return {
    valid: insufficient.length === 0,
    insufficientDenominations: insufficient,
    availableDenominations: available,
  };
}

/**
 * Check if vault has sufficient total balance
 *
 * @param requestedAmount - Total amount requested
 * @param vaultBalance - Current vault balance
 * @returns Validation result with shortfall if insufficient
 */
export function validateVaultBalance(
  requestedAmount: number,
  vaultBalance: number
): BalanceValidationResult {
  const valid = vaultBalance >= requestedAmount;
  const shortfall = valid ? undefined : requestedAmount - vaultBalance;

  return {
    valid,
    shortfall,
  };
}

/**
 * Calculate total amount from denominations
 *
 * @param denominations - Array of denomination objects
 * @returns Total amount
 */
export function calculateDenominationTotal(
  denominations: Denomination[]
): number {
  return denominations.reduce(
    (total, d) => total + d.denomination * d.quantity,
    0
  );
}

/**
 * Validate denomination structure and values
 *
 * @param denominations - Array of denomination objects to validate
 * @returns Validation result with errors if invalid
 */
export function validateDenominationStructure(
  denominations: Denomination[]
): {
  valid: boolean;
  errors: string[];
  total: number;
} {
  const errors: string[] = [];
  const validDenominations = [1, 5, 10, 20, 50, 100];

  // Check for empty array
  if (!denominations || denominations.length === 0) {
    errors.push('At least one denomination is required');
    return { valid: false, errors, total: 0 };
  }

  // Validate each denomination
  denominations.forEach((d, index) => {
    // Check if denomination value is valid
    if (!validDenominations.includes(d.denomination)) {
      errors.push(
        `Invalid denomination at index ${index}: $${d.denomination}`
      );
    }

    // Check if quantity is valid
    if (d.quantity < 0) {
      errors.push(
        `Invalid quantity at index ${index}: ${d.quantity} (must be >= 0)`
      );
    }

    if (!Number.isInteger(d.quantity)) {
      errors.push(
        `Invalid quantity at index ${index}: ${d.quantity} (must be an integer)`
      );
    }
  });

  // Calculate total
  const total = calculateDenominationTotal(denominations);

  return {
    valid: errors.length === 0,
    errors,
    total,
  };
}

/**
 * Compare two denomination sets and return the difference
 *
 * @param before - Denominations before transaction
 * @param after - Denominations after transaction
 * @returns Difference in denominations
 */
export function calculateDenominationDifference(
  before: Denomination[],
  after: Denomination[]
): Denomination[] {
  const beforeMap: DenominationMap = {};
  before.forEach(d => {
    beforeMap[d.denomination.toString()] = d.quantity;
  });

  const afterMap: DenominationMap = {};
  after.forEach(d => {
    afterMap[d.denomination.toString()] = d.quantity;
  });

  const difference: Denomination[] = [];
  const allDenoms = new Set([
    ...Object.keys(beforeMap),
    ...Object.keys(afterMap),
  ]);

  allDenoms.forEach(denom => {
    const beforeQty = beforeMap[denom] || 0;
    const afterQty = afterMap[denom] || 0;
    const diff = afterQty - beforeQty;

    if (diff !== 0) {
      difference.push({
        denomination: parseInt(denom) as 1 | 5 | 10 | 20 | 50 | 100,
        quantity: Math.abs(diff),
      });
    }
  });

  return difference;
}

/**
 * Format denomination list for display
 *
 * @param denominations - Array of denomination objects
 * @returns Formatted string (e.g., "$100 × 10, $20 × 50")
 */
export function formatDenominations(denominations: Denomination[]): string {
  return denominations
    .filter(d => d.quantity > 0)
    .sort((a, b) => b.denomination - a.denomination)
    .map(d => `$${d.denomination} × ${d.quantity}`)
    .join(', ');
}

/**
 * Convert denomination map to array
 *
 * @param denominationMap - Map of denomination to quantity
 * @returns Array of denomination objects
 */
export function denominationMapToArray(
  denominationMap: DenominationMap
): Denomination[] {
  return Object.entries(denominationMap).map(([denom, qty]) => ({
    denomination: parseInt(denom) as 1 | 5 | 10 | 20 | 50 | 100,
    quantity: qty,
  }));
}

/**
 * Convert denomination array to map
 *
 * @param denominations - Array of denomination objects
 * @returns Map of denomination to quantity
 */
export function denominationArrayToMap(
  denominations: Denomination[]
): DenominationMap {
  const map: DenominationMap = {};
  denominations.forEach(d => {
    map[d.denomination.toString()] = d.quantity;
  });
  return map;
}
