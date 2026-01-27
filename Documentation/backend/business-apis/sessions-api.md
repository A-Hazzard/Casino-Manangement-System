# Sessions API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

**Last Updated:** January 2026

## Quick Search Guide

Use **Ctrl+F** to find these key topics:

- **session tracking** - How gaming sessions are tracked and managed
- **session events** - How session events are recorded and retrieved
- **financial calculations** - How session financial metrics are calculated
- **session filtering** - How session search and filtering works
- **session analytics** - How session performance analytics work
- **duration calculation** - How session duration is calculated
- **database fields** - All model fields and their purposes

## Overview

The Sessions API manages gaming session tracking, analytics, and event management. It handles session lifecycle, financial calculations, performance metrics, and detailed event logging for comprehensive gaming session analysis.

## Session Management System

### What Happens When a Gaming Session Starts

1. **Database Operations**:
   - Creates `MachineSession` document in `machinesessions` collection
   - Records session start time and initial meter readings
   - Links session to member and machine
   - Initializes session statistics

2. **Machine Session Model Fields**:

```typescript
MachineSession {
  _id: string;                    // Unique session identifier
  sessionId: string;              // Session ID for grouping related sessions
  machineId: string;              // Machine where session occurred
  memberId: string;               // Member who started the session
  startTime: Date;                // Session start timestamp
  endTime?: Date;                 // Session end timestamp (null if active)
  duration?: number;              // Session duration in minutes

  // Game Statistics
  gamesPlayed: number;            // Total games played during session (from endMeters.movement.gamesPlayed for member sessions)
  gamesWon: number;              // Number of games won (deprecated - API uses endMeters.movement.gamesWon for member sessions)
  points: number;                 // Points earned during session
  bet: number;                    // Total amount wagered
  won: number;                    // Total amount won
  jackpot: number;                // Jackpot amounts won
  cancelledCredits: number;       // Credits cancelled/refunded

  // Meter Data
  startMeters: {                  // Meter readings at session start
    coinIn: number;               // Coin in meter reading
    totalWonCredits: number;      // Total won credits meter
    jackpot: number;              // Jackpot meter reading
    totalCancelledCredits: number; // Cancelled credits meter
    movement: {
      dollarTotalUnknown: number; // Additional movement tracking
    };
  };
  endMeters?: {                   // Meter readings at session end
    coinIn: number;               // Coin in meter reading
    totalWonCredits: number;      // Total won credits meter
    jackpot: number;              // Jackpot meter reading
    totalCancelledCredits: number; // Cancelled credits meter
    movement: {                   // Movement calculations (from member's movement object)
      dollarTotalUnknown: number; // Additional movement tracking
      gamesPlayed: number;        // Games played during session
      gamesWon: number;           // Games won during session (primary source for API)
    };
  };

  // Session Management
  lastAutoLogoutTime?: Date;      // Last automatic logout timestamp
}
```

3. **Session Start Process**:
   - Validates member and machine availability
   - Records current meter readings as start meters
   - Creates session with initial statistics
   - Links session to member and machine records

### What Happens When a Gaming Session Ends

1. **Session End Process**:
   - Records session end time and final meter readings
   - Calculates session duration and performance metrics
   - Updates session statistics and financial data
   - Links to session events for detailed analysis

2. **Session End Calculations**:

```javascript
// Session Duration Calculation
duration = endTime - startTime (in minutes)

// Financial Movement Calculations
coinInMovement = endMeters.coinIn - startMeters.coinIn
totalWonCreditsMovement = endMeters.totalWonCredits - startMeters.totalWonCredits
jackpotMovement = endMeters.jackpot - startMeters.jackpot
cancelledCreditsMovement = endMeters.totalCancelledCredits - startMeters.totalCancelledCredits

// Session Performance Metrics
handle = bet * gamesPlayed
netWin = won - bet
winRate = (gamesWon / gamesPlayed) * 100
averageBet = bet / gamesPlayed
```

## Session Event Tracking System

### What Happens When Session Events Are Recorded

1. **Event Recording Process**:
   - Creates `SessionEvent` document in `machineevents` collection
   - Links event to session, machine, and member
   - Records event type, timestamp, and detailed data
   - Maintains chronological event order

2. **Session Event Model Fields**:

```typescript
SessionEvent {
  _id: string;                    // Unique event identifier
  sessionId: string;              // Associated session ID
  machineId: string;              // Machine where event occurred
  memberId: string;               // Member who triggered event
  eventType: string;              // Type of event (game_played, jackpot_hit, etc.)
  timestamp: Date;                // When event occurred
  data: {                         // Event-specific data
    gameId?: string;              // Game identifier
    bet?: number;                 // Bet amount for game
    win?: number;                 // Win amount for game
    multiplier?: number;          // Win multiplier
    lines?: number;               // Number of lines played
    coinsPerLine?: number;        // Coins per line
    jackpotType?: string;         // Type of jackpot (progressive, etc.)
    amount?: number;              // Jackpot amount
    jackpotId?: string;           // Jackpot identifier
    // Additional event-specific fields as needed
  };
}
```

3. **Event Types and Data**:
   - **game_played**: Game completion with bet, win, and game details
   - **jackpot_hit**: Jackpot win with amount and type information
   - **credit_in**: Credits added to machine
   - **credit_out**: Credits paid out to player
   - **session_start**: Session initialization event
   - **session_end**: Session termination event

## Session Analytics System

### What Happens When Session Analytics Are Calculated

1. **Analytics Calculation Process**:
   - Aggregates session data across time periods
   - Calculates performance metrics and trends
   - Groups sessions by member, machine, or location
   - Generates summary statistics

2. **Session Analytics Formulas**:

```javascript
// Session Performance Metrics
sessionDuration = endTime - startTime
handle = totalBettingActivity
netWin = won - bet
winRate = (gamesWon / gamesPlayed) * 100
averageBet = bet / gamesPlayed
pointsPerGame = points / gamesPlayed

// Session Financial Calculations
sessionHandle = bet * gamesPlayed
sessionCancelledCredits = cancelledCredits
sessionJackpot = jackpot
sessionWon = won
sessionBet = bet
sessionNetWin = won - bet (from player perspective)
sessionHouseEdge = bet - won (from casino perspective)

// Aggregated Analytics
totalSessions = COUNT(sessions) per time period
averageSessionDuration = AVG(duration) per time period
totalHandle = SUM(handle) per time period
totalWon = SUM(won) per time period
totalBet = SUM(bet) per time period
overallWinRate = SUM(gamesWon) / SUM(gamesPlayed) * 100
```

## Session Search and Filtering System

### What Happens When Sessions Are Searched

1. **Search Process**:
   - Queries `machinesessions` collection with search criteria
   - Applies text search across multiple fields
   - Filters by date range, licensee, and location
   - Returns paginated results with calculated metrics

2. **Search Fields and Filters**:
   - **Text Search**: `sessionId`, `machineId`, `memberId`
   - **Date Filtering**: `startTime` with predefined or custom ranges
   - **Licensee Filtering**: Via machine location lookup
   - **Location Filtering**: Via machine association

3. **Search Query Structure**:

```javascript
// MongoDB search query
{

**Last Updated:** January 2025
**Version:** 2.0.0

## Table of Contents

1. [Overview](#overview)
2. [Base URLs](#base-urls)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Business Logic](#business-logic)
6. [Error Handling](#error-handling)
7. [Security Features](#security-features)
8. [Performance Considerations](#performance-considerations)

## Overview

The Sessions API provides comprehensive gaming session management for the Evolution One CMS system. It handles session tracking, analytics, event management, and financial calculations with real-time monitoring and detailed reporting capabilities.

### Key Features
- **Session Tracking**: Complete gaming session lifecycle management
- **Event Management**: Detailed event logging and analysis
- **Financial Analytics**: Win/loss calculations and performance metrics
- **Real-time Monitoring**: Live session status and activity tracking
- **Advanced Filtering**: Comprehensive search and filtering capabilities

### System Integration
- **Member Management**: Integration with member profiles and history
- **Machine Management**: Connection to machine status and performance
- **Financial Systems**: Integration with collection and reporting systems
- **Analytics**: Real-time data for dashboard and reporting features

## Base URLs

```

/api/sessions
/api/sessions/[sessionId]
/api/sessions/[sessionId]/[machineId]/events

````

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
````

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
          "bet": 1.0,
          "win": 2.5,
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
          "amount": 1000.0,
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
type MachineSession = {
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
};
```

### Session Event Model

```typescript
type SessionEvent = {
  _id: string;
  sessionId: string;
  machineId: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, any>;
};
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

| Filter Value | Description                                    |
| ------------ | ---------------------------------------------- |
| `today`      | Sessions from today only                       |
| `yesterday`  | Sessions from yesterday only                   |
| `week`       | Sessions from last 7 days                      |
| `month`      | Sessions from last 30 days                     |
| `custom`     | Custom date range (requires startDate/endDate) |
| `all`        | All sessions (no date filtering)               |

## Sorting Options

| Sort Field    | Description            |
| ------------- | ---------------------- |
| `startTime`   | Session start time     |
| `handle`      | Total handle amount    |
| `won`         | Total won amount       |
| `gamesPlayed` | Number of games played |
| `duration`    | Session duration       |

## Error Codes

| Status Code | Description                            |
| ----------- | -------------------------------------- |
| 200         | Success                                |
| 400         | Bad Request (Invalid parameters)       |
| 401         | Unauthorized (Authentication required) |
| 404         | Not Found (Session not found)          |
| 500         | Internal Server Error                  |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Aggregation**: MongoDB aggregation pipeline for complex queries
- **Middleware**: Database connection middleware
- **Authentication**: JWT token validation

## Related Frontend Pages

- **Sessions List** (`/sessions`): Session management page
- **Session Events** (`/sessions/[sessionId]/[machineId]/events`): Detailed session events
- **Member Sessions** (`/members/[id]`): Member-specific session history
- **Analytics Dashboard**: Session analytics and reporting

### Financial Calculations Analysis

#### Sessions API Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

##### **Session Financial Data Structure ❌**

- **Current Implementation**:
  ```javascript
  // Session financial fields from machinesessions collection
  {
    handle: Number,           // Total betting activity
    cancelledCredits: Number, // Credits cancelled during session
    jackpot: Number,          // Jackpots during session
    won: Number,              // Total winnings
    bet: Number,              // Total bets placed
    points: Number,           // Points earned
    gamesPlayed: Number,      // Games played count
    gamesWon: Number,         // Games won count
    startMeters: { ... },     // Meter readings at session start
    endMeters: { ... }        // Meter readings at session end
  }
  ```
- **Financial Guide**: No specific guidance for session-level financial calculations
- ❌ **NOT IN GUIDE** - Session financial structure not defined in financial metrics guide

##### **Session Duration Calculation ✅**

- **Current Implementation**:
  ```javascript
  duration = endTime - startTime(calculated in minutes);
  ```
- **Business Logic**: Actual playing time calculation
- ✅ **CONSISTENT** - Standard duration calculation

##### **Session Performance Metrics ❌**

- **Current Implementation**:
  ```javascript
  // Performance calculations (if implemented)
  winRate = (gamesWon / gamesPlayed) * 100;
  averageBet = bet / gamesPlayed;
  pointsPerGame = points / gamesPlayed;
  netWin = won - bet;
  ```
- **Financial Guide**: No guidance for session-level performance metrics
- ❌ **NOT IN GUIDE** - Session performance calculations not defined in financial metrics guide

##### **Session Event Tracking ✅**

- **Current Implementation**:
  ```javascript
  // Links sessions to machine events
  { $match: {
    currentSession: sessionId,
    machine: machineId
  }}
  ```
- **Business Logic**: Associates events with specific sessions and machines
- ✅ **CONSISTENT** - Standard session-event association

##### **Session Search and Filtering ✅**

- **Current Implementation**:

  ```javascript
  // Multi-field search
  $or: [
    { sessionId: { $regex: searchTerm, $options: 'i' } },
    { machineId: { $regex: searchTerm, $options: 'i' } },
    { memberId: { $regex: searchTerm, $options: 'i' } }

  ],
  startTime: {
    $gte: startDate,
    $lte: endDate
  }
  // Additional filters applied via aggregation pipeline
  }
  ```

````

## API Endpoints

### Session Management

**Base URL:** `/api/sessions`

#### GET /api/sessions
**What it does**: Retrieves paginated list of gaming sessions with filtering
**Database Operations**:
- Queries `machinesessions` collection with search criteria
- Applies date range and licensee filters
- Calculates session metrics and performance data
- Returns paginated results
**Query Parameters**: `page`, `limit`, `search`, `sortBy`, `sortOrder`, `licencee`, `dateFilter`, `startDate`, `endDate`
**Response Fields**: Array of session objects with calculated metrics
**Used By**: Session listing page, session search functionality

#### GET /api/sessions/[sessionId]/[machineId]/events
**What it does**: Retrieves detailed events for a specific session
**Database Operations**:
- Queries `machineevents` collection by session and machine
- Returns chronological event data with pagination
- Includes detailed event information and timestamps
**Path Parameters**: `sessionId`, `machineId`
**Query Parameters**: `page`, `limit`
**Response Fields**: Array of session events with detailed data
**Used By**: Session event details view, event analysis

## Financial Calculations Summary

### Session Financial Metrics
```javascript
// Session Financial Calculations
sessionHandle = bet * gamesPlayed
sessionCancelledCredits = cancelledCredits
sessionJackpot = jackpot
sessionWon = won
sessionBet = bet
sessionNetWin = won - bet (player perspective)
sessionHouseEdge = bet - won (casino perspective)

// Session Performance Calculations
sessionDuration = endTime - startTime
winRate = (gamesWon / gamesPlayed) * 100
averageBet = bet / gamesPlayed
pointsPerGame = points / gamesPlayed
handlePerMinute = handle / duration
gamesPerMinute = gamesPlayed / duration

// Session Aggregation Formulas
totalSessions = COUNT(sessions) per time period
averageSessionDuration = AVG(duration) per time period
totalHandle = SUM(handle) per time period
totalWon = SUM(won) per time period
totalBet = SUM(bet) per time period
overallWinRate = SUM(gamesWon) / SUM(gamesPlayed) * 100
````

### Session Event Association

```javascript
// Session Events Query
sessionEvents = FIND(machineevents WHERE
  currentSession = sessionId AND
  machine = machineId
) ORDER BY timestamp ASC

// Event Type Filtering
gameEvents = FILTER(events WHERE eventType = "game_played")
jackpotEvents = FILTER(events WHERE eventType = "jackpot_hit")
creditEvents = FILTER(events WHERE eventType IN ["credit_in", "credit_out"])
```

## Date Filtering System

### Date Filter Options

- **today**: Sessions from current day only
- **yesterday**: Sessions from previous day only
- **week**: Sessions from last 7 days
- **month**: Sessions from last 30 days
- **custom**: Custom date range (requires startDate/endDate)
- **all**: All sessions (no date filtering)

### Date Filter Implementation

```javascript
// Date range calculation
const dateFilters = {
  today: { start: startOfDay(today), end: endOfDay(today) },
  yesterday: { start: startOfDay(yesterday), end: endOfDay(yesterday) },
  week: { start: subDays(today, 7), end: today },
  month: { start: subDays(today, 30), end: today },
  custom: { start: startDate, end: endDate }
};

// MongoDB query
{ startTime: { $gte: dateFilter.start, $lte: dateFilter.end } }
```

## Performance Considerations

### Database Optimization

- **Indexing**: Proper indexes on `sessionId`, `machineId`, `memberId`, `startTime`
- **Aggregation Pipelines**: Efficient MongoDB aggregation for analytics
- **Query Optimization**: Optimized queries with proper filtering
- **Caching**: Response caching for frequently accessed session data

### API Performance

- **Pagination**: Efficient pagination for large session datasets
- **Response Compression**: Compressed responses for large event data
- **Rate Limiting**: Protection against excessive API usage
- **Background Processing**: Heavy calculations processed in background

## Security Features

### Access Control

- **Authentication**: JWT token required for all endpoints
- **Authorization**: Role-based access to session data
- **Data Filtering**: Results filtered by user permissions and licensee
- **Audit Logging**: All session operations logged for compliance

### Data Protection

- **Input Validation**: Comprehensive validation of all session data
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: Protection against API abuse
- **Data Sanitization**: Output sanitization for security

## Error Handling

### Common Error Scenarios

- **Invalid Session Data**: Malformed session information
- **Session Not Found**: Session ID doesn't exist
- **Missing Required Fields**: Required session data not provided
- **Invalid Date Range**: Malformed date parameters

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```

]

````
- **Business Logic**: Comprehensive search across session identifiers
- ✅ **COMPREHENSIVE** - Standard search pattern

##### **Session Date Filtering ✅**
- **Current Implementation**:
```javascript
// Date range filtering
{ startTime: { $gte: startDate, $lte: endDate } }
````

- **Business Logic**: Filters sessions by start time within date range
- ✅ **CONSISTENT** - Standard date filtering

### Mathematical Formulas Summary

#### **Session Financial Metrics (Requires Verification)**

```
Session Handle = Total betting activity during session
Session Cancelled Credits = Credits refunded during session
Session Jackpot = Jackpot amounts won during session
Session Won = Total winnings paid to player
Session Bet = Total amount wagered by player
Session Net Win = won - bet (from player perspective)
Session House Edge = bet - won (from casino perspective)
```

#### **Session Performance Calculations (Requires Verification)**

```
Session Duration = endTime - startTime (in minutes)
Win Rate = (gamesWon / gamesPlayed) * 100
Average Bet = bet / gamesPlayed
Points Per Game = points / gamesPlayed
Handle Per Minute = handle / duration
Games Per Minute = gamesPlayed / duration
```

#### **Session Aggregation Patterns**

```
Sessions by Member = GROUP BY memberId
Sessions by Machine = GROUP BY machineId
Sessions by Location = GROUP BY machine.gamingLocation
Sessions by Date = GROUP BY DATE(startTime)
```

#### **Session Event Association**

```
Session Events = FIND(machineevents WHERE
  currentSession = sessionId AND
  machine = machineId
) ORDER BY timestamp ASC
```

### Required Verification

**The following calculations need to be verified against the financial metrics guide:**

1. **Session Data Structure**: Confirm session financial fields align with standard meter calculations
2. **Performance Metrics**: Verify session-level calculations represent accurate gaming outcomes
3. **Financial Accuracy**: Confirm session data accurately reflects machine meter changes
4. **Event Correlation**: Verify session events accurately represent machine activity during sessions

**Note**: Session API calculations use session-level data structures not explicitly defined in the financial metrics guide and require verification for accuracy.

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
