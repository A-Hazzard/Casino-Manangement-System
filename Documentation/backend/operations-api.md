# Operations API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview

The Operations API manages system operations including metrics tracking, reporting, scheduling, and movement requests for gaming machines and locations.

## API Endpoints

### Metrics

**Base URL:** `/api/metrics`

#### GET /api/metrics/top-performing
Retrieves top-performing metrics across the system.

**Query Parameters:**
- `period` (string): Time period ('day', 'week', 'month', 'year')
- `locationId` (string): Filter by location
- `limit` (number): Number of results to return
- `metric` (string): Metric type ('revenue', 'sessions', 'machines')

**Response:**
```json
{
  "topPerformers": [
    {
      "id": "string",
      "name": "Slot Machine 1",
      "type": "machine",
      "locationId": "string",
      "locationName": "Main Casino",
      "metrics": {
        "revenue": 15000,
        "sessions": 250,
        "averageSessionLength": 45,
        "holdPercentage": 8.5
      },
      "rank": 1,
      "period": "2024-01-01 to 2024-01-31"
    }
  ],
  "summary": {
    "totalRevenue": 150000,
    "totalSessions": 2500,
    "averageHoldPercentage": 8.33
  }
}
```

#### GET /api/metrics/top-performers
Retrieves top performers by various criteria.

**Query Parameters:**
- `category` (string): Category ('machines', 'locations', 'members')
- `timeframe` (string): Time frame for analysis
- `sortBy` (string): Sort criteria ('revenue', 'sessions', 'efficiency')

**Response:**
```json
{
  "performers": [
    {
      "id": "string",
      "name": "Main Casino",
      "category": "location",
      "metrics": {
        "totalRevenue": 50000,
        "totalSessions": 800,
        "machineUtilization": 85,
        "customerSatisfaction": 4.5
      },
      "trend": "up",
      "changePercentage": 12.5
    }
  ]
}
```

#### GET /api/metrics/top-machines
Retrieves top-performing machines.

**Query Parameters:**
- `locationId` (string): Filter by location
- `machineType` (string): Filter by machine type
- `limit` (number): Number of results
- `period` (string): Analysis period

**Response:**
```json
{
  "machines": [
    {
      "machineId": "string",
      "machineName": "Slot Machine 1",
      "locationId": "string",
      "locationName": "Main Casino",
      "performance": {
        "revenue": 15000,
        "sessions": 250,
        "averageSessionLength": 45,
        "holdPercentage": 8.5,
        "utilization": 92
      },
      "maintenance": {
        "lastMaintenance": "2024-01-15T00:00:00.000Z",
        "nextMaintenance": "2024-02-15T00:00:00.000Z",
        "status": "operational"
      }
    }
  ]
}
```

#### GET /api/metrics/metricsByUser
Retrieves metrics filtered by user permissions.

**Query Parameters:**
- `userId` (string): User ID for permission filtering
- `includeDetails` (boolean): Include detailed metrics

**Response:**
```json
{
  "userMetrics": {
    "accessibleLocations": ["location1", "location2"],
    "metrics": {
      "totalRevenue": 75000,
      "totalSessions": 1200,
      "averageHoldPercentage": 8.2
    },
    "locationBreakdown": [
      {
        "locationId": "string",
        "locationName": "Main Casino",
        "revenue": 50000,
        "sessions": 800
      }
    ]
  }
}
```

#### GET /api/metrics/meters
Retrieves meter data for machines.

**Query Parameters:**
- `machineId` (string): Machine ID
- `startDate` (string): Start date for meter data
- `endDate` (string): End date for meter data
- `meterType` (string): Type of meter data

**Response:**
```json
{
  "meterData": [
    {
      "timestamp": "2024-01-01T10:00:00.000Z",
      "machineId": "string",
      "meters": {
        "coinIn": 1000,
        "coinOut": 800,
        "drop": 200,
        "handPay": 50,
        "gamesPlayed": 100
      },
      "calculatedMetrics": {
        "netWin": 150,
        "holdPercentage": 8.33
      }
    }
  ]
}
```

#### GET /api/metrics/hourly-trends
Retrieves hourly trend data.

**Query Parameters:**
- `locationId` (string): Filter by location
- `date` (string): Date for trend analysis
- `metric` (string): Metric to analyze

**Response:**
```json
{
  "hourlyTrends": [
    {
      "hour": 10,
      "revenue": 5000,
      "sessions": 80,
      "averageSessionLength": 42,
      "machineUtilization": 75
    }
  ],
  "summary": {
    "peakHour": 20,
    "peakRevenue": 15000,
    "totalRevenue": 120000
  }
}
```

### Reports

**Base URL:** `/api/reports`

#### GET /api/reports/meters
Retrieves meter reports.

**Query Parameters:**
- `locationId` (string): Filter by location
- `startDate` (string): Start date
- `endDate` (string): End date
- `groupBy` (string): Grouping ('machine', 'location', 'day')

**Response:**
```json
{
  "meterReports": [
    {
      "period": "2024-01-01",
      "locationId": "string",
      "locationName": "Main Casino",
      "totalMeters": {
        "coinIn": 150000,
        "coinOut": 137500,
        "drop": 12500,
        "handPay": 1000
      },
      "machineBreakdown": [
        {
          "machineId": "string",
          "machineName": "Slot Machine 1",
          "meters": {
            "coinIn": 50000,
            "coinOut": 46000,
            "drop": 4000,
            "handPay": 300
          }
        }
      ]
    }
  ]
}
```

#### GET /api/reports/machines
Retrieves machine performance reports.

**Query Parameters:**
- `locationId` (string): Filter by location
- `machineType` (string): Filter by machine type
- `status` (string): Filter by machine status
- `includeMaintenance` (boolean): Include maintenance data

**Response:**
```json
{
  "machineReports": [
    {
      "machineId": "string",
      "machineName": "Slot Machine 1",
      "locationId": "string",
      "locationName": "Main Casino",
      "performance": {
        "totalRevenue": 15000,
        "totalSessions": 250,
        "averageSessionLength": 45,
        "holdPercentage": 8.5,
        "utilization": 92
      },
      "maintenance": {
        "lastMaintenance": "2024-01-15T00:00:00.000Z",
        "nextMaintenance": "2024-02-15T00:00:00.000Z",
        "status": "operational",
        "maintenanceHistory": [
          {
            "date": "2024-01-15T00:00:00.000Z",
            "type": "routine",
            "technician": "John Smith",
            "notes": "Routine maintenance completed"
          }
        ]
      }
    }
  ]
}
```

#### GET /api/reports/locations
Retrieves location performance reports.

**Query Parameters:**
- `includeMachines` (boolean): Include machine breakdown
- `includeStaff` (boolean): Include staff information
- `period` (string): Report period

**Response:**
```json
{
  "locationReports": [
    {
      "locationId": "string",
      "locationName": "Main Casino",
      "performance": {
        "totalRevenue": 50000,
        "totalSessions": 800,
        "averageSessionLength": 45,
        "machineUtilization": 85,
        "customerSatisfaction": 4.5
      },
      "staffing": {
        "totalStaff": 25,
        "activeStaff": 22,
        "staffUtilization": 88
      },
      "machines": {
        "totalMachines": 150,
        "operationalMachines": 142,
        "maintenanceMachines": 8
      }
    }
  ]
}
```

#### GET /api/reports/daily-counts
Retrieves daily count reports.

**Query Parameters:**
- `startDate` (string): Start date
- `endDate` (string): End date
- `locationId` (string): Filter by location
- `countType` (string): Type of count ('sessions', 'revenue', 'machines')

**Response:**
```json
{
  "dailyCounts": [
    {
      "date": "2024-01-01",
      "sessions": 250,
      "revenue": 15000,
      "activeMachines": 142,
      "uniqueMembers": 180
    }
  ],
  "summary": {
    "totalSessions": 7500,
    "totalRevenue": 450000,
    "averageDailyRevenue": 15000
  }
}
```

### Schedulers

**Base URL:** `/api/schedulers`

#### GET /api/schedulers
Retrieves scheduled tasks and operations.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `type` (string): Task type ('maintenance', 'collection', 'report')
- `locationId` (string): Filter by location

**Response:**
```json
{
  "schedulers": [
    {
      "_id": "string",
      "name": "Daily Collection Schedule",
      "type": "collection",
      "active": true,
      "schedule": {
        "frequency": "daily",
        "time": "10:00",
        "timezone": "America/Los_Angeles",
        "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      },
      "targets": {
        "locationId": "string",
        "machineIds": ["machine1", "machine2"],
        "collectorId": "string"
      },
      "lastRun": "2024-01-01T10:00:00.000Z",
      "nextRun": "2024-01-02T10:00:00.000Z",
      "status": "active"
    }
  ]
}
```

#### POST /api/schedulers
Creates a new scheduled task.

**Request Body:**
```json
{
  "name": "Weekly Maintenance Schedule",
  "type": "maintenance",
  "schedule": {
    "frequency": "weekly",
    "time": "02:00",
    "timezone": "America/Los_Angeles",
    "daysOfWeek": ["sunday"]
  },
  "targets": {
    "locationId": "string",
    "machineIds": ["machine1", "machine2"],
    "technicianId": "string"
  },
  "parameters": {
    "maintenanceType": "routine",
    "estimatedDuration": 120
  }
}
```

#### PUT /api/schedulers/[id]
Updates a scheduled task.

**Path Parameters:**
- `id` (string): Scheduler ID

#### DELETE /api/schedulers/[id]
Deactivates a scheduled task.

**Path Parameters:**
- `id` (string): Scheduler ID

### Movement Requests

**Base URL:** `/api/movement-requests`

#### GET /api/movement-requests
Retrieves movement requests for machines.

**Query Parameters:**
- `status` (string): Filter by status ('pending', 'approved', 'completed', 'cancelled')
- `locationId` (string): Filter by location
- `requestedBy` (string): Filter by requester

**Response:**
```json
{
  "movementRequests": [
    {
      "_id": "string",
      "machineId": "string",
      "machineName": "Slot Machine 1",
      "fromLocation": {
        "locationId": "string",
        "locationName": "Main Casino",
        "area": "Slot Floor A"
      },
      "toLocation": {
        "locationId": "string",
        "locationName": "Main Casino",
        "area": "Slot Floor B"
      },
      "requestedBy": "string",
      "requestedAt": "2024-01-01T10:00:00.000Z",
      "scheduledFor": "2024-01-02T02:00:00.000Z",
      "status": "approved",
      "approvedBy": "string",
      "approvedAt": "2024-01-01T14:00:00.000Z",
      "notes": "Moving to higher traffic area",
      "estimatedDuration": 60
    }
  ]
}
```

#### POST /api/movement-requests
Creates a new movement request.

**Request Body:**
```json
{
  "machineId": "string",
  "fromLocation": {
    "locationId": "string",
    "area": "Slot Floor A"
  },
  "toLocation": {
    "locationId": "string",
    "area": "Slot Floor B"
  },
  "scheduledFor": "2024-01-02T02:00:00.000Z",
  "notes": "Moving to higher traffic area",
  "estimatedDuration": 60
}
```

#### PUT /api/movement-requests/[id]
Updates a movement request.

**Path Parameters:**
- `id` (string): Movement request ID

**Request Body:**
```json
{
  "status": "approved",
  "approvedBy": "string",
  "notes": "Approved for movement"
}
```

#### DELETE /api/movement-requests/[id]
Cancels a movement request.

**Path Parameters:**
- `id` (string): Movement request ID

#### GET /api/movement-requests/[id]
Retrieves specific movement request details.

**Path Parameters:**
- `id` (string): Movement request ID

## Database Models

### Metrics Model
```typescript
type Metrics = {
  _id: string;
  timestamp: Date;
  locationId: string;
  machineId?: string;
  metrics: {
    revenue: number;
    sessions: number;
    averageSessionLength: number;
    holdPercentage: number;
    utilization: number;
  };
  calculatedMetrics: {
    netWin: number;
    efficiency: number;
  };
}
```

### Scheduler Model
```typescript
type Scheduler = {
  _id: string;
  name: string;
  type: string;
  active: boolean;
  schedule: {
    frequency: string;
    time: string;
    timezone: string;
    daysOfWeek: string[];
  };
  targets: {
    locationId: string;
    machineIds: string[];
    collectorId?: string;
    technicianId?: string;
  };
  parameters: Record<string, any>;
  lastRun: Date;
  nextRun: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### MovementRequest Model
```typescript
type MovementRequest = {
  _id: string;
  machineId: string;
  fromLocation: {
    locationId: string;
    area: string;
  };
  toLocation: {
    locationId: string;
    area: string;
  };
  requestedBy: string;
  requestedAt: Date;
  scheduledFor: Date;
  status: string;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  notes: string;
  estimatedDuration: number;
  actualDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Features

### Metrics Tracking
- **Real-time Monitoring**: Live metrics tracking across all locations
- **Performance Analysis**: Comprehensive performance analysis and reporting
- **Trend Analysis**: Historical trend analysis and forecasting
- **Custom Dashboards**: Customizable dashboard metrics

### Reporting System
- **Automated Reports**: Scheduled report generation and distribution
- **Multi-format Export**: Export reports in various formats (PDF, Excel, CSV)
- **Custom Filters**: Advanced filtering and grouping options
- **Real-time Updates**: Live report updates and notifications

### Scheduling System
- **Flexible Scheduling**: Support for various scheduling frequencies
- **Time Zone Support**: Multi-timezone scheduling support
- **Resource Management**: Efficient resource allocation and management
- **Conflict Resolution**: Automatic conflict detection and resolution

### Movement Management
- **Request Workflow**: Complete workflow for movement requests
- **Approval Process**: Multi-level approval process
- **Scheduling**: Flexible scheduling for movements
- **Tracking**: Real-time movement status tracking

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request parameters |
| 401 | Unauthorized access |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Schedule conflict |
| 422 | Validation error |
| 500 | Internal server error |

## Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Role-based Access**: Different access levels for different operations
- **Audit Logging**: All operations logged for audit purposes
- **Data Validation**: Comprehensive input validation and sanitization

## Performance Considerations

- **Caching**: Metrics data cached for improved performance
- **Indexing**: Optimized database indexes for common queries
- **Aggregation**: Efficient data aggregation for reporting
- **Pagination**: Large datasets paginated for optimal performance

## Related Frontend Pages

- **Operations Dashboard**: `/operations` - Main operations page
- **Metrics Dashboard**: `/metrics` - Real-time metrics and analytics
- **Reports Center**: `/reports` - Comprehensive reporting page
- **Scheduler Management**: `/administration/schedulers` - Schedule management
- **Movement Requests**: `/operations/movements` - Movement request management

## Dependencies

- **MongoDB**: Primary data storage
- **Mongoose**: ODM for data modeling
- **Node-Cron**: Cron job scheduling
- **JWT**: Authentication and authorization
- **ExcelJS**: Excel export functionality
- **PDF**: PDF generation for reports

## Usage Examples

### Creating a Movement Request
```javascript
const response = await axios.post('/api/movement-requests', {
  machineId: 'machine123',
  fromLocation: {
    locationId: 'location1',
    area: 'Slot Floor A'
  },
  toLocation: {
    locationId: 'location1',
    area: 'Slot Floor B'
  },
  scheduledFor: '2024-01-02T02:00:00.000Z',
  notes: 'Moving to higher traffic area',
  estimatedDuration: 60
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Creating a Scheduled Task
```javascript
const response = await axios.post('/api/schedulers', {
  name: 'Daily Collection Schedule',
  type: 'collection',
  schedule: {
    frequency: 'daily',
    time: '10:00',
    timezone: 'America/Los_Angeles',
    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  targets: {
    locationId: 'location123',
    collectorId: 'collector456'
  }
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Retrieving Top Performers
```javascript
const response = await axios.get('/api/metrics/top-performing?period=month&limit=10&metric=revenue', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = response.data;
```

### Generating a Report
```javascript
const response = await axios.get('/api/reports/machines?locationId=location123&includeMaintenance=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const report = response.data;
```
