# Abort Controller Error Handling Fix Tracker

## Problem

When switching filters, abort controllers cancel in-flight requests, which are being caught as errors and showing toast notifications. Abort errors should be silently ignored as they're expected behavior when switching filters.

## Solution

Update all error handlers to properly detect and silently handle abort errors before showing error notifications.

## Abort Error Detection Pattern

```typescript
// Check for axios cancellation
if (axios.isCancel && axios.isCancel(error)) {
  return; // Silently ignore
}

// Check for standard AbortError (fetch API) or CanceledError
if (
  error instanceof Error &&
  (error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.message === 'canceled' ||
    error.message === 'The user aborted a request.')
) {
  return; // Silently ignore
}
```

## Files to Fix

### ✅ Completed

- [x] `lib/utils/errorHandling.ts` - Created `isAbortError` utility function
- [x] `lib/helpers/dashboard.ts` - All functions (`fetchDashboardTotals`, `loadGamingLocations`, `fetchTopPerformingData`, `handleDashboardRefresh`)
- [x] `lib/hooks/reports/useLocationsTabData.ts` - All catch blocks
- [x] `lib/hooks/reports/useMetersTabData.ts` - All catch blocks
- [x] `lib/hooks/data/useMachinesTabData.ts` - All catch blocks

### ✅ Already Handled (re-throw pattern)

These files re-throw abort errors for `useAbortableRequest` to handle:

- [x] `lib/helpers/locations.ts` - Already re-throws abort errors
- [x] `lib/helpers/topPerforming.ts` - Already re-throws abort errors
- [x] `lib/helpers/metrics.ts` - Already handles abort errors
- [x] `lib/helpers/machineChart.ts` - Already handles abort errors
- [x] `lib/helpers/machineStats.ts` - Already re-throws abort errors
- [x] `lib/helpers/membershipStats.ts` - Already re-throws abort errors

### ✅ Completed (Additional Files)

- [x] `lib/hooks/data/useSessions.ts` - Updated to use `isAbortError`
- [x] `lib/hooks/sessions/useSessionEventsData.ts` - Updated to use `isAbortError`
- [x] `components/ui/MapPreview.tsx` - Updated to use `isAbortError`
- [x] `components/layout/PcLayout.tsx` - Updated to use `isAbortError`
- [x] `components/cabinetDetails/UnifiedBillValidator.tsx` - Updated to use `isAbortError`
- [x] `lib/hooks/locations/useLocationCabinetsData.ts` - Updated to use `isAbortError`
- [x] `lib/hooks/locations/useLocationChartData.ts` - Updated to use `isAbortError`
- [x] `lib/hooks/data/useCabinetDetailsData.ts` - Updated to use `isAbortError`
- [x] `lib/hooks/data/useCabinetData.ts` - Updated to use `isAbortError`
- [x] `lib/hooks/data/useLocationMachineStats.ts` - Updated to use `isAbortError`
- [x] `lib/hooks/data/useLocationMembershipStats.ts` - Updated to use `isAbortError`

## Summary

All error handlers across the codebase have been updated to use the centralized `isAbortError` utility function. Abort errors are now consistently handled silently without showing error toasts, as they are expected behavior when users switch filters quickly.

## Notes

- Abort errors are expected when users switch filters quickly
- They should never show error toasts
- They should be logged at debug level only (optional)
- All abort checks should happen BEFORE calling `showErrorNotification` or `toast.error`

## Last Updated

2025-12-29
