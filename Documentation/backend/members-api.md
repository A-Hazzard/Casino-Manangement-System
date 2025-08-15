# Members API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Members API manages gaming member data, including member profiles, session history, and gaming statistics. It provides CRUD operations for member management and session tracking.

## Base URL
```
/api/members
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
interface Member {
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

## Related Frontend Pages

- **Members List** (`/members`): Member management interface
- **Member Details** (`/members/[id]`): Individual member view
- **Session History** (`/members/[id]`): Member session tracking
- **Session Events** (`/members/[id]/sessions/[sessionId]/[machineId]/events`): Detailed session events
