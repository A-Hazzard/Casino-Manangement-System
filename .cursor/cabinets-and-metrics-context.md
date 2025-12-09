# Cabinets & Metrics System - AI Context Guide

> **CRITICAL CONTEXT FOR AI ASSISTANTS**  
> This file provides comprehensive context about how the cabinets/machines and metrics system works in this codebase.  
> Use this when working on cabinets page, metrics APIs, or machine aggregation features.

---

## 🎯 System Overview

### Core Concepts

1. **Cabinets = Machines**: In this system, "cabinets" and "machines" refer to the same entity - gaming machines/cabinets
2. **Meters Collection**: All financial data (drop, coinIn, coinOut, etc.) is stored in the `meters` collection
3. **Gaming Day Offset**: Each location has a `gameDayOffset` (default 8 AM) that determines when a "gaming day" starts
4. **Licensee Filtering**: All queries must respect user's accessible licensees and locations (see `licensee-access-context.md`)

---

## 📊 Database Hierarchy

### Collections & Relationships

```
licencees (licensees)
  └── gaminglocations (locations)
       └── machines (cabinets)
            └── meters (financial data)
```

### Key Fields

**Machine Schema:**

- `_id`: String ID (NOT ObjectId)
- `serialNumber`: Asset number (maps to frontend `assetNumber`)
- `game`: Installed game (maps to frontend `installedGame`)
- `gamingLocation`: Location ID (maps to frontend `locationId`)
- `relayId`: SMIB board ID (maps to frontend `smbId`)
- `assetStatus`: Machine status (maps to frontend `status`)
- `lastActivity`: Last activity timestamp (used to determine online/offline)
- `deletedAt`: Soft delete timestamp

**Meters Schema:**

- `_id`: ObjectId
- `machine`: Machine ID (string reference)
- `readAt`: Timestamp when meter was read
- `movement.drop`: Money inserted (moneyIn)
- `movement.totalCancelledCredits`: Money out (moneyOut)
- `movement.jackpot`: Jackpot payouts
- `coinIn`: Total bets placed
- `coinOut`: Total payouts
- `gamesPlayed`: Number of games played
- `gamesWon`: Number of games won
- `handPaidCancelledCredits`: Hand-paid credits

**Location Schema:**

- `_id`: String ID
- `name`: Location name
- `rel.licencee`: Licensee ID this location belongs to
- `gameDayOffset`: Gaming day start hour (e.g., 8 = 8 AM)
- `country`: Country ID
- `geoCoords`: Geographic coordinates

---

## 🔄 Data Flow

### Frontend → Backend Field Mapping

**When sending data (PUT/POST):**

```typescript
// Frontend sends
{
  assetNumber: "GM001",        → serialNumber
  installedGame: "Slot Game",  → game
  locationId: "loc123",        → gamingLocation
  smbId: "smib456",            → relayId
  status: "active"             → assetStatus
}
```

**When receiving data (GET):**

```typescript
// Backend returns
{
  serialNumber: "GM001",       → assetNumber
  game: "Slot Game",           → installedGame
  gamingLocation: "loc123",    → locationId
  relayId: "smib456",          → smbId
  assetStatus: "active"        → status
}
```

### Financial Calculations

```typescript
// From meters collection
moneyIn = movement.drop
moneyOut = movement.totalCancelledCredits
gross = moneyIn - moneyOut
jackpot = movement.jackpot
coinIn = coinIn (from meter)
coinOut = coinOut (from meter)
```

---

## 🛠️ API Endpoints

### GET `/api/machines/aggregation`

**Purpose**: Fetch aggregated machine data with filtering

**Query Parameters:**

- `licensee` or `licencee`: Licensee ID filter (supports both spellings)
- `timePeriod`: Date range filter (Today, Yesterday, 7d, 30d, Custom, All Time)
- `startDate`: Start date for Custom range (ISO format)
- `endDate`: End date for Custom range (ISO format)
- `currency`: Display currency code (USD, TTD, GYD, etc.)
- `locationId`: Filter by specific location
- `search`: Search term (searches serialNumber, custom.name, relayId, smbId, \_id)
- `page`: Page number for pagination
- `limit`: Items per page

**Response:**

```typescript
{
  success: true,
  data: Array<{
    _id: string,
    locationId: string,
    locationName: string,
    assetNumber: string,
    serialNumber: string,
    game: string,
    status: string,
    moneyIn: number,
    moneyOut: number,
    gross: number,
    jackpot: number,
    coinIn: number,
    coinOut: number,
    gamesPlayed: number,
    gamesWon: number,
    online: boolean,
    lastActivity: Date,
    // ... other fields
  }>,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**Key Implementation Details:**

- Uses gaming day offset per location for date filtering
- Aggregates meters by machine ID within gaming day ranges
- For 7d/30d: Uses single aggregation (optimized)
- For Today/Yesterday: Uses parallel batch processing per location
- Applies currency conversion for Admin/Developer when viewing "All Licensees"
- Sorts by moneyIn descending (highest first)

### GET `/api/metrics/meters`

**Purpose**: Fetch meter trend data for charts

**Query Parameters:**

- `timePeriod`: Date range filter (required)
- `licencee` or `licensee`: Licensee ID filter
- `startDate`: Start date for Custom range
- `endDate`: End date for Custom range
- `currency`: Display currency code
- `granularity`: 'hourly' or 'minute' (optional, auto-detected if not provided)

**Response:**

```typescript
Array<{
  day: string; // YYYY-MM-DD format
  time: string; // HH:MM or HH:00 format
  drop: number; // moneyIn
  totalCancelledCredits: number; // moneyOut
  gross: number;
  gamesPlayed: number;
  jackpot: number;
}>;
```

**Key Implementation Details:**

- Groups meters by day and time (hourly or minute-level)
- Respects gaming day offset per location
- For 7d/30d: Uses single aggregation across all machines
- For Today/Yesterday: Uses batch processing per location
- Applies currency conversion if needed
- Returns empty array if no data found

---

## 🔍 Common Query Patterns

### Finding Machines by Location

```typescript
const machines = await Machine.find({
  gamingLocation: { $in: locationIds },
  $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
}).lean();
```

### Aggregating Meters for Machines

```typescript
const pipeline: PipelineStage[] = [
  {
    $match: {
      machine: { $in: machineIds },
      readAt: {
        $gte: rangeStart,
        $lte: rangeEnd,
      },
    },
  },
  {
    $group: {
      _id: '$machine',
      moneyIn: { $sum: '$movement.drop' },
      moneyOut: { $sum: '$movement.totalCancelledCredits' },
      jackpot: { $sum: '$movement.jackpot' },
      coinIn: { $last: '$coinIn' },
      coinOut: { $last: '$coinOut' },
      gamesPlayed: { $last: '$gamesPlayed' },
      gamesWon: { $last: '$gamesWon' },
    },
  },
];

const metrics = await Meters.aggregate(pipeline);
```

### Applying Licensee Filtering

```typescript
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

// Get allowed location IDs
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  licensee || undefined,
  userLocationPermissions,
  userRoles
);

// Apply to machine query
if (allowedLocationIds !== 'all') {
  if (allowedLocationIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }
  matchStage.gamingLocation = { $in: allowedLocationIds };
}
```

### Calculating Gaming Day Ranges

```typescript
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';

const gamingDayRanges = getGamingDayRangesForLocations(
  locations.map(loc => ({
    _id: loc._id.toString(),
    gameDayOffset: loc.gameDayOffset ?? 8,
  })),
  timePeriod,
  customStartDate,
  customEndDate
);

// Returns Map<locationId, { rangeStart: Date, rangeEnd: Date }>
```

---

## 🚨 Common Issues & Solutions

### Issue: Empty Array Returned from `/api/metrics/meters`

**Possible Causes:**

1. **No meters in date range**: Check if meters exist for the time period
2. **Gaming day offset filtering**: Date range might not align with gaming day ranges
3. **Licensee filtering**: User might not have access to any locations
4. **No machines found**: Locations might not have any machines

**Debug Steps:**

```typescript
// 1. Check if locations are found
console.log('Locations found:', locations.length);

// 2. Check if machines are found
console.log('Machines found:', machineDocs.length);

// 3. Check gaming day ranges
console.log('Gaming day ranges:', Array.from(gamingDayRanges.entries()));

// 4. Check if meters exist for machines
const sampleMeter = await db.collection('meters').findOne({
  machine: { $in: machineIds },
});
console.log('Sample meter:', sampleMeter);
```

### Issue: Machines Return 0 Values in Aggregation

**Possible Causes:**

1. **No meters in date range**: Meters might not exist for the selected time period
2. **Gaming day offset mismatch**: Date range might not include the gaming day range
3. **Machine IDs mismatch**: Machine IDs in meters collection might not match machine \_id

**Debug Steps:**

```typescript
// 1. Check if meters exist for machines
const meterCount = await Meters.countDocuments({
  machine: { $in: machineIds },
  readAt: {
    $gte: rangeStart,
    $lte: rangeEnd,
  },
});
console.log('Meters in range:', meterCount);

// 2. Check machine IDs format
console.log('Machine IDs:', machineIds.slice(0, 5));

// 3. Check sample meter
const sampleMeter = await Meters.findOne({
  machine: { $in: machineIds },
});
console.log('Sample meter machine ID:', sampleMeter?.machine);
```

### Issue: Currency Conversion Not Working

**Check:**

1. User must be Admin or Developer
2. Must be viewing "All Licensees" (licensee parameter empty or 'all')
3. Licensee/Country currency mapping must exist in rates helper

---

## 📝 Frontend Patterns

### Using Cabinet Data Hook

```typescript
import { useCabinetData } from '@/lib/hooks/data/useCabinetData';

const {
  allCabinets,
  filteredCabinets,
  locations,
  gameTypes,
  loading,
  error,
  loadCabinets,
  metricsTotals,
} = useCabinetData({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  displayCurrency,
  selectedLocation,
  selectedGameType,
  selectedStatus,
  searchTerm,
});
```

### Fetching Metrics for Charts

```typescript
import { getMetrics } from '@/lib/helpers/metrics';

const metricsData = await getMetrics(
  activeMetricsFilter as TimePeriod,
  customDateRange?.startDate,
  customDateRange?.endDate,
  selectedLicencee,
  displayCurrency,
  signal,
  chartGranularity === 'minute' ? 'minute' : undefined
);

// Returns dashboardData[] with chartData structure
// Use metricsData.chartData for chart (but getMetrics returns array directly)
// Use metricsData.totals for financial totals (but totals need to be calculated)
```

**Note**: `getMetrics` returns `dashboardData[]` directly, not an object with `chartData` and `totals`. You need to calculate totals separately:

```typescript
const chartData = metricsData; // Array of dashboardData
const totals = {
  moneyIn: chartData.reduce((sum, item) => sum + item.moneyIn, 0),
  moneyOut: chartData.reduce((sum, item) => sum + item.moneyOut, 0),
  gross: chartData.reduce((sum, item) => sum + item.gross, 0),
};
```

---

## 🔗 Related Files

### Backend

- `app/api/machines/aggregation/route.ts` - Machine aggregation endpoint
- `app/api/metrics/meters/route.ts` - Meter trends endpoint
- `app/api/lib/helpers/meterTrends.ts` - Meter trends helper functions
- `app/api/lib/models/machines.ts` - Machine model
- `app/api/lib/models/meters.ts` - Meters model
- `app/api/lib/models/gaminglocations.ts` - Location model

### Frontend

- `lib/hooks/data/useCabinetData.ts` - Cabinet data hook
- `lib/helpers/metrics.ts` - Metrics fetching helper
- `lib/helpers/cabinets.ts` - Cabinet fetching helper
- `lib/utils/gamingDayRange.ts` - Gaming day range calculations
- `app/cabinets/page.tsx` - Cabinets page component

### Documentation

- `.cursor/licensee-access-context.md` - Licensee and location access control
- `Documentation/backend/machines.md` - Machines API documentation
- `Documentation/backend/machines-api.md` - Machines API reference

---

## ⚡ Quick Reference

### Online/Offline Status

```typescript
// Machine is online if lastActivity is within last 3 minutes
const isOnline = machine.lastActivity
  ? new Date(machine.lastActivity) > new Date(Date.now() - 3 * 60 * 1000)
  : false;
```

### Soft Delete Filtering

```typescript
// Always filter out soft-deleted records
{
  $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }];
}
```

### String IDs (NOT ObjectId)

```typescript
// ✅ CORRECT - Use findOne with string _id
const machine = await Machine.findOne({ _id: machineId });

// ❌ WRONG - Don't use findById (expects ObjectId)
const machine = await Machine.findById(machineId);
```

---

**Last Updated:** December 2024  
**Maintained By:** AI Assistant Context System



