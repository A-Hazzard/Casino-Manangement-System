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
│   │   └── AcceptedBill (acceptedBills.ts)
│   ├── Collection (collections.ts)
│   ├── CollectionReport (collectionReport.ts)
│   └── MovementRequest (movementrequests.ts)
├── User (user.ts)
│   └── ActivityLog (activityLog.ts)
└── Firmware (firmware.ts)
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

### 4. **MachineSession → MachineEvent**
- **Field**: `machine` in `machineEvents.ts` (linked via `machineId` in sessions)
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One MachineSession can have multiple MachineEvents)
- **Purpose**: Detailed event logging for each gaming session

### 5. **GamingLocation → Machine**
- **Field**: `gamingLocation` in `machines.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple Machines)
- **Purpose**: Each casino location contains multiple slot machines/cabinets

### 6. **Machine → Meter**
- **Field**: `location` in `meters.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One Machine can have multiple Meters)
- **Purpose**: Real-time meter readings from slot machines for financial tracking

### 7. **Machine → MachineEvent**
- **Field**: `machine` in `machineEvents.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One Machine can have multiple MachineEvents)
- **Purpose**: Logging of machine events, commands, and communication

### 8. **Machine → AcceptedBill**
- **Field**: `machine` in `acceptedBills.ts`
- **Type**: `string` (references `machines._id`)
- **Relationship**: One-to-Many (One Machine can have multiple AcceptedBills)
- **Purpose**: Tracking bill validator denominations accepted by each machine

### 9. **GamingLocation → Collection**
- **Field**: `location` in `collections.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple Collections)
- **Purpose**: Financial collection records from each location

### 10. **GamingLocation → CollectionReport**
- **Field**: `location` in `collectionReport.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: One-to-Many (One GamingLocation can have multiple CollectionReports)
- **Purpose**: Aggregated collection summaries and variance tracking

### 11. **GamingLocation → MovementRequest**
- **Fields**: `locationFrom`, `locationTo`, `locationId` in `movementrequests.ts`
- **Type**: `string` (references `gaminglocations._id`)
- **Relationship**: Many-to-Many (Movement requests between locations)
- **Purpose**: Cabinet movement requests between different casino locations

### 12. **User → Collection**
- **Field**: `collector` in `collections.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can be a collector for multiple Collections)
- **Purpose**: Tracking which user performed each collection

### 13. **User → ActivityLog**
- **Field**: `actor.id` in `activityLog.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can generate multiple ActivityLogs)
- **Purpose**: Audit trail of all user actions in the system

### 14. **User → MovementRequest**
- **Fields**: `createdBy`, `approvedBy`, `approvedBySecond` in `movementrequests.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can create/approve multiple MovementRequests)
- **Purpose**: Tracking who created and approved movement requests

### 15. **User → Scheduler**
- **Fields**: `creator`, `collector` in `scheduler.ts`
- **Type**: `string` (references `user._id`)
- **Relationship**: One-to-Many (One User can create multiple Schedules)
- **Purpose**: Collection scheduling and assignment

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

## Indexing Strategy

### Critical Indexes for Performance
- `GamingLocationsSchema.index({ "rel.licencee": 1, deletedAt: 1 })` - For licencee-based queries
- `memberSchema.index({ gamingLocation: 1, deletedAt: 1 })` - For location-based member queries
- `machineSessionSchema.index({ memberId: 1, startTime: -1 })` - For member-based session queries
- `machineSessionSchema.index({ machineId: 1, startTime: -1 })` - For machine-based session queries
- `machineEventSchema.index({ machine: 1, date: -1 })` - For machine-based event queries
- `machineSchema.index({ gamingLocation: 1, deletedAt: 1 })` - For location-based machine queries
- `MetersSchema.index({ location: 1, createdAt: 1 })` - For location-based meter queries
- `ActivityLogSchema.index({ timestamp: -1 })` - For chronological activity queries

## Data Flow Patterns

### 1. **Member Gaming Flow**
```
Member → MachineSession → MachineEvent → Financial Tracking
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
4. **Time-based queries**: Most queries include date range filtering
5. **Status-based filtering**: Active records filtered by `deletedAt: null`

### Performance Considerations
- Indexes are optimized for the most common query patterns
- Aggregation pipelines are used for complex reporting
- Soft deletes prevent data loss while maintaining performance 