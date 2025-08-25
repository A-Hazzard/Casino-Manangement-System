# Reports Backend API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Reports Backend API provides comprehensive data aggregation and analytics capabilities for gaming locations, machines, and revenue analysis. It includes location aggregation, SAS machine determination, and performance metrics calculation with Trinidad timezone support.

## Core Endpoints

### 1. Location Aggregation API
**Endpoint:** `GET /api/locationAggregation`

#### Purpose
Aggregates location-level metrics including machine counts, SAS status, and financial data. Defaults to showing all locations with financial data before any location selection.

#### Query Parameters
```typescript
interface LocationAggregationParams {
  timePeriod?: TimePeriod;           // "Today", "Yesterday", "7d", "30d", "All Time"
  startDate?: string;                // ISO date string for custom range
  endDate?: string;                  // ISO date string for custom range
  licencee?: string;                 // Filter by licensee
  machineTypeFilter?: LocationFilter; // "LocalServersOnly", "SMIBLocationsOnly", "NoSMIBLocation"
  showAllLocations?: boolean;        // Include locations without metrics
  basicList?: boolean;               // If false, returns all locations with financial data
  page?: number;                     // Pagination page number
  limit?: number;                    // Items per page
  clearCache?: boolean;              // Clear cache for testing
  sasEvaluationOnly?: boolean;       // Filter for SAS locations only
  selectedLocations?: string[];      // Array of location IDs to filter by
}
```

#### Response Structure
```typescript
interface LocationAggregationResponse {
  data: AggregatedLocation[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

#### Aggregated Location Data
```typescript
interface AggregatedLocation {
  location: string;                  // Location ID
  locationName: string;              // Location name
  moneyIn: number;                   // Total drop amount
  moneyOut: number;                  // Total cancelled credits
  gross: number;                     // Net revenue (moneyIn - moneyOut)
  totalMachines: number;             // Total machines at location
  onlineMachines: number;            // Machines online (lastActivity < 3 min ago)
  sasMachines: number;               // Count of SAS machines (isSasMachine = true)
  nonSasMachines: number;            // Count of non-SAS machines (isSasMachine = false)
  hasSasMachines: boolean;           // Derived: sasMachines > 0
  hasNonSasMachines: boolean;        // Derived: nonSasMachines > 0
  isLocalServer: boolean;            // Location server type
  noSMIBLocation: boolean;           // Backward compatibility: !hasSasMachines
  hasSmib: boolean;                  // Backward compatibility: hasSasMachines
}
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

#### Frontend Integration
- **SAS Evaluation Tab**: Shows all SAS locations with financial data by default
- **Revenue Analysis Tab**: Shows all locations with financial data by default
- **Location Selection**: When locations are selected, data is filtered to only those locations
- **User Experience**: Users see data immediately without needing to make selections first

### 3. SAS Machine Determination Logic

#### Machine-Level SAS Status
Each machine in the database has an `isSasMachine` field that determines its SAS status:

```typescript
interface Machine {
  _id: string;
  gamingLocation: string;            // Reference to location
  isSasMachine: boolean;             // true = SAS machine, false = non-SAS machine
  lastActivity: Date;                // Last activity timestamp
  deletedAt: Date | null;            // Soft delete flag
  // ... other machine fields
}
```

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
```

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

#### Time Period Calculations
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

#### Selected Locations Filtering
```javascript
// Filter by selected locations if provided
if (selectedLocations && selectedLocations.length > 0) {
  locationPipeline.unshift({
    $match: {
      _id: { $in: selectedLocations }  // Direct string matching, no ObjectId conversion
    }
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

#### Query Optimization
- **Licensee Pre-filtering**: Prefetch location IDs for licensee filtering
- **Pagination**: Server-side pagination with skip/limit
- **Aggregation Limits**: Timeout and memory limits for large datasets
- **Parallel Processing**: Concurrent data fetching where possible
- **String ID Matching**: Direct string comparison without ObjectId conversion

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

#### Data Validation
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

#### Error Logging
```typescript
// Comprehensive error logging
console.error("❌ LocationAggregation API Error:", {
  error: error.message,
  stack: error.stack,
  params: { timePeriod, licencee, page, limit },
  timestamp: new Date().toISOString()
});
```

### 11. Data Models

#### Machine Model
```typescript
interface Machine {
  _id: string;
  gamingLocation: string;            // Reference to location
  isSasMachine: boolean;             // SAS status flag
  lastActivity: Date;                // Last activity timestamp
  deletedAt: Date | null;            // Soft delete flag
  serialNumber: string;              // Machine serial number
  manufacturer: string;              // Machine manufacturer
  // ... other machine fields
}
```

#### Location Model
```typescript
interface GamingLocation {
  _id: string;
  name: string;                      // Location name
  deletedAt: Date | null;            // Soft delete flag
  isLocalServer: boolean;            // Server type flag
  rel: {
    licencee: string;                // Licensee reference
  };
  // ... other location fields
}
```

#### Meter Model
```typescript
interface Meter {
  _id: string;
  location: string;                  // Location reference
  createdAt: Date;                   // Meter reading timestamp
  movement: {
    drop: number;                    // Drop amount
    totalCancelledCredits: number;   // Cancelled credits
  };
  // ... other meter fields
}
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

## Related Documentation

- [Reports Frontend](frontend/reports.md)
- [Location Aggregation Helper](../api/lib/helpers/locationAggregation.ts)
- [Machine Model](../api/lib/models/machines.ts)
- [Analytics API](analytics-api.md)
