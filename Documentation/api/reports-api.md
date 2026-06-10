# Executive Reporting API (`/api/reports`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 5, 2026  
**Version:** 4.4.0

---

## 1. Domain Overview

The Reports API is responsible for generating high-fidelity, printable, and exportable data summaries. It handles massive time-series aggregations (30-day, Quarterly, Yearly) for property performance analysis.

---

## 2. Core Endpoints

### 📅 `GET /api/reports/locations`

Monthly summary of every property's financial performance.

- **Returns**: `totalDrop`, `totalCancelledCredits`, `totalJackpots`, `holdPercent`, and `dailyAverageGross` per location.
- **Filters**: Supports `licencee`, `locationId`, `startDate`, `endDate`.

### 🎰 `GET /api/reports/machines`

Performance ranking of all machines within a property.

- **Ranking Metric**: Sorted by `profitPerDay` (Gross / Days Active).
- **Usage**: Used to identify cold spots on the casino floor — machines with high handle but low gross.

### 🧾 `GET /api/reports/meters`

Full meter trends endpoint supporting both SAS and SMIB machine data, with currency conversion, gaming day alignment, and online/offline filtering.

- **Filters**: Supports `licencee`, `locationId`, `startDate`, `endDate`, `machineType` (SAS/SMIB), `onlineStatus`, and `currency` conversion.
- **Aggregation**: Queries the `Meters` collection directly with a daily `$group` stage per machine, applying gaming day offsets for accurate period alignment.

### 💰 `GET /api/reports/vault-activity`

Summarizes vault monetary movements for a given period.

- **Returns**: Cash in, Cash out, Floats Issued, Expenses, and Net Position per day.
- **Usage**: Used by accountants for petty cash reconciliation and end-of-period closing.

### 👷 `GET /api/reports/cashier-performance`

Individual cashier performance report for payroll and accountability tracking.

- **Returns**: Total floats received, total cash returned, variance, and shift hours per cashier.
- **RBAC**: Limited to `Vault Manager` and above.

---

## 3. Generation Logic (How it works)

### 🚀 Performance Optimization

Large reports (30+ days across many machines) can query millions of rows.

- **The Solution**: The API uses cursor-based aggregation to stream results and prevent memory spikes.
  1. Queries the `Meters` collection using `.cursor({ batchSize: 1000 })` for streaming.
  2. Uses `allowDiskUse` for large aggregation pipelines.
  3. Uses `Promise.all` to batch-fetch metadata for multiple machines simultaneously.

### 📐 Export Formatting

- **PDF Generation**: Uses `shadcn/ui` style layouts with a backend renderer to ensure the report matches the UI aesthetics exactly.
- **Excel Logic**: Uses `exceljs` to generate multi-sheet workbooks with raw numeric values preserved (no rounding) for accounting purposes.

---

## 4. Role Detection & Gating

- **Executive**: Can access all high-level reports across all licencees.
- **Manager**: Limited to reports for their assigned property fleet.
- **Cashier**: Restricted from all `/api/reports` endpoints.

---

## 5. Security & Integrity

### 🛡️ Data Snapshotting

Once a month is "Closed" in the Collection System, the Reports API snapshots the totals. Any subsequent machine deletions or ID changes **do not** modify the historical report totals (Maintains audit integrity).

---

**Technical Reference** - Financial & BI Team
