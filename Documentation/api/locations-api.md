# Location API (`/api/locations`, `/api/reports/locations`, `/api/locations/search-all`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Domain Overview

The Location API provides property-level financial metrics, machine connectivity status, and geospatial data for the Locations Page, Dashboard Map, and Location Details views. Three separate routes serve distinct use cases.

---

## 2. Core Endpoints

### 📊 `GET /api/reports/locations`
Primary data source for the **Locations list page**. Returns enriched location records with aggregated financial metrics for a given time period.

**Key steps:**
1. Parse params: `timePeriod`, `licencee`, `currency`, `machineTypeFilter`, `onlineStatus`, `search`, `page`, `limit`, `locations`, `sortBy`, `sortOrder`.
2. Determine user's accessible licencees and location permissions via `getUserLocationFilter()`.
3. Build gaming day ranges per location using `getGamingDayRangesForLocations()`.
4. Aggregate meter movements (`totalDrop`, `totalCancelledCredits`, `totalJackpot`) from the `Meters` collection within the gaming day window.
5. Apply `includeJackpot` logic per licencee.
6. **Apply reviewer multiplier** — `scaledDrop = rawDrop * (1 - user.multiplier)` for all three raw values before computing `moneyIn`, `moneyOut`, `gross`, `jackpot`.
7. Apply currency conversion for admin/developer users if needed.
8. Sort and paginate results.

**Returns:** `{ data: AggregatedLocation[], pagination }`

---

### 🔍 `GET /api/locations/search-all`
Handles **search** on the Locations page. Returns filtered location records with financial metrics.

- Same reviewer multiplier logic as `/api/reports/locations`.
- `reviewerScale = 1 - user.multiplier` applied to all financial totals before returning.

---

### 🏢 `GET /api/locations/[locationId]`
Returns full location details including a machine-level financial breakdown.

**Key steps:**
1. Verify user has access to the location via `checkUserLocationAccess()`.
2. Fetch location, licencee `includeJackpot` setting, and gaming day range.
3. For each machine in the location, aggregate `moneyIn`, `moneyOut`, `jackpot` from the `Meters` collection.
4. **Apply reviewer multiplier** — `reviewerScale = 1 - user.multiplier` extracted once, applied per machine.
5. Compute `adjustedMoneyOut = rawMoneyOut + (includeJackpot ? rawJackpot : 0)`.

---

### 🏢 `GET /api/locations/[locationId]/cabinets/[cabinetId]`
Returns a single cabinet's financial metrics within a location.

- After aggregating raw meter values, calls `getUserFromServer()` to read `multiplier`.
- Applies `raw.drop * mult`, `raw.totalCancelledCredits * mult`, `raw.jackpot * mult` before computing `moneyOut`, `gross`, `netGross`.

---

### 📋 `GET /api/locations`
Returns basic location records (non-aggregated) for dropdowns, search, and the location list skeleton.

---

## 3. Reviewer Multiplier

All financial endpoints apply the formula:

```
displayedValue = rawValue * (1 - user.multiplier)
```

- `user.multiplier` is always read from the **live database** (not the JWT cache) via `getUserFromServer()`.
- `multiplier: null` → no scaling (full values shown).
- Applied to: `moneyIn`, `moneyOut`, `jackpot`, `gross`, `netGross`, `cancelledCredits`.
- Applied **after** currency conversion so the reviewer sees scaled values in their display currency.

---

## 4. Online Status Calculation

A machine is `online` if:
- Location has `aceEnabled: true` (ACE-managed locations always show all machines online), **or**
- Machine's `lastActivity` timestamp is within the last 3 minutes.

---

## 5. Gaming Day Offset

Financial metrics are scoped to the gaming day boundary (default 8 AM Trinidad time). Each location stores its own `gameDayOffset` field. The helper `getGamingDayRangesForLocations()` computes the correct UTC range per location.

---

**Technical Reference** — Location & Analytics Team
