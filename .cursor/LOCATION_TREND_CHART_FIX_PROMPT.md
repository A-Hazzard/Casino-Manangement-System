# Location Trend Chart Fix Prompt

## Context
The Location Trend Chart component (`components/ui/LocationTrendChart.tsx`) is used in the reports section to display location metrics over time. There are several critical issues that need to be fixed.

## Issues to Fix

### 1. Data Discrepancy Between Minute and Hourly Granularity

**Problem:**
When switching between minute and hourly granularity, the same time point (e.g., 8:00 AM) shows different values:
- **Minute granularity**: Shows `0, 0, 2` plays at 8:00 AM
- **Hourly granularity**: Shows `254, 75, 19` plays at 8:00 AM

**Root Cause:**
- Minute granularity displays individual minute-level data points. If there's only data at 8:02 AM (2 plays), that's what appears at that specific minute.
- Hourly granularity aggregates ALL data from the entire hour (8:00-8:59), summing all minute-level data points within that hour.

**Expected Behavior:**
This is actually correct behavior - minute shows individual points, hourly shows aggregated totals. However, the user experience might be confusing. Consider:
- Adding a tooltip or legend explanation
- Or ensuring minute-level data shows aggregated values per minute (not individual meter readings)

**Investigation Needed:**
- Check how the API aggregates data for minute vs hourly granularity
- Verify if minute-level should show per-minute aggregates or individual meter readings
- Compare with how the dashboard chart (`components/ui/dashboard/Chart.tsx`) handles this

### 2. Date Formatting Error in Tooltip

**Error:**
```
Date formatting error: Error: Invalid date
    at formatDate (dateFormat.ts:28:13)
    at formatDisplayDate (dateFormat.ts:47:10)
    at labelFormatter (LocationTrendChart.tsx:460:46)
```

**Root Cause:**
In `LocationTrendChart.tsx` line 471, the tooltip's `labelFormatter` calls `formatDisplayDate(label as string)` when `shouldShowTimes` is false and `shouldShowMonths` is false. However, `label` might be a time string (e.g., "14:30") rather than a date string, causing an invalid date error.

**Location:**
- File: `components/ui/LocationTrendChart.tsx`
- Line: ~471 in the `labelFormatter` function
- Code: `return formatDisplayDate(label as string);`

**Fix Required:**
- Add validation to check if `label` is a valid date before calling `formatDisplayDate`
- Or handle the case where `label` might be a time string differently
- Ensure proper fallback when date parsing fails

### 3. X-Axis Date Display Issue

**Problem:**
The x-axis currently shows dates in the format "DD/MM/YYYY, HH:MM:SS am/pm" even for Today, Yesterday, or single-day Custom periods. The user wants to see ONLY the time (hours/minutes) without the date portion for these cases.

**Current Behavior:**
- X-axis shows: "16/12/2025, 8:00:00 am", "16/12/2025, 10:00 am", etc.
- Tooltip shows: "16/12/2025, 8:00:00 am"

**Expected Behavior:**
- For Today, Yesterday, or single-day Custom periods: Show ONLY time (e.g., "8:00 AM", "10:00 AM", "2:00 PM")
- For multi-day periods (7d, 30d, All Time): Show dates (current behavior is fine)
- For Quarterly: Show months (current behavior is fine)

**Reference Implementation:**
Look at how `components/ui/dashboard/Chart.tsx` handles this:
- When `isHourlyChart` is true, it only shows times (no dates)
- The `tickFormatter` for hourly charts formats only the time portion
- The tooltip also shows only time for hourly charts

**Files to Review:**
- `components/ui/dashboard/Chart.tsx` - Lines 456-471 (tickFormatter) and 522-536 (tooltip labelFormatter)
- `components/ui/LocationTrendChart.tsx` - Lines 369-398 (tickFormatter) and 447-472 (tooltip labelFormatter)

**Fix Required:**
- Update `tickFormatter` in `LocationTrendChart.tsx` to only return time (not date) when `shouldShowTimes` is true
- Update tooltip `labelFormatter` to only show time (not date) when `shouldShowTimes` is true
- Ensure the format matches the dashboard chart: "HH:MM AM/PM" or "H:MM AM/PM" (no date, no seconds)
- Remove seconds from time display (currently showing "8:00:00 am", should be "8:00 AM")

### 4. Timezone Conversion Consistency

**Current Implementation:**
- Uses `formatTrinidadTime()` to convert UTC times to Trinidad time (UTC-4)
- This is correct, but ensure it's applied consistently in both tickFormatter and tooltip

**Verification:**
- Ensure all time displays use Trinidad time conversion
- Verify times match expected Trinidad local time (UTC-4 offset)

## Technical Details

### Current Code Locations

1. **X-Axis Tick Formatter**: `components/ui/LocationTrendChart.tsx` lines 369-398
2. **Tooltip Label Formatter**: `components/ui/LocationTrendChart.tsx` lines 447-472
3. **Reference Implementation**: `components/ui/dashboard/Chart.tsx` lines 456-471 and 522-536

### Key Variables
- `shouldShowTimes`: Boolean indicating if times should be shown (Today/Yesterday/single-day Custom)
- `shouldShowMonths`: Boolean indicating if months should be shown (Quarterly)
- `granularity`: 'hourly' | 'minute' - determines data aggregation level
- `timePeriod`: TimePeriod type - determines which time format to use

### Expected Format
- **Time only (Today/Yesterday/single-day Custom)**: "8:00 AM", "2:30 PM", "11:45 AM"
- **Date (multi-day periods)**: "Jan 15, 2024" (current format is fine)
- **Month (Quarterly)**: "Jan 2024" (current format is fine)

## Testing Checklist

After fixes:
1. ✅ Switch between minute and hourly granularity - verify data makes sense
2. ✅ Check Today filter - x-axis should show only times (no dates)
3. ✅ Check Yesterday filter - x-axis should show only times (no dates)
4. ✅ Check single-day Custom period - x-axis should show only times (no dates)
5. ✅ Check multi-day Custom period - x-axis should show dates
6. ✅ Check 7d/30d periods - x-axis should show dates
7. ✅ Verify no console errors when hovering over chart points
8. ✅ Verify tooltip shows correct format (time only for single-day, date+time for multi-day)
9. ✅ Verify times are in Trinidad timezone (UTC-4)
10. ✅ Verify no seconds in time display (should be "8:00 AM" not "8:00:00 AM")

## Notes

- The data discrepancy (0,0,2 vs 254,75,19) is likely correct behavior - minute shows individual points, hourly shows aggregated totals
- The main issues are: date formatting error and incorrect date display on x-axis
- Follow the pattern used in `components/ui/dashboard/Chart.tsx` for consistency


