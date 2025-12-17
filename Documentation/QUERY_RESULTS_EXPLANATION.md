# Query Results Explanation

## Overview

The query results show machines from the database, but most have **zero metrics** and **"Unknown Manufacturer"** because:

1. **No meter data in the selected time period** - Metrics come from the `meters` collection, filtered by date range
2. **Missing manufacturer data** - Machines without `manufacturer` or `manuf` fields default to "Unknown Manufacturer"
3. **Missing game data** - Machines without `game` field default to "(game name not provided)"

---

## Why Zero Metrics?

### How Metrics Are Calculated

The API endpoint (`/api/reports/machines`) uses an **aggregation pipeline** that:

1. **Finds all machines** in the database (not deleted)
2. **Looks up meter data** from the `meters` collection for each machine
3. **Filters meters by date range** (if a time period is selected)
4. **Sums up metrics** from all matching meter documents:
   - `drop` = Sum of `movement.drop`
   - `coinIn` = Sum of `movement.coinIn` (Handle)
   - `coinOut` = Sum of `movement.coinOut`
   - `gamesPlayed` = Sum of `movement.gamesPlayed`
   - `jackpot` = Sum of `movement.jackpot`
   - `netWin` = `coinIn - coinOut`
   - `gross` = `drop - totalCancelledCredits`

### Why Machines Show Zero

**If a machine has no meter documents in the selected time period, all metrics default to 0:**

```typescript
// From the aggregation pipeline
drop: { $ifNull: ['$meterData.drop', 0] },  // Defaults to 0 if no meters
coinIn: { $ifNull: ['$meterData.coinIn', 0] },  // Defaults to 0 if no meters
gamesPlayed: { $ifNull: ['$meterData.gamesPlayed', 0] },  // Defaults to 0 if no meters
```

**Common reasons for zero metrics:**

1. **No meter data exists** - Machine was never used or meters were never recorded
2. **Date range mismatch** - Meter data exists but outside the selected time period
3. **Machine is inactive** - Machine exists in database but hasn't had any activity
4. **Meter data not synced** - Meters collection doesn't have records for this machine

---

## Why "Unknown Manufacturer"?

### How Manufacturer Is Determined

The API checks for manufacturer data in this order:

```typescript
manufacturer: machine.manufacturer || machine.manuf || 'Unknown Manufacturer'
```

**If both `manufacturer` and `manuf` fields are missing or null, it defaults to "Unknown Manufacturer".**

### In Your Query Results

- **99% of machines** show `"Unknown Manufacturer"` because they don't have manufacturer data in the database
- **Only 1 machine** (GGRDY0107) has `"Manufacturer D"` because it has manufacturer data set

---

## Why "(game name not provided)"?

### How Game Title Is Determined

```typescript
gameTitle: machine.game || '(game name not provided)'
```

**If the `game` field is missing or null, it defaults to "(game name not provided)".**

### In Your Query Results

- **99% of machines** show `"(game name not provided)"` because they don't have game data
- **Only 1 machine** (GGRDY0107) has `"Game2"` because it has game data set

---

## The One Machine With Data

**Machine ID: `e5be161dd5ea30a6dc66b6ea` (GGRDY0107)**

This machine is different because:

1. **Has manufacturer data**: `"Manufacturer D"` (stored in database)
2. **Has game data**: `"Game2"` (stored in database)
3. **Has meter data**: Has meter documents in the `meters` collection for the selected time period
4. **Has activity metrics**:
   - `drop: 200`
   - `netWin: 200`
   - `gross: 200`
   - `gamesPlayed: 200`
   - `theoreticalHold: 5%`
   - `actualHold: 5%`

**This is likely one of the test machines** that was updated by the `update-test-machines-data.js` script.

---

## What This Means for the Evaluation Tab

### Current Behavior

1. **Machines with zero metrics are still shown** - They appear in the list but contribute nothing to charts
2. **"Unknown Manufacturer" machines are filtered out** - The evaluation tab filters out machines without valid manufacturers for the charts
3. **Only machines with data are meaningful** - Charts and summaries only show machines with actual activity

### Expected Behavior

- **Summary Section**: Shows 100% contribution because it calculates the contribution of filtered machines to their own totals
- **Manufacturer Charts**: Only shows manufacturers that have machines with valid manufacturer data AND activity
- **Game Charts**: Only shows games that have machines with valid game data AND activity
- **Top Machines Table**: Only shows machines with actual activity metrics

---

## How to Fix "Unknown Manufacturer" Machines

### Option 1: Update Database Directly

Update machines in MongoDB to set manufacturer data:

```javascript
// Example: Update machines to have manufacturer
db.machines.updateMany(
  { manufacturer: { $exists: false }, manuf: { $exists: false } },
  { $set: { manufacturer: "Manufacturer A" } }
);
```

### Option 2: Use the Test Data Script

The `scripts/update-test-machines-data.js` script updates machines with:
- Manufacturer data
- Game data
- Meter data for the current day

**Run it to populate test data:**

```bash
node scripts/update-test-machines-data.js
```

### Option 3: Filter in Frontend (Current Implementation)

The evaluation tab already filters out machines with:
- Empty/null/whitespace-only manufacturers
- Empty/null/whitespace-only game titles

**This prevents "Unknown Manufacturer" from appearing in charts**, but machines still appear in the full machine list with zero metrics.

---

## Summary

**Your query results show:**

1. **Most machines have zero metrics** because they have no meter data in the selected time period
2. **Most machines show "Unknown Manufacturer"** because they don't have manufacturer data in the database
3. **Most machines show "(game name not provided)"** because they don't have game data in the database
4. **Only 1 machine has data** (GGRDY0107) because it was updated with test data and has meter records

**This is expected behavior** - the API returns all machines, but only machines with:
- Valid manufacturer/game data (for charts)
- Meter data in the selected time period (for metrics)

...will show meaningful data in the evaluation tab.

