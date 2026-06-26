# Collection Report System — AI Context

**Audience**: AI coding assistants working on Evolution One CMS collection reports.
**Last Updated**: June 25, 2026
**Revisions**: WOW_SYNC fix (June 2026), variation orange-highlight fix (June 2026), offline SMIB $91 phantom fix (June 2026)

---

## 1. System Overview

A collection report is a **financial reconciliation** between:

- **Machine Gross** — what the machine meters say the machine took in
- **SAS Gross** — what the Slot Accounting System recorded over the same time window
- **Variation** = Machine Gross − SAS Gross (for SMIB/WOW machines)

The page serves three tabs: **Collection Reports** (V1 finalized reports), **Collection Reports V2** (developer-only session capture), and **Monthly Report** (manager-level aggregation).

---

## 2. Page Architecture

### `/collection-report` Page

```
CollectionReportPageContent.tsx
├── CollectionReportNavigation.tsx    (tab bar)
├── CollectionReportDesktopLayout.tsx  (V1 list — desktop)
├── CollectionReportMobileLayout.tsx   (V1 list — mobile)
├── CollectionReportV2Desktop.tsx      (V2 sessions — desktop)
├── CollectionReportV2Mobile.tsx       (V2 sessions — mobile)
├── CollectionReportMonthlyDesktop.tsx (monthly — desktop)
└── CollectionReportMonthlyMobile.tsx  (monthly — mobile)
```

Tab state in URL: `?section=collection|collection-v2|monthly`.

### `/collection-report/report/[reportId]` Detail Page

```
CollectionReportDetailsPageContent.tsx
├── Header: Back, Share, Refresh, Export, Edit Report
├── Tabs: Machine Metrics | Location Metrics | SAS Metrics Compare
├── Machine Metrics: CollectionReportDetailsCollectionsTable
├── Location Metrics: CollectionReportDetailsLocationMetricsTab
└── SAS Compare: CollectionReportDetailsSasCompareTab
```

Data loaded by `useCollectionReportDetailsData`:
- `GET /api/collection-reports/[reportId]` — heavy call (meters aggregation)
- `GET /api/collection-reports/collections?locationReportId=<id>` — raw collections

Up to 3 retries with exponential backoff, 60s per-attempt timeout, determinate `RetryLoadingBar`.

---

## 3. Creation Flow (New Collection)

```
User clicks "Create Collection Report"
  → CollectionReportNewCollectionModal (desktop)
     or CollectionReportMobileNewCollectionModal (mobile)
```

### Step 1: Select Location & Machines

- Location dropdown via `LocationSingleSelect` (portal to body to avoid overflow clipping)
- Machines fetched from `GET /api/collection-reports?locationsWithMachines=true`
- Each machine added → immediately POSTed to `POST /api/collection-reports/collections`:
  - Backend calculates `prevIn`/`prevOut`, `sasMeters`, `movement`
  - Collection stored with `isCompleted: false`, `locationReportId: ''` (draft)
  - Frontend NEVER sends `prevIn`/`prevOut`
- WOW Auto Report button (developer only, purple): bulk-adds WOW machines via `GET /api/collection-reports/collections/wow-meters`

### Step 2: Enter Meter Readings

- `Meter In` / `Meter Out` for each machine
- RAM Clear toggle → reveals `ramClearMetersIn` / `ramClearMetersOut`
- `Movement Gross = (Current In - Prev In) - (Current Out - Prev Out)`
- Collection time default: 1 minute before gameDayOffset (e.g., 7:59 AM for 8 AM offset)
- SAS Start Time default: from `GET /api/collection-reports/collections/last-collection-time?machineId=<id>`
- Editing staged entry: `PATCH /api/collection-reports/collections?id=<collectionId>`
- Removing staged entry: `DELETE /api/collection-reports/collections?id=<collectionId>`

### Step 3: Financials & Commit

- Amount to Collect vs Amount Collected
- Variance (mandatory note if exceeds licencee threshold)
- Variation check: `POST /api/collection-reports/check-variations` SSE stream
- Commit: `POST /api/collection-reports` → creates report, links collections, advances machine meters, creates Meters docs
- Chronological guard: `filterMachinesByChronologicalOrder` blocks middle-date insertions
- First-report propagation: `propagateMetersToNextReport` rewrites next report's `prevIn`/`prevOut`

### SAS Start Time / End Time Calculation

`getSasTimePeriod(machineId, customStart?, customEnd?)`:
- If customStart and customEnd provided → use them
- Otherwise, find previous collection's timestamp for startTime, use collection timestamp for endTime
- Lower bound is EXCLUSIVE (`$gt`), upper bound INCLUSIVE (`$lte`)

---

## 4. Edit Flow

```
User opens report detail → clicks "Edit Report"
  → CollectionReportEditCollectionModal (desktop or mobile)
```

### Endpoints Used

| Step | Endpoint | Purpose |
|------|----------|---------|
| Load entries | `GET /api/collection-reports/collections?locationReportId=<id>` | Get existing collections |
| Edit machine | `PATCH /api/collection-reports/collections?id=<collectionId>` | Update meters, recalculate |
| Report financials | `PATCH /api/collection-reports/[reportId]` | Edit report-level fields |
| Pre-create meters | `POST /api/collection-reports/pre-create-meters` | Create/update Meters docs |
| Finalize edit | `PATCH /api/collection-reports/[reportId]/update-history` | Sync histories |
| Delete report | `DELETE /api/collection-reports/[reportId]` | Soft-delete + revert |

### Critical Rules

- **Creation vs edit invariant**: Editing a collection MUST NOT advance `machine.collectionMeters` — only updates `collectionMetersHistory` via the update-history endpoint. Creation advances meters via `updateMachineCollectionData`.
- **isCompleted**: Every collection in a finalized report must have `isCompleted: true`. Update-history sets this.
- **originalCollections tracking**: The edit modal keeps `collectedMachineEntries` (current state) and `originalCollections` (baseline for change detection). Both must be kept in sync, especially on delete.
- **PATCH STEP 5.1** (collections route): For offline SMIB machines or machines with supplemental meters, overrides `sasMeters.gross` with the collector-entered movement delta to prevent phantom variation.

---

## 5. Variation Checking

### Shared Pipeline

Single source of truth: `app/api/lib/helpers/collectionReport/variation.ts`

Two functions used by BOTH the detail page and the pre-submit checker:

1. **`aggregateMeterDataForWindows(queries)`** — MongoDB aggregation per machine over SAS time window
2. **`computeMachineVariation(entry, meterSums, flags)`** — pure function returning `{ meterGross, sasGross, variation, hasNoSasData, hasSmib }`

### SSE Pre-Submit Check

- **Endpoint**: `POST /api/collection-reports/check-variations`
- **Hook**: `useVariationStreamCheck` — `cancel()` preserves result, `reset()` nukes it
- **Flow**: Opened when user clicks "Create Report" / "Update Report" → SSE streams results → orange highlighting on flagged rows → confirmation dialog → proceed

### Orange Highlighting

When `variationMachineIds` (Set) contains a machine ID, the collected-machine list renders the row with:
```css
border-amber-400 bg-amber-50 shadow-amber-100 ring-1 ring-amber-400
```
Applied in: `CollectionReportNewCollectionCollectedMachines.tsx`, `CollectionReportEditCollectedMachines.tsx`, `CollectionReportMobileCollectedListPanel.tsx`

The highlight persists after closing the variation panel because `onCancel` calls `cancel()` not `reset()`.

### Variation = 0 Rules for Non-SMIB and Offline Machines

| Machine state | Has relay? | Variation |
|---|---|---|
| Online SMIB (relay live) | Yes | Actual difference between machine gross and SAS gross |
| Offline SMIB (supplemental meter) | Yes (stale) | Always $0 — collector-entered values are truth |
| Was offline, now online | Yes (returned) | Always $0 — `meterId` rule overrides |
| No-SMIB (no relayId) | No | Not computed (null) |
| WOW-synced machine | No (isWow=true) | Computed like SMIB — WOW sync provides meter data |

---

## 6. Meter Sources

### SAS_READ (Live Relay Polling)

- `meterSource: 'SAS_READ'`
- `movement.drop` = per-reading delta (populated)
- Top-level `drop` = per-reading absolute value (mirrors movement)
- SAS Gross = sum of `movement.*` across the window

### WOW_SYNC (WOW Sync System)

- `meterSource: 'WOW_SYNC'`
- `movement.drop` = 0 (always — WOW sync does not compute deltas)
- Top-level `drop` = cumulative absolute value at reading time
- SAS Gross = `(last.drop - first.drop)` from the window's records
- **Detection**: `$cond: [{ $eq: ['$meterSource', 'WOW_SYNC'] }, 1, 0]` in aggregation; `.some(m => m.meterSource === 'WOW_SYNC')` in JS
- **Fix (June 2026)**: Both `aggregateMeterDataForWindows` and `calculateSasMetrics` were updated with the first/last delta fallback. Before fix, WOW machines showed $0 SAS gross → phantom variation.

### COLLECTION_REPORT (Manual / Supplemental)

- `meterSource: 'COLLECTION_REPORT'`
- Created during collection report creation/editing
- For offline SMIB machines: `isSupplemental: true`, created and stored at `col.meterId`
- The variation pipeline always filters these out: `meterSource: { $ne: 'COLLECTION_REPORT' }`
- Supplemental meters bypass the live query — variation uses `storedSasGross` passed from the frontend

### Supplemental Meter Creation (Offline SMIB)

A machine is **offline** at collection time when:
- `relayId` exists AND `lastActivity` is stale (>3 minutes threshold)
- The collector enters readings manually

The system creates a meter document with:
```typescript
{
  meterSource: 'COLLECTION_REPORT',
  isSupplemental: true,
  machine: machineId,
  drop: metersIn,                       // absolute collector-entered value
  totalCancelledCredits: metersOut,
  movement: {
    drop: metersIn - prevMetersIn,      // delta
    totalCancelledCredits: metersOut - prevMetersOut,
  }
}
```

The Collection document stores `meterId` pointing to this supplemental meter. **`col.meterId` being set is the authoritative signal that a machine used supplemental meter**. When present, `computeTotalVariation` treats `effectiveSasGross = meterGross` (variation = $0).

---

## 7. Movement Calculation

### Standard Movement

```
drop = metersIn - prevIn
totalCancelledCredits = metersOut - prevOut
gross = drop - totalCancelledCredits
```

### RAM Clear Movement

When `ramClear: true`:
```
drop = (ramClearMetersIn - prevIn) + (metersIn - 0)
totalCancelledCredits = (ramClearMetersOut - prevOut) + (metersOut - 0)
```

Two Meters documents created:
1. RAM clear meter (`isRamClear: true`, `readAt: base`)
2. Post-reset meter (`isRamClear: false`, `readAt: base + 1s`)

### Manual Meter Movement (createManualMetersForEachMachine)

In `reportCreation.ts`, for non-SMIB / offline SMIB:
```
movementIn = ramClear
  ? (ramClearMetersIn - previousMetersIn)  // RAM clear: use post-clear - prev
  : (currentMetersIn - previousMetersIn);  // Normal: current - prev (but stored as just currentMetersIn in practice)
```

---

## 8. Online/Offline SMIB Detection

```typescript
const hasRelay = !!machine.relayId;
const isOnline = hasRelay && machine.lastActivity &&
  (Date.now() - machine.lastActivity.getTime() < OFFLINE_THRESHOLD_MS); // 3 min
const isOffline = hasRelay && !isOnline;
```

- **Online SMIB**: relay handles `sasMeters` — do NOT mutate during collection report operations
- **Offline SMIB**: collector enters values → supplemental meter created → `machine.sasMeters.drop` and `machine.sasMeters.totalCancelledCredits` updated with collector values
- **No SMIB**: no `relayId`, no `smibBoard`, location flagged `noSMIBLocation: true`

---

## 9. Export

**File**: `lib/utils/export/collectionReportExport.ts`

Wired to the detail page header as a DropdownMenu (CSV / JSON).

- `exportCollectionReportToCsv(report, machines)` — CSV with `=== SECTION ===` headers
- `exportCollectionReportToJson(report, machines)` — structured JSON
- Both handle the full machine metrics array with sectioned formatting

---

## 10. isEditing Flag System

The `isEditing` flag on `CollectionReport` tracks whether a report has unsaved edits:

```
isEditing: false → Report is finalized, safe for financial reporting
isEditing: true  → Report has incomplete edits, machine histories not synced
```

- Set to `true` when any machine entry is edited in the modal
- Set to `false` only when "Update Report" is clicked (finalization)
- If browser crashes mid-edit, report stays `isEditing: true`
- Recovery: detail page detects `isEditing: true` → redirects to `/collection-report?resume=<reportId>` → modal auto-opens
- Background safety net: page queries `GET /api/collection-reports?isEditing=true&limit=1` on mount
- Auto-resume guard prevents double-opening

---

## 11. RBAC & Reviewer Scale

### Page Access

| Role | Collection Reports | Monthly Report | V2 Tab | Edit Report |
|------|-------------------|----------------|--------|-------------|
| Developer/Admin/Owner | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ❌ | ❌ |
| Location Admin | ✅ | ❌ | ❌ | ❌ |
| Collector | ✅ | ❌ | ❌ | ❌ |
| Reviewer | ✅ | ❌ | ❌ | ❌ |

### Reviewer Scale

Applied to all financial values before display in API responses:

```typescript
import { getReviewerScale } from '@/app/api/lib/utils/reviewerScale';
const scale = getReviewerScale(userPayload);
// scale = multiplier ? 1 - multiplier : 1
```

Applied after currency conversion. The detail page scales per-machine metrics via `scaleMachineValues(values, scale)` (both meterGross and sasGross are scaled independently so variation remains $0 when it should).

---

## 12. Key Files

### Backend

| File | Purpose |
|------|---------|
| `app/api/lib/helpers/collectionReport/variation.ts` | `aggregateMeterDataForWindows`, `computeMachineVariation` — shared variation pipeline |
| `app/api/lib/helpers/collectionReport/creation.ts` | `calculateSasMetrics`, `getSasTimePeriod`, `createCollectionReport` — creation flow |
| `app/api/lib/helpers/collectionReport/reportCreation.ts` | `createManualMetersForEachMachine`, `updateRegularAndRamClearMeters`, `updateMachineCollectionData` |
| `app/api/lib/helpers/collectionReport/calculations.ts` | `computeTotalVariation`, `calculateMovement` — financial computations |
| `app/api/lib/helpers/collectionReport/collectionOperations.ts` | CRUD for collections (POST, PATCH via `recalculateSasMetricsForPatch`) |
| `app/api/lib/helpers/collectionReport/collectionByIdOperations.ts` | Collection-by-ID operations with SAS recalc |
| `app/api/lib/helpers/accountingDetails.ts` | `getCollectionReportById` — detail page data assembly |
| `app/api/lib/helpers/collectionReport/service.ts` | `getAllCollectionReportsWithMachineCounts` — list page with variation |
| `app/api/collection-reports/route.ts` | GET (list) + POST (create) |
| `app/api/collection-reports/collections/route.ts` | CRUD for individual collection entries |
| `app/api/collection-reports/collections/[id]/route.ts` | Path-param variant of PATCH |
| `app/api/collection-reports/check-variations/route.ts` | SSE variation check endpoint |
| `app/api/collection-reports/pre-create-meters/route.ts` | Pre-create/update Meters docs before finalization |
| `app/api/collection-reports/[reportId]/update-history/route.ts` | Resync histories after edits |

### Frontend

| File | Purpose |
|------|---------|
| `lib/hooks/collectionReport/useNewCollectionModal.ts` | Desktop creation modal hook (2522 lines — largest hook) |
| `lib/hooks/collectionReport/useEditCollectionModal.ts` | Desktop edit modal hook |
| `lib/hooks/collectionReport/useMobileCollectionModal.ts` | Mobile creation modal hook |
| `lib/hooks/collectionReport/useMobileEditCollectionModal.ts` | Mobile edit modal hook |
| `lib/hooks/collectionReport/useVariationStreamCheck.ts` | SSE stream hook (cancel vs reset) |
| `lib/hooks/collectionReport/useCollectionReportDetailsData.ts` | Detail page data with retry |
| `lib/hooks/collectionReport/useCollectionReportPageData.ts` | List page data with filters |
| `lib/utils/export/collectionReportExport.ts` | CSV/JSON export |
| `components/CMS/collectionReport/modals/CollectionReportNewCollectionModal.tsx` | Desktop creation modal |
| `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx` | Desktop/mobile edit modal |
| `components/CMS/collectionReport/variations/VariationCheckPanel.tsx` | Variation check modal panel |
| `components/CMS/collectionReport/variations/VariationCheckPopover.tsx` | Inline variation detail popover |
| `components/CMS/collectionReport/variations/VariationsConfirmationDialog.tsx` | Variation acknowledgment |
| `components/CMS/collectionReport/details/CollectionReportDetailsPageContent.tsx` | Detail page (export button, edit button) |
| `components/CMS/collectionReport/forms/CollectionReportNewCollectionCollectedMachines.tsx` | Collected list with orange highlighting |
| `components/CMS/collectionReport/forms/CollectionReportEditCollectedMachines.tsx` | Edit list with orange highlighting |
| `components/CMS/collectionReport/mobile/CollectionReportMobileCollectedListPanel.tsx` | Mobile collected list with orange highlighting |

### Stores

| Store | Purpose |
|-------|---------|
| `lib/store/collectionModalStore.ts` | Wizard state across components |
| `lib/store/dashboardStore.ts` | `selectedLicencee`, `timePeriod` (persisted to localStorage) |
| `lib/store/userStore.ts` | User state with roles and assignedLocations |

---

## 13. Common Bugs Checklist

### ❌ Never Do

- Send `prevIn`/`prevOut` from frontend to POST collections — backend calculates these
- Close modal before awaiting all async operations
- Use `response.data._id` instead of `response.data.data._id`
- Create collection history when creating a collection (only at finalization)
- Forget to update `originalCollections` when deleting a machine in edit modal
- Forget to set `isCompleted: true` when processing collections in edit modal
- Assume "no previous collection" means `prevIn`/`prevOut` should be 0 (falls back to `machine.collectionMeters`)

### ✅ Always Do

- Let backend calculate `prevIn`, `prevOut`, `movement`, and `sasMeters`
- Include NEW machines in batch update (check `if (!original)` for change detection)
- Update both `collectedMachineEntries` AND `originalCollections` on delete
- Check if history entry exists before updating (use `$push` if new, `$set` with `arrayFilters` if exists)
- Remove collection history when deleting collection (`$pull` with `locationReportId`)
- Validate collection exists before processing in batch update
- Check `col.meterId` for supplemental meter detection in variation computation

### 🎯 Variation-Specific

- check-variations ALWAYS filters `meterSource: { $ne: 'COLLECTION_REPORT' }` — supplemental meters invisible via live query; pass `storedSasGross` for machines with `meterId`
- WOW_SYNC records have `movement.drop = 0` — use first/last cumulative delta
- `computeTotalVariation` projects `meterId` → if set, `effectiveSasGross = meterGross` (variation = $0)
- `onCancel` in VariationCheckPanel must call `cancel()` not `reset()` — reset nukes `variationMachineIds`, breaking orange highlighting
