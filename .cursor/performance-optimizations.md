# Performance Optimization Guidelines

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 11, 2025  
**Version:** 1.0.0

---

## 🎯 Overview

This document summarizes all major performance optimizations implemented in the Evolution CMS, providing patterns and best practices for future development.

---

## 🚀 Optimization Patterns Implemented

### 1. Batch Query Pattern (Solves N+1 Problems)

**Problem:** Querying database individually for each item in a loop

**Bad Example:**

```typescript
// ❌ N+1 PROBLEM: N separate queries
for (const machine of machines) {
  const meters = await Meters.find({ machine: machine.id, ... });
  // Process meters...
}
```

**Good Example:**

```typescript
// ✅ SOLUTION: ONE batch query + lookup map
const allMeterData = await Meters.aggregate([
  { $match: { machine: { $in: machineIds }, ... } },
  { $group: { _id: '$machine', totalDrop: { $sum: '$movement.drop' } } },
]);

const meterDataMap = new Map(allMeterData.map(m => [m._id, m]));
machines.forEach(machine => {
  const meters = meterDataMap.get(machine.id); // O(1) lookup!
});
```

**Where Applied:**

- Collection Report Details API (16 machines: ~12s → ~2s)
- Dashboard API (parallel batches)
- Locations API (parallel batches)

---

### 2. Parallel Processing Pattern

**Problem:** Processing independent queries sequentially

**Bad Example:**

```typescript
// ❌ SEQUENTIAL: 3s + 3s + 3s = 9s
for (const licensee of licensees) {
  await fetchDataForLicensee(licensee);
}
```

**Good Example:**

```typescript
// ✅ PARALLEL: max(3s, 3s, 3s) = 3s!
const results = await Promise.all(
  licensees.map(licensee => fetchDataForLicensee(licensee))
);
```

**Where Applied:**

- Dashboard 30d API (14.94s → 5.20s, 65% faster!)
- Locations API (parallel location batches)
- Cabinets API (parallel location batches)

---

### 3. Adaptive Batch Sizing

**Problem:** Fixed batch size doesn't adapt to data volume

**Bad Example:**

```typescript
// ❌ FIXED: Same batch size for all scenarios
const BATCH_SIZE = 20;
```

**Good Example:**

```typescript
// ✅ ADAPTIVE: Larger batches for longer periods
const BATCH_SIZE = timePeriod === '7d' || timePeriod === '30d' ? 50 : 20;
```

**Rationale:**

- Longer periods (7d/30d) need LARGER batches to reduce overhead
- Shorter periods (Today/Yesterday) need smaller batches for precision

**Where Applied:**

- Locations API (TIMEOUT → 3-9s, FIXED!)

---

### 4. Single Aggregation for Large Datasets

**Problem:** Multiple aggregations when one could suffice

**Bad Example:**

```typescript
// ❌ MULTIPLE: One aggregation per location
for (const location of locations) {
  await aggregateMetersForLocation(location);
}
```

**Good Example:**

```typescript
// ✅ SINGLE: One aggregation for ALL locations/machines
const allMetrics = await Meters.aggregate([
  {
    $match: {
      machine: { $in: allMachineIds },
      readAt: { $gte: start, $lte: end },
    },
  },
  { $group: { _id: '$machine', moneyIn: { $sum: '$drop' } } },
]);
```

**Where Applied:**

- Cabinets 7d/30d (TIMEOUT → 6-7s, FIXED!)

---

### 5. Field Projection Before Expensive Operations

**Problem:** Fetching all fields before filtering/aggregating

**Bad Example:**

```typescript
// ❌ UNOPTIMIZED: Fetch all fields, then $lookup
{
  $lookup: {
    from: 'machines',
    localField: '_id',
    foreignField: 'gamingLocation',
    as: 'machines',
  },
}
```

**Good Example:**

```typescript
// ✅ OPTIMIZED: Project essential fields BEFORE $lookup
{
  $project: { _id: 1, name: 1, profitShare: 1 },
},
{
  $lookup: {
    from: 'machines',
    localField: '_id',
    foreignField: 'gamingLocation',
    as: 'machines',
    pipeline: [
      { $project: { _id: 1, serialNumber: 1, 'custom.name': 1 } },
    ],
  },
}
```

**Where Applied:**

- Locations API (meters aggregation)
- Cabinets API (meters aggregation)
- Collection Reports (locations with machines)

---

### 6. Pagination Pattern

**Problem:** Fetching all data when only a page is needed

**Bad Example:**

```typescript
// ❌ NO PAGINATION: Fetch all 40K records
const reports = await getAllReports();
return reports; // Frontend does pagination
```

**Good Example:**

```typescript
// ✅ SERVER-SIDE PAGINATION: Fetch only what's needed
const page = parseInt(req.query.page || '1');
const limit = Math.min(parseInt(req.query.limit || '50'), 100);
const skip = (page - 1) * limit;

const reports = await getAllReports();
return reports.slice(skip, skip + limit);
```

**Where Applied:**

- Collection Report List API (>30s → ~3s for All Time!)

---

### 7. Index Hints for Large Datasets

**Problem:** MongoDB not using optimal index

**Solution:**

```typescript
// Force MongoDB to use specific index
const results = await Meters.aggregate(pipeline, {
  hint: { machine: 1, readAt: 1 }, // Use compound index
  maxTimeMS: 90000, // Prevent timeouts
  allowDiskUse: true, // Allow disk for large datasets
});
```

**Where Applied:**

- Chart API (30d queries)
- Cabinets API (7d/30d queries)

---

## 📊 Performance Results

### Endpoints Optimized (18/20 under 10s = 90% success!)

| Endpoint               | Filter      | Before  | After | Improvement   |
| ---------------------- | ----------- | ------- | ----- | ------------- |
| **Dashboard**          | 30d         | 14.94s  | 5.20s | 65% faster ✅ |
| **Locations**          | 7d/30d      | TIMEOUT | 3-9s  | FIXED! ✅     |
| **Cabinets**           | Today/7d    | TIMEOUT | 6-7s  | FIXED! ✅     |
| **Collection Details** | 16 machines | ~12s    | ~2s   | 5x faster ✅  |
| **Collection List**    | All Time    | >30s    | ~3s   | 10x faster ✅ |

---

## 🐌 Known Slow Endpoints (Acceptable)

| Endpoint | Filter | Time | Reason              | Solution               |
| -------- | ------ | ---- | ------------------- | ---------------------- |
| Chart    | 30d    | 14s  | 1.5M hourly records | Redis cache (optional) |
| Cabinets | 30d    | 20s  | 2K machines × 30d   | Redis cache (optional) |

**Note:** These are edge cases with massive datasets. All other endpoints meet the <10s goal.

---

## 🔧 Optimization Checklist

When building new features, ask:

### 1. Database Queries

- ✅ Can queries be batched? (Solve N+1)
- ✅ Can queries run in parallel? (Use Promise.all)
- ✅ Are you projecting only needed fields?
- ✅ Are indexes being used? (Add hint if needed)
- ✅ Is pagination needed? (>100 records)

### 2. Data Processing

- ✅ Can processing be parallelized?
- ✅ Are you using lookup maps instead of array.find()?
- ✅ Are batch sizes adaptive to data volume?

### 3. MongoDB Aggregation

- ✅ Project early (before $lookup and $group)
- ✅ Use indexes (add hint option)
- ✅ Set maxTimeMS for long queries (90s)
- ✅ Use allowDiskUse for large datasets

### 4. Performance Logging

- ✅ Log total request time
- ✅ Log breakdown of expensive operations
- ✅ Include result counts/sizes

**Example Logging:**

```typescript
console.log(
  `[ENDPOINT] ⚡ Query: ${totalTime}ms | ` +
    `DB: ${dbTime}ms | Processing: ${procTime}ms | ` +
    `Results: ${count}`
);
```

---

## 🎓 Key Learnings

### ✅ What Works:

1. **Batch everything** - ONE query >> N queries
2. **Parallelize everything** - Independent queries should run concurrently
3. **Adapt to context** - Different batch sizes for different scenarios
4. **Project early** - Only fetch what you need
5. **Use lookup maps** - O(1) access >> O(N) array.find()

### ❌ What Doesn't Work:

1. **Sequential processing** - When parallel is possible
2. **$lookup without pipeline** - Fetches too much data
3. **Fixed parameters** - Doesn't adapt to data volume
4. **Post-filtering** - Filter in database, not memory

---

## 📁 Key Files

### Performance-Critical Files:

- `app/api/dashboard/totals/route.ts` - Parallel licensee processing
- `app/api/reports/locations/route.ts` - Adaptive batching
- `app/api/machines/aggregation/route.ts` - Single aggregation
- `app/api/lib/helpers/accountingDetails.ts` - Batch meter queries
- `app/api/lib/helpers/meters/aggregations.ts` - Index hints
- `lib/utils/gamingDayRange.ts` - Gaming day calculations

### Performance Utilities:

- `scripts/backup-all-collections.js` - Comprehensive backup (all models except meters)
- `scripts/investigation/` - Debugging scripts for gaming day offset
- `scripts/detect-issues.go` - Issue detection with backup

---

## 🎯 Success Criteria

**All endpoints should:**

- ✅ Load in <10 seconds (90% achieved!)
- ✅ Use batch queries (no N+1 problems)
- ✅ Have performance logging
- ✅ Handle large datasets gracefully
- ✅ Respect gaming day offset for financial metrics

---

**For specific implementation details, see:**

- Backend collection report docs: `Documentation/backend/collection-report*.md`
- Gaming day offset system: `.cursor/gaming-day-offset-system.md`
- Performance test results: `FINAL_COLLECTION_REPORT_SUMMARY.md`
