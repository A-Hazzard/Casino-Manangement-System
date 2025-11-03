# Meters Tab - Critical Issues to Fix

## Problem Summary

The Meters tab is showing incorrect data because it's missing:

1. Time period support (Today, Yesterday, 7d, etc.)
2. Gaming day offset implementation
3. Proper date filtering

## Current Issues

### Issue 1: No Time Period Parameter

**Current**: API only accepts `startDate` and `endDate`
**Problem**: Frontend can't pass "Today", "Yesterday", etc.
**Impact**: Always shows all data regardless of selected filter

### Issue 2: No Gaming Day Offset

**Current**: Uses standard midnight-to-midnight dates
**Problem**: According to gaming-day-offset-system.md, ALL meter data should use gaming day boundaries
**Impact**:

- "Today" should be Oct 31, 8 AM → Nov 1, 8 AM (not midnight to midnight)
- Data shown doesn't match the selected time period

### Issue 3: Wrong Data Source

**Current**: Uses `machine.sasMeters` (current snapshot)
**Problem**: For historical periods, should aggregate from `meters` collection
**Impact**: Shows current meter state, not historical data for the period

## Required Changes

### 1. Add Time Period Support

```typescript
// Add to query parameters
const timePeriod = searchParams.get('timePeriod') as TimePeriod;
```

### 2. Implement Gaming Day Offset

```typescript
// Fetch locations to get gaming day offset
const locationsData = await db
  .collection('gaminglocations')
  .find(
    { _id: { $in: locationList } },
    { projection: { _id: 1, name: 1, gameDayOffset: 1, rel: 1, country: 1 } }
  )
  .toArray();

// Calculate gaming day ranges
const gamingDayRanges = getGamingDayRangesForLocations(
  locationsList,
  timePeriod,
  timePeriod === 'Custom' ? customStart : undefined,
  timePeriod === 'Custom' ? customEnd : undefined
);

// Get earliest start and latest end
const queryStartDate = new Date(
  Math.min(...gamingDayRanges.map(r => r.rangeStart.getTime()))
);
const queryEndDate = new Date(
  Math.max(...gamingDayRanges.map(r => r.rangeEnd.getTime()))
);
```

### 3. Use Correct Data Source

For historical data (7d, 30d, Custom), should aggregate from `meters` collection:

```typescript
const metersAggregation = await db
  .collection('meters')
  .aggregate([
    {
      $match: {
        machine: { $in: machineIds },
        readAt: { $gte: queryStartDate, $lte: queryEndDate },
      },
    },
    {
      $group: {
        _id: '$machine',
        drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
        coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
        gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        lastReadAt: { $max: '$readAt' },
      },
    },
  ])
  .toArray();
```

## Files to Update

1. **app/api/reports/meters/route.ts**
   - Add `timePeriod` parameter
   - Import gaming day utilities
   - Implement gaming day range calculation
   - Use aggregation for historical data
   - Add currency conversion per machine

2. **components/reports/tabs/MetersTab.tsx**
   - Pass `timePeriod` to API
   - Add `timePeriod` to dependency array for data fetching

## Expected Behavior After Fix

**Today Filter (Nov 3, 2025, assuming 8 AM offset):**

- Should query: Nov 3, 8 AM Trinidad → Nov 4, 8 AM Trinidad
- Should show: Only meters with readAt in that range

**Yesterday Filter:**

- Should query: Nov 2, 8 AM Trinidad → Nov 3, 8 AM Trinidad

**7d Filter:**

- Should query: Oct 27, 8 AM Trinidad → Nov 4, 8 AM Trinidad

**Custom (Oct 31 to Oct 31):**

- Should query: Oct 31, 8 AM Trinidad → Nov 1, 8 AM Trinidad
- Should show: The $20 drop from TEST machine

## Priority

**HIGH** - This is a critical bug affecting data accuracy across the entire Meters tab.
