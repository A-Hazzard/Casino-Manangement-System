# Dashboard Chart Data Flow - Cursor Prompt

## Overview
This document explains how chart data is queried, processed, and handled in the Evolution CMS Dashboard (`app/page.tsx`). Understanding this flow is crucial for debugging chart issues, adding new chart types, or modifying data visualization.

## Data Flow Architecture

### 1. **State Management (Zustand Store)**
The dashboard uses Zustand for state management with the following key chart-related states:

```typescript
// From useDashBoardStore()
- loadingChartData: boolean          // Loading state for chart data
- setLoadingChartData: function      // Setter for loading state
- activeMetricsFilter: TimePeriod    // Current time period filter (Today, Yesterday, 7d, 30d, All Time, Custom)
- setActiveMetricsFilter: function   // Setter for time period
- customDateRange: DateRange         // Custom date range for "Custom" filter
- setCustomDateRange: function       // Setter for custom date range
- totals: dashboardData              // Current totals (moneyIn, moneyOut, gross)
- setTotals: function                // Setter for totals
- chartData: ChartDataPoint[]        // Chart data points for line chart
- setChartData: function             // Setter for chart data
- activeFilters: DateRange           // Active date filters
- setActiveFilters: function         // Setter for active filters
```

### 2. **Data Fetching Flow**

#### **Primary Data Fetch (useEffect)**
```typescript
useEffect(() => {
  const fetchMetrics = async () => {
    setLoadingChartData(true);
    try {
      // Only fetch metrics if a filter is selected
      const metricsPromise = activeMetricsFilter 
        ? fetchMetricsData(
            activeMetricsFilter,        // Time period (Today, Yesterday, 7d, 30d, All Time, Custom)
            customDateRange,           // Custom date range (if Custom is selected)
            selectedLicencee,          // Selected licensee filter
            setTotals,                 // Callback to set totals
            setChartData,              // Callback to set chart data
            setActiveFilters,          // Callback to set active filters
            setShowDatePicker          // Callback to show/hide date picker
          )
        : Promise.resolve();
          
      // Fetch locations and metrics in parallel
      await Promise.all([
        loadGamingLocations(setGamingLocations, selectedLicencee),
        metricsPromise,
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching metrics:", error);
      }
    } finally {
      setLoadingChartData(false);
    }
  };
  fetchMetrics();
}, [
  activeMetricsFilter,    // Triggers refetch when time period changes
  customDateRange,        // Triggers refetch when custom date range changes
  selectedLicencee,       // Triggers refetch when licensee changes
  // ... other dependencies
]);
```

#### **Helper Function: fetchMetricsData**
Located in `lib/helpers/dashboard.ts`, this function:
1. **Determines API endpoint** based on time period
2. **Builds query parameters** for the API call
3. **Makes API request** to fetch data
4. **Processes response** and updates state via callbacks

```typescript
// API Endpoints Used:
- /api/reports/locations     // For predefined periods (Today, Yesterday, 7d, 30d, All Time)
- /api/reports/locations     // For custom date ranges (with startDate/endDate params)

// Query Parameters:
- timePeriod: "Today" | "Yesterday" | "7d" | "30d" | "All Time" | "Custom"
- startDate: ISO string (for custom ranges)
- endDate: ISO string (for custom ranges)
- licensee: string (optional)
```

### 3. **Data Processing**

#### **Totals Processing**
The API returns aggregated data that gets processed into totals:
```typescript
// API Response Structure:
{
  totals: {
    moneyIn: number,      // Total money in across all locations
    moneyOut: number,     // Total money out across all locations
    gross: number,        // Total gross (moneyIn - moneyOut)
  },
  chartData: [
    {
      date: string,       // Date in YYYY-MM-DD format
      moneyIn: number,    // Money in for this date
      moneyOut: number,   // Money out for this date
      gross: number,      // Gross for this date
    }
  ]
}
```

#### **Chart Data Processing**
Chart data is processed for the line chart visualization:
- **X-axis**: Dates from the data
- **Y-axis**: Financial values (moneyIn, moneyOut, gross)
- **Tooltips**: Show values for specific dates
- **Legend**: Color-coded lines for each metric

### 4. **Chart Rendering**

#### **Chart Component Integration**
The chart is rendered in the PC and Mobile layouts:
```typescript
// PC Layout (PcLayout component)
<PcLayout
  chartData={chartData}           // Chart data points
  loadingChartData={loadingChartData}  // Loading state
  // ... other props
/>

// Mobile Layout (MobileLayout component)
<MobileLayout
  chartData={chartData}           // Same chart data
  loadingChartData={loadingChartData}  // Same loading state
  // ... other props
/>
```

#### **Chart Library**
The system uses Recharts for chart rendering with:
- **LineChart**: Main chart component
- **ResponsiveContainer**: Handles responsive behavior
- **XAxis/YAxis**: Axis configuration
- **Tooltip**: Interactive tooltips
- **Legend**: Chart legend
- **Line**: Individual data lines

### 5. **Filter Interactions**

#### **Time Period Filters**
```typescript
// Filter Options:
- "Today": Shows data for current day
- "Yesterday": Shows data for previous day
- "Last 7 Days": Shows data for last 7 days
- "Last 30 Days": Shows data for last 30 days
- "All Time": Shows all available data
- "Custom": Shows data for custom date range
```

#### **Custom Date Range**
When "Custom" is selected:
1. **Date picker appears** (setShowDatePicker(true))
2. **User selects date range**
3. **customDateRange state updates**
4. **useEffect triggers** new data fetch
5. **API called with startDate/endDate parameters**

#### **Licensee Filter**
- **Dropdown selection** updates selectedLicencee state
- **useEffect triggers** new data fetch with licensee parameter
- **API filters data** by selected licensee

### 6. **Refresh Functionality**

#### **Manual Refresh**
```typescript
const handleRefresh = useCallback(async () => {
  if (!activeMetricsFilter) return;  // Don't refresh if no filter selected
  
  await handleDashboardRefresh(
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    activeTab,
    activePieChartFilter,
    setRefreshing,           // Shows refresh spinner
    setLoadingChartData,     // Shows chart loading state
    setLoadingTopPerforming, // Shows top performing loading state
    setTotals,               // Updates totals
    setChartData,            // Updates chart data
    setActiveFilters,        // Updates active filters
    setShowDatePicker,       // Updates date picker visibility
    setTopPerformingData     // Updates top performing data
  );
}, [/* dependencies */]);
```

#### **Floating Refresh Button**
- **Appears on scroll** (when scrollTop > 200)
- **Animated with Framer Motion**
- **Calls handleRefresh** when clicked
- **Shows loading state** during refresh

### 7. **Error Handling**

#### **API Error Handling**
```typescript
try {
  // API calls
} catch (error) {
  if (process.env.NODE_ENV === "development") {
    console.error("Error fetching metrics:", error);
  }
  // Error is logged but doesn't crash the app
} finally {
  setLoadingChartData(false);  // Always stop loading
}
```

#### **Loading States**
- **loadingChartData**: Shows skeleton loaders for chart
- **refreshing**: Shows refresh spinner on refresh button
- **Error boundaries**: Prevent chart crashes

### 8. **Performance Optimizations**

#### **Parallel Data Fetching**
```typescript
await Promise.all([
  loadGamingLocations(setGamingLocations, selectedLicencee),
  metricsPromise,
]);
```

#### **Conditional Fetching**
```typescript
// Only fetch metrics if a filter is selected
const metricsPromise = activeMetricsFilter 
  ? fetchMetricsData(...)
  : Promise.resolve();
```

#### **Dependency Optimization**
- **useEffect dependencies** are carefully managed
- **useCallback** prevents unnecessary re-renders
- **Memoization** in chart components

### 9. **Common Issues & Debugging**

#### **Chart Not Updating**
1. **Check activeMetricsFilter**: Must be set for data to fetch
2. **Check API response**: Verify data structure matches expected format
3. **Check loading states**: Ensure loadingChartData is properly managed
4. **Check dependencies**: Verify useEffect dependencies are correct

#### **Data Mismatch**
1. **Check timezone handling**: API uses UTC, frontend may use local time
2. **Check date formatting**: Ensure dates are in correct format
3. **Check aggregation logic**: Verify totals calculation in API

#### **Performance Issues**
1. **Check API response size**: Large datasets may cause slow rendering
2. **Check re-renders**: Use React DevTools to identify unnecessary re-renders
3. **Check memory leaks**: Ensure proper cleanup in useEffect

### 10. **Adding New Chart Types**

To add a new chart type:
1. **Update API endpoint** to return new data structure
2. **Update fetchMetricsData** to handle new data
3. **Update state types** in Zustand store
4. **Update chart components** to render new chart type
5. **Update loading states** for new chart
6. **Test with different time periods** and filters

### 11. **Key Files to Understand**

- **`app/page.tsx`**: Main dashboard component
- **`lib/helpers/dashboard.ts`**: Data fetching logic
- **`lib/store/dashboardStore.ts`**: Zustand state management
- **`components/layout/PcLayout.tsx`**: PC chart rendering
- **`components/layout/MobileLayout.tsx`**: Mobile chart rendering
- **`app/api/reports/locations/route.ts`**: API endpoint for chart data

### 12. **Data Flow Summary**

```
User Interaction (Filter Change)
    ↓
useEffect Triggered
    ↓
fetchMetricsData Called
    ↓
API Request Made
    ↓
Response Processed
    ↓
State Updated (setTotals, setChartData)
    ↓
Component Re-renders
    ↓
Chart Updates with New Data
```

This flow ensures that chart data is always synchronized with user selections and provides a smooth, responsive experience.

---

**Last Updated**: December 2024  
**Author**: Aaron Hazzard - Senior Software Engineer
