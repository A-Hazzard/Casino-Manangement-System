# Test Plan for main.go - Evolution1 CMS Database Testing Tool

**Author:** Aaron Hazzard - Senior Software Engineer  
**Date:** January 2025

## Overview
This test plan outlines comprehensive testing scenarios for the `main.go` tool to validate database queries and data integrity across all major pages and features of the Evolution1 CMS system.

## Test Categories

### 1. **Dashboard Page Tests** (`/`)
**Purpose:** Validate dashboard metrics and real-time data

#### 1.1 Dashboard Global Stats Test
**Test ID:** `DASH-001`  
**Description:** Test dashboard global statistics aggregation  
**API Endpoint:** `/api/analytics/dashboard`  
**Database Collections:** `machines`, `gaminglocations`, `meters`  
**Test Scenarios:**
- Verify total drop calculation across all machines
- Validate cancelled credits aggregation
- Check gross revenue calculation (drop - cancelled credits)
- Confirm machine counts (total, online, SAS)
- Test licensee filtering

**Query to Test:**
```javascript
// Test global stats pipeline
db.machines.aggregate([
  {
    $lookup: {
      from: "gaminglocations",
      localField: "gamingLocation",
      foreignField: "_id",
      as: "locationDetails"
    }
  },
  { $unwind: "$locationDetails" },
  {
    $match: {
      "locationDetails.rel.licencee": "specific_licensee"
    }
  },
  {
    $group: {
      _id: null,
      totalDrop: { $sum: { $ifNull: ["$sasMeters.drop", 0] } },
      totalCancelledCredits: { $sum: { $ifNull: ["$sasMeters.totalCancelledCredits", 0] } },
      totalGross: { $sum: { $subtract: [{ $ifNull: ["$sasMeters.drop", 0] }, { $ifNull: ["$sasMeters.totalCancelledCredits", 0] }] } },
      totalMachines: { $sum: 1 },
      onlineMachines: { $sum: { $cond: [{ $eq: ["$assetStatus", "active"] }, 1, 0] } },
      sasMachines: { $sum: { $cond: ["$isSasMachine", 1, 0] } }
    }
  }
])
```

#### 1.2 Top Performing Machines Test
**Test ID:** `DASH-002`  
**Description:** Test top performing machines aggregation  
**API Endpoint:** `/api/analytics/top-machines`  
**Test Scenarios:**
- Verify top 5 machines by revenue
- Check machine status filtering
- Validate date range filtering
- Test licensee-specific results

#### 1.3 Gaming Locations Map Test
**Test ID:** `DASH-003`  
**Description:** Test location data for map display  
**API Endpoint:** `/api/locationAggregation`  
**Test Scenarios:**
- Verify location coordinates
- Check location counts by licensee
- Validate location status filtering
- Test geographic distribution

### 2. **Locations Page Tests** (`/locations`)
**Purpose:** Validate location management and aggregation

#### 2.1 Location Aggregation Test
**Test ID:** `LOC-001`  
**Description:** Test location aggregation with financial metrics  
**API Endpoint:** `/api/locationAggregation`  
**Database Collections:** `gaminglocations`, `machines`, `meters`  
**Test Scenarios:**
- Verify location list with financial data
- Test time period filtering (today, yesterday, 7d, 30d, custom)
- Validate licensee filtering
- Check machine type filtering (SAS vs non-SAS)
- Test pagination

**Query to Test:**
```javascript
// Test location aggregation pipeline
db.gaminglocations.aggregate([
  {
    $match: {
      deletedAt: { $in: [null, new Date(-1)] }
    }
  },
  {
    $lookup: {
      from: "machines",
      localField: "_id",
      foreignField: "gamingLocation",
      as: "machines"
    }
  },
  { $unwind: { path: "$machines", preserveNullAndEmptyArrays: false } },
  {
    $lookup: {
      from: "meters",
      let: { serial: "$machines.serialNumber" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$machine", "$$serial"] },
                { $gte: ["$readAt", startDate] },
                { $lte: ["$readAt", endDate] }
              ]
            }
          }
        }
      ],
      as: "meterData"
    }
  },
  {
    $group: {
      _id: "$_id",
      locationName: { $first: "$name" },
      totalMachines: { $sum: 1 },
      sasMachines: { $sum: { $cond: ["$machines.isSasMachine", 1, 0] } },
      moneyIn: { $sum: { $add: [{ $ifNull: ["$meterData.movement.coinIn", 0] }, { $ifNull: ["$meterData.movement.drop", 0] }] } },
      moneyOut: { $sum: { $ifNull: ["$meterData.movement.totalCancelledCredits", 0] } },
      gross: { $sum: { $subtract: [{ $add: [{ $ifNull: ["$meterData.movement.coinIn", 0] }, { $ifNull: ["$meterData.movement.drop", 0] }] }, { $ifNull: ["$meterData.movement.totalCancelledCredits", 0] }] } }
    }
  }
])
```

#### 2.2 Location Search Test
**Test ID:** `LOC-002`  
**Description:** Test location search functionality  
**API Endpoint:** `/api/locations/search-all`  
**Test Scenarios:**
- Verify search by location name
- Test partial name matching
- Validate licensee filtering in search
- Check search result formatting

#### 2.3 Machine Stats Test
**Test ID:** `LOC-003`  
**Description:** Test machine statistics for locations page  
**API Endpoint:** `/api/analytics/machines/stats`  
**Test Scenarios:**
- Verify total machine counts
- Check online/offline machine counts
- Test licensee filtering
- Validate real-time status updates

### 3. **Cabinets Page Tests** (`/cabinets`)
**Purpose:** Validate cabinet management and performance data

#### 3.1 Cabinet Aggregation Test
**Test ID:** `CAB-001`  
**Description:** Test cabinet aggregation with financial metrics  
**API Endpoint:** `/api/machines/aggregation`  
**Database Collections:** `machines`, `meters`  
**Test Scenarios:**
- Verify cabinet list with financial data
- Test time period filtering
- Validate licensee filtering
- Check location filtering
- Test search functionality

**Query to Test:**
```javascript
// Test cabinet aggregation pipeline
db.machines.aggregate([
  {
    $match: {
      deletedAt: { $in: [null, new Date(-1)] }
    }
  },
  {
    $lookup: {
      from: "meters",
      let: { serial: "$serialNumber" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$machine", "$$serial"] },
                { $gte: ["$readAt", startDate] },
                { $lte: ["$readAt", endDate] }
              ]
            }
          }
        }
      ],
      as: "meterData"
    }
  },
  {
    $group: {
      _id: "$_id",
      serialNumber: { $first: "$serialNumber" },
      game: { $first: "$game" },
      locationId: { $first: "$gamingLocation" },
      moneyIn: { $sum: { $add: [{ $ifNull: ["$meterData.movement.coinIn", 0] }, { $ifNull: ["$meterData.movement.drop", 0] }] } },
      moneyOut: { $sum: { $ifNull: ["$meterData.movement.totalCancelledCredits", 0] } },
      gross: { $sum: { $subtract: [{ $add: [{ $ifNull: ["$meterData.movement.coinIn", 0] }, { $ifNull: ["$meterData.movement.drop", 0] }] }, { $ifNull: ["$meterData.movement.totalCancelledCredits", 0] }] } }
    }
  }
])
```

#### 3.2 Cabinet Details Test
**Test ID:** `CAB-002`  
**Description:** Test individual cabinet details  
**API Endpoint:** `/api/machines/[id]`  
**Test Scenarios:**
- Verify cabinet configuration data
- Check SMIB settings
- Validate meter history
- Test firmware information

#### 3.3 Cabinet Events Test
**Test ID:** `CAB-003`  
**Description:** Test cabinet event logging  
**API Endpoint:** `/api/machines/[id]/events`  
**Test Scenarios:**
- Verify event history
- Check event types and data
- Test pagination
- Validate event timestamps

### 4. **Location Details Page Tests** (`/locations/[slug]`)
**Purpose:** Validate location-specific cabinet management

#### 4.1 Location Cabinets Test
**Test ID:** `LOC-DET-001`  
**Description:** Test cabinets for specific location  
**API Endpoint:** `/api/locations/[locationId]`  
**Test Scenarios:**
- Verify cabinets at specific location
- Test time period filtering
- Validate licensee filtering
- Check search functionality

#### 4.2 Location Details Test
**Test ID:** `LOC-DET-002`  
**Description:** Test location information  
**API Endpoint:** `/api/locations/[locationId]`  
**Test Scenarios:**
- Verify location metadata
- Check geographic coordinates
- Validate licensee information
- Test location status

### 5. **Reports Page Tests** (`/reports`)
**Purpose:** Validate comprehensive reporting functionality

#### 5.1 Reports Aggregation Test
**Test ID:** `REP-001`  
**Description:** Test reports data aggregation  
**API Endpoint:** `/api/analytics/reports`  
**Test Scenarios:**
- Verify report generation
- Test different report types
- Validate date range filtering
- Check export functionality

#### 5.2 Analytics Charts Test
**Test ID:** `REP-002`  
**Description:** Test chart data generation  
**API Endpoint:** `/api/analytics/charts`  
**Test Scenarios:**
- Verify chart data structure
- Test different chart types
- Validate data aggregation
- Check real-time updates

### 6. **Collection Report Tests** (`/collection-report`)
**Purpose:** Validate collection reporting functionality

#### 6.1 Collection Data Test
**Test ID:** `COL-001`  
**Description:** Test collection data aggregation  
**API Endpoint:** `/api/collectionReport`  
**Test Scenarios:**
- Verify collection metrics
- Test date range filtering
- Validate location filtering
- Check financial calculations

### 7. **Members Page Tests** (`/members`)
**Purpose:** Validate member management functionality

#### 7.1 Member Data Test
**Test ID:** `MEM-001`  
**Description:** Test member data retrieval  
**API Endpoint:** `/api/members`  
**Test Scenarios:**
- Verify member list
- Test search functionality
- Validate pagination
- Check member details

#### 7.2 Member Sessions Test
**Test ID:** `MEM-002`  
**Description:** Test member session history  
**API Endpoint:** `/api/members/[id]/sessions`  
**Test Scenarios:**
- Verify session data
- Test date filtering
- Validate machine associations
- Check session events

### 8. **Sessions Page Tests** (`/sessions`)
**Purpose:** Validate session management functionality

#### 8.1 Session Data Test
**Test ID:** `SES-001`  
**Description:** Test session data retrieval  
**API Endpoint:** `/api/sessions`  
**Test Scenarios:**
- Verify session list
- Test filtering options
- Validate pagination
- Check session details

#### 8.2 Session Events Test
**Test ID:** `SES-002`  
**Description:** Test session event data  
**API Endpoint:** `/api/sessions/[sessionId]/[machineId]/events`  
**Test Scenarios:**
- Verify event data
- Test event types
- Validate timestamps
- Check event details

## Test Implementation Plan

### Phase 1: Core Data Validation
1. **Database Connection Tests**
   - Test MongoDB connection
   - Verify collection access
   - Check data integrity

2. **Basic Query Tests**
   - Test simple find operations
   - Verify aggregation pipelines
   - Check data formatting

### Phase 2: Page-Specific Tests
1. **Dashboard Tests** (DASH-001 to DASH-003)
2. **Locations Tests** (LOC-001 to LOC-003)
3. **Cabinets Tests** (CAB-001 to CAB-003)

### Phase 3: Advanced Functionality Tests
1. **Location Details Tests** (LOC-DET-001 to LOC-DET-002)
2. **Reports Tests** (REP-001 to REP-002)
3. **Collection Tests** (COL-001)

### Phase 4: User Management Tests
1. **Members Tests** (MEM-001 to MEM-002)
2. **Sessions Tests** (SES-001 to SES-002)

## Test Data Requirements

### Sample Data Sets
1. **Test Licensees**
   - Multiple licensee records
   - Different licensee configurations

2. **Test Locations**
   - Various location types
   - Different geographic coordinates
   - Mixed SAS/non-SAS configurations

3. **Test Machines**
   - Different machine types
   - Various status configurations
   - Mixed financial performance

4. **Test Meter Data**
   - Historical meter readings
   - Various financial scenarios
   - Different time periods

### Data Validation Rules
1. **Financial Calculations**
   - Money In = coinIn + drop
   - Money Out = totalCancelledCredits
   - Gross = Money In - Money Out

2. **Machine Status**
   - Online: lastActivity within 3 minutes
   - Offline: lastActivity > 3 minutes ago

3. **Date Handling**
   - All dates in UTC
   - Trinidad timezone conversion (UTC-4)
   - Proper date range filtering

## Expected Test Outcomes

### Success Criteria
1. **Data Accuracy**
   - All financial calculations match expected formulas
   - Machine counts are accurate
   - Date filtering works correctly

2. **Performance**
   - Queries complete within reasonable time (< 30 seconds)
   - No timeout errors
   - Efficient use of database indexes

3. **Data Integrity**
   - No missing or corrupted data
   - Proper relationships between collections
   - Consistent data formats

### Error Handling
1. **Connection Issues**
   - Graceful handling of database connection failures
   - Clear error messages
   - Retry mechanisms

2. **Data Issues**
   - Handling of missing data
   - Validation of data formats
   - Fallback values for null data

3. **Query Issues**
   - Timeout handling
   - Memory usage optimization
   - Query optimization suggestions

## Implementation Notes

### Query Optimization
1. **Index Usage**
   - Ensure proper indexes exist
   - Monitor query performance
   - Optimize slow queries

2. **Aggregation Pipeline**
   - Use efficient pipeline stages
   - Minimize data transfer
   - Optimize memory usage

### Testing Environment
1. **Database Setup**
   - Use test database
   - Populate with realistic data
   - Maintain data consistency

2. **Monitoring**
   - Track query performance
   - Monitor resource usage
   - Log test results

This comprehensive test plan ensures that the `main.go` tool can validate all major functionality of the Evolution1 CMS system and help identify any data or query issues.
