# Locations & Machines API Documentation

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
      "metersIn": 1000.00,
      "metersOut": 950.00
    },
    "sasMeters": {
      "drop": 5000.00,
      "totalCancelledCredits": 100.00,
      "jackpot": 500.00,
      "coinIn": 10000.00,
      "coinOut": 9500.00,
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
      "metersIn": 1000.00,
      "metersOut": 950.00
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
          "bet": 1.00,
          "win": 2.50
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
      "totalRevenue": 250000.00,
      "averageUtilization": 85.5
    },
    "byLocation": [
      {
        "locationId": "location_1",
        "locationName": "Main Casino",
        "machines": 100,
        "revenue": 150000.00
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
db.machines.find({})

// 2. Filter by company and location (if specified)
// 3. Only include machines that aren't deleted

// 4. For each machine, look up its meter readings
db.meters.find({
  machine: "machine_id",
  readAt: { $gte: startDate, $lte: endDate }
})

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
  "moneyIn": 15000.00,        // Total money put into machine
  "moneyOut": 125.00,         // Total cancelled credits
  "jackpot": 500.00,          // Total jackpot amounts
  "gross": 14875.00,          // Actual profit (moneyIn - moneyOut)
  "timePeriod": "last7days"   // What time period this data covers
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
}
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
}
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

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Invalid input) |
| 404 | Not Found (Location/Machine not found) |
| 500 | Internal Server Error |

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
  moneyIn: { $sum: "$movement.drop" }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Total physical cash collected across all machines at location
- **Aggregation**: Groups by `gamingLocation`, sums across time period

##### **Location Money Out (Total Cancelled Credits) ✅**
- **Current Implementation**: 
  ```javascript
  moneyOut: { $sum: "$movement.totalCancelledCredits" }
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Total credits refunded/cancelled at location
- **Aggregation**: Groups by `gamingLocation`, sums across time period

##### **Location Gross Revenue ✅**
- **Current Implementation**: 
  ```javascript
  gross: { $subtract: ["$moneyIn", "$moneyOut"] }
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: `gross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)` per location

##### **Machine Status by Location ✅**
- **Current Implementation**: 
  ```javascript
  // Online machines per location
  totalOnlineMachines: {
    $sum: {
      $cond: [
        { $gte: ["$lastActivity", recentThreshold] },
        1, 0
      ]
    }
  }
  // Total machines per location
  totalMachines: { $sum: 1 }
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
    { $match: { gamingLocation: { $in: locationIds }, deletedAt: { $exists: false } } },
    { $lookup: { from: "meters", localField: "_id", foreignField: "machine" } },
    { $unwind: "$metersData" },
    { $match: { "metersData.readAt": { $gte: startDate, $lte: endDate } } },
    { $group: {
      _id: "$gamingLocation",
      totalDrop: { $sum: "$metersData.movement.drop" },
      totalCancelledCredits: { $sum: "$metersData.movement.totalCancelledCredits" },
      totalMachines: { $sum: 1 }
    }},
    { $addFields: { gross: { $subtract: ["$totalDrop", "$totalCancelledCredits"] } } }
  ]
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
