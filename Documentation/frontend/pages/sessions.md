# Sessions Page

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Page Header](#page-header)
  - [Search and Filter Section](#search-and-filter-section)
  - [Sessions Table Display](#sessions-table-display)
  - [Pagination](#pagination)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Sessions page provides comprehensive session management and monitoring for the casino system, including session tracking, performance analytics, and machine event monitoring. This page displays all gaming sessions with filtering, search, sorting, and pagination capabilities.

The page allows users to:
- View all gaming sessions across the system
- Search sessions by player, machine, or session ID
- Filter sessions by date range using dashboard date filters
- Sort sessions by various columns (start time, duration, handle, jackpot, points)
- Navigate to detailed machine events for each session
- View session performance metrics and financial data

## File Information

- **File:** `app/sessions/page.tsx`
- **URL Pattern:** `/sessions`
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** All authenticated users (with "sessions" page permission)
- **Main Component:** `SessionsPageContent` (within `app/sessions/page.tsx`)

## Page Sections

### Page Header

**Purpose:** Display page title, icon, description, and refresh button.

**Components Used:**
- Page header section within `SessionsPageContent`
- Refresh button with loading state indicator
- Activity log icon from `IMAGES.activityLogIcon`

**Data Flow:**
- Refresh button triggers `refreshSessions` function from `useSessions` hook
- Loading state managed by `refreshing` state and `loading` from hook

**Key Functions:**
- `refreshSessions` (`useSessions` hook) - Refreshes sessions data

**Notes:**
- Refresh button shows spinning icon when loading
- Page title: "Sessions"
- Description: "View all gaming sessions and their events"

---

### Search and Filter Section

**Purpose:** Provide search, date filtering, and sorting capabilities for sessions.

**Components Used:**
- `SessionsFilters` (`components/sessions/SessionsFilters.tsx`) - Main filters component
- `DashboardDateFilters` (`components/dashboard/DashboardDateFilters.tsx`) - Date range filter
- `CustomSelect` (`components/ui/custom-select`) - Sort field and order dropdowns
- `Input` (`components/ui/input`) - Search input field

**API Endpoints:**
- Date filters integrate with dashboard date filter system (uses `activeMetricsFilter` and `customDateRange` from dashboard store)

**Data Flow:**
1. User enters search term → `setSearchTerm` updates state
2. Search term is debounced (400ms) before triggering API call
3. User selects date filter → Updates dashboard date filter state
4. User changes sort field/order → Updates `sortBy` and `sortOrder` state
5. All filter changes trigger session data refresh via `useSessions` hook

**Key Functions:**
- `setSearchTerm` (`useSessionsFilters` hook) - Updates search term
- `setSortBy` (`useSessionsFilters` hook) - Updates sort field
- `setSortOrder` (`useSessionsFilters` hook) - Updates sort order
- `handleSort` (`useSessionsFilters` hook) - Handles sort changes

**State Management:**
- `searchTerm` - Current search input value
- `sortBy` - Current sort field (startTime, handle, duration, etc.)
- `sortOrder` - Sort direction ('asc' | 'desc')
- Date filters: `activeMetricsFilter` and `customDateRange` from `useDashBoardStore`

**Notes:**
- Search placeholder: "Search by player, machine, or session ID..."
- Sort options defined in `SESSION_SORT_OPTIONS` constant
- Desktop view: Purple bar style filter bar
- Mobile view: Horizontal scrollable filters
- Date filters support: Today, Yesterday, Last 7 Days, Last 30 Days, Custom range, All Time

---

### Sessions Table Display

**Purpose:** Display sessions data in a responsive table format with all relevant session information.

**Components Used:**
- `SessionsTable` (`components/sessions/SessionsTable.tsx`) - Main table component
- `SessionsPageSkeleton` (`components/ui/skeletons/SessionsSkeletons.tsx`) - Loading skeleton
- Table rows with formatted data columns

**API Endpoints:**
- `GET /api/sessions` - Fetches sessions data (called via `useSessions` hook)

**Data Flow:**
1. `useSessions` hook fetches sessions data based on current filters
2. Sessions data passed to `SessionsTable` component
3. Table renders sessions with formatted columns
4. User clicks "View Events" button → Navigates to session events page
5. User clicks machine name/ID → Navigates to cabinet details page

**Key Functions:**
- `useSessions` (`lib/hooks/data/useSessions.ts`) - Fetches and manages sessions data
- `handleViewEvents` (`SessionsPageContent`) - Navigates to session events page
- `formatDate`, `formatDuration`, `formatCurrency`, `formatPoints` (`lib/helpers/sessions.ts`) - Formatting utilities
- `formatMachineDisplayNameWithBold` (`lib/utils/machineDisplay.ts`) - Machine name formatting

**Table Columns:**
- **Player**: Member name and member ID
- **Machine**: Machine serial number (with custom name and game), machine ID (with external link icon)
- **Start Time**: Formatted session start date/time
- **Duration**: Formatted session duration (hours:minutes:seconds)
- **Handle**: Formatted currency amount
- **Jackpot**: Formatted currency amount
- **Points**: Formatted points earned
- **Actions**: "View Events" button

**State Management:**
- `sessions` - Array of session objects (from `useSessions` hook)
- `loading` - Loading state (from `useSessions` hook)
- `error` - Error state (from `useSessions` hook)
- `pagination` - Pagination data (from `useSessions` hook)

**Notes:**
- Desktop view: Full table with all columns visible
- Mobile view: Card-based layout (if implemented) or responsive table
- Empty state: Shows "No sessions found for the selected criteria" message
- Machine names link to `/cabinets/[machineId]`
- "View Events" button navigates to `/sessions/[sessionId]/[machineId]/events`

---

### Pagination

**Purpose:** Handle pagination for large datasets of sessions.

**Components Used:**
- `PaginationControls` (`components/ui/PaginationControls.tsx`) - Pagination component

**Data Flow:**
1. User clicks page number → `handlePageChange` updates `currentPage`
2. `useSessions` hook detects page change and fetches new data
3. Batch loading logic pre-loads next batch when approaching end of current batch

**Key Functions:**
- `handlePageChange` (`useSessions` hook) - Handles page changes
- `currentPage` - Current page number (from `useSessions` hook)
- Batch loading logic (within `useSessions` hook) - Pre-loads next batch

**State Management:**
- `currentPage` - Current page number (from `useSessions` hook)
- `pagination` - Pagination metadata (totalPages, hasNextPage, hasPrevPage)
- `loadedBatches` - Set of loaded batch numbers for pre-loading optimization

**Notes:**
- Pagination uses batch loading optimization (loads multiple pages per batch)
- Batch size configured via `itemsPerBatch` and `pagesPerBatch` constants
- Next batch pre-loaded when user reaches end of current batch

---

## API Endpoints

### Sessions

- **GET `/api/sessions`**
  - **Purpose:** Fetch paginated list of gaming sessions with filtering, search, and sorting
  - **Query Parameters:**
    - `page` - Page number (default: 1)
    - `limit` - Items per page (default: 10)
    - `search` - Search term (searches session ID, machine ID, member ID)
    - `sortBy` - Sort field (startTime, handle, won, gamesPlayed, duration, etc.)
    - `sortOrder` - Sort direction (asc, desc)
    - `licencee` - Licensee filter (optional)
    - `dateFilter` - Date filter type (today, yesterday, week, month, custom)
    - `startDate` - Custom start date (ISO string)
    - `endDate` - Custom end date (ISO string)
  - **Response:** `{ success: true, data: { sessions: Session[], pagination: PaginationData } }`
  - **Used By:** `useSessions` hook

- **GET `/api/sessions/[sessionId]`**
  - **Purpose:** Fetch individual session details
  - **Query Parameters:**
    - `timePeriod` - Date filter type (optional)
    - `startDate` - Custom start date (optional)
    - `endDate` - Custom end date (optional)
  - **Response:** `{ success: true, data: Session }`
  - **Used By:** Session events page, session details components

- **GET `/api/sessions/[sessionId]/[machineId]/events`**
  - **Purpose:** Fetch machine events for a specific session
  - **Query Parameters:**
    - `page` - Page number
    - `limit` - Items per page
    - `eventType` - Filter by event type (optional)
    - `event` - Filter by event name (optional)
    - `game` - Filter by game (optional)
    - `timePeriod` - Date filter type (optional)
    - `startDate` - Custom start date (optional)
    - `endDate` - Custom end date (optional)
  - **Response:** `{ success: true, data: { events: MachineEvent[], pagination: PaginationData, filters: FilterData } }`
  - **Used By:** Session events page (`app/sessions/[sessionId]/[machineId]/events/page.tsx`)

---

## State Management

### Hooks

- **`useSessions`** (`lib/hooks/data/useSessions.ts`)
  - Fetches and manages sessions data
  - Handles pagination and batch loading
  - Manages loading, error, and pagination states
  - Provides: `sessions`, `loading`, `error`, `pagination`, `currentPage`, `handlePageChange`, `refreshSessions`

- **`useSessionsFilters`** (`lib/hooks/data/useSessionsFilters.ts`)
  - Manages search and sort state
  - Handles debounced search term
  - Provides: `searchTerm`, `sortBy`, `sortOrder`, `setSearchTerm`, `setSortBy`, `setSortOrder`, `handleSort`

- **`useSessionsNavigation`** (`lib/hooks/data/useSessionsNavigation.ts`)
  - Handles navigation to session events pages
  - Provides: `navigateToSessionEvents` function

- **`useDashBoardStore`** (`lib/store/dashboardStore.ts`) - Zustand store
  - `selectedLicencee` - Selected licensee for filtering
  - `activeMetricsFilter` - Active date filter type
  - `customDateRange` - Custom date range (if Custom filter selected)
  - `setSelectedLicencee` - Licensee selection setter

### State Properties

**From `useSessions` hook:**
- `sessions` - Array of session objects
- `loading` - Loading state
- `error` - Error state (string or null)
- `pagination` - Pagination metadata object
- `currentPage` - Current page number (0-based)
- `allSessions` - All loaded sessions (for batch loading)
- `loadedBatches` - Set of loaded batch numbers

**From `useSessionsFilters` hook:**
- `searchTerm` - Current search input value
- `debouncedSearchTerm` - Debounced search term (400ms delay)
- `sortBy` - Current sort field
- `sortOrder` - Sort direction ('asc' | 'desc')

---

## Key Functions

### Data Fetching

- **`fetchSessions`** (`lib/hooks/data/useSessions.ts`)
  - Fetches sessions data from API with current filters
  - Handles batch loading logic
  - Manages pagination state
  - Returns sessions array and pagination data

- **`buildSessionsQueryParams`** (`lib/helpers/sessionsPageData.ts` or similar)
  - Builds query parameters for sessions API request
  - Handles date filtering, search, sorting, pagination
  - Returns URLSearchParams object

### Session Operations

- **`refreshSessions`** (`lib/hooks/data/useSessions.ts`)
  - Refreshes sessions data
  - Resets pagination to first page
  - Clears loaded batches

- **`handlePageChange`** (`lib/hooks/data/useSessions.ts`)
  - Handles pagination page changes
  - Updates current page state
  - Triggers data fetch if needed

### Navigation

- **`navigateToSessionEvents`** (`lib/hooks/data/useSessionsNavigation.ts`)
  - Navigates to session events page
  - Route: `/sessions/[sessionId]/[machineId]/events`
  - Takes sessionId and machineId as parameters

### Formatting

- **`formatDate`** (`lib/helpers/sessions.ts`)
  - Formats session dates for display
  - Returns formatted date string

- **`formatDuration`** (`lib/helpers/sessions.ts`)
  - Formats session duration (seconds to hours:minutes:seconds)
  - Returns formatted duration string

- **`formatCurrency`** (`lib/helpers/sessions.ts`)
  - Formats currency amounts for display
  - Handles currency symbol and decimal places

- **`formatPoints`** (`lib/helpers/sessions.ts`)
  - Formats points for display
  - Returns formatted points string

- **`formatMachineDisplayNameWithBold`** (`lib/utils/machineDisplay.ts`)
  - Formats machine display name with custom name and game
  - Returns formatted JSX with bold styling

---

## Additional Notes

### Session Events Page

The sessions page links to session events pages:
- **`app/sessions/[sessionId]/[machineId]/events/page.tsx`** - Detailed machine events for a session

This is a separate page but related to the main sessions page functionality.

### Batch Loading Optimization

The sessions page uses batch loading optimization:
- Loads multiple pages per batch (configurable via `pagesPerBatch`)
- Pre-loads next batch when user approaches end of current batch
- Reduces API calls and improves perceived performance

### Date Filtering

Date filters integrate with the dashboard date filter system:
- Uses `activeMetricsFilter` and `customDateRange` from dashboard store
- Supports: Today, Yesterday, Last 7 Days, Last 30 Days, Custom range, All Time
- Date filters apply to session start time

### Responsive Design

- Desktop: Full table view with all columns
- Mobile: Responsive table or card view (implementation may vary)
- Filter bar adapts to screen size (purple bar on desktop, horizontal scroll on mobile)

### Search Functionality

- Searches across: session ID, machine ID, member ID, member name
- Debounced input (400ms delay) to reduce API calls
- Case-insensitive search
