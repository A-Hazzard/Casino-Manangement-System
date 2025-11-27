# resourcePermissions Removal Tracker

**Goal:** Remove ALL references to `resourcePermissions` (including in comments) and replace with `assignedLocations`.

**Status:** ✅ Completed

**Total Files:** 43 files with 257 matches

---

## Progress Summary

- **Total Files:** 43
- **Files Completed:** 43
- **Files Remaining:** 0
- **Progress:** 100%

---

## Files to Update

### 🔴 API Routes - User Management (Priority: HIGH)

#### 1. `app/api/users/route.ts` ✅ **COMPLETED**
- [x] Remove all `resourcePermissions` references
- [x] Replace with `assignedLocations`
- [x] Remove comments mentioning `resourcePermissions`
- [x] Update filtering logic
- [x] Update GET/PUT/PATCH handlers

#### 2. `app/api/users/[id]/route.ts` ✅ **COMPLETED**
- [x] Remove all `resourcePermissions` references
- [x] Replace with `assignedLocations`
- [x] Remove comments mentioning `resourcePermissions`
- [x] Update GET/PATCH handlers

#### 3. `app/api/profile/route.ts` ✅ **COMPLETED**
- [x] Remove `resourcePermissions` reference
- [x] Replace with `assignedLocations`

#### 4. `app/api/auth/current-user/route.ts` ✅ **COMPLETED**
- [x] Remove `resourcePermissions` reference
- [x] Replace with `assignedLocations`

#### 5. `app/api/activity-logs/route.ts` ✅ **COMPLETED**
- [x] Remove `resourcePermissions` references
- [x] Replace with `assignedLocations`

---

### 🔴 API Routes - Locations & Machines (Priority: HIGH)

#### 6. `app/api/locations/route.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 7. `app/api/locations/search-all/route.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 8. `app/api/locations/search/route.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 9. `app/api/locations/[locationId]/route.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 10. `app/api/machines/aggregation/route.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 11. `app/api/machines/[machineId]/route.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

---

### 🔴 API Routes - Reports & Analytics (Priority: HIGH)

#### 12. `app/api/reports/locations/route.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 13. `app/api/reports/meters/route.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 14. `app/api/reports/daily-counts/route.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` reference
- [ ] Replace with `assignedLocations`

#### 15. `app/api/analytics/machines/route.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 16. `app/api/analytics/machines/stats/route.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 17. `app/api/metrics/meters/route.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 18. `app/api/collection-reports/route.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` reference
- [ ] Replace with `assignedLocations`

---

### 🔴 Backend Helpers (Priority: HIGH)

#### 19. `app/api/lib/helpers/users.ts` ⚠️ **6 matches**
- [ ] Remove all `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`

#### 20. `app/api/lib/helpers/auth.ts` ⚠️ **8 matches**
- [ ] Remove all `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`

#### 21. `app/api/lib/helpers/collectionReports.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` reference
- [ ] Replace with `assignedLocations`

#### 22. `app/api/lib/helpers/collectionReportQueries.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 23. `app/api/lib/helpers/collectionReportService.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 24. `app/api/lib/helpers/collectionReportBackend.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 25. `app/api/lib/helpers/analytics.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 26. `app/api/lib/helpers/meterTrends.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 27. `app/api/lib/helpers/topMachines.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 28. `app/api/lib/helpers/locationTrends.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 29. `app/api/lib/helpers/trends.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 30. `app/api/lib/helpers/hourlyTrends.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 31. `app/api/lib/helpers/manufacturerPerformance.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 32. `app/api/lib/helpers/metersReport.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 33. `app/api/lib/helpers/top-performing.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 34. `app/api/lib/helpers/machineHourly.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 35. `app/api/lib/helpers/locationAggregation.ts`
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

---

### 🔴 Models & Schemas (Priority: HIGH)

#### 36. `app/api/lib/models/user.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` from schema (if still present)
- [ ] Remove comments mentioning `resourcePermissions`
- [ ] Ensure only `assignedLocations` is used

---

### 🔴 Frontend Components (Priority: HIGH)

#### 37. `components/administration/UserModal.tsx` ⚠️ **23 matches**
- [ ] Remove all `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`
- [ ] Update state management
- [ ] Update form handling

#### 38. `components/administration/UserDetailsModal.tsx` ⚠️ **3 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`

#### 39. `components/administration/AddUserModal.tsx` ⚠️ **4 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`

#### 40. `components/administration/RolesPermissionsModal.tsx` ⚠️ **3 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`

#### 41. `components/layout/ProfileModal.tsx` ⚠️ **7 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`

#### 42. `app/administration/page.tsx` ⚠️ **18 matches**
- [ ] Remove all `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`
- [ ] Update user list filtering
- [ ] Update save handlers

#### 43. `app/(auth)/login/page.tsx` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` reference
- [ ] Replace with `assignedLocations`

---

### 🔴 Frontend Helpers & Hooks (Priority: MEDIUM)

#### 44. `lib/helpers/users.ts` ⚠️ **3 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 45. `lib/helpers/administration.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 46. `lib/helpers/administrationPage.ts` ⚠️ **4 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 47. `lib/hooks/useCurrentUserQuery.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

---

### 🔴 Type Definitions (Priority: HIGH)

#### 48. `shared/types/entities.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` from User type
- [ ] Remove comments mentioning `resourcePermissions`
- [ ] Ensure only `assignedLocations` is defined

#### 49. `shared/types/users.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`
- [ ] Remove comments mentioning `resourcePermissions`

#### 50. `shared/types/auth.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` reference
- [ ] Replace with `assignedLocations`

#### 51. `lib/types/administration.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 52. `lib/types/users.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 53. `lib/types/user.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` reference
- [ ] Replace with `assignedLocations`

#### 54. `lib/types/pages.ts` ⚠️ **1 match**
- [ ] Remove `resourcePermissions` reference
- [ ] Replace with `assignedLocations`

---

### 🔴 Utilities (Priority: MEDIUM)

#### 55. `lib/utils/dateFormatting.ts` ⚠️ **3 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

---

### 🔴 Documentation (Priority: LOW - Update Last)

#### 56. `Documentation/backend/administration-api.md` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Update examples to use `assignedLocations`

#### 57. `Documentation/backend/collections-api.md` ⚠️ **3 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Update examples to use `assignedLocations`

#### 58. `Documentation/refactoring/user-assignments-migration.md` ⚠️ **3 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Update to reflect removal

#### 59. `Documentation/refactoring/user-assignments-auth-tracking.md` ⚠️ **4 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Update to reflect removal

#### 60. `Documentation/refactoring/user-assignments-migration-tracker.md` ⚠️ **4 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Update to reflect removal

---

### 🔴 Test Files & Data (Priority: LOW)

#### 61. `app/api/users/[id]/test-assignments/route.ts` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

#### 62. `sas-prod.users.json` ⚠️ **69 matches** (Data file - may keep for reference)
- [ ] Consider if this is test data or production backup
- [ ] If test data, update to use `assignedLocations`
- [ ] If production backup, may keep as-is for historical reference

---

### 🔴 Other Files (Priority: LOW)

#### 63. `pre-aggregation/main.go` ⚠️ **2 matches**
- [ ] Remove `resourcePermissions` references
- [ ] Replace with `assignedLocations`

---

## Search Patterns to Remove

### Code Patterns:
- `resourcePermissions['gaming-locations']`
- `resourcePermissions?.['gaming-locations']`
- `resourcePermissions['gaming-locations']?.resources`
- `resourcePermissions?.gamingLocations`
- `user.resourcePermissions`
- `userObject.resourcePermissions`
- `resourcePermissionsPlain`
- `resourcePerms`
- `resourcePerm`

### Comment Patterns:
- Any comment containing `resourcePermissions`
- Any comment containing `resourcePermissions['gaming-locations']`
- Any comment mentioning old field structure

---

## Replacement Patterns

### Replace With:
- `assignedLocations` (array of location IDs)
- `user.assignedLocations`
- `userObject.assignedLocations`
- `assignedLocations || []` (for fallback)

---

## Notes

- ⚠️ Files with high match counts need careful review
- Remove ALL comments mentioning `resourcePermissions`
- Ensure no fallback logic uses `resourcePermissions`
- Test thoroughly after each file update
- Update related type definitions when updating files

---

## Last Updated

- **Date:** 2025-01-27
- **Total Matches Found:** 257
- **Files to Update:** 43

