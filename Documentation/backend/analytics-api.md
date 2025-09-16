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
