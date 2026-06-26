# Collection Report API (`/api/collection-reports`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.4.0

---

## 1. Domain Overview

The financial reconciliation engine for the casino's collection process. Handles creating immutable collection reports, fetching historical reports, generating monthly summaries, and listing properties due for collection.

---

## 2. Core Endpoints

### 📋 `GET /api/collection-reports`

Multi-purpose endpoint that serves the Reports History tab, Monthly Revenue Report, and Manager/Collector Schedule views depending on which query params are passed.

**Steps:**

1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse request params** — Reads `timePeriod`, `startDate`, `endDate`, `locationName`, `locationId`, `locationIds`, `licencee`, `page`, `limit`, and the server-side search params `search` + `searchType` (see the Search tables in [`collection-report-page.md`](../frontend/pages/collection-report-page.md)). The `licencee` value is normalized via `resolveLicenceeId` (supports both ID and name).
3. **Handle `locationsWithMachines=true` query** — If this param is present, immediately delegates to `fetchLocationsWithMachines(licencee)` which returns a list of active locations and their associated machines. Used to populate the "Property & Asset Selection" step of the wizard. Returns early without checking reports data.
4. **Handle monthly summary query** — If `startDate` and `endDate` are provided WITHOUT a `timePeriod`, runs two queries:
   - `getMonthlyCollectionReportSummary()` — aggregates high-level totals (gross, variance, machine count) for the period.
   - `getMonthlyCollectionReportByLocation()` — breaks totals down by location for the detailed monthly table.
   - Returns `{ summary, details }` and exits early.
5. **Calculate date range** — Calls `calculateDateRangeForTimePeriod(timePeriod, startDateStr, endDateStr)` to resolve `startDate` and `endDate` for standard time period queries (Today, 7d, 30d, etc.).
6. **Determine user access & allowed locations** — Calls `getUserFromServer()` to get the current user. Returns `401` if not authenticated. Then calls `determineAllowedLocationIds(userRoles, userLicencees, userLocationPermissions)` to build the RBAC-filtered set of allowed location IDs. Returns `[]` if the user has no accessible locations.
7. **Parse pagination params** — Reads `page` (default `1`) and `limit` (default `50`, capped at `100`).
8. **Fetch all collection reports** — Calls `getAllCollectionReportsWithMachineCounts(licencee, startDate, endDate, page, limit, userPayload, locationIds, search, searchType)`. It queries `CollectionReports` with the date range + licencee filter, applies server-side search, paginates, and applies the **reviewer scale** (using the user's `moneyInMultiplier` / `moneyOutAndJackpotMultiplier` / `reviewerMultiplierStartTime`) to currency fields. Returns `{ reports, total }`.
9. **Filter by allowed locations** — If the user is not an admin/developer (`allowedLocationIds !== 'all'`), resolves the location names for the allowed IDs via `getLocationNamesFromIds()` and filters the report array to only include reports where `report.location` is in the allowed names list.
10. **Apply pagination** — Slices `filteredReports` using `skip = (page-1) * limit` and `limit`.
11. **Return paginated results** — Responds with `{ data, pagination: { page, limit, total, totalPages } }`.

---

### ✅ `POST /api/collection-reports`

Finalizes a batch of already-staged `Collection` documents into a parent `CollectionReport`. (The individual machine entries are created earlier, one at a time, via `POST /api/collection-reports/collections` — this endpoint is the **commit** step, not where drafts are created.)

**Steps (mirrors the numbered steps in the route):**

1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse & validate request body** — Reads `CreateCollectionReportPayload`. Calls `validateCollectionReportPayload(body)`; returns `400` with the validation error string if invalid.
3. **Sanitize string fields** — Calls `sanitizeCollectionReportPayload(body)` to trim whitespace and strip harmful characters (prevents XSS/injection via collector notes).
3.5. **Per-machine chronological check** — Calls `filterMachinesByChronologicalOrder(machines, timestamp)`. Machines whose collection date would land *between* two existing reports (middle-date insertion) are dropped from the batch. If **every** machine is blocked, returns `400` ("All machines were blocked due to chronological constraints"). Also reports whether this is an `isInsertingFirstReport` (inserted before the oldest existing report).
4. **Create the report** — Calls `createCollectionReport(sanitizedBody)`, which performs the transactional work:
   - Creates the `CollectionReport` document.
   - Links every child `Collection` in the batch by setting `locationReportId` + **`isCompleted: true`** (via `updateCollectionsWithReportId`). _There is no `isFinalized` field — the auditable/locked state of the parent report is tracked by the report-level **`isEditing`** flag (`false` = finalized)._
   - Advances each machine's meter state: updates `machine.collectionMeters` and pushes a `machine.collectionMetersHistory[]` entry (`updateMachineCollectionData`), and creates the derived `Meters` documents.
4.5. **First-report propagation** — If `isInsertingFirstReport`, calls `propagateMetersToNextReport(...)` for each machine so the next (previously-oldest) report's `prevIn`/`prevOut` are rewritten to stay continuous.
5. **Log activity** — Calls `logCRCreateActivity({ ... ipAddress, userAgent, currentUser })` for the forensic audit trail.
6. **Return success response** — Responds with `{ success: true, report }` (HTTP `200`).

> **No `GamingLocation.bankBalance` mutation** happens in this flow — earlier docs claimed this; the code does not touch bank balance here.

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

## 4. Related Endpoints (not on this route file)

This file documents the parent route `app/api/collection-reports/route.ts` (`GET` + `POST` only). The rest of the collection-report surface lives in sibling routes:

| Endpoint                                                    | Methods             | Purpose                                                                                 |
| ---------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| `/api/collection-reports/[reportId]`                       | `GET`/`PATCH`/`DELETE` | Fetch one report's full computed detail (`getCollectionReportById`), edit report-level fields, soft-delete + revert meters. |
| `/api/collection-reports/[reportId]/update-history`        | `PATCH`             | Resync machine histories after edits.                                                  |
| `/api/collection-reports/collections`                      | `GET`/`POST`/`PATCH`/`DELETE` | Per-machine `Collection` CRUD (staging entries, edits, removals). `PATCH`/`DELETE` use `?id=`. |
| `/api/collection-reports/collections/[id]`                 | `PATCH`             | Path-param variant of the per-collection edit.                                         |
| `/api/collection-reports/collections/last-collection-time` | `GET`               | Previous collection's end time → SAS-window start default (`?machineId=`).             |
| `/api/collection-reports/collections/wow-meters`           | `GET`               | Synced meters for a WOW machine over a time window.                                    |
| `/api/collection-reports/check-variations`                 | `POST`              | Pre-commit variation check against historical averages.                               |
| `/api/collection-reports/pre-create-meters`                | `POST`              | Pre-creates `Meters` docs (used by V2 capture).                                        |
| `/api/collection-reports/locations`                        | `GET`               | Locations-with-machines helper for the wizard.                                         |

> The `POST` here is **not** `201 Created` — it returns `200` with `{ success, report }`. There is **no** `PATCH`/`DELETE` on this parent route file; report-level edit/delete live at `/[reportId]`.

---

## 5. Additional Endpoints (Detail)

### 🔍 `POST /api/collection-reports/check-variations`

**Purpose**: Pre-commit variation check — compares Machine Gross vs SAS Gross for each machine, streamed as SSE.

**Request Body**:
```typescript
{
  machines: Array<{
    machineId: string;
    sasStartTime: string;       // ISO date
    sasEndTime: string;         // ISO date
    movementGross?: number;     // Pre-computed movement gross from collection
    metersIn?: number;
    metersOut?: number;
    prevIn?: number;
    prevOut?: number;
  }>;
  flags: {
    includeJackpot: boolean;
    hasRelay?: boolean;
    isWow?: boolean;
    isNoSMIBLocation?: boolean;
  };
}
```

**Response**: SSE stream of `data: { machineId, meterGross, sasGross, variation, hasNoSasData, hasSmib }\n\n` per machine, ending with `data: {"done":true}\n\n`.

**Shared logic**: Uses `aggregateMeterDataForWindows` + `computeMachineVariation` from `variation.ts` — exactly the same functions as the detail page, ensuring numbers match.

**Meter source handling**: Filters `meterSource: { $ne: 'COLLECTION_REPORT' }` from the live query. For machines with supplemental meters, the caller MUST pass `storedSasGross` (not via this endpoint — handled in the edit modal frontend by computing `freshMovementGross` and passing it pre-checked to `computeTotalVariation` server-side during finalization).

### 💾 `POST /api/collection-reports/pre-create-meters`

**Purpose**: Pre-creates or updates `Meters` documents for collection report entries before finalization. Used by the edit modal to persist meter state.

**Request Body**:
```typescript
{
  machines: Array<{
    machineId: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    ramClear: boolean;
    ramClearMetersIn?: number;
    ramClearMetersOut?: number;
    collectionId: string;
    timestamp: string;
    locationReportId: string;
  }>;
  locationId: string;
}
```

**Behavior**:
- For each machine, checks if `collectionId` exists and has `meterId` set → UPDATES existing meter document via bulkWrite upsert.
- For machines without an existing meter → CREATES new `Meters` documents with `meterSource: 'COLLECTION_REPORT'`.
- RAM clear machines get two meter documents (ram clear + post-reset).
- Online machines with no existing supplemental meter are skipped (the relay handles meter creation).

### 📡 `GET /api/collection-reports/collections/wow-meters`

**Purpose**: Fetches synced meter data for WOW machines over a time window.

**Query Params**: `?machineId=<id>&startTime=<iso>&endTime=<iso>`

**Response**: `{ success: true, data: MeterDocument[] }` — all `WOW_SYNC` meter records in the given window.

**Used by**: The WOW Auto Report button (`WowAutoReportButton`) in the New Collection modal.

---

**Technical Reference** - Collection & Finance Team
