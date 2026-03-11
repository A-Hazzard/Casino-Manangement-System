# API: Vault Initialization
**Endpoint:** `POST /api/vault/initialize`

## Purpose
Sets the opening balance for the vault at the start of a "Vault Day" (Vault Shift). This establishes the Source of Truth.

## Request Body
```json
{
  "locationId": "string",
  "openingBalance": number,
  "denominations": { ... },
  "notes": "string (optional)"
}
```

## Logic
1.  **Auth Check:** User must be `vault-manager`, `manager`, `admin`, or `developer`.
2.  **State Check:** Ensures no *active* `VaultShift` already exists for this location.
3.  **Creation:** Creates a new `VaultShift` document with `status: 'active'`.
4.  **Inventory Sync:** 
    *   `openingDenominations` stores the initial input.
    *   `currentDenominations` is populated as a copy of the opening state to begin live tracking.
5.  **Audit:** Creates a `VaultTransaction` (type: `vault_open`).

## Models Used
- `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`)
- `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`)
- `ActivityLog` (`app/api/lib/models/activityLog.ts`)
