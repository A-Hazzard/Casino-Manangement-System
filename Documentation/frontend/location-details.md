# Location Details Page

**Author:** Aaron Hazzard - Senior Software Engineer

This page provides a comprehensive detailed overview of a single casino location, including metrics, cabinet breakdowns, and performance analytics.

- **File:** `app/locations/[slug]/details/page.tsx`
- **URL Pattern:** `/locations/[slug]/details` where `[slug]` is the location ID

## Main Features
- **Location Information:**
  - Display location name, address, and licensee information
  - Summary metrics (money in/out, gross, net revenue)
  - Cabinet status breakdown (total, online, offline)
- **Time Period Filtering:**
  - Filter metrics by Today, Yesterday, Last 7 days, 30 days, or Custom
  - Real-time data updates based on selected time period
  - Responsive filter buttons with loading states
- **Cabinet Management:**
  - View all cabinets assigned to the location
  - Search and filter cabinets by various criteria
  - Paginated cabinet display with detailed information
  - Cabinet selection for detailed metrics view
- **Performance Analytics:**
  - Location-specific performance metrics
  - Cabinet-level accounting details
  - Real-time status monitoring
- **Responsive Design:**
  - Optimized for both desktop and mobile devices
  - Touch-friendly controls and navigation
  - Adaptive layout for different screen sizes

## Technical Architecture

### Core Components
- **Main Page:** `app/locations/[slug]/details/page.tsx` - Entry point with detailed location analytics
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation with licensee selector
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Location Information Components:**
  - `components/location/LocationInfoSkeleton.tsx` - Loading skeleton for location info
  - `components/locationDetails/MetricsSummary.tsx` - Location metrics summary
- **Cabinet Management Components:**
  - `components/locationDetails/CabinetFilterBar.tsx` - Cabinet filtering controls
  - `components/locationDetails/CabinetGrid.tsx` - Cabinet display grid
- **Cabinet Details Components:**
  - `components/cabinetDetails/AccountingDetails.tsx` - Detailed cabinet metrics
- **Modal Components:**
  - `components/ui/cabinets/EditCabinetModal.tsx` - Edit cabinet modal
  - `components/ui/cabinets/DeleteCabinetModal.tsx` - Delete cabinet modal
- **Shared Components:**
  - `components/ui/RefreshButton.tsx` - Data refresh button

### State Management
- **Dashboard Store:** `lib/store/dashboardStore.ts` - Shared state for licensee and date filters
- **Local State:** React `useState` hooks for complex UI state
- **Key State Properties:**
  - `locationInfo` - Location details and metrics
  - `cabinets`, `filteredCabinets` - Cabinet data arrays
  - `searchTerm` - Search filter state
  - `currentPage` - Pagination state
  - `activeFilter` - Cabinet filter state
  - `activeMetricsTabContent` - Metrics tab selection
  - `metricsLoading` - Metrics loading state
  - `selectedCabinet` - Currently selected cabinet for details
  - `refreshing` - Refresh operation state

### Data Flow
1. **Initial Load:** Fetches location details and cabinet data
2. **Time Period Changes:** Updates metrics and cabinet data based on filter
3. **Cabinet Filtering:** Applies search and filter criteria to cabinet list
4. **Cabinet Selection:** Loads detailed metrics for selected cabinet
5. **Real-time Updates:** Refreshes data when filters change
6. **Error Handling:** Graceful degradation with user feedback

### API Integration

#### Location Management Endpoints
- **GET `/api/locations/[locationId]`** - Fetches location details
  - Parameters: `basicInfo=true` (optional)
  - Returns: Location details with basic information and metrics
- **GET `/api/locations/[locationId]/cabinets`** - Fetches cabinets for location
  - Parameters: `timePeriod`
  - Returns: `Cabinet[]` for the location with metrics

#### Data Processing
- **Locations Helper:** `lib/helpers/locations.ts` - Location management utilities
  - `fetchLocationDetails()` - Fetches location details and metrics
  - `fetchCabinets()` - Fetches cabinets for location with filtering
- **Cabinet Details Helper:** `lib/helpers/cabinetDetails.ts` - Cabinet-specific utilities
  - Cabinet metrics calculation and formatting
  - Performance data aggregation

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect` - State management
- **Next.js:** `useRouter`, `useParams`, `usePathname` - Navigation and routing
- **Radix UI Icons:** `ArrowLeftIcon` - Navigation icons
- **Lucide React:** Additional UI icons

#### Type Definitions
- **Location Types:** `lib/types/location.ts` - Location-related types
  - `LocationInfo` - Location data structure
- **Cabinet Types:** `lib/types/cabinets.ts` - Cabinet-related types
  - `ExtendedCabinetDetail` - Extended cabinet data structure
- **API Types:** `lib/types/api.ts` - API-related types
  - `TimePeriod` - Time period definitions
- **Page Types:** `lib/types/pages.ts` - Page-specific types

#### Utility Functions
- **Format Utils:** `lib/utils/index.ts` - Formatting utilities
  - `formatCurrency()` - Currency formatting utility
- **Date Utils:** Date manipulation and formatting utilities

### Component Hierarchy
```
LocationDetailsPage (app/locations/[slug]/details/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Back Button and Title
├── Refresh Button
├── Time Period Filter Buttons
├── Location Information Section
│   ├── Location Info (Name, Address, Licensee)
│   ├── Metrics (Total Cabinets, Money In/Out)
│   ├── Performance (Gross, Net)
│   └── Cabinet Status (Online/Offline Counts)
├── Cabinet Filter Bar
│   └── CabinetFilterBar (components/locationDetails/CabinetFilterBar.tsx)
├── Cabinet Grid
│   └── CabinetGrid (components/locationDetails/CabinetGrid.tsx)
├── Cabinet Details
│   └── AccountingDetails (components/cabinetDetails/AccountingDetails.tsx)
└── Modals
    ├── EditCabinetModal (components/ui/cabinets/EditCabinetModal.tsx)
    └── DeleteCabinetModal (components/ui/cabinets/DeleteCabinetModal.tsx)
```

### Business Logic
- **Location Analytics:** Comprehensive location performance metrics
- **Time-based Filtering:** Flexible time period selection for historical data
- **Cabinet Management:** Complete cabinet overview with filtering and search
- **Performance Tracking:** Real-time monitoring of location and cabinet performance
- **Data Aggregation:** Automatic calculation of location-level metrics
- **Error Recovery:** Graceful error handling with retry mechanisms

### Animation & UX Features
- **Loading States:** Skeleton loaders for location information and cabinets
- **Responsive Design:** Adaptive layout for different screen sizes
- **Smooth Transitions:** Animated filter changes and data updates
- **Interactive Elements:** Hover effects and visual feedback
- **Accessible Controls:** Keyboard navigation and screen reader support

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Loading States:** Comprehensive loading indicators
- **Empty States:** User-friendly empty state messages
- **Network Issues:** Retry logic and error recovery
- **Invalid Data:** Validation and fallback handling

### Performance Optimizations
- **Conditional Rendering:** Efficient component rendering based on data availability
- **Memoization:** Optimized re-renders for expensive calculations
- **Pagination:** Reduces DOM size and improves performance
- **Efficient Filtering:** Optimized search and filter algorithms
- **Data Caching:** Client-side caching of frequently accessed data

### Security Features
- **Input Validation:** Comprehensive validation for all form inputs
- **API Authentication:** Secure API calls with proper error handling
- **Data Sanitization:** Safe handling of user input
- **Access Control:** Role-based access to location operations

## Data Flow
- Fetches location details and cabinet data from the backend based on time period filters
- Uses Zustand for shared state (licensee, filters)
- Handles loading, filtering, and pagination states
- Provides real-time metrics updates and cabinet management

## Financial Calculations Analysis

### Location Details Metrics vs Financial Metrics Guide

**Current Implementation Analysis:**

#### **Location Aggregate Financial Metrics ✅**
- **Current Implementation**: Aggregates all cabinet data at location level
- **Data Source**: Meter readings from all cabinets at specific location
- **Time Period Filtering**: Today, Yesterday, Last 7 days, 30 days, Custom
- **Financial Guide**: Uses standard aggregation methodology ✅ **MATCHES**

#### **Location Total Money In (Drop) ✅**
- **Current Implementation**: 
  ```javascript
  locationMoneyIn = Σ(movement.drop) WHERE gamingLocation = locationId AND readAt BETWEEN startDate AND endDate
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Total physical cash collected from all cabinets at location
- **Display**: Summary cards show formatted total money in

#### **Location Total Money Out (Cancelled Credits) ✅**
- **Current Implementation**: 
  ```javascript
  locationMoneyOut = Σ(movement.totalCancelledCredits) WHERE gamingLocation = locationId AND readAt BETWEEN startDate AND endDate
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Total credits cancelled/paid out from all cabinets at location
- **Display**: Summary cards show formatted total money out

#### **Location Gross Revenue ✅**
- **Current Implementation**: 
  ```javascript
  locationGross = locationMoneyIn - locationMoneyOut
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: Standard gross calculation aggregated for entire location

#### **Location Net Revenue ✅**
- **Current Implementation**: 
  ```javascript
  locationNetRevenue = locationGross * (profitSharePercentage / 100)
  ```
- **Business Logic**: Location's share of revenue based on profit sharing agreement
- **Calculation**: Net revenue after profit sharing with location partner
- ✅ **BUSINESS CALCULATION** - Standard revenue sharing formula

#### **Cabinet Status by Location ✅**
- **Current Implementation**: 
  ```javascript
  totalCabinets = COUNT(machines WHERE gamingLocation = locationId AND deletedAt IS NULL)
  onlineCabinets = COUNT(machines WHERE gamingLocation = locationId AND lastActivity >= recentThreshold)
  offlineCabinets = totalCabinets - onlineCabinets
  ```
- **Business Logic**: Cabinet status aggregation at location level
- ✅ **CONSISTENT** - Standard machine status calculation

#### **Cabinet Performance Ranking at Location ✅**
- **Current Implementation**: 
  ```javascript
  // Sort cabinets by performance within location
  ORDER BY gross DESC     // By gross revenue
  ORDER BY moneyIn DESC   // By money in (drop)
  ORDER BY gamesPlayed DESC // By activity level
  ```
- **Financial Guide**: Uses `drop` and `gross` for ranking ✅ **MATCHES**
- **Business Logic**: Ranks cabinets within location by performance

### Mathematical Formulas Summary

#### **Location Aggregate Metrics**
```
Location Total Money In = Σ(movement.drop) across all cabinets at location
Location Total Money Out = Σ(movement.totalCancelledCredits) across all cabinets at location
Location Gross Revenue = Location Total Money In - Location Total Money Out
Location Net Revenue = Location Gross Revenue * (Profit Share% / 100)
```

#### **Cabinet Status at Location**
```
Total Cabinets = COUNT(machines WHERE gamingLocation = locationId AND deletedAt IS NULL)
Online Cabinets = COUNT(machines WHERE gamingLocation = locationId AND lastActivity >= currentTime - 3min)
Offline Cabinets = Total Cabinets - Online Cabinets
Cabinet Utilization% = (Online Cabinets / Total Cabinets) * 100
```

#### **Cabinet Performance within Location**
```
Cabinet Ranking = ORDER BY gross DESC per location
Top Cabinet by Revenue = MAX(gross) WHERE gamingLocation = locationId
Average Cabinet Revenue = AVG(gross) WHERE gamingLocation = locationId
Location Revenue Distribution = gross per cabinet / location total gross
```

#### **Time-based Location Analysis**
```
Location Performance by Period = GROUP BY time period, SUM(gross) per location
Location Trend Analysis = COMPARE gross across time periods
Location Growth Rate = ((current period gross - previous period gross) / previous period gross) * 100
```

### Data Validation & Error Handling

#### **Input Validation ✅**
- **Location ID**: Validates MongoDB ObjectId format
- **Time Period**: Validates date range selections
- **Cabinet Filters**: Validates cabinet search and filter parameters
- **Pagination**: Validates numeric page and limit parameters

#### **Data Integrity ✅**
- **Null Handling**: Uses fallback values for missing cabinet data
- **Aggregation Accuracy**: Ensures location totals accurately reflect cabinet data
- **Real-time Sync**: Maintains consistency between location and cabinet metrics
- **Historical Data**: Preserves data integrity across time periods

### Required Verification

**Location details calculations align with the financial metrics guide:**

1. **Location Aggregations**: Use standard drop and cancelled credits fields ✅
2. **Gross Revenue**: Standard calculation (drop - cancelled credits) ✅
3. **Cabinet Status**: Standard machine status calculation ✅
4. **Performance Ranking**: Use appropriate financial metrics ✅
5. **Revenue Sharing**: Standard business calculation ✅

**Note**: Location details calculations correctly implement the financial metrics guide for location-level analysis and cabinet aggregation.

## UI
- Clean, modern design with Tailwind CSS
- Card-based layout for easy information scanning
- Responsive design optimized for all device types
- Accessible controls and intuitive navigation
- Visual feedback for all user interactions 