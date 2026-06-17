# Manual Meters Flow - Collection Report to Database

## Overview

This document explains the flow for manual meter creation and editing in the CMS system, from the frontend collection report modal through backend API to the `Meters` collection in MongoDB.

---

## 1. Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  CollectionReportEditCollectionModal.tsx                              │
│  ├── DesktopEditWrapper/useEditCollectionModal                     │
│  │   └── handleUpdateReport() → calls updateCollection()         │
│  │       → PATCH /api/collection-reports/{reportId}     │
│  │       → calls updateRegularAndRamClearMeters()     │
│  └── MobileEditWrapper/useMobileEditCollectionModal            │
│      └── addMachineToList()                     │
│          → POST/PATCH /api/collection-reports/collections    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                              API Request
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST /api/collection-reports                                    │
│  └── createCollectionReport()                              │
│      └── createManualMetersForEachMachine()               │
│          1. Creates meter documents                   │
│          2. Stores meterId/ramClearMeterId on collection│
│                                                              │
│  PATCH /api/collection-reports/collections/[id]              │
│  └── updateRegularAndRamClearMeters()                    │
│      1. Fetches collection with meter IDs             │
│      2. Updates Meters collection by _id            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                              MongoDB
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DATABASES                                │
├─────────────────────────────────────────────────────────────────────────���───┤
│  collections collection                                         │
│  ├── _id: string                                           │
│  ├── meterId: string (→ Meters._id)                         │
│  ├── ramClearMeterId: string (→ Meters._id for RAM clear)   │
│  ├── metersIn: number                                        │
│  ├── metersOut: number                                     │
│  ├── ramClearMetersIn: number (post-RAM-clear readings)  │
│  ├── ramClearMetersOut: number                            │
│  ├── prevIn: number                                       │
│  ├── prevOut: number                                      │
│  └── ramClear: boolean                                    │
│                                                              │
│  meters collection                                          │
│  ├── _id: string                                         │
│  ├── machine: string                                       │
│  ├── location: string                                     │
│  ├── isRamClear: boolean                                  │
│  ├── drop: number                                       │
│  ├── totalCancelledCredits: number                       │
│  └── movement: { drop, totalCancelledCredits, ... }  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Meter Creation Flow (Report Creation)

### 2.1 Frontend → API Payload

When creating a report, the `machines` array includes:

```typescript
// From useEditCollectionModal.ts (lines ~1506-1565)
interface MachinePayload {
  machineId: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  ramClear: boolean;
  ramClearMetersIn?: number; // Post-RAM-clear meter in
  ramClearMetersOut?: number; // Post-RAM-clear meter out
  collectionId: string;
  timestamp: Date;
  locationReportId: string;
}
```

### 2.2 API - `createManualMetersForEachMachine()`

**File:** `app/api/lib/helpers/collectionReport/reportCreation.ts`

```typescript
// Lines 552-696 (key sections)

// 1. Loop through each machine
for (const machine of machines) {
  const currentMetersIn = machine.metersIn;
  const currentMetersOut = machine.metersOut;
  const previousMetersIn = machine.prevMetersIn || 0;
  const previousMetersOut = machine.prevMetersOut || 0;
  const ramClearMetersIn = machine.ramClearMetersIn || 0;
  const ramClearMetersOut = machine.ramClearMetersOut || 0;

  // 2. Calculate deltas based on ramClear flag
  const movementIn = machine.ramClear
    ? ramClearMetersIn - previousMetersIn // RAM clear: use post-clear - prev
    : currentMetersIn; // Normal: use current

  const movementOut = machine.ramClear
    ? ramClearMetersOut - previousMetersOut
    : currentMetersOut;

  // 3. If ramClear is true, create TWO meter documents:
  //    a. RAM clear meter (isRamClear: true)
  //    b. Current meter
  //    Otherwise create ONE meter document

  if (machine.ramClear) {
    const ramClearMeter = {
      _id: ramClearMeterId,
      machine: machine.machineId,
      location: machine.locationId,
      movement: { drop: movementIn, totalCancelledCredits: movementOut },
      drop: ramClearMetersIn,
      totalCancelledCredits: ramClearMetersOut,
      isSasCreated: false,
      isRamClear: true, // ← KEY FLAG
      readAt: baseReadAt,
      createdAt: baseCreatedAt,
    };
    metersToCreate.push(ramClearMeter);
  }

  const currentMeter = {
    _id: currentMeterId,
    machine: machine.machineId,
    location: machine.locationId,
    movement: { drop: movementIn, totalCancelledCredits: movementOut },
    drop: currentMetersIn,
    totalCancelledCredits: currentMetersOut,
    isSasCreated: false,
    isRamClear: false,
    readAt: currentMeterReadAt,
    createdAt: currentMeterCreatedAt,
  };
  metersToCreate.push(currentMeter);

  // 4. Store meter IDs on collection document
  const meterCount = machine.ramClear ? 2 : 1;
  const thisMachineMeters = metersToCreate.slice(-meterCount);
  await appendMeterIdsToCollections(collectionId, thisMachineMeters);
}

// 5. Bulk insert all meters to database
const createdMeters = await Meters.insertMany(metersToCreate);
```

### 2.3 Meter Document Structure

```json
{
  "_id": "69f2101be78c417daf1a0ba5",
  "machine": "69ef3d320f1c8a10eaa712ab",
  "location": "69e91c1acd0ad09b41e0fb3c",
  "movement": {
    "drop": 1100,
    "totalCancelledCredits": 200,
    "coinIn": 0,
    "coinOut": 0,
    "jackpot": 0,
    "totalHandPaidCancelledCredits": 0,
    "gamesPlayed": 0,
    "gamesWon": 0,
    "currentCredits": 0,
    "totalWonCredits": 0
  },
  "drop": 4101,
  "totalCancelledCredits": 401,
  "isSasCreated": false,
  "isRamClear": true,
  "readAt": "2026-04-29T12:00:00.000Z",
  "createdAt": "2026-04-29T12:00:00.000Z"
}
```

### 2.4 Storing IDs on Collection

**Function:** `appendMeterIdsToCollections()`

```typescript
// Lines 505-543
async function appendMeterIdsToCollections(collectionId, meters) {
  // If ramClear (2 meters), store both IDs
  if (meters.length == 2) {
    await Collections.updateOne(
      { _id: collectionId },
      {
        $set: {
          ramClearMeterId: meters[0]._id, // RAM clear meter
          meterId: meters[1]._id, // Current meter
        },
      }
    );
  } else {
    // Normal (1 meter), store only meterId
    await Collections.updateOne(
      { _id: collectionId },
      { $set: { meterId: meters[0]._id } }
    );
  }
}
```

---

## 3. Meter Update Flow (Editing Collection)

### 3.1 Frontend → API

When user edits a collection entry and presses "Update Machine":

```typescript
// From useEditCollectionModal.ts - handleUpdateReport() triggers:
const changes = machines.map(machine => ({
  machineId: machine.machineId,
  metersIn: machine.metersIn,
  metersOut: machine.metersOut,
  prevMetersIn: machine.prevIn,
  prevOut: machine.prevOut,
  ramClear: machine.ramClear,
  ramClearMetersIn: machine.ramClearMetersIn,
  ramClearMetersOut: machine.ramClearMetersOut,
  collectionId: machine._id,
  timestamp: machine.timestamp,
}));
// PATCH /api/collection-reports/{reportId}/update-history
```

### 3.2 API - Collection Update

**File:** `app/api/collection-reports/collections/[id]/route.ts`

```typescript
// Lines ~185-414 - PATCH handler

// 1. Update collection document with new values
const updatedCollection = await Collections.findOneAndUpdate(
  { _id: collectionId },
  { $set: { metersIn, metersOut, prevIn, prevOut, ... }}
);

// 2. Recalculate movement (if relevant fields changed)
const movement = calculateMovement(
  updatedCollection.metersIn,
  updatedCollection.metersOut,
  previousMeters,
  updatedCollection.ramClear,
  updatedCollection.ramClearMetersIn,
  updatedCollection.ramClearMetersOut
);

// 3. Update meter documents
if (finalCollection) {
  await updateRegularAndRamClearMeters(finalCollection);
}
```

### 3.3 API - `updateRegularAndRamClearMeters()`

**File:** `app/api/lib/helpers/collectionReport/reportCreation.ts`

```typescript
// Lines 191-286
export async function updateRegularAndRamClearMeters(collectionDocument) {
  // 1. Get meter IDs from collection
  const ramClearMeterId = collectionDocument.ramClearMeterId;
  const meterId = collectionDocument.meterId;

  // 2. Log for debugging
  console.log('[updateRegularAndRamClearMeters] Processing collection', {
    ramClearMeterId,
    meterId,
    metersIn: collectionDocument.metersIn,
    metersOut: collectionDocument.metersOut,
    ramClearMetersIn: collectionDocument.ramClearMetersIn,
    prevIn: collectionDocument.prevIn,
    prevOut: collectionDocument.prevOut,
  });

  // 3. Check if meters exist in database
  const ramCheck = await Meters.findOne({ _id: ramClearMeterId }).lean();
  const regCheck = await Meters.findOne({ _id: meterId }).lean();
  console.log('[updateRegularAndRamClearMeters] Meter lookup:', {
    ramExists: !!ramCheck,
    regExists: !!regCheck,
  });

  // 4. Calculate movement for RAM clear meter
  if (collectionDocument.ramClearMetersIn !== undefined) {
    const prevInVal = collectionDocument.prevIn || 0;
    const prevOutVal = collectionDocument.prevOut || 0;

    ramClearMovementData = {
      'movement.drop': collectionDocument.ramClearMetersIn - prevInVal,
      'movement.totalCancelledCredits':
        collectionDocument.ramClearMetersOut - prevOutVal,
      drop: collectionDocument.ramClearMetersIn,
      totalCancelledCredits: collectionDocument.ramClearMetersOut,
    };
  }

  // 5. Calculate movement for regular meter
  const movementData = {
    'movement.drop': collectionDocument.metersIn,
    'movement.totalCancelledCredits': collectionDocument.metersOut,
    drop: collectionDocument.metersIn,
    totalCancelledCredits: collectionDocument.metersOut,
  };

  // 6. Build bulk operations
  const operations = [];

  if (ramClearMeterId) {
    operations.push({
      updateOne: {
        filter: { _id: ramClearMeterId },
        update: { $set: ramClearMovementData },
      },
    });
  }

  if (meterId) {
    operations.push({
      updateOne: {
        filter: { _id: meterId },
        update: { $set: movementData },
      },
    });
  }

  // 7. Execute bulk write
  if (operations.length > 0) {
    const result = await Meters.bulkWrite(operations);
    console.log('[updateRegularAndRamClearMeters] BulkWrite result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  }
}
```

### 3.4 Key Query Points

The critical part is the query by `_id`:

```typescript
// _id in Meters schema is String type
const MetersSchema = new Schema({
  _id: { type: String, required: true },
  // ... other fields
});

// Query must use String _id
filter: {
  _id: collectionDocument.ramClearMeterId;
}
```

---

## 4. Error Debugging

If updates show `matchedCount: 0`:

1. **Check meter IDs exist** - Is the collection showing `meterId` and `ramClearMeterId`?
2. **Check Meters collection** - Do documents with these IDs exist?
3. **\_id type mismatch** - Ensure using String `_id`, not ObjectId

### Debug Logs to Check

```
[updateRegularAndRamClearMeters] Processing collection
[updateRegularAndRamClearMeters] Adding ... update filter
[updateRegularAndRamClearMeters] Meter lookup
[updateRegularAndRamClearMeters] BulkWrite result
```

---

## 5. Key Files Reference

| File                                                                             | Purpose                                                          |
| :------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx` | Main edit modal, Desktop/Mobile wrappers                         |
| `lib/hooks/collectionReport/useEditCollectionModal.ts`                           | Desktop edit hook, handleUpdateReport                            |
| `lib/hooks/collectionReport/useMobileEditCollectionModal.ts`                     | Mobile edit hook                                                 |
| `app/api/lib/helpers/collectionReport/reportCreation.ts`                         | createManualMetersForEachMachine, updateRegularAndRamClearMeters |
| `app/api/collection-reports/collections/[id]/route.ts`                           | Collection update API                                            |
| `app/api/lib/models/meters.ts`                                                   | Meters model                                                     |
| `app/api/lib/models/collections.ts`                                              | Collections model (meterId, ramClearMeterId fields)              |

---

## 6. Known Issues & Fixes

### Issue: Array Cleared Prematurely

**Problem:** `metersToCreate.length = 0` was inside loop, clearing array before insert.
**Fix:** Remove clear inside loop; accumulate meters then insert at end.

### Issue: Collection Meter IDs Not Matching

**Problem:** Meter IDs stored on collection don't match any Meters documents.
**Possible Cause:** Meters weren't created properly during report creation.
**Debug:** Check server logs for `createManualMetersForEachMachine` and `Meter lookup`.

---

## 7. CR V2 — RAM Clear & Meter Creation (No-SMIB + Offline SMIB Locations)

The V2 capture system follows the same RAM clear math as V1 but stores intermediate state on `ReportedMachine` and only writes `Meters` docs at session submit.

### 7.1 Capture (POST/PATCH `/api/collection-reports-v2/machines`)

`ReportedMachine` documents store the RAM clear inputs alongside the regular meters:

```typescript
{
  manualMetersIn?: number,      // Post-reset current reading
  manualMetersOut?: number,
  ramClear?: boolean,
  ramClearMetersIn?: number,    // Pre-reset peak
  ramClearMetersOut?: number,
  movement: {
    manualMetersIn:  (ramClearMetersIn  - prevSasIn)  + manualMetersIn,
    manualMetersOut: (ramClearMetersOut - prevSasOut) + manualMetersOut,
    machineGross:    manualMetersIn - manualMetersOut
  }
}
```

`computeMovement` in `app/api/lib/helpers/collectionReportV2/movement.ts` applies this formula in **all three branches** (no-SMIB, `metersMatch === true`, `metersMatch === false`). When `ramClear` is false, the formula collapses back to the simple `current - prev` delta.

### 7.2 Submit (PATCH `/api/collection-reports-v2/sessions/[sessionId]/submit`)

For **no-SMIB locations and offline SMIB machines**, the submit route creates `Meters` docs and updates `Machine.sasMeters`:

| `ramClear` | Docs created | Movement fields                                                                                                                                            |
| ---------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `false`    | 1            | `movement.drop = manualMetersIn - prevIn`, `movement.totalCancelledCredits = manualMetersOut - prevOut`                                                    |
| `true`     | 2            | RAM clear meter (`isRamClear: true`): `movement.drop = ramClearMetersIn - prevIn`. Post-reset meter: `movement.drop = manualMetersIn` (prev treated as 0). |

For **offline SMIB machines** (`!machineHasRelay || isSupplemental`), `Machine.sasMeters.drop` and `Machine.sasMeters.totalCancelledCredits` are also updated with the collector-entered values, since the live relay is unreachable.

The post-reset meter's `readAt` is offset by `+1000ms` to preserve chronological order. On re-submit, `Meters.deleteMany({ machine, locationSession })` clears the existing docs first so there are never duplicates.

For **online SMIB locations**, no `Meters` docs are created — the SAS relay handles that. RAM clear still updates `ReportedMachine.movement` identically.

### 7.3 Toggling RAM Clear in Edit Mode (PATCH machines route)

When the user re-opens a captured machine and toggles RAM clear:

- **`false → true`**: Peak fields required; `computeMovement` re-runs with the combined formula; movement on `ReportedMachine` recalculated.
- **`true → false`**: `$unset` is applied to `ramClearMetersIn` and `ramClearMetersOut`; `computeMovement` re-runs with the simple `current - prev` formula.

For sessions already in `submitted` state, `cascadeMachineEdit` propagates the new meters to `Machine.collectionMeters` and `Machine.collectionMetersHistory` as usual. The Meters docs themselves are re-created on the next submit.

---

## 8. Offline SMIB — Supplemental Meter & Variation Invariants

### 8.1 What is a Supplemental Meter?

When a machine is **offline** at collection time (has `relayId` but `lastActivity` is stale > 3 minutes), the collector enters readings manually. The system creates a supplemental `Meters` document with:

```typescript
{
  meterSource: 'COLLECTION_REPORT',
  isSupplemental: true,
  machine: machineId,
  drop: metersIn,                      // absolute collector-entered value
  totalCancelledCredits: metersOut,    // absolute collector-entered value
  movement: {
    drop: metersIn - prevMetersIn,     // delta
    totalCancelledCredits: metersOut - prevMetersOut,
  }
}
```

The Collection document stores `meterId` pointing to this supplemental meter.

### 8.2 The Supplemental Meter is Never in the Live SAS Query

`check-variations` always filters its live Meters query:
```typescript
meterSource: { $ne: 'COLLECTION_REPORT' }
```

This means supplemental meters are **permanently excluded** from the SAS gross live query. For any machine with a supplemental meter, you MUST pass `storedSasGross` to bypass the live query.

### 8.3 `computeTotalVariation` — Supplemental Meter Rule

```typescript
// If col.meterId is set → supplemental meter exists → collector values are truth
const hasSupplementalMeter = !!col.meterId;
const effectiveSasGross =
  hasSupplementalMeter || isLegacyZeroSas
    ? meterGross   // variation = 0
    : storedSasGross;
```

**Rule:** If `col.meterId` is set, the effective SAS gross equals the meter gross — variation is always $0 for offline SMIB machines. The `sasMeters.gross` stored in the collection document may be stale; `meterId` presence is the authoritative signal.

### 8.4 Edit Modal — storedSasGross Rule

When building the `machinesForCheck` payload in the edit modal submit handlers:

```typescript
const hasSupplementalMeter = !!entry.meterId;
const useStoredSasGross = hasSupplementalMeter || currentlyOffline;

// Compute from CURRENT inputs, not entry.movement.gross (which may be stale)
const freshMovementGross = hasSupplementalMeter
  ? (entry.metersIn || 0) - (entry.prevIn || 0)
    - ((entry.metersOut || 0) - (entry.prevOut || 0))
  : movementGross;

storedSasGross: useStoredSasGross ? (freshMovementGross ?? 0) : undefined,
```

### 8.5 Machine State Matrix

| Machine state | `meterId` on collection | `check-variations` | `computeTotalVariation` | Expected variation |
|---|---|---|---|---|
| Online (relay live, no prev offline) | not set | Live Meters query | `sasMeters.gross` from DB | Actual SAS vs meter delta |
| Offline (relay stale) | set | `storedSasGross` passed | `movement.gross` (from meterId rule) | $0 |
| Was offline, now online | set | `storedSasGross` passed | `movement.gross` (from meterId rule) | $0 |
| No-SMIB (no relayId) | not set | skipped | skipped | $0 |
| Legacy pre-fix offline | not set | `storedSasGross` passed | gross=0 & drop=0 heuristic | $0 |

### 8.6 PATCH Handler Rule

When a collection is PATCHed (individual machine edit saved), STEP 5.1 overrides `sasMeters.gross` with the movement delta:

```typescript
// Fires when: currently offline OR collection has supplemental meter
const isOfflinePatch =
  (hasRelay && lastActivityMs >= OFFLINE_THRESHOLD_MS) ||
  !!originalCollection.meterId;  // supplemental meter marker

if (isOfflinePatch) {
  sm.gross = Number((newDrop - newCancelled).toFixed(2)); // collector truth
}
```

This keeps `sasMeters.gross` in sync with movement even after the machine comes back online.

### 8.6 Machine State Matrix

| Machine state | `meterId` on collection | `check-variations` path | `computeTotalVariation` path | Expected variation |
|---|---|---|---|---|
| Online (relay live, no prev offline) | not set | Live Meters query | `sasMeters.gross` from DB | Actual SAS vs meter delta |
| Offline (relay stale at collection) | set | `storedSasGross` passed | `movement.gross` (meterId rule) | $0 |
| Was offline, now online | set | `storedSasGross` passed | `movement.gross` (meterId rule) | $0 |
| No-SMIB (no relayId) | not set | skipped | skipped (no SMIB) | $0 |
| Legacy pre-fix offline (gross=0 & drop=0) | not set | `storedSasGross` passed | `movement.gross` (heuristic) | $0 |

### 8.7 Bug That Exposed These Rules (June 2026)

The `-$91 phantom variation` bug: machine was offline at collection time (`meterId` set, supplemental meter created), came back online before the edit modal was opened. User clicked Submit without saving individual machine edits. No individual PATCH fired, so `sasMeters.gross` stayed stale ($136). `computeTotalVariation` read $136 (didn't check `meterId`), compared to `movement.gross` $45 → stored `-$91`. The modal showed $0 because `freshMovementGross` was computed correctly from form inputs. Fixed by the three rules above.

---

_Document Version: 1.2_
_Last Updated: June 16, 2026_
