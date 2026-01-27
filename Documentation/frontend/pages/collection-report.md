# Collection Report Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Navigation Tabs](#navigation-tabs)
  - [Collection Tab](#collection-tab)
  - [Monthly Tab](#monthly-tab)
  - [Collector Tab](#collector-tab)
  - [Manager Tab](#manager-tab)
  - [Collection Modals](#collection-modals)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Collection Report System manages casino slot machine money collection operations. It serves as the financial control center for tracking money flow from gaming machines to bank accounts.

The page features a multi-tab interface:
- **Collection Tab**: Main collection reports listing with create, edit, delete operations
- **Monthly Tab**: Monthly summary reports
- **Collector Tab**: Collector schedule management
- **Manager Tab**: Manager schedule management

Key features include:
- Real-time SAS metrics and movement calculations
- Role-based access control
- Automated issue detection and fixing
- Responsive design for desktop and mobile
- Smart Advanced SAS option (for first machine collections)

## File Information

- **File:** `app/collection-report/page.tsx`
- **URL Pattern:** `/collection-report`
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** All authenticated users (except Technician - redirected to Cabinets)
- **Main Component:** `CollectionReportPageContent` (`components/CMS/collectionReport/CollectionReportPageContent.tsx`)

## Page Sections

### Navigation Tabs

**Purpose:** Tab navigation between different collection report views (Collection, Monthly, Collector, Manager).

**Components Used:**
- `CollectionNavigation` (`components/CMS/collectionReport/CollectionNavigation.tsx`) - Tab navigation component
- Tab configuration from `COLLECTION_TABS_CONFIG` constant

**Data Flow:**
- Tab changes update URL query parameter (`section`)
- Active tab state managed by `useCollectionNavigation` hook
- Tab changes trigger content re-rendering

**Key Functions:**
- `useCollectionNavigation` (`lib/hooks/navigation`) - Tab navigation state management
- `handleTabChange` - Tab change handler with URL sync

**Notes:**
- Tabs: Collection, Monthly, Collector, Manager
- Active tab persists in URL query parameter
- Tab visibility may vary based on user role

---

### Collection Tab

**Purpose:** Main collection reports listing with search, filtering, pagination, and CRUD operations.

**Components Used:**
- `CollectionReportDesktopLayout` (`components/collectionReport/tabs/collection/CollectionReportDesktopLayout.tsx`) - Desktop layout with filters and table
- `CollectionReportMobileLayout` (`components/collectionReport/tabs/collection/CollectionReportMobileLayout.tsx`) - Mobile layout with filters and cards
- `CollectionReportTable` (`components/collectionReport/tabs/collection/CollectionReportTable.tsx`) - Desktop table view
- `CollectionReportCards` (`components/collectionReport/tabs/collection/CollectionReportCards.tsx`) - Mobile card view
- `CollectionReportFilters` (`components/collectionReport/tabs/collection/CollectionReportFilters.tsx`) - Search and filter controls
- `CollectionReportHeader` (`components/collectionReport/CollectionReportHeader.tsx`) - Page header
- `DateFilters` (`components/ui/common/DateFilters.tsx`) - Date range filter
- `PaginationControls` (`components/ui/PaginationControls.tsx`) - Pagination
- `CollectionReportTableSkeleton` (`components/collectionReport/CollectionReportTableSkeleton.tsx`) - Table loading skeleton
- `CollectionReportCardSkeleton` (`components/collectionReport/CollectionReportCardSkeleton.tsx`) - Card loading skeleton

**API Endpoints:**
- `GET /api/collectionReport` - Fetch collection reports with pagination and filtering
- `POST /api/collectionReport` - Create new collection report
- `GET /api/collectionReport?locationsWithMachines=true` - Fetch locations with machines

**Data Flow:**
1. Component fetches collection reports via `useCollectionReportPageData` hook
2. Reports filtered by licensee, date range, and search term
3. Pagination handled with batch loading optimization
4. User can create, edit, or delete reports via modals
5. Date filters integrate with dashboard date filter system

**Key Functions:**
- `useCollectionReportPageData` (`lib/hooks/collectionReport/useCollectionReportPageData.ts`) - Main data hook
- `fetchCollectionReportsByLicencee` (`lib/helpers/collectionReport.ts`) - Fetch reports
- `getLocationsWithMachines` (`lib/helpers/collectionReport.ts`) - Fetch locations for modals
- `handleRefresh` - Refresh reports data
- `handleEdit` - Open edit modal
- `handleDelete` - Open delete confirmation

**State Management:**
- `allReports` - Array of collection report objects
- `loading` - Loading state
- `refreshing` - Refresh loading state
- `currentPage` - Current page number
- `totalReports` - Total report count
- `searchTerm` - Search input value
- `debouncedSearch` - Debounced search term (300ms)
- `locations` - Available locations list
- `locationsWithMachines` - Locations with machine counts
- Modal states: `showNewCollectionMobile`, `showNewCollectionDesktop`, `showEditMobile`, `showEditDesktop`, `editingReportId`, `showDeleteConfirmation`

**Notes:**
- Batch loading optimization (loads 50 items per batch, displays 10 per page)
- Search filters by location name, report ID
- Date filters support: Today, Yesterday, Last 7 Days, Last 30 Days, Custom range, All Time
- Role-based filtering applies based on user's assigned locations/licensees

---

### Monthly Tab

**Purpose:** Monthly summary reports with aggregated collection data.

**Components Used:**
- `CollectionReportMonthlyDesktop` (`components/collectionReport/tabs/monthly/CollectionReportMonthlyDesktop.tsx`) - Desktop view
- `CollectionReportMonthlyMobile` (`components/collectionReport/tabs/monthly/CollectionReportMonthlyMobile.tsx`) - Mobile view
- Dynamically imported components (for code splitting)

**API Endpoints:**
- `GET /api/collectionReport` - Fetch monthly summary data (with `timePeriod` parameter)

**Data Flow:**
1. Component uses `useMonthlyReportData` hook.
2. Monthly data aggregated by location/licensee, filtered by 'location' and 'date range'.
3. Data displayed in summary format.

**Key Functions:**
- `useMonthlyReportData` - Monthly data fetching hook
- Monthly aggregation logic

**Notes:**
- Shows aggregated monthly collection data
- Filtered by selected licensee and date range

---

### Collector Tab

**Purpose:** Collector schedule management for collection assignments.

**Components Used:**
- `CollectionReportCollectorDesktop` (`components/collectionReport/tabs/collector/CollectionReportCollectorDesktop.tsx`) - Desktop view
- `CollectionReportCollectorMobile` (`components/collectionReport/tabs/collector/CollectionReportCollectorMobile.tsx`) - Mobile view
- Dynamically imported components (for code splitting)

**API Endpoints:**
- Collector schedule API endpoints (specific routes)

**Data Flow:**
1. Component uses `useCollectorScheduleData` hook.
2. Fetches collectors and their schedules, which can be filtered by 'location', 'status', and 'collector'.
3. Allows schedule management operations.

**Key Functions:**
- `useCollectorScheduleData` - Collector schedule data hook

**Notes:**
- Manages collector assignment schedules
- Role-based access (Collector, Manager, Admin)

---

### Manager Tab

**Purpose:** Manager schedule management and oversight.

**Components Used:**
- `CollectionReportManagerDesktop` (`components/collectionReport/tabs/manager/CollectionReportManagerDesktop.tsx`) - Desktop view
- `CollectionReportManagerMobile` (`components/collectionReport/tabs/manager/CollectionReportManagerMobile.tsx`) - Mobile view
- Dynamically imported components (for code splitting)

**API Endpoints:**
- Manager schedule API endpoints (specific routes)

**Data Flow:**
1. Component uses `useManagerScheduleData` hook.
2. Fetches managers and schedules, which can be filtered by 'location', 'status', and 'collector'.
3. Allows schedule oversight operations.

**Key Functions:**
- `useManagerScheduleData` - Manager schedule data hook

**Notes:**
- Manager-level schedule management
- Access restricted to Manager, Admin roles

---

### Collection Modals

**Purpose:** Create, edit, and delete collection reports via modal interfaces.

**Components Used:**
- `CollectionReportNewCollectionModal` (`components/collectionReport/modals/CollectionReportNewCollectionModal.tsx`) - Desktop create modal
- `CollectionReportEditCollectionModal` (`components/collectionReport/modals/CollectionReportEditCollectionModal.tsx`) - Desktop edit modal
- `CollectionReportMobileNewCollectionModal` (`components/collectionReport/mobile/CollectionReportMobileNewCollectionModal.tsx`) - Mobile create modal
- `CollectionReportMobileEditCollectionModal` (`components/collectionReport/mobile/CollectionReportMobileEditCollectionModal.tsx`) - Mobile edit modal
- `CollectionReportModals` (`components/collectionReport/modals/CollectionReportModals.tsx`) - Modal orchestration component
- Delete confirmation dialog

**API Endpoints:**
- `POST /api/collectionReport` - Create new collection report
- `PUT /api/collectionReport/[reportId]` - Update collection report
- `DELETE /api/collectionReport/[reportId]` - Delete collection report
- `POST /api/collections` - Create individual collection entries
- `PATCH /api/collections` - Update collection entries
- `DELETE /api/collections/[id]` - Delete collection entry

**Data Flow:**
1. User opens modal (create or edit)
2. Modal loads locations with machines
3. User selects location and machines
4. User enters meter readings and financial data
5. System calculates movement and SAS metrics
6. On submit: Creates parent report first, then updates collections (atomic operation)

**Key Functions:**
- `addMachineCollection` - Add machine to collection
- `validateCollectionReportPayload` - Validate report data
- `calculateMachineMovement` - Calculate movement values
- `createCollectionReport` - Create parent report
- `updateCollections` - Update collection entries with report ID

**Notes:**
- Desktop and mobile modals have separate components
- Modal supports multi-machine collection per report
- Location locked after first machine added
- Financial data entry (first machine only): Taxes, Advance, Variance, Balance correction, Collected amount
- Smart Advanced SAS option shows only for first machine collections
- Atomic operation order: Create report first, then update collections (prevents orphaned collections)

---

## API Endpoints

### Collection Reports

- **GET `/api/collectionReport`**
  - **Purpose:** Fetch collection reports with pagination and filtering
  - **Query Parameters:**
    - `licencee` - Licensee filter (optional)
    - `timePeriod` - Time period filter (today, yesterday, week, month, custom)
    - `startDate` - Custom start date (ISO string, required if timePeriod=custom)
    - `endDate` - Custom end date (ISO string, required if timePeriod=custom)
    - `page` - Page number (default: 1)
    - `limit` - Items per page (default: 50, max: 100)
    - `search` - Search term (optional)
    - `locationsWithMachines` - Return locations with machine counts (optional)
  - **Response:** `{ data: CollectionReportRow[], pagination: PaginationData }` or `{ locations: [...] }` if `locationsWithMachines=true`
  - **Used By:** Collection tab, Monthly tab, modals

- **POST `/api/collectionReport`**
  - **Purpose:** Create new collection report
  - **Body:** Collection report payload with collections array
  - **Response:** `{ success: true, data: CollectionReport }`
  - **Used By:** Create collection modals

- **PATCH /api/collection-report/[reportId]**
  - **Purpose:** Update collection report
  - **Body:** Updated collection report data
  - **Response:** `{ success: true, data: CollectionReport }`
  - **Used By:** Edit collection modals

- **DELETE /api/collection-report/[reportId]**
  - **Purpose:** Delete collection report
  - **Response:** `{ success: true }`
  - **Used By:** Delete confirmation dialog

### Collections (Individual Entries)

- **POST `/api/collections`**
  - **Purpose:** Create individual collection entry
  - **Body:** Collection entry data
  - **Response:** `{ success: true, data: Collection }`
  - **Used By:** Collection modals (when adding machines)

- **PATCH `/api/collections`**
  - **Purpose:** Update collection entries (bulk)
  - **Query Parameters:** `id` - Collection ID (optional, for single update)
  - **Body:** Update payload (can include array for bulk updates)
  - **Response:** `{ success: true }`
  - **Used By:** Collection modals (when finalizing report)

- **DELETE `/api/collections/[id]`**
  - **Purpose:** Delete collection entry
  - **Response:** `{ success: true }`
  - **Used By:** Collection modals (when removing machines)

### Locations

- **GET `/api/locations`**
  - **Purpose:** Fetch gaming locations
  - **Query Parameters:** `licencee` - Licensee filter (optional)
  - **Response:** `{ locations: Location[] }`
  - **Used By:** Collection modals, filters

---

## State Management

### Hooks

- **`useCollectionReportPageData`** (`lib/hooks/collectionReport/useCollectionReportPageData.ts`)
  - Main data fetching and state management hook
  - Coordinates reports data, locations, pagination, modals
  - Provides: `activeTab`, `loading`, `refreshing`, `allReports`, `locations`, `locationsWithMachines`, modal states, handlers

- **`useCollectionReportFilters`** (`lib/hooks/collectionReport/useCollectionReportFilters.ts`)
  - Filtering and sorting logic
  - Provides filter state and handlers

- **`useMonthlyReportData`** (monthly tab hook)
  - Fetches monthly summary data
  - Provides monthly aggregated data

- **`useCollectorScheduleData`** (collector tab hook)
  - Fetches collector schedule data
  - Provides collectors and schedules

- **`useManagerScheduleData`** (manager tab hook)
  - Fetches manager schedule data
  - Provides managers and schedules

- **`useDashBoardStore`** (`lib/store/dashboardStore.ts`) - Zustand store
  - `selectedLicencee` - Selected licensee for filtering
  - `activeMetricsFilter` - Active date filter type
  - `customDateRange` - Custom date range (if Custom filter selected)
  - `setSelectedLicencee` - Licensee selection setter

### State Properties

**From `useCollectionReportPageData` hook:**
- `activeTab` - Current active tab (collection, monthly, collector, manager)
- `loading` - Loading state
- `refreshing` - Refresh loading state
- `allReports` - Array of collection report objects
- `currentPage` - Current page number (0-based)
- `totalReports` - Total report count
- `searchTerm` - Search input value
- `debouncedSearch` - Debounced search term (300ms)
- `locations` - Available locations list
- `locationsWithMachines` - Locations with machine counts
- Modal states: `showNewCollectionMobile`, `showNewCollectionDesktop`, `showEditMobile`, `showEditDesktop`, `editingReportId`, `showDeleteConfirmation`, `reportToDelete`
- `loadedBatches` - Set of loaded batch numbers (for batch loading optimization)

---

## Key Functions

### Data Fetching

- **`fetchCollectionReportsByLicencee`** (`lib/helpers/collectionReport.ts`)
  - Fetches collection reports with pagination and filtering
  - Handles date range and time period mapping
  - Returns reports array and pagination data

- **`getLocationsWithMachines`** (`lib/helpers/collectionReport.ts`)
  - Fetches locations with machine counts
  - Used by collection modals for location selection

- **`fetchReports`** (`useCollectionReportPageData` hook)
  - Main reports fetching function
  - Handles batch loading logic
  - Manages pagination state

### Collection Operations

- **`createCollectionReport`** (modal handlers)
  - Creates new collection report
  - Validates payload before submission
  - Atomic operation: Creates report first, then updates collections

- **`updateCollectionReport`** (modal handlers)
  - Updates existing collection report
  - Handles validation and error states

- **`deleteCollectionReport`** (delete handler)
  - Deletes collection report
  - Confirms deletion before proceeding

- **`addMachineCollection`** (modal handlers)
  - Adds machine to collection (creates collection entry)
  - Calculates movement and SAS metrics
  - Stores in local state until report finalization

- **`updateCollections`** (modal handlers)
  - Updates collection entries with report ID
  - Marks collections as completed
  - Bulk update operation

### Validation & Calculation

- **`validateCollectionReportPayload`** (validation helpers)
  - Validates collection report data before submission
  - Checks required fields and data integrity

- **`calculateMachineMovement`** (calculation helpers)
  - Calculates movement values from meter readings
  - Handles previous meter values and current readings

- **`calculateDefaultCollectionTime`** (time helpers)
  - Calculates default collection time based on location's gameDayOffset
  - Default: 8:00 AM adjusted for gaming day offset

### Utilities

- **`mapTimePeriodForAPI`** (`lib/helpers/collectionReportPageData.ts`)
  - Maps frontend time period to API format
  - Handles time period conversion

- **`buildCollectionReportsLocationFilter`** (filter helpers)
  - Builds location filter based on user role
  - Applies role-based access control

---

## Additional Notes

### Role-Based Access Control

- **Admin/Developer**: Full access to all features across all licensees
- **Manager**: Access to assigned licensees, can create/edit/delete reports
- **Collector/Location Admin**: Access to assigned locations only, can create/edit recent reports
- **Technician**: No access (redirected to Cabinets)

### Collection Report Creation Process

1. Location selection (locked after first machine)
2. Machine selection and data entry (meter readings, collection time)
3. Financial data entry (first machine only: taxes, advance, variance, etc.)
4. Report finalization (atomic operation: create report first, then update collections)

### Batch Loading Optimization

- Loads 50 items per batch
- Displays 10 items per page
- Pre-loads next batch when approaching end of current batch
- Reduces API calls and improves performance

### Date Filtering

- Integrates with dashboard date filter system
- Supports: Today, Yesterday, Last 7 Days, Last 30 Days, Custom range, All Time
- Date filters apply to collection report date/timestamp

### Responsive Design

- Desktop: Full table view with all columns
- Mobile: Card-based layout with essential information
- Separate modal components for desktop and mobile
- Touch-friendly navigation and interactions
