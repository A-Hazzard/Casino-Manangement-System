# Cabinets/Machines Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026
**Version:** 3.0.0
## Table of Contents

1. [Overview](#overview)
2. [File Information](#file-information)
3. [Page Sections](#page-sections)
   - [Page Header](#page-header)
   - [Navigation Tabs](#navigation-tabs)
   - [Cabinets Section](#cabinets-section)
     - [Financial Metrics Cards](#financial-metrics-cards)

     - [Date Filters and Machine Status Widget](#date-filters-and-machine-status-widget)
     - [Search and Filter Section](#search-and-filter-section)
     - [Cabinets Table/Grid](#cabinets-tablegrid)
     - [Cabinet Modals](#cabinet-modals)
   - [SMIB Management Section](#smib-management-section)
   - [Movement Requests Section](#movement-requests-section)
   - [Firmware Section](#firmware-section)
4. [API Endpoints](#api-endpoints)
5. [State Management](#state-management)
6. [Key Functions](#key-functions)

## Overview

The Cabinets page (also referred to as Machines page) provides comprehensive cabinet/machine management with multiple sections: Cabinets listing with financial metrics, SMIB device management, movement requests, and firmware management. The page uses tab-based navigation to switch between different management areas.

## File Information

- **Main File:** `app/cabinets/page.tsx` (Note: URL is `/cabinets` but also accessible as machines)
- **URL Pattern:** `/cabinets`
- **Authentication:** Required (ProtectedRoute with `requiredPage="machines"`)
- **Access Level:** All authenticated users (with role-based restrictions)
- **Licensee Filtering:** Supported
- **Responsive:** Desktop (table) and Mobile (card) views

## Page Sections

### Page Header

**Purpose:** Displays page title, refresh button, and action buttons (Add Cabinet, New Movement Request, Upload SMIB Data).

**Components:**

- `components/CMS/cabinets/CabinetsActions.tsx` - Action buttons component

**Features:**

- Page title "Cabinets" with icon
- Refresh button (triggers data refresh)
- Action buttons change based on active section:
  - **Cabinets section:** "Add Cabinet" button
  - **Movement section:** "New Movement Request" button
  - **SMIB section:** "Upload SMIB Data" button (if applicable)

**State Management:**

- `refreshing` - Refresh state
- `activeSection` - Current active section (determines which buttons to show)

---

### Navigation Tabs

**Purpose:** Allows switching between four main sections: Cabinets, SMIB, Movement Requests, and Firmware.

**Components:**

- `components/CMS/cabinets/CabinetsNavigation.tsx` - Tab navigation component

**Tab Configuration:**

- Defined in `lib/constants/cabinets.ts` as `CABINET_TABS_CONFIG`
- Tabs: Cabinets, SMIB, Movement, Firmware

**State Management:**

- `activeSection` - Current active section (managed by `useCabinetNavigation` hook or `useCabinetsPageData`)
- Section switching handled via `setActiveSection` or `handleSectionChange`

---

## Cabinets Section

### Financial Metrics Cards

**Purpose:** Displays aggregated financial totals across all cabinets: Money In, Money Out, and Gross Revenue.

**Components:**

- `components/ui/FinancialMetricsCards.tsx` - Reusable metrics cards component

**Data Sources:**

1. **Metrics Totals:** Fetched from `GET /api/machines/aggregation` (if available)
2. **Financial Totals:** Calculated client-side from cabinet data (fallback)

**Data Flow:**

1. `fetchCabinetTotals` called to get metrics totals
2. If unavailable, totals calculated from `allCabinets` array
3. Totals displayed in three cards with currency formatting

**Key Functions:**

- `fetchCabinetTotals` - Fetches metrics from `/api/machines/aggregation` (from `lib/helpers/cabinets.ts`)
- Financial totals calculated from cabinet array (client-side)

**Notes:**

- Currency conversion applied based on user role and selected licensee
- Loading skeleton shown during data fetch
- Only visible when "Cabinets" section is active

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
- Color-coded status indicators

**API Endpoint:**

- `GET /api/machines/status` - Machine status statistics

**Data Flow:**

1. `useLocationMachineStats` hook fetches machine stats from `/api/machines/status`
2. Determines online/offline status based on `lastActivity` field:
   - **Online**: Machines with `lastActivity` within the last 3 minutes
   - **Offline**: All other machines (including those without `lastActivity`)
3. Stats displayed in widget with online/offline counts

**Key Functions:**

- `useLocationMachineStats` - Hook managing machine stats fetch

**Notes:**

- Only visible when "Cabinets" section is active
- Widget shows counts for all machines (not filtered by location)

---

### Search and Filter Section

**Purpose:** Allows users to search cabinets and apply filters (location, game type, status).

**Components:**

- `components/CMS/cabinets/CabinetSearchFilters.tsx` - Search and filter component

**Search Functionality:**

- Text search input for cabinet names, asset numbers, serial numbers
- Real-time search with debouncing
- Searches across all cabinets when no filters active

**Filter Options:**

- **Location Filter:** Dropdown to filter by location (All Locations or specific location)
- **Game Type Filter:** Dropdown to filter by game type
- **Status Filter:** Dropdown to filter by online/offline status

**State Management:**

- `searchTerm` - Current search text
- `selectedLocation` - Selected location filter
- `selectedGameType` - Selected game type filter
- `selectedStatus` - Selected status filter
- All managed by `useCabinetFilters` hook or `useCabinetsPageData`

**Key Functions:**

- `useCabinetFilters` - Hook managing filter state
- Search handled via `setSearchTerm` with debouncing

**Notes:**

- Filters trigger API call with appropriate parameters
- Search fetches all results when active (no pagination limit)

---

### Cabinets Table/Grid

**Purpose:** Displays the list of cabinets in table format (desktop) or card format (mobile).

**Components:**

- `components/CMS/cabinets/CabinetsCabinetContentDisplay.tsx` - Main display component
- `components/CMS/cabinets/CabinetsCabinetTable.tsx` - Desktop table view
- `components/CMS/cabinets/CabinetsCabinetCard.tsx` - Mobile card view
- `components/CMS/cabinets/CabinetsCabinetCardSkeleton.tsx` - Card loading skeletons
- `components/CMS/cabinets/CabinetsCabinetTableSkeleton.tsx` - Table loading skeletons

**API Endpoint:**

- `GET /api/machines/aggregation` - Returns paginated cabinet list with financial metrics

**Query Parameters:**

- `licensee` - Licensee filter
- `timePeriod` - Time period filter
- `startDate`, `endDate` - Custom date range
- `currency` - Display currency
- `page` - Page number
- `limit` - Items per page (50 items per batch)
- `search` - Search query
- `locationId` - Location filter

**Data Flow:**

1. `useCabinetData` hook fetches cabinets from API
2. Data accumulated in `accumulatedCabinets` state for pagination
3. Client-side filtering and sorting applied
4. Pagination handled with batch loading (50 items per batch)
5. Cabinets displayed with financial metrics (money in, money out, gross)

**Display Features:**

- Cabinet name, asset number, serial number
- Location name
- Financial metrics with currency formatting
- Online/offline status indicator
- Action buttons (Edit, Delete) if user has permissions
- Responsive layout (table on desktop, cards on mobile)

**Pagination:**

- Batch-based pagination (50 items per batch)
- Client-side pagination (20 items per page displayed)
- Loads additional batches as user navigates pages

**Sorting:**

- Clickable column headers in table view
- Supported columns: asset number, location, money in, money out, gross
- Sort state managed via `sortOption`, `sortOrder`, and `handleColumnSort`

**Key Functions:**

- `useCabinetData` - Hook managing cabinet data fetch
- `useCabinetSorting` - Hook managing sorting and pagination
- `loadCabinets` - Function to fetch/refresh cabinet data
- `transformCabinet` - Function to transform cabinet data for display

**Notes:**

- Batch accumulation prevents excessive API calls
- Search fetches all results (no limit) to find matches across all machines
- Filtering can be done at API level (locationId parameter) or client-side

---

### Cabinet Modals

**Purpose:** Provides modals for creating, editing, and deleting cabinets.

**Components:**

- `components/CMS/cabinets/modals/CabinetsNewCabinetModal.tsx` - Create new cabinet modal
- `components/CMS/cabinets/modals/CabinetsEditCabinetModal.tsx` - Edit existing cabinet modal
- `components/CMS/cabinets/modals/CabinetsDeleteCabinetModal.tsx` - Delete confirmation modal

**New Cabinet Modal Features:**

- Cabinet name, asset number, serial number
- Manufacturer (mandatory, with manual entry option)
- Location selection
- Game type
- Configuration settings
- Form validation

**Edit Cabinet Modal Features:**

- Same fields as New Cabinet Modal
- Pre-populated with existing cabinet data
- Update cabinet configuration

**Delete Cabinet Modal Features:**

- Confirmation dialog with cabinet details
- Soft delete or hard delete option (if supported)

**API Endpoints:**

- `POST /api/machines` - Create new cabinet
- `PUT /api/machines` - Update existing cabinet
- `DELETE /api/machines` - Delete cabinet

**Key Functions:**

- Modals managed via state in page component
- `onCabinetCreated`, `onCabinetUpdated`, `onCabinetDeleted` callbacks trigger data refresh

---

## SMIB Management Section

**Purpose:** Manages SMIB (Slot Machine Interface Board) devices, including configuration, network settings, MQTT settings, and operations.

**Components:**

- `components/CMS/cabinets/CabinetsSMIBManagementTab.tsx` - Main SMIB management component
- `components/CMS/cabinets/smibManagement/*` - Various SMIB configuration sections
- `components/ui/smib/SMIBSearchSelect.tsx` - SMIB device search and selection

**Features:**

- SMIB device selection (search by relay ID, serial number, location)
- Network configuration (WiFi/SSID, password, channel)
- MQTT configuration (broker settings, topics, connection parameters)
- COMS configuration (communication protocol: SAS/non-SAS/IGT, polling rates, RTE, GPC)
- SMIB operations (restart devices, request meter data, reset meters)
- OTA (Over-the-Air) firmware updates
- Location-wide operations (batch restart all SMIBs at a location)
- Real-time status via MQTT/SSE streams
- Offline support (save configurations to database when SMIB is offline)

**API Endpoints:**

- `GET /api/smib/devices` - Fetches available SMIB devices
- `POST /api/cabinets/:id/smib-config` - Updates SMIB configuration
- `GET /api/cabinets/:id/smib-config` - Fetches SMIB configuration
- SMIB operation endpoints (restart, meter data, etc.)

**State Management:**

- `useSmibConfiguration` hook manages SMIB config state
- `useSMIBDiscovery` hook manages SMIB device discovery
- Real-time updates via SSE/MQTT connections

**Key Functions:**

- `useSmibConfiguration` - Hook managing SMIB configuration
- `useSMIBDiscovery` - Hook managing SMIB device discovery
- SMIB operation functions (restart, fetch config, update config, etc.)

**Notes:**

- Only visible when "SMIB" section is active
- Real-time status updates when SMIB is online
- Configuration saved to database when SMIB is offline

---

## Movement Requests Section

**Purpose:** Manages cabinet movement requests between locations.

**Components:**

- `components/CMS/cabinets/CabinetsMovementRequests.tsx` - Movement requests list component
- `components/ui/movements/NewMovementRequestModal.tsx` - New movement request modal

**Features:**

- View movement requests list
- Create new movement requests
- Track cabinet relocations
- Approval workflow (if implemented)

**API Endpoints:**

- `GET /api/movement-requests` - Fetches movement requests
- `POST /api/movement-requests` - Creates movement request
- Movement request management endpoints

**Key Functions:**

- Movement request management handled in `MovementRequests` component

**Notes:**

- Only visible when "Movement" section is active
- Modal opens from page header "New Movement Request" button

---

## Firmware Section

**Purpose:** Manages SMIB firmware uploads, version control, and deployment.

**Components:**

- `components/ui/firmware/SMIBFirmwareSection.tsx` - Firmware management component
- `components/ui/firmware/UploadSmibDataModal.tsx` - Firmware upload modal

**Features:**

- Upload SMIB firmware files
- Version control and tracking
- Firmware deployment
- Update tracking

**API Endpoints:**

- `POST /api/firmware/upload` - Uploads firmware file
- `GET /api/firmware` - Fetches firmware list
- Firmware management endpoints

**Key Functions:**

- Firmware management handled in `SMIBFirmwareSection` component

**Notes:**

- Only visible when "Firmware" section is active
- Modal opens from page header "Upload SMIB Data" button

---

## API Endpoints

### Cabinet Management Endpoints

1. **`GET /api/machines/aggregation`**
   - Returns paginated cabinet list with financial metrics
   - Parameters: `licensee`, `timePeriod`, `startDate`, `endDate`, `currency`, `page`, `limit`, `search`, `locationId`
   - Used by: `fetchCabinets` function
   - Returns: Cabinet array with metrics, pagination info

2. **`GET /api/machines/:id`**
   - Returns single cabinet details
   - Parameters: `timePeriod`, `startDate`, `endDate`, `currency`, `licensee`
   - Used by: `fetchCabinetById` function

3. **`POST /api/machines`**
   - Creates new cabinet
   - Body: Cabinet creation payload
   - Used by: `NewCabinetModal` component

4. **`PUT /api/machines`**
   - Updates existing cabinet
   - Body: Cabinet update payload
   - Used by: `EditCabinetModal` component

5. **`DELETE /api/machines`**
   - Deletes cabinet
   - Body: `{ id: string }`
   - Used by: `DeleteCabinetModal` component

### Machine Metrics Endpoints

6. **`GET /api/machines/:id/chart`**
   - Returns time-series chart data for a machine
   - Parameters: `timePeriod`, `startDate`, `endDate`, `currency`, `licensee`, `granularity`
   - Used by: `getMachineChartData` function

7. **`GET /api/analytics/machines/stats`**
   - Returns machine status statistics
   - Parameters: `licensee`
   - Used by: `useLocationMachineStats` hook
   - Returns: `{ totalMachines, onlineMachines, offlineMachines }`

### SMIB Management Endpoints

8. **`GET /api/smib/devices`**
   - Returns available SMIB devices
   - Used by: SMIB discovery

9. **`GET /api/cabinets/:id/smib-config`**
   - Fetches SMIB configuration
   - Used by: `useSmibConfiguration` hook

10. **`POST /api/cabinets/:id/smib-config`**
    - Updates SMIB configuration
    - Body: SMIB configuration payload
    - Used by: `useSmibConfiguration` hook

### Movement Request Endpoints

11. **`GET /api/movement-requests`**
    - Returns movement requests list
    - Used by: `MovementRequests` component

12. **`POST /api/movement-requests`**
    - Creates movement request
    - Body: Movement request payload
    - Used by: `NewMovementRequestModal` component

### Firmware Endpoints

13. **`GET /api/firmware`**
    - Returns firmware list
    - Used by: `SMIBFirmwareSection` component

14. **`POST /api/firmware/upload`**
    - Uploads firmware file
    - Body: Form data with firmware file
    - Used by: `UploadSmibDataModal` component

### Location Endpoints

15. **`GET /api/locations`**
    - Returns available locations
    - Parameters: `licensee`
    - Used by: Location filter dropdown

---

## State Management

### Cabinets Page Data Hook

**Hook:** `useCabinetsPageData` (from `lib/hooks/cabinets/useCabinetsPageData.ts`)

**Key State Properties:**

- `activeSection` - Current active section (cabinets/smib/movement/firmware)
- `loading` - Loading state
- `refreshing` - Manual refresh state
- `locations` - Available locations list
- `gameTypes` - Available game types
- `financialTotals` - Calculated financial totals
- `metricsTotals` - Metrics totals from API
- `machineStats` - Machine status statistics
- `allCabinets` - All cabinets (accumulated)
- `filteredCabinets` - Filtered cabinet list
- `paginatedCabinets` - Paginated cabinet list
- `currentPage` - Current page number
- `sortOption`, `sortOrder` - Sort configuration
- `searchTerm` - Current search text
- `selectedLocation` - Selected location filter
- `selectedGameType` - Selected game type filter
- `selectedStatus` - Selected status filter
- `chartGranularity` - Chart granularity setting

**Key Functions:**

- `loadCabinets` - Fetches cabinet data
- `handleRefresh` - Manual refresh function
- `setActiveSection` - Changes active section
- `handleColumnSort` - Handles column sorting

### Cabinet Data Hook

**Hook:** `useCabinetData` (from `lib/hooks/data/useCabinetData.ts`)

**Key State Properties:**

- `allCabinets` - All cabinets from API
- `filteredCabinets` - Filtered cabinets
- `locations` - Available locations
- `gameTypes` - Available game types
- `financialTotals` - Calculated totals
- `loading` - Loading state
- `error` - Error state

**Key Functions:**

- `loadCabinets` - Fetches cabinets with filters
- Handles search debouncing
- Manages batch loading

### Cabinet Filters Hook

**Hook:** `useCabinetFilters` (from `lib/hooks/data/useCabinetFilters.ts`)

**Key State Properties:**

- `searchTerm` - Search text
- `selectedLocation` - Location filter
- `selectedGameType` - Game type filter
- `selectedStatus` - Status filter

**Key Functions:**

- Filter state setters
- Search debouncing

### Cabinet Sorting Hook

**Hook:** `useCabinetSorting` (from `lib/hooks/data/useCabinetSorting.ts`)

**Key State Properties:**

- `sortOption` - Current sort column
- `sortOrder` - Sort direction (asc/desc)
- `currentPage` - Current page
- `paginatedCabinets` - Paginated results
- `totalPages` - Total number of pages

**Key Functions:**

- `handleColumnSort` - Handles column sorting
- `setCurrentPage` - Changes current page
- `transformCabinet` - Transforms cabinet data for display

### Global Store

**Store:** `useDashBoardStore` (from `lib/store/dashboardStore.ts`)

**Key Properties Used:**

- `selectedLicencee` - Selected licensee filter
- `activeMetricsFilter` - Current time period filter
- `customDateRange` - Custom date range
- `chartData` - Chart data
- `loadingChartData` - Chart loading state
- `displayCurrency` - Display currency

---

## Key Functions

### Data Fetching Functions

**File:** `lib/helpers/cabinets.ts`

1. **`fetchCabinets`**
   - Fetches cabinet list from `/api/machines/aggregation`
   - Parameters: `licensee`, `timePeriod`, `customDateRange`, `currency`, `page`, `limit`, `searchTerm`, `locationId`, `signal`
   - Returns: Cabinet array with metrics

2. **`fetchCabinetById`**
   - Fetches single cabinet details
   - Parameters: `cabinetId`, `timePeriod`, `customDateRange`, `currency`, `licensee`, `signal`
   - Returns: Cabinet details object

3. **`fetchCabinetTotals`**
   - Fetches aggregated financial totals
   - Parameters: `activeMetricsFilter`, `customDateRange`, `selectedLicencee`, `displayCurrency`, `signal`
   - Returns: `{ moneyIn, moneyOut, gross }`

4. **`fetchCabinetsForLocation`**
   - Fetches cabinets for a specific location
   - Parameters: `locationId`, `timePeriod`, `licensee`, `searchTerm`, `customDateRange`, `page`, `limit`, `currency`, `signal`
   - Returns: Cabinet array with pagination info

**File:** `lib/helpers/machineChart.ts`

5. **`getMachineChartData`**
   - Fetches chart data for a machine
   - Parameters: `machineId`, `timePeriod`, `startDate`, `endDate`, `displayCurrency`, `selectedLicencee`, `granularity`, `signal`
   - Returns: Chart data array with optional data span

6. **`getMachineMetrics`**
   - Fetches machine metrics
   - Parameters: `machineId`, `timePeriod`, `startDate`, `endDate`, `displayCurrency`, `selectedLicencee`
   - Returns: Machine metrics data

### Hook Functions

**File:** `lib/hooks/cabinets/useCabinetsPageData.ts`

1. **`useCabinetsPageData`**
   - Main hook coordinating all cabinets page data and state
   - Integrates `useCabinetData`, `useLocationMachineStats`, chart data fetching
   - Manages section switching, filtering, sorting, pagination
   - Returns all state and handlers needed by the page

**File:** `lib/hooks/data/useCabinetData.ts`

2. **`useCabinetData`**
   - Manages cabinet data fetching, filtering, and pagination
   - Handles search debouncing
   - Manages batch loading for performance
   - Returns: Cabinet data, locations, game types, financial totals, loading states

---

## Performance Optimizations

### Batch Loading

- Cabinets loaded in batches of 50 items
- Reduces initial load time
- Additional batches loaded as user navigates pages

### Search Optimization

- Search debouncing prevents excessive API calls
- When searching, fetches all results (no limit) to find matches across all machines
- Client-side filtering applied after fetch

### Data Accumulation

- Cabinets accumulated in state for client-side pagination
- Reduces API calls when navigating between pages
- Accumulated data refreshed when filters or time period changes

### Request Deduplication

- `deduplicateRequest` utility prevents duplicate API calls
- Used for chart data and metrics fetching

---

## Currency Conversion Rules

### When Currency Conversion is Available

- **Admin/Developer + "All Licensees"**: ✅ Currency conversion enabled
- **Admin/Developer + Specific Licensee**: ❌ Native currency shown
- **Manager**: ❌ Native currency always shown
- **Other Roles**: ❌ Native currency always shown

### Conversion Process

1. Each cabinet's data in its licensee's native currency
2. Data converted to USD (base) if viewing "All Licensees"
3. Aggregated USD → Selected display currency

---

## Recent Updates

### Performance Optimization (November 2024)

- Fixed timeout issues for all time periods
- Single aggregation for 7d/30d periods
- Parallel batch processing for Today/Yesterday
- Today: TIMEOUT → 6.70s
- Yesterday: 59.5s → 6.16s
- 7 Days: TIMEOUT → 6.89s
- 30 Days: TIMEOUT → 20.37s

### Gaming Day Offset Fix (November 2024)

- Fixed issue where cabinets showed $0 when viewed before 8 AM
- Now correctly calculates current gaming day based on 8 AM start time

### Filter Improvements (October 2024)

- Mobile filter layout: Horizontally scrollable filters
- Online/Offline status filter: Fixed status filter logic
- Desktop filter layout: Clean layout without horizontal scrolling

### Cabinet Management (February 2026)

- **Manufacturer Field**: Added mandatory manufacturer field to cabinet creation and editing. Includes support for selecting from existing manufacturers or manually entering a new one.
