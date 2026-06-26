# Collection Report — Total Variation Mismatch: Root Causes & Fix

## The Problem

The **Total Variation** column on the collection report list page (`/collection-report`) showed different values from the **Total Variation** on each report's detail page (`/collection-report/report/[id]`). Some reports showed large negative numbers on the list (e.g. −605,084, −148,500) while the detail page showed 0.

---

## What "Total Variation" Means

For each collection report, every slot machine has two independent gross figures:

- **Machine Gross** — how much money the machine physically took in, calculated from its meter readings and adjusted for the machine's denomination.
- **SAS Gross** — how much the SAS (Slot Accounting System) software recorded the machine earning over the same period, sourced from a separate Meters database.

**Variation = Machine Gross − SAS Gross**

When variation is 0, both systems agree. When it is non-zero, something diverged — a machine fault, a time window issue, etc. Some licencees also subtract **jackpots** from SAS Gross before comparing (the `includeJackpot` flag), because jackpots are paid out separately and should not count against the SAS figure.

---

## Bug 1 — Wrong `includeJackpot` flag

**What happened:** The `includeJackpot` flag tells the system whether to subtract jackpots from SAS Gross before computing variation. This flag lives on the **Licencee** record. At some point a copy of it was also stored on each CollectionReport document — but older reports were created before this was in place, so their stored value defaulted to `false`.

The list page was reading `includeJackpot` from the CollectionReport document (always `false` for old reports). The detail page correctly fetched it live from the Licencee.

**Result:** The list page never subtracted jackpots for older reports, making variation appear too negative.

**Fix:** The list page now does a database join (`$lookup`) to the Licencee on every query, getting the live `includeJackpot` value — same as the detail page.

---

## Bug 2 — Jackpot coming from the wrong place

**What happened:** Jackpot values can be stored in two places:

1. `Meters.movement.jackpot` — the live meter reading field (often 0 or missing for many machines)
2. `Collections.sasMeters.jackpot` — a snapshot stored at the time the collection was recorded (reliable)

The list page was only looking at `movement.jackpot` (often 0), so it subtracted nothing. The detail page tries `movement.jackpot` first and falls back to the stored snapshot — getting the correct value.

**Fix:** The list page now runs its Meters query grouped **per machine** (instead of all at once), and for each machine applies the same fallback: use `movement.jackpot` if non-zero, otherwise use the stored `sasMeters.jackpot` snapshot. This exactly mirrors the detail page logic.

---

## Bug 3 — Meters queries running for all reports at once (performance)

**What happened:** The list page was fetching all collection reports from the database, then running one Meters database query per report — for every single report in history (potentially hundreds). This ran all those queries simultaneously, causing the API to time out.

**Fix:** Pagination is now applied inside the database query before the Meters queries run. Only the reports on the current page get Meters queries, not the entire history.

---

## Bug 4 — Offline SMIB phantom variation (-$91) after editing

**Date fixed:** June 16, 2026

### Context: Offline SMIB Machines & Supplemental Meters

For slot machines that are **offline** at collection time (have a `relayId` but `lastActivity` is stale >3 minutes), the collector enters meter readings manually. The system creates a **supplemental meter** document:

```typescript
{
  meterSource: 'COLLECTION_REPORT',
  isSupplemental: true,
  machine: machineId,
  drop: metersIn,                    // absolute collector-entered value
  totalCancelledCredits: metersOut,
  movement: {
    drop: metersIn - prevMetersIn,   // delta
    totalCancelledCredits: metersOut - prevMetersOut,
  }
}
```

The `Collection` document stores `meterId` pointing to this supplemental meter. **`col.meterId` being set is the authoritative signal that a machine used a supplemental meter.**

### What Went Wrong

**Scenario:** Machine was offline at report creation. Later came back online. User opens the edit modal and clicks Submit (without saving individual machine edits).

**Root cause — three layers:**

1. **`computeTotalVariation` did not check `col.meterId`:** It read `col.sasMeters.gross` directly. For the offline machine, this was stale ($136 from original creation). It had no signal to use `movement.gross` instead.

2. **`check-variations` permanently excludes supplemental meters:** It always filters `meterSource: { $ne: 'COLLECTION_REPORT' }`. The supplemental meter is **never visible** via the live query. For any machine with a supplemental meter, `storedSasGross` MUST be passed to bypass this query.

3. **No individual collection PATCH fired:** When the user clicks Submit without clicking "Save Machine" on a specific entry, no PATCH to the individual collection runs. So `sasMeters.gross` on the collection document stays stale.

**The exact failure sequence:**

```
User opens edit modal (machine now online, col.meterId set from offline creation)
User clicks Submit without saving individual machine edits

pre-create-meters updates supplemental meter        OK
check-variations receives storedSasGross=45         shows $0 (correct in modal)
User clicks Submit in the popover

updateCollectionReport -> computeTotalVariation
  reads col.sasMeters.gross = 136 (stale, no PATCH ran)
  col.meterId was NOT projected -- no signal supplemental meter exists
  Variation = $45 - $136 = -$91 stored              WRONG
```

### The Fixes

#### Fix 1 — `computeTotalVariation` (PRIMARY FIX)

**File:** `app/api/lib/helpers/collectionReport/calculations.ts`

```typescript
// Added meterId to projection
const collections = await Collections.find(
  { locationReportId },
  { movement: 1, sasMeters: 1, machineId: 1, meterId: 1 }
).lean<Pick<CollectionDocument, 'movement' | 'sasMeters' | 'machineId' | 'meterId'>[]>();

// In the reduce:
const hasSupplementalMeter = !!col.meterId;
const isLegacyZeroSas = storedSasGross === 0 && (col.sasMeters?.drop ?? 0) === 0;
const effectiveSasGross =
  hasSupplementalMeter || isLegacyZeroSas
    ? meterGross   // collector values are truth -- variation = 0
    : storedSasGross;
```

**Reasoning:** If `col.meterId` is set, the machine used a supplemental meter (was offline at collection time). The collector's values ARE the SAS data. Variation must be $0. The `sasMeters.gross` DB value may be stale; `meterId` presence is the authoritative signal to ignore it.

#### Fix 2 — Frontend freshMovementGross

**File:** `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx`

```typescript
const hasSupplementalMeter = !!entry.meterId;
const useStoredSasGross = hasSupplementalMeter || currentlyOffline;

// Compute from CURRENT form inputs -- not stale entry.movement.gross
const freshMovementGross = hasSupplementalMeter
  ? (entry.metersIn || 0) - (entry.prevIn || 0)
    - ((entry.metersOut || 0) - (entry.prevOut || 0))
  : movementGross;

storedSasGross: useStoredSasGross ? (freshMovementGross ?? 0) : undefined,
```

#### Fix 3 — PATCH STEP 5.1 sasMeters.gross override

**File:** `app/api/collection-reports/collections/route.ts`

```typescript
// Fires for currently-offline machines OR machines with an existing supplemental meter
const isOfflinePatch =
  (hasRelay && (!patchMachineDoc.lastActivity || lastActivityMs >= OFFLINE_THRESHOLD_MS)) ||
  !!originalCollection.meterId;   // also fires when meterId is set

if (isOfflinePatch) {
  sm.gross = Number((newDrop - newCancelled).toFixed(2)); // collector truth
}
```

#### Fix 4 — pre-create-meters idempotency (was already correct)

The endpoint already had correct logic: if `collectionId` is provided and the collection has `meterId` set, it UPDATES the existing supplemental meter via bulkWrite upsert. Online machines with an existing supplemental meter are NOT skipped — only online machines with no supplemental meter are skipped.

### Key Invariants (Enforced After Fixes)

| Collection type | col.meterId | computeTotalVariation uses | Variation |
|---|---|---|---|
| Online SMIB (relay live) | not set | sasMeters.gross from DB | actual SAS vs meter delta |
| Offline SMIB (relay stale) | set | movement.gross (collector truth) | always $0 |
| Was offline, now online | set | movement.gross (meterId rule) | always $0 |
| No-SMIB (no relayId) | not set | skipped (no SMIB) | $0 |
| Legacy offline pre-fix (gross=0 and drop=0) | not set | movement.gross (heuristic) | $0 |

### Critical Rule

`check-variations` ALWAYS filters `meterSource: { $ne: 'COLLECTION_REPORT' }` from its live Meters query. **Supplemental meters are never visible via the live query.** For any machine where `entry.meterId` is set, `storedSasGross` MUST be passed to `check-variations`.

---

## Summary Table

| Bug | Root Cause | Effect | Fix |
|---|---|---|---|
| Wrong includeJackpot | Old reports stored false by default | Jackpot not subtracted, variation too negative | Fetch flag live from Licencee via $lookup |
| Jackpot from wrong field | movement.jackpot is 0 for many machines | Same as above | Per-machine query with fallback to stored snapshot |
| API timeout | Meters queries ran for all reports not just current page | List page failed to load | Apply $skip/$limit before Meters queries |
| Offline SMIB -$91 phantom | computeTotalVariation read stale sasMeters.gross, did not check meterId | Phantom negative variation stored after editing | Project meterId; if set, use movement.gross as effectiveSasGross |

---

## Files Changed

| File | Change |
|---|---|
| `app/api/lib/helpers/collectionReport/service.ts` | Bugs 1-3: list page backend (all three fixes) |
| `app/api/collection-reports/route.ts` | Bug 3: route handler (pass page/limit into service) |
| `app/api/lib/helpers/collectionReport/calculations.ts` | Bug 4: project meterId; if set, effectiveSasGross = meterGross |
| `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx` | Bug 4: freshMovementGross from inputs; useStoredSasGross = hasSupplementalMeter or currentlyOffline |
| `app/api/collection-reports/collections/route.ts` | Bug 4: PATCH STEP 5.1 fires when originalCollection.meterId is set |
| `app/api/collection-reports/pre-create-meters/route.ts` | Bug 4: logging for ONLINE+EXISTING_METER path (logic was already correct) |
| `app/api/collection-reports/check-variations/route.ts` | Bug 4: verbose debug logs for tracing variation decisions |
