# Collection Report V2 — Movement Calculation Engine

**Last Updated:** 2026-05-16

## Overview

The V2 Collection Report system uses a **Movement Delta Method** to calculate accurate per-collection gross figures for each machine. Rather than using raw lifetime meter totals, it computes the *difference* (movement) between the current collection and the previous one, giving an accurate picture of how much money the machine took in during a single collection period.

---

## Key Field Definitions

### Top-Level Fields (on `ReportedMachine` document)

| Field | Description |
|---|---|
| `sasMetersIn` | The SAS/system lifetime coin-in meter read from the machine at capture time. |
| `sasMetersOut` | The SAS/system lifetime cancelled-credits meter read from the machine. |
| `sasGross` | The calculated gross for this collection from the SAS perspective. See "Calculation Logic" below. |
| `manualMetersIn` | The manual coin-in value entered by the collector (only set when `metersMatch === false`). |
| `manualMetersOut` | The manual cancelled-credits value entered by the collector (only set when `metersMatch === false`). |
| `prevSasMetersIn` | The SAS `metersIn` from the most recent previous submitted report (or `Machine.collectionMeters.metersIn` for first-time reports). |
| `prevSasMetersOut` | The SAS `metersOut` from the most recent previous submitted report (or `Machine.collectionMeters.metersOut` for first-time reports). |

### `movement` Sub-Document

The `movement` object stores **manual delta values only** — SAS values are top-level.

| Field | Description |
|---|---|
| `movement.manualMetersIn` | Manual (or SAS-as-manual) meters in, minus the previous SAS meters in. |
| `movement.manualMetersOut` | Manual (or SAS-as-manual) meters out, minus the previous SAS meters out. |
| `movement.machineGross` | `movement.manualMetersIn - movement.manualMetersOut`. The machine-perspective gross. |

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

### Conditional `sasMeters` Sync (No SAS Locations)

To maintain lifetime meter accuracy on machines without a live SMIB connection:
- **If `noSMIBLocation === true`**: The system **also** updates `Machine.sasMeters.drop` and `Machine.sasMeters.totalCancelledCredits` with the captured values.
- **If `noSMIBLocation === false`**: The `sasMeters` fields are **never** mutated by the collection process, as they are managed by the live SAS relay.

This ensures that the next collection report will use the current report's SAS readings as the "previous" baseline, maintaining continuity across collections.

---

## UI Column Mapping

The Collection Report V2 session view displays these columns in the machines table:

| Column Label | Source Field | Description |
|---|---|---|
| Lifetime Machine In | `manualMetersIn` or `sasMetersIn` (when matched) | Absolute manual meter at collection time |
| Lifetime SAS In | `sasMetersIn` | Absolute SAS lifetime coin-in |
| Lifetime SAS Gross | `sasGross` (persisted) | Time-range aggregation or simple delta |
| Movement Machine In | `movement.manualMetersIn` | Delta from previous collection (manual) |
| Movement Machine Gross | `movement.machineGross` | Machine-perspective collection gross |
| Movement SAS Gross | `sasGross` | SAS-perspective collection gross |
| Variation | `grossDifference` | `machineGross - sasGross` |

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
3. **No SAS Mutation**: The live `Machine.sasMeters` (lifetime totals synced from SMIB) are never mutated by either collection process. They are used solely as fallbacks for baseline lookup.

- **V1 Helper (Creation/Capture):** `app/api/lib/helpers/collectionReport/creation.ts`
- **V1 Helper (Report Finalization):** `app/api/lib/helpers/collectionReport/reportCreation.ts`
- **V1 Route (PATCH Capture):** `app/api/collection-reports/collections/route.ts`
