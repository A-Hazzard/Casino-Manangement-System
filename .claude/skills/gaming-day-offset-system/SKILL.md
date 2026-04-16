---
name: Gaming Day Offset System
description: 8 AM to 8 AM business day (Trinidad UTC-4), gaming day calculations, custom date handling, per-location offsets.
---

# Gaming Day Offset System

Use for **all financial metrics and reporting queries** in the CMS.

## Core Concepts

### Gaming Day Definition

- **Default**: 8 AM today to 8 AM tomorrow (Trinidad time UTC-4)
- **Configurable**: `gamingLocations.gameDayOffset` (0-23)
- **Example**: With offset=8, "Today" = Oct 31 8 AM → Nov 1 8 AM
- **NOT calendar days**: Not midnight to midnight

### Critical: Current Time Determines Current Gaming Day

```typescript
// ✅ CORRECT - Check if we're before gaming day start
const currentHour = nowLocal.getUTCHours();
const gameDayStartHour = location.gameDayOffset ?? 8;

const todayBase =
  currentHour < gameDayStartHour
    ? new Date(today.getTime() - 24 * 60 * 60 * 1000) // Use yesterday
    : today; // Use today

// ❌ WRONG - Always uses calendar day (breaks before 8 AM)
const todayBase = today;

// Example:
// Current time: 2 AM Trinidad (before 8 AM start)
// "Today" gaming day: YESTERDAY 8 AM → TODAY 8 AM ✅
// NOT: TODAY 8 AM → TOMORROW 8 AM ❌
```

## When to Apply Gaming Day Offset

✅ **Use gaming day offset for:**
- Dashboard totals - System-wide financial summaries
- Location reports - Aggregated location metrics
- Machine reports - Individual machine financials
- Cabinet aggregation - All machines list
- Reports page - All tabs (Locations, Machines, Meters)
- **ALL time periods** - Today, Yesterday, 7d, 30d, Custom

❌ **Do NOT use for:**
- Collection reports - Use collection timestamp
- Activity logs - Use action timestamp
- User sessions - Use session timestamp

## Time Periods

### Predefined Periods

```typescript
// With gameDayOffset = 8

"Today":      Oct 31, 8 AM → Nov 1, 8 AM
"Yesterday":  Oct 30, 8 AM → Oct 31, 8 AM
"Last 7 Days": Oct 24, 8 AM → Nov 1, 8 AM
"Last 30 Days": Oct 1, 8 AM → Nov 1, 8 AM
"All Time":   No filtering
```

### Custom Dates

**Custom dates also use gaming day offset!**

```typescript
// User selects Oct 31 to Oct 31
// Backend queries: Oct 31, 8 AM to Nov 1, 8 AM (full gaming day)
// NOT just Oct 31 midnight to midnight

// User selects Sep 1 to Sep 30
// Backend queries: Sep 1, 8 AM to Oct 1, 8 AM (30 full gaming days)

// Selecting same date for start and end = full gaming day, not a moment
```

## Implementation Pattern

### Backend API

```typescript
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Parse parameters
  const timePeriod = searchParams.get('timePeriod') || 'Today';
  const customStart = searchParams.get('startDate'); // YYYY-MM-DD format only
  const customEnd = searchParams.get('endDate'); // YYYY-MM-DD format only

  // Get location's gaming day offset
  const location = await GamingLocations.findOne({ _id: locationId });
  const gameDayOffset = location?.gameDayOffset ?? 8;

  // Calculate date range
  const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
    timePeriod,
    gameDayOffset,
    customStart ? new Date(customStart) : undefined,
    customEnd ? new Date(customEnd) : undefined
  );

  // Use in aggregation
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    // ... rest of pipeline
  ];

  const results = await Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
}
```

### Frontend Helper

```typescript
// lib/helpers/dashboard.ts
export async function fetchMetricsData(
  timePeriod: string,
  customDateRange?: { from: Date; to: Date }
) {
  // Extract ONLY the date part (YYYY-MM-DD)
  const fromDate = customDateRange?.from.toISOString().split('T')[0]; // "2025-10-31"
  const toDate = customDateRange?.to.toISOString().split('T')[0]; // "2025-10-31"

  const params = new URLSearchParams({
    timePeriod,
    startDate: fromDate,
    endDate: toDate,
  });

  const response = await fetch(`/api/dashboard/totals?${params}`);
  return response.json();
}
```

## Critical Rules

### Rule 1: Always Provide Default Gaming Day Offset

```typescript
// ✅ CORRECT - Handles missing offset
const gameDayOffset = location?.gameDayOffset ?? 8;

// ❌ WRONG - Could be undefined
const gameDayOffset = location?.gameDayOffset;
```

### Rule 2: Zero is a Valid Offset

```typescript
// ✅ CORRECT - Treats 0 as valid (midnight start)
const gameDayOffset = location?.gameDayOffset ?? 8;

// ❌ WRONG - Treats 0 as falsy, becomes 8
const gameDayOffset = location?.gameDayOffset || 8;
```

### Rule 3: Custom Dates Send Date-Only Format

```typescript
// ✅ CORRECT - Send only YYYY-MM-DD
const fromDate = customDateRange.from.toISOString().split('T')[0]; // "2025-10-31"

// ❌ WRONG - Sends full timestamp
const fromDate = customDateRange.from.toISOString(); // "2025-10-31T00:00:00.000Z"
```

### Rule 4: Custom Dates Use Gaming Day Offset

```typescript
// ✅ CORRECT - Custom dates use gaming day offset
const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
  'Custom',
  gameDayOffset,
  customStart,
  customEnd
);
// User selects Oct 31 to Oct 31
// Backend: Oct 31, 8 AM → Nov 1, 8 AM

// ❌ WRONG - Using midnight to midnight
const rangeStart = new Date(customStart).setHours(0, 0, 0, 0);
const rangeEnd = new Date(customEnd).setHours(23, 59, 59, 999);
```

## Key Files

### Core Utility

- `lib/utils/gamingDayRange.ts` - Gaming day calculation logic

### Backend APIs Using Gaming Day Offset

- `app/api/dashboard/totals/route.ts` - Dashboard totals
- `app/api/locationAggregation/route.ts` - Location aggregation
- `app/api/locations/[locationId]/route.ts` - Location details
- `app/api/machines/aggregation/route.ts` - Machine aggregation
- `app/api/reports/meters/route.ts` - Meters report
- `app/api/reports/locations/route.ts` - Locations report
- `app/api/reports/machines/route.ts` - Machines report

### Frontend Helpers

- `lib/helpers/dashboard.ts` - Dashboard data fetching
- `lib/helpers/locations.ts` - Locations data fetching
- `lib/helpers/cabinets.ts` - Cabinets data fetching

## Testing

### Verify Correctness

```
1. Select "Today" on dashboard at 12:46 AM (before 8 AM)
2. Dashboard should show data from YESTERDAY 8 AM → TODAY 8 AM
3. NOT from TODAY 8 AM → TOMORROW 8 AM (which has no data yet)

Expected: Correct financial data visible
Actual (before fix): $0 (showing future gaming day)
```

### Test Custom Dates

```
1. Select custom date "Oct 31 to Oct 31"
2. "Custom" period should return same value as "Today" if Oct 31 is today
3. Custom should span full gaming day (Oct 31 8 AM to Nov 1 8 AM)
4. NOT midnight to midnight
```

## Per-Location Gaming Day Offsets

For queries spanning multiple locations with different offsets:

```typescript
// 1. Get all locations' gaming day offsets
const gamingDayRanges = new Map();
for (const location of locations) {
  const offset = location.gameDayOffset ?? 8;
  const range = getGamingDayRangeForPeriod('Today', offset);
  gamingDayRanges.set(String(location._id), range);
}

// 2. Calculate global range (earliest start, latest end)
const allRanges = Array.from(gamingDayRanges.values());
const globalStart = new Date(Math.min(...allRanges.map(r => r.rangeStart.getTime())));
const globalEnd = new Date(Math.max(...allRanges.map(r => r.rangeEnd.getTime())));

// 3. Query globally with wide range
const results = await Meters.aggregate([
  {
    $match: {
      location: { $in: allLocationIds },
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
]).cursor({ batchSize: 1000 });

// 4. Filter in memory by location-specific ranges
const filtered = [];
for await (const doc of results) {
  const range = gamingDayRanges.get(String(doc._id));
  if (doc.readAt >= range.rangeStart && doc.readAt <= range.rangeEnd) {
    filtered.push(doc);
  }
}
```

## Common Mistakes - AVOID

❌ Using calendar day (midnight to midnight)
❌ Not checking current time for "Today" calculation
❌ Using `||` instead of `??` for offset (treats 0 as falsy)
❌ Sending full timestamp from frontend (should be date-only)
❌ Applying gaming day offset to collection reports
❌ Hardcoding offset value (always use `location.gameDayOffset`)
❌ Not handling timezone conversion to Trinidad (UTC-4)

## Code Review Checklist

- ✅ Gaming day offset applied for financial queries
- ✅ Default offset is 8 (8 AM)
- ✅ Using `??` operator for fallback (handles 0)
- ✅ Custom dates in YYYY-MM-DD format
- ✅ Current time checked for "Today" calculation
- ✅ Custom dates apply gaming day offset
- ✅ Collection reports use actual timestamps (not gaming day)
- ✅ Per-location offsets handled correctly
- ✅ UTC-4 (Trinidad) timezone considered
