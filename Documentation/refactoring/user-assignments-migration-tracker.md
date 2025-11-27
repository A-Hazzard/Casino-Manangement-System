# User Assignments Migration Tracker

**Last Updated:** December 19, 2024  
**Status:** In Progress

This document tracks the migration from the old nested structure (`resourcePermissions['gaming-locations'].resources` and `rel.licencee`) to the new simple array fields (`assignedLocations` and `assignedLicensees`).

## Legend

- ✅ **DONE** - File updated to use new fields with fallback logic
- 🔄 **IN PROGRESS** - Currently being updated
- ❌ **NOT STARTED** - File not yet updated
- ⚠️ **NEEDS REVIEW** - May need updates but requires verification
- 📝 **PARTIAL** - Some functions updated, others still need work

## Migration Strategy

1. **Read Logic**: Always check `assignedLocations`/`assignedLicensees` first, fallback to old fields if new fields are missing/empty
2. **Write Logic**: During transition, write to both old and new fields when updating users
3. **Backward Compatibility**: Old fields kept in schema/types for transition period
4. **Migration Script**: `scripts/migrate-user-assignments.js` - Always overwrites new fields (idempotent)

---

## Phase 1: Migration Script ✅

| File | Status | Notes |
|------|--------|-------|
| `scripts/migrate-user-assignments.js` | ✅ | Migration script created and tested |

---

## Phase 2: Schema & Models ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/lib/models/user.ts` | ✅ | Added `assignedLocations` and `assignedLicensees` fields |

---

## Phase 3: Type Definitions ✅

| File | Status | Notes |
|------|--------|-------|
| `shared/types/entities.ts` | ✅ | Added `assignedLocations?: string[]` and `assignedLicensees?: string[]` |
| `lib/types/administration.ts` | ✅ | Added `assignedLocations?: string[]` and `assignedLicensees?: string[]` |
| `lib/types/mongo.ts` | ⚠️ | Needs review - check if User type is defined here |
| `lib/types/location.ts` | ⚠️ | Needs review - check if User type is defined here |

---

## Phase 4: Core Helper Functions ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/lib/helpers/licenseeFilter.ts` | ✅ | Updated `getUserAccessibleLicenseesFromToken()` and `getUserLocationFilter()` |
| `app/api/lib/helpers/collectionReports.ts` | ✅ | Updated `extractUserPermissions()` |
| `app/api/lib/helpers/collectionReportQueries.ts` | ✅ | Updated to use new fields with fallback |

---

## Phase 5: API Routes

### User Management Routes ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/users/route.ts` | ✅ | GET and POST handlers updated |
| `app/api/users/[id]/route.ts` | ✅ | GET and PATCH handlers updated |
| `app/api/profile/route.ts` | ✅ | PUT handler updated |
| `app/api/auth/current-user/route.ts` | ✅ | Updated to return new fields in response |

### Location Access Routes ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/locations/route.ts` | ✅ | Updated to use new fields |
| `app/api/locations/search-all/route.ts` | ✅ | Updated to use new fields |
| `app/api/locations/search/route.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/locationAggregation/route.ts` | ✅ | Updated to use new fields |

### Machine & Analytics Routes ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/machines/status/route.ts` | ✅ | Updated to use new fields |
| `app/api/machines/aggregation/route.ts` | ✅ | Updated to use new fields |
| `app/api/machines/locations/route.ts` | ✅ | Updated to use new fields |
| `app/api/machines/[machineId]/route.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/analytics/machines/route.ts` | ✅ | Updated to use new fields |
| `app/api/analytics/machines/stats/route.ts` | ✅ | Updated to use new fields |

### Reports Routes ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/reports/locations/route.ts` | ✅ | Updated to use new fields |
| `app/api/reports/meters/route.ts` | ✅ | Updated to use new fields |
| `app/api/metrics/meters/route.ts` | ✅ | Updated to use new fields |
| `app/api/metrics/top-performers/route.ts` | ⚠️ | Needs review - may not access user assignments |

### Collections Routes ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/collections/route.ts` | ✅ | Updated to use new fields |
| `app/api/collection-reports/route.ts` | ✅ | Updated to use new fields |
| `app/api/collectionReport/locations/route.ts` | ✅ | Updated to use new fields |

### Other API Routes

| File | Status | Notes |
|------|--------|-------|
| `app/api/activity-logs/route.ts` | ✅ | Updated to use new fields |
| `app/api/sessions/route.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/sessions/[sessionId]/[machineId]/events/route.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/members/summary/route.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/movement-requests/route.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/gaming-locations/route.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/licensees/route.ts` | ⚠️ | Needs review - may not access user assignments |

---

## Phase 6: Helper Files

| File | Status | Notes |
|------|--------|-------|
| `app/api/lib/helpers/analytics.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/meterTrends.ts` | ✅ | Updated to use new fields |
| `app/api/lib/helpers/topMachines.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/locationTrends.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/trends.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/hourlyTrends.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/manufacturerPerformance.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/collectionReportService.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/metersReport.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/top-performing.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/machineHourly.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/locationAggregation.ts` | ⚠️ | Needs review - may not access user assignments |
| `app/api/lib/helpers/users.ts` | ✅ | Updated `createUser()` and other functions |

---

## Phase 7: Frontend Components

### User Management Components ✅

| File | Status | Notes |
|------|--------|-------|
| `components/administration/UserModal.tsx` | ✅ | Updated to read/write new fields |
| `components/administration/UserDetailsModal.tsx` | ✅ | Updated to read/write new fields |
| `components/administration/AddUserModal.tsx` | ✅ | Updated to write new fields |
| `components/administration/RolesPermissionsModal.tsx` | ✅ | Updated to read new fields |
| `app/administration/page.tsx` | ✅ | Updated `handleSaveUser` to handle new fields |

### Profile & Access Components ✅

| File | Status | Notes |
|------|--------|-------|
| `components/layout/ProfileModal.tsx` | ✅ | Updated to use new fields with fallback |
| `components/providers/ProfileValidationGate.tsx` | ✅ | Updated to use new fields with fallback |
| `app/(auth)/login/page.tsx` | ✅ | Updated to use new fields with fallback |
| `components/cabinets/CabinetContentDisplay.tsx` | ✅ | Updated to use new fields with fallback |

### Reports Components ✅

| File | Status | Notes |
|------|--------|-------|
| `components/reports/tabs/MetersTab.tsx` | ✅ | Updated to use new fields |

---

## Phase 8: Frontend Helpers

| File | Status | Notes |
|------|--------|-------|
| `lib/helpers/collectionReport.ts` | ⚠️ | Needs review - may not access user assignments |
| `lib/helpers/locationAggregation.ts` | ⚠️ | Needs review - may not access user assignments |
| `lib/helpers/analytics.ts` | ⚠️ | Needs review - may not access user assignments |
| `lib/helpers/collectionReportBackend.ts` | ⚠️ | Needs review - may not access user assignments |
| `lib/helpers/administrationPage.ts` | ⚠️ | Needs review - may not access user assignments |

---

## Phase 9: Utility Functions ✅

| File | Status | Notes |
|------|--------|-------|
| `lib/utils/licenseeAccess.ts` | ✅ | All functions updated to use new fields with fallback |
| `lib/utils/permissionsDb.ts` | ✅ | No update needed - only checks roles, not assignments |
| `lib/utils/permissions.ts` | ✅ | No update needed - only checks roles, not assignments |
| `lib/hooks/useCurrentUserQuery.ts` | ✅ | Updated to include new fields in type and user payload |

---

## Auth & Token Generation ✅

| File | Status | Notes |
|------|--------|-------|
| `app/api/lib/helpers/auth.ts` | ✅ | Updated to include new fields in JWT token payload |
| `shared/types/auth.ts` | ✅ | Updated `UserAuthPayload` type to include new fields |

---

## Phase 10: Documentation

| File | Status | Notes |
|------|--------|-------|
| `.cursor/licensee-access-context.md` | ✅ | Updated schema and code examples to include new fields |
| `Documentation/frontend/locations.md` | ❌ | Needs update - field references |
| `Documentation/frontend/collection-report.md` | ❌ | Needs update - field references |
| `Documentation/backend/collections-api.md` | ❌ | Needs update - field references |
| `Documentation/backend/members-api.md` | ❌ | Needs update - field references |
| `Documentation/user-safety-safeguards.md` | ❌ | Needs update - field references |
| `Documentation/backend/BACKEND_GUIDELINES.md` | ❌ | Needs update - code examples |

---

## Summary Statistics

- **Total Files to Update**: ~80+ files
- **Completed**: ~41 files (including critical documentation)
- **In Progress**: 0 files
- **Needs Review**: ~25 files (mostly helper files that query location licensee fields, not user assignments - no updates needed)
- **Not Started**: ~14 files (remaining documentation files - lower priority)

### Progress by Phase

- ✅ **Phase 1: Migration Script** - 1/1 (100%)
- ✅ **Phase 2: Schema & Models** - 1/1 (100%)
- ✅ **Phase 3: Type Definitions** - 2/4 (50%) - 2 need review
- ✅ **Phase 4: Core Helper Functions** - 3/3 (100%)
- ✅ **Phase 5: API Routes** - 20/30 (67%) - 10 need review
- ⚠️ **Phase 6: Helper Files** - 2/13 (15%) - 11 need review
- ✅ **Phase 7: Frontend Components** - 10/10 (100%)
- ⚠️ **Phase 8: Frontend Helpers** - 0/5 (0%) - All need review
- ✅ **Phase 9: Utility Functions** - 4/4 (100%)
- ✅ **Auth & Token Generation** - 2/2 (100%)
- ❌ **Phase 10: Documentation** - 0/7 (0%)

---

## Implementation Notes

### Read Pattern (Fallback Logic)

```typescript
// Always check new fields first, then fallback to old fields
const assignedLocations = user.assignedLocations?.length 
  ? user.assignedLocations 
  : (user.resourcePermissions?.['gaming-locations']?.resources || []);

const assignedLicensees = user.assignedLicensees?.length 
  ? user.assignedLicensees 
  : (Array.isArray(user.rel?.licencee) ? user.rel.licencee : user.rel?.licencee ? [user.rel.licencee] : []);
```

### Write Pattern (Dual Write)

```typescript
// During transition, write to both old and new fields
const updateData = {
  assignedLocations: newLocationIds,
  assignedLicensees: newLicenseeIds,
  // Also update old fields for backward compatibility
  'rel.licencee': newLicenseeIds,
  'resourcePermissions.gaming-locations.resources': newLocationIds,
};
```

---

## Next Steps

1. ✅ **Run Migration Script** - Execute `scripts/migrate-user-assignments.js` to populate new fields
2. ⏳ **Review Files Marked for Review** - Verify if they actually need updates
3. ⏳ **Update Remaining Helper Files** - Complete Phase 6
4. ⏳ **Update Frontend Helpers** - Complete Phase 8
5. ⏳ **Update Utility Functions** - Complete Phase 9
6. ⏳ **Update Documentation** - Complete Phase 10
7. ⏳ **Testing** - Test with users having:
   - Only old fields (fallback should work)
   - Only new fields (new fields should work)
   - Both old and new fields (new fields should take priority)
   - Neither (empty arrays)

---

## Testing Checklist

### User Scenarios

- [ ] User with only old fields (`rel.licencee`, `resourcePermissions`) - fallback should work
- [ ] User with only new fields (`assignedLicensees`, `assignedLocations`) - new fields should work
- [ ] User with both old and new fields - new fields should take priority
- [ ] User with neither (empty arrays) - should handle gracefully

### Functional Tests

- [ ] User login and JWT token generation
- [ ] User profile updates (assignments)
- [ ] Admin user management (create, edit, delete)
- [ ] Location filtering in all API routes
- [ ] Licensee filtering in all API routes
- [ ] Role-based access control
- [ ] Session invalidation on permission changes
- [ ] Licensee dropdown visibility
- [ ] Location assignment in modals
- [ ] Profile modal location/licensee updates

---

## Files Requiring Review

These files are marked as "Needs Review" because they may or may not access user assignment fields. They should be checked to determine if updates are needed:

### API Routes
- `app/api/locations/search/route.ts`
- `app/api/machines/[machineId]/route.ts`
- `app/api/metrics/top-performers/route.ts`
- `app/api/sessions/route.ts`
- `app/api/sessions/[sessionId]/[machineId]/events/route.ts`
- `app/api/members/summary/route.ts`
- `app/api/movement-requests/route.ts`
- `app/api/gaming-locations/route.ts`
- `app/api/licensees/route.ts`

### Helper Files
- `app/api/lib/helpers/analytics.ts`
- `app/api/lib/helpers/topMachines.ts`
- `app/api/lib/helpers/locationTrends.ts`
- `app/api/lib/helpers/trends.ts`
- `app/api/lib/helpers/hourlyTrends.ts`
- `app/api/lib/helpers/manufacturerPerformance.ts`
- `app/api/lib/helpers/collectionReportService.ts`
- `app/api/lib/helpers/metersReport.ts`
- `app/api/lib/helpers/top-performing.ts`
- `app/api/lib/helpers/machineHourly.ts`
- `app/api/lib/helpers/locationAggregation.ts`

### Frontend Helpers
- `lib/helpers/collectionReport.ts`
- `lib/helpers/locationAggregation.ts`
- `lib/helpers/analytics.ts`
- `lib/helpers/collectionReportBackend.ts`
- `lib/helpers/administrationPage.ts`

### Utility Functions
- `lib/utils/permissionsDb.ts`
- `lib/utils/permissions.ts`
- `lib/hooks/useCurrentUserQuery.ts`

### Type Definitions
- `lib/types/mongo.ts`
- `lib/types/location.ts`

---

## Reference Examples

### Updated Helper Function

See `app/api/lib/helpers/licenseeFilter.ts` for examples of:
- Reading from new fields with fallback
- Handling both array and single value formats
- Maintaining backward compatibility

### Updated API Route

See `app/api/users/route.ts` for examples of:
- Reading new fields in GET handler
- Writing to both old and new fields in POST/PATCH handlers
- Filtering logic using new fields with fallback

### Updated Frontend Component

See `components/administration/UserModal.tsx` for examples of:
- Reading new fields for display
- Writing new fields on save
- Maintaining state with new field structure

---

## Notes

- Migration script is idempotent - safe to re-run
- Old fields are kept in schema/types for backward compatibility
- All updates use fallback logic to ensure smooth transition
- Write operations update both old and new fields during transition
- After migration is complete and tested, old fields can be removed (separate task)

