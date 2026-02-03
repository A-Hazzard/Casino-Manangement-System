# Cashier Dashboard Documentation
**Route:** `/vault/cashier`

## Overview
The simplified interface for Cashiers to manage their daily operations.

## Key States

### 1. Shift Inactive (Morning)
*   **Display:** "Start Shift" Card.
*   **Action:** Click "Start Shift" -> Opens Float Request Modal.
*   **Logic:**
    *   Cashier selects requested amount (e.g., $200).
    *   Submits request.
    *   State changes to "Waiting for Approval".
    *   *Polling:* Dashboard checks shift status every 30s.

### 2. Shift Active (Working)
*   **Balance Monitoring:** Shows `System Balance` (Opening + Increases - Payouts).
*   **Payout Operations:**
    *   **Ticket Redemption:**
        *   Used for cashing out slot machine tickets.
        *   Features a mocked barcode scanner UI for manual/automatic ticket entry.
        *   Uses `DenominationInputGrid` to record the physical bills handed to the customer.
        *   Visual: Blue-themed modal.
    *   **Hand Pay / Jackpot:**
        *   Used for large wins or machine hand-pays.
        *   Machine selection via `MachineSearchSelect` (linked to live machine IDs).
        *   Reason selection (Jackpot, Canceled Credit, Progressive, etc.).
        *   Uses `DenominationInputGrid` for physical cash tracking.
        *   Visual: Emerald-themed modal.
    *   **Validation:** Cashier cannot perform a payout that exceeds their current system balance (Stash).
*   **Float Increase/Decrease:**
    *   Cashier selects requested amount using denominations.
    *   State changes to "Waiting for Approval".
    *   Funds are updated once the Vault Manager approves.
*   **End Shift:**
    *   Initiates the **Blind Close** process.
    *   Cashier records their final physical count by denomination without knowing the system expectation (Blind).


### 3. Pending Review
*   Visible if the cashier finished a blind close with a discrepancy.
*   Shows "Awaiting Manager Review".
*   The cashier remains logged in but cannot perform transactions.

### 4. Shift Closed
*   Shows a summary: Opening Float, Total Payouts, Total Adjustments, and Final Recorded Balance.
