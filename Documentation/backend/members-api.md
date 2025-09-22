# Members API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  

**Last Updated:** September 20th, 2025

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

**Last Updated:** September 20th, 2025  
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

The Members API provides comprehensive member management functionality for the Evolution One CMS system. It handles member profiles, gaming session tracking, financial statistics, and member-related operations with full audit trails and security controls.

### Key Features
- **Member Management**: Complete CRUD operations for member profiles
- **Session Tracking**: Detailed gaming session history and statistics
- **Financial Analytics**: Win/loss calculations and performance metrics
- **Search and Filtering**: Advanced search capabilities with pagination
- **Audit Trails**: Complete activity logging for compliance

### System Integration
- **Authentication**: JWT-based security with role-based access control
- **Real-time Updates**: Live session tracking and member status updates
- **Financial Integration**: Seamless integration with collection and reporting systems
- **Location Management**: Member association with gaming locations

## Base URLs

```
/api/members
/api/members/[id]
/api/members/[id]/sessions
/api/members/[id]/sessions/[machineId]/events
```

## Endpoints

### GET /api/members
Retrieves a paginated list of members with search and filtering capabilities, including location information and win/loss calculations.

**Query Parameters:**
- `search` (string, optional): Search by first name, last name, or member ID
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of members per page
- `sortBy` (string, default: "createdAt"): Sort field (name, playerId, lastSession, createdAt, locationName, winLoss, lastLogin)
- `sortOrder` (string, default: "desc"): Sort direction (asc, desc)
- `licencee` (string, optional): Filter by licensee ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "_id": "member_id",
        "profile": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "occupation": "Engineer",
          "address": "123 Main St",
          "gender": "Male",
          "dob": "1990-01-01",
          "indentification": {
            "number": "ID123456",
            "type": "Driver License"
          }
        },
        "username": "johndoe",
        "phoneNumber": "+1234567890",
        "points": 1500,
        "uaccount": 250.50,
        "gamingLocation": "location_id_123",
        "locationName": "Downtown Casino",
        "lastLogin": "2024-01-15T14:30:00.000Z",
        "winLoss": -125.75,
        "totalMoneyIn": 500.00,
        "totalMoneyOut": 625.75,
        "loggedIn": false,
        "accountLocked": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalMembers": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Used By:**
- `/members` page - Member listing and management
- Member search functionality
- Member table components

---

### GET /api/members/summary
Retrieves a paginated summary of members with additional filtering options, including win/loss calculations and location information.

**Query Parameters:**
- `licencee` (string, optional): Filter by licensee ID
- `dateFilter` (string, default: "all"): Date filter (all, yesterday, week, month, custom)
- `startDate` (string, optional): Start date for custom date filtering (ISO format)
- `endDate` (string, optional): End date for custom date filtering (ISO format)
- `search` (string, optional): Search by name, phone, address, or username
- `location` (string, optional): Filter by specific gaming location
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of members per page
- `filterBy` (string, default: "createdAt"): Date field to filter by (createdAt, lastLogin)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "_id": "member_id",
        "fullName": "John Doe",
        "address": "123 Main St",
        "phoneNumber": "+1234567890",
        "lastLogin": "2024-01-15T14:30:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "locationName": "Downtown Casino",
        "gamingLocation": "location_id_123",
        "winLoss": -125.75,
        "totalMoneyIn": 500.00,
        "totalMoneyOut": 625.75
      }
    ],
    "summary": {
      "totalMembers": 1250,
      "totalLocations": 15,
      "recentMembers": 45
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 125,
      "totalCount": 1250,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 10
    }
  }
}
```

**Used By:**
- `/members` page - Members Summary tab
- Member analytics and reporting
- CSV export functionality

---

### POST /api/members
Creates a new member account.

**Request Body:**
```json
{
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "occupation": "Engineer",
    "address": "123 Main St"
  },
  "username": "johndoe",
  "phoneNumber": "+1234567890",
  "points": 0,
  "uaccount": 0,
  "pin": "0000"
}
```

**Response (Success - 201):**
```json
{
  "_id": "johndoe",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "occupation": "Engineer",
    "address": "123 Main St",
    "gender": "",
    "dob": "",
    "indentification": {
      "number": "",
      "type": ""
    }
  },
  "username": "johndoe",
  "phoneNumber": "+1234567890",
  "points": 0,
  "uaccount": 0,
  "pin": "0000",
  "gamingLocation": "default",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response (Error - 400):**
```json
{
  "error": "First name, last name, and username are required"
}
```

**Response (Error - 400):**
```json
{
  "error": "Username already exists"
}
```

**Used By:**
- `/members` page - Add new member functionality
- Member creation forms

---

### GET /api/members/[id]
Retrieves detailed information for a specific member.

**Path Parameters:**
- `id` (string): Member ID or username

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "member": {
      "_id": "member_id",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "occupation": "Engineer",
        "address": "123 Main St",
        "gender": "Male",
        "dob": "1990-01-01",
        "indentification": {
          "number": "ID123456",
          "type": "Driver License"
        }
      },
      "username": "johndoe",
      "phoneNumber": "+1234567890",
      "points": 1500,
      "uaccount": 250.50,
      "gamingLocation": "default",
      "loggedIn": false,
      "accountLocked": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Used By:**
- `/members/[id]` page - Member details view
- Member profile components

---

### GET /api/members/[id]/sessions
Retrieves session history for a specific member with grouping options.

**Path Parameters:**
- `id` (string): Member ID or username

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of sessions per page
- `filter` (string, optional): Grouping filter (session, day, week, month)
- `export` (boolean, optional): Export all data when true
- `startDate` (string, optional): Start date for filtering
- `endDate` (string, optional): End date for filtering

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
        "startTime": "2024-01-01T10:00:00.000Z",
        "endTime": "2024-01-01T12:00:00.000Z",
        "duration": 120,
        "gamesPlayed": 50,
        "points": 100,
        "handle": 500.00,
        "won": 75.00,
        "bet": 25.00,
        "gamesWon": 5,
        "jackpot": 0,
        "cancelledCredits": 0
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalSessions": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Used By:**
- `/members/[id]` page - Member session history
- Session grouping functionality (day/week/month views)
- Export functionality

---

### GET /api/members/[id]/sessions/[machineId]/events
Retrieves detailed events for a specific member session on a specific machine.

**Path Parameters:**
- `id` (string): Member ID or username
- `machineId` (string): Machine ID
- `sessionId` (string): Session ID

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
        "eventType": "game_played",
        "timestamp": "2024-01-01T10:05:00.000Z",
        "data": {
          "gameId": "game_123",
          "bet": 1.00,
          "win": 2.50,
          "multiplier": 2.5
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
- `/members/[id]/sessions/[sessionId]/[machineId]/events` page
- Session event details view

## Database Models

### Member Model
```typescript
type Member = {
  _id: string; // Username
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    occupation: string;
    address: string;
    gender: string;
    dob: string;
    indentification: {
      number: string;
      type: string;
    };
  };
  username: string;
  phoneNumber: string;
  points: number;
  uaccount: number; // Account balance
  pin: string;
  gamingLocation: string;
  locationName?: string; // Gaming location name (populated via lookup)
  lastLogin?: Date;
  // Win/Loss calculations (calculated from machine sessions)
  winLoss?: number; // Total win/loss (drop - totalCancelledCredits)
  totalMoneyIn?: number; // Total money inserted (drop)
  totalMoneyOut?: number; // Total money paid out (totalCancelledCredits)
  loggedIn: boolean;
  accountLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

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
  };
  endMeters?: {
    coinIn: number;
    totalWonCredits: number;
    jackpot: number;
    totalCancelledCredits: number;
  };
  gamesWon: number;
  bet: number;
  won: number;
  duration?: number;
}
```

## Win/Loss Calculation Logic

### Financial Metrics Calculation
The Members API calculates win/loss data by aggregating machine session data using MongoDB aggregation pipelines:

**Data Source:** `machinesessions` collection
**Key Fields Used:**
- `endMeters.movement.drop` - Total money inserted by member (Money In)
- `endMeters.movement.totalCancelledCredits` - Total money paid out to member (Money Out)

**Calculation Formula:**
```javascript
// MongoDB aggregation pipeline
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

**Win/Loss Interpretation:**
- **Positive winLoss**: Member lost money (house won)
- **Negative winLoss**: Member won money (house lost)
- **Zero winLoss**: Break-even session

**Performance Considerations:**
- Calculations are performed at query time using MongoDB aggregation
- Results are not stored to maintain data consistency
- Aggregation pipelines are optimized with proper indexing on `memberId` and session fields

### Location Data Integration
Member location information is populated via MongoDB `$lookup` operations:

**Source Collections:**
- `members.gamingLocation` → `gaminglocations._id`
- Populates `locationName` field with human-readable location name

**Licensee Filtering:**
- Filters members by `gaminglocations.rel.licencee` field
- Ensures multi-tenant data isolation
- Applied via aggregation pipeline matching

## Features

### Search and Filtering
- **Text Search**: Search by first name, last name, or member ID
- **Pagination**: Efficient pagination with configurable limits
- **Sorting**: Multiple sort options including:
  - `name` - Member full name (firstName + lastName)
  - `playerId` - Member ID
  - `createdAt` - Registration date
  - `lastSession` - Last session date
  - `locationName` - Gaming location name
  - `winLoss` - Financial performance
  - `lastLogin` - Last login timestamp
- **Date Filtering**: Filter sessions by date ranges
- **Location Filtering**: Filter by specific gaming locations
- **Licensee Filtering**: Multi-tenant isolation by licensee

### Session Grouping
- **Individual Sessions**: View each session separately
- **Daily Groups**: Group sessions by day (e.g., "Jun 12th")
- **Weekly Groups**: Group sessions by week
- **Monthly Groups**: Group sessions by month (1-4 weeks)

### Data Export
- **CSV Export**: Export member data and session history
- **Full Data Fetch**: Retrieve all data for export purposes
- **Filtered Export**: Export data based on current filters

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Invalid input) |
| 404 | Not Found (Member not found) |
| 500 | Internal Server Error |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Validation**: Custom validation utilities
- **Middleware**: Database connection middleware
- **Authentication**: JWT token validation

### Financial Calculations Analysis

#### Member API Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

##### **Member Total Money In (Session Data) ❌**
- **Current Implementation**: 
  ```javascript
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
  }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES** field usage
- **Data Source**: `machinesessions.endMeters.movement.drop`
- **Business Context**: Total money member inserted across all sessions
- ❌ **NOT IN GUIDE** - Session-level meter data structure not defined in financial metrics guide

##### **Member Total Money Out (Session Data) ❌**
- **Current Implementation**: 
  ```javascript
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
  }
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES** field usage
- **Data Source**: `machinesessions.endMeters.movement.totalCancelledCredits`
- **Business Context**: Total credits cancelled/paid out to member
- ❌ **NOT IN GUIDE** - Session-level meter data structure not defined in financial metrics guide

##### **Member Win/Loss Calculation ❌**
- **Current Implementation**: 
  ```javascript
  winLoss: { $subtract: ["$totalMoneyIn", "$totalMoneyOut"] }
  ```
- **Mathematical Formula**: `winLoss = totalMoneyIn - totalMoneyOut`
- **Financial Guide**: No direct equivalent for member-level win/loss
- **Business Logic**: 
  - **Positive Value**: Member lost money (house profit)
  - **Negative Value**: Member won money (house loss)
- ❌ **NOT IN GUIDE** - Member win/loss calculation not defined in financial metrics guide

##### **Session Data Aggregation ❌**
- **Current Implementation**: 
  ```javascript
  // Lookup sessions for each member
  { $lookup: {
    from: "machinesessions",
    localField: "_id",
    foreignField: "memberId",
    as: "sessions"
  }}
  ```
- **Data Source**: `machinesessions` collection with `endMeters.movement` structure
- **Financial Guide**: No guidance for session-level aggregations
- ❌ **NOT IN GUIDE** - Session aggregation pattern not defined in financial metrics guide

##### **Member Location Association ✅**
- **Current Implementation**: 
  ```javascript
  // Lookup gaming location
  { $lookup: {
    from: "gaminglocations",
    localField: "gamingLocation",
    foreignField: "_id", 
    as: "locationInfo"
  }},
  locationName: { $arrayElemAt: ["$locationInfo.name", 0] }
  ```
- **Business Logic**: Associates members with gaming locations
- ✅ **CONSISTENT** - Standard location lookup pattern

### Mathematical Formulas Summary

#### **Member Financial Metrics (Requires Verification)**
```
Member Total Money In = Σ(session.endMeters.movement.drop) across all member sessions
Member Total Money Out = Σ(session.endMeters.movement.totalCancelledCredits) across all member sessions  
Member Win/Loss = Member Total Money In - Member Total Money Out
```

#### **Session Financial Structure (Not in Guide)**
```
Session Start Meters = session.startMeters.movement.*
Session End Meters = session.endMeters.movement.*
Session Financial Delta = endMeters - startMeters
```

#### **Member Performance Analysis**
```
Member Activity Level = COUNT(sessions) per time period
Member Average Session Value = totalMoneyIn / sessionCount
Member Win Rate = (sessions with positive winLoss) / total sessions
Member Location Preference = PRIMARY gamingLocation
```

#### **Search and Filter Logic**
```
Member Search = FIND(members WHERE 
  profile.firstName CONTAINS searchTerm OR
  profile.lastName CONTAINS searchTerm OR
  _id CONTAINS searchTerm
) CASE_INSENSITIVE

Location Filter = FIND(members WHERE gamingLocation = locationId)
Date Filter = FIND(sessions WHERE startTime BETWEEN startDate AND endDate)
```

### Required Verification

**The following calculations need to be verified against the financial metrics guide:**

1. **Session Meter Data**: Confirm `endMeters.movement` structure aligns with standard meter calculations
2. **Member Win/Loss Logic**: Verify this represents actual member gambling outcomes vs house edge
3. **Data Source Accuracy**: Confirm session data accurately reflects member financial activity
4. **Aggregation Method**: Verify session-based aggregation vs direct meter aggregation

**Note**: Member API calculations use session-level data (`endMeters.movement`) which is not explicitly defined in the financial metrics guide and requires verification for accuracy.

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

## Related Frontend Pages

- **Members List** (`/members`): Member management page
- **Member Details** (`/members/[id]`): Individual member view
- **Session History** (`/members/[id]`): Member session tracking
- **Session Events** (`/members/[id]/sessions/[sessionId]/[machineId]/events`): Detailed session events
