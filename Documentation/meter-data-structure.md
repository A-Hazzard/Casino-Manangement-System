# Meter Data Structure Requirements

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 10, 2025  
**Version:** 1.0.0

## Overview

This document defines the REQUIRED structure for meter documents in the `meters` collection. All aggregation APIs depend on this structure. Meters missing these fields will result in $0 values in the UI.

## Critical Requirements

### ⚠️ MUST-HAVE Fields

All meter documents MUST include these fields for the system to function correctly:

1. **`readAt`** (Date) - Used for date filtering in ALL aggregation queries
2. **`movement`** (Object) - Contains all financial metrics used by aggregation APIs

### Complete Meter Structure

```typescript
{
  _id: string,                    // Unique meter ID (24-char hex string)
  machine: string,                // Machine ID (links to machines collection)
  location: string,               // Location ID (links to gaminglocations collection)
  
  // ⚠️ CRITICAL: readAt field used by ALL date queries
  readAt: Date,                   // Date/time for filtering (ISO 8601 format)
  timestamp: Date,                // Original timestamp (fallback, optional)
  
  // ⚠️ CRITICAL: movement object required by ALL aggregation APIs
  movement: {
    drop: number,                 // Money In - physical cash inserted
    coinIn: number,               // Handle - total bets placed
    coinOut: number,              // Coin Out - credits paid out
    totalCancelledCredits: number, // Money Out - manual payouts
    jackpot: number,              // Jackpot payouts
    totalHandPaidCancelledCredits: number, // Hand-paid cancelled credits
    gamesPlayed: number,          // Total games played
    gamesWon: number,             // Total games won
    currentCredits: number,       // Current credits in machine
    totalWonCredits: number       // Total credits won
  },
  
  // Top-level financial fields (backward compatibility)
  drop: number,
  coinIn: number,
  coinOut: number,
  totalCancelledCredits: number,
  jackpot: number,
  totalHandPaidCancelledCredits: number,
  gamesPlayed: number,
  gamesWon: number,
  currentCredits: number,
  totalWonCredits: number,
  
  // SAS Meters (embedded SAS data)
  sasMeters: {
    drop: number,
    coinIn: number,
    coinOut: number,
    totalCancelledCredits: number,
    jackpot: number,
    totalHandPaidCancelledCredits: number,
    gamesPlayed: number,
    gamesWon: number,
    currentCredits: number,
    totalWonCredits: number
  },
  
  // Bill Validator Meters
  billMeters: {
    dollar1: number,
    dollar2: number,
    dollar5: number,
    dollar10: number,
    dollar20: number,
    dollar50: number,
    dollar100: number,
    dollar500: number,
    dollar1000: number,
    dollar2000: number,
    dollar5000: number,
    dollar10000: number,
    dollarTotal: number,
    dollarTotalUnknown: number
  },
  
  createdAt: Date,                // Document creation timestamp
  updatedAt: Date,                // Document update timestamp
  __v: number                     // Mongoose version key
}
```

## Why These Fields Matter

### 1. `readAt` Field

**Purpose**: Primary date filtering field for ALL aggregation queries.

**Used By:**
- `/api/machines/aggregation` - Machine financial data
- `/api/reports/locations` - Location financial data
- `/api/dashboard/totals` - Dashboard totals
- `/api/locationAggregation` - Location aggregation
- `/api/locations/search-all` - Location search

**Query Pattern:**
```typescript
{
  $match: {
    machine: { $in: machineIds },
    readAt: { $gte: startDate, $lte: endDate }  // ⚠️ Uses readAt, not timestamp
  }
}
```

**❌ Common Mistake:**
```typescript
// WRONG - Will not filter correctly
{
  timestamp: { $gte: startDate, $lte: endDate }
}
```

### 2. `movement` Object

**Purpose**: Contains all financial metrics used by aggregation APIs.

**Used By:**
- All financial cards (Money In, Money Out, Gross)
- Dashboard charts and analytics
- Location tables and summaries
- Machine performance metrics

**Aggregation Pattern:**
```typescript
{
  $group: {
    _id: '$machine',
    moneyIn: { $sum: '$movement.drop' },               // ⚠️ Uses movement.drop
    moneyOut: { $sum: '$movement.totalCancelledCredits' },  // ⚠️ Uses movement
    jackpot: { $sum: '$movement.jackpot' }
  }
}
```

**❌ Common Mistake:**
```typescript
// WRONG - Will return $0 if movement field missing
{
  $group: {
    moneyIn: { $sum: '$sasMeters.drop' }  // Won't work for aggregation APIs
  }
}
```

## Creating Meters in Scripts

### ✅ CORRECT Example

```javascript
const meter = {
  _id: new ObjectId().toHexString(),  // String ID
  machine: machineId,
  location: locationId,
  readAt: new Date(),                 // ⚠️ REQUIRED
  timestamp: new Date(),
  
  // ⚠️ REQUIRED: movement object
  movement: {
    drop: 150,
    coinIn: 15000,
    coinOut: 12000,
    totalCancelledCredits: 0,
    jackpot: 0,
    totalHandPaidCancelledCredits: 0,
    gamesPlayed: 1500,
    gamesWon: 800,
    currentCredits: 0,
    totalWonCredits: 12000
  },
  
  // Top-level fields (copy from movement)
  drop: 150,
  coinIn: 15000,
  coinOut: 12000,
  totalCancelledCredits: 0,
  jackpot: 0,
  totalHandPaidCancelledCredits: 0,
  gamesPlayed: 1500,
  gamesWon: 800,
  currentCredits: 0,
  totalWonCredits: 12000,
  
  // SAS and Bill Meters
  sasMeters: { /* same as movement */ },
  billMeters: { /* bill denominations */ },
  
  createdAt: new Date(),
  updatedAt: new Date(),
  __v: 0
};

await db.collection('meters').insertOne(meter);
```

### ❌ INCORRECT Example

```javascript
// MISSING movement field and readAt - will cause $0 in UI
const meter = {
  _id: new ObjectId().toHexString(),
  machine: machineId,
  location: locationId,
  timestamp: new Date(),  // Only has timestamp (missing readAt)
  
  // Missing movement object!
  sasMeters: {
    drop: 150,
    coinIn: 15000
  }
};

await db.collection('meters').insertOne(meter);
// Result: UI will show $0 for all financial metrics
```

## Fixing Existing Meters

If you have meters without `readAt` or `movement` fields:

### Add `readAt` Field

```javascript
// Copy timestamp to readAt for all meters missing it
await db.collection('meters').updateMany(
  { readAt: { $exists: false } },
  [{ $set: { readAt: '$timestamp' } }]
);
```

### Add `movement` Field

```javascript
// Copy sasMeters to movement for all meters missing it
const meters = await db.collection('meters').find({ 
  movement: { $exists: false } 
}).toArray();

for (const meter of meters) {
  const movement = {
    drop: meter.sasMeters?.drop || meter.drop || 0,
    coinIn: meter.sasMeters?.coinIn || meter.coinIn || 0,
    coinOut: meter.sasMeters?.coinOut || meter.coinOut || 0,
    totalCancelledCredits: meter.sasMeters?.totalCancelledCredits || meter.totalCancelledCredits || 0,
    jackpot: meter.sasMeters?.jackpot || meter.jackpot || 0,
    totalHandPaidCancelledCredits: meter.sasMeters?.totalHandPaidCancelledCredits || 0,
    gamesPlayed: meter.sasMeters?.gamesPlayed || meter.gamesPlayed || 0,
    gamesWon: meter.sasMeters?.gamesWon || meter.gamesWon || 0,
    currentCredits: meter.sasMeters?.currentCredits || meter.currentCredits || 0,
    totalWonCredits: meter.sasMeters?.totalWonCredits || meter.totalWonCredits || 0
  };
  
  await db.collection('meters').updateOne(
    { _id: meter._id },
    { 
      $set: { 
        movement,
        // Also set top-level fields
        drop: movement.drop,
        coinIn: movement.coinIn,
        // ... etc
      } 
    }
  );
}
```

## Testing Meter Structure

### Verify Meter Has Required Fields

```javascript
const meter = await db.collection('meters').findOne({ location: locationId });

console.log('Has readAt?', meter.readAt ? 'YES ✅' : 'NO ❌');
console.log('Has movement?', meter.movement ? 'YES ✅' : 'NO ❌');
console.log('Has movement.drop?', meter.movement?.drop !== undefined ? 'YES ✅' : 'NO ❌');
```

### Test Aggregation Query

```javascript
// Test if meters can be queried correctly
const result = await db.collection('meters').aggregate([
  {
    $match: {
      machine: { $in: machineIds },
      readAt: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: null,
      totalDrop: { $sum: '$movement.drop' },
      totalCancelled: { $sum: '$movement.totalCancelledCredits' },
      count: { $sum: 1 }
    }
  }
]).toArray();

console.log('Meters found:', result[0]?.count || 0);
console.log('Total drop:', result[0]?.totalDrop || 0);

// If count > 0 but totalDrop = 0, meters are missing movement field
```

## Common Issues

### Issue: UI Shows $0 Despite Meters Existing

**Symptom**: Database has meters, but UI shows $0 for all financial metrics.

**Diagnosis:**
1. Check if meters have `movement` field
2. Check if meters have `readAt` field
3. Verify `movement.drop` and `movement.totalCancelledCredits` are not 0

**Solution:**
- Run the "Add movement Field" script above
- Run the "Add readAt Field" script above
- Verify meters after update

### Issue: Date Filters Not Working

**Symptom**: Changing date filters doesn't change displayed data.

**Diagnosis:**
1. Check if meters have `readAt` field
2. Check if `readAt` values are within selected date range

**Solution:**
- Ensure `readAt` field exists on all meters
- Verify `readAt` timestamps align with gaming day boundaries

### Issue: Chart Shows Data But Cards Show $0

**Symptom**: Dashboard chart displays data, but financial metric cards show $0.

**Root Cause**: 
- Chart may query `sasMeters` directly (works)
- Aggregation APIs query `movement` field (fails if missing)

**Solution:**
- Add `movement` field to all meters
- Ensure `movement` contains all required financial fields

## Reference Implementation

See these scripts for correct meter generation:
- `scripts/generate-barbados-test-data.js` - Complete meter structure example
- `scripts/add-movement-field-to-cabana-meters.js` - How to add movement field
- `scripts/add-readAt-to-cabana-meters.js` - How to add readAt field

---

**Key Takeaway**: Always include `readAt` and `movement` fields when creating meters. Without these, aggregation APIs will return $0 and the UI will show no financial data.

