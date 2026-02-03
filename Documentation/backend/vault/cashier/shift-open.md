# API: Cashier Shift Open (Float Request)
**Endpoint:** `POST /api/cashier/shift/open` (Request) / `POST /api/vault/float-request/approve` (Approval)

## Workflow

### 1. Request (Cashier)
*   User creates a `FloatRequest` (status: `pending`).
*   Does *not* create a `CashierShift` yet (or creates a `pending_start` shift depending on implementation).
*   Request stores: `requestedAmount`, `cashierId`.

### 2. Approval (Vault Manager)
*   **Endpoint:** `/api/vault/float-request/approve`
*   **Logic:**
    1.  **Balance Check:** Verifies `VaultShift.closingBalance` and specific `currentDenominations` exist in the vault.
    2.  **Inventory Deduction:** Specified bill quantities are deducted from `VaultShift.currentDenominations`.
    3.  **Inventory Grant:** The approved bill quantities are added to `CashierShift.openingDenominations`.
    4.  **Live Balance Sync:**
        *   Initializes `CashierShift.currentBalance` with the starting amount.
        *   Sets `CashierShift.lastSyncedDenominations` to the granted bill breakdown.
    5.  **Audit Trail:** `VaultTransaction` created (type: `float_increase` or `float_request_approval`, from: `vault`, to: `cashier`).
    6.  **Shift Activation:**
        *   `CashierShift` status -> `active`.
        *   `VaultShift` status -> `canClose: false` (Business Rule: Cannot close vault while cashiers are active).

## Models Used
- `CashierShiftModel` (`app/api/lib/models/cashierShift.ts`)
- `FloatRequestModel` (`app/api/lib/models/floatRequest.ts`)
- `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`)
- `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`)
