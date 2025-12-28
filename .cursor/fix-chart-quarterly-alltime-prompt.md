# Fix Chart Formatting for Quarterly and All Time Periods

## Issues to Fix

1. **Quarterly Period**: When "Quarterly" is selected, the chart shows daily aggregation (90 data points), which is too dense and hard to read. The x-axis labels are not properly formatted for a 90-day period.

2. **All Time Period**: When "All Time" is selected, the chart has no proper aggregation or formatting. The x-axis labels don't display correctly for long time spans.

## Root Cause Analysis

### Current Implementation

**Location Trends API** (`app/api/lib/helpers/locationTrends.ts`):
- Line 82-84: Quarterly uses daily aggregation (`useHourly: false, useMinute: false`)
- No special handling for "All Time" period
- Aggregation groups by `day` (YYYY-MM-DD format) for non-hourly/non-minute data

**Machine Chart API** (`app/api/machines/[machineId]/chart/route.ts`):
- Line 192-203: "All Time" sets `startDate = undefined, endDate = undefined`
- Line 208-256: Aggregation logic doesn't handle Quarterly or All Time specially
- Uses daily aggregation by default for periods > 1 day

**Chart Component** (`components/ui/dashboard/Chart.tsx`):
- Line 394-428: X-axis formatter handles hourly and daily formats
- No special formatting for monthly/yearly aggregation
- `formatDisplayDate()` is used for daily data, but doesn't handle monthly/yearly labels

### Problem

1. **Quarterly (90 days)**: Daily aggregation produces 90 data points, making the chart cluttered and hard to read
2. **All Time**: No aggregation strategy, potentially showing thousands of daily points
3. **X-axis Labels**: Chart component doesn't format monthly/yearly labels properly

## Solution Approach

Based on chart standards and best practices:

### Aggregation Strategy

**Quarterly (90 days / ~3 months):**
- **Aggregate by Month**: Group data into monthly buckets (3-4 data points)
- **X-axis Format**: Show month names (e.g., "Oct 2025", "Nov 2025", "Dec 2025")
- **Rationale**: 3-4 monthly points provide clear trend visualization without clutter

**All Time:**
- **Determine data span** from first to last meter reading
- **Aggregation based on span:**
  - **< 1 year**: Monthly aggregation (up to 12 points)
  - **1-3 years**: Monthly aggregation (12-36 points) - still readable
  - **> 3 years**: Yearly aggregation (1 point per year)
- **X-axis Format**: 
  - Monthly: "MMM YYYY" (e.g., "Jan 2024")
  - Yearly: "YYYY" (e.g., "2024")

## Implementation Plan

### Fix 1: Update Location Trends Helper - Quarterly Aggregation

**File**: `app/api/lib/helpers/locationTrends.ts`

**Modify `determineAggregationGranularity` function (around line 60)**:

```typescript
function determineAggregationGranularity(
  timePeriod: TimePeriod,
  startDate?: Date,
  endDate?: Date,
  startDateParam?: string | null,
  endDateParam?: string | null,
  manualGranularity?: 'hourly' | 'minute'
): { useHourly: boolean; useMinute: boolean; useMonthly: boolean; useYearly: boolean } {
  // If granularity is manually specified, use it
  if (manualGranularity) {
    if (manualGranularity === 'minute') {
      return { useHourly: false, useMinute: true, useMonthly: false, useYearly: false };
    } else if (manualGranularity === 'hourly') {
      return { useHourly: true, useMinute: false, useMonthly: false, useYearly: false };
    }
  }

  if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
    return { useHourly: true, useMinute: false, useMonthly: false, useYearly: false };
  }

  if (timePeriod === 'Quarterly') {
    // Quarterly: aggregate by month (3-4 monthly data points)
    return { useHourly: false, useMinute: false, useMonthly: true, useYearly: false };
  }

  if (timePeriod === 'All Time') {
    // All Time: will be determined based on actual data span in the aggregation pipeline
    // Default to monthly, but pipeline will check span and use yearly if > 3 years
    return { useHourly: false, useMinute: false, useMonthly: true, useYearly: false };
  }

  // ... rest of function for Custom periods
}
```

**Modify `buildLocationTrendsPipeline` function (around line 123)**:

```typescript
function buildLocationTrendsPipeline(
  targetLocations: string[],
  queryStartDate: Date,
  queryEndDate: Date,
  licencee: string | null,
  shouldUseHourly: boolean,
  shouldUseMinute?: boolean,
  shouldUseMonthly?: boolean,
  shouldUseYearly?: boolean
): PipelineStage[] {
  // ... existing match and lookup stages ...

  const groupId: Record<string, unknown> = {
    location: '$location',
  };

  if (shouldUseYearly) {
    // Yearly aggregation: format as YYYY
    groupId.day = {
      $dateToString: {
        format: '%Y',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else if (shouldUseMonthly) {
    // Monthly aggregation: format as YYYY-MM
    groupId.day = {
      $dateToString: {
        format: '%Y-%m',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else if (shouldUseMinute) {
    // Minute-level: format day as YYYY-MM-DD and time as HH:MM
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
    groupId.time = {
      $dateToString: {
        format: '%H:%M',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else if (shouldUseHourly) {
    // Hourly: format day as YYYY-MM-DD and time as HH:00
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
    groupId.time = {
      $dateToString: {
        format: '%H:00',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else {
    // Daily: format as YYYY-MM-DD
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  }

  // ... rest of pipeline (group, sort, project) ...
}
```

**Update `getLocationTrends` function to handle All Time data span detection**:

```typescript
// In getLocationTrends function, before building pipeline:
if (timePeriod === 'All Time') {
  // First, get the actual date range from the data
  const dateRangePipeline: PipelineStage[] = [
    {
      $match: {
        location: { $in: targetLocations },
      },
    },
    {
      $group: {
        _id: null,
        minDate: { $min: '$readAt' },
        maxDate: { $max: '$readAt' },
      },
    },
  ];
  
  const dateRangeResult = await Meters.aggregate(dateRangePipeline).exec();
  if (dateRangeResult.length > 0 && dateRangeResult[0].minDate && dateRangeResult[0].maxDate) {
    const minDate = dateRangeResult[0].minDate;
    const maxDate = dateRangeResult[0].maxDate;
    const yearsDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Use yearly aggregation if span > 3 years, otherwise monthly
    if (yearsDiff > 3) {
      shouldUseYearly = true;
      shouldUseMonthly = false;
    } else {
      shouldUseYearly = false;
      shouldUseMonthly = true;
    }
    
    // Set query dates to actual data range
    queryStartDate = minDate;
    queryEndDate = maxDate;
  }
}
```

---

### Fix 2: Update Machine Chart API - Quarterly and All Time Aggregation

**File**: `app/api/machines/[machineId]/chart/route.ts`

**Modify aggregation logic (around line 208-256)**:

```typescript
// Determine aggregation granularity based on time range and manual granularity
let useHourly = false;
let useMinute = false;
let useMonthly = false;
let useYearly = false;

// If granularity is manually specified, use it
if (granularity) {
  if (granularity === 'minute') {
    useMinute = true;
  } else if (granularity === 'hourly') {
    useHourly = true;
  }
} else {
  // Auto-detect granularity
  if (timePeriod === 'Quarterly') {
    useMonthly = true;
  } else if (timePeriod === 'All Time') {
    // For All Time, determine based on actual data span
    // First check data range
    const dateRangeMatch = { machine: machineId };
    const dateRangeResult = await Meters.aggregate([
      { $match: dateRangeMatch },
      {
        $group: {
          _id: null,
          minDate: { $min: '$readAt' },
          maxDate: { $max: '$readAt' },
        },
      },
    ]).exec();
    
    if (dateRangeResult.length > 0 && dateRangeResult[0].minDate && dateRangeResult[0].maxDate) {
      const minDate = dateRangeResult[0].minDate;
      const maxDate = dateRangeResult[0].maxDate;
      const yearsDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (yearsDiff > 3) {
        useYearly = true;
      } else {
        useMonthly = true;
      }
      
      startDate = minDate;
      endDate = maxDate;
    } else {
      // Fallback to monthly if no data
      useMonthly = true;
    }
  } else if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
    useHourly = true;
  } else if (timePeriod === 'Custom' && startDate && endDate) {
    // ... existing custom range logic ...
  }
}
```

**Update the aggregation pipeline (around line 268-296)**:

```typescript
// Add fields for day and time based on aggregation type
pipeline.push({
  $addFields: {
    day: useYearly
      ? {
          $dateToString: {
            date: '$readAt',
            format: '%Y',
            timezone: 'UTC',
          },
        }
      : useMonthly
      ? {
          $dateToString: {
            date: '$readAt',
            format: '%Y-%m',
            timezone: 'UTC',
          },
        }
      : {
          $dateToString: {
            date: '$readAt',
            format: '%Y-%m-%d',
            timezone: 'UTC',
          },
        },
    time: useMinute
      ? {
          $dateToString: {
            date: '$readAt',
            format: '%H:%M',
            timezone: 'UTC',
          },
        }
      : useHourly
      ? {
          $dateToString: {
            date: '$readAt',
            format: '%H:00',
            timezone: 'UTC',
          },
        }
      : '00:00',
  },
});
```

---

### Fix 3: Update Chart Component - X-Axis Formatting

**File**: `components/ui/dashboard/Chart.tsx`

**Add helper function to detect aggregation type** (around line 100):

```typescript
// Detect if data is monthly or yearly aggregated
const isMonthlyAggregated = (): boolean => {
  if (!finalChartData.length) return false;
  // Check if day format is YYYY-MM (monthly) or YYYY (yearly)
  const firstDay = finalChartData[0]?.day || '';
  // YYYY-MM format has exactly 7 characters and contains a hyphen
  return firstDay.length === 7 && firstDay.includes('-') && firstDay.split('-').length === 2;
};

const isYearlyAggregated = (): boolean => {
  if (!finalChartData.length) return false;
  // Check if day format is YYYY (yearly) - exactly 4 digits
  const firstDay = finalChartData[0]?.day || '';
  return /^\d{4}$/.test(firstDay);
};
```

**Update X-axis formatter (around line 395-428)**:

```typescript
<XAxis
  dataKey={isHourlyChart ? 'time' : 'day'}
  tickFormatter={(val, index) => {
    if (isHourlyChart) {
      // ... existing hourly formatting ...
    } else {
      // For daily/monthly/yearly charts
      if (val) {
        const dataPoint = gapFilteredChartData[index];
        const dayValue = dataPoint?.day || val;
        
        // Check if it's yearly aggregation (YYYY format)
        if (isYearlyAggregated()) {
          // Format as year only: "2024"
          return String(dayValue);
        }
        
        // Check if it's monthly aggregation (YYYY-MM format)
        if (isMonthlyAggregated()) {
          // Format as month and year: "Oct 2025"
          const [year, month] = dayValue.split('-');
          if (year && month) {
            const monthIndex = parseInt(month, 10) - 1;
            const date = new Date(parseInt(year, 10), monthIndex, 1);
            return formatDisplayDate(date, 'month'); // Need to add month format option
          }
        }
        
        // Daily aggregation (existing logic)
        const date = new Date(dayValue);
        if (!isNaN(date.getTime())) {
          return formatDisplayDate(date);
        }
        return String(val);
      }
      return '';
    }
  }}
/>
```

**Update `formatDisplayDate` utility or create new formatter**:

Check `shared/utils/dateFormat.ts` and add month/year formatting options if needed.

---

### Fix 4: Update Chart Granularity Utility

**File**: `lib/utils/chartGranularity.ts`

**Update `getDefaultChartGranularity` function**:

```typescript
export function getDefaultChartGranularity(
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string
): 'minute' | 'hourly' | 'monthly' | 'yearly' {
  // ... existing logic for Today, Yesterday, Custom ...
  
  if (timePeriod === 'Quarterly') {
    return 'monthly'; // Quarterly uses monthly aggregation
  }
  
  if (timePeriod === 'All Time') {
    // All Time will be determined by API based on data span
    // Default to monthly, API will override to yearly if span > 3 years
    return 'monthly';
  }
  
  // ... rest of function ...
}
```

---

## Files to Modify

1. **Backend - Location Trends**:
   - `app/api/lib/helpers/locationTrends.ts` - Add monthly/yearly aggregation support
   - Update `determineAggregationGranularity()` function
   - Update `buildLocationTrendsPipeline()` function
   - Update `getLocationTrends()` function to handle All Time data span detection

2. **Backend - Machine Chart**:
   - `app/api/machines/[machineId]/chart/route.ts` - Add monthly/yearly aggregation support
   - Update aggregation granularity detection logic
   - Update aggregation pipeline to support monthly/yearly grouping

3. **Frontend - Chart Component**:
   - `components/ui/dashboard/Chart.tsx` - Add monthly/yearly x-axis formatting
   - Add helper functions to detect aggregation type
   - Update X-axis `tickFormatter` to handle monthly/yearly labels

4. **Frontend - Utilities**:
   - `lib/utils/chartGranularity.ts` - Update to return monthly/yearly options
   - `shared/utils/dateFormat.ts` - Add month/year formatting if needed

5. **Frontend - Hooks** (if needed):
   - `lib/hooks/locations/useLocationChartData.ts` - May need updates if granularity type changes
   - `lib/hooks/cabinets/useCabinetChartData.ts` - May need updates if granularity type changes

---

## Testing Checklist

After implementing fixes:

- [ ] **Quarterly Period**: Chart shows 3-4 monthly data points with proper month labels
- [ ] **All Time (< 1 year)**: Chart shows monthly aggregation with month labels
- [ ] **All Time (1-3 years)**: Chart shows monthly aggregation (12-36 points) with month labels
- [ ] **All Time (> 3 years)**: Chart shows yearly aggregation with year labels
- [ ] **X-axis Labels**: Monthly shows "MMM YYYY" format (e.g., "Oct 2025")
- [ ] **X-axis Labels**: Yearly shows "YYYY" format (e.g., "2024")
- [ ] **Data Accuracy**: Aggregated values match sum of daily values for the period
- [ ] **Location Details Page**: Chart displays correctly for Quarterly and All Time
- [ ] **Cabinet Details Page**: Chart displays correctly for Quarterly and All Time
- [ ] **Performance**: Monthly/yearly aggregation is faster than daily for long periods
- [ ] **No Regression**: Existing periods (Today, Yesterday, 7d, 30d, Custom) still work correctly

---

## Expected Behavior

### Quarterly (90 days)

**Before:**
- 90 daily data points
- X-axis shows individual dates
- Chart is cluttered and hard to read

**After:**
- 3-4 monthly data points
- X-axis shows month names: "Oct 2025", "Nov 2025", "Dec 2025"
- Chart is clean and shows clear monthly trends

### All Time

**Before:**
- No proper aggregation (potentially thousands of daily points)
- X-axis labels may not display correctly
- Chart may be unreadable or fail to render

**After:**
- **< 1 year**: Monthly aggregation (up to 12 points), labels: "Jan 2024", "Feb 2024", etc.
- **1-3 years**: Monthly aggregation (12-36 points), labels: "Jan 2024", "Feb 2024", etc.
- **> 3 years**: Yearly aggregation (1 point per year), labels: "2022", "2023", "2024", etc.
- Chart is readable and shows clear trends

---

## Implementation Notes

1. **Backward Compatibility**: Ensure existing periods (Today, Yesterday, 7d, 30d, Custom) continue to work with daily/hourly aggregation

2. **Performance**: Monthly/yearly aggregation should be faster than daily for long periods because:
   - Fewer data points to process
   - Smaller result sets to transfer
   - Less rendering overhead

3. **Data Accuracy**: Monthly/yearly aggregation should sum all daily values within each month/year period

4. **Date Formatting**: Use consistent date formatting utilities from `shared/utils/dateFormat.ts`

5. **Timezone Handling**: Ensure monthly/yearly aggregation respects UTC timezone consistently

---

## Chart Standards Reference

Based on industry chart standards:

- **< 30 days**: Daily or hourly aggregation
- **30-90 days**: Daily aggregation (or weekly for very dense data)
- **90 days - 1 year**: Monthly aggregation (12 points max)
- **1-3 years**: Monthly aggregation (still readable with 12-36 points)
- **> 3 years**: Yearly aggregation (1 point per year)

This ensures:
- Charts remain readable
- Trends are clearly visible
- Performance is optimal
- X-axis labels are meaningful
