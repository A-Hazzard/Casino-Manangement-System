# Location Details Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Version:** 1.0.0

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
- Back navigation button (to `/locations`)
- Refresh button with loading state
- Create Machine button (conditional based on user permissions and active view)
- Missing Coordinates indicator (`MapPinOff` icon)

**Data Flow:**

- Fetches location data on mount via `useLocationCabinetsData` hook.
- Displays location name, back navigation, and action buttons.
- The location ID is extracted from URL parameters (`params.slug`).

**Key Functions:**

- `handleRefresh` (from `LocationsDetailsPageContent`) - Refreshes all data for the active view.
- `openCabinetModal` (from `useNewCabinetStore`) - Opens the modal to create a new machine for this location.

**Notes:**

- Displays the location name (or "Location Details" during loading).
- Back button navigates to the main `/locations` page.
- Refresh button triggers a full data refresh for the currently active view.
- A "Create Machine" button is displayed conditionally based on user permissions (`canManageMachines`) and if the 'Machines' view is active.
- An `MapPinOff` icon is displayed next to the location name if the location has missing geographic coordinates.

---

### View Toggle

**Purpose:** Switch between Machines and Members views for the location.

**Components Used:**

- Tab-style toggle buttons
- Conditional rendering based on view state

**Data Flow:**

1.  User clicks "Machines" or "Members" tab.
2.  Updates `activeView` state within `LocationsDetailsPageContent`.
3.  URL parameter updated (`?tab=members` or `tab` parameter removed for 'Machines' view).
4.  Content switches between machines and members views via conditional rendering.

**Key Functions:**

-   `handleViewChange` - Updates active view state and synchronizes with URL.

**State Management:**

-   `activeView` - Current active view ('machines' | 'members').
-   `showMembersTab` - Computed value determining if 'Members' tab should be visible, based on `locationMembershipEnabled` and `membershipStats` (count > 0 or still loading).

**Notes:**

-   The "Members" tab is only available if the location has membership enabled *and* either there are members or membership stats are still loading.
-   URL persistence for view state uses the `tab` query parameter (`?tab=members`).
-   Automatic fallback to "Machines" view if the "Members" tab is manually accessed (e.g., via URL) but membership is not enabled or no members are found.
-   The members tab leverages `useMembersNavigation` for its internal tab management if the location supports it.

---

### Machines View

**Purpose:** Display and manage machines/cabinets for the specific location.

**Components Used:**

-   `LocationsDetailsCabinetsSection` (`components/CMS/locations/sections/LocationsDetailsCabinetsSection.tsx`) - Main component for machines display, including:
    *   `FinancialMetricsCards` (`components/shared/ui/FinancialMetricsCards.tsx`)
    *   `DashboardChart` (`components/CMS/dashboard/DashboardChart.tsx`)
    *   `MachineStatusWidget` (`components/shared/ui/MachineStatusWidget.tsx`)
    *   Machine table/card display (within `LocationsDetailsCabinetsSection`)
    *   Search and filter controls (within `LocationsDetailsCabinetsSection`)
    *   Pagination controls (within `LocationsDetailsCabinetsSection`)

**API Endpoints:**

-   `GET /api/locations/[locationId]/cabinets` - Fetch location machines (via `useLocationCabinetsData`)
-   `GET /api/locationAggregation/[locationId]` - Fetch location metrics (via `useLocationCabinetsData` for financial totals)
-   `GET /api/machines/by-id/metrics` - Fetch chart data for individual machines (aggregated by `useLocationChartData`)
-   `GET /api/analytics/location-trends` - Fetch aggregated location trend data (for chart, via `useLocationChartData`)
-   `GET /api/analytics/machines/stats` - Fetch machine status statistics (via `useLocationMachineStats`)
-   `GET /api/analytics/membership/stats` - Fetch membership statistics (via `useLocationMembershipStats` for `showMembersTab` logic)

**Data Flow:**

1.  `useLocationCabinetsData` hook fetches machines data, financial totals, and manages search/filter state for the location.
2.  `useLocationChartData` fetches and aggregates chart data (either per-machine or location trends) based on selected filters and granularity.
3.  `useLocationMachineStats` fetches online/offline machine counts.
4.  `FinancialMetricsCards` displays totals.
5.  `DashboardChart` visualizes trends.
6.  `MachineStatusWidget` shows machine online/offline summary.
7.  Machines are displayed in a table/card format with search, filtering, and pagination.

**Key Functions:**

-   `useLocationCabinetsData` - Main hook for machines data, search, filters, and pagination.
-   `useLocationChartData` - Hook for fetching and managing chart data, including granularity.
-   `useLocationMachineStats` - Hook for machine online/offline status.
-   `handleFilterChange` - Updates status filter for machines.
-   `handleRefresh` - Refreshes all data in the current view.

**State Management:**

-   `cabinetsData` (from `useLocationCabinetsData`) - Contains all state and handlers for machine data, filters, and pagination.
-   `chartDataHook` (from `useLocationChartData`) - Contains chart data, loading states, and granularity settings.
-   `machineStats` (from `useLocationMachineStats`) - Machine online/offline counts.

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

-   `LocationMembersContent` (a nested component within `LocationsDetailsPageContent.tsx`) which wraps:
    *   `MembersNavigation` (`components/CMS/members/common/MembersNavigation.tsx`)
    *   `MembersListTab` (`components/CMS/members/tabs/MembersListTab.tsx`)
    *   `MembersSummaryTab` (`components/CMS/members/tabs/MembersSummaryTab.tsx`)
    *   `MembersHandlersProvider` (`components/CMS/members/context/MembersHandlersContext.tsx`)

**API Endpoints:**

-   `GET /api/members?locationId=[locationId]` - Fetch location members (via `MembersListTab`)
-   `GET /api/members/summary?locationId=[locationId]` - Fetch member summary data (via `MembersSummaryTab`)

**Data Flow:**

1.  Checks if location has membership enabled and members exist (or are loading).
2.  `LocationMembersContent` component is rendered when `activeView` is 'members'.
3.  `MembersHandlersProvider` provides context for member operations specific to this location.
4.  `MembersNavigation` displays tabs for "Members" and "Summary Report".
5.  `MembersListTab` or `MembersSummaryTab` are rendered, receiving `forcedLocationId` to filter data by the current location.
6.  `onRefreshReady` callback from `LocationMembersContent` exposes the members-specific refresh handler to `LocationsDetailsPageContent`.

**Key Functions:**

-   `useMembersNavigation` - Tab navigation within the members view.
-   `useMembersHandlers` - Provides member CRUD operations and refresh functionality.
-   `membersRefreshHandlerRef` - A ref in `LocationsDetailsPageContent` to hold the members view's refresh function, allowing the parent to trigger it.

**State Management:**

-   `activeTab` (from `useMembersNavigation`) - Current active tab ('members' | 'summary-report') within the members view.
-   Members context state for CRUD operations, managed by `MembersHandlersProvider`.

**Notes:**

- Only available for membership-enabled locations
- Uses existing members page components with location filtering
- Members tab shows member list with location-specific filtering
- Summary report shows aggregated member data

---

### Financial Metrics

**Purpose:** Display financial performance metrics for the location.

**Components Used:**

-   `FinancialMetricsCards` (`components/shared/ui/FinancialMetricsCards.tsx`) - Used within `LocationsDetailsCabinetsSection`.

**API Endpoints:**

-   `GET /api/locationAggregation/[locationId]` - Fetches aggregated financial data for the specific location, based on the selected date range and licensee (handled by `useLocationCabinetsData`).

**Data Flow:**

1.  `useLocationCabinetsData` hook fetches aggregated financial data (`financialTotals`) for the specific `locationId` and currently selected `activeMetricsFilter`/`customDateRange`/`selectedLicencee`.
2.  `FinancialMetricsCards` displays these `financialTotals` (Money In, Money Out, Gross).

**Key Functions:**

-   Financial metric calculations are handled upstream by the API and within the `useLocationCabinetsData` hook.
-   Currency formatting and display are handled by the `FinancialMetricsCards` component.

**Notes:**

-   Shows key financial performance indicators for the selected location.
-   Data updates with changes in date filters.
-   Formatted currency display.

---

### Machine Status Widget

**Purpose:** Display machine online/offline status summary for the location.

**Components Used:**

-   `MachineStatusWidget` (`components/shared/ui/MachineStatusWidget.tsx`) - Used within `LocationsDetailsCabinetsSection`.

**API Endpoints:**

-   `GET /api/analytics/machines/stats` - Fetches machine status statistics, filtered by `locationId`, optional `gameType`, and `searchTerm`.

**Data Flow:**

1.  `useLocationMachineStats` hook fetches online/offline machine counts and total machines for the specific `locationId`.
2.  Data can be further filtered by `selectedGameType` and `searchTerm` from the machines filter bar.
3.  `MachineStatusWidget` displays the `onlineCount`, `offlineCount`, and `totalCount` from `machineStats`.

**Key Functions:**

-   `useLocationMachineStats` - Hook for fetching and managing machine status statistics.
-   `refreshMachineStats` - Function provided by the hook to manually refresh the stats.

**Notes:**

-   Shows total machines, online count, and offline count for the selected location.
-   Updates with date filter changes and machine filter changes.
-   Responsive design for mobile and desktop.
-   Online status is determined by recent activity (3-minute threshold) in the backend.

**Notes:**

- Shows total machines and online count
- Updates with date filter changes
- Responsive design for mobile and desktop
- Online status is determined by recent activity (3-minute threshold)

---

## API Endpoints

### Location Data

-   **GET `/api/locations/[locationId]`**
    *   **Purpose:** Fetch detailed location information.
    *   **Response:** `{ success: true, data: Location }`
    *   **Used By:** `useLocationCabinetsData` hook to fetch basic location details and display the location name in the header.

### Machines/Cabinets

-   **GET `/api/locations/[locationId]/cabinets`**
    *   **Purpose:** Fetch machines for specific location.
    *   **Query Parameters:** `page`, `limit`, `search`, `status`, `sortBy`, `sortOrder`, `gameType`, `timePeriod`, `startDate`, `endDate`, `currency`, `licensee`
    *   **Response:** `{ success: true, data: Cabinet[], pagination: PaginationData }`
    *   **Used By:** `useLocationCabinetsData` hook.

-   **POST `/api/cabinets`**
    *   **Purpose:** Create new machine for location.
    *   **Body:** Cabinet creation data
    *   **Response:** `{ success: true, data: Cabinet }`
    *   **Used By:** Create machine modal.

-   **PUT `/api/cabinets/[cabinetId]`**
    *   **Purpose:** Update machine information.
    *   **Body:** Cabinet update data
    *   **Response:** `{ success: true, data: Cabinet }`
    *   **Used By:** Edit machine modal.

-   **DELETE `/api/cabinets/[cabinetId]`**
    *   **Purpose:** Delete machine.
    *   **Response:** `{ success: true }`
    *   **Used By:** Delete machine confirmation.

### Members (Location-Specific)

-   **GET `/api/members?locationId=[locationId]`**
    *   **Purpose:** Fetch members for specific location.
    *   **Query Parameters:** `page`, `limit`, `search`, `sortBy`, `sortOrder`
    *   **Response:** `{ success: true, data: Member[], pagination: PaginationData }`
    *   **Used By:** Members view (`MembersListTab`).

-   **GET `/api/members/summary?locationId=[locationId]`**
    *   **Purpose:** Fetch member summary data for location.
    *   **Response:** `{ success: true, data: MemberSummary }`
    *   **Used By:** Members summary tab (`MembersSummaryTab`).

### Metrics and Analytics

-   **GET `/api/locationAggregation/[locationId]`**
    *   **Purpose:** Fetch aggregated financial data for a specific location.
    *   **Query Parameters:** `timePeriod`, `startDate`, `endDate`, `currency`, `licensee`
    *   **Response:** `{ success: true, data: LocationAggregation }`
    *   **Used By:** `useLocationCabinetsData` for financial totals displayed in `FinancialMetricsCards`.

-   **GET `/api/analytics/machines/stats`**
    *   **Purpose:** Fetch machine online/offline status counts for a location.
    *   **Query Parameters:** `locationId`, `gameType`, `searchTerm`, `licensee`
    *   **Response:** `{ success: true, data: MachineStatusCounts }`
    *   **Used By:** `useLocationMachineStats` hook for the `MachineStatusWidget`.

-   **GET `/api/analytics/membership/stats`**
    *   **Purpose:** Fetch membership statistics for a location.
    *   **Query Parameters:** `locationId`, `licensee`
    *   **Response:** `{ success: true, data: MembershipStats }`
    *   **Used By:** `useLocationMembershipStats` hook to determine `membershipCount` for the 'Members' tab visibility.

### Charts and Trends

-   **GET `/api/analytics/location-trends`**
    *   **Purpose:** Fetch aggregated location trend data.
    *   **Query Parameters:** `locationId` (plural `locationIds` is used in Dashboard context, here it's singular), `timePeriod`, `licensee`, `startDate`, `endDate`, `currency`, `granularity`, `status`, `gameType`
    *   **Response:** `{ success: true, trends: Array<{ day, time, handle, winLoss, jackpot, plays, drop, gross }> }`
    *   **Used By:** `useLocationChartData` when `activeMetricsFilter` is 'Custom' or for long periods (Quarterly/All Time) with monthly/weekly granularity.

-   **GET `/api/machines/[machineId]/chart`**
    *   **Purpose:** Fetch chart data for individual machines.
    *   **Query Parameters:** `timePeriod`, `startDate`, `endDate`, `currency`, `licensee`, `granularity`, `machineId`
    *   **Response:** `{ success: true, data: Array<{ day, time, drop, totalCancelledCredits, gross }>, dataSpan?: { minDate, maxDate } }`
    *   **Used By:** `useLocationChartData` for non-'Custom' `activeMetricsFilter` periods (Today, Yesterday, 7d, 30d). Data is fetched for all machines in the location and then aggregated client-side to form the location-level chart.

---

## State Management

### Hooks

-   **`useLocationCabinetsData`** (`lib/hooks/locations/useLocationCabinetsData.ts`)
    *   **Parameters:** `locationId`, `selectedLicencee`, `activeMetricsFilter`, `customDateRange`, `dateFilterInitialized`, `filtersInitialized`, `isAdminUser`, `setDateFilterInitialized`, `setFiltersInitialized`.
    *   **Purpose:** Fetches and manages the list of machines/cabinets for the specified `locationId`, including their aggregated financial data.
    *   **Features:** Handles pagination, search, game type, and status filtering. Manages internal loading states and initial data fetching to ensure filters are applied correctly. Provides `locationName`, `locationMembershipEnabled`, `financialTotals`, `filteredCabinets`, `gameTypes`, `locations`, and various filter states and setters.
    *   **Provides:** `financialTotals`, `filteredCabinets`, `gameTypes`, `locationName`, `locationMembershipEnabled`, `loading`, `cabinetsLoading`, `refreshing`, filter states, setters, and `refreshCabinets` function.

-   **`useLocationChartData`** (`lib/hooks/locations/useLocationChartData.ts`)
    *   **Parameters:** `locationId`, `selectedLicencee`, `activeMetricsFilter`, `customDateRange`, `activeView`, `status`, `gameType`.
    *   **Purpose:** Manages fetching and processing chart data for the location.
    *   **Features:** Dynamically selects API endpoints based on `activeMetricsFilter` and `granularity`. Includes abort controller support for request cancellation, granularity detection, and manual override options. Filters chart data based on machine `status` and `gameType` from the machines filter bar.
    *   **Provides:** `chartData`, `loadingChartData`, `chartGranularity`, `setChartGranularity`, `showGranularitySelector`, `availableGranularityOptions`, `refreshChart` function.

-   **`useLocationMachineStats`** (`lib/hooks/data/useLocationMachineStats.ts`)
    *   **Parameters:** `locationId`, `gameType` (optional), `searchTerm` (optional).
    *   **Purpose:** Fetches online/offline machine statistics for the specified location, with optional filtering by game type and search term.
    *   **Provides:** `machineStats` (`{ totalMachines, onlineMachines, offlineMachines }`), `machineStatsLoading`, `refreshMachineStats` function.

-   **`useLocationMembershipStats`** (`lib/hooks/data/useLocationMembershipStats.ts`)
    *   **Parameters:** `locationId`.
    *   **Purpose:** Fetches membership statistics for the specified `locationId`.
    *   **Provides:** `membershipStats` (`{ membershipCount }`), `membershipStatsLoading`, `refreshMembershipStats` function. Used to determine the visibility of the "Members" tab.

-   **`useMembersNavigation`** (`lib/hooks/navigation.ts`)
    *   **Parameters:** `MEMBERS_TABS_CONFIG`, `disableUrlSync` (set to `true` for this page to prevent conflicts).
    *   **Purpose:** Manages internal tab navigation for the "Members" view.
    *   **Provides:** `activeTab`, `handleTabClick`.

### Stores

-   **`useDashBoardStore`** (`lib/store/dashboardStore.ts`) - Zustand store
    *   `selectedLicencee` - Selected licensee filter.
    *   `activeMetricsFilter` - Active date filter type.
    *   `customDateRange` - Custom date range.
    *   `setSelectedLicencee` - Licensee selection setter.

-   **`useUserStore`** (`lib/store/userStore.ts`) - Zustand store
    *   `user` - Current user object.
    *   Used for role-based permissions (`isAdminUser`, `canManageMachines`).

-   **`useNewCabinetStore`** (`lib/store/newCabinetStore.ts`) - Zustand store
    *   `openCabinetModal` - Function to open the create new machine modal.

### State Properties

**From main component (`LocationsDetailsPageContent.tsx`):**

-   `activeView` - Current active view ('machines' | 'members').
-   `locationId` - Current location ID from URL params.
-   `isAdminUser` - Computed boolean for admin/developer roles.
-   `canManageMachines` - Computed boolean for machine management permissions.
-   `showMembersTab` - Computed boolean indicating if the 'Members' tab should be shown.
-   `membersRefreshHandlerRef` - React ref to store the refresh handler for the members view.

**From `useLocationCabinetsData` (`cabinetsData` object):**

-   `locationName` - Name of the current location.
-   `locationData` - Full location data object.
-   `financialTotals` - Aggregated financial metrics for the location.
-   `filteredCabinets` - Paginated and filtered list of machines for the location.
-   `gameTypes` - Available game types for filtering.
-   `loading`, `cabinetsLoading`, `refreshing` - Various loading states related to cabinets data.
-   `error` - Error state for cabinets data.
-   `searchTerm`, `selectedStatus`, `selectedGameType` - Current filter values.
-   `sortOption`, `sortOrder`, `currentPage`, `effectiveTotalPages` - Pagination and sorting states.
-   `locationMembershipEnabled` - Boolean indicating if membership is enabled for this location.
-   `setSearchTerm`, `setSelectedStatus`, `setSelectedGameType`, `setSortOption`, `setSortOrder`, `setCurrentPage` - Setters for filter and pagination states.
-   `refreshCabinets` - Function to refresh cabinets data.

**From `useLocationChartData` (`chartDataHook` object):**

-   `chartData` - Chart time-series data.
-   `loadingChartData` - Loading state for chart data.
-   `chartGranularity` - Current chart granularity ('hourly' | 'minute' | 'daily' | 'weekly' | 'monthly').
-   `showGranularitySelector` - Boolean indicating if the granularity selector should be shown.
-   `availableGranularityOptions` - Array of available granularity options.
-   `setChartGranularity` - Setter for chart granularity.
-   `refreshChart` - Function to refresh chart data.

**From `useLocationMachineStats`:**

-   `machineStats` - Object containing online/offline/total machine counts.
-   `machineStatsLoading` - Loading state for machine statistics.
-   `refreshMachineStats` - Function to refresh machine statistics.

**From `useLocationMembershipStats`:**

-   `membershipStats` - Object containing `membershipCount`.
-   `membershipStatsLoading` - Loading state for membership statistics.
-   `refreshMembershipStats` - Function to refresh membership statistics.

**From `useMembersNavigation` (when `activeView` is 'members'):**

-   `activeTab` - Current active tab within the members view ('members' | 'summary-report').
-   `handleTabClick` - Function to change the active tab within the members view.

---

## Key Functions



### Navigation and UI

-   **`handleViewChange`** (main component)
    *   **Purpose:** Handles the toggle between 'machines' and 'members' views.
    *   **Features:** Updates the `activeView` state and synchronizes the URL (`?tab=members`).

-   **`handleRefresh`** (main component)
    *   **Purpose:** Refreshes all data for the currently active view.
    *   **Features:**
        *   If 'members' view is active, calls the `membersRefreshHandlerRef.current()` function.
        *   If 'machines' view is active, calls `refreshMachineStats()`, `refreshMembershipStats()`, `cabinetsData.refreshCabinets()`, and `chartDataHook.refreshChart()`.

-   **Back Navigation**
    *   **Purpose:** Navigates back to the main `/locations` page.
    *   **Implementation:** Handled by a `<Link href="/locations">` component.

### Machine Management

-   **`handleFilterChange`** (main component)
    *   **Purpose:** Updates the `selectedStatus` filter for machines displayed in the Machines view.
    *   **Features:** Triggers a data refresh for the machines list. Implemented via `cabinetsData.setSelectedStatus`.

-   **`openCabinetModal`** (from `useNewCabinetStore`)
    *   **Purpose:** Opens the modal to create a new machine.
    *   **Features:** Pre-fills the `locationId` of the current location into the modal.

### Members Management

-   `MembersHandlersProvider` (context provider)
    *   **Purpose:** Provides a React context for member CRUD operations and managing member-related state. This is used by child components within the Members view.

-   **`onRefresh`** (from `useMembersHandlers`)
    *   **Purpose:** Triggers a refresh of the member list and summary data.
    *   **Implementation:** Provided by the `useMembersHandlers` hook.

### Utility Functions

-   **`hasMissingCoordinates`** (`lib/utils/locationsPageUtils.ts`)
    *   **Purpose:** Checks if a location has missing geographic coordinate data.
    *   **Features:** Used to display a visual indicator in the page header if coordinates are missing.

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
- **Request Deduplication**: Prevents duplicate chart API calls using `deduplicateRequest` utility
- **Abort Controller**: Cancels previous requests when filters change rapidly
- **API Selection**: Uses optimized `/api/analytics/location-trends` for Custom periods and long periods with monthly/weekly granularity

### Chart Granularity Options

**Available Granularities:** (Determined by `useLocationChartData` hook based on `activeMetricsFilter`)

-   **Minute**: Available for Today/Yesterday and Custom periods spanning less than 24 hours.
-   **Hourly**: Default for Today/Yesterday and Custom periods spanning less than 24 hours.
-   **Daily**: Default for 7d/30d periods and Custom periods spanning more than 24 hours but less than 30 days.
-   **Weekly**: Available for Custom periods spanning more than 7 days, and Quarterly/All Time periods.
-   **Monthly**: Available for Custom periods spanning more than 30 days, and Quarterly/All Time periods.

**Granularity Selector Visibility:** (Determined by `showGranularitySelector` from `useLocationChartData` hook)

-   **Shown for:** Today, Yesterday, and Custom periods (as well as Quarterly/All Time when data span is large enough to support weekly/monthly).
-   **Hidden for:** Fixed periods like 7d, 30d (which default to daily granularity).

**Auto-Detection:**

-   The chart automatically detects the most appropriate default granularity based on the selected time period (e.g., minute/hourly for short periods, daily for medium, weekly/monthly for long periods).
-   Users can manually override the auto-detected granularity using the selector when visible.
-   Once a user manually sets the granularity, auto-update is disabled for that session.

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
