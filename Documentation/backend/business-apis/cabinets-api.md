# Cabinets API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2025  
**Version:** 2.2.0

## Quick Search Guide

- **Machine Details**: `GET /api/machines/[id]` - Individual cabinet details
- **Machine Updates**: `PUT /api/locations/[locationId]/cabinets/[cabinetId]` - Update cabinet
- **Machine Deletion**: `DELETE /api/locations/[locationId]/cabinets/[cabinetId]` - Soft delete
- **Machine Aggregation**: `GET /api/machines/aggregation` - Aggregated data
- **Activity Log**: `GET /api/machines/by-id/events` - Machine events
- **Collection History**: `GET /api/machines/by-id/collection-history` - Collection data
- **SMIB Configuration**: `POST /api/cabinets/[cabinetId]/smib-config` - Update SMIB config
- **MQTT Config**: `GET /api/mqtt/config` - Get formatted MQTT configuration
- **Bill Validator**: `GET /api/bill-validator/[machineId]` - Get bill validator data
- **SMIB Restart**: `POST /api/smib/restart` - Restart single SMIB
- **SMIB Meters**: `POST /api/smib/meters` - Request meter data
- **SMIB OTA Update**: `POST /api/smib/ota-update` - Initiate firmware update
- **Location SMIB Restart**: `POST /api/locations/[locationId]/smib-restart` - Restart all SMIBs
- **Firmware Upload**: `POST /api/firmwares` - Upload firmware to GridFS
- **Firmware Download**: `GET /api/firmwares/[filename]` - Serve firmware to SMIB

## Overview

The Cabinets API provides comprehensive endpoints for managing gaming cabinets, including CRUD operations, metrics, events, and collection history. All endpoints function correctly with proper data transformation and error handling.

**Important:** All date filtering now respects each location's gaming day offset. See [Gaming Day Offset System](./gaming-day-offset-system.md) for details on how gaming days work and how they affect time-based queries.

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
    "assetNumber": "string", // from serialNumber
    "installedGame": "string", // from game
    "locationId": "string", // from gamingLocation
    "smbId": "string", // from relayId
    "status": "string", // from assetStatus
    "isCronosMachine": false, // default value
    "sasMeters": {
      "drop": 1000, // Money inserted
      "coinIn": 5000, // Total bets placed
      "jackpot": 250, // Jackpot payouts
      "gamesPlayed": 150 // Games played
    },
    "smibConfig": {
      "version": "1.0.0", // SMIB firmware version
      "settings": {} // SMIB configuration
    }
  }
}
```

### PUT `/api/locations/[locationId]/cabinets/[cabinetId]`

**Purpose**: Update cabinet information with field transformation

**Request Fields:**

```json
{
  "assetNumber": "GM001", // Maps to serialNumber
  "installedGame": "Slot Game", // Maps to game
  "locationId": "loc123", // Maps to gamingLocation
  "smbId": "smib456", // Maps to relayId
  "status": "active" // Maps to assetStatus
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

### GET `/api/bill-validator/[machineId]`

**Purpose**: Fetch bill validator data with automatic V1/V2 data structure detection

**Query Parameters:**

- `timePeriod` - Filter by time period (Today, Yesterday, 7d, 30d, All Time, Custom)
- `startDate` - Start date for custom range (ISO format)
- `endDate` - End date for custom range (ISO format)

**Response Fields:**

```json
{
  "success": true,
  "data": {
    "version": "v2",
    "denominations": [
      {
        "denomination": 1,
        "label": "$1",
        "quantity": 150,
        "subtotal": 150
      },
      {
        "denomination": 5,
        "label": "$5",
        "quantity": 80,
        "subtotal": 400
      },
      {
        "denomination": 20,
        "label": "$20",
        "quantity": 25,
        "subtotal": 500
      }
    ],
    "totalAmount": 1050,
    "totalQuantity": 255,
    "unknownBills": 0,
    "currentBalance": 1200
  }
}
```

**Data Processing:**

- **V1 Detection**: Bills with `movement` object, filtered by `readAt`
- **V2 Detection**: Bills with `value` field, filtered by `createdAt`
- **Automatic Processing**: API detects data structure and processes accordingly
- **Current Balance**: Retrieved from `machine.billValidator.balance`

**File**: `app/api/bill-validator/[machineId]/route.ts`

### POST `/api/cabinets/[cabinetId]/smib-config`

**Purpose**: Update SMIB configuration and send updates via MQTT

**Request Fields:**

```json
{
  "smibConfig": {
    "coms": {
      "comsMode": 0,
      "comsAddr": 1,
      "comsRateMs": 200,
      "comsRTE": 0,
      "comsGPC": 0
    },
    "net": {
      "netMode": 0,
      "netStaSSID": "Casino_WiFi",
      "netStaPwd": "password123",
      "netStaChan": 1
    },
    "mqtt": {
      "mqttSecure": 0,
      "mqttQOS": 2,
      "mqttURI": "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883",
      "mqttSubTopic": "sas/relay/",
      "mqttPubTopic": "sas/gy/server",
      "mqttCfgTopic": "smib/config",
      "mqttIdleTimeS": 30
    }
  },
  "smibVersion": {
    "firmware": "1.0.0"
  },
  "machineControl": "RESTART" // Optional: RESTART, LOCK MACHINE, UNLOCK MACHINE
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    /* updated machine object */
  },
  "mqttSent": true
}
```

**Operations:**

1. Updates machine `smibConfig` field in database
2. Updates machine `smibVersion` field if provided
3. Sends configuration to SMIB via MQTT (`mqttService.sendSMIBConfigUpdate`)
4. Sends machine control command via MQTT if provided (`mqttService.sendMachineControlCommand`)
5. Logs activity with change tracking

**File**: `app/api/cabinets/[cabinetId]/smib-config/route.ts`

### GET `/api/cabinets/[cabinetId]/smib-config`

**Purpose**: Retrieve current SMIB configuration from database

**Response:**

```json
{
  "success": true,
  "data": {
    "smibConfig": {
      "coms": {
        /* communication settings */
      },
      "net": {
        /* network settings */
      },
      "mqtt": {
        /* MQTT settings */
      }
    },
    "smibVersion": {
      "firmware": "1.0.0"
    },
    "relayId": "e831cdfa8384"
  }
}
```

**File**: `app/api/cabinets/[cabinetId]/smib-config/route.ts`

## MQTT Configuration Endpoints

### GET `/api/mqtt/config`

**Purpose**: Fetch formatted MQTT configuration values for display

**Query Parameters:**

- `cabinetId` (string, required): Cabinet/Machine ID

**Response Fields:**

```json
{
  "success": true,
  "data": {
    "smibId": "e831cdfa8464",
    "netMode": "0",
    "networkSSID": "Casino_WiFi",
    "networkPassword": "password123",
    "networkChannel": "1",
    "communicationMode": "sas",
    "comsMode": "0",
    "comsAddr": "1",
    "comsRateMs": "200",
    "comsRTE": "0",
    "comsGPC": "0",
    "firmwareVersion": "1.0.0",
    "mqttHost": "mq.sas.backoffice.ltd",
    "mqttPort": "1883",
    "mqttTLS": "0",
    "mqttQOS": "2",
    "mqttIdleTimeout": "30",
    "mqttUsername": "mqtt",
    "mqttPassword": "***",
    "mqttPubTopic": "sas/gy/server",
    "mqttCfgTopic": "smib/config",
    "mqttSubTopic": "sas/relay/",
    "mqttURI": "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883",
    "serverTopic": "sas/gy/server",
    "otaURL": "http://api.sas.backoffice.ltd/firmwares/"
  }
}
```

**Data Processing:**

- Extracts MQTT host from URI using regex pattern
- Extracts port from URI
- Converts communication mode to human-readable format
- Maps database fields to frontend display names
- Provides fallback "No Value Provided" for missing fields

**File**: `app/api/mqtt/config/route.ts`

### POST `/api/mqtt/config/request`

**Purpose**: Request live configuration from SMIB device via MQTT

**Request Body:**

```json
{
  "relayId": "e831cdfa8384",
  "component": "mqtt" // mqtt, ota, coms, net, app
}
```

**Response:**

```json
{
  "success": true,
  "message": "Config request sent for mqtt to relayId: e831cdfa8384",
  "relayId": "e831cdfa8384",
  "component": "mqtt",
  "timestamp": "2025-10-26T10:30:00.000Z"
}
```

**Note:** Actual configuration data arrives via SSE subscription endpoint.

**File**: `app/api/mqtt/config/request/route.ts`

### POST `/api/mqtt/config/publish`

**Purpose**: Publish configuration updates to SMIB device via MQTT

**Request Body:**

```json
{
  "relayId": "e831cdfa8384",
  "config": {
    "typ": "cfg",
    "comp": "mqtt",
    "mqttSecure": 0,
    "mqttQOS": 2,
    "mqttURI": "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883",
    "mqttSubTopic": "sas/relay/",
    "mqttPubTopic": "sas/gy/server",
    "mqttCfgTopic": "smib/config",
    "mqttIdleTimeS": 30
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Config update published for mqtt to relayId: e831cdfa8384",
  "relayId": "e831cdfa8384",
  "config": {
    /* sent config */
  },
  "timestamp": "2025-10-26T10:30:00.000Z"
}
```

**File**: `app/api/mqtt/config/publish/route.ts`

### GET `/api/mqtt/config/subscribe`

**Purpose**: Establish Server-Sent Events stream for live MQTT config updates

**Query Parameters:**

- `relayId` (string, required): Relay ID of the SMIB device

**Response:** Server-Sent Events stream

```
data: {"type":"connected","relayId":"e831cdfa8384","timestamp":"2025-10-26T10:30:00.000Z","message":"Connected to MQTT config stream"}

data: {"type":"config_update","relayId":"e831cdfa8384","component":"mqtt","data":{...},"timestamp":"2025-10-26T10:30:01.000Z"}

data: {"type":"heartbeat","relayId":"e831cdfa8384","timestamp":"2025-10-26T10:30:05.000Z"}
```

**Features:**

- Establishes SSE connection for real-time updates
- Subscribes to MQTT config responses for specific relayId
- Sends heartbeat every 5 seconds
- Handles client disconnection cleanup

**File**: `app/api/mqtt/config/subscribe/route.ts`

### POST `/api/mqtt/test`

**Purpose**: Test MQTT connectivity and message publishing/subscription

**Request Body:**

```json
{
  "action": "connect" | "publish" | "subscribe",
  "relayId": "e831cdfa8384",
  "message": "custom test message"
}
```

**Response:**

```json
{
  "success": true,
  "action": "publish",
  "relayId": "e831cdfa8384",
  "topic": "sas/relay/e831cdfa8384",
  "timestamp": "2025-10-26T10:30:00.000Z",
  "messages": [
    "Connected to MQTT broker",
    "Published to sas/relay/e831cdfa8384: ..."
  ]
}
```

**File**: `app/api/mqtt/test/route.ts`

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
  smibBoard: String,              // Alternative SMIB identifier
  assetStatus: String,            // Machine status (maps to status)

  // Financial Meters
  sasMeters: {
    drop: Number,                 // Money inserted
    coinIn: Number,               // Total bets placed
    coinOut: Number,              // Coin out
    jackpot: Number,              // Jackpot payouts
    gamesPlayed: Number,          // Games played
    gamesWon: Number,             // Games won
    totalCancelledCredits: Number // Credits paid out
  },

  // SMIB Configuration
  smibConfig: {
    coms: {
      comsMode: Number,           // 0 = SAS, 1 = non-SAS, 2 = IGT
      comsAddr: Number,           // Communication address
      comsRateMs: Number,         // Communication rate (ms)
      comsRTE: Number,            // Real-time events (0 = off, 1 = on)
      comsGPC: Number             // Game protocol configuration
    },
    net: {
      netMode: Number,            // 0 = WiFi, 1 = Ethernet
      netStaSSID: String,         // WiFi SSID
      netStaPwd: String,          // WiFi password
      netStaChan: Number          // WiFi channel
    },
    mqtt: {
      mqttSecure: Number,         // TLS encryption (0 = off, 1 = on)
      mqttQOS: Number,            // Quality of Service (0, 1, 2)
      mqttURI: String,            // MQTT broker URI with credentials
      mqttSubTopic: String,       // Subscribe topic prefix
      mqttPubTopic: String,       // Publish topic prefix
      mqttCfgTopic: String,       // Config topic
      mqttIdleTimeS: Number,      // Idle timeout in seconds
      mqttUsername: String,       // MQTT username (optional)
      mqttPassword: String        // MQTT password (optional)
    },
    ota: {
      otaURL: String              // Firmware update server URL
    }
  },

  // SMIB Version
  smibVersion: {
    firmware: String,             // Current firmware version
    hardware: String              // Hardware version
  },

  // Collection Data
  collectionMeters: {
    metersIn: Number,
    metersOut: Number
  },
  collectionMetersHistory: Array,
  collectionTime: Date,
  previousCollectionTime: Date,

  // Bill Validator
  billValidator: {
    balance: Number,
    notes: Array
  },

  // Timestamps
  lastActivity: Date,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Current Implementation Status

### ✅ **Fully Functional Features**

- **Data Transformation**: Database fields properly mapped to frontend expectations
- **API Endpoints**: All endpoints functional with correct data flow
- **Edit Operations**: Cabinet updates save correctly with field mapping
- **Delete Operations**: Soft delete functionality implemented and working
- **Activity Log**: Machine events endpoint functional with filtering
- **Collection History**: Collection meters history endpoint with pagination
- **Time Period Filtering**: Date-based filtering working with gaming day offset support
- **SMIB Configuration**: Live SMIB config via SSE and MQTT
- **Bill Validator**: V1/V2 data structure auto-detection
- **MQTT Integration**: Real-time configuration updates and machine control

### Machine Event Schema

**Collection:** `machineevents`

```typescript
{
  _id: ObjectId,
  machine: String,                 // Machine ID reference
  currentSession: String,          // Session ID reference
  eventType: String,               // General, Significant, Priority
  description: String,             // Event description
  command: String,                 // Command executed
  gameName: String,                // Game name
  date: Date,                      // Event timestamp
  sequence: [{                     // Optional sequence data
    description: String,
    logLevel: String,
    success: Boolean,
    createdAt: Date
  }]
}
```

### Accepted Bill Schema

**Collection:** `acceptedbills`

```typescript
{
  _id: String,                     // Unique bill record identifier

  // V2 fields (current structure)
  value: Number,                   // V2: Bill denomination value
  machine: String,                 // V2: Machine ID reference
  member: String,                  // V2: Member (typically "ANONYMOUS")
  createdAt: Date,                 // V2: Bill creation timestamp

  // V1 fields (legacy structure)
  location: String,                // V1: Location ID reference
  readAt: Date,                    // V1: Bill read timestamp
  movement: {                      // V1: Movement object with denominations
    dollar1: Number,
    dollar2: Number,
    dollar5: Number,
    dollar10: Number,
    dollar20: Number,
    dollar50: Number,
    dollar100: Number,
    dollar500: Number,
    dollar1000: Number,
    dollar2000: Number,
    dollar5000: Number,
    dollarTotal: Number,
    dollarTotalUnknown: Number
  },
  updatedAt: Date                  // Record update timestamp
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
  assetNumber: 'GM002',
  installedGame: 'New Game',
  status: 'maintenance',
};

const response = await fetch('/api/locations/loc123/cabinets/cabinet123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData),
});
```

### Fetch Activity Log

#### **Fetch Activity Log**

```typescript
const response = await fetch(
  '/api/machines/by-id/events?id=cabinet123&timePeriod=Today'
);
const events = await response.json();
```

#### **Fetch Bill Validator Data**

```typescript
// Get bill validator data for last 7 days
const response = await fetch('/api/bill-validator/machine123?timePeriod=7d');
const billData = await response.json();

// Get bill validator data for custom date range
const response = await fetch(
  '/api/bill-validator/machine123?timePeriod=Custom&startDate=2025-01-01&endDate=2025-01-31'
);
const customBillData = await response.json();
```

---

**Last Updated:** January 2025

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

## MQTT Integration

### MQTT Service

The Cabinets API integrates with the MQTT service for real-time SMIB communication:

- **Service File**: `app/api/lib/services/mqttService.ts`
- **Connection**: Singleton MQTT client instance
- **Topics**: Uses `sas/relay/[relayId]` for publishing, `smib/config` for responses
- **QoS**: Default QoS 0 for configuration messages

### SMIB Communication Flow

```
Frontend → API Endpoint → Database Update → MQTT Service → MQTT Broker → SMIB Device
    ↑                                                                           ↓
    │                                                              (publishes response)
    │                                                                           ↓
    └── SSE Stream ← API Subscribe ← MQTT Service ← MQTT Broker ← smib/config
```

### Machine Control Commands

**Supported Commands:**

- **RESTART**: Restart the SMIB device
- **LOCK MACHINE**: Lock the gaming machine
- **UNLOCK MACHINE**: Unlock the gaming machine

**Implementation:**

```typescript
// In POST /api/cabinets/[cabinetId]/smib-config
if (machineControl && relayId) {
  await mqttService.sendMachineControlCommand(relayId, machineControl);
}
```

## SMIB Operations API

### POST `/api/smib/restart`

**Purpose:** Restart a single SMIB device

**Request Body:**

```json
{
  "relayId": "78421c1bf944"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Restart command sent successfully",
  "relayId": "78421c1bf944"
}
```

**Features:**

- Sends `{ "typ": "rst" }` MQTT command
- Logs activity with user and device information
- Returns immediately (restart happens async)

### POST `/api/smib/meters`

**Purpose:** Request meter data from SMIB

**Request Body:**

```json
{
  "relayId": "78421c1bf944"
}
```

**MQTT Command:**

```json
{
  "typ": "cmd",
  "sta": "",
  "siz": 54,
  "pyd": "016F16000000000100040003002200240002000C0005000600E180"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Meter request sent successfully"
}
```

### POST `/api/smib/reset-meters`

**Purpose:** Reset meter data on non-SAS machines

**Request Body:**

```json
{
  "relayId": "78421c1bf944",
  "comsMode": "0"
}
```

**Validation:**

- Only works if `comsMode !== "1"` (not SAS mode)
- Returns error if SAS machine

**Response:**

```json
{
  "success": true,
  "message": "Reset meters command sent successfully"
}
```

### POST `/api/smib/ota-update`

**Purpose:** Initiate OTA firmware update

**Request Body:**

```json
{
  "relayId": "78421c1bf944",
  "firmwareId": "507f1f77bcf86cd799439011"
}
```

**Process:**

1. Download firmware from GridFS to `/public/firmwares/`
2. Configure OTA URL on SMIB: `http://192.168.0.211:3000/firmwares/`
3. Send update command with firmware filename
4. SMIB downloads firmware (appends `?&relayId=<SMIB-ID>`)
5. SMIB installs and reboots
6. File auto-deleted after 30 minutes

**Response:**

```json
{
  "success": true,
  "message": "OTA update initiated successfully",
  "firmwareFile": "wifi.bin",
  "estimatedTime": "Several minutes"
}
```

### POST `/api/locations/[locationId]/smib-restart`

**Purpose:** Restart all SMIBs at a location

**Request Body:**

```json
{
  "relayIds": ["78421c1bf944", "98f4ab0b1e30", "e831cdfa8384"]
}
```

**Features:**

- Accepts array of relay IDs from MQTT discovery
- Deduplicates relay IDs
- Batch processes in groups of 10
- Continues on individual failures

**Response:**

```json
{
  "success": true,
  "message": "Restart commands sent to 3 SMIBs",
  "successCount": 3,
  "failureCount": 0
}
```

### POST `/api/locations/[locationId]/smib-meters`

**Purpose:** Request meter data from all SMIBs at a specific location

**Response:**
```json
{
  "success": true,
  "message": "Meter requests sent to 5 machines",
  "results": {
    "total": 5,
    "successful": 5,
    "failed": 0,
    "errors": []
  }
}
```

**Features:**
- Finds all machines with SMIBs at the specified location.
- Processes meter requests in parallel batches of 10.
- Logs the activity, including the number of successful and failed requests.
- Returns a summary of the operation.

### POST `/api/locations/[locationId]/smib-ota`

**Purpose:** Push firmware update to all SMIBs at location

**Request Body:**

```json
{
  "relayIds": ["78421c1bf944", "98f4ab0b1e30"],
  "firmwareId": "507f1f77bcf86cd799439011"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OTA update initiated for 2 SMIBs",
  "successCount": 2,
  "failureCount": 0
}
```

## Firmware Management API

### POST `/api/firmwares`

**Purpose:** Upload firmware binary to MongoDB GridFS

**Request:** Multipart form data

- `product` (string): Product name
- `version` (string): Version number (e.g., "v1.0.1")
- `versionDetails` (string): Version description
- `file` (File): `.bin` firmware file

**Response:**

```json
{
  "success": true,
  "firmware": {
    "_id": "507f1f77bcf86cd799439011",
    "product": "SMIB WiFi",
    "version": "v1.0.1",
    "fileName": "wifi.bin",
    "fileSize": 1048576,
    "createdAt": "2025-10-27T10:00:00Z"
  }
}
```

### GET `/api/firmwares`

**Purpose:** List all firmware versions

**Response:**

```json
{
  "success": true,
  "firmwares": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "product": "SMIB WiFi",
      "version": "v1.0.1",
      "fileName": "wifi.bin",
      "fileSize": 1048576,
      "createdAt": "2025-10-27T10:00:00Z"
    }
  ]
}
```

### GET `/api/firmwares/[id]/serve`

**Purpose:** Download firmware from GridFS and serve temporarily

**Response:**

```json
{
  "success": true,
  "fileName": "wifi.bin",
  "staticUrl": "/firmwares/wifi.bin",
  "size": 1048576
}
```

**Features:**

- Downloads firmware from GridFS
- Saves to `/public/firmwares/` temporarily
- Returns static URL for serving
- Auto-cleanup after 30 minutes

### GET `/api/firmwares/[filename]`

**Purpose:** Serve firmware file to SMIB (called by SMIB device)

**Query Parameters:**

- `relayId` (string): SMIB relay ID (appended by SMIB)

**Example Request:**

```
GET /api/firmwares/wifi.bin?&relayId=78421c1bf944
```

**Response:** Binary firmware file with headers:

- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment; filename="wifi.bin"`
- `Content-Length: 1048576`

## Related Documentation

- [MQTT Architecture](./mqtt-architecture.md) - MQTT system architecture and design
- [MQTT Implementation](./mqtt-implementation.md) - Detailed MQTT implementation guide
- [MQTT Protocols](./mqtt-protocols.md) - Protocol specifications and message formats
- [Bill Validator System](./bill-validator-calculation-system.md) - Bill validator data processing
- [Gaming Day Offset System](./gaming-day-offset-system.md) - Time period filtering
- [Frontend MQTT Integration](../frontend/mqtt-integration.md) - Frontend SSE and MQTT usage
- [SMIB Testing Guide](../../SMIB_TESTING_GUIDE.md) - Testing guide for SMIB features

## Conclusion

The Cabinets API is fully functional with comprehensive cabinet management, SMIB configuration, MQTT integration, and real-time updates. The implementation includes proper data transformation, comprehensive error handling, security measures, and performance optimizations. The system is production-ready and provides a robust foundation for cabinet management operations with live SMIB communication capabilities.
