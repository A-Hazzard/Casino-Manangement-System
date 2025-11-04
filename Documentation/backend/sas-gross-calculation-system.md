# SAS GROSS Calculation System

**Author:** AI Assistant  
**Last Updated:** October 9th, 2025  
**Status:** Current Implementation Documentation

## Table of Contents

- [Overview](#overview)
- [SAS GROSS Calculation Method](#sas-gross-calculation-method)
- [Data Sources](#data-sources)
- [Implementation Across Pages](#implementation-across-pages)
- [Time Period Handling](#time-period-handling)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

SAS GROSS (Slot Accounting System Gross) represents the net revenue from slot machines during a specific time period. It is calculated by subtracting total cancelled credits from total money dropped into the machine.

### Key Concepts

- **SAS GROSS**: Net revenue from slot machines
- **Movement Delta Method**: Current standard calculation method
- **SAS Time Period**: Specific time window for SAS calculations
- **Gaming Day Offset**: Business day boundaries for each location

## SAS GROSS Calculation Method

### Current Implementation (Movement Delta Method)

**Formula:**

```
SAS GROSS = Sum(movement.drop) - Sum(movement.totalCancelledCredits)
```

**Data Source:**

- Collection: `meters`
- Fields: `movement.drop`, `movement.totalCancelledCredits`
- Time Filter: `readAt` field
- Machine Filter: `machine` field (string ID)

**Process:**

1. Query all meter readings for the machine within the SAS time period
2. Sum all `movement.drop` values (money in)
3. Sum all `movement.totalCancelledCredits` values (money out)
4. Calculate SAS GROSS = Total Drop - Total Cancelled Credits

### Deprecated Method (First/Last Cumulative)

**Previous Formula (No Longer Used):**

```
SAS GROSS = (lastMeter.coinIn - firstMeter.coinIn) - (lastMeter.coinOut - firstMeter.coinOut)
```

**Why Deprecated:**

- Only uses 2 data points (first and last meter readings)
- Misses intermediate changes and corrections
- Only works with cumulative data (coinIn/coinOut fields)
- Many machines only have movement data, not cumulative data

## Data Sources

### Primary Source: Meters Collection

**Collection:** `meters`
**Key Fields:**

- `machine`: Machine ID (string)
- `readAt`: Timestamp of meter reading
- `movement.drop`: Money dropped into machine (delta)
- `movement.totalCancelledCredits`: Credits paid out (delta)
- `movement.jackpot`: Jackpot amount (delta)

### Secondary Source: Collections Collection

**Collection:** `collections`
**Key Fields:**

- `machineId`: Machine ID
- `sasMeters.drop`: Stored SAS drop value
- `sasMeters.totalCancelledCredits`: Stored SAS cancelled credits
- `sasMeters.gross`: Stored SAS gross value
- `sasMeters.sasStartTime`: SAS period start time
- `sasMeters.sasEndTime`: SAS period end time

**Note:** Stored values in collections are calculated using the movement delta method when the collection is created.

## Implementation Across Pages

### 1. Collection Report Details Page

**API:** `/api/collection-report/[reportId]`
**Function:** `getCollectionReportById()` in `app/api/lib/helpers/accountingDetails.ts`

**Implementation:**

```typescript
// Query meters for SAS time period
const meters = await Meters.find({
  machine: collection.machineId,
  readAt: {
    $gte: new Date(collection.sasMeters.sasStartTime),
    $lte: new Date(collection.sasMeters.sasEndTime),
  },
})
  .sort({ readAt: 1 })
  .lean();

// Calculate SAS GROSS using movement delta method
const totalDrop = meters.reduce(
  (sum, meter) => sum + (meter.movement?.drop || 0),
  0
);
const totalCancelled = meters.reduce(
  (sum, meter) => sum + (meter.movement?.totalCancelledCredits || 0),
  0
);
const sasGross = totalDrop - totalCancelled;
```

### 2. Cabinets Page

**API:** `/api/machines/aggregation`
**Function:** `GET()` in `app/api/machines/aggregation/route.ts`

**Implementation:**

```typescript
// MongoDB aggregation pipeline
{
  $group: {
    _id: null,
    moneyIn: { $sum: "$movement.drop" },
    moneyOut: { $sum: "$movement.totalCancelledCredits" },
    gross: {
      $subtract: [
        { $sum: "$movement.drop" },
        { $sum: "$movement.totalCancelledCredits" }
      ]
    }
  }
}
```

### 3. Location Details Page

**API:** `/api/machines/[id]`
**Function:** `GET()` in `app/api/machines/[id]/route.ts`

**Implementation:**

```typescript
// MongoDB aggregation pipeline
{
  $group: {
    _id: null,
    moneyIn: { $sum: "$movement.drop" },
    moneyOut: { $sum: "$movement.totalCancelledCredits" },
    gross: { $subtract: ["$moneyIn", "$moneyOut"] }
  }
}
```

### 4. Dashboard

**API:** `/api/reports/locations`
**Function:** `GET()` in `app/api/reports/locations/route.ts`

**Implementation:**

- Uses same aggregation pipeline as Cabinets page
- Aggregates across all locations for licensee
- Applies gaming day ranges for time filtering

### 5. Collection Reports List

**API:** `/api/collectionReport`
**Function:** `getAllCollectionReportsWithMachineCounts()`

**Implementation:**

- Uses stored `collections.sasMeters.gross` values for performance
- Recalculates SAS GROSS on-the-fly for accuracy
- Uses same movement delta method as Collection Report Details

## Time Period Handling

### Gaming Day Ranges

**Used for:** Predefined periods (Today, Yesterday, 7d, 30d)
**Function:** `getGamingDayRangeForPeriod()`
**Accounts for:** `gameDayOffset` per location

**Example:**

- `gameDayOffset: 8` = Gaming day starts at 8 AM Trinidad time
- Today (Oct 9, 2025) with offset 8 = Oct 8, 2025 08:00:00 to Oct 9, 2025 07:59:59 Trinidad time

### Custom Date Ranges

**Used for:** Custom date selection
**Method:** Local time boundaries (midnight to midnight Trinidad time)
**Conversion:** Local time to UTC for database queries

**Example:**

- Oct 1, 2025 00:00:00 Trinidad → Oct 1, 2025 04:00:00 UTC
- Oct 1, 2025 23:59:59 Trinidad → Oct 2, 2025 03:59:59 UTC

### All Time

**Used for:** Historical data
**Method:** No date filtering, sum all meter readings
**Performance:** May be slow for machines with many readings

## Examples

### Example 1: Machine GM5660 SAS GROSS Calculation

**Machine ID:** `dd413ac1201a6fa4d91ff4be`
**SAS Time Period:** Aug 5, 2025 15:17:39 to Oct 7, 2025 15:03:35
**Meter Readings:** 140 readings in period

**Calculation:**

```
Total Drop = Sum(movement.drop) = 9,028
Total Cancelled Credits = Sum(movement.totalCancelledCredits) = 6,760
SAS GROSS = 9,028 - 6,760 = 2,268
```

### Example 2: Collection Report SAS GROSS

**Collection Report ID:** `ff218d0b-924b-46c8-9507-53bdf2bf2196`
**Location:** Starlight Bar
**Machines:** 4 machines collected

**Calculation:**

```
Machine 1 (GM5660): SAS GROSS = 2,268
Machine 2: SAS GROSS = 620
Machine 3: SAS GROSS = -1,575
Machine 4: SAS GROSS = 610
Total SAS GROSS = 2,268 + 620 + (-1,575) + 610 = 1,923
```

## Troubleshooting

### Common Issues

1. **SAS GROSS showing 0**
   - Check if machine has meter readings in the time period
   - Verify SAS time period is correct
   - Check if machine ID matches exactly

2. **SAS GROSS showing negative values**
   - Normal when more credits are paid out than money dropped
   - Check for jackpot payouts or bonus rounds
   - Verify meter reading accuracy

3. **SAS GROSS different between pages**
   - Check if time periods match exactly
   - Verify gaming day offset is applied consistently
   - Check if cached values are being used

### Debugging Steps

1. **Check meter data:**

   ```javascript
   db.meters
     .find({
       machine: 'machine_id',
       readAt: { $gte: startDate, $lte: endDate },
     })
     .sort({ readAt: 1 });
   ```

2. **Verify SAS time periods:**

   ```javascript
   db.collections.find(
     {
       machineId: 'machine_id',
     },
     { sasMeters: 1 }
   );
   ```

3. **Check gaming day ranges:**
   ```javascript
   db.gaminglocations.find(
     {
       _id: 'location_id',
     },
     { gameDayOffset: 1 }
   );
   ```

### Performance Considerations

1. **Index Requirements:**
   - `meters.machine` (for machine filtering)
   - `meters.readAt` (for time filtering)
   - `collections.machineId` (for collection lookups)

2. **Query Optimization:**
   - Use aggregation pipelines for complex calculations
   - Limit time ranges for better performance
   - Cache frequently accessed data

3. **Memory Usage:**
   - Large time ranges may require significant memory
   - Consider pagination for large datasets
   - Monitor aggregation pipeline memory usage

## Related Documentation

- [Financial Metrics Guide](../financial-metrics-guide.md)
- [Gaming Day Offset System](../../.cursor/gaming-day-offset-system.md)
- [Collection Report System](../collections-api.md)
- [Meters Collection Schema](../database-models.md)

## Changelog

- **October 9, 2025**: Updated documentation to reflect current implementation
- **October 7, 2025**: Fixed Collection Report Details SAS GROSS calculation
- **October 2025**: Implemented movement delta method as standard
- **October 2025**: Deprecated first/last cumulative method
