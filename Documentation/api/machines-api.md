# Cabinets & Machines API (`/api/machines`, `/api/machines/aggregation`, `/api/machines/[machineId]`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Domain Overview

The Cabinets/Machines API manages the hardware lifecycle, SMIB integration, real-time connectivity state, and per-machine financial metrics. It is the primary data source for the Cabinets list page and Cabinet Details page.

---

## 2. Core Endpoints

### 🎰 `GET /api/machines/aggregation`
Returns aggregated machine metrics for the **Cabinets list page**.

**Key steps:**
1. Parse params: `locationId`, `search`, `licencee`, `timePeriod`, `currency`, `onlineStatus`, `membership`, `page`, `limit`, `sortBy`, `sortOrder`.
2. Determine allowed location IDs via `getUserLocationFilter()`.
3. Calculate gaming day ranges per location.
4. Aggregate meter data in two code paths:
   - **7d / 30d / Custom**: Single-batch aggregation per location group via MongoDB pipeline.
   - **Today / Yesterday**: Parallel batch processing (batch size 20) for fast today-scoped queries.
5. Apply `includeJackpot` logic per licencee.
6. **(STEP 10)** Apply currency conversion for admin/developer multi-licencee views.
7. **(STEP 10.5) Apply reviewer multiplier** — after currency conversion, maps over all `filteredMachines` and scales `moneyIn`, `moneyOut`, `jackpot`, `cancelledCredits` by `(1 - user.multiplier)`, recalculating `gross` and `netGross`.
8. Sort and paginate.

**Returns:** `{ success: true, data: GamingMachine[], pagination }`

---

### 👁️ `GET /api/machines/[machineId]`
Returns the full machine profile for the **Cabinet Details page**.

**Key steps:**
1. Authenticate via `withApiAuth` — extracts `user: userPayload` including `multiplier`.
2. Fetch machine document and linked gaming location.
3. Aggregate meter data for the requested time period/date range.
4. Apply `includeJackpot` logic.
5. **(STEP 9)** Apply currency conversion if applicable.
6. **(STEP 9.5) Apply reviewer multiplier** — scales `moneyIn`, `moneyOut`, `jackpot` by `(1 - user.multiplier)`, recalculates `gross`.
7. Return full machine profile with financial overlay.

---

### 📋 `GET /api/machines`
Returns a paginated list of machine records (basic metadata, no meter aggregation). Used for dropdowns and machine search.

---

### 📋 `GET /api/machines/by-id`
Fetches a machine by its `_id` directly. Used by the cabinet edit modal.

---

## 3. Reviewer Multiplier

Applied **after** currency conversion in all metric routes:

```typescript
// STEP 10.5 / STEP 9.5
if (reviewerMult !== null) {
  const mult = 1 - reviewerMult;
  moneyIn *= mult;
  moneyOut *= mult;
  jackpot *= mult;
  cancelledCredits *= mult;
  gross = moneyIn - moneyOut;
  netGross = moneyIn - cancelledCredits - jackpot;
}
```

`reviewerMult` is read from `userPayload.multiplier` which is always hydrated from the live database by `getUserFromServer()`.

---

## 4. Real-Time Infrastructure (MQTT & SAS)

### 📡 SMIB Integration
- **Heartbeat**: Machines publish to MQTT every 60 seconds. API updates `lastActivity` to reflect live status.
- **Command Bus**: Remote commands (`SYNC`, `LOCK`, `UNLOCK`) published to `sunbox/[machineId]/command`.

### 📊 SAS Field Mapping
| SAS Field | DB Field | Description |
| :--- | :--- | :--- |
| Total In | `movement.drop` | Physical cash/tickets inserted |
| Total Out | `movement.totalCancelledCredits` | Player cash-outs |
| Handle | `movement.coinIn` | Total amount bet |
| Wins | `movement.totalWonCredits` | Total won by player |

---

## 5. Business Rules (BR-CAB)

- **BR-CAB-01**: A machine is `online` if `aceEnabled: true` OR `lastActivity` within last 3 minutes.
- **BR-CAB-02**: `AssetNumber` (Custom Name) must be unique within a specific Location.
- **BR-CAB-03**: Moving a machine between locations triggers an automatic "History Gap" entry to prevent revenue double-counting.
- **BR-CAB-04**: Technician-only users have `timePeriod` forced to `LastHour` in the aggregation route.

---

## 6. Performance Optimizations

- Compound index on `{ gamingLocation: 1, deletedAt: 1 }` for fleet-wide queries in <100ms.
- Batch processing (size 20) for Today/Yesterday to avoid N+1 per location.
- Single pipeline aggregation for 7d/30d across all locations.

---

**Technical Reference** — Engineering Team
