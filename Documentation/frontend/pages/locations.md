# Locations Page

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** December 29, 2025
**Version:** 3.1.0

## Table of Contents

1. [Overview](#overview)
2. [File Information](#file-information)
3. [Page Sections](#page-sections)
   - [Page Header](#page-header)
   - [Financial Metrics Cards](#financial-metrics-cards)
   - [Date Filters and Machine Status Widget](#date-filters-and-machine-status-widget)
   - [Search and Filter Section](#search-and-filter-section)
   - [Locations List](#locations-list)
   - [Location Modals](#location-modals)
4. [API Endpoints](#api-endpoints)
5. [State Management](#state-management)
6. [Key Functions](#key-functions)

## Overview

The Locations page provides comprehensive management and analytics for gaming locations. It displays location listings with financial metrics, filtering capabilities, and CRUD operations for location management.

## File Information

- **Main File:** `app/locations/page.tsx`
- **URL Pattern:** `/locations`
- **Authentication:** Required (ProtectedRoute with `requiredPage="locations"`)
- **Access Level:** Developer, Admin, Manager, Location Admin (with assigned locations)
- **Licensee Filtering:** Supported
- **Responsive:** Desktop (table) and Mobile (card) views

## Page Sections

### Page Header

**Purpose:** Displays page title, refresh button, and "New Location" button (if user has manage permissions).

**Components:**
- `components/locations/details/LocationsDetailsHeaderSection.tsx` - Header component

**Features:**
- Page title with loading indicator
- Refresh button (triggers data refresh)
- "New Location" button (only shown if user can manage locations)
- Responsive layout (different button placement on mobile)

**Permissions:**
- "New Location" button only visible to: Developer, Admin, Manager, Location Admin
- Checked via `canManageLocations` computed value

---

### Financial Metrics Cards

**Purpose:** Displays aggregated financial totals across all locations: Money In, Money Out, and Gross Revenue.

**Components:**
- `components/ui/FinancialMetricsCards.tsx` - Reusable metrics cards component

**Data Sources:**
1. **Metrics Totals:** Fetched from `GET /api/dashboard/totals` (if available)
2. **Financial Totals:** Calculated client-side from location data (fallback)

**Data Flow:**
1. `fetchDashboardTotals` called to get metrics totals
2. If unavailable, `calculateLocationFinancialTotals` computes totals from location list
3. Totals displayed in three cards with currency formatting

**Key Functions:**
- `fetchDashboardTotals` - Fetches metrics from API (from `lib/helpers/dashboard.ts`)
- `calculateLocationFinancialTotals` - Calculates totals from location array (from `lib/utils/financial.ts`)

**Notes:**
- Currency conversion applied based on user role and selected licensee
- Loading skeleton shown during data fetch

---

### Date Filters and Machine Status Widget

**Purpose:** Provides time period filtering and displays machine status overview.

**Components:**
- `components/dashboard/DashboardDateFilters.tsx` - Date filter component
- `components/ui/MachineStatusWidget.tsx` - Machine status widget

**Date Filters:**
- Predefined periods: Today, Yesterday, Last 7 days, Last 30 days
- Custom date range support
- Gaming day offset handling (8 AM start time)

**Machine Status Widget:**
- Displays online/offline machine counts
- Total machines count
- Membership count (if membership enabled)
- Color-coded status indicators

**API Endpoint:**
- `GET /api/analytics/machines/stats` - Machine status statistics

**Data Flow:**
1. `useLocationMachineStats` hook fetches machine stats
2. `useLocationMembershipStats` hook fetches membership stats
3. Stats filtered by `machineTypeFilter` if status filters are active
4. Widget displays counts and membership information

**Key Functions:**
- `useLocationMachineStats` - Hook managing machine stats fetch
- `useLocationMembershipStats` - Hook managing membership stats fetch
- `refreshMachineStats` - Manual refresh function
- `refreshMembershipStats` - Manual refresh function

---

### Search and Filter Section

**Purpose:** Allows users to search locations and apply status filters (SMIB, No SMIB, Local Server, Membership, Coordinates).

**Components:**
- `components/locations/details/LocationsDetailsFilterSection.tsx` - Search and filter component

**Search Functionality:**
- Text search input for location names
- Real-time search as user types
- Frontend-first search (searches accumulated locations)
- Backend fallback if no results or filters active

**Filter Options:**
- **SMIB Locations Only** - Locations with SMIB devices
- **No SMIB Location** - Locations without SMIB devices
- **Local Server** - Locations with local servers
- **Membership** - Locations with membership enabled
- **Missing Coordinates** - Locations without geographic coordinates
- **Has Coordinates** - Locations with geographic coordinates

**Filter Behavior:**
- Multiple filters can be selected (AND logic)
- Filters trigger backend API call with `machineTypeFilter` parameter
- Desktop (XL+): Checkboxes displayed inline
- Desktop (MD-XL): Multi-select dropdown
- Mobile: Checkboxes displayed below search bar

**State Management:**
- `searchTerm` - Current search text
- `selectedFilters` - Array of active filter IDs
- Managed by `useLocationsPageData` hook

**Key Functions:**
- `handleFilterChange` - Toggles individual filter on/off
- `handleMultiFilterChange` - Handles multi-select changes
- Search handled via `setSearchTerm` state setter

---

### Locations List

**Purpose:** Displays the list of locations in table format (desktop) or card format (mobile).

**Components:**
- `components/locations/LocationsLocationTable.tsx` - Desktop table view
- `components/locations/LocationsLocationCard.tsx` - Mobile card view
- `components/locations/LocationsLocationSkeleton.tsx` - Loading skeleton for cards
- `components/locations/LocationsCabinetTableSkeleton.tsx` - Loading skeleton for table

**API Endpoint:**
- `GET /api/reports/locations` - Returns paginated location list with financial metrics

**Query Parameters:**
- `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, Custom)
- `licensee` / `licencee` - Licensee filter
- `currency` - Display currency
- `search` - Search query
- `machineTypeFilter` - Status filter string (comma-separated)
- `page` - Page number
- `limit` - Items per page
- `startDate`, `endDate` - Custom date range

**Data Flow:**
1. `useLocationData` hook fetches locations from API
2. Data accumulated in `accumulatedLocations` state for pagination
3. Client-side filtering applied based on search and filters
4. Pagination handled client-side (20 items per page)
5. Locations displayed with financial metrics (money in, money out, gross)

**Display Features:**
- Location name with click handler (navigates to location details)
- Financial metrics with currency formatting
- Machine status badge (X/Y Online) with color coding
- Action buttons (Edit, Delete) if user has permissions
- Responsive layout (table on desktop, cards on mobile)

**Machine Status Badge:**
- Displays "X/Y Online" format
- Color coding:
  - Green: All machines online
  - Yellow: Some machines online
  - Red: All machines offline
  - Gray: No machines

**Pagination:**
- Client-side pagination (20 items per page)
- `PaginationControls` component shown when `totalPages > 1`
- Page state managed via `currentPage` and `setCurrentPage`

**Key Functions:**
- `useLocationData` - Hook managing location data fetch
- `fetchData` - Function to fetch/refresh location data
- `handleLocationClick` - Navigates to location details page

**Notes:**
- Test locations (names starting with "test") filtered out for non-developers
- Location data includes financial metrics aggregated by time period
- Currency conversion applied based on user role and selected licensee

---

### Location Modals

**Purpose:** Provides modals for creating, editing, and deleting locations.

**Components:**
- `components/locations/modals/LocationsNewLocationModal.tsx` - Create new location modal
- `components/locations/modals/LocationsEditLocationModal.tsx` - Edit existing location modal
- `components/locations/modals/LocationsDeleteLocationModal.tsx` - Delete confirmation modal

**New Location Modal Features:**
- Location name
- Country selection
- Licensee assignment
- Gaming day offset
- Geographic coordinates (latitude, longitude)
- SMIB configuration
- Local server configuration
- Membership settings

**Edit Location Modal Features:**
- Same fields as New Location Modal
- Pre-populated with existing location data
- Update location configuration

**Delete Location Modal Features:**
- Confirmation dialog with location details
- Soft delete option (if supported)

**API Endpoints:**
- `POST /api/locations` - Create new location
- `PUT /api/locations/:id` - Update existing location
- `DELETE /api/locations/:id` - Delete location

**Key Functions:**
- Modals managed via state in `app/locations/page.tsx`
- `openEditModal`, `openDeleteModal`, `closeDeleteModal` from `useLocationActionsStore`

---

## API Endpoints

### Primary Endpoints

1. **`GET /api/reports/locations`**
   - Returns paginated location list with financial metrics
   - Parameters: `timePeriod`, `licensee`/`licencee`, `currency`, `search`, `machineTypeFilter`, `page`, `limit`, `startDate`, `endDate`
   - Used by: `useLocationData` hook
   - Returns: Location array with financial metrics, pagination info, currency info

2. **`GET /api/dashboard/totals`**
   - Returns aggregated financial totals
   - Parameters: `timePeriod`, `licensee`, `currency`, `startDate`, `endDate`
   - Used by: Financial metrics cards (if available)
   - Returns: `{ moneyIn, moneyOut, gross }`

3. **`GET /api/analytics/machines/stats`**
   - Returns machine status statistics
   - Parameters: `licensee`, `machineTypeFilter`
   - Used by: `useLocationMachineStats` hook
   - Returns: `{ totalMachines, onlineMachines, offlineMachines }`

4. **`GET /api/analytics/membership/stats`**
   - Returns membership statistics
   - Parameters: `licensee`, `machineTypeFilter`
   - Used by: `useLocationMembershipStats` hook
   - Returns: `{ membershipCount }`

5. **`POST /api/locations`**
   - Creates new location
   - Body: Location creation payload
   - Used by: `NewLocationModal` component

6. **`PUT /api/locations/:id`**
   - Updates existing location
   - Body: Location update payload
   - Used by: `EditLocationModal` component

7. **`DELETE /api/locations/:id`**
   - Deletes location
   - Used by: `DeleteLocationModal` component

---

## State Management

### Locations Page Data Hook

**Hook:** `useLocationsPageData` (from `lib/hooks/locations/useLocationsPageData.ts`)

**Key State Properties:**
- `loading` - Loading state for location data
- `refreshing` - Manual refresh state
- `searchTerm` - Current search text
- `selectedFilters` - Array of active filter IDs
- `currentPage` - Current page number
- `accumulatedLocations` - Accumulated location data for pagination
- `filteredLocationData` - Filtered and paginated location list
- `metricsTotals` - Financial metrics totals from API
- `metricsTotalsLoading` - Metrics loading state
- `machineStats` - Machine status statistics
- `machineStatsLoading` - Machine stats loading state
- `membershipStats` - Membership statistics
- `membershipStatsLoading` - Membership stats loading state
- `filtersInitialized` - Flag indicating filters have been initialized

**Key Functions:**
- `fetchData` - Fetches location data from API
- `handleRefresh` - Manual refresh function
- `handleFilterChange` - Toggles individual filter
- `setSearchTerm` - Updates search text
- `setCurrentPage` - Updates current page

### Location Data Hook

**Hook:** `useLocationData` (from `lib/hooks/data/useLocationData.ts`)

**Key State Properties:**
- `locationData` - Location data from API
- `loading` - Loading state
- `searchLoading` - Search operation loading state
- `error` - Error state

**Key Functions:**
- Fetches data from `/api/reports/locations`
- Handles search and filter parameters
- Manages pagination and accumulation

### Location Actions Store

**Store:** `useLocationActionsStore` (from `lib/store/locationActionsStore.ts`)

**Key Functions:**
- `openEditModal` - Opens edit modal with location data
- `openDeleteModal` - Opens delete modal with location data
- `closeDeleteModal` - Closes delete modal

---

## Key Functions

### Data Fetching Functions

**File:** `lib/hooks/locations/useLocationsPageData.ts`

1. **`useLocationsPageData`**
   - Main hook coordinating all location page data and state
   - Integrates `useLocationData`, `useLocationMachineStats`, `useLocationMembershipStats`
   - Manages filtering, pagination, and search
   - Returns all state and handlers needed by the page

**File:** `lib/hooks/data/useLocationData.ts`

2. **`useLocationData`**
   - Fetches location data from `/api/reports/locations`
   - Handles search, filters, and time period parameters
   - Accumulates data for client-side pagination

**File:** `lib/hooks/data/useLocationMachineStats.ts`

3. **`useLocationMachineStats`**
   - Fetches machine status statistics
   - Parameters: `licensee`, `machineTypeFilter`
   - Returns: `{ machineStats, machineStatsLoading, refreshMachineStats }`

**File:** `lib/hooks/data/useLocationMembershipStats.ts`

4. **`useLocationMembershipStats`**
   - Fetches membership statistics
   - Parameters: `licensee`, `machineTypeFilter`
   - Returns: `{ membershipStats, membershipStatsLoading, refreshMembershipStats }`

### Utility Functions

**File:** `lib/utils/financial.ts`

1. **`calculateLocationFinancialTotals`**
   - Calculates financial totals from location array
   - Parameters: `locations: AggregatedLocation[]`
   - Returns: `{ moneyIn, moneyOut, gross }`
   - Used as fallback when metrics totals API unavailable

**File:** `lib/helpers/dashboard.ts`

2. **`fetchDashboardTotals`**
   - Fetches financial metrics totals from API
   - Parameters: `activeMetricsFilter`, `customDateRange`, `selectedLicencee`, `setTotals`, `displayCurrency`, `signal`
   - Used for financial metrics cards

---

## Filtering and Search Logic

### Search Logic

1. **Frontend-First Search:**
   - Searches `accumulatedLocations` array client-side
   - Fast, no API call needed
   - Used when no backend filters are active

2. **Backend Search:**
   - Triggers API call with `search` parameter
   - Used when filters are active or frontend search yields no results
   - Searches location names in database

### Filter Logic

1. **Client-Side Filtering:**
   - Applied to location array after fetch
   - Used for simple status filters (SMIB, Membership, etc.)
   - Fast, no additional API calls

2. **Backend Filtering:**
   - `machineTypeFilter` parameter sent to API
   - Comma-separated filter IDs
   - Applied during database query for performance

### Combined Filtering

- When filters are active, always uses API-filtered data
- When no filters and search term, uses accumulated locations
- Pagination applied after filtering

---

## Performance Optimizations

### Data Accumulation

- Location data accumulated in state for client-side pagination
- Reduces API calls when navigating between pages
- Accumulated data refreshed when filters or time period changes

### Batch Processing

- API endpoint uses cursor-based aggregation for large datasets
- Gaming day offsets calculated per location
- Financial metrics aggregated efficiently via MongoDB aggregation

### Request Deduplication

- `deduplicateRequest` utility prevents duplicate API calls
- Used for location data and metrics fetching

### Abort Error Handling

- `isAbortError` utility centralizes abort/cancellation error detection
- Abort errors are silently handled (expected when switching filters)
- Prevents false error toasts when filters change rapidly
- Applied to all data fetching hooks:
  - `useLocationsPageData` - Metrics totals fetch
  - `useLocationData` - Location data fetch
  - `useLocationMachineStats` - Machine stats fetch
  - `useLocationMembershipStats` - Membership stats fetch

---

## Currency Conversion Rules

### When Currency Conversion is Available

- **Admin/Developer + "All Licensees"**: ✅ Currency conversion enabled
- **Admin/Developer + Specific Licensee**: ❌ Native currency shown
- **Manager**: ❌ Native currency always shown
- **Location Admin**: ❌ Native currency always shown

### Conversion Process

1. Each location's data in its licensee's native currency
2. Data converted to USD (base) if viewing "All Licensees"
3. Aggregated USD → Selected display currency

---

## Recent Updates

### Machine Status Badges (December 2024)
- Added inline machine status badges (X/Y Online) next to location names
- Color-coded indicators (green, yellow, red, gray)
- Consistent display across desktop and mobile views

### Performance Optimization (November 2024)
- Fixed timeout issues for 7d/30d periods
- Adaptive batch sizing for location aggregation
- 7 Days: TIMEOUT → 3.61s
- 30 Days: TIMEOUT → 9.23s

### Gaming Day Offset Fix (November 2024)
- Fixed issue where locations showed $0 when viewed before 8 AM
- Now correctly calculates current gaming day based on location-specific offsets
