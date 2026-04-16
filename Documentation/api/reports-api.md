# Executive Reporting API (`/api/reports`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

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
Forensic audit comparing SAS meter readings against physical soft counts.
- **Variance Highlighting**: Flags any gaming day where the electronic-to-physical variance exceeded 1% of total drop.
- **Aggregation**: Queries the `Meters` collection with a daily `$group` stage per machine, then joins against the `Collections` collection.

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
- **The Solution**: The API uses a pre-aggregation strategy.
  1. It first queries the `DailyMetricSummary` collection (Pre-aggregated totals).
  2. If data is missing (e.g. for Today), it falls back to a live scan of the `Meters` collection.
  3. Uses `Promise.all` to fetch the metadata for multiple machines simultaneously.

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
