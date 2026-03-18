# Location Aggregation API (`/api/locationAggregation`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.2.0

---

## 1. Domain Overview

The primary data source for the Locations Page and Dashboard Map. It aggregates per-location financial metrics, machine connectivity status, and geospatial data. Implements an in-memory cache to avoid redundant heavy DB queries.

---

## 2. Core Endpoints

### 📊 `GET /api/locationAggregation`
Returns enriched location records with financial and operational metrics.

**Steps:**
1. **Parse & validate params** — Reads `timePeriod`, `licencee`, `currency`, `machineTypeFilter`, `onlineStatus`, `search`, `page`, `limit`, `selectedLocations`, `basicList`, `sasEvaluationOnly`. Also reads `clearCache=true` to bust the in-memory cache.
2. **Handle cache clearing** — If `clearCache=true` is passed, calls `clearCache()` to purge the entire in-memory store before proceeding.
3. **Parse custom dates** — If `timePeriod === 'Custom'`, reads `startDate` and `endDate` from the query string. Returns `400` if either is missing.
4. **Check cache** — Generates a cache key via `getCacheKey(params)` and checks `getCachedData(key)`. If a valid non-expired entry exists, skips all DB work and returns the cached response directly.
5. **Connect to database & verify data** — Establishes the Mongoose connection. If the `Meters` collection is empty (fresh deployment), returns an empty array rather than an expensive failed aggregation.
6. **Fetch aggregated location metrics** — Calls `getLocationsWithMetrics()` helper which runs a multi-stage aggregation pipeline on `GamingLocations`, joining with `Machines` and `Meters` to compute `moneyIn`, `moneyOut`, `gross`, `machineCount`, `onlineCount`, and `offlineCount`.
7. **Apply machine type filter** — If `machineTypeFilter` is set (e.g. `VGT`, `Slot`, `Roulette`), filters the result array to only include locations that have machines of that type.
8. **Sort locations** — Sorts the filtered results by `moneyIn` descending so the highest-earning property appears first.
9. **Apply currency conversion** — If `shouldApplyCurrencyConversion(licencee)` returns `true`, calls `convertLocationCurrency()` to convert `moneyIn`, `moneyOut`, and `gross` fields from USD to the licencee's local currency.
10. **Cache & return results** — Saves the final result to `setCachedData(key, result)` with a TTL, then returns `{ locations, currency, converted, timePeriod }`.

---

## 3. `GET /api/locations`
Returns basic location records for the Locations Inventory Table (non-aggregated).

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse params** — Reads `licencee`, `search`, `status`, `page`, `limit`.
3. **Determine user scope** — Calls `getUserLocationFilter()` to build the RBAC-filtered list of allowed location IDs.
4. **Build query** — Constructs a MongoDB `$match` with `{ _id: { $in: allowedIds } }`, plus optional `search` regex and `status` filter.
5. **Execute query** — Calls `GamingLocations.find(query).skip(skip).limit(limit)`.
6. **Return results** — Returns `{ locations, pagination }`.

---

## 4. Business Logic

### 🗃️ Caching Strategy
The aggregation is computationally expensive (multi-collection join across potentially thousands of meter records). Results are cached in-memory with a TTL. The cache is keyed by the combination of `timePeriod + licencee + machineTypeFilter + currency` to ensure different filter combinations hit their own cache slot.

### 🌐 Online Status Calculation
A location is considered "Online" if at least one of its machines has a `lastActivity` timestamp within the last 3 minutes from `Date.now()`. This is computed in the aggregation, not stored on the document.

---
**Technical Reference** - Location & Analytics Team
