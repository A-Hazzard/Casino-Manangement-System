# API Usage Per Page

This document tracks which API endpoints are used by each page in the application.

**Last Updated:** November 22, 2025

---

## Dashboard Page (`app/page.tsx`)

**Route:** `/` (Home/Dashboard)

### API Endpoints Used:

1. **`GET /api/locations`**
   - **Purpose:** Fetch gaming locations for the map and location selector
   - **Called by:** `loadGamingLocations()` helper
   - **Parameters:**
     - `minimal=1` - Lightweight fetch
     - `licencee` - Optional licensee filter
     - `forceAll=true` - Force all locations (admin only)
     - `showAll=true` - Show all locations
   - **Used for:** Location dropdown, map display

2. **`GET /api/dashboard/totals`**
   - **Purpose:** Fetch dashboard totals (moneyIn, moneyOut, gross)
   - **Called by:** `fetchDashboardTotals()` helper
   - **Parameters:**
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, Custom)
     - `startDate` - Custom start date (if Custom period)
     - `endDate` - Custom end date (if Custom period)
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
   - **Used for:** Dashboard totals cards (moneyIn, moneyOut, gross)

3. **`GET /api/metrics/meters`** (via `switchFilter` → `getMetrics`)
   - **Purpose:** Fetch meter trend data for chart
   - **Called by:** `switchFilter()` → `getMetrics()` helper
   - **Parameters:**
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, Custom)
     - `startDate` - Custom start date (ISO string, if Custom period)
     - `endDate` - Custom end date (ISO string, if Custom period)
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
   - **Used for:** Line chart showing revenue trends (hourly for Today/Yesterday, daily for 7d/30d/Custom)

4. **`GET /api/metrics/top-performing`**
   - **Purpose:** Fetch top 5 performing locations or cabinets
   - **Called by:** `fetchTopPerformingData()` helper
   - **Parameters:**
     - `type` - 'locations' or 'cabinets'
     - `timePeriod` - Time period filter
     - `licencee` - Optional licensee filter
   - **Used for:** Pie chart showing top performing locations/cabinets

### Data Flow:

```
Dashboard Page
├── loadGamingLocations()
│   └── GET /api/locations
├── fetchMetricsData()
│   ├── fetchDashboardTotals()
│   │   └── GET /api/dashboard/totals
│   └── switchFilter()
│       └── getMetrics()
│           └── GET /api/metrics/meters
└── fetchTopPerformingDataHelper()
    └── fetchTopPerformingData()
        └── GET /api/metrics/top-performing
```

### Refresh Behavior:

- All endpoints are re-fetched when:
  - `activeMetricsFilter` changes
  - `selectedLicencee` changes
  - `customDateRange` changes
  - `displayCurrency` changes
  - `activePieChartFilter` changes
  - `activeTab` changes (for top performing data)
  - User clicks refresh button

---

## Locations Page (`app/locations/[slug]/page.tsx`)

**Route:** `/locations/[slug]` (Location cabinets view)

### API Endpoints Used:

1. **`GET /api/locations/${locationId}`**
   - **Purpose:** Fetch location details and cabinets for a specific location
   - **Called by:** Direct axios call in `useEffect`
   - **Parameters:**
     - `locationId` - Location ID from route params
     - `timePeriod` - Time period filter (via `fetchCabinetsForLocation`)
     - `licencee` - Optional licensee filter
     - `search` - Optional search term
     - `page` - Optional page number for pagination
     - `limit` - Optional items per page
     - `startDate` - Custom start date (if Custom period)
     - `endDate` - Custom end date (if Custom period)
   - **Used for:** Location name, access verification, cabinets list

2. **`GET /api/locations/${locationId}`** (via `fetchCabinetsForLocation`)
   - **Purpose:** Fetch cabinets for the location with filtering and pagination
   - **Called by:** `fetchCabinetsForLocation()` helper
   - **Parameters:** Same as above
   - **Used for:** Cabinet grid/table display with pagination

3. **`GET /api/locations`** (via `fetchAllGamingLocations`)
   - **Purpose:** Fetch all gaming locations for location selector
   - **Called by:** `fetchAllGamingLocations()` helper
   - **Parameters:**
     - `licencee` - Optional licensee filter
   - **Used for:** Location dropdown/selector

### Data Flow:

```
Locations Page
├── Direct axios call
│   └── GET /api/locations/${locationId} (for access check)
├── fetchCabinetsForLocation()
│   └── GET /api/locations/${locationId} (with filters, pagination)
└── fetchAllGamingLocations()
    └── GET /api/locations
```

### Refresh Behavior:

- All endpoints are re-fetched when:
  - `locationId` changes (route param)
  - `activeMetricsFilter` changes
  - `selectedLicencee` changes
  - `searchTerm` changes (debounced)
  - `currentPage` changes
  - User clicks refresh button

---

## Location Details Page (`app/locations/[slug]/details/page.tsx`)

**Route:** `/locations/[slug]/details` (Location details view)

### API Endpoints Used:

1. **`GET /api/locations/${locationId}?basicInfo=true`** (via `fetchLocationDetails`)
   - **Purpose:** Fetch location details (name, address, etc.)
   - **Called by:** `fetchLocationDetails()` helper
   - **Parameters:**
     - `locationId` - Location ID from route params
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
   - **Used for:** Location info display

2. **`GET /api/locations/${locationId}/cabinets`** (via `fetchCabinets`)
   - **Purpose:** Fetch cabinets for the location with metrics
   - **Called by:** `fetchCabinets()` helper
   - **Parameters:**
     - `locationId` - Location ID from route params
     - `timePeriod` - Time period filter
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
   - **Used for:** Cabinet table/cards display with financial metrics

### Data Flow:

```
Location Details Page
├── fetchLocationDetails()
│   └── GET /api/locations/${locationId}?basicInfo=true
└── fetchCabinets()
    └── GET /api/locations/${locationId}/cabinets
```

### Refresh Behavior:

- All endpoints are re-fetched when:
  - `slug` changes (route param)
  - `activeMetricsFilter` changes
  - `selectedLicencee` changes
  - `displayCurrency` changes
  - User clicks refresh button

---

## Machines Page (`app/machines/page.tsx`)

**Route:** `/machines` (Cabinets/Machines overview)

### API Endpoints Used:

1. **`GET /api/machines/aggregation`**
   - **Purpose:** Fetch all cabinets/machines with optional filtering, search, and pagination
   - **Called by:** `fetchCabinets()` helper (via `useCabinetData` hook)
   - **Parameters:**
     - `licensee` - Optional licensee filter
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, Custom)
     - `startDate` - Custom start date (if Custom period)
     - `endDate` - Custom end date (if Custom period)
     - `currency` - Display currency code
     - `page` - Page number for pagination
     - `limit` - Items per page
     - `search` - Search term for filtering cabinets
   - **Used for:** Main cabinets table/grid display with financial metrics, search, and pagination
   - **Response Format:**
     - `{ success: true, data: Cabinet[], pagination?: {...} }` (paginated)
     - `Cabinet[]` (array, backward compatibility)

2. **`GET /api/machines/locations`**
   - **Purpose:** Fetch all locations that have cabinets, optionally filtered by licensee
   - **Called by:** `fetchCabinetLocations()` helper (via `useCabinetData` hook)
   - **Parameters:**
     - `licensee` - Optional licensee filter (also accepts `licencee` spelling)
   - **Used for:** Location filter dropdown
   - **Response Format:**
     - `{ locations: Location[] }` or `{ data: Location[] }` or `Location[]`

### Data Flow:

```
Machines Page
├── useCabinetData hook
│   ├── loadLocations()
│   │   └── fetchCabinetLocations()
│   │       └── GET /api/machines/locations
│   └── loadCabinets()
│       └── fetchCabinets()
│           └── GET /api/machines/aggregation
└── Frontend filtering (location, game type, status)
```

### Refresh Behavior:

- All endpoints are re-fetched when:
  - `selectedLicencee` changes
  - `activeMetricsFilter` changes
  - `customDateRange` changes
  - `displayCurrency` changes
  - `searchTerm` changes (debounced 500ms)
  - `currentPage` changes
  - User clicks refresh button

### Frontend Filtering:

- The page applies additional client-side filters on top of API results:
  - **Location filter:** Filters by `locationId`
  - **Game type filter:** Filters by `game` or `installedGame`
  - **Status filter:** Filters by `online` status (Online/Offline)
- Search filtering is handled by the API when `searchTerm` is provided

---

## Members Page (`app/members/page.tsx`)

**Route:** `/members` (Member management and analytics)

### API Endpoints Used:

#### Members List Tab (`MembersListTab`):

1. **`GET /api/members`**
   - **Purpose:** Fetch members list with pagination, search, and sorting
   - **Called by:** `fetchMembers()` function in `MembersListTab` component
   - **Parameters:**
     - `page` - Page number (batch number, 1-based)
     - `limit` - Items per batch (50)
     - `search` - Search term for filtering members
     - `sortBy` - Sort field (name, playerId, points, sessions, totalHandle, totalWon, totalLost, lastSession, status, locationName, winLoss, lastLogin)
     - `sortOrder` - Sort direction ('asc' or 'desc')
   - **Used for:** Members table/cards display with pagination
   - **Response Format:** `{ success: true, data: { members: Member[], pagination: {...} } }`

2. **`POST /api/members`** (via `NewMemberModal`)
   - **Purpose:** Create a new member
   - **Called by:** `NewMemberModal` component
   - **Parameters:** Request body contains new member data
   - **Used for:** Adding new members

3. **`PUT /api/members/${memberId}`** (via `EditMemberModal`)
   - **Purpose:** Update an existing member
   - **Called by:** `EditMemberModal` component
   - **Parameters:** Request body contains updated member data
   - **Used for:** Editing member details

4. **`DELETE /api/members/${memberId}`** (via `DeleteMemberModal`)
   - **Purpose:** Delete a member
   - **Called by:** `DeleteMemberModal` component
   - **Parameters:** Member ID in path
   - **Used for:** Removing members

5. **`POST /api/activity-logs`** (via modals)
   - **Purpose:** Log member-related activities (create, update, delete)
   - **Called by:** `NewMemberModal`, `EditMemberModal`, `DeleteMemberModal` components
   - **Parameters:** Request body contains activity log data
   - **Used for:** Activity tracking

#### Members Summary Tab (`MembersSummaryTab`):

1. **`GET /api/members/summary`**
   - **Purpose:** Fetch members summary with statistics and analytics
   - **Called by:** `fetchMembersSummary()` function in `MembersSummaryTab` component
   - **Parameters:**
     - `page` - Page number (1-based)
     - `limit` - Items per page (10)
     - `search` - Search term for filtering members
     - `location` - Location filter (location ID)
     - `dateFilter` - Date filter (today, yesterday, week, month, all, custom)
     - `startDate` - Custom start date (ISO string, if custom dateFilter)
     - `endDate` - Custom end date (ISO string, if custom dateFilter)
     - `filterBy` - Filter field ('lastLogin')
     - `licencee` - Optional licensee filter
   - **Used for:** Members summary report with statistics
   - **Response Format:** `{ data: { members: Member[], summary: {...}, pagination: {...} } }`

2. **`GET /api/machines/locations`**
   - **Purpose:** Fetch all locations that have machines for location filter dropdown
   - **Called by:** `fetchLocations()` function in `MembersSummaryTab` component
   - **Parameters:** None
   - **Used for:** Location filter dropdown in summary tab
   - **Response Format:** `{ locations: Location[] }`

### Data Flow:

```
Members Page
├── MembersListTab
│   ├── fetchMembers()
│   │   └── GET /api/members
│   ├── NewMemberModal
│   │   ├── POST /api/members
│   │   └── POST /api/activity-logs
│   ├── EditMemberModal
│   │   ├── PUT /api/members/${memberId}
│   │   └── POST /api/activity-logs
│   └── DeleteMemberModal
│       ├── DELETE /api/members/${memberId}
│       └── POST /api/activity-logs
└── MembersSummaryTab
    ├── fetchMembersSummary()
    │   └── GET /api/members/summary
    └── fetchLocations()
        └── GET /api/machines/locations
```

### Refresh Behavior:

**Members List Tab:**

- Re-fetches when:
  - `searchTerm` changes
  - `sortOption` changes
  - `sortOrder` changes
  - User navigates to a new page (batch loading)
  - Member is created/updated/deleted (via modals)
  - User clicks refresh button

**Members Summary Tab:**

- Re-fetches when:
  - `activeMetricsFilter` changes
  - `customDateRange` changes
  - `searchTerm` changes
  - `locationFilter` changes
  - `currentPage` changes
  - `selectedLicencee` changes
  - User clicks refresh button

### Pagination Strategy:

- **Members List Tab:** Uses batch loading (50 items per batch, 5 pages per batch) to optimize performance
- **Members Summary Tab:** Uses standard pagination (10 items per page)

---

## Reports Page (`app/reports/page.tsx`)

**Route:** `/reports` (Comprehensive analytics and reporting)

### API Endpoints Used:

#### Locations Tab (`LocationsTab`):

1. **`GET /api/locations`**
   - **Purpose:** Fetch gaming locations for location selector and map display
   - **Called by:** `fetchGamingLocationsAsync()` function in `LocationsTab` component
   - **Parameters:**
     - `licencee` - Optional licensee filter
   - **Used for:** Location dropdown selector and map display
   - **Response Format:** `{ locations: Location[] }`

2. **`GET /api/locationAggregation`**
   - **Purpose:** Fetch aggregated location data with financial metrics
   - **Called by:** `fetchLocationDataAsync()` function in `LocationsTab` component
   - **Parameters:**
     - `licencee` - Optional licensee filter
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, All Time, Custom)
     - `startDate` - Custom start date (YYYY-MM-DD, if Custom period)
     - `endDate` - Custom end date (YYYY-MM-DD, if Custom period)
     - `currency` - Display currency code
   - **Used for:** Location revenue analysis with financial metrics (moneyIn, moneyOut, gross, etc.)
   - **Response Format:** `{ data: AggregatedLocation[] }`

3. **`GET /api/reports/machines`**
   - **Purpose:** Fetch machine data for location-specific machine analysis
   - **Called by:** `fetchLocationDataAsync()` function in `LocationsTab` component
   - **Parameters:**
     - `type` - Report type ('overview' or 'stats')
     - `locations` - Comma-separated location IDs
     - `timePeriod` - Time period filter
     - `startDate` - Custom start date (if Custom period)
     - `endDate` - Custom end date (if Custom period)
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
   - **Used for:** Machine statistics and overview for selected locations

4. **`GET /api/analytics/location-trends`**
   - **Purpose:** Fetch location trend data for charts
   - **Called by:** `LocationsTab` component
   - **Parameters:**
     - `locationId` - Location ID
     - `timePeriod` - Time period filter
     - `startDate` - Custom start date (if Custom period)
     - `endDate` - Custom end date (if Custom period)
   - **Used for:** Location trend charts and analytics

#### Machines Tab (`MachinesTab`):

1. **`GET /api/locations`**
   - **Purpose:** Fetch gaming locations for location filter dropdown
   - **Called by:** `fetchLocationsData()` function in `MachinesTab` component
   - **Parameters:**
     - `licensee` - Optional licensee filter
   - **Used for:** Location filter dropdown
   - **Response Format:** `{ locations: Location[] }`

2. **`GET /api/reports/machines`**
   - **Purpose:** Fetch machine statistics, overview, and detailed data
   - **Called by:** Multiple functions in `MachinesTab` component:
     - `fetchMachineStats()` - Machine statistics
     - `fetchOverviewMachines()` - Machine overview (paginated)
     - `fetchEvaluationMachines()` - Machine evaluation data
     - `fetchOfflineMachines()` - Offline machines data
   - **Parameters:**
     - `type` - Report type ('stats', 'overview', 'evaluation', 'offline')
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, Custom)
     - `startDate` - Custom start date (ISO string, if Custom period)
     - `endDate` - Custom end date (ISO string, if Custom period)
     - `licencee` - Optional licensee filter
     - `onlineStatus` - Online status filter ('online', 'offline', 'all')
     - `currency` - Display currency code
     - `page` - Page number for pagination (for overview type)
     - `limit` - Items per page (for overview type)
     - `locations` - Comma-separated location IDs (for evaluation/offline types)
   - **Used for:** Machine statistics cards, machine overview table, evaluation data, offline machines list
   - **Response Format:** Varies by type (stats, overview with pagination, evaluation, offline)

#### Meters Tab (`MetersTab`):

1. **`GET /api/auth/current-user`**
   - **Purpose:** Fetch current user information for access control
   - **Called by:** `MetersTab` component
   - **Parameters:** None
   - **Used for:** User role checking and access control

2. **`GET /api/locations`**
   - **Purpose:** Fetch gaming locations for location filter
   - **Called by:** `fetchLocations()` function in `MetersTab` component
   - **Parameters:**
     - `licencee` - Optional licensee filter
   - **Used for:** Location filter dropdown
   - **Response Format:** `{ locations: Location[] }`

3. **`GET /api/reports/meters`**
   - **Purpose:** Fetch meters report data with hourly chart data
   - **Called by:** `fetchMetersData()` function in `MetersTab` component
   - **Parameters:**
     - `locations` - Comma-separated location IDs
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, Custom)
     - `startDate` - Custom start date (YYYY-MM-DD, if Custom period)
     - `endDate` - Custom end date (YYYY-MM-DD, if Custom period)
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
     - `page` - Page number for pagination
     - `limit` - Items per batch (50)
     - `includeHourlyData` - Include hourly chart data ('true' when locations selected)
   - **Used for:** Meters report table with financial metrics and hourly chart
   - **Response Format:** `{ data: MetersReportData[], hourlyChartData?: Array<{day, hour, gamesPlayed, coinIn, coinOut}> }`

### Data Flow:

```
Reports Page
├── LocationsTab
│   ├── fetchGamingLocationsAsync()
│   │   └── GET /api/locations
│   ├── fetchLocationDataAsync()
│   │   ├── GET /api/locationAggregation
│   │   ├── GET /api/reports/machines
│   │   └── GET /api/analytics/location-trends
├── MachinesTab
│   ├── fetchLocationsData()
│   │   └── GET /api/locations
│   ├── fetchMachineStats()
│   │   └── GET /api/reports/machines (type=stats)
│   ├── fetchOverviewMachines()
│   │   └── GET /api/reports/machines (type=overview)
│   ├── fetchEvaluationMachines()
│   │   └── GET /api/reports/machines (type=evaluation)
│   └── fetchOfflineMachines()
│       └── GET /api/reports/machines (type=offline)
└── MetersTab
    ├── GET /api/auth/current-user
    ├── fetchLocations()
    │   └── GET /api/locations
    └── fetchMetersData()
        └── GET /api/reports/meters
```

### Refresh Behavior:

**All Tabs:**

- Re-fetch when:
  - `activeMetricsFilter` changes
  - `customDateRange` changes
  - `selectedLicencee` changes
  - `displayCurrency` changes
  - Location filters change
  - User clicks refresh button

**Locations Tab:**

- Additional triggers:
  - `selectedLocations` changes
  - Active sub-tab changes (Revenue Analysis, Machine Analysis, etc.)

**Machines Tab:**

- Additional triggers:
  - `onlineStatusFilter` changes
  - `currentPage` changes (for overview pagination)
  - Active sub-tab changes (Overview, Evaluation, Offline)

**Meters Tab:**

- Additional triggers:
  - `selectedLocations` changes
  - `currentPage` changes (batch loading)
  - `searchTerm` changes

### Tab Access Control:

- **Developers:** All tabs (Locations, Machines, Meters)
- **Admins and Location Admins:** Meters and Locations tabs only
- **Others:** Meters tab only

---

## Collection Report Page (`app/collection-report/page.tsx`)

**Route:** `/collection-report` (Collection report management and analytics)

### API Endpoints Used:

#### Collection Tab:

1. **`GET /api/collection-reports`**
   - **Purpose:** Fetch collection reports with pagination and filtering
   - **Called by:** Direct axios call in `useEffect` (for checking unfinished edits) and `fetchCollectionReportsByLicencee()` helper
   - **Parameters:**
     - `isEditing` - Filter for reports with `isEditing: true` (for auto-resume)
     - `limit` - Items per page
     - `sortBy` - Sort field ('updatedAt')
     - `sortOrder` - Sort direction ('desc')
   - **Used for:** Checking for unfinished edits on page load
   - **Response Format:** `CollectionReport[]`

2. **`GET /api/collectionReport`** (via `fetchCollectionReportsByLicencee`)
   - **Purpose:** Fetch collection reports by licensee with date filtering and pagination
   - **Called by:** `fetchCollectionReportsByLicencee()` helper function
   - **Parameters:**
     - `licencee` - Licensee filter
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, All Time, Custom)
     - `startDate` - Custom start date (if Custom period)
     - `endDate` - Custom end date (if Custom period)
     - `page` - Page number (batch number, 1-based)
     - `limit` - Items per batch (50)
   - **Used for:** Main collection reports list with batch pagination
   - **Response Format:** `{ data: CollectionReportRow[] }`

3. **`GET /api/collectionReport/locations`** (via `getLocationsWithMachines`)
   - **Purpose:** Fetch locations with machines for collection report creation/editing
   - **Called by:** `getLocationsWithMachines()` helper function
   - **Parameters:** None
   - **Used for:** Location selector in create/edit modals
   - **Response Format:** `CollectionReportLocationWithMachines[]`

4. **`GET /api/locations`** (via `fetchAllGamingLocations`)
   - **Purpose:** Fetch all gaming locations for filter dropdown
   - **Called by:** `fetchAllGamingLocations()` helper function
   - **Parameters:**
     - `licencee` - Optional licensee filter
   - **Used for:** Location filter dropdown
   - **Response Format:** `Location[]`

5. **`DELETE /api/collection-report/${reportId}`**
   - **Purpose:** Delete a collection report and all associated collections
   - **Called by:** `confirmDeleteCollectionReport()` function in page component
   - **Parameters:** Report ID in path
   - **Used for:** Deleting collection reports
   - **Response Format:** `{ success: boolean }`

6. **`POST /api/collectionReport`** (via modals)
   - **Purpose:** Create a new collection report
   - **Called by:** `NewCollectionModal` and `MobileCollectionModal` components (via `createCollectionReport` helper)
   - **Parameters:** Request body contains new collection report data
   - **Used for:** Creating new collection reports

7. **`GET /api/collection-report/${reportId}`** (via modals)
   - **Purpose:** Fetch a specific collection report for editing
   - **Called by:** `EditCollectionModal` and `MobileEditCollectionModal` components (via `fetchCollectionReportById` helper)
   - **Parameters:** Report ID in path
   - **Used for:** Loading report data for editing

8. **`PUT /api/collection-report/${reportId}`** (via modals)
   - **Purpose:** Update an existing collection report
   - **Called by:** `EditCollectionModal` and `MobileEditCollectionModal` components (via `updateCollectionReport` helper)
   - **Parameters:** Report ID in path, request body contains updated data
   - **Used for:** Updating collection reports

9. **`POST /api/collection-report/sync-meters`** (via modals)
   - **Purpose:** Sync meters for a collection report
   - **Called by:** Collection report modals (via `syncMetersForReport` helper)
   - **Parameters:** Request body contains report ID and sync options
   - **Used for:** Synchronizing meter data for reports

10. **`GET /api/machines`** (via helpers)
    - **Purpose:** Fetch machines for collection report operations
    - **Called by:** Various helper functions in `collectionReport.ts`
    - **Parameters:** Various (location filters, etc.)
    - **Used for:** Machine data retrieval for collection operations

11. **`GET /api/metrics/meters`** (via helpers)
    - **Purpose:** Fetch meter metrics for collection reports
    - **Called by:** Helper functions in `collectionReport.ts`
    - **Parameters:** Various (time period, location, etc.)
    - **Used for:** Meter metrics calculation

#### Monthly Report Tab:

1. **`GET /api/collectionReport`** (via `fetchMonthlyReportSummaryAndDetails`)
   - **Purpose:** Fetch monthly report summary and details
   - **Called by:** `fetchMonthlyReportSummaryAndDetails()` helper function
   - **Parameters:**
     - `startDate` - Start date for monthly report
     - `endDate` - End date for monthly report
     - `locationName` - Optional location filter
     - `licencee` - Optional licensee filter
   - **Used for:** Monthly report summary and details table
   - **Response Format:** `{ summary: MonthlyReportSummary, details: MonthlyReportDetailsRow[] }`

2. **`GET /api/collectionReport/locations`** (via `fetchAllLocationNames`)
   - **Purpose:** Fetch all location names for monthly report filter
   - **Called by:** `fetchAllLocationNames()` helper function
   - **Parameters:** None
   - **Used for:** Location filter dropdown in monthly report
   - **Response Format:** `string[]` (location names)

#### Manager Schedule Tab:

1. **`GET /api/schedulers`** (via `fetchAndFormatSchedulers`)
   - **Purpose:** Fetch manager schedules with filtering
   - **Called by:** `fetchAndFormatSchedulers()` helper function
   - **Parameters:**
     - `location` - Optional location filter
     - `collector` - Optional collector filter
     - `status` - Optional status filter
   - **Used for:** Manager schedule table display
   - **Response Format:** `{ schedulers: SchedulerTableRow[], collectors: string[] }`

#### Collector Schedule Tab:

1. **`GET /api/schedulers`** (via `fetchAndFormatCollectorSchedules`)
   - **Purpose:** Fetch collector schedules with filtering
   - **Called by:** `fetchAndFormatCollectorSchedules()` helper function
   - **Parameters:**
     - `licencee` - Optional licensee filter
     - `location` - Optional location filter
     - `collector` - Optional collector filter
     - `status` - Optional status filter
   - **Used for:** Collector schedule table display
   - **Response Format:** `{ collectorSchedules: CollectorSchedule[], collectors: string[] }`

#### Collection Report Detail Page (`app/collection-report/report/[reportId]/page.tsx`):

1. **`GET /api/collection-report/${reportId}`**
   - **Purpose:** Fetch detailed collection report data
   - **Called by:** Direct axios call in page component
   - **Parameters:** Report ID in path
   - **Used for:** Displaying collection report details

2. **`POST /api/collection-reports/check-all-issues`**
   - **Purpose:** Check all issues in a collection report
   - **Called by:** Direct axios call in page component
   - **Parameters:** Request body contains report ID
   - **Used for:** Issue detection and reporting

3. **`POST /api/collection-reports/fix-report`**
   - **Purpose:** Fix all issues in a collection report
   - **Called by:** Direct axios call in page component
   - **Parameters:** Request body contains report ID and fix options
   - **Used for:** Automated issue fixing

### Data Flow:

```
Collection Report Page
├── Collection Tab
│   ├── GET /api/collection-reports (check unfinished edits)
│   ├── fetchCollectionReportsByLicencee()
│   │   └── GET /api/collectionReport
│   ├── fetchAllGamingLocations()
│   │   └── GET /api/locations
│   ├── getLocationsWithMachines()
│   │   └── GET /api/collectionReport/locations
│   ├── NewCollectionModal
│   │   ├── POST /api/collectionReport
│   │   └── POST /api/collection-report/sync-meters
│   ├── EditCollectionModal
│   │   ├── GET /api/collection-report/${reportId}
│   │   ├── PUT /api/collection-report/${reportId}
│   │   └── POST /api/collection-report/sync-meters
│   └── DELETE /api/collection-report/${reportId}
├── Monthly Report Tab
│   ├── fetchMonthlyReportSummaryAndDetails()
│   │   └── GET /api/collectionReport
│   └── fetchAllLocationNames()
│       └── GET /api/collectionReport/locations
├── Manager Schedule Tab
│   └── fetchAndFormatSchedulers()
│       └── GET /api/schedulers
└── Collector Schedule Tab
    └── fetchAndFormatCollectorSchedules()
        └── GET /api/schedulers
```

### Refresh Behavior:

**Collection Tab:**

- Re-fetches when:
  - `activeTab` changes to 'collection'
  - `selectedLicencee` changes
  - `activeMetricsFilter` changes
  - `customDateRange` changes
  - `currentPage` changes (batch loading)
  - User clicks refresh button
  - Report is created/updated/deleted

**Monthly Report Tab:**

- Re-fetches when:
  - `activeTab` changes to 'monthly'
  - `monthlyDateRange` changes
  - `monthlyLocation` changes
  - `selectedLicencee` changes

**Manager Schedule Tab:**

- Re-fetches when:
  - `activeTab` changes to 'manager'
  - `selectedSchedulerLocation` changes
  - `selectedCollector` changes
  - `selectedStatus` changes

**Collector Schedule Tab:**

- Re-fetches when:
  - `activeTab` changes to 'collector'
  - `selectedLicencee` changes
  - `selectedCollectorLocation` changes
  - `selectedCollectorFilter` changes
  - `selectedCollectorStatus` changes

### Pagination Strategy:

- **Collection Tab:** Uses batch loading (50 items per batch, 5 pages per batch) to optimize performance
- **Monthly Report Tab:** Uses standard pagination (10 items per page)

### Edit Permissions:

- **Developers:** Can edit any report
- **Managers, Admins:** Can edit only the most recent report per location
- **Collectors, Technicians:** Cannot edit/delete (can only create)

---

---

## Member Details Page (`app/members/[id]/page.tsx`)

**Route:** `/members/[id]` (Individual member details and session history)

### API Endpoints Used:

1. **`GET /api/members/${memberId}`**
   - **Purpose:** Fetch member details and basic information
   - **Called by:** Direct axios call in `fetchMemberData()` function
   - **Parameters:**
     - `memberId` - Member ID from route params
   - **Used for:** Member header display (name, player ID, points, status, etc.)
   - **Response Format:** `Member` object
   - **Refactored:** ✅ Yes

2. **`GET /api/members/${memberId}/sessions`**
   - **Purpose:** Fetch member sessions with filtering, pagination, and export support
   - **Called by:** Direct axios call in `fetchMemberData()` and `handleExport()` functions
   - **Parameters:**
     - `memberId` - Member ID from route params
     - `filter` - Filter type ('session', 'day', 'week', 'month')
     - `page` - Page number (1-based)
     - `limit` - Items per page (10 for display, 10000 for export)
     - `export` - Export flag ('true' for export requests)
   - **Used for:**
     - Session table display with pagination
     - CSV export functionality
   - **Response Format:** `{ success: boolean, data: { sessions: Session[], pagination: {...} } }`
   - **Refactored:** ✅ Yes

### Data Flow:

```
Member Details Page
├── fetchMemberData()
│   ├── GET /api/members/${memberId}
│   └── GET /api/members/${memberId}/sessions
└── handleExport()
    └── GET /api/members/${memberId}/sessions (with export=true)
```

### Refresh Behavior:

- Re-fetches when:
  - `memberId` changes (route param)
  - `filter` changes (session/day/week/month)
  - `currentPage` changes
  - User clicks refresh button

### Features:

- **Filter Options:** View sessions by session, day, week, or month
- **Sorting:** Sort by time, session length, money in/out, jackpot, won/less, points, games played/won, coin in/out
- **Pagination:** 10 sessions per page
- **Export:** CSV export of all session data (up to 10,000 sessions)
- **Financial Summary:** Toggle to show/hide member totals card

---

## Location Details Page (`app/locations/[slug]/details/page.tsx`)

**Route:** `/locations/[slug]/details` (Location details with cabinet list and metrics)

### API Endpoints Used:

1. **`GET /api/locations/${locationId}?basicInfo=true`** (via `fetchLocationDetails`)
   - **Purpose:** Fetch location basic information (name, address, licensee)
   - **Called by:** `fetchLocationDetails()` helper function
   - **Parameters:**
     - `locationId` - Location ID (slug) from route params
     - `basicInfo=true` - Flag to fetch only basic info
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
   - **Used for:** Location information display
   - **Response Format:** `LocationInfo` object
   - **Refactored:** ✅ Yes

2. **`GET /api/locations/${locationId}`** (via `fetchCabinets`)
   - **Purpose:** Fetch cabinets for a location with financial metrics
   - **Called by:** `fetchCabinets()` helper function
   - **Parameters:**
     - `locationId` - Location ID (slug) from route params
     - `timePeriod` - Time period filter (Today, Yesterday, 7d, 30d, All Time)
     - `licencee` - Optional licensee filter
     - `currency` - Display currency code
   - **Used for:** Cabinet table/cards display with financial metrics
   - **Response Format:** `ExtendedCabinetDetail[]`
   - **Refactored:** ✅ Yes

3. **`GET /api/locations`** (via `fetchAllGamingLocations`, `fetchLocationDetailsById`)
   - **Purpose:** Fetch all gaming locations for licensee change handling
   - **Called by:** `fetchAllGamingLocations()` and `fetchLocationDetailsById()` helper functions
   - **Parameters:**
     - `licencee` - Optional licensee filter
   - **Used for:** Location validation and redirect when licensee changes
   - **Response Format:** `Location[]`
   - **Refactored:** ✅ Yes

### Data Flow:

```
Location Details Page
├── fetchLocationDetails()
│   └── GET /api/locations/${locationId}?basicInfo=true
├── fetchCabinets()
│   └── GET /api/locations/${locationId} (with timePeriod)
└── Licensee change handling
    ├── fetchLocationDetailsById()
    │   └── GET /api/locations/${locationId}?basicInfo=true
    └── fetchAllGamingLocations()
        └── GET /api/locations
```

### Refresh Behavior:

- Re-fetches when:
  - `slug` changes (route param)
  - `activeMetricsFilter` changes
  - `selectedLicencee` changes
  - `displayCurrency` changes
  - User clicks refresh button

### Features:

- **Location Information:** Name, address, licensee
- **Metrics Summary:** Total cabinets, money in/out, gross, net, online/offline counts
- **Cabinet List:** Table (desktop) and cards (mobile) with search and sorting
- **Time Period Filters:** Today, Yesterday, 7d, 30d, All Time
- **Search:** Search cabinets by asset number, SMB ID, serial number, game, location name, custom name
- **Sorting:** Sort by asset number, location name, money in/out, jackpot, gross, cancelled credits, game, SMB ID, serial number, last online
- **Pagination:** 10 cabinets per page
- **Accounting Details:** Detailed metrics for selected cabinet
- **Edit/Delete:** Cabinet edit and delete modals (via EditCabinetModal, DeleteCabinetModal)

---

---

## Sessions Page (`app/sessions/page.tsx`)

**Route:** `/sessions` (Gaming sessions listing and management)

### API Endpoints Used:

1. **`GET /api/sessions`**
   - **Purpose:** Fetch gaming sessions with filtering, search, sorting, and pagination
   - **Called by:** `fetchSessions()` function in `useSessions` hook
   - **Parameters:**
     - `page` - Page number (batch number, 1-based)
     - `limit` - Items per batch (50)
     - `search` - Search term for filtering sessions
     - `sortBy` - Sort field (default: 'startTime')
     - `sortOrder` - Sort direction ('asc' or 'desc')
     - `licensee` - Optional licensee filter
     - `startDate` - Start date for date range filtering
     - `endDate` - End date for date range filtering
   - **Used for:** Sessions table display with pagination
   - **Response Format:** `{ success: boolean, data: { sessions: Session[], pagination: {...} } }`
   - **Refactored:** ✅ Yes

### Data Flow:

```
Sessions Page
└── useSessions hook
    └── fetchSessions()
        └── GET /api/sessions
```

### Refresh Behavior:

- Re-fetches when:
  - `searchTerm` changes (debounced 500ms)
  - `sortBy` changes
  - `sortOrder` changes
  - `selectedLicencee` changes
  - `activeMetricsFilter` changes
  - `customDateRange` changes
  - `currentPage` changes (batch loading)
  - User clicks refresh button

### Features:

- **Search:** Search sessions by various fields
- **Sorting:** Sort by start time, session length, money in/out, etc.
- **Date Filtering:** Filter by Today, Yesterday, Last 7 days, Last 30 days, or Custom range
- **Pagination:** Batch loading (50 items per batch, 5 pages per batch)
- **Navigation:** Click to view session events

---

## Session Events Page (`app/sessions/[sessionId]/[machineId]/events/page.tsx`)

**Route:** `/sessions/[sessionId]/[machineId]/events` (Session events detail view)

### API Endpoints Used:

1. **`GET /api/sessions/${sessionId}/${machineId}/events`**
   - **Purpose:** Fetch events for a specific session and machine
   - **Called by:** Direct axios call in page component
   - **Parameters:**
     - `sessionId` - Session ID from route params
     - `machineId` - Machine ID from route params
     - Additional query parameters for filtering/sorting
   - **Used for:** Displaying detailed session events
   - **Response Format:** `{ events: Event[] }`
   - **Refactored:** ✅ Yes

---

## Summary of Documented Pages

### ✅ Completed Documentation (8 pages):

1. **Dashboard Page** (`app/page.tsx`) - 4 APIs, all refactored ✅
2. **Locations Page** (`app/locations/[slug]/page.tsx`) - 6 APIs, all refactored ✅
3. **Machines Page** (`app/machines/page.tsx`) - 2 APIs, all refactored ✅
4. **Members Page** (`app/members/page.tsx`) - 6 APIs, all refactored ✅
5. **Reports Page** (`app/reports/page.tsx`) - 7 APIs, all refactored ✅
6. **Collection Report Page** (`app/collection-report/page.tsx`) - 11+ APIs, all refactored ✅
7. **Member Details Page** (`app/members/[id]/page.tsx`) - 2 APIs, all refactored ✅
8. **Location Details Page** (`app/locations/[slug]/details/page.tsx`) - 3 APIs, all refactored ✅
9. **Sessions Page** (`app/sessions/page.tsx`) - 1 API, all refactored ✅
10. **Session Events Page** (`app/sessions/[sessionId]/[machineId]/events/page.tsx`) - 1 API, all refactored ✅

### 📝 Additional Pages (Same APIs as documented pages):

- **Cabinets Page** (`app/cabinets/page.tsx`) - Uses same APIs as Machines Page ✅
- **Cabinet Details Page** (`app/cabinets/[slug]/page.tsx`) - Uses same APIs as Location Details Page ✅

### ✅ All APIs Verified as Refactored:

All API endpoints used by the documented pages have been verified to be refactored according to the Engineering Guidelines:

- File-level JSDoc ✅
- Step-by-step comments ✅
- Business logic extracted to helpers ✅
- Performance tracking ✅
- Proper error handling ✅

---

## Notes:

- All API calls use `axios` with authentication headers from `getAuthHeaders()`
- Error handling is done via `useGlobalErrorHandler` hook
- Currency conversion is applied when `displayCurrency` is provided
- Licensee filtering is applied based on user role and selected licensee
