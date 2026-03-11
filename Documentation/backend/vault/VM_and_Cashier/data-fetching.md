# Vault Data Fetching APIs (Read-Only)

These endpoints provide real-time state and metrics for the Vault Manager and Admin dashboards.

## 1. Vault Balance & Inventory
- **Endpoint:** `GET /api/vault/balance?locationId=[ID]`
- **Purpose:** Retrieves the current physical state of the vault.
- **Data Returned:**
  - `balance`: Total dollar value.
  - `denominations`: Current bill quantities map.
  - `lastReconciliation`: Timestamp of the last manager audit.
  - `status`: Shift status (`active` or `closed`).
- **Model:** `VaultShiftModel`

## 2. Vault Metrics
- **Endpoint:** `GET /api/vault/metrics?locationId=[ID]`
- **Purpose:** Aggregates operational performance data.
- **Metrics Calculated:**
  - `totalCashIn`: Sum of all inflows (Collections, Soft Counts, Bank Moves).
  - `totalCashOut`: Sum of all outflows (Payouts, Expenses, Floats).
  - `netCashFlow`: Calculated difference.
  - `varianceTotal`: Accumulated shift discrepancies.
- **Model:** `VaultTransactionModel` (Aggregation)

## 3. Cash Monitoring
- **Endpoint:** `GET /api/vault/cash-monitoring?locationId=[ID]`
- **Purpose:** Provides a breakdown of "Cash On Premise".
- **Calculated View:**
  - `vaultCash`: Funds in central safe.
  - `cashierFloats`: Total funds currently held by active cashiers.
  - `machineBalances`: Funds currently in machine bill validators (based on SAS meters).
- **Models:** `VaultShiftModel`, `CashierShiftModel`, `MetersModel`.

## 4. End-of-Day Report Data
- **Endpoint:** `GET /api/vault/end-of-day?locationId=[ID]&date=[YYYY-MM-DD]`
- **Purpose:** Fetches all required inputs for generating the daily compliance report.
- **Logic:** Aggregates transactions, collections, and final reconciliations for a specific gaming day.
