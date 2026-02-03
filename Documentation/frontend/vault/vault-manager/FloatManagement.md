# Float Management & Approval (Vault Manager)
**Route:** `/vault/management` -> **Float Requests** Section

## Purpose
The workflow for approving and physically issuing cash to cashiers.

## 1. Receiving a Request
- Cashiers submit requests from their dashboard.
- The Vault Manager sees these in the **"Pending Float Requests"** widget.
- **Urgency:** Requests are sorted by timestamp (oldest first).

## 2. The Approval Workflow
When the manager clicks **"Process Request"**:
1.  **Requirement Check:** The modal shows the `approvedAmount`.
2.  **Inventory Availability:** The system checks if the Vault's `currentDenominations` has enough physical bills to fulfill the request.
3.  **Physical Issue:** The manager counts out the bills and confirms the hand-over.
4.  **Deduction:** Clicking **"Approve"** decrements the `VaultShift.currentDenominations` and increments the `CashierShift.openingDenominations`.

## 3. Denied Requests
- If the vault is low on funds or the request is invalid, the manager can **Deny** or **Edit** the amount.
- Denial requires a reason, and the cashier is notified via their dashboard status.

## 4. Float Refills (Mid-Shift)
- Similarly, if a cashier requests more money during the day, it appears as a `float_increase` request.
- Approval updates the `CashierShift.floatAdjustmentsTotal`.

## Inventory Lifecycle Note
The movement of cash from Vault -> Cashier is a **Balance-Neutral** event for the Location (Total Cash On Premise remains the same), but a **Deduction** for the Vault Inventory and an **Addition** for the Cashier Inventory.
