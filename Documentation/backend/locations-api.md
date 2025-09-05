# Locations API Documentation

**Last Updated**: September 3rd, 2025  
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
- **Features**: Licensee filtering, machine counting, performance metrics
- **Helper Function**: Uses `getLocationsWithMetrics` from `app/api/lib/helpers/locationAggregation.ts`
- **Data Consistency**: Properly filters deleted locations in all aggregation stages

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
{ $set: { deletedAt: new Date() } }
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
  name: "New Gaming Location",
  country: "country123",
  address: {
    street: "123 Main St",
    city: "Gaming City"
  },
  profitShare: 35,
  rel: {
    licencee: "licensee456"
  },
  billValidatorOptions: {
    denom1: true,
    denom5: true,
    denom10: false,
    // ... other denominations
  }
};

const response = await fetch('/api/locations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(locationData)
});
```

#### **Update Location**
```typescript
const updateData = {
  locationName: "location789", // Used as _id for search
  name: "Updated Location Name",
  billValidatorOptions: {
    denom1: false,
    denom5: true,
    denom10: true,
    // ... other denominations
  }
};

const response = await fetch('/api/locations', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData)
});
```

#### **Search Locations**
```typescript
const response = await fetch('/api/locations/search?q=gaming&licensee=licensee123');
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
