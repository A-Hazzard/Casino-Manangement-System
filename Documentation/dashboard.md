# Dashboard Page

This page provides a comprehensive real-time overview of casino operations, financial metrics, and performance analytics for the casino management system.

- **File:** `app/page.tsx`
- **URL Pattern:** `/`

## Main Features
- **Real-Time Metrics:**
  - Financial overview (money in, money out, gross revenue)
  - Machine status (total, online, offline machines)
  - Performance indicators and trends
  - Live data updates and refresh functionality
- **Interactive Charts:**
  - Line charts for time-series data
  - Pie charts for location and machine distribution
  - Top-performing locations and machines
  - Interactive chart elements with tooltips
- **Date Filtering:**
  - Predefined time periods (Today, Yesterday, Last 7 days, 30 days)
  - Custom date range selection with calendar picker
  - Real-time data updates based on filters
  - Automatic period switching based on data availability
- **Licensee Selection:**
  - Dropdown to switch between different licensees
  - Filters all data based on selected licensee
  - "All Licensees" option for global overview
- **Responsive Layout:**
  - Separate desktop and mobile layouts
  - Optimized for different screen sizes
  - Mobile-first design approach
- **Navigation System:**
  - Persistent sidebar for desktop navigation
  - Mobile hamburger menu with slide-out navigation
  - Quick access to all major modules
- **Map Integration:**
  - Interactive map showing gaming location distribution
  - Geographical visualization of casino locations
  - Location markers with detailed information

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
- **Fields Used**: `coinIn`, `coinOut`, `drop`, `totalCancelledCredits`
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