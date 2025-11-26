# Meters Report API

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 22, 2025

## Quick Search Guide (Ctrl+F)

- **meter readings** - Meter data endpoints
- **dashboard metrics** - Dashboard financial metrics
- **location metrics** - Location-level meter data
- **machine metrics** - Machine-specific meter data
- **time period** - Time-based filtering
- **aggregation** - Data aggregation endpoints
- **financial calculations** - Meter-based financial calculations
- **custom date range** - Custom date filtering
- **hourly data** - Hourly meter data
- **daily data** - Daily meter summaries

## Overview

The Meters Report API provides access to slot machine meter readings, financial calculations, and performance analytics based on meter data.

**Important:** All date filtering now respects each location's gaming day offset. See [Gaming Day Offset System](./gaming-day-offset-system.md) for details on how gaming days work and how they affect time-based queries.

## Gaming Day Offset System

The system now uses a sophisticated gaming day offset system that ensures accurate financial reporting across different time zones and business hours. Key features:

- **Per-location gaming days**: Each location can have a different gaming day start time (e.g., 9 AM Trinidad time)
- **Automatic UTC conversion**: All date ranges are automatically converted to UTC for database queries
- **Consistent time periods**: Standard periods like "Today", "Yesterday", "7d", "30d" now align with gaming day boundaries
- **Custom date ranges**: Custom date filtering respects the location's gaming day offset

### Example: Gaming Day with 9 AM Offset

If a location has a `gameDayOffset` of 9:

- **"Today"** = 9:00 AM today to 8:59:59 AM tomorrow (Trinidad time)
- **"Yesterday"** = 9:00 AM yesterday to 8:59:59 AM today (Trinidad time)
- **Custom range** = Custom start/end dates adjusted to gaming day boundaries

This ensures that financial metrics and meter readings are calculated based on the location's actual business day, not calendar days.

## Dashboard Metrics

### GET `/api/metrics/meters`

**Purpose:** Get financial metrics for dashboard display

**Query Parameters:**

- `timePeriod` - "Today", "Yesterday", "7d", "30d", "Custom"
- `startDate` - Custom start date (ISO format)
- `endDate` - Custom end date (ISO format)
- `licencee` - Licensee filter
- `locationIds` - Comma-separated location IDs

**Response:**

```json
{
  "summary": {
    "totalMoneyIn": 50000, // Total drop across all locations
    "totalMoneyOut": 5000, // Total cancelled credits
    "totalGross": 45000, // Net revenue (moneyIn - moneyOut)
    "totalMachines": 150, // Total machines
    "onlineMachines": 145, // Online machines
    "averageGrossPerMachine": 300 // Average gross per machine
  },
  "locationData": [
    {
      "locationId": "location_001",
      "locationName": "Downtown Casino",
      "moneyIn": 25000, // Location drop
      "moneyOut": 2500, // Location cancelled credits
      "gross": 22500, // Location gross revenue
      "totalMachines": 75, // Total machines at location
      "onlineMachines": 72, // Online machines at location
      "hasSasMachines": true, // Has SAS-enabled machines
      "hasNonSasMachines": false, // Has non-SAS machines
      "isLocalServer": true // Uses local server
    }
  ],
  "chartData": [
    {
      "day": "2025-01-15", // Date
      "time": "10:00", // Time (for hourly data)
      "moneyIn": 5000, // Drop for period
      "moneyOut": 500, // Cancelled for period
      "gross": 4500, // Gross for period
      "location": "location_001", // Location ID
      "geoCoords": {
        // GPS coordinates
        "latitude": 40.7128,
        "longitude": -74.006
      }
    }
  ]
}
```

## Location Metrics

### GET `/api/metrics/locations`

**Purpose:** Get location-specific meter data and performance metrics

**Query Parameters:**

- `timePeriod` - Time period filter
- `startDate` - Custom start date
- `endDate` - Custom end date
- `locationIds` - Comma-separated location IDs
- `includeMachines` - Include individual machine data

**Response:**

```json
{
  "locations": [
    {
      "locationId": "location_001",
      "locationName": "Downtown Casino",
      "totalDrop": 25000, // Total drop
      "totalCancelled": 2500, // Total cancelled credits
      "totalGross": 22500, // Net revenue
      "totalMachines": 75, // Total machines
      "onlineMachines": 72, // Online machines
      "sasMachines": 70, // SAS-enabled machines
      "nonSasMachines": 5, // Non-SAS machines
      "hasSasMachines": true,
      "hasNonSasMachines": true,
      "isLocalServer": true,
      "machines": [
        // Individual machine data (if requested)
        {
          "machineId": "machine_001",
          "serialNumber": "SN123456",
          "game": "Slot Game Pro",
          "moneyIn": 1000, // Machine drop
          "moneyOut": 100, // Machine cancelled credits
          "gross": 900, // Machine gross
          "isOnline": true, // Online status
          "hasSas": true, // SAS enabled
          "lastActivity": "2025-01-15T09:45:00Z"
        }
      ]
    }
  ]
}
```

## Machine Metrics

### GET `/api/metrics/machines`

**Purpose:** Get machine-specific performance metrics

**Query Parameters:**

- `timePeriod` - Time period filter
- `startDate` - Custom start date
- `endDate` - Custom end date
- `machineIds` - Comma-separated machine IDs
- `locationIds` - Comma-separated location IDs
- `onlineOnly` - Filter for online machines only

**Response:**

```json
{
  "machines": [
    {
      "machineId": "machine_001",
      "serialNumber": "SN123456",
      "game": "Slot Game Pro",
      "locationId": "location_001",
      "locationName": "Downtown Casino",
      "moneyIn": 1000, // Machine drop
      "moneyOut": 100, // Machine cancelled credits
      "gross": 900, // Machine gross revenue
      "jackpot": 500, // Jackpot amount
      "gamesPlayed": 1000, // Total games played
      "averageWager": 1.0, // Average wager per game
      "isOnline": true, // Online status
      "hasSas": true, // SAS enabled
      "lastActivity": "2025-01-15T09:45:00Z",
      "collectionTime": "2025-01-14T10:30:00Z"
    }
  ]
}
```

## Meter Data Aggregation

### GET `/api/meters/aggregate`

**Purpose:** Get aggregated meter data with custom grouping

**Query Parameters:**

- `groupBy` - "location", "machine", "day", "hour"
- `timePeriod` - Time period filter
- `startDate` - Custom start date
- `endDate` - Custom end date
- `locationIds` - Location filter
- `machineIds` - Machine filter

**Response:**

```json
{
  "aggregatedData": [
    {
      "group": "location_001", // Group identifier
      "groupName": "Downtown Casino", // Group display name
      "totalDrop": 25000, // Aggregated drop
      "totalCancelled": 2500, // Aggregated cancelled credits
      "totalGross": 22500, // Aggregated gross
      "machineCount": 75, // Number of machines
      "period": "2025-01-15" // Time period
    }
  ]
}
```

## Time Period Filtering

### Supported Time Periods

- **Today**: Current day data
- **Yesterday**: Previous day data
- **7d**: Last 7 days
- **30d**: Last 30 days
- **Custom**: Custom date range

### Custom Date Range

When using custom date range:

- **startDate**: ISO 8601 format (e.g., "2025-01-01T00:00:00.000Z")
- **endDate**: ISO 8601 format (e.g., "2025-01-31T23:59:59.999Z")
- **Timezone**: All dates converted to UTC for processing
- **Local Time**: Results displayed in local timezone

### Chart Data Formatting

**Single Day Custom Range:**

- Data grouped by hour (hourly format)
- Time format: "HH:00" (e.g., "10:00", "14:00")
- Only includes hours with actual data (no zero padding)

**Multi-Day Custom Range:**

- Data grouped by day (daily format)
- Date format: "YYYY-MM-DD" (e.g., "2025-01-15")

**Hourly Chart Features:**

- Mobile-responsive design with horizontal scrolling for long time ranges
- Reduced label frequency on mobile devices
- Touch-friendly interactions with larger touch targets
- Charts automatically filter to match table search results
- Responsive height and margin adjustments for mobile vs desktop

## Financial Calculations

### Core Meter Calculations

```
Money In = Sum of movement.drop across all meters
Money Out = Sum of movement.totalCancelledCredits across all meters
Gross Revenue = Money In - Money Out
```

### Location Aggregation

```
Location Money In = Sum of movement.drop for location's machines
Location Money Out = Sum of movement.totalCancelledCredits for location's machines
Location Gross = Location Money In - Location Money Out
```

### Machine Performance

```
Machine Gross = Machine Drop - Machine Cancelled Credits
Average Wager = Handle / Games Played
```

## Data Models

### Meter Reading

**Database Fields:**

```typescript
{
  _id: string; // Unique meter reading ID
  machine: string; // Machine reference
  location: string; // Location reference
  locationSession: string; // Location session reference
  readAt: Date; // Reading timestamp
  movement: {
    drop: number; // Money in (drop)
    totalCancelledCredits: number; // Money out (cancelled credits)
    totalHandPaidCancelledCredits: number; // Hand-paid cancelled credits
    totalWonCredits: number; // Total won credits
    jackpot: number; // Jackpot amount
    coinIn: number; // Total coin in (handle)
    coinOut: number; // Total coin out
    currentCredits: number; // Current credits
    gamesPlayed: number; // Games played
    gamesWon: number; // Games won
  }
  geoCoords: {
    // GPS coordinates
    latitude: number;
    longitude: number;
  }
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Common Error Codes

- `INVALID_TIME_PERIOD` - Invalid time period specified
- `INVALID_DATE_RANGE` - Invalid date range
- `LOCATION_NOT_FOUND` - Location not found
- `MACHINE_NOT_FOUND` - Machine not found
- `NO_DATA_FOUND` - No meter data found for specified criteria

### Error Response Format

````json
{
  "error": "Invalid time period",
  "code": "INVALID_TIME_PERIOD",
  "details": {
    "timePeriod": "invalid_period",
    "validPeriods": ["Today", "Yesterday", "7d", "30d", "Custom"]
  },
  "timestamp": "2025-01-15T10:30:00Z"

# Meters Report API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer
**Date:** October 29, 2025

## Overview

The Meters Report API provides detailed machine-level meter readings and performance data for casino slot machines. This endpoint displays raw meter data with specific field mappings that differ from other financial reports in the system.

## API Endpoint

### GET /api/reports/meters

**Purpose**: Retrieves paginated meter readings for selected gaming locations with machine-specific performance data.

## Query Parameters

```typescript
type MetersReportParams = {
  locations: string;              // Required: Comma-separated location IDs
  startDate?: string;             // ISO date string for date filtering
  endDate?: string;               // ISO date string for date filtering
  page?: number;                  // Pagination page number (default: 1)
  limit?: number;                 // Items per page (default: 10, max: 10)
  search?: string;                // Search term for machine ID, location name, serial number, or custom name
  licencee?: string;              // Filter by licensee ID (triggers location refetch)
  includeHourlyData?: boolean;    // Include hourly chart data in response
  hourlyDataMachineIds?: string;  // Comma-separated machine IDs for filtered hourly chart data
  currency?: string;              // Display currency code (USD, TTD, GYD, BBD)
}
````

## Response Structure

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
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
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

## Column Calculations & Field Mappings

The meters report uses **specific field mappings** that differ from other financial reports in the system:

| **Column**                      | **Display Name**              | **Data Source**                                                                             | **Calculation**                       | **Casino Context**                              |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------- |
| **Machine ID**                  | "Machine ID"                  | `machine.serialNumber \|\| machine.custom.name \|\| machine._id`                            | Direct field lookup                   | Unique machine identifier                       |
| **Location**                    | "Location"                    | Location name via `gamingLocation` lookup                                                   | Gaming location name resolution       | Physical location of machine                    |
| **Meters In**                   | "Meters In"                   | `machine.sasMeters.coinIn`                                                                  | Direct field (validated ≥ 0)          | **Total bets placed by players**                |
| **Money Won**                   | "Money Won"                   | `machine.sasMeters.totalWonCredits`                                                         | Direct field (validated ≥ 0)          | **Total winnings paid to players**              |
| **Jackpot**                     | "Jackpot"                     | `machine.sasMeters.jackpot`                                                                 | Direct field (validated ≥ 0)          | **Special jackpot payouts**                     |
| **Bill In**                     | "Bill In"                     | `machine.sasMeters.drop`                                                                    | Direct field (validated ≥ 0)          | **Physical cash inserted into machine**         |
| **Voucher Out**                 | "Voucher Out"                 | `machine.sasMeters.totalCancelledCredits - machine.sasMeters.totalHandPaidCancelledCredits` | Calculated difference (validated ≥ 0) | **Net cancelled credits (excluding hand-paid)** |
| **Hand Paid Cancelled Credits** | "Hand Paid Cancelled Credits" | `machine.sasMeters.totalHandPaidCancelledCredits`                                           | Direct field (validated ≥ 0)          | **Manual attendant payouts**                    |
| **Games Played**                | "Games Played"                | `machine.sasMeters.gamesPlayed`                                                             | Direct field (validated ≥ 0)          | **Total number of games played**                |
| **Date**                        | "Date"                        | `machine.lastActivity`                                                                      | Formatted date display                | **Last machine activity timestamp**             |

## Important Field Mapping Notes

### ⚠️ **Critical Differences from Other Reports**

The meters report uses **different field mappings** compared to other financial reports in the system:

1. **Meters In = Coin In**: Unlike other reports that use `movement.drop` for "Money In", the meters report displays `sasMeters.coinIn` (total bets placed)

2. **Money Won = Coin Out**: Shows `sasMeters.coinOut` (automatic payouts) rather than manual cancelled credits

3. **Bill In = Drop**: Uses top-level `drop` field from meters collection (not `movement.drop`) representing physical cash inserted

4. **Voucher Out = Net Cancelled Credits**: Calculated as `totalCancelledCredits - totalHandPaidCancelledCredits` to show voucher-based payouts only

5. **Hand Paid Credits**: Shows `totalHandPaidCancelledCredits` for manual attendant payouts

## Data Sources & Processing

### Primary Data Sources

The API uses **different data sources** based on the date range:

#### For Recent Data (Today/Yesterday):

1. **Machines Collection** (`sasMeters` field):
   - `coinIn` → Meters In (total bets placed)
   - `totalWonCredits` → Money Won (total winnings paid to players)
   - `jackpot` → Jackpot (jackpot payouts)
   - `drop` → Bill In (physical cash inserted)
   - `totalCancelledCredits` → Used in Voucher Out calculation
   - `totalHandPaidCancelledCredits` → Hand Paid Cancelled Credits
   - `gamesPlayed` → Games Played

#### For Historical Data (7 days, 30 days, custom ranges):

1. **Meters Collection** (per specification with Trinidad UTC-4 timezone):
   - Gets **latest meter reading** within gaming day range using specification-compliant approach
   - Uses `createdAt` field with `$gte` and `$lt` operators for date range filtering
   - **Gaming Day Logic**: Each location has a `gameDayOffset` (e.g., 11 = gaming day starts at 11:00 AM Trinidad time)
   - **Timezone Handling**: Works in Trinidad time (UTC-4), converts to range timestamps
   - **Query Pattern**: `db.meters.find({machine: "id", createdAt: {$gte: rangeStart, $lt: rangeEnd}}).sort({createdAt: -1}).limit(1)`
   - **Range Calculation**: Creates a gaming day range from start date gaming hour to end date + 1 gaming hour
     - **Example**: For Aug 21st to Aug 21st filter with `gameDayOffset: 11`:
       - Range Start = Aug 21st at 11:00 AM Trinidad time → Aug 21st at 15:00:00 UTC
       - Range End = Aug 22nd at 11:00 AM Trinidad time → Aug 22nd at 15:00:00 UTC
       - Query: `{ machine: "id", createdAt: { $gte: ISODate('2025-08-21T15:00:00.000Z'), $lt: ISODate('2025-08-22T15:00:00.000Z') } }`
     - **For 7-day filter**: If today is Aug 28th and we want last 7 days:
       - Start Date = Aug 21st (7 days ago)
       - End Date = Aug 28th (today)
       - Range = Aug 21st 11:00 AM to Aug 29th 11:00 AM (Trinidad time)
   - **Fallback Logic**: If no meter data found, falls back to `machine.sasMeters` values
   - Field mappings (from latest meter reading):
     - `coinIn` → Meters In (total bets placed as of cutoff)
     - `totalWonCredits` → Money Won (total winnings paid as of cutoff)
     - `jackpot` → Jackpot (jackpot payouts as of cutoff)
     - `drop` → Bill In (physical cash inserted as of cutoff)
     - `totalCancelledCredits` → Used in Voucher Out calculation
     - `totalHandPaidCancelledCredits` → Hand Paid Cancelled Credits
     - `gamesPlayed` → Games Played (total games as of cutoff)

#### Common Data Sources:

2. **Gaming Locations Collection**:
   - Location name resolution via `gamingLocation` field

3. **Machine Metadata**:
   - **Machine ID Display Logic** (per specification):
     - **Primary**: `serialNumber` (preferred)
     - **Fallback**: `custom.name` (if serialNumber missing)
     - **Final fallback**: `"Machine ${_id.slice(-6)}"` (if both missing)
     - Handles null/undefined values and empty strings gracefully
   - `lastActivity` → Date column

### Data Processing Logic

```typescript
// Machine ID priority resolution
const machineId =
  machine.serialNumber || machine.custom?.name || machine._id.toString();

// Validation function for all numeric values
const validateMeter = (value: unknown): number => {
  const num = Number(value) || 0;
  return num >= 0 ? num : 0; // Ensure non-negative values
};

// Date range detection
const isRecentData = isToday(start, end) || isYesterday(start, end);

if (isRecentData) {
  // For today/yesterday: use machine.sasMeters (real-time data)
  const sasMeters = machine.sasMeters || {};
  const metersData = {
    metersIn: validateMeter(sasMeters.coinIn),
    metersOut: validateMeter(sasMeters.totalWonCredits),
    jackpot: validateMeter(sasMeters.jackpot),
    billIn: validateMeter(sasMeters.drop),
    handPaidCredits: validateMeter(sasMeters.totalHandPaidCancelledCredits),
    gamesPlayed: validateMeter(sasMeters.gamesPlayed),
  };
} else {
  // For historical data: use latest meter reading from meters collection
  const meterData = await getLatestMeterReading(machineId, endDate);
  const metersData = {
    metersIn: validateMeter(meterData.coinIn),
    metersOut: validateMeter(meterData.totalWonCredits),
    jackpot: validateMeter(meterData.jackpot),
    billIn: validateMeter(meterData.drop),
    handPaidCredits: validateMeter(meterData.totalHandPaidCancelledCredits),
    gamesPlayed: validateMeter(meterData.gamesPlayed),
  };
}

// Voucher Out calculation (net cancelled credits)
const voucherOut = validateMeter(totalCancelledCredits - handPaidCredits);
```

### Financial Calculations Analysis

#### Meters Report Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

##### **Meters In (Coin In) ✅**

- **Current Implementation**:
  - Recent: `machine.sasMeters.coinIn`
  - Historical: `latestMeterReading.coinIn` (top-level field)
- **Financial Guide**:
  - Recent: `machine.sasMeters.coinIn`
  - Historical: `latestMeterData.coinIn`
- ✅ **MATCHES** - Uses correct data sources per guide specifications

##### **Money Won (Total Won Credits) ✅**

- **Current Implementation**:
  - Recent: `machine.sasMeters.totalWonCredits`
  - Historical: `latestMeterReading.totalWonCredits`
- **Financial Guide**:
  - Recent: `machine.sasMeters.totalWonCredits`
  - Historical: `latestMeterData.totalWonCredits`
- ✅ **MATCHES** - Correct field usage per guide

##### **Bill In (Drop) ✅**

- **Current Implementation**:
  - Recent: `machine.sasMeters.drop`
  - Historical: `latestMeterReading.drop` (top-level field)
- **Financial Guide**:
  - Recent: `machine.sasMeters.drop`
  - Historical: `latestMeterData.drop`
- ✅ **MATCHES** - Uses correct drop fields per guide

##### **Voucher Out Calculation ✅**

- **Current Implementation**: `totalCancelledCredits - totalHandPaidCancelledCredits`
- **Financial Guide**: `totalCancelledCredits - totalHandPaidCancelledCredits`
- ✅ **MATCHES** - Correct calculation per guide

##### **Hand Paid Cancelled Credits ✅**

- **Current Implementation**:
  - Recent: `machine.sasMeters.totalHandPaidCancelledCredits`
  - Historical: `latestMeterReading.totalHandPaidCancelledCredits`
- **Financial Guide**:
  - Recent: `machine.sasMeters.totalHandPaidCancelledCredits`
  - Historical: `latestMeterData.totalHandPaidCancelledCredits`
- ✅ **MATCHES** - Direct field access per guide

##### **Jackpot ✅**

- **Current Implementation**:
  - Recent: `machine.sasMeters.jackpot`
  - Historical: `latestMeterReading.jackpot`
- **Financial Guide**:
  - Recent: `machine.sasMeters.jackpot`
  - Historical: `latestMeterData.jackpot`
- ✅ **MATCHES** - Correct jackpot field usage

##### **Games Played ✅**

- **Current Implementation**:
  - Recent: `machine.sasMeters.gamesPlayed`
  - Historical: `latestMeterReading.gamesPlayed`
- **Financial Guide**:
  - Recent: `machine.sasMeters.gamesPlayed`
  - Historical: `latestMeterData.gamesPlayed`
- ✅ **MATCHES** - Correct games played field

#### Data Source Strategy Analysis

##### **Recent Data Strategy ✅**

- **Current Implementation**: Uses `machine.sasMeters` for Today/Yesterday
- **Financial Guide**: "For Recent Data (Today/Yesterday): use machine.sasMeters"
- ✅ **MATCHES** - Follows guide's data source strategy

##### **Historical Data Strategy ✅**

- **Current Implementation**: Uses latest reading from `meters` collection top-level fields
- **Financial Guide**: "For Historical Data: use meters collection top-level fields"
- ✅ **MATCHES** - Correct historical data approach

##### **Gaming Day Logic ✅**

- **Current Implementation**: Uses `gameDayOffset` with 24-hour gaming day calculation
- **Business Logic**: Gaming day starts at location's `gameDayOffset` hour (e.g., 11 AM)
- **Date Range**: `startDate at gameDayOffset` to `endDate + 1 day at gameDayOffset`
- ✅ **CONSISTENT** - Proper gaming day boundary implementation

#### Mathematical Formulas

##### **Voucher Out Calculation**

```
voucherOut = totalCancelledCredits - totalHandPaidCancelledCredits
```

**Where:**

- `totalCancelledCredits` = All credits removed from machine
- `totalHandPaidCancelledCredits` = Manual attendant payouts
- **Result**: Net automatic voucher/ticket payouts (excludes manual intervention)

##### **Data Validation Formula**

```
validatedValue = max(0, Number(rawValue) || 0)
```

**Where:**

- `rawValue` = Raw meter reading from database
- **Result**: Non-negative number (prevents negative financial values)

### Historical Data Query

For historical data, the API uses MongoDB aggregation to get the latest meter reading per machine:

```javascript
// Get latest meter reading for each machine before the end date
const metersAggregation = await db
  .collection('meters')
  .aggregate([
    {
      $match: {
        machine: { $in: machineIds },
        readAt: { $lte: endDate }, // Filter by readAt field
      },
    },
    {
      $sort: { machine: 1, readAt: -1 }, // Sort by readAt descending
    },
    {
      $group: {
        _id: '$machine',
        latestMeter: { $first: '$$ROOT' }, // Get the latest reading
      },
    },
    {
      $replaceRoot: { newRoot: '$latestMeter' },
    },
    {
      $project: {
        machine: 1,
        coinIn: 1, // Top-level field, not movement.coinIn
        coinOut: 1, // Top-level field, not movement.coinOut
        totalCancelledCredits: 1,
        totalHandPaidCancelledCredits: 1,
        drop: 1, // Top-level field, not movement.drop
        jackpot: 1,
        gamesPlayed: 1,
        readAt: 1,
        createdAt: 1,
      },
    },
  ])
  .toArray();
```

## Casino Machine Context

### Understanding the Meter Fields

1. **Coin In (Meters In)**:
   - Represents the total value of all bets placed by players
   - Electronic tracking of wager activity
   - Used for calculating theoretical hold percentages

2. **Coin Out (Money Won)**:
   - Automatic payouts dispensed by the machine
   - Does not include manual attendant payouts
   - Electronic winnings paid directly to players

3. **Drop (Bill In)**:
   - Physical currency inserted into the bill acceptor (`sasMeters.drop`)
   - Actual cash flow into the machine from bill validator
   - Critical for cash reconciliation and vault management
   - Represents actual dollar bills inserted by players

4. **Total Cancelled Credits**:
   - All credits removed from the machine (`sasMeters.totalCancelledCredits`)
   - Includes both voucher dispensing and manual attendant payouts
   - Total of all credit removal transactions

5. **Hand Paid Cancelled Credits**:
   - Manual payouts processed by casino attendants (`sasMeters.totalHandPaidCancelledCredits`)
   - Typically for large wins exceeding machine's payout capacity
   - Machine malfunctions requiring manual intervention
   - Requires attendant verification and documentation

6. **Voucher Out (Net Cancelled Credits)**:
   - Voucher-based payouts only (excluding hand-paid)
   - Automatic ticket/voucher dispensing by the machine
   - Calculated as: `totalCancelledCredits - totalHandPaidCancelledCredits`
   - Represents self-service player cashouts

## API Implementation

### Request Example

```typescript
const params = new URLSearchParams({
  locations: 'loc1,loc2,loc3',
  startDate: '2025-02-01T00:00:00.000Z',
  endDate: '2025-02-26T23:59:59.999Z',
  page: '1',
  limit: '10',
  search: 'machine123',
  licencee: 'licensee_id',
});

const response = await fetch(`/api/reports/meters?${params}`);
const data = await response.json();
```

### Response Example

```json
{
  "data": [
    {
      "machineId": "SN123456789",
      "metersIn": 25000,
      "metersOut": 22500,
      "jackpot": 1500,
      "billIn": 15000,
      "voucherOut": 8500,
      "attPaidCredits": 2000,
      "gamesPlayed": 1250,
      "location": "Main Gaming Floor",
      "createdAt": "2025-02-26T10:30:00.000Z"
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

## Performance Considerations

### Database Optimization

- **Indexing**: Proper indexes on machine, location, and readAt fields
- **Aggregation**: Efficient MongoDB aggregation pipelines
- **Caching**: Frequently accessed metrics cached
- **Pagination**: Large datasets paginated

### Query Optimization

- **Time-based Queries**: Optimized date range queries
- **Location Filtering**: Efficient location-based filtering
- **Machine Filtering**: Optimized machine-specific queries
- **Aggregation**: Efficient data aggregation for metrics

### Response Optimization

- **Data Compression**: Large responses compressed
- **Field Selection**: Only required fields returned
- **Pagination**: Large result sets paginated
- **Caching**: Frequently requested data cached

## Business Logic

### Meter Data Processing

- **Real-time Updates**: Meter data updated in real-time
- **Historical Data**: Complete historical meter data preserved
- **Data Validation**: All meter readings validated
- **Error Handling**: Graceful handling of invalid data

### Financial Calculations

- **Accuracy**: Precise financial calculations
- **Consistency**: Consistent calculations across all endpoints
- **Performance**: Optimized calculation performance
- **Audit Trail**: Complete audit trail of calculations

### Time Zone Handling

- **UTC Storage**: All data stored in UTC
- **Local Display**: Data displayed in local timezone
- **Conversion**: Automatic timezone conversion
- **Consistency**: Consistent time handling across system

### Database Indexing

```javascript
// Required indexes for optimal performance
machineSchema.index({ gamingLocation: 1, deletedAt: 1 });
machineSchema.index({ serialNumber: 1 });
machineSchema.index({ lastActivity: -1 });
metersSchema.index({ machine: 1, createdAt: -1 });
```

### Query Optimization

1. **Location Pre-filtering**: Machines filtered by selected locations first
2. **Latest Meter Lookup**: Efficient sorting by `createdAt` descending
3. **Pagination**: Server-side pagination with skip/limit
4. **Data Validation**: All numeric values validated for non-negative values

## Error Handling

### Common Scenarios

1. **Missing Locations Parameter**:

   ```json
   {
     "error": "Locations parameter is required",
     "status": 400
   }
   ```

2. **No Data Found**:

   ```json
   {
     "data": [],
     "totalCount": 0,
     "message": "No meter data found for selected criteria"
   }
   ```

3. **Database Connection Issues**:
   ```json
   {
     "error": "DB connection failed",
     "status": 500
   }
   ```

## Security & Validation

### Input Validation

- **Locations**: Required parameter, comma-separated string validation
- **Date Range**: Valid ISO date string format
- **Pagination**: Numeric validation with reasonable limits
- **Search**: String sanitization for SQL injection prevention
- **Licensee**: Valid licensee ID format

### Data Protection

- **User Authentication**: Valid JWT token required
- **Role-based Access**: Data filtered by user permissions
- **Licensee Filtering**: Users only see data for their assigned licensees

## Integration Points

### Related APIs

- **Location Aggregation**: `/api/locationAggregation`
- **Machine Reports**: `/api/reports/machines`
- **Analytics**: `/api/analytics/machines`

### Frontend Components

- **MetersTab**: `components/reports/tabs/MetersTab.tsx`
  - Refetches locations when licensee filter changes
  - Supports debounced search with chart synchronization
- **LocationMultiSelect**: Location selection component
  - Scrollable selected locations list (max 30 visible)
  - Vertical scrolling for large location selections
- **MetersHourlyCharts**: `components/ui/MetersHourlyCharts.tsx`
  - Mobile-responsive hourly charts with horizontal scrolling
  - Responsive label formatting and touch-friendly interactions
  - Charts automatically filter based on search term
- **Pagination**: Server-side pagination controls

## Monitoring & Logging

### Performance Metrics

```typescript
// Request timing and data volume logging
console.log(
  `Meters report: ${machinesData.length} machines, ${metersData.length} meter readings processed`
);
console.log(`Query completed in ${duration}ms`);
```

### Error Tracking

```typescript
// Comprehensive error logging
console.error('❌ Meters Report API Error:', {
  error: error.message,
  params: { locations, startDate, endDate, page, limit },
  timestamp: new Date().toISOString(),
});
```

## Business Rules

### Data Integrity

1. **Non-negative Values**: All meter readings must be ≥ 0
2. **Machine Validation**: Only include non-deleted machines
3. **Latest Data Priority**: Use most recent meter reading per machine
4. **Location Filtering**: Respect user's location access permissions

### Calculation Logic

1. **Voucher Out**: Always calculated as `totalCancelledCredits - totalHandPaidCancelledCredits`
2. **Missing Data Handling**: Default to 0 for missing/null values
3. **Machine ID Priority**: `serialNumber` > `Custom.name` > `_id`
4. **Date Filtering**: Filter machines by `lastActivity` within date range

## Related Documentation

- [Financial Metrics Guide](../financial-metrics-guide.md)
- [Reports API Overview](reports-api.md)
- [Meters Model](../api/lib/models/meters.ts)
- [Frontend Reports](../frontend/reports.md)

---

**Last Updated**: November 20, 2025  
**Version**: 1.1  
**Maintained By**: Evolution One CMS Development Team

## Recent Updates (November 20, 2025)

### UI/UX Improvements

- **Licensee Filter Refetching**: MetersTab now automatically refetches locations when licensee filter changes
- **Mobile Chart Optimization**:
  - Horizontal scrolling for charts with many data points
  - Reduced label frequency on mobile devices
  - Touch-friendly interactions with larger touch targets
  - Responsive height and margin adjustments
- **Scrollable Location Lists**:
  - LocationMultiSelect and MultiSelectDropdown now show max 30 visible locations
  - Vertical scrolling for large location selections
  - Improved UX for users with many location assignments
- **Chart-Table Synchronization**: Hourly charts automatically filter to match table search results
