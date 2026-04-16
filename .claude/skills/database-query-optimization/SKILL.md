---
name: Database Query Optimization
description: Use .cursor() for Meters, direct location field access, eliminate N+1 patterns, handle gaming day offsets.
---

# Database Query Optimization

Use when **querying the Meters collection or optimizing aggregation pipelines**.

## CRITICAL: Cursor Usage for Meters

**MANDATORY for all `Meters.aggregate()` calls:**

```typescript
// ✅ CORRECT - Use cursor with batchSize
const results: Array<Record<string, unknown>> = [];
const cursor = Meters.aggregate(pipeline, {
  allowDiskUse: true,
  maxTimeMS: 120000,
}).cursor({ batchSize: 1000 });

for await (const doc of cursor) {
  results.push(doc as Record<string, unknown>);
}

// ❌ INCORRECT - Don't use exec()
const results = await Meters.aggregate(pipeline).exec();
```

**Why:**
- Prevents loading large result sets into memory
- 10-20x faster for 7d/30d periods
- Reduces memory usage and prevents timeouts

## Direct Location Field Access

**MANDATORY: Use `location` field directly instead of `$lookup`**

```typescript
// ✅ CORRECT - Direct location field (uses index, fast)
const pipeline: PipelineStage[] = [
  {
    $match: {
      location: { $in: allLocationIds }, // Direct field access
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $group: {
      _id: '$location', // Group by location field directly
      totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
      totalCancelled: { $sum: '$movement.totalCancelledCredits' },
    },
  },
];

const results = await Meters.aggregate(pipeline)
  .cursor({ batchSize: 1000 });

// ❌ INCORRECT - Expensive $lookup operation
const pipeline: PipelineStage[] = [
  { $match: { machine: { $in: allMachineIds } } },
  {
    $lookup: {
      from: 'machines',
      localField: 'machine',
      foreignField: '_id',
      as: 'machineDetails',
    },
  }, // Very expensive!
  { $unwind: '$machineDetails' },
  {
    $addFields: { locationId: '$machineDetails.gamingLocation' },
  },
  {
    $group: { _id: '$locationId', totalDrop: { $sum: '$movement.drop' } },
  }, // Much slower!
];
```

**Performance Impact:**
- Before: 31+ seconds with `$lookup`
- After: 5-10 seconds with direct location field
- **10-20x faster improvement**

## Eliminate N+1 Queries

**WRONG: Sequential queries in loop**

```typescript
// ❌ INCORRECT - N+1 pattern
for (const location of locations) {
  const machines = await Machine.find({ gamingLocation: location._id });
  const metrics = await Meters.aggregate([...]);
  // This runs queries for EVERY location = slow!
}
```

**CORRECT: Batch queries**

```typescript
// ✅ CORRECT - Batch all at once
const allLocationIds = locations.map((loc) => loc._id);

const allMachines = await Machine.find({
  gamingLocation: { $in: allLocationIds },
}).lean();

const machinesByLocation = new Map();
for (const machine of allMachines) {
  if (!machinesByLocation.has(machine.gamingLocation)) {
    machinesByLocation.set(machine.gamingLocation, []);
  }
  machinesByLocation.get(machine.gamingLocation).push(machine);
}

// Single aggregation query
const allMetrics = await Meters.aggregate(pipeline)
  .cursor({ batchSize: 1000 });

// Combine results in memory
for await (const metric of allMetrics) {
  const machines = machinesByLocation.get(metric._id);
  // Use combined data
}
```

## Gaming Day Offset Handling

**For per-location gaming day offsets:**

1. Calculate global date range (earliest start, latest end)
2. Aggregate globally using wide date range
3. Filter in memory by location-specific gaming day ranges

```typescript
// Step 1: Calculate global range
const gamingDayRanges = new Map();
for (const location of locations) {
  const offset = location.gameDayOffset ?? 8;
  const range = getGamingDayRangeForPeriod('Today', offset);
  gamingDayRanges.set(String(location._id), range);
}

// Get min and max for global query
const allRanges = Array.from(gamingDayRanges.values());
const globalStart = new Date(Math.min(...allRanges.map((r) => r.rangeStart.getTime())));
const globalEnd = new Date(Math.max(...allRanges.map((r) => r.rangeEnd.getTime())));

// Step 2: Global aggregation with wide range
const pipeline: PipelineStage[] = [
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
      minReadAt: { $min: '$readAt' },
      maxReadAt: { $max: '$readAt' },
    },
  },
];

// Step 3: Filter in memory by gaming day ranges
const results = new Map();
const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });

for await (const agg of cursor) {
  const gamingDayRange = gamingDayRanges.get(String(agg._id));
  const hasOverlap =
    agg.minReadAt <= gamingDayRange.rangeEnd &&
    agg.maxReadAt >= gamingDayRange.rangeStart;

  if (hasOverlap) {
    results.set(agg._id, agg);
  }
}
```

## Aggregation Pipeline Pattern

```typescript
const pipeline: PipelineStage[] = [
  // ============================================================================
  // Stage 1: Match documents by date and location
  // ============================================================================
  {
    $match: {
      location: { $in: locationIds },
      readAt: { $gte: startDate, $lte: endDate },
    },
  },

  // ============================================================================
  // Stage 2: Group by location
  // ============================================================================
  {
    $group: {
      _id: '$location',
      totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
      totalCancelled: { $sum: '$movement.totalCancelledCredits' },
      count: { $sum: 1 },
    },
  },

  // ============================================================================
  // Stage 3: Sort results
  // ============================================================================
  {
    $sort: { totalDrop: -1 },
  },
];

// Execute with cursor
const results: Array<Record<string, unknown>> = [];
const cursor = Meters.aggregate(pipeline, {
  allowDiskUse: true,
  maxTimeMS: 120000,
}).cursor({ batchSize: 1000 });

for await (const doc of cursor) {
  results.push(doc as Record<string, unknown>);
}
```

## Performance Targets

- **7d period**: <10 seconds (target: 5-10s)
- **30d period**: <15 seconds (target: 10-15s)
- **No timeouts**: All queries complete within maxTimeMS
- **Memory efficient**: Use cursors to prevent memory issues

## Query Checklist

- ✅ Using `.cursor({ batchSize: 1000 })` for Meters
- ✅ Using `location` field directly (no $lookup)
- ✅ Batch queries instead of loops
- ✅ No N+1 query patterns
- ✅ Gaming day offsets applied correctly
- ✅ `allowDiskUse: true` for large aggregations
- ✅ `maxTimeMS` set appropriately
- ✅ Proper error handling
- ✅ Results combined in memory when needed
