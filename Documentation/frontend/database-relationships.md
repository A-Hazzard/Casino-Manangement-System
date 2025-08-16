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

### 5. **MachineSession → MachineEvent**
- **Field**: `machine` in `machineEvents.ts` (linked via `machineId` in sessions)
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One MachineSession can have multiple MachineEvents)
- **Purpose**: Detailed event logging for each gaming session

### 6. **Member → AcceptedBill**
- **Field**: `member` in `acceptedBills.ts`
- **Type**: `string` (references `members._id`)
- **Relationship**: One-to-Many (One Member can have multiple AcceptedBills)
- **Purpose**: Tracking bill validator denominations accepted by each member

### 7. **GamingLocation → Machine**
- **Field**: `gamingLocation` in `machines.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple Machines)
- **Purpose**: Each casino location contains multiple slot machines/cabinets

### 8. **Machine → Meter**
- **Field**: `machine` in `meters.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One Machine can have multiple Meters)
- **Purpose**: Real-time meter readings from slot machines for financial tracking

### 9. **Machine → MachineEvent**
- **Field**: `machine` in `machineEvents.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One Machine can have multiple MachineEvents)
- **Purpose**: Logging of machine events, commands, and communication

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

## Member Gaming Flow Relationships

### **Core Gaming Flow: Member → Machine → Session → Events**
```
Member (members.ts)
├── MachineSession (machineSessions.ts) - Links member to machine during gaming
│   ├── Machine (machines.ts) - The physical slot machine being used
│   └── MachineEvent (machineEvents.ts) - Detailed events during the session
└── AcceptedBill (acceptedBills.ts) - Bills accepted by the member
```

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
5. **Time-based queries**: Most queries include date range filtering
6. **Status-based filtering**: Active records filtered by `deletedAt: null`

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
- **Embedded History**: `collectionMetersHistory` array for financial tracking

### **MachineSessions Model (`machineSessions.ts`)**
- **Primary Key**: `_id`
- **Member Relationship**: `memberId` → `members._id`
- **Machine Relationship**: `machineId` → `machines._id`
- **Event Relationship**: `machineId` → `machineEvents.machine`
- **Meter Data**: Embedded `startMeters`, `endMeters`, `intermediateMeters`
- **Bill Data**: Embedded `startBillMeters`, `endBillMeters`

### **MachineEvents Model (`machineEvents.ts`)**
- **Primary Key**: `_id`
- **Machine Relationship**: `machine` → `machines._id`
- **Session Relationship**: Linked via `machineId` in sessions
- **Event Details**: `sequence` array for detailed event logging

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