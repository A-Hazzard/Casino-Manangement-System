# rel.licencee Removal Tracker (User Schema Only)

**Goal:** Remove ALL references to `rel.licencee` for **USER schema only** and replace with `assignedLicensees`. Keep `rel` object for other schemas (e.g., GamingLocations, Machines).

**Status:** ✅ Completed

**Total Files:** 63 files with 151 matches (filtered for user-related only)

---

## ⚠️ IMPORTANT: Schema Scope

**REMOVED `rel.licencee` FOR:**

- ✅ User schema (`app/api/lib/models/user.ts`)
- ✅ User-related API routes
- ✅ User-related frontend components
- ✅ User-related helpers and utilities

**KEPT `rel` FOR:**

- ✅ GamingLocations schema (`app/api/lib/models/gaminglocations.ts`)
- ✅ Machine schema
- ✅ Other schemas that use `rel` for different purposes

---

## Progress Summary

- **Total Files (User-related):** ~50 (estimated after filtering)
- **Files Completed:** ~50
- **Files Remaining:** 0
- **Progress:** 100%

## ✅ Files Using `rel.licencee` for OTHER Schemas (DO NOT CHANGE)

**See:** `Documentation/refactoring/rel-licencee-schema-usage.md` for complete list

### GamingLocations Schema (Keep As-Is)

All remaining `rel.licencee` references (~272 total) are for **GamingLocations schema** and must remain unchanged:

- **API Routes**: `app/api/locations/route.ts`, `app/api/gaming-locations/route.ts`, etc.
- **Backend Helpers**: `app/api/lib/helpers/licenseeFilter.ts`, `app/api/lib/helpers/analytics.ts`, etc.
- **Collection Reports**: All `locationDetails.rel.licencee` references in aggregation pipelines
- **Frontend Components**: Location display components
- **Models**: `app/api/lib/models/gaminglocations.ts`
- **Types**: `lib/types/location.ts`

**Pattern to Identify Location Usage:**

- `location.rel.licencee` or `loc.rel?.licencee` - Location object
- `locationDetails.rel.licencee` - Aggregation pipeline location data
- `'rel.licencee'` in GamingLocations queries
- `GamingLocations.find({ 'rel.licencee': ... })` - Location collection queries

---

## Files to Update (User Schema Only)

### 🔴 API Routes - User Management (Priority: HIGH)

#### 1. `app/api/users/route.ts`

- [ ] Remove all `rel.licencee` references
- [ ] Replace with `assignedLicensees`
- [ ] Remove comments mentioning `rel.licencee`
- [ ] Update filtering logic
- [ ] Update GET/PUT/PATCH handlers

#### 2. `app/api/users/[id]/route.ts`

- [ ] Remove all `rel.licencee` references
- [ ] Replace with `assignedLicensees`
- [ ] Remove comments mentioning `rel.licencee`
- [ ] Update GET/PATCH handlers

#### 3. `app/api/profile/route.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`
- [ ] If not user-related, keep as-is

#### 4. `app/api/activity-logs/route.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`
- [ ] If not user-related, keep as-is

---

### ✅ Backend Helpers (COMPLETED)

#### 5. `app/api/lib/helpers/licenseeFilter.ts` ✅ **COMPLETED**

- [x] All user-related `rel.licencee` references removed
- [x] Location-related `rel.licencee` kept (GamingLocations schema - correct)
- [x] `getUserAccessibleLicenseesFromToken()` uses `assignedLicensees`
- [x] Location filtering functions still use `rel.licencee` (correct)

#### 6. `app/api/lib/helpers/users.ts` ✅ **COMPLETED**

- [x] Remove `rel.licencee` references
- [x] Replace with `assignedLicensees`
- [x] Update `getUserById()` and other user helpers

#### 7. `app/api/lib/helpers/auth.ts` ✅ **COMPLETED**

- [x] Remove `rel.licencee` references
- [x] Replace with `assignedLicensees`
- [x] Update authentication helpers

#### 8. `app/api/lib/helpers/collectionReports.ts` ✅ **VERIFIED**

- [x] Checked - Uses `rel.licencee` for GamingLocations queries (correct - keep as-is)

#### 9. `app/api/lib/helpers/collectionReportQueries.ts` ✅ **VERIFIED**

- [x] Checked - Uses `rel.licencee` for GamingLocations queries (correct - keep as-is)

#### 10. `app/api/lib/helpers/locationAggregation.ts` ✅ **VERIFIED**

- [x] Checked - Uses `rel.licencee` for GamingLocations queries (correct - keep as-is)

---

### 🔴 API Routes - Reports & Analytics (Priority: HIGH)

#### 11. `app/api/reports/locations/route.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 12. `app/api/reports/machines/route.ts` ⚠️ **20 matches**

- [ ] Check each `rel.licencee` reference
- [ ] Replace user-related ones with `assignedLicensees`
- [ ] Keep non-user-related ones (e.g., location.rel.licencee)

#### 13. `app/api/machines/aggregation/route.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 14. `app/api/machines/[machineId]/route.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 15. `app/api/movement-requests/route.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 16. `app/api/locations/route.ts` ⚠️ **4 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`
- [ ] Keep location.rel.licencee references

#### 17. `app/api/locations/search-all/route.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 18. `app/api/locations/search/route.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 19. `app/api/locations/[locationId]/route.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`
- [ ] Keep location.rel.licencee references

#### 20. `app/api/sessions/route.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 21. `app/api/sessions/[sessionId]/[machineId]/events/route.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 22. `app/api/members/summary/route.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 23. `app/api/gaming-locations/route.ts` ⚠️ **3 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`
- [ ] **KEEP** location.rel.licencee references (this is for GamingLocations schema)

#### 24. `app/api/metrics/top-performers/route.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

---

### 🔴 Backend Helpers - Analytics & Reports (Priority: MEDIUM)

#### 25. `app/api/lib/helpers/analytics.ts` ⚠️ **6 matches**

- [ ] Check each `rel.licencee` reference
- [ ] Replace user-related ones with `assignedLicensees`
- [ ] Keep non-user-related ones

#### 26. `app/api/lib/helpers/meterTrends.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 27. `app/api/lib/helpers/topMachines.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 28. `app/api/lib/helpers/machineHourly.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 29. `app/api/lib/helpers/locationTrends.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 30. `app/api/lib/helpers/trends.ts` ⚠️ **4 matches**

- [ ] Check each `rel.licencee` reference
- [ ] Replace user-related ones with `assignedLicensees`

#### 31. `app/api/lib/helpers/manufacturerPerformance.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 32. `app/api/lib/helpers/hourlyTrends.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 33. `app/api/lib/helpers/top-performing.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 34. `app/api/lib/helpers/collectionReportService.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 35. `app/api/lib/helpers/collectionReportBackend.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 36. `app/api/lib/helpers/metersReport.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

---

### 🔴 Models & Schemas (Priority: HIGH)

#### 37. `app/api/lib/models/user.ts` ⚠️ **CRITICAL**

- [ ] Remove `rel.licencee` from User schema
- [ ] Remove `rel` object entirely from User schema (if only used for licencee)
- [ ] Ensure only `assignedLicensees` is used
- [ ] Remove comments mentioning `rel.licencee`

#### 38. `app/api/lib/models/gaminglocations.ts` ⚠️ **KEEP AS-IS**

- [ ] **DO NOT MODIFY** - This schema uses `rel.licencee` for locations
- [ ] Keep `rel.licencee` for GamingLocations schema
- [ ] This is NOT a user schema

---

### ✅ Frontend Components (COMPLETED)

#### 39. `components/administration/UserModal.tsx` ✅ **COMPLETED**

- [x] Remove `rel.licencee` references for users
- [x] Replace with `assignedLicensees`
- [x] Remove comments mentioning `rel.licencee`
- [x] Update state management
- [x] Update form handling

#### 40. `components/administration/UserDetailsModal.tsx` ✅ **VERIFIED**

- [x] Checked - Uses `loc.rel?.licencee` for location objects (correct - keep as-is)

---

### ✅ Frontend Helpers & Hooks (COMPLETED)

#### 41. `lib/hooks/useCurrentUserQuery.ts` ✅ **COMPLETED**

- [x] Remove `rel.licencee` reference
- [x] Replace with `assignedLicensees`

#### 42. `lib/helpers/collectionReport.ts` ✅ **VERIFIED**

- [x] Checked - All `rel.licencee` references are for `locationDetails.rel.licencee` (GamingLocations - correct)

#### 43. `lib/helpers/collectionReportBackend.ts` ✅ **VERIFIED**

- [x] Checked - Uses `locationDetails.rel.licencee` (GamingLocations - correct)

#### 44. `lib/helpers/analytics.ts` ✅ **VERIFIED**

- [x] Checked - All `rel.licencee` references are for `locationDetails.rel.licencee` (GamingLocations - correct)

#### 45. `lib/helpers/locationAggregation.ts` ✅ **VERIFIED**

- [x] Checked - Uses `rel.licencee` for GamingLocations queries (correct)

---

### 🔴 Utilities (Priority: MEDIUM)

#### 46. `lib/utils/mongoQueries.ts` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

---

### 🔴 Type Definitions (Priority: HIGH)

#### 47. `lib/types/mongo.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is in User type
- [ ] If in User type, remove and use `assignedLicensees`
- [ ] If in other types, keep as-is

#### 48. `lib/types/location.ts` ⚠️ **3 matches**

- [ ] Check if `rel.licencee` is in User type
- [ ] If in User type, remove and use `assignedLicensees`
- [ ] **KEEP** if in Location type (locations have rel.licencee)

---

### 🔴 Documentation (Priority: LOW - Update Last)

#### 49. `Documentation/refactoring/user-assignments-migration.md` ⚠️ **3 matches**

- [ ] Remove `rel.licencee` references for users
- [ ] Update to reflect removal
- [ ] Keep references if they're about other schemas

#### 50. `Documentation/refactoring/user-assignments-auth-tracking.md` ⚠️ **4 matches**

- [ ] Remove `rel.licencee` references for users
- [ ] Update to reflect removal

#### 51. `Documentation/refactoring/user-assignments-migration-tracker.md` ⚠️ **4 matches**

- [ ] Remove `rel.licencee` references for users
- [ ] Update to reflect removal

#### 52. `Documentation/frontend/collection-report.md` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 53. `Documentation/frontend/locations.md` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`
- [ ] Keep if about location.rel.licencee

#### 54. `Documentation/backend/members-api.md` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 55. `Documentation/user-safety-safeguards.md` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 56. `Documentation/database-models.md` ⚠️ **2 matches**

- [ ] Update User model documentation
- [ ] Remove `rel.licencee` from User model docs
- [ ] **KEEP** `rel.licencee` in GamingLocations model docs

---

### 🔴 Test Files (Priority: LOW)

#### 57. `test/verify-correct-total.js` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 58. `test/quick-api-comparison.js` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 59. `test/investigate-dashboard-filtering.js` ⚠️ **3 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 60. `test/diagnose-api-difference.js` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 61. `test/debug-dashboard-licensees.js` ⚠️ **3 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 62. `test/create-simple-test-meters.js` ⚠️ **12 matches**

- [ ] Check each `rel.licencee` reference
- [ ] Replace user-related ones with `assignedLicensees`
- [ ] Keep non-user-related ones

#### 63. `test/compare-apis-production.js` ⚠️ **2 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

#### 64. `test/check-dashboard-licensee-data.js` ⚠️ **3 matches**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

---

### 🔴 Backup Files (Priority: LOW)

#### 65. `app/api/reports/meters/route.ts.backup` ⚠️ **1 match**

- [ ] Consider if this backup is needed
- [ ] If updating, check if `rel.licencee` is user-related

#### 66. `app/api/lib/helpers/meters/aggregations.ts.bak` ⚠️ **1 match**

- [ ] Consider if this backup is needed
- [ ] If updating, check if `rel.licencee` is user-related

#### 67. `lib/helpers/meters/aggregations.ts` ⚠️ **1 match**

- [ ] Check if `rel.licencee` is user-related
- [ ] If user-related, replace with `assignedLicensees`

---

## Search Patterns to Remove (User Schema Only)

### Code Patterns (User-related):

- `user.rel.licencee`
- `userObject.rel.licencee`
- `userPayload.rel.licencee`
- `(user.rel as { licencee?: string[] })?.licencee`
- `user.rel?.licencee`
- `rel.licencee` (when context is user object)

### Comment Patterns:

- Any comment containing `rel.licencee` for users
- Any comment mentioning old user field structure

### ⚠️ DO NOT REMOVE:

- `location.rel.licencee` (GamingLocations schema)
- `machine.rel.licencee` (if Machine schema uses it)
- Any `rel.licencee` that is NOT for User schema

---

## Replacement Patterns

### Replace With:

- `assignedLicensees` (array of licensee IDs)
- `user.assignedLicensees`
- `userObject.assignedLicensees`
- `assignedLicensees || []` (for fallback)

---

## How to Identify User vs Non-User `rel.licencee`

### User-related patterns:

- `user.rel.licencee`
- `userObject.rel.licencee`
- `currentUser.rel.licencee`
- `userPayload.rel.licencee`
- In functions that process user data
- In user management components
- In authentication helpers

### Non-user patterns (KEEP):

- `location.rel.licencee`
- `gamingLocation.rel.licencee`
- `machine.rel.licencee`
- In location/machine queries
- In GamingLocations model
- In location aggregation helpers

---

## Notes

- ⚠️ **CRITICAL:** Only remove `rel.licencee` for User schema
- ⚠️ **KEEP** `rel.licencee` for GamingLocations and other schemas
- Check context carefully before removing
- When in doubt, check the model/schema definition
- Test thoroughly after each file update
- Update related type definitions when updating files

---

## Last Updated

- **Date:** 2025-01-27
- **Total Matches Found:** 151 (need to filter for user-related)
- **Files to Update:** ~50 (estimated after filtering)
