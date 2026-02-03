# Vault Dashboard Documentation
**Route:** `/vault/management`

## Overview
The Vault Dashboard is the command center for the Vault Manager. It allows them to monitor the vault's financial health in real-time.

## Key Components

### 1. Status Cards & Overview
*   **Vault Balance:** Displays current physical cash in the safe with last audit timestamp.
    *   *Source:* `VaultBalance.balance`
*   **Inventory Card:** Shows detailed bill breakdown (100, 50, 20, 10, 5, 1) with "Low Stock" alerts.
*   **Active Cashiers Section:** Displays status cards for active cashiers.
    *   **Sorting:** Top 5 cashiers are displayed, sorted by their current float balance (highest first).
    *   **View Denominations:** Managers can click the "Eye" icon on a cashier card to view their current denomination breakdown.

### 2. Quick Actions
*   **Start Day:** (Visible only if Vault Closed) opens `VaultInitializeModal`. Initializes the vault's starting state.
*   **Close Day:** (Visible only if Vault Open) opens `VaultCloseShiftModal`.
    *   **BR-01 Enforcement:** Closing is blocked if any cashier shifts are still `active` or `pending_review`.
    *   **Workflow:** Manager must perform a physical count and enter denominations. The system flags any discrepancies against the expected balance.
*   **Add Cash / Remove Cash:** External cash movement tracked by denomination.
*   **Expenses:** Log categorized spending (Supplies, Repairs, etc.) with mandatory notes.
*   **Machine Collection:** Transfer cash from machine stackers to vault.
*   **Soft Count:** Replenish vault float from machine drops mid-shift.
*   **Manage Cashiers:** Access to cashier account creation and password resets.

### 3. Oversight Panels
*   **Notification Bell:** Real-time alerts for float requests and shift discrepancies.
*   **Shift Review Panel:** Dedicated section for resolving "Pending Review" shifts (discrepancy resolution).
*   **Recent Activity:** Live ledger of the last 10 vault transactions.

