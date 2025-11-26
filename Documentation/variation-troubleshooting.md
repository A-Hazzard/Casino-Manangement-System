# Collection Report Variation Troubleshooting Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 22, 2025

## What is Variation?

**Variation** is the difference between two independent measures of machine revenue:

```typescript
Variation = Movement Gross - SAS Gross
```

### Components:

1. **Movement Gross** (from physical meter readings)
   - `Movement In` = `metersIn - prevIn` (current meter - previous collection meter)
   - `Movement Out` = `metersOut - prevOut`
   - `Movement Gross` = `Movement In - Movement Out`

2. **SAS Gross** (from SAS system data)
   - `SAS Drop` = Sum of drop from `sashourly` table between `sasStartTime` and `sasEndTime`
   - `SAS Cancelled Credits` = Sum of `totalCancelledCredits` from `sashourly` table
   - `SAS Gross` = `SAS Drop - SAS Cancelled Credits`

## Understanding Variation Values

### Zero Variation (0)
✅ **Perfect alignment** - Both systems agree on revenue
- Movement data matches SAS data
- SAS time window is correctly set
- No data integrity issues

### Positive Variation (+X)
⚠️ **Meters show MORE than SAS**
- SAS time window may be too narrow (missing data)
- SAS system may not have recorded all transactions
- Meter readings may be inflated

### Negative Variation (-X)
⚠️ **Meters show LESS than SAS**
- SAS time window may be too wide (including extra data)
- **Most common cause: SAS window includes data from BEFORE the previous collection**
- Meter readings may be incorrect

## Your Case: -104,535 Variation

This means the **SAS system shows 104,535 MORE** in gross revenue than the physical meters show.

### Most Likely Causes:

1. **SAS Time Window Too Wide**
   - The `sasStartTime` is set too far back in time
   - It's including SAS data from before the previous collection
   - Solution: Recalculate SAS times using the "Sync Meters" feature

2. **Incorrect Previous Meters (prevIn/prevOut)**
   - If `prevIn`/`prevOut` are too LOW, Movement Gross will be inflated
   - If they're incorrect, your Movement calculation will be wrong
   - Solution: Use the "Fix Report" feature to correct previous meters

3. **RAM Clear Not Properly Handled**
   - If a RAM clear happened and wasn't properly recorded
   - The `prevIn`/`prevOut` should be reset, but SAS window should start from RAM clear time
   - Solution: Manually adjust the collection after identifying RAM clear

## How to Fix Variation

### Method 1: Sync Meters (Quick Fix)

**Use when:** SAS time windows are incorrect

**How it works:**
1. Recalculates `sasStartTime` and `sasEndTime` for each collection
2. Re-queries the `sashourly` table for correct data
3. Updates `sasMeters.drop`, `sasMeters.totalCancelledCredits`, `sasMeters.gross`
4. Does NOT change `prevIn`/`prevOut` or meter readings

**Steps:**
1. Go to Collection Report Details page
2. Click "Sync Meters" button
3. Wait for process to complete
4. Check if variation improved

### Method 2: Fix Report (Comprehensive Fix)

**Use when:** Multiple issues exist (SAS times, movement calculations, previous meters)

**How it works:**
1. **Phase 1 - Fix Collection Data:**
   - Fixes SAS times (missing, inverted, incorrect)
   - Fixes movement calculations (if stored values don't match actual calculations)
   - Fixes `prevIn`/`prevOut` (ensures they match previous collection's `metersIn`/`metersOut`)
   - Fixes collection history entries
   - Fixes machine history entries

2. **Phase 2 - Update Machine State:**
   - Updates `machine.collectionMeters` to match latest collection
   - Ensures consistency across system

**Steps:**
1. Go to Collection Report Details page
2. Click "Fix Report" button
3. Review issues detected
4. Confirm fix
5. Wait for process to complete (may take time for large reports)
6. Check variation again

### Method 3: Manual Investigation

**Use when:** Automated fixes don't resolve the issue

**Steps:**

1. **Check Collection Data:**
```javascript
// In MongoDB or via API
db.collections.findOne({ _id: "YOUR_COLLECTION_ID" })

// Check these fields:
- metersIn, metersOut (current meter readings)
- prevIn, prevOut (previous collection meters)
- movement.metersIn, movement.metersOut, movement.gross (calculated values)
- sasMeters.drop, sasMeters.totalCancelledCredits, sasMeters.gross
- sasMeters.sasStartTime, sasMeters.sasEndTime (SAS time window)
```

2. **Verify SAS Data:**
```javascript
// Check SAS hourly data for the machine
db.sashourly.find({
  machine: "MACHINE_ID",
  timestamp: {
    $gte: ISODate("SAS_START_TIME"),
    $lte: ISODate("SAS_END_TIME")
  }
}).sort({ timestamp: 1 })

// Sum up drop and totalCancelledCredits to verify SAS Gross
```

3. **Check Previous Collection:**
```javascript
// Find the previous collection
db.collections.findOne({
  machineId: "MACHINE_ID",
  timestamp: { $lt: ISODate("CURRENT_COLLECTION_TIME") },
  isCompleted: true
}).sort({ timestamp: -1 })

// Verify that current collection's prevIn/prevOut matches
// previous collection's metersIn/metersOut
```

4. **Look for RAM Clears:**
```javascript
// Check machine history for RAM clears
db.machines.findOne({ _id: "MACHINE_ID" }, { collectionMetersHistory: 1 })

// Look for entries with:
- isRamClear: true
- metersIn and metersOut near 0 or reset values
```

## How Variation Becomes Zero Over Time

Variation naturally approaches zero as:

1. **Correct SAS Windows Are Set**
   - Each collection has accurate `sasStartTime` and `sasEndTime`
   - SAS windows don't overlap or have gaps

2. **Accurate Meter Readings**
   - Physical meter readings are correctly recorded
   - No data entry errors

3. **Proper RAM Clear Handling**
   - When meters reset, both `prevIn`/`prevOut` AND SAS times are adjusted
   - No "lost" meter data from before RAM clear

4. **Data Integrity**
   - Collection history is maintained correctly
   - Previous meters chain properly (each collection's `metersIn`/`metersOut` becomes next collection's `prevIn`/`prevOut`)

## Best Practices

### For New Collections:

1. **Always check variation immediately after finalizing a report**
2. **If variation is large (> 1000), investigate before continuing**
3. **Use "Sync Meters" first** (quick, safe, doesn't change physical readings)
4. **Use "Fix Report" if Sync Meters doesn't resolve it**
5. **Document any manual adjustments** in variance reason field

### For Existing Reports:

1. **Don't panic about historical variation**
   - Old reports may have accumulated errors
   - Focus on getting NEW reports correct

2. **Fix reports chronologically**
   - Start with oldest report and work forward
   - Each fix improves the next report's baseline

3. **After fixing a report, check the NEXT report**
   - The fix may cascade to improve subsequent reports
   - The next report's `prevIn`/`prevOut` depends on this report

## Common Scenarios

### Scenario 1: First Collection After System Install
- **Expected:** prevIn = 0, prevOut = 0
- **SAS Window:** Should start from machine's first SAS data
- **Variation:** May be high if SAS started recording before first collection

### Scenario 2: Collection After RAM Clear
- **Expected:** prevIn = last reading before RAM clear, prevOut = same
- **SAS Window:** Should start from RAM clear time
- **Variation:** Should be near 0 if properly handled

### Scenario 3: Regular Collection
- **Expected:** prevIn = previous collection's metersIn, prevOut = previous collection's metersOut
- **SAS Window:** Should start from previous collection's timestamp
- **Variation:** Should be near 0 (within ±100 is acceptable)

## Technical Reference

### Key Database Fields:

**Collections Document:**
```typescript
{
  _id: string,
  machineId: string,
  timestamp: Date,
  metersIn: number,        // Current meter reading (in)
  metersOut: number,       // Current meter reading (out)
  prevIn: number,          // Previous collection's metersIn
  prevOut: number,         // Previous collection's metersOut
  movement: {
    metersIn: number,      // metersIn - prevIn
    metersOut: number,     // metersOut - prevOut
    gross: number          // movement.metersIn - movement.metersOut
  },
  sasMeters: {
    drop: number,          // Sum from sashourly
    totalCancelledCredits: number,
    gross: number,         // drop - totalCancelledCredits
    sasStartTime: string,  // ISO date string
    sasEndTime: string     // ISO date string
  }
}
```

### Key API Endpoints:

- `POST /api/collection-report/[reportId]/sync-meters` - Recalculate SAS data
- `POST /api/collection-reports/fix-report` - Comprehensive fix (requires authentication, but not admin/developer roles)
- `GET /api/collection-report/[reportId]/check-sas-times` - Check for issues

## Need More Help?

If variation persists after trying these methods:

1. Export the collection data (use MongoDB query above)
2. Check the SAS hourly data for the time period
3. Verify meter readings with physical machine inspection
4. Contact system administrator with specific collection IDs showing issues

