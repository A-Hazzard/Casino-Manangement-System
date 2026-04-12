# Evolution1 CMS — Gemini Context Summary

> Generated for handoff. Covers current work-in-progress on the **Collection Report** feature.
> Production DB is live — no test writes, no seeding.

---

## Project at a Glance

**Evolution1 CMS** is a casino management system (Next.js 16 App Router, TypeScript, MongoDB/Mongoose, Zustand, React Query). Two modes: `CMS` (dashboards, analytics, collection reports) and `VAULT` (cashier shifts, float requests).

Key rules:
- `pnpm` only
- No `import React from 'react'` — import named exports directly
- `type` over `interface`, no `any`
- Cookie security: always `getAuthCookieOptions(request)` — never hardcode `secure: true`
- Gaming day = 8 AM–8 AM Trinidad time (UTC-4)
- All financial calcs use **movement delta method** (`movement.gross` field on collection documents)

---

## Collection Report System — What It Is

Collection reports track slot machine meter readings (coins in/out) across casino locations. A report groups multiple machine "collection entries" for one location on one gaming day.

### Key DB Documents

**Collection entry** (one per machine per report):
```json
{
  "machineId": "...",
  "locationReportId": "uuid-of-the-report",
  "metersIn": 7443802,       // current meter reading
  "metersOut": 6375732,
  "prevIn": 6175402,         // previous collection meter reading
  "prevOut": 5395281,
  "movement": {              // PRE-CALCULATED delta — always use this
    "metersIn": 1268400,
    "metersOut": 980451,
    "gross": 287949
  },
  "sasMeters": {             // SAS protocol snapshot (may be stale/zero)
    "gross": 0,              // DO NOT use for variation — use live DB query
    "sasStartTime": "...",
    "sasEndTime": "..."
  },
  "ramClear": false,         // boolean flag — was meter physically reset?
  "ramClearMetersIn": null,  // meter value just before reset (if ramClear=true)
  "ramClearMetersOut": null
}
```

---

## Variation System — How It Works

**Variation** = difference between what the machine meters say and what the SAS (casino slot accounting system) protocol recorded independently.

- `meterGross` = `movement.gross` from the collection document (pre-calculated at save time)
- `sasGross` = live query against the `Meters` collection using the `sasStartTime/sasEndTime` window → `drop - cancelledCredits`
- `variation` = `meterGross - adjustedSasGross`
- `'No SAS Data'` if no SAS time window OR no Meters records found in DB

### Two Places That Calculate Variation

| Location | File | meterGross source | SAS Data gate |
|---|---|---|---|
| Report detail page | `app/api/lib/helpers/accountingDetails.ts` | `collection.movement.gross` | `sasStartTime && sasEndTime` present + `meterDataMap.has(machineId)` |
| Pre-submit check (modal) | `app/api/collection-report/check-variations/route.ts` | `movementGross` if provided, else `(metersIn-prevIn)-(metersOut-prevOut)` | `sasStartTime && sasEndTime` present + `meterDataMap.has(machineId)` |

**Important**: `sasMeters.gross` in the collection document is a stale snapshot and is **NOT used** for variation calculation. Both systems query the live `Meters` collection.

---

## Current Work — What Was Changed

### Bug 1: `ramClear` flag never saved in new collection modal (FIXED)

**File:** `lib/hooks/collectionReport/useNewCollectionModal.ts`
**Problem:** `executeAddEntry` built the entry data object without `ramClear: currentRamClear`, so the boolean was always lost on new entries.
**Fix:** Added `ramClear: currentRamClear` and aligned the conditional spread to also clear `ramClearMetersIn/Out` to `undefined` when false, matching `executeUpdateEntry`.

### Bug 2: Edit modal didn't auto-show variation badges on open (FIXED)

**File:** `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx`
**Problem:** Variation check only ran when the user clicked "Update Report". Opening the modal showed no badges even though entries were already loaded.
**Fix:** Added `useEffect` + `useRef` gate (`autoCheckedRef`) that silently calls `checkVariations` once when `show=true`, `collectedMachineEntries.length > 0`, and `selectedLocationId` is set. Resets on modal close so it fires again next open.

### Bug 3: Variation badge showing on zero-variation machines (FIXED)

**Files:**
- `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx`
- `components/CMS/collectionReport/modals/CollectionReportNewCollectionModal.tsx`

**Problem:** `variationMachineIds` filter was `typeof m.variation === 'number'` — included machines with `variation === 0`, giving them the amber warning badge incorrectly.
**Fix:** Changed filter to `typeof m.variation === 'number' && m.variation !== 0`. Also fixed `machineCount` in `VariationsConfirmationDialog` to count only non-zero. This now matches the report detail page which only highlights non-zero variations.

### Bug 4: `accountingDetails.ts` wrong "No SAS Data" gate (FIXED)

**File:** `app/api/lib/helpers/accountingDetails.ts`
**Problem:** Checked `sasMeters.gross === undefined/null` to decide "No SAS Data". But `sasMeters.gross = 0` is a valid stored value (stale snapshot) — using it as the gate could produce wrong results if `sasMeters` has a gross value but no time window, or no Meters records exist.
**Fix:** Now checks `!sasMeters.sasStartTime || !sasMeters.sasEndTime` OR `!meterDataMap.has(machineId)` — identical to the `check-variations` API logic.

### Bug 5: RAM clear machines produce wrong variation in modal (FIXED)

**Files:**
- `lib/hooks/collectionReport/useCollectionReportVariationCheck.ts` — added `movementGross?: number` to `CheckVariationsMachine`
- `app/api/collection-report/check-variations/route.ts` — uses `movementGross` when provided instead of recalculating from raw meters
- `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx` — passes `entry.movement?.gross` as `movementGross`

**Problem:** For RAM clear entries, raw recalculation `(metersIn - prevIn)` is wrong because the physical meter was reset. The `movement.gross` in the DB was correctly calculated at save time.
**Fix:** Edit modal now sends `movementGross: entry.movement?.gross` to the API. The API uses it when present, falls back to raw recalculation for new (unsaved) entries in the create modal.

### Feature: Edit Report button on report detail page (ADDED)

**File:** `components/CMS/collectionReport/details/CollectionReportDetailsPageContent.tsx`
**What:** Added "Edit Report" button (pencil icon) in top-right of desktop header. Visible only to `developer` and `admin` roles (NOT `location admin`). Clicking it fetches locations from `/api/collectionReport?locationsWithMachines=true`, then opens `CollectionReportEditCollectionModal` with `reportData.reportId`.

---

## Relevant File Paths

```
components/CMS/collectionReport/
  modals/
    CollectionReportEditCollectionModal.tsx   ← edit modal (main entry point)
    CollectionReportNewCollectionModal.tsx    ← create modal
  forms/
    CollectionReportEditCollectedMachines.tsx ← right panel machine list + badges
    CollectionReportNewCollectionCollectedMachines.tsx
  variations/
    VariationCheckPopover.tsx                 ← floating popover shown during check
    VariationsCollapsibleSection.tsx          ← summary shown when popover minimized
    VariationsConfirmationDialog.tsx          ← confirmation before saving with variations
  details/
    CollectionReportDetailsPageContent.tsx    ← report detail page ← EDIT BUTTON HERE

lib/hooks/collectionReport/
  useNewCollectionModal.ts                    ← state/logic for create modal
  useEditCollectionModal.ts                   ← state/logic for edit modal
  useCollectionReportVariationCheck.ts        ← shared variation check hook + types
  useMobileEditCollectionModal.ts             ← mobile-specific edit hook

app/api/
  collection-report/
    check-variations/route.ts                 ← POST: pre-submit variation check API
    [reportId]/route.ts                       ← GET: report detail data
  lib/helpers/
    accountingDetails.ts                      ← getCollectionReportById() — variation calc for report page
```

---

## Key Types

```typescript
// CheckVariationsMachine (sent to check-variations API)
interface CheckVariationsMachine {
  machineId: string;
  machineName?: string;
  metersIn: number;
  metersOut: number;
  sasStartTime?: string;
  sasEndTime?: string;
  prevMetersIn?: number;
  prevMetersOut?: number;
  movementGross?: number;  // use movement.gross from saved entry for accuracy
}
```

---

## What Still Needs Testing (Browser)

1. **Edit modal** — open an existing report → variation badges should auto-appear on machines with non-zero variation (no badge on zero-variation machines)
2. **Edit modal RAM clear** — edit an existing entry, check RAM clear, enter `ramClearMetersIn/Out`, save → `ramClear: true` persists to DB
3. **Create modal RAM clear** — add a new machine entry with RAM clear checked → `ramClear: true` in the created collection document
4. **Create modal variation** — enter meters that differ from SAS → amber badge on that machine in right panel; zero-variation machines get NO badge
5. **Report detail page** — "Edit Report" button visible for admin/developer, not for location admin; clicking it opens the edit modal

---

## Environment

- Dev server: `pnpm run dev` → `localhost:3000`
- Production DB connected (no test writes)
- `NEXT_PUBLIC_APPLICATION=CMS`
- Cookie: `COOKIE_SECURE=false` for LAN/HTTP dev
