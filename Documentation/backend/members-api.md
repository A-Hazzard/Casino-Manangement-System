# Members API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025  
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
