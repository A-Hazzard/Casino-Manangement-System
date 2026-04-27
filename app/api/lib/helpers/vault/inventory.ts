import { Denomination, VaultShift } from '@/shared/types/vault';

/**
 * Updates a vault shift's balance and inventory based on a transaction.
 *
 * @param vaultShift The Mongoose vault shift document (as VaultShift)
 * @param amount The transaction amount (positive for in, negative for out)
 * @param denominations The denominations used in the transaction
 * @param isAddition True if adding to vault, False if removing
 */
export async function updateVaultShiftInventory(
  vaultShift: VaultShift & { save: () => Promise<unknown> },
  amount: number,
  denominations: Denomination[],
  isAddition: boolean
) {
  // 1. Update Balance
  const currentBalance = vaultShift.closingBalance ?? vaultShift.openingBalance;
  vaultShift.closingBalance = isAddition ? currentBalance + amount : currentBalance - amount;

  // 2. Update Inventory (currentDenominations)
  const currentInventory =
    vaultShift.currentDenominations && vaultShift.currentDenominations.length > 0
      ? vaultShift.currentDenominations
      : vaultShift.openingDenominations;

  const inventoryMap = new Map<number, number>();

  // Initialize map with current inventory
  currentInventory.forEach((denom: Denomination) => {
    inventoryMap.set(denom.denomination, denom.quantity);
  });

  // Apply changes from denominations
  denominations.forEach((denom: Denomination) => {
    const currentQty = inventoryMap.get(denom.denomination) || 0;
    if (isAddition) {
      inventoryMap.set(denom.denomination, currentQty + denom.quantity);
    } else {
      // Ensure we don't go below zero (though validation should prevent this)
      inventoryMap.set(denom.denomination, Math.max(0, currentQty - denom.quantity));
    }
  });

  // Convert back to array
  vaultShift.currentDenominations = Array.from(inventoryMap.entries())
    .map(([denomination, quantity]) => ({
      denomination: denomination as Denomination['denomination'],
      quantity,
    }))
    .filter(denom => denom.quantity >= 0); // Keep zeros so they show up in UI if needed, or filter them

  vaultShift.updatedAt = new Date();
  await vaultShift.save();

  return vaultShift;
}

/**
 * Validates that denominations sum to the provided total amount.
 */
export function validateDenominationTotal(amount: number, denominations: Denomination[]): boolean {
  if (!denominations || denominations.length === 0) return amount === 0;
  const total = denominations.reduce((sum, denom) => sum + (denom.denomination * denom.quantity), 0);
  return Math.abs(total - amount) < 0.01;
}
