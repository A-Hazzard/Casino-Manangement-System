# Locations API

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [GET /api/locations](#get-apilocations)
  - [POST /api/locations](#post-apilocations)
  - [GET /api/locations/[id]](#get-apilocationsid)
  - [PUT /api/locations/[id]](#put-apilocationsid)
  - [DELETE /api/locations/[id]](#delete-apilocationsid)
  - [GET /api/locations/[id]/machines](#get-apilocationsidmachines)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Migration Notes](#migration-notes)

## Overview

The Locations API provides comprehensive management of gaming locations, including CRUD operations, machine assignments, financial configurations, and location-specific settings. All date-based operations respect each location's gaming day offset for accurate time-based filtering and reporting.

**Key Features:**
- Location CRUD operations with full lifecycle management
- Machine assignment and management per location
- Financial configuration (profit sharing, collection settings)
- Gaming day offset handling for accurate reporting
- Geographic and address management
- Status tracking and operational management

## Base URL

```
https://api.example.com/v1/locations
```

All endpoints are prefixed with `/api/locations`.

## Authentication

### Required Permissions
- **Read Operations:** Any authenticated user
- **Write Operations:** Admin, Manager, or Location Admin roles
- **Location-Specific Access:** Users can only access locations within their assigned licensees/locations

### Token Requirements
- Valid JWT token required for all endpoints
- Location-based filtering applied automatically based on user permissions

## Rate Limiting

### Location Operations
- **Read Operations:** 1000 requests per hour per user
- **Write Operations:** 100 requests per hour per user
- **Bulk Operations:** 10 bulk operations per hour per user

### Headers
Rate limit information included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Endpoints

### GET /api/locations

**Purpose:** Retrieve a list of gaming locations, with results automatically filtered based on the user's roles and permissions. Supports minimal data projection for performance.

**Query Parameters:**
- `licensee` (string, optional) - Filter locations by a specific licensee ID.
- `minimal` (boolean, optional) - If `true`, returns a minimal projection of location data (`_id`, `name`, `geoCoords`, `rel.licencee`).
- `showAll` (boolean, optional) - If `true`, includes all locations, but still respects user permissions.
- `forceAll` (boolean, optional) - If `true` and user is an admin/developer, bypasses all licensee/location filters to return all locations in the system.
- `page` (number, optional) - Page number for pagination (default: 1).
- `limit` (number, optional) - Items per page (default: 20, max: 100).
- `search` (string, optional) - Search by location name or address.
- `sortBy` (string, optional) - Sort field (default: 'name').
- `sortOrder` (string, optional) - Sort order: 'asc' | 'desc' (default: 'asc').

**Security & Filtering Logic:**
- **Admin/Developer:** Can see all locations by default. Can use `forceAll=true` to bypass all filters.
- **Manager:** Sees all locations within their `assignedLicensees`.
- **Collector/Technician/Location Admin:** Sees only the specific locations listed in their `assignedLocations`.
- If a `licensee` is specified, the results are further filtered to that licensee, but always within the bounds of the user's permissions.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "location_id",
      "name": "Downtown Casino",
      "licensee": "licensee_id",
      "address": {
        "street": "123 Main St",
        "town": "City",
        "region": "State",
        "country": "US"
      },
      "status": "active",
      "profitShare": 50,
      "gameDayOffset": -4,
      "collectionSettings": {
        "balanceThreshold": 1000,
        "autoCollection": true
      },
      "createdAt": "2024-01-15T08:00:00Z",
      "updatedAt": "2024-12-28T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Used By:** Location listing pages, location selection dropdowns
**Notes:** Automatically filters results based on user's accessible licensees and locations

---

### POST /api/locations

**Purpose:** Create a new gaming location with initial configuration

**Request Body:**
```json
{
  "name": "Downtown Casino",
  "licensee": "licensee_id",
  "address": {
    "street": "123 Main St",
    "town": "City",
    "region": "State",
    "country": "US"
  },
  "profitShare": 50,
  "gameDayOffset": -4,
  "collectionSettings": {
    "balanceThreshold": 1000,
    "autoCollection": true
  },
  "status": "active"
}
```

**Required Fields:**
- `name` - Location display name
- `licensee` - Associated licensee ID
- `address` - Complete address object

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "_id": "new_location_id",
    "name": "Downtown Casino",
    "licensee": "licensee_id",
    "address": {
      "street": "123 Main St",
      "town": "City",
      "region": "State",
      "country": "US"
    },
    "status": "active",
    "profitShare": 50,
    "gameDayOffset": -4,
    "createdAt": "2024-12-28T11:00:00Z"
  },
  "message": "Location created successfully"
}
```

**Used By:** Location creation forms, bulk location import
**Notes:** Triggers activity log entry, validates licensee permissions

---

### GET /api/locations/[id]

**Purpose:** Retrieve detailed information for a specific location

**Path Parameters:**
- `id` (string, required) - Location ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "location_id",
    "name": "Downtown Casino",
    "licensee": "licensee_id",
    "licenseeDetails": {
      "name": "Casino Corp",
      "code": "CC001"
    },
    "address": {
      "street": "123 Main St",
      "town": "City",
      "region": "State",
      "country": "US",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    },
    "status": "active",
    "profitShare": 50,
    "gameDayOffset": -4,
    "collectionSettings": {
      "balanceThreshold": 1000,
      "autoCollection": true,
      "collectionSchedule": "daily"
    },
    "billValidatorSettings": {
      "acceptedDenominations": [1, 5, 10, 20, 50, 100]
    },
    "machineCount": 25,
    "createdAt": "2024-01-15T08:00:00Z",
    "updatedAt": "2024-12-28T10:30:00Z"
  }
}
```

**Used By:** Location detail views, location editing forms
**Notes:** Includes computed fields like machine count and licensee details

---

### PUT /api/locations/[id]

**Purpose:** Update location information and configuration

**Path Parameters:**
- `id` (string, required) - Location ID

**Request Body:**
```json
{
  "name": "Updated Casino Name",
  "address": {
    "street": "456 New St",
    "town": "City",
    "region": "State",
    "country": "US"
  },
  "profitShare": 55,
  "collectionSettings": {
    "balanceThreshold": 1500,
    "autoCollection": false
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "location_id",
    "name": "Updated Casino Name",
    "address": {
      "street": "456 New St",
      "town": "City",
      "region": "State",
      "country": "US"
    },
    "profitShare": 55,
    "updatedAt": "2024-12-28T11:15:00Z"
  },
  "message": "Location updated successfully"
}
```

**Used By:** Location editing forms, configuration updates
**Notes:** Triggers activity log entry for audit trails

---

### DELETE /api/locations/[id]

**Purpose:** Soft delete a location (marks as inactive, preserves data)

**Path Parameters:**
- `id` (string, required) - Location ID

**Query Parameters:**
- `hardDelete` (boolean, optional) - Perform hard delete instead of soft delete

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Location deleted successfully"
}
```

**Used By:** Location management interfaces, cleanup operations
**Notes:** Soft delete sets status to 'inactive', hard delete removes record entirely

---

### GET /api/locations/[id]/machines

**Purpose:** Retrieve machines assigned to a specific location

**Path Parameters:**
- `id` (string, required) - Location ID

**Query Parameters:**
- `status` (string, optional) - Filter by machine status ('online', 'offline')
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 50)
- `search` (string, optional) - Search by machine details

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "machine_id",
      "assetNumber": "A001",
      "serialNumber": "SN123456",
      "gameType": "Slot Machine",
      "status": "online",
      "lastSeen": "2024-12-28T10:45:00Z",
      "location": "location_id"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  }
}
```

**Used By:** Location detail pages, machine management interfaces
**Notes:** Returns machines assigned to the specified location

## Data Models

### Location Model
```typescript
interface Location {
  _id: string;
  name: string;
  country: string;
  address: {
    street?: string;
    town?: string;
    region?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  rel: {
    licencee: string;
  };
  profitShare: number;
  collectionBalance: number;
  previousCollectionTime: Date;
  gameDayOffset: number;
  isLocalServer: boolean;
  billValidatorOptions: {
    denom1: boolean;
    denom2: boolean;
    denom5: boolean;
    denom10: boolean;
    denom20: boolean;
    denom50: boolean;
    denom100: boolean;
    denom200: boolean;
    denom500: boolean;
    denom1000: boolean;
    denom2000: boolean;
    denom5000: boolean;
    denom10000: boolean;
  };
  geoCoords: {
    latitude: number;
    longitude: number;
  };
  membershipEnabled: boolean;
  locationMembershipSettings: {
    enableFreePlays: boolean;
    pointsRatioMethod: string;
    gamesPlayedRatio: number;
    wagerRatio: number;
    pointMethodValue: number;
    pointsMethodGameTypes: string[];
    freePlayGameTypes: string[];
    freePlayAmount: number;
    enablePoints: boolean;
    freePlayCreditsTimeout: number;
    locationLimit: number;
  };
  status: 'active' | 'inactive';
  statusHistory: any[];
  noSMIBLocation: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Location Creation Request
```typescript
interface CreateLocationRequest {
  name: string;                   // Required: Display name
  licensee: string;               // Required: Licensee ID
  address: {                      // Required: Address object
    street?: string;
    town?: string;
    region?: string;
    country?: string;
  };
  profitShare?: number;           // Optional: Default 50
  gameDayOffset?: number;         // Optional: Default 0
  collectionSettings?: {
    balanceThreshold?: number;
    autoCollection?: boolean;
  };
  status?: 'active' | 'inactive'; // Optional: Default 'active'
}
```

### Location Update Request
```typescript
interface UpdateLocationRequest {
  name?: string;
  address?: {
    street?: string;
    town?: string;
    region?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  profitShare?: number;
  gameDayOffset?: number;
  collectionSettings?: {
    balanceThreshold?: number;
    autoCollection?: boolean;
    collectionSchedule?: string;
  };
  billValidatorSettings?: {
    acceptedDenominations?: number[];
  };
  status?: 'active' | 'inactive';
}
```

### Machine Assignment Model
```typescript
interface MachineAssignment {
  _id: string;                    // Machine ID
  assetNumber: string;            // Asset identifier
  serialNumber: string;           // Hardware serial number
  gameType: string;               // Game type description
  status: 'online' | 'offline';   // Current status
  lastSeen?: Date;                // Last communication timestamp
  location: string;               // Assigned location ID
}
```

## Error Handling

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 400 | INVALID_LICENSEE | Licensee does not exist or access denied |
| 400 | DUPLICATE_NAME | Location name already exists for licensee |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions for location |
| 404 | LOCATION_NOT_FOUND | Location does not exist |
| 409 | LOCATION_IN_USE | Location cannot be deleted (machines assigned) |
| 422 | INVALID_ADDRESS | Address validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Validation Errors
```json
{
  "success": false,
  "message": "Location validation failed",
  "error": {
    "name": "Location name is required",
    "licensee": "Invalid licensee ID",
    "address": "Complete address is required"
  },
  "code": "VALIDATION_ERROR"
}
```

## Examples

### Create New Location
```javascript
const createLocation = async (locationData) => {
  const response = await fetch('/api/locations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Downtown Casino',
      licensee: 'licensee_id',
      address: {
        street: '123 Main St',
        town: 'City',
        region: 'State',
        country: 'US'
      },
      profitShare: 50,
      gameDayOffset: -4
    })
  });

  const data = await response.json();
  return data;
};
```

### Update Location Settings
```javascript
const updateLocation = async (locationId, updates) => {
  const response = await fetch(`/api/locations/${locationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      profitShare: 55,
      collectionSettings: {
        balanceThreshold: 1500,
        autoCollection: false
      }
    })
  });

  const data = await response.json();
  return data;
};
```

### Get Location Machines
```javascript
const getLocationMachines = async (locationId, filters = {}) => {
  const queryParams = new URLSearchParams({
    page: '1',
    limit: '50',
    status: 'online',
    ...filters
  });

  const response = await fetch(
    `/api/locations/${locationId}/machines?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data;
};
```

### Search Locations
```javascript
const searchLocations = async (searchTerm, licenseeId) => {
  const response = await fetch(
    `/api/locations?search=${encodeURIComponent(searchTerm)}&licensee=${licenseeId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data;
};
```

## Migration Notes

### Version History
- **v1.0:** Basic location CRUD operations
- **v1.1:** Added gaming day offset support
- **v1.2:** Implemented collection settings
- **v1.3:** Added bill validator configuration
- **v1.4:** Enhanced machine assignment tracking

### Breaking Changes
- **Gaming Day Offset:** Required for accurate reporting in v1.1
- **Collection Settings:** New required configuration in v1.2
- **Address Structure:** Standardized address format in v1.3

### Compatibility
- All existing API consumers remain compatible
- Gaming day calculations apply retroactively
- Legacy address formats are migrated automatically

### Future Enhancements
- Geographic mapping integration (planned v2.0)
- Advanced analytics and reporting (planned v2.1)
- Automated location performance monitoring (planned v2.2)
- Mobile location management (planned v2.3)