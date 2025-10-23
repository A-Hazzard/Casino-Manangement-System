# Gaming Day Offset System

**Author:** AI Assistant  
**Last Updated:** October 9th, 2025  
**Status:** Current Implementation Documentation

## Table of Contents
- [Overview](#overview)
- [Gaming Day Offset Concept](#gaming-day-offset-concept)
- [Implementation Details](#implementation-details)
- [Time Period Calculations](#time-period-calculations)
- [Examples](#examples)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The Gaming Day Offset system allows gaming locations to define their business day boundaries, enabling financial calculations to align with operational hours rather than calendar days. This is crucial for accurate financial reporting in the gaming industry.

### Key Concepts

- **Gaming Day**: Business day for a gaming location (not calendar day)
- **Gaming Day Offset**: Hour when the gaming day starts (e.g., 8 AM Trinidad time)
- **Trinidad Time**: UTC-4 timezone used as the local time reference
- **Gaming Day Range**: Time period from one gaming day start to the next

## Gaming Day Offset Concept

### Business Day vs Calendar Day

**Calendar Day:**
- Starts at midnight (00:00:00)
- Ends at 11:59:59 PM
- Standard 24-hour period

**Gaming Day:**
- Starts at a specific hour (e.g., 8 AM)
- Ends 24 hours later (e.g., 8 AM next day)
- Aligned with casino operations

### Example: gameDayOffset = 8

**Gaming Day for October 9, 2025:**
- **Start**: October 8, 2025 at 8:00:00 AM Trinidad time
- **End**: October 9, 2025 at 7:59:59 AM Trinidad time
- **Duration**: 24 hours
- **Business Logic**: All gaming activity from 8 AM Oct 8 to 7:59 AM Oct 9 belongs to Oct 9 gaming day

## Implementation Details

### Database Schema

**Collection:** `gaminglocations`
**Field:** `gameDayOffset`
**Type:** Number (0-23)
**Default:** 8 (8 AM Trinidad time)

```javascript
{
  _id: "location_id",
  name: "Big Shot Casino",
  gameDayOffset: 8,  // Gaming day starts at 8 AM Trinidad time
  // ... other fields
}
```

### Helper Functions

**Primary Function:** `getGamingDayRangeForPeriod()`
**Location:** `lib/utils/gamingDayRange.ts`

```typescript
export function getGamingDayRangeForPeriod(
  timePeriod: string,
  gameDayOffset: number = 8,
  customStartDate?: Date,
  customEndDate?: Date
): GamingDayRange | null {
  // Implementation details...
}
```

**Function:** `getGamingDayRange()`
**Purpose:** Calculate gaming day range for a specific date

```typescript
export function getGamingDayRange(
  date: Date,
  gameDayOffset: number
): GamingDayRange {
  // Implementation details...
}
```

## Time Period Calculations

### Predefined Time Periods

#### Today
**Logic:** Current gaming day
**Example (Oct 9, 2025, gameDayOffset: 8):**
- **Start**: Oct 8, 2025 08:00:00 Trinidad time
- **End**: Oct 9, 2025 07:59:59 Trinidad time

#### Yesterday
**Logic:** Previous gaming day
**Example (Oct 9, 2025, gameDayOffset: 8):**
- **Start**: Oct 7, 2025 08:00:00 Trinidad time
- **End**: Oct 8, 2025 07:59:59 Trinidad time

#### Last 7 Days
**Logic:** Last 7 gaming days
**Example (Oct 9, 2025, gameDayOffset: 8):**
- **Start**: Oct 2, 2025 08:00:00 Trinidad time
- **End**: Oct 9, 2025 07:59:59 Trinidad time

#### Last 30 Days
**Logic:** Last 30 gaming days
**Example (Oct 9, 2025, gameDayOffset: 8):**
- **Start**: Sep 9, 2025 08:00:00 Trinidad time
- **End**: Oct 9, 2025 07:59:59 Trinidad time

### Custom Date Ranges

**Logic:** Local time boundaries (midnight to midnight Trinidad time)
**Conversion:** Trinidad time to UTC for database queries

**Example:**
- **User Selection**: Oct 1, 2025 to Oct 1, 2025
- **Trinidad Time**: Oct 1, 2025 00:00:00 to Oct 1, 2025 23:59:59
- **UTC Time**: Oct 1, 2025 04:00:00 to Oct 2, 2025 03:59:59

### All Time

**Logic:** No date filtering
**Implementation:** Sum all meter readings for the machine
**Performance:** May be slow for machines with many readings

## Examples

### Example 1: Big Shot Casino (gameDayOffset: 8)

**Location:** Big Shot Casino
**Gaming Day Offset:** 8 (8 AM Trinidad time)
**Current Time:** October 9, 2025, 2:00 PM Trinidad time

**Today's Gaming Day:**
- **Start**: October 8, 2025 at 8:00:00 AM Trinidad time
- **End**: October 9, 2025 at 7:59:59 AM Trinidad time
- **Status**: Current gaming day (in progress)

**Yesterday's Gaming Day:**
- **Start**: October 7, 2025 at 8:00:00 AM Trinidad time
- **End**: October 8, 2025 at 7:59:59 AM Trinidad time
- **Status**: Completed gaming day

### Example 2: Starlight Bar (gameDayOffset: 8)

**Location:** Starlight Bar
**Gaming Day Offset:** 8 (8 AM Trinidad time)
**Current Time:** October 9, 2025, 10:00 AM Trinidad time

**Today's Gaming Day:**
- **Start**: October 8, 2025 at 8:00:00 AM Trinidad time
- **End**: October 9, 2025 at 7:59:59 AM Trinidad time
- **Status**: Current gaming day (in progress)

### Example 3: Custom Date Range

**User Selection:** October 1, 2025 to October 1, 2025
**Location:** Any location
**Gaming Day Offset:** Not applicable (uses calendar day boundaries)

**Time Range:**
- **Start**: October 1, 2025 at 00:00:00 Trinidad time (Oct 1, 2025 04:00:00 UTC)
- **End**: October 1, 2025 at 23:59:59 Trinidad time (Oct 2, 2025 03:59:59 UTC)

## Configuration

### Setting Gaming Day Offset

**Database Update:**
```javascript
// Set gaming day offset for a location
db.gaminglocations.updateOne(
  { _id: "location_id" },
  { $set: { gameDayOffset: 8 } }
);
```

**Default Values:**
- **New Locations**: 8 (8 AM Trinidad time)
- **Existing Locations**: May vary (check current values)
- **Range**: 0-23 (0 = midnight, 23 = 11 PM)

### Common Offset Values

- **8**: 8 AM Trinidad time (most common)
- **0**: Midnight (calendar day)
- **6**: 6 AM Trinidad time
- **12**: Noon Trinidad time

## Troubleshooting

### Common Issues

1. **Gaming Day Offset Not Applied**
   - Check if location has `gameDayOffset` field
   - Verify `getGamingDayRangeForPeriod()` is being called
   - Check if time period is "Custom" (uses calendar boundaries)

2. **Incorrect Time Ranges**
   - Verify Trinidad time to UTC conversion
   - Check if `gameDayOffset` is correct for location
   - Ensure time period calculation logic is correct

3. **Missing Data in Time Periods**
   - Check if meter readings exist in the calculated time range
   - Verify `readAt` timestamps are in UTC
   - Check if machine is active during the time period

### Debugging Steps

1. **Check Location Gaming Day Offset:**
   ```javascript
   db.gaminglocations.find(
     { _id: "location_id" },
     { gameDayOffset: 1, name: 1 }
   );
   ```

2. **Verify Time Range Calculation:**
   ```javascript
   // Example: Today's gaming day for location with offset 8
   const today = new Date();
   const gameDayStart = new Date(today);
   gameDayStart.setUTCDate(today.getUTCDate() - 1);
   gameDayStart.setUTCHours(8, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC
   
   const gameDayEnd = new Date(today);
   gameDayEnd.setUTCHours(7, 59, 59, 999); // 7:59 AM Trinidad = 11:59 AM UTC
   
   console.log("Gaming Day Start:", gameDayStart.toISOString());
   console.log("Gaming Day End:", gameDayEnd.toISOString());
   ```

3. **Check Meter Data in Time Range:**
   ```javascript
   db.meters.find({
     machine: "machine_id",
     readAt: {
       $gte: gameDayStart,
       $lte: gameDayEnd
     }
   }).sort({ readAt: 1 });
   ```

### Performance Considerations

1. **Index Requirements:**
   - `meters.readAt` (for time filtering)
   - `meters.machine` (for machine filtering)
   - `gaminglocations.gameDayOffset` (for offset lookups)

2. **Query Optimization:**
   - Use aggregation pipelines for complex time calculations
   - Cache gaming day ranges for frequently accessed periods
   - Limit time ranges for better performance

3. **Memory Usage:**
   - Large time ranges may require significant memory
   - Consider pagination for large datasets
   - Monitor aggregation pipeline memory usage

## Related Documentation

- [SAS GROSS Calculation System](./sas-gross-calculation-system.md)
- [Financial Metrics Guide](../financial-metrics-guide.md)
- [Time Period Filtering](./time-period-filtering-system.md)
- [Meters Collection Schema](./database-models.md)

## Changelog

- **October 9, 2025**: Updated documentation to reflect current implementation
- **October 7, 2025**: Fixed custom date range handling
- **October 2025**: Implemented gaming day offset system
- **October 2025**: Initial implementation