# Locations API

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 22, 2025

## Quick Search Guide (Ctrl+F)

- **list locations** - GET endpoint for listing locations
- **create location** - POST endpoint for creating locations
- **update location** - PUT endpoint for updating locations
- **delete location** - DELETE endpoint for locations
- **location details** - GET endpoint for location details
- **location machines** - Machine management endpoints
- **location balance** - Balance management
- **profit sharing** - Profit share configuration
- **collection balance** - Collection balance tracking
- **day start time** - Game day configuration

## Overview

The Locations API manages gaming locations, their configurations, machine assignments, and financial tracking.

**Important:** All date filtering now respects each location's gaming day offset. See [Gaming Day Offset System](./gaming-day-offset-system.md) for details on how gaming days work and how they affect time-based queries.

## Location Management

### GET `/api/locations`

**Purpose:** List all gaming locations with filtering and pagination

**Query Parameters:**

- `licencee` - Licensee ID filter
- `status` - Location status filter (active, inactive)
- `page` - Page number
- `limit` - Items per page
- `search` - Search by location name

**Response:**

```json
{
  "locations": [
    {
      "_id": "location_id",
      "name": "Downtown Casino",
      "licencee": "licencee_id",
      "address": "123 Main St, City, State",
      "status": "active",
      "profitShare": 50, // Profit share percentage
      "collectionBalance": 1500, // Current outstanding balance
      "previousCollectionTime": "2025-01-14T10:30:00Z",
      "gameDayOffset": 4, // Game day start time (hours from midnight)
      "totalMachines": 25, // Total machines at location
      "onlineMachines": 23, // Currently online machines
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

### POST `/api/locations`

**Purpose:** Create new gaming location

**Request:**

```json
{
  "name": "New Casino Location",
  "licencee": "licencee_id",
  "address": "456 Casino Blvd, City, State",
  "profitShare": 45, // Profit share percentage
  "gameDayOffset": 4, // Game day start time (hours from midnight)
  "status": "active"
}
```

**Response:**

```json
{
  "_id": "new_location_id",
  "name": "New Casino Location",
  "licencee": "licencee_id",
  "address": "456 Casino Blvd, City, State",
  "profitShare": 45,
  "collectionBalance": 0,
  "gameDayOffset": 4,
  "status": "active",
  "totalMachines": 0,
  "onlineMachines": 0,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### GET `/api/locations/[id]`

**Purpose:** Get detailed location information

**Response:**

```json
{
  "_id": "location_id",
  "name": "Downtown Casino",
  "licencee": "licencee_id",
  "address": "123 Main St, City, State",
  "status": "active",
  "profitShare": 50,
  "collectionBalance": 1500,
  "previousCollectionTime": "2025-01-14T10:30:00Z",
  "gameDayOffset": 4,
  "totalMachines": 25,
  "onlineMachines": 23,
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "contactInfo": {
    "phone": "+1-555-0123",
    "email": "downtown@casino.com"
  },
  "operatingHours": {
    "open": "09:00",
    "close": "23:00",
    "timezone": "America/New_York"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### PUT `/api/locations/[id]`

**Purpose:** Update existing location

**Request:**

```json
{
  "name": "Updated Casino Name",
  "profitShare": 55,
  "gameDayOffset": 6, // Change game day start time
  "status": "active",
  "address": "Updated Address"
}
```

**Response:**

```json
{
  "_id": "location_id",
  "name": "Updated Casino Name",
  "profitShare": 55,
  "gameDayOffset": 6,
  "status": "active",
  "address": "Updated Address",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### DELETE `/api/locations/[id]`

**Purpose:** Soft delete location (sets deletedAt timestamp)

**Response:**

```json
{
  "message": "Location deleted successfully",
  "deletedAt": "2025-01-15T10:30:00Z"
}
```

## Location Machines

### GET `/api/locations/[id]/machines`

**Purpose:** Get all machines at a location

**Query Parameters:**

- `status` - Machine status filter
- `online` - Online/offline filter
- `page` - Page number
- `limit` - Items per page

**Response:**

```json
{
  "machines": [
    {
      "_id": "machine_id",
      "serialNumber": "SN123456",
      "game": "Slot Game Pro",
      "status": "active",
      "online": true,
      "collectionMeters": {
        "metersIn": 1500,
        "metersOut": 200
      },
      "collectionTime": "2025-01-14T10:30:00Z",
      "lastActivity": "2025-01-15T09:45:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10
  }
}
```

### POST `/api/locations/[id]/machines`

**Purpose:** Add machine to location

**Request:**

```json
{
  "machineId": "machine_id",
  "notes": "Machine moved from another location"
}
```

**Response:**

```json
{
  "message": "Machine added to location successfully",
  "machine": {
    "_id": "machine_id",
    "gamingLocation": "location_id",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

### DELETE `/api/locations/[id]/machines/[machineId]`

**Purpose:** Remove machine from location

**Response:**

```json
{
  "message": "Machine removed from location successfully"
}
```

## Location Balance Management

### PUT `/api/locations/[id]/balance`

**Purpose:** Update location collection balance

**Request:**

```json
{
  "collectionBalance": 2000, // New balance amount
  "reason": "Collection report completed",
  "reportId": "collection_report_id"
}
```

**Response:**

```json
{
  "message": "Balance updated successfully",
  "previousBalance": 1500,
  "newBalance": 2000,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### GET `/api/locations/[id]/balance-history`

**Purpose:** Get location balance history

**Query Parameters:**

- `startDate` - Start date for history
- `endDate` - End date for history
- `page` - Page number
- `limit` - Items per page

**Response:**

```json
{
  "balanceHistory": [
    {
      "_id": "history_id",
      "previousBalance": 1000,
      "newBalance": 1500,
      "amount": 500,
      "reason": "Collection report completed",
      "reportId": "collection_report_id",
      "timestamp": "2025-01-14T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 15,
    "itemsPerPage": 10
  }
}
```

## Location Configuration

### Game Day Configuration

**gameDayOffset Field:**

- **Purpose**: Defines when the gaming day starts
- **Values**: 0-23 (hours from midnight)
- **Example**: 4 = 4:00 AM game day start
- **Usage**: Used for daily reporting and collection periods

**Day Start Time Options:**

- 0 = 12:00 AM (Midnight)
- 4 = 4:00 AM (Common casino start time)
- 6 = 6:00 AM (Morning start)
- 12 = 12:00 PM (Noon)

### Profit Share Configuration

**profitShare Field:**

- **Purpose**: Location's percentage of gross revenue
- **Values**: 0-100 (percentage)
- **Usage**: Used in amount to collect calculations
- **Example**: 50 = 50% profit share for location

## Data Models

### GamingLocation

**Database Fields:**

```typescript
{
  _id: string;                        // Unique location identifier
  name: string;                       // Location name
  licencee: string;                   // Licensee reference
  address: string;                    // Physical address
  status: "active" | "inactive";      // Location status
  profitShare: number;                // Profit share percentage (0-100)
  collectionBalance: number;          // Current outstanding balance
  previousCollectionTime?: Date;      // Last collection timestamp
  gameDayOffset: number;              // Game day start time (0-23)
  coordinates?: {                     // GPS coordinates
    latitude: number;
    longitude: number;
  };
  contactInfo?: {                     // Contact information
    phone: string;
    email: string;
  };
  operatingHours?: {                  // Operating hours
    open: string;                     // HH:MM format
    close: string;                    // HH:MM format
    timezone: string;                 // Timezone identifier
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;                   // Soft delete timestamp
}
```

## Error Handling

### Common Error Codes

- `LOCATION_NOT_FOUND` - Location with specified ID not found
- `INVALID_PROFIT_SHARE` - Profit share must be between 0-100
- `INVALID_GAME_DAY_OFFSET` - Game day offset must be between 0-23
- `MACHINE_ALREADY_ASSIGNED` - Machine already assigned to location
- `MACHINE_NOT_FOUND` - Machine not found
- `INVALID_BALANCE` - Invalid balance amount

### Error Response Format

```json
{
  "error": "Location not found",
  "code": "LOCATION_NOT_FOUND",
  "details": {
    "locationId": "invalid_id"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Business Logic

### Location Status Management

- **Active**: Location can accept collections and machines
- **Inactive**: Location is temporarily disabled
- **Deleted**: Location is soft-deleted (preserves data)

### Balance Management

- **Collection Balance**: Running balance of outstanding collections
- **Previous Collection Time**: Tracks last collection for scheduling
- **Balance History**: Complete audit trail of balance changes

### Machine Assignment

- **One Location**: Each machine can only be assigned to one location
- **Status Tracking**: Tracks online/offline status of machines
- **Collection History**: Maintains collection history per machine

## Security

### Access Control

- **Authentication**: JWT token required for all endpoints
- **Authorization**: Role-based access control
- **Location Access**: Users can only access authorized locations

### Data Validation

- **Profit Share**: Must be between 0-100
- **Game Day Offset**: Must be between 0-23
- **Balance**: Must be valid numeric value
- **Status**: Must be valid status value

## Performance

### Optimization

- **Indexing**: Proper indexes on frequently queried fields
- **Pagination**: Large result sets paginated
- **Caching**: Frequently accessed location data cached
- **Query Optimization**: Efficient database queries

# Locations API Documentation

**Last Updated**: October 3rd, 2025  
**Status**: ✅ Fully Functional - All Issues Resolved

## Overview

The Locations API provides comprehensive endpoints for managing gaming locations, including CRUD operations, cabinet management, and advanced filtering capabilities. All endpoints now function correctly with proper data handling, bill validator denominations, and SMIB filtering.

## Current Implementation Status

### ✅ **Resolved Issues**

- **Location Editing**: Edit operations now work correctly with proper data handling
- **Location Deletion**: Soft delete functionality implemented and working
- **Bill Validator Denominations**: Denominations now save and retrieve correctly
- **Data Consistency**: Deleted locations properly filtered from all views
- **API Endpoints**: All endpoints now functional with correct data flow
- **Search Functionality**: Location search with proper filtering
- **Aggregation**: Location metrics and statistics working correctly

### 🔧 **API Endpoints**

#### **Core Location Operations**

##### **GET `/api/locations`**

- **Purpose**: Fetch all locations with filtering and pagination
- **Features**: Licensee filtering, search, pagination, soft delete filtering
- **Query Parameters**:
  - `licensee`: Filter by specific licensee
  - `search`: Text search in location names
  - `page`: Page number for pagination
  - `limit`: Items per page
- **Data Consistency**: Automatically filters out deleted locations (`deletedAt: { $exists: false }`)

##### **POST `/api/locations`**

- **Purpose**: Create new location
- **Features**: Full location data including bill validator denominations
- **Request Format**: Accepts complete location data with nested objects
- **Bill Validator Support**: Handles `billValidatorOptions` object with denomination preferences

##### **PUT `/api/locations`**

- **Purpose**: Update existing location
- **Features**: Search by `_id`, proper field mapping, bill validator handling
- **Data Handling**:
  - Searches by `_id` (using `locationName` as identifier)
  - Filters out deleted locations
  - Handles nested `address` and `rel` fields
  - Processes `billValidatorOptions` updates

##### **DELETE `/api/locations`**

- **Purpose**: Soft delete location (sets `deletedAt` timestamp)
- **Implementation**: Marks record as deleted without permanent removal
- **Response**: Success confirmation with soft delete status

#### **Location-Specific Operations**

##### **GET `/api/locations/[locationId]`**

- **Purpose**: Fetch individual location details or cabinet aggregation
- **Dual Functionality**:
  - **Basic Details**: Returns location information when no query parameters
  - **Cabinet Aggregation**: Returns cabinet data when query parameters present
- **Bill Validator Support**: Returns `billValidatorOptions` for basic details

##### **GET `/api/locations/[locationId]/cabinets`**

- **Purpose**: Fetch cabinets for specific location
- **Features**: Time period filtering, licensee filtering, search
- **Query Parameters**:
  - `timePeriod`: Date filter (Today, Yesterday, 7d, 30d, All Time)
  - `licensee`: Filter by licensee
  - `search`: Search in cabinet data

##### **PUT `/api/locations/[locationId]/cabinets/[cabinetId]`**

- **Purpose**: Update cabinet within location
- **Features**: Data transformation, field mapping, validation
- **Data Transformation**: Maps frontend field names to database format

##### **DELETE `/api/locations/[locationId]/cabinets/[cabinetId]`**

- **Purpose**: Soft delete cabinet within location
- **Implementation**: Sets `deletedAt` timestamp
- **Response**: Success confirmation

#### **Search & Aggregation**

##### **GET `/api/locations/search`**

- **Purpose**: Search locations with filters
- **Features**: Text search, licensee filtering, soft delete filtering
- **Query Parameters**:
  - `q`: Search query
  - `licensee`: Licensee filter
- **Data Consistency**: Filters deleted locations (`deletedAt: { $in: [null, new Date(-1)] }`)

##### **GET `/api/locations/search-all`**

- **Purpose**: Comprehensive location search
- **Features**: Advanced filtering, multiple search criteria
- **Data Consistency**: Filters deleted locations

##### **GET `/api/locationAggregation`**

- **Purpose**: Fetch location metrics and statistics
- **Features**: Licensee filtering, machine counting, performance metrics, NON-SMIB offline detection
- **Helper Function**: Uses `getLocationsWithMetrics` from `app/api/lib/helpers/locationAggregation.ts`
- **Data Consistency**: Properly filters deleted locations in all aggregation stages
- **NON-SMIB Offline Logic**:
  - NON-SMIB locations (locations without SMIB machines) are automatically marked as offline if no collection report exists in the past 3 months
  - Sets `onlineMachines = 0` for locations without recent collection reports
  - Adds `hasNoRecentCollectionReport: true` flag to location data for frontend warning icon display
  - Collection reports with `isEditing: true` are excluded from the check

### 📊 **Data Models**

#### **Location Schema** (`app/api/lib/models/gaminglocations.ts`)

```typescript
{
  _id: String,                    // Location identifier
  name: String,                   // Location name
  status: String,                 // Location status
  country: String,                // Country identifier
  address: {                      // Address object
    street: String,
    city: String
  },
  profitShare: Number,            // Profit sharing percentage
  rel: {                          // Relationships
    licencee: String              // Licensee identifier
  },
  statusHistory: Array,           // Status change history
  gameDayOffset: Number,          // Game day offset
  collectionBalance: Number,      // Collection balance
  previousCollectionTime: Date,   // Last collection time
  priority: Number,               // Location priority
  isLocalServer: Boolean,         // Local server flag
  billValidatorOptions: {         // Bill validator denominations
    denom1: Boolean,              // $1 denomination
    denom2: Boolean,              // $2 denomination
    denom5: Boolean,              // $5 denomination
    denom10: Boolean,             // $10 denomination
    denom20: Boolean,             // $20 denomination
    denom50: Boolean,             // $50 denomination
    denom100: Boolean,            // $100 denomination
    denom200: Boolean,            // $200 denomination
    denom500: Boolean,            // $500 denomination
    denom1000: Boolean,           // $1000 denomination
    denom2000: Boolean,           // $2000 denomination
    denom5000: Boolean,           // $5000 denomination
    denom10000: Boolean           // $10000 denomination
  },
  geoCoords: {                    // Geographic coordinates
    latitude: Number,
    longitude: Number
  },
  deletedAt: Date                 // Soft delete timestamp
}
```

### 🔄 **Data Handling**

#### **Bill Validator Denominations**

The API now properly handles bill validator denomination preferences:

**Create/Update Operations**:

```typescript
// Frontend sends
{
  "name": "Test Location",
  "billValidatorOptions": {
    "denom1": true,
    "denom2": false,
    "denom5": true,
    "denom10": false,
    // ... other denominations
  }
}

// API processes and saves
{
  "billValidatorOptions": {
    "denom1": true,
    "denom2": false,
    "denom5": true,
    "denom10": false,
    // ... other denominations
  }
}
```

**Retrieve Operations**:

```typescript
// API returns
{
  "success": true,
  "data": {
    "name": "Test Location",
    "billValidatorOptions": {
      "denom1": true,
      "denom2": false,
      "denom5": true,
      "denom10": false,
      // ... other denominations
    }
  }
}
```

#### **Soft Delete Implementation**

All location endpoints properly handle soft deletion:

**Filtering Deleted Locations**:

```typescript
// In aggregation pipelines
{ $match: { "deletedAt": { $exists: false } } }

// In search queries
{ deletedAt: { $in: [null, new Date(-1)] } }
```

**Delete Operation**:

```typescript
// Sets deletion timestamp
{
  $set: {
    deletedAt: new Date();
  }
}
```

### 🛡️ **Security & Validation**

#### **Authentication**

- **JWT Tokens**: Secure authentication required for all endpoints
- **Authorization**: Proper user role validation
- **Rate Limiting**: API call frequency restrictions

#### **Input Validation**

- **Type Safety**: Full TypeScript implementation
- **Data Sanitization**: Input cleaning and validation
- **Field Validation**: Required field checking and format validation

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

### 📝 **API Usage Examples**

#### **Create Location**

```typescript
const locationData = {
  name: 'New Gaming Location',
  country: 'country123',
  address: {
    street: '123 Main St',
    city: 'Gaming City',
  },
  profitShare: 35,
  rel: {
    licencee: 'licensee456',
  },
  billValidatorOptions: {
    denom1: true,
    denom5: true,
    denom10: false,
    // ... other denominations
  },
};

const response = await fetch('/api/locations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(locationData),
});
```

#### **Update Location**

```typescript
const updateData = {
  locationName: 'location789', // Used as _id for search
  name: 'Updated Location Name',
  billValidatorOptions: {
    denom1: false,
    denom5: true,
    denom10: true,
    // ... other denominations
  },
};

const response = await fetch('/api/locations', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData),
});
```

#### **Search Locations**

```typescript
const response = await fetch(
  '/api/locations/search?q=gaming&licensee=licensee123'
);
const searchResults = await response.json();
```

#### **Fetch Location Details**

```typescript
const response = await fetch('/api/locations/location789');
const location = await response.json();
// Returns basic location details with billValidatorOptions
```

### 🧪 **Testing & Validation**

#### **Manual Testing**

- ✅ **All Endpoints**: Functional with proper responses
- ✅ **Bill Validator**: Denominations save and retrieve correctly
- ✅ **Soft Delete**: Deletion works without data loss
- ✅ **Search Functionality**: Location search works with filters
- ✅ **Data Consistency**: Deleted locations properly filtered

#### **Build Validation**

- ✅ **TypeScript**: No type errors
- ✅ **ESLint**: All linting rules passing
- ✅ **Build Process**: Clean builds with no errors

## Future Enhancements

### **Planned Features**

- **Real-time Updates**: WebSocket integration
- **Advanced Filtering**: Complex query support
- **Bulk Operations**: Multiple location updates
- **Audit Logging**: Complete change tracking

### **Performance Improvements**

- **GraphQL**: Alternative to REST for complex queries
- **Redis Caching**: Enhanced caching layer
- **Database Optimization**: Query performance improvements

## Conclusion

The Locations API is now fully functional with all previously reported issues resolved. The implementation includes proper bill validator denomination handling, soft delete functionality, comprehensive error handling, security measures, and performance optimizations. The system is production-ready and provides a robust foundation for location management operations.
