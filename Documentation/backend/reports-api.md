# Reports API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

**Last Updated:** November 22, 2025  
**Version:** 2.1.0

## Recent Performance Optimizations (November 11th, 2025) 🚀

### Dashboard API - Parallel Licensee Processing

**API:** `GET /api/dashboard/totals`

**Optimization:**
- Process ALL licensees in PARALLEL instead of sequentially
- Uses `Promise.all()` for concurrent queries

**Performance:**
- Before: 14.94s for 30d (sequential processing)
- After: 5.20s for 30d (65% faster!)

**Implementation:** `app/api/dashboard/totals/route.ts`

### Locations API - Adaptive Batching & Optimization

**API:** `GET /api/reports/locations`

**Optimizations:**
1. Adaptive batch sizing (50 for 7d/30d, 20 for Today/Yesterday)
2. Optimized field projection (only essential fields before grouping)
3. Parallel batch processing for location data

**Performance:**
- Before: TIMEOUT for 7d/30d (>60s)
- After: 3.61s for 7d, 9.23s for 30d (FIXED!)

**Implementation:** `app/api/reports/locations/route.ts`

### Cabinets API - Single Aggregation

**API:** `GET /api/machines/aggregation`

**Optimization:**
- Single aggregation for ALL machines (7d/30d periods)
- Index hints to force optimal index usage
- Projection before grouping to reduce memory

**Performance:**
- Before: TIMEOUT for all periods (>60s)
- After: 6-7s for Today/Yesterday/7d (FIXED!)

**Implementation:** `app/api/machines/aggregation/route.ts`

---

## Quick Search Guide

- **Location Aggregation**: `GET /api/locationAggregation` - Location metrics and analytics
- **Meters Report**: `GET /api/reports/meters` - Machine meter readings
- **Machine Reports**: `GET /api/reports/machines` - Machine performance reports
- **Location Reports**: `GET /api/reports/locations` - Location performance reports
- **Daily Counts**: `GET /api/reports/daily-counts` - Daily count reports
- **SAS Evaluation**: `sasEvaluationOnly=true` - Filter for SAS locations only
- **Financial Data**: Default shows all locations with financial data

**Last Updated:** November 27, 2025  
**Version:** 2.1.0

## Table of Contents

1. [Overview](#overview)
2. [Base URLs](#base-urls)
3. [Core Endpoints](#core-endpoints)
4. [Data Models](#data-models)
5. [Business Logic](#business-logic)
6. [Error Handling](#error-handling)
7. [Security Features](#security-features)
8. [Performance Considerations](#performance-considerations)

## Overview

The Reports API provides comprehensive data aggregation and analytics capabilities for the Evolution One CMS system. It handles location aggregation, machine performance analysis, financial reporting, and SAS machine determination with advanced filtering and real-time analytics.

### System Architecture

- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Timezone**: Trinidad time (UTC-4) with gaming day logic
- **Caching**: In-memory caching with 5-minute TTL

## Location Aggregation API

### GET `/api/locationAggregation`

**Purpose**: Aggregates location-level metrics including machine counts, SAS status, and financial data

**How Money In, Money Out, and Gross Are Calculated:**

The Location Aggregation API calculates financial metrics by aggregating meter data from the `meters` collection. The process:

1. **Location Processing**: For each accessible location (filtered by user permissions and licensee):
   - Fetches all machines at that location from `machines` collection
   - Calculates gaming day range based on location's `gameDayOffset`
   - Queries `meters` collection for all meter readings matching:
     - `machine` field matches any machine ID at the location
     - `readAt` timestamp within the location's gaming day range

2. **Meter Aggregation** (in `app/api/lib/helpers/locationAggregation.ts`):
   ```javascript
   // Aggregate meters for all machines at location
   const metersAggregation = await db.collection('meters').aggregate([
     {
       $match: {
         machine: { $in: machineIds }, // All machine IDs for this location
         readAt: {
           $gte: gamingDayRange.rangeStart,
           $lte: gamingDayRange.rangeEnd,
         },
       },
     },
     {
       $group: {
         _id: null,
         totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
         totalMoneyOut: {
           $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
         },
       },
     },
   ]);
   
   // Calculate gross
   gross: meterMetrics.totalDrop - meterMetrics.totalMoneyOut
   ```

3. **Response**: Returns location objects with:
   - `moneyIn`: Sum of `movement.drop` from all meters for all machines at location
   - `moneyOut`: Sum of `movement.totalCancelledCredits` from all meters for all machines at location
   - `gross`: `moneyIn - moneyOut`

**Key Points:**
- Uses **sum of deltas** method: Sums all `movement.drop` and `movement.totalCancelledCredits` values from meter readings
- Respects **gaming day offset** per location when calculating date ranges
- Filters by **user permissions** and **licensee** before aggregating
- Processes locations in **parallel** for performance

**Query Parameters:**

- `timePeriod` - "Today", "Yesterday", "7d", "30d", "All Time", "Custom"
- `startDate` - Custom start date (ISO format)
- `endDate` - Custom end date (ISO format)
- `licencee` - Filter by licensee
- `machineTypeFilter` - "LocalServersOnly", "SMIBLocationsOnly", "NoSMIBLocation"
- `showAllLocations` - Include locations without metrics
- `basicList` - If false, returns all locations with financial data
- `page` - Pagination page number
- `limit` - Items per page
- `clearCache` - Clear cache for testing
- `sasEvaluationOnly` - Filter for SAS locations only
- `selectedLocations` - Array of location IDs to filter by

**Response Fields:**

```json
{
  "data": [
    {
      "location": "location_id", // Location ID
      "locationName": "Downtown Casino", // Location name
      "moneyIn": 150000, // Total drop amount
      "moneyOut": 5000, // Total cancelled credits
      "gross": 145000, // Net revenue (moneyIn - moneyOut)
      "totalMachines": 100, // Total machines at location
      "onlineMachines": 95, // Machines online (lastActivity < 3 min ago)
      "sasMachines": 80, // Count of SAS machines (isSasMachine = true)
      "nonSasMachines": 20, // Count of non-SAS machines (isSasMachine = false)
      "hasSasMachines": true, // Derived: sasMachines > 0
      "hasNonSasMachines": true, // Derived: nonSasMachines > 0
      "isLocalServer": false, // Location server type
      "noSMIBLocation": false, // Backward compatibility: !hasSasMachines
      "hasSmib": true // Backward compatibility: hasSasMachines
    }
  ],
  "totalCount": 1,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

### Default All Locations Behavior

**Purpose**: The API defaults to showing all locations with financial data before any location selection

**Implementation Logic:**

### Key Features

- **Location Aggregation**: Comprehensive location-level metrics and analytics
- **Machine Performance**: Detailed machine performance analysis and reporting
- **Financial Analytics**: Revenue analysis and financial performance tracking
- **SAS Integration**: SAS machine determination and evaluation
- **Advanced Filtering**: Time-based and location-based filtering capabilities

### System Integration

- **Dashboard Analytics**: Real-time data for dashboard components
- **Collection Systems**: Integration with collection and reporting systems
- **Location Management**: Connection to location and machine management
- **Financial Systems**: Seamless integration with financial calculations

## Base URLs

```
/api/locationAggregation
/api/reports
/api/analytics
```

## Core Endpoints

### 1. Location Aggregation API

**Endpoint:** `GET /api/locationAggregation`

#### Purpose

Aggregates location-level metrics including machine counts, SAS status, and financial data. Defaults to showing all locations with financial data before any location selection.

#### Query Parameters

```typescript
type LocationAggregationParams = {
  timePeriod?: TimePeriod; // "Today", "Yesterday", "7d", "30d", "All Time"
  startDate?: string; // ISO date string for custom range
  endDate?: string; // ISO date string for custom range
  licencee?: string; // Filter by licensee
  machineTypeFilter?: LocationFilter; // "LocalServersOnly", "SMIBLocationsOnly", "NoSMIBLocation"
  showAllLocations?: boolean; // Include locations without metrics
  basicList?: boolean; // If false, returns all locations with financial data
  page?: number; // Pagination page number
  limit?: number; // Items per page
  clearCache?: boolean; // Clear cache for testing
  sasEvaluationOnly?: boolean; // Filter for SAS locations only
  selectedLocations?: string[]; // Array of location IDs to filter by
};
```

#### Response Structure

```typescript
type LocationAggregationResponse = {
  data: AggregatedLocation[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
```

#### Aggregated Location Data

```typescript
type AggregatedLocation = {
  location: string; // Location ID
  locationName: string; // Location name
  moneyIn: number; // Total drop amount
  moneyOut: number; // Total cancelled credits
  gross: number; // Net revenue (moneyIn - moneyOut)
  totalMachines: number; // Total machines at location
  onlineMachines: number; // Machines online (lastActivity < 3 min ago)
  sasMachines: number; // Count of SAS machines (isSasMachine = true)
  nonSasMachines: number; // Count of non-SAS machines (isSasMachine = false)
  hasSasMachines: boolean; // Derived: sasMachines > 0
  hasNonSasMachines: boolean; // Derived: nonSasMachines > 0
  isLocalServer: boolean; // Location server type
  noSMIBLocation: boolean; // Backward compatibility: !hasSasMachines
  hasSmib: boolean; // Backward compatibility: hasSasMachines
};
```

### 2. Default All Locations Behavior

#### Purpose

The API now defaults to showing all locations with financial data before any location selection, providing a better user experience for the SAS Evaluation and Revenue Analysis tabs.

#### Implementation Logic

```typescript
// Default behavior: Show all locations with financial data
if (!basicList && !selectedLocations) {
  // Return all locations that have financial data (gross > 0 or moneyIn > 0)
  // This provides immediate value to users before they select specific locations
}

// When locations are selected, filter to only those locations
if (selectedLocations && selectedLocations.length > 0) {
  // Filter aggregation to only include selected location IDs
  const locationFilter = { _id: { $in: selectedLocations } };
}
```

## SAS Machine Determination Logic

### Machine-Level SAS Status

Each machine in the database has an `isSasMachine` field that determines its SAS status:

**Database Fields:**

```typescript
{
  _id: string; // Machine identifier
  gamingLocation: string; // Reference to location
  isSasMachine: boolean; // true = SAS machine, false = non-SAS machine
  lastActivity: Date; // Last activity timestamp
  deletedAt: Date | null; // Soft delete flag
}
```

### Location-Level SAS Aggregation

The aggregation pipeline calculates SAS metrics for each location:

**MongoDB Aggregation:**

````javascript

#### Frontend Integration
- **SAS Evaluation Tab**: Shows all SAS locations with financial data by default
- **Revenue Analysis Tab**: Shows all locations with financial data by default
- **Location Selection**: When locations are selected, data is filtered to only those locations
- **User Experience**: Users see data immediately without needing to make selections first

### 3. SAS Machine Determination Logic

#### Machine-Level SAS Status
Each machine in the database has an `isSasMachine` field that determines its SAS status:

```typescript
type Machine = {
  _id: string;
  gamingLocation: string;            // Reference to location
  isSasMachine: boolean;             // true = SAS machine, false = non-SAS machine
  lastActivity: Date;                // Last activity timestamp
  deletedAt: Date | null;            // Soft delete flag
  // ... other machine fields
}
````

#### Location-Level SAS Aggregation

The aggregation pipeline calculates SAS metrics for each location:

```javascript
// MongoDB aggregation pipeline for machine lookup
{
  $lookup: {
    from: "machines",
    let: { locationId: "$_id" },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ["$gamingLocation", "$$locationId"] },
          deletedAt: { $in: [null, new Date(-1)] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          online: {
            $sum: {
              $cond: [
                { $gte: ["$lastActivity", onlineThreshold] },
                1,
                0
              ]
            }
          },
          sasMachines: { $sum: { $cond: ["$isSasMachine", 1, 0] } },
          nonSasMachines: { $sum: { $cond: [{ $eq: ["$isSasMachine", false] }, 1, 0] } }
        }
      }
    ],
    as: "machineData"
  }
}
```

### SAS Evaluation Filtering

**Purpose**: When `sasEvaluationOnly=true` is passed, the API filters locations to only include those with SAS machines

**MongoDB Pipeline Filter:**

````javascript

### 4. SAS Evaluation Filtering

#### Purpose
When `sasEvaluationOnly=true` is passed, the API filters locations to only include those with SAS machines, implementing the filtering at the database level for optimal performance.

#### MongoDB Pipeline Filter
```javascript
// Additional pipeline stage for SAS evaluation filtering
{
  $match: {
    sasMachines: { $gt: 0 }  // Only locations with SAS machines
  }
}
````

## Trinidad Timezone Support

### Date Calculation Functions

#### Usage

- **SAS Evaluation Tab**: Frontend passes `sasEvaluationOnly=true` to get only SAS-enabled locations
- **Revenue Analysis Tab**: No filtering applied, returns all locations
- **Performance**: Database-level filtering is more efficient than frontend filtering

#### SAS Calculation Logic

1. **Machine Filtering**: Only include non-deleted machines (`deletedAt` is null or -1)
2. **SAS Count**: Count machines where `isSasMachine = true`
3. **Non-SAS Count**: Count machines where `isSasMachine = false`
4. **Online Status**: Machine is online if `lastActivity` is within 3 minutes
5. **Location SAS Status**: Location has SAS if `sasMachines > 0`

### 5. Trinidad Timezone Support

#### Date Calculation Functions

**File:** `app/api/lib/utils/dates.ts`

The API includes Trinidad timezone support (UTC-4) for accurate date calculations:

```typescript
// Helper function to get start of day in Trinidad time (4 AM UTC)
const getStartOfDayTrinidad = (date: Date): Date => {
  // Set to 4 AM UTC which is midnight Trinidad time (UTC-4)
  return new Date(date.setHours(4, 0, 0, 0));
};

// Helper function to get end of day in Trinidad time
const getEndOfDayTrinidad = (date: Date): Date => {
  // Set to 3:59:59.999 AM UTC next day which is 11:59:59.999 PM Trinidad time
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return new Date(nextDay.setHours(3, 59, 59, 999));
};
```

### Time Period Calculations

#### Time Period Calculations

```typescript
// Date range calculations with Trinidad timezone
switch (timePeriod) {
  case 'Today':
    startDate = getStartOfDayTrinidad(new Date());
    endDate = getEndOfDayTrinidad(new Date());
    break;
  case 'Yesterday':
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    startDate = getStartOfDayTrinidad(yesterday);
    endDate = getEndOfDayTrinidad(yesterday);
    break;
  case '7d':
    startDate = getStartOfDayTrinidad(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    endDate = getEndOfDayTrinidad(new Date());
    break;
  case '30d':
    startDate = getStartOfDayTrinidad(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    endDate = getEndOfDayTrinidad(new Date());
    break;
  case 'All Time':
    startDate = null;
    endDate = null;
    break;
}
```

## Machines Aggregation API

### GET `/api/machines/aggregation`

**Purpose**: Aggregates machine-level metrics across accessible locations with filtering

**How Money In, Money Out, and Gross Are Calculated:**

The Machines Aggregation API calculates financial metrics per machine by aggregating meter data. The process:

1. **Location Processing**: 
   - Fetches all accessible locations (respects user permissions and licensee filter)
   - Calculates gaming day range for each location based on location's `gameDayOffset`
   - Gets all machines for accessible locations from `machines` collection

2. **Optimized Aggregation Strategies** (in `app/api/machines/aggregation/route.ts`):
   
   **For 7d/30d periods** (Single Aggregation - Faster):
   ```javascript
   // Groups machines by location, then aggregates meters per location
   // Single aggregation query for all machines
   {
     $match: {
       machine: { $in: machineIds }, // All machine IDs for all locations
       readAt: {
         $gte: gameDayRange.rangeStart,
         $lte: gameDayRange.rangeEnd,
       },
     },
   },
   {
     $project: {
       machine: 1,
       drop: '$movement.drop',
       totalCancelledCredits: '$movement.totalCancelledCredits',
     },
   },
   {
     $group: {
       _id: '$machine',
       moneyIn: { $sum: '$drop' },
       moneyOut: { $sum: '$totalCancelledCredits' },
     },
   }
   ```
   
   **For Today/Yesterday** (Batch Processing - Optimized):
   ```javascript
   // Processes locations in parallel batches of 20
   // Aggregates meters per location batch
   {
     $match: {
       machine: { $in: machineIds }, // Machine IDs for this location batch
       readAt: {
         $gte: gameDayRange.rangeStart,
         $lte: gameDayRange.rangeEnd,
       },
     },
   },
   {
     $group: {
       _id: '$machine',
       moneyIn: { $sum: '$movement.drop' },
       moneyOut: { $sum: '$movement.totalCancelledCredits' },
     },
   }
   ```

3. **Per-Machine Calculation**:
   ```javascript
   const moneyIn = metrics.moneyIn || 0;
   const moneyOut = metrics.moneyOut || 0;
   const gross = moneyIn - moneyOut;
   ```

4. **Response**: Returns array of machines with:
   - `moneyIn`: Sum of `movement.drop` from all meters for that machine
   - `moneyOut`: Sum of `movement.totalCancelledCredits` from all meters for that machine
   - `gross`: `moneyIn - moneyOut`

**Key Points:**
- Uses **sum of deltas** method: Sums all `movement.drop` and `movement.totalCancelledCredits` values per machine
- Respects **gaming day offset** per location when calculating date ranges
- **Performance optimized**: Single aggregation for 7d/30d, batch processing for Today/Yesterday
- Groups by machine ID to get per-machine totals

## Data Aggregation Pipeline

### Location Metrics Aggregation

### 6. Data Aggregation Pipeline

#### Location Metrics Aggregation

```javascript
// Main aggregation pipeline with simplified two-phase approach
const locationPipeline = [
  // 1. Match locations (non-deleted, optional licensee filter)
  {
    $match: {
      deletedAt: { $in: [null, new Date(-1)] },
      ...(licenseeLocationIds && licenseeLocationIds.length > 0
        ? { _id: { $in: licenseeLocationIds } }
        : {}),
    },
  },

  // 2. Lookup meter data for financial calculations
  {
    $lookup: {
      from: 'meters',
      let: { locationId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$location', '$$locationId'] },
            ...(startDate && endDate
              ? {
                  createdAt: {
                    $gte: startDate,
                    $lte: endDate,
                  },
                }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelledCredits: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
          },
        },
      ],
      as: 'metersData',
    },
  },

  // 3. Add financial fields
  {
    $addFields: {
      moneyIn: {
        $ifNull: [{ $arrayElemAt: ['$metersData.totalDrop', 0] }, 0],
      },
      moneyOut: {
        $ifNull: [
          { $arrayElemAt: ['$metersData.totalCancelledCredits', 0] },
          0,
        ],
      },
      location: { $toString: '$_id' },
    },
  },

  // 4. Lookup machine data for SAS and status counts
  {
    $lookup: {
      from: 'machines',
      let: { locationId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$gamingLocation', '$$locationId'] },
            deletedAt: { $in: [null, new Date(-1)] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            online: {
              $sum: {
                $cond: [{ $gte: ['$lastActivity', onlineThreshold] }, 1, 0],
              },
            },
            sasMachines: { $sum: { $cond: ['$isSasMachine', 1, 0] } },
            nonSasMachines: {
              $sum: { $cond: [{ $eq: ['$isSasMachine', false] }, 1, 0] },
            },
          },
        },
      ],
      as: 'machineData',
    },
  },

  // 5. Add machine and financial fields
  {
    $addFields: {
      totalMachines: {
        $ifNull: [{ $arrayElemAt: ['$machineData.total', 0] }, 0],
      },
      onlineMachines: {
        $ifNull: [{ $arrayElemAt: ['$machineData.online', 0] }, 0],
      },
      sasMachines: {
        $ifNull: [{ $arrayElemAt: ['$machineData.sasMachines', 0] }, 0],
      },
      nonSasMachines: {
        $ifNull: [{ $arrayElemAt: ['$machineData.nonSasMachines', 0] }, 0],
      },
      gross: { $subtract: ['$moneyIn', '$moneyOut'] },
    },
  },
];
```

## Meters Report API

### GET `/api/reports/meters`

**Purpose**: Provides detailed machine-level meter readings and performance data

**Query Parameters:**

- `locations` - Required: Comma-separated location IDs
- `startDate` - ISO date string for date filtering
- `endDate` - ISO date string for date filtering
- `page` - Pagination page number (default: 1)
- `limit` - Items per page (default: 10, max: 10)
- `search` - Search term for machine ID or location name
- `licencee` - Filter by licensee ID

**Response Fields:**

```json
{
  "data": [
    {
      "machineId": "SN123456789", // Machine identifier
      "metersIn": 25000, // Coin In (total bets placed)
      "metersOut": 22500, // Coin Out (automatic payouts)
      "jackpot": 1500, // Jackpot payouts
      "billIn": 15000, // Drop (physical money inserted)
      "voucherOut": 8500, // Net cancelled credits
      "attPaidCredits": 2000, // Hand paid cancelled credits
      "gamesPlayed": 1250, // Total games played
      "location": "Main Gaming Floor", // Location name
      "createdAt": "2025-02-26T10:30:00.000Z" // Last activity timestamp
    }
  ],
  "totalCount": 150,
  "totalPages": 15,
  "currentPage": 1,
  "limit": 10,
  "locations": ["loc1", "loc2", "loc3"],
  "dateRange": {
    "start": "2025-02-01T00:00:00.000Z",
    "end": "2025-02-26T23:59:59.999Z"
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Field Mapping (Meters Report Specific)

⚠️ **Important**: The meters report uses **different field mappings** than other financial reports:

| Field              | Data Source                                                                                 | Context                              |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| **metersIn**       | `machine.sasMeters.coinIn`                                                                  | Total bets placed by players         |
| **metersOut**      | `machine.sasMeters.coinOut`                                                                 | Automatic winnings paid to players   |
| **billIn**         | `machine.sasMeters.drop`                                                                    | Physical cash inserted into machine  |
| **voucherOut**     | `machine.sasMeters.totalCancelledCredits - machine.sasMeters.totalHandPaidCancelledCredits` | Net cancelled credits (voucher-only) |
| **attPaidCredits** | `machine.sasMeters.totalHandPaidCancelledCredits`                                           | Manual attendant payouts             |
| **jackpot**        | `machine.sasMeters.jackpot`                                                                 | Special jackpot payouts              |
| **gamesPlayed**    | `machine.sasMeters.gamesPlayed`                                                             | Total games played                   |

## Financial Calculations

### Core Financial Formulas

```
Gross Revenue = Total Drop - Total Cancelled Credits
Location Gross = Money In - Money Out
SAS Machine Count = Count of machines where isSasMachine = true
Non-SAS Machine Count = Count of machines where isSasMachine = false
Online Machine Count = Count of machines where lastActivity < 3 minutes ago
```

### Location Aggregation Calculations

```
Total Drop = Sum of all meter movement.drop values for location
Total Cancelled Credits = Sum of all meter movement.totalCancelledCredits values for location
Gross Revenue = Total Drop - Total Cancelled Credits
Machine Utilization = Online Machines / Total Machines × 100
```

### SAS Evaluation Calculations

```
SAS Locations = Locations where sasMachines > 0
Non-SAS Locations = Locations where sasMachines = 0
Mixed Locations = Locations where sasMachines > 0 AND nonSasMachines > 0
```

## Performance Optimizations

### Caching Strategy

#### Selected Locations Filtering

```javascript
// Filter by selected locations if provided
if (selectedLocations && selectedLocations.length > 0) {
  locationPipeline.unshift({
    $match: {
      _id: { $in: selectedLocations }, // Direct string matching, no ObjectId conversion
    },
  });
}
```

### 7. Performance Optimizations

#### Caching Strategy

```typescript
// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(params: any): string {
  return JSON.stringify(params);
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}
```

### Database Indexing

#### Database Indexing

```javascript
// Required indexes for optimal performance
machineSchema.index({ gamingLocation: 1, deletedAt: 1 });
machineSchema.index({ deletedAt: 1 });
machineSchema.index({ lastActivity: 1 });
machineSchema.index({ isSasMachine: 1 });
machineSchema.index({ serialNumber: 1 });
machineSchema.index({ lastSasMeterAt: -1 });
```

### Query Optimization

#### Query Optimization

- **Licensee Pre-filtering**: Prefetch location IDs for licensee filtering
- **Pagination**: Server-side pagination with skip/limit
- **Aggregation Limits**: Timeout and memory limits for large datasets
- **Parallel Processing**: Concurrent data fetching where possible
- **String ID Matching**: Direct string comparison without ObjectId conversion

## Error Handling

### Graceful Degradation

### 8. Error Handling

#### Graceful Degradation

```typescript
try {
  const { rows, totalCount } = await getLocationsWithMetrics(
    db,
    { startDate, endDate },
    showAllLocations,
    licencee,
    machineTypeFilter,
    page,
    limit
  );

  return NextResponse.json({
    data: rows,
    totalCount,
    page,
    limit,
    hasMore: page * limit < totalCount,
  });
} catch (error) {
  console.error('❌ LocationAggregation API Error:', error);

  // Return fallback data instead of error
  return NextResponse.json({
    data: [],
    totalCount: 0,
    page: 1,
    limit: 50,
    hasMore: false,
    error: 'Failed to fetch location data',
  });
}
```

### Data Validation

#### Data Validation

```typescript
// Input validation
if (timePeriod === 'Custom') {
  const customStart = searchParams.get('startDate');
  const customEnd = searchParams.get('endDate');
  if (!customStart || !customEnd) {
    return NextResponse.json(
      { error: 'Missing startDate or endDate' },
      { status: 400 }
    );
  }
}
```

## Security Considerations

### Authentication & Authorization

- JWT tokens required for all endpoints
- Role-based access control
- Resource filtering based on user permissions

### Data Protection

- Input sanitization and validation
- SQL injection prevention
- Rate limiting protection

## Monitoring & Logging

### Performance Monitoring

### 9. Security Considerations

#### Authentication & Authorization

- **JWT Token Validation**: All endpoints require valid authentication
- **Role-based Access**: Different access levels for different user roles
- **Resource Filtering**: Data filtered based on user permissions

#### Data Protection

- **Input Sanitization**: All query parameters validated and sanitized
- **SQL Injection Prevention**: Parameterized queries and aggregation pipelines
- **Rate Limiting**: Protection against API abuse

### 10. Monitoring & Logging

#### Performance Monitoring

```typescript
// Request timing and performance logging
const startTime = Date.now();
const result = await getLocationsWithMetrics(...);
const duration = Date.now() - startTime;

console.log(`Location aggregation completed in ${duration}ms`);
```

### Error Logging

#### Error Logging

```typescript
// Comprehensive error logging
console.error('❌ LocationAggregation API Error:', {
  error: error.message,
  stack: error.stack,
  params: { timePeriod, licencee, page, limit },
  timestamp: new Date().toISOString(),
});
```

## Data Models

### Machine Model

```typescript
{
  _id: string; // Machine identifier
  gamingLocation: string; // Reference to location
  isSasMachine: boolean; // SAS status flag
  lastActivity: Date; // Last activity timestamp
  deletedAt: Date | null; // Soft delete flag
  serialNumber: string; // Machine serial number
  manufacturer: string; // Machine manufacturer
}
```

### Location Model

```typescript
{
  _id: string; // Location identifier
  name: string; // Location name
  deletedAt: Date | null; // Soft delete flag
  isLocalServer: boolean; // Server type flag
  rel: {
    licencee: string; // Licensee reference
  }
}
```

### Meter Model

```typescript
{
  _id: string; // Meter identifier
  location: string; // Location reference
  createdAt: Date; // Meter reading timestamp
  movement: {
    drop: number; // Drop amount
    totalCancelledCredits: number; // Cancelled credits
  }
}
```

## API Response Examples

### Successful Response

### 11. Data Models

#### Machine Model

```typescript
type Machine = {
  _id: string;
  gamingLocation: string; // Reference to location
  isSasMachine: boolean; // SAS status flag
  lastActivity: Date; // Last activity timestamp
  deletedAt: Date | null; // Soft delete flag
  serialNumber: string; // Machine serial number
  manufacturer: string; // Machine manufacturer
  // ... other machine fields
};
```

#### Location Model

```typescript
type GamingLocation = {
  _id: string;
  name: string; // Location name
  deletedAt: Date | null; // Soft delete flag
  isLocalServer: boolean; // Server type flag
  rel: {
    licencee: string; // Licensee reference
  };
  // ... other location fields
};
```

#### Meter Model

```typescript
type Meter = {
  _id: string;
  location: string; // Location reference
  createdAt: Date; // Meter reading timestamp
  movement: {
    drop: number; // Drop amount
    totalCancelledCredits: number; // Cancelled credits
  };
  // ... other meter fields
};
```

### 12. API Response Examples

#### Successful Response

```json
{
  "data": [
    {
      "location": "507f1f77bcf86cd799439011",
      "locationName": "Main Casino",
      "moneyIn": 150000,
      "moneyOut": 5000,
      "gross": 145000,
      "totalMachines": 100,
      "onlineMachines": 95,
      "sasMachines": 80,
      "nonSasMachines": 20,
      "hasSasMachines": true,
      "hasNonSasMachines": true,
      "isLocalServer": false
    }
  ],
  "totalCount": 1,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

### Error Response

#### Error Response

```json
{
  "data": [],
  "totalCount": 0,
  "page": 1,
  "limit": 50,
  "hasMore": false,
  "error": "Failed to fetch location data"
}
```

---

**Last Updated:** October 15th, 2025

### 13. Development Guidelines

#### Code Organization

- **Helper Functions**: Business logic in separate helper files
- **Type Safety**: Strict TypeScript usage throughout
- **Error Boundaries**: Comprehensive error handling
- **Performance**: Optimize for large datasets

#### Testing Strategy

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load testing for large datasets
- **Error Testing**: Error condition validation

### 14. Meters Report API

**Endpoint:** `GET /api/reports/meters`

#### Purpose

Provides detailed machine-level meter readings and performance data with specific field mappings that differ from other financial reports.

#### Query Parameters

```typescript
type MetersReportParams = {
  locations: string; // Required: Comma-separated location IDs
  startDate?: string; // ISO date string for date filtering
  endDate?: string; // ISO date string for date filtering
  page?: number; // Pagination page number (default: 1)
  limit?: number; // Items per page (default: 10, max: 10)
  search?: string; // Search term for machine ID or location name
  licencee?: string; // Filter by licensee ID
};
```

#### Response Structure

```typescript
type MetersReportResponse = {
  data: MetersReportData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  locations: string[];
  dateRange: {
    start: string;
    end: string;
  };
};

type MetersReportData = {
  machineId: string; // Machine identifier
  metersIn: number; // Coin In (total bets placed)
  metersOut: number; // Coin Out (automatic payouts)
  jackpot: number; // Jackpot payouts
  billIn: number; // Drop (physical money inserted)
  voucherOut: number; // Net cancelled credits
  attPaidCredits: number; // Hand paid cancelled credits
  gamesPlayed: number; // Total games played
  location: string; // Location name
  createdAt: string; // Last activity timestamp
};
```

#### Field Mapping (Meters Report Specific)

⚠️ **Important**: The meters report uses **different field mappings** than other financial reports:

| Field              | Data Source                                                                                 | Context                              |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| **metersIn**       | `machine.sasMeters.coinIn`                                                                  | Total bets placed by players         |
| **metersOut**      | `machine.sasMeters.coinOut`                                                                 | Automatic winnings paid to players   |
| **billIn**         | `machine.sasMeters.drop`                                                                    | Physical cash inserted into machine  |
| **voucherOut**     | `machine.sasMeters.totalCancelledCredits - machine.sasMeters.totalHandPaidCancelledCredits` | Net cancelled credits (voucher-only) |
| **attPaidCredits** | `machine.sasMeters.totalHandPaidCancelledCredits`                                           | Manual attendant payouts             |
| **jackpot**        | `machine.sasMeters.jackpot`                                                                 | Special jackpot payouts              |
| **gamesPlayed**    | `machine.sasMeters.gamesPlayed`                                                             | Total games played                   |

#### Implementation Details

- **Data Sources**: All meter fields come from `machines` collection (`sasMeters` field)
- **Validation**: All numeric values validated for non-negative numbers
- **Machine Data**: Uses machine document with embedded `sasMeters` object
- **Location Resolution**: Gaming location name lookup via `gamingLocation` field

### 15. Financial Calculations Analysis

#### Machine Reports API (`/api/reports/machines`) Calculations

**Current Implementation Analysis vs Financial Metrics Guide:**

##### **Money In (Drop) Aggregation ✅**

- **Current Implementation**:
  ```javascript
  drop: {
    $sum: {
      $ifNull: ['$movement.drop', 0];
    }
  }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **MongoDB Pipeline**: Aggregates all meter readings within date range for each machine
- **Business Logic**: Sums all physical money inserted into each machine

##### **Handle (Coin In) Aggregation ✅**

- **Current Implementation**:
  ```javascript
  coinIn: {
    $sum: {
      $ifNull: ['$movement.coinIn', 0];
    }
  }
  ```
- **Financial Guide**: Uses `movement.coinIn` field ✅ **MATCHES**
- **Business Logic**: Sums all betting activity for each machine

##### **Actual Hold Percentage Calculation ✅**

- **Current Implementation**:
  ```javascript
  holdPct: {
    $cond: [
      { $gt: [{ $ifNull: ['$meterData.coinIn', 0] }, 0] },
      {
        $multiply: [
          {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ['$meterData.coinIn', 0] },
                  { $ifNull: ['$meterData.coinOut', 0] },
                ],
              },
              { $ifNull: ['$meterData.coinIn', 0] },
            ],
          },
          100,
        ],
      },
      0,
    ];
  }
  ```
- **Mathematical Formula**: `((coinIn - coinOut) / coinIn) * 100`
- **Financial Guide Formula**: `actualHold% = (1 - (coinOut / coinIn)) * 100`
- **Verification**:
  - Current: `((coinIn - coinOut) / coinIn) * 100`
  - Guide: `(1 - (coinOut / coinIn)) * 100 = ((coinIn - coinOut) / coinIn) * 100`
  - ✅ **MATCHES** (algebraically equivalent)

##### **Theoretical Hold Percentage Calculation ✅**

- **Current Implementation**:
  ```javascript
  theoreticalHold: (1 - Number(gameConfig.theoreticalRtp)) * 100;
  ```
- **Financial Guide**: `theoreticalHoldPercent = (1 - gameConfig.theoreticalRtp) * 100`
- ✅ **MATCHES**

##### **Average Bet Calculation ✅**

- **Current Implementation**:
  ```javascript
  avgBet: gamesPlayed > 0 ? coinIn / gamesPlayed : 0;
  ```
- **Financial Guide**: `avgWagerPerGame = handle / gamesPlayed`
- ✅ **MATCHES** (handle = coinIn)

##### **Gross/Net Win Calculation ✅**

- **Current Implementation**:
  ```javascript
  netWin: {
    $subtract: [
      { $ifNull: ['$meterData.drop', 0] },
      { $ifNull: ['$meterData.moneyOut', 0] },
    ];
  }
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits`
- ✅ **MATCHES**

#### Meters Report API (`/api/reports/meters`) Calculations

**Current Implementation Analysis vs Financial Metrics Guide:**

##### **Data Source Selection ✅**

- **Current Implementation**: Uses `machine.sasMeters` for recent data
- **Financial Guide**: "For Recent Data (Today/Yesterday): Use `machine.sasMeters`" ✅ **MATCHES**
- **Business Logic**: Direct access to current meter readings without aggregation

##### **Field Mappings ✅**

- **Meters In**: `machine.sasMeters.coinIn` ✅ **MATCHES** guide specification
- **Money Won**: `machine.sasMeters.totalWonCredits` ✅ **MATCHES** guide specification
- **Bill In**: `machine.sasMeters.drop` ✅ **MATCHES** guide specification
- **Voucher Out**: `totalCancelledCredits - totalHandPaidCancelledCredits` ✅ **MATCHES** guide calculation
- **Hand Paid Credits**: `machine.sasMeters.totalHandPaidCancelledCredits` ✅ **MATCHES** guide specification
- **Jackpot**: `machine.sasMeters.jackpot` ✅ **MATCHES** guide specification
- **Games Played**: `machine.sasMeters.gamesPlayed` ✅ **MATCHES** guide specification

#### Location Aggregation API (`/api/locationAggregation`) Calculations

**Current Implementation Analysis vs Financial Metrics Guide:**

##### **Location Financial Aggregation ✅**

- **Current Implementation**:
  ```javascript
  // Aggregates meter data by location
  totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } },
  totalCancelledCredits: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } }
  ```
- **Financial Guide**: Uses `movement.drop` and `movement.totalCancelledCredits` ✅ **MATCHES**
- **Business Logic**: Sums all machine movements within date range for each location

##### **Gross Revenue Calculation ✅**

- **Current Implementation**: `gross: { $subtract: ["$moneyIn", "$moneyOut"] }`
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Aggregation Level**: Calculated at location level after machine data aggregation

## Related Documentation

- [Meters Report API](meters-report-api.md) - Detailed meters endpoint documentation
- [Financial Metrics Guide](../financial-metrics-guide.md) - Field mapping explanations
- [Reports Frontend](../frontend/reports.md)
- [Location Aggregation Helper](../api/lib/helpers/locationAggregation.ts)
- [Machine Model](../api/lib/models/machines.ts)
- [Analytics API](analytics-api.md)
