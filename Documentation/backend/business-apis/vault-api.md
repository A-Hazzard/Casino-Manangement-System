# Vault API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Version:** 1.0.0

## Quick Search Guide

- **Cash Monitoring** - `GET /api/vault/cash-monitoring` - Total cash on premises
- **Cash Denominations** - `GET /api/vault/cash-monitoring/denominations` - Denomination breakdown
- **End of Day Reports** - `GET /api/vault/end-of-day` - End of day report generation
- **Float Requests** - `GET /api/vault/float-requests/[id]` - Float request details
- **Payouts** - `GET /api/vault/payouts/[id]` - Payout details
- **Shifts** - `GET /api/vault/shifts/[id]` - Shift details

## Overview

The Vault API provides comprehensive endpoints for managing casino vault operations, including cash monitoring, float requests, payouts, shifts, and end-of-day reporting. All endpoints implement strict location-based access control and role-based authorization.

**Important:** All endpoints require authentication and enforce location-based permissions. Users can only access data for locations they have been assigned to, unless they have admin/developer roles.

### System Architecture

- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication with HTTP-only cookies
- **Authorization**: Role-based access control (RBAC) with location filtering
- **Data Models**: Separate models for float requests, payouts, shifts, denominations

## Cash Monitoring Endpoints

### GET `/api/vault/cash-monitoring`

**Purpose**: Calculate total cash on premises for a specific location

**Flow:**
1. Parse and validate request parameters
2. Connect to database and authenticate user
3. Verify user has access to the requested location
4. Calculate total cash on premises with optional date range filtering
5. Return cash totals and denomination breakdown

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locationId` | string | Yes | Location ID to query |
| `startDate` | ISO date | No | Start date for date range filter |
| `endDate` | ISO date | No | End date for date range filter |
| `licensee` | string | No | Filter by licensee (also accepts `licencee`) |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: User must have access to the specified location
- **Location Filtering**: Automatically enforced based on user's `assignedLocations`

#### Response

```json
{
  "success": true,
  "data": {
    "totalCash": 150000,
    "denominationBreakdown": {
      "20": 2500,
      "50": 800,
      "100": 500,
      "500": 200,
      "1000": 100,
      "2000": 50,
      "5000": 20
    }
  }
}
```

#### Example Request

```typescript
GET /api/vault/cash-monitoring?locationId=691166b455fe4b9b7ae3e702

// With date range
GET /api/vault/cash-monitoring?locationId=691166b455fe4b9b7ae3e702&startDate=2025-01-01&endDate=2025-01-31
```

#### Error Responses

- `400` - Missing `locationId` parameter
- `401` - Unauthorized (no valid JWT token)
- `403` - Forbidden (no access to requested location)
- `500` - Database connection failed or server error

**File**: `app/api/vault/cash-monitoring/route.ts`

---

### GET `/api/vault/cash-monitoring/denominations`

**Purpose**: Get detailed denomination breakdown for a location

**Flow:**
1. Parse and validate request parameters
2. Connect to database and authenticate user
3. Verify user has access to the requested location
4. Get denomination breakdown with optional date range filtering
5. Return denomination breakdown

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locationId` | string | Yes | Location ID to query |
| `startDate` | ISO date | No | Start date for date range filter |
| `endDate` | ISO date | No | End date for date range filter |
| `licensee` | string | No | Filter by licensee (also accepts `licencee`) |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: User must have access to the specified location
- **Location Filtering**: Automatically enforced based on user's `assignedLocations`

#### Response

```json
{
  "success": true,
  "data": {
    "breakdown": {
      "20": 2500,
      "50": 800,
      "100": 500,
      "500": 200,
      "1000": 100,
      "2000": 50,
      "5000": 20
    }
  }
}
```

#### Example Request

```typescript
GET /api/vault/cash-monitoring/denominations?locationId=691166b455fe4b9b7ae3e702
```

#### Error Responses

- `400` - Missing `locationId` parameter
- `401` - Unauthorized (no valid JWT token)
- `403` - Forbidden (no access to requested location)
- `500` - Database connection failed or server error

**File**: `app/api/vault/cash-monitoring/denominations/route.ts`

---

## End of Day Reports

### GET `/api/vault/end-of-day`

**Purpose**: Generate end of day report for a specific location and date

**Flow:**
1. Parse and validate request parameters
2. Connect to database and authenticate user
3. Verify user has permission to manage transactions for the location
4. Generate end of day report with cash totals and denomination breakdown
5. Return report data

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locationId` | string | Yes | Location ID for the report |
| `date` | ISO date | Yes | Date for the end of day report |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: User must have permission to manage transactions (`canManageTransactions`)
- **Transaction Permissions**: Checks if user can manage transactions for the location

#### Response

```json
{
  "success": true,
  "data": {
    "locationId": "691166b455fe4b9b7ae3e702",
    "date": "2025-01-15T00:00:00.000Z",
    "totalCash": 150000,
    "denominationBreakdown": {
      "20": 2500,
      "50": 800,
      "100": 500,
      "500": 200,
      "1000": 100,
      "2000": 50,
      "5000": 20
    },
    "transactions": []
  }
}
```

#### Example Request

```typescript
GET /api/vault/end-of-day?locationId=691166b455fe4b9b7ae3e702&date=2025-01-15
```

#### Error Responses

- `400` - Missing `locationId` or `date` parameter
- `401` - Unauthorized (no valid JWT token)
- `403` - Forbidden (insufficient permissions to manage transactions)
- `500` - Database connection failed or server error

**File**: `app/api/vault/end-of-day/route.ts`

---

### POST `/api/vault/end-of-day`

**Purpose**: Generate and export end of day report in various formats

**Flow:**
1. Parse and validate request body
2. Connect to database and authenticate user
3. Verify user has permission to manage transactions for the location
4. Generate end of day report
5. Export report in requested format (CSV, PDF, Excel)
6. Return formatted report or file download

#### Request Body

```json
{
  "locationId": "691166b455fe4b9b7ae3e702",
  "date": "2025-01-15",
  "format": "CSV"
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locationId` | string | Yes | Location ID for the report |
| `date` | ISO date string | Yes | Date for the end of day report |
| `format` | 'CSV' \| 'PDF' \| 'Excel' | No | Export format (default: 'CSV') |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: User must have permission to manage transactions (`canManageTransactions`)

#### Response

**CSV Format:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="end-of-day-{locationId}-{date}.csv"`
- Response body: CSV formatted report

**JSON Format (PDF/Excel - when implemented):**
```json
{
  "success": true,
  "data": {
    "locationId": "691166b455fe4b9b7ae3e702",
    "date": "2025-01-15T00:00:00.000Z",
    "totalCash": 150000,
    "denominationBreakdown": { /* ... */ },
    "transactions": []
  }
}
```

#### Example Request

```typescript
POST /api/vault/end-of-day
Content-Type: application/json

{
  "locationId": "691166b455fe4b9b7ae3e702",
  "date": "2025-01-15",
  "format": "CSV"
}
```

#### Error Responses

- `400` - Missing `locationId` or `date` parameter
- `401` - Unauthorized (no valid JWT token)
- `403` - Forbidden (insufficient permissions to manage transactions)
- `500` - Database connection failed or server error

**File**: `app/api/vault/end-of-day/route.ts`

---

## Float Requests

### GET `/api/vault/float-requests/[id]`

**Purpose**: Get individual float request details by ID

**Flow:**
1. Extract float request ID from URL
2. Connect to database and authenticate user
3. Get float request by ID
4. Return float request details with transformed response

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Float request document `_id` |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: No additional checks (basic authentication only)

#### Response

```json
{
  "success": true,
  "data": {
    "floatRequest": {
      "_id": "507f1f77bcf86cd799439011",
      "type": "FLOAT_INCREASE",
      "cashierId": "507f191e810c19729de860ea",
      "cashierName": "John Doe",
      "requestedDenom": {
        "20": 100,
        "50": 50,
        "100": 25
      },
      "requestedTotalAmount": 6250,
      "requestedFloatAt": "2025-01-15T10:30:00.000Z",
      "shiftId": "507f191e810c19729de860eb",
      "status": "PENDING",
      "locationId": "691166b455fe4b9b7ae3e702",
      "approvedDenom": {
        "20": 0,
        "50": 0,
        "100": 0
      },
      "approvedTotalAmount": 0,
      "acknowledgedByCashier": false,
      "acknowledgedByManager": false,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

#### Example Request

```typescript
GET /api/vault/float-requests/507f1f77bcf86cd799439011
```

#### Error Responses

- `400` - Missing float request ID
- `401` - Unauthorized (no valid JWT token)
- `404` - Float request not found
- `500` - Database connection failed or server error

**File**: `app/api/vault/float-requests/[id]/route.ts`

---

### PUT `/api/vault/float-requests/[id]`

**Purpose**: Update float request (limited: FLOAT_DECREASE requests only by vault managers)

**Flow:**
1. Extract float request ID from URL
2. Parse and validate request body
3. Connect to database and authenticate user
4. Get float request and verify edit permissions
5. Edit float request with new denomination breakdown
6. Return updated request

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Float request document `_id` |

#### Request Body

```json
{
  "requestedDenom": {
    "20": 150,
    "50": 75,
    "100": 30
  }
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestedDenom` | DenominationBreakdown | Yes | Updated denomination breakdown |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: User must have permission to edit float request (`canEditFloatRequest`)
- **Edit Restrictions**: Only FLOAT_DECREASE requests can be edited, and only by vault managers

#### Response

```json
{
  "success": true,
  "data": {
    "floatRequest": {
      "_id": "507f1f77bcf86cd799439011",
      "type": "FLOAT_DECREASE",
      "requestedDenom": {
        "20": 150,
        "50": 75,
        "100": 30
      },
      "requestedTotalAmount": 9000,
      "updatedAt": "2025-01-15T11:00:00.000Z"
      /* ... other fields ... */
    }
  }
}
```

#### Example Request

```typescript
PUT /api/vault/float-requests/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "requestedDenom": {
    "20": 150,
    "50": 75,
    "100": 30
  }
}
```

#### Error Responses

- `400` - Missing float request ID or `requestedDenom` field
- `401` - Unauthorized (no valid JWT token)
- `403` - Forbidden (cannot edit this float request)
- `404` - Float request not found
- `500` - Database connection failed or update error

**File**: `app/api/vault/float-requests/[id]/route.ts`

---

## Payouts

### GET `/api/vault/payouts/[id]`

**Purpose**: Get individual payout details by ID

**Flow:**
1. Extract payout ID from URL
2. Connect to database and authenticate user
3. Get payout by ID
4. Return payout details with transformed response

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout document `_id` |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: No additional checks (basic authentication only)

#### Response

```json
{
  "success": true,
  "data": {
    "payout": {
      "_id": "507f1f77bcf86cd799439012",
      "cashierId": "507f191e810c19729de860ea",
      "cashierName": "John Doe",
      "amount": 5000,
      "shiftId": "507f191e810c19729de860eb",
      "locationId": "691166b455fe4b9b7ae3e702",
      "status": "COMPLETED",
      "notes": "Player jackpot payout",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:35:00.000Z"
    }
  }
}
```

#### Example Request

```typescript
GET /api/vault/payouts/507f1f77bcf86cd799439012
```

#### Error Responses

- `400` - Missing payout ID
- `401` - Unauthorized (no valid JWT token)
- `404` - Payout not found
- `500` - Database connection failed or server error

**File**: `app/api/vault/payouts/[id]/route.ts`

---

### PUT `/api/vault/payouts/[id]`

**Purpose**: Update payout information (limited fields)

**Flow:**
1. Extract payout ID from URL
2. Parse and validate request body
3. Connect to database and authenticate user
4. Get payout and update with provided fields
5. Return updated payout

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout document `_id` |

#### Request Body

```json
{
  "amount": 5500,
  "notes": "Updated payout amount",
  "status": "COMPLETED"
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | No | Updated payout amount |
| `notes` | string | No | Updated notes |
| `status` | string | No | Updated status |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: No additional checks (basic authentication only)

#### Response

```json
{
  "success": true,
  "data": {
    "payout": {
      "_id": "507f1f77bcf86cd799439012",
      "amount": 5500,
      "notes": "Updated payout amount",
      "status": "COMPLETED",
      "updatedAt": "2025-01-15T11:00:00.000Z"
      /* ... other fields ... */
    }
  }
}
```

#### Example Request

```typescript
PUT /api/vault/payouts/507f1f77bcf86cd799439012
Content-Type: application/json

{
  "amount": 5500,
  "notes": "Updated payout amount",
  "status": "COMPLETED"
}
```

#### Error Responses

- `400` - Missing payout ID
- `401` - Unauthorized (no valid JWT token)
- `404` - Payout not found
- `500` - Database connection failed or update error

**File**: `app/api/vault/payouts/[id]/route.ts`

---

## Shifts

### GET `/api/vault/shifts/[id]`

**Purpose**: Get individual shift details by ID

**Flow:**
1. Extract shift ID from URL
2. Connect to database and authenticate user
3. Get shift by ID
4. Return shift details with transformed response

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Shift document `_id` |

#### Security

- **Authentication**: Required (JWT token)
- **Authorization**: No additional checks (basic authentication only)

#### Response

```json
{
  "success": true,
  "data": {
    "shift": {
      "_id": "507f1f77bcf86cd799439013",
      "role": "cashier",
      "userName": "John Doe",
      "userId": "507f191e810c19729de860ea",
      "startDenom": {
        "20": 100,
        "50": 50,
        "100": 25
      },
      "endDenom": {
        "20": 120,
        "50": 60,
        "100": 30
      },
      "startedShiftAt": "2025-01-15T08:00:00.000Z",
      "closedShiftAt": "2025-01-15T16:00:00.000Z",
      "location": "Main Casino",
      "locationId": "691166b455fe4b9b7ae3e702",
      "status": "CLOSED",
      "notes": "Regular shift",
      "createdAt": "2025-01-15T08:00:00.000Z",
      "updatedAt": "2025-01-15T16:00:00.000Z"
    }
  }
}
```

#### Example Request

```typescript
GET /api/vault/shifts/507f1f77bcf86cd799439013
```

#### Error Responses

- `400` - Missing shift ID
- `401` - Unauthorized (no valid JWT token)
- `404` - Shift not found
- `500` - Database connection failed or server error

**File**: `app/api/vault/shifts/[id]/route.ts`

---

## Data Models

### Float Request Schema

**Collection:** `floatrequests`

```typescript
{
  _id: string;
  type: 'FLOAT_INCREASE' | 'FLOAT_DECREASE';
  cashierId: string;
  cashierName: string;
  requestedDenom: DenominationBreakdown;
  requestedTotalAmount: number;
  requestedFloatAt: Date;
  shiftId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONFIRMED' | 'ACKNOWLEDGED';
  locationId: string;
  approvedDenom: DenominationBreakdown;
  approvedTotalAmount: number;
  approvedFloatAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  acknowledgedByCashier: boolean;
  acknowledgedByManager: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
```

### Payout Schema

**Collection:** `cashdeskpayouts`

```typescript
{
  _id: string;
  cashierId: string;
  cashierName: string;
  amount: number;
  shiftId: string;
  locationId: string;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Shift Schema

**Collection:** `shifts`

```typescript
{
  _id: string;
  role: string;
  userName: string;
  userId: string;
  startDenom: DenominationBreakdown;
  endDenom?: DenominationBreakdown;
  startedShiftAt: Date;
  closedShiftAt?: Date;
  location: string;
  locationId: string;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Denomination Breakdown Type

```typescript
type DenominationBreakdown = {
  '20'?: number;
  '50'?: number;
  '100'?: number;
  '500'?: number;
  '1000'?: number;
  '2000'?: number;
  '5000'?: number;
};
```

### Denomination Schema

**Collection:** `denominations`

```typescript
{
  _id: string;
  locationId: string;
  value: number;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Security & Authorization

### Location-Based Access Control

All endpoints that query location-specific data automatically enforce location-based filtering:

```typescript
// Get user's accessible locations
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  licensee || undefined,
  userPayload.assignedLocations || [],
  (userPayload.roles as string[]) || []
);

// Verify access
if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
  return NextResponse.json(
    { error: 'Forbidden: No access to this location' },
    { status: 403 }
  );
}
```

### Role-Based Permissions

**Vault Manager Roles:**
- Can manage transactions (`canManageTransactions`)
- Can edit FLOAT_DECREASE requests (`canEditFloatRequest`)
- Full access to vault operations

**Cashier Roles:**
- Can create float requests
- Can view their own payouts and shifts
- Limited access to vault management features

**Location Access:**
- Users can only access data for their `assignedLocations`
- Admin/Developer roles bypass location restrictions

---

## Error Handling

### HTTP Status Codes

| Status Code | Description           |
| ----------- | --------------------- |
| 200         | Success               |
| 400         | Bad Request           |
| 401         | Unauthorized          |
| 403         | Forbidden             |
| 404         | Not Found             |
| 500         | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": "Technical error message",
  "message": "User-friendly error message"
}
```

### Common Error Scenarios

1. **Missing Parameters**: Returns `400` with specific parameter name
2. **Unauthorized Access**: Returns `401` when JWT token is missing or invalid
3. **Forbidden Access**: Returns `403` when user lacks required permissions
4. **Not Found**: Returns `404` when resource doesn't exist
5. **Database Errors**: Returns `500` with error details

---

## Performance Considerations

### Query Optimization

- **Indexes**: All location and date queries use proper database indexes
- **Pagination**: List endpoints support pagination to limit result sets
- **Date Range Filtering**: Efficient date range queries for cash monitoring

### Caching Strategy

- **Cash Totals**: Consider caching for frequently accessed cash totals
- **Denomination Breakdown**: Cache recent denomination data

---

## Related APIs

- **[Cash Monitoring Helpers](../helpers/vault/cashMonitoring.ts)** - Cash calculation functions
- **[Float Request Helpers](../helpers/vault/floatRequests.ts)** - Float request operations
- **[End of Day Helpers](../helpers/vault/endOfDay.ts)** - Report generation functions
- **[Authorization Helpers](../helpers/vault/authorization.ts)** - Permission checking functions

---

## Future Enhancements

### Planned Features

- **List Endpoints**: Add GET endpoints for listing float requests, payouts, and shifts with filtering
- **Create Endpoints**: Add POST endpoints for creating float requests, payouts, and shifts
- **Advanced Filtering**: Enhanced filtering options for list endpoints
- **Bulk Operations**: Support for bulk operations on multiple records
- **Export Formats**: Additional export formats (PDF, Excel) for end-of-day reports
- **Real-time Updates**: WebSocket/SSE support for real-time vault updates
- **Audit Logging**: Comprehensive audit trail for all vault operations

### Performance Improvements

- **Caching Layer**: Redis caching for frequently accessed data
- **Query Optimization**: Further optimization of aggregation pipelines
- **Batch Processing**: Batch operations for bulk updates

---

## Version History

### 1.0.0 - January 2025

- ✅ Initial vault API documentation
- ✅ Cash monitoring endpoints documented
- ✅ End of day report endpoints documented
- ✅ Float request detail endpoints documented
- ✅ Payout detail endpoints documented
- ✅ Shift detail endpoints documented
- ✅ Security and authorization patterns documented
- ✅ Data models and schemas documented

---

**Last Updated:** January 2025
