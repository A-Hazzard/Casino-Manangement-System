# 📋 Collection Report Performance Optimization Plan

**Date:** November 11, 2025  
**Status:** ⚠️ SLOW - Needs Optimization  
**Priority:** HIGH

---

## 🔍 Current Performance Issues

### Observed Behavior (Browser Testing):
- **Collection Report List (Today):** Loading... (>5s, still showing skeletons)
- **Collection Report Details:** Not tested yet (needs list to load first)

### APIs Involved:

**Collection Report List Page:**
1. `/api/collectionReport?timePeriod=Today` - List of all reports
2. `/api/collectionReport?locationsWithMachines=1` - For creating new reports
3. `/api/collection-reports?isEditing=true&limit=1` - Check for editing reports
4. `/api/locations` - All locations

**Collection Report Details Page:**
1. `/api/collection-report/[reportId]` - Report details
2. `/api/collections/by-report/[reportId]` - Collections for report
3. `/api/collection-report/[reportId]/check-sas-times` - SAS time issues

---

## 🐌 Identified Performance Bottlenecks

### 1. Collection Report List API (`/api/collectionReport`)

**Current Implementation:**
```typescript
// Step 1: Fetch ALL reports (potentially 40K+)
const reports = await getAllCollectionReportsWithMachineCounts(
  licencee,
  startDate,
  endDate
);

// Step 2: Filter in memory (inefficient!)
if (allowedLocationIds !== 'all') {
  // Get location names for filtering
  const allowedLocations = await db.collection('gaminglocations')
    .find({ _id: { $in: allowedLocationIds } })
    .toArray();
  
  const allowedLocationNames = allowedLocations.map(loc => loc.name);
  
  // Filter reports by location name in memory
  filteredReports = reports.filter(report => 
    allowedLocationNames.includes(report.location)
  );
}
```

**Problems:**
1. ❌ Fetches ALL reports, then filters in memory
2. ❌ Uses `$lookup` for licensee filtering (expensive)
3. ❌ No pagination - returns all filtered reports at once
4. ❌ Filters by location NAME instead of ID (requires extra query)

**Expected Impact:**
- For "All Time": Could fetch 40K+ reports → Very slow!
- For "Today": Fetches all reports, filters → Slow
- For managers/collectors: Double filtering (licensee + location) → Even slower

---

### 2. Collection Report Details API (`/api/collection-report/[reportId]`)

**Current Implementation:**
```typescript
export async function getCollectionReportById(reportId: string) {
  // Step 1: Get report
  const report = await CollectionReport.findOne({ locationReportId: reportId });
  
  // Step 2: Get collections with machine details (uses $lookup)
  const collections = await Collections.aggregate([
    { $match: { locationReportId: reportId } },
    {
      $lookup: {
        from: 'machines',
        localField: 'sasMeters.machine',
        foreignField: '_id',
        as: 'machineDetails',
      },
    },
    // ... more stages ...
  ]);
  
  // Step 3: For EACH collection, calculate SAS gross by querying meters
  machineMetrics: await Promise.all(
    collections.map(async (collection) => {
      // Query meters for SAS time period
      if (collection.sasMeters?.sasStartTime) {
        const meterData = await db.collection('meters').aggregate([...]);
        sasGross = metersInPeriod[0]?.gross || 0;
      }
      // ...
    })
  )
}
```

**Problems:**
1. ❌ Queries meters INDIVIDUALLY for each collection (N+1 problem!)
2. ❌ Uses `$lookup` which can be slow for large datasets
3. ❌ No caching - recalculates everything on each page load

**Expected Impact:**
- Report with 16 machines = 16+ meter queries → Slow!
- Report with 100+ machines = 100+ meter queries → Very slow!

---

### 3. Locations with Machines API

**Current Implementation:**
```typescript
const locationsWithMachines = await GamingLocations.aggregate([
  { $match: matchCriteria },
  {
    $lookup: {
      from: 'machines',
      localField: '_id',
      foreignField: 'gamingLocation',
      as: 'machines',
    },
  },
]);
```

**Problems:**
1. ❌ `$lookup` across ALL locations → Can be slow
2. ❌ Fetches ALL machines for each location (might not need all data)

---

## 🚀 Optimization Strategy

### Priority 1: Collection Report List API

**Optimizations:**
1. ✅ **Add pagination** (limit=50, page=1) - Don't fetch all reports at once
2. ✅ **Filter in database, not memory** - Use aggregation pipeline
3. ✅ **Filter by location ID, not name** - Avoid extra query
4. ✅ **Add indexes** - Ensure `timestamp` and `location` are indexed
5. ✅ **Optimize $lookup** - Only for licensee filter, use indexed fields

**Expected Improvement:**
- Before: Fetch all 40K reports → Filter → ~10-30s
- After: Fetch only needed 50 reports → ~1-3s (10x faster!)

### Priority 2: Collection Report Details API

**Optimizations:**
1. ✅ **Batch meter queries** - One aggregation for ALL collections
2. ✅ **Parallel processing** - Fetch report, collections, meters in parallel
3. ✅ **Optimized projection** - Only fetch needed meter fields
4. ✅ **Remove unnecessary $lookup** - Can fetch machine details separately if needed

**Expected Improvement:**
- Before: 16 sequential meter queries → ~5-10s
- After: 1 aggregated meter query → ~1-2s (5x faster!)

### Priority 3: Locations with Machines API

**Optimizations:**
1. ✅ **Optimize $lookup** - Add pipeline to filter machines
2. ✅ **Project only needed fields** - Reduce data transfer
3. ✅ **Add caching** - This data doesn't change often (5 min cache)

**Expected Improvement:**
- Before: Full $lookup for 341 locations → ~2-5s
- After: Optimized pipeline + projection → ~0.5-1s (3x faster!)

---

## 📊 Expected Results After Optimization

### Collection Report List:
| Filter | Before | After (Expected) | Improvement |
|--------|--------|------------------|-------------|
| Today | >5s | ~1-2s | 3x faster |
| Yesterday | >5s | ~1-2s | 3x faster |
| 7 Days | >10s | ~2-3s | 4x faster |
| 30 Days | >15s | ~3-5s | 4x faster |
| All Time | >30s | ~3-5s (paginated) | 10x faster |

### Collection Report Details:
| Report Size | Before | After (Expected) | Improvement |
|-------------|--------|------------------|-------------|
| Small (5-10 machines) | ~2-3s | ~0.5-1s | 3x faster |
| Medium (10-20 machines) | ~5-8s | ~1-2s | 4x faster |
| Large (50+ machines) | >15s | ~2-4s | 5x faster |

### Locations with Machines:
- Before: ~2-5s
- After: ~0.5-1s
- Improvement: 3x faster

---

## 🔧 Implementation Steps

### Step 1: Add Performance Logging (Quick Win)
```typescript
// app/api/collectionReport/route.ts
const perfStart = Date.now();
// ... query logic ...
console.log(`[COLLECTION REPORT] Fetched ${reports.length} reports in ${Date.now() - perfStart}ms`);
```

### Step 2: Implement Pagination
```typescript
// Accept page and limit parameters
const page = parseInt(searchParams.get('page') || '1');
const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
const skip = (page - 1) * limit;

// Add to aggregation pipeline
{ $skip: skip },
{ $limit: limit },

// Return with pagination metadata
return NextResponse.json({
  data: reports,
  pagination: {
    page,
    limit,
    total: totalCount,
    totalPages: Math.ceil(totalCount / limit),
  },
});
```

### Step 3: Optimize Collection Report Details

**Before:**
```typescript
machineMetrics: await Promise.all(
  collections.map(async (collection) => {
    const meterData = await db.collection('meters').aggregate([...]); // N queries!
  })
)
```

**After:**
```typescript
// ONE aggregation for ALL collections
const allMachineIds = collections.map(c => c.sasMeters?.machine).filter(Boolean);
const allMeterData = await db.collection('meters').aggregate([
  {
    $match: {
      machine: { $in: allMachineIds },
      readAt: { $gte: minStartTime, $lte: maxEndTime },
    },
  },
  {
    $group: {
      _id: { machine: '$machine' },
      gross: { $sum: { $subtract: ['$movement.drop', '$movement.totalCancelledCredits'] } },
    },
  },
]);

// Create lookup map
const meterDataMap = new Map(allMeterData.map(m => [m._id.machine, m]));

// Use map for O(1) lookups
machineMetrics: collections.map(collection => {
  const meterData = meterDataMap.get(collection.sasMeters?.machine) || { gross: 0 };
  // ...
});
```

### Step 4: Add Database Indexes
```javascript
// Collection reports
db.collectionreports.createIndex({ timestamp: -1 });
db.collectionreports.createIndex({ location: 1, timestamp: -1 });
db.collectionreports.createIndex({ locationReportId: 1 });

// Collections
db.collections.createIndex({ locationReportId: 1 });
db.collections.createIndex({ machineId: 1, timestamp: -1 });
```

---

## 📝 Notes

### Collection Reports Use Calendar Time (Not Gaming Day Offset)

**From gaming-day-offset-system.md:**
> ❌ When Gaming Day Offset Does NOT Apply
> - Collection reports - Filter by collection timestamp (uses calendar time)

**This is correct!** Collection reports should use midnight-to-midnight Trinidad time, not gaming day offset (8 AM → 8 AM). This is because collections are timestamped events, not ongoing financial metrics.

**Current Implementation:**
```typescript
// Trinidad midnight to midnight
const todayStart = new Date(trinidadNow);
todayStart.setHours(0, 0, 0, 0);
const todayEnd = new Date(trinidadNow);
todayEnd.setHours(23, 59, 59, 999);

// Convert to UTC
startDate = new Date(todayStart.getTime() + 4 * 60 * 60 * 1000);
endDate = new Date(todayEnd.getTime() + 4 * 60 * 60 * 1000);
```

✅ **This is CORRECT!** No changes needed for date calculation logic.

---

## ✅ Implementation Priority

1. **HIGH:** Add performance logging to identify actual bottlenecks
2. **HIGH:** Implement pagination for list API
3. **HIGH:** Batch meter queries in details API  
4. **MEDIUM:** Add database indexes
5. **MEDIUM:** Optimize $lookup in locations with machines
6. **LOW:** Add caching (if needed after above optimizations)

---

## 🎯 Success Criteria

**After optimization:**
- ✅ Collection Report List (Today): <3s
- ✅ Collection Report List (30d): <5s
- ✅ Collection Report Details: <3s for typical reports
- ✅ Locations with Machines: <1s
- ✅ All endpoints under 10s (meets performance goal)

---

**Next Steps:** 
1. Add performance logging to baseline current performance
2. Implement optimizations in order of priority
3. Test with browser to verify improvements
4. Commit and push optimizations

