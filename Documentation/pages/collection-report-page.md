# Collection Report Page Implementation (`/collection-report`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** May 21, 2026  
**Version:** 4.5.0

---

## 1. Page Overview

Multi-step financial wizard for reconciling electronic machine meters with physical cash collection. The page provides management views for historical reports, monthly summaries, and collector scheduling. Fully responsive with dedicated mobile and desktop layouts.

The page hosts two parallel collection systems — **V1** (legacy form-based) and **V2** (session-based capture) — accessible via the tab navigation bar. The tab bar is horizontally scrollable (`overflow-x: auto`) so all tabs remain reachable on smaller screens without wrapping.

---

## 2. Tab Overview

| Tab                          | `section=` param | Access         |
| ---------------------------- | ---------------- | -------------- |
| Collection Reports (V1)      | `collection`     | All roles      |
| Collection Reports V2 ⚡ DEV | `collection-v2`  | Developer only |
| Monthly Report               | `monthly`        | Manager+       |
| Manager Schedule             | `manager`        | Manager+       |
| Collector Schedule           | `collector`      | All roles      |

**Navigation component:** `CollectionReportNavigation.tsx` — horizontally scrollable flex bar on md+ screens; falls back to a `<select>` dropdown on mobile.

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
| **Status** | `isFinalized` | `GET /api/collection-reports` |

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

### 🗂️ Manager Schedule View

High-level planning tool for overseeing the property collection cycle.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Name** | `locationName` | `GET /api/collection-reports?locationsWithMachines=true` |
| **Last Collection** | `lastCollectionDate` | `GET /api/collection-reports?locationsWithMachines=true` |
| **Machine Count** | `machineCount` | `GET /api/collection-reports?locationsWithMachines=true` |

- **Visuals**: Rows highlighted red if a property is overdue (>7 days since last collection).
- **Implementation**: `CollectionReportManagerDesktop` / `CollectionReportManagerMobile`.

### 👷 Collectors Schedule View

The operational task list for field staff performing the counts.
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
- **Draft Creation**: Machine entries staged via `POST /api/collection-reports` (creates `isCompleted: false` draft record).

### STEP 2: Meter & Cash Verification

- **UI**: Enter physical `Meter In` / `Meter Out` readings for each machine.
- **Recalculation**: Auto-calculates `Movement Gross = (Current In - Prev In) - (Current Out - Prev Out)`.
- **RAM Clear Toggle**: Reveals `ramClearMeters` fields for machines that were reset.
- **Collection Time Default**: Pre-populated to 1 minute before the `gameDayOffset` boundary (e.g. 7:59 AM for an 8 AM offset). Read from the location's `gameDayOffset` field returned by the locations API.
- **SAS Start Time Default**: Pre-populated from the **last completed collection** for that machine via `GET /api/collection-reports/last-collection-time?machineId=<id>`. This represents the end of the previous gaming period and is used as the start of the SAS window for the current collection.
- **Draft Updates**: Edits saved via `PATCH /api/collection-reports?id=[id]`.

### STEP 3: Financial Reconciliation & Commit

- **UI**: Shows `Amount to Collect` (electronic) vs. `Amount Collected` (physical cash in bag).
- **Variance**: Auto-calculated. A mandatory note is required if variance exceeds the licencee's threshold.
- **Variation Check**: Before committing, runs a variation check comparing current values against historical averages. Flagged machines show a `VariationCheckPopover` with details, and a `VariationsConfirmationDialog` requires acknowledgment.
- **Commit**: Finalizes the batch, links draft `Collection` records to a parent `CollectionReport`, updates the `GamingLocation` bank balance. Triggers `POST /api/collection-reports`.

---

## 4.5. Chronological UI Validation

To prevent users from breaking chronological timelines, both New and Edit Collection Modals check if the selected collection date falls between two existing reports for any selected machine. If it detects a middle-date insertion, it disables submission and displays a warning banner to the user, enforcing sequential collection report submissions.

---

## 5. Edit Collection Report

- **Desktop**: `CollectionReportEditCollectionModal` → `DesktopEditLayout`
- **Mobile**: `CollectionReportMobileEditCollectionModal` → `MobileEditLayout`
- **Meter Reversion**: On save, recalculates and reverts affected meter history entries.
- **Machine List Display**: Edit modal defaults to showing the machines list (not the collected list) so users can see all machines with green "Added to Collection" indicators.
- **SAS Time Pre-fill**: Opening an existing entry pre-fills `sasStartTime` from `entry.sasMeters.sasStartTime`.
- **SAS Manual Time Updates**: When an operator adjusts the SAS start or end times manually in the edit form, the client submits them to the PATCH collections API. The backend processes this as an explicit custom window override, forcing a full recalculation of the SAS metrics (drop, gross, cancelled credits) for that custom range.
- **Delete**: Soft-deletes the report and reverts meter readings via `DELETE /api/collection-reports/[reportId]`.

---

## 6. Variation Checking

- **Hook**: `useCollectionReportVariationCheck`
- **Logic**: Compares submitted meter values against historical averages. Values outside threshold flagged.
- **Components**: `VariationCheckPopover` (inline flag detail), `VariationsConfirmationDialog` (acknowledgment gate before submission).
- **Scope**: Applied on both new collection creation and edit saves.

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

For no-SMIB locations the submit route creates **two** `Meters` docs (RAM clear + post-reset, `isRamClear: true` on the first) instead of one — see [`Documentation/api/collection-reports-v2-movement.md`](../api/collection-reports-v2-movement.md) for the calculation engine and field mappings.

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

- **Collectors**: Collectors Schedule view and 3-Step Wizard only.
- **Managers**: Full access including Monthly Revenue Report and Manager Schedule.
- **Location Admins**: Restricted to assigned properties only.
- **Admins / Developers**: Can access the variance fix tool (`POST /api/collection-reports/[reportId]/fix`) and bulk repair endpoints.

---

**Internal Document** — Engineering Team
