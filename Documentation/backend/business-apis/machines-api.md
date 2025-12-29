# Machines API

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [GET /api/machines](#get-apimachines)
  - [POST /api/machines](#post-apimachines)
  - [GET /api/machines/[id]](#get-apimachinesid)
  - [PUT /api/machines/[id]](#put-apimachinesid)
  - [DELETE /api/machines/[id]](#delete-apimachinesid)
  - [GET /api/machines/aggregation](#get-apimachinesaggregation)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Migration Notes](#migration-notes)

## Overview

The Machines API provides comprehensive management of gaming machines/cabinets, including CRUD operations, real-time metrics, activity logging, and collection history. All endpoints respect location-based gaming day offsets for accurate time-based filtering and reporting.

**Key Features:**
- Machine CRUD operations with full lifecycle management
- Real-time metrics and performance data
- Activity logging and event tracking
- Collection history and financial data
- SMIB configuration and communication
- Gaming day offset-aware date filtering

## Base URL

```
https://api.example.com/v1/machines
```

All endpoints are prefixed with `/api/machines`.

## Authentication

### Required Permissions
- **Read Operations:** Any authenticated user with location access
- **Write Operations:** Admin, Manager, or Location Admin roles
- **Machine-Specific Access:** Users can only access machines within their assigned locations

### Token Requirements
- Valid JWT token required for all endpoints
- Location-based filtering applied automatically

## Rate Limiting

### Machine Operations
- **Read Operations:** 2000 requests per hour per user
- **Write Operations:** 200 requests per hour per user
- **Metrics Operations:** 500 requests per hour per user

### Headers
Rate limit information included in responses:
```
X-RateLimit-Limit: 2000
X-RateLimit-Remaining: 1950
X-RateLimit-Reset: 1640995200
```

## Endpoints

### GET /api/machines

**Purpose:** Retrieve paginated list of machines with filtering and search capabilities

**Query Parameters:**
- `location` (string, optional) - Filter by location ID
- `licensee` (string, optional) - Filter by licensee ID
- `status` (string, optional) - Filter by status ('online', 'offline')
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 50, max: 200)
- `search` (string, optional) - Search by asset number, serial number, or game type
- `sortBy` (string, optional) - Sort field (default: 'assetNumber')
- `sortOrder` (string, optional) - Sort order: 'asc' | 'desc' (default: 'asc')

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
      "location": "location_id",
      "locationName": "Downtown Casino",
      "status": "online",
      "lastSeen": "2024-12-28T10:45:00Z",
      "smbId": "relay_001",
      "isCronosMachine": false,
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "pages": 5
  }
}
```

**Used By:** Machine listing pages, machine selection interfaces
**Notes:** Automatically filters results based on user's accessible locations

---

### POST /api/machines

**Purpose:** Create a new gaming machine/cabinet

**Request Body:**
```json
{
  "assetNumber": "A001",
  "serialNumber": "SN123456",
  "gameType": "Slot Machine",
  "location": "location_id",
  "smbId": "relay_001",
  "isCronosMachine": false,
  "configuration": {
    "maxBet": 100,
    "denominations": [1, 5, 10, 25],
    "paylines": 20
  }
}
```

**Required Fields:**
- `assetNumber` - Unique asset identifier
- `serialNumber` - Hardware serial number
- `gameType` - Type of gaming machine
- `location` - Assigned location ID

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "_id": "new_machine_id",
    "assetNumber": "A001",
    "serialNumber": "SN123456",
    "gameType": "Slot Machine",
    "location": "location_id",
    "status": "offline",
    "createdAt": "2024-12-28T11:00:00Z"
  },
  "message": "Machine created successfully"
}
```

**Used By:** Machine creation forms, bulk machine import
**Notes:** Triggers activity log entry, validates location permissions

---

### GET /api/machines/[id]

**Purpose:** Retrieve detailed information for a specific machine

**Path Parameters:**
- `id` (string, required) - Machine ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "machine_id",
    "assetNumber": "A001",
    "serialNumber": "SN123456",
    "gameType": "Slot Machine",
    "location": "location_id",
    "locationName": "Downtown Casino",
    "status": "online",
    "lastSeen": "2024-12-28T10:45:00Z",
    "smbId": "relay_001",
    "isCronosMachine": false,
    "configuration": {
      "maxBet": 100,
      "denominations": [1, 5, 10, 25],
      "paylines": 20
    },
    "sasMeters": {
      "drop": 1000,
      "coinIn": 5000,
      "jackpot": 250,
      "coinOut": 4750,
      "gamesPlayed": 1200
    },
    "currentBalance": 1500,
    "createdAt": "2024-01-15T08:00:00Z",
    "updatedAt": "2024-12-28T10:30:00Z"
  }
}
```

**Used By:** Machine detail views, machine editing forms
**Notes:** Includes current metrics, configuration, and location details

---

### PUT /api/machines/[id]

**Purpose:** Update machine information and configuration

**Path Parameters:**
- `id` (string, required) - Machine ID

**Request Body:**
```json
{
  "gameType": "Updated Slot Machine",
  "configuration": {
    "maxBet": 200,
    "denominations": [1, 5, 10, 25, 50],
    "paylines": 25
  },
  "smbId": "relay_002"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "machine_id",
    "assetNumber": "A001",
    "gameType": "Updated Slot Machine",
    "configuration": {
      "maxBet": 200,
      "denominations": [1, 5, 10, 25, 50],
      "paylines": 25
    },
    "smbId": "relay_002",
    "updatedAt": "2024-12-28T11:15:00Z"
  },
  "message": "Machine updated successfully"
}
```

**Used By:** Machine editing forms, configuration updates
**Notes:** Triggers activity log entry for audit trails

---

### DELETE /api/machines/[id]

**Purpose:** Soft delete a machine (marks as deleted, preserves data)

**Path Parameters:**
- `id` (string, required) - Machine ID

**Query Parameters:**
- `hardDelete` (boolean, optional) - Perform hard delete instead of soft delete

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Machine deleted successfully"
}
```

**Used By:** Machine management interfaces, cleanup operations
**Notes:** Soft delete sets `deletedAt` timestamp, hard delete removes record entirely

---

### GET /api/machines/aggregation

**Purpose:** Retrieve aggregated machine data and metrics

**Query Parameters:**
- `location` (string, optional) - Filter by location ID
- `licensee` (string, optional) - Filter by licensee ID
- `startDate` (string, optional) - Start date (ISO format)
- `endDate` (string, optional) - End date (ISO format)
- `timePeriod` (string, optional) - Predefined periods ('today', 'yesterday', '7d', '30d')

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "totalMachines": 150,
    "onlineMachines": 142,
    "offlineMachines": 8,
    "totalDrop": 250000,
    "totalCoinIn": 1250000,
    "totalJackpot": 62500,
    "averagePerformance": {
      "dropPerMachine": 1666.67,
      "winPercentage": 92.5
    },
    "byLocation": [
      {
        "locationId": "loc_001",
        "locationName": "Downtown Casino",
        "machineCount": 50,
        "onlineCount": 47,
        "totalDrop": 85000
      }
    ]
  }
}
```

**Used By:** Dashboard widgets, reporting systems, analytics interfaces
**Notes:** Aggregates data across machines respecting gaming day offsets

## Data Models

### Machine Model
```typescript
interface Machine {
  _id: string;                    // Unique machine identifier
  assetNumber: string;            // Unique asset identifier
  serialNumber: string;           // Hardware serial number
  gameType: string;               // Type of gaming machine
  location: string;               // Assigned location ID
  status: 'online' | 'offline';   // Current operational status
  lastSeen?: Date;                // Last communication timestamp
  smbId?: string;                 // SMIB relay identifier
  isCronosMachine: boolean;       // Cronos system integration flag
  configuration: {
    maxBet: number;               // Maximum bet amount
    denominations: number[];      // Accepted bet denominations
    paylines: number;             // Number of paylines
    reels?: number;               // Number of reels
  };
  sasMeters?: {                   // Current SAS meter readings
    drop: number;                 // Total money inserted
    coinIn: number;               // Total bets placed
    jackpot: number;              // Jackpot payouts
    coinOut: number;              // Total payouts
    gamesPlayed: number;          // Total games played
  };
  currentBalance?: number;         // Current machine balance
  deletedAt?: Date;               // Soft delete timestamp
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

### Machine Creation Request
```typescript
interface CreateMachineRequest {
  assetNumber: string;            // Required: Unique asset identifier
  serialNumber: string;           // Required: Hardware serial number
  gameType: string;               // Required: Game type description
  location: string;               // Required: Location ID
  smbId?: string;                 // Optional: SMIB relay ID
  isCronosMachine?: boolean;      // Optional: Cronos integration (default: false)
  configuration?: {
    maxBet?: number;
    denominations?: number[];
    paylines?: number;
    reels?: number;
  };
}
```

### Machine Update Request
```typescript
interface UpdateMachineRequest {
  gameType?: string;
  location?: string;
  smbId?: string;
  isCronosMachine?: boolean;
  configuration?: {
    maxBet?: number;
    denominations?: number[];
    paylines?: number;
    reels?: number;
  };
}
```

### Machine Aggregation Response
```typescript
interface MachineAggregation {
  totalMachines: number;          // Total machine count
  onlineMachines: number;         // Currently online machines
  offlineMachines: number;        // Currently offline machines
  totalDrop: number;              // Total money inserted across all machines
  totalCoinIn: number;            // Total bets placed
  totalJackpot: number;           // Total jackpot payouts
  averagePerformance: {
    dropPerMachine: number;       // Average drop per machine
    winPercentage: number;        // Average win percentage
  };
  byLocation: Array<{
    locationId: string;
    locationName: string;
    machineCount: number;
    onlineCount: number;
    totalDrop: number;
  }>;
}
```

## Error Handling

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 400 | DUPLICATE_ASSET | Asset number already exists |
| 400 | INVALID_LOCATION | Location does not exist or access denied |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions for machine |
| 404 | MACHINE_NOT_FOUND | Machine does not exist |
| 409 | MACHINE_IN_USE | Machine cannot be deleted (active collections) |
| 422 | INVALID_CONFIGURATION | Machine configuration validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Validation Errors
```json
{
  "success": false,
  "message": "Machine validation failed",
  "error": {
    "assetNumber": "Asset number is required",
    "serialNumber": "Serial number must be unique",
    "location": "Invalid location ID"
  },
  "code": "VALIDATION_ERROR"
}
```

## Examples

### Create New Machine
```javascript
const createMachine = async (machineData) => {
  const response = await fetch('/api/machines', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      assetNumber: 'A001',
      serialNumber: 'SN123456',
      gameType: 'Slot Machine',
      location: 'location_id',
      configuration: {
        maxBet: 100,
        denominations: [1, 5, 10, 25],
        paylines: 20
      }
    })
  });

  const data = await response.json();
  return data;
};
```

### Update Machine Configuration
```javascript
const updateMachine = async (machineId, updates) => {
  const response = await fetch(`/api/machines/${machineId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      configuration: {
        maxBet: 200,
        denominations: [1, 5, 10, 25, 50]
      }
    })
  });

  const data = await response.json();
  return data;
};
```

### Get Machine Aggregation
```javascript
const getMachineAggregation = async (locationId, timePeriod = 'today') => {
  const response = await fetch(
    `/api/machines/aggregation?location=${locationId}&timePeriod=${timePeriod}`,
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

### Search Machines
```javascript
const searchMachines = async (searchTerm, locationId) => {
  const response = await fetch(
    `/api/machines?search=${encodeURIComponent(searchTerm)}&location=${locationId}`,
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

### Bulk Machine Operations
```javascript
const bulkUpdateMachines = async (machineUpdates) => {
  const results = [];

  for (const update of machineUpdates) {
    try {
      const result = await fetch(`/api/machines/${update.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(update.data)
      });
      results.push(await result.json());
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }

  return results;
};
```

## Migration Notes

### Version History
- **v1.0:** Basic machine CRUD operations
- **v1.1:** Added SMIB integration and real-time status
- **v1.2:** Implemented SAS meter tracking
- **v1.3:** Added aggregation and analytics endpoints
- **v1.4:** Enhanced configuration management

### Breaking Changes
- **Configuration Structure:** Standardized configuration format in v1.3
- **Meter Fields:** SAS meter structure updated in v1.2
- **Status Tracking:** Real-time status monitoring added in v1.1

### Compatibility
- All existing API consumers remain compatible
- Legacy machine records are migrated automatically
- Configuration updates apply to existing machines

### Future Enhancements
- Advanced machine diagnostics (planned v2.0)
- Predictive maintenance alerts (planned v2.1)
- Automated configuration updates (planned v2.2)
- Enhanced real-time monitoring (planned v2.3)