# Collection Report Details Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Version:** 1.0.0

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Page Header](#page-header)
  - [Report Summary Section](#report-summary-section)
  - [Tab Navigation](#tab-navigation)
  - [Machine Metrics Tab](#machine-metrics-tab)
  - [Location Metrics Tab](#location-metrics-tab)
  - [SAS Metrics Compare Tab](#sas-metrics-compare-tab)
  - [Issue Detection and Fixing](#issue-detection-and-fixing)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Collection Report Details page provides comprehensive analysis of individual collection reports, including machine-level metrics, location-level summaries, SAS data comparisons, and issue detection with automated fixing capabilities.

The page features three main tabs:

- **Machine Metrics Tab**: Individual machine performance data with detailed financial metrics
- **Location Metrics Tab**: Location-level summary data and financial overview
- **SAS Metrics Compare Tab**: Side-by-side comparison of meter and SAS metrics

Key features include:

- Search and filter machines
- Sort by any metric column
- Pagination for large machine collections
- Issue detection and automated fixing (developer-only)
- RAM clear indicators
- Clickable machine names (navigate to machine details)

## File Information

- **File:** `app/collection-report/report/[reportId]/page.tsx`
- **URL Pattern:** `/collection-report/report/[reportId]`
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** All authenticated users with collection report access
- **Main Component:** `CollectionReportDetailsPageContent` (`components/CMS/collectionReport/details/CollectionReportDetailsPageContent.tsx`)

## Page Sections

### Page Header

**Purpose:** Display navigation back button, page title, and Fix Report button (developer-only).

**Components Used:**

- Back button (navigates to `/collection-report`)
- Page title: "Collection Report Details"
- Fix Report button (developer-only, shows when issues detected)

**Data Flow:**

- Back button uses Next.js Link component
- Fix Report button triggers issue fixing workflow

**Key Functions:**

- `handleFixReportClick` - Opens fix report confirmation dialog

**Notes:**

- Fix Report button only visible to developers
- Button appears when SAS time issues or collection history issues are detected
- Desktop header shown on lg+ screens only

---

### Report Summary Section

**Purpose:** Display location name, report ID, and financial summary totals.

**Components Used:**

- Report header card with location name and report ID
- Financial summary showing collection report machine total gross

**Data Flow:**

- Location total calculated from collections data
- Color-coded display (green for positive, red for negative)

**Key Functions:**

- `calculateLocationTotal` (`lib/helpers/collectionReportDetailPage.ts`) - Calculates location total from collections

**State Management:**

- `reportData` - Report data object
- `collections` - Array of collection documents

**Notes:**

- Shows location name, report ID, and total gross
- Mobile version includes Fix Report button in this section
- Total gross color-coded based on value (green/red)

---

### Tab Navigation

**Purpose:** Tab navigation between Machine Metrics, Location Metrics, and SAS Metrics Compare views.

**Components Used:**

- Tab buttons with active state styling
- URL sync via query parameter (`section`)

**Data Flow:**

- Tab changes update URL query parameter
- Active tab state managed by `useCollectionReportDetailsData` hook
- Tab changes trigger content re-rendering

**Key Functions:**

- `handleTabChange` - Tab change handler with URL sync
- Tab state from `useCollectionReportDetailsData` hook

**Notes:**

- Tabs: Machine Metrics (default), Location Metrics, SAS Metrics Compare
- Active tab persists in URL query parameter (`?section=machine|location|sas`)
- Desktop tab transitions animated with GSAP

---

### Machine Metrics Tab

**Purpose:** Display individual machine performance data with detailed financial metrics.

**Components Used:**

- `CollectionReportDetailsCollectionsTable` (`components/CMS/collectionReport/details/CollectionReportDetailsCollectionsTable.tsx`) - Main table component
- Search input for filtering machines
- Sort controls
- Pagination controls

**API Endpoints:**

- `GET /api/collection-report/[reportId]` - Fetches report data (includes machine metrics)
- `GET /api/collections/by-report/[reportId]` - Fetches collections for the report

**Data Flow:**

1. Report data fetched on mount via `useCollectionReportDetailsData` hook
2. Machine metrics calculated from collections data
3. User can search machines by ID or name
4. User can sort by any metric column
5. Pagination handles large machine collections

**Key Functions:**

- `useCollectionReportDetailsData` (`lib/hooks/collectionReport/useCollectionReportDetailsData.ts`) - Main data hook
- `fetchCollectionReportById` - Fetch report data
- `fetchCollectionsByLocationReportId` - Fetch collections
- `handleSort` - Handle column sorting
- `setSearchTerm` - Update search filter
- `setMachinePage` - Handle pagination

**Table Columns:**

- Machine Identifier (serial number, name, or custom name)
- Drop/Cancelled (formatted as "drop / cancelled")
- Meters Gross (calculated from `movement.gross`)
- SAS Gross (`sasMeters.gross`)
- Variation (difference between meter and SAS gross)
- SAS Times (SAS start/end time window)
- RAM Clear indicator (if applicable)

**State Management:**

- `paginatedMetricsData` - Filtered and sorted machine metrics
- `machinePage` - Current page number
- `machineTotalPages` - Total pages
- `searchTerm` - Search input value
- `sortField` - Current sort column
- `sortDirection` - Sort direction ('asc' | 'desc')

**Notes:**

- Desktop: Table view with all columns
- Mobile: Card layout with key metrics
- Machine names link to `/cabinets/[machineId]`
- RAM clear machines have visual indicators
- Pagination handles large datasets efficiently

---

### Location Metrics Tab

**Purpose:** Provide location-level summary data and financial overview.

**Components Used:**

- `CollectionReportDetailsLocationMetricsTab` (`components/CMS/collectionReport/details/CollectionReportDetailsLocationMetricsTab.tsx`) - Location metrics display component

**API Endpoints:**

- Uses report data and collections from main data fetch

**Data Flow:**

1. Location totals calculated from collections array
2. Financial details aggregated from report data
3. Display location-level summaries

**Key Functions:**

- `calculateLocationTotal` - Calculate location total from collections
- Location aggregation logic (sums of movement.gross, sasMeters.gross, variations)

**Data Displayed:**

- **Location Total:** Total Drop/Cancelled, Total Meters Gross, Total SAS Gross, Total Variation
- **Financial Details:** Variance, Amount to Collect, Collected Amount, Location Revenue, Amount Uncollected, Machines Number
- **Balance Information:** Taxes, Advance, Previous Balance, Current Balance, Balance Correction, Reason for Shortage Payment

**Notes:**

- Aggregated totals from all machines in the report
- Financial summary includes all report-level financial data
- Balance information shows taxes, advances, and corrections

---

### SAS Metrics Compare Tab

**Purpose:** Side-by-side comparison of meter-based metrics and SAS-based metrics.

**Components Used:**

- `CollectionReportDetailsSasCompareTab` (`components/CMS/collectionReport/details/CollectionReportDetailsSasCompareTab.tsx`) - SAS comparison display component

**API Endpoints:**

- Uses report data and collections from main data fetch

**Data Flow:**

1. SAS metrics extracted from collections data
2. Meter metrics extracted from collections data
3. Comparison calculations performed
4. Display side-by-side comparison

**Key Functions:**

- SAS comparison calculation logic
- Metric extraction from collections

**Data Displayed:**

- Meter-based metrics (from `movement` fields)
- SAS-based metrics (from `sasMeters` fields)
- Variations and differences
- SAS time windows

**Notes:**

- Compares meter readings vs SAS system data
- Highlights discrepancies and variations
- Useful for identifying data integrity issues

---

### Issue Detection and Fixing

**Purpose:** Detect and fix collection report issues automatically (developer-only feature).

**Components Used:**

- Fix Report button (developer-only, in page header and report summary)
- `CollectionReportIssueModal` (`components/CMS/collectionReport/modals/CollectionReportIssueModal.tsx`) - Issue details modal
- Fix confirmation dialog

**API Endpoints:**

- `GET /api/collection-report/[reportId]/check-sas-times` - Check for SAS time issues
- `GET /api/collection-reports/check-all-issues?reportId=[reportId]` - Check all issues (SAS times and collection history)
- `POST /api/collection-reports/fix-report` - Fix detected issues

**Data Flow:**

1. On report load, check for SAS time issues
2. Check for collection history issues
3. Display Fix Report button if issues detected (developer-only)
4. User clicks Fix Report → Confirmation dialog
5. User confirms → POST to fix-report endpoint
6. Report data refreshed after fixing

**Key Functions:**

- `checkForSasTimeIssues` - Check for SAS time issues
- `checkForCollectionHistoryIssues` - Check for collection history issues
- `handleFixReportClick` - Open fix confirmation dialog
- `handleFixReportConfirm` - Execute fix operation

**Issue Types:**

- SAS time issues (inverted times, missing times)
- Collection history issues (orphaned collections, missing history entries)
- Movement calculation mismatches
- Previous meter inconsistencies

**State Management:**

- `hasSasTimeIssues` - Boolean flag for SAS time issues
- `hasCollectionHistoryIssues` - Boolean flag for collection history issues
- `sasTimeIssues` - Array of SAS time issue objects
- `collectionHistoryMachines` - Array of machine IDs with history issues
- `showFixReportConfirmation` - Fix confirmation dialog state
- `isFixingReport` - Fix operation loading state
- `showCollectionIssueModal` - Issue details modal state
- `selectedIssue` - Currently selected issue for modal display

**Notes:**

- Fix Report button only visible to developers
- Issues checked automatically on report load
- Fix operation fixes all detected issues at once
- Confirmation required before executing fix
- Report data automatically refreshed after fixing

---

## API Endpoints

### Report Data

- **GET `/api/collection-report/[reportId]`**
  - **Purpose:** Fetch detailed collection report data
  - **Response:** `{ success: true, data: CollectionReportData }`
  - **Used By:** Main data fetching on page load

- **GET `/api/collections/by-report/[reportId]`**
  - **Purpose:** Fetch all collections for a specific report
  - **Response:** `{ success: true, data: Collection[] }`
  - **Used By:** Collections data fetching

### Issue Detection

- **GET `/api/collection-report/[reportId]/check-sas-times`**
  - **Purpose:** Check for SAS time and movement issues
  - **Response:** `{ issues: CollectionIssue[] }`
  - **Used By:** SAS time issue detection

- **GET `/api/collection-reports/check-all-issues?reportId=[reportId]`**
  - **Purpose:** Check for all issues (SAS times and collection history)
  - **Response:** `{ sasTimeIssues: CollectionIssue[], collectionHistoryIssues: string[] }`
  - **Used By:** Complete issue detection

### Issue Fixing

- **POST `/api/collection-reports/fix-report`**
  - **Purpose:** Fix all detected issues in a report
  - **Body:** `{ reportId: string }`
  - **Response:** `{ success: true, message: string }`
  - **Used By:** Fix Report button (developer-only)

---

## State Management

### Hooks

- **`useCollectionReportDetailsData`** (`lib/hooks/collectionReport/useCollectionReportDetailsData.ts`)
  - Main data fetching and state management hook
  - Coordinates report data, collections, pagination, sorting, search, issues
  - Provides: `reportData`, `loading`, `collections`, `activeTab`, `paginatedMetricsData`, `machinePage`, `machineTotalPages`, `searchTerm`, `sortField`, `sortDirection`, issue states, handlers

### State Properties

**From `useCollectionReportDetailsData` hook:**

- `reportData` - Report data object (location name, report ID, financial data)
- `loading` - Loading state
- `error` - Error state (string or null)
- `collections` - Array of collection documents
- `activeTab` - Current active tab ('Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare')
- `paginatedMetricsData` - Filtered, sorted, and paginated machine metrics
- `machinePage` - Current machine metrics page number
- `machineTotalPages` - Total pages for machine metrics
- `searchTerm` - Search input value
- `sortField` - Current sort column
- `sortDirection` - Sort direction ('asc' | 'desc')
- `hasSasTimeIssues` - Boolean flag for SAS time issues
- `hasCollectionHistoryIssues` - Boolean flag for collection history issues
- `sasTimeIssues` - Array of SAS time issue objects
- `collectionHistoryMachines` - Array of machine IDs with history issues
- `showFixReportConfirmation` - Fix confirmation dialog state
- `isFixingReport` - Fix operation loading state
- `showCollectionIssueModal` - Issue details modal state
- `selectedIssue` - Currently selected issue object

### URL State Sync

- Active tab syncs with URL query parameter (`?section=machine|location|sas`)
- Browser back/forward navigation supported
- Tab changes update URL

---

## Key Functions

### Data Fetching

- **`fetchCollectionReportById`** (`lib/helpers/collectionReportDetailPage.ts` or similar)
  - Fetches collection report data by ID
  - Returns report data object

- **`fetchCollectionsByLocationReportId`** (collection helpers)
  - Fetches all collections for a location report
  - Returns collections array

### Calculations

- **`calculateLocationTotal`** (`lib/helpers/collectionReportDetailPage.ts`)
  - Calculates location total from collections array
  - Sums movement.gross from all collections
  - Returns total amount

### Issue Detection

- **`checkForSasTimeIssues`** (`useCollectionReportDetailsData` hook)
  - Checks for SAS time and movement issues
  - Calls `/api/collection-report/[reportId]/check-sas-times`
  - Updates `hasSasTimeIssues` and `sasTimeIssues` state

- **`checkForCollectionHistoryIssues`** (`useCollectionReportDetailsData` hook)
  - Checks for collection history issues
  - Calls `/api/collection-reports/check-all-issues`
  - Updates `hasCollectionHistoryIssues` and `collectionHistoryMachines` state

### Issue Fixing

- **`handleFixReportClick`** (`useCollectionReportDetailsData` hook)
  - Opens fix report confirmation dialog
  - Sets `showFixReportConfirmation` to true

- **`handleFixReportConfirm`** (`useCollectionReportDetailsData` hook)
  - Executes fix operation
  - POSTs to `/api/collection-reports/fix-report`
  - Refreshes report data after fixing
  - Shows success/error toast

### UI Handlers

- **`handleTabChange`** (`useCollectionReportDetailsData` hook)
  - Handles tab changes
  - Updates URL query parameter
  - Updates active tab state

- **`handleSort`** (`useCollectionReportDetailsData` hook)
  - Handles column sorting
  - Updates sort field and direction
  - Re-sorts paginated data

- **`handleIssueClick`** (`useCollectionReportDetailsData` hook)
  - Opens issue details modal
  - Sets selected issue
  - Shows issue modal

### Utilities

- **`animateDesktopTabTransition`** (`lib/helpers/collectionReportDetailPage.ts`)
  - Animates tab transitions on desktop
  - Uses GSAP for smooth animations

---

## Additional Notes

### Automatic Resume Redirect

If a report has `isEditing: true`, the page automatically:

1. Shows toast: "Resuming unfinished edit..."
2. Redirects to `/collection-report?resume=[reportId]`
3. Prevents viewing stale data until edit is finalized

### Performance Optimizations

- Batch aggregation for meter data (single query for all machines)
- Efficient pagination for large machine collections
- Memoized calculations for location totals
- Optimized filtering and sorting

### Role-Based Access

- **Fix Report button**: Developer-only (checks `user.roles.includes('developer')`)
- **View access**: All authenticated users with collection report access
- Issue detection runs for all users, but fixing is developer-only

### Responsive Design

- Desktop: Full table view with all columns, tab navigation, animated transitions
- Mobile: Card layout with key metrics, dropdown tab selector, mobile-optimized buttons

### Data Validation

- Report data validated on load
- Empty state if no data found
- Error handling for invalid report IDs
- Unauthorized access handling (403 errors)
