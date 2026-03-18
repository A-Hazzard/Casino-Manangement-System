# Collection Report Page Implementation (`/collection-report`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.2.0

---

## 1. Page Overview

Multi-step financial wizard for reconciling electronic machine meters with physical cash collection. The page also provides management views for historical reports, monthly summaries, and collector scheduling.

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

- **Filters**: Responsive to `Licencee`, `Location`, `Collector`, and `Date Range`.
- **Implementation**: `CollectionReportDesktopLayout` component powered by the `collectionReport` API with server-side pagination.

### 📅 Monthly Revenue Report
Aggregated financial performance for owner-level reconciliation and tax preparation.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Totals** | `summary.totalGross`, `summary.totalDrop` | `GET /api/collectionReport?startDate=&endDate=` |
| **Daily Breakdown** | `details[].date`, `details[].gross` | `GET /api/collectionReport?startDate=&endDate=` |
| **Variance Total** | `summary.totalVariance` | `GET /api/collectionReport?startDate=&endDate=` |

- **Export**: Provides "Download PDF/Excel" for external accounting handover.
- **Implementation**: `CollectionReportMonthlyDesktop` using the `getMonthlyCollectionReportSummary` helper.

### 🗂️ Manager Schedule View
High-level planning tool for overseeing the property collection cycle.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Name** | `locationName` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Last Collection** | `lastCollectionDate` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Machine Count** | `machineCount` | `GET /api/collectionReport?locationsWithMachines=true` |

- **Visuals**: Rows are highlighted in Red if a property is "Overdue" (>7 days since last count).
- **Implementation**: `CollectionReportManagerDesktop`.

### 👷 Collectors Schedule View
The operational task list for field staff performing the counts.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Assigned Location** | `locationName` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Machine List** | `machines[].machineId` | `GET /api/collectionReport?locationsWithMachines=true` |
| **Pending Items** | `incompleteCount` | `GET /api/collections?incompleteOnly=true` |

- **Mobile Optimized**: The view switches to a "Task Checklist" card on mobile for one-handed operation.
- **Implementation**: `CollectionReportCollectorDesktop`.

---

## 3. The 3-Step Collection Wizard

Triggered via the **"Create Collection Report"** button. Each step must be completed before proceeding to the next.

### STEP 1: Property & Asset Selection
- **UI**: Select a Location from a dropdown, then check all machines to include in this batch.
- **Data**: Machine list is fetched from `GET /api/collectionReport?locationsWithMachines=true`.
- **Sync**: Clicking a machine's "Sync" icon fetches live SAS meters from the hardware in real time.
- **API**: Machine entries are staged via `POST /api/collections` (creates an `isCompleted: false` Draft record).

### STEP 2: Meter & Cash Verification
- **UI**: Enter the current physical `Meter In` and `Meter Out` readings from each machine cabinet.
- **Recalculation**: Upon entry, the system auto-calculates `Movement Gross = (Current In - Prev In) - (Current Out - Prev Out)`.
- **RAM Clear Toggle**: For machines that had a reset, enabling the toggle reveals the `ramClearMeters` fields to bridge the reading gap.
- **API**: Edits to a draft are saved via `PATCH /api/collections?id=[id]`.

### STEP 3: Financial Reconciliation & Commit
- **UI**: Shows `Amount to Collect` (electronic) vs. `Amount Collected` (physical cash in bag).
- **Variance**: Auto-calculated. A note is mandatory if the variance exceeds the Licencee's defined threshold.
- **Commit**: Finalizes the batch, links all draft `Collection` records to a parent `CollectionReport`, and updates the `GamingLocation` bank balance. Triggers `POST /api/collectionReport`.

---

## 4. UI Indicators & Validation

- ⚡ **Sync Desync**: Appears if the last electronic heartbeat was >2 hours ago, suggesting physical inspection is required before counting.
- 📉 **Negative Gross**: Highlighted in red if the meter delta indicates the machine paid out more than it collected.
- 🕒 **History Bridge**: Displays if there is a gap between the current reading and the last finalized report for that machine.
- ⚠️ **High Variance**: A banner is shown if the submitted variance exceeds the Licencee's configured tolerance limit.

---

## 5. Form Persistence & Mobile Resilience

- **Save Progress**: The wizard state is synchronized to `localStorage` every 10 seconds, enabling full recovery from browser crashes or accidental navigation.
- **One-Tap Entry**: Large numeric keypads are shown for meter data entry on handheld devices.
- **Offline Detection**: The header shows a "No Connection" banner if the network drops during the wizard, preventing partial submits.

---

## 6. Role-Based Access Control (RBAC)

- **Collectors**: Can access the "Collectors Schedule" view and the 3-Step Wizard only.
- **Managers**: Full access to all tabs including "Monthly Revenue Report" and "Manager Schedule".
- **Location Admins**: Restricted to viewing history and schedules for their assigned properties only.
- **Admins / Developers**: Can access the variance fix tool (`POST /api/collection-report/[reportId]/fix`) to correct errors in finalized reports.

---
**Internal Document** - Engineering Team
