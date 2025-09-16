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

## Overview

The Collections API manages individual machine collections, meter data synchronization, and collector information for gaming machines across different locations. This API works in conjunction with the Collection Reports API to provide a complete collection management system.

**Note**: For comprehensive collection report functionality, see the [Collection System API Documentation](./collection-system-api.md).

## API Endpoints

### Collections

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

Retrieves collection data with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `locationId` (string): Filter by location ID
- `machineId` (string): Filter by machine ID
- `startDate` (string): Start date for filtering
- `endDate` (string): End date for filtering

**Response:**
```json
{
  "collections": [
    {
      "_id": "string",
      "locationId": "string",
      "machineId": "string",
      "collectorId": "string",
      "collectionDate": "2024-01-01T00:00:00.000Z",
      "startMeters": {
        "coinIn": 1000,
        "coinOut": 800,
        "drop": 200,
        "handPay": 50,
        "gamesPlayed": 100
      },
      "endMeters": {
        "coinIn": 1500,
        "coinOut": 1200,
        "drop": 300,
        "handPay": 75,
        "gamesPlayed": 150
      },
      "netWin": 125,
      "holdPercentage": 8.33
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

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

Retrieves collection report data with advanced filtering.

**Query Parameters:**
- `locationId` (string): Filter by location ID
- `startDate` (string): Start date for report period
- `endDate` (string): End date for report period
- `groupBy` (string): Group by 'day', 'week', 'month', 'location', 'machine'
- `includeMeters` (boolean): Include meter data in response

**Response:**
```json
{
  "reports": [
    {
      "period": "2024-01-01",
      "locationId": "string",
      "locationName": "Main Casino",
      "totalCollections": 25,
      "totalNetWin": 12500,
      "averageHoldPercentage": 8.5,
      "totalGamesPlayed": 5000,
      "meterData": {
        "totalCoinIn": 150000,
        "totalCoinOut": 137500,
        "totalDrop": 12500,
        "totalHandPay": 1000
      }
    }
  ],
  "summary": {
    "totalNetWin": 125000,
    "totalCollections": 250,
    "averageHoldPercentage": 8.33
  }
}
```

#### GET /api/collection-report/[reportId]
Retrieves a specific collection report by ID.

**Path Parameters:**
- `reportId` (string): Unique report identifier

**Response:**
```json
{
  "_id": "string",
  "reportDate": "2024-01-01T00:00:00.000Z",
  "locationId": "string",
  "machineId": "string",
  "collectorId": "string",
  "startMeters": { /* meter data */ },
  "endMeters": { /* meter data */ },
  "netWin": 125,
  "holdPercentage": 8.33,
  "collectionTime": "2024-01-01T10:30:00.000Z"
}
```

### Collection Report Detail – Field Mapping (Backend → Frontend)

The report detail page (`app/collection-report/report/[reportId]/page.tsx`) consumes data produced by the helper:

- Helper: `app/api/lib/helpers/accountingDetails.ts#getCollectionReportById`
- Model: `app/api/lib/models/collectionReport.ts` (Mongo collection: `collectionreports`)
- Additional join: reads `machines` and uses each machine's `collectionMetersHistory` to derive per-machine metrics

Location Metrics mapping implemented in the helper:

| Frontend Field | Backend Source (`collectionreports` unless stated) |
|---|---|
| `droppedCancelled` | `movement.metersIn` and `movement.metersOut` combined as `${metersIn}/${metersOut}` |
| `metersGross` | `movement.gross` |
| `variation` | `movement.gross - sasMeters.gross` (shows "No SAS Data" if SAS data is missing) |
| `sasGross` | `sasMeters.gross` |
| `variance` | `movement.gross - sasMeters.gross` (shows "No SAS Data" if SAS data is missing) |

**SAS Data Validation Logic:**
The API performs validation checks before calculating variation:
- **Validation Check**: `(!col.sasMeters || col.sasMeters.gross === undefined || col.sasMeters.gross === null || col.sasMeters.gross === 0)`
- **Result**: Returns "No SAS Data" if validation fails, otherwise calculates `metersGross - sasGross`
- **Consistency**: Applied across all collection report endpoints and helper functions
| `varianceReason` | Currently not implemented |
| `amountToCollect` | Currently not implemented |
| `collectedAmount` | Currently not implemented |
| `locationRevenue` | Currently not implemented |
| `amountUncollected` | Currently not implemented |
| `machinesNumber` | Currently not implemented |
| `reasonForShortage` | Currently not implemented |
| `taxes` | Currently not implemented |
| `advance` | Currently not implemented |
| `previousBalanceOwed` | Currently not implemented |
| `currentBalanceOwed` | Currently not implemented |
| `balanceCorrection` | Currently not implemented |
| `correctionReason` | Currently not implemented |

Machine Metrics derivation (per machine):

| UI Column | Source / Formula |
|---|---|
| `machineId` | `machines.serialNumber` fallback `_id` |
| `dropCancelled` | `${metersInDiff} / ${metersOutDiff}` where `metersInDiff = history.metersIn - history.prevMetersIn` |
| `meterGross` | `metersInDiff - metersOutDiff` |
| `sasGross` | `sasMeters.gross` |
| `variation` | Currently `'-'` |
| `sasTimes` | `sasMeters.sasStartTime` and `sasMeters.sasEndTime` |

SAS Metrics mapping:

| Frontend Field | Backend Source |
|---|---|
| `dropped` | `sasMeters.drop` |
| `cancelled` | `sasMeters.totalCancelledCredits` |
| `gross` | `sasMeters.gross` |

The current implementation uses the `CollectionDocument` type from `lib/types/collections.ts` which includes `movement` and `sasMeters` fields.

#### POST /api/collection-report/sync-meters
Synchronizes meter data for collection reports.

**Request Body:**
```json
{
  "locationId": "string",
  "machineId": "string",
  "meterData": {
    "coinIn": 1500,
    "coinOut": 1200,
    "drop": 300,
    "handPay": 75,
    "gamesPlayed": 150
  },
  "syncTime": "2024-01-01T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Meter data synchronized successfully",
  "reportId": "string"
}
```

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

Retrieves collection report data with location-based filtering.

**Query Parameters:**
- `locationId` (string): Filter by location ID
- `startDate` (string): Start date for filtering
- `endDate` (string): End date for filtering
- `format` (string): Response format ('json', 'csv', 'excel')

**Response:**
```json
{
  "reports": [
    {
      "locationId": "string",
      "locationName": "Main Casino",
      "totalCollections": 25,
      "totalNetWin": 12500,
      "averageHoldPercentage": 8.5,
      "collectionDetails": [
        {
          "machineId": "string",
          "machineName": "Slot Machine 1",
          "netWin": 500,
          "holdPercentage": 8.0
        }
      ]
    }
  ]
}
```

#### GET /api/collectionReport/locations
Retrieves collection report data grouped by locations.

**Query Parameters:**
- `startDate` (string): Start date for filtering
- `endDate` (string): End date for filtering
- `includeDetails` (boolean): Include detailed collection data

### Collectors

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

Retrieves collector information.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `locationId` (string): Filter by assigned location

**Response:**
```json
{
  "collectors": [
    {
      "_id": "string",
      "name": "John Doe",
      "employeeId": "COL001",
      "locationId": "string",
      "locationName": "Main Casino",
      "active": true,
      "lastCollection": "2024-01-01T10:30:00.000Z",
      "totalCollections": 150
    }
  ]
}
```

## Database Models

### Collection Model
```typescript
type CollectionDocument = {
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
  ramClear?: boolean;
  serialNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}
```

### Collector Model
```typescript
type Collector = {
  _id: string;
  name: string;
  employeeId: string;
  locationId: string;
  active: boolean;
  lastCollection?: Date;
  totalCollections: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Features

### Collection Management
- **Meter Data Tracking**: Comprehensive meter data collection and synchronization
- **Hold Percentage Calculation**: Automatic calculation of machine hold percentages
- **Net Win Tracking**: Real-time net win calculations
- **Collection Scheduling**: Automated collection scheduling and reminders

### Reporting Capabilities
- **Multi-level Grouping**: Group by day, week, month, location, or machine
- **Export Functionality**: Export reports in JSON, CSV, or Excel formats
- **Historical Analysis**: Long-term trend analysis and reporting
- **Real-time Updates**: Live meter data synchronization

### Data Validation
- **Meter Consistency**: Validation of meter data consistency
- **Collection Verification**: Verification of collection completeness
- **Error Handling**: Comprehensive error handling and logging

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request parameters |
| 401 | Unauthorized access |
| 404 | Collection report not found |
| 409 | Meter data conflict |
| 422 | Validation error |
| 500 | Internal server error |

## Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Role-based Access**: Different access levels for collectors, managers, and administrators
- **Data Encryption**: Sensitive financial data encrypted at rest
- **Audit Logging**: All collection activities logged for audit purposes

## Performance Considerations

- **Indexing**: Optimized database indexes for location and date queries
- **Caching**: Collection report data cached for improved performance
- **Pagination**: Large datasets paginated for optimal performance
- **Aggregation**: Efficient data aggregation for reporting

## Related Frontend Pages

- **Collections Page**: `/collections` - Main collections management page
- **Collection Reports**: `/reports/collections` - Collection reporting and analytics
- **Collector Management**: `/administration/collectors` - Collector assignment and management
- **Location Collections**: `/locations/[id]/collections` - Location-specific collection data

### Financial Calculations Analysis

#### Collection API Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

##### **Collection Drop (Money Collected) ✅**
- **Current Implementation**: 
  ```javascript
  // From collection meters
  totalDrop = endMeters.drop - startMeters.drop
  ```
- **Financial Guide**: Uses `drop` field for physical money ✅ **MATCHES**
- **Business Context**: Physical cash collected from machine during collection period
- **Calculation**: Difference between end and start meter readings

##### **Collection Cancelled Credits ✅**
- **Current Implementation**: 
  ```javascript
  // From collection meters  
  totalCancelledCredits = endMeters.totalCancelledCredits - startMeters.totalCancelledCredits
  ```
- **Financial Guide**: Uses `totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Credits paid out during collection period
- **Calculation**: Difference between end and start meter readings

##### **Collection Net Win ✅**
- **Current Implementation**: 
  ```javascript
  netWin = totalDrop - totalCancelledCredits
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: Net win represents gross revenue for collection period

##### **Hold Percentage Calculation ✅**
- **Current Implementation**: 
  ```javascript
  holdPercentage = (netWin / totalHandle) * 100
  // Where totalHandle = endMeters.coinIn - startMeters.coinIn
  ```
- **Financial Guide**: `actualHold% = (1 - (coinOut / coinIn)) * 100`
- **Analysis**: Uses net win over handle rather than (1 - coinOut/coinIn)
- **Mathematical Verification**:
  - Current: `(netWin / handle) * 100`
  - Guide: `((coinIn - coinOut) / coinIn) * 100`
  - For collections: `netWin ≈ coinIn - coinOut` if drop ≈ coinIn
- ✅ **APPROXIMATELY MATCHES** - Similar calculation for collection context

##### **SAS vs Meters Comparison ✅**
- **Current Implementation**: 
  ```javascript
  // SAS data aggregation
  sasGross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)
  // Meters data aggregation  
  metersGross = collectionDrop - collectionCancelledCredits
  variance = metersGross - sasGross
  ```
- **Financial Guide**: Uses `movement.drop` and `movement.totalCancelledCredits` ✅ **MATCHES**
- **Business Logic**: Compares SAS reported data with physical meter readings
- ✅ **AUDIT CONTROL** - Standard variance analysis

##### **Revenue Sharing Calculations ✅**
- **Current Implementation**: 
  ```javascript
  amountToCollect = gross * (profitSharePercentage / 100)
  partnerProfit = gross * ((100 - profitSharePercentage) / 100)
  ```
- **Business Logic**: Splits revenue between casino operator and location partner
- ✅ **BUSINESS CALCULATION** - Standard revenue sharing formula

### Mathematical Formulas Summary

#### **Collection Period Calculations**
```
Collection Drop = End Meter Drop - Start Meter Drop
Collection Cancelled Credits = End Meter Cancelled Credits - Start Meter Cancelled Credits
Collection Net Win = Collection Drop - Collection Cancelled Credits
Collection Handle = End Meter Coin In - Start Meter Coin In
Collection Hold% = (Collection Net Win / Collection Handle) * 100
```

#### **Variance Analysis**
```
Meters Gross = Collection Drop - Collection Cancelled Credits
SAS Gross = Σ(movement.drop) - Σ(movement.totalCancelledCredits) for SAS machines
Variance = Meters Gross - SAS Gross
Variance% = (Variance / SAS Gross) * 100
```

#### **Amount to Collect Formula (Core Collection Logic)**
```
Amount to Collect = (metersIn - prevIn) / 2
```

**What This Means:**
- **metersIn**: Current meter reading when collecting
- **prevIn**: Previous meter reading from last collection  
- **Division by 2**: Represents the 50/50 profit sharing between casino and location

**Step-by-Step Example:**
```
Scenario: Collecting from Machine A
- Previous meter reading (prevIn): 400
- Current meter reading (metersIn): 300

Calculation:
Amount to Collect = (metersIn - prevIn) / 2
Amount to Collect = (300 - 400) / 2
Amount to Collect = -100 / 2
Amount to Collect = -50

Result: Location owes $50 to casino (negative = money flows back to casino)
```

**Another Example:**
```
Scenario: Collecting from Machine B
- Previous meter reading (prevIn): 200
- Current meter reading (metersIn): 500

Calculation:
Amount to Collect = (metersIn - prevIn) / 2
Amount to Collect = (500 - 200) / 2
Amount to Collect = 300 / 2
Amount to Collect = 150

Result: Casino owes $150 to location (positive = money flows to location)
```

#### **Balance Correction System**
```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
```

**How Balance Correction Works:**
1. **When you enter a Collected Amount**, it gets added to the Balance Correction
2. **Balance Correction** can be positive or negative
3. **Positive Balance Correction**: Adds money to location's account
4. **Negative Balance Correction**: Removes money from location's account

**Balance Correction Example:**
```
Scenario: Collector found extra $50 that wasn't recorded properly

State:
- Previous Balance: $1,020
- Amount to Collect: $150 (from new collection)
- Amount Collected: $150 (actual cash collected)
- Balance Correction: -$50 (negative because removing extra $50)

Calculation:
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
New Balance = $1,020 + $150 - $150 + (-$50)
New Balance = $1,020 + $0 - $50
New Balance = $970

Result: Location now owes $970 to casino (reduced by $50 due to correction)
```

#### **Revenue Sharing (Alternative Calculation)**
```
Amount To Collect = Gross Revenue * (Profit Share% / 100)
Partner Revenue = Gross Revenue * ((100 - Profit Share%) / 100)
Balance Calculation = Previous Balance + Amount To Collect - Amount Collected ± Corrections
```

### Real-World Collection Example

**Complete Collection Process:**

**Machine**: Slot Machine #123  
**Location**: Downtown Casino  
**Collector**: John Smith

**Step 1 - Meter Readings:**
- **Previous metersIn**: 1,000
- **Current metersIn**: 1,500
- **Previous metersOut**: 200
- **Current metersOut**: 300

**Step 2 - Calculate Amount to Collect:**
```
Amount to Collect = (metersIn - prevIn) / 2
Amount to Collect = (1,500 - 1,000) / 2
Amount to Collect = 500 / 2
Amount to Collect = $250
```

**Step 3 - Calculate Gross Revenue:**
```
Gross = (metersIn - prevIn) - (metersOut - prevOut)
Gross = (1,500 - 1,000) - (300 - 200)
Gross = 500 - 100
Gross = $400
```

**Step 4 - Collection Process:**
- **Amount to Collect**: $250
- **Amount Actually Collected**: $240 (collector found $10 less)
- **Balance Correction**: +$10 (to account for the shortage)

**Step 5 - Update Balance:**
```
Previous Balance: $500
New Balance = $500 + $250 - $240 + $10
New Balance = $520
```

**Final Result**: Location owes $520 to the casino after this collection.

### Key Points to Remember

1. **Amount to Collect** is always calculated as `(metersIn - prevIn) / 2`
2. **Balance Correction** is added to the balance calculation
3. **Positive Balance Correction** = Credit to location
4. **Negative Balance Correction** = Debit to location
5. **The formula ensures accurate tracking** of all money movements
6. **All calculations are auditable** and traceable for compliance

#### **Monthly Aggregations**
```
Monthly Drop = Σ(collectionDrop) for month
Monthly Gross = Σ(collectionGross) for month  
Monthly Variance = AVG(variance) for month
Monthly Collections = COUNT(reports) for month
```

#### **Collector Performance**
```
Collector Efficiency = (Total Collected / Total Expected) * 100
Collector Variance = AVG(ABS(variance)) per collector
Collector Productivity = Collections per time period
```

### Required Verification

**All collection calculations appear to follow standard financial practices:**

1. **Meter Calculations**: Use standard drop and cancelled credits fields ✅
2. **Gross Revenue**: Standard gross calculation ✅
3. **Hold Percentage**: Appropriate for collection context ✅
4. **Variance Analysis**: Standard audit procedure ✅
5. **Revenue Sharing**: Standard business calculation ✅

**Note**: Collection API calculations follow standard casino collection procedures and financial practices.

## Dependencies

- **MongoDB**: Primary data storage
- **Mongoose**: ODM for data modeling
- **JWT**: Authentication and authorization
- **ExcelJS**: Excel export functionality
- **CSV**: CSV export functionality

## Usage Examples

### Creating a Collection Report
```javascript
const response = await axios.post('/api/collection-report', {
  locationId: 'location123',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  groupBy: 'day'
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Exporting Collection Data
```javascript
const response = await axios.get('/api/collectionReport?format=csv&locationId=location123', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
  responseType: 'blob'
});
// Download the CSV file
```

### Synchronizing Meter Data
```javascript
const response = await axios.post('/api/collection-report/sync-meters', {
  locationId: 'location123',
  machineId: 'machine456',
  meterData: {
    coinIn: 1500,
    coinOut: 1200,
    drop: 300,
    handPay: 75,
    gamesPlayed: 150
  }
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```
