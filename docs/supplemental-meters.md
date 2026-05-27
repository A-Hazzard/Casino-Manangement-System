# Supplemental Meters — Full Context & Implementation Reference

> **Feature:** Supplemental Meters for Offline SMIB Cabinets  
> **Scope:** Collection Report V1 & V2  
> **Status:** Fully implemented ✅

---

## 1. Background — How Collection Reports Work

The Evolution1 CMS supports two types of gaming locations:

| Location Type        | Meter Source                   | Collection Method                                                                             |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| **No-SMIB Location** | No hardware relay              | 100% manual entry of drop/cancelled credits                                                   |
| **SMIB Location**    | SMIB relay (`relayId` present) | SAS meters auto-delivered by `sas-worker`; collector confirms match or enters manual override |

### The `Meters` Collection

Every collection event writes documents to the `meters` MongoDB collection. Each document captures the **lifetime** totals at the point of collection plus **movement deltas** (the difference since the last collection). Key fields:

```
drop                     → Meters In (physical drop)
totalCancelledCredits    → Meters Out (cancelled credits)
coinIn / coinOut         → SAS lifetime totals
totalWonCredits          → Total won credits lifetime
jackpot                  → Jackpot lifetime
currentCredits           → Current credits on machine
gamesPlayed / gamesWon   → Game counters
movement.drop            → Movement delta for drop
movement.totalCancelled  → Movement delta for cancelled credits
isRamClear               → Whether this doc represents a RAM clear peak snapshot
isSupplemental           → NEW — whether this doc was created for an offline SMIB
```

### Manual Meters vs. SAS Meters

- **No-SMIB** — only manual meters exist. The collector physically reads the machine and enters `drop` and `cancelledCredits`. All other lifetime meters (`coinIn`, `jackpot`, etc.) are `0` because there is no SMIB relay.
- **SMIB online** — the `sas-worker` continuously updates `machine.sasMeters` from the relay. On collection, the system compares these with the collector's physical reading. If they match, `metersMatch = true`. If not, the collector overrides them.
- **SMIB offline ≥ 3 days** — the SMIB relay has gone silent. The collector still physically drops the machine, but the `sas-worker` has no fresh data. This is the **Supplemental Meters** scenario.

---

## 2. The Problem — Why Supplemental Meters Are Needed

When a SMIB goes offline for 3+ days and a collection happens:

1. The relay hasn't been updating `machine.sasMeters.drop` or `machine.sasMeters.totalCancelledCredits`.
2. If we treat this like a normal SMIB collection, the lifetime meter fields (`coinIn`, `jackpot`, etc.) would be `0` — the same as a No-SMIB location.
3. When the SMIB eventually reconnects and the `sas-worker` resumes, it will write a new `Meters` doc with the real lifetime totals. The **movement delta** would then be calculated as `(current_lifetime - 0)` — massively inflating the apparent movement for that period.

**Supplemental Meters solve this** by carrying forward the last known lifetime values from the most recent previous `Meters` document, setting their movement deltas to `0`. Only the physically entered drop meters (`drop` / `totalCancelledCredits`) get real movement calculated. This creates a mathematically sound bridge during the offline gap.

---

## 3. The Decision Tree

```
Machine on session
│
├── Has relayId?
│   │
│   ├── NO → Standard Manual Meters (No-SMIB flow)
│   │         All fields entered manually, no carry-forward
│   │
│   └── YES → Has lastActivity within 3 days?
│             │
│             ├── YES → Standard SMIB flow
│             │         SAS meters auto-match, no supplemental needed
│             │
│             └── NO (offline ≥ 3 days) → SUPPLEMENTAL METERS
│                 │
│                 ├── Was machine RAM cleared while offline?
│                 │   │
│                 │   ├── NO → Single supplemental doc
│                 │   │       • Carry forward previous lifetime totals
│                 │   │       • Set all non-entered movement deltas to 0
│                 │   │       • Calculate movement for drop/cancelledCredits normally
│                 │   │
│                 │   └── YES → Two supplemental docs
│                 │           Doc 1 (RAM Clear peak):
│                 │             • lifetime = carried forward prev values
│                 │             • movement = 0 for all non-entered
│                 │             • isRamClear = true
│                 │           Doc 2 (Post-reset current):
│                 │             • all non-entered lifetime = 0
│                 │             • all non-entered movement = 0
│                 │             • entered meters calculated normally
│                 │
│                 └── Mark: isSupplemental = true on both Meters doc and ReportedMachine doc
```

### Non-Entered Meters (carry-forward with delta = 0)

These are SAS lifetime counters the collector cannot physically read:

- `coinIn`, `coinOut`
- `totalWonCredits`, `totalHandPaidCancelledCredits`
- `jackpot`
- `currentCredits`
- `gamesPlayed`, `gamesWon`

### Entered Meters (calculated normally)

These are the physical drop metrics the collector reads from the machine:

- `drop` (Meters In)
- `totalCancelledCredits` (Meters Out)

---

## 4. Offline Detection Logic

```typescript
const OFFLINE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours

const isOffline =
  hasRelayId &&
  (!lastActivity ||
    Date.now() - new Date(lastActivity).getTime() >= OFFLINE_THRESHOLD_MS);
```

- `hasRelayId` — `machine.relayId` is non-empty/non-null
- `lastActivity` — `machine.lastActivity` timestamp from the Machine document

---

## 5. Data Flow Diagrams

### V2 Capture → Submit Flow (Supplemental Path)

```
Collector opens session
        │
        ▼
GET /sessions/[sessionId]
  → Fetches ReportedMachine docs
  → Returns isSupplemental per machine
        │
        ▼
Frontend detects isSupplemental === true
  → Shows amber warning banner in capture wizard
  → Shows 📶 Supplemental badge in ReviewView
        │
        ▼
Collector enters drop + cancelledCredits
POST/PATCH /machines
  → computeMovement() called
  → Detects offline via relayId + lastActivity
  → Sets isSupplemental = true on ReportedMachine
  → Carries forward prev lifetime values in movement result
        │
        ▼
Collector submits session
PATCH /sessions/[sessionId]/submit
  → Checks: isNoSasLocation || m.isSupplemental === true
  → Queries most recent prior Meters doc for this machine
  → Creates Meters doc with:
      - Carried-forward lifetime totals (non-entered)
      - 0 movement deltas (non-entered)
      - Calculated movement for drop/cancelledCredits
      - isSupplemental: true
  → (RAM Clear variant creates two docs)
        │
        ▼
Future: sas-worker reconnects
  → Writes new Meters doc with real lifetime totals
  → Movement calculated from the supplemental doc's values
  → No phantom inflation ✅
```

---

## 6. Code Changes — File by File

### 6.1 Database Schemas

#### `app/api/lib/models/meters.ts`

Added `isSupplemental` flag to `MetersSchema`:

```typescript
isRamClear: { type: Boolean, default: false },
isSupplemental: { type: Boolean, default: false },  // NEW
```

#### `app/api/lib/models/reportedMachines.ts`

Added `isSupplemental` to both the TypeScript type definition and Mongoose schema:

```typescript
// Type
isSupplemental?: boolean;

// Schema
isSupplemental: { type: Boolean, default: false },
```

---

### 6.2 V1 Collection Engine

#### `app/api/lib/helpers/collectionReport/reportCreation.ts`

Two functions updated: `createManualMetersForEachMachine` and `updateRegularAndRamClearMeters`.

**Logic added:**

1. After fetching the Machine doc, check `relayId` and `lastActivity`.
2. If offline ≥ 3 days → query most recent prior `Meters` doc.
3. Build the new `Meters` document with:
   - Non-entered lifetime fields = previous doc values (or 0 if no prior doc)
   - Non-entered `movement.*` = 0
   - Entered fields (`drop`, `totalCancelledCredits`) calculated normally
   - `isSupplemental: true`
4. **RAM Clear path:** If `ramClear === true`:
   - Doc 1: previous peak values → `isRamClear: true`, movements = 0, `isSupplemental: true`
   - Doc 2: entered meters from post-reset reading, all non-entered = 0, `isSupplemental: true`

---

### 6.3 V2 Movement Helper

#### `app/api/lib/helpers/collectionReportV2/movement.ts`

In `computeMovement()`:

```typescript
// Detect offline SMIB
const hasRelay = !!machine.relayId;
const lastActivity = machine.lastActivity;
const THRESHOLD = 3 * 24 * 60 * 60 * 1000;
const isOffline =
  hasRelay &&
  (!lastActivity || Date.now() - new Date(lastActivity).getTime() >= THRESHOLD);

// Return isSupplemental in result
return {
  ...movementResult,
  isSupplemental: isOffline,
};
```

When `isOffline`:

- Non-entered movement deltas (`movement.jackpot`, `movement.totalWonCredits`, etc.) set to `0`
- Non-entered lifetime values carried forward from the previous `Meters` doc

---

### 6.4 V2 Machine Capture API

#### `app/api/collection-reports-v2/machines/route.ts`

Both `POST` (new machine capture) and `PATCH` (update capture) routes:

```typescript
const { isSupplemental } = computeMovement(machine, captureData);

// Persisted to ReportedMachine document
updateData.isSupplemental = isSupplemental;
```

---

### 6.5 V2 Session Submit API

#### `app/api/collection-reports-v2/sessions/[sessionId]/submit/route.ts`

**Changed condition for Meters doc generation:**

```typescript
// Before:
if (isNoSasLocation) {
  /* create manual Meters docs */
}

// After:
if (isNoSasLocation || m.isSupplemental === true) {
  /* create Meters docs */
}
```

**For supplemental SMIBs specifically:**

```typescript
if (m.isSupplemental === true) {
  // Query most recent prior Meters doc
  const prevMeterDoc = await Meters.findOne({
    machine: m.machineId,
    _id: { $ne: currentSessionIds },
  }).sort({ createdAt: -1 }).lean();

  // Build supplemental Meters doc:
  // Non-entered = carry forward from prevMeterDoc (or 0 if null)
  coinIn: prevMeterDoc?.coinIn ?? 0,
  coinOut: prevMeterDoc?.coinOut ?? 0,
  totalWonCredits: prevMeterDoc?.totalWonCredits ?? 0,
  jackpot: prevMeterDoc?.jackpot ?? 0,
  currentCredits: prevMeterDoc?.currentCredits ?? 0,
  gamesPlayed: prevMeterDoc?.gamesPlayed ?? 0,
  gamesWon: prevMeterDoc?.gamesWon ?? 0,

  // Movement deltas for non-entered = 0
  'movement.coinIn': 0,
  'movement.jackpot': 0,
  // etc.

  isSupplemental: true,
}
```

**RAM Clear variant** (two docs created when `m.ramClear === true`):

- Doc 1: Peak values carried forward, `isRamClear: true`, `isSupplemental: true`
- Doc 2: Post-reset values, non-entered lifetime = 0, non-entered movement = 0, `isSupplemental: true`

---

### 6.6 Session GET API (Frontend Data Exposure)

#### `app/api/collection-reports-v2/sessions/[sessionId]/route.ts`

Added `isSupplemental` to the machines mapping in the GET response (line ~315):

```typescript
return {
  // ...existing fields...
  ramClear: m.ramClear === true,
  ramClearMetersIn: m.ramClearMetersIn,
  ramClearMetersOut: m.ramClearMetersOut,
  isSupplemental: m.isSupplemental === true, // NEW
  lastCollectionTime: getLastCollectionTime(m.machineId),
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
};
```

---

### 6.7 Frontend — Capture Wizard

#### `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionDetail.tsx`

**Type update:**

```typescript
type SessionMachine = {
  // ...existing fields...
  lastCollectionTime?: string | null;
  isSupplemental?: boolean; // NEW
  createdAt?: string;
  updatedAt?: string;
};
```

**Amber warning banner** (shown between "System Meters" and "Photo Capture" sections):

```tsx
{
  !session?.noSMIBLocation && currentMachine?.isSupplemental === true && (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg leading-none" aria-hidden="true">
          📶
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Supplemental meters will be generated
          </p>
          <p className="mt-1 text-xs text-amber-700">
            This SMIB cabinet has been offline for ≥ 3 days. Non-entered
            lifetime meters (jackpot, credits won, current credits, etc.) will
            be carried forward from the previous collection with a movement
            delta of 0. Only physical drop meters (Meters In / Meters Out)
            reflect actual movement.
          </p>
        </div>
      </div>
    </div>
  );
}
```

**📶 Supplemental badge in ReviewView — Desktop (alongside RAM Clear badge):**

```tsx
{
  machine.isSupplemental === true && (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
      title="Supplemental meters: SMIB cabinet was offline ≥ 3 days. Non-entered lifetime meters were carried forward with 0 movement delta."
    >
      <span aria-hidden="true">📶</span>
      Supplemental
    </span>
  );
}
```

**📶 Supplemental badge in ReviewView — Mobile (`sm:hidden` section):**

```tsx
{
  machine.isSupplemental === true && (
    <span
      className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700"
      title="Supplemental: SMIB offline ≥ 3 days"
    >
      <span aria-hidden="true">📶</span>
    </span>
  );
}
```

---

### 6.8 Frontend — Submitted Session Machines Tab

#### `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionReportMachinesTab.tsx`

**Type update:**

```typescript
type SessionMachine = {
  // ...existing fields...
  machineGross?: number;
  grossDifference?: number;
  isSupplemental?: boolean; // NEW
  createdAt?: string;
};
```

**`SupplementalBadge` component** (defined as an inner component alongside `MatchIcon`, `SortIcon`, etc.):

```tsx
const SupplementalBadge = () => (
  <span
    className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
    title="Supplemental meters: this SMIB cabinet was offline ≥ 3 days. Non-entered lifetime meters were carried forward with a 0 movement delta. Only physical drop meters (Meters In/Out) reflect real movement."
  >
    <span aria-hidden="true">📶</span>
    Supplemental
  </span>
);
```

**Desktop table — machine name cell:**

```tsx
<div className="flex items-center gap-1.5 flex-wrap">
  <button ...>{machine.machineCustomName || machine.machineName}</button>
  {machine.isSupplemental && <SupplementalBadge />}
</div>
```

**Mobile card — name area:**

```tsx
{
  machine.isSupplemental && (
    <div className="mt-1">
      <SupplementalBadge />
    </div>
  );
}
```

---

## 7. Visual UI Summary

### During Capture Wizard (in-progress session)

```
┌─────────────────────────────────────────────────┐
│ System Meters (from SMIB)                       │
│  Meters In: 1,234,567   Meters Out: 987,654     │
├─────────────────────────────────────────────────┤
│ 📶 Supplemental meters will be generated        │
│    This SMIB cabinet has been offline for ≥ 3   │
│    days. Non-entered lifetime meters (jackpot,  │
│    credits won, current credits, etc.) will be  │
│    carried forward from the previous collection │
│    with a movement delta of 0. Only physical    │
│    drop meters reflect actual movement.         │
├─────────────────────────────────────────────────┤
│ Meter Photo                                     │
│  [ Tap to take a photo ]                        │
└─────────────────────────────────────────────────┘
```

### Review View (before submit)

```
┌─────────────────────────────────────────────────┐
│ [Photo]  Machine ABC-123                        │
│          SN: 12345 · Manufacturer               │
│                    [📶 Supplemental] [Confirmed] │
├─────────────────────────────────────────────────┤
```

### Submitted Session — Machines Tab (desktop table)

```
┌──────────┬──────────────────────────────────┬─────────────────┬─────┐
│  Photo   │  Machine                         │  Lifetime In/Out│ ... │
├──────────┼──────────────────────────────────┼─────────────────┼─────┤
│  [img]   │  ✓ Machine ABC [📶 Supplemental] │  1,234,567/...  │ ... │
└──────────┴──────────────────────────────────┴─────────────────┴─────┘
```

---

## 8. Mathematical Guarantee

Given:

- `prevDoc` = most recent prior Meters document
- `entered_in` = drop entered by collector
- `entered_out` = cancelledCredits entered by collector

Supplemental document values:

```
new.drop                = entered_in
new.totalCancelledCred  = entered_out
new.coinIn              = prevDoc.coinIn        (unchanged)
new.jackpot             = prevDoc.jackpot       (unchanged)
new.currentCredits      = prevDoc.currentCredits (unchanged)
new.gamesPlayed         = prevDoc.gamesPlayed   (unchanged)

new.movement.drop       = entered_in - prevDoc.drop
new.movement.cancelled  = entered_out - prevDoc.totalCancelledCredits
new.movement.coinIn     = 0  ← zeroed, not 0 - prevDoc.coinIn
new.movement.jackpot    = 0  ← zeroed
new.movement.games      = 0  ← zeroed
```

When SMIB reconnects and `sas-worker` writes the next real doc:

```
nextDoc.movement.coinIn = nextDoc.coinIn - supplementalDoc.coinIn
                        = nextDoc.coinIn - prevDoc.coinIn
```

→ Movement is correctly calculated only for the period after reconnection. ✅

---

## 9. RAM Clear + Supplemental Edge Case

When the machine was RAM cleared while offline:

**Doc 1 — Peak (RAM Clear snapshot):**

```
drop                = ramClearMetersIn  (collector entered peak)
totalCancelled      = ramClearMetersOut
coinIn              = prevDoc.coinIn    (carried forward)
jackpot             = prevDoc.jackpot   (carried forward)
movement.*          = 0                 (all zeroed)
isRamClear          = true
isSupplemental      = true
```

**Doc 2 — Post-reset current:**

```
drop                = entered_in        (current reading, reset from 0)
totalCancelled      = entered_out
coinIn              = 0                 (machine reset all counters)
jackpot             = 0
movement.drop       = entered_in - ramClearMetersIn
movement.cancelled  = entered_out - ramClearMetersOut
movement.coinIn     = 0
isSupplemental      = true
```

---

## 10. Key Constraints & Rules

1. **Do not mutate `machine.sasMeters`** — the `sas-worker` owns those. Only write `Meters` collection documents during supplemental collection.
2. **No-SMIB locations are never supplemental** — they have no relay so there's no offline detection (`relayId` is absent).
3. **Online SMIB machines are never supplemental** — only machines with `lastActivity` older than 72 hours qualify.
4. **V1 and V2 mathematical parity** — both systems produce identical `Meters` documents. V1 does it in `reportCreation.ts`, V2 does it in the submit route.
5. **`isSupplemental` is idempotent** — re-saving a supplemental machine does not double-carry or corrupt values. The logic always queries the _most recent prior_ doc excluding the current session.

---

## 11. Files Changed — Quick Reference

| File                                                                                                | Change Type   | Purpose                                             |
| --------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------- |
| `app/api/lib/models/meters.ts`                                                                      | Schema        | Add `isSupplemental` field                          |
| `app/api/lib/models/reportedMachines.ts`                                                            | Schema + Type | Add `isSupplemental` field                          |
| `app/api/lib/helpers/collectionReport/reportCreation.ts`                                            | Logic         | V1 carry-forward + zero-delta + RAM clear           |
| `app/api/lib/helpers/collectionReportV2/movement.ts`                                                | Logic         | V2 offline detection + movement modification        |
| `app/api/collection-reports-v2/machines/route.ts`                                                   | API           | Persist `isSupplemental` on POST/PATCH              |
| `app/api/collection-reports-v2/sessions/[sessionId]/submit/route.ts`                                | API           | Generate supplemental `Meters` docs on submit       |
| `app/api/collection-reports-v2/sessions/[sessionId]/route.ts`                                       | API           | Expose `isSupplemental` in GET response             |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionDetail.tsx`            | UI            | Warning banner during capture + badge in ReviewView |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionReportMachinesTab.tsx` | UI            | `📶 Supplemental` badge in submitted report table   |
