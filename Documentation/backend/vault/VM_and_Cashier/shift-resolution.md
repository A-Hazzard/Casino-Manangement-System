# Shift Review & Resolution (Vault Manager)

This document describes the process of reviewing cashier shifts, handling discrepancies, and resolving them to finalize the vault's daily activity.

## Purpose
To audit cashier performance, account for variances, and move cash from the cashier desks back into the vault inventory.

## The Review Process
1.  **Notification:** The Vault Manager dashboard shows "Pending Reviews" for any cashier shift that ended with a discrepancy (Blind Close).
2.  **Audit Interface:** The manager views the `CashierShift` which shows:
    - `openingBalance` (System)
    - `floatAdjustments` (Increases/Decreases)
    - `payoutsTotal` (System)
    - `expectedClosingBalance` (Calculated: `opening + adjustments - payouts`)
    - `cashierEnteredBalance` (Cashier's physical count)
    - `discrepancy` (Difference)

## Resolution Actions (POST /api/cashier/shift/resolve)
The manager must choose one of the following paths:

### 1. Accept Discrepancy (Variance)
- **Logic:** The manager accepts that the cashier's physical count is the final truth.
- **Fields:** 
  - `discrepancyResolved` -> `true`
  - `closingBalance` -> `cashierEnteredBalance`
- **Inventory Movement:** The bill quantities in `cashierEnteredDenominations` are added back to `VaultShift.currentDenominations`.
- **Accounting:** The variance remains on record for the cashier's performance history.

### 2. Adjusted Resolution
- **Logic:** The manager found a count error (e.g., cashier missed a bill) and manually enters an adjusted final balance.
- **Fields:**
  - `vmAdjustedBalance` -> `[New Value]`
  - `closingBalance` -> `vmAdjustedBalance`
- **Mandatory:** Requires `vmReviewNotes` explaining the adjustment.

## Finalization
- Once resolved, the `CashierShift` status changes to `closed`.
- The `VaultShift` balance is updated.
- If all child `CashierShifts` are closed, the button to "Close Vault Day" becomes enabled (`VaultShift.canClose`).

## Models Used
- `CashierShiftModel` (`app/api/lib/models/cashierShift.ts`)
- `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`)
- `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`)
