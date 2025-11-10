# API Performance Logging Summary

## Overview

All API endpoints have been optimized with concise, actionable logging. Verbose per-item logging has been removed and replaced with summary-level performance metrics.

## Logging Philosophy

### ✅ Good Logging (What We Do Now)
- **One-line performance summaries** per request
- **Total time** and key metrics at a glance
- **Error logging** for issues
- **Performance breakdowns** in response payload

### ❌ Bad Logging (What We Removed)
- Per-item JSON dumps
- Individual currency conversion logs for each location
- Verbose "processing..." messages for each item
- Redundant parameter dumps

---

## API Endpoints with Performance Logging

### 1. `/api/reports/locations` - Location List API

**What it does:** Fetches all locations with aggregated machine and meter data

**Performance Log Format:**
```
⚡ /api/reports/locations - 6853ms | 341 locations | 16.6ms/loc | 50/sec | Processing: 82% | Currency: 8%
```

**Includes:**
- Total request time
- Number of locations processed
- Average time per location
- Throughput (locations/sec)
- Processing percentage
- Currency conversion percentage

**Response includes:**
```json
{
  "data": [...],
  "performance": {
    "totalTime": 6853,
    "breakdown": {
      "dbConnect": 0,
      "auth": 147,
      "fetchLocations": 480,
      "gamingDayRanges": 3,
      "processing": 5654,
      "sortAndPaginate": 0,
      "currencyConversion": 565
    },
    "locationsProcessed": 341,
    "avgTimePerLocation": 16.58
  }
}
```

### 2. `/api/locations/[locationId]` - Location Details API

**What it does:** Fetches machines and meters for a specific location

**Performance Log Format:**
```
⚡ /api/locations/abc123 - 234ms | 15 machines | Today
```

**Includes:**
- Total request time
- Number of machines returned
- Time period queried

### 3. Other Endpoints

**Status:** Other endpoints already have minimal logging
- `/api/dashboard/totals` - No verbose logging
- `/api/cabinets/[id]` - No verbose logging  
- `/api/metrics/meters` - Only error logging

---

## How to Read Performance Logs

### Location List API Log
```
⚡ /api/reports/locations - 6853ms | 341 locations | 16.6ms/loc | 50/sec | Processing: 82% | Currency: 8%
```

**Breakdown:**
- `6853ms` - Total request time
- `341 locations` - Number of locations processed
- `16.6ms/loc` - Average time per location (target: < 20ms)
- `50/sec` - Throughput (target: > 50/sec)
- `Processing: 82%` - Percentage of time spent processing (indicates bottleneck)
- `Currency: 8%` - Percentage of time spent on currency conversion

### Location Details Log
```
⚡ /api/locations/abc123 - 234ms | 15 machines | Today
```

**Breakdown:**
- `234ms` - Total request time
- `15 machines` - Number of machines returned
- `Today` - Time period filter applied

---

## Performance Targets

| Metric | Excellent | Good | Needs Work |
|--------|-----------|------|------------|
| **Locations API** |
| Total Time (100 locs) | < 2s | 2-5s | > 5s |
| Avg Time/Location | < 10ms | 10-20ms | > 20ms |
| Throughput | > 100/sec | 50-100/sec | < 50/sec |
| **Location Details API** |
| Total Time | < 300ms | 300-1000ms | > 1s |
| **Processing %** | < 70% | 70-85% | > 85% |

---

## Removed Logging Examples

###  Before (BAD - Too Verbose)

```
[REPORTS/LOCATIONS] Query params: { licencee: 'all', timePeriod: 'Today', displayCurrency: 'USD' }
[REPORTS/LOCATIONS] User roles: [ 'developer' ]
[REPORTS/LOCATIONS] User licensees: []
[REPORTS/LOCATIONS] User location permissions: []
[REPORTS/LOCATIONS] Admin with no restrictions
🔍 [LOCATIONS API] Processing 341 locations for time period: Today
🔍 [LOCATIONS API] Location: Big Shot (abc123)
   Gaming Day Offset: 8
   Range Start: 2025-11-10T12:00:00.000Z
   Range End: 2025-11-10T20:00:00.000Z
   Machines found: 5
   Machine IDs: [ '123', '456', '789' ]
   Meters query result: { "moneyIn": 133200, "moneyOut": 10000 }
   Final metrics - moneyIn: 133200, moneyOut: 10000, gross: 123200, meters: 42

... (repeats for EVERY location - 341 times!)

💱 Starting currency conversion...

💱 Currency conversion for location: Big Shot
   Before conversion - moneyIn: 133200, moneyOut: 10000, gross: 123200
   Licensee ID: c03b094083226f216b3fc39c
   Licensee name: Cabana
   Source currency (Cabana): GYD
   Target currency: USD
   moneyIn: 133200 GYD -> 640.45 USD
   moneyOut: 10000 GYD -> 48.08 USD
   gross: 123200 GYD -> 592.36 USD
   After conversion - moneyIn: 640.45, moneyOut: 48.08, gross: 592.36

... (repeats for EVERY location - 341 times!)

💱 Currency conversion completed. Converted 341 locations
🔍 [LOCATIONS API] paginatedData before conversion: [full JSON dump of 341 locations]
🔍 [LOCATIONS API] convertedData after conversion: [full JSON dump of 341 locations]
🔍 [LOCATIONS API] Response: [full JSON dump of entire response]
```

###  After (GOOD - Concise)

```
⚡ /api/reports/locations - 6853ms | 341 locations | 16.6ms/loc | 50/sec | Processing: 82% | Currency: 8%
```

**Result:** From ~3000+ lines of logs to 1 line! 🎉

---

## How to Monitor Performance

### 1. Watch Server Console
When you make API requests, you'll see one-line summaries like:

```
⚡ /api/reports/locations - 1234ms | 100 locations | 12.3ms/loc | 81/sec | Processing: 72% | Currency: 10%
⚡ /api/locations/abc123 - 345ms | 20 machines | 7d
```

### 2. Check Response Performance Data
The locations API includes performance data in the response:

```javascript
const response = await fetch('/api/reports/locations?timePeriod=Today');
const data = await response.json();

console.log('Total time:', data.performance.totalTime + 'ms');
console.log('Avg per location:', data.performance.avgTimePerLocation + 'ms');
console.log('Breakdown:', data.performance.breakdown);
```

### 3. Run Performance Tests
Use the testing scripts in `scripts/performance/`:

```bash
# Test database queries
node scripts/performance/test-location-queries.js

# Test API endpoints  
npm run dev
node scripts/performance/test-location-api.js
```

---

## Troubleshooting

### If Performance is Slow

1. **Check the percentage breakdown** in logs
   - If Processing > 85%, optimize database queries
   - If Currency > 20%, check conversion logic
   - If Auth > 10%, check token validation

2. **Check average time per location**
   - Target: < 20ms/location
   - If higher, verify indexes are in place

3. **Run the performance test scripts**
   - They'll show you exactly where the bottleneck is

### If Logs Are Still Too Verbose

Check for:
- Uncommitted `console.log` statements
- Debug logging in development mode
- Third-party library logging

Search the codebase:
```bash
grep -r "console.log" app/api/
```

---

## Environment-Specific Logging

### Development
- One-line performance summaries
- Error details with stack traces

### Production
- Same as development (performance summaries are lightweight)
- Errors logged to monitoring service

---

## Best Practices

1. ✅ **DO**: Log performance summaries
2. ✅ **DO**: Log errors with context
3. ✅ **DO**: Include metrics in API responses
4. ❌ **DON'T**: Log per-item details
5. ❌ **DON'T**: Dump full JSON objects
6. ❌ **DON'T**: Log successful operations verbosely

---

**Last Updated:** November 10, 2025  
**Performance Optimizations:** Active  
**Logging Strategy:** Concise and actionable

