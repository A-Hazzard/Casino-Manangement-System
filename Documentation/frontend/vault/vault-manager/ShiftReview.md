# Shift Review & Resolution Interface (Vault Manager)
**Route:** `/vault/management` -> **Shift Review** Section

## Purpose
The primary interface for Vault Managers to audit and close out cashier sessions. This ensures the physical cash returned by cashiers matches the system's ledger.

## UI Components

### 1. Pending Reviews Alert
- High-visibility banner or badge showing the count of shifts requiring attention.
- Filters the main shift table to show only `pending_review` status.

### 2. Review Modal / Detail View
When a manager clicks **"Review"** on a completed shift, the following data is presented:
- **Cashier Name & ID**
- **Shift Duration:** (Opened At -> Closed At)
- **Financial Breakdown:**
  - `Opening Float`: The funds issued at the start.
  - `Adjustments`: Mid-shift float requests (Approved).
  - `Payouts`: Total ticket redemptions and hand pays processed.
  - `Expected Balance`: The mathematical result: `Opening + Adjustments - Payouts`.
  - `Entered Balance`: The physical count entered by the cashier (Blind Close).
- **Variance Analysis:** Highlighted in **RED** if `Entered != Expected`.

## Manager Actions

### A. Resolve Shift (Accept Variance)
- Used when the manager confirms the cashier's physical count is the amount actually in the drawer.
- **Action:** Manager clicks "Resolve".
- **Result:** The shift is closed. Any discrepancy is permanently recorded for auditing.

### B. Adjust Balance
- Used if a physical counting error is discovered (e.g., manager finds a missing $20 bill).
- **Input:** Manager enters an **Adjusted Balance** and a mandatory **Audit Comment**.
- **Result:** The system uses the adjusted value as the final closing balance.

## Inventory Synchronization
Upon resolution of any cashier shift:
1.  **Vault Credit:** The cash (all denominations) is logically moved from the cashier back to the **Vault Account**.
2.  **Vault Balance:** `VaultShift.currentDenominations` and `closingBalance` are incremented by the amount resolved.
3.  **Audit Trail:** A `VaultTransaction` of type `shift_resolve` is recorded.

## Constraints
- **Multi-tasking:** A manager cannot close the main Vault Day (`VaultShift`) until ALL child `CashierShifts` are in a `closed` state.
