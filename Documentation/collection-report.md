# Collection Report Page

This page provides comprehensive reporting and management for collection activities, monthly summaries, and scheduling within the casino management system.

- **File:** `app/collection-report/page.tsx`
- **URL Pattern:** `/collection-report`

## Main Features
- **Tabs:**
  - Collection Reports: View, filter, and search collection data by location, date, and status.
  - Monthly Report: View monthly summaries and details, filter by location and date range.
  - Manager Schedule: View and manage manager schedules, filter by location, collector, and status.
  - Collectors Schedule: View and manage collector schedules, filter by location, collector, and status.
- **Filters:**
  - Location, date range, search, and uncollected-only filters for reports.
- **Pagination:**
  - Paginated views for both mobile and desktop layouts.
- **Data Export:**
  - Export and sync collection data (where implemented).
- **Modals:**
  - Add new collection, view/edit details, and manage schedules.
- **Responsive Layout:**
  - Separate UIs for mobile and desktop users.
- **Sidebar Navigation:**
  - Persistent sidebar for navigation to other modules.

## Technical Architecture

### Core Components
- **Main Page:** `app/collection-report/page.tsx` - Entry point with tabbed interface
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation with licensee selector
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Collection Report Components:**
  - `components/collectionReport/CollectionDesktopUI.tsx` - Desktop collection view
  - `components/collectionReport/CollectionMobileUI.tsx` - Mobile collection view
  - `components/collectionReport/CollectionReportCards.tsx` - Mobile card components
  - `components/collectionReport/CollectionReportTable.tsx` - Desktop table component
  - `components/collectionReport/CollectionReportFilters.tsx` - Filter controls
- **Monthly Report Components:**
  - `components/collectionReport/MonthlyDesktopUI.tsx` - Desktop monthly view
  - `components/collectionReport/MonthlyMobileUI.tsx` - Mobile monthly view
  - `components/collectionReport/MonthlyScheduleCards.tsx` - Monthly summary cards
  - `components/collectionReport/MonthlyScheduleTable.tsx` - Monthly details table
  - `components/collectionReport/MonthlyScheduleFilters.tsx` - Monthly filters
- **Manager Schedule Components:**
  - `components/collectionReport/ManagerDesktopUI.tsx` - Desktop manager view
  - `components/collectionReport/ManagerMobileUI.tsx` - Mobile manager view
  - `components/collectionReport/ManagerScheduleCards.tsx` - Manager schedule cards
  - `components/collectionReport/ManagerScheduleTable.tsx` - Manager schedule table
  - `components/collectionReport/ManagerScheduleFilters.tsx` - Manager filters
- **Collector Schedule Components:**
  - `components/collectionReport/CollectorDesktopUI.tsx` - Desktop collector view
  - `components/collectionReport/CollectorMobileUI.tsx` - Mobile collector view
  - `components/collectionReport/CollectorScheduleCards.tsx` - Collector schedule cards
  - `components/collectionReport/CollectorScheduleTable.tsx` - Collector schedule table
  - `components/collectionReport/CollectorScheduleFilters.tsx` - Collector filters
- **Shared Components:**
  - `components/dashboard/DashboardDateFilters.tsx` - Date range selection
  - `components/collectionReport/NewCollectionModal.tsx` - New collection creation
  - `components/ui/select.tsx` - Tab selection dropdown

### State Management
- **Dashboard Store:** `lib/store/dashboardStore.ts` - Shared state for licensee and date filters
- **Local State:** React `useState` hooks for complex tab and data state
- **Key State Properties:**
  - `activeTab` - Current active tab (collection/monthly/manager/collector)
  - `reports`, `schedulers`, `collectorSchedules` - Data arrays for each tab
  - `loading`, `loadingSchedulers`, `loadingCollectorSchedules` - Loading states
  - `monthlySummary`, `monthlyDetails` - Monthly report data
  - Filter states for each tab (locations, collectors, status, etc.)
  - Pagination states for mobile and desktop views
  - Modal states for new collection creation

### Data Flow
1. **Initial Load:** Fetches gaming locations and locations with machines
2. **Tab Switching:** Loads appropriate data based on active tab
3. **Filtering:** Applies filters and updates data display
4. **Pagination:** Handles pagination for both mobile and desktop views
5. **Real-time Updates:** Refreshes data when filters or date ranges change
6. **Animation:** Smooth transitions between tabs and data updates

### API Integration

#### Collection Report Endpoints
- **GET `/api/collection-report`** - Fetches collection reports
  - Parameters: `licencee`, `dateRange`, `timePeriod`
  - Returns: `CollectionReportRow[]` with collection data
- **GET `/api/collection-report/[reportId]`** - Fetches specific report details
  - Returns: `CollectionReportData` with detailed report information
- **POST `/api/collection-report`** - Creates new collection report
  - Body: `CreateCollectionReportPayload`
  - Returns: Created report data
- **POST `/api/collection-report/sync-meters`** - Syncs meter data
  - Body: `{ reportId: string }`
  - Returns: Sync status

#### Monthly Report Endpoints
- **GET `/api/analytics/monthly`** - Fetches monthly report data
  - Parameters: `startDate`, `endDate`, `locationName`
  - Returns: Monthly summary and details data

#### Scheduler Endpoints
- **GET `/api/schedulers`** - Fetches manager schedules
  - Parameters: `location`, `collector`, `status`
  - Returns: `SchedulerTableRow[]` with schedule data
- **GET `/api/collector-schedules`** - Fetches collector schedules
  - Parameters: `location`, `collector`, `status`
  - Returns: `CollectorSchedule[]` with collector schedule data

#### Data Processing
- **Collection Report Helper:** `lib/helpers/collectionReport.ts` - Core collection utilities
  - `getAllCollectionReports()` - Fetches and filters collection reports
  - `getCollectorsByLicencee()` - Gets collectors filtered by licensee
  - `fetchMonthlyReportSummaryAndDetails()` - Fetches monthly data
  - `getLocationsWithMachines()` - Gets locations with machine data
  - `createCollectionReport()` - Creates new collection reports
  - `syncMeterDataWithCollections()` - Syncs meter data
- **Collection Report Page Helper:** `lib/helpers/collectionReportPage.ts` - Page-specific utilities
  - `animatePagination()`, `animateTableRows()`, `animateCards()` - Animation functions
  - `filterCollectionReports()` - Filters collection data
  - `calculatePagination()` - Handles pagination logic
  - `fetchAndFormatSchedulers()` - Formats scheduler data
- **Collector Schedules Helper:** `lib/helpers/collectorSchedules.ts` - Collector schedule utilities
  - `fetchAndFormatCollectorSchedules()` - Fetches and formats collector data

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo` - State management
- **Next.js:** `usePathname` - Navigation
- **GSAP:** Animation library for smooth transitions
- **React Day Picker:** Date range selection
- **Axios:** HTTP client for API calls

#### Type Definitions
- **Component Props:** `lib/types/componentProps.ts` - Component prop types
  - `CollectionReportRow`, `MonthlyReportSummary`, `MonthlyReportDetailsRow`, `SchedulerTableRow`
- **API Types:** `lib/types/api.ts` - API-related types
  - `CreateCollectionReportPayload`, `CollectionReportLocationWithMachines`
- **Collection Types:** `lib/types/collections.ts` - Collection-specific types
  - `CollectionReportData`
- **Component Types:** `lib/types/components.ts` - Component-specific types
  - `CollectorSchedule`
- **Location Types:** `lib/types/location.ts` - Location-related types
  - `LocationSelectItem`

#### Utility Functions
- **Locations Helper:** `lib/helpers/locations.ts` - Location management
  - `fetchAllGamingLocations()` - Fetches all gaming locations
- **Validation Utils:** `lib/utils/validation.ts` - Form validation
- **Date Utils:** Date manipulation and formatting utilities

### Component Hierarchy
```
CollectionReportPage (app/collection-report/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── DashboardDateFilters (components/dashboard/DashboardDateFilters.tsx)
├── Tab Selector (Mobile: Select, Desktop: Buttons)
└── Tab Content
    ├── Collection Tab
    │   ├── CollectionDesktopUI (components/collectionReport/CollectionDesktopUI.tsx)
    │   │   ├── CollectionReportFilters
    │   │   ├── CollectionReportTable
    │   │   └── PaginationControls
    │   └── CollectionMobileUI (components/collectionReport/CollectionMobileUI.tsx)
    │       ├── CollectionReportFilters
    │       ├── CollectionReportCards
    │       └── PaginationControls
    ├── Monthly Tab
    │   ├── MonthlyDesktopUI (components/collectionReport/MonthlyDesktopUI.tsx)
    │   │   ├── MonthlyScheduleFilters
    │   │   ├── MonthlyScheduleTable
    │   │   └── PaginationControls
    │   └── MonthlyMobileUI (components/collectionReport/MonthlyMobileUI.tsx)
    │       ├── MonthlyScheduleFilters
    │       └── MonthlyScheduleCards
    ├── Manager Tab
    │   ├── ManagerDesktopUI (components/collectionReport/ManagerDesktopUI.tsx)
    │   │   ├── ManagerScheduleFilters
    │   │   └── ManagerScheduleTable
    │   └── ManagerMobileUI (components/collectionReport/ManagerMobileUI.tsx)
    │       ├── ManagerScheduleFilters
    │       └── ManagerScheduleCards
    └── Collector Tab
        ├── CollectorDesktopUI (components/collectionReport/CollectorDesktopUI.tsx)
        │   ├── CollectorScheduleFilters
        │   └── CollectorScheduleTable
        └── CollectorMobileUI (components/collectionReport/CollectorMobileUI.tsx)
            ├── CollectorScheduleFilters
            └── CollectorScheduleCards
└── NewCollectionModal (components/collectionReport/NewCollectionModal.tsx)
```

### Business Logic
- **Collection Management:** Complete CRUD operations for collection reports
- **Data Filtering:** Multi-level filtering by location, date, collector, and status
- **Pagination:** Efficient data display with separate mobile/desktop pagination
- **Date Range Handling:** Flexible date selection with preset and custom ranges
- **Licensee Filtering:** Data filtering based on selected licensee
- **Meter Synchronization:** Real-time meter data sync for accurate reporting
- **Schedule Management:** Manager and collector schedule tracking

### Animation & UX Features
- **GSAP Animations:** Smooth transitions between tabs and data updates
- **Loading States:** Skeleton loaders and loading indicators
- **Responsive Design:** Separate mobile and desktop layouts
- **Tab Transitions:** Animated content switching
- **Pagination Animations:** Smooth page transitions
- **Filter Animations:** Animated filter updates

### Error Handling
- **API Failures:** Graceful degradation with fallback data
- **Loading States:** Comprehensive loading indicators
- **Empty States:** User-friendly empty state messages
- **Network Issues:** Retry logic and error recovery
- **Data Validation:** Client-side validation for form inputs

### Performance Optimizations
- **Memoization:** `useMemo` for expensive computations (filtering, pagination)
- **Conditional Rendering:** Separate mobile/desktop components
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **Animation Optimization:** Efficient GSAP animations

## Data Flow
- Fetches collection, monthly, and schedule data from the backend based on filters and active tab.
- Uses Zustand for shared state (licensee, filters).
- Animates content transitions and paginations for smooth UX.
- Handles loading, searching, and error states.

## UI
- Clean, modern design with Tailwind CSS.
- Tabbed interface for easy navigation between report types.
- Accessible controls and mobile-friendly layouts. 