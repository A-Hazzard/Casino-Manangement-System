# Fix Excessive Chart Requests Issue

## Problem Description

The location details page (`app/locations/[slug]/page.tsx`) is making an excessive number of duplicate chart data requests. When viewing a location with multiple machines, the application is sending dozens of identical API requests to fetch chart data, causing performance issues and unnecessary server load.

## Symptoms

1. **Network Tab Shows Many Duplicate Requests:**
   - All requests have identical parameters: `chart?timePeriod=Quarterly&currency=USD&licensee=&granularity=weekly`
   - All requests return `200 OK` status
   - All requests are XHR (XMLHttpRequest) type
   - Requests are initiated from `machineChart.ts:202`

2. **Request Pattern:**
   - Requests occur in bursts (clusters of activity)
   - Same endpoint called repeatedly with identical parameters
   - Requests span over 30-70 seconds of page load time

3. **User Impact:**
   - Slow page load times
   - Unnecessary network bandwidth usage
   - Potential server overload
   - Poor user experience

## Context

### Architecture

The location chart data is fetched using the `useLocationChartData` hook (`lib/hooks/locations/useLocationChartData.ts`), which:

1. Fetches all machines for the location using `fetchCabinetsForLocation`
2. For each machine, calls `getMachineChartData` (from `lib/helpers/machineChart.ts`) in parallel
3. Aggregates the chart data from all machines into a single dataset
4. Displays the aggregated data in a chart component

### Current Implementation Details

- **Hook:** `lib/hooks/locations/useLocationChartData.ts`
- **Helper Function:** `lib/helpers/machineChart.ts` - `getMachineChartData()`
- **API Endpoint:** `/api/machines/[machineId]/chart`
- **Deduplication:** `lib/utils/requestDeduplication.ts` - `deduplicateRequest()` function exists
- **Abort Controller:** `lib/hooks/useAbortableRequest.ts` - `useAbortableRequest()` hook is used

### Previous Attempts to Fix

1. **Added Request Deduplication:**
   - Integrated `deduplicateRequest` into `getMachineChartData` function
   - Should prevent duplicate requests for the same machine chart

2. **Fixed Circular Dependencies:**
   - Removed `showGranularitySelector` from fetch effect dependencies
   - Added `lastFetchParamsRef` to track last fetch parameters
   - Separated granularity update logic into its own effect

3. **Added Fetch Key Tracking:**
   - Created `lastFetchParamsRef` to prevent duplicate fetches with same parameters
   - Skip fetch if exact same parameters were used

## Expected Behavior

1. **On Initial Load:**
   - Fetch all machines for the location (one request)
   - For each machine, fetch chart data (one request per machine, in parallel)
   - Aggregate results and display

2. **On Filter Change:**
   - Cancel any in-flight requests
   - Fetch new data with updated parameters
   - Display updated chart

3. **On Granularity Change:**
   - Only refetch if granularity actually changed
   - Cancel previous requests
   - Fetch with new granularity parameter

## Root Cause Analysis Needed

The issue persists despite deduplication and dependency fixes. Possible causes:

1. **Multiple Hook Instances:**
   - Is `useLocationChartData` being called multiple times?
   - Are there multiple components rendering the same hook?

2. **Effect Re-triggering:**
   - Are dependencies changing unexpectedly?
   - Is the `makeChartRequest` function being recreated?
   - Are state updates causing cascading re-renders?

3. **Deduplication Not Working:**
   - Is the request key normalization working correctly?
   - Are parameters being normalized the same way?
   - Is the deduplication cache being cleared prematurely?

4. **Parallel Machine Fetches:**
   - Are machine fetches triggering multiple chart fetches?
   - Is the parallel `Promise.all()` causing issues?
   - Are abort signals being handled correctly?

5. **State Update Loops:**
   - Are state updates in the hook causing re-renders?
   - Is `setChartData` or `setDataSpan` triggering effects?
   - Are computed values (`showGranularitySelector`) changing unexpectedly?

## Investigation Points

1. **Check Hook Dependencies:**
   - Review all `useEffect` dependency arrays in `useLocationChartData`
   - Verify no dependencies are causing unnecessary re-runs
   - Check if `makeChartRequest` is stable

2. **Verify Deduplication:**
   - Check if `deduplicateRequest` is being called correctly
   - Verify request key normalization is working
   - Check if the in-flight requests map is being managed correctly

3. **Check Component Rendering:**
   - Verify `useLocationChartData` is only called once per location
   - Check if the component is re-mounting unexpectedly
   - Verify no duplicate hook instances

4. **Review State Updates:**
   - Check if state updates are causing effect re-runs
   - Verify `setChartData` and `setDataSpan` aren't triggering fetches
   - Check if computed values are stable

5. **Network Request Analysis:**
   - Compare request URLs to see if they're truly identical
   - Check request timing to see if they're simultaneous or sequential
   - Verify if requests are being cancelled properly

## Success Criteria

The fix should result in:

1. **Single Request Per Machine:**
   - Each machine should only trigger one chart data request per parameter set
   - No duplicate requests with identical parameters

2. **Proper Request Cancellation:**
   - Previous requests should be cancelled when filters change
   - No orphaned requests continuing after parameter changes

3. **Efficient Data Fetching:**
   - Requests should be batched/parallel where appropriate
   - No unnecessary refetches when data hasn't changed

4. **Stable Performance:**
   - Page load should complete quickly
   - Network tab should show minimal, necessary requests only

## Files to Investigate

- `lib/hooks/locations/useLocationChartData.ts` - Main hook managing chart data
- `lib/helpers/machineChart.ts` - Helper function fetching individual machine charts
- `lib/utils/requestDeduplication.ts` - Deduplication utility
- `lib/hooks/useAbortableRequest.ts` - Abort controller management
- `app/locations/[slug]/page.tsx` - Page component using the hook
- `components/locations/sections/LocationCabinetsSection.tsx` - Component rendering chart

## Notes

- The issue occurs specifically on the location details page
- All requests are for the same time period (Quarterly) and granularity (weekly)
- The deduplication mechanism exists but may not be working as expected
- Previous fixes addressed circular dependencies but the issue persists
