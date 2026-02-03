# API: Shift Resolution
**Endpoint:** `POST /api/cashier/shift/resolve`

## Context
Used when a Cashier's Blind Close (`cashierEnteredBalance`) does not match the System's `expectedBalance`.

## Workflow
1.  **Input:**
    *   `shiftId`: The locked shift.
    *   `finalBalance`: The actual amount counted by the Manager.
    *   `auditComment`: Note explaining the variance (e.g., "Found $10 under keyboard").
2.  **Logic:**
    *   **Override:** Sets `CashierShift.closingBalance` = `finalBalance`.
    *   **Flag:** Sets `discrepancyResolved = true`.
    *   **Transaction:** Creates `cashier_shift_close` transaction moving `finalBalance` from Cashier -> Vault.
3.  **Result:**
    *   Shift status -> `closed`.
    *   Vault receives the funds.
    *   Audit trail preserves the original (wrong) cashier count vs the resolved manager count.
