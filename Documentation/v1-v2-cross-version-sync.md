# V1 ↔ V2 Cross-Version Synchronization

## Core Principle

**Most recent wins, regardless of version.** When resolving previous meter values or SAS time windows, both V1 and V2 check the unified `Machine.collectionMetersHistory` — which contains entries from both versions in chronological order. There is no "my version first" prioritization.

## Edge Case: V1 used after V2 (or vice versa)

### Scenario: V2 last used May, then V1 used June, then user returns to V2

```
Timeline:
  May 13-15: V2 session 6a0d3512 → sasEndTime May 15, 8:00 AM
  Jun 9-12:  V1 reports (15 of them) → last sasEndTime Jun 12, 7:49 PM
  Jun 13:    User creates new V2 session
```

**Old behavior (bug):** When creating the Jun 13 V2 session, `lookupLastSessionEndTimes` found the May V2 `sasEndTime` and returned `May 15, 8:00 AM` as `sasStartTime` — ignoring the more recent Jun 12 V1 end time. The V2 session used stale SAS start time from a month earlier.

**Current behavior (fixed):** The function queries both V1 and V2 simultaneously, compares timestamps, and returns the most recent per machine — `Jun 12, 7:49 PM`.

## How It Works

### 1. Unified History Array (`Machine.collectionMetersHistory`)

`recalculateMachineCollections` rebuilds `collectionMetersHistory` from both V1 `Collections` and V2 `ReportedMachine` (submitted, non-deleted) documents, sorted chronologically. This means:

- V1 edits/deletes no longer destroy V2 history entries
- The history array is a complete chronological record across both versions
- Both versions read from and write to the same array

### 2. Previous Meter Value Resolution

**V1** (report creation, edit, delete):
```
1. collectionMetersHistory — most recent entry before this operation
2. V1 Collections (backward compat)
3. Machine.collectionMeters
4. 0
```

**V2** (movement calculation):
```
1. collectionMetersHistory entry for current session (edit mode)
2. collectionMetersHistory — most recent entry before this session
3. Machine.collectionMeters
4. 0
```

### 3. SAS Start Time Resolution

Both `lookupLastSessionEndTimes` (session creation) and `computeMovement` (movement calc) query V1 and V2 simultaneously and pick the most recent `sasEndTime`:

```
1. Query V2 ReportedMachine (submitted) — get latest sasEndTime per machine
2. Query V1 Collections (completed, with sasEndTime) — get latest sasEndTime per machine
3. For each machine: pick whichever timestamp is MORE RECENT
4. Fallback: Machine.previousCollectionTime → Machine.collectionTime
```

## Key Files

| File | Purpose |
|---|---|
| `app/api/lib/helpers/collectionReport/recalculation.ts` | `recalculateMachineCollections` — rebuilds unified history from V1+V2 |
| `app/api/lib/helpers/collectionReportV2/sessionOperations.ts` | `lookupLastSessionEndTimes` — most-recent SAS end time per machine |
| `app/api/lib/helpers/collectionReportV2/movement.ts` | `computeMovement` — most-recent prev values + SAS start time |
| `app/api/lib/helpers/collectionReport/reportCreation.ts` | `updateMachineCollectionData` — history-first prev resolution |
| `app/api/lib/helpers/collectionReport/operations.ts` | `findPreviousCollectionForRevert` — history-first prev resolution |
| `app/api/lib/helpers/collectionReport/collectionOperations.ts` | `resolvePreviousMetersForPatch` — history-first prev resolution |
| `app/api/lib/helpers/collectionReport/collectionByIdOperations.ts` | `updateMachineHistoryForPatch` — history-first prev resolution |

## Antipatterns

- ❌ Querying only your own version's model for prev values
- ❌ "My version first" prioritization chains
- ❌ Skipping the other version because you found SOMETHING in yours
- ✅ Always query both sources, compare timestamps, pick the most recent
- ✅ Use `collectionMetersHistory` as the primary source (it's already unified)
