# Pagination 20 Items Per Page - Implementation Tracker

This document tracks the progress of updating all pages to paginate by 20 items per page instead of 10.

## Status Legend
- ✅ Completed
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked

## Pages to Update

### 1. Dashboard (app/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - No pagination found on dashboard - top performing is display-only
- **Notes**: Dashboard displays top performing locations/cabinets but doesn't paginate them

### 2. Locations Page (app/locations/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `lib/hooks/locations/useLocationsPageData.ts` - Line 85: `/ 10` → `/ 20`
- **Notes**: Uses accumulated locations pagination

### 3. Location Cabinets (app/locations/[slug]/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `lib/hooks/locations/useLocationCabinetsData.ts` - Line 112: `itemsPerPage = 10` → `20`, `itemsPerBatch = 50` → `100`
  - ✅ `components/locations/sections/LocationCabinetsSection.tsx` - Line 160: `itemsPerPage = 10` → `20`
- **Notes**: Updated batch pagination to 100 items per batch (5 pages × 20 items)

### 4. Cabinets Page (app/cabinets/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `lib/hooks/cabinets/useCabinetsPageData.ts` - Line 64: `itemsPerPage: 10` → `20`
  - ✅ `lib/hooks/data/useCabinetSorting.ts` - Line 49: `itemsPerPage = 10` → `20`, updated comments and calculations for 100-item batches
- **Notes**: Updated batch pagination logic, comments now reflect 100-item batches

### 5. Members Page (app/members/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `components/members/tabs/MembersListTab.tsx` - Line 102: `itemsPerPage = 10` → `20`, `itemsPerBatch = 50` → `100`
  - ✅ `lib/hooks/administration/useAdministrationUsers.ts` - Line 27: `itemsPerPage = 10` → `20`, `itemsPerBatch = 50` → `100`
- **Notes**: Updated batch pagination to 100 items per batch

### 6. Member Sessions (app/members/[id]/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `app/members/[id]/page.tsx` - Line 107: `limit=10` → `limit=20`
- **Notes**: API call limit parameter updated

### 7. Sessions Page (app/sessions/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `lib/hooks/data/useSessions.ts` - Line 40: `itemsPerPage = 10` → `20`, `itemsPerBatch = 50` → `100`
- **Notes**: Updated batch pagination to 100 items per batch

### 8. Session Events (app/sessions/[sessionId]/[machineId]/events/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `lib/hooks/sessions/useSessionEventsData.ts` - Line 35: `itemsPerPage = 10` → `20`, `itemsPerBatch = 50` → `100`, updated pagesPerBatch calculation
- **Notes**: Updated batch pagination to 100 items per batch

### 9. Administration Page (app/administration/page.tsx)
- **Status**: ✅ Completed
- **Files Updated**:
  - ✅ `lib/hooks/administration/useAdministrationUsers.ts` - Line 27: `itemsPerPage = 10` → `20`, `itemsPerBatch = 50` → `100`
- **Notes**: Updated batch pagination to 100 items per batch

## Batch Pagination Updates

For pages using batch pagination, we need to update:
- `itemsPerPage`: 10 → 20
- `itemsPerBatch`: 50 → 100 (to maintain 5 pages per batch)
- `pagesPerBatch`: Will be automatically calculated as `itemsPerBatch / itemsPerPage` = 5

## Implementation Notes

1. When updating batch pagination:
   - `itemsPerBatch` should be updated to 100 to maintain 5 pages per batch
   - `pagesPerBatch` calculation will automatically adjust
   - Ensure all batch boundary logic still works correctly

2. When updating simple pagination:
   - Just change `itemsPerPage` from 10 to 20
   - Update any hardcoded `/ 10` calculations to `/ 20`

3. API calls with `limit` parameter:
   - Update limit from 10 to 20 where appropriate
   - Note: Some API calls fetch all data, so limit may not apply

4. Test each page after updating to ensure:
   - Correct number of items per page
   - Pagination controls work correctly
   - Batch loading works correctly (where applicable)
