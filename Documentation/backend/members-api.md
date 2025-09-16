# Members API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025

## Quick Search Guide

Use **Ctrl+F** to find these key topics:
- **member creation** - What happens when you create a new member
- **member search** - How member search and filtering works
- **session tracking** - How gaming sessions are tracked and calculated
- **win loss calculation** - How member win/loss is calculated from sessions
- **member details** - How member profile data is managed
- **session history** - How session history is retrieved and grouped
- **database fields** - All model fields and their purposes

## Overview

The Members API manages member profiles, gaming session tracking, and financial statistics. It handles member registration, session data aggregation, win/loss calculations, and member-related operations with comprehensive search and filtering capabilities.

## Member Management System

### What Happens When You Create a Member

1. **Database Operations**:
   - Creates `Member` document in `members` collection
   - Stores profile information, contact details, and gaming settings
   - Initializes account balance and points to zero
   - Sets default PIN and gaming location

2. **Member Model Fields**:
```typescript
Member {
  _id: string;                    // Username (used as unique identifier)
  profile: {
    firstName: string;            // Member's first name
    lastName: string;             // Member's last name
    email: string;                // Member's email address
    occupation: string;           // Member's occupation
    address: string;              // Member's address
    gender: string;               // Member's gender
    dob: string;                  // Date of birth
    indentification: {            // Identification details
      number: string;             // ID number
      type: string;               // ID type (Driver License, etc.)
    };
  };
  username: string;               // Member's username
  phoneNumber: string;            // Member's phone number
  points: number;                 // Loyalty points balance
  uaccount: number;               // Account balance (cash balance)
  pin: string;                    // PIN for account access
  gamingLocation: string;         // Default gaming location ID
  locationName?: string;          // Gaming location name (populated via lookup)
  lastLogin?: Date;               // Last login timestamp
  loggedIn: boolean;              // Current login status
  accountLocked: boolean;         // Whether account is locked
  createdAt: Date;                // Account creation timestamp
  updatedAt: Date;                // Last modification timestamp
  
  // Calculated Fields (from session data)
  winLoss?: number;               // Total win/loss (calculated from sessions)
  totalMoneyIn?: number;          // Total money inserted (calculated)
  totalMoneyOut?: number;         // Total money paid out (calculated)
}
```

3. **Member Creation Process**:
   - Validates required fields (firstName, lastName, username)
   - Checks username uniqueness
   - Sets default values for optional fields
   - Creates audit trail entry

### What Happens When You Search Members

1. **Search Process**:
   - Queries `members` collection with search criteria
   - Applies text search across multiple fields
   - Filters by licensee and location
   - Calculates financial metrics from session data
   - Returns paginated results

2. **Search Fields**:
   - **Text Search**: `firstName`, `lastName`, `username`
   - **Location Filter**: `gamingLocation`
   - **Licensee Filter**: Via location lookup
   - **Date Filter**: `createdAt`, `lastLogin`

3. **Search Query Structure**:
```javascript
// MongoDB search query
{
  $or: [
    { "profile.firstName": { $regex: searchTerm, $options: "i" } },
    { "profile.lastName": { $regex: searchTerm, $options: "i" } },
    { "username": { $regex: searchTerm, $options: "i" } }
  ],
  gamingLocation: locationFilter,
  // Licensee filter applied via location lookup
}
```

## Session Tracking System

### What Happens When Session Data Is Tracked

1. **Database Operations**:
   - Creates `MachineSession` document in `machinesessions` collection
   - Stores session start/end times and meter readings
   - Links session to member and machine
   - Calculates session duration and performance

2. **Machine Session Model Fields**:
```typescript
MachineSession {
  _id: string;                    // Unique session identifier
  sessionId: string;              // Session ID for grouping
  machineId: string;              // Machine where session occurred
  memberId: string;               // Member who played
  startTime: Date;                // Session start timestamp
  endTime?: Date;                 // Session end timestamp
  duration?: number;              // Session duration in minutes
  
  // Game Statistics
  gamesPlayed: number;            // Total games played
  gamesWon: number;              // Games won
  points: number;                 // Points earned
  bet: number;                    // Total bet amount
  won: number;                    // Total won amount
  jackpot: number;                // Jackpot amount won
  
  // Meter Data
  startMeters: {                  // Meter readings at session start
    coinIn: number;               // Coin in meter
    totalWonCredits: number;      // Total won credits
    jackpot: number;              // Jackpot meter
    totalCancelledCredits: number; // Cancelled credits meter
  };
  endMeters?: {                   // Meter readings at session end
    coinIn: number;               // Coin in meter
    totalWonCredits: number;      // Total won credits
    jackpot: number;              // Jackpot meter
    totalCancelledCredits: number; // Cancelled credits meter
    movement: {                   // Movement calculations
      drop: number;               // Money inserted (drop)
      totalCancelledCredits: number; // Money paid out
      gross: number;              // Net amount
    };
  };
}
```

3. **Session Calculation Process**:
   - Records start meter readings when session begins
   - Records end meter readings when session ends
   - Calculates movement (end - start) for each meter
   - Determines session duration and performance

## Win/Loss Calculation System

### What Happens When Win/Loss Is Calculated

1. **Calculation Process**:
   - Aggregates session data for each member
   - Sums money in (drop) across all sessions
   - Sums money out (totalCancelledCredits) across all sessions
   - Calculates net win/loss (money in - money out)

2. **Win/Loss Calculation Formula**:
```javascript
// MongoDB aggregation pipeline for win/loss calculation
{
  $addFields: {
    totalMoneyIn: {
      $reduce: {
        input: "$sessions",
        initialValue: 0,
        in: { 
          $add: [
            "$$value", 
            { $ifNull: [{ $toDouble: "$$this.endMeters.movement.drop" }, 0] }
          ]
        }
      }
    },
    totalMoneyOut: {
      $reduce: {
        input: "$sessions",
        initialValue: 0,
        in: { 
          $add: [
            "$$value", 
            { $ifNull: [{ $toDouble: "$$this.endMeters.movement.totalCancelledCredits" }, 0] }
          ]
        }
      }
    },
    winLoss: { $subtract: ["$totalMoneyIn", "$totalMoneyOut"] }
  }
}
```

3. **Win/Loss Interpretation**:
   - **Positive winLoss**: Member lost money (house profit)
   - **Negative winLoss**: Member won money (house loss)
   - **Zero winLoss**: Break-even session

4. **Financial Metrics Example**:
```javascript
// Example calculation
// Session 1: Money In = $100, Money Out = $80, Win/Loss = $20 (member lost)
// Session 2: Money In = $50, Money Out = $60, Win/Loss = -$10 (member won)
// Total: Money In = $150, Money Out = $140, Total Win/Loss = $10 (member lost overall)
```

## Session History System

### What Happens When Session History Is Retrieved

1. **History Retrieval Process**:
   - Queries `machinesessions` collection by member ID
   - Applies date range and grouping filters
   - Calculates session statistics and performance
   - Returns paginated results

2. **Session Grouping Options**:
   - **Individual Sessions**: Each session separately
   - **Daily Groups**: Sessions grouped by day
   - **Weekly Groups**: Sessions grouped by week
   - **Monthly Groups**: Sessions grouped by month

3. **Session History Model Fields**:
```typescript
SessionHistoryEntry {
  _id: string;                    // Session identifier
  sessionId: string;              // Session ID
  machineId: string;              // Machine ID
  machineName: string;            // Machine display name
  startTime: Date;                // Session start time
  endTime: Date;                  // Session end time
  duration: number;               // Session duration in minutes
  gamesPlayed: number;            // Games played
  points: number;                 // Points earned
  handle: number;                 // Total handle (money in)
  won: number;                    // Total won
  bet: number;                    // Total bet
  gamesWon: number;               // Games won
  jackpot: number;                // Jackpot amount
  cancelledCredits: number;       // Cancelled credits
}
```

## API Endpoints

### Member Management

**Base URL:** `/api/members`

#### GET /api/members
**What it does**: Retrieves paginated list of members with search and filtering
**Database Operations**:
- Queries `members` collection with search criteria
- Applies licensee and location filters
- Calculates win/loss from session data
- Returns paginated results
**Query Parameters**: `search`, `page`, `limit`, `sortBy`, `sortOrder`, `licencee`
**Response Fields**: Array of `Member` objects with calculated financial metrics
**Used By**: Member listing page, member search functionality

#### GET /api/members/summary
**What it does**: Retrieves member summary with additional filtering options
**Database Operations**:
- Queries `members` collection with enhanced filters
- Applies date range filtering
- Calculates summary statistics
- Returns paginated results with summary data
**Query Parameters**: `licencee`, `dateFilter`, `startDate`, `endDate`, `search`, `location`
**Response Fields**: Member summary with aggregated statistics
**Used By**: Member analytics, CSV export functionality

#### POST /api/members
**What it does**: Creates a new member account
**Database Operations**:
- Validates input data
- Checks username uniqueness
- Creates new `Member` document
- Logs creation activity
**Request Fields**: `profile`, `username`, `phoneNumber`, `points`, `uaccount`, `pin`
**Response Fields**: Created `Member` object with default values
**Used By**: Member creation forms, member registration

#### GET /api/members/[id]
**What it does**: Retrieves detailed information for a specific member
**Database Operations**:
- Queries `members` collection by ID or username
- Returns complete member profile data
- Includes current account status
**Path Parameters**: `id` - Member ID or username
**Response Fields**: Complete `Member` object with all profile data
**Used By**: Member details page, member profile components

### Session Management

#### GET /api/members/[id]/sessions
**What it does**: Retrieves session history for a specific member
**Database Operations**:
- Queries `machinesessions` collection by member ID
- Applies date range and grouping filters
- Calculates session statistics
- Returns paginated results
**Query Parameters**: `page`, `limit`, `filter`, `export`, `startDate`, `endDate`
**Response Fields**: Array of session objects with statistics
**Used By**: Member session history, session grouping functionality

#### GET /api/members/[id]/sessions/[machineId]/events
**What it does**: Retrieves detailed events for a specific member session
**Database Operations**:
- Queries session events by member, machine, and session ID
- Returns detailed event data with pagination
- Includes game play details and timestamps
**Path Parameters**: `id`, `machineId`, `sessionId`
**Query Parameters**: `page`, `limit`
**Response Fields**: Array of session events with detailed data
**Used By**: Session event details view, debugging

## Financial Calculations Summary

### Member Financial Metrics
```javascript
// Total Money In Calculation
totalMoneyIn = Σ(session.endMeters.movement.drop) across all member sessions

// Total Money Out Calculation
totalMoneyOut = Σ(session.endMeters.movement.totalCancelledCredits) across all member sessions

// Win/Loss Calculation
winLoss = totalMoneyIn - totalMoneyOut

// Session Performance Calculation
sessionDuration = endTime - startTime
gamesPlayed = session.gamesPlayed
handle = session.bet * session.gamesPlayed
winRate = (session.gamesWon / session.gamesPlayed) * 100
```

### Session Aggregation Formulas
```javascript
// Daily Session Aggregation
dailySessions = GROUP BY DATE(startTime) sessions

// Weekly Session Aggregation
weeklySessions = GROUP BY WEEK(startTime) sessions

// Monthly Session Aggregation
monthlySessions = GROUP BY MONTH(startTime) sessions

// Member Performance Analysis
memberActivityLevel = COUNT(sessions) per time period
memberAverageSessionValue = totalMoneyIn / sessionCount
memberWinRate = (sessions with positive winLoss) / total sessions
```

## Search and Filtering System

### Search Implementation
```javascript
// Text Search Logic
memberSearch = FIND(members WHERE 
  profile.firstName CONTAINS searchTerm OR
  profile.lastName CONTAINS searchTerm OR
  username CONTAINS searchTerm
) CASE_INSENSITIVE

// Location Filter
locationFilter = FIND(members WHERE gamingLocation = locationId)

// Date Filter
dateFilter = FIND(sessions WHERE startTime BETWEEN startDate AND endDate)

// Licensee Filter
licenseeFilter = FIND(members WHERE gamingLocation IN (
  SELECT _id FROM gaminglocations WHERE rel.licencee = licenseeId
))
```

## Performance Considerations

### Database Optimization
- **Indexing**: Proper indexes on `memberId`, `machineId`, `startTime`, `gamingLocation`
- **Aggregation Pipelines**: Efficient MongoDB aggregation for financial calculations
- **Query Optimization**: Optimized queries with proper filtering
- **Caching**: Response caching for frequently accessed member data

### API Performance
- **Pagination**: Efficient pagination for large member datasets
- **Response Compression**: Compressed responses for large session data
- **Rate Limiting**: Protection against excessive API usage
- **Background Processing**: Heavy calculations processed in background

## Security Features

### Access Control
- **Authentication**: JWT token required for all endpoints
- **Authorization**: Role-based access to member data
- **Data Filtering**: Results filtered by user permissions and licensee
- **Audit Logging**: All member operations logged for compliance

### Data Protection
- **Input Validation**: Comprehensive validation of all member data
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: Protection against API abuse
- **Data Sanitization**: Output sanitization for security

## Error Handling

### Common Error Scenarios
- **Invalid Member Data**: Malformed member information
- **Duplicate Username**: Username already exists
- **Missing Required Fields**: Required member data not provided
- **Member Not Found**: Member ID doesn't exist

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```
