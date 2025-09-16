# Locations API

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025

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
      "profitShare": 50,              // Profit share percentage
      "collectionBalance": 1500,      // Current outstanding balance
      "previousCollectionTime": "2025-01-14T10:30:00Z",
      "gameDayOffset": 4,             // Game day start time (hours from midnight)
      "totalMachines": 25,            // Total machines at location
      "onlineMachines": 23,           // Currently online machines
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
  "profitShare": 45,                  // Profit share percentage
  "gameDayOffset": 4,                 // Game day start time (hours from midnight)
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
    "longitude": -74.0060
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
  "gameDayOffset": 6,                 // Change game day start time
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
  "collectionBalance": 2000,          // New balance amount
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