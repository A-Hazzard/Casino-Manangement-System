# Location API Performance Optimization

## Overview

This document describes the performance optimizations applied to the `/api/reports/locations` endpoint to significantly improve query speed.

## Problem

The original implementation had severe performance issues:

1. **N+1 Query Problem**: Sequential loops making 2-3 database queries per location
   - For 100 locations = 200-300 database queries!
2. **Missing Database Indexes**: No indexes on frequently queried fields
3. **Sequential Processing**: Locations processed one at a time instead of in parallel

**Result**: Queries taking 10-30+ seconds for large datasets

## Solution

### 1. Database Indexes ✅

Added critical indexes to speed up queries:

```javascript
// Machines collection
db.machines.createIndex({ gamingLocation: 1 })
db.machines.createIndex({ gamingLocation: 1, deletedAt: 1 })
db.machines.createIndex({ lastActivity: 1 })

// Meters collection  
db.meters.createIndex({ machine: 1, readAt: 1 })  // PRIMARY performance index
db.meters.createIndex({ readAt: 1 })
db.meters.createIndex({ machine: 1 })

// Gaming Locations collection
db.gaminglocations.createIndex({ 'rel.licencee': 1 })
db.gaminglocations.createIndex({ deletedAt: 1 })
db.gaminglocations.createIndex({ name: 1 })
```

**Expected Improvement**: 5-20x faster queries

### 2. Parallel Batch Processing ✅

Replaced sequential `for` loop with parallel batch processing:

```typescript
// OLD: Sequential processing
for (const location of locations) {
  const machines = await getMachines(location);
  const metrics = await getMetrics(machines);
  // Process one at a time - SLOW!
}

// NEW: Parallel batch processing
const BATCH_SIZE = 20;
for (let i = 0; i < locations.length; i += BATCH_SIZE) {
  const batch = locations.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(async (location) => {
      // Process 20 locations in parallel - FAST!
      const [machines, metrics] = await Promise.all([
        getMachines(location),
        getMetrics(location)
      ]);
      return processLocation(machines, metrics);
    })
  );
}
```

**Expected Improvement**: 3-5x faster processing

### 3. Comprehensive Performance Logging ✅

Added detailed performance metrics to track:
- Database connection time
- Authentication time
- Location fetch time
- Gaming day range calculation
- Location processing time (with batch details)
- Sort & pagination time
- Currency conversion time
- **Total request time**

The API now returns performance data in the response:

```json
{
  "data": [...],
  "pagination": {...},
  "performance": {
    "totalTime": 1234,
    "breakdown": {
      "dbConnect": 45,
      "auth": 23,
      "fetchLocations": 156,
      "gamingDayRanges": 12,
      "processing": 890,
      "sortAndPaginate": 8,
      "currencyConversion": 100
    },
    "locationsProcessed": 100,
    "avgTimePerLocation": 8.9
  }
}
```

Console output shows detailed breakdown:

```
================================================================================
⚡ PERFORMANCE SUMMARY
================================================================================
Total Request Time: 1234ms

Breakdown:
  🔌 DB Connection:      45ms (3.6%)
  🔐 Authentication:     23ms (1.9%)
  📍 Fetch Locations:    156ms (12.6%)
  📅 Gaming Day Ranges:  12ms (1.0%)
  ⚙️  Process Locations:  890ms (72.1%)
  📊 Sort & Paginate:    8ms (0.6%)
  💱 Currency Convert:   100ms (8.1%)

Metrics:
  📍 Locations Processed: 100
  📄 Results Returned:    100
  ⚡ Avg Time/Location:  8.90ms
  🚀 Throughput:         81.04 locations/sec
================================================================================
```

## Installation & Usage

### Step 1: Run Index Migration

**IMPORTANT**: Run this migration script to create the necessary database indexes:

```bash
cd scripts/migrations
node add-performance-indexes.js
```

This creates all required indexes in the background. The script is safe to run multiple times (it will skip existing indexes).

### Step 2: Deploy Updated API

The optimized API code is in `app/api/reports/locations/route.ts` and is immediately active once deployed.

### Step 3: Monitor Performance

Check the server logs to see the performance summary for each request. Look for:
- Total request time
- Breakdown by operation
- Average time per location
- Throughput (locations/sec)

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **100 locations** | 15-30s | 1-3s | **10-30x faster** |
| **50 locations** | 8-15s | 0.5-1.5s | **15-20x faster** |
| **20 locations** | 3-6s | 0.3-0.8s | **10-15x faster** |

Actual performance depends on:
- Database server load
- Network latency
- Number of machines per location
- Meter data volume

## Key Optimizations

1. ✅ **Indexes Created**: 9 new indexes across 3 collections
2. ✅ **Parallel Processing**: 20 locations processed simultaneously
3. ✅ **Query Optimization**: Machines & meters fetched in parallel per location
4. ✅ **Performance Logging**: Comprehensive timing metrics
5. ✅ **Batch Processing**: Prevents memory overflow on large datasets

## Monitoring & Troubleshooting

### Check Index Status

```javascript
// In MongoDB shell
db.machines.getIndexes()
db.meters.getIndexes()
db.gaminglocations.getIndexes()
```

### If Performance Issues Persist

1. **Check index usage**:
   ```javascript
   db.meters.find({ machine: "123", readAt: { $gte: date } }).explain("executionStats")
   ```
   Look for `IXSCAN` (good) vs `COLLSCAN` (bad - missing index)

2. **Monitor batch size**: Adjust `BATCH_SIZE` in the code (line 227)
   - Lower if running out of memory
   - Higher if you have good DB performance

3. **Check server logs**: Look for the performance summary to identify bottlenecks

## Future Optimizations (Not Implemented)

These could provide additional improvements:

1. **Redis Caching**: Cache results for 5-10 minutes
   - Expected improvement: Instant for cached requests
   - Complexity: Requires Redis setup

2. **Single Aggregation Pipeline**: Merge all queries into one MongoDB aggregation
   - Expected improvement: Additional 2-3x faster
   - Complexity: High (gaming day offset per location makes this tricky)

3. **Database Sharding**: For very large deployments (1000+ locations)
   - Expected improvement: Horizontal scaling
   - Complexity: Very high

## Notes

- Indexes are created in the background and won't block database operations
- Index creation may take a few minutes for large collections (millions of documents)
- The optimized code maintains 100% backward compatibility
- Performance metrics are included in the API response for monitoring

