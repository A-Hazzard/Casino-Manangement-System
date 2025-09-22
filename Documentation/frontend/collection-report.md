
# Collection Report System

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 20th, 2025

## Quick Search Guide (Ctrl+F)

- **amount to collect** - How collection amounts are calculated
- **balance correction** - Balance adjustment logic
- **create report** - Report creation process
- **edit collection** - Editing existing reports
- **financial calculations** - All formulas and calculations
- **financial fields** - Detailed explanation of taxes, advance, variance, etc.
- **machine entries** - Adding machines to reports
- **meter calculations** - Meter reading calculations
- **previous balance** - How previous balance works
- **profit sharing** - Location profit calculations
- **RAM clear** - RAM clear meter handling
- **variance** - Variance calculation and display

## Financial Fields Documentation

For detailed explanations of all financial fields used in collection reports, see:
**[Collection Report Financial Fields](./collection-report-financial-fields.md)**

This document explains:
- **Taxes**: Government taxes and regulatory fees
- **Advance**: Money paid to locations when in negative balance
- **Variance**: Optional field for collection discrepancies (deprecated software meters)
- **Previous Balance**: Outstanding balance from previous collections
- **Amount to Collect**: Total amount to be collected from location
- **Collected Amount**: Actual cash collected by collector
- **Balance Correction**: Manual adjustments to balance
- **Partner Profit**: Location's share of revenue

## Overview

The Collection Report System manages casino slot machine money collection. It calculates amounts to collect based on meter readings, profit sharing, and balance management.

## Collection Process

### Create Report Flow

1. **Select Location** → System loads machines and previous balance
2. **Add Machines** → Enter meter readings for each machine
3. **Financial Inputs** → Enter collected amount, variance, taxes, advance
4. **Auto-Calculations** → System calculates amount to collect and balance correction
5. **Create Report** → Saves to database and updates location balance

### Database Fields

**CollectionReport:**
- `locationReportId` - Unique report identifier
- `collectorName` - Collector performing collection
- `locationName` - Location being collected
- `timestamp` - Collection date/time
- `totalDrop` - Sum of all machine meter movements (metersIn - prevIn)
- `totalCancelled` - Sum of all cancelled credits (metersOut - prevOut)
- `totalGross` - Net revenue (totalDrop - totalCancelled)
- `amountToCollect` - Calculated amount to collect from location
- `amountCollected` - Actual cash collected
- `previousBalance` - Outstanding balance from previous collections
- `currentBalance` - Updated balance after collection
- `balanceCorrection` - Manual adjustment amount
- `partnerProfit` - Location's share of revenue
- `variance` - Difference between expected and actual

**Collection (Machine Entry):**
- `machineId` - Machine identifier
- `locationReportId` - Links to parent report
- `metersIn` - Current meters in reading
- `metersOut` - Current meters out reading
- `prevIn` - Previous meters in reading
- `prevOut` - Previous meters out reading
- `movement.metersIn` - Calculated movement (metersIn - prevIn)
- `movement.metersOut` - Calculated movement (metersOut - prevOut)
- `movement.gross` - Machine gross (metersIn movement - metersOut movement)

## Financial Calculations

### Meter Movement Calculations

**Standard Meters:**
```
Collection Drop = Current metersIn - Previous metersIn
Collection Cancelled = Current metersOut - Previous metersOut
Machine Gross = Collection Drop - Collection Cancelled
```

**RAM Clear Meters (when machine memory resets):**
```
Collection Drop = (RAM Clear metersIn - Previous metersIn) + Current metersIn
Collection Cancelled = (RAM Clear metersOut - Previous metersOut) + Current metersOut
```

**Zero Movement:**
- When current meters equal previous meters = 0 drop, 0 cancelled

### Amount to Collect Calculation

```
Amount to Collect = Total Gross - Variance - Advance - Partner Profit + Previous Balance
```

**Partner Profit Formula:**
```
Partner Profit = Floor((Total Gross - Variance - Advance) × Profit Share % ÷ 100) - Taxes
```

**Example:**
- Total Gross: $1,000
- Variance: $0
- Advance: $50
- Profit Share: 50%
- Taxes: $25
- Previous Balance: $200

```
Partner Profit = Floor((1000 - 0 - 50) × 50 ÷ 100) - 25 = Floor(475) - 25 = $450
Amount to Collect = 1000 - 0 - 50 - 450 + 200 = $700
```

### Balance Correction

**Auto-Calculation:**
```
Balance Correction = Amount Collected (defaults to this value, but editable)
```

**Balance Update:**

# Collection Report Page

## Table of Contents
- [Overview](#overview)
- [Main Features](#main-features)
- [Technical Architecture](#technical-architecture)
- [Report Detail View](#report-detail-view)
- [Business Logic](#business-logic)
- [Data Flow](#data-flow)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Security Features](#security-features)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Overview

The Collection Report page provides comprehensive financial collection management for the casino system, including collection reports, monthly summaries, and collector scheduling. This page serves as the central hub for managing all aspects of casino money collection operations.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 6th, 2025  
**Version:** 2.0.0

### File Information
- **File:** `app/collection-report/page.tsx`
- **URL Pattern:** `/collection-report`
- **Component Type:** Financial Management Page
- **Authentication:** Required

**Note**: For complete system documentation, see the [Collection System Pages Documentation](./collection-system-pages.md).

## Main Features
- **Collection Reports:**
  - View, search, and filter collection reports.
  - Create new collection reports with machine selection.
  - Edit existing collection reports and financial data.
  - Delete collection reports with confirmation.
  - Real-time collection data and variance tracking.
  - Collection performance analytics.
- **Monthly Reports:**
  - Monthly financial summaries and trends.
  - Location-based monthly performance data.
  - Historical collection analysis.
- **Manager Schedules:**
  - Collection scheduling and management.
  - Collector assignment and tracking.
  - Schedule optimization tools.
- **Collector Schedules:**
  - Individual collector performance tracking.
  - Collection route optimization.
  - Collector productivity analytics.
- **Multi-tab Interface:**
  - Four main sections with different functionality.
  - Responsive desktop and mobile layouts.
- **Sidebar Navigation:**
  - Persistent sidebar for navigation to other modules.

## Technical Architecture

### Core Components
- **Main Page:** `app/collection-report/page.tsx` - Entry point with multi-tab layout
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation header
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Collection Report Components:**
  - `components/collectionReport/CollectionDesktopUI.tsx` - Desktop collection view
  - `components/collectionReport/CollectionMobileUI.tsx` - Mobile collection view
  - `components/collectionReport/NewCollectionModal.tsx` - New collection form
- **Monthly Report Components:**
  - `components/collectionReport/MonthlyDesktopUI.tsx` - Desktop monthly view
  - `components/collectionReport/MonthlyMobileUI.tsx` - Mobile monthly view
- **Manager Schedule Components:**
  - `components/collectionReport/ManagerDesktopUI.tsx` - Desktop manager view
  - `components/collectionReport/ManagerMobileUI.tsx` - Mobile manager view
- **Collector Schedule Components:**
  - `components/collectionReport/CollectorDesktopUI.tsx` - Desktop collector view
  - `components/collectionReport/CollectorMobileUI.tsx` - Mobile collector view
- **Utility Components:**
  - `components/dashboard/DashboardDateFilters.tsx` - Date filtering
  - `components/ui/select.tsx` - Dropdown selection components

## Report Detail View (Desktop/Mobile)

- File: `app/collection-report/report/[reportId]/page.tsx`
- API: `GET /api/collection-report/[reportId]`
- Backend helper: `app/api/lib/helpers/accountingDetails.ts#getCollectionReportById`

### What loads on this page
- Three tabs: "Machine Metrics", "Location Metrics", "SAS Metrics Compare" (desktop has tab selectors; mobile shows all in sequence)

### Data sources at a glance
- `locationMetrics` and `sasMetrics` come from MongoDB document in `collectionReports` via `CollectionReport` model
- `machineMetrics` are derived by joining `machines` and reading the matching `collectionMetersHistory` entry for the given `locationReportId`

### Location Metrics – column-to-field mapping
Rendered in `LocationMetricsContent` within `page.tsx`. Values are provided by `getCollectionReportById` which maps raw `CollectionReport` fields to a `LocationMetric` object.

**Data Mapping Explanation:**
- **Gross** = Same as `metersGross` (total revenue from machines)
- **Collected** = Same as `collectedAmount` (actual cash collected)
- **Uncollected** = Same as `amountUncollected` (amount not collected)
- **Location Revenue** = Same as `locationRevenue` (location's share of revenue)
- **Variation** = Difference between Meter Gross and SAS Gross (shows "No SAS Data" if SAS data is missing, "No Variance" if zero)
- **Balance** = Same as `currentBalanceOwed` (current outstanding balance)

**SAS Data Validation:**
The system performs validation checks to determine when SAS data is available:
- **SAS Data Available**: When `sasMeters` object exists and `sasMeters.gross` is not null/undefined/zero
- **SAS Data Missing**: When `sasMeters` is null/undefined or `sasMeters.gross` is null/undefined/zero
- **Variation Calculation**: Only calculated when SAS data is available, otherwise shows "No SAS Data"
- **Consistency**: This validation ensures consistent behavior across all collection report views

| UI Label | Frontend Path | Backend Source (model.field) | Notes |
|---|---|---|---|
| Dropped / Cancelled | `locationMetrics.droppedCancelled` | `collectionReports.totalDrop` / `collectionReports.totalCancelled` | Displayed as `${drop}/${cancelled}` |
| **Meters Gross** | `locationMetrics.metersGross` | `collectionReports.totalGross` | **Same as "Gross" in table** |
| Variation | `locationMetrics.variation` | `collectionReports.variance` | **Same as "Variation" in table, shows "No Variance" if zero** |
| SAS Gross | `locationMetrics.sasGross` | `collectionReports.totalSasGross` | Number, formatted |
| Variance | `locationMetrics.variance` | `collectionReports.variance` | Duplicate of Variation for the detail cards |
| Variance Reason | `locationMetrics.varianceReason` | `collectionReports.varianceReason` | String or '-' |
| Amount To Collect | `locationMetrics.amountToCollect` | `collectionReports.amountToCollect` | Number |
| **Collected Amount** | `locationMetrics.collectedAmount` | `collectionReports.amountCollected` | **Same as "Collected" in table** |
| **Location Revenue** | `locationMetrics.locationRevenue` | `collectionReports.partnerProfit` | **Same as "Location Revenue" in table** |
| **Amount Uncollected** | `locationMetrics.amountUncollected` | `collectionReports.amountUncollected` | **Same as "Uncollected" in table** |
| Machines Number | `locationMetrics.machinesNumber` | `collectionReports.machinesCollected` | String/number |
| Reason For Shortage | `locationMetrics.reasonForShortage` | `collectionReports.reasonShortagePayment` | String or '-' |
| Taxes | `locationMetrics.taxes` | `collectionReports.taxes` | Number |
| Advance | `locationMetrics.advance` | `collectionReports.advance` | Number |
| Previous Balance Owed | `locationMetrics.previousBalanceOwed` | `collectionReports.previousBalance` | Number |
| **Current Balance Owed** | `locationMetrics.currentBalanceOwed` | `collectionReports.currentBalance` | **Same as "Balance" in table** |
| Balance Correction | `locationMetrics.balanceCorrection` | `collectionReports.balanceCorrection` | Number (can be negative) |
| Correction Reason | `locationMetrics.correctionReason` | `collectionReports.balanceCorrectionReas` | String or '-' |

Frontend render locations:
- Mobile summary table and four cards: `LocationMetricsContent` (mobile section)
- Desktop summary ("Location Total") and four detail tables: `LocationMetricsContent` (desktop section)

### Collection Report Table Data Mapping
The main collection report table (in `/collection-report` page) displays the following data with proper mapping:

| Table Column | Data Source | Description |
|---|---|---|
| **Collector** | `collectionReports.collectorName` | Name of the collector who performed the collection |
| **Location** | `collectionReports.locationName` | Name of the gaming location |
| **Gross** | Calculated from `collections.movement.gross` | Total revenue from machines (same as Meters Gross in detail view) |
| **Machines** | Calculated from collections count vs total machines | Number of machines collected vs total machines at location |
| **Collected** | `collectionReports.amountCollected` | Actual cash collected by collectors (same as Collected Amount in detail view) |
| **Uncollected** | `collectionReports.amountUncollected` | Amount not collected (same as Amount Uncollected in detail view) |
| **Variation** | Calculated from `metersGross - sasGross` | Difference between expected and actual (same as Variation in detail view, shows "No Variance" if zero) |
| **Balance** | `collectionReports.currentBalance` | Current outstanding balance (same as Current Balance Owed in detail view) |
| **Location Revenue** | `collectionReports.partnerProfit` | Location's share of revenue (same as Location Revenue in detail view) |
| **Time** | `collectionReports.timestamp` | Date and time when the collection was performed |
| **Details** | Action button | Link to detailed collection report view |

**Data Consistency:** The table data is properly mapped and consistent with the detailed view data. All financial calculations follow standard casino collection procedures and maintain data integrity across the system. The table now includes all required columns as specified in the requirements.

### Machine Metrics – column-to-field mapping
Computed in `getCollectionReportById` by reading `machines` collection and selecting the entry in each machine's `collectionMetersHistory` whose `locationReportId` matches the current report. Frontend component is `MachineMetricsContent` in `page.tsx`.

| UI Column | Backend Source / Formula |
|---|---|
| MACHINE ID | `machines.serialNumber` fallback `machines._id` |
| DROP/CANCELLED | `${metersInDiff} / 0` (current placeholder) where `metersInDiff = history.metersIn - history.prevMetersIn` |
| METER GROSS | `metersInDiff - metersOutDiff`, where `metersOutDiff = history.metersOut - history.prevMetersOut` |
| SAS GROSS | Placeholder `'-'` (extend if SAS meter join is added) |
| VARIATION | Placeholder `'-'` (extend if needed) |
| SAS TIMES | `history.timestamp` (ISO string) |

### SAS Metrics Compare – column-to-field mapping
Provided by `sasMetrics` in `getCollectionReportById` and rendered by `SASMetricsCompareContent`.

| UI Row | Frontend Path | Backend Source |
|---|---|---|
| SAS Drop Total | `totalSasDrop` | `collectionReports.totalSasGross` (current placeholder) |
| SAS Cancelled Total | `totalSasCancelled` | `0` (placeholder; wire to actual cancelled if available) |
| SAS Gross Total | `totalSasGross` | `collectionReports.totalSasGross` |

Notes:
- The placeholders above reflect current implementation; when SAS drop/cancelled are introduced, update `getCollectionReportById` and this table accordingly.

### Navigation & State
- Desktop uses left-side tab buttons rendered as `<TabButton label=... />` to set `activeTab` state.
- Mobile hides tabs and shows all three sections in sequence.


### State Management
- **Global Store:** `lib/store/dashboardStore.ts` - Licensee and filter state
- **Local State:** React `useState` hooks for complex UI state
- **Key State Properties:**
  - `activeTab` - Current tab (collection/monthly/manager/collector)
  - `collectionReports`, `monthlyData`, `schedulerData`, `collectorData` - Data arrays
  - `loading`, `refreshing` - Loading states
  - `searchTerm`, `selectedLocation` - Search and filter states
  - `currentPage`, `totalPages` - Pagination state
  - Modal states for various operations

### Data Flow
1. **Initial Load:** Fetches data based on active tab and filters
2. **Tab Switching:** Loads appropriate data for each tab
3. **Search/Filter:** Filters data based on search terms and criteria
4. **Pagination:** Displays paginated results
5. **Real-time Updates:** Refreshes data after operations
6. **Date Range Changes:** Updates data based on selected time periods

### API Integration

#### Collection Report Endpoints
- **GET `/api/collectionReport`** - Fetches collection reports
  - Parameters: `licensee`, `timePeriod`, `startDate`, `endDate`
  - Returns: Array of collection report objects
- **POST `/api/collectionReport`** - Creates new collection report
  - Body: Collection report data
  - Returns: `{ success: true, data: CollectionReport }`
- **GET `/api/collectionReport/[reportId]`** - Fetches specific report
  - Parameters: `reportId`
  - Returns: Detailed collection report information

#### Monthly Report Endpoints
- **GET `/api/collectionReport/monthly`** - Fetches monthly summaries
  - Parameters: `startDate`, `endDate`, `locationName`
  - Returns: Monthly report summary and details

#### Scheduler Endpoints
- **GET `/api/schedulers`** - Fetches manager schedules
  - Parameters: `licensee`, `timePeriod`
  - Returns: Array of scheduler objects

#### Data Processing
- **Collection Report Helper:** `lib/helpers/collectionReport.ts` - Collection management utilities
  - `getAllCollectionReports()` - Fetches collection reports with filtering
  - `fetchMonthlyReportSummaryAndDetails()` - Fetches monthly report data
  - `fetchCollectionReportsByLicencee()` - Fetches reports by licensee
  - `fetchCollectionReportById()` - Fetches specific report details
  - `createCollectionReport()` - Creates new collection report
  - `getAllLocationNames()` - Fetches available location names
  - `getLocationsWithMachines()` - Fetches locations with machine data
- **Collector Schedules Helper:** `lib/helpers/collectorSchedules.ts` - Collector management
  - `fetchAndFormatCollectorSchedules()` - Fetches and formats collector data
- **Collection Report Page Helper:** `lib/helpers/collectionReportPage.ts` - Page utilities
  - `filterCollectionReports()` - Filters collection reports
  - `calculatePagination()` - Calculates pagination data
  - `fetchAndFormatSchedulers()` - Fetches and formats scheduler data
  - `setLastMonthDateRange()` - Sets date range for last month

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useCallback`, `useMemo` - State management
- **Next.js:** `usePathname` - Navigation and routing
- **GSAP:** Animation library for smooth transitions
- **Axios:** HTTP client for API calls
- **Radix UI:** Select components for dropdowns
- **React Day Picker:** Date range selection
- **Sonner:** Toast notifications for user feedback

#### Type Definitions
- **Collection Report Types:** `lib/types/componentProps.ts` - Collection report types
  - `CollectionReportRow`, `MonthlyReportSummary`, `MonthlyReportDetailsRow`
- **API Types:** `lib/types/api.ts` - API-related types
  - `CreateCollectionReportPayload`, `CollectionReportLocationWithMachines`
- **Component Types:** `lib/types/components.ts` - Component-specific types
  - `CollectorSchedule`
- **Location Types:** `lib/types/location.ts` - Location management types
  - `LocationSelectItem`
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Date Utils:** `react-day-picker` - Date range selection
  - `DateRange` - Date range type for filtering
- **Animation Utils:** GSAP for smooth transitions
  - `animatePagination()`, `animateTableRows()`, `animateCards()`

### Component Hierarchy
```
CollectionReportPage (app/collection-report/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── DashboardDateFilters (components/dashboard/DashboardDateFilters.tsx)
├── Tab Navigation (Collection/Monthly/Manager/Collector)
├── Collection Tab
│   ├── CollectionDesktopUI (components/collectionReport/CollectionDesktopUI.tsx)
│   ├── CollectionMobileUI (components/collectionReport/CollectionMobileUI.tsx)
│   └── NewCollectionModal (components/collectionReport/NewCollectionModal.tsx)
├── Monthly Tab
│   ├── MonthlyDesktopUI (components/collectionReport/MonthlyDesktopUI.tsx)
│   └── MonthlyMobileUI (components/collectionReport/MonthlyMobileUI.tsx)
├── Manager Tab
│   ├── ManagerDesktopUI (components/collectionReport/ManagerDesktopUI.tsx)
│   └── ManagerMobileUI (components/collectionReport/ManagerMobileUI.tsx)
└── Collector Tab
    ├── CollectorDesktopUI (components/collectionReport/CollectorDesktopUI.tsx)
    └── CollectorMobileUI (components/collectionReport/CollectorMobileUI.tsx)
```

### Business Logic
- **Collection Management:** Complete collection report lifecycle with full CRUD operations
- **Financial Tracking:** Variance analysis and performance metrics
- **Scheduling:** Collection scheduling and optimization
- **Performance Analytics:** Collector and location performance analysis
- **Search & Filtering:** Real-time search across multiple fields
- **Pagination:** Efficient data display with configurable page sizes

## CRUD Operations

### Create Collection Reports
**Process Flow:**
1. **Location Selection**: User selects a gaming location from dropdown
2. **Machine Selection**: System displays all machines at selected location
3. **Data Entry**: User enters meter readings and financial data for each machine
4. **Validation**: System validates all inputs and calculates totals
5. **Report Generation**: System creates individual collections and generates report
6. **Database Storage**: Collections and report stored in MongoDB
7. **UI Update**: Main page refreshes to show new report

**Data Structure:**
```typescript
CollectionReport {
  _id: string;
  locationReportId: string;
  collectorName: string;
  locationName: string;
  timestamp: Date;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  amountCollected: number;
  amountUncollected: number;
  variance: number;
  currentBalance: number;
  partnerProfit: number;
  machinesCollected: number;
  totalMachines: number;
}
```

### Read Collection Reports
**Process Flow:**
1. **Data Fetching**: System fetches reports from `/api/collectionReport`
2. **Filtering**: Applies date range, location, and search filters
3. **Sorting**: Sorts by date, amount, or other criteria
4. **Pagination**: Displays results in configurable page sizes
5. **Real-time Updates**: Refreshes data when filters change

**Display Formats:**
- **Desktop**: Table view with detailed columns
- **Mobile**: Card view with key information
- **Detail View**: Comprehensive report analysis

### Update Collection Reports
**Process Flow:**
1. **Report Selection**: User selects report to edit
2. **Data Loading**: System loads current report data
3. **Form Population**: Edit form populated with existing values
4. **User Modifications**: User updates financial data, notes, or corrections
5. **Validation**: System validates changes and calculates new totals
6. **Database Update**: Report updated in MongoDB
7. **UI Refresh**: Interface updates to reflect changes

**Editable Fields:**
- Financial amounts (collected, uncollected, variance)
- Balance corrections and reasons
- Collection notes and comments
- Machine meter readings
- Tax and advance amounts

### Delete Collection Reports
**Process Flow:**
1. **Report Selection**: User selects report to delete
2. **Confirmation Modal**: System shows confirmation dialog
3. **Dependency Check**: System verifies no dependent records exist
4. **Soft Delete**: Report marked as deleted (deletedAt timestamp)
5. **Cascade Updates**: Related collections updated accordingly
6. **UI Update**: Report removed from interface

**Safety Measures:**
- Confirmation dialog prevents accidental deletion
- Soft delete preserves audit trail
- Dependency checking prevents orphaned records
- Rollback capability for data recovery

## Collection Report CRUD Features (September 19th, 2025)

### Create Collection Reports - Enhanced Features

**New Collection Modal (`NewCollectionModal.tsx`):**
- **Location Selection**: Dropdown to select gaming location
- **Machine Selection**: List of machines at selected location with current meter readings
- **Batch Collection**: Add multiple machines to single collection report
- **Real-time Validation**: Immediate feedback on meter readings and financial inputs
- **RAM Clear Support**: Handle machine memory resets with special meter inputs
- **Financial Calculations**: Auto-calculate amount to collect, balance corrections, and partner profit
- **Fresh Data Fetching**: Always fetches latest machine data when modal opens

**Key Features:**
- **Machine Entry Management**: Add/remove machines from collection batch
- **Meter Reading Validation**: Prevents invalid meter readings (backwards without RAM Clear)
- **Financial Input Validation**: Ensures all required financial fields are completed
- **Auto-calculation**: Real-time calculation of amounts and balances
- **Cache-busting**: Ensures fresh data is always displayed

### Edit Collection Reports - New Implementation

**Edit Collection Modal (`EditCollectionModal.tsx`):**
- **Pencil Icon**: Click pencil icon on any collection entry to edit
- **Edit Mode**: Form fields populate with existing data
- **Cancel/Update Buttons**: Clear edit controls with confirmation
- **Real-time Updates**: Changes reflect immediately in the interface
- **Machine Meter Updates**: Edit meter readings for individual machines
- **Financial Data Updates**: Modify collected amounts, variance, taxes, advance
- **History Tracking**: Updates machine collection history appropriately

**Edit Process Flow:**
1. **Click Pencil Icon**: User clicks edit button on collection entry
2. **Form Population**: System loads existing data into form fields
3. **Make Changes**: User modifies meter readings or financial data
4. **Update Confirmation**: System shows confirmation dialog
5. **Database Update**: Changes saved to database with proper history tracking
6. **UI Refresh**: Interface updates to show new values

**Edit Features:**
- **Individual Machine Editing**: Edit specific machines within a collection
- **Financial Field Updates**: Modify all financial calculations
- **Meter Reading Updates**: Change current meter readings
- **Notes and Comments**: Update collection notes and reasons
- **Timestamp Updates**: Modify collection time if needed

### Delete Collection Reports - Comprehensive Cleanup

**Delete Process (`delete-by-report` API):**
- **Complete Cleanup**: Deletes ALL collections and history entries for the report
- **Machine Meter Reversion**: Reverts each machine's meters to previous values
- **History Cleanup**: Removes ALL `collectionMetersHistory` entries for the report
- **Database Integrity**: Ensures no orphaned records remain
- **Verification**: Confirms complete deletion with logging

**Delete Features:**
- **Bulk Deletion**: Removes all collections associated with the report
- **Machine Reversion**: Each machine's meters revert to their individual previous values
- **History Management**: Cleans up all collection history entries
- **Audit Trail**: Maintains complete deletion log
- **Safety Checks**: Prevents accidental deletion with confirmation dialogs

**Delete Safety Measures:**
- **Confirmation Dialogs**: Multiple confirmation steps prevent accidental deletion
- **Data Verification**: Checks that all data is properly cleaned up
- **Machine Reversion**: Ensures machines return to correct previous state
- **History Cleanup**: Removes all traces of the deleted report
- **Rollback Prevention**: Ensures deleted data cannot be accidentally recovered

### Enhanced User Interface Features

**Visual Indicators:**
- **Pencil Icons**: Clear edit buttons on all collection entries
- **Status Indicators**: Visual feedback for edit mode, processing states
- **Confirmation Dialogs**: Clear confirmation for all destructive actions
- **Loading States**: Skeleton loaders during data fetching
- **Toast Notifications**: User feedback for all operations

**Responsive Design:**
- **Desktop Interface**: Full-featured table view with all controls
- **Mobile Interface**: Optimized card view for mobile devices
- **Touch-friendly**: Large buttons and touch targets for mobile
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Data Integrity and Validation

**Input Validation:**
- **Meter Reading Validation**: Prevents invalid meter progressions
- **Financial Validation**: Ensures all monetary values are valid
- **Required Field Validation**: All mandatory fields must be completed
- **Range Validation**: Ensures values are within reasonable ranges
- **Format Validation**: Proper number and date formats required

**Data Consistency:**
- **Real-time Calculations**: All financial calculations update immediately
- **Cross-field Validation**: Related fields validate against each other
- **History Tracking**: All changes tracked in machine history
- **Audit Trail**: Complete record of all modifications
- **Data Freshness**: Always displays current data from database

### Performance Optimizations

**Efficient Data Handling:**
- **Cache-busting**: Ensures fresh data on every modal open
- **Selective Updates**: Only updates changed fields
- **Batch Operations**: Handles multiple machines efficiently
- **Optimized Queries**: Efficient database queries for large datasets
- **Memory Management**: Proper cleanup of component state

**User Experience:**
- **Instant Feedback**: Immediate validation and calculation updates
- **Smooth Animations**: GSAP-powered transitions and loading states
- **Error Handling**: Graceful error handling with user-friendly messages
- **Loading States**: Clear indication of processing status
- **Success Feedback**: Confirmation of successful operations

### Collection Report Lifecycle and Meter Management

#### **Collection Report Creation Process**

When a collection report is created, the system follows this sequence:

1. **Machine Selection**: User selects machines and enters current meter readings
2. **Report Creation**: System creates the collection report with entered meter values
3. **Machine Update**: System updates each machine's `collectionMeters.metersIn` and `collectionMeters.metersOut` to the new values
4. **History Tracking**: System adds the report ID to each machine's `collectionMetersHistory` array

#### **Previous Meter Values Display**

The "Prev In" and "Prev Out" values shown in the New Collection Modal represent the machine's current `collectionMeters.metersIn` and `collectionMeters.metersOut` values from the database. These values should reflect the last successful collection for that machine.

#### **Collection Report Deletion and Meter Reversion**

When a collection report is deleted:

1. **Report Removal**: The collection report is deleted from the database
2. **Associated Collections**: All collections within the report are deleted
3. **Machine Meter Reversion**: **Each machine individually** has its `collectionMeters.metersIn` and `collectionMeters.metersOut` reverted to their respective previous values (before the deleted report)
4. **History Cleanup**: The report ID is removed from each machine's `collectionMetersHistory` array

#### **Multi-Machine Collection Report Deletion**

For collection reports with multiple machines, the system handles reversion **per machine**:

**Data Storage Strategy:**
- Each machine collection stores its own `prevIn` and `prevOut` values when created
- These values represent what the machine's meters were **before** this specific collection
- Each collection document maintains its own snapshot of previous state

**Deletion Process:**
```typescript
// For each machine in the collection report:
for (const collection of associatedCollections) {
  // Revert THIS specific machine to ITS previous values
  const previousMetersIn = collection.prevIn || 0;   // Machine A: 88, Machine B: 150, etc.
  const previousMetersOut = collection.prevOut || 0; // Machine A: 77, Machine B: 120, etc.
  
  await Machine.findByIdAndUpdate(collection.machineId, {
    $set: {
      "collectionMeters.metersIn": previousMetersIn,
      "collectionMeters.metersOut": previousMetersOut,
    }
  });
}
```

**Example Multi-Machine Scenario:**
- **Machine A**: Previous (88, 77) → Collection (22, 22) → **Reverts to (88, 77)**
- **Machine B**: Previous (150, 120) → Collection (45, 35) → **Reverts to (150, 120)**
- **Machine C**: Previous (200, 180) → Collection (60, 55) → **Reverts to (200, 180)**

Each machine is reverted to **its own specific previous values**, not a global previous state.

#### **Expected Behavior Scenarios**

**Scenario 1: Create Report → Delete It → Create New Report**
- **Initial State**: Machine meters = (88, 77)
- **After Creation**: Machine meters = (22, 22) 
- **After Deletion**: Machine meters = (88, 77) - reverted back
- **New Report**: Prev In = 88, Prev Out = 77 ✅

**Scenario 2: Create Report → Create Another Report (Without Deletion)**
- **Initial State**: Machine meters = (88, 77)
- **After First Creation**: Machine meters = (22, 22)
- **Second Report**: Prev In = 22, Prev Out = 22 ✅

#### **Meter Display Refresh - RESOLVED**

**Previous Problem**: When creating a new collection report, the New Collection Modal was not refreshing the machine data to show updated meter values, causing "Prev In" and "Prev Out" to display stale values.

**Root Cause**: The modal was only using machine data from the locations prop and not fetching fresh data when opening.

**Solution Implemented**: Added a useEffect that fetches fresh machine data from the API whenever the modal opens with a selected location, ensuring "Prev In" and "Prev Out" values are always current.

#### **Edit Collection Reports**

Collection reports can be edited to modify:
- Machine meter readings
- Financial information (amounts, taxes, advances)
- Collection timestamps
- Machine entries (add/remove machines)

When editing a collection report:
- Machine meters are updated to reflect the new values
- Financial calculations are recalculated
- Collection history is updated
- All changes are logged in the activity log

#### **Data Integrity and Validation**

The system ensures data integrity through:
- **Meter Validation**: Prevents invalid meter readings (e.g., meters going backwards without RAM Clear)
- **Financial Validation**: Ensures balance calculations are accurate
- **History Tracking**: Maintains complete audit trail of all changes
- **Cascading Updates**: Updates all related entities when reports are modified or deleted

### Collection Detail Operations
**Machine Metrics Tab:**
- **View**: Display individual machine collection data
- **Search**: Find specific machines by ID or name
- **Sort**: Sort by drop, gross, or variance
- **Export**: Export machine data to CSV/Excel

**Location Metrics Tab:**
- **View**: Display aggregated location financial data
- **Edit**: Modify location-level financial information
- **Calculate**: Automatic calculation of totals and variances
- **Validate**: Ensure data consistency and accuracy

**SAS Metrics Compare Tab:**
- **Compare**: Side-by-side comparison of SAS vs meter data
- **Analyze**: Variance analysis and discrepancy identification
- **Report**: Generate variance reports for audit purposes

### Security Features
- **Authentication:** Secure API calls with authentication headers
- **Authorization:** Role-based access to collection operations
- **Input Validation:** Comprehensive validation for all form inputs
- **Data Sanitization:** Safe handling of user input

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Network Issues:** Retry logic and fallback error states
- **Loading States:** Skeleton loaders and loading indicators
- **Toast Notifications:** User feedback for all operations

### Performance Optimizations
- **Memoization:** `useMemo` for expensive computations (filtering, sorting, pagination)
- **Conditional Rendering:** Separate desktop/mobile layouts
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **GSAP Animations:** Smooth transitions and loading states

## Notes Section

### How the Collection Report Page Works (Simple Explanation)

The collection report page is like a **financial control center for your casino's money collection process**. Here's how it works:

#### **Collection Reports Section**

**💰 What Collection Reports Are**
- **Collection**: Queries the `collectionReports` collection in the database
- **Fields Used**: `locationReportId`, `collectorName`, `locationName`, `totalGross`, `amountCollected`, `amountUncollected`
- **Simple Explanation**: These are records of when money was collected from slot machines - like bank deposits for each casino location

**📊 Collection Performance Metrics**
- **Collection**: Aggregates data from `collectionReports` collection
- **Fields Used**: `totalGross`, `amountCollected`, `amountUncollected`, `variance`, `partnerProfit`
- **Simple Explanation**: Shows how much money was supposed to be collected vs. how much was actually collected, and any discrepancies

**🔍 How Collection Search Works**
- **Collection**: Filters the `collectionReports` collection
- **Fields Used**: Searches by `locationName`, `collectorName`, `locationReportId`
- **Simple Explanation**: Like finding a specific bank deposit record - you can search by location, collector, or report ID

#### **Monthly Reports Section**

**📅 What Monthly Reports Are**
- **Collection**: Aggregates data from `collectionReports` collection by month
- **Fields Used**: Groups by month, sums up `totalGross`, `amountCollected`, `drop`, `cancelledCredits`
- **Simple Explanation**: Shows monthly summaries of all collections - like monthly bank statements for your casino

**📈 Monthly Performance Trends**
- **Collection**: Queries `collectionReports` with date range filtering
- **Fields Used**: `timestamp`, `totalGross`, `amountCollected` per month
- **Simple Explanation**: Shows whether collections are increasing or decreasing over time

#### **Manager Schedules Section**

**👨‍💼 What Manager Schedules Are**
- **Collection**: Queries the `schedulers` collection
- **Fields Used**: `creator`, `collector`, `location`, `startTime`, `endTime`, `status`
- **Simple Explanation**: These are schedules for when collectors should visit each location to collect money

**📋 Schedule Management**
- **Collection**: Updates `schedulers` collection
- **Fields Used**: `creator`, `collector`, `location`, `startTime`, `endTime`
- **Simple Explanation**: Like creating work schedules - managers assign collectors to specific locations at specific times

#### **Collector Schedules Section**

**👷 What Collector Schedules Are**
- **Collection**: Queries `schedulers` collection filtered by collector
- **Fields Used**: `collector`, `location`, `startTime`, `endTime`, `status`
- **Simple Explanation**: Shows each collector's work schedule - like a personal calendar for each money collector

**📊 Collector Performance**
- **Collection**: Aggregates `collectionReports` data by collector
- **Fields Used**: Groups by `collectorName`, sums up `amountCollected`, `variance`
- **Simple Explanation**: Shows how much money each collector is responsible for and how well they're doing

#### **Database Queries Explained**

**For Collection Reports:**
```javascript
// Queries the collectionReports collection
// Filters by: licensee, date range, location
// Returns: collection reports with financial data
```

**For Monthly Reports:**
```javascript
// Queries collectionReports collection
// Groups by: month
// Aggregates: financial metrics per month
// Returns: monthly summaries and trends
```

**For Manager Schedules:**
```javascript
// Queries the schedulers collection
// Filters by: licensee, time period
// Returns: collection schedules and assignments
```

**For Collector Schedules:**
```javascript
// Queries schedulers collection
// Filters by: collector, time period
// Returns: individual collector schedules
```

#### **Why This Matters for Casino Operations**

**💰 Collection Management Benefits:**
- **Financial Control**: Track exactly how much money is being collected
- **Variance Tracking**: Identify discrepancies between expected and actual collections
- **Audit Trail**: Maintain records for regulatory compliance
- **Performance Monitoring**: See which locations and collectors are most efficient

**📅 Monthly Reporting Benefits:**
- **Financial Planning**: Understand monthly revenue patterns
- **Trend Analysis**: See if collections are improving or declining
- **Budgeting**: Use historical data for future planning
- **Regulatory Compliance**: Generate reports for authorities

**👨‍💼 Schedule Management Benefits:**
- **Efficiency**: Optimize collection routes and timing
- **Accountability**: Track who is responsible for each collection
- **Resource Planning**: Ensure adequate collector coverage
- **Communication**: Keep everyone informed of collection schedules

**👷 Collector Management Benefits:**
- **Performance Tracking**: Monitor individual collector effectiveness
- **Training Needs**: Identify collectors who need additional training
- **Workload Distribution**: Ensure fair distribution of collection responsibilities
- **Incentive Programs**: Reward high-performing collectors

**📊 Operational Benefits:**
- **Cash Flow Management**: Ensure consistent cash flow from slot machines
- **Risk Management**: Identify and address collection discrepancies quickly
- **Compliance**: Meet regulatory requirements for financial reporting
- **Efficiency**: Optimize the entire collection process

The collection report page essentially **manages the money flow from your slot machines to your bank account**, ensuring that all money is properly collected, tracked, and reported for both operational and regulatory purposes.

## Financial Calculations Analysis

### Collection Report Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

#### **Total Drop (Money Collected) ✅**
- **Current Implementation**: `collectionReports.totalDrop`
- **Financial Guide**: Uses `drop` field for physical money collected ✅ **MATCHES**
- **Business Context**: Physical cash collected from machines during collection period
- **Data Source**: Aggregated from meter readings during collection

#### **Total Cancelled Credits ✅**
- **Current Implementation**: `collectionReports.totalCancelled`
- **Financial Guide**: Uses `totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Credits paid out to players during collection period
- **Data Source**: Aggregated from meter readings during collection

#### **Meters Gross Revenue ✅**
- **Current Implementation**: `collectionReports.totalGross`
- **Mathematical Formula**: `totalGross = totalDrop - totalCancelled`
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Business Context**: Net revenue from machines before collection costs

#### **SAS Gross Revenue ✅**
- **Current Implementation**: `collectionReports.totalSasGross`
- **Mathematical Formula**: `sasGross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)` for SAS machines
- **Financial Guide**: Uses `movement.drop` and `movement.totalCancelledCredits` ✅ **MATCHES**
- **Business Context**: Gross revenue specifically from SAS-enabled machines

#### **Variance Calculation ✅**
- **Current Implementation**: 
  ```javascript
  variance = metersGross - sasGross
  ```
- **Business Logic**: Difference between expected (SAS) and actual (meters) gross revenue
- **Financial Context**: Identifies discrepancies in collection data
- ✅ **CONSISTENT** - Standard variance calculation for audit purposes

#### **Amount To Collect ✅**
- **Current Implementation**: `collectionReports.amountToCollect`
- **Business Logic**: Expected amount to be collected based on meter readings
- **Calculation**: Based on location's profit share percentage and gross revenue
- ✅ **BUSINESS LOGIC** - Collection amount calculation per location agreement

#### **Amount Collected ✅**
- **Current Implementation**: `collectionReports.amountCollected`
- **Business Context**: Actual physical cash collected by collectors
- **Validation**: Should match expected collection amount within variance tolerance
- ✅ **OPERATIONAL** - Actual collection tracking

#### **Partner/Location Revenue ✅**
- **Current Implementation**: `collectionReports.partnerProfit`
- **Business Logic**: Location's share of revenue based on profit sharing agreement
- **Calculation**: `partnerProfit = gross * (100 - profitSharePercentage) / 100`
- ✅ **BUSINESS LOGIC** - Revenue sharing calculation

#### **Balance Management ✅**
- **Current Implementation**: 
  ```javascript
  currentBalance = previousBalance + amountToCollect - amountCollected + balanceCorrection
  ```
- **Business Logic**: Running balance calculation for location accounts
- **Components**:
  - `previousBalance`: Outstanding amount from previous collections
  - `amountToCollect`: Current period's collection amount
  - `amountCollected`: Actual amount collected
  - `balanceCorrection`: Manual adjustments (positive or negative)
- ✅ **ACCOUNTING** - Standard balance calculation

### Mathematical Formulas Summary

#### **Core Collection Metrics**
```
Total Drop = Σ(movement.drop) during collection period
Total Cancelled Credits = Σ(movement.totalCancelledCredits) during collection period
Meters Gross = Total Drop - Total Cancelled Credits
SAS Gross = Σ(movement.drop) - Σ(movement.totalCancelledCredits) for SAS machines only
```

#### **Variance and Audit Calculations**
```
Variance = Meters Gross - SAS Gross
Variance Percentage = (Variance / SAS Gross) * 100
Collection Accuracy = (Amount Collected / Amount To Collect) * 100
```

#### **Revenue Sharing Calculations**
```
Amount To Collect = Gross Revenue * (Profit Share Percentage / 100)
Partner Revenue = Gross Revenue * ((100 - Profit Share Percentage) / 100)
Location Balance = Previous Balance + Amount To Collect - Amount Collected + Balance Correction
```

#### **Monthly Aggregations**
```
Monthly Total Drop = Σ(totalDrop) for all reports in month
Monthly Total Gross = Σ(totalGross) for all reports in month
Monthly Average Variance = AVG(variance) for all reports in month
```

#### **Collector Performance Metrics**
```
Collector Total Collections = COUNT(reports WHERE collectorName = collector)
Collector Total Amount = Σ(amountCollected WHERE collectorName = collector)
Collector Average Variance = AVG(variance WHERE collectorName = collector)
Collector Efficiency = (Total Collected / Total Expected) * 100
```

### Data Validation & Error Handling

#### **Input Validation ✅**
- **Report ID**: Validates MongoDB ObjectId format
- **Date Ranges**: Validates ISO date format for filtering
- **Financial Values**: Validates numeric values for all monetary fields
- **Collector Assignment**: Validates collector exists and is authorized

#### **Data Integrity ✅**
- **Variance Tolerance**: Validates variance within acceptable limits
- **Balance Reconciliation**: Ensures balance calculations are accurate
- **Collection Verification**: Validates collected amounts against expected amounts
- **Audit Trail**: Maintains complete record of all collection activities

### Required Verification

**All collection calculations appear to align with standard financial practices:**

1. **Drop and Cancelled Credits**: Use standard meter fields ✅
2. **Gross Revenue**: Standard calculation (drop - cancelled credits) ✅
3. **Variance Calculation**: Standard audit calculation ✅
4. **Revenue Sharing**: Standard business calculation ✅
5. **Balance Management**: Standard accounting calculation ✅

**Note**: Collection report calculations follow standard financial practices and appear to be correctly implemented according to casino collection procedures.

## Detailed Financial Calculation Formulas

### Amount to Collect Formula

The **Amount to Collect** is calculated using a comprehensive formula that considers profit sharing, taxes, variance, advance payments, and previous balance.

#### **Formula:**
```
Amount to Collect = gross - variance - advance - partnerProfit + locationPreviousBalance
```

Where:
- **gross** = Σ(drop - cancelledCredits) across all machines
- **drop** = Σ(metersIn - prevIn) across all machines  
- **cancelledCredits** = Σ(metersOut - prevOut) across all machines
- **partnerProfit** = Math.floor((gross - variance - advance) * profitShare / 100) - taxes
- **locationPreviousBalance** = Outstanding balance from previous collections

#### **What This Means:**
- **gross**: Total revenue from all machines (money in minus money out)
- **variance**: Optional adjustment for collection discrepancies
- **advance**: Money paid to location when in negative balance
- **partnerProfit**: Location's share of revenue (calculated with profit share percentage)
- **locationPreviousBalance**: Previous outstanding balance from database

#### **Step-by-Step Example:**

**Scenario**: Collecting from Machine A
- **Previous meter reading (prevIn)**: 400
- **Current meter reading (metersIn)**: 300

**Calculation:**
```
Amount to Collect = (metersIn - prevIn) / 2
Amount to Collect = (300 - 400) / 2
Amount to Collect = -100 / 2
Amount to Collect = -50
```

**Result**: The location owes $50 to the casino (negative amount means money flows back to casino)

#### **Another Example:**

**Scenario**: Collecting from Machine B
- **Previous meter reading (prevIn)**: 200
- **Current meter reading (metersIn)**: 500

**Calculation:**
```
Amount to Collect = (metersIn - prevIn) / 2
Amount to Collect = (500 - 200) / 2
Amount to Collect = 300 / 2
Amount to Collect = 150
```

**Result**: The casino owes $150 to the location (positive amount means money flows to location)

### Balance Correction System

**Balance Correction** is used to adjust the running balance when there are discrepancies, errors, or special circumstances that require manual adjustment.

#### **How Balance Correction Works:**

1. **When you enter a Collected Amount**, it gets added to the Balance Correction
2. **Balance Correction** can be positive or negative
3. **Positive Balance Correction**: Adds money to the location's account
4. **Negative Balance Correction**: Removes money from the location's account

#### **Balance Correction Formula:**
```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
```


### Previous Balance

- **Source**: `location.collectionBalance` field
- **Purpose**: Outstanding balance from previous collections
- **Update**: Automatically updated after each collection
- **Display**: Read-only field showing last collection balance

## Machine Entry Management

### Adding Machines

1. **Select Location** → Loads machines at that location
2. **Click Machine** → Opens meter entry form
3. **Enter Readings** → Current metersIn and metersOut
4. **RAM Clear** → Check if machine memory was reset
5. **Submit** → Calculates movement and adds to collection

### Machine Entry Fields

- **Current Meters In** - Required meter reading
- **Current Meters Out** - Required meter reading
- **RAM Clear** - Checkbox if machine memory was reset
- **RAM Clear Meters In** - Required if RAM Clear checked
- **RAM Clear Meters Out** - Required if RAM Clear checked

### Validation Rules

- All meter readings must be positive numbers
- RAM Clear fields required when checkbox checked
- Current readings must be reasonable values
- Previous readings loaded from machine history

## Collection Report Editing

### Editable Fields

**Financial Fields:**
- `amountCollected` - Actual cash collected
- `variance` - Difference from expected
- `varianceReason` - Explanation for variance
- `taxes` - Tax deductions
- `advance` - Advance payments
- `balanceCorrection` - Manual adjustment
- `balanceCorrectionReas` - Reason for correction

**Read-Only Fields:**
- `amountToCollect` - Auto-calculated
- `previousBalance` - From location data
- `currentBalance` - Auto-calculated

### Edit Process

1. **Load Report** → Loads existing data
2. **Modify Fields** → Edit financial inputs
3. **Auto-Recalculate** → System updates dependent fields
4. **Save Changes** → Updates database and location balance

## Variance Calculation

### Variance Display

- **No SAS Data** → Shows "No SAS Data"
- **Zero Variance** → Shows "No Variance"
- **Positive Variance** → Meters exceed SAS data
- **Negative Variance** → SAS data exceeds meters

### Variance Formula

```
Variance = Meters Gross - SAS Gross
```

## Database Collections

### Primary Collections

- **collectionReports** - Main collection reports
- **collections** - Individual machine entries
- **machines** - Machine data and history
- **gaminglocations** - Location data and balances

### Key Relationships

```
CollectionReport (1) ←→ (Many) Collection
Collection (Many) ←→ (1) Machine
CollectionReport (Many) ←→ (1) GamingLocation
```

## API Endpoints

- `GET /api/collectionReport` - List reports
- `POST /api/collectionReport` - Create report
- `PUT /api/collectionReport/[id]` - Update report
- `GET /api/collection-report/[id]` - Get report details
- `GET /api/collections` - List machine entries
- `POST /api/collections` - Add machine entry
- `PATCH /api/collections/[id]` - Update machine entry

## Common Issues

**Amount to Collect shows zero:**
- No machine entries added
- Add at least one machine with meter readings

**Balance Correction not updating:**
- Collected amount field not filled
- Enter actual amount collected

**Variance shows "No SAS Data":**
- Normal for non-SAS machines
- SAS data not available for this machine

**Cannot edit collection:**
- Check report status and user permissions
- Report may be completed or locked

## Security & Compliance

- **Authentication** - JWT tokens required
- **Role-Based Access** - Different permissions for collectors vs managers
- **Audit Trail** - All changes logged with user and timestamp
- **Data Validation** - All inputs validated before storage
- **Audit Logging** - Complete history of all collection activities

#### **Step-by-Step Example:**

**Scenario**: Location has an outstanding balance that needs adjustment

**Initial State:**
- **Previous Balance**: $1,000 (location owes casino)
- **Amount to Collect**: $200 (from current collection)
- **Amount Collected**: $180 (actual cash collected)
- **Balance Correction**: $0 (no previous corrections)

**Calculation:**
```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
New Balance = $1,000 + $200 - $180 + $0
New Balance = $1,020
```

**Result**: Location now owes $1,020 to the casino

#### **Balance Correction Example:**

**Scenario**: Collector found an extra $50 that wasn't recorded properly

**State:**
- **Previous Balance**: $1,020
- **Amount to Collect**: $150 (from new collection)
- **Amount Collected**: $150 (actual cash collected)
- **Balance Correction**: -$50 (negative because we're removing the extra $50)

**Calculation:**
```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
New Balance = $1,020 + $150 - $150 + (-$50)
New Balance = $1,020 + $0 - $50
New Balance = $970
```

**Result**: Location now owes $970 to the casino (reduced by $50 due to correction)

#### **Another Balance Correction Example:**

**Scenario**: Location had a machine malfunction and needs a $100 credit

**State:**
- **Previous Balance**: $970
- **Amount to Collect**: $200 (from current collection)
- **Amount Collected**: $200 (actual cash collected)
- **Balance Correction**: +$100 (positive because we're giving credit)

**Calculation:**
```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
New Balance = $970 + $200 - $200 + $100
New Balance = $970 + $0 + $100
New Balance = $1,070
```

**Result**: Location now owes $1,070 to the casino (increased by $100 due to credit)

### Real-World Collection Example

**Complete Collection Process:**

**Machine**: Slot Machine #123
**Location**: Downtown Casino
**Collector**: John Smith

**Step 1 - Meter Readings:**
- **Previous metersIn**: 1,000
- **Current metersIn**: 1,500
- **Previous metersOut**: 200
- **Current metersOut**: 300

**Step 2 - Calculate Amount to Collect:**
```
Amount to Collect = (metersIn - prevIn) / 2
Amount to Collect = (1,500 - 1,000) / 2
Amount to Collect = 500 / 2
Amount to Collect = $250
```

**Step 3 - Calculate Gross Revenue:**
```
Gross = (metersIn - prevIn) - (metersOut - prevOut)
Gross = (1,500 - 1,000) - (300 - 200)
Gross = 500 - 100
Gross = $400
```

**Step 4 - Collection Process:**
- **Amount to Collect**: $250
- **Amount Actually Collected**: $240 (collector found $10 less)
- **Balance Correction**: +$10 (to account for the shortage)

**Step 5 - Update Balance:**
```
Previous Balance: $500
New Balance = $500 + $250 - $240 + $10
New Balance = $520
```

**Final Result**: Location owes $520 to the casino after this collection.

### Key Points to Remember

1. **Amount to Collect** is always calculated as `(metersIn - prevIn) / 2`
2. **Balance Correction** is added to the balance calculation
3. **Positive Balance Correction** = Credit to location
4. **Negative Balance Correction** = Debit to location
5. **The formula ensures accurate tracking** of all money movements
6. **All calculations are auditable** and traceable for compliance 
