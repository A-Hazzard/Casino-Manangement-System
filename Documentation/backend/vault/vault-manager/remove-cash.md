# API: Remove Cash from Vault
**Endpoint:** `POST /api/vault/remove-cash`
**Format:** `application/json`

## Purpose
Records the removal of funds from the vault to an external destination (e.g., Bank Deposit).

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `destination` | string | Yes | Where the cash is going (e.g., "Safe Deposit Box") |
| `amount` | number | Yes | Total value removed |
| `denominations` | array | Yes | Breakdown of bills removed |
| `notes` | string | No | Optional justification |

## Logic
1.  **Shift Context:** Requires an active `VaultShift`.
2.  **Inventory Sync:** 
    *   Subtracts specified `denominations` from the shift's `currentDenominations`.
    *   Ensures bill quantities do not drop below zero.
    *   Decrements `closingBalance`.
3.  **Audit Trail:** Creates a `VaultTransaction` (type: `vault_close`).
4.  **Logging:** Records a "create" action in the `ActivityLog`.

## Models Used
- `VaultShift`
- `VaultTransaction`
- `ActivityLog`
