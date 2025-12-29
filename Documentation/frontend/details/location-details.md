# Location Details Page

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Page Header](#page-header)
  - [View Toggle](#view-toggle)
  - [Machines View](#machines-view)
  - [Members View](#members-view)
  - [Financial Metrics](#financial-metrics)
  - [Machine Status Widget](#machine-status-widget)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Location Details page provides comprehensive management for individual gaming locations, displaying machines/cabinets and members associated with a specific location. The page features two main views: Machines and Members, with financial metrics, status widgets, and management capabilities.

Key features include:

- Dual view toggle between Machines and Members
- Location-specific machine management
- Member tracking for membership-enabled locations
- Financial metrics and performance analytics
- Machine status monitoring
- Role-based access control
- Responsive design for desktop and mobile

## File Information

- **File:** `app/locations/[slug]/page.tsx`
- **URL Pattern:** `/locations/[slug]` where `[slug]` is the location ID
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** All authenticated users with location access
- **Main Component:** `LocationPage` (within `app/locations/[slug]/page.tsx`)

## Page Sections

### Page Header

**Purpose:** Display location information, navigation, and action buttons.

**Components Used:**

- Location name and ID display
- Back navigation button
- Refresh button with loading state
- Action buttons (conditional based on permissions)

**Data Flow:**

- Fetches location data on mount
- Displays location name and basic information
- Provides navigation back to locations list

**Key Functions:**

- `onBack` - Navigate back to locations list
- `handleRefresh` - Refresh all location data

**Notes:**

- Shows location identifier and basic info
- Includes navigation and refresh controls
- Action buttons vary by user permissions

---

### View Toggle

**Purpose:** Switch between Machines and Members views for the location.

**Components Used:**

- Tab-style toggle buttons
- Conditional rendering based on view state

**Data Flow:**

1. User clicks Machines or Members tab
2. Updates `activeView` state
3. URL parameter updated (`?view=machines` or `?view=members`)
4. Content switches between machines and members views

**Key Functions:**

- `setActiveView` - Update active view state
- URL synchronization logic

**State Management:**

- `activeView` - Current active view ('machines' | 'members')

**Notes:**

- Members tab only available if location has membership enabled
- URL persistence for view state
- Automatic fallback to machines view if members not available

---

### Machines View

**Purpose:** Display and manage machines/cabinets for the specific location.

**Components Used:**

- `LocationCabinetsSection` (`components/locations/sections/LocationCabinetsSection.tsx`)
- Machine table/card display
- Search and filter controls
- Pagination controls
- Machine status widget

**API Endpoints:**

- `GET /api/locations/[locationId]/cabinets` - Fetch location machines
- `GET /api/locationAggregation/[locationId]` - Fetch location metrics

**Data Flow:**

1. Fetches machines data for the location
2. Applies search and filter criteria
3. Displays machines in table/card format
4. Shows financial metrics and status widgets

**Key Functions:**

- `useLocationCabinetsData` (`lib/hooks/locations/useLocationCabinetsData.ts`) - Machines data fetching
- `handleFilterChange` - Update filter criteria
- `setCurrentPage` - Handle pagination

**State Management:**

- `cabinetsData` - Machines data and state
- `currentPage` - Current pagination page
- `searchTerm` - Search filter
- `selectedStatus` - Online/offline filter

**Notes:**

- Location-specific machine filtering
- Search by asset number, SMID, serial number, game type
- Filter by online/offline status
- Pagination with configurable page sizes
- Create/edit machine permissions based on user role

---

### Members View

**Purpose:** Display and manage members for membership-enabled locations.

**Components Used:**

- `MembersNavigation` (`components/members/common/MembersNavigation.tsx`)
- `MembersListTab` (`components/members/tabs/MembersListTab.tsx`)
- `MembersSummaryTab` (`components/members/tabs/MembersSummaryTab.tsx`)
- Members context and handlers

**API Endpoints:**

- `GET /api/members?locationId=[locationId]` - Fetch location members
- `GET /api/members/summary?locationId=[locationId]` - Fetch member summary data

**Data Flow:**

1. Checks if location has membership enabled
2. Loads members navigation with Members/Summary tabs
3. Fetches member data filtered by location
4. Displays members in list or summary format

**Key Functions:**

- `useMembersNavigation` (`lib/hooks/navigation.ts`) - Tab navigation
- `MembersHandlersProvider` - Context for member operations
- Location-specific member filtering

**State Management:**

- `activeTab` - Current members tab ('members' | 'summary-report')
- Members context state for CRUD operations

**Notes:**

- Only available for membership-enabled locations
- Uses existing members page components with location filtering
- Members tab shows member list with location-specific filtering
- Summary report shows aggregated member data

---

### Financial Metrics

**Purpose:** Display financial performance metrics for the location.

**Components Used:**

- `FinancialMetricsCards` (`components/ui/FinancialMetricsCards.tsx`)
- Metric calculation and display components

**API Endpoints:**

- `GET /api/locations/[locationId]/metrics` - Fetch location financial metrics

**Data Flow:**

1. Fetches financial data for the location
2. Calculates metrics (handle, win/loss, revenue, etc.)
3. Displays formatted financial cards

**Key Functions:**

- Financial metric calculations
- Currency formatting and display

**Notes:**

- Shows key financial performance indicators
- Real-time data updates
- Formatted currency display

---

### Machine Status Widget

**Purpose:** Display machine online/offline status summary for the location.

**Components Used:**

- `MachineStatusWidget` (`components/ui/MachineStatusWidget.tsx`)
- Status calculation components

**API Endpoints:**

- `GET /api/locations/[locationId]/machine-status` - Fetch machine status data

**Data Flow:**

1. Fetches machine status data
2. Calculates online/offline counts
3. Displays status summary (e.g., "37/40 Online")

**Key Functions:**

- `useLocationMachineStats` (`lib/hooks/data.ts`) - Machine status data
- Status calculation and formatting

**State Management:**

- `machineStats` - Machine status counts
- `machineStatsLoading` - Loading state

**Notes:**

- Shows total machines and online count
- Updates with date filter changes
- Responsive design for mobile and desktop

---

## API Endpoints

### Location Data

- **GET `/api/locations/[locationId]`**
  - **Purpose:** Fetch detailed location information
  - **Response:** `{ success: true, data: Location }`
  - **Used By:** Page header and basic location data

### Machines/Cabinets

- **GET `/api/locations/[locationId]/cabinets`**
  - **Purpose:** Fetch machines for specific location
  - **Query Parameters:** `page`, `limit`, `search`, `status`, `sortBy`, `sortOrder`
  - **Response:** `{ success: true, data: Cabinet[], pagination: PaginationData }`
  - **Used By:** Machines view

- **POST `/api/cabinets`**
  - **Purpose:** Create new machine for location
  - **Body:** Cabinet creation data
  - **Response:** `{ success: true, data: Cabinet }`
  - **Used By:** Create machine modal

- **PUT `/api/cabinets/[cabinetId]`**
  - **Purpose:** Update machine information
  - **Body:** Cabinet update data
  - **Response:** `{ success: true, data: Cabinet }`
  - **Used By:** Edit machine modal

- **DELETE `/api/cabinets/[cabinetId]`**
  - **Purpose:** Delete machine
  - **Response:** `{ success: true }`
  - **Used By:** Delete machine confirmation

### Members (Location-Specific)

- **GET `/api/members?locationId=[locationId]`**
  - **Purpose:** Fetch members for specific location
  - **Query Parameters:** `page`, `limit`, `search`, `sortBy`, `sortOrder`
  - **Response:** `{ success: true, data: Member[], pagination: PaginationData }`
  - **Used By:** Members view

- **GET `/api/members/summary?locationId=[locationId]`**
  - **Purpose:** Fetch member summary data for location
  - **Response:** `{ success: true, data: MemberSummary }`
  - **Used By:** Members summary tab

### Metrics and Analytics

- **GET `/api/locations/[locationId]/metrics`**
  - **Purpose:** Fetch financial metrics for location
  - **Response:** `{ success: true, data: LocationMetrics }`
  - **Used By:** Financial metrics cards

- **GET `/api/locations/[locationId]/machine-status`**
  - **Purpose:** Fetch machine status counts for location
  - **Response:** `{ success: true, data: MachineStatusCounts }`
  - **Used By:** Machine status widget

- **GET `/api/locationAggregation/[locationId]`**
  - **Purpose:** Fetch aggregated location data
  - **Query Parameters:** `startDate`, `endDate`, `timePeriod`
  - **Response:** `{ success: true, data: LocationAggregation }`
  - **Used By:** Chart data and advanced analytics

### Charts and Trends

- **GET `/api/locations/[locationId]/chart`**
  - **Purpose:** Fetch chart data for location performance
  - **Query Parameters:** `startDate`, `endDate`, `timePeriod`
  - **Response:** `{ success: true, data: ChartData[] }`
  - **Used By:** Performance charts

---

## State Management

### Hooks

- **`useLocationCabinetsData`** (`lib/hooks/locations/useLocationCabinetsData.ts`)
  - Fetches and manages machines data for location
  - Handles pagination, filtering, search
  - Provides: `cabinetsData`, `loading`, `refreshCabinets`, `setCurrentPage`

- **`useLocationChartData`** (`lib/hooks/locations/useLocationChartData.ts`)
  - Manages chart data and date filtering
  - Provides chart data for visualization

- **`useLocationMachineStats`** (`lib/hooks/data.ts`)
  - Fetches machine status statistics
  - Provides: `machineStats`, `machineStatsLoading`, `refreshMachineStats`

- **`useLocationMembershipStats`** (`lib/hooks/data.ts`)
  - Fetches membership statistics for location
  - Provides: `membershipStats`, `membershipStatsLoading`, `refreshMembershipStats`

- **`useMembersNavigation`** (`lib/hooks/navigation.ts`)
  - Manages members tab navigation
  - Provides: `activeTab`, `handleTabClick`

### Stores

- **`useDashBoardStore`** (`lib/store/dashboardStore.ts`) - Zustand store
  - `selectedLicencee` - Selected licensee filter
  - `activeMetricsFilter` - Active date filter type
  - `customDateRange` - Custom date range
  - `setSelectedLicencee` - Licensee selection setter

- **`useUserStore`** (`lib/store/userStore.ts`) - Zustand store
  - `user` - Current user object
  - Used for role-based permissions

### State Properties

**From main component:**

- `activeView` - Current view ('machines' | 'members')
- `locationId` - Current location ID from URL params
- `cabinetsData` - Machines data and state
- `chartData` - Chart data for visualization
- `machineStats` - Machine status counts
- `membershipStats` - Membership statistics
- `activeTab` - Members navigation tab
- `membersRefreshHandlerRef` - Reference to members refresh function

**From `useLocationCabinetsData`:**

- `cabinetsData.locationMembershipEnabled` - Whether location supports membership
- `currentPage` - Current pagination page
- `totalReports` - Total machine count
- `locations` - Available locations list
- `locationsWithMachines` - Locations with machine counts

---

## Key Functions

### Data Fetching

- **`fetchLocationData`** (location data functions)
  - Fetches basic location information
  - Loads location name and basic details

- **`fetchLocationCabinets`** (`useLocationCabinetsData` hook)
  - Fetches machines for the location
  - Applies search and filter criteria

- **`fetchLocationMembers`** (members data functions)
  - Fetches members for membership-enabled locations
  - Location-specific member filtering

### Navigation and UI

- **`handleTabChange`** (main component)
  - Handles view toggle between machines and members
  - Updates URL and state

- **`handleRefresh`** (main component)
  - Refreshes all location data
  - Updates machines, charts, and statistics

- **`onBack`** (navigation function)
  - Navigates back to locations list
  - Uses router navigation

### Machine Management

- **`handleFilterChange`** (filter functions)
  - Updates machine filters (online/offline, search)
  - Triggers data refresh

- **`openCabinetModal`** (from `useNewCabinetStore`)
  - Opens create machine modal
  - Pre-fills location data

### Members Management

- **`MembersHandlersProvider`** (context provider)
  - Provides member CRUD operation handlers
  - Manages member state for the location

### Utility Functions

- **`hasMissingCoordinates`** (`lib/utils/locationsPageUtils.ts`)
  - Checks if location has missing coordinate data
  - Used for map display validation

- **`calculateLocationTotal`** (calculation helpers)
  - Calculates financial totals for location
  - Aggregates machine data

---

## Additional Notes

### View Toggle Logic

- **Machines View**: Always available, shows location-specific machines
- **Members View**: Only available if `locationMembershipEnabled` is true
- **Default View**: Machines view
- **URL Persistence**: View state saved in URL (`?view=members`)
- **Auto-fallback**: Automatically switches to machines if members view unavailable

### Role-Based Access

- **Admin/Developer**: Full access to all features
- **Manager**: Access to assigned licensee locations
- **Collector/Location Admin**: Access to assigned locations only
- **Technician**: Limited access (may be redirected to cabinets)

### Membership Integration

- **Membership-Enabled Locations**: Can track members and show members view
- **Member Filtering**: Members automatically filtered by location
- **Shared Components**: Uses existing members page components with location constraints
- **Data Consistency**: Member location data synchronized with location records

### Performance Features

- **Batch Loading**: Machines loaded in batches for large locations
- **Lazy Loading**: Chart data loaded on demand
- **Optimized Queries**: Database queries optimized for location-specific data
- **Pagination**: Efficient handling of large machine lists

### Responsive Design

- **Desktop**: Full table views with all columns
- **Mobile**: Card layouts with essential information
- **Filter Adaptation**: Filters adapt to screen size
- **Touch-Friendly**: Mobile-optimized interactions

### Error Handling

- **Loading States**: Skeleton loaders for all data fetching
- **Error Boundaries**: Graceful error handling with user feedback
- **Network Issues**: Retry logic and offline handling
- **Permission Errors**: Clear messaging for access restrictions

### Integration Points

- **Dashboard Filters**: Uses shared date filtering from dashboard store
- **Licensee Selection**: Integrated with global licensee filtering
- **Machine Status**: Real-time status updates via WebSocket/MQTT
- **Financial Calculations**: Shared calculation utilities across pages
