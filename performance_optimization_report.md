# Performance Optimization Report

## Overview

This report documents performance issues found during the cursor optimization audit and other performance-related findings.

## Cursor Usage Optimization

### Principle

- **Use `toArray()`**: For small collections (GamingLocations, Machine, Member, Licencee, Countries, etc.) - typically < few thousand records
- **Use `cursor()`**: Only for Meters collection which can have millions of records over time

### Issues Found

#### Priority 1: Recently Edited Files - ✅ ALL FIXED

1. **app/api/lib/helpers/locationAggregation.ts** ✅ FIXED
   - ✅ Line 63: `GamingLocations.find().cursor()` → Changed to `.exec()`
   - ✅ Line 137: `GamingLocations.aggregate().cursor()` → Changed to `.exec()`
   - ✅ Line 216: `Machine.find().cursor()` → Changed to `.exec()`
   - ✅ Line 502: `Machine.find().cursor()` → Changed to `.exec()`
   - ✅ Line 597: `Machine.aggregate().cursor()` → Changed to `.exec()` (single result)
   - ✅ Line 551: `Meters.aggregate().cursor()` → Changed to `.exec()` (single result optimization)

2. **app/api/locations/search-all/route.ts** ✅ FIXED
   - ✅ Line 235: `GamingLocations.aggregate().cursor()` → Changed to `.exec()`
   - ✅ Line 278: `Machine.find().cursor()` → Changed to `.exec()`
   - ✅ Line 313: `Meters.aggregate().cursor()` → Changed to `.exec()` (single result optimization)

3. **app/api/locations/search/route.ts** ✅ FIXED
   - ✅ Line 207: `GamingLocations.aggregate().cursor()` → Changed to `.exec()`
   - ✅ Line 112: `Meters.aggregate().cursor()` → KEPT (correct - groups by location, not single result)

4. **app/api/machines/status/route.ts** ✅ FIXED
   - ✅ Line 234: `Machine.aggregate().cursor()` → Changed to `.exec()` (single result)
   - ✅ Line 257: `Machine.aggregate().cursor()` → Changed to `.exec()` (single result)

5. **app/api/reports/locations/route.ts** ✅ CORRECT
   - ✅ Line 490: `Meters.find().cursor()` → KEPT (correct - Meters collection)

#### Priority 2: System-Wide Issues - ✅ SCAN COMPLETED

**No additional issues found.** All cursor usage has been verified:

- All non-Meters models now use `.exec()` or `.toArray()`
- All Meters queries correctly use `.cursor()` for large datasets
- Single-result aggregations optimized to use `.exec()`

**Note:** Files using `for await` with GridFS file streams (firmware.ts, firmwares route) are correct - these are file streaming operations, not database cursors.

## Other Performance Issues

### Single-Result Aggregations ✅ FIXED

Aggregations that return a single result (using `$count` or `$group` with `_id: null`) should use `.exec()` instead of `.cursor()` for better performance.

**Examples Fixed:**

- ✅ `Machine.aggregate([...pipeline, { $count: 'total' }]).cursor()` → Changed to `.exec()` (2 instances in machines/status/route.ts)
- ✅ `Meters.aggregate([...pipeline, { $group: { _id: null, ... } }]).cursor()` → Changed to `.exec()` (2 instances in locationAggregation.ts and search-all/route.ts)

**Rationale:** Even for Meters collection, when an aggregation returns only 1 result, `.exec()` is more efficient than setting up a cursor stream.

### Unnecessary Loops ✅ FIXED

When converting from cursor to toArray, remove the manual `for await` loop pattern. All instances have been fixed:

```typescript
// BEFORE
const results = [];
const cursor = Model.find().cursor();
for await (const doc of cursor) {
  results.push(doc);
}

// AFTER
const results = await Model.find().exec();
```

**Fixed in:**

- ✅ locationAggregation.ts: 5 instances
- ✅ locations/search-all/route.ts: 2 instances
- ✅ locations/search/route.ts: 1 instance
- ✅ machines/status/route.ts: 2 instances

## Recommendations

1. **Immediate Actions:** ✅ COMPLETED
   - ✅ Replace all non-Meters cursor usage with toArray/exec
   - ✅ Fix single-result aggregations to use exec()
   - ✅ Remove unnecessary for-await loops

2. **Ongoing Monitoring:**
   - Review new code for appropriate cursor usage
   - Document when cursor is truly needed (large Meters queries)
   - Consider adding linting rules to catch inappropriate cursor usage
   - **Guideline**: Only use `.cursor()` for Meters queries that can return large result sets (>1000 records)

3. **Performance Testing:**
   - Benchmark toArray vs cursor for typical query sizes
   - Monitor query performance after optimizations
   - Document performance improvements

## Performance Impact

### Expected Improvements

- **Reduced overhead**: Eliminated cursor setup overhead for small datasets
- **Faster queries**: Direct `.exec()` calls are faster than cursor streams for small result sets
- **Better memory usage**: Single-result aggregations no longer use streaming infrastructure unnecessarily

### Files Optimized

- **10 cursor() calls** replaced with `.exec()` or `.toArray()`
- **4 files** optimized in Priority 1
- **0 additional issues** found in system-wide scan

## Summary

### Optimizations Completed

- **10 cursor() calls** replaced with `.exec()` or `.toArray()`
- **4 files** optimized in Priority 1
- **0 additional issues** found in system-wide scan
- **All unnecessary for-await loops** removed

### Files Modified

1. `app/api/lib/helpers/locationAggregation.ts` - 5 optimizations
2. `app/api/locations/search-all/route.ts` - 2 optimizations
3. `app/api/locations/search/route.ts` - 1 optimization
4. `app/api/machines/status/route.ts` - 2 optimizations

### Files Verified Correct

- `app/api/lib/helpers/meterTrends.ts` - Correctly uses cursor for Meters
- `app/api/reports/locations/route.ts` - Correctly uses cursor for Meters
- `app/api/locations/search/route.ts` - Correctly uses cursor for Meters aggregation

## Query Consolidation Optimizations

### Overview

Many API routes were making multiple sequential database queries (N+1 patterns) which created unnecessary round trips. These have been consolidated into single efficient aggregation pipelines or batch queries.

### Principle

- **Single aggregation > Multiple queries**: One aggregation with `$lookup` is faster than multiple sequential queries
- **Batch queries > N+1 queries**: If we must query per-item, batch all items first, then query once
- **Start from largest collection**: For joins, start from Meters (largest) and join to smaller collections

### Optimizations Completed

#### 1. `app/api/locations/search-all/route.ts` ✅ FIXED

**Before:** N+1 pattern - 1 + 2N queries (e.g., 100 locations = 201 queries)

- Query 1: Get locations (1 query)
- For each location: Get machines (N queries)
- For each location: Get meters (N queries)

**After:** 3 batch queries regardless of location count

- Query 1: Get all locations
- Query 2: Get ALL machines for ALL locations in one query
- Query 3: Get ALL meters for ALL machines, grouped by location (with gaming day range filtering in memory)

**Performance Impact:** 201 queries → 3 queries (67x reduction for 100 locations)

#### 2. `app/api/lib/helpers/locationAggregation.ts` (Batch Path) ✅ FIXED

**Before:** N+1 pattern per batch - 2N+1 queries per batch

- Query 1: Get locations
- For each location in batch: Get machines (N queries)
- For each location in batch: Get meters (N queries)

**After:** 3 queries per batch

- Query 1: Get all locations in batch
- Query 2: Get ALL machines for ALL locations in batch
- Query 3: Get ALL meters for ALL machines, grouped by location (with gaming day range filtering in memory)

**Performance Impact:** 2N+1 queries → 3 queries per batch

#### 3. `app/api/locations/search/route.ts` ✅ FIXED

**Before:** 2 separate queries

- Query 1: Meters.aggregate() - groups by location
- Query 2: GamingLocations.aggregate() with $lookup to machines
- Then combines in memory

**After:** Single aggregation starting from Meters, joining to machines, then to locations

- Single aggregation pipeline with all data combined

**Performance Impact:** 2 queries → 1 query (2x improvement)

#### 4. `app/api/lib/helpers/locationAggregation.ts` (Licensee Prefetch) ✅ FIXED

**Before:** 2 queries

- Query 1: Get location IDs for licensee
- Query 2: Use those IDs in main query

**After:** 1 query

- Include licensee filter directly in main aggregation pipeline

**Performance Impact:** 2 queries → 1 query

#### 5. `app/api/machines/aggregation/route.ts` (Batch Path) ✅ FIXED

**Before:** N+1 pattern per batch

- For each location in batch: Get machines (N queries)
- For each location in batch: Get meters (N queries)

**After:** 2 queries per batch

- Query 1: Get ALL machines for ALL locations in batch
- Query 2: Get ALL meters for ALL machines, grouped by machine and location (with gaming day range filtering in memory)

**Performance Impact:** 2N queries → 2 queries per batch

#### 6. `app/api/lib/helpers/analytics.ts` (2 locations) ✅ FIXED

**Location 1 (Line 76):**

- **Before:** N+1 pattern - For each location, query meters
- **After:** Single aggregation for all locations, then map results

**Location 2 (Line 858):**

- **Before:** N+1 pattern - For each location, query meters
- **After:** Single aggregation for all locations, then map results

**Performance Impact:** N queries → 1 query per function

### Gaming Day Offset Handling

Since gaming day offsets vary per location, the optimized approach:

1. Get all meters for a global date range (earliest start to latest end)
2. Join to machines, then to locations
3. Filter by gaming day ranges in memory (post-processing)
4. Group by location

This balances efficiency (fewer database trips) with complexity, as the post-processing overhead is minimal compared to multiple round trips.

### Expected Performance Improvements

- **locations/search-all/route.ts**: 201 queries → 3 queries (67x reduction for 100 locations)
- **locationAggregation.ts (batch path)**: 2N+1 queries → 3 queries per batch
- **locations/search/route.ts**: 2 queries → 1 query (2x improvement)
- **locationAggregation.ts (licensee prefetch)**: 2 queries → 1 query
- **machines/aggregation/route.ts**: 2N queries → 2 queries per batch
- **analytics.ts**: N queries → 1 query (2 locations fixed)

### Files Modified

1. `app/api/locations/search-all/route.ts` - Eliminated N+1 pattern
2. `app/api/lib/helpers/locationAggregation.ts` - Eliminated N+1 pattern in batch path, removed licensee prefetch
3. `app/api/locations/search/route.ts` - Combined 2 queries into 1
4. `app/api/machines/aggregation/route.ts` - Eliminated N+1 pattern in batch path
5. `app/api/lib/helpers/analytics.ts` - Eliminated N+1 patterns (2 locations)

## Status

- Report Created: 2025-01-XX
- Last Updated: 2025-01-XX
- Cursor Optimization Issues Found: 10
- Cursor Optimization Issues Fixed: 10
- Query Consolidation Optimizations: 6 major patterns fixed
- **Status: ✅ ALL OPTIMIZATIONS COMPLETE**
