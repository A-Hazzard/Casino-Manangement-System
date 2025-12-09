# Linter Errors Tracker

**Last Updated:** December 7, 2025  
**Status:** ✅ Complete - All errors fixed

This document tracks all ESLint and TypeScript linter errors to ensure code quality and compliance with the Engineering Guidelines.

**Latest Status:** All ESLint errors and TypeScript type errors have been resolved. Both `pnpm lint` and `pnpm type-check` pass with 0 errors.

## Legend

- ✅ **FIXED** - Error has been resolved
- 🔄 **IN PROGRESS** - Currently being fixed
- ❌ **PENDING** - Error needs to be fixed
- ⚠️ **IGNORED** - Error is acceptable and properly documented (e.g., generated files)

---

## Current Linter Errors

### ESLint Errors (0 errors, 0 warnings) - Batch 1 Complete ✅

| File                                                               | Line | Error Type | Description                                     | Status |
| ------------------------------------------------------------------ | ---- | ---------- | ----------------------------------------------- | ------ |
| `app/cabinets/page.tsx`                                            | 284  | Warning    | Unused eslint-disable directive                 | ✅     |
| `components/collectionReport/mobile/MobileEditCollectionModal.tsx` | 3409 | Error      | 'PCDateTimePicker' is not defined               | ✅     |
| `components/members/tabs/MembersListTab.tsx`                       | 55   | Error      | 'forcedLocationName' is defined but never used  | ✅     |
| `components/members/tabs/MembersListTab.tsx`                       | 140  | Warning    | React Hook useCallback has missing dependencies | ✅     |
| `components/ui/ModernCalendar.tsx`                                 | 183  | Warning    | React Hook useEffect has missing dependency     | ✅     |
| `components/ui/dashboard/Chart.tsx`                                | 93   | Error      | 'hasMinuteData' is assigned but never used      | ✅     |
| `lib/hooks/data/useCabinetData.ts`                                 | 418  | Warning    | Unused eslint-disable directive                 | ✅     |
| `lib/hooks/data/useCabinetData.ts`                                 | 421  | Warning    | React Hook useEffect has missing dependency     | ✅     |
| `lib/hooks/useAbortableRequest.ts`                                 | 54   | Error      | 'queryName' parameter is defined but never used | ✅     |

### ✅ Fixed Errors (Batch 2 - React Hooks fixes)

10. ✅ **`app/locations/[slug]/page.tsx:1195`** - Removed eslint-disable, added `makeChartRequest` and `showGranularitySelector` to dependency array, removed queryName argument
11. ✅ **`app/page.tsx:233, 322`** - Removed eslint-disable comments, added missing dependencies (`effectiveDateRange`, `loadGamingLocations`, `fetchTopPerformingDataHelper`), removed queryName arguments
12. ✅ **`app/sessions/[sessionId]/[machineId]/events/page.tsx:242`** - Removed eslint-disable, added `fetchEvents` to dependency array
13. ✅ **`app/members/[id]/page.tsx:124`** - Extracted `fetchMemberData` to useCallback, removed eslint-disable
14. ✅ **`components/administration/AddUserModal.tsx:187`** - Removed eslint-disable, added comment explaining why setFormState is excluded
15. ✅ **`components/cabinets/SMIBManagementTab.tsx:72`** - Removed eslint-disable, added `searchParams` and `selectedRelayId` to dependency array
16. ✅ **`components/ui/image/CircleCropModal.tsx:175`** - Removed eslint-disable comment (img element is required by react-image-crop library)

### ✅ Fixed Errors (Batch 3 - `any` types and Image component)

17. ✅ **`app/api/machines/aggregation/route.ts:297`** - Replaced `any[]` with `Array<Record<string, unknown>>`
18. ✅ **`app/api/machines/[machineId]/chart/route.ts:86, 145, 260, 264`** - Replaced `any` types with proper types (`GamingMachine | null`, `Location | null`, `PipelineStage[]`, `Record<string, unknown>`)
19. ✅ **`app/api/machines/[machineId]/route.ts:223, 227`** - Replaced `any[]` and `any` with `PipelineStage[]` and `Record<string, unknown>`
20. ✅ **`app/api/lib/helpers/collectionIssueChecker.ts:392, 394`** - Removed `as any` casts, used proper type guards
21. ✅ **`app/api/reports/locations/route.ts:299, 460, 466, 486, 500, 799`** - Replaced all `any` types with proper types (`Location`, `GamingMachine`, `AggregatedLocation`)
22. ✅ **`app/api/lib/helpers/auth.ts:185, 263, 397`** - Added `toJSON()` method to `UserDocumentWithPassword` type, removed `as any` casts
23. ✅ **`components/ui/image/CircleCropModal.tsx`** - Now using Next.js Image component. The component accesses the underlying img element from Next.js Image via DOM query in useEffect, which is then used by react-image-crop for crop functionality.

### ✅ Fixed Errors (Batch 4 - useAbortableRequest signature and TypeScript errors)

24. ✅ **`components/ui/image/CircleCropModal.tsx:11, 62, 97, 99`** - Removed unused React import, moved `aspect` declaration before useEffect, fixed useEffect return type
25. ✅ **Multiple files** - Removed second argument (queryName) from all `makeRequest` calls (20+ files): `app/collection-report/page.tsx`, `app/locations/[slug]/page.tsx`, `app/locations/page.tsx`, `app/sessions/[sessionId]/[machineId]/events/page.tsx`, `components/reports/common/LocationMap.tsx`, `components/reports/tabs/LocationsTab.tsx` (5 instances), `components/reports/tabs/MachinesTab.tsx` (4 instances), `components/reports/tabs/MetersTab.tsx` (3 instances), `lib/hooks/data/useSessions.ts`, `lib/hooks/data/useLocationData.ts`, `lib/hooks/data/useCabinetDetailsData.ts`
26. ✅ **`app/api/reports/locations/route.ts:39`** - Removed unused `Location` import (kept only in type usage)
27. ✅ **`app/api/machines/[machineId]/chart/route.ts:105, 150, 153`** - Changed `machine` from `const` to `let` for reassignment, fixed `Pick<Location>` type to use inline type, fixed `gameDayOffset` type
28. ✅ **`app/api/lib/helpers/collectionIssueChecker.ts:392`** - Fixed ObjectId type issue by converting string IDs to ObjectIds before query
29. ✅ **`app/api/machines/aggregation/route.ts:614, 617, 619, 621, 732-741, 767`** - Added proper type assertions for machine properties (moneyIn, moneyOut, serialNumber, relayId, smbId, \_id)
30. ✅ **`shared/types/entities.ts:58`** - Added optional `_id` property to `AggregatedLocation` type
31. ✅ **`app/locations/[slug]/page.tsx:1189, 1634`** - Added `customDateRange` to useEffect dependencies, removed unused `forcedLocationName` prop
32. ✅ **`app/page.tsx:231, 319`** - Added all missing Zustand setters and helper functions to useEffect dependency arrays
33. ✅ **`components/administration/AddUserModal.tsx:191`** - Used functional update for `setFormState` to avoid dependency warning

### ✅ Fixed Errors (Batch 5 - Final TypeScript type fixes)

34. ✅ **`app/api/machines/[machineId]/chart/route.ts:29`** - Removed unused `Location` type import (PipelineStage is a value import, not type)
35. ✅ **`app/api/machines/aggregation/route.ts:612, 624`** - Removed duplicate `machineRecord` declaration in filter function
36. ✅ **`app/api/machines/aggregation/route.ts:733-742`** - Added proper type assertions using `machineRecord` for all currency conversion properties
37. ✅ **`app/api/reports/locations/route.ts:40`** - Removed unused `Location` import (only `GamingMachine` needed)
38. ✅ **`app/api/reports/locations/route.ts:497, 661`** - Added missing required properties (`coinIn`, `coinOut`, `jackpot`, `noSMIBLocation`, `hasSmib`, `gamesPlayed`) to location results
39. ✅ **`shared/types/entities.ts:58`** - Added optional `machines` property to `AggregatedLocation` type
40. ✅ **`app/api/reports/locations/route.ts:703`** - Added null check for `loc._id` before using in `memberCountMap.get()`
41. ✅ **`components/administration/AddUserModal.tsx:188`** - Added explicit type assertion for `setFormState` functional update
42. ✅ **`components/ui/image/CircleCropModal.tsx:64`** - Added explicit `return undefined` for all code paths in useEffect
43. ✅ **`lib/hooks/data/useLocationData.ts:167`** - Removed unused `wasInitialMount` variable

### ✅ Fixed Errors (Batch 6 - Final cleanup)

44. ✅ **`app/api/reports/locations/route.ts:667`** - Added missing required properties (`coinIn`, `coinOut`, `jackpot`, `noSMIBLocation`, `hasSmib`, `gamesPlayed`) to batch results location objects
45. ✅ **`components/administration/AddUserModal.tsx:189`** - Added explicit type annotation `(prev: AddUserForm)` for setFormState functional update
46. ✅ **`app/page.tsx:231`** - Removed unnecessary dependency `loadGamingLocations` (stable function import)
47. ✅ **`app/page.tsx:325`** - Removed unnecessary dependency `fetchTopPerformingDataHelper` (stable function import)

### ✅ Fixed Errors (Batch 7 - Final fixes)

48. ✅ **`app/page.tsx:324`** - Removed unnecessary dependency `fetchTopPerformingDataHelper` from useEffect dependencies (stable function import)
49. ✅ **`components/administration/AddUserModal.tsx:188`** - Changed from functional update pattern to direct state update with guard to prevent infinite loops (setFormState prop only accepts Partial<AddUserForm>, not functions)

### ✅ Fixed Errors (Batch 8 - Infinite loop fixes)

50. ✅ **`app/page.tsx:231-246`** - Removed Zustand setters and `effectiveDateRange` from useEffect dependencies to prevent infinite loops. Used `dateRangeKey` for date tracking and accessed `customDateRange`/`defaultDateRange` from closure inside effect
51. ✅ **`app/page.tsx:324-333`** - Removed Zustand setters from useEffect dependencies (stable functions don't need to be in dependencies)
52. ✅ **`components/administration/AddUserModal.tsx:185-204`** - Fixed infinite loop by using `useRef` to track initialization state and reading `formState` via ref instead of including it in dependencies

### ✅ Fixed Errors (Batch 9 - Infinite loop fixes without eslint-disable)

53. ✅ **`app/page.tsx:231-240`** - Included `effectiveDateRange` in dependencies (memoized, only changes when dates change). Included Zustand setters in dependencies (they're stable and won't cause loops)
54. ✅ **`app/page.tsx:318-328`** - Included `fetchTopPerformingDataHelper` and Zustand setters in dependencies (all are stable)
55. ✅ **`components/administration/AddUserModal.tsx:184-221`** - Used `formStateRef` to read current `formState` value without including it in dependencies, preventing infinite loops while satisfying ESLint rules

### Remaining eslint-disable Comments

All eslint-disable comments have been removed from source code. Only documentation files (`.cursor/` directory) may contain references for documentation purposes.

### TypeScript Configuration

- ✅ **`tsconfig.json`** - `.next` folder excluded from type checking
- ✅ **`eslint.config.mjs`** - `.next/**` already in ignores

### TypeScript Errors (IGNORED)

All TypeScript errors in `.next/` directory are now excluded from type checking via `tsconfig.json` exclude configuration.

---

## Fixes Applied

### ✅ Fixed Errors (Batch 1 - 9 errors fixed)

1. ✅ **`app/cabinets/page.tsx:284`** - Removed unused eslint-disable directive, added `loadCabinetsRef` to dependency array (refs are stable)
2. ✅ **`components/collectionReport/mobile/MobileEditCollectionModal.tsx:3409`** - Replaced `PCDateTimePicker` with `ModernCalendar` component
3. ✅ **`components/members/tabs/MembersListTab.tsx:55`** - Removed unused `forcedLocationName` parameter from interface and component
4. ✅ **`components/members/tabs/MembersListTab.tsx:140`** - Added `forcedLocationId` and `locationFilter` to useCallback dependency array
5. ✅ **`components/ui/ModernCalendar.tsx:183`** - Fixed dependency issue by restructuring console.log to not reference `selectedEndTime` state
6. ✅ **`components/ui/dashboard/Chart.tsx:93`** - Removed unused `hasMinuteData` variable
7. ✅ **`lib/hooks/data/useCabinetData.ts:418`** - Removed unused eslint-disable directive
8. ✅ **`lib/hooks/data/useCabinetData.ts:421`** - Used ref pattern for `loadCabinets` to properly handle dependencies
9. ✅ **`lib/hooks/useAbortableRequest.ts:54`** - Removed unused `queryName` parameter

---

## Error Details

### 1. Unused eslint-disable directive (`app/cabinets/page.tsx:284`)

**Issue:** ESLint disable comment is no longer needed as there's no rule violation.

**Fix:** Remove the unused `eslint-disable-next-line react-hooks/exhaustive-deps` comment.

---

### 2. Undefined component (`components/collectionReport/mobile/MobileEditCollectionModal.tsx:3409`)

**Issue:** `PCDateTimePicker` component is not defined or imported.

**Fix:** Replace `PCDateTimePicker` with `ModernCalendar` component which is already imported and supports time inputs.

---

### 3. Unused parameter (`components/members/tabs/MembersListTab.tsx:55`)

**Issue:** `forcedLocationName` parameter is defined but never used in the component.

**Fix:** Prefix with underscore `_forcedLocationName` to indicate intentional unused parameter, or remove if truly unnecessary.

---

### 4. Missing dependencies (`components/members/tabs/MembersListTab.tsx:140`)

**Issue:** `useCallback` hook is missing `forcedLocationId` and `locationFilter` in dependency array.

**Fix:** Add missing dependencies to the dependency array, or use refs if intentional exclusion.

---

### 5. Missing dependency (`components/ui/ModernCalendar.tsx:183`)

**Issue:** `useEffect` hook is missing `selectedEndTime` in dependency array.

**Fix:** Add `selectedEndTime` to dependency array if needed, or document why it's excluded.

---

### 6. Unused variable (`components/ui/dashboard/Chart.tsx:93`)

**Issue:** `hasMinuteData` is assigned but never used.

**Fix:** Remove the unused variable or use it if it was intended for logic.

---

### 7. Unused eslint-disable directive (`lib/hooks/data/useCabinetData.ts:418`)

**Issue:** ESLint disable comment is no longer needed.

**Fix:** Remove the unused `eslint-disable-next-line react-hooks/exhaustive-deps` comment.

---

### 8. Missing dependency (`lib/hooks/data/useCabinetData.ts:421`)

**Issue:** `useEffect` hook is missing `loadCabinets` in dependency array.

**Fix:** Add `loadCabinets` to dependency array, or document why it's intentionally excluded.

---

### 9. Unused parameter (`lib/hooks/useAbortableRequest.ts:54`)

**Issue:** `queryName` parameter is defined but never used.

**Fix:** Prefix with underscore `_queryName` to indicate intentional unused parameter, or remove if truly unnecessary.

---

## Next Steps

1. ✅ Create tracking document
2. ✅ Fix all ESLint errors
3. ✅ Fix all ESLint warnings
4. ✅ Verify all fixes with `pnpm lint`
5. ✅ Verify TypeScript compilation with `pnpm type-check`
6. ✅ Exclude `.next` folder from type checking
7. ✅ Replace all `any` types with proper TypeScript types
8. ✅ Use Next.js Image component in CircleCropModal

---

## Notes

- TypeScript errors in `.next/` directory are expected and should not be fixed (they're from Next.js type generation)
- All fixes should follow the Engineering Guidelines
- Test each fix to ensure functionality is preserved
