# Locations & Machines API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025

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
