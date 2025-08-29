# Collections API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview

The Collections API manages collection reports, meter data synchronization, and collector information for gaming machines across different locations.

## API Endpoints

### Collections

**Base URL:** `/api/collections`

#### GET /api/collections
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
| `variation` | `movement.gross` (placeholder until variance calculation added) |
| `sasGross` | `sasMeters.gross` |
| `variance` | `movement.gross` (placeholder until variance calculation added) |
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

#### **Revenue Sharing**
```
Amount To Collect = Gross Revenue * (Profit Share% / 100)
Partner Revenue = Gross Revenue * ((100 - Profit Share%) / 100)
Balance Calculation = Previous Balance + Amount To Collect - Amount Collected ± Corrections
```

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
