# Analytics Dashboard API (`/api/analytics/dashboard`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.3.0

---

## 1. Domain Overview

Provides aggregated real-time financial and operational statistics for the dashboard's "Financial Stats Bar". This is the single source of truth for top-line KPIs (Money In, Money Out, Gross, Machines Online) for a given licencee.

---

## 2. Core Endpoints

### 📊 `GET /api/analytics/dashboard`

Returns the top-level KPI summary for the dashboard.

**Required Params**: `licencee` (returns `400` if missing).

**Steps:**

1. **Parse & validate params** — Reads `licencee` and optional `currency` (defaults to `USD`) from the query string. Returns `400` if `licencee` is absent.
2. **Connect to database** — Establishes the Mongoose connection.
3. **Fetch dashboard analytics** — Delegates to `getDashboardAnalytics(licencee)` helper. This runs an aggregation pipeline against the `Meters` collection to compute `totalDrop`, `totalCancelledCredits`, `totalGross`, and `onlineCount` for the selected licencee.
4. **Apply currency conversion** — Checks `shouldApplyCurrencyConversion(licencee)`. If the licencee has a non-USD currency configured, it converts `totalDrop`, `totalCancelledCredits`, and `totalGross` using `convertFromUSD(value, displayCurrency)`.
5. **Return response** — Responds with `{ globalStats, currency, converted }`.

---

## 3. `GET /api/metrics/meters`

Provides time-series meter data for the dashboard's **Performance Chart**.

**Steps:**

1. **Parse & validate params** — Reads `licencee`, `timePeriod`, `granularity` (`Hourly`/`Daily`/`Weekly`/`Monthly`), `startDate`, `endDate`.
2. **Authenticate user** — Retrieves the user from the JWT cookie. Returns `401` if absent.
3. **Determine accessible locations** — Calls `getUserAccessibleLicenceesFromToken()` and `getUserLocationFilter()` to build the RBAC-filtered list of location IDs the user can see.
4. **Fetch location data & calculate gaming day ranges** — Fetches all location documents to get their individual `gameDayOffset` values. Then computes `queryStartDate` and `queryEndDate` aligned to each property's gaming day (e.g. `8 AM to 7:59 AM next day`). Also fetches `includeJackpot` setting per Licencee.
5. **Fetch machines** — Queries the `Machines` collection filtered to the resolved location list.
6. **Aggregate last meter per machine** — Calls `getLastMeterPerMachine()` which gets the most recent `Meters` document for each machine within the date range (uses `$sort` then `$group` by `machineId`).
7. **Optionally aggregate hourly chart data** — If `granularity` is specified, calls `getHourlyChartData()` which runs a `$group` by time bucket to produce the chart series data.
8. **Transform & filter data** — Calls `transformMeterData()` then `filterMeterDataBySearch()` to enrich with location/machine names and apply any search filter.
9. **Apply currency conversion** — Calls `applyCurrencyConversion()` and `buildCurrencyMaps()` to convert financial fields based on each location's licencee currency.
10. **Paginate & return** — Calls `paginateMeterData()` and returns `{ data, pagination, dateRange, currency, converted }`.

---

## 4. `GET /api/analytics/top-machines`

Returns the top-performing machines for a specific location.

**Steps:**

1. **Parse params** — Reads `locationId`, `timePeriod`, `startDate`, `endDate`.
2. **Connect to database** — Establishes the Mongoose connection.
3. **Fetch top machines** — Delegates to `getTopMachinesByLocation(locationId, timePeriod, ...)` which aggregates the `Meters` collection grouped by `machineId`, summing `movement.drop` and sorting descending.
4. **Return results** — Responds with the ranked machine array.

---

## 5. Business Logic

### ⏱️ Gaming Day Offset

Each property has a configurable `gameDayOffset` (typically `8`, meaning 8 AM). All date range queries are shifted by this offset so that "Today" for a casino means `8:00 AM Today → 7:59 AM Tomorrow`, not midnight-to-midnight.

### 💹 Gross Calculation

`Gross = totalDrop - totalCancelledCredits`.

If the Licencee has `includeJackpot: true`, jackpot payouts are also deducted:
`Gross = totalDrop - totalCancelledCredits - totalJackpots`.

---

**Technical Reference** - Analytics & BI Team
