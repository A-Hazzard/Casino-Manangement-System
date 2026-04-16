# Collection Report Page Implementation (`/collection-report`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Page Overview

Multi-step financial wizard for reconciling electronic machine meters with physical cash collection. The page provides management views for historical reports, monthly summaries, and collector scheduling. Fully responsive with dedicated mobile and desktop layouts.

---

## 2. Data & API Architecture (By Section)

### 📋 Reports History Tab
The primary audit log for all finalized financial collections.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Location** | `location` | `GET /api/collectionReport` |
| **Collector** | `collector` | `GET /api/collectionReport` |
| **Amount Collected** | `amountCollected` | `GET /api/collectionReport` |
| **Variance** | `variance` | `GET /api/collectionReport` |
| **Status** | `isFinalized` | `GET /api/collectionReport` |

- **Filters**: Licencee, Location, Collector, Date Range.
- **Pagination**: Server-side with batch loading. Skeleton loader shown on every fetch trigger (not just initial load).
- **Implementation**: `CollectionReportDesktopLayout` + `CollectionReportMobileLayout`.

### 📅 Monthly Revenue Report
Aggregated financial performance for owner-level reconciliation and tax preparation.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Totals** | `summary.totalGross`, `summary.totalDrop` | `GET /api/collectionReport?startDate=&endDate=` |
| **Daily Breakdown** | `details[].date`, `details[].gross` | `GET /api/collectionReport?startDate=&endDate=` |
| **Variance Total** | `summary.totalVariance` | `GET /api/collectionReport?startDate=&endDate=` |

- **Export**: PDF and Excel download for external accounting handover.
- **Implementation**: `CollectionReportMonthlyDesktop` / `CollectionReportMonthlyMobile`.

### 🗂️ Manager Schedule View
High-level planning tool for overseeing the property collection cycle.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Name** | `locationName` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Last Collection** | `lastCollectionDate` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Machine Count** | `machineCount` | `GET /api/collectionReport?locationsWithMachines=true` |

- **Visuals**: Rows highlighted red if a property is overdue (>7 days since last collection).
- **Implementation**: `CollectionReportManagerDesktop` / `CollectionReportManagerMobile`.

### 👷 Collectors Schedule View
The operational task list for field staff performing the counts.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Assigned Location** | `locationName` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Machine List** | `machines[].machineId` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Pending Items** | `incompleteCount` | `GET /api/collections?incompleteOnly=true` |

- **Mobile**: Switches to card-based task checklist for one-handed operation.
- **Implementation**: `CollectionReportCollectorDesktop` / `CollectionReportCollectorMobile`.

---

## 3. The 3-Step Collection Wizard

Triggered via **"Create Collection Report"**. Both a desktop modal (`CollectionReportNewCollectionModal`) and a mobile modal (`CollectionReportMobileNewCollectionModal`) exist with feature parity.

### STEP 1: Property & Asset Selection

- **Location Dropdown**: Uses `LocationSingleSelect` component — rendered via a **React portal** (`createPortal` to `document.body`) to escape `overflow: hidden` clipping inside the modal. The dropdown width auto-sizes to the longest location name using a hidden DOM measurement element. Supports 248+ locations without display issues.
- **Machine List**: Fetched from `GET /api/collectionReport?locationsWithMachines=true`. Includes the location's `gameDayOffset` field to compute correct default collection times.
- **Sync**: Clicking a machine's "Sync" icon fetches live SAS meters from hardware in real time.
- **Draft Creation**: Machine entries staged via `POST /api/collections` (creates `isCompleted: false` draft record).

### STEP 2: Meter & Cash Verification

- **UI**: Enter physical `Meter In` / `Meter Out` readings for each machine.
- **Recalculation**: Auto-calculates `Movement Gross = (Current In - Prev In) - (Current Out - Prev Out)`.
- **RAM Clear Toggle**: Reveals `ramClearMeters` fields for machines that were reset.
- **Collection Time Default**: Pre-populated to 1 minute before the `gameDayOffset` boundary (e.g. 7:59 AM for an 8 AM offset). Read from the location's `gameDayOffset` field returned by the locations API.
- **SAS Start Time Default**: Pre-populated from the **last completed collection** for that machine via `GET /api/collections/last-collection-time?machineId=<id>`. This represents the end of the previous gaming period and is used as the start of the SAS window for the current collection.
- **Draft Updates**: Edits saved via `PATCH /api/collections?id=[id]`.

### STEP 3: Financial Reconciliation & Commit

- **UI**: Shows `Amount to Collect` (electronic) vs. `Amount Collected` (physical cash in bag).
- **Variance**: Auto-calculated. A mandatory note is required if variance exceeds the licencee's threshold.
- **Variation Check**: Before committing, runs a variation check comparing current values against historical averages. Flagged machines show a `VariationCheckPopover` with details, and a `VariationsConfirmationDialog` requires acknowledgment.
- **Commit**: Finalizes the batch, links draft `Collection` records to a parent `CollectionReport`, updates the `GamingLocation` bank balance. Triggers `POST /api/collectionReport`.

---

## 4. Edit Collection Report

- **Desktop**: `CollectionReportEditCollectionModal` → `DesktopEditLayout`
- **Mobile**: `CollectionReportMobileEditCollectionModal` → `MobileEditLayout`
- **Meter Reversion**: On save, recalculates and reverts affected meter history entries.
- **Machine List Display**: Edit modal defaults to showing the machines list (not the collected list) so users can see all machines with green "Added to Collection" indicators.
- **SAS Time Pre-fill**: Opening an existing entry pre-fills `sasStartTime` from `entry.sasMeters.sasStartTime`.
- **Delete**: Soft-deletes the report and reverts meter readings via `DELETE /api/collection-report/[reportId]`.

---

## 5. Variation Checking

- **Hook**: `useCollectionReportVariationCheck`
- **Logic**: Compares submitted meter values against historical averages. Values outside threshold flagged.
- **Components**: `VariationCheckPopover` (inline flag detail), `VariationsConfirmationDialog` (acknowledgment gate before submission).
- **Scope**: Applied on both new collection creation and edit saves.

---

## 6. UI Indicators & Validation

- ⚡ **Sync Desync**: Shown if last electronic heartbeat was >2 hours ago.
- 📉 **Negative Gross**: Highlighted red if meter delta indicates a net payout.
- 🕒 **History Bridge**: Displayed if there is a meter gap between current and last finalized reading.
- ⚠️ **High Variance**: Banner shown if submitted variance exceeds licencee's tolerance.
- ✅ **Added to Collection**: Green highlight + label on machines already added in current session.

---

## 7. Form Persistence & Mobile Resilience

- **State Persistence**: Wizard state synchronized to Zustand store (`collectionModalStore`) for cross-component access.
- **Mobile Architecture**: Uses a navigation stack (`pushNavigation` / `popNavigation`) to move between machine list → form → collected list views without full re-renders.
- **Offline Detection**: Header shows "No Connection" banner if network drops during wizard.

---

## 8. Skeleton Loader Behaviour

- Skeleton displays on **every fetch trigger** (not just initial load) — including tab switches and filter changes.
- `setInitialLoading(true)` is called in the fetch-trigger effect in `useCollectionReportPageData.ts` to ensure the skeleton always replaces "No Data Available" during loading.

---

## 9. Role-Based Access Control (RBAC)

- **Collectors**: Collectors Schedule view and 3-Step Wizard only.
- **Managers**: Full access including Monthly Revenue Report and Manager Schedule.
- **Location Admins**: Restricted to assigned properties only.
- **Admins / Developers**: Can access the variance fix tool (`POST /api/collection-report/[reportId]/fix`) and bulk repair endpoints.

---

**Internal Document** — Engineering Team
