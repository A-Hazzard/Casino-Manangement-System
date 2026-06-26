# Collection Report Page Implementation (`/collection-report`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.6.0

---

## 1. Page Overview

Multi-step financial wizard for reconciling electronic machine meters with physical cash collection. The page provides management views for historical reports, monthly summaries, and collector scheduling. Fully responsive with dedicated mobile and desktop layouts.

The page hosts two parallel collection systems — **V1** (legacy form-based) and **V2** (session-based capture) — accessible via the tab navigation bar. The tab bar is horizontally scrollable (`overflow-x: auto`) so all tabs remain reachable on smaller screens without wrapping.

---

## 2. Tab Overview

Tabs are defined in `COLLECTION_TABS_CONFIG` (`lib/constants/collection.ts`) and filtered for role visibility in `CollectionReportPageContent.tsx`. The active tab is initialized from and written back to the `?section=` URL param by `useCollectionReportPageData` (`handleTabChange` → `pushToUrl`). The V2 _view_ additionally uses `?view=<sessionId>` to deep-link a session.

| Tab (label in code)        | `?section=`     | Visibility rule                                  |
| -------------------------- | --------------- | ------------------------------------------------ |
| Collection Reports         | `collection`    | All roles (always visible)                       |
| Collection Reports - V2 ⚡ | `collection-v2` | `developer` only (`isDeveloper`); amber DEV badge |
| Monthly Report             | `monthly`       | Manager and above (`hasManagerAccess`)            |

**Role fallback:** if a non-developer somehow lands on `collection-v2`, or a non-manager on `monthly`, `effectiveTab` silently falls back to `collection`.

> **Currently disabled tabs.** `Manager Schedule` (`manager`) and `Collectors Schedule` (`collector`) are **commented out** in `COLLECTION_TABS_CONFIG` ("not in use until specified"). Their components, hooks, and modals still exist in the codebase (`tabs/manager/`, `tabs/collector/`, `useManagerScheduleData`, `useCollectorScheduleData`, `ScheduleEditModal`, `ScheduleDeleteDialog`) and `CollectionReportPageContent` still renders them when active, but they are not reachable from the navigation bar. Sections 3.3 and 3.4 below document them as dormant features.

**Navigation component:** `CollectionReportNavigation.tsx` — horizontally scrollable flex bar on md+ screens; falls back to a `<select>` dropdown on mobile. The active V2 tab and its DEV badge render amber; other active tabs render in the `buttonActive` accent.

---

## 3. Data & API Architecture (By Section)

### 📋 Reports History Tab (V1)

The primary audit log for all finalized financial collections.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Location** | `location` | `GET /api/collection-reports` |
| **Collector** | `collector` | `GET /api/collection-reports` |
| **Amount Collected** | `amountCollected` | `GET /api/collection-reports` |
| **Variance** | `variance` | `GET /api/collection-reports` |
| **Status** (finalized vs checked-out) | `isEditing` (`false` = finalized) | `GET /api/collection-reports` |

- **Filters**: Licencee, Location, Collector, Date Range.
- **Pagination**: Server-side with batch loading. Skeleton loader shown on every fetch trigger (not just initial load).
- **Implementation**: `CollectionReportDesktopLayout` + `CollectionReportMobileLayout`.

### 📅 Monthly Revenue Report

Aggregated financial performance for owner-level reconciliation and tax preparation.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Totals** | `summary.totalGross`, `summary.totalDrop` | `GET /api/collection-reports?startDate=&endDate=` |
| **Daily Breakdown** | `details[].date`, `details[].gross` | `GET /api/collection-reports?startDate=&endDate=` |
| **Variance Total** | `summary.totalVariance` | `GET /api/collection-reports?startDate=&endDate=` |

- **Export**: PDF and Excel download for external accounting handover.
- **Implementation**: `CollectionReportMonthlyDesktop` / `CollectionReportMonthlyMobile`.

### 🗂️ Manager Schedule View — _dormant (tab disabled)_

> Not reachable from the nav bar (see Section 2). Documented for the retained implementation. High-level planning tool for overseeing the property collection cycle.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Name** | `locationName` | `GET /api/collection-reports?locationsWithMachines=true` |
| **Last Collection** | `lastCollectionDate` | `GET /api/collection-reports?locationsWithMachines=true` |
| **Machine Count** | `machineCount` | `GET /api/collection-reports?locationsWithMachines=true` |

- **Visuals**: Rows highlighted red if a property is overdue (>7 days since last collection).
- **Implementation**: `CollectionReportManagerDesktop` / `CollectionReportManagerMobile`.

### 👷 Collectors Schedule View — _dormant (tab disabled)_

> Not reachable from the nav bar (see Section 2). Documented for the retained implementation. The operational task list for field staff performing the counts.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Assigned Location** | `locationName` | `GET /api/collection-reports?locationsWithMachines=true` |
| **Machine List** | `machines[].machineId` | `GET /api/collection-reports?locationsWithMachines=true` |
| **Pending Items** | `incompleteCount` | `GET /api/collection-reports?incompleteOnly=true` |

- **Mobile**: Switches to card-based task checklist for one-handed operation.
- **Implementation**: `CollectionReportCollectorDesktop` / `CollectionReportCollectorMobile`.

---

### ⚡ Collection Reports V2 Tab

Session-based machine capture system. See **Section 10** for the full V2 architecture.

---

## 4. The 3-Step Collection Wizard (V1)

Triggered via **"Create Collection Report"**. Both a desktop modal (`CollectionReportNewCollectionModal`) and a mobile modal (`CollectionReportMobileNewCollectionModal`) exist with feature parity.

### STEP 1: Property & Asset Selection

- **Location Dropdown**: Uses `LocationSingleSelect` component — rendered via a **React portal** (`createPortal` to `document.body`) to escape `overflow: hidden` clipping inside the modal. The dropdown width auto-sizes to the longest location name using a hidden DOM measurement element. Supports 248+ locations without display issues.
- **Machine List**: Fetched from `GET /api/collection-reports?locationsWithMachines=true`. Includes the location's `gameDayOffset` field to compute correct default collection times.
- **Sync**: Clicking a machine's "Sync" icon fetches live SAS meters from hardware in real time.
- **Per-Machine Staging (not a draft report)**: Each machine added in the wizard is persisted **immediately** as an individual `Collection` document via `POST /api/collection-reports/collections` (`isCompleted: false`, `locationReportId: ''`). There is **no draft `CollectionReport`** at this stage — the parent report is only created at finalization in STEP 3. The server calculates `prevIn`/`prevOut`, `sasMeters`, and `movement` for each entry (`createCollectionWithCalculations`); the frontend never sends `prevIn`/`prevOut`.
- **WOW Auto Report (developer only)**: For all-WOW-machine locations, a purple "Auto Report" button (`WowAutoReportButton`) iterates every uncollected WOW machine, fetches its synced meters from `GET /api/collection-reports/collections/wow-meters`, and directly `POST`s each as a collection — bypassing the per-machine UI to avoid re-rendering large machine lists. Machines with no `WOW_SYNC` meter data are listed as "skipped" inside the modal (no toast).

### STEP 2: Meter & Cash Verification

- **UI**: Enter physical `Meter In` / `Meter Out` readings for each machine.
- **Recalculation**: Auto-calculates `Movement Gross = (Current In - Prev In) - (Current Out - Prev Out)`.
- **RAM Clear Toggle**: Reveals `ramClearMeters` fields for machines that were reset.
- **Collection Time Default**: Pre-populated to 1 minute before the `gameDayOffset` boundary (e.g. 7:59 AM for an 8 AM offset). Read from the location's `gameDayOffset` field returned by the locations API.
- **SAS Start Time Default**: Pre-populated from the **last completed collection** for that machine via `GET /api/collection-reports/collections/last-collection-time?machineId=<id>`. This represents the end of the previous gaming period and is used as the start of the SAS window for the current collection. (Note the `/collections/` segment — this is the V1 route; the V2 capture flow uses the separate `GET /api/collection-reports-v2/machines/last-collection-time`.)
- **Editing a staged entry**: Updates to an already-staged machine are saved via `PATCH /api/collection-reports/collections?id=<collectionId>` (the same route also supports the path form `PATCH /api/collection-reports/collections/[id]`). Removing a staged entry uses `DELETE /api/collection-reports/collections?id=<collectionId>`.

### STEP 3: Financial Reconciliation & Commit

- **UI**: Shows `Amount to Collect` (electronic) vs. `Amount Collected` (physical cash in bag).
- **Variance**: Auto-calculated. A mandatory note is required if variance exceeds the licencee's threshold.
- **Variation Check**: Before committing, runs a variation check (`POST /api/collection-reports/check-variations`) comparing current values against historical averages. Flagged machines show a `VariationCheckPopover` with details, and a `VariationsConfirmationDialog` requires acknowledgment.
- **Commit / Finalize**: `POST /api/collection-reports` runs `createCollectionReport`, which:
  - Creates the parent `CollectionReport` document.
  - Links the staged `Collection` records by setting `locationReportId` + `isCompleted: true` on each (`updateCollectionsWithReportId`).
  - Advances each machine's meter state — `machine.collectionMeters` and a new `machine.collectionMetersHistory[]` entry (`updateMachineCollectionData`) — and creates the derived `Meters` documents.
  - **Chronological guard (STEP 3.5 in the route):** `filterMachinesByChronologicalOrder` blocks inserting a report whose date falls *between* two existing reports for a machine (middle-date block). If **all** machines are blocked the request returns `400`.
  - **First-report propagation (STEP 4.5):** if the new report is inserted *before* a machine's oldest existing report, `propagateMetersToNextReport` rewrites the next report's `prevIn`/`prevOut` so the chain stays continuous.
  - There is **no** `GamingLocation.bankBalance` mutation in this flow.

---

## 4.5. Chronological UI Validation

To prevent users from breaking chronological timelines, both New and Edit Collection Modals check if the selected collection date falls between two existing reports for any selected machine. If it detects a middle-date insertion, it disables submission and displays a warning banner to the user, enforcing sequential collection report submissions.

---

## 5. Edit Collection Report

- **Desktop**: `CollectionReportEditCollectionModal` → `DesktopEditLayout`
- **Mobile**: `CollectionReportEditCollectionModal` (mobile branch) → `MobileEditLayout`
- **Endpoints used by the edit flow:**
  - Load the report's entries: `GET /api/collection-reports/collections?locationReportId=<id>`
  - Per-entry meter/time edits: `PATCH /api/collection-reports/collections?id=<collectionId>` (recalculates that entry's `movement`/`sasMeters`, then one-hop `propagateMetersToNextReport` to keep the chain continuous).
  - Report-level field edits (financials, notes, etc.): `PATCH /api/collection-reports/[reportId]`.
  - History resync after edits: `PATCH /api/collection-reports/[reportId]/update-history`.
  - Delete the whole report: `DELETE /api/collection-reports/[reportId]` (reverts machine meter state).
- **Creation-vs-edit invariant**: editing a collection entry MUST NOT advance `machine.collectionMeters` (that only happens on creation via `updateMachineCollectionData`); edits go through `recalculateMachineCollections`. See [`app/collection-report/CLAUDE.md`](../../app/collection-report/CLAUDE.md).
- **Machine List Display**: Edit modal defaults to showing the machines list (not the collected list) so users can see all machines with green "Added to Collection" indicators. The list auto-scrolls to follow the highlighted machine (used by the WOW Auto Report scan).
- **SAS Time Pre-fill**: Opening an existing entry pre-fills `sasStartTime` from `entry.sasMeters.sasStartTime`.
- **SAS Manual Time Updates**: When an operator adjusts the SAS start or end times manually in the edit form, the client submits them to the PATCH collections API. The backend treats them as an explicit custom window override (`sasTimesChanged`), forcing a full recalculation of the SAS metrics (drop, gross, cancelled credits) for that range.
  - **Offline-SMIB override**: On PATCH, if the machine is an offline SMIB (has `relayId` but stale `lastActivity`) or the original collection carries a supplemental `meterId`, the route overrides `sasMeters.drop/totalCancelledCredits/gross` with the collector-entered movement values so variation is not phantom (STEP 5.1 in the collections route).
  - **Pre-create meters endpoint**: When the user opens the edit modal and a machine is online (relay live, no supplemental meter), the frontend calls `POST /api/collection-reports/pre-create-meters` to pre-create `Meters` documents for what will become the edited collection values. For offline SMIB machines with an existing supplemental meter, it updates the existing meter document via bulkWrite upsert.

---

## 5.5. Report Detail Page (Clicking Into a Report)

Clicking a row in the Reports History tab navigates to `/collection-report/report/[reportId]` — a full page (not a modal) rendered by `CollectionReportDetailsPageContent.tsx`. It is gated by `ProtectedRoute requiredPage="collection-report"`.

### Data Loading

- **Hook**: `useCollectionReportDetailsData` loads two things in parallel through the shared `useRequestWithRetry` wrapper:
  - `GET /api/collection-reports/[reportId]` — the heavy call. Almost all time is spent in `getCollectionReportById` (`app/api/lib/helpers/accountingDetails.ts`), which runs sequential phases: report fetch → collector lookup → collections `$lookup` aggregation → **meters aggregation** → relay-map fetch → metrics calc.
  - `GET /api/collection-reports/collections?locationReportId=<id>` — the raw collections list (best-effort; a failure here falls back to `[]` and does not fail the page).
- **Resilience**: up to **3 retries** with exponential backoff and a **60 s per-attempt timeout** (the meters aggregation can legitimately take many seconds). A determinate `RetryLoadingBar` shows an estimated `%` and, on a connection issue, an amber "retrying in Ns (attempt X of Y)" countdown.
- **Error mapping**: `403` → `UnauthorizedError`; timeout/network/`5xx` → `NetworkError` ("report is taking too long… most likely exists", with retry); a genuine missing report → `NotFoundError`. A timeout is deliberately **not** shown as 404.
- **Meters-aggregation performance**: the meters aggregation uses a two-stage `$match` — an index-friendly `{ machine: $in, readAt: $gte/$lte global range }` first (uses the `{ machine: 1, readAt: 1 }` index), then the exact per-window `$or` residual — to avoid a full collection scan.

### Header Actions

Back, **Share** (Web Share API / clipboard), **Refresh**, **Export** (CSV/JSON dropdown — wired to `collectionReportExport.ts` via `handleExportReport` which serialises machine metrics into a structured file), and — for `developer`/`admin`/`owner` only — **Edit Report** (opens the same `CollectionReportEditCollectionModal` described in Section 5, preloaded with the location's machines).

### The Three Detail Tabs

Navigation is a sidebar on desktop / `<select>` on mobile. Tab state syncs to the URL via `?section=machine|location|sas`.

| Tab                     | Component                                     | What it shows                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Machine Metrics**     | `CollectionReportDetailsCollectionsTable`    | Per-machine table from `reportData.machineMetrics`: machine identifier, Drop/Cancelled, Meters Gross, Jackpot, Net Gross, **SAS Gross**, **Variation**. Client-side search, sortable columns, pagination (20/page). |
| **Location Metrics**    | `CollectionReportDetailsLocationMetricsTab`  | A financial summary (Dropped/Cancelled, Meters Gross, SAS Gross, Variation) plus four cards: **1 Collection Variance**, **2 Revenue & Capacity**, **3 Balances & Taxes**, **4 Corrections**.                  |
| **SAS Metrics Compare** | `CollectionReportDetailsSasCompareTab`       | SAS-system totals for reconciliation against the manual count: **SAS Drop Total**, **SAS Cancelled Total**, **SAS Gross Total**.                                                                              |

### Per-Machine Display Logic (computed in `getCollectionReportById`)

- **Machine name**: `serialNumber` → `custom.name`/`machineName` → `machineId` → `Machine N`, with `(customName, game)` in brackets (`(game name not provided)` when blank).
- **SAS Gross / Variation special states**:
  - `"No SMIB for this Machine"` when the location is a no-SMIB location, or the machine has no `relayId`.
  - `"No SAS Data"` when there is no SAS time window or the meters query returned nothing for that window.
- **Jackpot handling**: when the licencee has `includeJackpot`, gross is the lower value (`sasGross − jackpot`); otherwise the higher `sasGross`.
- **Reviewer scale**: all currency values pass through `getMoneyInScale` / `getMoneyOutAndJackpotScale` before display, so the `reviewer` role sees scaled figures.

### V2 Session Detail (separate route)

The V2 equivalent is `/collection-report/report/session/[sessionId]` (`CollectionReportV2SessionReport`), which renders a Summary tab and a Machines tab for a session. See Section 10.

---

## 6. Variation Checking (Machine Gross vs SAS Gross)

Variation is the difference between what the **machine meters say** the machine earned (Machine Gross) and what the **SAS system recorded** over the same time window (SAS Gross). Every machine with a relay (SMIB) or WOW sync gets a variation computed.

### Variation Pipeline (Shared)

The core logic lives in `app/api/lib/helpers/collectionReport/variation.ts` and is the **single source of truth** for both the detail page and the pre-submit checker.

1. **`aggregateMeterDataForWindows(meterQueries)`** — runs a single aggregation across all requested machines, using a two-phase `$match` (index-friendly `{ machine: $in, readAt: $gte/$lte }` then per-machine exact-window `$switch`). Meters with `meterSource: 'COLLECTION_REPORT'` are excluded (supplemental meters are never in the live query). Returns a `Map<machineId, { drop, cancelled, jackpot, count }>`.

2. **WOW_SYNC handling in the aggregation**: WOW_SYNC records store cumulative absolute `drop`/`totalCancelledCredits` with `movement.*` always 0. The pipeline tracks `$first`/`$last` of top-level fields and a `anyWowSync` flag. After the group, if `anyWowSync && totalDrop === 0`, the code uses `lastDrop - firstDrop` (absolute delta) instead of the movement sum. Fall-through to `totalDrop` for non-WOW records.

3. **`computeMachineVariation(entry, meterSums, flags)`** — pure function returning `{ meterGross, sasGross, variation, hasNoSasData, hasSmib }`. Machine Gross prefers `movementGross` (stored on the collection), else `(metersIn - prevIn) - (metersOut - prevOut)`. SAS Gross = `meterSums.drop - meterSums.cancelled`, jackpot-adjusted when `flags.includeJackpot`. Variation = Machine Gross − SAS Gross (or 0 when no SAS data / no SMIB).

- **Hook**: `useVariationStreamCheck` (`lib/hooks/collectionReport/useVariationStreamCheck.ts`) — wraps a POST to `/api/collection-reports/check-variations` which returns an SSE stream. The hook exposes `cancel()` (aborts the stream but preserves existing `result`) and `reset()` (nukes `result` back to `null`).
- **Endpoint**: `POST /api/collection-reports/check-variations` — accepts `{ machines: [...], flags: {...} }`, runs `aggregateMeterDataForWindows`, then `computeMachineVariation` per machine, and SSE-streams each result as `{ machineId, meterGross, sasGross, variation, ... }`.
- **Components**: `VariationCheckPanel` (modal panel showing streaming results), `VariationCheckPopover` (inline machine-row flag with detail), `VariationsConfirmationDialog` (acknowledgment gate before submission).
- **Scope**: Applied on both new collection creation and edit saves.
- **Trigger logic**: `isEditing: true` reports (unfinished edits from a prior session) skip the variation check — they auto-restore previous result instead.

### Orange Highlighting on Machine Rows

When `variationMachineIds` (a `Set<string>` from the variation check result) contains a machine ID, the collected-machine list rows render with:

```
border-amber-400 bg-amber-50 shadow-amber-100 ring-1 ring-amber-400
```

This is checked in three components:
- `CollectionReportNewCollectionCollectedMachines.tsx` (line ~215) — `hasVariation` on each row
- `CollectionReportEditCollectedMachines.tsx` (line ~181) — `hasVariation` on each row
- `CollectionReportMobileCollectedListPanel.tsx` (line ~603) — `hasVariation` on each mobile row

The orange highlight **persists after the variation panel is closed** because the `onCancel` handler no longer calls `reset()` — it calls `cancel()` which keeps the `variationMachineIds` set so the UI stays highlighted until the next check or modal close. (Fix applied June 2026.)

### Pre-Submit Flow

```
User clicks "Create Report" / "Update Report"
  → VariationCheckPanel opens
  → POST /api/collection-reports/check-variations SSE stream
  → Each machine's variation rendered as it arrives
  → Machines with variation > 0 added to variationMachineIds Set
  → User sees orange-highlighted rows in list
  → User clicks "Confirm" in VariationsConfirmationDialog
  → Report is finalized (and isEditing set to false)
```

---

## 6.5. WOW Sync Integration

Some machines at no-SMIB locations or without a physical SMIB relay get their meter data from the **WOW sync** system instead of live SAS polling. WOW-synced machines are detected by `machine.isWow: true` and/or `machine.connectionMode: 'WOW'`.

### Key Differences from SAS_READ

| Aspect | SAS_READ (live relay) | WOW_SYNC (WOW sync) |
|--------|----------------------|---------------------|
| `meterSource` | `SAS_READ` | `WOW_SYNC` |
| `movement.*` | Per-reading delta (populated) | Always 0 |
| Top-level `drop`/`totalCancelledCredits` | Per-reading absolute (mirrors movement) | Cumulative absolute values |
| SAS gross computation | Sum `movement.drop` directly | Use `lastDrop - firstDrop` (absolute delta) |
| Variation check | Standard aggregation | WOW_SYNC fallback in `aggregateMeterDataForWindows` |
| `createCollectionWithCalculations` | SAS metrics from movement sum | WOW_SYNC fallback in `calculateSasMetrics` (JS reduce) |

### WOW Auto Report Button (Developer only)

For all-WOW-machine locations, a purple "Auto Report" button (`WowAutoReportButton`) in the New Collection modal iterates every uncollected WOW machine, fetches its synced meters from `GET /api/collection-reports/collections/wow-meters`, and directly `POST`s each as a collection — bypassing the per-machine UI. Machines with no `WOW_SYNC` meter data are listed as "skipped" inside the modal.

### Variation Check for WOW Machines

In `computeMachineVariation`, a machine is considered to have SMIB (`hasSmib: true`) if `flags.isWow` is true, even without a physical relay. This ensures variation is computed for WOW machines the same way as SMIB machines. The aggregation pipeline in `aggregateMeterDataForWindows` detects WOW_SYNC records via the `anyWowSync` flag and computes the absolute delta from first/last cumulative values when movement sums are 0.

### WOW_SYNC Fix (June 2026)

Both the aggregation pipeline (`variation.ts`) and `calculateSasMetrics` (`creation.ts`) were updated to handle WOW_SYNC records. Before the fix, SAS gross for WOW machines was always $0 (because `movement.*` sums to 0), making the full machine gross appear as variation (e.g., $5,000 phantom variation on WOW machines). The fix uses the absolute delta from first/last cumulative values when WOW_SYNC is the only source.

---

## 7. UI Indicators & Validation

- ⚡ **Sync Desync**: Shown if last electronic heartbeat was >2 hours ago.
- 📉 **Negative Gross**: Highlighted red if meter delta indicates a net payout.
- 🕒 **History Bridge**: Displayed if there is a meter gap between current and last finalized reading.
- ⚠️ **High Variance**: Banner shown if submitted variance exceeds licencee's tolerance.
- ✅ **Added to Collection**: Green highlight + label on machines already added in current session.

---

## 8. Form Persistence & Mobile Resilience

- **State Persistence**: Wizard state synchronized to Zustand store (`collectionModalStore`) for cross-component access.
- **Mobile Architecture**: Uses a navigation stack (`pushNavigation` / `popNavigation`) to move between machine list → form → collected list views without full re-renders.
- **Offline Detection**: Header shows "No Connection" banner if network drops during wizard.

---

## 9. Skeleton Loader Behaviour

- Skeleton displays on **every fetch trigger** (not just initial load) — including tab switches and filter changes.
- `setInitialLoading(true)` is called in the fetch-trigger effect in `useCollectionReportPageData.ts` to ensure the skeleton always replaces "No Data Available" during loading.

---

## 10. Collection Reports V2 — Session-Based Capture

### Overview

V2 replaces the form-based wizard with a **session-per-location** model designed for mobile-first field collection. A collector starts a session for a specific location; the system automatically seeds one `ReportedMachine` document for every active machine at that location. The collector then captures meter readings machine-by-machine and submits the session when done.

Currently in active development — visible to the **Developer** role only (DEV badge in the tab bar).

### Data Model — `ReportedMachine`

All V2 data lives in the `ReportedMachine` collection (`app/api/lib/models/reportedMachines.ts`). One document per machine per session.

| Field                                    | Type                                                  | Description                                                   |
| ---------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `sessionId`                              | String                                                | Groups all machines for one collection run                    |
| `sessionStatus`                          | `'in-progress' \| 'submitted'`                        | Session lifecycle state                                       |
| `locationId` / `locationName`            | String                                                | Location being collected (denormalized)                       |
| `licencee`                               | String                                                | Licencee context                                              |
| `collector`                              | String                                                | User ID of the collector                                      |
| `collectorName`                          | String                                                | Denormalized display name                                     |
| `machineId`                              | String                                                | Reference to the Machine document                             |
| `machineName` / `machineCustomName`      | String                                                | Display identifiers                                           |
| `systemMetersIn` / `systemMetersOut`     | Number                                                | SAS meter snapshot at session start                           |
| `manualMetersIn` / `manualMetersOut`     | Number                                                | Manually captured readings                                    |
| `status`                                 | `'pending' \| 'captured' \| 'confirmed' \| 'skipped'` | Per-machine capture state                                     |
| `metersMatch`                            | Boolean                                               | Whether manual and SAS readings agree                         |
| `ramClear`                               | Boolean                                               | True when the machine's meters were reset between collections |
| `ramClearMetersIn` / `ramClearMetersOut` | Number                                                | Pre-reset peak readings (only when `ramClear === true`)       |
| `sequenceOrder`                          | Number                                                | Capture/display order within the session                      |
| `sessionStartTime` / `sessionEndTime`    | Date                                                  | Session window — start derived from previous session's end    |
| `driveFileId`                            | String                                                | Google Drive ID for captured meter image                      |
| `imageCapturedAt`                        | Date                                                  | Timestamp of meter photo                                      |
| `deletedAt`                              | Date                                                  | Soft-delete marker                                            |

### RAM Clear (V2)

The capture wizard exposes a "RAM Clear" toggle on every machine regardless of `metersMatch` or SMIB status. When checked, two additional fields appear: `ramClearMetersIn` and `ramClearMetersOut` (the pre-reset peak readings). The movement formula becomes `(ramClear − prev) + current`, identical to V1's two-meter math. A yellow "RAM Clear" badge is shown on rows in the review list.

For no-SMIB locations and offline SMIB machines, the submit route creates `Meters` docs (RAM clear + post-reset when applicable, `isRamClear: true` on the first) instead of one — see [`Documentation/backend/api/collection-reports-v2-movement.md`](../../backend/api/collection-reports-v2-movement.md) for the calculation engine and field mappings. For offline SMIB machines, `Machine.sasMeters.drop` and `Machine.sasMeters.totalCancelledCredits` are also updated with the collector-entered values.

### Session Lifecycle

```
POST   /api/collection-reports-v2/sessions               → create session, seed ReportedMachine docs (status: pending)
GET    /api/collection-reports-v2/sessions               → list all sessions (one aggregated row per sessionId)
GET    /api/collection-reports-v2/sessions/[sessionId]   → session detail with all machines
PATCH  /api/collection-reports-v2/sessions/[sessionId]   → update machine readings (status → captured/confirmed/skipped)
PATCH  /api/collection-reports-v2/sessions/[sessionId]/submit → finalize (sessionStatus → submitted, stamp timestamps)
DELETE /api/collection-reports-v2/sessions/[sessionId]   → soft-delete (sets deletedAt on all machines)
```

### Session List — Aggregated Fields

The list endpoint groups by `sessionId` and returns one summary row:

| Field                  | Aggregation                                       |
| ---------------------- | ------------------------------------------------- |
| `machinesTotal`        | `$sum: 1`                                         |
| `machinesCaptured`     | Count where status in `['captured', 'confirmed']` |
| `machinesConfirmed`    | Count where status is `'confirmed'`               |
| `machinesSkipped`      | Count where status is `'skipped'`                 |
| `totalMachineGross`    | `$sum (manualMetersIn − manualMetersOut)`         |
| `totalSasGross`        | `$sum (systemMetersIn − systemMetersOut)`         |
| `totalGrossDifference` | `totalMachineGross − totalSasGross`               |
| `createdAt`            | Earliest `createdAt` in the group                 |

### Search (V2)

Server-side, case-insensitive. The deletion filter and search condition are combined with `$and` to prevent the deletedAt OR from washing out the search:

```js
matchStage.$and = [
  { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
  { [searchKey]: { $regex: search, $options: 'i' } },
];
```

| Search type  | Field queried                                       |
| ------------ | --------------------------------------------------- |
| `collector`  | `collectorName` (denormalized on `ReportedMachine`) |
| `location`   | `locationName` (denormalized on `ReportedMachine`)  |
| `sessionId`  | `sessionId`                                         |
| `locationId` | `locationId`                                        |

### Search (V1)

Server-side, case-insensitive. Search type determines where the filter is applied in the aggregation pipeline:

| Search type        | Field / Stage                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `collector`        | Post-lookup `$match` on `collectorDetails.username`, `firstName`, `lastName`, `emailAddress` |
| `location`         | Initial `$match` on `locationName` (denormalized — no join required)                         |
| `locationReportId` | Initial `$match` on `locationReportId`                                                       |
| `collectorId`      | Initial `$match` on `collector` (raw user ID)                                                |
| `locationId`       | Initial `$match` on `location` (raw location ID)                                             |

### Frontend Hook

`lib/hooks/collectionReport/useCollectionReportV2Data.ts`

- Fetches sessions server-side with 300 ms debounced search
- Exposes `searchTerm`, `setSearchTerm`, `searchType`, `setSearchType` for the filter bar
- Client-side `selectedLocation` multi-select applied on top of server results

### Components

| Component                                        | Role                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `CollectionReportV2Desktop.tsx`                  | Desktop session list table                                         |
| `CollectionReportV2Mobile.tsx`                   | Mobile session list cards                                          |
| `CollectionReportV2Filters.tsx`                  | Purple filter bar (search type, text input, location multi-select) |
| `CollectionReportV2SessionDetail.tsx`            | Per-session machine list                                           |
| `CollectionReportV2SessionReport.tsx`            | Session report wrapper (summary + machines tabs)                   |
| `CollectionReportV2SessionReportSummaryTab.tsx`  | Aggregated financials for a session                                |
| `CollectionReportV2SessionReportMachinesTab.tsx` | Per-machine reading detail                                         |

---

## 11. Role-Based Access Control (RBAC)

- **Collectors**: Collection Reports tab and the creation wizard.
- **Managers and above** (`hasManagerAccess`): additionally see the **Monthly Report** tab.
- **Developers**: additionally see the **Collection Reports - V2** tab; `developer`/`admin`/`owner` see the **Edit Report** action on the detail page.
- **Location Admins**: restricted to their assigned properties only (location filtering applied server-side).
- **Repair helpers**: data-repair logic (SAS-time fixes, admin repair, bulk SAS times, issue checks) lives in `app/api/lib/helpers/collectionReport/fixes/` and `fixOperations.ts`. _Note: there is no `POST /api/collection-reports/[reportId]/fix` route — these are server-side helpers invoked from other flows, not a standalone public endpoint._

---

**Internal Document** — Engineering Team
