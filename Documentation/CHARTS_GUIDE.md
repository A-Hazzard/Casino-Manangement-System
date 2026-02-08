# Charts Comprehensive Guide

## Overview
Charts in Evolution One CMS are built using **Recharts** and provide real-time visualization of financial metrics. The system uses a multi-tier architecture involving API routes, custom hooks, and a universal `Chart` component.

---

## 1. Architecture
### Client-Side Rendering
All charts are client-side components to enable interactivity (tooltips, zoom, metric toggling).
- **Interactive Features**: Hover tooltips, zooming, panning.
- **Real-time Updates**: Partial data refreshes via AbortController management.
- **Performance**: Heavy aggregation logic is offloaded to MongoDB.

### Data Flow
1. **User Change**: Filter/Granularity updated in Zustand/State.
2. **Hook Execution**: Page-specific hook (e.g., `useLocationChartData`) detects dependency change.
3. **API Request**: Axios call to `/api/analytics/charts` or equivalent.
4. **Aggregation**: MongoDB pipeline sums `movement.drop`, `movement.totalCancelledCredits`, etc.
5. **Transformation**: Backend returns `dashboardData` format; UI applies currency conversion.
6. **Rendering**: Recharts `AreaChart` renders the series.

---

## 2. Granularity System
Granularity determines the grouping interval of the time-series data.

| Granularity | Usage | Available In |
| :--- | :--- | :--- |
| **Minute** | High detail (1m intervals) | Today, Yesterday, Custom (≤ 2 days) |
| **Hourly** | Standard detail (1h intervals) | Today, Yesterday, Custom |
| **Daily** | Trend analysis (1d intervals) | Last 7d, 30d |
| **Weekly** | Long-term trends | Quarterly, All Time |
| **Monthly** | Strategic overview | Quarterly, All Time |

---

## 3. Core Components
### `Chart.tsx`
**Location:** `components/ui/dashboard/Chart.tsx`
The primary component for most dashboards.
- **Metrics**: Money In (Purple), Money Out (Blue), Gross (Orange).
- **Features**: Skeleton loading, zero-data trimming, interactive checkboxes for metric toggling.

### `LocationTrendChart.tsx`
**Location:** `components/ui/LocationTrendChart.tsx`
Used for comparing multiple locations simultaneously on the reports page.

---

## 4. Implementation Guide (Quick Start)
To add a chart to a new page:

1. **Set up Hooks**: Use `useDashBoardStore` for global filters.
2. **Handle Loading**: Initiate `loadingChartData` state.
3. **Fetch Data**: 
```typescript
useEffect(() => {
  makeChartRequest(async signal => {
    const data = await getMetrics(...);
    setChartData(data);
  });
}, [...dependencies]);
```
4. **Render Component**:
```typescript
<Chart 
  loadingChartData={loadingChartData} 
  chartData={chartData} 
  activeMetricsFilter={activeMetricsFilter} 
/>
```

---

## 5. Metric Calculations
- **Money In**: Sum of `movement.drop`.
- **Money Out**: Sum of `movement.totalCancelledCredits`.
- **Gross**: `Money In - Money Out`.

---

## 6. Troubleshooting
- **Empty Charts**: Check if the date range provided to the API is in the future or matches Trinidad time offsets.
- **Performance**: Ensure the API query uses `readAt` (indexed) rather than `createdAt`.
