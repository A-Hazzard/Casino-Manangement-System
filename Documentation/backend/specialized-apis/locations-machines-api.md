# Locations & Machines API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 22, 2025

## Quick Search Guide

Use **Ctrl+F** to find these key topics:

- **location creation** - What happens when you create a new location
- **location editing** - How location updates work and what fields are modified
- **machine aggregation** - How machine performance data is aggregated and calculated
- **bill validator** - How bill validator denominations are managed
- **machine status** - How machine online/offline status is calculated
- **performance metrics** - How machine performance metrics are calculated
- **database fields** - All model fields and their purposes

## Overview

The Locations & Machines API manages gaming locations and individual gaming machines. It handles CRUD operations for location management, machine configuration, performance tracking, and bill validator settings.

## Location Management System

### What Happens When You Create a Location

1. **Database Operations**:
   - Creates `GamingLocation` document in `gaminglocations` collection
   - Stores location details, address, and configuration
   - Sets up bill validator denomination preferences
   - Links to licensee and country

2. **Location Model Fields**:

```typescript
GamingLocation {
  _id: string;                    // Unique location identifier
  name: string;                   // Location display name
  country: string;                // Country identifier
  address: {
    street: string;               // Street address
    city: string;                 // City name
  };
  profitShare: number;            // Profit sharing percentage (0-100)
  rel: {
    licencee: string;             // Licensee identifier
  };
  status: string;                 // Location status (active, inactive, maintenance)
  statusHistory: Array;           // Status change history
  gameDayOffset: number;          // Game day offset in hours
  collectionBalance: number;      // Current collection balance
  previousCollectionTime: Date;   // Last collection timestamp
  priority: number;               // Location priority level
  isLocalServer: boolean;         // Whether location has local server
  billValidatorOptions: {         // Bill validator denomination settings
    denom1: boolean;              // $1 denomination accepted
    denom2: boolean;              // $2 denomination accepted
    denom5: boolean;              // $5 denomination accepted
    denom10: boolean;             // $10 denomination accepted
    denom20: boolean;             // $20 denomination accepted
    denom50: boolean;             // $50 denomination accepted
    denom100: boolean;            // $100 denomination accepted
    denom200: boolean;            // $200 denomination accepted
    denom500: boolean;            // $500 denomination accepted
    denom1000: boolean;           // $1000 denomination accepted
    denom2000: boolean;           // $2000 denomination accepted
    denom5000: boolean;           // $5000 denomination accepted
    denom10000: boolean;          // $10000 denomination accepted
  };
  geoCoords: {                    // Geographic coordinates
    latitude: number;             // Latitude coordinate
    longitude: number;            // Longitude coordinate
  };
  createdAt: Date;                // Location creation timestamp
  updatedAt: Date;                // Last modification timestamp
  deletedAt?: Date;               // Soft delete timestamp
}
```

3. **Location Creation Process**:
   - Validates required fields (name, country, address)
   - Sets default values for optional fields
   - Initializes bill validator options (all denominations disabled by default)
   - Creates audit trail entry

### What Happens When You Update a Location

1. **Field Updates**:
   - Updates `name`, `address`, `profitShare` fields
   - Modifies `billValidatorOptions` for denomination preferences
   - Updates `status`, `priority`, `isLocalServer` settings
   - Changes `geoCoords` for mapping

2. **Bill Validator Management**:
   - Each denomination can be enabled/disabled independently
   - Settings control which bills the machines will accept
   - Changes affect all machines at the location
   - Requires machine reconfiguration after changes

3. **Database Updates**:
   - Updates existing `GamingLocation` document
   - Preserves `_id` and `createdAt`
   - Updates `updatedAt` timestamp
   - Maintains audit trail

### What Happens When You Delete a Location

1. **Soft Delete Process**:
   - Sets `deletedAt` timestamp instead of removing record
   - Preserves all historical data for audit purposes
   - Prevents new machines from being assigned to location
   - Maintains referential integrity with existing machines

2. **Cascade Effects**:
   - Machines at location remain but cannot be moved
   - Collection history is preserved
   - Reports remain accessible but location shows as deleted

## Machine Management System

### What Happens When You Create a Machine

1. **Database Operations**:
   - Creates `Machine` document in `machines` collection
   - Stores machine details, configuration, and location assignment
   - Initializes meter data and collection settings
   - Links to location and SMIB controller

2. **Machine Model Fields**:

```typescript
Machine {
  _id: string;                    // Unique machine identifier
  serialNumber: string;           // Machine serial number
  game: string;                   // Installed game name
  gameType: string;               // Game type (slot, video poker, etc.)
  isCronosMachine: boolean;       // Whether machine uses Cronos system
  gameConfig: {
    accountingDenomination: number; // Accounting denomination (e.g., 0.01, 0.05)
  };
  cabinetType: string;            // Cabinet type (upright, slant, bar top)
  assetStatus: string;            // Asset status (active, maintenance, offline)
  gamingLocation: string;         // Location ID where machine is installed
  relayId: string;                // SMIB controller identifier
  smibConfig: {                   // SMIB configuration settings
    ipAddress: string;            // SMIB IP address
    port: number;                 // SMIB communication port
    protocol: string;             // Communication protocol
  };
  smibVersion: {                  // SMIB firmware version
    version: string;              // Firmware version number
    buildDate: Date;              // Firmware build date
  };
  collectionTime?: Date;          // Last collection timestamp
  collectionMeters: {             // Current collection meter readings
    metersIn: number;             // Current meters in reading
    metersOut: number;            // Current meters out reading
  };
  collectionMetersHistory: Array; // Historical collection meter data
  sasMeters?: {                   // SAS meter data (if available)
    drop: number;                 // SAS drop amount
    totalCancelledCredits: number; // SAS cancelled credits
    jackpot: number;              // SAS jackpot amount
    coinIn: number;               // SAS coin in amount
    coinOut: number;              // SAS coin out amount
    gamesPlayed: number;          // SAS games played count
    gamesWon: number;             // SAS games won count
  };
  meterData: {                    // Current meter data
    lastActivity: Date;           // Last communication timestamp
    onlineStatus: boolean;        // Whether machine is currently online
  };
  createdAt: Date;                // Machine creation timestamp
  updatedAt: Date;                // Last modification timestamp
  deletedAt?: Date;               // Soft delete timestamp
}
```

3. **Machine Creation Process**:
   - Validates required fields (serialNumber, game, gamingLocation)
   - Sets default values for configuration
   - Initializes meter data and collection settings
   - Links to SMIB controller if provided

### What Happens When You Update a Machine

1. **Field Updates**:
   - Updates `serialNumber`, `game`, `assetStatus` fields
   - Modifies `gamingLocation` for machine moves
   - Updates `smibConfig` and `smibVersion` settings
   - Changes `gameConfig` and `cabinetType`

2. **Configuration Updates**:
   - SMIB settings changes require machine reconfiguration
   - Game configuration changes affect machine behavior
   - Location changes require physical machine movement
   - Status changes affect machine availability

3. **Database Updates**:
   - Updates existing `Machine` document
   - Preserves `_id` and `createdAt`
   - Updates `updatedAt` timestamp
   - Maintains collection history

## Machine Aggregation System

### What Happens When Machine Data Is Aggregated

1. **Database Operations**:
   - Queries `machines` collection with filters
   - Aggregates data from `meters` collection
   - Calculates performance metrics and statistics
   - Groups data by location, manufacturer, or time period

2. **Machine Aggregation Model Fields**:

```typescript
MachineAggregation {
  _id: string;                    // Machine identifier
  locationId: string;             // Location identifier
  locationName: string;           // Location display name
  assetNumber: string;            // Machine asset number (serialNumber)
  smbId: string;                  // SMIB controller ID (relayId)
  lastOnline: Date;               // Last communication timestamp
  moneyIn: number;                // Total money in (drop + coinIn)
  moneyOut: number;               // Total money out (cancelled credits)
  jackpot: number;                // Total jackpot amounts
  gross: number;                  // Net revenue (moneyIn - moneyOut)
  timePeriod: string;             // Time period for data (last7days, last30days, etc.)
  machineStatus: string;          // Current machine status
  onlineStatus: boolean;          // Whether machine is currently online
}
```

3. **Machine Aggregation Formulas**:

```javascript
// Money In Calculation
moneyIn = Σ(movement.drop + movement.coinIn) WHERE machine = machineId AND readAt BETWEEN startDate AND endDate

// Money Out Calculation
moneyOut = Σ(movement.totalCancelledCredits) WHERE machine = machineId AND readAt BETWEEN startDate AND endDate

// Gross Revenue Calculation
gross = moneyIn - moneyOut

// Machine Status Calculation
onlineStatus = lastActivity >= (currentTime - 3 minutes)

// Time Period Filtering
timePeriod = "last7days" | "last30days" | "custom" | "today" | "yesterday"
```

### Machine Performance Calculation Process

1. **Data Collection**:
   - Gathers meter readings from `meters` collection
   - Filters by machine ID and time period
   - Aggregates financial data across time period

2. **Performance Metrics**:
   - Calculates total revenue and profit
   - Determines machine utilization
   - Identifies top-performing machines
   - Tracks machine status and availability

3. **Aggregation Results**:
   - Returns formatted data for frontend display
   - Includes pagination for large datasets
   - Provides summary statistics

## Bill Validator System

### What Happens When Bill Validator Settings Are Updated

1. **Denomination Management**:
   - Each denomination can be enabled/disabled independently
   - Settings control which bills machines will accept
   - Changes require machine reconfiguration
   - Affects all machines at the location

2. **Bill Validator Options**:

```typescript
BillValidatorOptions {
  denom1: boolean;                // $1 bills accepted
  denom2: boolean;                // $2 bills accepted
  denom5: boolean;                // $5 bills accepted
  denom10: boolean;               // $10 bills accepted
  denom20: boolean;               // $20 bills accepted
  denom50: boolean;               // $50 bills accepted
  denom100: boolean;              // $100 bills accepted
  denom200: boolean;              // $200 bills accepted
  denom500: boolean;              // $500 bills accepted
  denom1000: boolean;             // $1000 bills accepted
  denom2000: boolean;             // $2000 bills accepted
  denom5000: boolean;             // $5000 bills accepted
  denom10000: boolean;            // $10000 bills accepted
}
```

3. **Bill Validator Update Process**:
   - Updates location's `billValidatorOptions` field
   - Propagates changes to all machines at location
   - Requires SMIB reconfiguration
   - Logs changes for audit trail

## Machine Status System

### What Happens When Machine Status Is Calculated

1. **Status Calculation Process**:
   - Checks `lastActivity` timestamp against current time
   - Determines online/offline status
   - Updates machine status in database
   - Provides real-time status information

2. **Machine Status Formulas**:

```javascript
// Online Status Calculation
onlineStatus = lastActivity >= (currentTime - 3 minutes)

// Machine Status Categories
if (onlineStatus && assetStatus === "active") return "online"
if (!onlineStatus && assetStatus === "active") return "offline"
if (assetStatus === "maintenance") return "maintenance"
if (assetStatus === "inactive") return "inactive"
if (deletedAt) return "deleted"

// NON-SMIB Location Offline Override
// NON-SMIB locations (locations without SMIB machines) are marked as offline
// if no collection report exists in the past 3 months
if (location.sasMachines === 0 && !hasCollectionReportInPast3Months) {
  location.onlineMachines = 0; // Force offline status
  location.hasNoRecentCollectionReport = true; // Flag for frontend warning icon
}
```

3. **Status Update Process**:
   - Monitors machine communication timestamps
   - Updates status in real-time
   - Triggers alerts for status changes
   - Maintains status history

## API Endpoints

### Locations Management

**Base URL:** `/api/locations`

#### GET /api/locations

**What it does**: Retrieves all gaming locations with optional filtering
**Database Operations**:

- Queries `gaminglocations` collection
- Filters by licensee and search criteria
- Applies soft delete filtering
  **Query Parameters**: `licencee`, `search`, `page`, `limit`
  **Response Fields**: Array of `GamingLocation` objects
  **Used By**: Location management page, location selection components

#### POST /api/locations

**What it does**: Creates a new gaming location
**Database Operations**:

- Validates input data
- Creates new `GamingLocation` document
- Sets up default bill validator options
- Logs creation activity
  **Request Fields**: All `GamingLocation` model fields except `_id`, `createdAt`, `updatedAt`
  **Response Fields**: Created `GamingLocation` object
  **Used By**: Location creation forms

#### PUT /api/locations

**What it does**: Updates an existing gaming location
**Database Operations**:

- Finds location by `_id` (using `locationName` as identifier)
- Updates specified fields
- Handles bill validator options updates
- Logs change activity
  **Request Fields**: All `GamingLocation` model fields (including `_id`)
  **Response Fields**: Updated `GamingLocation` object
  **Used By**: Location editing forms

#### DELETE /api/locations

**What it does**: Soft deletes a gaming location
**Database Operations**:

- Finds location by `_id`
- Sets `deletedAt` timestamp
- Logs deletion activity
  **Request Fields**: Location ID to delete
  **Response Fields**: Success confirmation message
  **Used By**: Location management page

### Machines Management

**Base URL:** `/api/machines`

#### GET /api/machines

**What it does**: Retrieves detailed information for a specific machine
**Database Operations**:

- Queries `machines` collection by ID
- Includes meter data if time period specified
- Calculates performance metrics
  **Query Parameters**: `id` (required), `timePeriod` (optional)
  **Response Fields**: `Machine` object with performance data
  **Used By**: Machine details page, machine management

#### POST /api/machines

**What it does**: Creates a new gaming machine
**Database Operations**:

- Validates input data
- Creates new `Machine` document
- Initializes collection settings
- Logs creation activity
  **Request Fields**: All `Machine` model fields except `_id`, `createdAt`, `updatedAt`
  **Response Fields**: Created `Machine` object
  **Used By**: Machine registration forms

#### PUT /api/machines

**What it does**: Updates an existing gaming machine
**Database Operations**:

- Finds machine by ID
- Updates specified fields
- Recalculates dependent values
- Logs change activity
  **Request Fields**: Machine ID and fields to update
  **Response Fields**: Updated `Machine` object
  **Used By**: Machine editing forms

#### DELETE /api/machines

**What it does**: Soft deletes a gaming machine
**Database Operations**:

- Finds machine by ID
- Sets `deletedAt` timestamp
- Logs deletion activity
  **Request Fields**: Machine ID to delete
  **Response Fields**: Success confirmation message
  **Used By**: Machine management page

### Machine Events and Aggregation

#### GET /api/machines/[id]/events

**What it does**: Retrieves events for a specific machine
**Database Operations**:

- Queries `machineEvents` collection
- Filters by machine ID and date range
- Returns paginated event data
  **Query Parameters**: `page`, `limit`
  **Response Fields**: Array of machine events with pagination
  **Used By**: Machine event monitoring, debugging

#### GET /api/machines/aggregation

**What it does**: Retrieves aggregated machine data across locations
**Database Operations**:

- Queries `machines` collection with filters
- Aggregates data from `meters` collection
- Calculates performance metrics
- Groups by location or other criteria
  **Query Parameters**: `locationId`, `status`, `dateRange`
  **Response Fields**: Array of `MachineAggregation` objects
  **Used By**: Performance dashboards, location comparison

## Performance Considerations

### Database Optimization

- **Indexing**: Proper indexes on `gamingLocation`, `lastActivity`, `deletedAt`
- **Aggregation Pipelines**: Efficient MongoDB aggregation for complex queries
- **Query Optimization**: Optimized queries with proper filtering
- **Caching**: Response caching for frequently accessed location and machine data

### API Performance

- **Pagination**: Efficient pagination for large machine datasets
- **Response Compression**: Compressed responses for large aggregation data
- **Rate Limiting**: Protection against excessive API usage
- **Background Processing**: Heavy calculations processed in background

## Security Features

### Access Control

- **Authentication**: JWT token required for all endpoints
- **Authorization**: Role-based access to location and machine data
- **Data Filtering**: Results filtered by user permissions
- **Audit Logging**: All location and machine operations logged

### Data Protection

- **Input Validation**: Comprehensive validation of all location and machine data
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: Protection against API abuse
- **Data Sanitization**: Output sanitization for security

## Error Handling

### Common Error Scenarios

- **Invalid Location Data**: Malformed location information
- **Machine Configuration Errors**: Invalid machine settings
- **Duplicate Serial Numbers**: Non-unique machine identifiers
- **Location Not Found**: References to non-existent locations

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview

The Locations & Machines API manages gaming locations and individual gaming machines. It provides CRUD operations for location management, machine configuration, and performance tracking.

## Base URLs

```
/api/locations
/api/machines
```

## Locations API

### GET /api/locations

Retrieves all gaming locations with optional licensee filtering.

**Query Parameters:**

- `licencee` (string, optional): Filter locations by licensee name

**Response (Success - 200):**

```json
{
  "locations": [
    {
      "_id": "location_id",
      "name": "Main Casino",
      "country": "United States",
      "address": {
        "street": "123 Casino St",
        "city": "Las Vegas"
      },
      "rel": {
        "licencee": "Casino Corp"
      },
      "profitShare": 50,
      "isLocalServer": false,
      "geoCoords": {
        "latitude": 36.1699,
        "longitude": -115.1398
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Used By:**

- `/locations` page - Location management page
- Location selection components
- Geographic mapping features

---

### POST /api/locations

Creates a new gaming location.

**Request Body:**

```json
{
  "name": "New Casino",
  "address": {
    "street": "456 Gaming Ave",
    "city": "Reno"
  },
  "country": "United States",
  "profitShare": 60,
  "rel": {
    "licencee": "Gaming Corp"
  },
  "isLocalServer": true,
  "geoCoords": {
    "latitude": 39.5296,
    "longitude": -119.8138
  }
}
```

**Response (Success - 201):**

```json
{
  "success": true,
  "location": {
    "_id": "new_location_id",
    "name": "New Casino",
    "country": "United States",
    "address": {
      "street": "456 Gaming Ave",
      "city": "Reno"
    },
    "rel": {
      "licencee": "Gaming Corp"
    },
    "profitShare": 60,
    "isLocalServer": true,
    "geoCoords": {
      "latitude": 39.5296,
      "longitude": -119.8138
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**

- Location creation forms
- Administrative pages

---

### PUT /api/locations

Updates an existing gaming location.

**Request Body:**

```json
{
  "locationName": "Main Casino",
  "name": "Updated Casino Name",
  "address": {
    "street": "789 New St",
    "city": "Updated City"
  },
  "country": "United States",
  "profitShare": 55,
  "rel": {
    "licencee": "Updated Corp"
  },
  "isLocalServer": false,
  "geoCoords": {
    "latitude": 36.1699,
    "longitude": -115.1398
  }
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Location updated successfully",
  "locationId": "location_id"
}
```

**Used By:**

- Location editing forms
- Administrative pages

---

### DELETE /api/locations

Soft deletes a gaming location.

**Query Parameters:**

- `id` (string, required): Location ID to delete

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Location deleted successfully"
}
```

**Used By:**

- Location management page
- Administrative cleanup

## Machines API

### GET /api/machines

Retrieves detailed information for a specific machine with optional meter data.

**Query Parameters:**

- `id` (string, required): Machine ID
- `timePeriod` (string, optional): Time period for meter data (today, week, month, year)

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "_id": "machine_id",
    "serialNumber": "SN123456",
    "game": "Slot Game",
    "gameType": "slot",
    "isCronosMachine": true,
    "gameConfig": {
      "accountingDenomination": 0.01
    },
    "cabinetType": "upright",
    "assetStatus": "active",
    "gamingLocation": "location_id",
    "relayId": "relay_123",
    "collectionTime": "2024-01-01T12:00:00.000Z",
    "collectionMeters": {
      "metersIn": 1000.0,
      "metersOut": 950.0
    },
    "sasMeters": {
      "drop": 5000.0,
      "totalCancelledCredits": 100.0,
      "jackpot": 500.0,
      "coinIn": 10000.0,
      "coinOut": 9500.0,
      "gamesPlayed": 1000,
      "gamesWon": 950
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**

- `/cabinets/[slug]` page - Machine details view
- Machine management page
- Performance monitoring

---

### POST /api/machines

Creates a new gaming machine.

**Request Body:**

```json
{
  "serialNumber": "SN789012",
  "game": "New Slot Game",
  "gameType": "slot",
  "isCronosMachine": false,
  "accountingDenomination": 0.05,
  "cabinetType": "slant",
  "assetStatus": "active",
  "gamingLocation": "location_id",
  "smibBoard": "smib_456",
  "collectionSettings": {
    "lastCollectionTime": "2024-01-01T12:00:00.000Z",
    "lastMetersIn": "1000.00",
    "lastMetersOut": "950.00"
  }
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "_id": "new_machine_id",
    "serialNumber": "SN789012",
    "game": "New Slot Game",
    "gameType": "slot",
    "isCronosMachine": false,
    "gameConfig": {
      "accountingDenomination": 0.05
    },
    "cabinetType": "slant",
    "assetStatus": "active",
    "gamingLocation": "location_id",
    "relayId": "smib_456",
    "collectionTime": "2024-01-01T12:00:00.000Z",
    "collectionMeters": {
      "metersIn": 1000.0,
      "metersOut": 950.0
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**

- Machine registration forms
- Administrative pages

---

### PUT /api/machines

Updates an existing gaming machine.

**Query Parameters:**

- `id` (string, required): Machine ID to update

**Request Body:**

```json
{
  "serialNumber": "SN789012",
  "game": "Updated Slot Game",
  "gameType": "slot",
  "isCronosMachine": true,
  "cabinetType": "upright",
  "assetStatus": "maintenance",
  "gamingLocation": "new_location_id"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "_id": "machine_id",
    "serialNumber": "SN789012",
    "game": "Updated Slot Game",
    "gameType": "slot",
    "isCronosMachine": true,
    "cabinetType": "upright",
    "assetStatus": "maintenance",
    "gamingLocation": "new_location_id",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**

- Machine editing forms
- Configuration updates

---

### DELETE /api/machines

Soft deletes a gaming machine.

**Query Parameters:**

- `id` (string, required): Machine ID to delete

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Cabinet deleted successfully"
}
```

**Used By:**

- Machine management page
- Administrative cleanup

## Additional Machine Endpoints

### GET /api/machines/[id]/events

Retrieves events for a specific machine.

**Path Parameters:**

- `id` (string): Machine ID

**Query Parameters:**

- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 50): Number of events per page

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "event_id",
        "machineId": "machine_id",
        "eventType": "game_played",
        "timestamp": "2024-01-01T10:00:00.000Z",
        "data": {
          "gameId": "game_123",
          "bet": 1.0,
          "win": 2.5
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalEvents": 75,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Used By:**

- Machine event monitoring
- Debugging and analysis

### GET /api/machines/aggregation

Retrieves aggregated machine data across locations.

**Query Parameters:**

- `locationId` (string, optional): Filter by location
- `status` (string, optional): Filter by machine status
- `dateRange` (string, optional): Date range for metrics

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "aggregatedData": {
      "totalMachines": 150,
      "activeMachines": 142,
      "totalRevenue": 250000.0,
      "averageUtilization": 85.5
    },
    "byLocation": [
      {
        "locationId": "location_1",
        "locationName": "Main Casino",
        "machines": 100,
        "revenue": 150000.0
      }
    ]
  }
}
```

**Used By:**

- Performance dashboards
- Location comparison reports

## How the Machines Aggregation Works (Simple Explanation)

### **What This API Does**

The machines aggregation API is like a **financial calculator for your slot machines**. It takes raw meter readings from each machine and calculates useful business metrics.

### **Database Collections Used**

#### **1. Machines Collection (`machines`)**

**What it contains:**

- Basic machine information (serial number, game type, location)
- Machine status and configuration
- SMIB settings and firmware information

**Key fields:**

- `_id`: Unique machine identifier
- `serialNumber`: Machine's serial number
- `gamingLocation`: Which casino location the machine is at
- `game`: What game is installed on the machine
- `assetStatus`: Whether the machine is active, maintenance, etc.
- `smibBoard`: SMIB controller identifier

#### **2. Meters Collection (`meters`)**

**What it contains:**

- Raw meter readings from each machine
- Financial data recorded at specific times
- Historical performance data

**Key fields:**

- `machine`: Which machine this reading is from (references `machines._id`)
- `readAt`: When this reading was taken
- `movement.totalCancelledCredits`: Money that was cancelled/refunded
- `movement.coinIn`: Money players put into the machine
- `movement.drop`: Money collected from the machine
- `movement.jackpot`: Jackpot amounts

### **How the Aggregation Process Works**

#### **Step 1: Find the Right Machines**

```javascript
// What the system does:
// 1. Looks up all machines in the database
// 2. Filters by: which company owns them, which location they're at
// 3. Only includes machines that aren't deleted
// 4. Gets basic machine information (name, location, status)
```

#### **Step 2: Get Financial Data from Meters**

```javascript
// What the system does:
// 1. For each machine, finds all meter readings within the time period
// 2. Adds up all the money data:
//    - Total money put in (coinIn + drop)
//    - Total cancelled credits (totalCancelledCredits)
//    - Total jackpot amounts
// 3. Calculates the gross profit (money in minus cancelled credits)
```

#### **Step 3: Combine and Format the Data**

```javascript
// What the system does:
// 1. Combines machine info with financial calculations
// 2. Formats the data for easy display
// 3. Returns a list of machines with their performance metrics
```

### **Financial Calculations Explained**

#### **Money In Calculation**

```javascript
// Formula: coinIn + drop
// Example: If players put in $1000 and $500 was collected from the machine
// Money In = $1000 + $500 = $1500
```

#### **Money Out (Cancelled Credits) Calculation**

```javascript
// Formula: sum of all totalCancelledCredits readings
// Example: If $50 was cancelled on Monday and $75 on Tuesday
// Money Out = $50 + $75 = $125
```

#### **Gross Revenue Calculation**

```javascript
// Formula: Money In - Money Out
// Example: $1500 - $125 = $1375 gross revenue
```

### **Recent Fix: Cancelled Credits Display**

#### **The Problem**

- **Before**: The frontend was looking for a field called `cancelledCredits` that didn't exist in the API response
- **Result**: Cancelled credits always showed as $0, even when there were actual cancelled credits

#### **The Solution**

- **After**: The frontend now correctly uses the `moneyOut` field from the API response
- **Result**: Cancelled credits now display correctly, showing the actual amount of money that was refunded

#### **Why This Matters**

- **Accurate Financial Reporting**: You can see the real profit after refunds
- **Operational Insights**: High cancelled credits might indicate machine problems
- **Compliance**: Accurate financial tracking is required for casino regulations
- **Business Decisions**: Helps identify which machines need attention

### **Database Query in Plain English**

#### **What the MongoDB Query Does**

```javascript
// 1. Start with all machines
db.machines.find({});

// 2. Filter by company and location (if specified)
// 3. Only include machines that aren't deleted

// 4. For each machine, look up its meter readings
db.meters.find({
  machine: 'machine_id',
  readAt: { $gte: startDate, $lte: endDate },
});

// 5. Add up all the financial data
// 6. Calculate totals and return the results
```

#### **Performance Considerations**

- **Indexing**: The system uses database indexes to make queries fast
- **Time Periods**: Queries are limited to specific time periods to avoid processing too much data
- **Aggregation**: Uses MongoDB's aggregation pipeline for efficient calculations
- **Caching**: Results can be cached for frequently accessed data

### **API Response Structure**

#### **Individual Machine Data**

```json
{
  "_id": "machine_id",
  "locationId": "location_id",
  "locationName": "Main Casino",
  "assetNumber": "12345",
  "smbId": "smib_controller_id",
  "lastOnline": "2024-01-01T12:00:00.000Z",
  "moneyIn": 15000.0, // Total money put into machine
  "moneyOut": 125.0, // Total cancelled credits
  "jackpot": 500.0, // Total jackpot amounts
  "gross": 14875.0, // Actual profit (moneyIn - moneyOut)
  "timePeriod": "last7days" // What time period this data covers
}
```

#### **What Each Field Means**

- **moneyIn**: Total amount of money players put into the machine
- **moneyOut**: Total amount of money that was cancelled/refunded
- **jackpot**: Total jackpot amounts paid out
- **gross**: The actual profit (money in minus cancelled credits)
- **lastOnline**: When the machine last sent data to the system

### **Common Use Cases**

#### **1. Daily Performance Review**

- **Query**: Get data for the last 24 hours
- **Use**: See which machines performed best yesterday
- **Business Value**: Identify top-performing machines and potential issues

#### **2. Weekly Financial Reports**

- **Query**: Get data for the last 7 days
- **Use**: Generate weekly profit reports
- **Business Value**: Track weekly performance trends

#### **3. Monthly Analysis**

- **Query**: Get data for the last 30 days
- **Use**: Monthly financial analysis and planning
- **Business Value**: Long-term performance tracking and budgeting

#### **4. Location Comparison**

- **Query**: Get data for specific locations
- **Use**: Compare performance between different casino locations
- **Business Value**: Identify which locations are most profitable

### **Error Handling and Edge Cases**

#### **Missing Data**

- **Scenario**: A machine hasn't sent meter readings recently
- **Handling**: Shows $0 for financial fields, but still displays machine info
- **User Impact**: You can see the machine exists but know it needs attention

#### **Invalid Data**

- **Scenario**: Meter readings have negative values or impossible amounts
- **Handling**: System validates data and flags suspicious readings
- **User Impact**: You get warnings about potentially incorrect data

#### **Network Issues**

- **Scenario**: Database connection problems
- **Handling**: Returns error message with retry options
- **User Impact**: Clear error messages help you understand what went wrong

This aggregation system essentially **turns raw meter data into business intelligence** that helps you understand how your slot machines are performing and where to focus your attention.

## Database Models

### Gaming Location Model

```typescript
type GamingLocation = {
  _id: string;
  name: string;
  country: string;
  address: {
    street: string;
    city: string;
  };
  rel: {
    licencee: string;
  };
  profitShare: number;
  isLocalServer: boolean;
  geoCoords: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};
```

### Machine Model

```typescript
type Machine = {
  _id: string;
  serialNumber: string;
  game: string;
  gameType: string;
  isCronosMachine: boolean;
  gameConfig: {
    accountingDenomination: number;
  };
  cabinetType: string;
  assetStatus: string;
  gamingLocation: string;
  relayId: string;
  collectionTime?: Date;
  collectionMeters: {
    metersIn: number;
    metersOut: number;
  };
  sasMeters?: {
    drop: number;
    totalCancelledCredits: number;
    jackpot: number;
    coinIn: number;
    coinOut: number;
    gamesPlayed: number;
    gamesWon: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};
```

## Features

### Location Management

- **Geographic Coordinates**: GPS coordinates for mapping
- **Licensee Association**: Link locations to gaming licensees
- **Profit Sharing**: Configurable profit sharing percentages
- **Local Server Support**: Support for local server configurations

### Machine Management

- **Serial Number Tracking**: Unique machine identification
- **Game Configuration**: Game type and denomination settings
- **Asset Status**: Active, maintenance, offline status tracking
- **Collection Meters**: Financial meter tracking
- **SAS Integration**: SAS protocol meter data

### Performance Tracking

- **Meter Aggregation**: Time-based meter data aggregation
- **Event Logging**: Detailed machine event tracking
- **Utilization Metrics**: Machine utilization calculations
- **Revenue Tracking**: Financial performance monitoring

## Error Codes

| Status Code | Description                            |
| ----------- | -------------------------------------- |
| 200         | Success                                |
| 201         | Created                                |
| 400         | Bad Request (Invalid input)            |
| 404         | Not Found (Location/Machine not found) |
| 500         | Internal Server Error                  |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Validation**: Custom validation utilities
- **Middleware**: Database connection middleware
- **Authentication**: JWT token validation
- **Geographic Data**: GPS coordinate validation

## Related Frontend Pages

- **Locations** (`/locations`): Location management page
- **Location Details** (`/locations/[slug]`): Individual location view
- **Cabinets** (`/cabinets`): Machine listing page
- **Cabinet Details** (`/cabinets/[slug]`): Individual machine view

### Financial Calculations Analysis

#### Location Aggregation Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

##### **Location Money In (Drop) ✅**

- **Current Implementation**:
  ```javascript
  moneyIn: {
    $sum: '$movement.drop';
  }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Total physical cash collected across all machines at location
- **Aggregation**: Groups by `gamingLocation`, sums across time period

##### **Location Money Out (Total Cancelled Credits) ✅**

- **Current Implementation**:
  ```javascript
  moneyOut: {
    $sum: '$movement.totalCancelledCredits';
  }
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Total credits refunded/cancelled at location
- **Aggregation**: Groups by `gamingLocation`, sums across time period

##### **Location Gross Revenue ✅**

- **Current Implementation**:
  ```javascript
  gross: {
    $subtract: ['$moneyIn', '$moneyOut'];
  }
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: `gross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)` per location

##### **Machine Status by Location ✅**

- **Current Implementation**:
  ```javascript
  // Online machines per location
  totalOnlineMachines: {
    $sum: {
      $cond: [{ $gte: ['$lastActivity', recentThreshold] }, 1, 0];
    }
  }
  // Total machines per location
  totalMachines: {
    $sum: 1;
  }
  ```
- **Business Logic**:
  - **Online**: Machines with `lastActivity >= (currentTime - 3 minutes)`
  - **Total**: Count of all non-deleted machines at location
- ✅ **CONSISTENT** - Standard machine status calculation

##### **Machine Aggregation Pipeline ✅**

- **Current Implementation**:
  ```javascript
  // MongoDB aggregation pipeline
  [
    {
      $match: {
        gamingLocation: { $in: locationIds },
        deletedAt: { $exists: false },
      },
    },
    { $lookup: { from: 'meters', localField: '_id', foreignField: 'machine' } },
    { $unwind: '$metersData' },
    { $match: { 'metersData.readAt': { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$gamingLocation',
        totalDrop: { $sum: '$metersData.movement.drop' },
        totalCancelledCredits: {
          $sum: '$metersData.movement.totalCancelledCredits',
        },
        totalMachines: { $sum: 1 },
      },
    },
    {
      $addFields: {
        gross: { $subtract: ['$totalDrop', '$totalCancelledCredits'] },
      },
    },
  ];
  ```
- **Financial Guide**: Uses `movement.drop` and `movement.totalCancelledCredits` ✅ **MATCHES**
- **Aggregation Strategy**: Groups machines by location, aggregates financial data

#### Machine Individual Calculations vs Financial Metrics Guide

##### **Individual Machine Revenue ✅**

- **Current Implementation**:
  ```javascript
  // Per machine aggregation
  machineDrop: { $sum: "$movement.drop" },
  machineCancelledCredits: { $sum: "$movement.totalCancelledCredits" },
  machineGross: { $subtract: ["$machineDrop", "$machineCancelledCredits"] }
  ```
- **Financial Guide**: Uses `movement.drop` and `movement.totalCancelledCredits` ✅ **MATCHES**
- **Business Logic**: Individual machine performance within location context

##### **Machine Collection Meters ❌**

- **Current Implementation**:
  ```javascript
  collectionMeters: {
    metersIn: Number,  // Not clearly defined in current docs
    metersOut: Number  // Not clearly defined in current docs
  }
  ```
- **Financial Guide**: No specific definition for `collectionMeters.metersIn/metersOut`
- ❌ **NOT IN GUIDE** - Collection meters calculation not defined in financial metrics guide

### Mathematical Formulas Summary

#### **Location-Level Aggregations**

```
Location Total Drop = Σ(movement.drop) WHERE gamingLocation = locationId
Location Total Cancelled Credits = Σ(movement.totalCancelledCredits) WHERE gamingLocation = locationId
Location Gross Revenue = Location Total Drop - Location Total Cancelled Credits
```

#### **Machine Status by Location**

```
Location Online Machines = COUNT(machines WHERE gamingLocation = locationId AND lastActivity >= currentTime - 3min)
Location Total Machines = COUNT(machines WHERE gamingLocation = locationId AND deletedAt IS NULL)
Location Offline Machines = Location Total Machines - Location Online Machines

// NON-SMIB Location Offline Override
// For NON-SMIB locations (sasMachines === 0), check collection reports
IF (location.sasMachines === 0 AND NOT EXISTS collectionReport WHERE
    location = locationId AND timestamp >= (currentTime - 3 months) AND isEditing != true) {
  Location Online Machines = 0  // Force offline
  Location.hasNoRecentCollectionReport = true  // Flag for frontend warning
}
```

#### **Machine Performance within Location**

```
Machine Revenue at Location = Σ(movement.drop) WHERE machine = machineId AND gamingLocation = locationId
Machine Cancelled Credits = Σ(movement.totalCancelledCredits) WHERE machine = machineId AND gamingLocation = locationId
Machine Gross = Machine Revenue - Machine Cancelled Credits
```

#### **Location Performance Ranking**

```
Top Locations by Revenue = ORDER BY Σ(movement.drop) DESC
Top Locations by Gross = ORDER BY gross DESC
Top Locations by Machine Count = ORDER BY totalMachines DESC
```

#### **Collection Meters (Not in Guide)**

```
Collection Meters In = collectionMeters.metersIn  // Definition unclear
Collection Meters Out = collectionMeters.metersOut // Definition unclear
```

**Note**: Collection meters calculations are not defined in the financial metrics guide and may need review.

## Performance Considerations

### Data Optimization

- **Geographic Filtering**: Efficient coordinate-based queries
- **Meter Aggregation**: Pre-calculated meter summaries
- **Indexing**: Proper indexing on frequently queried fields
- **Soft Deletes**: Maintain data integrity with soft deletion

### Real-time Updates

- **Status Monitoring**: Real-time machine status updates
- **Meter Synchronization**: Live meter data integration
- **Event Streaming**: Real-time event logging
- **Performance Alerts**: Automated performance monitoring
