# Cabinet Details Page Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025  
**Version:** 2.0.0

## Quick Search Guide

Use **Ctrl+F** to find these key topics:
- **bill validator** - How bill validator system works and tracks denominations
- **collection settings** - How collection settings are configured and updated
- **collection history** - How collection history is tracked and displayed
- **smib configuration** - How SMIB communication and network settings work
- **machine metrics** - How financial metrics are calculated and displayed
- **activity log** - How machine events and commands are tracked
- **denomination tracking** - How bill denominations are tracked and managed
- **database fields** - All model fields and their purposes

## Overview

The Cabinet Details page provides comprehensive management of individual slot machines, including real-time monitoring, financial tracking, collection management, and system configuration. Each cabinet is a complete gaming terminal with bill validation, collection capabilities, and communication systems.

## Bill Validator System

### How Bill Validator Works

The bill validator system accepts various denominations and tracks them separately for financial accuracy and audit purposes.

### Bill Validator Model Fields

```typescript
BillValidator {
  balance: number;                // Current validator balance (total cash in validator)
  notes: Array;                   // Legacy array structure (deprecated in V2)
}

BillMeters {
  dollar1: number;                // Count of $1 bills accepted
  dollar2: number;                // Count of $2 bills accepted  
  dollar5: number;                // Count of $5 bills accepted
  dollar10: number;               // Count of $10 bills accepted
  dollar20: number;               // Count of $20 bills accepted
  dollar50: number;               // Count of $50 bills accepted
  dollar100: number;              // Count of $100 bills accepted
  dollar500: number;              // Count of $500 bills accepted
  dollar1000: number;             // Count of $1000 bills accepted
  dollar2000: number;             // Count of $2000 bills accepted
  dollar5000: number;             // Count of $5000 bills accepted
  dollarTotal: number;            // Sum of all accepted denominations
  dollarTotalUnknown: number;     // Count of unrecognized bills
}
```

### Bill Tracking Process

1. **Bill Insertion**: Player inserts bill into machine
2. **Validation**: Bill validator checks authenticity and denomination
3. **Acceptance/Rejection**: Bill either accepted or rejected
4. **Tracking Update**: Accepted bills increment corresponding denomination counter
5. **Balance Update**: Total balance updated with bill value
6. **Credit Issuance**: Player receives credits based on denomination

### Bill Validator Data Sources

**Primary Source**: `machine.billMeters` - Individual denomination counts
**Secondary Source**: `machine.billValidator.balance` - Total validator balance
**Event Tracking**: Bill acceptance/rejection events in activity log

### Denomination Analysis Features

- **Acceptance Rates**: Track success/failure rates for each denomination
- **Popular Denominations**: Identify which bills players prefer
- **Revenue Distribution**: See how money flows through different denominations
- **Validator Performance**: Monitor bill validator accuracy and reliability

## Collection System

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
```

### Collection Process Flow

1. **Pre-Collection**: Staff checks last collection settings and meter readings
2. **Physical Collection**: Staff removes money from machine
3. **Meter Recording**: Record new meter readings
4. **Calculation**: Calculate gross amount collected
5. **Database Update**: Update collection settings and history
6. **Report Integration**: Link to collection report if part of larger collection

## SMIB Configuration

### What is SMIB?

SMIB (Slot Machine Interface Board) is the communication interface between the slot machine and the casino management system. It handles all data communication, machine control, and network connectivity.

### SMIB Configuration Model Fields

```typescript
SMIBConfig {
  // Communication Settings
  coms: {
    comsMode: number;             // 0 = SAS, 1 = non-SAS, 2 = IGT protocol
    comsRateMs: number;           // Communication rate in milliseconds
    comsRTE: number;              // Real-time events enabled (1 = yes, 0 = no)
    comsGPC: number;              // Game protocol configuration
  },
  
  // Network Configuration
  net: {
    netMode: number;              // 1 = WiFi client mode, 0 = Ethernet
    netStaSSID: string;           // WiFi network name
    netStaPwd: string;            // WiFi password
    netStaChan: number;           // WiFi channel number
  },
  
  // MQTT Configuration
  mqtt: {
    mqttSecure: number;           // TLS encryption (0 = off, 1 = on)
    mqttQOS: number;              // Quality of service level (0, 1, or 2)
    mqttURI: string;              // MQTT broker address
    mqttSubTopic: string;         // Topic for receiving commands
    mqttPubTopic: string;         // Topic for publishing events
    mqttCfgTopic: string;         // Topic for configuration updates
    mqttIdleTimeS: number;        // Idle timeout in seconds
  }
}
```

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

### Collection Management
- `GET /api/collections` - List machine collections
- `POST /api/collections` - Create new collection record
- `PATCH /api/collections/[id]` - Update collection record

### SMIB Configuration
- `POST /api/machines/[id]/smib-config` - Update SMIB settings
- `POST /api/machines/[id]/commands` - Send machine commands

## Security and Compliance

### Access Control
- **User Permissions**: Role-based access to machine controls
- **Audit Logging**: Track all configuration changes
- **Secure Communication**: Encrypted MQTT and network traffic
- **Token Validation**: Secure authentication for remote commands

### Compliance Requirements
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
- **Event Logs**: Detailed machine activity records
- **Network Diagnostics**: Connectivity and protocol testing
- **Financial Reconciliation**: Compare expected vs actual amounts
- **System Health**: Monitor machine status and performance metrics

## Future Enhancements

### Planned Features
- **Predictive Analytics**: Machine performance forecasting
- **Automated Collections**: Smart collection scheduling
- **Advanced Reporting**: Enhanced financial and operational insights
- **Mobile Integration**: Mobile app for machine monitoring

### Integration Opportunities
- **Accounting Systems**: Direct financial data export
- **Security Systems**: Integration with casino surveillance
- **Player Management**: Enhanced player tracking and rewards
- **Regulatory Systems**: Automated compliance reporting
