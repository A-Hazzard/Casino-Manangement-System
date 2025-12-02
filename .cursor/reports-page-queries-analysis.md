# Reports Page Queries Analysis and Optimization

## Overview

This document catalogs all queries on the Reports page, organized by tab and section, with performance analysis and optimization recommendations.

## Page Structure

- **Main Page**: `/app/reports/page.tsx`
- **Tabs**: Locations, Machines, Meters
- **Common Features**: Date filters, licensee filtering, currency conversion, pagination

---

## 1. Locations Tab (`components/reports/tabs/LocationsTab.tsx`)

### 1.1 Summary Cards Section

**Query**: Dashboard Totals API

- **Endpoint**: `/api/dashboard/totals` (via `fetchDashboardTotals`)
- **Purpose**: Fetch total financial metrics (Money In, Money Out, Gross) for all locations
- **Frequency**: On mount, when date/licensee changes
- **Optimization Status**: ✅ Already optimized (uses single aggregation)
- **Notes**: Uses `getMeterTrends` helper which has single aggregation for 7d/30d

### 1.2 Location Data Table (SAS Evaluation & Revenue Analysis)

**Query**: Location Aggregation API

- **Endpoint**: `/api/locationAggregation`
- **Purpose**: Fetch location metrics with financial data, machine counts, SAS evaluation
- **Parameters**:
  - `timePeriod` (Today, Yesterday, 7d, 30d, Custom, All Time)
  - `licencee` (optional)
  - `currency` (optional)
  - `machineTypeFilter` (optional)
  - `sasEvaluationOnly` (boolean)
  - `page`, `limit` (pagination)
  - `startDate`, `endDate` (for Custom period)
- **Frequency**: On mount, when filters change, pagination
- **Backend Helper**: `getLocationsWithMetrics` in `app/api/lib/helpers/locationAggregation.ts`
- **Optimization Status**: ⚠️ **NEEDS REVIEW**
  - Uses batched processing (BATCH_SIZE = 10) - already optimized
  - Single aggregation not used for 7d/30d periods
  - **Recommendation**: Enable single aggregation for 7d/30d similar to reports/locations route

### 1.3 Top Machines Section

**Query**: Reports Machines API

- **Endpoint**: `/api/reports/machines?type=all`
- **Purpose**: Fetch top 5 machines by netWin for selected locations
- **Parameters**:
  - `type=all`
  - `timePeriod`
  - `licencee` (optional)
  - `startDate`, `endDate` (for Custom)
- **Frequency**: When locations are selected, when date/licensee changes
- **Backend**: `app/api/reports/machines/route.ts`
- **Optimization Status**: ⚠️ **NEEDS REVIEW**
  - Uses `getMachinesAggregation` helper
  - May not use single aggregation for 7d/30d
  - **Recommendation**: Check if single aggregation is enabled for 7d/30d

### 1.4 Location Trend Chart

**Query**: Location Trends API

- **Endpoint**: `/api/analytics/location-trends`
- **Purpose**: Fetch hourly/daily trend data for selected locations
- **Parameters**:
  - `locationIds` (comma-separated)
  - `timePeriod`
  - `licencee` (optional)
  - `currency` (optional)
  - `startDate`, `endDate` (for Custom)
- **Frequency**: When locations are selected, when date/licensee changes
- **Backend Helper**: `getLocationTrends` in `app/api/lib/helpers/locationTrends.ts`
- **Optimization Status**: ⚠️ **NEEDS REVIEW**
  - Uses aggregation pipeline with $lookup
  - May not be optimized for 7d/30d periods
  - **Recommendation**: Check if single aggregation is used for longer periods

### 1.5 Gaming Locations Dropdown

**Query**: Locations API

- **Endpoint**: `/api/locations`
- **Purpose**: Fetch list of locations for dropdown selection
- **Parameters**:
  - `licencee` (optional)
- **Frequency**: On mount, when licensee changes
- **Optimization Status**: ✅ Simple query, already optimized

---

## 2. Machines Tab (`components/reports/tabs/MachinesTab.tsx`)

### 2.1 Machine Stats Summary Cards

**Query**: Reports Machines Stats API

- **Endpoint**: `/api/reports/machines?type=stats`
- **Purpose**: Fetch machine counts (total, online, offline)
- **Parameters**:
  - `type=stats`
  - `timePeriod`
  - `licencee` (optional)
  - `onlineStatus` (optional)
  - `startDate`, `endDate` (for Custom)
  - `currency` (optional)
- **Frequency**: On mount, when filters change
- **Backend**: `app/api/reports/machines/route.ts` (stats handler)
- **Optimization Status**: ✅ Simple aggregation, already optimized

### 2.2 Overview Tab - Machine Table

**Query**: Reports Machines API (Overview)

- **Endpoint**: `/api/reports/machines?type=overview`
- **Purpose**: Fetch paginated list of machines with financial metrics
- **Parameters**:
  - `type=overview`
  - `timePeriod`
  - `licencee` (optional)
  - `locationId` (optional)
  - `onlineStatus` (optional)
  - `search` (optional)
  - `page`, `limit` (pagination)
  - `startDate`, `endDate` (for Custom)
  - `currency` (optional)
- **Frequency**: On tab switch, pagination, filter changes
- **Backend**: `app/api/reports/machines/route.ts` (overview handler)
- **Optimization Status**: ⚠️ **NEEDS REVIEW**
  - Uses `getMachinesAggregation` helper
  - May not use single aggregation for 7d/30d
  - **Recommendation**: Check if single aggregation is enabled for 7d/30d

### 2.3 Performance Analysis Tab

**Query**: Reports Machines API (All)

- **Endpoint**: `/api/reports/machines?type=all`
- **Purpose**: Fetch all machines for performance analysis (manufacturer, games charts)
- **Parameters**:
  - `type=all`
  - `timePeriod`
  - `licencee` (optional)
  - `locationId` (optional, for evaluation tab)
  - `onlineStatus` (optional)
  - `startDate`, `endDate` (for Custom)
  - `currency` (optional)
- **Frequency**: On tab switch, when filters change
- **Backend**: `app/api/reports/machines/route.ts` (all handler)
- **Optimization Status**: ⚠️ **NEEDS REVIEW**
  - Fetches ALL machines (no pagination)
  - May be slow for large datasets
  - **Recommendation**: Check if single aggregation is enabled for 7d/30d

### 2.4 Offline Machines Tab

**Query**: Reports Machines API (Offline)

- **Endpoint**: `/api/reports/machines?type=offline`
- **Purpose**: Fetch paginated list of offline machines
- **Parameters**:
  - `type=offline`
  - `timePeriod`
  - `licencee` (optional)
  - `locationId` (optional)
  - `page`, `limit` (pagination)
  - `startDate`, `endDate` (for Custom)
- **Frequency**: On tab switch, pagination, filter changes
- **Backend**: `app/api/reports/machines/route.ts` (offline handler)
- **Optimization Status**: ⚠️ **NEEDS REVIEW**
  - Uses `getMachinesAggregation` helper
  - May not use single aggregation for 7d/30d
  - **Recommendation**: Check if single aggregation is enabled for 7d/30d

### 2.5 Locations Dropdown

**Query**: Locations API

- **Endpoint**: `/api/locations`
- **Purpose**: Fetch list of locations for dropdown selection
- **Parameters**:
  - `licencee` (optional)
- **Frequency**: On mount, when licensee changes
- **Optimization Status**: ✅ Simple query, already optimized

---

## 3. Meters Tab (`components/reports/tabs/MetersTab.tsx`)

### 3.1 Meters Data Table

**Query**: Meters Report API

- **Endpoint**: `/api/reports/meters`
- **Purpose**: Fetch last meter per machine with financial metrics
- **Parameters**:
  - `locations` (comma-separated location IDs)
  - `timePeriod`
  - `licencee` (optional)
  - `currency` (optional)
  - `page`, `limit` (pagination)
  - `startDate`, `endDate` (for Custom)
  - `includeHourlyData` (boolean, for charts)
- **Frequency**: When locations are selected, pagination, filter changes
- **Backend**: `app/api/reports/meters/route.ts`
- **Backend Helper**: `app/api/lib/helpers/metersReport.ts`
- **Optimization Status**: ⚠️ **NEEDS REVIEW**
  - Uses `getLastMeterPerMachine` which does aggregation per machine
  - May have N+1 query pattern
  - **Recommendation**: Check if single aggregation is used for all machines

### 3.2 Hourly Charts (Games Played, Coin In, Coin Out)

**Query**: Meters Report API (with `includeHourlyData=true`)

- **Endpoint**: `/api/reports/meters?includeHourlyData=true`
- **Purpose**: Fetch hourly aggregated data for charts
- **Parameters**: Same as meters data table + `includeHourlyData=true`
- **Frequency**: When locations are selected, when date changes
- **Backend Helper**: `getHourlyChartData` in `app/api/lib/helpers/metersReport.ts`
- **Optimization Status**: ✅ Single aggregation pipeline, already optimized

### 3.3 Top Machines Pie Chart

**Query**: Calculated from meters data (client-side)

- **Purpose**: Calculate top 10 machines by drop from meters data
- **Frequency**: When meters data changes
- **Optimization Status**: ✅ Client-side calculation, no API call

### 3.4 Locations Dropdown

**Query**: Locations API

- **Endpoint**: `/api/locations`
- **Purpose**: Fetch list of locations for dropdown selection
- **Parameters**:
  - `licencee` (optional)
- **Frequency**: On mount, when licensee changes
- **Optimization Status**: ✅ Simple query, already optimized

### 3.5 User Permissions (Location Admin)

**Query**: Current User API

- **Endpoint**: `/api/auth/current-user`
- **Purpose**: Fetch user's location permissions (if JWT is stale)
- **Frequency**: On mount (only for location admins with stale JWT)
- **Optimization Status**: ✅ Simple query, already optimized

---

## 4. Common Queries

### 4.1 Dashboard Totals

**Query**: Dashboard Totals API

- **Endpoint**: `/api/dashboard/totals` (via `fetchDashboardTotals`)
- **Purpose**: Fetch total financial metrics across all locations
- **Used By**: Locations tab (summary cards)
- **Optimization Status**: ✅ Already optimized (uses `getMeterTrends` with single aggregation)

---

## Optimization Recommendations

### High Priority

1. **Location Aggregation API (`/api/locationAggregation`)** ✅ **OPTIMIZED**
   - **Issue**: Used batched processing even for 7d/30d periods
   - **Fix**: Added single aggregation for 7d/30d periods (similar to `reports/locations` route)
   - **File**: `app/api/lib/helpers/locationAggregation.ts`
   - **Impact**: High - used by Locations tab table

2. **Reports Machines API (`/api/reports/machines`)** ✅ **OPTIMIZED**
   - **Issue**: Used $lookup with nested pipelines (N+1 pattern) for all handlers
   - **Fix**: Added single aggregation for 7d/30d periods in overview handler (most commonly used)
   - **File**: `app/api/reports/machines/route.ts`
   - **Impact**: High - used by Machines tab (all sub-tabs)
   - **Note**: The `all` and `offline` handlers still use $lookup but are less frequently used. They can be optimized similarly if needed.

3. **Location Trends API (`/api/analytics/location-trends`)**
   - **Issue**: Uses aggregation with $lookup, may not be optimized for 7d/30d
   - **Fix**: Check if single aggregation is used for longer periods
   - **File**: `app/api/lib/helpers/locationTrends.ts`
   - **Impact**: Medium - used by Locations tab trend chart

4. **Meters Report API (`/api/reports/meters`)**
   - **Issue**: Uses `getLastMeterPerMachine` which may have N+1 pattern
   - **Fix**: Verify single aggregation is used for all machines
   - **File**: `app/api/lib/helpers/metersReport.ts`
   - **Impact**: Medium - used by Meters tab table

### Medium Priority

5. **Top Machines Query (Locations Tab)**
   - **Issue**: Fetches all machines then filters client-side
   - **Fix**: Pass locationIds to API to filter at database level
   - **File**: `components/reports/tabs/LocationsTab.tsx` (fetchTopMachines)
   - **Impact**: Low - only fetches top 5 machines

---

## Performance Metrics

### Current Performance (Estimated)

- **Locations Tab**: 30-60s for 7d/30d periods (100+ locations)
- **Machines Tab**: 30-60s for 7d/30d periods (1000+ machines)
- **Meters Tab**: 20-40s for 7d/30d periods (100+ locations)

### Target Performance (After Optimization)

- **Locations Tab**: 10-20s for 7d/30d periods
- **Machines Tab**: 10-20s for 7d/30d periods
- **Meters Tab**: 10-15s for 7d/30d periods

---

## Testing Checklist

After optimizations, test:

- [ ] Locations tab loads quickly for 7d/30d periods
- [ ] Machines tab loads quickly for 7d/30d periods
- [ ] Meters tab loads quickly for 7d/30d periods
- [ ] All tabs still work correctly for Today/Yesterday/Custom periods
- [ ] Pagination works correctly on all tabs
- [ ] Filters (licensee, location, search) work correctly
- [ ] Charts display correctly with optimized data
- [ ] Currency conversion works correctly
