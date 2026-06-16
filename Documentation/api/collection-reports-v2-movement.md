# Collection Report V2 — Movement Calculation Engine

**Last Updated:** 2026-06-05

## Overview

The V2 Collection Report system uses a **Movement Delta Method** to calculate accurate per-collection gross figures for each machine. Rather than using raw lifetime meter totals, it computes the _difference_ (movement) between the current collection and the previous one, giving an accurate picture of how much money the machine took in during a single collection period.

---

## Key Field Definitions

### Top-Level Fields (on `ReportedMachine` document)

| Field               | Description                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `sasMetersIn`       | The SAS/system lifetime coin-in meter read from the machine at capture time.                                                         |
| `sasMetersOut`      | The SAS/system lifetime cancelled-credits meter read from the machine.                                                               |
| `sasGross`          | The calculated gross for this collection from the SAS perspective. See "Calculation Logic" below.                                    |
| `manualMetersIn`    | The manual coin-in value entered by the collector (only set when `metersMatch === false`).                                           |
| `manualMetersOut`   | The manual cancelled-credits value entered by the collector (only set when `metersMatch === false`).                                 |
| `prevSasMetersIn`   | The SAS `metersIn` from the most recent previous submitted report (or `Machine.collectionMeters.metersIn` for first-time reports).   |
| `prevSasMetersOut`  | The SAS `metersOut` from the most recent previous submitted report (or `Machine.collectionMeters.metersOut` for first-time reports). |
| `ramClear`          | Boolean flag — true when the machine's meters were reset between the previous collection and this one.                               |
| `ramClearMetersIn`  | Pre-reset peak `metersIn` reading (only meaningful when `ramClear === true`).                                                        |
| `ramClearMetersOut` | Pre-reset peak `metersOut` reading (only meaningful when `ramClear === true`).                                                       |

### `movement` Sub-Document

The `movement` object stores **manual delta values only** — SAS values are top-level.

| Field                      | Description                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `movement.manualMetersIn`  | Manual (or SAS-as-manual) meters in, minus the previous SAS meters in.               |
| `movement.manualMetersOut` | Manual (or SAS-as-manual) meters out, minus the previous SAS meters out.             |
| `movement.machineGross`    | `movement.manualMetersIn - movement.manualMetersOut`. The machine-perspective gross. |

---

## Calculation Logic

The logic is driven by the `metersMatch` field, which reflects whether the collector confirmed that the photo they took matched the meter display on the machine.

### When `metersMatch === true` (collector confirmed photo matches)

```
sasMetersIn = value from machine (sent by frontend)
sasMetersOut = value from machine (sent by frontend)
sasGross = SUM of meters.movement.drop - SUM of meters.movement.totalCancelledCredits
           (aggregated from the Meters collection between sasStartTime and sasEndTime)

movement.manualMetersIn  = sasMetersIn  - prevSasMetersIn
movement.manualMetersOut = sasMetersOut - prevSasMetersOut
movement.machineGross    = movement.manualMetersIn - movement.manualMetersOut
```

The key distinction is that `sasGross` uses a **time-range aggregation** from the `Meters` collection, not simple arithmetic. This accounts for mid-collection meter rollovers and provides a more accurate picture of collections activity within the window.

### When `metersMatch === false` (collector disputes photo / enters manual values)

```
sasMetersIn  = Machine.sasMeters.drop             (authoritative SAS lifetime value)
sasMetersOut = Machine.sasMeters.totalCancelledCredits
sasGross     = sasMetersIn - sasMetersOut          (simple arithmetic)

movement.manualMetersIn  = manualEntryIn  - prevSasMetersIn
movement.manualMetersOut = manualEntryOut - prevSasMetersOut
movement.machineGross    = movement.manualMetersIn - movement.manualMetersOut
```

When meters don't match, `sasMetersIn/Out` are overridden with `Machine.sasMeters.drop` and `Machine.sasMeters.totalCancelledCredits` directly from the `Machine` document, which represent the most current authoritative SAS reading. The `sasGross` is therefore a simple difference of these lifetime values.

> **Note:** `Machine.sasMeters` (lifetime meter totals) is distinct from `Machine.collectionMeters` (the previous collection checkpoint). They are intentionally separate fields.

### When `ramClear === true` (machine was reset between collections)

RAM clear handles the real-world scenario where a machine's meters were reset to 0 between the previous collection and the current one. The current readings cannot be compared against the previous baseline directly — they reflect only the post-reset accumulation.

```
movement.manualMetersIn  = (ramClearMetersIn  - prevSasMetersIn)  + effectiveIn
movement.manualMetersOut = (ramClearMetersOut - prevSasMetersOut) + effectiveOut
movement.machineGross    = movement.manualMetersIn - movement.manualMetersOut
```

Where `effectiveIn/Out` is whichever current reading applies under the existing branch (SAS values for `metersMatch === true`, manual values for `metersMatch === false`, manual values for no-SMIB).

`sasGross` is **not** affected by RAM clear — it is still computed from time-range aggregation (`metersMatch === true`) or simple lifetime arithmetic (`metersMatch === false`).

The RAM clear toggle is **always available** in the capture UI regardless of `metersMatch` or SMIB status. Validation enforces `ramClearMetersIn ≥ prevSasMetersIn` and `ramClearMetersOut ≥ prevSasMetersOut`.

#### Worked example

| Input                                 | Value                  |
| ------------------------------------- | ---------------------- |
| `prevSasMetersIn / Out`               | 10 / 20                |
| `ramClearMetersIn / Out`              | 20 / 25                |
| Current `metersIn / Out` (post-reset) | 5 / 0                  |
| `movement.manualMetersIn`             | (20 − 10) + 5 = **15** |
| `movement.manualMetersOut`            | (25 − 20) + 0 = **5**  |
| `movement.machineGross`               | **10**                 |

This matches V1's two-meter calculation exactly.

---

## Previous Meter Baseline (Fallback Chain)

To calculate movement, the system needs to know the "previous" meter values. It uses this fallback chain:

1. **Most recent submitted V2 report** for the same machine (excluding the current session). The `sasMetersIn/Out` from that document are used.
2. **First-time collection fallback**: If no prior V2 report exists for this machine, it reads `Machine.collectionMeters.metersIn` and `Machine.collectionMeters.metersOut`.
3. **Zero fallback**: If neither exists (brand new machine never collected), defaults to `0`.

### Manual Setup (Cabinets Page)

Before a machine's first V2 collection, a supervisor can set the `collectionMeters.metersIn/Out` values via the **Cabinets → Edit → Collection Settings** tab. This represents the most recent physical meter reading and is the baseline for the first collection's delta.

> **Important:** The Cabinets Edit page displays and edits `Machine.collectionMeters` — NOT `Machine.sasMeters`. These are different fields with different purposes.

---

## Machine Update on Submit

When a V2 session is fully **submitted**, the system automatically updates the `Machine` document for each collected machine:

```
Machine.collectionMeters.metersIn  = ReportedMachine.sasMetersIn
Machine.collectionMeters.metersOut = ReportedMachine.sasMetersOut
Machine.collectionTime             = ReportedMachine.sasEndTime
```

### Conditional `sasMeters` Sync (No SAS Locations + Offline SMIB)

To maintain lifetime meter accuracy on machines without a live SMIB connection:

- **If `noSMIBLocation === true`**: The system **also** updates `Machine.sasMeters.drop` and `Machine.sasMeters.totalCancelledCredits` with the captured values.
- **If the machine is offline SMIB** (`relayId` exists but `lastActivity` is stale): The system **also** updates `Machine.sasMeters.drop` and `Machine.sasMeters.totalCancelledCredits` with the collector-entered values, since the live relay is not producing updates.
- **If the machine is online SMIB** (`relayId` exists and `lastActivity` is recent): The `sasMeters` fields are **never** mutated by the collection process, as they are managed by the live SAS relay.

This applies across both V1 and V2 paths:
- **V1**: `updateMachineCollectionData()` and `recalculateMachineCollections()` detect offline status via `relayId + lastActivity` threshold.
- **V2 submit**: Uses the `isSupplemental` flag on `ReportedMachine` (set during capture when the machine is detected as offline).
- **V2 `cascadeMachineEdit()`**: Re-derives offline status from `relayId + lastActivity` during edit cascade.

This ensures that the next collection report will use the current report's SAS readings as the "previous" baseline, maintaining continuity across collections.

### Meters Document Creation (No-SMIB Locations)

For no-SMIB locations the submit route creates `Meters` documents (one per machine + session) since there is no live SAS relay producing them. When RAM clear is active, **two** docs are created instead of one — mirroring V1's behavior so downstream aggregations (`SUM(movement.drop)`) yield the same total.

| `ramClear` | Meters docs created                                         | Per-doc movement                                                                                                       |
| ---------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `false`    | 1                                                           | `movement.drop = manualMetersIn - prev`, `movement.totalCancelledCredits = manualMetersOut - prev`                     |
| `true`     | 2 — RAM clear meter (`isRamClear: true`) + post-reset meter | RAM clear: `movement.drop = ramClearMetersIn - prev`; post-reset: `movement.drop = manualMetersIn` (prev treated as 0) |

The post-reset meter's `readAt` is set to `sasEndTime + 1000ms` so it sorts after the RAM clear meter. On re-submit, existing meters for the machine + session are deleted first via `Meters.deleteMany()` to keep the collection clean.

For **SMIB locations** no `Meters` docs are created by the submit route — the SAS relay owns that. RAM clear still adjusts `movement` on the `ReportedMachine` doc identically.

---

## UI Column Mapping

The Collection Report V2 session view displays these columns in the machines table:

| Column Label           | Source Field                                     | Description                                                             |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Lifetime Machine In    | `manualMetersIn` or `sasMetersIn` (when matched) | Absolute manual meter at collection time                                |
| Lifetime SAS In        | `sasMetersIn`                                    | Absolute SAS lifetime coin-in                                           |
| Lifetime SAS Gross     | `sasGross` (persisted)                           | Time-range aggregation or simple delta                                  |
| Movement Machine In    | `movement.manualMetersIn`                        | Delta from previous collection (manual)                                 |
| Movement Machine Gross | `movement.machineGross`                          | Machine-perspective collection gross                                    |
| Movement SAS Gross     | `sasGross`                                       | SAS-perspective collection gross                                        |
| Variation              | `variation`                                      | `machineGross - sasGross`                                               |
| RAM Clear badge        | `ramClear === true`                              | Yellow pill on the machine row; tooltip shows the pre-reset peak values |

---

## Implementation Reference

- **Schema:** `app/api/lib/models/reportedMachines.ts`
- **Types:** `app/api/lib/types/collectionReportV2.ts`
- **Calculation Helper:** `app/api/lib/helpers/collectionReportV2/movement.ts`
- **POST Route:** `app/api/collection-reports-v2/machines/route.ts`
- **PATCH Route:** `app/api/collection-reports-v2/machines/route.ts`
- **Submit Route:** `app/api/collection-reports-v2/sessions/[sessionId]/submit/route.ts`
- **Session Detail Route:** `app/api/collection-reports-v2/sessions/[sessionId]/route.ts`
- **Sessions List Route:** `app/api/collection-reports-v2/sessions/route.ts`

---

## V1 Parity & Baseline Standardization

To maintain data integrity across both collection engines, the V1 system has been updated to follow the same baseline logic:

1. **Prioritize `collectionMeters`**: In both V1 and V2, the `Machine.collectionMeters` field is the authoritative source for the initial baseline (when no prior collection documents exist).
2. **Update on Finalization**: Neither system updates the `Machine` baseline during the individual machine capture/capture phase. Baseline updates to `Machine.collectionMeters` and `Machine.collectionMetersHistory` only occur when the report (V1) or session (V2) is finalized/submitted.
3. **No SAS Mutation (Online SMIB Only)**: The live `Machine.sasMeters` (lifetime totals synced from SMIB) are never mutated by either collection process **for online SMIB machines**. For offline SMIB machines and non-SMIB machines, `sasMeters.drop` and `sasMeters.totalCancelledCredits` are updated with the collector-entered values to maintain accuracy when the relay is unreachable.

- **V1 Helper (Creation/Capture):** `app/api/lib/helpers/collectionReport/creation.ts`
- **V1 Helper (Report Finalization):** `app/api/lib/helpers/collectionReport/reportCreation.ts`
- **V1 Route (PATCH Capture):** `app/api/collection-reports/collections/route.ts`

## Chronological Validation and Cascade Updates

To guarantee mathematical consistency in movement deltas, both V1 and V2 systems enforce strict chronological rules:

1. **Middle-Date Blocking**: You cannot insert a report (or session) for a machine if its timestamp falls exactly _between_ two existing reports for that machine. The system checks the sasEndTime against the specific machine's history and blocks the submission to prevent breaking the contiguous timeline.
2. **Cascade Updates**: If you edit a machine's data in an _older_ report (i.e. a newer report exists chronologically), the system automatically triggers a cascade update. It finds the immediate next report for that machine, updates its prevSasMetersIn and prevSasMetersOut, and recalculates its movement and gross to ensure the timeline remains mathematically sound.
3. **Location ID Enforcement**: To preserve referential integrity, meters are strictly saved using the machine's \locationId\ (ObjectId). They never fallback to the location name string, ensuring robust ID-based aggregations.
4. **RAM Clear Offsets**: For no-SMIB locations, when creating Meters documents for a RAM clear event, the system guarantees the current meter is exactly at the collection time, while the RAM clear peak meter is logged exactly 1 second prior (\collectionTime - 1000ms\).
