# Sessions Page

## Table of Contents

- [Overview](#overview)
- [Main Features](#main-features)
- [Technical Architecture](#technical-architecture)
- [Session Management](#session-management)
- [Performance Analytics](#performance-analytics)
- [Machine Event Monitoring](#machine-event-monitoring)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Security Features](#security-features)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Overview

The Sessions page provides comprehensive session management and monitoring for the casino system, including session tracking, performance analytics, and machine event monitoring. This page serves as the central hub for managing gaming sessions and analyzing player behavior.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 22, 2025  
**Version:** 2.0.0

### File Information

- **File:** `app/sessions/page.tsx`
- **URL Pattern:** `/sessions`
- **Component Type:** Session Management Page
- **Authentication:** Required

## Main Features

- **Session Management:**
  - View, search, sort, and paginate all gaming sessions
  - Real-time session status and duration tracking
  - Session performance metrics and financial data
  - Filter sessions by multiple criteria
- **Session Analytics:**
  - Session duration tracking and gaming statistics
  - Financial metrics: handle, cancelled credits, jackpot amounts
  - Gaming statistics: games played, games won, points earned
  - Member and machine association tracking
- **Machine Event Monitoring:**
  - Detailed event logs for specific machine sessions
  - Navigate to session-specific machine events
  - Event filtering by type, description, and game
  - Sequence tracking for complex machine events
- **Search and Filtering:**
  - Real-time search across session data
  - Sort by multiple columns (date, duration, member, machine)
  - Advanced filtering options
  - Quick access to high-value sessions
- **Responsive Design:**
  - Desktop table view with comprehensive data
  - Mobile card views for smaller screens
  - Optimized for different screen sizes
  - Touch-friendly navigation
- **Navigation System:**
  - Direct navigation to session events
  - Member profile linking
  - Machine details integration
  - Session timeline navigation

## Technical Architecture

### Core Components

- **Main Page:** `app/sessions/page.tsx` - Entry point with session listing and management
- **Session Events:** `app/sessions/[sessionId]/[machineId]/events/page.tsx` - Detailed machine event monitoring
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation header
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Session Management Components:**
  - `components/sessions/SessionEventsTable.tsx` - Session events display
  - `components/sessions/SessionEventsSkeleton.tsx` - Loading skeleton for events

### State Management

- **Local State:** React `useState` hooks for session data and UI state
- **Key State Properties:**
  - `sessions`, `filteredSessions` - Session data arrays
  - `loading`, `error` - Loading and error states
  - `searchTerm`, `sortField`, `sortOrder` - Search and sort states
  - `currentPage`, `pagination` - Pagination state
  - `selectedLicencee` - Licensee filtering state

### Data Flow

1. **Initial Load:** Fetches sessions data on component mount
2. **Search/Filter:** Filters sessions based on search terms and criteria
3. **Sorting:** Sorts sessions based on selected columns and direction
4. **Pagination:** Displays paginated results with backend pagination
5. **Event Navigation:** Navigates to detailed machine events
6. **Real-time Updates:** Refreshes data periodically

### API Integration

#### Session Management Endpoints

- **GET `/api/sessions`** - Fetches session data with pagination
  - Parameters: `page`, `limit`, `search`, `sortBy`, `sortOrder`
  - Returns: `{ success: true, data: { sessions: Session[], pagination: PaginationData } }`
- **GET `/api/sessions/[sessionId]/[machineId]/events`** - Fetches machine events for specific session
  - Parameters: `sessionId`, `machineId`, `page`, `limit`, `eventType`, `event`, `game`
  - Returns: `{ success: true, data: { events: MachineEvent[], pagination: PaginationData, filters: FilterData } }`

#### Data Processing

- **Sessions Helper:** `lib/helpers/sessions.ts` - Session management utilities
  - `fetchSessions()` - Fetches session data with filtering and pagination
  - `formatSessionData()` - Formats session data for display
  - `calculateSessionMetrics()` - Calculates session performance metrics
- **Events Helper:** `lib/helpers/events.ts` - Machine events utilities
  - `fetchMachineEvents()` - Fetches machine events for sessions
  - `filterEvents()` - Filters events by type, description, and game

### Key Dependencies

#### Frontend Libraries

- **React Hooks:** `useState`, `useEffect`, `useCallback`, `useMemo` - State management
- **Next.js:** `useRouter`, `usePathname`, `useParams` - Navigation and routing
- **Axios:** HTTP client for API calls
- **Sonner:** Toast notifications for user feedback
- **Lucide React:** Various icons for UI elements

#### Type Definitions

- **Session Types:** `lib/types/sessions.ts` - Session management types
  - `Session`, `SessionFilter`, `SessionSortOption`
- **Event Types:** `lib/types/events.ts` - Machine event types
  - `MachineEvent`, `EventFilter`, `EventSequence`
- **API Types:** `lib/types/api.ts` - API-related types
  - `PaginationData`, `FilterData`

#### Utility Functions

- **Date Utils:** Date formatting and manipulation utilities
- **Currency Utils:** Currency formatting for financial data
- **Duration Utils:** Session duration calculations and formatting

### Component Hierarchy

```
SessionsPage (app/sessions/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Search and Filter Controls
├── Sessions Table [Desktop]
├── Session Cards [Mobile]
├── Pagination Controls
└── Navigation Actions

SessionEventsPage (app/sessions/[sessionId]/[machineId]/events/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Session Information Header
├── Event Filter Controls
├── SessionEventsTable (components/sessions/SessionEventsTable.tsx)
└── Event Details Modals
```

### Business Logic

- **Session Management:** Complete session tracking and performance monitoring
- **Event Monitoring:** Detailed machine event logs and analysis
- **Performance Analytics:** Session metrics and financial calculations
- **Search & Filtering:** Real-time search across multiple session fields
- **Sorting:** Multi-column sorting with direction indicators
- **Pagination:** Efficient data display with backend pagination
- **Navigation:** Seamless navigation between sessions and events

### Security Features

- **Authentication:** Secure API calls with authentication headers
- **Authorization:** Role-based access to session operations
- **Data Sanitization:** Safe handling of session and event data
- **Audit Trail:** Session access logging for security

### Error Handling

- **API Failures:** Graceful degradation with user-friendly error messages
- **Network Issues:** Retry logic and fallback error states
- **Loading States:** Skeleton loaders and loading indicators
- **Toast Notifications:** User feedback for all operations
- **Navigation Errors:** Handle invalid session IDs and missing data

### Performance Optimizations

- **Backend Pagination:** Reduces data transfer and improves performance
- **Memoization:** `useMemo` for expensive computations (filtering, sorting)
- **Conditional Rendering:** Separate desktop/mobile layouts
- **Efficient Filtering:** Optimized search and filter algorithms
- **Data Caching:** Client-side caching of frequently accessed data
- **Lazy Loading:** Load session details on demand

## Notes Section

### How the Sessions Page Works (Simple Explanation)

The sessions page is like a **gaming activity monitor** for your casino. Here's how it works:

#### **Session Management Section**

**🎮 What Sessions Are**

- **Collection**: Queries the `machinesessions` collection in the database
- **Fields Used**: `_id`, `sessionId`, `memberId`, `machineId`, `startTime`, `endTime`, `gamesPlayed`, `points`, `handle`
- **Simple Explanation**: Each time someone plays on a slot machine, it creates a session - like a gaming record with start and end times

**🔍 How Session Search Works**

- **Collection**: Filters the `machinesessions` collection
- **Fields Used**: Searches by `sessionId`, `memberId`, `machineId`, member name, machine name
- **Simple Explanation**: Like searching through gaming records - you can find sessions by player, machine, or session ID

**📊 Session Performance Tracking**

- **Collection**: Aggregates data from `machinesessions` collection
- **Fields Used**: `handle`, `cancelledCredits`, `jackpot`, `won`, `bet`, `points`, `gamesPlayed`, `gamesWon`
- **Simple Explanation**: Shows how much money was played, won, and lost during each gaming session

#### **Machine Events Section**

**⚡ What Machine Events Are**

- **Collection**: Queries the `machineevents` collection
- **Fields Used**: `_id`, `eventType`, `description`, `command`, `gameName`, `date`, `sequence`, `currentSession`, `machine`
- **Simple Explanation**: These are detailed logs of everything that happened on a slot machine during a specific session

**🎯 Event Filtering System**

- **Collection**: Filters `machineevents` by session and machine
- **Fields Used**: `currentSession` (matches sessionId), `machine` (matches machineId), `eventType`, `description`, `gameName`
- **Simple Explanation**: Shows only the events that happened on a specific machine during a specific gaming session

**📋 Sequence Tracking**

- **Collection**: Uses `sequence` array in `machineevents`
- **Fields Used**: `sequence.description`, `sequence.logLevel`, `sequence.success`
- **Simple Explanation**: Some machine events have multiple steps - like a complex operation that involves several actions

#### **Database Queries Explained**

**For Session List:**

```javascript
// Queries the machinesessions collection
// Filters by: search term, date range, licensee
// Sorts by: startTime, duration, handle, member, machine
// Returns: paginated session list with performance metrics
```

**For Session Events:**

```javascript
// Queries the machineevents collection
// Filters by: currentSession (sessionId) AND machine (machineId)
// Returns: all events for that specific machine during that specific session
```

**For Session Analytics:**

```javascript
// Aggregates machinesessions data
// Groups by: date, member, machine
// Calculates: total handle, session count, average duration
// Returns: performance analytics and trends
```

#### **Navigation Flow**

**1. Sessions List → Session Events:**

- Click "View Events" on any session
- Navigate to `/sessions/[sessionId]/[machineId]/events`
- Shows all events for that specific machine during that session

**2. Session → Member Profile:**

- Click on member name in session
- Navigate to `/members/[memberId]`
- Shows member profile and all their sessions

**3. Session → Machine Details:**

- Click on machine ID in session
- Navigate to machine-specific information
- Shows machine performance and status

#### **Event Filtering and Analysis**

**1. Event Type Filtering:**

- **General Events**: Normal machine operations
- **Significant Events**: Important machine activities
- **Priority Events**: Critical machine alerts or errors

**2. Event Description Filtering:**

- **Game Events**: Game-specific activities
- **Payment Events**: Money in/out operations
- **Error Events**: Machine malfunctions or issues
- **Maintenance Events**: Service and maintenance activities

**3. Game Name Filtering:**

- Filter events by specific games played
- Track game-specific performance
- Identify game-related issues

#### **Why This Matters for Casino Operations**

**🎮 Session Management Benefits:**

- **Player Activity**: Track all gaming sessions across all machines
- **Revenue Analysis**: Monitor money flow and gaming patterns
- **Performance Metrics**: Identify high-value sessions and trends
- **Compliance**: Maintain detailed records for regulatory requirements

**⚡ Machine Event Benefits:**

- **Troubleshooting**: Diagnose machine issues quickly with detailed logs
- **Security**: Monitor for suspicious activity or tampering
- **Maintenance**: Track machine performance and predict maintenance needs
- **Compliance**: Maintain detailed audit trails for regulators

**📊 Operational Benefits:**

- **Real-time Monitoring**: See what's happening across all machines
- **Performance Analysis**: Identify patterns and optimization opportunities
- **Issue Resolution**: Quickly identify and resolve problems
- **Data Analytics**: Generate insights for business decisions

**🔍 Analytical Capabilities:**

- **Session Trends**: Identify peak gaming times and patterns
- **Machine Performance**: Track which machines perform best
- **Player Behavior**: Understand gaming preferences and habits
- **Revenue Optimization**: Optimize machine placement and game selection

The sessions page essentially **monitors all gaming activity** in your casino, providing detailed session tracking and machine event monitoring for operational efficiency, security, and regulatory compliance.

## Current Implementation Status

### **Functional Features**

- ✅ Session listing with basic information
- ✅ Search and sorting functionality
- ✅ Pagination support
- ✅ Responsive design (desktop/mobile)
- ✅ Navigation to session events
- ✅ Date and currency formatting
- ✅ Error handling and loading states

### **Session Events Integration**

- ✅ Route structure: `/sessions/[sessionId]/[machineId]/events`
- ✅ Event filtering by type, description, and game
- ✅ Expandable sequence details
- ✅ Real-time filtering capabilities
- ✅ Pagination support for events

### **Expected User Experience**

1. View all gaming sessions in a searchable, sortable table
2. Click "View Events" on any session to see detailed machine activity
3. Navigate to `/sessions/[sessionId]/[machineId]/events`
4. See machine events table with three filter dropdowns
5. Use filters to find specific events or problems
6. Expand sequence details to see step-by-step machine operations
7. Navigate back to sessions or continue to member/machine details

The sessions page provides comprehensive gaming session monitoring with detailed machine event tracking, essential for casino operations, security, and regulatory compliance.

## Financial Calculations Analysis

### Session Financial Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

#### **Session Financial Metrics ❌**

- **Current Implementation**: Uses session-level meter data from `machinesessions` collection
- **Data Source**:
  ```javascript
  // Session financial fields
  handle: Number,           // Total betting activity during session
  cancelledCredits: Number, // Credits cancelled during session
  jackpot: Number,          // Jackpots won during session
  won: Number,              // Total winnings during session
  bet: Number,              // Total bets placed during session
  points: Number,           // Points earned during session
  gamesPlayed: Number,      // Games played during session
  gamesWon: Number          // Games won during session
  ```
- **Financial Guide**: No specific guidance for session-level financial calculations
- ❌ **NOT IN GUIDE** - Session financial structure not defined in financial metrics guide

#### **Session Duration Calculation ✅**

- **Current Implementation**:
  ```javascript
  duration = endTime - startTime (in minutes)
  ```
- **Business Logic**: Calculates actual playing time for each session
- ✅ **CONSISTENT** - Standard time calculation

#### **Session Performance Metrics ❌**

- **Current Implementation**:
  ```javascript
  // Calculated session metrics
  winRate = (gamesWon / gamesPlayed) * 100;
  averageBet = bet / gamesPlayed;
  pointsPerGame = points / gamesPlayed;
  handlePerMinute = handle / duration;
  ```
- **Financial Guide**: No guidance for session-level performance metrics
- ❌ **NOT IN GUIDE** - Session performance calculations not defined in financial metrics guide

#### **Session Event Association ✅**

- **Current Implementation**:
  ```javascript
  // Links sessions to machine events
  { $match: {
    currentSession: sessionId,
    machine: machineId
  }}
  ```
- **Business Logic**: Associates events with specific machine sessions
- ✅ **CONSISTENT** - Standard session-event linking pattern

#### **Session Search Logic ✅**

- **Current Implementation**:
  ```javascript
  $or: [
    { sessionId: { $regex: searchTerm, $options: 'i' } },
    { machineId: { $regex: searchTerm, $options: 'i' } },
    { memberId: { $regex: searchTerm, $options: 'i' } },
  ];
  ```
- **Business Logic**: Case-insensitive search across session identifiers
- ✅ **COMPREHENSIVE** - Covers all relevant searchable session fields

### Mathematical Formulas Summary

#### **Session Financial Metrics (Requires Verification)**

```
Session Handle = Total betting activity during session
Session Cancelled Credits = Credits refunded during session
Session Jackpot = Jackpot amounts won during session
Session Net Win = won - bet (player perspective)
Session House Edge = bet - won (casino perspective)
```

#### **Session Performance Calculations**

```
Session Duration = endTime - startTime (in minutes)
Win Rate = (gamesWon / gamesPlayed) * 100
Average Bet = bet / gamesPlayed
Points Per Game = points / gamesPlayed
Handle Per Minute = handle / duration
```

#### **Session Event Tracking**

```
Session Events = FIND(machineevents WHERE
  currentSession = sessionId AND
  machine = machineId
) ORDER BY timestamp ASC
```

#### **Session Aggregation by Time**

```
Daily Sessions = GROUP BY DATE(startTime)
Weekly Sessions = GROUP BY WEEK(startTime)
Monthly Sessions = GROUP BY MONTH(startTime)
```

### Data Validation & Error Handling

#### **Input Validation ✅**

- **Session ID**: Validates session identifier format
- **Date Ranges**: Validates ISO date format for filtering
- **Pagination**: Validates numeric page and limit parameters
- **Search Terms**: Sanitizes input to prevent injection attacks

#### **Data Integrity ❌**

- **Session Metrics**: Session-level financial calculations need verification
- **Null Handling**: Uses fallback values but session structure needs verification
- **Time Calculations**: Duration calculations assume valid start/end times

### Required Verification

**The following calculations need to be verified against the financial metrics guide:**

1. **Session Financial Structure**: Confirm session meter data aligns with standard calculations
2. **Performance Metrics**: Verify session-level metrics represent accurate gaming outcomes
3. **Data Source Accuracy**: Confirm session data accurately reflects actual gaming activity
4. **Event Association**: Verify session-event linking accurately represents machine activity

**Note**: Session calculations use session-level data structures not explicitly defined in the financial metrics guide and require verification for accuracy.
