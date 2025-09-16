# Collections API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025

## Quick Search Guide

Use **Ctrl+F** to find these key topics:
- **amount to collect calculation** - How the system calculates collection amounts
- **balance correction** - How balance corrections work and are calculated
- **collection process** - Step-by-step collection workflow
- **meter calculations** - How meter readings are processed and calculated
- **variance analysis** - How variance between SAS and meters is calculated
- **collection history** - How collection history is tracked and stored
- **database fields** - All model fields and their purposes

## Overview

The Collections API manages individual machine collections, meter data synchronization, and collector information. It handles the complete collection process from meter readings to financial calculations and balance management.

## Collection System

### What Happens When You Create a Collection

1. **Database Operations**:
   - Creates `Collection` document in `collections` collection
   - Stores meter readings, movement calculations, and SAS data
   - Links to `locationReportId` for report association
   - Updates machine's `collectionMetersHistory`

2. **Collection Model Fields**:
```typescript
Collection {
  _id: string;                    // Unique collection identifier
  machineId: string;              // Reference to machine document
  machineCustomName: string;      // Display name of machine
  location: string;               // Location name
  collector: string;              // Collector name/ID
  locationReportId: string;       // Links to CollectionReport
  
  // Meter Readings
  metersIn: number;               // Current meters in reading
  metersOut: number;              // Current meters out reading
  prevIn: number;                 // Previous meters in reading
  prevOut: number;                // Previous meters out reading
  
  // Movement Calculations
  movement: {
    metersIn: number;             // metersIn - prevIn
    metersOut: number;            // metersOut - prevOut
    gross: number;                // metersIn movement - metersOut movement
  };
  
  // SAS Data (if available)
  sasMeters: {
    drop: number;                 // SAS drop amount
    totalCancelledCredits: number; // SAS cancelled credits
    gross: number;                // SAS gross amount
    gamesPlayed: number;          // Games played during period
    jackpot: number;              // Jackpot amount
    sasStartTime: string;         // SAS period start time
    sasEndTime: string;           // SAS period end time
  };
  
  // Collection Details
  collectionTime: Date;           // When collection was performed
  notes: string;                  // Collection notes
  ramClear: boolean;              // Whether ram clear was performed
  ramClearMetersIn: number;       // Ram clear meters in
  ramClearMetersOut: number;      // Ram clear meters out
  
  // Status
  isCompleted: boolean;           // Whether collection is finalized
  softMetersIn: number;           // Soft meter reading (before denomination)
  softMetersOut: number;          // Soft meter reading (before denomination)
  
  // Audit Fields
  createdAt: Date;
  updatedAt: Date;
}
```

3. **Movement Calculation Formulas**:
```javascript
// Movement Calculations
movement.metersIn = metersIn - prevIn
movement.metersOut = metersOut - prevOut
movement.gross = movement.metersIn - movement.metersOut

// SAS Gross Calculation (if SAS data available)
sasMeters.gross = sasMeters.drop - sasMeters.totalCancelledCredits

// Variance Calculation
variance = movement.gross - sasMeters.gross
```

## Amount to Collect Calculation

### What Happens When Amount to Collect Is Calculated

1. **Calculation Process**:
   - Retrieves all machine entries for the collection report
   - Calculates total movement data from all machines (handles RAM Clear scenarios)
   - Applies financial adjustments (variance, advance, taxes)
   - Calculates partner profit based on profit share percentage
   - Determines final amount to collect

2. **Meter Reading System**:

**Standard Meter Calculations:**
```javascript
// For each machine entry:
Collection Drop = Current metersIn - Previous metersIn
Collection Cancelled = Current metersOut - Previous metersOut
Collection Gross = Collection Drop - Collection Cancelled
```

**RAM Clear Meter Calculations:**
```javascript
// When RAM Clear is true and RAM Clear meters are provided:
Collection Drop = (RAM Clear metersIn - Previous metersIn) + (Current metersIn - 0)
Collection Cancelled = (RAM Clear metersOut - Previous metersOut) + (Current metersOut - 0)

// When RAM Clear is true but no RAM Clear meters provided (meters reset to 0):
Collection Drop = Current metersIn
Collection Cancelled = Current metersOut
```

**Zero Movement Scenarios:**
- New meters can equal previous meters (resulting in 0 drop/cancelled)
- Example: Previous metersIn: 1,000, Current metersIn: 1,000 → Drop = 0

3. **Amount to Collect Formula**:
```javascript
// Step 1: Calculate Total Movement Data
totalMovementData = collectedMachineEntries.map(entry => ({
  drop: entry.movement.metersIn,
  cancelledCredits: entry.movement.metersOut,
  gross: entry.movement.gross
}));

// Step 2: Calculate Report Total Data
reportTotalData = totalMovementData.reduce((prev, current) => ({
  drop: prev.drop + current.drop,
  cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
  gross: prev.gross + current.gross
}), { drop: 0, cancelledCredits: 0, gross: 0 });

// Step 3: Apply Financial Adjustments
const taxes = Number(financials.taxes) || 0;
const variance = Number(financials.variance) || 0;
const advance = Number(financials.advance) || 0;
const previousBalance = Number(financials.previousBalance) || 0;
const profitShare = selectedLocation?.profitShare || 0;

// Step 4: Calculate Partner Profit
const partnerProfit = Math.floor((reportTotalData.gross - variance - advance) * profitShare / 100) - taxes;

// Step 5: Calculate Amount to Collect
const amountToCollect = reportTotalData.gross - variance - advance - partnerProfit + previousBalance;
```

3. **Amount to Collect Example**:
```javascript
// Example Calculation
// Total Gross: $1,000
// Variance: $0
// Advance: $50
// Profit Share: 50%
// Taxes: $25
// Previous Balance: $200

// Partner Profit = Floor((1000 - 0 - 50) * 50 / 100) - 25 = Floor(475) - 25 = 450
// Amount to Collect = 1000 - 0 - 50 - 450 + 200 = $700
```

## Balance Correction System

### What Happens When Balance Correction Is Calculated

1. **Balance Correction Process**:
   - Retrieves amount to collect from collection report
   - Retrieves actual amount collected by staff
   - Calculates difference between expected and actual
   - Updates location balance accordingly

2. **Balance Correction Formula**:
```javascript
// Balance Correction Calculation
const amountToCollect = Number(financials.amountToCollect) || 0;
const amountCollected = Number(financials.collectedAmount) || 0;
const balanceCorrection = amountCollected - amountToCollect;

// Balance Update Formula
const newBalance = previousBalance + amountToCollect - amountCollected + balanceCorrection;
```

3. **Balance Correction Examples**:
```javascript
// Scenario 1: Perfect Collection
// Amount to Collect: $500
// Amount Collected: $500
// Balance Correction: $500 - $500 = $0
// New Balance: Previous Balance + $0

// Scenario 2: Short Collection
// Amount to Collect: $500
// Amount Collected: $480
// Balance Correction: $480 - $500 = -$20
// New Balance: Previous Balance - $20

// Scenario 3: Over Collection
// Amount to Collect: $500
// Amount Collected: $520
// Balance Correction: $520 - $500 = +$20
// New Balance: Previous Balance + $20
```

## Collection History Tracking

### What Happens When Collection History Is Updated

1. **History Update Process**:
   - Adds new entry to machine's `collectionMetersHistory` array
   - Stores current and previous meter readings
   - Links to `locationReportId` for audit trail
   - Updates machine's current collection settings

2. **Collection History Model Fields**:
```typescript
CollectionHistoryEntry {
  _id: string;                    // Unique history entry ID
  metersIn: number;               // Meters in reading at collection
  metersOut: number;              // Meters out reading at collection
  prevMetersIn: number;           // Previous collection meters in
  prevMetersOut: number;          // Previous collection meters out
  timestamp: Date;                // Collection timestamp
  locationReportId: string;       // Links to collection report
}
```

3. **History Update Formulas**:
```javascript
// Add to Collection History
const historyEntry = {
  _id: generateUniqueId(),
  metersIn: currentMetersIn,
  metersOut: currentMetersOut,
  prevMetersIn: previousMetersIn,
  prevMetersOut: previousMetersOut,
  timestamp: new Date(),
  locationReportId: locationReportId
};

// Update Machine Collection Settings
machine.collectionMeters = {
  metersIn: currentMetersIn,
  metersOut: currentMetersOut
};
machine.collectionTime = new Date();
```

## Variance Analysis

### What Happens When Variance Is Calculated

1. **Variance Calculation Process**:
   - Compares meter-based calculations with SAS data
   - Calculates difference between expected and actual amounts
   - Identifies discrepancies for investigation
   - Records variance reason if applicable

2. **Variance Analysis Formula**:
```javascript
// Variance Calculation
const metersGross = totalMovementData.reduce((sum, entry) => sum + entry.movement.gross, 0);
const sasGross = totalMovementData.reduce((sum, entry) => {
  if (entry.sasMeters && entry.sasMeters.gross) {
    return sum + entry.sasMeters.gross;
  }
  return sum;
}, 0);

const variance = metersGross - sasGross;

// Variance Display Logic
if (sasGross === 0 || !sasDataAvailable) {
  return "No SAS Data";
} else if (variance === 0) {
  return "No Variance";
} else {
  return variance;
}
```

3. **Variance Investigation Process**:
```javascript
// Variance Analysis Steps
1. Identify Variance: System highlights discrepancies
2. Review Meter Readings: Verify accuracy of manual readings
3. Check SAS Data: Confirm SAS system accuracy
4. Document Reason: Enter explanation in varianceReason field
5. Apply Correction: Adjust collections as needed
```

## API Endpoints

### Collections Management

**Base URL:** `/api/collections`

#### GET /api/collections
**What it does**: Retrieves collection data with filtering and pagination
**Database Operations**:
- Queries `collections` collection with filters
- Applies date range, location, and machine filters
- Returns paginated results with metadata
**Query Parameters**: `page`, `limit`, `locationId`, `machineId`, `startDate`, `endDate`
**Response Fields**: Array of `Collection` objects with pagination info
**Used By**: Collection management pages and reports

#### POST /api/collections
**What it does**: Creates a new machine collection
**Database Operations**:
- Validates collection data
- Calculates movement and gross amounts
- Creates new `Collection` document
- Updates machine's collection history
**Request Fields**: All `Collection` model fields except `_id`, `createdAt`, `updatedAt`
**Response Fields**: Created `Collection` object with calculated fields
**Used By**: Collection forms and machine collection processes

#### PATCH /api/collections/[id]
**What it does**: Updates an existing machine collection
**Database Operations**:
- Finds collection by ID
- Updates specified fields
- Recalculates dependent values
- Logs change activity
**Request Fields**: Any `Collection` model fields to update
**Response Fields**: Updated `Collection` object
**Used By**: Collection editing forms

#### DELETE /api/collections/[id]
**What it does**: Soft deletes a machine collection
**Database Operations**:
- Finds collection by ID
- Sets `deletedAt` timestamp
- Logs deletion activity
**Request Fields**: Collection ID to delete
**Response Fields**: Success confirmation message
**Used By**: Collection management pages

### Collection Reports

**Base URL:** `/api/collection-report`

#### GET /api/collection-report
**What it does**: Retrieves collection report data with advanced filtering
**Database Operations**:
- Queries `collections` collection with filters
- Aggregates data by location and time period
- Calculates summary statistics
**Query Parameters**: `locationId`, `startDate`, `endDate`, `groupBy`, `includeMeters`
**Response Fields**: Array of report objects with aggregated data
**Used By**: Collection report pages and analytics

#### GET /api/collection-report/[reportId]
**What it does**: Retrieves a specific collection report by ID
**Database Operations**:
- Queries `collections` collection by `locationReportId`
- Aggregates collection data for the report
- Calculates financial metrics and totals
**Path Parameters**: `reportId` - Unique report identifier
**Response Fields**: Detailed report object with all collections
**Used By**: Collection report detail pages

#### POST /api/collection-report/sync-meters
**What it does**: Synchronizes meter data for collection reports
**Database Operations**:
- Updates meter data for specified machine
- Recalculates movement and gross amounts
- Updates related collection records
**Request Fields**: `locationId`, `machineId`, `meterData`, `syncTime`
**Response Fields**: Success confirmation with updated data
**Used By**: Meter synchronization processes

### Collection Report (Alternative Route)

**Base URL:** `/api/collectionReport`

#### GET /api/collectionReport
**What it does**: Retrieves collection report data with location-based filtering
**Database Operations**:
- Queries `collections` collection with location filters
- Aggregates data by location and time period
- Calculates performance metrics
**Query Parameters**: `locationId`, `startDate`, `endDate`, `format`
**Response Fields**: Array of location-based report objects
**Used By**: Location-specific collection reports

#### GET /api/collectionReport/locations
**What it does**: Retrieves collection report data grouped by locations
**Database Operations**:
- Queries `collections` collection grouped by location
- Aggregates financial data by location
- Calculates location performance metrics
**Query Parameters**: `startDate`, `endDate`, `includeDetails`
**Response Fields**: Array of location-based aggregated data
**Used By**: Location comparison reports

### Collectors Management

**Base URL:** `/api/collectors`

#### GET /api/collectors
**What it does**: Retrieves collector information
**Database Operations**:
- Queries `collectors` collection with filters
- Calculates collector performance metrics
- Returns collector details with statistics
**Query Parameters**: `active`, `locationId`
**Response Fields**: Array of `Collector` objects with performance data
**Used By**: Collector management pages

## Collector Model

```typescript
Collector {
  _id: string;                    // Unique collector identifier
  name: string;                   // Collector display name
  employeeId: string;             // Employee ID number
  locationId: string;             // Assigned location ID
  locationName: string;           // Location display name
  active: boolean;                // Whether collector is active
  lastCollection: Date;           // Last collection timestamp
  totalCollections: number;       // Total number of collections performed
  createdAt: Date;                // Collector creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

## Financial Calculations Summary

### Core Collection Formulas

```javascript
// Movement Calculations
movement.metersIn = currentMetersIn - previousMetersIn
movement.metersOut = currentMetersOut - previousMetersOut
movement.gross = movement.metersIn - movement.metersOut

// Amount to Collect Calculation
amountToCollect = grossRevenue - variance - advance - partnerProfit + previousBalance

// Balance Correction Calculation
balanceCorrection = amountCollected - amountToCollect

// New Balance Calculation
newBalance = previousBalance + amountToCollect - amountCollected + balanceCorrection

// Partner Profit Calculation
partnerProfit = Floor((grossRevenue - variance - advance) * profitShare / 100) - taxes
```

### Variance Analysis Formulas

```javascript
// Variance Calculation
variance = metersGross - sasGross

// Variance Display Logic
if (sasGross === 0) return "No SAS Data"
if (variance === 0) return "No Variance"
return variance
```

### Collection History Formulas

```javascript
// Add to History
historyEntry = {
  metersIn: currentMetersIn,
  metersOut: currentMetersOut,
  prevMetersIn: previousMetersIn,
  prevMetersOut: previousMetersOut,
  timestamp: new Date(),
  locationReportId: locationReportId
}
```

## Performance Considerations

### Database Optimization
- **Indexing**: Proper indexes on `machineId`, `locationReportId`, `collectionTime`
- **Aggregation**: Efficient aggregation pipelines for report calculations
- **Query Optimization**: Optimized queries with proper filtering
- **Caching**: Response caching for frequently accessed collection data

### API Performance
- **Pagination**: Efficient pagination for large collection datasets
- **Response Compression**: Compressed responses for large collection data
- **Rate Limiting**: Protection against excessive API usage
- **Background Processing**: Heavy calculations processed in background

## Security Features

### Access Control
- **Authentication**: JWT token required for all endpoints
- **Authorization**: Role-based access to collection data
- **Data Filtering**: Results filtered by user permissions
- **Audit Logging**: All collection operations logged for compliance

### Data Protection
- **Input Validation**: Comprehensive validation of all collection data
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: Protection against API abuse
- **Data Sanitization**: Output sanitization for security

## Error Handling

### Common Error Scenarios
- **Invalid Meter Readings**: Meter values outside expected ranges
- **Missing Required Fields**: Required collection data not provided
- **Calculation Errors**: Mathematical errors in financial calculations
- **Data Conflicts**: Conflicting collection data

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```
