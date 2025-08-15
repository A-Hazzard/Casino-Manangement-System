# Reports API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview

The Reports API provides comprehensive reporting and analytics capabilities for the casino management system. It includes endpoints for machine performance, location analytics, meter data, and custom report generation with advanced filtering and data aggregation.

## Base URLs
```
/api/reports
/api/analytics  
```

## Reports Endpoints

### Machine Reports

#### GET /api/reports/machines
Retrieves machine performance data with various filtering and pagination options.

**Query Parameters:**
- `type` (string, required): Report type - `overview`, `stats`, `all`, `offline`
- `timePeriod` (string, default: "Today"): Time period - `Today`, `Yesterday`, `last7days`, `last30days`, `Custom`
- `licensee` (string, optional): Filter by licensee name
- `locationId` (string, optional): Filter by specific location ID
- `onlineStatus` (string, default: "all"): Filter by machine status - `all`, `online`, `offline`
- `page` (number, default: 1): Page number for pagination (overview type only)
- `limit` (number, default: 10, max: 10): Items per page
- `startDate` (string, optional): Custom start date (ISO format, required with Custom timePeriod)
- `endDate` (string, optional): Custom end date (ISO format, required with Custom timePeriod)

**Response Types:**

**Machine Stats (`type=stats`):**
```json
{
  "success": true,
  "data": {
    "totalMachines": 150,
    "onlineMachines": 142,
    "offlineMachines": 8,
    "sasMachines": 120,
    "averageUtilization": 85.7,
    "totalRevenue": 245000.50
  }
}
```

**Machine Overview (`type=overview`):**
```json
{
  "success": true,
  "data": {
    "machines": [
      {
        "machineId": "MAC001",
        "machineName": "Lucky Stars Deluxe",
        "locationId": "LOC001",
        "locationName": "Main Casino Floor",
        "serialNumber": "SN123456789",
        "manufacturer": "IGT",
        "gameTitle": "Wheel of Fortune",
        "machineType": "slot",
        "isOnline": true,
        "sasEnabled": true,
        "coinIn": 15000.00,
        "coinOut": 13500.00,
        "netWin": 1500.00,
        "gamesPlayed": 450,
        "gamesWon": 180,
        "holdPercentage": 10.0,
        "lastActivity": "2024-01-01T12:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalCount": 150,
      "totalPages": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**All Machines (`type=all`):**
```json
{
  "success": true,
  "data": {
    "machines": [
      {
        "machineId": "MAC001",
        "machineName": "Lucky Stars Deluxe",
        "locationId": "LOC001",
        "locationName": "Main Casino Floor",
        "coinIn": 15000.00,
        "coinOut": 13500.00,
        "netWin": 1500.00,
        "gamesPlayed": 450,
        "holdPercentage": 10.0,
        "performance": "excellent",
        "utilizationRate": 92.5
      }
    ]
  }
}
```

**Offline Machines (`type=offline`):**
```json
{
  "success": true,
  "data": {
    "machines": [
      {
        "machineId": "MAC008",
        "machineName": "Golden Jackpot",
        "locationId": "LOC002",
        "locationName": "VIP Gaming Area",
        "lastOnline": "2024-01-01T08:15:00.000Z",
        "offlineDuration": "4h 15m",
        "reason": "maintenance",
        "priority": "high"
      }
    ]
  }
}
```

**Used By:**
- `/reports?section=machines` - Machines tab in reports page
- Machine performance analysis
- Maintenance scheduling
- Revenue optimization

---

#### GET /api/reports/locations
Retrieves location performance data with aggregated metrics and machine summaries.

**Query Parameters:**
- `timePeriod` (string, default: "7d"): Time period filter
- `licensee` (string, optional): Filter by licensee
- `machineTypeFilter` (string, optional): Filter by machine type
- `showAllLocations` (boolean, default: false): Include all locations regardless of activity
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10, max: 10): Items per page
- `startDate` (string, optional): Custom start date for Custom timePeriod
- `endDate` (string, optional): Custom end date for Custom timePeriod

**Response:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "locationId": "LOC001",
        "locationName": "Main Casino Floor",
        "address": "123 Casino Boulevard",
        "licenseeName": "Golden Palace Casino",
        "totalMachines": 90,
        "onlineMachines": 85,
        "offlineMachines": 5,
        "sasMachines": 72,
        "metrics": {
          "totalRevenue": 108750.00,
          "totalDrop": 875000.00,
          "totalCancelledCredits": 65000.00,
          "netWin": 43750.00,
          "actualHoldPercentage": 8.7,
          "gamesPlayed": 15420,
          "averageWager": 2.85
        },
        "performance": "excellent",
        "utilizationRate": 94.4,
        "coordinates": {
          "lat": 40.7128,
          "lng": -74.0060
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalCount": 12,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "summary": {
      "totalLocations": 12,
      "totalMachines": 450,
      "totalRevenue": 1250000.00,
      "averageHoldPercentage": 8.5
    }
  }
}
```

**Used By:**
- `/reports?section=locations` - Locations tab in reports page
- Location comparison analysis
- Geographic performance mapping
- Multi-location reporting

---

#### GET /api/reports/meters
Retrieves meter reading data and financial calculations by location and machine.

**Query Parameters:**
- `licensee` (string, optional): Filter by licensee
- `locationIds` (string[], optional): Filter by specific location IDs (comma-separated)
- `startDate` (string, optional): Start date for meter data
- `endDate` (string, optional): End date for meter data
- `includeDetails` (boolean, default: false): Include detailed machine-level data
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "meters": [
      {
        "locationId": "LOC001",
        "locationName": "Main Casino Floor",
        "machineId": "MAC001",
        "machineName": "Lucky Stars Deluxe",
        "meterData": {
          "coinIn": 15000.00,
          "coinOut": 13500.00,
          "drop": 1500.00,
          "jackpot": 250.00,
          "cancelledCredits": 200.00,
          "gamesPlayed": 450,
          "handPay": 100.00
        },
        "calculations": {
          "netWin": 1300.00,
          "holdPercentage": 8.67,
          "payoutPercentage": 90.0,
          "averageWager": 33.33
        },
        "lastUpdate": "2024-01-01T12:00:00.000Z",
        "sasEnabled": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalCount": 150,
      "totalPages": 3
    },
    "aggregates": {
      "totalCoinIn": 675000.00,
      "totalCoinOut": 607500.00,
      "totalNetWin": 67500.00,
      "averageHoldPercentage": 8.5,
      "totalGamesPlayed": 20250
    }
  }
}
```

**Used By:**
- `/reports?section=meters` - Meters tab in reports page
- Financial reconciliation
- Meter data synchronization
- Compliance reporting

---

#### GET /api/reports/daily-counts
Retrieves daily counts and voucher reports with role-based access control.

**Query Parameters:**
- `locationId` (string, optional): Filter by specific location
- `startDate` (string, optional): Start date for report period
- `endDate` (string, optional): End date for report period

**Response:**
```json
{
  "success": true,
  "data": {
    "dailyCounts": [
      {
        "date": "2024-01-01",
        "locationId": "LOC001",
        "locationName": "Main Casino Floor",
        "meterReadings": {
          "startingCoinIn": 500000.00,
          "endingCoinIn": 515000.00,
          "coinInDifference": 15000.00
        },
        "physicalCounts": {
          "dropBoxCount": 1480.00,
          "voucherCount": 250.00,
          "handPayCount": 100.00
        },
        "variances": {
          "dropVariance": 20.00,
          "voucherVariance": -5.00,
          "totalVariance": 15.00
        },
        "vouchers": {
          "issued": 45,
          "redeemed": 42,
          "outstanding": 3,
          "value": 2150.00
        }
      }
    ]
  }
}
```

**Required Roles:** admin, manager, collector

**Used By:**
- Daily operations reporting
- Financial reconciliation
- Compliance auditing
- Voucher management

## Analytics Endpoints

### Dashboard Analytics

#### GET /api/analytics/dashboard
Retrieves global dashboard statistics and KPI metrics.

**Query Parameters:**
- `licensee` (string, required): Licensee name for filtering data

**Response:**
```json
{
  "globalStats": {
    "totalDrop": 875000.00,
    "totalCancelledCredits": 65000.00,
    "totalGross": 108750.00,
    "totalMachines": 150,
    "onlineMachines": 142,
    "sasMachines": 120,
    "activeLocations": 12,
    "activePlayers": 1847,
    "gamesPlayed": 45678,
    "averageHoldPercentage": 8.7
  },
  "trends": {
    "revenueGrowth": 7.5,
    "playerGrowth": 9.1,
    "utilizationGrowth": 3.2
  },
  "alerts": [
    {
      "type": "performance",
      "message": "Machine MAC003 performance below threshold",
      "severity": "medium",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

**Used By:**
- `/reports?section=dashboard` - Dashboard tab
- Main dashboard page
- Real-time monitoring

---

#### GET /api/analytics/charts
Retrieves chart data for various analytics visualizations.

**Query Parameters:**
- `chartType` (string, required): Type of chart - `revenue`, `machines`, `trends`, `performance`
- `dateRange` (string, optional): Date range for data
- `licensee` (string, optional): Licensee filter
- `locationIds` (string[], optional): Location filter

**Response:**
```json
{
  "success": true,
  "data": {
    "chartType": "revenue",
    "labels": ["Jan", "Feb", "Mar", "Apr"],
    "datasets": [
      {
        "label": "Revenue",
        "data": [150000, 180000, 220000, 250000],
        "backgroundColor": "rgba(54, 162, 235, 0.2)",
        "borderColor": "rgba(54, 162, 235, 1)",
        "borderWidth": 2
      }
    ],
    "metadata": {
      "total": 800000,
      "average": 200000,
      "growth": 15.5
    }
  }
}
```

**Used By:**
- Dashboard charts and visualizations
- Report generation
- Performance trend analysis

---

#### GET /api/analytics/hourly-revenue
Retrieves hourly revenue trends and patterns for operational insights.

**Query Parameters:**
- `date` (string, optional): Specific date for analysis (ISO format)
- `locationId` (string, optional): Filter by specific location
- `machineId` (string, optional): Filter by specific machine

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-01",
    "hourlyData": [
      {
        "hour": 0,
        "revenue": 5000.00,
        "gamesPlayed": 200,
        "averageBet": 25.00,
        "playerCount": 45
      },
      {
        "hour": 1,
        "revenue": 4500.00,
        "gamesPlayed": 180,
        "averageBet": 25.00,
        "playerCount": 38
      }
    ],
    "summary": {
      "totalRevenue": 120000.00,
      "peakHour": 20,
      "peakRevenue": 8000.00,
      "averageHourlyRevenue": 5000.00
    }
  }
}
```

**Used By:**
- Revenue trend analysis
- Peak hour identification
- Operational planning
- Staffing optimization

---

### Report Generation

#### POST /api/analytics/reports
Generates custom reports based on configuration parameters.

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
    "locationIds": ["LOC001", "LOC002"],
    "manufacturers": ["IGT", "Bally"]
  },
  "fields": ["revenue", "machines", "utilization"],
  "chartType": "bar"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "RPT_2024_001",
    "title": "Monthly Revenue Report",
    "generatedAt": "2024-01-01T12:00:00.000Z",
    "summary": {
      "totalRevenue": 250000.00,
      "totalMachines": 150,
      "averageUtilization": 85.5
    },
    "details": [
      {
        "locationId": "LOC001",
        "locationName": "Main Casino",
        "revenue": 150000.00,
        "machines": 100,
        "utilization": 90.2
      }
    ],
    "charts": {
      "revenueChart": {
        "type": "bar",
        "data": [],
        "config": {}
      }
    }
  }
}
```

**Report Types:**
- `locationPerformance` - Location-based performance analysis
- `machineRevenue` - Machine revenue and utilization
- `fullFinancials` - Comprehensive financial reporting

**Used By:**
- Custom report generation
- Scheduled reporting
- Export functionality

## Data Models

### Machine Data Model
```typescript
interface MachineData {
  machineId: string;
  machineName: string;
  locationId: string;
  locationName: string;
  serialNumber: string;
  manufacturer: string;
  gameTitle: string;
  machineType: "slot" | "video-poker" | "keno";
  isOnline: boolean;
  sasEnabled: boolean;
  coinIn: number;
  coinOut: number;
  netWin: number;
  gamesPlayed: number;
  gamesWon: number;
  holdPercentage: number;
  utilizationRate: number;
  lastActivity: string;
  performance: "excellent" | "good" | "average" | "poor";
}
```

### Location Metrics Model
```typescript
interface LocationMetrics {
  locationId: string;
  locationName: string;
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
  sasMachines: number;
  metrics: {
    totalRevenue: number;
    totalDrop: number;
    totalCancelledCredits: number;
    netWin: number;
    actualHoldPercentage: number;
    gamesPlayed: number;
    averageWager: number;
  };
  performance: "excellent" | "good" | "average" | "poor";
  utilizationRate: number;
}
```

### Meter Data Model
```typescript
interface MeterData {
  locationId: string;
  machineId: string;
  meterData: {
    coinIn: number;
    coinOut: number;
    drop: number;
    jackpot: number;
    cancelledCredits: number;
    gamesPlayed: number;
    handPay: number;
  };
  calculations: {
    netWin: number;
    holdPercentage: number;
    payoutPercentage: number;
    averageWager: number;
  };
  lastUpdate: string;
  sasEnabled: boolean;
}
```

## Performance Optimizations

### Database Optimization
- **Aggregation Pipelines:** Complex MongoDB aggregations for performance metrics
- **Indexing Strategy:** Optimized indexes on date, location, and machine fields
- **Caching:** Redis caching for frequently accessed report data
- **Connection Pooling:** Efficient database connection management

### API Performance
- **Pagination:** All list endpoints support pagination with configurable limits
- **Field Selection:** Selective field projection to reduce payload size
- **Compression:** Response compression for large datasets
- **Rate Limiting:** Protection against API abuse

### Real-time Features
- **WebSocket Integration:** Live updates for dashboard metrics
- **Incremental Updates:** Push only changed data to reduce bandwidth
- **Background Processing:** Heavy calculations processed asynchronously

## Security Features

### Authentication & Authorization
- **JWT Token Validation:** All endpoints require valid authentication
- **Role-Based Access Control:** Different access levels (admin, manager, user)
- **Resource Permissions:** Fine-grained permissions for specific locations
- **Rate Limiting:** Protection against brute force attacks

### Data Protection
- **Input Validation:** Comprehensive validation using Zod schemas
- **SQL Injection Prevention:** Parameterized queries and ORM usage
- **Data Sanitization:** Input sanitization for all user-provided data
- **Audit Logging:** Complete audit trail for all report access

## Error Handling

### Standard Error Responses
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "timePeriod",
    "message": "Invalid time period specified"
  },
  "code": "VALIDATION_ERROR"
}
```

### HTTP Status Codes
- **200:** Success
- **400:** Bad Request (validation errors)
- **401:** Unauthorized (authentication required)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found (resource not found)
- **500:** Internal Server Error

## Dependencies

- **MongoDB:** Primary database with aggregation capabilities
- **Mongoose:** ODM for data modeling and validation
- **Zod:** Schema validation for request/response data
- **Redis:** Caching layer for performance optimization
- **JWT:** Authentication token management

## Related Frontend Pages

- **Reports Dashboard:** `/reports` - Main reporting interface
- **Location Management:** `/locations` - Location configuration
- **Machine Management:** `/cabinets` - Machine/cabinet management
- **Administration:** `/administration` - User and system management

## Usage Examples

### Fetching Machine Overview
```javascript
const response = await axios.get('/api/reports/machines?type=overview&page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = response.data;
```

### Generating Custom Report
```javascript
const reportConfig = {
  title: "Weekly Location Performance",
  reportType: "locationPerformance",
  dateRange: {
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-07T23:59:59.000Z"
  },
  fields: ["revenue", "machines", "utilization"],
  chartType: "bar"
};

const response = await axios.post('/api/analytics/reports', reportConfig, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Fetching Dashboard Metrics
```javascript
const response = await axios.get('/api/analytics/dashboard?licensee=GoldenPalace', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const metrics = response.data;
```
