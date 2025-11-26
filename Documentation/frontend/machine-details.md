# Cabinet Details Page Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 22, 2025  
**Version:** 2.2.0

## Quick Search Guide

Use **Ctrl+F** to find these key topics:

- **bill validator** - How bill validator system works and tracks denominations
- **collection settings** - How collection settings are configured and updated
- **collection history** - How collection history is tracked and displayed
- **issue detection** - How collection history issues are detected and displayed
- **smib configuration** - How SMIB communication and network settings work
- **machine metrics** - How financial metrics are calculated and displayed
- **activity log** - How machine events and commands are tracked
- **denomination tracking** - How bill denominations are tracked and managed
- **database fields** - All model fields and their purposes
- **data integrity** - How data consistency is validated and monitored

## Overview

The Cabinet Details page provides comprehensive management of individual slot machines, including real-time monitoring, financial tracking, collection management, and system configuration. Each cabinet is a complete gaming terminal with bill validation, collection capabilities, and communication systems.

## Bill Validator System

### How Bill Validator Works

The bill validator system now uses the `acceptedBills` collection instead of the `billValidator` field on the `machines` collection. It automatically detects and processes two different data structures (V1 and V2) to provide a unified interface.

### Bill Validator API Endpoint

**Endpoint**: `GET /api/bill-validator/[machineId]`

**Query Parameters**:

- `timePeriod` - Filter by time period (Today, Yesterday, 7d, 30d, All Time, Custom)
- `startDate` - Start date for custom range (ISO format)
- `endDate` - End date for custom range (ISO format)

**Response Structure**:

```typescript
{
  success: true,
  data: {
    version: "v1" | "v2" | "none",
    denominations: Array<{
      denomination: number,
      label: string,
      quantity: number,
      subtotal: number
    }>,
    totalAmount: number,
    totalQuantity: number,
    unknownBills: number,
    currentBalance: number
  }
}
```

### Data Structure Detection

**V1 Data Structure** (Legacy):

- Uses `movement` object with denomination fields
- Filtered by `readAt` timestamp
- Example: `movement.dollar1`, `movement.dollar5`, `movement.dollarTotal`

**V2 Data Structure** (Current):

- Uses `value` field with individual bill records
- Filtered by `createdAt` timestamp
- Example: `{ value: 5, machine: "machineId", member: "ANONYMOUS" }`

### Accepted Bills Collection Schema

```typescript
AcceptedBill {
  _id: string;                    // Unique bill record identifier
  value: number;                  // V2: Bill denomination value
  machine: string;                // V2: Machine ID reference
  member: string;                 // V2: Member (typically "ANONYMOUS")
  location: string;               // V1: Location ID reference
  readAt: Date;                   // V1: Bill read timestamp
  movement: {                     // V1: Movement object with denominations
    dollar1: number,
    dollar2: number,
    dollar5: number,
    dollar10: number,
    dollar20: number,
    dollar50: number,
    dollar100: number,
    dollar500: number,
    dollar1000: number,
    dollar2000: number,
    dollar5000: number,
    dollarTotal: number,
    dollarTotalUnknown: number
  },
  createdAt: Date,                // V2: Bill creation timestamp
  updatedAt: Date                 // Record update timestamp
}
```

### Bill Processing Logic

**V1 Processing**:

1. Query bills with `movement` object and filter by `readAt`
2. Aggregate `movement` values across all bills
3. Calculate total quantity and amount from movement object
4. Identify unknown bills from `dollarTotalUnknown`

**V2 Processing**:

1. Query bills with `value` field and filter by `createdAt`
2. Group bills by `value` (denomination)
3. Count quantities for each denomination
4. Calculate subtotals (denomination × quantity)

### Bill Tracking Process

1. **Bill Insertion**: Player inserts bill into machine
2. **Validation**: Bill validator checks authenticity and denomination
3. **Database Record**: Bill acceptance recorded in `acceptedBills` collection
4. **Data Processing**: API processes V1/V2 data structures automatically
5. **UI Display**: Unified interface shows denomination breakdown
6. **Balance Update**: Current balance retrieved from machine object

### Current Balance Source

The current balance is retrieved from `machine.billValidator.balance` and displayed separately from the historical bill data, as it represents the current state rather than historical transactions.

### Denomination Analysis Features

- **Acceptance Rates**: Track success/failure rates for each denomination
- **Popular Denominations**: Identify which bills players prefer
- **Revenue Distribution**: See how money flows through different denominations
- **Validator Performance**: Monitor bill validator accuracy and reliability
- **Time-based Analysis**: Filter by date ranges to analyze trends
- **Data Structure Compatibility**: Automatic detection and processing of V1/V2 formats

## Collection System

### Collection History Issue Detection

The Collection History tab includes an automated issue detection system that validates data integrity between the machine's collection history and the collections database.

#### Issue Types Detected

**1. History Mismatch**
- **What it means**: The collection history entry on the machine doesn't match the actual collection document data
- **Common causes**: 
  - Meter readings were updated after collection was created
  - Manual database edits caused desynchronization
  - Data corruption during collection process
- **Visual indicator**: Red row/card with "History Mismatch" warning

**2. Orphaned History**
- **What it means**: A history entry exists on the machine but the corresponding collection document is missing or deleted
- **Common causes**:
  - Collection was soft-deleted or hard-deleted from database
  - Collection report was deleted without cleaning up machine history
  - Data migration or cleanup scripts removed collections
- **Visual indicator**: Red row/card with "Orphaned History" warning

**3. Missing History**
- **What it means**: A collection document exists in the database but there's no matching entry in the machine's collectionMetersHistory array
- **Common causes**:
  - History entry failed to save during collection creation
  - Machine document update failed partially
  - Collection was created via script without updating machine
- **Visual indicator**: Red row/card with "Missing History" warning

#### Detection Process

```typescript
// For each collection report linked to this machine:
1. Find the corresponding history entry in machine.collectionMetersHistory
2. Find the corresponding collection document in collections collection
3. Compare the data integrity:
   - If history exists but collection is missing → "Orphaned History"
   - If collection exists but history is missing → "Missing History"
   - If both exist but data doesn't match → "History Mismatch"
4. Store issue descriptions in state for display
```

#### Visual Presentation

**Desktop View:**
- Status column added to collection history table
- Red background (`bg-red-50/50 hover:bg-red-100/50`) for rows with issues
- AlertCircle icon with tooltip showing detailed issue description
- Maintains table structure and readability

**Mobile View:**
- Red border (`border-red-500`) and background (`bg-red-50/50`) for cards with issues
- AlertCircle icon prominently displayed
- Warning box below collection details with full issue description
- Maintains card layout and touch targets

#### API Integration

**Endpoint**: `GET /api/machines/by-id/collection-history?machineId=[id]`

**Response includes**:
```typescript
{
  history: CollectionHistoryEntry[],
  issues: {
    [locationReportId: string]: string  // Issue description
  }
}
```

**Frontend Hook**: `lib/hooks/data/useCollectionHistory.ts`

**Components**:
- `components/cabinetDetails/AccountingDetails.tsx` - Tab container and issue detection
- `components/cabinetDetails/CollectionHistoryTable.tsx` - Display with visual indicators

#### Differences from Collection Report Details

While both the Cabinet Details Collection History and Collection Report Details pages detect issues, they serve different purposes:

| Feature | Cabinet Details (Machine History) | Collection Report Details |
|---------|-----------------------------------|---------------------------|
| **Scope** | All collection history for ONE machine | All collections in ONE report |
| **Issue Types** | History/Collection sync issues | SAS times, movement calculations, prev meters |
| **Auto-Fix** | No - display only | Yes - "Fix Report" button available |
| **Visual Style** | Red rows/cards with icons | Issue badges and warning cards |
| **Purpose** | Machine-level data integrity | Report-level financial accuracy |
| **User Action** | Investigate and manually fix if needed | Can use automated fix tools |

### Collection Settings Management

Collection Settings allow casino staff to configure and track the collection state of individual slot machines.

### Collection Settings Model Fields

```typescript
CollectionSettings {
  // Current collection state
  collectionMeters: {
    metersIn: number;             // Money in machine when last collection started
    metersOut: number;            // Money in machine when last collection finished
  },

  // Collection timing
  collectionTime: Date;           // Timestamp of last collection

  // Denomination configuration
  collectorDenomination: number;  // Denomination used for collection calculations (e.g., 1.00, 0.25)

  // Historical collection data
  collectionMetersHistory: Array<{
    _id: string;                  // Unique history entry ID
    metersIn: number;             // Meters in reading at collection
    metersOut: number;            // Meters out reading at collection
    prevMetersIn: number;         // Previous collection meters in
    prevMetersOut: number;        // Previous collection meters out
    timestamp: Date;              // Collection timestamp
    locationReportId: string;     // Links to collection report
  }>
}
```

### Collection Settings Workflow

1. **Staff Collection**: Physical collection of money from machine
2. **Meter Reading**: Record current `metersIn` and `metersOut` values
3. **Settings Update**: Update `collectionMeters` with new readings
4. **Time Recording**: Set `collectionTime` to current timestamp
5. **History Entry**: Add entry to `collectionMetersHistory` array
6. **Denomination Check**: Verify `collectorDenomination` is correct

### Collection History Tracking

### Collection History Model Fields

```typescript
CollectionHistory {
  _id: string;                    // Unique collection identifier
  machineId: string;              // Reference to machine document
  location: string;               // Location where collection occurred
  collector: string;              // Staff member who performed collection
  timestamp: Date;                // When collection was performed

  // Financial Data
  metersIn: number;               // Money in machine when collection started
  metersOut: number;              // Money in machine when collection finished
  gross: number;                  // Money collected (metersIn - metersOut)

  // SAS Meters (Slot Accounting System)
  sasMeters: {
    drop: number;                 // Total money players put in
    totalCancelledCredits: number; // Credits cancelled by players
    gross: number;                // Net revenue (drop - cancelled credits)
    gamesPlayed: number;          // Total games played during period
    jackpot: number;              // Current jackpot amount
    sasStartTime: string;         // SAS period start time
    sasEndTime: string;           // SAS period end time

## Table of Contents
- [Overview](#overview)
- [Page Structure](#page-structure)
- [Technical Architecture](#technical-architecture)
- [Collection History](#collection-history)
- [Denominations Management](#denominations-management)
- [SMIB Configuration](#smib-configuration)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Security Features](#security-features)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Overview

The Cabinet Details page provides comprehensive information about individual slot machines/cabinets, including real-time status, financial metrics, and configuration settings. This page serves as the detailed view for managing specific gaming cabinets.

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** October 6th, 2025
**Version:** 2.0.0

### File Information
- **File:** `app/cabinets/[slug]/page.tsx`
- **URL Pattern:** `/cabinets/[slug]`
- **Component Type:** Cabinet Detail Page
- **Authentication:** Required

## Overview

The Cabinet Details page (`app/cabinets/[slug]/page.tsx`) provides comprehensive information about individual slot machines/cabinets, including real-time status, financial metrics, and configuration settings.

## Page Structure

### **Header Section**
- **Cabinet Name**: Displays serial number, original serial number, or machine ID
- **Edit Button**: Allows modification of cabinet details
- **Status Indicators**: Online/offline status, location information
- **Refresh Button**: Updates all data in real-time

### **SMIB Configuration Section**
- **Expandable Panel**: Click to reveal detailed configuration
- **Connection Status**: Shows SMIB online/offline status (only after "Get SMIB Configuration" is clicked)
- **SMIB ID Display**: Shows relay ID or smibBoard identifier with copy functionality
- **Communication Mode**: SAS, non-SAS, or IGT protocols
- **Firmware Version**: Current SMIB firmware running
- **Network/WiFi Configuration**: 
  - Network Name (SSID)
  - Password
  - Channel (1-11)
  - Last configured timestamp
  - Edit mode for updating settings
- **COMS Configuration**:
  - Communication Address
  - Polling Rate (ms)
  - RTE (Real-time Events) - Enabled/Disabled
  - GPC (Game Protocol Configuration)
  - Last configured timestamp
  - Edit mode for updating settings
- **MQTT Configuration**:
  - MQTT Public Topic
  - MQTT Config Topic
  - MQTT URI (broker address with credentials)
  - QOS Level (0, 1, or 2)
  - Idle Timeout (seconds)
  - Last configured timestamp
  - Edit mode for updating settings
- **SMIB Operations & Management**:
  - **Restart Section**: Restart SMIB device with countdown and auto-refresh
  - **Meter Data Section**: Request meter data and reset meters (non-SAS only)
  - **OTA Update Section**: Initiate firmware updates with version selection
- **Real-time Updates**: Live configuration updates via SSE/MQTT when SMIB is online
- **Offline Support**: Saves configurations to database when SMIB is offline

### **Metrics Tabs**
- **Range Metrics**: Time-based financial performance
- **Live Metrics**: Real-time machine status
- **Bill Validator**: Denomination tracking and bill acceptance
- **Activity Log**: Machine events and commands
- **Collection History**: Financial collection records
- **Collection Settings**: Configure collection parameters and track collection state

## Collection History - How It Works

### **What is Collection History?**
Collection history tracks all money collected from the machine over time, providing a complete audit trail of financial transactions.

### **Collection Process Flow**
```

1. Player Gaming Session → 2. Session Ends → 3. Staff Collection → 4. Collection Recorded → 5. Report Generated

````

### **Collection Data Structure**
```typescript
Collection {
  _id: "collection_001",
  machineId: "slot_machine_456",
  location: "casino_main_floor",
  collector: "staff_member_123",
  timestamp: "2024-12-20 17:00:00",

  // Financial Data
  metersIn: 800,        // Money in machine when collection started
  metersOut: 600,       // Money in machine when collection finished
  gross: 200,           // Money collected (800 - 600)

  // SAS Meters (Slot Accounting System)
  sasMeters: {
    drop: 800,          // Total money players put in
    gamesPlayed: 25,    // Total games played
    jackpot: 100        // Current jackpot amount
  },

  // Movement Data
  movement: {

    metersIn: number;             // Money movement tracking
    metersOut: number;            // Money movement tracking
    gross: number;                // Net movement
  },

  // Collection Details
  collectionTime: Date;           // When collection was performed
  notes: string;                  // Collection notes
  ramClear: boolean;              // Whether ram clear was performed
  ramClearMetersIn: number;       // Ram clear meters in
  ramClearMetersOut: number;      // Ram clear meters out

  // Status
  isCompleted: boolean;           // Whether collection is finalized
  softMetersIn: number;           // Soft meter reading (before denomination)
  softMetersOut: number;          // Soft meter reading (before denomination)

  // Audit Fields
  createdAt: Date;
  updatedAt: Date;
}
````

### Collection Process Flow

1. **Pre-Collection**: Staff checks last collection settings and meter readings
2. **Physical Collection**: Staff removes money from machine
3. **Meter Recording**: Record new meter readings
4. **Calculation**: Calculate gross amount collected
5. **Database Update**: Update collection settings and history
6. **Report Integration**: Link to collection report if part of larger collection

## SMIB Configuration

### What is SMIB?

SMIB (Slot Machine Interface Board) is the communication interface between the slot machine and the casino management system. It handles all data communication, machine control, network connectivity, and real-time updates through MQTT protocol.

### SMIB Configuration on Cabinet Details Page

The SMIB Configuration section on the cabinet details page provides comprehensive management of SMIB device settings. It includes:

**Components Used**:
- `useSmibConfiguration()` hook - Manages SSE connection and configuration state
- `RestartSection` - SMIB restart operations
- `MeterDataSection` - Meter data requests and resets
- `OTAUpdateSection` - Firmware update management

**Key Features**:
- **Manual Connection**: User must click "Get SMIB Configuration" button to establish SSE connection
- **Permission-Based Access**: Only Developer, Admin, and Technician roles can access SMIB configuration
- **Section-Based Editing**: Edit Network, COMS, or MQTT sections independently
- **Live Updates**: Real-time configuration updates when SMIB is online
- **Database Fallback**: Configurations saved to database when SMIB is offline
- **Automatic Refresh**: Data refreshes after operations (restart, OTA update) It handles all data communication, machine control, network connectivity, and real-time updates through MQTT protocol.

### SMIB Configuration on Cabinet Details Page

The SMIB Configuration section on the cabinet details page provides comprehensive management of SMIB device settings. It includes:

**Components Used**:
- `useSmibConfiguration()` hook - Manages SSE connection and configuration state
- `RestartSection` - SMIB restart operations
- `MeterDataSection` - Meter data requests and resets
- `OTAUpdateSection` - Firmware update management

**Key Features**:
- **Manual Connection**: User must click "Get SMIB Configuration" button to establish SSE connection
- **Permission-Based Access**: Only Developer, Admin, and Technician roles can access SMIB configuration
- **Section-Based Editing**: Edit Network, COMS, or MQTT sections independently
- **Live Updates**: Real-time configuration updates when SMIB is online
- **Database Fallback**: Configurations saved to database when SMIB is offline
- **Automatic Refresh**: Data refreshes after operations (restart, OTA update)

### SMIB Configuration Management

The system uses **Server-Sent Events (SSE)** for real-time SMIB configuration updates:

1. **SSE Connection**: Establishes live connection to MQTT stream
2. **Configuration Requests**: Requests current config from SMIB device
3. **Live Updates**: Receives real-time configuration responses
4. **Form Synchronization**: Updates UI with live SMIB data

**Implementation:**

- **Frontend Hook**: `lib/hooks/data/useSmibConfiguration.ts`
- **SSE Endpoint**: `GET /api/mqtt/config/subscribe?relayId=[relayId]`
- **Request Endpoint**: `POST /api/mqtt/config/request`
- **Publish Endpoint**: `POST /api/mqtt/config/publish`
- **Config Endpoint**: `GET /api/mqtt/config?cabinetId=[cabinetId]`

**See Also:** [MQTT Integration Documentation](./mqtt-integration.md) for complete MQTT/SSE implementation details.

### SMIB Configuration Model Fields

```typescript
SMIBConfig {
  // Communication Settings
  coms: {
    comsMode: number;             // 0 = SAS, 1 = non-SAS, 2 = IGT protocol
    comsAddr: number;             // Communication address
    comsRateMs: number;           // Communication rate in milliseconds
    comsRTE: number;              // Real-time events enabled (1 = yes, 0 = no)
    comsGPC: number;              // Game protocol configuration
  },

  // Network Configuration
  net: {
    netMode: number;              // 0 = WiFi client mode, 1 = Ethernet
    netStaSSID: string;           // WiFi network name
    netStaPwd: string;            // WiFi password
    netStaChan: number;           // WiFi channel number
  },

  // MQTT Configuration
  mqtt: {
    mqttSecure: number;           // TLS encryption (0 = off, 1 = on)
    mqttQOS: number;              // Quality of service level (0, 1, or 2)
    mqttURI: string;              // MQTT broker URI with credentials
    mqttSubTopic: string;         // Topic for receiving commands
    mqttPubTopic: string;         // Topic for publishing events
    mqttCfgTopic: string;         // Topic for configuration updates
    mqttIdleTimeS: number;        // Idle timeout in seconds
    mqttUsername?: string;        // MQTT username (optional)
    mqttPassword?: string;        // MQTT password (optional)
  },

  // OTA (Over-The-Air) Configuration
  ota?: {
    otaURL: string;               // Firmware update server URL
  },

  // App Configuration
  app?: {
    // Application-specific settings
    [key: string]: unknown;
  }
}
```

### SMIB Configuration State Management

```typescript
// Connection State
isConnectedToMqtt: boolean; // SSE connection active
hasReceivedRealSmibData: boolean; // Received actual SMIB data
isLoadingMqttConfig: boolean; // Loading database config
hasConfigBeenFetched: boolean; // Initial fetch complete

// Form State
formData: {
  // Network fields
  networkSSID: string;
  networkPassword: string;
  networkChannel: string;

  // MQTT fields
  mqttHost: string;
  mqttPort: string;
  mqttTLS: string;
  mqttQOS: string;
  mqttIdleTimeout: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
  mqttURI: string;

  // COMS fields
  comsMode: string;
  comsAddr: string;
  comsRateMs: string;
  comsRTE: string;
  comsGPC: string;
}
```

### SMIB Configuration Workflow

1. **Page Load**: Cabinet details page loads with cabinet data
2. **SSE Connection**: Establishes EventSource connection to `/api/mqtt/config/subscribe`
3. **Database Fetch**: Fetches stored configuration from `/api/mqtt/config`
4. **Live Request**: Requests live config from SMIB via `/api/mqtt/config/request`
5. **SMIB Response**: SMIB device responds via MQTT → SSE stream
6. **Form Update**: Updates form with live SMIB data
7. **User Edit**: User modifies configuration fields
8. **Save**: Publishes updates via `/api/cabinets/[cabinetId]/smib-config`
9. **MQTT Publish**: Backend publishes to SMIB via MQTT
10. **Confirmation**: SMIB applies config and may send confirmation

### SMIB Communication Modes

**SAS Mode (comsMode: 0)**:

- Standard SAS (Slot Accounting System) protocol
- Real-time meter reporting
- Standard casino communication protocol

**Non-SAS Mode (comsMode: 1)**:

- Custom communication protocol
- Limited meter reporting
- Alternative communication method

**IGT Mode (comsMode: 2)**:

- IGT (International Game Technology) protocol
- Enhanced communication features
- IGT-specific machine integration

### Network Configuration

**WiFi Client Mode (netMode: 1)**:

- Connects to casino WiFi network
- Requires SSID and password configuration
- Wireless communication with management system

**Ethernet Mode (netMode: 0)**:

- Wired network connection
- Direct Ethernet connection
- More reliable than WiFi

### MQTT Configuration

**Message Queuing Telemetry Transport (MQTT)**:

- Lightweight messaging protocol
- Used for real-time data transmission
- Configurable quality of service levels
- Secure communication with TLS encryption

## Machine Metrics and Financial Calculations

### Range Metrics Tab

**Purpose**: Shows financial performance over selected time periods

**Data Sources**:

- `meters` collection for historical data
- `sasMeters` for SAS-enabled machines
- Aggregated financial calculations

**Calculations**:

- **Money In**: Total drop from players during period
- **Total Cancelled Credits**: Credits cancelled by players during period
- **Gross**: Money In - Total Cancelled Credits
- **Jackpot**: Current jackpot amount

**Time Filters**: Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range

### Live Metrics Tab

**Purpose**: Real-time machine status and current session data

**Data Sources**:

- Current machine state from `sasMeters`
- Real-time `meterData` updates
- Live session information

**Metrics Displayed**:

- **Coin In/Out**: Current session coin activity
- **Total Hand Paid Cancelled Credits**: Manual credit cancellations
- **Current Credits**: Player's current balance
- **Games Played/Won**: Current session statistics

**Update Frequency**: Live updates via WebSocket or polling

### Financial Variance Calculation

**Formula**:

```
Variance = Meters Gross - SAS Gross
```

**Variance Types**:

- **Positive Variance**: Meters exceed SAS (machine performing better than expected)
- **Negative Variance**: SAS exceeds meters (machine performing worse than expected)
- **Zero Variance**: Perfect match between meters and SAS
- **No SAS Data**: SAS information unavailable (normal for non-SAS machines)

## Activity Log and Event Tracking

### Machine Events Model Fields

```typescript
MachineEvent {
  sequence: Array<{
    message: {
      typ: string;                // Event type (BILL_ACCEPTED, GAME_PLAYED, etc.)
      rly: string;                // Relay identifier
      mac: string;                // Machine MAC address
      tkn: string;                // Security token
      pyd: string;                // Event payload data
    },
    description: string;          // Human-readable event description
    logLevel: string;             // INFO, WARN, ERROR
    success: boolean;             // Operation success status
    createdAt: Date;              // Event timestamp
  }>
}
```

### Common Event Categories

**Bill Validation Events**:

- `BILL_ACCEPTED` - Bill successfully validated and accepted
- `BILL_REJECTED` - Bill rejected by validator
- `BILL_STACKER_FULL` - Bill storage compartment full

**Game Events**:

- `GAME_PLAYED` - Player started a game
- `GAME_WON` - Player won a game
- `GAME_LOST` - Player lost a game
- `JACKPOT_HIT` - Jackpot was won

**Machine Commands**:

- `MACHINE_LOCKED` - Machine locked by staff
- `MACHINE_UNLOCKED` - Machine unlocked by staff
- `MACHINE_RESTART` - Machine restart command
- `CONFIG_UPDATE` - Configuration change applied

**Communication Events**:

- `NETWORK_CONNECTED` - Network connection established
- `NETWORK_DISCONNECTED` - Network connection lost
- `MQTT_MESSAGE_SENT` - Message sent via MQTT
- `MQTT_MESSAGE_RECEIVED` - Message received via MQTT

**Error Events**:

- `HARDWARE_ERROR` - Hardware malfunction detected
- `COMMUNICATION_ERROR` - Communication failure
- `VALIDATOR_ERROR` - Bill validator malfunction
- `SYSTEM_ERROR` - General system error

## Real-Time Monitoring

### Online/Offline Status

**Online Criteria**: Machine has communicated within last 3 minutes
**Offline Criteria**: No communication for more than 3 minutes
**Status Updates**: Real-time communication monitoring

### Live Status Indicators

**Current Credits**: Player's current credit balance
**Games Played**: Total games in current session
**Last Activity**: Timestamp of last machine action
**Bill Validator Status**: Current bill acceptance state

### Alert System

**Low Balance**: Machine running low on credits
**Bill Validator Full**: Bill storage needs emptying
**Communication Issues**: Network or protocol problems
**Hardware Errors**: Mechanical or electronic failures

## Configuration Management

### Remote Configuration Updates

**Communication Mode**: Switch between SAS/non-SAS/IGT
**Firmware Updates**: Remote SMIB firmware upgrades
**Network Settings**: WiFi configuration changes
**MQTT Settings**: Broker and topic configuration

### Machine Control Commands

**Restart**: Reboot the SMIB system
**Lock Machine**: Prevent player access
**Unlock Machine**: Restore player access
**Reset Meters**: Clear current session data

### Batch Operations

**Apply to All**: Apply configuration to all machines at location
**Location-wide Updates**: Synchronize settings across multiple machines
**Rollback Capability**: Revert to previous configuration if needed

## Database Collections and Relationships

### Primary Collections

**machines** - Machine configuration and collection settings
**machineEvents** - Event logs and activity tracking
**collections** - Collection history records
**machineSessions** - Player gaming sessions

### Key Relationships

```
Machine (1) ←→ (Many) MachineEvent
Machine (1) ←→ (Many) Collection
Machine (1) ←→ (Many) MachineSession
Machine (Many) ←→ (1) Location
```

### Data Flow

1. **Machine Events**: Real-time events stored in `machineEvents` collection
2. **Collection Data**: Collection history stored in machine's `collectionMetersHistory`
3. **Session Tracking**: Player sessions tracked in `machineSessions`
4. **Configuration Updates**: SMIB settings updated in machine document

## API Endpoints

### Machine Data

- `GET /api/machines/[id]` - Get specific machine data
- `PATCH /api/machines/[id]` - Update machine configuration
- `GET /api/machines/by-id/events` - Get machine event logs
- `GET /api/machines/by-id/collection-history` - Get collection meters history

### Bill Validator

- `GET /api/bill-validator/[machineId]` - Get bill validator data with V1/V2 auto-detection
  - **Query Parameters**: `timePeriod`, `startDate`, `endDate`
  - **Response**: Unified bill validator data with denomination breakdown
  - **Data Source**: `acceptedBills` collection with automatic V1/V2 processing

### Collection Management

- `GET /api/collections` - List machine collections
- `POST /api/collections` - Create new collection record
- `PATCH /api/collections/[id]` - Update collection record

### SMIB Configuration

- `POST /api/cabinets/[cabinetId]/smib-config` - Update SMIB settings and send via MQTT
- `GET /api/cabinets/[cabinetId]/smib-config` - Get current SMIB configuration
- `GET /api/mqtt/config?cabinetId=[cabinetId]` - Get formatted MQTT config values

### MQTT Live Configuration (SSE)

- `GET /api/mqtt/config/subscribe?relayId=[relayId]` - SSE stream for live MQTT updates
- `POST /api/mqtt/config/request` - Request live config from SMIB device
- `POST /api/mqtt/config/publish` - Publish config updates to SMIB device
- `POST /api/mqtt/test` - Test MQTT connectivity and messaging

**See Also:** [MQTT Integration Documentation](./mqtt-integration.md) for complete API and implementation details.

## Security and Compliance

### Access Control

### **Collection History Display**

- **Date/Time**: When collection occurred
- **Collector**: Staff member who performed collection
- **Amount Collected**: Gross amount taken from machine
- **Machine Status**: Meters before and after collection
- **Variance**: Any discrepancies in expected vs actual amounts
- **Status Indicators**: Visual warnings for collections with data integrity issues

## Collection Settings - How It Works

### **What are Collection Settings?**

Collection Settings allow casino staff to configure and track the collection state of individual slot machines. This includes setting the last collection time, meter readings, and denomination settings used during collections.

### **Collection Settings Data Structure**

```typescript
CollectionSettings {
  // Current collection state
  collectionMeters: {
    metersIn: 1200,      // Money in machine when last collection started
    metersOut: 800,      // Money in machine when last collection finished
  },

  // Collection timing
  collectionTime: "2024-12-20T14:30:00Z",  // Last collection timestamp

  // Denomination configuration
  collectorDenomination: 1.00,  // Denomination used for collection calculations

  // Historical collection data
  collectionMetersHistory: [
    {
      _id: "hist_001",
      metersIn: 1000,
      metersOut: 600,
      prevMetersIn: 800,    // Previous collection meters in
      prevMetersOut: 400,   // Previous collection meters out
      timestamp: "2024-12-20T14:30:00Z",
      locationReportId: "report_123"
    }
  ]
}
```

### **Collection Settings Workflow**

```
1. Staff Collection → 2. Update Settings → 3. Record Meters → 4. Set Collection Time → 5. Save Configuration
```

### **Collection Settings Fields**

#### **Last Meters In/Out**

- **Purpose**: Track the exact meter readings when collections occur
- **Usage**: Staff records these values during physical collection
- **Data Source**: Stored in `machine.collectionMeters.metersIn/Out`
- **Update Method**: Manual entry via Collection Settings form

#### **Last Collection Time**

- **Purpose**: Record when the last collection was performed
- **Format**: ISO 8601 timestamp with date and hour
- **Usage**: Audit trail and collection scheduling
- **Data Source**: Stored in `machine.collectionTime`
- **Update Method**: Date picker + hour selector in form

#### **Collector Denomination**

- **Purpose**: Set the denomination used for collection calculations
- **Usage**: Ensures consistent financial calculations across collections
- **Data Source**: Stored in `machine.collectorDenomination`
- **Update Method**: Number input in form (e.g., 1.00, 0.25, 5.00)

### **Collection Settings API Flow**

```
Frontend Form → PATCH /api/cabinets/[cabinetId] → Redirect to Location Endpoint → Update Database
```

#### **API Request Structure**

```typescript
PATCH /api/cabinets/[cabinetId]
{
  "collectionMeters": {
    "metersIn": 1200,
    "metersOut": 800
  },
  "collectionTime": "2024-12-20T14:30:00.000Z",
  "collectorDenomination": 1.00
}
```

#### **Database Update Process**

```typescript
// MongoDB update operation
await Machine.findByIdAndUpdate(
  cabinetId,
  {
    collectionMeters: {
      metersIn: 1200,
      metersOut: 800,
    },
    collectionTime: new Date('2024-12-20T14:30:00.000Z'),
    collectorDenomination: 1.0,
    updatedAt: new Date(),
  },
  { new: true, runValidators: true }
);
```

### **Collection Settings vs Collection History**

| Feature     | Collection Settings         | Collection History                  |
| ----------- | --------------------------- | ----------------------------------- |
| **Purpose** | Current state configuration | Historical audit trail              |
| **Data**    | Last collection values      | All past collections                |
| **Update**  | Manual form entry           | Automatic during collections        |
| **Storage** | `machine.collectionMeters`  | `machine.collectionMetersHistory[]` |
| **Usage**   | Setup for next collection   | Financial reporting & analysis      |

### **Collection Settings Form Behavior**

#### **View Mode**

- Displays current collection settings in read-only format
- Shows last collection time, meter readings, and denomination
- "Edit" button to enable modification

#### **Edit Mode**

- All fields become editable
- Date picker for collection date
- Hour dropdown (00:00 to 23:00)
- Number inputs for meters and denomination
- "Save" button to commit changes

#### **Validation Rules**

- Collection date is required
- Meter values must be non-negative numbers
- Denomination must be positive number
- Form shows error messages for invalid inputs

### **Integration with Collection Process**

#### **Before Collection**

1. Staff checks Collection Settings for last collection time
2. Verifies current meter readings match expected values
3. Uses collector denomination for calculations

#### **During Collection**

1. Staff records new meter readings
2. Calculates gross amount collected
3. Updates Collection Settings with new values

#### **After Collection**

1. Collection History entry is automatically created
2. Collection Settings are updated with new meter readings
3. Collection time is set to current timestamp

### **Data Sources and Flow**

#### **Where Collection Settings Come From**

```typescript
// Database Schema (machines.ts)
collectionMeters: {
  metersIn: Number,
  metersOut: Number
},
collectionTime: Date,
collectorDenomination: Number,
collectionMetersHistory: [{
  _id: String,
  metersIn: Number,
  metersOut: Number,
  prevMetersIn: Number,
  prevMetersOut: Number,
  timestamp: Date,
  locationReportId: String
}]
```

#### **Frontend Data Flow**

```
1. Cabinet Details Page loads
2. API fetches machine data from /api/machines/[id]
3. Collection Settings component receives cabinet prop
4. useEffect initializes form fields from cabinet data
5. User edits and saves settings
6. PATCH request updates database
7. Form returns to view mode with updated data
```

#### **Backend Data Flow**

```
1. PATCH /api/cabinets/[cabinetId] receives request
2. Redirects to /api/locations/[locationId]/cabinets/[cabinetId]
3. Location endpoint validates and updates machine document
4. Returns updated machine data
5. Frontend refreshes with new values
```

### **Collection Settings Use Cases**

#### **Daily Operations**

- **Morning Setup**: Staff checks last collection time and meter readings
- **Collection Planning**: Use settings to plan collection routes and timing
- **Variance Investigation**: Compare expected vs actual meter readings

#### **Financial Management**

- **Audit Trail**: Complete record of when collections occurred
- **Denomination Tracking**: Ensure consistent calculation methods
- **Meter Reconciliation**: Verify machine meter accuracy

#### **Reporting and Analytics**

- **Collection Frequency**: Analyze how often machines are collected
- **Meter Trends**: Track meter reading patterns over time
- **Staff Performance**: Monitor collection efficiency and accuracy

## Denominations and Bill Validator

### **Bill Validator System**

The bill validator accepts various denominations and tracks them separately for financial accuracy.

### **Bill Validator Data Structure (V2)**

```typescript
// Primary data source - billMeters structure
BillMeters {
  dollar1: 0,           // $1 bills accepted
  dollar2: 0,           // $2 bills accepted
  dollar5: 0,           // $5 bills accepted
  dollar10: 0,          // $10 bills accepted
  dollar20: 0,          // $20 bills accepted
  dollar50: 0,          // $50 bills accepted
  dollar100: 0,         // $100 bills accepted
  dollar500: 0,         // $500 bills accepted
  dollar1000: 0,        // $1000 bills accepted
  dollar2000: 0,        // $2000 bills accepted
  dollar5000: 0,        // $5000 bills accepted
  dollarTotal: 0,       // Total of all denominations
  dollarTotalUnknown: 0 // Unrecognized bills
}

// Secondary data source - billValidator balance
BillValidator {
  balance: 0,           // Current validator balance
  notes: [...]          // Legacy array structure (not used in V2)
}
```

### **Bill Tracking During Sessions**

```typescript
MachineSession {
  startBillMeters: {
    // Bill counts when session started
    dollar1: 100, dollar5: 50, dollar20: 25
  },
  endBillMeters: {
    // Bill counts when session ended
    dollar1: 95, dollar5: 48, dollar20: 23
  }
}
```

### **Denomination Analysis**

- **Most Popular**: Which denominations players prefer
- **Acceptance Rate**: Success/failure of bill validation
- **Revenue Distribution**: How money flows through different denominations

## SMIB Configuration

### **What is SMIB?**

SMIB (Slot Machine Interface Board) is the communication interface between the slot machine and the casino management system.

### **Communication Modes**

```typescript
SMIBConfig {
  coms: {
    comsMode: 0,        // 0 = SAS, 1 = non-SAS, 2 = IGT
    comsRateMs: 100,    // Communication rate in milliseconds
    comsRTE: 1,         // Real-time events enabled
    comsGPC: 0          // Game protocol configuration
  }
}
```

### **Network Configuration**

```typescript
SMIBConfig {
  net: {
    netMode: 1,                    // 1 = WiFi client mode
    netStaSSID: "Casino_WiFi",    // WiFi network name
    netStaPwd: "password123",     // WiFi password
    netStaChan: 6                 // WiFi channel
  }
}
```

### **MQTT Configuration**

```typescript
SMIBConfig {
  mqtt: {
    mqttSecure: 0,                // TLS encryption (0 = off, 1 = on)
    mqttQOS: 1,                   // Quality of service level
    mqttURI: "mqtt.casino.com",   // MQTT broker address
    mqttSubTopic: "smib/commands", // Topic for receiving commands
    mqttPubTopic: "smib/events",   // Topic for publishing events
    mqttCfgTopic: "smib/config",   // Topic for configuration updates
    mqttIdleTimeS: 30             // Idle timeout in seconds
  }
}
```

## Machine Events and Activity Log

### **Event Types Tracked**

```typescript
MachineEvent {
  sequence: [
    {
      message: {
        typ: "BILL_ACCEPTED",     // Event type
        rly: "relay_123",         // Relay identifier
        mac: "00:11:22:33:44:55", // Machine MAC address
        tkn: "token_abc",         // Security token
        pyd: "payload_data"       // Event payload
      },
      description: "Bill validator accepted $20", // Human-readable description
      logLevel: "INFO",           // Log level (INFO, WARN, ERROR)
      success: true,              // Operation success status
      createdAt: "2024-12-20 10:30:00" // Timestamp
    }
  ]
}
```

### **Common Event Categories**

- **Bill Validation**: Bill acceptance/rejection events
- **Game Events**: Bet placement, wins, losses
- **Machine Commands**: Lock/unlock, restart, configuration changes
- **Communication**: Network connectivity, MQTT messages
- **Error Events**: Hardware failures, communication errors

## Financial Metrics and Calculations

### **Drop vs Gross**

- **Drop**: Total money players put into the machine
- **Gross**: Money collected by staff during collections
- **Net**: Drop minus gross (money still in machine)

### **Variance Calculation**

```typescript
Variance = Expected Collection - Actual Collection
Expected = Previous Balance + Drop - Current Balance
Actual = Amount Collected
```

### **Theoretical vs Actual RTP**

- **Theoretical RTP**: Expected return-to-player percentage
- **Actual RTP**: Real return based on actual play data
- **Variance**: Difference between theoretical and actual

## Real-Time Monitoring

### **Online/Offline Status**

- **Online**: Machine has communicated within last 3 minutes
- **Offline**: No communication for more than 3 minutes
- **Status Updates**: Real-time communication monitoring

### **Live Metrics**

- **Current Credits**: Player's current credit balance
- **Games Played**: Total games in current session
- **Last Activity**: Timestamp of last machine action
- **Bill Validator Status**: Current bill acceptance state

### **Alert System**

- **Low Balance**: Machine running low on credits
- **Bill Validator Full**: Bill storage needs emptying
- **Communication Issues**: Network or protocol problems
- **Hardware Errors**: Mechanical or electronic failures

## Configuration Management

### **Remote Configuration Updates**

- **Communication Mode**: Switch between SAS/non-SAS/IGT
- **Firmware Updates**: Remote SMIB firmware upgrades
- **Network Settings**: WiFi configuration changes
- **MQTT Settings**: Broker and topic configuration

### **Machine Control Commands**

- **Restart**: Reboot the SMIB system
- **Lock Machine**: Prevent player access
- **Unlock Machine**: Restore player access
- **Reset Meters**: Clear current session data

### **Batch Operations**

- **Apply to All**: Apply configuration to all machines at location
- **Location-wide Updates**: Synchronize settings across multiple machines
- **Rollback Capability**: Revert to previous configuration if needed

## How Each Section Works

### **Range Metrics Tab**

- **Purpose**: Shows financial performance over selected time periods
- **Data Source**: Aggregated from `meters` collection and `sasMeters`
- **Calculations**:
  - Money In = Total drop from players
  - Total Cancelled Credits = Credits cancelled by players
  - Gross = Money In - Total Cancelled Credits
  - Jackpot = Current jackpot amount
- **Time Filters**: Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range
- **Update Frequency**: Real-time when data changes

### **Live Metrics Tab**

- **Purpose**: Real-time machine status and current session data
- **Data Source**: Current machine state from `sasMeters` and `meterData`
- **Metrics Displayed**:
  - Coin In/Out = Current session coin activity
  - Total Hand Paid Cancelled Credits = Manual credit cancellations
  - Current Credits = Player's current balance
  - Games Played/Won = Current session statistics
- **Update Frequency**: Live updates via WebSocket or polling

### **Bill Validator Tab**

- **Purpose**: Unified bill validator interface that automatically detects and processes V1/V2 data structures from the `acceptedBills` collection
- **Data Source**: `acceptedBills` collection via `/api/bill-validator/[machineId]`
- **Functionality**:
  - **Automatic Data Detection**: Detects V1 (movement object) vs V2 (value field) data structures
  - **Current Balance**: Displays machine's current bill validator balance
  - **Denomination Tracking**: Shows accepted bills by denomination with quantity and subtotal
  - **Unknown Bills**: Tracks unrecognized bills
  - **Time Filtering**: Filter by Today, Yesterday, 7d, 30d, All Time, or Custom range
  - **Responsive Design**: Desktop table view and mobile card view
  - **Loading States**: Skeleton loaders for table and cards during data fetching
  - **No Data Handling**: Shows filters and appropriate messaging when no data found
- **Data Structure**:
  - **V1**: Uses `movement` object with denomination fields (dollar1, dollar5, etc.)
  - **V2**: Uses `value` field with individual bill records
- **Update Frequency**: Real-time when filter changes or manual refresh
- **UI Features**:
  - Filter buttons always visible for easy date range changes
  - Centered current balance card (only when data available)
  - Removed redundant total bills card (total shown in table)
  - Proper skeleton loaders for loading states
  - Mobile-responsive card design for denominations

### **Activity Log Tab**

- **Purpose**: Complete audit trail of machine events and commands
- **Data Source**: `machineEvents` collection via `/api/machines/by-id/events`
- **Event Types**:
  - Bill validation events (acceptance/rejection)
  - Game events (bets, wins, losses)
  - Machine commands (lock/unlock, restart)
  - Communication events (network, MQTT)
  - Error events (hardware failures)
- **Update Frequency**: Real-time event streaming

### **Collection History Tab**

- **Purpose**: Historical record of all money collections from the machine with data integrity monitoring
- **Data Source**: `machine.collectionMetersHistory` array
- **Data Structure**: Each entry contains:
  - Collection timestamp
  - Meters in/out readings
  - Previous collection readings
  - Location report ID for audit trail
  - **Status indicators** for data integrity issues
- **Update Frequency**: Updated after each collection
- **Issue Detection**: Automatically checks for:
  - **History Mismatch**: Collection history doesn't match corresponding collection document
  - **Orphaned History**: History entry exists but corresponding collection is missing
  - **Missing History**: Collection exists but no history entry on machine
- **Visual Indicators**:
  - **Desktop**: Red row background with AlertCircle icon and tooltip showing issue details
  - **Mobile**: Red card border with warning box displaying issue description
  - Issues are detected in real-time and displayed without auto-fixing data

### **Collection Settings Tab**

- **Purpose**: Configure and track current collection state
- **Data Source**: `machine.collectionMeters`, `machine.collectionTime`, `machine.collectorDenomination`
- **Functionality**:
  - Set last collection time and meter readings
  - Configure collector denomination
  - Edit/save collection parameters
  - Form validation and error handling
- **Update Frequency**: Manual updates via form submission

### **Configurations Tab**

- **Purpose**: Display machine configuration settings
- **Data Source**: `machine.gameConfig` and `machine.smibConfig`
- **Settings Displayed**:
  - Accounting Denomination = Base currency unit
  - Theoretical RTP = Expected return-to-player percentage
  - SMIB Configuration = Communication and network settings
- **Update Frequency**: Static display, updated when configuration changes

## Data Relationships

### **Machine → Sessions → Events → Collections**

```
Machine (machines.ts)
├── MachineSession (machineSessions.ts) - Player gaming sessions
│   ├── startMeters - Initial machine state
│   ├── endMeters - Final machine state
│   └── MachineEvent (machineEvents.ts) - Session activity log
├── Collection (collections.ts) - Money collection records
│   ├── metersIn - Machine state before collection
│   ├── metersOut - Machine state after collection
│   └── sasMeters - Financial calculations
└── CollectionReport (collectionReport.ts) - Aggregated financial data
```

### **Query Patterns**

```typescript
// Get machine collection history
const collections = await Collection.find({ machineId: machineId });

// Get machine events for a session
const events = await MachineEvent.find({
  machine: machineId,
  currentSession: sessionId,
});

// Get machine financial summary
const summary = await Collection.aggregate([
  { $match: { machineId: machineId } },
  {
    $group: {
      _id: null,
      totalCollected: { $sum: '$sasMeters.gross' },
      totalDrop: { $sum: '$sasMeters.drop' },
    },
  },
]);
```

## Performance Considerations

### **Indexing Strategy**

- **Machine-based queries**: Index on `machineId` and `timestamp`
- **Session-based queries**: Index on `currentSession` and `date`
- **Location-based queries**: Index on `location` and `timestamp`
- **Financial queries**: Index on `metersIn`, `metersOut`, `gross`

### **Data Aggregation**

- **Real-time calculations**: Use embedded documents for current state
- **Historical analysis**: Use aggregation pipelines for complex queries
- **Caching strategy**: Cache frequently accessed metrics
- **Data retention**: Archive old data for performance

## Security and Compliance

### **Access Control**

- **User Permissions**: Role-based access to machine controls
- **Audit Logging**: Track all configuration changes
- **Secure Communication**: Encrypted MQTT and network traffic
- **Token Validation**: Secure authentication for remote commands

### Compliance Requirements

### **Compliance Requirements**

- **Financial Accuracy**: Precise tracking of all money movements
- **Audit Trail**: Complete history of all machine activities
- **Regulatory Reporting**: Automated generation of compliance reports
- **Data Integrity**: Validation of all financial calculations

## Performance Considerations

### Optimization Strategies

- **Efficient Queries**: Optimized database queries with proper indexing
- **Real-time Updates**: Minimal data transfer for live monitoring
- **Caching**: Cached machine data for faster access
- **Event Streaming**: Efficient event log processing

### Database Indexing

- **Machine-based queries**: Index on `machineId` and `timestamp`
- **Event-based queries**: Index on `machine` and `createdAt`
- **Location-based queries**: Index on `location` and `timestamp`
- **Financial queries**: Index on financial fields for reporting

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: Machine shows offline status**

- **Cause**: Network connectivity problems or SMIB communication failure
- **Solution**: Check network settings, WiFi connection, and MQTT configuration

**Issue: Bill validator not accepting bills**

- **Cause**: Validator full, hardware error, or configuration issue
- **Solution**: Check bill storage capacity, validate hardware status, review validator settings

**Issue: Collection settings not updating**

- **Cause**: Form validation errors or database connection issues
- **Solution**: Verify all required fields are filled, check network connection

**Issue: Activity log not showing recent events**

- **Cause**: Event logging disabled or communication failure
- **Solution**: Check SMIB communication settings, verify event logging is enabled

### Debug Tools

## Troubleshooting

### **Common Issues**

- **Communication Failures**: Check network connectivity and MQTT settings
- **Configuration Errors**: Verify parameter ranges and format
- **Financial Discrepancies**: Review collection procedures and meter readings
- **Performance Issues**: Check database indexes and query optimization

### **Debug Tools**

- **Event Logs**: Detailed machine activity records
- **Network Diagnostics**: Connectivity and protocol testing
- **Financial Reconciliation**: Compare expected vs actual amounts
- **System Health**: Monitor machine status and performance metrics

## Future Enhancements

### Planned Features

### **Planned Features**

- **Predictive Analytics**: Machine performance forecasting
- **Automated Collections**: Smart collection scheduling
- **Advanced Reporting**: Enhanced financial and operational insights
- **Mobile Integration**: Mobile app for machine monitoring

### Integration Opportunities

- **Accounting Systems**: Direct financial data export
- **Security Systems**: Integration with casino surveillance
- **Player Management**: Enhanced player tracking and rewards
- **Regulatory Systems**: Automated compliance reporting

## Related Documentation

- [MQTT Integration](./mqtt-integration.md) - Frontend MQTT and SSE implementation
- [MQTT Architecture](../backend/mqtt-architecture.md) - Backend MQTT architecture
- [MQTT Implementation](../backend/mqtt-implementation.md) - Backend MQTT details
- [Cabinets API](../backend/cabinets-api.md) - Backend cabinet API documentation
- [Bill Validator System](../backend/bill-validator-calculation-system.md) - Bill validator calculations
- [Machines Page](./machines.md) - Cabinets listing page documentation
