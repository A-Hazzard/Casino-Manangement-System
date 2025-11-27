# User Assignments Migration Documentation

This document tracks the migration from the old nested structure to the new simple array fields.

## Migration Overview

**Old Structure (DEPRECATED - NO LONGER USED):**

- `resourcePermissions['gaming-locations'].resources` → Array of location IDs
- `rel.licencee` → Array of licensee IDs

**New Structure (CURRENT - USE THESE):**

- `assignedLocations` → Array of location IDs (string[])
- `assignedLicensees` → Array of licensee IDs (string[])

**Migration Status:**

- ✅ Migration complete - All code now uses ONLY `assignedLocations` and `assignedLicensees`
- ❌ Old fields (`resourcePermissions`, `rel.licencee`) are NO LONGER used or referenced
- ⚠️ Do NOT use old fields as fallback - use only new fields

---

## Files to Update

### Schema/Models

1. **app/api/lib/models/user.ts**
   - ✅ Added `assignedLocations` and `assignedLicensees` fields
   - Keep old fields for backward compatibility

### Type Definitions

2. **shared/types/entities.ts**
   - Add `assignedLocations?: string[]` and `assignedLicensees?: string[]` to `User` type
   - Keep old fields for backward compatibility

3. **lib/types/administration.ts**
   - Add `assignedLocations?: string[]` and `assignedLicensees?: string[]` to `User` type
   - Keep old fields for backward compatibility

4. **lib/types/mongo.ts**
   - Update if `User` type is defined here

5. **lib/types/location.ts**
   - Update if `User` type is defined here

### Core Helper Functions

6. **app/api/lib/helpers/licenseeFilter.ts**
   - `getUserAccessibleLicenseesFromToken()`: Read from `assignedLicensees` with fallback to `rel.licencee`
   - `getUserLocationFilter()`: Accept `assignedLocations` parameter instead of extracting from `resourcePermissions`
   - Update all callers to pass `assignedLocations` from user payload

7. **app/api/lib/helpers/collectionReports.ts**
   - `extractUserPermissions()`: Extract from `assignedLicensees` and `assignedLocations` with fallback to old fields
   - Return simplified structure

8. **app/api/lib/helpers/collectionReportQueries.ts**
   - Update to use new fields with fallback

### User Management API Routes

9. **app/api/users/route.ts**
   - Update GET handler to return `assignedLocations` and `assignedLicensees`
   - Update filtering logic to use new fields with fallback
   - Update PUT/PATCH handlers to accept and save new fields
   - Maintain backward compatibility by also updating old fields during transition

10. **app/api/users/[id]/route.ts**
    - Update GET handler to return `assignedLocations` and `assignedLicensees`
    - Update PATCH handler to accept and save new fields
    - Maintain backward compatibility

11. **app/api/profile/route.ts**
    - Update PUT handler to accept and save new fields
    - Update location/licensee update logic to use new fields
    - Maintain backward compatibility

### Location Access API Routes

12. **app/api/locations/route.ts**
    - Update to read from `assignedLocations` with fallback
    - Pass `assignedLocations` to `getUserLocationFilter()`

13. **app/api/locations/search-all/route.ts**
    - Update to read from `assignedLocations` with fallback
    - Pass `assignedLocations` to `getUserLocationFilter()`

14. **app/api/locations/search/route.ts**
    - Update to read from `assignedLocations` with fallback

15. **app/api/locationAggregation/route.ts**
    - Update to read from `assignedLocations` with fallback
    - Pass `assignedLocations` to `getUserLocationFilter()`

### Machine and Analytics API Routes

16. **app/api/machines/status/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

17. **app/api/machines/aggregation/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

18. **app/api/machines/locations/route.ts**
    - Update to use `assignedLocations` with fallback

19. **app/api/machines/[machineId]/route.ts**
    - Update if it accesses user assignments

20. **app/api/analytics/machines/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

21. **app/api/analytics/machines/stats/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

### Reports API Routes

22. **app/api/reports/locations/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

23. **app/api/reports/meters/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

24. **app/api/metrics/meters/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

25. **app/api/metrics/top-performers/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

### Collections API Routes

26. **app/api/collections/route.ts**
    - Update to use `assignedLocations` with fallback

27. **app/api/collection-reports/route.ts**
    - Update to use `assignedLocations` and `assignedLicensees` with fallback

28. **app/api/collectionReport/locations/route.ts**
    - Update to use `assignedLocations` with fallback

### Other API Routes

29. **app/api/activity-logs/route.ts**
    - Update to use `assignedLocations` with fallback

30. **app/api/sessions/route.ts**
    - Update if it accesses user assignments

31. **app/api/sessions/[sessionId]/[machineId]/events/route.ts**
    - Update if it accesses user assignments

32. **app/api/members/summary/route.ts**
    - Update if it accesses user assignments

33. **app/api/movement-requests/route.ts**
    - Update if it accesses user assignments

34. **app/api/gaming-locations/route.ts**
    - Update if it accesses user assignments

35. **app/api/licensees/route.ts**
    - Update if it accesses user assignments

### Helper Files

36. **app/api/lib/helpers/analytics.ts**
    - Update to use new fields with fallback

37. **app/api/lib/helpers/meterTrends.ts**
    - Update to use new fields with fallback

38. **app/api/lib/helpers/topMachines.ts**
    - Update to use new fields with fallback

39. **app/api/lib/helpers/locationTrends.ts**
    - Update to use new fields with fallback

40. **app/api/lib/helpers/trends.ts**
    - Update to use new fields with fallback

41. **app/api/lib/helpers/hourlyTrends.ts**
    - Update to use new fields with fallback

42. **app/api/lib/helpers/manufacturerPerformance.ts**
    - Update to use new fields with fallback

43. **app/api/lib/helpers/collectionReportService.ts**
    - Update to use new fields with fallback

44. **app/api/lib/helpers/metersReport.ts**
    - Update to use new fields with fallback

45. **app/api/lib/helpers/top-performing.ts**
    - Update to use new fields with fallback

46. **app/api/lib/helpers/machineHourly.ts**
    - Update to use new fields with fallback

47. **app/api/lib/helpers/locationAggregation.ts**
    - Update to use new fields with fallback

48. **app/api/lib/helpers/users.ts**
    - Update `getUserById()` and other user helper functions to return new fields
    - Update `updateUser()` to handle new fields

### Frontend Components - User Management

49. **components/administration/UserModal.tsx**
    - Update to read/write `assignedLocations` and `assignedLicensees`
    - Remove complex nested access patterns
    - Simplify state management

50. **components/administration/UserDetailsModal.tsx**
    - Update to read/write `assignedLocations` and `assignedLicensees`
    - Remove complex nested access patterns

51. **components/administration/AddUserModal.tsx**
    - Update to write `assignedLocations` and `assignedLicensees`

52. **components/administration/RolesPermissionsModal.tsx**
    - Update to read `assignedLocations` with fallback

53. **app/administration/page.tsx**
    - Update `handleSaveUser` to handle new fields
    - Update user list filtering to use new fields

### Frontend Components - Profile and Access

54. **components/layout/ProfileModal.tsx**
    - Update to use new fields with fallback

55. **components/providers/ProfileValidationGate.tsx**
    - Update to use new fields with fallback

56. **app/(auth)/login/page.tsx**
    - Update to use new fields with fallback

57. **components/cabinets/CabinetContentDisplay.tsx**
    - Update to use new fields with fallback

### Frontend Components - Reports

58. **components/reports/tabs/MetersTab.tsx**
    - Update to use new fields with fallback

### Frontend Helpers

59. **lib/helpers/collectionReport.ts**
    - Update to use new fields

60. **lib/helpers/locationAggregation.ts**
    - Update to use new fields

61. **lib/helpers/analytics.ts**
    - Update to use new fields

62. **lib/helpers/collectionReportBackend.ts**
    - Update to use new fields

63. **lib/helpers/administrationPage.ts**
    - Update to use new fields

### Utility Functions

64. **lib/utils/licenseeAccess.ts**
    - Update `getUserAccessibleLicensees()` to use new fields with fallback

65. **lib/utils/permissionsDb.ts**
    - Update to use new fields with fallback

66. **lib/utils/permissions.ts**
    - Update if it accesses user assignments

67. **lib/hooks/useCurrentUserQuery.ts**
    - Update to use new fields with fallback

### Documentation Files

68. **.cursor/licensee-access-context.md**
    - Update schema documentation to show new fields
    - Update code examples

69. **Documentation/frontend/locations.md**
    - Update references to use new field names

70. **Documentation/frontend/collection-report.md**
    - Update references to use new field names

71. **Documentation/backend/collections-api.md**
    - Update references to use new field names

72. **Documentation/backend/members-api.md**
    - Update references to use new field names

73. **Documentation/user-safety-safeguards.md**
    - Update references to use new field names

74. **Documentation/backend/BACKEND_GUIDELINES.md**
    - Update code examples to use new field names

---

## Migration Checklist

- [x] Phase 1: Create migration script
- [x] Phase 2: Update user schema
- [x] Phase 3: Create documentation file
- [ ] Phase 4: Update core helper functions
- [ ] Phase 5: Update API routes
- [ ] Phase 6: Update frontend components
- [ ] Phase 7: Update type definitions
- [ ] Phase 8: Update helper functions
- [ ] Phase 9: Remove old logic (keep fallback)
- [ ] Phase 10: Update documentation

---

## Testing Checklist

Test with users that have:

- [ ] Only old fields (should use fallback)
- [ ] Only new fields (should use new fields)
- [ ] Both old and new fields (should use new fields)
- [ ] Neither (empty arrays)

Test scenarios:

- [ ] User login and JWT token generation
- [ ] User profile updates
- [ ] Admin user management (create, edit, delete)
- [ ] Location filtering in all API routes
- [ ] Licensee filtering in all API routes
- [ ] Role-based access control
- [ ] Session invalidation on permission changes
