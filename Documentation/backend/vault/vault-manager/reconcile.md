# API: Vault Reconciliation
**Endpoint:** `POST /api/vault/reconcile`

## Purpose
Allows the Vault Manager to adjust the system balance to match the physical cash count and finalize the vault shift state.

## Request Body
```json
{
  "vaultShiftId": "string",
  "newBalance": number,
  "denominations": [{ "denomination": number, "quantity": number }],
  "reason": "string",
  "comment": "string"
}
```

## Logic
1.  **Validation:**
    *   `vaultShiftId` must refer to an 'active' shift.
    *   `reconcile` requires a mandatory `comment` for auditing variance.
2.  **Audit Trail:**
    *   The previous balance is captured from the shift before updating.
    *   A reconciliation entry is pushed into the `reconciliations` array in the `VaultShift` model.
3.  **State Update:**
    *   `closingBalance` is set to `newBalance`.
    *   `closingDenominations` is set to the final physical count.
    *   `currentDenominations` is updated to match the physical count to resolve any discrepancy.
4.  **Transaction:** A `VaultTransaction` of type `reconcile` is created to log the adjustment value.

## Models Used
- `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`)
- `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`)

## Constraints
*   **Compliance:** Cannot reconcile with an empty comment.
*   **Sequential Logic:** The system uses the `newBalance` as the source of truth for all future metrics once saved.
