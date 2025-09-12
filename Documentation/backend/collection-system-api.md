# Collection System API Documentation

## Table of Contents
- [Overview](#overview)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [CRUD Operations](#crud-operations)
- [Business Logic](#business-logic)
- [Error Handling](#error-handling)
- [Security Features](#security-features)
- [Performance Considerations](#performance-considerations)

## Overview

The Collection System API provides comprehensive endpoints for managing casino money collection operations, including collection reports, machine metrics, and financial calculations. This system handles the complete lifecycle of money collection from slot machines to final reporting.

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: January 2025  
**Version**: 2.0.0

### System Architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Validation**: Zod schema validation
- **Error Handling**: Comprehensive error responses
- **Logging**: Structured logging for audit trails

## API Endpoints

### Collection Reports

#### GET `/api/collectionReport`
**Purpose**: Fetches collection reports with filtering and pagination

**Query Parameters:**
- `timePeriod` (optional): "Today", "Yesterday", "7d", "30d", "All Time", "Custom"
- `startDate` (optional): Custom start date (ISO format)
- `endDate` (optional): Custom end date (ISO format)
- `licencee` (optional): Licensee ID for filtering
- `locationName` (optional): Location name for filtering
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

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

#### POST `/api/collectionReport`
**Purpose**: Creates a new collection report

**Request Body:**
```json
{
  "locationId": "location_id",
  "collectorName": "John Smith",
  "collections": [
    {
      "machineId": "machine_id",
      "metersIn": 1000,
      "metersOut": 800,
      "collectionTime": "2025-01-15T10:30:00Z",
      "notes": "Regular collection"
    }
  ],
  "financialData": {
    "taxes": 100,
    "advance": 50,
    "variance": 0,
    "previousBalance": 500,
    "collectedAmount": 4000,
    "balanceCorrection": 0,
    "correctionReason": ""
  }
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "_id": "new_report_id",
    "locationReportId": "generated_id",
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
  }
}
```

#### PUT `/api/collectionReport/[reportId]`
**Purpose**: Updates an existing collection report

**Request Body:**
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

**Response:**
```json
{
  "success": true,
  "report": {
    "_id": "report_id",
    "collectorName": "Jane Doe",
    "timestamp": "2025-01-15T10:30:00Z",
    "totalDrop": 5000,
    "totalCancelled": 500,
    "totalGross": 4500,
    "amountCollected": 4050,
    "amountUncollected": 450,
    "variance": 50,
    "currentBalance": 975,
    "partnerProfit": 2250,
    "machinesCollected": 25,
    "totalMachines": 30
  }
}
```

#### DELETE `/api/collectionReport/[reportId]`
**Purpose**: Soft deletes a collection report

**Response:**
```json
{
  "success": true,
  "message": "Collection report deleted successfully"
}
```

### Collection Report Details

#### GET `/api/collection-report/[reportId]`
**Purpose**: Fetches detailed collection report information

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
    "droppedCancelled": "5000/500",
    "metersGross": 4500,
    "variation": 0,
    "sasGross": 4500,
    "variance": 0,
    "varianceReason": "No Variance",
    "amountToCollect": 4000,
    "collectedAmount": 4000,
    "locationRevenue": 2250,
    "amountUncollected": 500,
    "machinesNumber": "25/30",
    "reasonForShortage": "-",
    "taxes": 100,
    "advance": 50,
    "previousBalanceOwed": 500,
    "currentBalanceOwed": 1000,
    "balanceCorrection": 0,
    "correctionReason": "-"
  },
  "machineMetrics": [
    {
      "machineId": "machine_001",
      "dropCancelled": "200/20",
      "meterGross": 180,
      "sasGross": "-",
      "variation": "-",
      "sasTimes": "2025-01-15T10:30:00Z"
    }
  ],
  "sasMetrics": {
    "totalSasDrop": 5000,
    "totalSasCancelled": 500,
    "totalSasGross": 4500
  }
}
```

### Monthly Reports

#### GET `/api/collectionReport/monthly`
**Purpose**: Fetches monthly collection summaries

**Query Parameters:**
- `startDate`: Start date for monthly range
- `endDate`: End date for monthly range
- `locationName` (optional): Location filter

**Response:**
```json
{
  "summary": {
    "totalDrop": 150000,
    "totalGross": 135000,
    "totalCancelled": 15000,
    "totalSasGross": 135000,
    "averageVariance": 0,
    "totalCollections": 45
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

### Scheduler Management

#### GET `/api/schedulers`
**Purpose**: Fetches collection schedules

**Query Parameters:**
- `licencee` (optional): Licensee filter
- `timePeriod` (optional): Time period filter

**Response:**
```json
{
  "schedules": [
    {
      "_id": "schedule_id",
      "creator": "manager_id",
      "collector": "collector_id",
      "location": "location_id",
      "startTime": "2025-01-15T09:00:00Z",
      "endTime": "2025-01-15T17:00:00Z",
      "status": "active",
      "createdAt": "2025-01-14T10:00:00Z"
    }
  ]
}
```

#### POST `/api/schedulers`
**Purpose**: Creates a new collection schedule

**Request Body:**
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
```typescript
interface CollectionReport {
  _id: string;
  locationReportId: string;
  collectorName: string;
  locationName: string;
  timestamp: Date;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross?: number;
  amountCollected: number;
  amountUncollected: number;
  variance: number;
  varianceReason?: string;
  currentBalance: number;
  previousBalance: number;
  partnerProfit: number;
  machinesCollected: number;
  totalMachines: number;
  taxes: number;
  advance: number;
  balanceCorrection: number;
  correctionReason?: string;
  reasonShortagePayment?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Collection
```typescript
interface Collection {
  _id: string;
  machineId: string;
  locationReportId: string;
  collectorName: string;
  collectionTime: Date;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  movement: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  sasMeters?: {
    drop: number;
    totalCancelledCredits: number;
    gross: number;
    sasStartTime: string;
    sasEndTime: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Scheduler
```typescript
interface Scheduler {
  _id: string;
  creator: string;
  collector: string;
  location: string;
  startTime: Date;
  endTime: Date;
  status: "active" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## CRUD Operations

### Create Operations

#### Collection Report Creation
1. **Validation**: Validate input data using Zod schemas
2. **Location Verification**: Ensure location exists and is active
3. **Machine Validation**: Verify all machines exist and are active
4. **Financial Calculations**: Calculate totals, variances, and balances
5. **Database Transaction**: Create report and related collections atomically
6. **Audit Logging**: Log creation activity for compliance

#### Collection Creation
1. **Machine Verification**: Ensure machine exists and is active
2. **Meter Validation**: Validate meter readings and calculations
3. **Movement Calculation**: Calculate movement from previous readings
4. **SAS Integration**: Integrate SAS meter data if available
5. **Database Storage**: Store collection with proper relationships

### Read Operations

#### Report Retrieval
1. **Authentication**: Verify user permissions
2. **Filtering**: Apply date, location, and licensee filters
3. **Aggregation**: Calculate totals and metrics
4. **Pagination**: Implement efficient pagination
5. **Response Formatting**: Format data for frontend consumption

#### Detail Retrieval
1. **Report Loading**: Load main report data
2. **Machine Metrics**: Calculate individual machine metrics
3. **Location Metrics**: Aggregate location-level data
4. **SAS Comparison**: Compare SAS vs meter data
5. **Historical Data**: Include related historical information

### Update Operations

#### Report Updates
1. **Permission Check**: Verify user can edit report
2. **Data Validation**: Validate updated data
3. **Recalculation**: Recalculate all dependent values
4. **Audit Trail**: Log all changes with timestamps
5. **Notification**: Notify relevant stakeholders of changes

#### Collection Updates
1. **Machine Validation**: Ensure machine data is still valid
2. **Meter Recalculation**: Recalculate movement and totals
3. **Balance Updates**: Update location balances
4. **Report Sync**: Sync changes with parent report

### Delete Operations

#### Soft Delete Implementation
1. **Dependency Check**: Verify no dependent records exist
2. **Soft Delete**: Set deletedAt timestamp instead of removing
3. **Cascade Updates**: Update related records appropriately
4. **Audit Preservation**: Maintain audit trail for compliance
5. **Recovery Option**: Provide rollback capability

## Business Logic

### Financial Calculations

#### Gross Revenue Calculation
```typescript
const gross = totalDrop - totalCancelledCredits;
```

#### Variance Calculation
```typescript
const variance = metersGross - sasGross;
```

#### Balance Management
```typescript
const newBalance = previousBalance + amountToCollect - amountCollected + balanceCorrection;
```

#### Partner Profit Calculation
```typescript
const partnerProfit = gross * (100 - profitSharePercentage) / 100;
```

### Collection Process

#### Meter Reading Validation
1. **Range Check**: Ensure readings are within expected ranges
2. **Consistency Check**: Verify readings make logical sense
3. **Historical Comparison**: Compare with previous readings
4. **Variance Analysis**: Identify unusual variances

#### Movement Calculation
1. **Previous Reading**: Retrieve last collection readings
2. **Current Reading**: Use current meter readings
3. **Movement Calculation**: Calculate difference
4. **Validation**: Ensure movement is reasonable

### Data Integrity

#### Transaction Management
1. **Atomic Operations**: Ensure all-or-nothing operations
2. **Rollback Capability**: Provide rollback for failed operations
3. **Consistency Checks**: Verify data consistency after operations
4. **Audit Logging**: Log all operations for compliance

#### Validation Rules
1. **Required Fields**: Ensure all required fields are present
2. **Data Types**: Validate data types and formats
3. **Business Rules**: Enforce business logic constraints
4. **Referential Integrity**: Maintain foreign key relationships

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
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Resource conflict
- `INTERNAL_ERROR`: Server error

### Error Handling Strategy
1. **Input Validation**: Validate all inputs at API boundary
2. **Business Logic Validation**: Validate business rules
3. **Database Error Handling**: Handle database-specific errors
4. **User-Friendly Messages**: Provide clear error messages
5. **Logging**: Log all errors for debugging

## Security Features

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Token Validation**: Validate tokens on every request
- **Session Management**: Proper session handling
- **Token Expiration**: Automatic token expiration

### Authorization
- **Role-Based Access**: Different access levels for different roles
- **Resource Permissions**: Granular permissions for specific resources
- **Location-Based Access**: Restrict access to specific locations
- **Audit Logging**: Log all access attempts

### Data Protection
- **Input Sanitization**: Sanitize all user inputs
- **SQL Injection Prevention**: Use parameterized queries
- **XSS Prevention**: Escape output data
- **CSRF Protection**: Implement CSRF tokens

## Performance Considerations

### Database Optimization
- **Indexing**: Proper indexes on frequently queried fields
- **Query Optimization**: Optimize database queries
- **Connection Pooling**: Efficient database connection management
- **Caching**: Implement caching for frequently accessed data

### API Performance
- **Pagination**: Implement efficient pagination
- **Response Compression**: Compress large responses
- **Rate Limiting**: Implement rate limiting
- **Caching**: Cache frequently requested data

### Monitoring
- **Performance Metrics**: Monitor API performance
- **Error Tracking**: Track and analyze errors
- **Usage Analytics**: Monitor API usage patterns
- **Alerting**: Set up alerts for critical issues

---

**Last Updated**: January 2025  
**Author**: Aaron Hazzard - Senior Software Engineer