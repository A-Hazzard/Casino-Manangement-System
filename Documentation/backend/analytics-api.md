
# Analytics API

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025

## Quick Search Guide (Ctrl+F)

- **dashboard analytics** - Dashboard metrics and KPIs
- **location analytics** - Location performance analytics
- **machine analytics** - Machine performance analytics
- **financial analytics** - Financial performance metrics
- **time series** - Time-based analytics
- **performance metrics** - Performance KPIs
- **trends** - Trend analysis endpoints
- **comparisons** - Comparison analytics
- **aggregations** - Data aggregation endpoints
- **charts** - Chart data endpoints

## Overview

The Analytics API provides comprehensive analytics and reporting capabilities for casino operations, financial performance, and business intelligence.

## Dashboard Analytics System

### What Happens When Dashboard Metrics Are Calculated

1. **Database Operations**:
   - Queries `machines` collection for machine counts and status
   - Aggregates data from `meters` collection for financial calculations
   - Filters by licensee and date ranges
   - Calculates real-time statistics

2. **Dashboard Metrics Model Fields**:
```typescript
DashboardMetrics {
  totalDrop: number;              // Total money collected from all machines
  totalCancelledCredits: number;  // Total credits cancelled by players
  totalGross: number;             // Net revenue (drop - cancelled credits)
  totalMachines: number;          // Total number of machines in system
  onlineMachines: number;         // Machines that communicated within last 3 minutes
  sasMachines: number;            // Number of SAS-enabled machines
}
```

3. **Financial Calculation Formulas**:
```javascript
// Total Drop Calculation
totalDrop = Σ(movement.drop) across all machines and time period

// Total Cancelled Credits Calculation  
totalCancelledCredits = Σ(movement.totalCancelledCredits) across all machines and time period

// Total Gross Revenue Calculation
totalGross = totalDrop - totalCancelledCredits

// Machine Status Calculations
onlineMachines = COUNT(machines WHERE lastActivity >= currentTime - 3 minutes)
totalMachines = COUNT(machines WHERE deletedAt IS NULL)
sasMachines = COUNT(machines WHERE isSasMachine = true AND deletedAt IS NULL)
```

### Dashboard Analytics Process Flow

1. **Data Collection**: Gathers meter data from all active machines
2. **Aggregation**: Sums financial metrics across specified time period
3. **Status Calculation**: Determines machine online/offline status
4. **Formatting**: Formats data for frontend display
5. **Response**: Returns calculated metrics to dashboard

## Revenue Analytics System

### What Happens When Revenue Reports Are Generated

1. **Database Operations**:
   - Queries `meters` collection with date range filters
   - Aggregates financial data by location, machine, or time period
   - Calculates performance metrics and trends
   - Groups data according to report configuration

2. **Revenue Report Model Fields**:
```typescript
RevenueReport {
  summary: {
    totalRevenue: number;         // Total revenue across all locations
    totalMachines: number;        // Total number of machines included
    averageUtilization: number;   // Average machine utilization percentage
  };
  details: [{
    locationId: string;           // Location identifier
    locationName: string;         // Location display name
    revenue: number;              // Revenue for this location
    machines: number;             // Number of machines at location
    utilization: number;          // Machine utilization percentage
  }];
  charts: {
    revenueChart: {
      type: string;               // Chart type (bar, line, pie)
      data: any[];                // Chart data points
    };
  };
}
```

3. **Revenue Calculation Formulas**:
```javascript
// Location Revenue Calculation
locationRevenue = Σ(movement.drop) WHERE gamingLocation = locationId AND readAt BETWEEN startDate AND endDate

// Machine Utilization Calculation
utilization = (activeHours / totalHours) * 100

// Average Utilization Calculation
averageUtilization = Σ(utilization) / COUNT(machines)

// Revenue Trend Calculation
revenueTrend = (currentPeriod - previousPeriod) / previousPeriod * 100
```

## Machine Performance Analytics

### What Happens When Machine Analytics Are Calculated

1. **Database Operations**:
   - Queries `machines` collection for machine details
   - Aggregates meter data for performance metrics
   - Calculates utilization and efficiency ratios
   - Ranks machines by performance criteria

2. **Machine Analytics Model Fields**:
```typescript
MachineAnalytics {
  _id: string;                    // Machine identifier
  serialNumber: string;           // Machine serial number
  name: string;                   // Machine display name
  manufacturer: string;           // Machine manufacturer
  model: string;                  // Machine model
  location: string;               // Location name
  metrics: {
    totalRevenue: number;         // Total revenue from machine
    gamesPlayed: number;          // Total games played
    utilization: number;          // Machine utilization percentage
    averageBet: number;           // Average bet amount
    winRate: number;              // Win rate percentage
  };
  status: string;                 // Machine status (active, maintenance, offline)
  lastUpdate: Date;               // Last data update timestamp
}
```

3. **Machine Performance Formulas**:
```javascript
// Machine Revenue Calculation
machineRevenue = Σ(movement.drop) WHERE machine = machineId AND readAt BETWEEN startDate AND endDate

// Games Played Calculation
gamesPlayed = Σ(movement.gamesPlayed) WHERE machine = machineId AND readAt BETWEEN startDate AND endDate

// Machine Utilization Calculation
utilization = (activeTime / totalTime) * 100

// Average Bet Calculation
averageBet = Σ(movement.coinIn) / Σ(movement.gamesPlayed)

// Win Rate Calculation
winRate = (Σ(movement.gamesWon) / Σ(movement.gamesPlayed)) * 100
```

## Location Analytics System

### What Happens When Location Analytics Are Calculated

1. **Database Operations**:
   - Queries `machines` collection filtered by location
   - Aggregates meter data by location
   - Calculates location-specific metrics
   - Includes machine details if requested

2. **Location Analytics Model Fields**:
```typescript
LocationAnalytics {
  _id: string;                    // Location identifier
  name: string;                   // Location name
  address: string;                // Location address
  metrics: {
    totalRevenue: number;         // Total revenue from location
    totalMachines: number;        // Total machines at location
    onlineMachines: number;       // Online machines at location
    utilization: number;          // Location utilization percentage
    averageRevenuePerMachine: number; // Average revenue per machine
  };
  machines: [{
    machineId: string;            // Machine identifier
    name: string;                 // Machine name
    revenue: number;              // Machine revenue
    status: string;               // Machine status
  }];
}
```

3. **Location Performance Formulas**:
```javascript
// Location Revenue Calculation
locationRevenue = Σ(movement.drop) WHERE gamingLocation = locationId AND readAt BETWEEN startDate AND endDate

// Location Machine Count
totalMachines = COUNT(machines WHERE gamingLocation = locationId AND deletedAt IS NULL)

// Online Machines at Location
onlineMachines = COUNT(machines WHERE gamingLocation = locationId AND lastActivity >= currentTime - 3 minutes)

// Location Utilization
utilization = (onlineMachines / totalMachines) * 100

// Average Revenue Per Machine
averageRevenuePerMachine = locationRevenue / totalMachines
```

## Top Machines Analytics

### What Happens When Top Machines Are Ranked

1. **Database Operations**:
   - Queries `machines` collection with performance criteria
   - Aggregates meter data for ranking metrics
   - Sorts machines by specified performance metric
   - Limits results to top N machines

2. **Top Machines Model Fields**:
```typescript
TopMachines {
  rank: number;                   // Performance ranking (1, 2, 3, etc.)
  machineId: string;              // Machine identifier
  machineName: string;            // Machine display name
  location: string;               // Location name
  revenue: number;                // Total revenue
  gamesPlayed: number;            // Total games played
  utilization: number;            // Machine utilization percentage
  performance: number;            // Overall performance score
}
```

3. **Top Machines Ranking Formulas**:
```javascript
// Revenue Ranking
revenueRanking = ORDER BY Σ(movement.drop) DESC

// Games Played Ranking
gamesRanking = ORDER BY Σ(movement.gamesPlayed) DESC

// Utilization Ranking
utilizationRanking = ORDER BY utilization DESC

// Performance Score Calculation
performanceScore = (revenue * 0.4) + (gamesPlayed * 0.3) + (utilization * 0.3)
```

## Hourly Revenue Trends

### What Happens When Hourly Trends Are Calculated

1. **Database Operations**:
   - Queries `meters` collection grouped by hour
   - Aggregates revenue data for each hour
   - Calculates hourly averages and patterns
   - Identifies peak performance hours

2. **Hourly Trends Model Fields**:
```typescript
HourlyTrends {
  hourlyData: [{
    hour: number;                 // Hour of day (0-23)
    revenue: number;              // Revenue for this hour
    gamesPlayed: number;          // Games played in this hour
    averageBet: number;           // Average bet amount
  }];
  summary: {
    totalRevenue: number;         // Total revenue for period
    peakHour: number;             // Hour with highest revenue
    peakRevenue: number;          // Revenue at peak hour
  };
}
```

3. **Hourly Trend Formulas**:
```javascript
// Hourly Revenue Calculation
hourlyRevenue = Σ(movement.drop) WHERE HOUR(readAt) = hour AND readAt BETWEEN startDate AND endDate

// Hourly Games Played
hourlyGames = Σ(movement.gamesPlayed) WHERE HOUR(readAt) = hour AND readAt BETWEEN startDate AND endDate

// Hourly Average Bet
hourlyAverageBet = Σ(movement.coinIn) / Σ(movement.gamesPlayed) WHERE HOUR(readAt) = hour

// Peak Hour Identification
peakHour = MAX(revenue) BY hour
```

## Trend Analysis System

### What Happens When Trend Data Is Analyzed

1. **Database Operations**:
   - Queries `meters` collection with time period filters
   - Groups data by specified period (daily, weekly, monthly)
   - Calculates trend indicators and percentage changes
   - Identifies growth patterns and anomalies

2. **Trend Analysis Model Fields**:
```typescript
TrendAnalysis {
  trends: [{
    date: string;                 // Date of trend data point
    handle: number;               // Total handle (money in)
    jackpot: number;              // Jackpot amounts
    winLoss: number;              // Win/loss amount
    plays: number;                // Number of plays
  }];
  summary: {
    trend: string;                // Trend direction (increasing, decreasing, stable)
    percentageChange: number;     // Percentage change from previous period
    averageValue: number;         // Average value across period
  };
}
```

3. **Trend Analysis Formulas**:
```javascript
// Handle Trend Calculation
handleTrend = Σ(movement.coinIn) BY date

// Jackpot Trend Calculation
jackpotTrend = Σ(movement.jackpot) BY date

// Win/Loss Trend Calculation
winLossTrend = Σ(movement.coinIn) - Σ(movement.coinOut) BY date

// Plays Trend Calculation
playsTrend = Σ(movement.gamesPlayed) BY date

// Percentage Change Calculation
percentageChange = ((currentPeriod - previousPeriod) / previousPeriod) * 100

// Trend Direction
trendDirection = percentageChange > 5 ? "increasing" : percentageChange < -5 ? "decreasing" : "stable"
```

## API Endpoints

### Dashboard Analytics

**Base URL:** `/api/analytics`

#### GET /api/analytics/dashboard
**What it does**: Retrieves global dashboard statistics for a specific licensee
**Database Operations**:
- Queries `machines` collection for machine counts
- Aggregates `meters` data for financial calculations
- Filters by licensee and date ranges
**Query Parameters**: `licensee` (required) - Licensee name for filtering
**Response Fields**: Returns `DashboardMetrics` object with calculated statistics
**Used By**: Dashboard page for real-time metrics display

#### POST /api/analytics/reports
**What it does**: Generates comprehensive reports based on configuration parameters
**Database Operations**:
- Queries multiple collections based on report type
- Aggregates data according to grouping criteria
- Calculates summary statistics and trends
**Request Fields**: Report configuration including title, type, date range, filters
**Response Fields**: Returns `RevenueReport` object with summary and details
**Used By**: Reports page for report generation and export

#### GET /api/analytics/charts
**What it does**: Retrieves chart data for various analytics visualizations
**Database Operations**:
- Queries data based on chart type and filters
- Formats data for chart library consumption
- Applies date range and location filters
**Query Parameters**: `chartType`, `dateRange`, `licensee`
**Response Fields**: Returns chart data with labels and datasets
**Used By**: Dashboard charts and visualization components

### Machine Analytics

#### GET /api/analytics/machines
**What it does**: Retrieves machine-specific analytics and performance data
**Database Operations**:
- Queries `machines` collection with filters
- Aggregates meter data for performance metrics
- Calculates utilization and efficiency ratios
**Query Parameters**: `locationId`, `manufacturer`, `status`, `dateRange`
**Response Fields**: Returns array of `MachineAnalytics` objects
**Used By**: Machine management page and performance reports

#### GET /api/analytics/top-machines
**What it does**: Retrieves top-performing machines based on various metrics
**Database Operations**:
- Aggregates machine performance data
- Ranks machines by specified metric
- Limits results to top N machines
**Query Parameters**: `metric`, `limit`, `dateRange`, `locationId`
**Response Fields**: Returns array of `TopMachines` objects with rankings
**Used By**: Performance dashboards and optimization analysis

### Location Analytics

#### GET /api/analytics/locations
**What it does**: Retrieves location-based analytics and performance metrics
**Database Operations**:
- Queries `machines` collection filtered by location
- Aggregates meter data by location
- Calculates location-specific metrics
**Query Parameters**: `licensee`, `dateRange`, `includeMachines`
**Response Fields**: Returns array of `LocationAnalytics` objects
**Used By**: Location management page and geographic analytics

### Trend Analytics

#### GET /api/analytics/hourly-revenue
**What it does**: Retrieves hourly revenue trends and patterns
**Database Operations**:
- Queries `meters` collection grouped by hour
- Aggregates revenue data for each hour
- Identifies peak performance hours
**Query Parameters**: `date`, `locationId`, `machineId`
**Response Fields**: Returns `HourlyTrends` object with hourly data and summary
**Used By**: Revenue trend analysis and operational planning

#### GET /api/analytics/trends
**What it does**: Retrieves various trend data including handle, jackpot, and win/loss trends
**Database Operations**:
- Queries `meters` collection with time period filters
- Groups data by specified period
- Calculates trend indicators and changes
**Query Parameters**: `trendType`, `period`, `dateRange`
**Response Fields**: Returns `TrendAnalysis` object with trends and summary
**Used By**: Trend analysis dashboards and performance monitoring

## Performance Considerations

### Database Optimization
- **Indexing**: Proper indexes on frequently queried fields (`machine`, `gamingLocation`, `readAt`)
- **Aggregation Pipelines**: Efficient MongoDB aggregation for complex calculations
- **Query Optimization**: Optimized queries with proper filtering and grouping
- **Caching**: Response caching for frequently accessed analytics data

### API Performance
- **Pagination**: Efficient pagination for large datasets
- **Response Compression**: Compressed responses for large analytics data
- **Rate Limiting**: Protection against excessive API usage
- **Background Processing**: Heavy calculations processed in background

## Error Handling

### Common Error Scenarios
- **Invalid Date Ranges**: Malformed date parameters
- **Missing Licensee**: Required licensee parameter not provided
- **No Data Found**: No data available for specified criteria
- **Calculation Errors**: Mathematical errors in aggregation

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```

## Security Features

### Access Control
- **Authentication**: JWT token required for all endpoints
- **Authorization**: Role-based access to analytics data
- **Data Filtering**: Results filtered by user permissions
- **Audit Logging**: All analytics queries logged for compliance

### Data Protection
- **Input Validation**: Comprehensive validation of all parameters
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: Protection against API abuse
- **Data Sanitization**: Output sanitization for security

# Analytics API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Analytics API provides comprehensive data analytics and reporting capabilities for the gaming system. It includes dashboard metrics, trend analysis, performance reports, and data visualization endpoints.

## Base URL
```
/api/analytics
```

## Endpoints

### GET /api/analytics/dashboard
Retrieves global dashboard statistics for a specific licensee.

**Query Parameters:**
- `licensee` (string, required): Licensee name for filtering data

**Response (Success - 200):**
```json
{
  "globalStats": {
    "totalDrop": 150000.00,
    "totalCancelledCredits": 5000.00,
    "totalGross": 45000.00,
    "totalMachines": 150,
    "onlineMachines": 142,
    "sasMachines": 120
  }
}
```

**Response (Error - 400):**
```json
{
  "message": "Licensee is required"
}
```

**Used By:**
- Dashboard page (`/`) - Main dashboard metrics
- Real-time dashboard updates
- Licensee-specific analytics

---

### POST /api/analytics/reports
Generates comprehensive reports based on configuration parameters.

**Request Body:**
```json
{
  "title": "Monthly Revenue Report",
  "reportType": "locationPerformance",
  "dateRange": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z"
  },
  "filters": {
    "locationIds": ["location_1", "location_2"],
    "manufacturers": ["IGT", "Bally"]
  },
  "fields": ["revenue", "machines", "utilization"],
  "chartType": "bar"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 250000.00,
      "totalMachines": 150,
      "averageUtilization": 85.5
    },
    "details": [
      {
        "locationId": "location_1",
        "locationName": "Main Casino",
        "revenue": 150000.00,
        "machines": 100,
        "utilization": 90.2
      }
    ],
    "charts": {
      "revenueChart": {
        "type": "bar",
        "data": [...]
      }
    }
  }
}
```

**Used By:**
- `/reports` page - Report generation page
- Export functionality (CSV/Excel)
- Dashboard widgets

---

### GET /api/analytics/charts
Retrieves chart data for various analytics visualizations.

**Query Parameters:**
- `chartType` (string, required): Type of chart (revenue, machines, trends)
- `dateRange` (string, optional): Date range for data
- `licensee` (string, optional): Licensee filter

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr"],
    "datasets": [
      {
        "label": "Revenue",
        "data": [150000, 180000, 220000, 250000],
        "backgroundColor": "rgba(54, 162, 235, 0.2)"
      }
    ]
  }
}
```

**Used By:**
- Dashboard charts and visualizations
- Report generation
- Real-time analytics display

---

### GET /api/analytics/locations
Retrieves location-based analytics and performance metrics.

**Query Parameters:**
- `licensee` (string, optional): Filter by licensee
- `dateRange` (string, optional): Date range for metrics
- `includeMachines` (boolean, optional): Include machine details

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "_id": "location_1",
        "name": "Main Casino",
        "address": "123 Casino St",
        "metrics": {
          "totalRevenue": 150000.00,
          "totalMachines": 100,
          "onlineMachines": 95,
          "utilization": 90.2,
          "averageRevenuePerMachine": 1500.00
        },
        "machines": [
          {
            "machineId": "machine_1",
            "name": "Slot Machine A",
            "revenue": 5000.00,
            "status": "active"
          }
        ]
      }
    ]
  }
}
```

**Used By:**
- `/locations` page - Location management
- Location performance reports
- Geographic analytics

---

### GET /api/analytics/machines
Retrieves machine-specific analytics and performance data.

**Query Parameters:**
- `locationId` (string, optional): Filter by location
- `manufacturer` (string, optional): Filter by manufacturer
- `status` (string, optional): Filter by machine status
- `dateRange` (string, optional): Date range for metrics

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "machines": [
      {
        "_id": "machine_1",
        "serialNumber": "SN123456",
        "name": "Slot Machine A",
        "manufacturer": "IGT",
        "model": "Game King",
        "location": "Main Casino",
        "metrics": {
          "totalRevenue": 5000.00,
          "gamesPlayed": 1000,
          "utilization": 85.5,
          "averageBet": 2.50,
          "winRate": 95.2
        },
        "status": "active",
        "lastUpdate": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

**Used By:**
- Machine management page
- Machine performance reports
- Maintenance scheduling

---

### GET /api/analytics/top-machines
Retrieves top-performing machines based on various metrics.

**Query Parameters:**
- `metric` (string, required): Performance metric (revenue, games, utilization)
- `limit` (number, default: 10): Number of machines to return
- `dateRange` (string, optional): Date range for analysis
- `locationId` (string, optional): Filter by location

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "topMachines": [
      {
        "rank": 1,
        "machineId": "machine_1",
        "machineName": "Slot Machine A",
        "location": "Main Casino",
        "revenue": 15000.00,
        "gamesPlayed": 5000,
        "utilization": 95.5,
        "performance": 98.2
      }
    ]
  }
}
```

**Used By:**
- Performance dashboards
- Machine optimization analysis
- Revenue optimization

---

### GET /api/analytics/hourly-revenue
Retrieves hourly revenue trends and patterns.

**Query Parameters:**
- `date` (string, optional): Specific date for analysis
- `locationId` (string, optional): Filter by location
- `machineId` (string, optional): Filter by specific machine

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "hourlyData": [
      {
        "hour": 0,
        "revenue": 5000.00,
        "gamesPlayed": 200,
        "averageBet": 25.00
      },
      {
        "hour": 1,
        "revenue": 4500.00,
        "gamesPlayed": 180,
        "averageBet": 25.00
      }
    ],
    "summary": {
      "totalRevenue": 120000.00,
      "peakHour": 20,
      "peakRevenue": 8000.00
    }
  }
}
```

**Used By:**
- Revenue trend analysis
- Peak hour identification
- Operational planning

---

### GET /api/analytics/trends
Retrieves various trend data including handle, jackpot, and win/loss trends.

**Query Parameters:**
- `trendType` (string, required): Type of trend (handle, jackpot, winloss, plays)
- `period` (string, optional): Time period (daily, weekly, monthly)
- `dateRange` (string, optional): Custom date range

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2024-01-01",
        "handle": 50000.00,
        "jackpot": 5000.00,
        "winLoss": 4500.00,
        "plays": 2000
      }
    ],
    "summary": {
      "trend": "increasing",
      "percentageChange": 15.5,
      "averageValue": 52000.00
    }
  }
}
```

**Used By:**
- Trend analysis dashboards
- Performance monitoring
- Predictive analytics

## Report Types

### Location Performance Report
- **Purpose**: Analyze performance across different gaming locations
- **Metrics**: Revenue, machine utilization, player activity
- **Visualization**: Bar charts, heat maps, geographic distribution

### Machine Revenue Report
- **Purpose**: Track individual machine performance and revenue
- **Metrics**: Revenue per machine, games played, win rates
- **Visualization**: Line charts, scatter plots, performance rankings

### Full Financials Report
- **Purpose**: Comprehensive financial analysis and reporting
- **Metrics**: Revenue, expenses, profit margins, ROI
- **Visualization**: Pie charts, stacked bar charts, financial dashboards

## Chart Types

| Chart Type | Description | Use Case |
|------------|-------------|----------|
| `bar` | Bar chart | Revenue comparison, machine rankings |
| `line` | Line chart | Trend analysis, time series data |
| `pie` | Pie chart | Revenue distribution, market share |
| `scatter` | Scatter plot | Correlation analysis, performance vs. utilization |
| `heatmap` | Heat map | Geographic distribution, time-based patterns |

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (Invalid parameters) |
| 401 | Unauthorized (Authentication required) |
| 404 | Not Found (Data not available) |
| 500 | Internal Server Error |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Aggregation**: MongoDB aggregation pipeline for complex analytics
- **Validation**: Zod schema validation
- **Chart Generation**: Chart.js or similar library integration
- **Authentication**: JWT token validation

## Related Frontend Pages

- **Dashboard** (`/`): Main analytics dashboard
- **Reports** (`/reports`): Report generation and management
- **Locations** (`/locations`): Location-based analytics
- **Machines** (`/machines`): Machine performance analytics

### Financial Calculations Analysis

#### Dashboard Analytics Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

##### **Total Drop (Money In) ✅**
- **Current Implementation**: 
  ```javascript
  totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Aggregate physical cash inserted across all machines
- **Aggregation Level**: Global sum across all licensee locations

##### **Total Cancelled Credits (Money Out) ✅**
- **Current Implementation**: 
  ```javascript
  totalCancelledCredits: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } }
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: All credits paid out to players (vouchers + hand-paid)
- **Aggregation Level**: Global sum across all licensee locations

##### **Total Gross Revenue ✅**
- **Current Implementation**: 
  ```javascript
  totalGross = totalDrop - totalCancelledCredits
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: `totalGross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)`

##### **Machine Status Calculations ✅**
- **Current Implementation**: 
  ```javascript
  // Online machines
  lastActivity: { $gte: new Date(Date.now() - 3 * 60 * 1000) }
  // Total machines  
  deletedAt: { $exists: false }
  // SAS machines
  isSasMachine: true
  ```
- **Business Logic**: 
  - **Online**: `lastActivity >= (currentTime - 3 minutes)`
  - **Total**: Count of non-deleted machines
  - **SAS**: Count of SAS-enabled machines
- ✅ **CONSISTENT** - Standard machine status calculation

##### **Handle/Win-Loss Calculation ❌**
- **Current Implementation**: 
  ```javascript
  handle: { $sum: { $ifNull: ["$movement.coinIn", 0] } },
  winLoss: { 
    $subtract: [
      { $ifNull: ["$movement.coinIn", 0] },
      { $ifNull: ["$movement.coinOut", 0] }
    ]
  }
  ```
- **Financial Guide**: No direct equivalent for `winLoss = coinIn - coinOut`
- **Analysis**: This represents house advantage from betting activity
- ❌ **NOT IN GUIDE** - Custom calculation not defined in financial metrics guide

##### **Top Performing Analytics ✅**
- **Current Implementation**: 
  ```javascript
  // Ranked by totalDrop descending
  totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } },
  totalGamesPlayed: { $sum: { $ifNull: ["$movement.gamesPlayed", 0] } },
  totalJackpot: { $sum: { $ifNull: ["$movement.jackpot", 0] } }
  ```
- **Financial Guide**: Uses `movement.drop`, `movement.gamesPlayed`, `movement.jackpot` ✅ **MATCHES**
- **Business Logic**: Performance ranking based on money inserted (drop)

#### Mathematical Formulas Summary

##### **Core Dashboard Metrics**
```
Total Drop = Σ(movement.drop) across all machines/locations/time
Total Cancelled Credits = Σ(movement.totalCancelledCredits) across all machines/locations/time
Total Gross = Total Drop - Total Cancelled Credits
```

##### **Machine Status Counts**
```
Online Machines = COUNT(machines WHERE lastActivity >= currentTime - 3min AND deletedAt IS NULL)
Total Machines = COUNT(machines WHERE deletedAt IS NULL)
SAS Machines = COUNT(machines WHERE isSasMachine = true AND deletedAt IS NULL)
```

##### **Performance Rankings**
```
Top Locations = ORDER BY Σ(movement.drop) DESC LIMIT 5
Top Machines = ORDER BY Σ(movement.drop) DESC LIMIT 5
```

##### **Hourly/Daily Aggregations**
```
Hourly (Today/Yesterday):
  GROUP BY year, month, day, hour OF readAt
  
Daily (7d/30d/Custom):
  GROUP BY year, month, day OF readAt
```

##### **Custom Calculations (Not in Guide)**
```
Handle = Σ(movement.coinIn) across time period
Win/Loss = Handle - Coin Out = Σ(movement.coinIn) - Σ(movement.coinOut)
```
**Note**: These calculations are not defined in the financial metrics guide and may need review.

## Performance Considerations

### Data Aggregation
- **Pre-aggregated Data**: Store pre-calculated metrics for faster queries
- **Caching Strategy**: Cache frequently accessed analytics data
- **Indexing**: Proper indexing on date and filter fields
- **Pagination**: Limit result sets for large datasets

### Real-time Updates
- **WebSocket Integration**: Real-time dashboard updates
- **Incremental Updates**: Update only changed data
- **Background Processing**: Process analytics in background jobs
- **Data Streaming**: Stream large datasets efficiently
