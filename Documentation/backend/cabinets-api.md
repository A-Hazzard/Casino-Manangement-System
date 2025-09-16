# Cabinets API Documentation


**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025  
**Version:** 2.0.0

## Quick Search Guide

- **Machine Details**: `GET /api/machines/[id]` - Individual cabinet details
- **Machine Updates**: `PUT /api/locations/[locationId]/cabinets/[cabinetId]` - Update cabinet
- **Machine Deletion**: `DELETE /api/locations/[locationId]/cabinets/[cabinetId]` - Soft delete
- **Machine Aggregation**: `GET /api/machines/aggregation` - Aggregated data
- **Activity Log**: `GET /api/machines/by-id/events` - Machine events
- **Collection History**: `GET /api/machines/by-id/collection-history` - Collection data

## Overview

The Cabinets API provides comprehensive endpoints for managing gaming cabinets, including CRUD operations, metrics, events, and collection history. All endpoints function correctly with proper data transformation and error handling.

### System Architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Data Transformation**: Automatic field mapping between frontend and database
- **Soft Delete**: Uses `deletedAt` timestamp for data preservation

## Core Cabinet Operations

### GET `/api/machines/[id]`
**Purpose**: Fetch individual cabinet details with field transformation

**Response Fields:**
```json
{
  "success": true,
  "data": {
    "assetNumber": "string",        // from serialNumber
    "installedGame": "string",      // from game
    "locationId": "string",         // from gamingLocation
    "smbId": "string",              // from relayId
    "status": "string",             // from assetStatus
    "isCronosMachine": false,       // default value
    "sasMeters": {
      "drop": 1000,                 // Money inserted
      "coinIn": 5000,              // Total bets placed
      "jackpot": 250,              // Jackpot payouts
      "gamesPlayed": 150           // Games played
    },
    "smibConfig": {
      "version": "1.0.0",          // SMIB firmware version
      "settings": {}               // SMIB configuration
    }
  }
}
```

### PUT `/api/locations/[locationId]/cabinets/[cabinetId]`
**Purpose**: Update cabinet information with field transformation

**Request Fields:**
```json
{
  "assetNumber": "GM001",          // Maps to serialNumber
  "installedGame": "Slot Game",    // Maps to game
  "locationId": "loc123",          // Maps to gamingLocation
  "smbId": "smib456",             // Maps to relayId
  "status": "active"              // Maps to assetStatus
}
```

**Field Mapping:**
- `assetNumber` → `serialNumber`
- `installedGame` → `game`
- `locationId` → `gamingLocation`
- `smbId` → `relayId`
- `status` → `assetStatus`

### DELETE `/api/locations/[locationId]/cabinets/[cabinetId]`
**Purpose**: Soft delete cabinet (sets `deletedAt` timestamp)

**Implementation:**
- Sets `deletedAt: new Date()` instead of permanent deletion
- Preserves data for audit and recovery purposes
- Filters deleted cabinets from all queries

## Aggregation & Metrics

### GET `/api/machines/aggregation`
**Purpose**: Fetch aggregated cabinet data with filtering

**Query Parameters:**
- `licensee` - Filter by licensee
- `timePeriod` - Date range filter
- `page` - Pagination page number
- `limit` - Items per page

**Response Fields:**
```json
{
  "success": true,
  "data": [
    {
      "machineId": "string",
      "locationName": "string",
      "serialNumber": "string",
      "game": "string",
      "status": "online|offline",
      "sasMeters": {
        "drop": 1000,
        "coinIn": 5000,
        "jackpot": 250,
        "gamesPlayed": 150
      },
      "lastActivity": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50
  }
}
```

### GET `/api/machines/by-id/events`
**Purpose**: Fetch machine events for activity log

**Query Parameters:**
- `id` - Machine ID
- `timePeriod` - Date filter (Today, Yesterday, 7d, 30d, All Time)
- `page` - Page number for pagination
- `limit` - Items per page

**Response Fields:**
```json
{
  "success": true,
  "data": [
    {
      "eventType": "General|Significant|Priority",
      "description": "Event description",
      "command": "Command executed",
      "gameName": "Game name",
      "date": "2025-01-15T10:30:00Z",
      "sequence": [
        {
          "description": "Step description",
          "logLevel": "info|warning|error",
          "success": true
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalEvents": 100
  }
}
```

### GET `/api/machines/by-id/collection-history`
**Purpose**: Fetch collection meters history

**Query Parameters:**
- `id` - Machine ID
- `timePeriod` - Date filter
- `page` - Page number
- `limit` - Items per page

**Response Fields:**
```json
{
  "success": true,
  "data": {
    "collectionHistory": [
      {
        "collectionTime": "2025-01-15T10:30:00Z",
        "metersIn": 1000,
        "metersOut": 800,
        "movement": {
          "metersIn": 200,
          "metersOut": 150,
          "gross": 50
        },
        "collectorName": "John Smith"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalEntries": 100
    }
  }
}
```

## Data Models

### Machine Schema
**Database Fields:**
```typescript
{
  _id: String,                    // Machine identifier
  serialNumber: String,           // Asset number (maps to assetNumber)
  game: String,                   // Installed game (maps to installedGame)
  gamingLocation: String,         // Location ID (maps to locationId)
  relayId: String,                // SMIB board ID (maps to smbId)
  assetStatus: String,            // Machine status (maps to status)
  sasMeters: {
    drop: Number,                 // Money inserted
    coinIn: Number,               // Total bets placed
    jackpot: Number,              // Jackpot payouts
    gamesPlayed: Number,          // Games played
    totalCancelledCredits: Number // Credits paid out
  },
  smibConfig: {
    version: String,              // SMIB firmware version
    settings: Object              // SMIB configuration
  },

**Last Updated**: September 3rd, 2025  
**Status**: ✅ Fully Functional - All Issues Resolved

## Overview
The Cabinets API provides comprehensive endpoints for managing gaming cabinets, including CRUD operations, metrics, events, and collection history. All endpoints now function correctly with proper data transformation and error handling.

## Current Implementation Status

### ✅ **Resolved Issues**
- **Data Transformation**: Database fields properly mapped to frontend expectations
- **API Endpoints**: All endpoints now functional with correct data flow
- **Edit Operations**: Cabinet updates now save correctly with field mapping
- **Delete Operations**: Soft delete functionality implemented and working
- **Activity Log**: Machine events endpoint functional with filtering
- **Collection History**: Collection meters history endpoint with pagination
- **Time Period Filtering**: Date-based filtering working without parameter corruption

### 🔧 **API Endpoints**

#### **Core Cabinet Operations**

##### **GET `/api/machines/[id]`**
- **Purpose**: Fetch individual cabinet details
- **Data Transformation**: Maps database fields to frontend expectations
- **Response Format**: 
  ```json
  {
    "success": true,
    "data": {
      "assetNumber": "string",        // from serialNumber
      "installedGame": "string",      // from game
      "locationId": "string",         // from gamingLocation
      "smbId": "string",              // from relayId
      "status": "string",             // from assetStatus
      "isCronosMachine": false,       // default value
      // ... other fields
    }
  }
  ```

##### **PUT `/api/locations/[locationId]/cabinets/[cabinetId]`**
- **Purpose**: Update cabinet information
- **Data Transformation**: Maps frontend fields back to database format
- **Request Format**: Accepts `CabinetFormData` with transformed field names
- **Field Mapping**:
  - `assetNumber` → `serialNumber`
  - `installedGame` → `game`
  - `locationId` → `gamingLocation`
  - `smbId` → `relayId`
  - `status` → `assetStatus`

##### **DELETE `/api/locations/[locationId]/cabinets/[cabinetId]`**
- **Purpose**: Soft delete cabinet (sets `deletedAt` timestamp)
- **Implementation**: Marks record as deleted without permanent removal
- **Response**: Success confirmation with soft delete status

#### **Aggregation & Metrics**

##### **GET `/api/machines/aggregation`**
- **Purpose**: Fetch aggregated cabinet data with filtering
- **Features**: Licensee filtering, date range filtering, pagination
- **Data Consistency**: Properly filters deleted cabinets
- **Response Format**: Array of cabinet objects with metrics

##### **GET `/api/machines/by-id/events`**
- **Purpose**: Fetch machine events for activity log
- **Features**: Event type filtering, date filtering, pagination
- **Query Parameters**:
  - `id`: Machine ID
  - `timePeriod`: Date filter (Today, Yesterday, 7d, 30d, All Time)
  - `page`: Page number for pagination
  - `limit`: Items per page

##### **GET `/api/machines/by-id/collection-history`**
- **Purpose**: Fetch collection meters history
- **Features**: Date filtering, sorting, pagination
- **Query Parameters**:
  - `id`: Machine ID
  - `timePeriod`: Date filter
  - `page`: Page number
  - `limit`: Items per page
- **Response Format**:
  ```json
  {
    "collectionHistory": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalEntries": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

### 📊 **Data Models**

#### **Machine Schema** (`app/api/lib/models/machines.ts`)
```typescript
{
  _id: String,                    // Machine identifier
  serialNumber: String,           // Asset number
  game: String,                   // Installed game
  gamingLocation: String,         // Location ID
  relayId: String,                // SMIB board ID
  assetStatus: String,            // Machine status
  sasMeters: Object,              // SAS meter data
  meterData: Object,              // Meter information
  gameConfig: Object,             // Game configuration
  smibConfig: Object,             // SMIB configuration
  smibVersion: Object,            // SMIB firmware version
  collectionMetersHistory: Array, // Collection history
  deletedAt: Date                 // Soft delete timestamp
}
```


### Machine Event Schema
**Database Fields:**
```typescript
{
  _id: ObjectId,
  eventType: String,              // Type of event (General, Significant, Priority)

#### **Machine Event Schema** (`app/api/lib/models/machineEvents.ts`)
```typescript
{
  _id: ObjectId,
  eventType: String,              // Type of event
  description: String,             // Event description
  command: String,                 // Command executed
  gameName: String,                // Game name
  date: Date,                      // Event timestamp
  sequence: Array                  // Optional sequence data
}
```


## Data Transformation

### Frontend to Database Mapping
**Update Operations (PUT):**

### 🔄 **Data Transformation**

#### **Frontend to Database Mapping**
The API automatically transforms field names between frontend and database formats:

**Update Operations (PUT)**:
```typescript
// Frontend sends
{
  "assetNumber": "GM001",
  "installedGame": "Slot Game",
  "locationId": "loc123",
  "smbId": "smib456",
  "status": "active"
}

// API transforms to
{
  "serialNumber": "GM001",
  "game": "Slot Game", 
  "gamingLocation": "loc123",

  "relayId": "smb456",

  "relayId": "smib456",
  "assetStatus": "active"
}
```


### Database to Frontend Mapping
**Retrieve Operations (GET):**

**Database to Frontend Mapping (GET)**:
```typescript
// Database returns
{
  "serialNumber": "GM001",
  "game": "Slot Game",
  "gamingLocation": "loc123",

  "relayId": "smb456",

  "relayId": "smib456",
  "assetStatus": "active"
}

// API transforms to
{
  "assetNumber": "GM001",
  "installedGame": "Slot Game",
  "locationId": "loc123", 

  "smbId": "smb456",

  "smbId": "smib456",
  "status": "active",
  "isCronosMachine": false
}
```


## Financial Calculations

### Machine Performance Metrics
```
Gross Revenue = SAS Drop - SAS Cancelled Credits
Handle = SAS Coin In (total bets placed)
Jackpot Amount = SAS Jackpot
Games Played = SAS Games Played
```

### Collection Calculations
```
Collection Drop = Current Meters In - Previous Meters In
Collection Gross = Collection Drop - Collection Cancelled Credits
Movement = Current Reading - Previous Reading
```

## Security & Validation

### Authentication
- JWT tokens required for all endpoints
- Proper user role validation
- Rate limiting on API calls

### Input Validation
- Type safety with TypeScript
- Data sanitization and validation
- SQL injection prevention

### Error Handling
- Graceful degradation with proper error responses
- Clear user-friendly error messages
- Comprehensive error logging

## Performance Optimizations

### Database Queries
- Proper database indexes for performance
- Efficient MongoDB aggregation pipelines
- Server-side pagination for large datasets

### Caching Strategy
- Response caching with appropriate headers
- Client-side caching strategies
- Query optimization for frequently accessed data

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

### Error Response Format

### 🛡️ **Security & Validation**

#### **Authentication**
- **JWT Tokens**: Secure authentication required for all endpoints
- **Authorization**: Proper user role validation
- **Rate Limiting**: API call frequency restrictions

#### **Input Validation**
- **Type Safety**: Full TypeScript implementation
- **Data Sanitization**: Input cleaning and validation
- **SQL Injection Prevention**: Parameterized queries

#### **Error Handling**
- **Graceful Degradation**: Proper error responses
- **User Feedback**: Clear error messages
- **Logging**: Comprehensive error logging

### 📈 **Performance Optimizations**

#### **Database Queries**
- **Indexing**: Proper database indexes for performance
- **Aggregation Pipelines**: Efficient MongoDB aggregation
- **Pagination**: Server-side pagination for large datasets

#### **Caching Strategy**
- **Response Caching**: Appropriate cache headers
- **Data Caching**: Client-side caching strategies
- **Query Optimization**: Efficient database queries

### 🔍 **Error Handling**

#### **HTTP Status Codes**
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error

#### **Error Response Format**
```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly message"
}
```


## API Usage Examples

### Fetch Cabinet Details

### 📝 **API Usage Examples**

#### **Fetch Cabinet Details**
```typescript
const response = await fetch('/api/machines/cabinet123');
const cabinet = await response.json();
// Returns transformed data with frontend field names
```


### Update Cabinet

#### **Update Cabinet**
```typescript
const updateData = {
  assetNumber: "GM002",
  installedGame: "New Game",
  status: "maintenance"
};

const response = await fetch('/api/locations/loc123/cabinets/cabinet123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData)
});
```


### Fetch Activity Log

#### **Fetch Activity Log**
```typescript
const response = await fetch('/api/machines/by-id/events?id=cabinet123&timePeriod=Today');
const events = await response.json();
```


---

**Last Updated:** January 15th, 2025

### 🧪 **Testing & Validation**

#### **Manual Testing**
- ✅ **All Endpoints**: Functional with proper responses
- ✅ **Data Transformation**: Field mapping works correctly
- ✅ **Error Handling**: Proper error responses
- ✅ **Authentication**: Secure access control

#### **Build Validation**
- ✅ **TypeScript**: No type errors
- ✅ **ESLint**: All linting rules passing
- ✅ **Build Process**: Clean builds with no errors

## Future Enhancements

### **Planned Features**
- **Real-time Updates**: WebSocket integration
- **Advanced Filtering**: Complex query support
- **Bulk Operations**: Multiple cabinet updates
- **Audit Logging**: Complete change tracking

### **Performance Improvements**
- **GraphQL**: Alternative to REST for complex queries
- **Redis Caching**: Enhanced caching layer
- **Database Optimization**: Query performance improvements

## Conclusion

The Cabinets API is now fully functional with all previously reported issues resolved. The implementation includes proper data transformation, comprehensive error handling, security measures, and performance optimizations. The system is production-ready and provides a robust foundation for cabinet management operations.
