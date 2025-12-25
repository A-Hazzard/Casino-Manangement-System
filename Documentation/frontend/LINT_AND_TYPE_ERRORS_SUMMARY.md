# Lint and Type Errors - Quick Summary

**Created:** December 22nd, 2025  
**Total Issues:** 188 (177 errors, 11 warnings)  
**Files Affected:** 42

---

## Quick Stats

| Category | Count | Priority | Status |
|----------|-------|----------|--------|
| Type Errors | ~50 | 🔴 Critical | ⏳ Pending |
| Missing Props | ~15 | 🔴 Critical | ⏳ Pending |
| React Hooks | 11 | 🟡 Important | ⏳ Pending |
| Unused Variables | ~100 | 🟢 Low | ⏳ Pending |
| `any` Types | 40 | 🟡 Medium | ⏳ Pending |
| Import/Export | ~5 | 🔴 Critical | ⏳ Pending |

---

## Top Priority Files (Most Errors)

1. **`lib/hooks/collectionReport/useCollectionReportPageData.ts`** - 20 errors
2. **`lib/hooks/collectionReport/useMobileCollectionModal.ts`** - 19 errors
3. **`lib/hooks/administration/useAdministrationUsers.ts`** - 12 errors
4. **`lib/hooks/cabinets/useCabinetPageData.ts`** - 9 errors
5. **`app/collection-report/page.tsx`** - 9 errors
6. **`app/locations/page.tsx`** - 10 errors
7. **`app/cabinets/page.tsx`** - 10 errors

---

## Critical Fixes Needed (Blocks Compilation)

### Type Errors
- `app/api/lib/helpers/collectionReportCreation.ts` - Type mismatches
- `app/locations/page.tsx` - Missing `PageErrorBoundary` import
- `components/reports/tabs/MachinesEvaluationTab.tsx` - Wrong import syntax
- `lib/hooks/administration/useAdministrationUsers.ts` - `null` vs `undefined` type issues
- `lib/hooks/locations/useLocationChartData.ts` - Type mismatches

### Missing Props
- `app/cabinets/page.tsx` - Missing `onSubmit`, `showLocationFilter`
- `app/collection-report/page.tsx` - Missing `hideAllTime`, `desktopTableRef`, `isSearching`
- `app/locations/page.tsx` - Missing `onDelete`, `isOpen`, `onClose`, `onEdit`
- `app/sessions/[sessionId]/[machineId]/events/page.tsx` - Missing `hideAllTime`
- `components/cabinets/details/CabinetAccountingSection.tsx` - Missing `hideAllTime`

---

## Common Patterns to Fix

### Pattern 1: `null` vs `undefined` Type Mismatch
```typescript
// ❌ WRONG
selectedLicencee: string | null

// ✅ CORRECT
selectedLicencee: string | undefined
// OR convert: selectedLicencee ?? undefined
```

**Files affected:** `useAdministrationUsers.ts`, `useLocationCabinetsData.ts`

### Pattern 2: Missing Props in Components
```typescript
// ❌ WRONG
<Component prop1={value1} />

// ✅ CORRECT
<Component prop1={value1} requiredProp={value2} />
```

**Files affected:** Multiple page components

### Pattern 3: Unused Variables
```typescript
// ❌ WRONG
const unused = value;

// ✅ CORRECT
const _unused = value; // Prefix with underscore
// OR remove entirely
```

**Files affected:** ~100 instances across 30+ files

### Pattern 4: `any` Types
```typescript
// ❌ WRONG
function handle(data: any) { }

// ✅ CORRECT
function handle(data: SpecificType) { }
```

**Files affected:** 40 instances across 20 files

---

## Fix Order Recommendation

1. **Fix type errors first** (blocks compilation)
2. **Fix missing props** (breaks runtime)
3. **Fix React hooks dependencies** (potential bugs)
4. **Remove unused variables** (code quality)
5. **Replace `any` types** (type safety)

---

**See:** `LINT_AND_TYPE_ERRORS_TRACKER.md` for complete detailed list



