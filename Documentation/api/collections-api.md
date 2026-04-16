# Collection Report API (`/api/collectionReport`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Domain Overview

The financial reconciliation engine for the casino's collection process. Handles creating immutable collection reports, fetching historical reports, generating monthly summaries, and listing properties due for collection.

---

## 2. Core Endpoints

### 📋 `GET /api/collectionReport`
Multi-purpose endpoint that serves the Reports History tab, Monthly Revenue Report, and Manager/Collector Schedule views depending on which query params are passed.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse request params** — Reads `timePeriod`, `startDate`, `endDate`, `locationName`, `locationId`, `locationIds`, `licencee`, `page`, `limit`.
3. **Handle `locationsWithMachines=true` query** — If this param is present, immediately delegates to `fetchLocationsWithMachines(licencee)` which returns a list of active locations and their associated machines. Used to populate the "Property & Asset Selection" step of the wizard. Returns early without checking reports data.
4. **Handle monthly summary query** — If `startDate` and `endDate` are provided WITHOUT a `timePeriod`, runs two parallel queries:
   - `getMonthlyCollectionReportSummary()` — aggregates high-level totals (gross, variance, machine count) for the period.
   - `getMonthlyCollectionReportByLocation()` — breaks totals down by location for the detailed monthly table.
   - Returns `{ summary, details }` and exits early.
5. **Calculate date range** — Calls `calculateDateRangeForTimePeriod(timePeriod, startDateStr, endDateStr)` to resolve `startDate` and `endDate` for standard time period queries (Today, 7d, 30d, etc.).
6. **Determine user access & allowed locations** — Calls `getUserFromServer()` to get the current user. Returns `401` if not authenticated. Then calls `determineAllowedLocationIds(userRoles, userLicencees, userLocationPermissions)` to build the RBAC-filtered set of allowed location IDs. Returns `[]` if the user has no accessible locations.
7. **Parse pagination params** — Reads `page` (default `1`) and `limit` (default `50`, capped at `100`).
8. **Fetch all collection reports** — Calls `getAllCollectionReportsWithMachineCounts(licencee, startDate, endDate)` which queries the `CollectionReports` collection with the date range and licencee filter.
9. **Filter by allowed locations** — If the user is not an admin/developer (`allowedLocationIds !== 'all'`), resolves the location names for the allowed IDs via `getLocationNamesFromIds()` and filters the report array to only include reports where `report.location` is in the allowed names list.
10. **Apply pagination** — Slices `filteredReports` using `skip = (page-1) * limit` and `limit`.
11. **Return paginated results** — Responds with `{ data, pagination: { page, limit, total, totalPages } }`.

---

### ✅ `POST /api/collectionReport`
Creates a new, immutable collection report from a finalized collection batch.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse & validate request body** — Reads the `CreateCollectionReportPayload`. Calls `validateCollectionReportPayload(body)` which checks for required fields (`location`, `collections[]`, `totalCollected`, etc.). Returns `400` with the validation error string if invalid.
3. **Sanitize string fields** — Calls `sanitizeCollectionReportPayload(body)` to trim whitespace and strip potentially harmful characters from string inputs (prevents XSS/injection via collector notes).
4. **Create the report** — Calls `createCollectionReport(sanitizedBody)` helper which performs all the transactional work:
   - Creates a new `CollectionReport` document with calculated `variance` and `gross`.
   - Updates `GamingLocation.bankBalance` to reflect the collected cash.
   - Marks all child `Collection` documents in the batch as `isFinalized: true` and sets their `locationReportId` to the new report's `_id`.
5. **Log activity** — Calls `logActivity({ action: 'CREATE', resource: 'collectionReport', ... })` with the client IP for full forensic audit trail.
6. **Return success response** — Responds with `{ success: true, report }` at `201 Created`.

---

## 3. Business Logic

### 💹 Gross Revenue Formula
```
Movement Gross = (Current Meter In - Prev Meter In) - (Current Meter Out - Prev Meter Out)
```

For RAM-cleared machines (`ramClear: true`), the calculation uses the `ramClearMeters` to bridge the pre-clear and post-clear readings so continuity is preserved.

### 🤝 Partner Profit Sharing
Applied after gross is calculated:
```
Profit Share = (Gross - Variance - Advances) * SharingPercentage
```
Taxes are applied **after** the share split unless the location is flagged as "Pre-Tax Profit Calculation".

### 🔒 Location Filtering (RBAC)
Reports store the location **name** (not the ObjectId), so the access filter must first resolve the user's allowed location IDs to names via `getLocationNamesFromIds()`, then apply a string comparison. This is a known architectural quirk.

---
**Technical Reference** - Collection & Finance Team
