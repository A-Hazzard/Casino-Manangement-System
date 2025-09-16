# Sessions API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025

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
  gamesPlayed: number;            // Total games played during session
  gamesWon: number;              // Number of games won
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
    movement: {
      dollarTotalUnknown: number; // Additional movement tracking
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
```

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
