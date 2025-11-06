# Collection Report Details - Backend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 6th, 2025

## Overview

This document describes the backend implementation for the Collection Report Details page, including data retrieval, machine metrics calculation, SAS comparisons, and issue detection/fixing.

## Purpose

Presents machine-level outcomes within a single location's collection report, including comparison between movement-based metrics and SAS-based metrics per machine, and aggregated location totals.

## API Endpoints

### GET /api/collection-report/[reportId]

**Purpose**: Fetch detailed data for specific collection report

**Flow**:

1. Connect to database
2. Extract reportId from URL
3. Query CollectionReport collection
4. Query Collections collection for all machines in report
5. Calculate machine metrics
6. Calculate location totals
7. Return comprehensive report data

**Returns**:

```typescript
{
  reportId: string;
  locationName: string;
  collectorName: string;
  timestamp: string;
  collectionDate: string;
  machineMetrics: MachineMetric[];
  locationMetrics: LocationMetrics;
  sasMetrics: SasMetrics;
}
```

**File**: `app/api/collection-report/[reportId]/route.ts`

### GET /api/collection-report/[reportId]/check-sas-times

**Purpose**: Check for SAS time and movement issues in specific report

**Updated:** November 6th, 2025 - Enhanced history validation logic

**Flow**:

1. Fetch all collections for report
2. For each collection:
   - Validate movement calculations
   - Check SAS time ranges
   - Verify previous meter references
3. Check machine history for machines in report:
   - Compares each history entry to its corresponding collection document (via locationReportId)
   - Validates prevMetersIn/prevMetersOut match collection's prevIn/prevOut
   - Only flags real mismatches (not false positives for first collections)
4. Return detailed issue information

**Returns**:

```typescript
{
  success: boolean;
  issues: CollectionIssue[];
  totalIssues: number;
}
```

**File**: `app/api/collection-report/[reportId]/check-sas-times/route.ts`

### GET /api/collection-reports/check-all-issues

**Purpose**: Check collection reports and machine history for data integrity issues

**Updated:** November 6th, 2025 - Enhanced to check machine history for reports

**Parameters**:

- `reportId` (optional): Check specific report and all machines in it
- `machineId` (optional): Check specific machine's history across all reports

**Flow**:

1. Validates either `reportId` or `machineId` is provided (no global scans)
2. If `reportId`:
   - Fetches all collections in the report
   - Gets all unique machine IDs from those collections
   - Checks machine history for each machine
3. If `machineId`:
   - Checks machine history for that specific machine
4. For each machine, checks:
   - Duplicate `locationReportId` entries in history
   - Orphaned history entries (collection/report no longer exists)
   - History mismatches (history values don't match collection document)
5. Compares ALL fields: `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`
6. Returns detailed machine issues grouped by report

**Key Enhancement (November 6th, 2025):**
Previously only checked machine history when `machineId` was provided. Now also checks all machines when `reportId` is provided, enabling collection report details page to detect history corruption automatically.

**Returns**:

```typescript
{
  success: boolean;
  totalIssues: number;
  reportIssues: Record<
    string,
    {
      issueCount: number;
      hasIssues: boolean;
      machines: string[];
    }
  >;
  machines: Array<{
    machineId: string;
    machineName: string;
    issues: Array<{
      type: 'history_mismatch' | 'orphaned_history' | 'duplicate_history';
      locationReportId: string;
      message: string;
      details?: object;
    }>;
  }>;
}
```

**File**: `app/api/collection-reports/check-all-issues/route.ts`

### POST /api/collection-report/[reportId]/fix-sas-times

**Purpose**: Fix all detected issues in specific report

**Flow**:

1. Fetch all collections for report
2. For each collection with issues:
   - Recalculate movement values
   - Fix SAS time ranges
   - Update previous meter references
   - Update machine history
3. Maintain chronological consistency
4. Return fix results

**File**: `app/api/collection-report/[reportId]/fix-sas-times/route.ts`

## Data Structures

### Machine Metrics

```typescript
{
  id: string;
  machineId: string;
  actualMachineId: string;
  dropCancelled: string;
  metersGross: number;
  sasGross: number;
  variation: number;
  sasStartTime: string;
  sasEndTime: string;
  ramClear: boolean;
}
```

### Location Metrics

```typescript
{
  droppedCancelled: string;
  metersGross: number;
  sasGross: number;
  variation: number;
  variance: number;
  varianceReason: string;
  amountToCollect: number;
  collectedAmount: number;
  locationRevenue: number;
  amountUncollected: number;
  machinesNumber: string;
  reasonForShortage: string;
  taxes: number;
  advance: number;
  previousBalanceOwed: number;
  currentBalanceOwed: number;
  balanceCorrection: number;
  correctionReason: string;
}
```

### SAS Metrics

```typescript
{
  dropped: number;
  cancelled: number;
  gross: number;
}
```

## Machine-Level Metrics Calculation

### Movement-Based Metrics

**Per Collection Entry:**

- Baseline: `prevIn`, `prevOut` (preserved from creation, used for edits)
  - Current: `metersIn`, `metersOut`
- Delta: `movement.metersIn`, `movement.metersOut` (rounded to 2 decimals)
- Gross: `movement.gross` (rounded to 2 decimals)

**RAM Clear Handling:**

- When `ramClear = true`, uses `ramClearMetersIn`/`ramClearMetersOut` as baseline
- Prevents inflated deltas after meter resets
- Special calculation logic for RAM Clear scenarios

### SAS-Based Metrics

**Per Collection Entry (`sasMeters`):**

- `drop`: Cash accepted over SAS window (rounded to 2 decimals)
- `totalCancelledCredits`: Credits cancelled over SAS window (rounded to 2 decimals)
- `gross`: Gross derived from SAS data (rounded to 2 decimals)
- `gamesPlayed`: Games played counter (integer)
- `jackpot`: Jackpot amount (rounded to 2 decimals)

### Variation Calculation

```
Variation = Movement Gross - SAS Gross
```

- Both values already rounded to 2 decimals
- Can be positive or negative
- Indicates data integrity

## Location-Level Aggregations

### Movement Totals

```typescript
totalDrop = sum(collections.movement.metersIn);
totalCancelled = sum(collections.movement.metersOut);
totalGross = sum(collections.movement.gross);
```

### SAS Totals

```typescript
totalSasDrop = sum(collections.sasMeters.drop);
totalSasCancelled = sum(collections.sasMeters.totalCancelledCredits);
totalSasGross = sum(collections.sasMeters.gross);
```

### Financial Fields

- `variance`: Difference between movement and SAS totals
- `varianceReason`: Explanation for variance
- `amountToCollect`, `amountCollected`, `amountUncollected`: Settlement fields
- `partnerProfit`: Location's revenue share
- `taxes`, `advance`, `balanceCorrection`: Financial adjustments

## Sync Meters Flow

### Purpose

Refresh SAS-derived values within defined SAS time window for all machines in report.

### Process

1. Trigger sync for report's `locationReportId`
2. For each collection in report:
   - Re-read SAS counters from `sashourly` collection
   - Use existing `sasStartTime` and `sasEndTime`
   - Update `sasMeters.*` fields
3. Recompute location totals
4. Update CollectionReport document

**Does NOT**:

- Modify `prevIn`/`prevOut` (baseline values)
- Change collection timestamps
- Create new history entries

## Issue Detection System

### Movement Calculation Validation

**Standard Collections:**

```typescript
expectedMovementIn = metersIn - prevIn;
expectedMovementOut = metersOut - prevOut;
expectedGross = expectedMovementIn - expectedMovementOut;

// Compare with stored values (tolerance 0.1)
if (Math.abs(expectedMovementIn - collection.movement.metersIn) > 0.1) {
  // Issue detected
}
```

**RAM Clear Collections:**

```typescript
if (ramClear && ramClearMetersIn && ramClearMetersOut) {
  expectedMovementIn = ramClearMetersIn - prevIn + (metersIn - 0);
  expectedMovementOut = ramClearMetersOut - prevOut + (metersOut - 0);
} else if (ramClear) {
  expectedMovementIn = metersIn;
  expectedMovementOut = metersOut;
}
expectedGross = expectedMovementIn - expectedMovementOut;
```

### SAS Time Validation

```typescript
const sasStart = new Date(sasMeters.sasStartTime);
const sasEnd = new Date(sasMeters.sasEndTime);

if (sasStart >= sasEnd) {
  issues.push({
    type: 'inverted_sas_times',
    machineId,
    sasStartTime,
    sasEndTime,
  });
}
```

### Previous Meter Validation

```typescript
const previousCollection = await Collections.findOne({
  machineId,
  timestamp: { $lt: currentTimestamp },
  isCompleted: true,
})
  .sort({ timestamp: -1 })
  .limit(1);

const expectedPrevIn = previousCollection?.metersIn || 0;
const expectedPrevOut = previousCollection?.metersOut || 0;

if (
  Math.abs(collection.prevIn - expectedPrevIn) > 0.1 ||
  Math.abs(collection.prevOut - expectedPrevOut) > 0.1
) {
  // Mismatch detected
}
```

### Machine History Validation

**Orphaned Entries:**

```typescript
for (const entry of collectionMetersHistory) {
  const hasCollections = await Collections.findOne({
    locationReportId: entry.locationReportId,
  });
  const hasReport = await CollectionReport.findOne({
    locationReportId: entry.locationReportId,
  });

  if (!hasCollections || !hasReport) {
    // Orphaned entry - remove it
  }
}
```

**Duplicate Dates:**

```typescript
const dateGroups = new Map();
for (const entry of collectionMetersHistory) {
  const date = new Date(entry.timestamp).toISOString().split('T')[0];
  if (!dateGroups.has(date)) {
    dateGroups.set(date, []);
  }
  dateGroups.get(date).push(entry);
}

for (const [date, entries] of dateGroups) {
  if (entries.length > 1) {
    // Keep best entry, remove duplicates
  }
}
```

## Fix System Implementation

### Fix Report Endpoint

**Endpoint**: `POST /api/collection-reports/fix-report`

**Updated:** November 6th, 2025 - Enhanced history sync logic

**Parameters**:

- `reportId`: Fix specific report
- `machineId`: Fix specific machine

**Operations**:

1. Movement recalculation
2. SAS time correction
3. Previous meter updates
4. **Machine history synchronization** (ENHANCED - Always runs)
5. Machine history cleanup (removes duplicates and orphaned entries)
6. Data consistency validation

**Key Behavior**:

- History synchronization runs on ALL entries, regardless of whether duplicates were found
- Ensures history always matches collection documents exactly
- Fixes corruption including wrong prevMeters values from future collections

**Critical Enhancement - History Sync (November 6th, 2025)**:

The fix now properly syncs `collectionMetersHistory` with actual collection documents:

```typescript
// Finds history entry by locationReportId (unique identifier)
const historyEntry = currentHistory.find(
  entry => entry.locationReportId === collection.locationReportId
);

// Syncs ALL fields from collection to history
await Machine.findByIdAndUpdate(
  collection.machineId,
  {
    $set: {
      'collectionMetersHistory.$[elem].metersIn': collection.metersIn,
      'collectionMetersHistory.$[elem].metersOut': collection.metersOut,
      'collectionMetersHistory.$[elem].prevMetersIn': collection.prevIn || 0,
      'collectionMetersHistory.$[elem].prevMetersOut': collection.prevOut || 0,
      'collectionMetersHistory.$[elem].timestamp': new Date(
        collection.timestamp
      ),
    },
  },
  {
    arrayFilters: [{ 'elem.locationReportId': collection.locationReportId }],
  }
);
```

**Why This Works:**

- `locationReportId` is unique per collection (more reliable than metersIn/metersOut)
- Syncs all fields to ensure complete accuracy
- Fixes cases where history has wrong values (ANY field: metersIn, metersOut, prevIn, prevOut)
- Used by both "Fix Report" button and "Fix History" button on cabinet details

**CRITICAL PRINCIPLE - Collections Are Always Right:**

- ✅ Collection documents = Source of Truth (validated, finalized, audit-ready)
- ✅ History = Denormalized copy (performance optimization, can get out of sync)
- ✅ Fix direction: ALWAYS history ← collection (NEVER collection ← history)
- ✅ All fields synced from collection to history without exception
- ✅ If history shows 347.9K but collection shows 0 → history gets updated to 0

**Frontend Integration (Auto-Fix & Auto-Requery):**

- Frontend automatically calls this endpoint when issues are detected
- After fix completes, frontend automatically requeries:
  - Collection report data
  - Collection history issues
  - Machine metrics
- UI automatically updates to hide warning banners and buttons
- No page reload required - seamless user experience
- Shows success toast: "Collection history automatically synchronized"

**Response**:

```typescript
{
  success: boolean;
  results: {
    collectionsProcessed: number;
    issuesFixed: {
      sasTimesFixed: number;
      movementCalculationsFixed: number;
      prevMetersFixed: number;
      historyEntriesFixed: number;
      machineHistoryFixed: number;
    }
    errors: [];
  }
}
```

### Machine History Fix

```typescript
async function fixMachineHistoryOrphanedAndDuplicates(
  reportIdOrMachineId: string,
  fixResults: FixResults,
  isMachineSpecific: boolean
) {
  // Get relevant collections
  const collections = isMachineSpecific
    ? await Collections.find({ machineId: reportIdOrMachineId })
    : await Collections.find({ locationReportId: reportIdOrMachineId });

  const machineIds = [...new Set(collections.map(c => c.machineId))];

  for (const machineId of machineIds) {
    const machine = await Machine.findById(machineId);
    let history = machine.collectionMetersHistory;

    // Remove orphaned entries
    history = await removeOrphanedEntries(history);

    // Fix duplicate dates
    history = fixDuplicateDates(history, collections);

    // Update machine
    await Machine.findByIdAndUpdate(machineId, {
      $set: { collectionMetersHistory: history },
    });
  }
}
```

## Data Relationships

### Collection → Collection Report

- Each collection links to parent report via `locationReportId`
- Multiple collections aggregate to single CollectionReport
- Location totals calculated from all collections

### Collection → Machine

- Each collection references machine via `machineId`
- Machine stores current meters in `collectionMeters`
- Machine stores history in `collectionMetersHistory`

### Collection History Timeline

```
Collection 1 (Oct 1)
  ↓
Machine.collectionMeters updated
Machine.collectionMetersHistory[0] created
  ↓
Collection 2 (Oct 2)
  ↓
Machine.collectionMeters updated
Machine.collectionMetersHistory[1] created
  ↓
Collection 3 (Oct 3)
  ↓
And so on...
```

## Sync Meters Behavior

### What It Does

- Re-reads SAS counters from `sashourly` collection
- Uses existing `sasStartTime` and `sasEndTime` from collections
- Updates `sasMeters.*` fields in collections
- Recomputes CollectionReport totals

### What It Does NOT Do

- Modify `prevIn`/`prevOut` (baseline values)
- Change collection timestamps
- Create new history entries
- Alter movement calculations

## Best Practices

### Data Consistency

- Always validate before database operations
- Use atomic updates for critical changes
- Maintain proper history chain
- Handle edge cases (RAM Clear, first collection, etc.)

### Performance

- Use efficient database queries
- Implement proper indexing
- Cache frequently accessed data
- Process data in batches

### Error Handling

- Validate all inputs
- Provide clear error messages
- Log all errors comprehensively
- Implement proper rollback mechanisms

### Maintenance

- Keep documentation up to date
- Log significant operations
- Monitor system performance
- Regular data integrity checks
