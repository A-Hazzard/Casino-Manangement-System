# Sessions API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Sessions API manages gaming session data across all machines and members. It provides comprehensive session tracking, analytics, and event management for the gaming system.

## Base URL
```
/api/sessions
```

## Endpoints

### GET /api/sessions
Retrieves a paginated list of gaming sessions with advanced filtering and search capabilities.

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of sessions per page
- `search` (string, optional): Search by session ID, machine ID, or member ID
- `sortBy` (string, default: "startTime"): Sort field (startTime, handle, won, gamesPlayed, duration)
- `sortOrder` (string, default: "desc"): Sort direction (asc, desc)
- `licencee` (string, optional): Filter by licensee name
- `dateFilter` (string, optional): Date filter (today, yesterday, week, month, custom)
- `startDate` (string, optional): Custom start date (ISO string)
- `endDate` (string, optional): Custom end date (ISO string)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "session_id",
        "sessionId": "session_123",
        "machineId": "machine_456",
        "machineName": "Slot Machine A",
        "memberId": "member_789",
        "memberName": "John Doe",
        "startTime": "2024-01-01T10:00:00.000Z",
        "endTime": "2024-01-01T12:00:00.000Z",
        "gamesPlayed": 50,
        "points": 100,
        "handle": 500.00,
        "cancelledCredits": 0,
        "jackpot": 0,
        "won": 75.00,
        "bet": 25.00,
        "gamesWon": 5,
        "duration": 120
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalSessions": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Used By:**
- `/sessions` page - Session listing and management
- Session search and filtering
- Session analytics dashboard

---

### GET /api/sessions/[sessionId]/[machineId]/events
Retrieves detailed events for a specific session on a specific machine.

**Path Parameters:**
- `sessionId` (string): Session ID
- `machineId` (string): Machine ID

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
        "sessionId": "session_123",
        "machineId": "machine_456",
        "eventType": "game_played",
        "timestamp": "2024-01-01T10:05:00.000Z",
        "data": {
          "gameId": "game_123",
          "bet": 1.00,
          "win": 2.50,
          "multiplier": 2.5,
          "lines": 20,
          "coinsPerLine": 1
        }
      },
      {
        "_id": "event_id_2",
        "sessionId": "session_123",
        "machineId": "machine_456",
        "eventType": "jackpot_hit",
        "timestamp": "2024-01-01T10:10:00.000Z",
        "data": {
          "jackpotType": "progressive",
          "amount": 1000.00,
          "jackpotId": "jackpot_1"
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
- `/sessions/[sessionId]/[machineId]/events` page - Session event details
- Event analysis and debugging
- Session replay functionality

## Database Models

### Machine Session Model
```typescript
interface MachineSession {
  _id: string;
  sessionId: string;
  machineId: string;
  memberId: string;
  startTime: Date;
  endTime?: Date;
  gamesPlayed: number;
  points: number;
  startMeters: {
    coinIn: number;
    totalWonCredits: number;
    jackpot: number;
    totalCancelledCredits: number;
    movement: {
      dollarTotalUnknown: number;
    };
  };
  endMeters?: {
    coinIn: number;
    totalWonCredits: number;
    jackpot: number;
    totalCancelledCredits: number;
    movement: {
      dollarTotalUnknown: number;
    };
  };
  gamesWon: number;
  bet: number;
  won: number;
  duration?: number;
  lastAutoLogoutTime?: Date;
}
```

### Session Event Model
```typescript
interface SessionEvent {
  _id: string;
  sessionId: string;
  machineId: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, any>;
}
```

## Features

### Advanced Filtering
- **Text Search**: Search by session ID, machine ID, or member ID
- **Date Filtering**: Predefined filters (today, yesterday, week, month) and custom date ranges
- **Licensee Filtering**: Filter sessions by gaming licensee
- **Pagination**: Efficient pagination with configurable limits

### Data Aggregation
- **Machine Lookup**: Populates machine names and details
- **Location Lookup**: Links machines to gaming locations
- **Licensee Lookup**: Links locations to licensees
- **Calculated Fields**: Duration, handle amounts, win/loss calculations

### Session Analytics
- **Duration Calculation**: Automatic session duration calculation
- **Financial Metrics**: Handle, won, bet, jackpot tracking
- **Game Statistics**: Games played, games won, points earned
- **Performance Metrics**: Win/loss ratios, average bet amounts

### Event Tracking
- **Real-time Events**: Detailed event logging during sessions
- **Event Types**: Game plays, jackpots, credits, system events
- **Event Data**: Rich event data with game-specific information
- **Timeline View**: Chronological event ordering

## Date Filtering Options

| Filter Value | Description |
|--------------|-------------|
| `today` | Sessions from today only |
| `yesterday` | Sessions from yesterday only |
| `week` | Sessions from last 7 days |
| `month` | Sessions from last 30 days |
| `custom` | Custom date range (requires startDate/endDate) |
| `all` | All sessions (no date filtering) |

## Sorting Options

| Sort Field | Description |
|------------|-------------|
| `startTime` | Session start time |
| `handle` | Total handle amount |
| `won` | Total won amount |
| `gamesPlayed` | Number of games played |
| `duration` | Session duration |

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (Invalid parameters) |
| 401 | Unauthorized (Authentication required) |
| 404 | Not Found (Session not found) |
| 500 | Internal Server Error |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Aggregation**: MongoDB aggregation pipeline for complex queries
- **Middleware**: Database connection middleware
- **Authentication**: JWT token validation

## Related Frontend Pages

- **Sessions List** (`/sessions`): Session management interface
- **Session Events** (`/sessions/[sessionId]/[machineId]/events`): Detailed session events
- **Member Sessions** (`/members/[id]`): Member-specific session history
- **Analytics Dashboard**: Session analytics and reporting

## Performance Considerations

### Query Optimization
- **Indexed Fields**: Proper indexing on frequently queried fields
- **Projection**: Selective field retrieval to reduce data transfer
- **Aggregation Pipeline**: Efficient data processing and joining
- **Pagination**: Limit result sets for better performance

### Caching Strategy
- **Session Data**: Cache frequently accessed session data
- **Machine Names**: Cache machine name lookups
- **Location Data**: Cache location and licensee information
- **Pagination Results**: Cache paginated results for better UX
