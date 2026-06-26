# Collection-Report Feature: Complete Study

_Generated: 2026-05-08_

---

## What It Is

The collection-report feature is the core financial reconciliation workflow for casino machine collections. It bridges the gap between physical cash collected by collectors in the field and the electronic meter readings from gaming machines. The entire system exists to answer one question: **did the collector bring back the right amount of money?**

---

## Data Architecture

### Two-Level Structure

There are two distinct document types that work together:

**`Collection`** — one per machine, per collection run

- Stores raw meter readings (`metersIn`, `metersOut`, `prevIn`, `prevOut`)
- Calculated `movement.gross` (the actual revenue from that machine)
- SAS meter data from the SMIB relay
- States: `isCompleted: false` (draft) or `isCompleted: true` (finalized)
- Links to its parent via `locationReportId` (empty string while draft)

**`CollectionReport`** — one per location, per collection run

- Aggregates all machine collections into one financial summary
- Stores `totalGross`, `totalDrop`, `totalSasGross`
- Financial fields: `amountToCollect`, `amountCollected`, `previousBalance`, `currentBalance`, `partnerProfit`, `taxes`, `advance`, `variance`
- The `isEditing` flag marks whether machine histories are synced

### The `isEditing` States (Critical)

| State       | `isEditing` | Meaning                                                                                   |
| ----------- | ----------- | ----------------------------------------------------------------------------------------- |
| Checked Out | `true`      | Collections being modified, machine histories NOT synced. Unsafe for financial reporting. |
| Finalized   | `false`     | Machine histories synchronized. Auditable.                                                |

---

## Page Structure

### Routes

- `/collection-report` — Main page (protected, requires "collection-report" permission)
- `/collection-report/report/[reportId]` — Detail view for a specific report
- `/collection-reports` — Redirect to `/collection-report` (typo handler)

### Four Main Tabs

1. **Reports History** — Audit log with filters (location, date range, licencee) and pagination
2. **Monthly Revenue Report** — Aggregated financial performance for tax prep
3. **Manager Schedule View** — Collection cycle planning for managers
4. **Collectors Schedule View** — Task list for field staff

### 3-Step Collection Wizard

1. **Property & Asset Selection** — Location dropdown, machine list sync
2. **Meter & Cash Verification** — Manual meter entry, auto-calculations
3. **Financial Reconciliation & Commit** — Variance check, SAS variation check, final submit

---

## API Routes

### Collection Reports

| Method | Route                                               | Purpose                                                                     |
| ------ | --------------------------------------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/collection-reports`                           | List reports with filters/pagination; sub-query for `locationsWithMachines` |
| POST   | `/api/collection-reports`                           | Create new report (also creates collections)                                |
| GET    | `/api/collection-reports/[reportId]`                | Fetch single report (by `locationReportId` or `_id`)                        |
| PATCH  | `/api/collection-reports/[reportId]`                | Update report fields                                                        |
| DELETE | `/api/collection-reports/[reportId]`                | Delete report + revert all machine meters                                   |
| PATCH  | `/api/collection-reports/[reportId]/update-history` | Batch-update machine histories (admin/dev only)                             |

### Collections (Individual Machine Entries)

| Method | Route                                                        | Purpose                                             |
| ------ | ------------------------------------------------------------ | --------------------------------------------------- |
| GET    | `/api/collection-reports/collections`                        | List collections with filters                       |
| POST   | `/api/collection-reports/collections`                        | Create draft collection                             |
| PATCH  | `/api/collection-reports/collections`                        | Update collection by query `?id=`                   |
| DELETE | `/api/collection-reports/collections`                        | Delete collection by query `?id=`                   |
| PATCH  | `/api/collection-reports/collections/[id]`                   | Update collection (handles SAS dot-notation fields) |
| GET    | `/api/collection-reports/collections/by-report/[reportId]`   | All collections for a report (dev diagnostic)       |
| GET    | `/api/collection-reports/collections/check-first-collection` | Is this machine's first ever collection?            |
| GET    | `/api/collection-reports/collections/last-collection-time`   | Get last collection time for SAS pre-fill           |
| DELETE | `/api/collection-reports/collections/delete-by-report`       | Delete all collections + revert meters (admin only) |

### Support

| Method | Route                                      | Purpose                                      |
| ------ | ------------------------------------------ | -------------------------------------------- |
| POST   | `/api/collection-reports/check-variations` | Compare meter gross vs SAS gross per machine |
| GET    | `/api/collection-reports/locations`        | Accessible locations for current user        |

---

## Financial Formula

```
gross             = sum of movement.gross across all machines
amountToCollect   = gross - variance - advance - partnerProfit
                    + locationPreviousBalance + balanceCorrection

previousBalance   = amountCollected - amountToCollect  (carry-forward to next report)
partnerProfit     = location-specific profit split (percentage of gross)
taxes             = manual input, deducted from partnerProfit only (not gross)
advance           = manual input, reduces profit-share base AND amountToCollect
variance          = manual input (for discrepancies), same effect as advance
```

**Reviewer scale**: All currency values are multiplied by `1 - multiplier` for users with the `reviewer` role.

---

## `prevIn` / `prevOut` Priority

These are the starting meter values for calculating movement:

1. **Primary**: `metersIn/Out` from the machine's actual previous completed collection
2. **Fallback**: `machine.collectionMeters` values

The backend always calculates these — **frontend must never send them**.

---

## SAS Variation Check

Before committing a report, the system calls `/api/collection-reports/check-variations`:

- Compares `movement.gross` (meter-based) against `sasGross` (SAS-based) per machine
- Machines without a SMIB relay (`relayId`) contribute no variation
- `includeJackpot` flag fetched live from the Licencee document (not stored on old reports — historical bug)
- Jackpot fallback: if `movement.jackpot` is 0, use stored `sasMeters.jackpot`
- `VariationsConfirmationDialog` gates submission until variations are acknowledged

---

## Delete / Revert Logic

Deleting a collection report is a full rollback:

1. Fetch all associated collections
2. Revert each machine's `collectionMeters` to `prevIn`/`prevOut`
3. Remove each machine's `collectionMetersHistory` entry for this report
4. Delete manual meters per collection
5. Delete all collections
6. Delete the report

**This is irreversible. No soft-delete.**

---

## RAM Clear Handling

When a machine was reset during the collection period:

- If `ramClearMetersIn/Out` provided: `movement = (ramClear - prev) + (current - 0)`
- If only `ramClear: true` flag: `movement = current meters only`

---

## Access Control

| Role              | Access                                              |
| ----------------- | --------------------------------------------------- |
| Developer / Admin | Full access, including admin-only delete routes     |
| Manager           | All locations under assigned licencees              |
| Location Admin    | Only assigned locations within assigned licencees   |
| Collector         | Only assigned locations; creates drafts and submits |
| Reviewer          | Read-only with scaled financial values              |

---

## Critical Data Integrity Rules

### ALWAYS

- Let the backend calculate `prevIn`, `prevOut`, `movement`, `sasMeters`
- Include NEW machines in batch updates during edit modal flow
- Sync both `locationReportId` and `isCompleted` together
- Set `isCompleted: true` when processing collections in edit modal
- Check if history exists before updating (use `$push` if doesn't exist, `$set` with `arrayFilters` if exists)
- Remove collection history when deleting a collection
- Await all async operations before closing modals

### NEVER

- Send `prevIn`/`prevOut` from the frontend to `POST /api/collections`
- Create collection history at collection-creation time (only at finalization or edit)
- Assume "no previous collection" means `prevIn/prevOut = 0` (machine.collectionMeters fallback is valid)
- Use `findById()` — always use `findOne({ _id: id })`
- Skip updating `originalCollections` when deleting entries in the edit modal
- Reference `response.data._id` — the correct path is `response.data.data._id`

---

## Known Historical Bugs (Fixed)

1. **Wrong `includeJackpot` flag**: Old reports defaulted to `false`. Fixed by fetching live from `Licencee` via `$lookup`.
2. **Jackpot from wrong field**: `movement.jackpot` was 0 for many machines. Fixed by per-machine query with fallback to `sasMeters.jackpot`.
3. **API timeout on variation check**: Meters queries ran for ALL reports at once. Fixed by applying pagination before running Meters queries.

---

## Key Source Files

| Purpose                | File                                                   |
| ---------------------- | ------------------------------------------------------ |
| Main page              | `app/collection-report/page.tsx`                       |
| Report detail page     | `app/collection-report/report/[reportId]/page.tsx`     |
| CollectionReport model | `app/api/lib/models/collectionReport.ts`               |
| Main API (GET/POST)    | `app/api/collection-reports/route.ts`                  |
| Report CRUD            | `app/api/collection-reports/[reportId]/route.ts`       |
| Collections API        | `app/api/collection-reports/collections/route.ts`      |
| Collection by ID       | `app/api/collection-reports/collections/[id]/route.ts` |
| Variation check        | `app/api/collection-reports/check-variations/route.ts` |
| Financial formulas doc | `Documentation/collection-reports/overview/collection-report-finances.md` |
| Page design doc        | `Documentation/collection-reports/frontend/collection-report-page.md`     |
| Critical guidelines    | `.instructions/collection-reports-guidelines.md`                          |
| Variation bug fixes    | `Documentation/collection-reports/reference/collection-report-variation-fix.md` |
