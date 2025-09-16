# Reports API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025  
**Version:** 2.0.0

## Quick Search Guide

- **Location Aggregation**: `GET /api/locationAggregation` - Location metrics and analytics
- **Meters Report**: `GET /api/reports/meters` - Machine meter readings
- **Machine Reports**: `GET /api/reports/machines` - Machine performance reports
- **Location Reports**: `GET /api/reports/locations` - Location performance reports
- **Daily Counts**: `GET /api/reports/daily-counts` - Daily count reports
- **SAS Evaluation**: `sasEvaluationOnly=true` - Filter for SAS locations only
- **Financial Data**: Default shows all locations with financial data

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
      "location": "location_id",         // Location ID
      "locationName": "Downtown Casino", // Location name
      "moneyIn": 150000,                 // Total drop amount
      "moneyOut": 5000,                  // Total cancelled credits
      "gross": 145000,                   // Net revenue (moneyIn - moneyOut)
      "totalMachines": 100,              // Total machines at location
      "onlineMachines": 95,              // Machines online (lastActivity < 3 min ago)
      "sasMachines": 80,                 // Count of SAS machines (isSasMachine = true)
      "nonSasMachines": 20,              // Count of non-SAS machines (isSasMachine = false)
      "hasSasMachines": true,            // Derived: sasMachines > 0
      "hasNonSasMachines": true,         // Derived: nonSasMachines > 0
      "isLocalServer": false,            // Location server type
      "noSMIBLocation": false,           // Backward compatibility: !hasSasMachines
      "hasSmib": true                    // Backward compatibility: hasSasMachines
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
  _id: string;                          // Machine identifier
  gamingLocation: string;               // Reference to location
  isSasMachine: boolean;                // true = SAS machine, false = non-SAS machine
  lastActivity: Date;                   // Last activity timestamp
  deletedAt: Date | null;               // Soft delete flag
}
```

### Location-Level SAS Aggregation
The aggregation pipeline calculates SAS metrics for each location:

**MongoDB Aggregation:**
```javascript
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
```javascript
{
  $match: {
    sasMachines: { $gt: 0 }  // Only locations with SAS machines
  }
}
```

## Trinidad Timezone Support

### Date Calculation Functions
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
```typescript
// Date range calculations with Trinidad timezone
switch (timePeriod) {
  case "Today":
    startDate = getStartOfDayTrinidad(new Date());
    endDate = getEndOfDayTrinidad(new Date());
    break;
  case "Yesterday":
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    startDate = getStartOfDayTrinidad(yesterday);
    endDate = getEndOfDayTrinidad(yesterday);
    break;
  case "7d":
    startDate = getStartOfDayTrinidad(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    endDate = getEndOfDayTrinidad(new Date());
    break;
  case "30d":
    startDate = getStartOfDayTrinidad(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    endDate = getEndOfDayTrinidad(new Date());
    break;
  case "All Time":
    startDate = null;
    endDate = null;
    break;
}
```

## Data Aggregation Pipeline

### Location Metrics Aggregation
```javascript
// Main aggregation pipeline with simplified two-phase approach
const locationPipeline = [
  // 1. Match locations (non-deleted, optional licensee filter)
  {
    $match: {
      deletedAt: { $in: [null, new Date(-1)] },
      ...(licenseeLocationIds && licenseeLocationIds.length > 0
        ? { _id: { $in: licenseeLocationIds } }
        : {})
    }
  },
  
  // 2. Lookup meter data for financial calculations
  {
    $lookup: {
      from: "meters",
      let: { locationId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$location", "$$locationId"] },
            ...(startDate && endDate
              ? {
                  createdAt: {
                    $gte: startDate,
                    $lte: endDate
                  }
                }
              : {})
          }
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } },
            totalCancelledCredits: {
              $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] }
            }
          }
        }
      ],
      as: "metersData"
    }
  },
  
  // 3. Add financial fields
  {
    $addFields: {
      moneyIn: {
        $ifNull: [{ $arrayElemAt: ["$metersData.totalDrop", 0] }, 0]
      },
      moneyOut: {
        $ifNull: [{ $arrayElemAt: ["$metersData.totalCancelledCredits", 0] }, 0]
      },
      location: { $toString: "$_id" }
    }
  },
  
  // 4. Lookup machine data for SAS and status counts
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
            nonSasMachines: {
              $sum: { $cond: [{ $eq: ["$isSasMachine", false] }, 1, 0] }
            }
          }
        }
      ],
      as: "machineData"
    }
  },
  
  // 5. Add machine and financial fields
  {
    $addFields: {
      totalMachines: {
        $ifNull: [{ $arrayElemAt: ["$machineData.total", 0] }, 0]
      },
      onlineMachines: {
        $ifNull: [{ $arrayElemAt: ["$machineData.online", 0] }, 0]
      },
      sasMachines: {
        $ifNull: [{ $arrayElemAt: ["$machineData.sasMachines", 0] }, 0]
      },
      nonSasMachines: {
        $ifNull: [{ $arrayElemAt: ["$machineData.nonSasMachines", 0] }, 0]
      },
      gross: { $subtract: ["$moneyIn", "$moneyOut"] }
    }
  }
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
      "machineId": "SN123456789",       // Machine identifier
      "metersIn": 25000,                // Coin In (total bets placed)
      "metersOut": 22500,               // Coin Out (automatic payouts)
      "jackpot": 1500,                  // Jackpot payouts
      "billIn": 15000,                  // Drop (physical money inserted)
      "voucherOut": 8500,               // Net cancelled credits
      "attPaidCredits": 2000,           // Hand paid cancelled credits
      "gamesPlayed": 1250,              // Total games played
      "location": "Main Gaming Floor",  // Location name
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

| Field | Data Source | Context |
|-------|-------------|---------|
| **metersIn** | `machine.sasMeters.coinIn` | Total bets placed by players |
| **metersOut** | `machine.sasMeters.coinOut` | Automatic winnings paid to players |
| **billIn** | `machine.sasMeters.drop` | Physical cash inserted into machine |
| **voucherOut** | `machine.sasMeters.totalCancelledCredits - machine.sasMeters.totalHandPaidCancelledCredits` | Net cancelled credits (voucher-only) |
| **attPaidCredits** | `machine.sasMeters.totalHandPaidCancelledCredits` | Manual attendant payouts |
| **jackpot** | `machine.sasMeters.jackpot` | Special jackpot payouts |
| **gamesPlayed** | `machine.sasMeters.gamesPlayed` | Total games played |

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
- **Licensee Pre-filtering**: Prefetch location IDs for licensee filtering
- **Pagination**: Server-side pagination with skip/limit
- **Aggregation Limits**: Timeout and memory limits for large datasets
- **Parallel Processing**: Concurrent data fetching where possible
- **String ID Matching**: Direct string comparison without ObjectId conversion

## Error Handling

### Graceful Degradation
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
    hasMore: page * limit < totalCount
  });
} catch (error) {
  console.error("❌ LocationAggregation API Error:", error);
  
  // Return fallback data instead of error
  return NextResponse.json({
    data: [],
    totalCount: 0,
    page: 1,
    limit: 50,
    hasMore: false,
    error: "Failed to fetch location data"
  });
}
```

### Data Validation
```typescript
// Input validation
if (timePeriod === "Custom") {
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");
  if (!customStart || !customEnd) {
    return NextResponse.json(
      { error: "Missing startDate or endDate" },
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
```typescript
// Request timing and performance logging
const startTime = Date.now();
const result = await getLocationsWithMetrics(...);
const duration = Date.now() - startTime;

console.log(`Location aggregation completed in ${duration}ms`);
```

### Error Logging
```typescript
// Comprehensive error logging
console.error("❌ LocationAggregation API Error:", {
  error: error.message,
  stack: error.stack,
  params: { timePeriod, licencee, page, limit },
  timestamp: new Date().toISOString()
});
```

## Data Models

### Machine Model
```typescript
{
  _id: string;                          // Machine identifier
  gamingLocation: string;               // Reference to location
  isSasMachine: boolean;                // SAS status flag
  lastActivity: Date;                   // Last activity timestamp
  deletedAt: Date | null;               // Soft delete flag
  serialNumber: string;                 // Machine serial number
  manufacturer: string;                 // Machine manufacturer
}
```

### Location Model
```typescript
{
  _id: string;                          // Location identifier
  name: string;                         // Location name
  deletedAt: Date | null;               // Soft delete flag
  isLocalServer: boolean;               // Server type flag
  rel: {
    licencee: string;                   // Licensee reference
  };
}
```

### Meter Model
```typescript
{
  _id: string;                          // Meter identifier
  location: string;                     // Location reference
  createdAt: Date;                      // Meter reading timestamp
  movement: {
    drop: number;                       // Drop amount
    totalCancelledCredits: number;      // Cancelled credits
  };
}
```

## API Response Examples

### Successful Response
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

**Last Updated:** January 15th, 2025
