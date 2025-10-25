# Gaming Day Offset Implementation Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 8, 2025  
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [What is a Gaming Day?](#what-is-a-gaming-day)
3. [System Architecture](#system-architecture)
4. [Implementation Details](#implementation-details)
5. [API Integration](#api-integration)
6. [Usage Examples](#usage-examples)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Gaming Day Offset system enables accurate financial reporting by allowing each gaming location to define its own business day boundaries. Instead of using standard calendar days (midnight to midnight), locations can specify when their "gaming day" starts (e.g., 9 AM Trinidad time), ensuring that metrics and reports align with actual business operations.

### Key Benefits

- **Accurate Financial Reporting**: Metrics reflect actual business days, not arbitrary calendar boundaries
- **Location-Specific Configuration**: Each location can have its own gaming day start time
- **Consistent Time Handling**: All date filtering uses the same gaming day logic across all pages
- **Timezone-Aware**: Automatically handles Trinidad time (UTC-4) to UTC conversion
- **Modular Design**: Reusable utility functions prevent code duplication

### Affected Pages

- ✅ Dashboard (`/dashboard`)
- ✅ Locations List (`/locations`)
- ✅ Location Details (`/locations/[id]`)
- ✅ Cabinets List (`/cabinets`)
- ✅ Cabinet Details (`/cabinets/[id]`)
- ✅ Collection Reports (`/collection-reports`)

---

## What is a Gaming Day?

### Definition

A **gaming day** is a business day that starts at a specific hour (the `gameDayOffset`) rather than at midnight. This allows casinos and gaming operations to align their reporting with their actual operating hours.

### Example

**Location: Trinidad Casino**

- `gameDayOffset`: 9 (9 AM Trinidad time)
- "Today" = 9:00 AM today → 8:59:59 AM tomorrow (Trinidad time)
- "Yesterday" = 9:00 AM yesterday → 8:59:59 AM today (Trinidad time)

**Traditional Calendar Day:**

- "Today" = 12:00 AM today → 11:59:59 PM today

**Why This Matters:**
If a casino operates from 10 AM to 4 AM the next day, a calendar day would split a single shift into two days. A gaming day keeps all operations within one business day.

### Database Field

Each location has a `gameDayOffset` field in the `GamingLocations` collection:

```typescript
{
  _id: "location_001",
  name: "Trinidad Casino",
  gameDayOffset: 9,  // 9 AM Trinidad time
  // ... other fields
}
```

**Default Value:** `0` (midnight, equivalent to calendar day)

---

## System Architecture

### Modular Utility Functions

All gaming day logic is centralized in `lib/utils/gamingDayRange.ts`:

```typescript
// For single location
getGamingDayRangeForPeriod(
  timePeriod: string,
  gameDayStartHour: number,
  customStartDate?: Date,
  customEndDate?: Date
): { rangeStart: Date, rangeEnd: Date }

// For multiple locations
getGamingDayRangesForLocations(
  locations: Array<{ _id: string, gameDayOffset: number }>,
  timePeriod: string,
  customStartDate?: Date,
  customEndDate?: Date
): Map<string, { rangeStart: Date, rangeEnd: Date }>
```

### Data Flow

```
Frontend
  ↓ (sends timePeriod, startDate, endDate)
API Endpoint
  ↓ (fetches locations with gameDayOffset)
Gaming Day Utility
  ↓ (calculates UTC date ranges per location)
Database Query
  ↓ (queries meters with location-specific ranges)
Results Aggregation
  ↓ (combines results from all locations)
Response to Frontend
```

---

## Implementation Details

### Time Period Handling

#### Standard Time Periods

| Period        | Description         | Gaming Day Range Calculation                                    |
| ------------- | ------------------- | --------------------------------------------------------------- |
| **Today**     | Current gaming day  | `gameDayOffset` today → `gameDayOffset` tomorrow                |
| **Yesterday** | Previous gaming day | `gameDayOffset` yesterday → `gameDayOffset` today               |
| **7d**        | Last 7 days         | `gameDayOffset` 7 days ago → `gameDayOffset` tomorrow           |
| **30d**       | Last 30 days        | `gameDayOffset` 30 days ago → `gameDayOffset` tomorrow          |
| **All Time**  | All historical data | Unix epoch → tomorrow                                           |
| **Custom**    | User-defined range  | Custom start at `gameDayOffset` → Custom end at `gameDayOffset` |

#### Timezone Conversion

**Trinidad Time (UTC-4) → UTC:**

```typescript
function convertTrinidadHourToUtc(date: Date, hour: number): Date {
  const newDate = new Date(date);
  // Trinidad is UTC-4, so add 4 hours to convert to UTC
  newDate.setUTCHours(hour + 4, 0, 0, 0);
  return newDate;
}
```

**Example:**

- Trinidad: October 1, 2025 at 9:00 AM (UTC-4)
- UTC: October 1, 2025 at 1:00 PM (13:00)

### Implementation Pattern

#### Step 1: Fetch Locations with Gaming Day Offset

```typescript
const locations = await GamingLocations.find({
  $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
  ...(licencee ? { 'rel.licencee': licencee } : {}),
}).lean();
```

#### Step 2: Calculate Gaming Day Ranges

```typescript
const gamingDayRanges = getGamingDayRangesForLocations(
  locations.map((loc: Record<string, unknown>) => ({
    _id: (loc._id as { toString: () => string }).toString(),
    gameDayOffset: (loc.gameDayOffset as number) || 0,
  })),
  timePeriod,
  customStartDate,
  customEndDate
);
```

#### Step 3: Query Meters with Location-Specific Ranges

```typescript
for (const location of locations) {
  const locationId = (location._id as { toString: () => string }).toString();
  const gamingDayRange = gamingDayRanges.get(locationId);

  if (!gamingDayRange) continue;

  // Query meters for this location's gaming day range
  const meters = await db
    .collection('meters')
    .aggregate([
      {
        $match: {
          machine: { $in: locationMachineIds },
          readAt: {
            $gte: gamingDayRange.rangeStart,
            $lte: gamingDayRange.rangeEnd,
          },
        },
      },
      // ... aggregation stages
    ])
    .toArray();

  // Process and aggregate results
}
```

---

## API Integration

### Updated Endpoints

#### 1. Dashboard Totals (`/api/dashboard/totals`)

**Query Parameters:**

- `timePeriod`: "Today", "Yesterday", "7d", "30d", "Custom"
- `startDate`: ISO date string (for Custom)
- `endDate`: ISO date string (for Custom)
- `licencee`: Licensee ID filter
- `currency`: Display currency (USD, TTD, GYD, BBD)

**Implementation:**

- Fetches all locations with their `gameDayOffset`
- Calculates gaming day ranges for each location
- Iterates through locations, querying meters with location-specific ranges
- Aggregates results and applies currency conversion if needed

**File:** `app/api/dashboard/totals/route.ts`

#### 2. Location Aggregation (`/api/locationAggregation`)

**Query Parameters:**

- `timePeriod`: Time period filter
- `startDate`: Custom start date
- `endDate`: Custom end date
- `licencee`: Licensee ID filter
- `selectedLocations`: Comma-separated location IDs

**Implementation:**

- Passes time period parameters to `getLocationsWithMetrics` helper
- Each location gets its own gaming day range
- Meter aggregation uses location-specific date ranges

**Files:**

- `app/api/locationAggregation/route.ts`
- `app/api/lib/helpers/locationAggregation.ts`

#### 3. Location Details (`/api/locations/[locationId]`)

**Query Parameters:**

- `timePeriod`: Time period filter
- `startDate`: Custom start date
- `endDate`: Custom end date

**Implementation:**

- Fetches location document to get `gameDayOffset`
- Calculates gaming day range using `getGamingDayRangeForPeriod`
- Updates `$match` stage in meter lookup pipeline

**File:** `app/api/locations/[locationId]/route.ts`

#### 4. Cabinets Aggregation (`/api/machines/aggregation`)

**Query Parameters:**

- `timePeriod`: Time period filter
- `startDate`: Custom start date
- `endDate`: Custom end date
- `licensee`: Licensee ID filter
- `searchTerm`: Machine search term

**Implementation:**

- Major refactor from single aggregation to per-location processing
- Fetches all locations with `gameDayOffset`
- Iterates through locations, running separate aggregations
- Combines all results into single array

**File:** `app/api/machines/aggregation/route.ts`

#### 5. Cabinet Details (`/api/machines/[id]`)

**Query Parameters:**

- `timePeriod`: Time period filter
- `startDate`: Custom start date
- `endDate`: Custom end date

**Implementation:**

- Fetches machine's location to get `gameDayOffset`
- Replaced manual date range calculation with `getGamingDayRangeForPeriod`
- Cleaner code with centralized gaming day logic

**File:** `app/api/machines/[id]/route.ts`

#### 6. Collection Reports (`/api/collectionReport`)

**Query Parameters:**

- `timePeriod`: Time period filter
- `startDate`: Custom start date
- `endDate`: Custom end date
- `locationName`: Location name filter
- `licencee`: Licensee ID filter

**Implementation:**

- Modified helper to accept time period parameters
- Builds `locationMatchCriteria` using `$or` with per-location gaming day ranges
- Each location in the query has its own specific timestamp range

**Files:**

- `app/api/collectionReport/route.ts`
- `app/api/lib/helpers/collectionReportBackend.ts`

---

## Usage Examples

### Example 1: Single Location with 9 AM Offset

**Location Configuration:**

```json
{
  "_id": "trinidad_main",
  "name": "Trinidad Main Casino",
  "gameDayOffset": 9
}
```

**Frontend Request:**

```typescript
fetch('/api/locations/trinidad_main?timePeriod=Today');
```

**Backend Processing:**

```typescript
// 1. Fetch location
const location = await GamingLocations.findById('trinidad_main');
// { gameDayOffset: 9 }

// 2. Calculate gaming day range
const gamingDayRange = getGamingDayRangeForPeriod('Today', 9);
// {
//   rangeStart: 2025-10-08T13:00:00.000Z  (9 AM Trinidad = 1 PM UTC)
//   rangeEnd: 2025-10-09T13:00:00.000Z    (9 AM tomorrow Trinidad = 1 PM tomorrow UTC)
// }

// 3. Query meters
const meters = await Meters.find({
  machine: { $in: locationMachineIds },
  readAt: {
    $gte: new Date('2025-10-08T13:00:00.000Z'),
    $lte: new Date('2025-10-09T13:00:00.000Z'),
  },
});
```

### Example 2: Multiple Locations with Different Offsets

**Locations:**

```json
[
  { "_id": "trinidad_main", "gameDayOffset": 9 },
  { "_id": "barbados_casino", "gameDayOffset": 6 },
  { "_id": "guyana_slot_hall", "gameDayOffset": 0 }
]
```

**Frontend Request:**

```typescript
fetch('/api/dashboard/totals?timePeriod=Today');
```

**Backend Processing:**

```typescript
// 1. Fetch all locations
const locations = await GamingLocations.find({ ... });

// 2. Calculate gaming day ranges for all locations
const gamingDayRanges = getGamingDayRangesForLocations(
  [
    { _id: 'trinidad_main', gameDayOffset: 9 },
    { _id: 'barbados_casino', gameDayOffset: 6 },
    { _id: 'guyana_slot_hall', gameDayOffset: 0 }
  ],
  'Today'
);

// Result:
// Map {
//   'trinidad_main' => { rangeStart: 2025-10-08T13:00:00Z, rangeEnd: 2025-10-09T13:00:00Z },
//   'barbados_casino' => { rangeStart: 2025-10-08T10:00:00Z, rangeEnd: 2025-10-09T10:00:00Z },
//   'guyana_slot_hall' => { rangeStart: 2025-10-08T04:00:00Z, rangeEnd: 2025-10-09T04:00:00Z }
// }

// 3. Iterate and query each location with its specific range
for (const location of locations) {
  const range = gamingDayRanges.get(location._id.toString());
  // Query meters with location-specific range
}
```

### Example 3: Custom Date Range

**Frontend Request:**

```typescript
fetch(
  '/api/locations/trinidad_main?timePeriod=Custom&startDate=2025-09-01&endDate=2025-09-07'
);
```

**Backend Processing:**

```typescript
// 1. Parse custom dates
const customStartDate = new Date('2025-09-01');
const customEndDate = new Date('2025-09-07');

// 2. Calculate gaming day range with custom dates
const gamingDayRange = getGamingDayRangeForPeriod(
  'Custom',
  9,
  customStartDate,
  customEndDate
);
// {
//   rangeStart: 2025-09-01T13:00:00.000Z  (Sept 1 at 9 AM Trinidad)
//   rangeEnd: 2025-09-08T13:00:00.000Z    (Sept 8 at 9 AM Trinidad - next gaming day)
// }

// 3. Query covers full gaming days from Sept 1 to Sept 7
```

---

## Testing Guide

### Manual Testing Checklist

#### Dashboard Testing

- [ ] Test "Today" with different `gameDayOffset` values (0, 6, 9, 12)
- [ ] Test "Yesterday" shows previous gaming day metrics
- [ ] Test "7d" aggregates last 7 gaming days correctly
- [ ] Test "30d" aggregates last 30 gaming days correctly
- [ ] Test custom date range respects gaming day boundaries
- [ ] Test with "All Licensee" mode (currency conversion)
- [ ] Test with single licensee mode

#### Locations Page Testing

- [ ] Test location list shows correct metrics per gaming day
- [ ] Test filtering by licensee
- [ ] Test different time periods for each location
- [ ] Test locations with different `gameDayOffset` values

#### Location Details Testing

- [ ] Test single location details respects its `gameDayOffset`
- [ ] Test custom date ranges
- [ ] Test meter aggregation shows correct totals

#### Cabinets Page Testing

- [ ] Test cabinets list shows correct metrics
- [ ] Test search functionality with gaming day filtering
- [ ] Test locations with different offsets
- [ ] Test pagination works correctly

#### Cabinet Details Testing

- [ ] Test single cabinet metrics respect location's `gameDayOffset`
- [ ] Test custom date ranges
- [ ] Test meter history displays correctly

#### Collection Reports Testing

- [ ] Test collection reports list filters by gaming day
- [ ] Test report creation timestamps align with gaming day
- [ ] Test filtering by location name
- [ ] Test filtering by licensee

### Database Validation Queries

#### Verify Gaming Day Offset Configuration

```javascript
// Check all locations and their gameDayOffset
db.gaminglocations
  .find({ deletedAt: null }, { name: 1, gameDayOffset: 1 })
  .pretty();
```

#### Verify Meter Data Coverage

```javascript
// Check meter data for specific gaming day range
const gameDayStart = ISODate('2025-10-08T13:00:00.000Z'); // 9 AM Trinidad
const gameDayEnd = ISODate('2025-10-09T13:00:00.000Z'); // 9 AM next day

db.meters.count({
  readAt: { $gte: gameDayStart, $lte: gameDayEnd },
});
```

#### Test Gaming Day Aggregation

```javascript
// Aggregate meters for a location's gaming day
const locationId = ObjectId('location_id_here');
const gameDayStart = ISODate('2025-10-08T13:00:00.000Z');
const gameDayEnd = ISODate('2025-10-09T13:00:00.000Z');

db.meters.aggregate([
  {
    $match: {
      location: locationId,
      readAt: { $gte: gameDayStart, $lte: gameDayEnd },
    },
  },
  {
    $group: {
      _id: null,
      totalDrop: { $sum: '$movement.drop' },
      totalCancelled: { $sum: '$movement.totalCancelledCredits' },
      totalGross: {
        $sum: {
          $subtract: ['$movement.drop', '$movement.totalCancelledCredits'],
        },
      },
    },
  },
]);
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Metrics Show Zero for "Today"

**Symptoms:**

- Dashboard shows $0 for all metrics
- Location details show no data

**Possible Causes:**

1. Current time is before the gaming day start hour
2. No meter data exists for the current gaming day
3. `gameDayOffset` is configured incorrectly

**Solution:**

```javascript
// Check current time vs gaming day start
const now = new Date();
const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000); // UTC-4
console.log(
  'Trinidad time:',
  trinidadNow.getHours() + ':' + trinidadNow.getMinutes()
);

// Check location's gameDayOffset
db.gaminglocations.findOne(
  { _id: ObjectId('location_id') },
  { gameDayOffset: 1 }
);

// Check if meter data exists
db.meters.count({
  location: ObjectId('location_id'),
  readAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
});
```

#### Issue 2: Different Totals Between Pages

**Symptoms:**

- Dashboard shows different totals than location details
- Inconsistent metrics across pages

**Possible Causes:**

1. Different time periods being used
2. Cache not cleared
3. Gaming day offset not applied consistently

**Solution:**

1. Clear cache: `?clearCache=true`
2. Verify time period matches across pages
3. Check browser console for API requests
4. Verify backend logs show correct gaming day ranges

#### Issue 3: Custom Date Range Not Working

**Symptoms:**

- Custom date range shows no data
- Date range shows data for wrong period

**Possible Causes:**

1. Frontend sending dates in wrong format
2. Gaming day offset not applied to custom dates
3. Timezone conversion issue

**Solution:**

```javascript
// Frontend: Ensure dates are in YYYY-MM-DD format
const startDate = '2025-09-01'; // NOT a Date object
const endDate = '2025-09-07';

// Backend: Verify custom date parsing
console.log('Custom dates:', { customStartDate, customEndDate });
console.log('Gaming day range:', gamingDayRange);
```

#### Issue 4: TypeScript Errors After Update

**Symptoms:**

- `loc._id is of type 'unknown'`
- Type errors in collection report backend

**Solution:**

```typescript
// Use proper type assertions
locations.map((loc: Record<string, unknown>) => ({
  _id: (loc._id as { toString: () => string }).toString(),
  gameDayOffset: (loc.gameDayOffset as number) || 0,
}));
```

### Debugging Tools

#### Enable Gaming Day Debug Logging

Add to API endpoints for detailed logging:

```typescript
console.warn('=== GAMING DAY DEBUG ===');
console.warn('Time Period:', timePeriod);
console.warn('Location ID:', locationId);
console.warn('Gaming Day Offset:', gameDayOffset);
console.warn('Gaming Day Range:', gamingDayRange);
console.warn('Query Start:', gamingDayRange.rangeStart.toISOString());
console.warn('Query End:', gamingDayRange.rangeEnd.toISOString());
```

#### Browser DevTools

1. Open Network tab
2. Filter for API requests
3. Check request parameters
4. Verify response data
5. Check console for errors

---

## Best Practices

### 1. Always Use Gaming Day Utility

❌ **DON'T:**

```typescript
// Manual date calculation
const startDate = new Date();
startDate.setHours(9, 0, 0, 0);
```

✅ **DO:**

```typescript
// Use gaming day utility
const gamingDayRange = getGamingDayRangeForPeriod('Today', gameDayOffset);
```

### 2. Handle Missing Gaming Day Offset

❌ **DON'T:**

```typescript
const offset = location.gameDayOffset;
```

✅ **DO:**

```typescript
const offset = location.gameDayOffset || 0; // Default to midnight
```

### 3. Type Safety with Lean Queries

❌ **DON'T:**

```typescript
locations.map(loc => ({ _id: loc._id.toString() }));
// TypeScript error: loc._id is unknown
```

✅ **DO:**

```typescript
locations.map((loc: Record<string, unknown>) => ({
  _id: (loc._id as { toString: () => string }).toString(),
}));
```

### 4. Always Pass Custom Dates to Utility

❌ **DON'T:**

```typescript
// Skip custom date parameters
getGamingDayRangeForPeriod('Custom', gameDayOffset);
```

✅ **DO:**

```typescript
// Always pass custom dates for Custom period
getGamingDayRangeForPeriod(
  'Custom',
  gameDayOffset,
  customStartDate,
  customEndDate
);
```

---

## Related Documentation

- [Gaming Day Offset System](./backend/gaming-day-offset-system.md) - Backend implementation details
- [Meters Report API](./backend/meters-report-api.md) - Meter data API documentation
- [Dashboard API](./backend/api-overview.md) - Dashboard API documentation
- [Locations API](./backend/locations-api.md) - Locations API documentation
- [Cabinets API](./backend/cabinets-api.md) - Cabinets API documentation
- [Collection Reports API](./backend/collection-reports-comprehensive.md) - Collection reports documentation
- [Timezone Handling](./timezone.md) - Timezone conversion guidelines

---

## Summary

The Gaming Day Offset system provides:

✅ **Accurate Business Day Reporting** - Metrics align with actual business operations  
✅ **Location-Specific Configuration** - Each location defines its own gaming day  
✅ **Consistent Implementation** - Single source of truth for gaming day logic  
✅ **Automatic Timezone Handling** - Trinidad time to UTC conversion  
✅ **Type-Safe** - Full TypeScript support with proper type definitions  
✅ **Well-Documented** - Comprehensive documentation for developers  
✅ **Tested** - Ready for production use across all pages

**Last Updated:** October 8, 2025  
**Version:** 1.0  
**Maintained By:** Evolution One CMS Development Team
