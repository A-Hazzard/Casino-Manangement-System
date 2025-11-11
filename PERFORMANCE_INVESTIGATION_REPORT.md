# 🚨 Critical Performance Issues Identified

## Test Date: November 11, 2025

---

## 🔴 CRITICAL ISSUES (Timeouts)

### Cabinets API - `/api/machines/aggregation`
| Filter | Load Time | Status |
|--------|-----------|--------|
| Today | **TIMEOUT** (60s+) | ❌ FAILED |
| Yesterday | **59.5s** | 🐌 EXTREMELY SLOW |
| 7 Days | **TIMEOUT** (60s+) | ❌ FAILED |
| 30 Days | **TIMEOUT** (60s+) | ❌ FAILED |

**Issue:** This endpoint is completely unusable. Even when it doesn't timeout, it takes almost a full minute.

**Impact:** Users cannot view the cabinets page at all.

---

## 🟡 SLOW ENDPOINTS (>10s)

### Dashboard API - `/api/dashboard/totals`
| Filter | Load Time | Goal | Status |
|--------|-----------|------|--------|
| Today | 8.5s | <10s | ⚠️ BORDERLINE |
| Yesterday | 7.3s | <10s | ⚠️ BORDERLINE |
| 7 Days | 8.5s | <10s | ⚠️ BORDERLINE |
| **30 Days** | **15.1s** | <10s | 🐌 **EXCEEDS GOAL** |

### Chart API - `/api/metrics/meters`
| Filter | Load Time | Goal | Status |
|--------|-----------|------|--------|
| Today | 1.1s | <10s | ✅ GOOD |
| Yesterday | 1.0s | <10s | ✅ GOOD |
| 7 Days | 3.6s | <10s | ✅ OK |
| **30 Days** | **13.7s** | <10s | 🐌 **EXCEEDS GOAL** |

### Locations API - `/api/reports/locations`
| Filter | Load Time | Goal | Status |
|--------|-----------|------|--------|
| Today | 6.3s | <10s | ⚠️ BORDERLINE |
| Yesterday | 5.2s | <10s | ⚠️ BORDERLINE |
| 7 Days | 6.8s | <10s | ⚠️ BORDERLINE |
| **30 Days** | **13.2s** | <10s | 🐌 **EXCEEDS GOAL** |

---

## ✅ GOOD PERFORMANCE

### Locations with Licensee Filter
| Filter | Load Time | Status |
|--------|-----------|--------|
| Today + TTG | 183ms | ✅ EXCELLENT |
| 7d + TTG | 193ms | ✅ EXCELLENT |

**Note:** When filtered by licensee, locations load in ~200ms. This proves the issue is with "All Licensees" queries processing too much data.

---

## 🎯 Performance Goals vs Actual

| Endpoint | Today | Yesterday | 7d | 30d | Goal |
|----------|-------|-----------|-----|-----|------|
| **Dashboard** | 8.5s ⚠️ | 7.3s ⚠️ | 8.5s ⚠️ | 15.1s 🐌 | <10s |
| **Chart** | 1.1s ✅ | 1.0s ✅ | 3.6s ✅ | 13.7s 🐌 | <10s |
| **Locations** | 6.3s ⚠️ | 5.2s ⚠️ | 6.8s ⚠️ | 13.2s 🐌 | <10s |
| **Cabinets** | TIMEOUT ❌ | 59.5s 🐌 | TIMEOUT ❌ | TIMEOUT ❌ | <10s |

---

## 🔍 Root Cause Analysis

### Problem Pattern:
1. **All endpoints slow down with "30d" filter** - Processing too many meter records
2. **Cabinets API is completely broken** - Likely N+1 query problem or missing indexes
3. **Dashboard "All Licensees"** takes 8-15s, but **single licensee** takes <200ms
4. **Pattern:** More time periods = exponentially slower

### Likely Causes:

#### 1. Cabinets API (`/api/machines/aggregation`)
- **Problem:** Timing out completely
- **Likely cause:** 
  - Fetching ALL machines (~1000+) and ALL their meter data
  - N+1 queries (fetching meters for each machine individually)
  - No aggregation pipeline - doing everything in application code
  - Missing indexes on critical fields

#### 2. Dashboard API (`/api/dashboard/totals`)
- **Problem:** 8-15s depending on time period
- **Already optimized:** Uses parallel batch processing (we added this earlier)
- **Remaining issue:** Still processing ALL 341 locations
- **Potential fix:** Aggregate at database level instead of fetching + processing

#### 3. Chart/Meters API (`/api/metrics/meters`)
- **Problem:** 13.7s for 30 days
- **Already optimized:** Uses direct aggregation (we added this earlier)
- **Remaining issue:** 30 days = more data points to aggregate
- **Potential fix:** Pre-aggregate by day instead of by hour for 30d

#### 4. Locations API (`/api/reports/locations`)
- **Problem:** 6-13s depending on time period
- **Already optimized:** Uses parallel batch processing (we added this earlier)
- **Remaining issue:** Still processing 341 locations with nested queries
- **Potential fix:** Single aggregation pipeline instead of parallel batches

---

## 🎯 Recommended Solutions (Priority Order)

### 1. 🔥 URGENT: Fix Cabinets API (CRITICAL)
**Current:** Timeout (unusable)  
**Goal:** <10s  
**Solution:** Complete rewrite with aggregation pipeline

**Approach:**
```typescript
// Single aggregation pipeline instead of fetching machines + meters separately
db.collection('machines').aggregate([
  { $match: { /* filter criteria */ } },
  { $lookup: {
      from: 'meters',
      localField: '_id',
      foreignField: 'machine',
      as: 'meterData',
      pipeline: [
        { $match: { readAt: { $gte: startDate, $lte: endDate } } },
        { $group: { /* aggregate metrics */ } }
      ]
    }
  },
  { $project: { /* shape output */ } }
])
```

**Expected improvement:** Timeout → <5s

### 2. 🔥 HIGH: Optimize Dashboard for 30d
**Current:** 15.1s  
**Goal:** <10s  
**Solution:** Use single aggregation instead of parallel batches

**Approach:**
```typescript
// Instead of: Fetch 341 locations, then fetch machines/meters for each (parallel batches)
// Do: Single aggregation across gaminglocations → machines → meters
db.collection('gaminglocations').aggregate([
  { $match: { /* licensee filter */ } },
  { $lookup: { from: 'machines', /* ... */ } },
  { $lookup: { from: 'meters', /* ... */ } },
  { $group: { /* sum totals */ } }
])
```

**Expected improvement:** 15.1s → ~5-7s

### 3. MEDIUM: Optimize Chart for 30d
**Current:** 13.7s  
**Goal:** <10s  
**Solution:** Daily aggregation for 30d (hourly only for Today/Yesterday)

**Approach:**
```typescript
if (timePeriod === '30d' || timePeriod === '7d') {
  // Aggregate by DAY only (not hour)
  groupBy = { day: { $dateToString: { date: '$readAt', format: '%Y-%m-%d' } } }
} else {
  // Aggregate by HOUR for Today/Yesterday
  groupBy = { day: '...', hour: '...' }
}
```

**Expected improvement:** 13.7s → ~6-8s

### 4. MEDIUM: Optimize Locations for 30d
**Current:** 13.2s  
**Goal:** <10s  
**Solution:** Single aggregation pipeline

**Expected improvement:** 13.2s → ~6-8s

---

## 💡 Alternative: Redis Caching (If aggregation not enough)

**Use ONLY if aggregation optimization doesn't get us to <10s**

**What to cache:**
- Dashboard totals (by timePeriod + licensee + currency)
- Chart data (by timePeriod + licensee)
- Locations list (by timePeriod + licensee)
- Cabinets list (by timePeriod + licensee)

**Cache invalidation:**
- On new collection creation
- On collection edit/delete
- Or: Time-based (5 minute TTL)

**Implementation:**
```typescript
// Check cache first
const cacheKey = `dashboard:${timePeriod}:${licensee}:${currency}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// If not cached, fetch from DB
const data = await fetchFromDatabase();

// Cache for 5 minutes
await redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
return data;
```

---

## 📋 Action Plan

### Phase 1: Cabinets API (CRITICAL - DO FIRST)
1. Investigate current implementation
2. Rewrite with single aggregation pipeline
3. Add proper indexes
4. Test performance
5. **Goal:** Timeout → <5s

### Phase 2: Dashboard 30d (HIGH)
1. Convert to single aggregation
2. Test performance
3. **Goal:** 15s → <10s

### Phase 3: Chart 30d (MEDIUM)
1. Use daily aggregation for 30d
2. Test performance
3. **Goal:** 13.7s → <10s

### Phase 4: Locations 30d (MEDIUM)
1. Convert to single aggregation
2. Test performance
3. **Goal:** 13.2s → <10s

### Phase 5: Redis (IF NEEDED)
1. Implement caching layer
2. Add cache invalidation
3. Test performance
4. **Goal:** All endpoints <2s with cache

---

## 🚀 Next Steps

1. **Immediate:** Fix Cabinets API (it's completely broken)
2. **Test:** Run performance script again after each fix
3. **Measure:** Ensure we hit <10s goal
4. **Document:** Update docs with new performance metrics

**Ready to proceed with Cabinets API investigation and optimization?**

