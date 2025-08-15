# Locations & Machines API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Locations & Machines API manages gaming locations and individual gaming machines. It provides CRUD operations for location management, machine configuration, and performance tracking.

## Base URLs
```
/api/locations
/api/machines
```

## Locations API

### GET /api/locations
Retrieves all gaming locations with optional licensee filtering.

**Query Parameters:**
- `licencee` (string, optional): Filter locations by licensee name

**Response (Success - 200):**
```json
{
  "locations": [
    {
      "_id": "location_id",
      "name": "Main Casino",
      "country": "United States",
      "address": {
        "street": "123 Casino St",
        "city": "Las Vegas"
      },
      "rel": {
        "licencee": "Casino Corp"
      },
      "profitShare": 50,
      "isLocalServer": false,
      "geoCoords": {
        "latitude": 36.1699,
        "longitude": -115.1398
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Used By:**
- `/locations` page - Location management interface
- Location selection components
- Geographic mapping features

---

### POST /api/locations
Creates a new gaming location.

**Request Body:**
```json
{
  "name": "New Casino",
  "address": {
    "street": "456 Gaming Ave",
    "city": "Reno"
  },
  "country": "United States",
  "profitShare": 60,
  "rel": {
    "licencee": "Gaming Corp"
  },
  "isLocalServer": true,
  "geoCoords": {
    "latitude": 39.5296,
    "longitude": -119.8138
  }
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "location": {
    "_id": "new_location_id",
    "name": "New Casino",
    "country": "United States",
    "address": {
      "street": "456 Gaming Ave",
      "city": "Reno"
    },
    "rel": {
      "licencee": "Gaming Corp"
    },
    "profitShare": 60,
    "isLocalServer": true,
    "geoCoords": {
      "latitude": 39.5296,
      "longitude": -119.8138
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**
- Location creation forms
- Administrative interfaces

---

### PUT /api/locations
Updates an existing gaming location.

**Request Body:**
```json
{
  "locationName": "Main Casino",
  "name": "Updated Casino Name",
  "address": {
    "street": "789 New St",
    "city": "Updated City"
  },
  "country": "United States",
  "profitShare": 55,
  "rel": {
    "licencee": "Updated Corp"
  },
  "isLocalServer": false,
  "geoCoords": {
    "latitude": 36.1699,
    "longitude": -115.1398
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "locationId": "location_id"
}
```

**Used By:**
- Location editing forms
- Administrative interfaces

---

### DELETE /api/locations
Soft deletes a gaming location.

**Query Parameters:**
- `id` (string, required): Location ID to delete

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Location deleted successfully"
}
```

**Used By:**
- Location management interface
- Administrative cleanup

## Machines API

### GET /api/machines
Retrieves detailed information for a specific machine with optional meter data.

**Query Parameters:**
- `id` (string, required): Machine ID
- `timePeriod` (string, optional): Time period for meter data (today, week, month, year)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "machine_id",
    "serialNumber": "SN123456",
    "game": "Slot Game",
    "gameType": "slot",
    "isCronosMachine": true,
    "gameConfig": {
      "accountingDenomination": 0.01
    },
    "cabinetType": "upright",
    "assetStatus": "active",
    "gamingLocation": "location_id",
    "relayId": "relay_123",
    "collectionTime": "2024-01-01T12:00:00.000Z",
    "collectionMeters": {
      "metersIn": 1000.00,
      "metersOut": 950.00
    },
    "sasMeters": {
      "drop": 5000.00,
      "totalCancelledCredits": 100.00,
      "jackpot": 500.00,
      "coinIn": 10000.00,
      "coinOut": 9500.00,
      "gamesPlayed": 1000,
      "gamesWon": 950
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**
- `/cabinets/[slug]` page - Machine details view
- Machine management interface
- Performance monitoring

---

### POST /api/machines
Creates a new gaming machine.

**Request Body:**
```json
{
  "serialNumber": "SN789012",
  "game": "New Slot Game",
  "gameType": "slot",
  "isCronosMachine": false,
  "accountingDenomination": 0.05,
  "cabinetType": "slant",
  "assetStatus": "active",
  "gamingLocation": "location_id",
  "smibBoard": "smib_456",
  "collectionSettings": {
    "lastCollectionTime": "2024-01-01T12:00:00.000Z",
    "lastMetersIn": "1000.00",
    "lastMetersOut": "950.00"
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "new_machine_id",
    "serialNumber": "SN789012",
    "game": "New Slot Game",
    "gameType": "slot",
    "isCronosMachine": false,
    "gameConfig": {
      "accountingDenomination": 0.05
    },
    "cabinetType": "slant",
    "assetStatus": "active",
    "gamingLocation": "location_id",
    "relayId": "smib_456",
    "collectionTime": "2024-01-01T12:00:00.000Z",
    "collectionMeters": {
      "metersIn": 1000.00,
      "metersOut": 950.00
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**
- Machine registration forms
- Administrative interfaces

---

### PUT /api/machines
Updates an existing gaming machine.

**Query Parameters:**
- `id` (string, required): Machine ID to update

**Request Body:**
```json
{
  "serialNumber": "SN789012",
  "game": "Updated Slot Game",
  "gameType": "slot",
  "isCronosMachine": true,
  "cabinetType": "upright",
  "assetStatus": "maintenance",
  "gamingLocation": "new_location_id"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "machine_id",
    "serialNumber": "SN789012",
    "game": "Updated Slot Game",
    "gameType": "slot",
    "isCronosMachine": true,
    "cabinetType": "upright",
    "assetStatus": "maintenance",
    "gamingLocation": "new_location_id",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Used By:**
- Machine editing forms
- Configuration updates

---

### DELETE /api/machines
Soft deletes a gaming machine.

**Query Parameters:**
- `id` (string, required): Machine ID to delete

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Cabinet deleted successfully"
}
```

**Used By:**
- Machine management interface
- Administrative cleanup

## Additional Machine Endpoints

### GET /api/machines/[id]/events
Retrieves events for a specific machine.

**Path Parameters:**
- `id` (string): Machine ID

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 50): Number of events per page

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "event_id",
        "machineId": "machine_id",
        "eventType": "game_played",
        "timestamp": "2024-01-01T10:00:00.000Z",
        "data": {
          "gameId": "game_123",
          "bet": 1.00,
          "win": 2.50
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalEvents": 75,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Used By:**
- Machine event monitoring
- Debugging and analysis

### GET /api/machines/aggregation
Retrieves aggregated machine data across locations.

**Query Parameters:**
- `locationId` (string, optional): Filter by location
- `status` (string, optional): Filter by machine status
- `dateRange` (string, optional): Date range for metrics

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "aggregatedData": {
      "totalMachines": 150,
      "activeMachines": 142,
      "totalRevenue": 250000.00,
      "averageUtilization": 85.5
    },
    "byLocation": [
      {
        "locationId": "location_1",
        "locationName": "Main Casino",
        "machines": 100,
        "revenue": 150000.00
      }
    ]
  }
}
```

**Used By:**
- Performance dashboards
- Location comparison reports

## Database Models

### Gaming Location Model
```typescript
interface GamingLocation {
  _id: string;
  name: string;
  country: string;
  address: {
    street: string;
    city: string;
  };
  rel: {
    licencee: string;
  };
  profitShare: number;
  isLocalServer: boolean;
  geoCoords: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Machine Model
```typescript
interface Machine {
  _id: string;
  serialNumber: string;
  game: string;
  gameType: string;
  isCronosMachine: boolean;
  gameConfig: {
    accountingDenomination: number;
  };
  cabinetType: string;
  assetStatus: string;
  gamingLocation: string;
  relayId: string;
  collectionTime?: Date;
  collectionMeters: {
    metersIn: number;
    metersOut: number;
  };
  sasMeters?: {
    drop: number;
    totalCancelledCredits: number;
    jackpot: number;
    coinIn: number;
    coinOut: number;
    gamesPlayed: number;
    gamesWon: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

## Features

### Location Management
- **Geographic Coordinates**: GPS coordinates for mapping
- **Licensee Association**: Link locations to gaming licensees
- **Profit Sharing**: Configurable profit sharing percentages
- **Local Server Support**: Support for local server configurations

### Machine Management
- **Serial Number Tracking**: Unique machine identification
- **Game Configuration**: Game type and denomination settings
- **Asset Status**: Active, maintenance, offline status tracking
- **Collection Meters**: Financial meter tracking
- **SAS Integration**: SAS protocol meter data

### Performance Tracking
- **Meter Aggregation**: Time-based meter data aggregation
- **Event Logging**: Detailed machine event tracking
- **Utilization Metrics**: Machine utilization calculations
- **Revenue Tracking**: Financial performance monitoring

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Invalid input) |
| 404 | Not Found (Location/Machine not found) |
| 500 | Internal Server Error |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Validation**: Custom validation utilities
- **Middleware**: Database connection middleware
- **Authentication**: JWT token validation
- **Geographic Data**: GPS coordinate validation

## Related Frontend Pages

- **Locations** (`/locations`): Location management interface
- **Location Details** (`/locations/[slug]`): Individual location view
- **Cabinets** (`/cabinets`): Machine listing interface
- **Cabinet Details** (`/cabinets/[slug]`): Individual machine view

## Performance Considerations

### Data Optimization
- **Geographic Filtering**: Efficient coordinate-based queries
- **Meter Aggregation**: Pre-calculated meter summaries
- **Indexing**: Proper indexing on frequently queried fields
- **Soft Deletes**: Maintain data integrity with soft deletion

### Real-time Updates
- **Status Monitoring**: Real-time machine status updates
- **Meter Synchronization**: Live meter data integration
- **Event Streaming**: Real-time event logging
- **Performance Alerts**: Automated performance monitoring
