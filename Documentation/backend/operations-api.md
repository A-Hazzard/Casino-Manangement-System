# Operations API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025  
**Version:** 2.0.0

## Quick Search Guide

- **Metrics**: `GET /api/metrics/top-performing` - Top performance metrics
- **Top Performers**: `GET /api/metrics/top-performers` - Top performers by category
- **Top Machines**: `GET /api/metrics/top-machines` - Top performing machines
- **User Metrics**: `GET /api/metrics/metricsByUser` - User-specific metrics
- **Meter Data**: `GET /api/metrics/meters` - Machine meter data
- **Hourly Trends**: `GET /api/metrics/hourly-trends` - Hourly trend analysis
- **Reports**: `GET /api/reports/meters` - Meter reports
- **Schedulers**: `GET /api/schedulers` - Scheduled tasks
- **Movement Requests**: `GET /api/movement-requests` - Machine movement requests

## Overview

The Operations API manages system operations including metrics tracking, reporting, scheduling, and movement requests for gaming machines and locations. This comprehensive system provides real-time monitoring, performance analysis, and operational management capabilities.

### System Architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Real-time Monitoring**: Live metrics tracking across all locations
- **Performance Analysis**: Comprehensive performance analysis and reporting

## Metrics Endpoints

### GET `/api/metrics/top-performing`
**Purpose**: Retrieves top-performing metrics across the system

**Query Parameters:**
- `period` - Time period ('day', 'week', 'month', 'year')
- `locationId` - Filter by location
- `limit` - Number of results to return
- `metric` - Metric type ('revenue', 'sessions', 'machines')

**Response Fields:**
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
        "revenue": 15000,              // Total revenue generated
        "sessions": 250,               // Number of gaming sessions
        "averageSessionLength": 45,    // Average session duration in minutes
        "holdPercentage": 8.5          // House hold percentage
      },
      "rank": 1,
      "period": "2024-01-01 to 2024-01-31"
    }
  ],
  "summary": {
    "totalRevenue": 150000,           // Total revenue across all performers
    "totalSessions": 2500,            // Total sessions across all performers
    "averageHoldPercentage": 8.33     // Average hold percentage
  }
}
```

### GET `/api/metrics/top-performers`
**Purpose**: Retrieves top performers by various criteria

**Query Parameters:**
- `category` - Category ('machines', 'locations', 'members')
- `timeframe` - Time frame for analysis
- `sortBy` - Sort criteria ('revenue', 'sessions', 'efficiency')

**Response Fields:**
```json
{
  "performers": [
    {
      "id": "string",
      "name": "Main Casino",
      "category": "location",
      "metrics": {
        "totalRevenue": 50000,         // Total revenue for location
        "totalSessions": 800,          // Total sessions for location
        "machineUtilization": 85,      // Machine utilization percentage
        "customerSatisfaction": 4.5    // Customer satisfaction rating
      },
      "trend": "up",                   // Performance trend (up/down/stable)
      "changePercentage": 12.5         // Percentage change from previous period
    }
  ]
}
```

### GET `/api/metrics/top-machines`
**Purpose**: Retrieves top-performing machines

**Query Parameters:**
- `locationId` - Filter by location
- `machineType` - Filter by machine type
- `limit` - Number of results
- `period` - Analysis period

**Response Fields:**
```json
{
  "machines": [
    {
      "machineId": "string",
      "machineName": "Slot Machine 1",
      "locationId": "string",
      "locationName": "Main Casino",
      "performance": {
        "revenue": 15000,              // Total revenue generated
        "sessions": 250,               // Number of gaming sessions
        "averageSessionLength": 45,    // Average session duration
        "holdPercentage": 8.5,         // House hold percentage
        "utilization": 92              // Machine utilization percentage
      },
      "maintenance": {
        "lastMaintenance": "2024-01-15T00:00:00.000Z",
        "nextMaintenance": "2024-02-15T00:00:00.000Z",
        "status": "operational"        // Maintenance status
      }
    }
  ]
}
```

### GET `/api/metrics/metricsByUser`
**Purpose**: Retrieves metrics filtered by user permissions

**Query Parameters:**
- `userId` - User ID for permission filtering
- `includeDetails` - Include detailed metrics

**Response Fields:**
```json
{
  "userMetrics": {
    "accessibleLocations": ["location1", "location2"],
    "metrics": {
      "totalRevenue": 75000,           // Total revenue for accessible locations
      "totalSessions": 1200,           // Total sessions for accessible locations
      "averageHoldPercentage": 8.2     // Average hold percentage
    },
    "locationBreakdown": [
      {
        "locationId": "string",
        "locationName": "Main Casino",
        "revenue": 50000,              // Revenue for this location
        "sessions": 800                // Sessions for this location
      }
    ]
  }
}
```

### GET `/api/metrics/meters`
**Purpose**: Retrieves meter data for machines

**Query Parameters:**
- `machineId` - Machine ID
- `startDate` - Start date for meter data
- `endDate` - End date for meter data
- `meterType` - Type of meter data

**Response Fields:**
```json
{
  "meterData": [
    {
      "timestamp": "2024-01-01T10:00:00.000Z",
      "machineId": "string",
      "meters": {
        "coinIn": 1000,                // Total coins in (bets placed)
        "coinOut": 800,                // Total coins out (winnings paid)
        "drop": 200,                   // Physical money inserted
        "handPay": 50,                 // Manual hand payouts
        "gamesPlayed": 100             // Number of games played
      },
      "calculatedMetrics": {
        "netWin": 150,                 // Net win amount (coinIn - coinOut)
        "holdPercentage": 8.33         // Hold percentage
      }
    }
  ]
}
```

### GET `/api/metrics/hourly-trends`
**Purpose**: Retrieves hourly trend data

**Query Parameters:**
- `locationId` - Filter by location
- `date` - Date for trend analysis
- `metric` - Metric to analyze

**Response Fields:**
```json
{
  "hourlyTrends": [
    {
      "hour": 10,                      // Hour of day (0-23)
      "revenue": 5000,                 // Revenue for this hour
      "sessions": 80,                  // Sessions for this hour
      "averageSessionLength": 42,      // Average session length
      "machineUtilization": 75         // Machine utilization percentage
    }
  ],
  "summary": {
    "peakHour": 20,                    // Hour with highest activity
    "peakRevenue": 15000,              // Revenue at peak hour
    "totalRevenue": 120000             // Total revenue for the day
  }
}
```

## Reports Endpoints

### GET `/api/reports/meters`
**Purpose**: Retrieves meter reports with aggregation

**Query Parameters:**
- `locationId` - Filter by location
- `startDate` - Start date
- `endDate` - End date
- `groupBy` - Grouping ('machine', 'location', 'day')

**Response Fields:**
```json
{
  "meterReports": [
    {
      "period": "2024-01-01",
      "locationId": "string",
      "locationName": "Main Casino",
      "totalMeters": {
        "coinIn": 150000,              // Total coins in for period
        "coinOut": 137500,             // Total coins out for period
        "drop": 12500,                 // Total drop for period
        "handPay": 1000                // Total hand pays for period
      },
      "machineBreakdown": [
        {
          "machineId": "string",
          "machineName": "Slot Machine 1",
          "meters": {
            "coinIn": 50000,           // Machine-specific coin in
            "coinOut": 46000,          // Machine-specific coin out
            "drop": 4000,              // Machine-specific drop
            "handPay": 300             // Machine-specific hand pays
          }
        }
      ]
    }
  ]
}
```

### GET `/api/reports/machines`
**Purpose**: Retrieves machine performance reports

**Query Parameters:**
- `locationId` - Filter by location
- `machineType` - Filter by machine type
- `status` - Filter by machine status
- `includeMaintenance` - Include maintenance data

**Response Fields:**
```json
{
  "machineReports": [
    {
      "machineId": "string",
      "machineName": "Slot Machine 1",
      "locationId": "string",
      "locationName": "Main Casino",
      "performance": {
        "totalRevenue": 15000,         // Total revenue generated
        "totalSessions": 250,          // Total gaming sessions
        "averageSessionLength": 45,    // Average session duration
        "holdPercentage": 8.5,         // House hold percentage
        "utilization": 92              // Machine utilization
      },
      "maintenance": {
        "lastMaintenance": "2024-01-15T00:00:00.000Z",
        "nextMaintenance": "2024-02-15T00:00:00.000Z",
        "status": "operational",
        "maintenanceHistory": [
          {
            "date": "2024-01-15T00:00:00.000Z",
            "type": "routine",         // Maintenance type
            "technician": "John Smith",
            "notes": "Routine maintenance completed"
          }
        ]
      }
    }
  ]
}
```

### GET `/api/reports/locations`
**Purpose**: Retrieves location performance reports

**Query Parameters:**
- `includeMachines` - Include machine breakdown
- `includeStaff` - Include staff information
- `period` - Report period

**Response Fields:**
```json
{
  "locationReports": [
    {
      "locationId": "string",
      "locationName": "Main Casino",
      "performance": {
        "totalRevenue": 50000,         // Total revenue for location
        "totalSessions": 800,          // Total sessions for location
        "averageSessionLength": 45,    // Average session duration
        "machineUtilization": 85,      // Machine utilization percentage
        "customerSatisfaction": 4.5    // Customer satisfaction rating
      },
      "staffing": {
        "totalStaff": 25,              // Total staff count
        "activeStaff": 22,             // Active staff count
        "staffUtilization": 88         // Staff utilization percentage
      },
      "machines": {
        "totalMachines": 150,          // Total machines at location
        "operationalMachines": 142,    // Currently operational machines
        "maintenanceMachines": 8       // Machines under maintenance
      }
    }
  ]
}
```

### GET `/api/reports/daily-counts`
**Purpose**: Retrieves daily count reports

**Query Parameters:**
- `startDate` - Start date
- `endDate` - End date
- `locationId` - Filter by location
- `countType` - Type of count ('sessions', 'revenue', 'machines')

**Response Fields:**
```json
{
  "dailyCounts": [
    {
      "date": "2024-01-01",
      "sessions": 250,                 // Sessions for this date
      "revenue": 15000,                // Revenue for this date
      "activeMachines": 142,           // Active machines for this date
      "uniqueMembers": 180             // Unique members for this date
    }
  ],
  "summary": {
    "totalSessions": 7500,             // Total sessions for period
    "totalRevenue": 450000,            // Total revenue for period
    "averageDailyRevenue": 15000       // Average daily revenue
  }
}
```

## Scheduler Endpoints

### GET `/api/schedulers`
**Purpose**: Retrieves scheduled tasks and operations

**Query Parameters:**
- `active` - Filter by active status
- `type` - Task type ('maintenance', 'collection', 'report')
- `locationId` - Filter by location

**Response Fields:**
```json
{
  "schedulers": [
    {
      "_id": "string",
      "name": "Daily Collection Schedule",
      "type": "collection",            // Task type
      "active": true,                  // Active status
      "schedule": {
        "frequency": "daily",          // Schedule frequency
        "time": "10:00",               // Scheduled time
        "timezone": "America/Los_Angeles",
        "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      },
      "targets": {
        "locationId": "string",        // Target location
        "machineIds": ["machine1", "machine2"],
        "collectorId": "string"        // Assigned collector
      },
      "lastRun": "2024-01-01T10:00:00.000Z",
      "nextRun": "2024-01-02T10:00:00.000Z",
      "status": "active"               // Current status
    }
  ]
}
```

### POST `/api/schedulers`
**Purpose**: Creates a new scheduled task

**Request Fields:**
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
    "technicianId": "string"           // Assigned technician
  },
  "parameters": {
    "maintenanceType": "routine",
    "estimatedDuration": 120           // Duration in minutes
  }
}
```

## Movement Requests Endpoints

### GET `/api/movement-requests`
**Purpose**: Retrieves movement requests for machines

**Query Parameters:**
- `status` - Filter by status ('pending', 'approved', 'completed', 'cancelled')
- `locationId` - Filter by location
- `requestedBy` - Filter by requester

**Response Fields:**
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
        "area": "Slot Floor A"         // Specific area within location
      },
      "toLocation": {
        "locationId": "string",
        "locationName": "Main Casino",
        "area": "Slot Floor B"
      },
      "requestedBy": "string",         // User who requested movement
      "requestedAt": "2024-01-01T10:00:00.000Z",
      "scheduledFor": "2024-01-02T02:00:00.000Z",
      "status": "approved",            // Current status
      "approvedBy": "string",          // User who approved
      "approvedAt": "2024-01-01T14:00:00.000Z",
      "notes": "Moving to higher traffic area",
      "estimatedDuration": 60          // Duration in minutes
    }
  ]
}
```

### POST `/api/movement-requests`
**Purpose**: Creates a new movement request

**Request Fields:**
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

## Data Models

### Metrics Model
**Database Fields:**
```typescript
{
  _id: string;
  timestamp: Date;                     // Metric timestamp
  locationId: string;                  // Location identifier
  machineId?: string;                  // Optional machine identifier
  metrics: {
    revenue: number;                   // Revenue amount
    sessions: number;                  // Number of sessions
    averageSessionLength: number;      // Average session length in minutes
    holdPercentage: number;            // House hold percentage
    utilization: number;               // Utilization percentage
  };
  calculatedMetrics: {
    netWin: number;                    // Net win amount
    efficiency: number;                // Efficiency metric
  };
}
```

### Scheduler Model
**Database Fields:**
```typescript
{
  _id: string;
  name: string;                        // Scheduler name
  type: string;                        // Task type
  active: boolean;                     // Active status
  schedule: {
    frequency: string;                 // Schedule frequency
    time: string;                      // Scheduled time
    timezone: string;                  // Timezone
    daysOfWeek: string[];              // Days of week array
  };
  targets: {
    locationId: string;                // Target location
    machineIds: string[];              // Target machines
    collectorId?: string;              // Optional collector
    technicianId?: string;             // Optional technician
  };
  parameters: Record<string, any>;     // Additional parameters
  lastRun: Date;                       // Last run timestamp
  nextRun: Date;                       // Next run timestamp
  status: string;                      // Current status
  createdAt: Date;
  updatedAt: Date;
}
```

### MovementRequest Model
**Database Fields:**
```typescript
{
  _id: string;
  machineId: string;                   // Machine to move
  fromLocation: {
    locationId: string;                // Source location
    area: string;                      // Source area
  };
  toLocation: {
    locationId: string;                // Destination location
    area: string;                      // Destination area
  };
  requestedBy: string;                 // Requesting user
  requestedAt: Date;                   // Request timestamp
  scheduledFor: Date;                  // Scheduled movement time
  status: string;                      // Current status
  approvedBy?: string;                 // Approving user
  approvedAt?: Date;                   // Approval timestamp
  completedAt?: Date;                  // Completion timestamp
  notes: string;                       // Movement notes
  estimatedDuration: number;           // Estimated duration in minutes
  actualDuration?: number;             // Actual duration in minutes
  createdAt: Date;
  updatedAt: Date;
}
```

## Financial Calculations

### Performance Metrics
```
Hold Percentage = (Coin In - Coin Out) / Coin In × 100
Net Win = Coin In - Coin Out
Machine Utilization = Active Time / Total Time × 100
Average Session Length = Total Session Time / Number of Sessions
```

### Revenue Calculations
```
Total Revenue = Sum of all machine revenues
Location Revenue = Sum of all machine revenues at location
Period Revenue = Sum of revenues within time period
Average Daily Revenue = Total Revenue / Number of Days
```

### Efficiency Metrics
```
Session Efficiency = Revenue / Number of Sessions
Machine Efficiency = Revenue / Machine Hours
Staff Efficiency = Revenue / Staff Hours
```

## Business Rules

### Metrics Tracking
1. **Real-time Monitoring**: Metrics updated every 15 minutes
2. **Data Retention**: Metrics retained for 2 years
3. **Performance Thresholds**: Alerts for performance below thresholds
4. **Trend Analysis**: 30-day rolling averages for trend analysis

### Scheduling Rules
1. **Conflict Resolution**: Automatic conflict detection and resolution
2. **Resource Management**: Efficient resource allocation
3. **Time Zone Support**: Multi-timezone scheduling support
4. **Flexible Scheduling**: Support for various scheduling frequencies

### Movement Rules
1. **Approval Process**: Multi-level approval process
2. **Scheduling**: Flexible scheduling for movements
3. **Tracking**: Real-time movement status tracking
4. **Documentation**: Complete movement documentation

## Security Features

### Authentication
- JWT tokens required for all endpoints
- Role-based access control
- Session management with proper expiration

### Authorization
- Different access levels for different operations
- Resource-level permissions
- Location-based access restrictions

### Data Protection
- Input sanitization and validation
- SQL injection prevention
- XSS protection
- CSRF protection

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Query optimization for complex aggregations
- Connection pooling for efficient database access

### Caching Strategy
- Metrics data cached for improved performance
- Response caching with appropriate headers
- Client-side caching strategies

### Monitoring
- Performance metrics monitoring
- Error tracking and analysis
- Usage analytics
- Alerting for critical issues

## Error Handling

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (Invalid request parameters)
- `401`: Unauthorized (Authentication required)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `409`: Conflict (Schedule conflict)
- `422`: Validation Error
- `500`: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly message",
  "code": "ERROR_CODE"
}
```

---

**Last Updated:** January 15th, 2025
