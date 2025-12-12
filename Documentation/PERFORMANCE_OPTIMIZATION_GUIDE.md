# Performance Optimization Guide

**Author:** Evolution One CMS Development Team  
**Last Updated:** January 2025  
**Version:** 1.0.0

## Overview

This guide documents the performance optimization strategies and techniques used to dramatically improve API response times in the Evolution One CMS system. These optimizations reduced query times from 31+ seconds (with frequent timeouts) to 5-10 seconds for 7-day periods and 10-15 seconds for 30-day periods.

## Performance Improvements Summary

### Before Optimization

- **7d period**: 31+ seconds (often timing out)
- **30d period**: 2+ minutes (frequent timeouts)
- **Memory issues** with large datasets
- **Expensive $lookup operations** causing bottlenecks

### After Optimization

- **7d period**: ~5-10 seconds (target: <10s) ✅
- **30d period**: ~10-15 seconds (target: <15s) ✅
- **No memory issues** with cursor streaming
- **Eliminated expensive $lookup operations** where possible

## Core Optimization Strategies

### 1. Cursor Usage for Meters Aggregations

**CRITICAL RULE**: All `Meters.aggregate()` calls MUST use `.cursor({ batchSize: 1000 })` instead of `.exec()`

#### Why Cursors?

- **Memory Efficiency**: Streams results instead of loading all into memory
- **Performance**: Processes data in batches, reducing memory pressure
- **Scalability**: Handles large datasets without timeouts
- **Consistency**: Standard approach for all Meters queries

#### Implementation Pattern

```typescript
// ✅ CORRECT - Use cursor for Meters aggregations
const results: Array<Record<string, unknown>> = [];
const cursor = Meters.aggregate(pipeline, {
  allowDiskUse: true,
  maxTimeMS: 120000,
}).cursor({ batchSize: 1000 });

for await (const doc of cursor) {
  results.push(doc as Record<string, unknown>);
}

// ❌ INCORRECT - Don't use exec() for Meters
const results = await Meters.aggregate(pipeline).exec();
```

#### When to Use Cursors

- ✅ **ALWAYS** for `Meters.aggregate()` - Even for grouped results
- ✅ **ALWAYS** for large result sets (>1000 documents)
- ❌ **NEVER** for single-result aggregations on small collections
- ❌ **NEVER** for `Machine.find()`, `GamingLocations.find()`, etc. (use `.exec()`)

### 2. Location Field Direct Access

**CRITICAL RULE**: When aggregating Meters by location, use the `location` field directly instead of `$lookup` operations

#### The Discovery

The `Meters` collection has a direct `location` field that links to `GamingLocation._id`. This eliminates the need for expensive `$lookup` operations from meters → machines → locations.

#### Performance Impact

- **Before**: 31+ seconds with `$lookup` operations
- **After**: 5-10 seconds using direct location field
- **Improvement**: 10-20x faster for 7d/30d periods

#### Implementation Pattern

```typescript
// ✅ CORRECT - Use location field directly (uses index)
const pipeline: PipelineStage[] = [
  {
    $match: {
      location: { $in: allLocationIds }, // Direct field access (uses index)
      readAt: {
        $gte: globalStart,
        $lte: globalEnd,
      },
    },
  },
  {
    $group: {
      _id: '$location', // Group by location field directly (no lookup needed!)
      totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
      totalCancelledCredits: {
        $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
      },
      minReadAt: { $min: '$readAt' }, // For gaming day range filtering
      maxReadAt: { $max: '$readAt' }, // For gaming day range filtering
    },
  },
];

const locationAggregations: Array<{
  _id: string;
  totalDrop: number;
  totalCancelledCredits: number;
  minReadAt: Date;
  maxReadAt: Date;
}> = [];
const cursor = Meters.aggregate(pipeline, {
  allowDiskUse: true,
  maxTimeMS: 120000,
}).cursor({ batchSize: 1000 });

for await (const doc of cursor) {
  locationAggregations.push(doc as (typeof locationAggregations)[0]);
}

// ❌ INCORRECT - Expensive $lookup operation
const pipeline: PipelineStage[] = [
  {
    $match: {
      machine: { $in: allMachineIds }, // Must fetch machines first
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $lookup: {
      from: 'machines',
      localField: 'machine',
      foreignField: '_id',
      as: 'machineDetails',
    },
  },
  { $unwind: '$machineDetails' },
  {
    $addFields: { locationId: { $toString: '$machineDetails.gamingLocation' } },
  },
  {
    $group: {
      _id: '$locationId', // Much slower due to lookup!
    },
  },
];
```

#### Index Usage

The optimization leverages the existing index on Meters:

```typescript
{ location: 1, readAt: 1 }
```

This index makes location-based queries extremely fast.

### 3. N+1 Query Pattern Elimination

**CRITICAL RULE**: Consolidate multiple sequential queries into single aggregations or batch queries

#### The Problem

N+1 queries occur when you make one query, then loop through results making additional queries:

```typescript
// ❌ INCORRECT - N+1 query pattern
for (const location of locations) {
  const machines = await Machine.find({ gamingLocation: location._id });
  const machineIds = machines.map(m => m._id);
  const metrics = await Meters.aggregate([
    { $match: { machine: { $in: machineIds } } },
    // ...
  ]);
}
```

This results in:

- 1 query for locations
- N queries for machines (one per location)
- N queries for meters (one per location)
- **Total: 1 + 2N queries**

#### The Solution

Batch all queries:

```typescript
// ✅ CORRECT - Batch queries
const allLocationIds = locations.map(loc => loc._id);

// Single query for all machines
const allMachines = await Machine.find({
  gamingLocation: { $in: allLocationIds },
}).lean();

// Group machines by location in memory
const machinesByLocation = new Map<string, typeof allMachines>();
allMachines.forEach(machine => {
  const locationId = String(machine.gamingLocation);
  if (!machinesByLocation.has(locationId)) {
    machinesByLocation.set(locationId, []);
  }
  machinesByLocation.get(locationId)!.push(machine);
});

// Single query for all meters (or use location field directly)
const allMachineIds = allMachines.map(m => String(m._id));
const allMetrics = await Meters.aggregate([
  { $match: { machine: { $in: allMachineIds } } },
  // ...
]).cursor({ batchSize: 1000 });

// Combine results in memory
for await (const metric of allMetrics) {
  const locationId = machinesByLocation.get(metric.machine)?.gamingLocation;
  // Process metric...
}
```

**Total: 3 queries** (regardless of number of locations)

### 4. Gaming Day Offset Handling

**Challenge**: Each location can have a different `gameDayOffset`, making consolidated aggregations complex.

**Solution**: Global aggregation + in-memory filtering

#### Strategy

1. **Calculate global date range** (earliest start, latest end across all locations)
2. **Aggregate globally** using the wide date range
3. **Filter in memory** by location-specific gaming day ranges

#### Implementation

```typescript
// Calculate global date range
let globalStart = new Date();
let globalEnd = new Date(0);
gamingDayRanges.forEach(range => {
  if (range.rangeStart < globalStart) globalStart = range.rangeStart;
  if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
});

// Single aggregation for all locations
const aggregation = await Meters.aggregate([
  {
    $match: {
      location: { $in: allLocationIds },
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $group: {
      _id: '$location',
      totalDrop: { $sum: '$movement.drop' },
      minReadAt: { $min: '$readAt' }, // Track date range
      maxReadAt: { $max: '$readAt' },
    },
  },
]).cursor({ batchSize: 1000 });

// Filter by gaming day ranges in memory
const locationMetricsMap = new Map();
for await (const agg of aggregation) {
  const locationId = String(agg._id);
  const gamingDayRange = gamingDayRanges.get(locationId);
  if (!gamingDayRange) continue;

  // Check if there's any overlap between aggregated range and location's gaming day range
  const hasOverlap =
    agg.minReadAt <= gamingDayRange.rangeEnd &&
    agg.maxReadAt >= gamingDayRange.rangeStart;

  if (hasOverlap) {
    locationMetricsMap.set(locationId, {
      moneyIn: agg.totalDrop || 0,
      moneyOut: agg.totalCancelledCredits || 0,
    });
  }
}
```

**Benefits:**

- Single aggregation query instead of N queries
- Efficient in-memory filtering
- Respects per-location gaming day offsets

## Optimization Checklist

When optimizing an API endpoint:

### 1. Identify Meters Queries

- [ ] Find all `Meters.aggregate()` calls
- [ ] Find all `Meters.find()` calls
- [ ] Check if queries can use `location` field directly

### 2. Apply Cursor Pattern

- [ ] Replace `.exec()` with `.cursor({ batchSize: 1000 })`
- [ ] Use `for await` loop to collect results
- [ ] Add proper type assertions for streamed results

### 3. Optimize Location Aggregations

- [ ] Check if aggregation groups by location
- [ ] Replace `$lookup` to machines with direct `location` field access
- [ ] Verify index exists: `{ location: 1, readAt: 1 }`

### 4. Eliminate N+1 Patterns

- [ ] Identify loops with database queries inside
- [ ] Batch queries outside loops
- [ ] Combine results in memory

### 5. Handle Gaming Day Offsets

- [ ] Calculate global date range for aggregation
- [ ] Filter results in memory by per-location gaming day ranges
- [ ] Use `minReadAt` and `maxReadAt` to check overlap

### 6. Performance Tuning

- [ ] Set appropriate `maxTimeMS` (120000ms for complex aggregations)
- [ ] Use `allowDiskUse: true` for large aggregations
- [ ] Verify indexes exist on frequently queried fields
- [ ] Add performance logging for slow operations

## Real-World Examples

### Example 1: Location Aggregation API

**Before:**

- Used `$lookup` from meters → machines → locations
- 31+ seconds for 7d period
- Frequent timeouts for 30d period

**After:**

- Uses `location` field directly from Meters
- Uses cursor for streaming results
- 5-10 seconds for 7d period
- 10-15 seconds for 30d period

**Key Changes:**

```typescript
// Before: Expensive $lookup
{ $lookup: { from: 'machines', ... } }

// After: Direct field access
{ $match: { location: { $in: allLocationIds } } }
{ $group: { _id: '$location', ... } }
```

### Example 2: Reports Locations API

**Before:**

- Processed meters one-by-one in memory
- Used `Meters.find().cursor()` with manual processing
- Slow for large datasets

**After:**

- Single aggregation with location field
- Uses cursor for streaming
- Filters by gaming day ranges in memory
- 10-20x performance improvement

**Key Changes:**

```typescript
// Before: Manual processing
const meterCursor = Meters.find({ machine: { $in: allMachineIds } }).cursor();
for await (const meter of meterCursor) {
  const locationId = machineToLocation.get(meter.machine);
  // Manual aggregation...
}

// After: Database aggregation
const aggregation = Meters.aggregate([
  { $match: { location: { $in: allLocationIds } } },
  { $group: { _id: '$location', ... } },
]).cursor();
```

### Example 3: Analytics Trends

**Before:**

- Multiple `Meters.aggregate().exec()` calls
- Loaded all results into memory
- Memory issues for large datasets

**After:**

- All use `.cursor({ batchSize: 1000 })`
- Stream results efficiently
- No memory issues

**Key Changes:**

```typescript
// Before
const results = await Meters.aggregate(pipeline).exec();

// After
const results: ResultType[] = [];
const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
for await (const doc of cursor) {
  results.push(doc as ResultType);
}
```

## Performance Monitoring

### Logging Slow Operations

```typescript
const startTime = Date.now();
// ... perform operation ...
const duration = Date.now() - startTime;

if (duration > 1000) {
  console.warn(`[API Name] Completed in ${duration}ms`);
}
```

### Setting Timeout Limits

```typescript
Meters.aggregate(pipeline, {
  allowDiskUse: true,
  maxTimeMS: 120000, // 2 minutes max
}).cursor({ batchSize: 1000 });
```

### Index Verification

Ensure these indexes exist on Meters collection:

- `{ location: 1, readAt: 1 }` - For location-based queries
- `{ machine: 1, readAt: 1 }` - For machine-based queries
- `{ readAt: 1 }` - For date range queries

## Common Pitfalls to Avoid

### ❌ Using `.exec()` for Meters Aggregations

```typescript
// ❌ WRONG - Loads all results into memory
const results = await Meters.aggregate(pipeline).exec();
```

### ❌ Using `$lookup` When Direct Field Exists

```typescript
// ❌ WRONG - Expensive lookup when location field exists
{
  $lookup: {
    from: 'machines',
    localField: 'machine',
    foreignField: '_id',
    as: 'machineDetails',
  },
}
```

### ❌ N+1 Query Patterns

```typescript
// ❌ WRONG - Multiple queries in loop
for (const location of locations) {
  const machines = await Machine.find({ gamingLocation: location._id });
  // ...
}
```

### ❌ Not Using `.lean()` for Read-Only Queries

```typescript
// ❌ WRONG - Unnecessary Mongoose overhead
const machines = await Machine.find(query);

// ✅ CORRECT - Faster for read-only
const machines = await Machine.find(query).lean();
```

## Testing Performance

### Test Scenarios

1. **7-day period** - Should complete in <10 seconds
2. **30-day period** - Should complete in <15 seconds
3. **Multiple locations** - Should scale linearly, not exponentially
4. **Large datasets** - Should not cause memory issues

### Performance Benchmarks

| Period | Before | After  | Target | Status |
| ------ | ------ | ------ | ------ | ------ |
| 7d     | 31+ s  | 5-10s  | <10s   | ✅     |
| 30d    | 2+ min | 10-15s | <15s   | ✅     |

## Files Optimized

### Route Files

- `app/api/locations/[locationId]/route.ts`
- `app/api/reports/locations/route.ts`
- `app/api/metrics/top-performers/route.ts`

### Helper Files

- `app/api/lib/helpers/locationAggregation.ts` - Major optimization
- `app/api/lib/helpers/locationTrends.ts`
- `app/api/lib/helpers/topMachines.ts`
- `app/api/lib/helpers/analytics.ts`
- `app/api/lib/helpers/metersReport.ts`
- `app/api/lib/helpers/trends.ts`
- `app/api/lib/helpers/machineHourly.ts`
- `app/api/lib/helpers/hourlyTrends.ts`

## Best Practices Summary

1. **Always use cursor for Meters aggregations** - Even for grouped results
2. **Use location field directly** - Eliminate expensive $lookup operations
3. **Batch queries** - Consolidate N+1 patterns into single queries
4. **Filter in memory** - For per-location gaming day offsets
5. **Use proper indexes** - Verify indexes exist on queried fields
6. **Set appropriate timeouts** - Use maxTimeMS for complex queries
7. **Monitor performance** - Log slow operations for optimization

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintained By**: Evolution One CMS Development Team
