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
