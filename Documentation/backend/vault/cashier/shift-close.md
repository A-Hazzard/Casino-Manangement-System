# API: Cashier Shift Close (Blind Close)
**Endpoint:** `POST /api/cashier/shift/close`
**Format:** `application/json`

## Purpose
Enforces the mandatory "Blind Close" security procedure. Cashiers record their physical cash count without seeing the system's expected balance to prevent unauthorized adjustments or theft.

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `shiftId` | string | Yes | The active cashier shift ID |
| `physicalCount` | number | Yes | The total amount counted by the cashier |
| `denominations` | array | Yes | Breakdown of bill quantities ({ denomination, quantity }) |

## Logic
1.  **Denomination Validation:** Verifies that the sum of denominations exactly matches the provided `physicalCount`.
2.  **Expected Balance Calculation:** 
    *   `Expected = Opening Float + Increases - Decreases - Payouts`.
3.  **Comparison (Blind Check):**
    *   **Scenario A (Match):** If `physicalCount == Expected`, status is set to `closed`. Funds are logically returned to the vault immediately.
    *   **Scenario B (Mismatch):** Status is set to `pending_review`. The system records the `discrepancy` but **DOES NOT** reveal the difference or the expected amount to the cashier.
4.  **Vault Update:** If balanced, the `VaultShift.currentDenominations` are incremented. If unbalanced, the vault cannot close until the manager resolves the shift.

## Models Used
- `CashierShiftModel` (`app/api/lib/models/cashierShift.ts`): Updates entered balance and status.
- `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`): Updates `canClose` status.
- `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`): Records the return move (only if matched).

## Compliance (C-4)
Security protocols mandate that the cashier receives a generic "Under Review" message if a discrepancy occurs, ensuring they cannot "fish" for the correct amount by re-entering values.
