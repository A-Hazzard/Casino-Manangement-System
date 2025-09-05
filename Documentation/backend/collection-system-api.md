# Collection System API Documentation

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: August 29th, 2025

## Overview

The Collection System API provides endpoints for managing casino machine collections and generating comprehensive financial reports. The system handles individual machine collections and aggregates them into location-level reports.

---

## API Endpoints

### 1. Collection Reports API (`/api/collectionReport`)

#### GET - Fetch Collection Reports

**Purpose**: Retrieves collection reports with optional filtering

**Query Parameters**:
- `timePeriod` (optional): Filter by time period ("Today", "Yesterday", "7d", "30d", "Custom")
- `startDate` (optional): Start date for custom range (ISO format)
- `endDate` (optional): End date for custom range (ISO format)
- `locationName` (optional): Filter by specific location name
- `licencee` (optional): Filter by licensee ID
- `locationsWithMachines` (optional): Return locations with their machines

**Response**: Array of collection report objects with machine counts

**Example**:
```
GET /api/collectionReport?timePeriod=7d&licencee=12345
```

#### POST - Create Collection Report

**Purpose**: Creates a new collection report and related collections

**Request Body**:
```json
{
  "variance": 100,
  "previousBalance": 500,
  "currentBalance": 600,
  "amountToCollect": 2000,
  "amountCollected": 1950,
  "amountUncollected": 50,
  "partnerProfit": 1000,
  "taxes": 200,
  "advance": 300,
  "collectorName": "John Doe",
  "locationName": "Main Casino",
  "locationReportId": "unique-report-id",
  "location": "location-id",
  "timestamp": "2025-01-15T10:30:00Z",
  "varianceReason": "Machine variance",
  "reasonShortagePayment": "Shortage due to technical issues",
  "balanceCorrection": 25,
  "balanceCorrectionReas": "Correction for previous error",
  "machines": [
    {
      "machineId": "machine-123",
      "machineName": "Slot Machine 1",
      "collectionTime": "2025-01-15T10:30:00Z",
      "metersIn": 1500,
      "metersOut": 200,
      "notes": "Machine working normally",
      "useCustomTime": true,
      "selectedDate": "2025-01-15",
      "timeHH": "10",
      "timeMM": "30"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": "unique-report-id"
}
```

**Backend Processing**:
1. Validates required fields
2. Calculates totals (totalDrop, totalCancelled, totalGross, totalSasGross)
3. Creates collection report record
4. Updates machine collectionMeters with new readings
5. Returns success confirmation

---

### 2. Collections API (`/api/collections`)

#### GET - List Collections

**Purpose**: Retrieves individual collection records

**Query Parameters**:
- `collector` (optional): Filter by collector user ID
- `isCompleted` (optional): Filter by completion status
- `location` (optional): Filter by location name
- `machineId` (optional): Filter by specific machine

**Response**: Array of collection documents

#### POST - Create Collection

**Purpose**: Creates a new individual collection record

**Request Body**:
```json
{
  "machineId": "machine-123",
  "machineName": "Slot Machine 1",
  "machineCustomName": "SM-001",
  "serialNumber": "SN123456",
  "timestamp": "2025-01-15T10:30:00Z",
  "metersIn": 1500,
  "metersOut": 200,
  "prevIn": 1400,
  "prevOut": 180,
  "softMetersIn": 1500,
  "softMetersOut": 200,
  "notes": "Collection completed successfully",
  "ramClear": false,
  "useCustomTime": true,
  "selectedDate": "2025-01-15",
  "timeHH": "10",
  "timeMM": "30",
  "isCompleted": false,
  "collector": "user-123",
  "location": "Main Casino",
  "locationReportId": "report-456",
  "sasMeters": {
    "machine": "Slot Machine 1",
    "drop": 100,
    "totalCancelledCredits": 20,
    "gross": 80,
    "gamesPlayed": 150,
    "jackpot": 0,
    "sasStartTime": "2025-01-14T10:30:00Z",
    "sasEndTime": "2025-01-15T10:30:00Z"
  },
  "movement": {
    "metersIn": 100,
    "metersOut": 20,
    "gross": 80
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "collection-789",
    "machineId": "machine-123",
    "metersIn": 1500,
    "metersOut": 200,
    "movement": {
      "metersIn": 100,
      "metersOut": 20,
      "gross": 80
    },
    "calculations": {
      "drop": 100,
      "cancelled": 20,
      "gross": 80
    }
  }
}
```

#### PATCH - Update Collection

**Purpose**: Updates an existing collection record

**Query Parameters**:
- `id`: Collection ID to update

**Request Body**: Partial collection object with fields to update

#### DELETE - Delete Collection

**Purpose**: Removes a collection record

**Query Parameters**:
- `id`: Collection ID to delete

**Response**:
```json
{
  "success": true
}
```

---

### 3. Collection Report Detail API (`/api/collection-report/[reportId]`)

#### GET - Get Report Details

**Purpose**: Retrieves detailed information for a specific collection report

**Response**:
```json
{
  "reportId": "report-456",
  "locationName": "Main Casino",
  "collectionDate": "1/15/2025, 10:30:00 AM",
  "machineMetrics": [
    {
      "id": "1",
      "machineId": "Slot Machine 1",
      "dropCancelled": "100 / 20",
      "metersGross": 80,
      "sasGross": "75",
      "variation": "5",
      "sasStartTime": "1/14/2025, 10:30:00 AM",
      "sasEndTime": "1/15/2025, 10:30:00 AM",
      "hasIssue": false
    }
  ],
  "locationMetrics": {
    "droppedCancelled": "100/20",
    "metersGross": 80,
    "variation": 5,
    "sasGross": 75,
    "locationRevenue": 0,
    "amountUncollected": 0,
    "amountToCollect": 2000,
    "machinesNumber": "1/5",
    "collectedAmount": 1950,
    "reasonForShortage": "Technical variance",
    "taxes": 200,
    "advance": 300,
    "previousBalanceOwed": 500,
    "currentBalanceOwed": 600,
    "balanceCorrection": 25,
    "correctionReason": "Previous error correction",
    "variance": 100,
    "varianceReason": "Machine variance"
  },
  "sasMetrics": {
    "dropped": 100,
    "cancelled": 20,
    "gross": 80
  }
}
```

#### POST - Sync Meters

**Purpose**: Synchronizes meter data for a specific report

**Response**:
```json
{
  "success": true,
  "message": "Meters synchronized successfully"
}
```

---

## Data Models

### Collection Document
```typescript
{
  _id: string;
  isCompleted: boolean;
  metersIn: number;           // Current meter reading for money in
  metersOut: number;          // Current meter reading for money out
  prevIn: number;             // Previous meter reading for money in
  prevOut: number;            // Previous meter reading for money out
  softMetersIn: number;       // Software meter reading for money in
  softMetersOut: number;      // Software meter reading for money out
  notes: string;              // Collection notes
  timestamp: Date;            // Collection timestamp
  location: string;           // Location name
  collector: string;          // Collector user ID
  locationReportId: string;   // Links to collection report
  sasMeters: {               // SAS system data
    machine: string;
    drop: number;
    totalCancelledCredits: number;
    gross: number;
    gamesPlayed: number;
    jackpot: number;
    sasStartTime: string;
    sasEndTime: string;
  };
  movement: {                // Calculated movement data
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
}
```

### Collection Report Document
```typescript
{
  _id: string;
  variance: number;                    // Financial variance amount
  previousBalance: number;             // Previous balance owed
  currentBalance: number;              // Current balance owed
  amountToCollect: number;             // Total amount to collect
  amountCollected: number;             // Actual amount collected
  amountUncollected: number;           // Amount not collected
  partnerProfit: number;               // Partner profit share
  taxes: number;                       // Tax amount
  advance: number;                     // Advance payment
  collectorName: string;               // Collector name
  locationName: string;                // Location name
  locationReportId: string;            // Unique report identifier
  location: string;                    // Location ID
  totalDrop: number;                   // Total drop amount
  totalCancelled: number;              // Total cancelled credits
  totalGross: number;                  // Total gross revenue
  totalSasGross: number;               // SAS calculated gross
  timestamp: Date;                     // Report timestamp
  varianceReason?: string;             // Variance explanation
  previousCollectionTime?: Date;       // Previous collection time
  locationProfitPerc?: number;         // Location profit percentage
  reasonShortagePayment?: string;      // Shortage payment reason
  balanceCorrection: number;           // Balance correction amount
  balanceCorrectionReas?: string;      // Correction reason
  machinesCollected: string;           // Number of machines collected
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Business Logic

### Collection Creation Process
1. **Validation**: Validate meter readings and financial data
2. **SAS Calculation**: Calculate SAS metrics for the time period
3. **Movement Calculation**: Calculate difference from previous collection
4. **Storage**: Create collection record with calculated fields
5. **Machine Update**: Update machine's collectionMeters

### Report Creation Process
1. **Collection Aggregation**: Group collections by locationReportId
2. **Total Calculation**: Calculate totals for drop, cancelled, gross
3. **SAS Aggregation**: Sum SAS gross calculations
4. **Report Creation**: Create single report record
5. **Machine Updates**: Update all machines with new meter readings

### Data Calculations

**Movement Calculation**:
```
Drop = Current metersIn - Previous metersIn
Cancelled = Current metersOut - Previous metersOut
Gross = Drop - Cancelled
```

**Report Totals**:
```
Total Drop = Sum of all machine drops
Total Cancelled = Sum of all machine cancelled
Total Gross = Total Drop - Total Cancelled
SAS Gross = Sum of SAS system gross calculations
```

---

## Error Handling

### Common Error Responses
- **400 Bad Request**: Missing required fields or invalid data
- **404 Not Found**: Report or collection not found
- **500 Internal Server Error**: Database or calculation errors

### Validation Rules
- Meter readings must be numeric and non-negative
- Financial amounts must be valid numbers
- Required fields cannot be empty or null
- Timestamps must be valid ISO date strings
- Machine IDs must reference existing machines

---

## Security Considerations

- All endpoints require authentication
- User permissions checked for data access
- Input validation prevents injection attacks
- Audit logging for all financial transactions
- Rate limiting on creation endpoints

---

This API documentation provides comprehensive information about the collection system endpoints, data models, and business logic for developers working with the system.
