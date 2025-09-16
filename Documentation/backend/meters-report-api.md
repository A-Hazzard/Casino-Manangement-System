# Meters Report API

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025

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
    "totalMoneyIn": 50000,           // Total drop across all locations
    "totalMoneyOut": 5000,           // Total cancelled credits
    "totalGross": 45000,             // Net revenue (moneyIn - moneyOut)
    "totalMachines": 150,            // Total machines
    "onlineMachines": 145,           // Online machines
    "averageGrossPerMachine": 300    // Average gross per machine
  },
  "locationData": [
    {
      "locationId": "location_001",
      "locationName": "Downtown Casino",
      "moneyIn": 25000,              // Location drop
      "moneyOut": 2500,              // Location cancelled credits
      "gross": 22500,                // Location gross revenue
      "totalMachines": 75,           // Total machines at location
      "onlineMachines": 72,          // Online machines at location
      "hasSasMachines": true,        // Has SAS-enabled machines
      "hasNonSasMachines": false,    // Has non-SAS machines
      "isLocalServer": true          // Uses local server
    }
  ],
  "chartData": [
    {
      "day": "2025-01-15",           // Date
      "time": "10:00",               // Time (for hourly data)
      "moneyIn": 5000,               // Drop for period
      "moneyOut": 500,               // Cancelled for period
      "gross": 4500,                 // Gross for period
      "location": "location_001",    // Location ID
      "geoCoords": {                 // GPS coordinates
        "latitude": 40.7128,
        "longitude": -74.0060
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
      "totalDrop": 25000,            // Total drop
      "totalCancelled": 2500,        // Total cancelled credits
      "totalGross": 22500,           // Net revenue
      "totalMachines": 75,           // Total machines
      "onlineMachines": 72,          // Online machines
      "sasMachines": 70,             // SAS-enabled machines
      "nonSasMachines": 5,           // Non-SAS machines
      "hasSasMachines": true,
      "hasNonSasMachines": true,
      "isLocalServer": true,
      "machines": [                  // Individual machine data (if requested)
        {
          "machineId": "machine_001",
          "serialNumber": "SN123456",
          "game": "Slot Game Pro",
          "moneyIn": 1000,           // Machine drop
          "moneyOut": 100,           // Machine cancelled credits
          "gross": 900,              // Machine gross
          "isOnline": true,          // Online status
          "hasSas": true,            // SAS enabled
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
      "moneyIn": 1000,               // Machine drop
      "moneyOut": 100,               // Machine cancelled credits
      "gross": 900,                  // Machine gross revenue
      "jackpot": 500,                // Jackpot amount
      "gamesPlayed": 1000,           // Total games played
      "averageWager": 1.0,           // Average wager per game
      "isOnline": true,              // Online status
      "hasSas": true,                // SAS enabled
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
      "group": "location_001",       // Group identifier
      "groupName": "Downtown Casino", // Group display name
      "totalDrop": 25000,            // Aggregated drop
      "totalCancelled": 2500,        // Aggregated cancelled credits
      "totalGross": 22500,           // Aggregated gross
      "machineCount": 75,            // Number of machines
      "period": "2025-01-15"         // Time period
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

**Multi-Day Custom Range:**
- Data grouped by day (daily format)
- Date format: "YYYY-MM-DD" (e.g., "2025-01-15")

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
  _id: string;                       // Unique meter reading ID
  machine: string;                   // Machine reference
  location: string;                  // Location reference
  locationSession: string;           // Location session reference
  readAt: Date;                      // Reading timestamp
  movement: {
    drop: number;                    // Money in (drop)
    totalCancelledCredits: number;   // Money out (cancelled credits)
    totalHandPaidCancelledCredits: number; // Hand-paid cancelled credits
    totalWonCredits: number;         // Total won credits
    jackpot: number;                 // Jackpot amount
    coinIn: number;                  // Total coin in (handle)
    coinOut: number;                 // Total coin out
    currentCredits: number;          // Current credits
    gamesPlayed: number;             // Games played
    gamesWon: number;                // Games won
  };
  geoCoords: {                       // GPS coordinates
    latitude: number;
    longitude: number;
  };
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

```json
{
  "error": "Invalid time period",
  "code": "INVALID_TIME_PERIOD",
  "details": {
    "timePeriod": "invalid_period",
    "validPeriods": ["Today", "Yesterday", "7d", "30d", "Custom"]
  },
  "timestamp": "2025-01-15T10:30:00Z"
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