# Dashboard Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 9th, 2025  
**Version:** 2.1.0

## Table of Contents

1. [Overview](#overview)
2. [Main Features](#main-features)
3. [Technical Architecture](#technical-architecture)
4. [Business Logic](#business-logic)
5. [Data Flow](#data-flow)
6. [API Integration](#api-integration)
7. [State Management](#state-management)
8. [Performance Optimization](#performance-optimization)
9. [Security Features](#security-features)
10. [Error Handling](#error-handling)

## Overview

The Dashboard page serves as the central command center for the Evolution One Casino Management System, providing real-time insights into casino operations, financial performance, and system health. It offers comprehensive analytics, performance monitoring, and operational oversight in a single, intuitive interface.

### Key Principles

- **Real-time Data**: Live updates of all critical system metrics
- **Comprehensive Analytics**: Complete financial and operational insights
- **User-friendly Interface**: Intuitive design for all user levels
- **Performance Monitoring**: Real-time system health and performance tracking

### File Information

- **File:** `app/page.tsx`
- **URL Pattern:** `/`
- **Component Type:** Main Landing Page
- **Authentication:** Required
- **Access Level:** Developer, Admin, Manager (with assigned licensees)
- **Licensee Filtering:** ✅ Supported

### System Integration

- **Financial Analytics**: Real-time financial metrics and calculations
- **Machine Monitoring**: Live machine status and performance tracking
- **Location Management**: Location-specific analytics and insights
- **Collection Systems**: Integration with collection and reporting systems

## Main Features

### Real-Time Metrics

- **Financial Overview**: Money in, money out, and gross revenue calculations
- **Machine Status**: Total, online, and offline machine counts with real-time updates
- **Performance Indicators**: Key performance metrics and trend analysis
- **Live Data Updates**: Automatic refresh functionality with manual override options

### Interactive Charts

- **Time-Series Data**: Line charts showing revenue trends over time
- **Distribution Analysis**: Pie charts for location and machine distribution
- **Performance Rankings**: Top-performing locations and machines
- **Interactive Elements**: Tooltips and clickable chart components

### Date Filtering

- **Predefined Periods**: Today, Yesterday, Last 7 days, Last 30 days options
- **Custom Date Range**: Calendar picker for specific time periods
- **Real-time Updates**: Data automatically updates based on selected filters
- **Smart Period Switching**: Automatic adjustment based on data availability

### Licensee Selection & Access Control

- **Multi-licensee Support**: Dropdown to switch between different licensees
- **Role-Based Filtering**:
  - **Developer/Admin**: Can view "All Licensees" or filter by specific licensee
  - **Manager**: Dropdown shows ONLY assigned licensees (if 2+), cannot view "All Licensees"
  - **Collector/Location Admin/Technician**: Cannot access Dashboard
- **Data Filtering**: All dashboard data (totals, charts, top performing, map) filtered based on selected licensee
- **Global Overview**: "All Licensees" option available ONLY for Developer/Admin roles
- **Context Switching**: Seamless switching between licensee contexts with state persistence
- **No Licensee Assigned**: Non-admin users without licensees see informational message

### Currency Conversion & Display

⚠️ **IMPORTANT**: Currency conversion follows strict role-based rules:

**Currency Selector Visibility:**
- **Admin/Developer + "All Licensees"**: ✅ Currency selector VISIBLE
- **Admin/Developer + Specific Licensee**: ❌ Currency selector HIDDEN (shows native currency)
- **Manager**: ❌ Currency selector ALWAYS HIDDEN (always native currency)
- **Other Roles**: ❌ Currency selector ALWAYS HIDDEN

**Currency Conversion Logic:**
- **Admin/Developer viewing "All Licensees"**: 
  - Data converted from each licensee's native currency → USD → Selected display currency
  - Example: Barbados (BBD $2,310) + TTG (TTD $140) → USD $1,182.66
- **Admin/Developer viewing Specific Licensee**:
  - Data shown in licensee's native currency (no conversion)
  - Example: Viewing "Barbados" → $2,310 BBD
- **Manager viewing any licensee**:
  - Data ALWAYS shown in native currency (no conversion)
  - Example: Manager assigned to Barbados → $2,310 BBD

**Supported Currencies:**
- USD - US Dollar (base currency, rate: 1.0)
- TTD - Trinidad & Tobago Dollar (rate: 6.75)
- GYD - Guyanese Dollar (rate: 207.98)  
- BBD - Barbados Dollar (rate: 2.0)

### Responsive Layout

- **Desktop Layout**: Full-featured dashboard with sidebar navigation
- **Mobile Layout**: Optimized mobile interface with hamburger menu
- **Screen Adaptation**: Automatic layout adjustment for different screen sizes
- **Mobile-First Design**: Touch-friendly interface for mobile devices

### Navigation System

- **Persistent Sidebar**: Desktop navigation with quick access to all modules
- **Mobile Menu**: Slide-out navigation menu for mobile devices
- **Module Access**: Direct links to all major system modules
- **Breadcrumb Navigation**: Clear navigation path indication

### Map Integration

- **Geographic Visualization**: Interactive map showing gaming location distribution
- **Location Markers**: Detailed information for each gaming location
- **Performance Overlay**: Visual representation of location performance
- **Interactive Features**: Clickable markers with location details

## Technical Architecture

### Core Components

- **Main Page:** `app/page.tsx` - Entry point with client-side rendering
- **Desktop Layout:** `components/layout/PcLayout.tsx` - Desktop-specific dashboard layout
- **Mobile Layout:** `components/layout/MobileLayout.tsx` - Mobile-responsive layout
- **Header:** `components/layout/Header.tsx` - Top navigation with licensee selector
- **Sidebar:** `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Date Filters:** `components/dashboard/DashboardDateFilters.tsx` - Time period selection
- **Charts:** `components/ui/dashboard/Chart.tsx` - Recharts-based data visualization
- **Machine Status:** `components/ui/MachineStatusWidget.tsx` - Online/offline machine indicators
- **Map Preview:** `components/ui/MapPreview.tsx` - Location visualization

### State Management

- **Store:** `lib/store/dashboardStore.ts` - Zustand store for dashboard state
- **Key State Properties:**
  - `loadingChartData`, `loadingTopPerforming`, `refreshing` - Loading states
  - `activeFilters`, `activeMetricsFilter`, `activePieChartFilter` - Filter states
  - `totals`, `chartData`, `topPerformingData` - Data arrays
  - `gamingLocations`, `selectedLicencee` - Location and licensee data
  - `customDateRange` - Date range for custom filtering

### Data Flow

1. **Initial Load:** Fetches gaming locations and metrics data on component mount
2. **Filter Changes:** Updates metrics and chart data when filters change
3. **Licensee Changes:** Refetches all data with new licensee filter
4. **Refresh:** Manually refreshes all dashboard data
5. **Real-time Updates:** Automatic data updates based on selected time periods

### API Integration

#### Backend Endpoints

- **Metrics Data:** `/api/metrics/meters` - Fetches aggregated meter data
  - Parameters: `timePeriod`, `startDate`, `endDate`, `licencee`
  - Returns: Array of `Metrics` objects with drop, totalCancelledCredits, gross
- **Top Performing:** `/api/metrics/top-performing` - Fetches top 5 performing locations/cabinets
  - Parameters: `activeTab` (locations/Cabinets), `timePeriod`
  - Returns: Array of top performing data with totalDrop, totalGamesPlayed, totalJackpot
- **Location Aggregation:** `/api/locationAggregation` - Fetches location-level aggregates
  - Parameters: `timePeriod`
  - Returns: Location data with onlineMachines, totalMachines counts
- **Dashboard Analytics:** `/api/analytics/dashboard` - Fetches global statistics
  - Parameters: `licensee`
  - Returns: Global stats including totalDrop, totalCancelledCredits, totalGross

#### Data Processing

- **Metrics Helper:** `lib/helpers/metrics.ts` - Processes raw API data into chart format
  - Groups data by day or hour based on time period
  - Fills missing intervals with zero values
  - Sorts data chronologically
- **Dashboard Helper:** `lib/helpers/dashboard.ts` - Orchestrates data fetching and processing
  - `fetchMetricsData()` - Fetches and processes metrics
  - `fetchTopPerformingDataHelper()` - Fetches top performing data
  - `loadGamingLocations()` - Loads and filters location data
  - `handleDashboardRefresh()` - Complete refresh functionality
  - `calculatePieChartLabelData()` - Calculates pie chart label positions

### Key Dependencies

#### Frontend Libraries

- **React Hooks:** `useEffect`, `useCallback`, `useRef` - State management and side effects
- **Next.js:** `usePathname`, `Image` - Navigation and image optimization
- **Recharts:** `Cell`, `Pie`, `PieChart`, `ResponsiveContainer` - Chart components
- **Day.js:** Date manipulation and formatting
- **Axios:** HTTP client for API calls
- **Lucide React:** `RefreshCw` - Icon components

#### Type Definitions

- **Shared Types:** `@shared/types` - Core type definitions
  - `DashboardData`, `Metrics`, `TopPerformingData`, `ActiveFilters`, `TimePeriod`
- **Local Types:** `lib/types/index.ts` - Application-specific types
  - `dashboardData` (legacy alias), `locations`, `ActiveTab`, `dateRange`
- **Component Props:** `lib/types/componentProps.ts` - Component prop types
  - `CustomizedLabelProps`, `PcLayoutProps`

#### Utility Functions

- **Metrics Utils:** `lib/utils/metrics.ts`
  - `formatNumber()` - Currency formatting
  - `switchFilter()` - Filter state management
  - `handleFilterChange()` - Filter change handling
- **Constants:** `lib/constants/uiConstants.ts`
  - `RADIAN` - Math constants for chart calculations
  - `timeFrames` - Time period definitions

### Component Hierarchy

```
Dashboard (app/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── DashboardDateFilters (components/dashboard/DashboardDateFilters.tsx)
├── PcLayout (components/layout/PcLayout.tsx)
│   ├── MachineStatusWidget (components/ui/MachineStatusWidget.tsx)
│   ├── MapPreview (components/ui/MapPreview.tsx)
│   ├── Chart (components/ui/dashboard/Chart.tsx)
│   └── CustomSelect (components/ui/CustomSelect.tsx)
└── MobileLayout (components/layout/MobileLayout.tsx)
    └── [Similar components optimized for mobile]
```

### Business Logic

- **Data Aggregation:** Combines meter data from multiple machines and locations
- **Time Period Handling:** Supports hourly (Today/Yesterday) and daily (7d/30d/Custom) views
- **Licensee Filtering:** Filters all data based on selected licensee
- **Real-time Status:** Tracks online/offline machine status across locations
- **Performance Metrics:** Calculates top-performing locations and machines based on drop amounts

### Error Handling

- **API Failures:** Graceful degradation with fallback data
- **Loading States:** Skeleton loaders during data fetching
- **Network Issues:** Retry logic and error logging
- **Invalid Data:** Validation and sanitization of API responses

### Performance Optimizations

- **Memoization:** `useCallback` for expensive operations
- **Conditional Rendering:** Separate desktop/mobile layouts
- **Image Optimization:** Next.js Image component with SVG imports
- **State Management:** Efficient Zustand store with selective updates
- **Data Caching:** Client-side caching of frequently accessed data

## Notes Section

### How the Dashboard Works (Simple Explanation)

The dashboard is like a **real-time command center** for your casino operations. Here's how it works:

#### **Data Collection Process**

1. **Slot machines** continuously send meter readings (like how much money went in/out)
2. These readings are stored in the **Meters collection** in the database
3. The dashboard **aggregates** this data to show you the big picture
4. **Every time you change filters** (like switching from "Today" to "Last 7 days"), it asks the server for fresh data

#### **What Each Section Does**

**📊 Financial Metrics (Money In/Out/Gross)**

- **Collection**: Queries the `meters` collection for the selected time period
- **Fields Used**: `movement.drop`, `movement.totalCancelledCredits`
- **Simple Explanation**: Shows how much money players put into machines vs. how much they won, giving you the net profit

**🖥️ Machine Status (Online/Offline)**

- **Collection**: Queries the `machines` collection
- **Fields Used**: `lastActivity`, `assetStatus`, `deletedAt`
- **Simple Explanation**: Shows which machines are currently connected and working vs. which ones are offline or need attention

**📈 Performance Charts**

- **Collection**: Aggregates data from `meters` collection
- **Fields Used**: Groups by date/hour and sums up financial metrics
- **Simple Explanation**: Shows trends over time - like whether your casino is making more or less money each day

**🏆 Top Performers**

- **Collection**: Queries `meters` and `machines` collections
- **Fields Used**: Aggregates by location or machine, sorts by `totalDrop`
- **Simple Explanation**: Shows which locations or machines are making the most money

#### **Filtering and Licensee System**

- **Licensee Filter**: When you select a licensee, it only shows data from their casino locations
- **Time Filters**: "Today" shows hourly data, "Last 7 days" shows daily data
- **Custom Date Range**: Lets you pick any specific time period

#### **Real-time Updates**

- **Refresh Button**: Manually fetches fresh data from all collections
- **Auto-refresh**: Some data updates automatically based on your selected time period
- **Loading States**: Shows skeleton loaders while data is being fetched

#### **Database Queries Explained**

**For Financial Metrics:**

```javascript
// Queries the meters collection
// Filters by: time period, licensee, location
// Returns: aggregated coinIn, coinOut, drop amounts
```

**For Machine Status:**

```javascript
// Queries the machines collection
// Filters by: licensee, deletedAt (active machines only)
// Returns: count of online vs offline machines
```

**For Top Performers:**

```javascript
// Queries meters collection with aggregation
// Groups by: location or machine
// Sorts by: totalDrop (highest first)
// Returns: top 5 locations or machines
```

#### **Why This Matters for Casino Operations**

- **Financial Tracking**: Know exactly how much money your casino is making
- **Machine Management**: Quickly identify which machines need maintenance
- **Performance Analysis**: See which locations are most profitable
- **Multi-location Management**: Manage multiple casino locations from one dashboard
- **Real-time Monitoring**: Make decisions based on current data, not yesterday's reports

The dashboard essentially **translates raw meter data from slot machines into business intelligence** that helps you run your casino operations efficiently.

## Financial Calculations Analysis

### Dashboard Metrics Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

#### **Money In (Drop) ✅**

- **Current Implementation**:
  ```javascript
  drop: {
    $sum: {
      $ifNull: ['$movement.drop', 0];
    }
  }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Physical cash inserted into machines across all selected locations
- **Aggregation**: Sums across all machines and meter readings within date range

#### **Money Out (Total Cancelled Credits) ✅**

- **Current Implementation**:
  ```javascript
  totalCancelledCredits: {
    $sum: {
      $ifNull: ['$movement.totalCancelledCredits', 0];
    }
  }
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: All credits paid out to players (vouchers + hand-paid)
- **Aggregation**: Sums across all machines and meter readings within date range

#### **Gross Revenue Calculation ✅**

- **Current Implementation**:
  ```javascript
  gross: {
    $subtract: ['$moneyIn', '$moneyOut'];
  }
  // Where: moneyIn = drop, moneyOut = totalCancelledCredits
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: `gross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)`

#### **Machine Status Calculations ✅**

- **Current Implementation**:
  ```javascript
  // Online machines
  lastActivity: {
    $gte: new Date(Date.now() - 3 * 60 * 1000);
  }
  // Total machines
  deletedAt: {
    $exists: false;
  }
  ```
- **Business Logic**:
  - **Online**: `lastActivity >= (currentTime - 3 minutes)`
  - **Offline**: `lastActivity < (currentTime - 3 minutes)`
  - **Total**: Count of non-deleted machines
- ✅ **CONSISTENT** - Standard machine status calculation

#### **Top Performing Locations Calculation ✅**

- **Current Implementation**:
  ```javascript
  totalDrop: {
    $sum: {
      $ifNull: ['$movement.drop', 0];
    }
  }
  // Sorted by totalDrop descending, limit 5
  ```
- **Financial Guide**: Uses `movement.drop` for revenue ranking ✅ **MATCHES**
- **Business Logic**: Ranks locations by total money inserted (drop)

#### **Top Performing Machines Calculation ✅**

- **Current Implementation**:
  ```javascript
  totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } },
  totalGamesPlayed: { $sum: { $ifNull: ["$movement.gamesPlayed", 0] } },
  totalJackpot: { $sum: { $ifNull: ["$movement.jackpot", 0] } }
  // Sorted by totalDrop descending, limit 5
  ```
- **Financial Guide**: Uses `movement.drop`, `movement.gamesPlayed`, `movement.jackpot` ✅ **MATCHES**
- **Business Logic**: Ranks machines by total money inserted with additional performance metrics

#### **Chart Data Processing ✅**

- **Current Implementation**:
  ```javascript
  // Time-series aggregation by hour/day
  _id: {
    year: { $year: "$readAt" },
    month: { $month: "$readAt" },
    day: { $dayOfMonth: "$readAt" },
    hour: { $hour: "$readAt" } // Only for Today/Yesterday
  }
  ```
- **Business Logic**:
  - **Today/Yesterday**: Hourly granularity
  - **7d/30d/Custom**: Daily granularity
- ✅ **CONSISTENT** - Appropriate time granularity for different periods

#### **Win/Loss Calculation ❌**

- **Current Implementation**:
  ```javascript
  winLoss: {
    $subtract: [
      { $ifNull: ['$movement.coinIn', 0] },
      { $ifNull: ['$movement.coinOut', 0] },
    ];
  }
  ```
- **Financial Guide**: No direct equivalent - this appears to be `Handle - Coin Out`
- **Mathematical Formula**: `winLoss = coinIn - coinOut`
- **Analysis**: This represents house advantage from betting activity
- ❌ **NOT IN GUIDE** - Custom calculation not defined in financial metrics guide

### Mathematical Formulas Summary

#### **Primary Financial Metrics**

```
Money In = Σ(movement.drop) across all machines/time
Money Out = Σ(movement.totalCancelledCredits) across all machines/time
Gross Revenue = Money In - Money Out
```

#### **Performance Rankings**

```
Top Location Rank = ORDER BY Σ(movement.drop) DESC LIMIT 5
Top Machine Rank = ORDER BY Σ(movement.drop) DESC LIMIT 5
```

#### **Machine Status**

```
Online Count = COUNT(machines WHERE lastActivity >= currentTime - 3min)
Offline Count = COUNT(machines WHERE lastActivity < currentTime - 3min)
Total Count = COUNT(machines WHERE deletedAt IS NULL)
```

#### **Chart Data Aggregation**

```
Hourly Data (Today/Yesterday):
  GROUP BY year, month, day, hour OF readAt

Daily Data (7d/30d/Custom):
  GROUP BY year, month, day OF readAt
```

### Data Validation & Error Handling

#### **Licensee & Location-Based Filtering** ✅

**Access Control Logic:**

1. **Role-Based Page Access:**
   - **Allowed Roles**: Developer, Admin, Manager
   - **Denied Roles**: Collector, Location Admin, Technician (redirected to `/unauthorized`)

2. **Licensee Assignment Check:**
   ```typescript
   // Non-admin users without licensees see informational message
   if (shouldShowNoLicenseeMessage(currentUser)) {
     return <NoLicenseeAssigned />;
   }
   ```

3. **Licensee Dropdown Logic:**
   - **Developer/Admin**: Can view all licensees or filter by specific licensee
   - **Manager**: Dropdown shows ONLY assigned licensees (if 2+)
   - **Visibility**: `showDropdown = isAdmin || (isManager && licenseeCount >= 2)`

4. **Data Filtering Flow:**
   - All API calls include `licensee` parameter from dropdown selection
   - Server validates user has access to selected licensee
   - Response filtered to show only allowed data
   - Complete isolation between licensees (no data leakage)

**API Request:**
```
GET /api/dashboard/totals?licensee=732b094083226f216b3fc11a&timePeriod=Today
```

**Backend Filtering:**
- Developer/Admin: Can view selected licensee or all licensees
- Manager: Can only view data for assigned licensees
- All components (Totals, Charts, Top Performing, Map) respect filter

**Session Invalidation:**
- When admin changes user permissions, `sessionVersion` increments
- User's JWT becomes invalid
- Automatic logout with toast notification
- User must re-login to access system with new permissions

#### **Input Validation ✅**

- **Date Range**: Validates ISO date format for custom ranges
- **Time Period**: Validates against allowed values (Today, Yesterday, 7d, 30d)
- **Licensee**: Validates user has access to selected licensee
- **User Permissions**: Server-side validation on every API call

#### **Data Integrity ✅**

- **Null Handling**: Uses `$ifNull` operators to default missing values to 0
- **Negative Values**: Prevents negative financial calculations
- **Missing Machines**: Gracefully handles deleted or inactive machines
- **Permission Errors**: Graceful handling of unauthorized access attempts
