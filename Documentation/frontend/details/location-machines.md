# Location Machines Page

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Page Header](#page-header)
  - [Search and Filters](#search-and-filters)
  - [Machines Display](#machines-display)
  - [Financial Metrics](#financial-metrics)
  - [Machine Status Widget](#machine-status-widget)
  - [Pagination](#pagination)
  - [Action Modals](#action-modals)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Location Machines page displays all machines/cabinets assigned to a specific casino location with comprehensive filtering, sorting, and management capabilities. This page provides location-specific cabinet management with search, status filtering, and CRUD operations.

Key features include:
- Location-specific machine listing
- Advanced search and filtering capabilities
- Real-time machine status monitoring
- Financial metrics and performance data
- Create, edit, and delete machine operations
- Responsive design for desktop and mobile
- Role-based access control

## File Information

- **File:** `app/locations/[slug]/page.tsx` (machines view)
- **URL Pattern:** `/locations/[slug]` where `[slug]` is the location ID
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** All authenticated users with location access
- **Main Component:** `LocationPage` (within `app/locations/[slug]/page.tsx`)

## Page Sections

### Page Header

**Purpose:** Display location information, navigation controls, and action buttons.

**Components Used:**
- Location name and ID display
- Back navigation button
- Refresh button with loading indicator
- Add machine button (role-based permissions)

**Data Flow:**
- Fetches location data on component mount
- Displays location name and basic information
- Provides navigation back to locations list

**Key Functions:**
- `onBack` - Navigate back to locations list
- `handleRefresh` - Refresh all machine data

**Notes:**
- Shows location identifier and machine count
- Refresh button with spinning animation during loading
- Add machine button only visible for users with edit permissions

---

### Search and Filters

**Purpose:** Provide search and filtering capabilities for machines.

**Components Used:**
- Search input field
- Status filter dropdown (All/Online/Offline)
- Sort dropdowns (field and direction)

**Data Flow:**
1. User enters search term → Debounced API call
2. User selects status filter → Updates filtered results
3. User changes sort options → Re-sorts displayed data
4. All filters trigger data refresh or client-side filtering

**Key Functions:**
- Search input with debouncing
- Status filtering (All, Online, Offline)
- Sorting by multiple fields (asset number, game, last online, etc.)

**State Management:**
- `searchTerm` - Current search input value
- `selectedStatus` - Status filter selection
- `sortBy` - Sort field selection
- `sortOrder` - Sort direction ('asc' | 'desc')

**Notes:**
- Search filters by asset number, SMID, serial number, game type
- Real-time search with 300ms debouncing
- Status filtering shows online/offline machine counts
- Sort options include money in, gross, asset number, game, last online

---

### Machines Display

**Purpose:** Display machines in table or card format based on screen size.

**Components Used:**
- `LocationsDetailsCabinetsSection` (`components/CMS/locations/sections/LocationsDetailsCabinetsSection.tsx`)
- Desktop table view with all columns
- Mobile card view with essential information

**Data Flow:**
1. Fetches machines data for the location
2. Applies current search and filter criteria
3. Displays in appropriate format (table/cards)
4. Handles pagination for large datasets

**Key Functions:**
- `useLocationCabinetsData` (`lib/hooks/locations/useLocationCabinetsData.ts`) - Main data hook
- Responsive display logic (table vs cards)

**Table Columns:**
- Asset Number
- SMID
- Serial Number
- Game Type
- Money In
- Gross
- Status (Online/Offline)
- Last Online
- Actions (View, Edit, Delete)

**Notes:**
- Desktop: Full table with sortable columns
- Mobile: Card layout with key metrics
- Clickable rows for machine details navigation
- Status indicators with color coding

---

### Financial Metrics

**Purpose:** Display financial performance metrics for the location's machines.

**Components Used:**
- Financial metrics cards
- Calculation components for totals and percentages

**API Endpoints:**
- `GET /api/locationAggregation/[locationId]` - Fetch aggregated financial data

**Data Flow:**
1. Fetches aggregated financial data
2. Calculates totals across all machines
3. Displays formatted financial metrics

**Key Functions:**
- Financial calculation helpers
- Currency formatting utilities

**Metrics Displayed:**
- Total Money In
- Total Gross Revenue
- Win/Loss Ratio
- Average Machine Performance
- Location Revenue

**Notes:**
- Real-time financial calculations
- Formatted currency display
- Performance comparisons and trends

---

### Machine Status Widget

**Purpose:** Display machine online/offline status summary.

**Components Used:**
- `MachineStatusWidget` (`components/shared/ui/MachineStatusWidget.tsx`)
- Status calculation components

**API Endpoints:**
- `GET /api/locations/[locationId]/machine-status` - Fetch status counts

**Data Flow:**
1. Fetches machine status data
2. Calculates online/offline counts
3. Displays summary (e.g., "37/40 Online")

**Key Functions:**
- `useLocationMachineStats` (`lib/hooks/data.ts`) - Status data hook
- Status counting and formatting

**State Management:**
- `machineStats` - Status counts object
- `machineStatsLoading` - Loading state

**Notes:**
- Shows total machines vs online count
- Updates with date filter changes
- Color-coded status indicators

---

### Pagination

**Purpose:** Handle pagination for large machine datasets.

**Components Used:**
- `PaginationControls` (`components/shared/ui/PaginationControls.tsx`)
- Page navigation buttons

**Data Flow:**
1. User clicks page number → Updates current page
2. Triggers API call for new page data
3. Updates display with new machine set

**Key Functions:**
- `setCurrentPage` - Update current page
- Pagination calculation helpers

**State Management:**
- `currentPage` - Current page number (0-based)
- `totalPages` - Total available pages
- `itemsPerPage` - Machines per page

**Notes:**
- Configurable items per page
- First/Previous/Next/Last navigation
- Page number display with ellipsis for large page counts

---

### Action Modals

**Purpose:** Handle create, edit, and delete machine operations.

**Components Used:**
- `NewCabinetModal` (`components/CMS/cabinets/modals/NewCabinetModal.tsx`) - Create machine
- `EditCabinetModal` (`components/CMS/cabinets/EditCabinetModal/EditCabinetModal.tsx`) - Edit machine
- `DeleteCabinetModal` (`components/CMS/cabinets/modals/DeleteCabinetModal.tsx`) - Delete machine

**API Endpoints:**
- `POST /api/cabinets` - Create new machine
- `PUT /api/cabinets/[cabinetId]` - Update machine
- `DELETE /api/cabinets/[cabinetId]` - Delete machine

**Data Flow:**
1. User clicks action button → Opens appropriate modal
2. Modal pre-fills with current data (for edit)
3. User modifies data and submits
4. API call to create/update/delete machine
5. Modal closes on success, data refreshes

**Key Functions:**
- `openCabinetModal` (from `useNewCabinetStore`) - Open create modal
- `handleEdit` - Open edit modal with machine data
- `handleDelete` - Open delete confirmation modal

**Notes:**
- Role-based permissions for create/edit/delete
- Form validation before submission
- Success/error toast notifications
- Modal state management via Zustand stores

---

## API Endpoints

### Location Machines

- **GET `/api/locations/[locationId]/cabinets`**
  - **Purpose:** Fetch machines for specific location
  - **Query Parameters:**
    - `page` - Page number (default: 1)
    - `limit` - Items per page (default: 10)
    - `search` - Search term (asset number, SMID, serial, game)
    - `status` - Filter by status (All, Online, Offline)
    - `sortBy` - Sort field
    - `sortOrder` - Sort direction (asc, desc)
    - `licensee` - Licensee filter
  - **Response:** `{ success: true, data: Cabinet[], pagination: PaginationData }`
  - **Used By:** Main machines data fetching

### Machine CRUD Operations

- **POST `/api/cabinets`**
  - **Purpose:** Create new machine
  - **Body:** Machine creation data with location ID
  - **Response:** `{ success: true, data: Cabinet }`
  - **Used By:** Create machine modal

- **PUT `/api/cabinets/[cabinetId]`**
  - **Purpose:** Update machine information
  - **Body:** Machine update data
  - **Response:** `{ success: true, data: Cabinet }`
  - **Used By:** Edit machine modal

- **DELETE `/api/cabinets/[cabinetId]`**
  - **Purpose:** Delete machine
  - **Response:** `{ success: true }`
  - **Used By:** Delete confirmation modal

### Metrics and Status

- **GET `/api/locationAggregation/[locationId]`**
  - **Purpose:** Fetch aggregated financial data for location
  - **Query Parameters:** `startDate`, `endDate`, `timePeriod`
  - **Response:** `{ success: true, data: LocationAggregation }`
  - **Used By:** Financial metrics cards

- **GET `/api/locations/[locationId]/machine-status`**
  - **Purpose:** Fetch machine status counts
  - **Response:** `{ success: true, data: { total: number, online: number, offline: number } }`
  - **Used By:** Machine status widget

### Charts and Analytics

- **GET `/api/locations/[locationId]/chart`**
  - **Purpose:** Fetch chart data for location performance
  - **Query Parameters:** `startDate`, `endDate`, `timePeriod`
  - **Response:** `{ success: true, data: ChartData[] }`
  - **Used By:** Performance charts and trends

---

## State Management

### Hooks

- **`useLocationCabinetsData`** (`lib/hooks/locations/useLocationCabinetsData.ts`)
  - Main data fetching and state management hook
  - Handles machines data, pagination, filtering, search
  - Provides: `cabinetsData`, `loading`, `refreshCabinets`, `setCurrentPage`, `setSearchTerm`

- **`useLocationChartData`** (`lib/hooks/locations/useLocationChartData.ts`)
  - Manages chart data and date filtering
  - Provides chart visualization data

- **`useLocationMachineStats`** (`lib/hooks/data.ts`)
  - Fetches machine status statistics
  - Provides: `machineStats`, `machineStatsLoading`, `refreshMachineStats`

### Stores

- **`useDashBoardStore`** (`lib/store/dashboardStore.ts`) - Zustand store
  - `selectedLicencee` - Selected licensee filter
  - `activeMetricsFilter` - Active date filter type
  - `customDateRange` - Custom date range
  - `setSelectedLicencee` - Licensee selection setter

- **`useUserStore`** (`lib/store/userStore.ts`) - Zustand store
  - `user` - Current user object
  - Used for role-based permissions

- **`useNewCabinetStore`** (`lib/store/newCabinetStore.ts`) - Zustand store
  - `openCabinetModal` - Function to open create machine modal
  - Modal state management for machine creation

- **`useMemberActionsStore`** (`lib/store/memberActionsStore.ts`) - Zustand store
  - Edit and delete modal state management

### State Properties

**From `useLocationCabinetsData` hook:**
- `cabinetsData` - Machines data and loading states
- `currentPage` - Current pagination page
- `totalReports` - Total machine count
- `locations` - Available locations list
- `locationsWithMachines` - Locations with machine counts
- `selectedStatus` - Status filter (All/Online/Offline)

**From main component:**
- `searchTerm` - Search input value
- `sortBy` - Sort field selection
- `sortOrder` - Sort direction
- `machineStats` - Machine status counts
- `machineStatsLoading` - Status loading state

---

## Key Functions

### Data Fetching

- **`fetchLocationCabinets`** (`useLocationCabinetsData` hook)
  - Fetches machines for the location
  - Applies current search and filter criteria
  - Handles pagination and sorting

- **`refreshCabinets`** (`useLocationCabinetsData` hook)
  - Refreshes machines data
  - Clears cache and reloads from API

- **`fetchMachineStats`** (`useLocationMachineStats` hook)
  - Fetches machine status counts
  - Updates online/offline statistics

### Filtering and Search

- **`setSearchTerm`** (`useLocationCabinetsData` hook)
  - Updates search term with debouncing
  - Triggers filtered data fetch

- **`handleFilterChange`** (main component)
  - Updates status filter
  - Refreshes data with new filter

- **`handleSort`** (sorting functions)
  - Updates sort field and direction
  - Re-sorts displayed data

### CRUD Operations

- **`openCabinetModal`** (`useNewCabinetStore`)
  - Opens create machine modal
  - Pre-fills location data

- **`handleEdit`** (main component)
  - Opens edit machine modal
  - Loads current machine data

- **`handleDelete`** (main component)
  - Opens delete confirmation modal
  - Handles machine deletion

### Navigation and UI

- **`onBack`** (navigation function)
  - Navigates back to locations list
  - Uses Next.js router

- **`handleRefresh`** (main component)
  - Refreshes all location data
  - Updates machines, charts, and statistics

### Utility Functions

- **`formatCurrency`** (`lib/utils/currency.ts`)
  - Formats currency values for display
  - Handles different currency formats

- **`calculateLocationTotal`** (calculation helpers)
  - Calculates financial totals for location
  - Aggregates machine performance data

---

## Additional Notes

### Location Context

- **Location-Specific**: All data filtered by current location ID
- **URL-Based**: Location ID from URL slug parameter
- **Permission-Based**: Access restricted to user's allowed locations
- **Dynamic Loading**: Data loads based on URL location parameter

### Search and Filtering

- **Multi-Field Search**: Searches asset number, SMID, serial number, game type
- **Debounced Input**: 300ms delay to reduce API calls
- **Real-Time Updates**: Filters apply immediately with data refresh
- **Status Filtering**: All/Online/Offline with count displays

### Responsive Design

- **Desktop**: Full table with all columns, advanced filtering
- **Mobile**: Card layout with essential information, simplified filters
- **Touch-Friendly**: Mobile-optimized buttons and interactions
- **Horizontal Scroll**: Mobile filters scroll horizontally

### Role-Based Access

- **Admin/Developer**: Full CRUD operations on all machines
- **Manager**: CRUD operations on assigned licensee locations
- **Collector/Location Admin**: Limited CRUD on assigned locations
- **Technician**: View-only access (may be redirected)

### Performance Optimizations

- **Batch Loading**: Machines loaded in configurable batches
- **Pagination**: Efficient handling of large machine lists
- **Debounced Search**: Reduces API call frequency
- **Optimized Queries**: Database queries optimized for location filtering

### Error Handling

- **Loading States**: Skeleton loaders for all async operations
- **Error Messages**: User-friendly error display
- **Retry Logic**: Automatic retry for failed requests
- **Graceful Degradation**: Fallback states for network issues

### Integration Points

- **Dashboard Filters**: Uses shared date filtering from dashboard store
- **Licensee Selection**: Integrated with global licensee filtering
- **Machine Status**: Real-time updates via WebSocket/MQTT
- **Financial Calculations**: Shared calculation utilities
- **Navigation**: Seamless integration with location details page
