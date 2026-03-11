# API: Add Cash to Vault
**Endpoint:** `POST /api/vault/add-cash`
**Format:** `application/json`

## Purpose
Records the injection of funds into the vault from an external source (e.g., Bank Withdrawal, owner injection).

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `source` | string | Yes | The source of the cash (e.g., "Republic Bank") |
| `amount` | number | Yes | Total value added |
| `denominations` | array | Yes | Breakdown of bills added |
| `notes` | string | No | Optional justification |

## Logic
1.  **Shift Context:** Requires an active `VaultShift`.
2.  **Inventory Sync:** 
    *   Adds specified `denominations` to the shift's `currentDenominations` map.
    *   Increments `closingBalance`.
3.  **Audit Trail:** Creates a `VaultTransaction` (type: `vault_open`). *Note: `vault_open` is currently used for all external cash injections.*
4.  **Logging:** Records a "create" action in the `ActivityLog`.

## Models Used
- `VaultShift`
- `VaultTransaction`
- `ActivityLog`
