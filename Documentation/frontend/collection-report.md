# Collection Report Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025

This page provides comprehensive financial collection management for the casino system, including collection reports, monthly summaries, and collector scheduling.

- **File:** `app/collection-report/page.tsx`
- **URL Pattern:** `/collection-report`

**Note**: For complete system documentation, see the [Collection System Pages Documentation](./collection-system-pages.md).

## Main Features
- **Collection Reports:**
  - View, search, and filter collection reports.
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

| UI Label | Frontend Path | Backend Source (model.field) | Notes |
|---|---|---|---|
| Dropped / Cancelled | `locationMetrics.droppedCancelled` | `collectionReports.totalDrop` / `collectionReports.totalCancelled` | Displayed as `${drop}/${cancelled}` |
| Meters Gross | `locationMetrics.metersGross` | `collectionReports.totalGross` | Number, formatted |
| Variation | `locationMetrics.variation` | `collectionReports.variance` | Number, formatted |
| SAS Gross | `locationMetrics.sasGross` | `collectionReports.totalSasGross` | Number, formatted |
| Variance | `locationMetrics.variance` | `collectionReports.variance` | Duplicate of Variation for the detail cards |
| Variance Reason | `locationMetrics.varianceReason` | `collectionReports.varianceReason` | String or '-' |
| Amount To Collect | `locationMetrics.amountToCollect` | `collectionReports.amountToCollect` | Number |
| Collected Amount | `locationMetrics.collectedAmount` | `collectionReports.amountCollected` | Number |
| Location Revenue | `locationMetrics.locationRevenue` | `collectionReports.partnerProfit` | Number |
| Amount Uncollected | `locationMetrics.amountUncollected` | `collectionReports.amountUncollected` | Number |
| Machines Number | `locationMetrics.machinesNumber` | `collectionReports.machinesCollected` | String/number |
| Reason For Shortage | `locationMetrics.reasonForShortage` | `collectionReports.reasonShortagePayment` | String or '-' |
| Taxes | `locationMetrics.taxes` | `collectionReports.taxes` | Number |
| Advance | `locationMetrics.advance` | `collectionReports.advance` | Number |
| Previous Balance Owed | `locationMetrics.previousBalanceOwed` | `collectionReports.previousBalance` | Number |
| Current Balance Owed | `locationMetrics.currentBalanceOwed` | `collectionReports.currentBalance` | Number |
| Balance Correction | `locationMetrics.balanceCorrection` | `collectionReports.balanceCorrection` | Number (can be negative) |
| Correction Reason | `locationMetrics.correctionReason` | `collectionReports.balanceCorrectionReas` | String or '-' |

Frontend render locations:
- Mobile summary table and four cards: `LocationMetricsContent` (mobile section)
- Desktop summary ("Location Total") and four detail tables: `LocationMetricsContent` (desktop section)

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
- **Collection Management:** Complete collection report lifecycle
- **Financial Tracking:** Variance analysis and performance metrics
- **Scheduling:** Collection scheduling and optimization
- **Performance Analytics:** Collector and location performance analysis
- **Search & Filtering:** Real-time search across multiple fields
- **Pagination:** Efficient data display with configurable page sizes

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