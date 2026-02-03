# Vault Inventory Tracking Implementation

Implemented live denomination tracking for the Vault to address the "running low on bills" scenario.

## Features Added

### 1. Vault Inventory Card (`VaultInventoryCard.tsx`)
- Displayed on the main **Vault Overview** dashboard.
- Shows a grid of all denominations ($100, $50, $20, $10, $5, $1).
- Shows **Quantity** and **Total Value** for each.
- **Low Stock Warning**: Highlights the specific denomination in **RED** with a warning icon if the quantity drops below **20 bills**.

### 2. Integration
- Integrated `VaultInventoryCard` into `VaultOverviewPageContent.tsx`.
- Connects directly to `vaultBalance.denominations` which is maintained by the backend during Add/Remove cash operations.

## Cashier Denomination Tracking
**Note on Cashier Tracking:**
- Live denomination tracking for Cashiers is **not currently implemented** because the Payout API (`ticket` and `hand_pay`) does not require cashiers to input specific bill denominations (optimized for speed).
- Cashier shifts *do* track Opening Float breakdown.
- To enable live cashier inventory, we would need to mandate denomination input for every payout, which changes the operational workflow.

## Verification
1. Go to **Vault Overview**.
2. Locate the "Vault Inventory" card below the metrics.
3. Verify counts match the total balance.
4. Test "Low Stock": If a denomination count is low (e.g., < 20), verify it is highlighted in red.
