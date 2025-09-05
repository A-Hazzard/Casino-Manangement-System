# Casino Machine Models Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

This document explains how the core casino machine models work together to track gaming sessions, financial transactions, and machine events.

## Overview

The casino machine system consists of four interconnected models that work together to provide complete tracking of player activity, financial transactions, and machine operations:

1. **MachineSessions** - Player gaming sessions
2. **MachineEvents** - Detailed activity logging
3. **Collections** - Money collection records
4. **CollectionReport** - Financial summaries

## 🎰 Complete Gaming Session Flow

```
Member Swipes Card → MachineSession Created → MachineEvents Logged → Collection → CollectionReport
```

## 1. MachineSessions Model

### **Purpose**
Tracks when a member starts and ends playing on a specific machine, capturing the complete gaming session.

### **Key Fields**
```typescript
MachineSession {
  _id: "session_123",
  memberId: "john_doe",           // Links to member
  machineId: "slot_machine_456",  // Links to machine
  startTime: "2024-12-20 10:00:00",
  endTime: "2024-12-20 12:00:00",
  
  // Financial State at Start
  startMeters: {
    drop: 1000,        // Money in machine when session started
    gamesPlayed: 0,    // Games played before session
    jackpot: 0         // Jackpot amount at start
  },
  
  // Financial State at End
  endMeters: {
    drop: 800,         // Money in machine when session ended
    gamesPlayed: 25,   // Total games played during session
    jackpot: 100       // Jackpot amount at end
  },
  
  // Bill Validator State
  startBillMeters: {   // Bill counts at start
    dollar1: 100, dollar5: 50, dollar20: 25
  },
  endBillMeters: {     // Bill counts at end
    dollar1: 95, dollar5: 48, dollar20: 23
  }
}
```

### **Real-World Example**
John Doe starts playing at 10:00 AM with $1000 in the machine. He plays for 2 hours, inserting $20 bills and winning some games. When he leaves at 12:00 PM, there's $800 in the machine and he played 25 games.

### **Session Lifecycle**
1. **Session Start**: Member swipes card, session created with `startMeters`
2. **During Play**: MachineEvents logged for every action
3. **Session End**: Member logs out, session updated with `endMeters`

## 1.5. Machine Game Configuration

### **Purpose**
The `gameConfig` section in the machines model contains critical game-specific settings that determine how the slot machine operates, pays out, and tracks financial data.

### **Key Fields**
```typescript
gameConfig: {
  // Financial Configuration
  accountingDenomination: 0.01,    // Smallest currency unit (e.g., $0.01 for cents)
  theoreticalRtp: 0.95,            // Expected return-to-player percentage (95%)
  
  // Game Identification
  additionalId: "GAME_001",        // Additional game identifier
  gameOptions: "5_REEL_25_LINE",   // Game configuration options
  payTableId: "PAYTABLE_A",        // Specific pay table version
  
  // Betting Configuration
  maxBet: "100.00",                // Maximum bet allowed per spin
  progressiveGroup: "PROG_GROUP_1" // Progressive jackpot group
}
```

### **Real-World Example**
A slot machine with:
- **Accounting Denomination**: $0.01 (tracks money in cents)
- **Theoretical RTP**: 95% (expects to pay back 95% of money played)
- **Max Bet**: $100.00 (players can bet up to $100 per spin)
- **Pay Table**: Version A (specific winning combinations and payouts)

### **Configuration Impact**
- **Accounting Denomination**: Determines precision of financial tracking
- **Theoretical RTP**: Used for variance calculations and compliance
- **Max Bet**: Limits player exposure and machine liability
- **Pay Table**: Defines winning combinations and payout amounts

### **Financial Calculations with GameConfig**
```typescript
// Example: Variance calculation using theoretical RTP
const expectedPayout = totalDrop * gameConfig.theoreticalRtp
const actualPayout = totalDrop - gross
const variance = expectedPayout - actualPayout

// Example: Bet validation using max bet
const isValidBet = (betAmount <= parseFloat(gameConfig.maxBet))

// Example: Denomination conversion
const centsToDollars = (cents) => cents * gameConfig.accountingDenomination
const dollarsToCents = (dollars) => dollars / gameConfig.accountingDenomination
```

### **Compliance and Reporting**
- **Theoretical RTP**: Used for regulatory compliance reporting
- **Accounting Denomination**: Ensures financial accuracy in reports
- **Max Bet**: Used for responsible gambling compliance
- **Pay Table**: Required for game approval and licensing

## 2. MachineEvents Model

### **Purpose**
Logs every single action and event that occurs during a gaming session, providing detailed audit trails.

### **Key Fields**
```typescript
MachineEvent {
  _id: "event_789",
  machine: "slot_machine_456",    // Links to machine
  currentSession: "session_123",  // Links to session
  date: "2024-12-20 10:30:00",
  
  // Event Details
  sequence: [
    {
      message: {
        typ: "BILL_ACCEPTED",     // Event type
        rly: "relay_123",         // Relay identifier
        mac: "00:11:22:33:44:55", // Machine MAC address
        tkn: "token_abc",         // Security token
        pyd: "payload_data"       // Event payload
      },
      description: "Bill validator accepted $20",
      logLevel: "INFO",
      success: true,
      createdAt: "2024-12-20 10:30:00"
    },
    {
      message: {
        typ: "BET_PLACED",
        pyd: "Bet $1 on line 1"
      },
      description: "Player placed $1 bet",
      logLevel: "INFO",
      success: true,
      createdAt: "2024-12-20 10:31:00"
    }
  ]
}
```

### **Event Types**
- **BILL_ACCEPTED**: Bill validator accepts money
- **BILL_REJECTED**: Bill validator rejects money
- **BET_PLACED**: Player places a bet
- **WIN_PAID**: Machine pays out winnings
- **JACKPOT_HIT**: Jackpot is won
- **MACHINE_LOCKED**: Machine is locked by staff
- **MACHINE_UNLOCKED**: Machine is unlocked
- **COMMUNICATION_ERROR**: Network or protocol issues
- **HARDWARE_ERROR**: Mechanical or electronic failures

### **Dual Linking Strategy**
MachineEvents are linked to both:
- **Machine** (`machine` field) - For machine-based queries
- **Session** (`currentSession` field) - For player-based queries

This allows flexible querying:
```typescript
// Get all events for a specific machine
const machineEvents = await MachineEvent.find({ machine: "slot_machine_456" })

// Get all events for a specific session
const sessionEvents = await MachineEvent.find({ currentSession: "session_123" })

// Get all events for a machine during a specific session
const sessionMachineEvents = await MachineEvent.find({ 
  machine: "slot_machine_456", 
  currentSession: "session_123" 
})
```

## 3. Collections Model

### **Purpose**
Records money collected from machines after gaming sessions, providing financial audit trails.

### **Key Fields**
```typescript
Collection {
  _id: "collection_001",
  machineId: "slot_machine_456",  // Links to machine
  location: "casino_main_floor",  // Links to location
  collector: "staff_member_123",  // Links to user who collected
  timestamp: "2024-12-20 17:00:00",
  
  // Financial Data
  metersIn: 800,        // Money in machine when collection started
  metersOut: 600,       // Money in machine when collection finished
  gross: 200,           // Money collected (800 - 600)
  
  // SAS Meters (Slot Accounting System)
  sasMeters: {
    drop: 800,          // Total money players put in
    gamesPlayed: 25,    // Total games played
    jackpot: 100,       // Current jackpot amount
    billMeters: {       // Bill validator state
      dollar1: 95, dollar5: 48, dollar20: 23
    }
  },
  
  // Movement Data
  movement: {
    metersIn: 800,      // Money movement tracking
    metersOut: 600,
    gross: 200
  }
}
```

### **Collection Process**
1. **Staff Member** approaches machine for collection
2. **Meters Read** - Current machine state recorded as `metersIn`
3. **Money Collected** - Staff removes money from machine
4. **Final Meters** - Machine state after collection recorded as `metersOut`
5. **Collection Recorded** - All data saved to database

### **Financial Calculations**
- **Drop**: Money players put into machine (`metersIn`)
- **Gross**: Money collected by staff (`metersIn - metersOut`)
- **Net**: Money remaining in machine (`metersOut`)
- **Variance**: Any discrepancies in expected vs actual amounts

## 4. CollectionReport Model

### **Purpose**
Aggregates all collections for a location into comprehensive financial summaries for reporting and compliance.

### **Key Fields**
```typescript
CollectionReport {
  _id: "report_001",
  location: "casino_main_floor",  // Links to location
  locationReportId: "loc_report_123",
  date: "2024-12-20",
  
  // Financial Summary
  totalDrop: 5000,      // Sum of all machine drops
  totalGross: 1200,     // Sum of all collections
  amountCollected: 1200, // Total money collected
  variance: 0,          // Any discrepancies
  
  // Collection Details
  machinesCollected: "5 machines",
  collections: [         // Array of collection IDs
    "collection_001",
    "collection_002",
    "collection_003"
  ],
  
  // Report Metadata
  createdBy: "system",
  createdAt: "2024-12-20 18:00:00",
  status: "completed"
}
```

### **Report Generation Process**
1. **Collections Completed** - All machines collected for the day
2. **Data Aggregation** - Sum up all collection data
3. **Variance Calculation** - Check for any discrepancies
4. **Report Creation** - Generate comprehensive summary
5. **Compliance Review** - Ensure all data is accurate

## 🔗 How Models Work Together

### **Complete Data Flow Example**

#### **Step 1: Player Starts Gaming**
```typescript
// MachineSession created
const session = new MachineSession({
  memberId: "john_doe",
  machineId: "slot_machine_456",
  startTime: "2024-12-20 10:00:00",
  startMeters: { drop: 1000, gamesPlayed: 0 }
})
```

#### **Step 2: During Play - Events Logged**
```typescript
// MachineEvent created for bill acceptance
const event = new MachineEvent({
  machine: "slot_machine_456",
  currentSession: "session_123",
  sequence: [{
    message: { typ: "BILL_ACCEPTED", pyd: "$20 bill accepted" },
    description: "Bill validator accepted $20",
    success: true
  }]
})
```

#### **Step 3: Session Ends**
```typescript
// MachineSession updated
session.endTime = "2024-12-20 12:00:00"
session.endMeters = { drop: 800, gamesPlayed: 25 }
```

#### **Step 4: Collection Performed**
```typescript
// Collection created
const collection = new Collection({
  machineId: "slot_machine_456",
  metersIn: 800,        // Money when collection started
  metersOut: 600,       // Money when collection finished
  gross: 200,           // Money collected
  sasMeters: { drop: 800, gamesPlayed: 25 }
})
```

#### **Step 5: Report Generated**
```typescript
// CollectionReport aggregates all collections
const report = new CollectionReport({
  location: "casino_main_floor",
  totalDrop: 5000,      // Sum of all drops
  totalGross: 1200,     // Sum of all collections
  machinesCollected: "5 machines"
})
```

## 📊 Query Patterns and Use Cases

### **Player Activity Analysis**
```typescript
// Get all sessions for a specific member
const memberSessions = await MachineSession.find({ 
  memberId: "john_doe" 
}).sort({ startTime: -1 })

// Get all events for a member's session
const sessionEvents = await MachineEvent.find({ 
  currentSession: "session_123" 
}).sort({ date: 1 })
```

### **Machine Performance Analysis**
```typescript
// Get all collections for a specific machine
const machineCollections = await Collection.find({ 
  machineId: "slot_machine_456" 
}).sort({ timestamp: -1 })

// Get financial summary for a machine
const machineSummary = await Collection.aggregate([
  { $match: { machineId: "slot_machine_456" } },
  { $group: { 
    _id: null, 
    totalCollected: { $sum: "$gross" },
    totalDrop: { $sum: "$sasMeters.drop" },
    avgGamesPerSession: { $avg: "$sasMeters.gamesPlayed" }
  }}
])
```

### **Location Financial Reporting**
```typescript
// Get daily collection report
const dailyReport = await CollectionReport.findOne({ 
  location: "casino_main_floor",
  date: "2024-12-20"
})

// Get monthly financial summary
const monthlySummary = await Collection.aggregate([
  { $match: { 
    location: "casino_main_floor",
    timestamp: { 
      $gte: new Date("2024-12-01"), 
      $lt: new Date("2025-01-01") 
    }
  }},
  { $group: { 
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
    dailyDrop: { $sum: "$sasMeters.drop" },
    dailyGross: { $sum: "$gross" },
    machineCount: { $addToSet: "$machineId" }
  }},
  { $sort: { _id: 1 } }
])
```

### **Compliance and Audit**
```typescript
// Get complete audit trail for a machine
const auditTrail = await MachineEvent.find({ 
  machine: "slot_machine_456",
  date: { 
    $gte: new Date("2024-12-20"), 
    $lt: new Date("2024-12-21") 
  }
}).sort({ date: 1 })

// Get collection variance analysis
const varianceAnalysis = await Collection.find({ 
  location: "casino_main_floor",
  timestamp: { 
    $gte: new Date("2024-12-20"), 
    $lt: new Date("2024-12-21") 
  }
}).select('machineId gross variance sasMeters')
```

## 🎯 Business Intelligence Applications

### **Player Behavior Analysis**
- **Session Duration**: How long players typically play
- **Betting Patterns**: Preferred bet amounts and frequencies
- **Win/Loss Patterns**: Player success rates and preferences
- **Denomination Preferences**: Which bills players prefer

### **Machine Performance Metrics**
- **Revenue per Machine**: Daily/weekly/monthly earnings
- **Utilization Rates**: How often machines are in use
- **Collection Efficiency**: How quickly money is collected
- **Maintenance Indicators**: Performance degradation patterns

### **Financial Operations**
- **Cash Flow Management**: Predict daily cash needs
- **Variance Analysis**: Identify potential issues or theft
- **Collection Optimization**: Schedule collections efficiently
- **Regulatory Compliance**: Generate required reports

### **Operational Efficiency**
- **Staff Scheduling**: Optimize collector assignments
- **Machine Placement**: Position high-performing machines strategically
- **Maintenance Planning**: Schedule maintenance during low-usage periods
- **Inventory Management**: Track bill validator and coin hopper levels

## 🔒 Security and Compliance Features

### **Data Integrity**
- **Audit Trails**: Complete history of all transactions
- **Variance Detection**: Automatic flagging of discrepancies
- **Data Validation**: Ensures all financial calculations are accurate
- **Backup and Recovery**: Multiple data protection layers

### **Access Control**
- **Role-Based Permissions**: Different access levels for different staff
- **Activity Logging**: Track all system access and changes
- **Secure Communication**: Encrypted data transmission
- **Token Authentication**: Secure API access

### **Regulatory Compliance**
- **Financial Reporting**: Automated generation of compliance reports
- **Data Retention**: Maintain records for required time periods
- **Audit Support**: Easy access to historical data for regulators
- **Variance Reporting**: Flag unusual activity for investigation

## 🚀 Performance Optimization

### **Database Indexing**
```typescript
// Critical indexes for performance
machineSessionSchema.index({ memberId: 1, startTime: -1 })
machineSessionSchema.index({ machineId: 1, startTime: -1 })
machineEventSchema.index({ machine: 1, date: -1 })
machineEventSchema.index({ currentSession: 1, date: -1 })
collectionSchema.index({ machineId: 1, timestamp: -1 })
collectionSchema.index({ location: 1, timestamp: -1 })
collectionReportSchema.index({ location: 1, date: -1 })
```

### **Data Aggregation Strategies**
- **Real-time Metrics**: Use embedded documents for current state
- **Historical Analysis**: Use aggregation pipelines for complex queries
- **Caching**: Cache frequently accessed data
- **Data Archiving**: Move old data to archive for performance

### **Query Optimization**
- **Selective Fields**: Only retrieve needed data
- **Date Range Filtering**: Limit queries to relevant time periods
- **Batch Operations**: Process multiple records efficiently
- **Connection Pooling**: Optimize database connections

## 🔮 Future Enhancements

### **Advanced Analytics**
- **Predictive Modeling**: Forecast machine performance and revenue
- **Player Segmentation**: Identify high-value and casual players
- **Machine Optimization**: Suggest optimal machine configurations
- **Revenue Optimization**: Identify opportunities to increase earnings

### **Automation Features**
- **Smart Collections**: Automatically schedule collections based on machine activity
- **Predictive Maintenance**: Identify maintenance needs before failures
- **Dynamic Pricing**: Adjust machine settings based on performance
- **Automated Reporting**: Generate and distribute reports automatically

### **Integration Opportunities**
- **Accounting Systems**: Direct financial data export
- **Player Management**: Enhanced player tracking and rewards
- **Security Systems**: Integration with casino surveillance
- **Regulatory Systems**: Automated compliance reporting

## 📚 Related Documentation

- **Database Relationships**: See `database-relationships.md` for model relationships
- **Cabinet Details**: See `cabinet-details.md` for machine-specific information
- **API Endpoints**: See backend documentation for data access methods
- **Frontend Components**: See component documentation for UI implementation

## 🎯 Summary

The casino machine system provides comprehensive tracking of:
- **Player Activity**: Complete gaming session history
- **Financial Transactions**: Detailed money movement tracking
- **Machine Operations**: Real-time status and performance
- **Compliance Data**: Automated reporting and audit trails

This system enables casino operators to:
- **Optimize Operations**: Make data-driven decisions
- **Ensure Compliance**: Meet regulatory requirements
- **Maximize Revenue**: Identify and capitalize on opportunities
- **Maintain Security**: Protect against fraud and theft
