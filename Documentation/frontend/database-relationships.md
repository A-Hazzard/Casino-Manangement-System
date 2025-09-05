# Database Relationships Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

This document outlines all the relationships between database models in the Evolution1 Casino Management System.

## Core Entity Hierarchy

```
Licencee (licencee.ts)
├── GamingLocation (gaminglocations.ts)
│   ├── Member (members.ts)
│   │   ├── MachineSession (machineSessions.ts)
│   │   │   └── MachineEvent (machineEvents.ts)
│   │   └── AcceptedBill (acceptedBills.ts)
│   ├── Machine (machines.ts)
│   │   ├── Meter (meters.ts)
│   │   ├── MachineEvent (machineEvents.ts)
│   │   ├── AcceptedBill (acceptedBills.ts)
│   │   └── CollectionMetersHistory (embedded in machines.ts)
│   ├── Collection (collections.ts)
│   ├── CollectionReport (collectionReport.ts)
│   └── MovementRequest (movementrequests.ts)
├── User (user.ts)
│   └── ActivityLog (activityLog.ts)
├── Firmware (firmware.ts)
└── Scheduler (scheduler.ts)
```

## Casino Machine System - How It Actually Works

### **🎰 Complete Gaming Session Flow**

```
Member Swipes Card → MachineSession Created → MachineEvents Logged → Collection → CollectionReport
```

### **1. Member Gaming Session (MachineSessions)**
- **Purpose**: Tracks when a member starts/ends playing on a machine
- **Key Fields**: `memberId`, `machineId`, `startTime`, `endTime`, `startMeters`, `endMeters`
- **Real Example**: John Doe plays slot machine for 2 hours, system tracks his entire session

### **2. Machine Events (MachineEvents)**
- **Purpose**: Logs every action during a gaming session
- **Key Fields**: `machine`, `currentSession`, `sequence` (array of events)
- **Real Example**: Every bet, win, bill insertion, and machine command is logged
- **Dual Linking**: Events link to both machine (for machine queries) and session (for player queries)

### **3. Collections (Collections)**
- **Purpose**: Records money collected from machines after gaming sessions
- **Key Fields**: `machineId`, `metersIn`, `metersOut`, `sasMeters`, `collector`
- **Real Example**: Staff member collects $200 from machine after John Doe's session
- **Financial Tracking**: Tracks drop (money in), gross (money collected), and variance

### **4. Collection Reports (CollectionReport)**
- **Purpose**: Aggregates all collections for a location into financial summaries
- **Key Fields**: `location`, `totalDrop`, `totalGross`, `amountCollected`, `variance`
- **Real Example**: Daily report showing $5,000 total drop and $1,200 collected from all machines

## Detailed Relationship Mappings

### 1. **Licencee → GamingLocation**
- **Field**: `rel.licencee` in `gaminglocations.ts`
- **Type**: `string` (references `licencee._id`)
- **Relationship**: One-to-Many (One Licencee can have multiple GamingLocations)
- **Purpose**: Multi-tenant architecture where each licensee owns multiple casino locations

### 2. **GamingLocation → Member**
- **Field**: `gamingLocation` in `members.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple Members)
- **Purpose**: Each casino location has multiple registered members/players

### 3. **Member → MachineSession**
- **Field**: `memberId` in `machineSessions.ts`
- **Type**: `string` (references `members._id`)
- **Relationship**: One-to-Many (One Member can have multiple MachineSessions)
- **Purpose**: Tracking all gaming sessions for each member across different machines

### 4. **MachineSession → Machine**
- **Field**: `machineId` in `machineSessions.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: Many-to-One (Multiple MachineSessions can belong to one Machine)
- **Purpose**: Linking gaming sessions to specific slot machines/cabinets

### 5. **MachineSession ↔ MachineEvent**
- **Field**: `currentSession` in `machineEvents.ts` and `_id` in `machineSessions.ts`
- **Type**: `string` (references `machineSessions._id`)
- **Relationship**: One-to-Many (One MachineSession can have multiple MachineEvents)
- **Purpose**: Detailed event logging for each gaming session
- **Note**: MachineEvents are linked to sessions via the `currentSession` field, which contains the session ID

### 6. **Machine → MachineEvent**
- **Field**: `machine` in `machineEvents.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One Machine can have multiple MachineEvents)
- **Purpose**: Logging of machine events, commands, and communication
- **Note**: MachineEvents are linked to both machines (via `machine` field) and sessions (via `currentSession` field)

### 7. **Machine → Collection**
- **Field**: `machineId` in `collections.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One Machine can have multiple Collections)
- **Purpose**: Financial collection records from each machine after gaming sessions

### 8. **Collection → CollectionReport**
- **Field**: `location` in both collections and collectionReport (via machine → location relationship)
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: Many-to-One (Multiple Collections contribute to one CollectionReport)
- **Purpose**: Aggregating individual machine collections into location-wide financial reports

### 9. **Member → AcceptedBill**
- **Field**: `member` in `acceptedBills.ts`
- **Type**: `string` (references `members._id`)
- **Relationship**: One-to-Many (One Member can have multiple AcceptedBills)
- **Purpose**: Tracking bill validator denominations accepted by each member

### 10. **Machine → AcceptedBill**
- **Field**: `machine` in `acceptedBills.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One Machine can have multiple AcceptedBills)
- **Purpose**: Tracking bill validator denominations accepted by each machine

### 11. **Machine → CollectionMetersHistory (Embedded)**
- **Field**: `collectionMetersHistory` in `machines.ts` (embedded array)
- **Type**: Array of embedded documents
- **Relationship**: One-to-Many (One Machine has multiple CollectionMetersHistory entries)
- **Purpose**: Historical tracking of collection meter readings for financial auditing

### 12. **GamingLocation → Collection**
- **Field**: `location` in `collections.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple Collections)
- **Purpose**: Financial collection records from each location

### 13. **GamingLocation → CollectionReport**
- **Field**: `location` in `collectionReport.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple CollectionReports)
- **Purpose**: Aggregated collection summaries and variance tracking

### 14. **GamingLocation → MovementRequest**
- **Fields**: `locationFrom`, `locationTo`, `locationId` in `movementrequests.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: Many-to-Many (Movement requests between locations)
- **Purpose**: Cabinet movement requests between different casino locations

### 15. **User → Collection**
- **Field**: `collector` in `collections.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can be a collector for multiple Collections)
- **Purpose**: Tracking which user performed each collection

### 16. **User → ActivityLog**
- **Field**: `userId` in `activityLog.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can generate multiple ActivityLogs)
- **Purpose**: Audit trail of all user actions in the system

### 17. **User → MovementRequest**
- **Fields**: `createdBy`, `approvedBy`, `approvedBySecond` in `movementrequests.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can create/approve multiple MovementRequests)
- **Purpose**: Tracking who created and approved movement requests

### 18. **User → Scheduler**
- **Fields**: `creator`, `collector` in `scheduler.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can create multiple Schedules)
- **Purpose**: Collection scheduling and assignment

### 19. **GamingLocation → Scheduler**
- **Field**: `location` in `scheduler.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple Schedules)
- **Purpose**: Collection scheduling for specific locations

## Casino Machine Financial Flow

### **Complete Money Flow: Machine → Session → Events → Collection → Report**

```
Machine (machines.ts)
├── MachineSession (machineSessions.ts) - Player gaming session
│   ├── startMeters - Money in machine when session started
│   ├── endMeters - Money in machine when session ended
│   └── MachineEvent (machineEvents.ts) - Every action during session
├── Collection (collections.ts) - Money collected after session
│   ├── metersIn - Money when collection started
│   ├── metersOut - Money when collection finished
│   └── sasMeters - Financial calculations (drop, gross, variance)
└── CollectionReport (collectionReport.ts) - Location financial summary
    ├── totalDrop - Sum of all machine drops
    ├── totalGross - Sum of all collections
    └── variance - Difference between expected and actual
```

### **Real-World Example: John Doe's Gaming Session**

1. **Session Start**:
   ```typescript
   MachineSession {
     memberId: "john_doe",
     machineId: "slot_machine_456",
     startTime: "2024-12-20 10:00:00",
     startMeters: { drop: 1000, gamesPlayed: 0 }
   }
   ```

2. **During Play**:
   ```typescript
   MachineEvent {
     machine: "slot_machine_456",
     currentSession: "session_123",
     sequence: [
       { message: "Bill accepted $20", success: true },
       { message: "Bet $1", success: true },
       { message: "Won $5", success: true }
     ]
   }
   ```

3. **Session End**:
   ```typescript
   MachineSession {
     endTime: "2024-12-20 12:00:00",
     endMeters: { drop: 800, gamesPlayed: 25 }
   }
   ```

4. **Collection**:
   ```typescript
   Collection {
     machineId: "slot_machine_456",
     metersIn: 800,    // Money when collection started
     metersOut: 600,   // Money when collection finished
     sasMeters: { drop: 800, gross: 200 }
   }
   ```

5. **Report Generation**:
   ```typescript
   CollectionReport {
     location: "casino_main_floor",
     totalDrop: 5000,      // Sum of all collections
     totalGross: 1200,     // Total money collected
     machinesCollected: "5 machines"
   }
   ```

## Member Gaming Flow Relationships

### **Core Gaming Flow: Member → Machine → Session → Events**
```
Member (members.ts)
├── MachineSession (machineSessions.ts) - Links member to machine during gaming
│   ├── Machine (machines.ts) - The physical slot machine being used
│   └── MachineEvent (machineEvents.ts) - Detailed events during the session (linked via currentSession)
└── AcceptedBill (acceptedBills.ts) - Bills accepted by the member
```

### **Detailed Session-Event Relationship**
```
MachineSession (_id: "session123")
├── memberId: "member456" (references members._id)
├── machineId: "machine789" (references machines._id)
└── MachineEvent (currentSession: "session123")
    ├── machine: "machine789" (references machines._id)
    ├── currentSession: "session123" (references machineSessions._id)
    └── sequence: [...] (detailed event data)
```

### **Complex Relationship Explanation**

#### **Member → Machine → Session → Events Flow**
1. **Member** starts a gaming session on a **Machine**
2. **MachineSession** is created with:
   - `memberId`: Links to the member
   - `machineId`: Links to the machine
   - `_id`: Unique session identifier
3. **MachineEvents** are created during the session with:
   - `machine`: Links to the machine (for machine-based queries)
   - `currentSession`: Links to the session (for session-based queries)
   - `sequence`: Detailed event data

#### **Query Patterns for Events**
- **By Session**: `MachineEvent.find({ currentSession: sessionId })`
- **By Machine**: `MachineEvent.find({ machine: machineId })`
- **By Session and Machine**: `MachineEvent.find({ currentSession: sessionId, machine: machineId })`
- **By Date Range**: `MachineEvent.find({ date: { $gte: startDate, $lte: endDate } })`

### **Machine Financial Tracking Flow: Machine → Meters → Collections**
```
Machine (machines.ts)
├── Meter (meters.ts) - Real-time meter readings
├── CollectionMetersHistory (embedded) - Historical collection data
├── Collection (collections.ts) - Financial collection records
└── CollectionReport (collectionReport.ts) - Aggregated financial reports
```

## Special Fields and Cross-References

### **locationReportId**
- **Usage**: Used by `@collection-report/` to query reports
- **Type**: `string`
- **Purpose**: Links collection reports to specific location reports

### **machineId**
- **Usage**: Used across multiple models for machine identification
- **Type**: `string`
- **Purpose**: Consistent machine identification across the system

### **serialNumber**
- **Usage**: Used in machines and collections for hardware identification
- **Type**: `string`
- **Purpose**: Physical machine identification

### **memberId**
- **Usage**: Used in machineSessions and acceptedBills for member identification
- **Type**: `string`
- **Purpose**: Consistent member identification across gaming sessions

### **sessionId**
- **Usage**: Used in machineSessions for session tracking
- **Type**: `string`
- **Purpose**: Unique session identification for gaming activities

### **relayId**
- **Usage**: Used in machines, members, and machineSessions for communication
- **Type**: `string`
- **Purpose**: Hardware communication identification

## Indexing Strategy

### Critical Indexes for Performance
- `GamingLocationsSchema.index({ "rel.licencee": 1, deletedAt: 1 })` - For licencee-based queries
- `memberSchema.index({ gamingLocation: 1, deletedAt: 1 })` - For location-based member queries
- `memberSchema.index({ username: 1 })` - For member username lookups
- `memberSchema.index({ "profile.email": 1 })` - For member email lookups
- `machineSessionSchema.index({ memberId: 1, startTime: -1 })` - For member-based session queries
- `machineSessionSchema.index({ machineId: 1, startTime: -1 })` - For machine-based session queries
- `machineEventSchema.index({ machine: 1, date: -1 })` - For machine-based event queries
- `machineEventSchema.index({ currentSession: 1, date: -1 })` - For session-based event queries
- `machineSchema.index({ gamingLocation: 1, deletedAt: 1 })` - For location-based machine queries
- `machineSchema.index({ serialNumber: 1 })` - For machine serial number lookups
- `machineSchema.index({ lastActivity: 1 })` - For machine activity tracking
- `machineSchema.index({ isSasMachine: 1 })` - For SAS machine filtering
- `MetersSchema.index({ location: 1, createdAt: 1 })` - For location-based meter queries
- `MetersSchema.index({ machine: 1, readAt: 1 })` - For machine-based meter queries
- `ActivityLogSchema.index({ timestamp: -1 })` - For chronological activity queries
- `ActivityLogSchema.index({ resource: 1, timestamp: -1 })` - For resource-based activity queries
- `ActivityLogSchema.index({ userId: 1, timestamp: -1 })` - For user-based activity queries

## Data Flow Patterns

### 1. **Member Gaming Flow**
```
Member → MachineSession → Machine → MachineEvent → Financial Tracking
```

### 2. **Real-time Data Flow**
```
Machine → Meter → Collection → CollectionReport
```

### 3. **Audit Trail Flow**
```
User Action → ActivityLog → Compliance Tracking
```

### 4. **Financial Flow**
```
Machine Meters → Collections → Collection Reports → Financial Analytics
```

### 5. **Operational Flow**
```
MovementRequest → Approval → Machine Relocation → Location Update
```

### 6. **Collection Flow**
```
Scheduler → Collection → CollectionReport → Financial Reconciliation
```

### 7. **Bill Validation Flow**
```
Member → Machine → AcceptedBill → Financial Tracking
```

## Relationship Constraints

### Referential Integrity
- All foreign key references use string IDs for consistency
- Soft deletes are implemented using `deletedAt` fields
- Cascade operations are handled at the application level

### Multi-tenancy
- All data is filtered by `licencee` at the application level
- No cross-tenant data access is possible
- Each licensee's data is completely isolated

## Query Patterns

### Common Query Patterns
1. **Licensee-based filtering**: All queries filter by `rel.licencee`
2. **Location-based aggregation**: Metrics aggregated by `gamingLocation`
3. **Member-based queries**: Session and activity data filtered by `memberId`
4. **Machine-based queries**: Events and meters filtered by `machine` or `machineId`
5. **Session-based queries**: Events filtered by `currentSession`
6. **Time-based queries**: Most queries include date range filtering
7. **Status-based filtering**: Active records filtered by `deletedAt: null`

### Performance Considerations
- Indexes are optimized for the most common query patterns
- Aggregation pipelines are used for complex reporting
- Soft deletes prevent data loss while maintaining performance
- Embedded documents (like `collectionMetersHistory`) reduce join complexity

## Model-Specific Relationships

### **Members Model (`members.ts`)**
- **Primary Key**: `_id` (username)
- **Location Relationship**: `gamingLocation` → `gaminglocations._id`
- **Session Relationship**: `_id` ← `machineSessions.memberId`
- **Bill Relationship**: `_id` ← `acceptedBills.member`
- **Current Session**: `currentSession` field tracks active session

### **Machines Model (`machines.ts`)**
- **Primary Key**: `_id`
- **Location Relationship**: `gamingLocation` → `gaminglocations._id`
- **Session Relationship**: `_id` ← `machineSessions.machineId`
- **Event Relationship**: `_id` ← `machineEvents.machine`
- **Meter Relationship**: `_id` ← `meters.machine`
- **Bill Relationship**: `_id` ← `acceptedBills.machine`
- **Collection Relationship**: `_id` ← `collections.machineId`
- **Embedded History**: `collectionMetersHistory` array for financial tracking
- **Collection Meters**: `collectionMeters` object with `metersIn` and `metersOut` for previous collection tracking
- **Collection Time**: `collectionTime` field for SAS time period calculation
- **Collector Denomination**: `collectorDenomination` field for collection report multiplier
- **Game Configuration**: `gameConfig` object for game-specific settings
  - `accountingDenomination`: Smallest currency unit for financial tracking
  - `theoreticalRtp`: Expected return-to-player percentage
  - `maxBet`: Maximum bet allowed per spin
  - `payTableId`: Specific pay table version
  - `progressiveGroup`: Progressive jackpot group assignment

### **MachineSessions Model (`machineSessions.ts`)**
- **Primary Key**: `_id`
- **Member Relationship**: `memberId` → `members._id`
- **Machine Relationship**: `machineId` → `machines._id`
- **Event Relationship**: `_id` ← `machineEvents.currentSession`
- **Meter Data**: Embedded `startMeters`, `endMeters`, `intermediateMeters`
- **Bill Data**: Embedded `startBillMeters`, `endBillMeters`
- **Collection Time**: `collectionTime` field used for SAS time period calculation
- **Collection Meters**: Embedded `collectionMeters` with `metersIn` and `metersOut` for previous collection tracking

### **MachineEvents Model (`machineEvents.ts`)**
- **Primary Key**: `_id`
- **Machine Relationship**: `machine` → `machines._id`
- **Session Relationship**: `currentSession` → `machineSessions._id`
- **Event Details**: `sequence` array for detailed event logging
- **Dual Linking**: Events are linked to both machines and sessions for comprehensive tracking

### **Collections Model (`collections.ts`)**
- **Primary Key**: `_id`
- **Machine Relationship**: `machineId` → `machines._id`
- **Location Relationship**: `location` → `gaminglocations._id`
- **Collector Relationship**: `collector` → `users._id`
- **Location Report Relationship**: `locationReportId` → `collectionReport.locationReportId`
- **Financial Data**: `sasMeters` and `movement` objects for financial calculations
- **SAS Metrics**: `sasMeters.drop`, `sasMeters.totalCancelledCredits`, `sasMeters.gross` calculated from meters collection
- **SAS Time Period**: `sasMeters.sasStartTime` from `machineSessions.collectionTime`, `sasMeters.sasEndTime` from current time
- **Movement Calculation**: `movement.metersIn` and `movement.metersOut` calculated as difference from previous collection

### **CollectionReport Model (`collectionReport.ts`)**
- **Primary Key**: `_id`
- **Location Relationship**: `location` → `gaminglocations._id`
- **Location Report Relationship**: `locationReportId` → `locationReports._id`
- **Financial Summary**: Aggregates data from multiple collections

### **Meters Model (`meters.ts`)**
- **Primary Key**: `_id`
- **Machine Relationship**: `machine` → `machines._id`
- **Location Relationship**: `location` → `gaminglocations._id`
- **Movement Data**: `movement` object for financial calculations

### **AcceptedBills Model (`acceptedBills.ts`)**
- **Primary Key**: `_id`
- **Machine Relationship**: `machine` → `machines._id`
- **Member Relationship**: `member` → `members._id`
- **Bill Value**: `value` field for denomination tracking 