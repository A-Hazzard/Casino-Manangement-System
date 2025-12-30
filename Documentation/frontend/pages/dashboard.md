# Dashboard Page

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** December 29, 2025
**Version:** 3.1.0

## Table of Contents

1. [Overview](#overview)
2. [File Information](#file-information)
3. [Page Sections](#page-sections)
   - [Date Filters Section](#date-filters-section)
   - [Financial Metrics Cards](#financial-metrics-cards)
   - [Chart Section](#chart-section)
   - [Location Map Section](#location-map-section)
   - [Top Performing Section](#top-performing-section)
   - [Machine Status Widget (Mobile Only)](#machine-status-widget-mobile-only)
4. [API Endpoints](#api-endpoints)
5. [State Management](#state-management)
6. [Key Functions](#key-functions)

## Overview

The Dashboard page is the main landing page of the Evolution One Casino Management System. It provides a comprehensive overview of financial metrics, location performance, and system health through interactive charts, maps, and data visualizations.

## File Information

- **Main File:** `app/page.tsx`
- **URL Pattern:** `/`
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** Developer, Admin, Manager (with assigned licensees)
- **Licensee Filtering:** Supported
- **Responsive:** Desktop (`PcLayout`) and Mobile (`MobileLayout`) layouts

## Page Sections

### Date Filters Section

**Purpose:** Allows users to filter dashboard data by time period (Today, Yesterday, Week, Month, All Time, Custom).

**Components:**

- `components/dashboard/DashboardDateFilters.tsx` - Main filter component
- `components/ui/ModernCalendar.tsx` - Calendar picker for custom dates

**Functionality:**

- Predefined periods: Today, Yesterday, Last 7 days, Last 30 days, All Time
- Custom date range with calendar picker
- Gaming day offset handling (8 AM start time)
- Mobile: Calendar only shows when "Custom" is selected
- Desktop: Calendar always available as a button

**State Management:**

- `activeMetricsFilter` - Current selected filter (from `useDashboardFilters` hook)
- `customDateRange` - Custom date range object (stored in Zustand store)

**Key Functions:**

- `useDashboardFilters` - Hook managing filter state and logic
- `getGamingDayRangeForPeriod` - Calculates gaming day ranges with offset handling

---

### Financial Metrics Cards

**Purpose:** Displays three key financial metrics: Money In, Money Out, and Gross Revenue.

**Components:**

- `components/ui/FinancialMetricsCards.tsx` - Card component displaying the three metrics

**API Endpoint:**

- `GET /api/dashboard/totals` - Fetches aggregated financial totals

**Data Flow:**

1. `fetchDashboardTotals` (from `lib/helpers/dashboard.ts`) calls the API
2. Data filtered by `selectedLicencee`, `activeMetricsFilter`, and `customDateRange`
3. Currency conversion applied if viewing "All Licensees" as Admin/Developer
4. Totals stored in Zustand store via `setTotals`

**Key Functions:**

- `fetchMetricsData` - Orchestrates fetching totals and chart data in parallel
- `fetchDashboardTotals` - Specific function for fetching totals from API
- Currency conversion handled in `lib/contexts/CurrencyContext.tsx`

**Notes:**

- Currency conversion only available for Admin/Developer viewing "All Licensees"
- Managers always see native currency
- Loading skeleton shown during data fetch

---

### Chart Section

**Purpose:** Visualizes financial data trends over time using a line/bar chart.

**Components:**

- `components/ui/dashboard/Chart.tsx` - Recharts-based chart component
- Granularity selector dropdown (hourly/minute) - shown for Today/Yesterday/Custom periods

**API Endpoint:**

- `GET /api/dashboard/chart` - Fetches time-series chart data

**Data Flow:**

1. `fetchMetricsData` calls `switchFilter` function with chart granularity
2. Data filtered by time period, licensee, and currency
3. Chart data formatted as array of `{ day, time, drop, totalCancelledCredits, gross }`
4. Data stored in Zustand store via `setChartData`

**Key Functions:**

- `switchFilter` - Handles different filter types and fetches appropriate chart data
- `getDefaultChartGranularity` - Determines default granularity (hourly/minute) based on time period
- `setChartGranularity` - Allows users to toggle between hourly and minute-level data

**Granularity Options:**

- **Minute**: For Today/Yesterday or Custom ranges ≤ 24 hours
- **Hourly**: Default for most periods, can be selected manually

**Notes:**

- Chart granularity selector only visible for Today, Yesterday, or Custom periods spanning ≤ 1 gaming day
- Loading skeleton (`DashboardChartSkeleton`) shown during fetch

---

### Location Map Section

**Purpose:** Displays an interactive map showing all gaming locations with financial data overlay.

**Components:**

- `components/ui/MapPreview.tsx` - Leaflet-based map component

**API Endpoints:**

- `GET /api/locationAggregation` - Fetches location financial aggregates for map markers
- `GET /api/locations?minimal=1` - Fetches location list with minimal projection for map display

**Data Flow:**

1. `PcLayout` component fetches location aggregates via `useEffect` when `activeMetricsFilter` is available
2. `loadGamingLocations` fetches location list from `GET /api/locations?minimal=1` with explicit `rel.licencee` filter
3. Data filtered by `activeMetricsFilter`, `customDateRange`, and `selectedLicencee`
4. Location aggregates combined with `gamingLocations` data (already filtered by licensee)
5. Map markers colored based on financial performance (excellent, good, average, poor)
6. Clickable markers show location details modal with financial metrics

**Licensee Filtering:**

- `GET /api/locations` now explicitly filters by `rel.licencee` when a specific licensee is selected
- Frontend filters `filteredLocations` (already licensee-filtered) for map display
- Search bar filters only the licensee-filtered locations, not all locations
- Map center automatically adjusts based on selected licensee

**Map Refresh:**

- Refresh button triggers `props.refreshing` state change
- `PcLayout` `useEffect` includes `props.refreshing` in dependency array
- When refresh is triggered, `aggLoading` is set to `true`, showing skeleton loader
- Location aggregation data is refetched with current filter parameters

**Search Functionality:**

- Search bar positioned above map with `z-[800]` z-index
- Searches through `filteredLocations` (already filtered by licensee and coordinates)
- Dropdown results appear with `z-[801]` z-index
- Only searches locations that are currently displayed on the map

**Z-Index Layering:**

- Search bar: `z-[800]` (below popups and modals)
- Search dropdown: `z-[801]` (above search bar)
- Location popups: `z-900` (above search bar, below custom range filter)
- Custom range filter: `z-[1100]` (above all map elements)
- Top performing modals: `z-[1100]` (above all map elements)

**UI Scaling:**

- When map is in minimized state, UI elements scale down:
  - Reduced font sizes for popup content
  - Reduced padding and margins
  - Smaller icons and buttons
  - Compact search bar
- When map is maximized, original styling is maintained

**Map Rendering:**

- Map components only render when `mapReady` is `true` (prevents Leaflet initialization errors)
- Safety checks in `zoomToLocation` function for map refs
- Both preview and modal `MapContainer` components check `mapReady` before rendering

**Key Functions:**

- `loadGamingLocations` - Fetches location list from `GET /api/locations?minimal=1` with licensee filter
- Location aggregation fetch handled in `PcLayout.tsx` component's `useEffect` (includes `props.refreshing` dependency)
- `deduplicateRequest` - Prevents duplicate API calls for same parameters
- `isAbortError` - Silently handles abort errors when filters change rapidly

**Error Handling:**

- Abort errors are silently handled (expected when switching filters)
- Empty object errors from axios cancellations are caught and ignored
- Only actual server errors trigger error notifications

**Notes:**

- Only visible on desktop layout (`PcLayout`)
- Map updates automatically when filters change
- Loading skeleton shown while fetching location aggregates
- Map refresh shows skeleton loader during data refetch

---

### Top Performing Section

**Purpose:** Lists the top performing locations or cabinets based on financial metrics.

**Components:**

- Tabs: "Locations" and "Cabinets" (switches between two views)
- List items with rankings, names, and financial metrics
- Modals: `TopPerformingLocationModal`, `TopPerformingMachineModal` (shown on item click)

**API Endpoints:**

- `GET /api/top-performing/locations` - Top performing locations
- `GET /api/top-performing/cabinets` - Top performing cabinets/machines

**Data Flow:**

1. `fetchTopPerformingDataHelper` called when tab or filters change
2. Data filtered by `activeTab` (locations/cabinets), `activePieChartFilter`, `selectedLicencee`, `customDateRange`
3. Top performing items sorted by gross revenue (descending)
4. Data stored in Zustand store via `setTopPerformingData`

**Key Functions:**

- `fetchTopPerformingDataHelper` - Orchestrates top performing data fetch
- `fetchTopPerformingData` - Specific API call function
- Tab switching handled via `setActiveTab` in Zustand store

**Interaction:**

- Clicking a location/machine opens a modal with detailed metrics
- Modal shows comprehensive financial breakdown and trends
- Sorting options available (gross, money in, money out)

**Notes:**

- Separate loading state (`loadingTopPerforming`) to allow independent loading from main metrics
- Loading skeleton (`DashboardTopPerformingSkeleton`) shown during fetch
- Empty state message shown when no data available

---

### Machine Status Widget (Mobile Only)

**Purpose:** Shows quick overview of machine online/offline status (mobile layout only).

**Components:**

- `components/ui/MachineStatusWidget.tsx` - Status widget component

**API Endpoint:**

- `GET /api/analytics/machines/stats` - Machine status statistics

**Data Flow:**

1. `MobileLayout` component fetches machine stats on mount
2. Returns `{ totalMachines, onlineMachines, offlineMachines }`
3. Widget displays counts with color-coded indicators

**Key Functions:**

- Machine stats fetch handled in `MobileLayout.tsx` component's `useEffect`
- Stats update automatically when component mounts

**Notes:**

- Only visible on mobile layout
- Desktop layout doesn't show this widget (machine status shown elsewhere)

---

## API Endpoints

### Primary Endpoints

1. **`GET /api/dashboard/totals`**
   - Returns aggregated financial totals (money in, money out, gross)
   - Parameters: `timePeriod`, `licencee`, `startDate`, `endDate`, `currency`
   - Used by: `fetchDashboardTotals` function

2. **`GET /api/dashboard/chart`**
   - Returns time-series chart data
   - Parameters: `timePeriod`, `licencee`, `startDate`, `endDate`, `currency`, `granularity`
   - Used by: `switchFilter` function

3. **`GET /api/top-performing/locations`**
   - Returns top performing locations ranked by gross revenue
   - Parameters: `timePeriod`, `licencee`, `startDate`, `endDate`, `currency`
   - Used by: `fetchTopPerformingData` function

4. **`GET /api/top-performing/cabinets`**
   - Returns top performing cabinets/machines ranked by gross revenue
   - Parameters: Same as locations endpoint
   - Used by: `fetchTopPerformingData` function

5. **`GET /api/locationAggregation`**
   - Returns location financial aggregates for map visualization
   - Parameters: `timePeriod`, `licencee`, `startDate`, `endDate`
   - Used by: `PcLayout` component (map section)

6. **`GET /api/locations`**
   - Returns list of gaming locations (minimal projection for map)
   - Parameters: `minimal=1`, `licencee`, `forceAll`, `showAll`
   - Used by: `loadGamingLocations` function

7. **`GET /api/analytics/machines/stats`**
   - Returns machine status statistics (online/offline counts)
   - Parameters: `licensee`
   - Used by: `MobileLayout` component

---

## State Management

### Zustand Store

**Store File:** `lib/store/dashboardStore.ts`

**Key State Properties:**

- `loadingChartData` - Loading state for metrics and chart data
- `loadingTopPerforming` - Loading state for top performing data
- `refreshing` - Manual refresh state
- `activeFilters` - Current active filter configuration
- `activeMetricsFilter` - Selected time period filter
- `activePieChartFilter` - Filter for pie chart (synced with metrics filter)
- `activeTab` - Current top performing tab ('locations' or 'Cabinets')
- `totals` - Financial totals data (`DashboardTotals` type)
- `chartData` - Chart time-series data (`dashboardData[]` type)
- `topPerformingData` - Top performing items (`TopPerformingData` type)
- `gamingLocations` - List of gaming locations
- `selectedLicencee` - Currently selected licensee filter
- `customDateRange` - Custom date range object
- `chartGranularity` - Chart granularity ('hourly' | 'minute')
- `pieChartSortIsOpen` - Pie chart sort dropdown state

**Store Hook:**

- `useDashBoardStore` - Note: capital "B" in "Board"

---

## Key Functions

### Data Fetching Functions

**File:** `lib/helpers/dashboard.ts`

1. **`fetchMetricsData`**
   - Orchestrates parallel fetching of totals and chart data
   - Parameters: `activeMetricsFilter`, `customDateRange`, `selectedLicencee`, setters, `displayCurrency`, `signal`, `granularity`
   - Calls: `fetchDashboardTotals` and `switchFilter` in parallel

2. **`fetchDashboardTotals`**
   - Fetches financial totals from `/api/dashboard/totals`
   - Parameters: `activeMetricsFilter`, `customDateRange`, `selectedLicencee`, `setTotals`, `displayCurrency`, `signal`
   - Updates Zustand store via `setTotals`

3. **`switchFilter`**
   - Fetches chart data based on selected filter type
   - Parameters: `activeMetricsFilter`, `setChartData`, date range, `selectedLicencee`, `displayCurrency`, `signal`, `granularity`
   - Routes to appropriate API endpoint based on filter type

4. **`fetchTopPerformingDataHelper`**
   - Orchestrates top performing data fetch
   - Parameters: `activeTab`, `activePieChartFilter`, `setTopPerformingData`, `setLoadingTopPerforming`, `selectedLicencee`, `currency`, `signal`, `customDateRange`
   - Calls: `fetchTopPerformingData` with appropriate parameters

5. **`loadGamingLocations`**
   - Fetches gaming locations list (minimal projection)
   - Parameters: `setGamingLocations`, `selectedLicencee`, `options`
   - Used for map component location list

### Hook Functions

**File:** `lib/hooks/data/`

1. **`useDashboardFilters`**
   - Manages date filter state and logic
   - Returns: `activeMetricsFilter`, `customDateRange`, `setActiveMetricsFilter`, `setShowDatePicker`
   - Handles filter persistence and updates

2. **`useDashboardRefresh`**
   - Manages manual refresh functionality
   - Returns: `refreshing`, `handleRefresh`
   - Triggers re-fetch of all dashboard data

3. **`useDashboardScroll`**
   - Manages floating refresh button visibility based on scroll position
   - Returns: `showFloatingRefresh`
   - Used for mobile layout floating action button

### Utility Functions

**File:** `lib/utils/`

1. **`getGamingDayRangeForPeriod`**
   - Calculates gaming day ranges with offset handling
   - Parameters: `timePeriod`, `gameDayStartHour`, `startDate`, `endDate`
   - Returns: `{ rangeStart, rangeEnd }` Date objects

2. **`getDefaultChartGranularity`**
   - Determines default chart granularity based on time period
   - Parameters: `timePeriod`, `startDate`, `endDate`
   - Returns: `'hourly' | 'minute'`

3. **`getLicenseeName`**
   - Maps licensee ID to display name
   - Parameters: `licenseeId`
   - Returns: Licensee name string

---

## Performance Optimizations

### Request Deduplication

- `deduplicateRequest` utility prevents duplicate API calls for same parameters
- Used for location aggregation and chart data fetches

### Parallel Fetching

- `fetchMetricsData` fetches totals and chart data in parallel using `Promise.all`
- Prevents skeleton loader from disappearing prematurely

### Abort Controller

- `useAbortableRequest` hook manages request cancellation
- Prevents race conditions when filters change rapidly
- Cancels previous requests when new ones are initiated

### Loading State Management

- Separate loading states for chart data and top performing data
- Allows independent loading without blocking each other
- Skeleton loaders match actual content layout

---

## Currency Conversion Rules

### When Currency Conversion is Available

- **Admin/Developer + "All Licensees"**: ✅ Currency selector visible, conversion enabled
- **Admin/Developer + Specific Licensee**: ❌ Currency selector hidden, native currency shown
- **Manager**: ❌ Currency selector always hidden, native currency always shown
- **Other Roles**: ❌ Currency selector always hidden

### Conversion Process

1. Each licensee's data converted from native currency → USD (base)
2. USD totals aggregated across all licensees
3. Aggregated USD → Selected display currency

### Supported Currencies

- USD - US Dollar (base, rate: 1.0)
- TTD - Trinidad & Tobago Dollar (rate: 6.75)
- GYD - Guyanese Dollar (rate: 207.98)
- BBD - Barbados Dollar (rate: 2.0)

---

## Recent Updates

### Gaming Day Offset Fix (November 2024)

- Fixed issue where dashboard showed $0 when viewed before 8 AM
- Now correctly calculates current gaming day based on 8 AM start time
- Implementation: `getGamingDayRangeForPeriod` utility function

### Performance Optimization (November 2024)

- Backend parallel licensee processing (65% faster)
- Today queries: 11.66s → 4.10s
- 30 Days queries: 14.94s → 5.20s
- Implementation: `app/api/dashboard/totals/route.ts`
