# API: Vault Shift Close (End Day)
**Endpoint:** `POST /api/vault/shift/close`
**Format:** `application/json`

## Purpose
Ends the vault manager's day by recording the final physical count and closing the shift. This action is the final step in the daily compliance workflow.

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vaultShiftId` | string | Yes | The active vault shift ID |
| `closingBalance` | number | Yes | The total final physical count |
| `denominations` | array | Yes | Breakdown of final bills ({ denomination, quantity }) |

## Business Rule: BR-01 (Mandatory)
The vault **CANNOT** be closed if there are any child cashier shifts in the following states:
- `active`: Cashier is still working.
- `pending_review`: Cashier has blind-closed but the manager hasn't resolved the discrepancy.
- **Enforcement:** The API will return `400 Bad Request` with a list of active/pending cashier IDs if BR-01 is violated.

## Logic
1.  **Authorization:** Requires `vault-manager`, `admin`, or `manager` roles.
2.  **State Audit:** Verifies the shift isn't already closed.
3.  **Compliance Check:** Executes BR-01 validation against all `CashierShift` records linked to this `vaultShiftId`.
4.  **Persistence:**
    *   Sets `status` to `closed`.
    *   Records `closingBalance` and `closingDenominations`.
5.  **Transaction:** Creates a `VaultTransaction` (type: `vault_close`) reflecting the end-of-day state.

## Models Used
- `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`)
- `CashierShiftModel` (`app/api/lib/models/cashierShift.ts`)
- `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`)
