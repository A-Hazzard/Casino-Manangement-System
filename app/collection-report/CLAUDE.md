# Collection Report — Push Forward Meters

This context explains how meter state is advanced ("pushed forward") through collections in the collection report system.

## Three-Document Architecture

The system tracks meter state across three document types:

| Document | Location | Purpose |
|---|---|---|
| **Collections** | `app/api/lib/models/collections.ts` | Per-machine meter readings during a collection event |
| **Machine** | `app/api/lib/models/machines.ts` | Source of truth for current machine state (`collectionMeters`, `collectionMetersHistory[]`) |
| **Meters** | `app/api/lib/models/meters.ts` | Individual meter reading records with movement deltas |

## Key Field Definitions

- **`metersIn` / `metersOut`** (Collections doc): The absolute meter reading entered by the collector — NOT a delta.
- **`prevIn` / `prevOut`** (Collections doc): The previous meter reading used as baseline for this collection's movement calculation.
- **`machine.collectionMeters`**: The latest absolute meter reading for the machine. Updated when a report is finalized.
- **`machine.collectionMetersHistory`**: Array of all historical meter states, keyed by `locationReportId`.

## Movement Calculation

```
movement.metersIn  = metersIn  - prevIn
movement.metersOut = metersOut - prevOut
movement.gross     = movement.metersIn - movement.metersOut
```

For RAM clear collections, the formula splits across the RAM clear boundary (see `lib/utils/movement/calculation.ts`).

## The Two Main Flows

### 1. CREATION Flow (Report Submission)

When a user submits a collection report (`POST /api/collection-reports`):

```
createCollectionReport()                          reportCreation.ts:1098
  ├─ updateCollectionsWithReportId()              reportCreation.ts:132
  │    → Sets locationReportId + isCompleted: true on all collection docs
  │
  ├─ updateMachineCollectionData()                reportCreation.ts:219
  │    → Finds previous completed collection for baseline prevIn/prevOut
  │    → Creates history entry: { metersIn, metersOut, prevMetersIn, prevMetersOut, locationReportId }
  │    → ADVANCES machine.collectionMeters to latest metersIn/metersOut
  │    → $pushes history entry onto machine.collectionMetersHistory
  │
  └─ createManualMetersForEachMachine()          reportCreation.ts:478
       → Creates Meters documents with movement deltas
```

**prevIn/prevOut resolution priority** (reportCreation.ts:290-312):
1. `metersIn`/`metersOut` from the most recent *completed* collection for this machine
2. `machine.collectionMeters.metersIn/Out` (fallback)
3. `0` (first-ever collection)

### 2. EDIT Flow (Collection Patch)

When a user edits a collection (`PATCH /api/collection-reports/collections/[id]`):

```
collections/[id]/route.ts PATCH handler
  ├─ Recalculate movement with calculateMovement()
  ├─ updateRegularAndRamClearMeters()             reportCreation.ts:761
  │    → Upserts Meters documents with corrected movement deltas
  │
  ├─ propagateMetersToNextReport()                reportCreation.ts:1364
  │    → Finds chronologically NEXT collection for same machine
  │    → Updates next collection's prevIn/prevOut to this collection's metersIn/metersOut
  │    → Recalculates next collection's movement
  │    → Recreates next collection's Meters documents
  │
  └─ recalculateMachineCollections()              recalculation.ts:58
       → Rebuilds full machine.collectionMetersHistory from ALL completed collections
       → Updates machine.collectionMeters to latest
```

**One-hop propagation**: `propagateMetersToNextReport()` only updates the immediate next collection. If that collection is later in the chain, its own propagation was already handled when it was created/edited. Editing Collection A cascades to B; editing B cascades to C — but editing A does NOT directly touch C.

## The `isEditing` Flag

The `isEditing` flag lives on the **CollectionReport** document (NOT individual Collections):

- **`isEditing: true`** (State 2): Report is "Checked Out." Collections can be modified. Machine histories are NOT synced. **Unsafe for financial reporting.**
- **`isEditing: false`** (State 3): Report is "Finalized." Machine histories synchronized. Record is auditable.

## `locationReportId` and `isCompleted`

These two fields on Collections docs gate meter state transitions:

- **`locationReportId`**: Links a collection to its parent CollectionReport. Set during finalization (`updateCollectionsWithReportId`). Empty string (`''`) until then.
- **`isCompleted`**: `false` when first added, `true` when report is submitted. Only `isCompleted: true` collections contribute to `machine.collectionMeters` and appear in `machine.collectionMetersHistory`.

## Chain Example

```
Collection A (10:00)                    Collection B (11:00)
  metersIn  = 5,000,000                  metersIn  = 9,646,000
  metersOut = 2,500,000                  metersOut = 4,823,000
  prevIn  = 0 (first collection)         prevIn  = 5,000,000 (from A)
  prevOut = 0                            prevOut = 2,500,000 (from A)
  movement.drop = 5,000,000              movement.drop = 4,646,000

After A finalized: machine.collectionMeters = { 5M, 2.5M }
After B finalized: machine.collectionMeters = { 9.646M, 4.823M }
```

If A is edited to `metersIn = 6,000,000`:
- `propagateMetersToNextReport()` sets B's `prevIn = 6,000,000`
- B's `movement.drop` recalculates to `3,646,000`
- B's Meters documents are recreated

## Key Files Reference

| File | Key Functions |
|---|---|
| `app/api/lib/helpers/collectionReport/reportCreation.ts` | `updateMachineCollectionData` (L219), `updateRegularAndRamClearMeters` (L761), `createCollectionReport` (L1098), `propagateMetersToNextReport` (L1364) |
| `app/api/lib/helpers/collectionReport/recalculation.ts` | `recalculateMachineCollections` (L58) |
| `app/api/lib/helpers/collectionReport/historyUpdate.ts` | `updateReportMachineHistories` (L53) |
| `app/api/lib/helpers/collectionReport/operations.ts` | `revertMachineCollectionMeters` (L245), `deleteManualMetersPerCollection` (L427) |
| `app/api/lib/helpers/collectionReportV2/recalculation.ts` | `cascadeMachineEdit` (L39), `propagateV2MetersToNextSession` (L300) |
| `app/api/collection-reports/collections/[id]/route.ts` | PATCH handler — edit flow entry point |
| `app/api/collection-reports/route.ts` | POST handler — creation/finalization entry point |
| `lib/hooks/collectionReport/useNewCollectionModal.ts` | `executeAddEntry` (L1028) — client-side prevIn/prevOut resolution |
| `lib/utils/movement/calculation.ts` | `calculateMovement` — shared movement formula |

## Critical Invariants

1. **Movement Delta Method**: Sum movement fields from meters; never use cumulative approach for periodic analysis.
2. **prevIn/prevOut Priority**: Previous completed collection's `metersIn/Out` > `machine.collectionMeters` > `0`.
3. **Creation vs Edit**: `updateMachineCollectionData` (creation) advances machine meter state. Editing a collection MUST NOT call `updateMachineCollectionData` — only `recalculateMachineCollections`.
4. **Idempotency**: `updateMachineCollectionData` checks for existing history entry with same `locationReportId` before pushing.
5. **Meters docs are derived**: Meters documents are always recalculated/created from Collections data, never the other way around.
