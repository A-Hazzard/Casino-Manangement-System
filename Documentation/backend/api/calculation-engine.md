# Financial Calculation Engine (The Core)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.4.0

---

## 1. System Overview

The Calculation Engine is the mathematical foundation of Evolution One. It is responsible for transforming raw hex-meters and periodic snapshots into a consistent, audit-ready financial timeline.

---

## 2. Primary Accounting Methodologies

### 💹 The "Movement Delta" Method

This is the **primary method** for all Dashboard and Real-time reporting.

- **How "Money In" works**: Instead of looking at cumulative meter values, the system pre-calculates the "diff" between every 15-minute SAS poll.
- **Query Snippet**:
  ```typescript
  // Summing the pre-calculated diffs in the Meters collection
  {
    $sum: '$movement.drop';
  }
  ```
- **Why?**: This prevents "Ghost Revenue" issues during RAM clears or hardware swaps. If a cabinet's cumulative meter resets to 0, only the 15-minute movement is affected, preserving the historical truth.

---

## 3. Logic: Gross vs. Net Revenue

### 💎 Jackpot Interaction (Gross vs. Net Revenue)

The system supports two reporting "Visions" based on the Licencee's `includeJackpot` flag.

- **Vision A (Default Gross)**: `Money Out = Base Cancelled Credits`. Jackpots are treated as separate operational expenses.
- **Vision B (Additive Gross)**: `Money Out = Base Cancelled Credits + Jackpots`. All payouts to players are consolidated into a single "Money Out" figure.
- **Universal Net Gross**: Regardless of the `includeJackpot` flag, the system always calculates `Net Gross = Money In - Base Cancelled Credits - Jackpots`. This provides the true "bottom line" profit for internal review.

#### The Formula (Implementation)

The aggregation engine applies the logic as follows:

```typescript
const moneyOut = rawMoneyOut + (includeJackpot ? jackpot : 0);
const gross = moneyIn - moneyOut;
const netGross = moneyIn - rawMoneyOut - jackpot;
```

- **Role Detection**: The engine detects the `includeJackpot` flag from the Licencee model at the moment of API query to ensure the Dashboard, Cabinets Table, and Collection Report always show identical numbers.

---

## 4. Time & Gaming Day Normalization

### 🕒 The 8 AM Offset (Trinidad Standard)

Casino operations do not end at midnight. The engine uses a "Gaming Day" logic:

- **How it works**: A session occurring at 3 AM on Tuesday is attributed to the "Monday Gaming Day."
- **Logic**: Implementation resides in `lib/utils/gamingDayRange.ts`. It shifts the audit window by `-8 hours` before querying the database.

### 🌐 Single Source of Truth Logic

- **Storage & Retrieval**: All timestamps are stored as **UTC** in MongoDB. The API transmits pure UTC strings to the client.
- **Client Date Selection**: When picking a "Custom Range," the client detects its local browser offset (e.g., `-04:00`) and transmits that offset to the server via standard `ISO 8601` formatting.
- **Robustness**: Requests are encoded via `URLSearchParams` to ensure exact timezone data (including the `+` sign for positive offsets) is carried from the browser to the API without corruption.
- **Display Conversion**: Browser-side rendering handles the final UTC-to-Local conversion. Regardless of geography or specific hardware location, managers always see data based on their local wall-clock time.

---

## 5. Failure Recovery & Bridges

### 🌉 RAM Clear Bridge Logic

When hardware is reset, cumulative meters drop to zero.

- **The Check**: `if (currentMeter < previousMeter)`.
- **The Fix**: The engine detects the reset and uses the **Floor Count** (or the movement from the last 15 mins) to bridge the gap, preventing the system from showing negative revenue.

### 🚧 History Gaps

If a SMIB is offline for a week, the engine identifies the "Missing Period" and generates a `Bridge entry` during the next collection to maintain continuity in the 30-day performance charts.

---

## 6. Reviewer Multiplier

### 🔢 Per-User Financial Scaling

Users with the `reviewer` role (or any user assigned a `multiplier` value) see scaled financial figures across all metric endpoints.

**Formula:**

```
displayedValue = rawValue * (1 - user.multiplier)
```

**Example:** A reviewer with `multiplier = 0.95` sees 5% of raw values.  
`147,068,296 * (1 - 0.95) = 7,353,414.8`

**Implementation Rules:**

- Applied **server-side** in every financial metric route before the response is built.
- Applied **after** currency conversion so the reviewer sees scaled values in their display currency.
- `user.multiplier` is always read from the **live database** (not the JWT) by `getUserFromServer()` — changes take effect immediately without requiring re-login.
- Implementation: `app/api/lib/utils/reviewerScale.ts` — call `getReviewerScale(user)` once per request; it checks both `roles.includes('reviewer')` and a non-null `multiplier` field.
- `multiplier: null` → no scaling applied (full values shown).

**Affected Routes:**

- `GET /api/reports/locations` — applied per location before `moneyIn/moneyOut/gross/jackpot` are computed
- `GET /api/locations/search-all` — applied to `totalMoneyIn/Out/Jackpot` per location
- `GET /api/locations/[locationId]` — applied per cabinet inside the location
- `GET /api/locations/[locationId]/cabinets/[cabinetId]` — applied to raw meter totals
- `GET /api/cabinets/aggregation` — applied in STEP 10.5 (post-currency conversion)
- `GET /api/cabinets/[cabinetId]` — applied in STEP 9.5 (post-currency conversion)
- `GET /api/metrics/meters` — passed as `userMultiplier` param to `getMeterTrends()` helper

---

---

## 7. WOW_SYNC Meter Source

Machines that receive meter data via the **WOW sync** system (no physical SMIB relay) produce `Meters` documents with `meterSource: 'WOW_SYNC'`.

### Movement Delta Limitation

WOW_SYNC records store **movement fields as always 0**. The delta is not pre-computed on write. Instead, the cumulative `drop`/`totalCancelledCredits` at each reading is stored at the top level.

### SAS Gross Calculation with WOW_SYNC

Two places consume WOW_SYNC data and both use the same fallback:

1. **Aggregation pipeline** (`variation.ts` — `aggregateMeterDataForWindows`): tracks `$first`/`$last` of top-level `drop`/`totalCancelledCredits` plus an `anyWowSync` flag. Post-group, if `anyWowSync && totalDrop === 0`, uses `lastDrop - firstDrop`.

2. **JS reduce** (`creation.ts` — `calculateSasMetrics`): detects `hasWowSync` from `meterSource === 'WOW_SYNC'`, and when movement sums are 0, computes `last.drop - first.drop` (meters are pre-sorted by `readAt`).

### Impact on Downstream Calculations

- **Revenue metrics**: WOW_SYNC records contribute correctly to drop/cancelled/gross totals after the fallback logic.
- **Variation**: Before the fix (June 2026), WOW machines showed $0 SAS gross → full machine gross appeared as phantom variation.
- **Dashboard/Reports**: Since Meters aggregation uses the Movement Delta method, WOW_SYNC records had no `movement.*` to contribute. The `$first`/`$last` fallback is only used in the collection report variation pipeline, not the general dashboard aggregation.

---

**Core Technical Document** — Evolution One Engineering
