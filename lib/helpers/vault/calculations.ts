/**
 * Vault Calculation Helpers
 * 
 * Helper functions for vault balance calculations, denomination validation,
 * and business rule enforcement.
 */

import type { CashierShift } from '@/shared/types/vault';

/**
 * Denomination type definition
 */
export type Denomination = {
  denomination: number;
  quantity: number;
};

/**
 * Validate denomination totals and calculate sum
 * 
 * @param denominations - Array of denomination objects
 * @returns Object with validation status and total amount
 */
export function validateDenominations(denominations: Denomination[]): {
  valid: boolean;
  total: number;
  errors?: string[];
} {
  const errors: string[] = [];
  let total = 0;

  // Allowed denominations
  const allowedDenominations = [1, 5, 10, 20, 50, 100];

  for (const denom of denominations) {
    // Check if denomination is allowed
    if (!allowedDenominations.includes(denom.denomination)) {
      errors.push(`Invalid denomination: $${denom.denomination}`);
    }

    // Check if quantity is non-negative
    if (denom.quantity < 0) {
      errors.push(
        `Negative quantity for $${denom.denomination}: ${denom.quantity}`
      );
    }

    // Calculate total
    total += denom.denomination * denom.quantity;
  }

  return {
    valid: errors.length === 0,
    total,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Calculate expected cashier closing balance
 * 
 * Formula: Opening Balance + Float Adjustments - Payouts
 * 
 * @param openingBalance - Starting float amount
 * @param payoutsTotal - Total amount paid out during shift
 * @param floatAdjustmentsTotal - Net float changes (increases - decreases)
 * @returns Expected closing balance
 */
export function calculateExpectedBalance(
  openingBalance: number,
  payoutsTotal: number,
  floatAdjustmentsTotal: number
): number {
  return openingBalance + floatAdjustmentsTotal - payoutsTotal;
}

/**
 * Check if vault shift can close (BR-01)
 * 
 * Business Rule: A Vault Manager cannot close their shift if any Cashier shifts
 * are currently "Active" or "Pending Review."
 * 
 * @param cashierShifts - All cashier shifts associated with this vault shift
 * @returns Object indicating if vault can close and reason if not
 */
export function canCloseVaultShift(cashierShifts: CashierShift[]): {
  canClose: boolean;
  reason?: string;
  activeCashiers?: string[];
  pendingReviewCashiers?: string[];
} {
  const activeCashiers: string[] = [];
  const pendingReviewCashiers: string[] = [];

  for (const shift of cashierShifts) {
    if (shift.status === 'active') {
      activeCashiers.push(shift.cashierId);
    } else if (shift.status === 'pending_review') {
      pendingReviewCashiers.push(shift.cashierId);
    }
  }

  if (activeCashiers.length > 0 || pendingReviewCashiers.length > 0) {
    let reason = 'Cannot close vault shift. ';

    if (activeCashiers.length > 0) {
      reason += `${activeCashiers.length} cashier shift(s) are still active. `;
    }

    if (pendingReviewCashiers.length > 0) {
      reason += `${pendingReviewCashiers.length} cashier shift(s) are pending review. `;
    }

    reason += 'All cashier shifts must be closed before closing the vault shift.';

    return {
      canClose: false,
      reason,
      activeCashiers:
        activeCashiers.length > 0 ? activeCashiers : undefined,
      pendingReviewCashiers:
        pendingReviewCashiers.length > 0
          ? pendingReviewCashiers
          : undefined,
    };
  }

  return { canClose: true };
}

/**
 * Calculate total from denominations
 * 
 * @param denominations - Array of denomination objects
 * @returns Total amount
 */
export function calculateDenominationTotal(
  denominations: Denomination[]
): number {
  return denominations.reduce(
    (sum, denom) => sum + denom.denomination * denom.quantity,
    0
  );
}

/**
 * Compare two denomination arrays for equality
 * 
 * @param denom1 - First denomination array
 * @param denom2 - Second denomination array
 * @returns True if denominations match exactly
 */
export function denominationsMatch(
  denom1: Denomination[],
  denom2: Denomination[]
): boolean {
  if (denom1.length !== denom2.length) return false;

  // Sort both arrays by denomination for comparison
  const sorted1 = [...denom1].sort((a, b) => a.denomination - b.denomination);
  const sorted2 = [...denom2].sort((a, b) => a.denomination - b.denomination);

  for (let i = 0; i < sorted1.length; i++) {
    if (
      sorted1[i].denomination !== sorted2[i].denomination ||
      sorted1[i].quantity !== sorted2[i].quantity
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Format denomination breakdown for display
 * 
 * @param denominations - Array of denomination objects
 * @returns Formatted string (e.g., "$100 × 10, $20 × 50")
 */
export function formatDenominations(denominations: Denomination[]): string {
  return denominations
    .filter((d) => d.quantity > 0)
    .sort((a, b) => b.denomination - a.denomination)
    .map((d) => `$${d.denomination} × ${d.quantity}`)
    .join(', ');
}

/**
 * Update denomination inventory (add or subtract)
 * 
 * @param current - Current denominations
 * @param adjustment - Denominations to add or subtract
 * @param type - 'add' or 'subtract'
 * @returns Updated denomination array
 */
export function updateDenominationInventory(
  current: Denomination[],
  adjustment: Denomination[],
  type: 'add' | 'subtract'
): Denomination[] {
  const currentMap = new Map<number, number>();
  
  // Initialize with current values
  current.forEach(d => currentMap.set(d.denomination, d.quantity));
  
  // Apply adjustments
  adjustment.forEach(adj => {
    const currentQty = currentMap.get(adj.denomination) || 0;
    if (type === 'add') {
      currentMap.set(adj.denomination, currentQty + adj.quantity);
    } else {
      currentMap.set(adj.denomination, Math.max(0, currentQty - adj.quantity));
    }
  });
  
  // Convert back to array
  return Array.from(currentMap.entries()).map(([denomination, quantity]) => ({
    denomination: denomination as 1 | 5 | 10 | 20 | 50 | 100,
    quantity,
  }));
}
