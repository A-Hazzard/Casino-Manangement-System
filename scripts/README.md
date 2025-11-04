# Investigation Scripts

**Last Updated:** November 4th, 2025

This folder contains essential database investigation scripts for debugging and data validation.

## Available Scripts

### 1. isCompleted Status Investigation (NEW - Nov 4th, 2025)

**File:** `investigate-iscompleted-false.js`

**Purpose:** Analyze all collections with `isCompleted: false` to identify data integrity issues

**Usage:**

```bash
node scripts/investigate-iscompleted-false.js
```

**Output:**

- Total count of collections with `isCompleted: false`
- Categorization by `locationReportId` status:
  - Collections with valid `locationReportId` (should be `isCompleted: true`)
  - Collections with invalid `locationReportId` (orphaned data)
  - Collections without `locationReportId` (truly incomplete drafts)
- Grouped by report for easy review
- Recommendations for each category

**Use Cases:**

- Identifying collections that should be marked complete
- Finding orphaned data that needs cleanup
- Verifying data integrity after system changes

---

### 2. isCompleted Status Fix (NEW - Nov 4th, 2025)

**File:** `fix-iscompleted-status.js`

**Purpose:** Safely update `isCompleted: false` → `true` for collections that belong to finalized reports

**Usage:**

```bash
# Dry run (shows what would be updated, no changes):
node scripts/fix-iscompleted-status.js

# Execute (actually applies changes):
node scripts/fix-iscompleted-status.js --execute
```

**Safety Features:**

- ✅ Dry-run mode by default
- ✅ Validates each collection has a valid report before updating
- ✅ Logs all changes
- ✅ Verification after update

**Output:**

- List of collections to update
- Grouped by report
- Update results and verification
- Recommendations

**⚠️ Important:** Always run in dry-run mode first to review changes before executing!

---

### 3. Machine Meters Investigation

**File:** `investigate-machine-meters.js`

**Purpose:** Investigate meter data (money in, money out, gross) for specific machines or all machines

**Usage:**

```bash
# Investigate all machines
node scripts/investigate-machine-meters.js

# Investigate specific machine
node scripts/investigate-machine-meters.js 507f1f77bcf86cd799
```

**Output:**

- Current collection meters (metersIn, metersOut, gross)
- Collection times (current and previous)
- Collection meters history (last 5 entries)
- Actual collections from database (last 5)

---

### 2. Location Meters Investigation

**File:** `investigate-location-meters.js`

**Purpose:** Investigate aggregated meter data for specific location or all locations

**Usage:**

```bash
# Investigate all locations (dashboard view)
node scripts/investigate-location-meters.js

# Investigate specific location
node scripts/investigate-location-meters.js 507f1f77bcf86cd799
```

**Output:**

- Aggregated totals per location (metersIn, metersOut, gross)
- Machine count per location
- Individual machine breakdown
- Grand totals across all locations

---

### 3. Dashboard Metrics Investigation

**File:** `investigate-dashboard-metrics.js`

**Purpose:** Investigate dashboard totals aggregated from all machines

**Usage:**

```bash
node scripts/investigate-dashboard-metrics.js
```

**Output:**

- Total meters in/out/gross across all machines
- Machines with/without meters count
- Breakdown by location
- Top 10 machines by gross revenue

---

### 4. Collection Reports Validation

**File:** `investigate-collection-reports.js`

**Purpose:** Investigate collection reports for data integrity issues:

- Previous meters mismatch
- Collection meters history inconsistencies
- Movement calculation accuracy
- SAS time validation

**Usage:**

```bash
# Investigate most recent report
node scripts/investigate-collection-reports.js

# Investigate specific report
node scripts/investigate-collection-reports.js abc123-def456-789
```

**Output:**

- Report details (location, collector, date)
- Per-machine analysis:
  - Previous meters check (vs actual previous collection)
  - Movement calculation validation
  - Collection meters history verification
  - SAS time window validation
- Issue summary with specific details

**Issue Types Detected:**

- `PREV_METERS_MISMATCH`: Collection prevIn/prevOut doesn't match actual previous collection
- `FIRST_COLLECTION_PREV_NOT_ZERO`: First collection has non-zero prev meters
- `MOVEMENT_CALCULATION_MISMATCH`: Stored movement doesn't match calculated movement
- `HISTORY_ENTRY_MISSING`: No history entry found in machine.collectionMetersHistory
- `HISTORY_ENTRY_MISMATCH`: History entry values don't match collection
- `HISTORY_DUPLICATES`: Multiple history entries for same report
- `HISTORY_MISSING`: Machine has no collectionMetersHistory array
- `SAS_TIMES_INVERTED`: SAS start time >= end time

---

## Prerequisites

### Environment Setup

All scripts require a `.env` file in the root directory with:

```env
MONGO_URI=your_mongodb_connection_string
```

### Dependencies

Scripts use the native MongoDB driver:

```bash
pnpm install mongodb dotenv
```

## How to Use

1. **Ensure MongoDB connection** is available
2. **Navigate to project root**
3. **Run the appropriate script** with optional parameters
4. **Review the output** for issues and metrics

## Common Use Cases

### Debugging Collection Issues

```bash
# Check most recent collection report for integrity
node scripts/investigate-collection-reports.js

# Check specific machine's meter data
node scripts/investigate-machine-meters.js 507f1f77bcf86cd799
```

### Verifying Dashboard Data

```bash
# Verify dashboard totals match database
node scripts/investigate-dashboard-metrics.js

# Compare location totals
node scripts/investigate-location-meters.js
```

### Pre-Deployment Validation

Before deploying changes to collection/meter logic:

1. Run `investigate-collection-reports.js` to verify latest report is clean
2. Run `investigate-dashboard-metrics.js` to verify totals are correct
3. Run `investigate-machine-meters.js` on a few test machines

## Troubleshooting

### Connection Timeout

**Error:** `connect ETIMEDOUT`  
**Cause:** MongoDB server not accessible or VPN/tunnel not connected  
**Solution:** Ensure database connection is available

### No Data Found

**Error:** `No machines/locations/reports found`  
**Cause:** Empty database or incorrect ID  
**Solution:** Verify database has data and IDs are correct

---

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 4th, 2025
