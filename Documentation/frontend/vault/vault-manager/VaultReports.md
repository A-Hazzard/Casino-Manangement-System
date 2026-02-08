# Vault Reports Documentation

## Overview
Vault reports provide consolidated visibility into cash liquidity across locations and detailed historical records.

## Cash on Premises Report
**Route:** `/vault/management/reports/cash-on-premises`

### Purpose
To track the **Total Exposure** of cash across the physical site, including the vault, cashier drawers, and gaming machines.

### Key Metrics
*   **Total Cash on Premises:** The aggregate sum of all cash units in the building.
*   **Vault Liquidity:** Current balance of the main safe.
*   **Total Float Exposure:** Sum of all active cashier drawer balances.
*   **Machine Stacker Total:** Estimated or actual cash currently held in Slot Machine bill validators.

### Location Breakdown Table
Displays a granular row-by-row view of where the cash is located:
*   **Unit Name:** (e.g., "Main Vault", "Cash Desk 1", "Machine 105").
*   **Status:** (e.g., "Active", "Closed").
*   **Current Balance:** The real-time digital value assigned to that unit.
*   **Last Transaction:** Timestamp of the last balance movement.

## End of Day (EOD) Reports
Generated automatically when the Vault Manager executes the **Close Day** workflow.
*   **Audit Purpose:** Provides an immutable snapshot of the site's state at the close of business.
*   **Components:** Summary metrics, shift highlights, and reconciliation adjustments.
