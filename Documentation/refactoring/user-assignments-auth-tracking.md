# User Assignments Authentication & Authorization Tracking

This document tracks all pages and API routes that use `assignedLocations` and `assignedLicensees` for user authentication and authorization, ensuring they don't use the old variables (`resourcePermissions` and `rel.licencee`).

## Status Legend

- ✅ **VERIFIED** - Uses new fields correctly, no old fields
- ⚠️ **NEEDS REVIEW** - May need verification
- ❌ **USES OLD FIELDS** - Still using old fields (needs fix)
- 🔄 **IN PROGRESS** - Currently being updated
- ➖ **N/A** - Not applicable (doesn't use location/licensee permissions)

---

## Frontend Pages

### Dashboard & Main Pages

| Page | File | Status | Notes |
|------|------|--------|-------|
| Dashboard | `app/page.tsx` | ⚠️ NEEDS REVIEW | Check if uses location/licensee filtering |
| Locations List | `app/locations/page.tsx` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| Location Details | `app/locations/[slug]/page.tsx` | ⚠️ NEEDS REVIEW | Should check location access |
| Location Details (Details Tab) | `app/locations/[slug]/details/page.tsx` | ⚠️ NEEDS REVIEW | Should check location access |
| Machines | `app/machines/page.tsx` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| Machine Details | `app/machines/[slug]/page.tsx` | ⚠️ NEEDS REVIEW | Should check location access |
| Cabinets | `app/cabinets/page.tsx` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| Cabinet Details | `app/cabinets/[slug]/page.tsx` | ⚠️ NEEDS REVIEW | Should check location access |
| Reports | `app/reports/page.tsx` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| Collection Report | `app/collection-report/page.tsx` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| Collection Report Details | `app/collection-report/report/[reportId]/page.tsx` | ⚠️ NEEDS REVIEW | Should check location access |
| Collections | `app/collections/page.tsx` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| Collection Reports | `app/collection-reports/page.tsx` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| Sessions | `app/sessions/page.tsx` | ➖ N/A | Developer only, no location filtering |
| Session Events | `app/sessions/[sessionId]/[machineId]/events/page.tsx` | ➖ N/A | Developer only |
| Members | `app/members/page.tsx` | ➖ N/A | Developer only |
| Member Details | `app/members/[id]/page.tsx` | ➖ N/A | Developer only |
| Administration | `app/administration/page.tsx` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| Login | `app/(auth)/login/page.tsx` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| Unauthorized | `app/unauthorized/page.tsx` | ➖ N/A | Static page |

---

## Frontend Components

### Authentication & Authorization Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| ProtectedRoute | `components/auth/ProtectedRoute.tsx` | ⚠️ NEEDS REVIEW | Check if uses location/licensee checks |
| ProfileValidationGate | `components/providers/ProfileValidationGate.tsx` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| ProfileModal | `components/layout/ProfileModal.tsx` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |

### Administration Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| UserModal | `components/administration/UserModal.tsx` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| UserDetailsModal | `components/administration/UserDetailsModal.tsx` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| AddUserModal | `components/administration/AddUserModal.tsx` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| RolesPermissionsModal | `components/administration/RolesPermissionsModal.tsx` | ✅ VERIFIED | Uses assignedLocations |

### Other Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| MetersTab | `components/reports/tabs/MetersTab.tsx` | ✅ VERIFIED | Uses assignedLocations |
| CabinetContentDisplay | `components/cabinets/CabinetContentDisplay.tsx` | ✅ VERIFIED | Uses assignedLicensees |

---

## Frontend Utilities & Hooks

| Utility/Hook | File | Status | Notes |
|--------------|------|--------|-------|
| licenseeAccess | `lib/utils/licenseeAccess.ts` | ✅ VERIFIED | All functions use assignedLicensees |
| useCurrentUserQuery | `lib/hooks/useCurrentUserQuery.ts` | ✅ VERIFIED | Returns assignedLocations/assignedLicensees |
| useUrlProtection | `lib/hooks/useUrlProtection.ts` | ⚠️ NEEDS REVIEW | Check if uses location/licensee checks |
| CurrencyContext | `lib/contexts/CurrencyContext.tsx` | ✅ VERIFIED | Uses assignedLicensees |

---

## Backend API Routes

### User Management Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| GET /api/users | `app/api/users/route.ts` | ✅ VERIFIED | Uses assignedLocations for filtering |
| POST /api/users | `app/api/users/route.ts` | ✅ VERIFIED | Accepts assignedLocations/assignedLicensees |
| GET /api/users/[id] | `app/api/users/[id]/route.ts` | ✅ VERIFIED | Returns assignedLocations/assignedLicensees |
| PATCH /api/users/[id] | `app/api/users/[id]/route.ts` | ✅ VERIFIED | Accepts assignedLocations/assignedLicensees |
| PATCH /api/users/[id]/test-assignments | `app/api/users/[id]/test-assignments/route.ts` | ✅ VERIFIED | Test endpoint, uses new fields |
| GET /api/profile | `app/api/profile/route.ts` | ✅ VERIFIED | Returns assignedLocations/assignedLicensees |
| PUT /api/profile | `app/api/profile/route.ts` | ✅ VERIFIED | Accepts assignedLocations/assignedLicensees |
| GET /api/auth/current-user | `app/api/auth/current-user/route.ts` | ✅ VERIFIED | Returns assignedLocations/assignedLicensees |

### Location Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| GET /api/locations | `app/api/locations/route.ts` | ✅ VERIFIED | Uses assignedLocations for filtering |
| GET /api/locations/search | `app/api/locations/search/route.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| GET /api/locations/search-all | `app/api/locations/search-all/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/locations/[locationId] | `app/api/locations/[locationId]/route.ts` | ⚠️ NEEDS REVIEW | Should check location access |
| GET /api/locationAggregation | `app/api/locationAggregation/route.ts` | ✅ VERIFIED | Uses assignedLocations |

### Machine Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| GET /api/machines | `app/api/machines/route.ts` | ⚠️ NEEDS REVIEW | Should filter by assignedLocations |
| GET /api/machines/[machineId] | `app/api/machines/[machineId]/route.ts` | ⚠️ NEEDS REVIEW | Should check location access |
| GET /api/machines/locations | `app/api/machines/locations/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/machines/status | `app/api/machines/status/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/machines/aggregation | `app/api/machines/aggregation/route.ts` | ✅ VERIFIED | Uses assignedLocations |

### Collection & Report Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| GET /api/collections | `app/api/collections/route.ts` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| GET /api/collectionReport | `app/api/collectionReport/route.ts` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| GET /api/collectionReport/locations | `app/api/collectionReport/locations/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/collection-reports | `app/api/collection-reports/route.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |

### Analytics & Metrics Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| GET /api/analytics/machines | `app/api/analytics/machines/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/analytics/machines/stats | `app/api/analytics/machines/stats/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/metrics/meters | `app/api/metrics/meters/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/reports/meters | `app/api/reports/meters/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/reports/locations | `app/api/reports/locations/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/reports/machines | `app/api/reports/machines/route.ts` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees with getUserLocationFilter |

### Activity & Other Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| GET /api/activity-logs | `app/api/activity-logs/route.ts` | ✅ VERIFIED | Uses assignedLocations |
| GET /api/movement-requests | `app/api/movement-requests/route.ts` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees with getUserLocationFilter |
| GET /api/sessions | `app/api/sessions/route.ts` | ➖ N/A | Developer only |
| GET /api/sessions/[sessionId]/[machineId]/events | `app/api/sessions/[sessionId]/[machineId]/events/route.ts` | ➖ N/A | Developer only |
| GET /api/members | `app/api/members/route.ts` | ➖ N/A | Developer only |
| GET /api/members/summary | `app/api/members/summary/route.ts` | ➖ N/A | Developer-only route, no user location filtering needed |

---

## Backend Helper Functions

### Core Helpers

| Helper | File | Status | Notes |
|--------|------|--------|-------|
| getUserAccessibleLicenseesFromToken | `app/api/lib/helpers/licenseeFilter.ts` | ✅ VERIFIED | Uses assignedLicensees |
| getUserLocationFilter | `app/api/lib/helpers/licenseeFilter.ts` | ✅ VERIFIED | Uses assignedLocations |
| checkUserLocationAccess | `app/api/lib/helpers/licenseeFilter.ts` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| extractUserPermissions | `app/api/lib/helpers/collectionReports.ts` | ✅ VERIFIED | Uses assignedLocations/assignedLicensees |
| createUserHelper | `app/api/lib/helpers/users.ts` | ✅ VERIFIED | Accepts assignedLocations/assignedLicensees |
| updateUserHelper | `app/api/lib/helpers/users.ts` | ✅ VERIFIED | Accepts assignedLocations/assignedLicensees |
| generateAccessToken | `app/api/lib/helpers/auth.ts` | ✅ VERIFIED | Includes assignedLocations/assignedLicensees in JWT |

### Query Helpers

| Helper | File | Status | Notes |
|--------|------|--------|-------|
| collectionReportQueries | `app/api/lib/helpers/collectionReportQueries.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| locationAggregation | `app/api/lib/helpers/locationAggregation.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| analytics | `app/api/lib/helpers/analytics.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| meterTrends | `app/api/lib/helpers/meterTrends.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| topMachines | `app/api/lib/helpers/topMachines.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| locationTrends | `app/api/lib/helpers/locationTrends.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| trends | `app/api/lib/helpers/trends.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| hourlyTrends | `app/api/lib/helpers/hourlyTrends.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| manufacturerPerformance | `app/api/lib/helpers/manufacturerPerformance.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| collectionReportService | `app/api/lib/helpers/collectionReportService.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| metersReport | `app/api/lib/helpers/metersReport.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| top-performing | `app/api/lib/helpers/top-performing.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |
| machineHourly | `app/api/lib/helpers/machineHourly.ts` | ⚠️ NEEDS REVIEW | Check if uses assignedLocations |

---

## Verification Checklist

### Frontend Verification

- [ ] All pages that display location-filtered data use `assignedLocations` from user object
- [ ] All pages that display licensee-filtered data use `assignedLicensees` from user object
- [ ] No frontend code uses `resourcePermissions['gaming-locations'].resources`
- [ ] No frontend code uses `rel.licencee` for user assignments
- [ ] All API calls include `selectedLicencee` parameter when needed
- [ ] All `useEffect` dependencies include `selectedLicencee` when location filtering is used
- [ ] All components check `shouldShowNoLicenseeMessage(user)` before rendering data

### Backend Verification

- [ ] All API routes that filter by location use `assignedLocations` from user payload
- [ ] All API routes that filter by licensee use `assignedLicensees` from user payload
- [ ] No backend code uses `resourcePermissions['gaming-locations'].resources` for filtering
- [ ] No backend code uses `rel.licencee` for user assignments
- [ ] All routes use `getUserLocationFilter()` with `assignedLocations` parameter
- [ ] All routes use `getUserAccessibleLicenseesFromToken()` which reads from `assignedLicensees`
- [ ] JWT token generation includes `assignedLocations` and `assignedLicensees` in payload

### Authorization Checks

- [ ] Location access checks use `checkUserLocationAccess()` which uses `assignedLocations`
- [ ] Licensee access checks use `assignedLicensees` directly
- [ ] Role-based access control works correctly with new fields
- [ ] Developer/Admin roles see all data (no filtering)
- [ ] Manager role sees all locations for assigned licensees
- [ ] Location Admin/Technician/Collector see only intersection of licensee locations and assigned locations

---

## Migration Notes

### Old Fields (Deprecated - Do Not Use)

- ❌ `resourcePermissions['gaming-locations'].resources` - Use `assignedLocations` instead
- ❌ `rel.licencee` - Use `assignedLicensees` instead

### New Fields (Use These)

- ✅ `assignedLocations: string[]` - Array of location IDs user has access to
- ✅ `assignedLicensees: string[]` - Array of licensee IDs user is assigned to

### Backward Compatibility

- Old fields are still in the database schema but should NOT be used for reading
- Old fields are updated when new fields are updated (for transition period)
- Old fields will be removed in a future migration

---

## Testing Checklist

- [ ] Test user with only `assignedLocations` (no old fields)
- [ ] Test user with only `assignedLicensees` (no old fields)
- [ ] Test user with both new and old fields (transition period)
- [ ] Test Developer role (should see all data)
- [ ] Test Admin role (should see all data)
- [ ] Test Manager role (should see all locations for assigned licensees)
- [ ] Test Location Admin role (should see only assigned locations)
- [ ] Test Technician role (should see only assigned locations)
- [ ] Test Collector role (should see only assigned locations)
- [ ] Test user with no assignments (should show "No Licensee Assigned" message)
- [ ] Test location filtering on all pages
- [ ] Test licensee filtering on all pages
- [ ] Test API routes return correct filtered data
- [ ] Test JWT token includes new fields
- [ ] Test session invalidation when assignments change

---

## Last Updated

- **Date**: 2025-01-26
- **Status**: Fixed critical API routes to use new fields
- **Changes Made**:
  - ✅ Fixed `app/api/collectionReport/route.ts` to use `assignedLocations`/`assignedLicensees`
  - ✅ Fixed `app/api/reports/machines/route.ts` to filter by user location permissions
  - ✅ Fixed `app/api/movement-requests/route.ts` to filter by user location permissions
- **Next Review**: Verify frontend pages and remaining helper functions

---

## Notes

- This document should be updated as pages/routes are verified
- Mark items as ✅ VERIFIED only after thorough testing
- Remove old field references completely before marking as verified
- Update status when fixes are applied

