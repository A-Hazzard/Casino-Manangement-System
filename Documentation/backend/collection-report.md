# Collection Report System - Backend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 20th, 2025

## Overview

The backend handles collection report creation, SAS metrics calculation, machine time management, and report queries. This guide documents all backend logic for the collection report system.

**Important:** All date filtering respects each location's gaming day offset. See [Gaming Day Offset System](./gaming-day-offset-system.md) for details.

## Database Schema

### Collections Collection (Machine-Level Entries)
```typescript
{
  _id: string;
  isCompleted: boolean;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  softMetersIn: number;
  softMetersOut: number;
  notes: string;
  timestamp: Date;
  collectionTime: Date;
  location: string;
  collector: string;
  locationReportId: string;
  sasMeters: {
    machine: string;
    drop: number;
    totalCancelledCredits: number;
    gross: number;
    gamesPlayed: number;
    jackpot: number;
    sasStartTime: string;
    sasEndTime: string;
  };
  movement: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  machineCustomName: string;
  machineId: string;
  machineName: string;
  ramClear: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  serialNumber: string;
}
```

### Collection Report Collection (Location-Level)
```typescript
{
  _id: string;
  variance: number;
  previousBalance: number;
  currentBalance: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  collectorName: string;
  locationName: string;
  locationReportId: string;
  location: string;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross: number;
  timestamp: Date;
  varianceReason?: string;
  previousCollectionTime?: Date;
  locationProfitPerc?: number;
  reasonShortagePayment?: string;
  balanceCorrection?: number;
  balanceCorrectionReas?: string;
  machinesCollected?: string;
}
```

### Machine Collection Meters
```typescript
{
  collectionMeters: {
    metersIn: number;
    metersOut: number;
  };
  collectionMetersHistory: [{
    _id: ObjectId;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    timestamp: Date;
    locationReportId: string;
  }];
  collectionTime: Date;
  previousCollectionTime: Date;
}
```

## API Endpoints

### POST /api/collections
**Purpose**: Create a new collection with calculated metrics

**Flow**:
1. Validate payload (machineId, location, collector, meters)
2. Get machine details
3. Get previous collection meters from `machine.collectionMeters`
4. Calculate SAS time window (`getSasTimePeriod`)
5. Calculate SAS metrics from `sashourly` collection
6. Calculate movement values
7. Save collection document with empty `locationReportId`
8. Return created collection to frontend

**File**: `app/api/collections/route.ts`

**Key Function**: `createCollectionWithCalculations` (`lib/helpers/collectionCreation.ts`)

**Important**: Does NOT update `machine.collectionMeters` or create history entries. These operations happen when report is finalized.

### POST /api/collectionReport
**Purpose**: Create a new collection report (finalize collections)

**Flow**:
1. Check for existing report on same gaming day
2. Validate required fields
3. Calculate totals from all collections
4. Create CollectionReport document
5. Update all collections with `locationReportId`
6. Create `collectionMetersHistory` entries for all machines
7. Update `machine.collectionMeters` to current values
8. Update machine collection times
9. Update gaming location previousCollectionTime
10. Log activity

**File**: `app/api/collectionReport/route.ts`

**Critical**: This is when `collectionMetersHistory` entries are created, not during collection creation.

### GET /api/collectionReport
**Purpose**: Fetch collection reports with filtering

**Features**:
- Time period filtering (Today, Yesterday, last7days, last30days, Custom)
- Date range filtering with gaming day offset support
- Location and licensee filtering
- Monthly aggregation support
- Locations with machines query

**Parameters**:
- `timePeriod`: Predefined time period
- `startDate` & `endDate`: Custom date range
- `locationName`: Filter by specific location
- `licencee`: Filter by licensee
- `locationsWithMachines`: Return locations with machine lists

**File**: `app/api/collectionReport/route.ts`

### PUT /api/collectionReport/[reportId]
**Purpose**: Update existing collection report

**Flow**:
1. Validate report exists
2. Update financial fields
3. Recalculate totals if needed
4. Log activity

**Editable Fields**:
- Financial amounts (taxes, advance, variance, collected amount)
- Balance corrections and reasons
- Collection notes

**File**: `app/api/collection-report/[reportId]/route.ts`

### DELETE /api/collection-report/[reportId]
**Purpose**: Delete collection report and revert machine meters

**Flow**:
1. Find all collections for the report
2. For each collection:
   - Find previous collection for the machine
   - Revert `machine.collectionMeters` to previous values
   - Remove entry from `machine.collectionMetersHistory`
3. Delete all collection documents
4. Delete collection report document
5. Log activity

**File**: `app/api/collection-report/[reportId]/route.ts`

**Critical**: Properly reverts machine state to before report was created.

### PUT /api/collections/[id]
**Purpose**: Update existing collection

**Flow**:
1. Validate collection exists
2. Recalculate SAS metrics
3. Recalculate movement values
4. Update collection document
5. Update corresponding `collectionMetersHistory` entry (not create new)
6. Log activity

**File**: `app/api/collections/[id]/route.ts`

**Important**: Uses `$set` with `arrayFilters` to update existing history entries, preventing duplicates.

### GET /api/collection-reports/check-all-issues
**Purpose**: Check for data inconsistencies

**Parameters**:
- `reportId`: Check specific report
- `machineId`: Check specific machine

**Checks Performed**:
1. Movement calculation mismatches (precision tolerance 0.1)
2. Inverted SAS times
3. Previous meter mismatches
4. Collection history orphaned entries
5. Collection history duplicate dates

**Returns**:
```typescript
{
  success: boolean;
  totalIssues: number;
  reportIssues: {
    [reportId]: {
      hasIssues: boolean;
      issueCount: number;
      machines: string[];
    };
  };
}
```

**File**: `app/api/collection-reports/check-all-issues/route.ts`

### POST /api/collection-reports/fix-report
**Purpose**: Fix detected issues in report or machine

**Parameters**:
- `reportId`: Fix specific report
- `machineId`: Fix specific machine

**Fix Operations**:
1. Movement recalculation
2. SAS time correction
3. Previous meter updates
4. Remove orphaned history entries
5. Fix duplicate history entries
6. Update machine collection meters

**Returns**:
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
    };
    errors: [];
  };
}
```

**File**: `app/api/collection-reports/fix-report/route.ts`

## Core Helper Functions

### Collection Creation (`lib/helpers/collectionCreation.ts`)

#### `createCollectionWithCalculations`
Orchestrates complete collection creation:
- Validates payload
- Gets SAS time period
- Calculates SAS metrics
- Calculates movement values
- Returns all calculated data

**Does NOT**:
- Update machine.collectionMeters
- Create collectionMetersHistory entries
- These operations happen during report finalization

#### `calculateMovement`
Calculates movement values:
```typescript
// Standard
movementIn = currentMetersIn - prevIn
movementOut = currentMetersOut - prevOut
gross = movementIn - movementOut

// RAM Clear (with ramClearMeters)
movementIn = (ramClearMetersIn - prevIn) + (currentMetersIn - 0)
movementOut = (ramClearMetersOut - prevOut) + (currentMetersOut - 0)
gross = movementIn - movementOut

// RAM Clear (without ramClearMeters)
movementIn = currentMetersIn
movementOut = currentMetersOut
gross = movementIn - movementOut
```

All values rounded to 2 decimal places.

#### `getSasTimePeriod`
Determines SAS time window:
- Queries for previous collection time
- Uses current collection time as end
- Handles custom SAS start times
- Validates time ranges (start must be before end)

#### `calculateSasMetrics`
Calculates SAS metrics from historical data:
- Queries `sashourly` collection for time period
- Aggregates drop, cancelled credits, gross
- Rounds all values to 2 decimal places
- Returns comprehensive SAS metrics object

### Collection Report Calculations (`app/api/lib/helpers/collectionReportCalculations.ts`)

#### `calculateCollectionReportTotals`
Calculates totals for collection reports:
- Queries all collections for report
- Sums movement data (drop, cancelled, gross)
- Sums SAS data (drop, cancelled, gross)
- Calculates variance
- Returns totals object

## SAS Time Window

### Concept
The SAS time window defines the period for SAS metrics aggregation:
- **Start Time**: Previous collection time for the machine
- **End Time**: Current collection time
- **Purpose**: Ensures accurate comparison between meter and SAS data

### Implementation
- Stored in `collections.sasMeters.sasStartTime` and `sasMeters.sasEndTime`
- Used to query `sashourly` collection for metrics
- Validated to ensure start is before end

### Movement vs SAS

**Movement-Based Metrics:**
- Use meter deltas between two points
- Baseline: `prevIn`, `prevOut` (preserved from creation)
- Current: `metersIn`, `metersOut`
- Delta: `movement.metersIn`, `movement.metersOut`
- Gross: `movement.gross`

**SAS-Based Metrics:**
- Use SAS protocol data for time window
- Drop: `sasMeters.drop`
- Cancelled: `sasMeters.totalCancelledCredits`
- Gross: `sasMeters.gross`

**Why Both:**
- Provides data integrity validation
- Variance analysis for discrepancies
- Operational insights

## Collection Meters History

### Purpose
Tracks historical meter readings for each machine across all collections.

### When Created
- Created ONLY when collection report is finalized
- NOT created when machine is added to list
- One entry per machine per report

### Structure
```typescript
{
  _id: ObjectId;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  timestamp: Date;
  locationReportId: string;
}
```

### Maintenance
- Updated when collection is edited (using `$set` with `arrayFilters`)
- Removed when collection report is deleted
- Cleaned up when orphaned (no matching report/collection)
- Deduplicated when multiple entries for same date exist

## Issue Detection Logic

### Movement Validation
```typescript
const expectedMovementIn = currentMetersIn - prevIn;
const actualMovementIn = collection.movement.metersIn;
const diff = Math.abs(expectedMovementIn - actualMovementIn);

if (diff > 0.1) {
  // Issue detected
}
```

### SAS Time Validation
```typescript
const sasStart = new Date(collection.sasMeters.sasStartTime);
const sasEnd = new Date(collection.sasMeters.sasEndTime);

if (sasStart >= sasEnd) {
  // Invalid time range detected
}
```

### Previous Meter Validation
```typescript
const previousCollection = await findPreviousCollection(machineId, currentTimestamp);
const expectedPrevIn = previousCollection?.metersIn || 0;

if (Math.abs(collection.prevIn - expectedPrevIn) > 0.1) {
  // Mismatch detected
}
```

### History Validation
```typescript
// Orphaned entry check
const collectionsExist = await Collections.findOne({ locationReportId });
const reportExists = await CollectionReport.findOne({ locationReportId });

if (!collectionsExist || !reportExists) {
  // Orphaned entry detected
}

// Duplicate date check
const dateGroups = groupByDate(collectionMetersHistory);
if (dateGroups.some(group => group.length > 1)) {
  // Duplicate detected
}
```

## Data Flow

### Collection Creation
```
Frontend: User enters meter data
    ↓
POST /api/collections
    ↓
createCollectionWithCalculations()
    ↓
- Get previous meters from machine.collectionMeters
- Calculate SAS time window
- Calculate SAS metrics from sashourly
- Calculate movement values
- Save collection (locationReportId = "")
    ↓
Return collection to frontend
```

### Report Finalization
```
Frontend: User clicks "Create Report"
    ↓
POST /api/collectionReport
    ↓
- Check for duplicate report on same gaming day
- Calculate totals from all collections
- Create CollectionReport document
- Update collections with locationReportId
- Create collectionMetersHistory entries
- Update machine.collectionMeters
- Update machine collection times
- Update location previousCollectionTime
    ↓
Return success to frontend
```

### Report Deletion
```
Frontend: User deletes report
    ↓
DELETE /api/collection-report/[reportId]
    ↓
- Find all collections for report
- For each collection:
  - Find previous collection
  - Revert machine.collectionMeters to previous values
  - Remove entry from collectionMetersHistory
- Delete all collections
- Delete collection report
    ↓
Return success to frontend
```

## Key Implementation Details

### Collection Meters Update Timing
**When machine is added to list**:
- Collection created with empty `locationReportId`
- Machine.collectionMeters NOT updated
- collectionMetersHistory NOT created

**When report is created**:
- All collections updated with `locationReportId`
- Machine.collectionMeters updated to current values
- collectionMetersHistory entries created
- Machine collection times updated

**Why**: Prevents premature updates and duplicate history entries.

### Edit Behavior
**When editing a collection**:
- Uses ORIGINAL `prevIn`/`prevOut` values (preserved from creation)
- Recalculates movement with these baseline values
- Updates existing `collectionMetersHistory` entry (not create new)
- Maintains data consistency

### RAM Clear Handling
**With ramClearMetersIn/Out**:
```
movement.metersIn = (ramClearMetersIn - prevIn) + (currentMetersIn - 0)
movement.metersOut = (ramClearMetersOut - prevOut) + (currentMetersOut - 0)
```

**Without ramClearMetersIn/Out**:
```
movement.metersIn = currentMetersIn
movement.metersOut = currentMetersOut
```

### SAS Time Window
**Calculation**:
- `sasStartTime`: Previous collection time for machine
- `sasEndTime`: Current collection time
- **Validation**: sasStartTime must be < sasEndTime

**Usage**:
- Queries `sashourly` collection for time period
- Aggregates SAS metrics (drop, cancelled, gross)
- All values rounded to 2 decimal places

### Location Aggregations
**From Collections to Collection Report**:
- `totalDrop` = sum of `movement.metersIn`
- `totalCancelled` = sum of `movement.metersOut`
- `totalGross` = sum of `movement.gross`
- `totalSasGross` = sum of `sasMeters.gross`
- `variance` = difference between movement and SAS totals

## Issue Detection System

### Movement Calculation Validation
**Check**: Stored movement values vs calculated values
**Precision**: Tolerance of 0.1 for floating-point comparisons
**Scenarios**: Standard and RAM Clear collections

### SAS Time Validation
**Check**: sasStartTime < sasEndTime
**Fix**: Corrects inverted time ranges using proper logic

### Previous Meter Validation
**Check**: prevIn/prevOut match actual previous collection
**Fix**: Updates to correct previous meter values

### Collection History Validation
**Orphaned Entries**:
- Checks if both Collections and CollectionReport exist for locationReportId
- Removes entries with no matching documents

**Duplicate Dates**:
- Groups history entries by date (without time)
- Identifies multiple entries for same date
- Keeps most accurate entry (matched with collection data)
- Removes duplicates

## Fix Operations

### Movement Fix
```typescript
// Recalculate movement
const expectedMovement = calculateMovement(
  metersIn,
  metersOut,
  prevIn,
  prevOut,
  ramClear,
  ramClearMetersIn,
  ramClearMetersOut
);

// Update collection
await Collections.findByIdAndUpdate(collectionId, {
  $set: {
    'movement.metersIn': expectedMovement.metersIn,
    'movement.metersOut': expectedMovement.metersOut,
    'movement.gross': expectedMovement.gross,
  }
});
```

### SAS Time Fix
```typescript
// Get correct SAS times
const { sasStartTime, sasEndTime } = await getSasTimePeriod(
  machineId,
  customSasStart,
  collectionTime
);

// Update collection
await Collections.findByIdAndUpdate(collectionId, {
  $set: {
    'sasMeters.sasStartTime': sasStartTime,
    'sasMeters.sasEndTime': sasEndTime,
  }
});
```

### History Cleanup
```typescript
// Remove orphaned entries
const validEntries = [];
for (const entry of collectionMetersHistory) {
  const hasCollections = await Collections.findOne({
    locationReportId: entry.locationReportId
  });
  const hasReport = await CollectionReport.findOne({
    locationReportId: entry.locationReportId
  });
  
  if (hasCollections && hasReport) {
    validEntries.push(entry);
  }
}

// Fix duplicate dates
const dateGroups = groupByDate(validEntries);
for (const [date, entries] of dateGroups) {
  if (entries.length > 1) {
    const bestEntry = selectBestEntry(entries);
    validEntries = validEntries.filter(e => 
      getDate(e.timestamp) !== date || e === bestEntry
    );
  }
}

// Update machine
await Machine.findByIdAndUpdate(machineId, {
  $set: { collectionMetersHistory: validEntries }
});
```

## Data Consistency

### Atomic Operations
All critical operations use atomic updates:
- Collection creation
- Report finalization
- Meter updates
- History management

### Validation
Comprehensive validation at all levels:
- Input validation
- Business logic validation
- Data consistency validation
- Time range validation

### Error Handling
Proper error handling throughout:
- Clear error messages
- Rollback on failures
- Comprehensive logging
- User-friendly responses

## Performance Optimization

### Database Queries
- Proper indexing on frequently queried fields
- Aggregation pipelines for complex queries
- Efficient filtering at database level
- Minimize round trips to database

### Caching
- Strategic caching of frequently accessed data
- Cache invalidation on data changes
- Reduced database load

### Data Processing
- Process data in batches where appropriate
- Optimize aggregation queries
- Use efficient data structures

## Best Practices

### Code Organization
- Separate concerns into focused helper functions
- Use consistent naming conventions
- Implement proper error handling
- Maintain comprehensive logging

### Database Operations
- Use atomic operations for critical updates
- Implement proper indexing
- Validate data before operations
- Use aggregation pipelines for complex queries

### API Design
- Consistent response formats
- Proper HTTP status codes
- Clear error messages
- Comprehensive validation

### Security
- Input sanitization
- Authentication checks
- Authorization enforcement
- Activity logging