# Collection System API

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025

## Quick Search Guide (Ctrl+F)

- **collection reports** - Main collection report endpoints
- **create report** - POST endpoint for creating reports
- **update report** - PUT endpoint for updating reports
- **financial calculations** - All calculation formulas
- **data models** - Database field definitions
- **error handling** - Error codes and responses
- **monthly reports** - Monthly summary endpoints
- **scheduler** - Collection scheduling endpoints

## Overview

The Collection System API manages casino money collection operations, including collection reports, machine metrics, and financial calculations.

## Collection Reports

### GET `/api/collectionReport`

**Purpose:** List collection reports with filtering and pagination

**Query Parameters:**
- `timePeriod` - "Today", "Yesterday", "7d", "30d", "All Time", "Custom"
- `startDate` - Custom start date (ISO format)
- `endDate` - Custom end date (ISO format)
- `licencee` - Licensee ID filter
- `locationName` - Location name filter
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "reports": [
    {
      "_id": "report_id",
      "locationReportId": "location_report_id",
      "collectorName": "John Smith",
      "locationName": "Downtown Casino",
      "timestamp": "2025-01-15T10:30:00Z",
      "totalDrop": 5000,           // Total money collected
      "totalCancelled": 500,       // Total cancelled credits
      "totalGross": 4500,          // Net collection amount
      "amountCollected": 4000,     // Actual amount collected
      "amountUncollected": 500,    // Amount not collected
      "variance": 0,               // Difference between expected and actual
      "currentBalance": 1000,      // Current location balance
      "partnerProfit": 2250,       // Partner's share of profits
      "machinesCollected": 25,     // Number of machines collected
      "totalMachines": 30          // Total machines at location
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10
  }
}
```

### POST `/api/collectionReport`

**Purpose:** Create new collection report

**Request:**
```json
{
  "locationId": "location_id",
  "collectorName": "John Smith",
  "collections": [
    {
      "machineId": "machine_id",
      "metersIn": 1000,            // Current meters in
      "metersOut": 800,            // Current meters out
      "collectionTime": "2025-01-15T10:30:00Z",
      "notes": "Regular collection"
    }
  ],
  "financialData": {
    "taxes": 100,                  // Tax amount
    "advance": 50,                 // Advance payment
    "variance": 0,                 // Variance amount
    "previousBalance": 500,        // Previous balance owed
    "collectedAmount": 4000,       // Amount collected
    "balanceCorrection": 0,        // Balance correction
    "correctionReason": ""         // Reason for correction
  }
}
```

### PUT `/api/collectionReport/[reportId]`

**Purpose:** Update existing collection report

**Request:**
```json
{
  "collectorName": "Jane Doe",
  "financialData": {
    "taxes": 120,
    "advance": 60,
    "variance": 50,
    "collectedAmount": 4050,
    "balanceCorrection": 25,
    "correctionReason": "Found additional cash"
  }
}
```

### DELETE `/api/collectionReport/[reportId]`

**Purpose:** Soft delete collection report
- Sets `deletedAt` timestamp
- Preserves data for audit purposes

## Collection Report Details

### GET `/api/collection-report/[reportId]`

**Purpose:** Get detailed collection report information

**Response:**
```json
{
  "report": {
    "_id": "report_id",
    "locationReportId": "location_report_id",
    "collectorName": "John Smith",
    "locationName": "Downtown Casino",
    "timestamp": "2025-01-15T10:30:00Z",
    "totalDrop": 5000,
    "totalCancelled": 500,
    "totalGross": 4500,
    "amountCollected": 4000,
    "amountUncollected": 500,
    "variance": 0,
    "currentBalance": 1000,
    "partnerProfit": 2250,
    "machinesCollected": 25,
    "totalMachines": 30
  },
  "locationMetrics": {
    "droppedCancelled": "5000/500",    // Drop/Cancelled format
    "metersGross": 4500,               // Meter gross amount
    "variation": 0,                    // Variation amount
    "sasGross": 4500,                  // SAS gross amount
    "variance": 0,                     // Variance amount
    "varianceReason": "No Variance",   // Variance reason
    "amountToCollect": 4000,           // Amount to collect
    "collectedAmount": 4000,           // Actual collected amount
    "locationRevenue": 2250,           // Location revenue share
    "amountUncollected": 500,          // Uncollected amount
    "machinesNumber": "25/30",         // Machines collected/total
    "reasonForShortage": "-",          // Reason for shortage
    "taxes": 100,                      // Tax amount
    "advance": 50,                     // Advance payment
    "previousBalanceOwed": 500,        // Previous balance
    "currentBalanceOwed": 1000,        // Current balance
    "balanceCorrection": 0,            // Balance correction
    "correctionReason": "-"            // Correction reason
  },
  "machineMetrics": [
    {
      "machineId": "machine_001",
      "dropCancelled": "200/20",       // Drop/Cancelled for machine
      "meterGross": 180,               // Machine gross amount
      "sasGross": "-",                 // SAS gross (if available)
      "variation": "-",                // Variation amount
      "sasTimes": "2025-01-15T10:30:00Z" // SAS timestamp
    }
  ],
  "sasMetrics": {
    "totalSasDrop": 5000,             // Total SAS drop
    "totalSasCancelled": 500,         // Total SAS cancelled
    "totalSasGross": 4500             // Total SAS gross
  }
}
```

## Monthly Reports

### GET `/api/collectionReport/monthly`

**Purpose:** Get monthly collection summaries

**Query Parameters:**
- `startDate` - Start date for monthly range
- `endDate` - End date for monthly range
- `locationName` - Location filter

**Response:**
```json
{
  "summary": {
    "totalDrop": 150000,              // Total drop across all locations
    "totalGross": 135000,             // Total gross revenue
    "totalCancelled": 15000,          // Total cancelled credits
    "totalSasGross": 135000,          // Total SAS gross
    "averageVariance": 0,             // Average variance
    "totalCollections": 45            // Total number of collections
  },
  "details": [
    {
      "month": "2025-01",
      "locationName": "Downtown Casino",
      "totalDrop": 50000,
      "totalGross": 45000,
      "totalCancelled": 5000,
      "collections": 15,
      "averageVariance": 0
    }
  ]
}
```

## Scheduler Management

### GET `/api/schedulers`

**Purpose:** Get collection schedules

**Query Parameters:**
- `licencee` - Licensee filter
- `timePeriod` - Time period filter

**Response:**
```json
{
  "schedules": [
    {
      "_id": "schedule_id",
      "creator": "manager_id",         // Schedule creator
      "collector": "collector_id",     // Assigned collector
      "location": "location_id",       // Collection location
      "startTime": "2025-01-15T09:00:00Z",
      "endTime": "2025-01-15T17:00:00Z",
      "status": "active",              // Schedule status
      "createdAt": "2025-01-14T10:00:00Z"
    }
  ]
}
```

### POST `/api/schedulers`

**Purpose:** Create new collection schedule

**Request:**
```json
{
  "collector": "collector_id",
  "location": "location_id",
  "startTime": "2025-01-15T09:00:00Z",
  "endTime": "2025-01-15T17:00:00Z",
  "notes": "Regular collection schedule"
}
```

## Data Models

### CollectionReport

**Database Fields:**
```typescript
{
  _id: string;
  locationReportId: string;         // Unique report identifier
  collectorName: string;            // Collector name
  locationName: string;             // Location name
  timestamp: Date;                  // Collection timestamp
  totalDrop: number;                // Total money collected
  totalCancelled: number;           // Total cancelled credits
  totalGross: number;               // Net collection amount
  totalSasGross?: number;           // SAS gross amount
  amountCollected: number;          // Actual amount collected
  amountUncollected: number;        // Amount not collected
  variance: number;                 // Variance amount
  varianceReason?: string;          // Variance reason
  currentBalance: number;           // Current balance
  previousBalance: number;          // Previous balance
  partnerProfit: number;            // Partner profit share
  machinesCollected: number;        // Machines collected
  totalMachines: number;            // Total machines
  taxes: number;                    // Tax amount
  advance: number;                  // Advance payment
  balanceCorrection: number;        // Balance correction
  correctionReason?: string;        // Correction reason
  reasonShortagePayment?: string;   // Shortage reason
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;                 // Soft delete timestamp
}
```

### Collection

**Database Fields:**
```typescript
{
  _id: string;
  machineId: string;                // Machine identifier
  locationReportId: string;         // Parent report ID
  collectorName: string;            // Collector name
  collectionTime: Date;             // Collection timestamp
  metersIn: number;                 // Current meters in
  metersOut: number;                // Current meters out
  prevMetersIn: number;             // Previous meters in
  prevMetersOut: number;            // Previous meters out
  movement: {
    metersIn: number;               // Movement in
    metersOut: number;              // Movement out
    gross: number;                  // Gross movement
  };
  sasMeters?: {
    drop: number;                   // SAS drop
    totalCancelledCredits: number;  // SAS cancelled credits
    gross: number;                  // SAS gross
    sasStartTime: string;           // SAS start time
    sasEndTime: string;             // SAS end time
  };
  notes?: string;                   // Collection notes
  createdAt: Date;
  updatedAt: Date;
}
```

## Financial Calculations

### Core Collection Formulas

```
Gross Revenue = Total Drop - Total Cancelled Credits
Partner Profit = Floor((Gross - Variance - Advance) × Profit Share % ÷ 100) - Taxes
Amount to Collect = Gross - Variance - Advance - Partner Profit + Previous Balance
Variance = Expected Amount - Actual Amount
Balance Correction = Amount Collected - Amount to Collect
```

### Meter Movement Calculations

**Standard Meters:**
```
Collection Drop = Current Meters In - Previous Meters In
Collection Cancelled = Current Meters Out - Previous Meters Out
Collection Gross = Collection Drop - Collection Cancelled
```

**RAM Clear Meters:**
```
Collection Drop = (RAM Clear metersIn - Previous metersIn) + Current metersIn
Collection Cancelled = (RAM Clear metersOut - Previous metersOut) + Current metersOut
```

### Balance Management

```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
Partner Profit = Gross Revenue × Partner Profit Share %
Location Revenue = Gross Revenue - Partner Profit
```

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error",
    "validation": "Validation error details"
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "unique_request_id"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `CONFLICT` - Resource conflict
- `INTERNAL_ERROR` - Server error

## Security Features

### Authentication
- JWT tokens required for all endpoints
- Token validation on every request
- Session management with proper expiration

### Authorization
- Role-based access control
- Resource permissions for specific locations
- Location-based access restrictions

### Data Protection
- Input sanitization and validation
- SQL injection prevention
- XSS protection
- CSRF protection

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Query optimization for complex aggregations
- Connection pooling for efficient database access

### API Performance
- Efficient pagination for large datasets
- Response compression for large responses
- Rate limiting to prevent abuse
- Caching for frequently requested data