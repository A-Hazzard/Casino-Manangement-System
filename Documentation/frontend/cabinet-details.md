# Cabinet Details Page Documentation

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
**Last Updated:** September 6th, 2025  
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
- **Communication Mode**: SAS, non-SAS, or IGT protocols
- **Firmware Version**: Current SMIB firmware running
- **Network Settings**: WiFi configuration and MQTT settings
- **Machine Control**: Restart, lock/unlock functionality

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
```

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
    metersIn: 800,      // Money movement tracking
    metersOut: 600,
    gross: 200
  }
}
```

### **Collection History Display**
- **Date/Time**: When collection occurred
- **Collector**: Staff member who performed collection
- **Amount Collected**: Gross amount taken from machine
- **Machine Status**: Meters before and after collection
- **Variance**: Any discrepancies in expected vs actual amounts

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
await Machine.findByIdAndUpdate(cabinetId, {
  collectionMeters: {
    metersIn: 1200,
    metersOut: 800
  },
  collectionTime: new Date("2024-12-20T14:30:00.000Z"),
  collectorDenomination: 1.00,
  updatedAt: new Date()
}, { new: true, runValidators: true });
```

### **Collection Settings vs Collection History**

| Feature | Collection Settings | Collection History |
|---------|-------------------|-------------------|
| **Purpose** | Current state configuration | Historical audit trail |
| **Data** | Last collection values | All past collections |
| **Update** | Manual form entry | Automatic during collections |
| **Storage** | `machine.collectionMeters` | `machine.collectionMetersHistory[]` |
| **Usage** | Setup for next collection | Financial reporting & analysis |

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
- **Purpose**: Track bill acceptance and denomination breakdown using billMeters data
- **Data Source**: `machine.billMeters` (primary) and `machine.billValidator.balance`
- **Functionality**:
  - Shows current bill validator balance from `billValidator.balance`
  - Displays accepted denominations and quantities from `billMeters` structure
  - Calculates subtotals for each denomination (dollar1, dollar2, dollar5, etc.)
  - Tracks unknown bills via `dollarTotalUnknown`
  - Shows total bill count and amount
- **Data Structure**: Uses `billMeters` schema with individual denomination fields
- **Update Frequency**: Real-time during bill acceptance events

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
- **Purpose**: Historical record of all money collections from the machine
- **Data Source**: `machine.collectionMetersHistory` array
- **Data Structure**: Each entry contains:
  - Collection timestamp
  - Meters in/out readings
  - Previous collection readings
  - Location report ID for audit trail
- **Update Frequency**: Updated after each collection

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
const collections = await Collection.find({ machineId: machineId })

// Get machine events for a session
const events = await MachineEvent.find({ 
  machine: machineId, 
  currentSession: sessionId 
})

// Get machine financial summary
const summary = await Collection.aggregate([
  { $match: { machineId: machineId } },
  { $group: { 
    _id: null, 
    totalCollected: { $sum: "$sasMeters.gross" },
    totalDrop: { $sum: "$sasMeters.drop" }
  }}
])
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

### **Compliance Requirements**
- **Financial Accuracy**: Precise tracking of all money movements
- **Audit Trail**: Complete history of all machine activities
- **Regulatory Reporting**: Automated generation of compliance reports
- **Data Integrity**: Validation of all financial calculations

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

### **Planned Features**
- **Predictive Analytics**: Machine performance forecasting
- **Automated Collections**: Smart collection scheduling
- **Advanced Reporting**: Enhanced financial and operational insights
- **Mobile Integration**: Mobile app for machine monitoring

### **Integration Opportunities**
- **Accounting Systems**: Direct financial data export
- **Security Systems**: Integration with casino surveillance
- **Player Management**: Enhanced player tracking and rewards
- **Regulatory Systems**: Automated compliance reporting 