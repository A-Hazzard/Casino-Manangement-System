# Bill Validator Calculation System

**Author:** AI Assistant  
**Last Updated:** October 9th, 2025  
**Status:** Current Implementation Documentation

## Table of Contents
- [Overview](#overview)
- [Bill Validator Data Structure](#bill-validator-data-structure)
- [Time Period Filtering](#time-period-filtering)
- [Calculation Methods](#calculation-methods)
- [Examples](#examples)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The Bill Validator system tracks and calculates the amount of money inserted into slot machines through bill validators. It supports two data formats (V1 and V2) and uses gaming day filtering for accurate time period calculations.

### Key Concepts

- **Bill Validator**: Device that accepts paper currency
- **Denominations**: Different bill values (1, 2, 5, 10, 20, 50, 100, etc.)
- **V1 Data Format**: Legacy format using `value` field
- **V2 Data Format**: Current format using `movement` object
- **Gaming Day Filtering**: Uses gaming day offset for time periods

## Bill Validator Data Structure

### Data Collection

**Collection:** `acceptedbills`
**Primary Fields:**
- `machine`: Machine ID (string)
- `createdAt`: Timestamp when bill was accepted (V1 format)
- `readAt`: Timestamp when bill was read (V2 format)
- `value`: Bill denomination (V1 format)
- `movement`: Object containing denomination counts (V2 format)

### V1 Data Format (Legacy)

```javascript
{
  _id: "bill_id",
  machine: "machine_id",
  createdAt: "2025-10-09T14:30:00.000Z",
  value: 20,  // $20 bill
  // ... other fields
}
```

**Characteristics:**
- Uses `value` field for bill denomination
- Uses `createdAt` for time filtering
- Individual bill records
- Legacy format from older systems

### V2 Data Format (Current)

```javascript
{
  _id: "bill_id",
  machine: "machine_id",
  readAt: "2025-10-09T14:30:00.000Z",
  movement: {
    dollar1: 5,      // 5 x $1 bills
    dollar5: 2,      // 2 x $5 bills
    dollar20: 1,     // 1 x $20 bill
    // ... other denominations
  }
}
```

**Characteristics:**
- Uses `movement` object for denomination counts
- Uses `readAt` for time filtering
- Aggregated bill data
- Current format from newer systems

## Time Period Filtering

### Gaming Day Filtering

**Used for:** Predefined time periods (Today, Yesterday, 7d, 30d)
**Function:** `getGamingDayRangeForPeriod()`
**Accounts for:** `gameDayOffset` per location

**Implementation:**
```typescript
// Get gaming location and offset
const machine = await Machine.findById(machineId);
const gamingLocation = await GamingLocations.findById(machine.locationId);
const gameDayOffset = gamingLocation?.gameDayOffset || 0;

// Calculate gaming day range
const gamingDayRange = getGamingDayRangeForPeriod(timePeriod, gameDayOffset);

// Apply date filter
const dateFilter = {
  createdAt: { $gte: gamingDayRange.rangeStart, $lte: gamingDayRange.rangeEnd }
};
```

### Custom Date Range Filtering

**Used for:** Custom date selection
**Method:** Local time boundaries (midnight to midnight Trinidad time)
**Conversion:** Trinidad time to UTC for database queries

**Implementation:**
```typescript
// Custom date range - convert to local time range (Trinidad time)
const customStart = new Date(startDate);
const customEnd = new Date(endDate);

// Set to local time boundaries (midnight to midnight in Trinidad time)
customStart.setUTCHours(4, 0, 0, 0); // Midnight Trinidad = 4 AM UTC
customEnd.setDate(customEnd.getDate() + 1); // Move to next day
customEnd.setUTCHours(3, 59, 59, 999); // 11:59 PM Trinidad = 3:59 AM UTC next day

const dateFilter = {
  createdAt: { $gte: customStart, $lte: customEnd }
};
```

### All Time Filtering

**Used for:** Historical data
**Method:** No date filtering
**Implementation:** Query all bills for the machine

## Calculation Methods

### V1 Data Processing

**Method:** Count individual bill records
**Formula:** Sum of enabled denominations

```typescript
function processV1Data(bills: BillDocument[], billValidatorOptions: Record<string, boolean>) {
  const denominationTotals: Record<number, number> = {};
  
  bills.forEach((bill) => {
    const billObj = bill.toObject ? bill.toObject() : bill;
    
    if (billObj.value !== undefined) {
      const value = Number(billObj.value);
      const denominationKey = getDenominationKey(value);
      const isEnabled = billValidatorOptions[denominationKey] === true;
      
      if (isEnabled) {
        denominationTotals[value] = (denominationTotals[value] || 0) + 1;
      }
    }
  });
  
  return denominationTotals;
}
```

### V2 Data Processing

**Method:** Sum movement object values
**Formula:** Sum of enabled denomination quantities

```typescript
function processV2Data(bills: BillDocument[], billValidatorOptions: Record<string, boolean>) {
  const denominationTotals: Record<string, { quantity: number, subtotal: number }> = {};
  
  bills.forEach((bill) => {
    const billObj = bill.toObject ? bill.toObject() : bill;
    
    if (billObj.movement) {
      const denominationMap = [
        { key: "dollar1", value: 1, optionKey: "denom1" },
        { key: "dollar2", value: 2, optionKey: "denom2" },
        { key: "dollar5", value: 5, optionKey: "denom5" },
        // ... other denominations
      ];
      
      denominationMap.forEach(({ key, value, optionKey }) => {
        const quantity = (billObj.movement as Record<string, number>)?.[key] || 0;
        const isEnabled = billValidatorOptions[optionKey] === true;
        
        if (isEnabled && quantity > 0) {
          denominationTotals[key] = {
            quantity: (denominationTotals[key]?.quantity || 0) + quantity,
            subtotal: (denominationTotals[key]?.subtotal || 0) + (quantity * value)
          };
        }
      });
    }
  });
  
  return denominationTotals;
}
```

### Data Format Detection

**Method:** Check for presence of `value` vs `movement` fields
**Priority:** V1 format takes precedence if both exist

```typescript
function processBillsData(bills: BillDocument[]) {
  if (bills.length === 0) {
    return { denominations: [], totalAmount: 0, totalQuantity: 0 };
  }
  
  const firstBill = bills[0];
  const firstBillObj = firstBill.toObject ? firstBill.toObject() : firstBill;
  
  // V1: Uses value field (legacy format)
  const isV1 = firstBillObj.value !== undefined;
  
  // V2: Uses movement object (current format)
  const isV2 = firstBillObj.movement && 
               typeof firstBillObj.movement === "object" && 
               firstBillObj.value === undefined;
  
  if (isV1) {
    return processV1Data(bills);
  } else if (isV2) {
    return processV2Data(bills);
  } else {
    return processV1Data(bills); // Default to V1
  }
}
```

## Examples

### Example 1: V1 Data Processing

**Machine:** GM5660 (`dd413ac1201a6fa4d91ff4be`)
**Time Period:** Today (Oct 9, 2025)
**Bills Found:** 15 bills

**Raw Data:**
```javascript
[
  { value: 20, createdAt: "2025-10-09T10:00:00.000Z" },
  { value: 20, createdAt: "2025-10-09T10:15:00.000Z" },
  { value: 5, createdAt: "2025-10-09T10:30:00.000Z" },
  { value: 100, createdAt: "2025-10-09T11:00:00.000Z" },
  // ... more bills
]
```

**Calculation:**
```javascript
denominationTotals = {
  5: 1,     // 1 x $5 bill
  20: 2,    // 2 x $20 bills
  100: 1    // 1 x $100 bill
}

totalAmount = (1 × 5) + (2 × 20) + (1 × 100) = 145
totalQuantity = 1 + 2 + 1 = 4
```

### Example 2: V2 Data Processing

**Machine:** GM5660 (`dd413ac1201a6fa4d91ff4be`)
**Time Period:** Today (Oct 9, 2025)
**Bills Found:** 3 records

**Raw Data:**
```javascript
[
  {
    readAt: "2025-10-09T10:00:00.000Z",
    movement: {
      dollar5: 2,    // 2 x $5 bills
      dollar20: 1,   // 1 x $20 bill
      dollar50: 0
    }
  },
  {
    readAt: "2025-10-09T14:00:00.000Z",
    movement: {
      dollar1: 5,    // 5 x $1 bills
      dollar10: 1,   // 1 x $10 bill
      dollar100: 1   // 1 x $100 bill
    }
  },
  // ... more records
]
```

**Calculation:**
```javascript
denominationTotals = {
  dollar1: { quantity: 5, subtotal: 5 },
  dollar5: { quantity: 2, subtotal: 10 },
  dollar10: { quantity: 1, subtotal: 10 },
  dollar20: { quantity: 1, subtotal: 20 },
  dollar100: { quantity: 1, subtotal: 100 }
}

totalAmount = 5 + 10 + 10 + 20 + 100 = 145
totalQuantity = 5 + 2 + 1 + 1 + 1 = 10
```

### Example 3: Gaming Day Filtering

**Location:** Big Shot Casino
**Gaming Day Offset:** 8 (8 AM Trinidad time)
**Current Time:** October 9, 2025, 2:00 PM Trinidad time

**Today's Gaming Day:**
- **Start**: October 8, 2025 at 8:00:00 AM Trinidad time
- **End**: October 9, 2025 at 7:59:59 AM Trinidad time

**Query Filter:**
```javascript
{
  machine: "dd413ac1201a6fa4d91ff4be",
  createdAt: {
    $gte: "2025-10-08T12:00:00.000Z", // 8 AM Trinidad = 12 PM UTC
    $lte: "2025-10-09T11:59:59.999Z"  // 7:59 AM Trinidad = 11:59 AM UTC
  }
}
```

## Configuration

### Bill Validator Options

**Purpose:** Filter which denominations to include in calculations
**Format:** Boolean flags for each denomination

```typescript
interface BillValidatorOptions {
  denom1: boolean;      // $1 bills
  denom2: boolean;      // $2 bills
  denom5: boolean;      // $5 bills
  denom10: boolean;     // $10 bills
  denom20: boolean;     // $20 bills
  denom50: boolean;     // $50 bills
  denom100: boolean;    // $100 bills
  denom200: boolean;    // $200 bills
  denom500: boolean;    // $500 bills
  denom1000: boolean;   // $1000 bills
  denom2000: boolean;   // $2000 bills
  denom5000: boolean;   // $5000 bills
  denom10000: boolean;  // $10000 bills
}
```

### Default Configuration

**Default Values:** All denominations enabled
**Customization:** Can be configured per machine or globally

```typescript
const defaultBillValidatorOptions = {
  denom1: true,
  denom2: true,
  denom5: true,
  denom10: true,
  denom20: true,
  denom50: true,
  denom100: true,
  denom200: true,
  denom500: true,
  denom1000: true,
  denom2000: true,
  denom5000: true,
  denom10000: true
};
```

## Troubleshooting

### Common Issues

1. **No Bills Found**
   - Check if machine has bill validator data
   - Verify time period calculation
   - Check if gaming day offset is correct
   - Verify bill validator options are enabled

2. **Incorrect Amounts**
   - Check data format (V1 vs V2)
   - Verify denomination mapping
   - Check bill validator options configuration
   - Verify time filtering logic

3. **Missing Denominations**
   - Check bill validator options
   - Verify denomination mapping in V2 format
   - Check if denomination exists in data

### Debugging Steps

1. **Check Bill Data:**
   ```javascript
   db.acceptedbills.find({
     machine: "machine_id",
     createdAt: { $gte: startDate, $lte: endDate }
   }).sort({ createdAt: -1 }).limit(10);
   ```

2. **Verify Gaming Day Offset:**
   ```javascript
   db.gaminglocations.find(
     { _id: "location_id" },
     { gameDayOffset: 1, name: 1 }
   );
   ```

3. **Check Data Format:**
   ```javascript
   // Check first bill to determine format
   const firstBill = db.acceptedbills.findOne({ machine: "machine_id" });
   console.log("Has value field:", firstBill.value !== undefined);
   console.log("Has movement field:", firstBill.movement !== undefined);
   ```

4. **Verify Time Range:**
   ```javascript
   // Check if bills exist in calculated time range
   const count = db.acceptedbills.countDocuments({
     machine: "machine_id",
     createdAt: { $gte: startDate, $lte: endDate }
   });
   console.log(`Bills found in time range: ${count}`);
   ```

### Performance Considerations

1. **Index Requirements:**
   - `acceptedbills.machine` (for machine filtering)
   - `acceptedbills.createdAt` (for time filtering)
   - `acceptedbills.readAt` (for V2 format time filtering)

2. **Query Optimization:**
   - Use appropriate time ranges to limit data
   - Sort by timestamp for consistent results
   - Limit results for large datasets

3. **Memory Usage:**
   - Large time ranges may require significant memory
   - Consider pagination for very large datasets
   - Monitor aggregation pipeline memory usage

## Related Documentation

- [Gaming Day Offset System](./gaming-day-offset-system.md)
- [SAS GROSS Calculation System](./sas-gross-calculation-system.md)
- [Financial Metrics Guide](../financial-metrics-guide.md)
- [Accepted Bills Collection Schema](./database-models.md)

## Changelog

- **October 9, 2025**: Updated documentation to reflect current implementation
- **October 7, 2025**: Fixed custom date range handling
- **October 2025**: Implemented gaming day filtering
- **October 2025**: Added V2 data format support
- **October 2025**: Initial implementation with V1 format
