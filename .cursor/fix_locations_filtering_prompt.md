# Fix Locations Page Filtering and Table Spacing Issues

## Issues to Fix

1. **Table Top Margin**: The table container still has top margin, preventing it from being attached directly to the filter section above it.

2. **Checkbox Filters Not Working**: When clicking the checkboxes (SMIB, No SMIB, Local Server, Membership, Missing Coordinates, Has Coordinates), the data displayed in the table and mobile cards is not being filtered correctly. The filters appear to trigger a refetch (skeletons show), but the returned data doesn't match the selected filters.

## Root Cause Analysis

### Issue 1: Table Margin

- **Location**: `app/locations/page.tsx` line 100
- **Problem**: The parent container has `mt-6` class which creates spacing between the filter section and the table
- **Current Code**: `<div className="mt-6 flex flex-col gap-4">` wraps the filter section
- **Solution**: Remove `mt-6` from this container and ensure the table container (line 124) has no top margin

### Issue 2: Filter Data Not Updating

After analyzing the code flow, the issue appears to be:

1. **Accumulated Locations Not Cleared**: When filters change, `accumulatedLocations` state is not cleared, so old unfiltered data persists
2. **Filtered Data Logic**: `filteredLocationData` uses `accumulatedLocations` when there's no search term, which may contain stale unfiltered data
3. **Filter State Sync**: The `useLocationData` hook uses refs to track filters, but the accumulated locations might not be reset when filters change

## Implementation Plan

### Fix 1: Remove Table Top Margin

**File**: `app/locations/page.tsx`

**Change Line 100**:

```typescript
// BEFORE
<div className="mt-6 flex flex-col gap-4">

// AFTER
<div className="flex flex-col gap-4">
```

**Change Line 124**:

```typescript
// BEFORE
<div className="flex-1">

// AFTER
<div className="flex-1 mt-0">
```

**Rationale**: Remove the `mt-6` margin from the filter section container and explicitly set `mt-0` on the table container to ensure no spacing.

---

### Fix 2: Clear Accumulated Locations When Filters Change

**File**: `lib/hooks/locations/useLocationsPageData.ts`

**Add new useEffect after line 113** (after the batch accumulation logic):

```typescript
// Clear accumulated locations when filters change
useEffect(() => {
  if (selectedFilters.length > 0) {
    setAccumulatedLocations([]);
  }
}, [selectedFilters]);
```

**Rationale**: When filters are applied, we should clear the accumulated locations to prevent showing stale unfiltered data. The API will return filtered data, which should replace the accumulated data.

---

### Fix 3: Ensure Filtered Data Uses API Results

**File**: `lib/hooks/locations/useLocationsPageData.ts`

**Modify the `filteredLocationData` useMemo (around line 69)**:

```typescript
const filteredLocationData = useMemo(() => {
  // When filters are active, always use locationData from API (which is already filtered)
  // When no filters and no search, use accumulatedLocations
  const data =
    selectedFilters.length > 0
      ? locationData // API already filtered by backend
      : searchTerm.trim()
        ? locationData
        : accumulatedLocations;

  const isDeveloper = user?.roles?.includes('developer') ?? false;
  if (isDeveloper) return data;
  return data.filter(loc => !/^test/i.test(loc.name || ''));
}, [locationData, accumulatedLocations, searchTerm, selectedFilters, user]);
```

**Rationale**: When filters are active, the API already returns filtered data, so we should use `locationData` directly instead of `accumulatedLocations`. The backend filtering is more reliable and handles all filter types (including MembershipOnly which doesn't work in frontend).

---

### Fix 4: Reset Accumulated Locations on Filter Change in Batch Logic

**File**: `lib/hooks/locations/useLocationsPageData.ts`

**Modify the batch accumulation useEffect (around line 105)**:

```typescript
// Batch accumulation logic
useEffect(() => {
  // Don't accumulate if filters are active - API already filtered
  if (selectedFilters.length > 0) {
    return;
  }

  if (!searchTerm.trim() && locationData.length > 0) {
    setAccumulatedLocations(prev => {
      const existingIds = new Set(prev.map(loc => loc._id));
      const newLocations = locationData.filter(
        loc => !existingIds.has(loc._id)
      );
      return [...prev, ...newLocations];
    });
  }
}, [locationData, searchTerm, selectedFilters]);
```

**Rationale**: When filters are active, we shouldn't accumulate locations because the API is already filtering. Accumulation should only happen when there are no filters and no search term.

---

### Fix 5: Verify Filter String is Passed Correctly to API

**File**: `lib/hooks/data/useLocationData.ts`

**Verify lines 204-206** are correctly passing filters:

```typescript
const result = await fetchAggregatedLocationsData(
  (activeMetricsFilter || 'Today') as TimePeriod,
  selectedLicencee || '',
  selectedFiltersRef.current.length ? selectedFiltersRef.current.join(',') : '',
  dateRangeForFetch,
  displayCurrency,
  page || 1,
  limit || 50,
  signal
);
```

**Check**: Ensure `selectedFiltersRef.current` is being updated correctly when filters change. The ref is updated in the useEffect at lines 78-83, which should be working correctly.

**Optional Enhancement**: Add console logging to verify filters are being passed:

```typescript
console.log('[useLocationData] Fetching with filters:', {
  filterString: selectedFiltersRef.current.length
    ? selectedFiltersRef.current.join(',')
    : '',
  filters: selectedFiltersRef.current,
});
```

---

### Fix 6: Verify Backend API Applies Filters Correctly

**File**: `app/api/lib/helpers/locationAggregation.ts`

**Verify**: The `getLocationsWithMetrics` function correctly applies the `machineTypeFilter` parameter according to the guide provided. The filtering logic should use OR logic (locations match if they satisfy ANY selected filter).

**Check**: Ensure the filter conditions are being added to `locationMatchStage.$or` correctly (as documented in the guide).

---

## Testing Checklist

After implementing fixes:

- [ ] **Table Spacing**: Table is directly attached to filter section with no gap
- [ ] **Single Filter**: Select "SMIB" checkbox → only locations with SMIB shown
- [ ] **Multiple Filters**: Select "SMIB" + "Local Server" → locations with SMIB OR local server shown
- [ ] **Filter Removal**: Uncheck all filters → all locations shown
- [ ] **Filter + Search**: Apply filter + search term → both filters applied correctly
- [ ] **Membership Filter**: Select "Membership" → only locations with membership enabled shown
- [ ] **Coordinate Filters**: Select "Missing Coordinates" → only locations without coordinates shown
- [ ] **Coordinate Filters**: Select "Has Coordinates" → only locations with coordinates shown
- [ ] **Data Refresh**: When filters change, skeletons show briefly, then filtered data appears
- [ ] **No Stale Data**: Old unfiltered data doesn't appear when filters are applied

## Expected Behavior

1. **When no filters selected**: All locations shown (from accumulatedLocations or locationData)
2. **When filters selected**: Only locations matching ANY selected filter shown (from API-filtered locationData)
3. **When filters change**: Accumulated locations cleared, new filtered data fetched from API
4. **Table positioning**: Directly attached to filter section with no margin

## Files to Modify

1. `app/locations/page.tsx` - Remove table margin
2. `lib/hooks/locations/useLocationsPageData.ts` - Clear accumulated locations, fix filtered data logic
3. `lib/hooks/data/useLocationData.ts` - Verify filter passing (optional logging)
4. `app/api/lib/helpers/locationAggregation.ts` - Verify backend filtering (if needed)

## Notes

- The backend filtering is preferred over frontend filtering for performance
- `MembershipOnly` filter only works at backend level (not in frontend `filterLocations` function)
- Filters use OR logic (location matches if it satisfies ANY selected filter)
- The `selectedFiltersRef` in `useLocationData` is used to avoid recreating callbacks, but filters are still passed correctly to the API
