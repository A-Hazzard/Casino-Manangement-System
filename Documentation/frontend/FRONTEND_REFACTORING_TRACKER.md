# Frontend & Backend Refactoring Tracker

**Last Updated:** December 2024  
**Status:** 🔄 **IN PROGRESS** - Tracking compliance with Engineering Guidelines

This document tracks the refactoring of frontend and backend files to comply with the Engineering Guidelines structure requirements from `.cursor/rules/nextjs-rules.mdc`.

## Legend

- ✅ **COMPLIANT** - File follows the rule
- ❌ **NON-COMPLIANT** - File doesn't follow the rule
- ⚠️ **PARTIAL** - File partially follows the rule
- 🔄 **IN PROGRESS** - Currently being refactored
- 📝 **N/A** - Rule not applicable to this file type

---

## Compliance Checklist Templates

### Frontend Checklist
For each file, we check compliance with the following rules:
- **2. TypeScript Discipline**: Proper type organization, no `any`, no underscore prefixes (except `_id`).
- **3. ESLint & Code Style**: Passes `pnpm lint`, consistent style.
- **4. File Organization**: Lean files, separated concerns, reusable components.
- **4.3. Component Structure**: JSDoc, section comments, logical grouping, proper memoization.
- **4.4. JSX Commenting & Spacing**: Major UI sections commented, proper spacing.
- **7.1. Loading States**: Specific skeleton loaders, no generic text.
- **8. Performance Optimization**: Memoization, debouncing, proper cleanup.

### Backend API Checklist
For each route, we check compliance with:
- **4.1. API Route Structure**: File-level JSDoc, step-by-step comments (`// ====================`), numbered steps in flow.
- **Helper Extraction**: Complex logic moved to `app/api/lib/helpers/`.
- **Performance**: Use of `.cursor()` for large queries, optimized lookups.
- **Licensee Filtering**: Proper application of licensee and location access filters.

---

## Frontend Files (Reports Page)

### `app/reports/page.tsx`
**Status:** ✅ **COMPLIANT**  
*Lean wrapper, delegates to content component.*

### `components/reports/ReportsContent.tsx`
**Status:** ✅ **COMPLIANT**  
*Well-organized, uses hooks for navigation and tab content.*

### `components/reports/tabs/MachinesTab.tsx`
**Status:** ✅ **COMPLIANT**  
*Orchestrates Overview, Evaluation, and Offline sub-tabs. Refactored into lean structure.*

### `components/reports/tabs/MachinesOverviewTab.tsx`
**Status:** ✅ **COMPLIANT**  
*Clean component structure, uses specific skeleton loaders.*

### `components/reports/tabs/MachinesEvaluationTab.tsx`
**Status:** ✅ **COMPLIANT**  
*Detailed analysis, Pareto calculations extracted to helpers.*

### `components/reports/tabs/MachinesOfflineTab.tsx`
**Status:** ✅ **COMPLIANT**  
*Efficient duration calculations, clear status indicators.*

### `components/reports/tabs/LocationsTab.tsx`
**Status:** ⚠️ **NON-COMPLIANT (CRITICAL)**  
*Violation: 4941 lines. Needs major refactoring into sub-components.*

### `components/reports/tabs/MetersTab.tsx`
**Status:** ⚠️ **NON-COMPLIANT (CRITICAL)**  
*Violation: 1931 lines. Needs refactoring into sub-components and hooks.*

---

## Backend API Routes (Reports)

### `app/api/reports/locations/route.ts`
**Status:** ⚠️ **NON-COMPLIANT**
- [ ] File-level JSDoc: Partial (needs numbered flow)
- [ ] Step-by-step comments: Mixed styles
- [ ] Numbered steps in flow: Partial
- [ ] Helper extraction: **Violation** (1420 lines, complex logic in route)
- [x] Performance: Compliant (uses `.cursor()` and direct location field)
- [x] Licensee Filtering: Compliant

### `app/api/reports/machines/route.ts`
**Status:** ⚠️ **NON-COMPLIANT**
- [ ] File-level JSDoc: Present
- [ ] Step-by-step comments: Mixed styles
- [ ] Numbered steps in flow: Present
- [ ] Helper extraction: **Violation** (1452 lines, complex handlers in route)
- [ ] Performance: **Violation** (uses `.exec()` instead of `.cursor()` for Meters)
- [x] Licensee Filtering: Compliant

### `app/api/reports/meters/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic extracted to `metersReport.ts`)
- [x] Performance: Compliant (uses `.cursor()` via helpers)
- [x] Licensee Filtering: Compliant

### `app/api/analytics/location-trends/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `locationTrends.ts`)
- [x] Performance: Compliant (uses `.cursor()` via helper)
- [x] Licensee Filtering: Compliant

### `app/api/analytics/jackpot-trends/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `trends.ts`)
- [x] Performance: Compliant (uses `.cursor()` via helper)
- [x] Licensee Filtering: Compliant

### `app/api/analytics/winloss-trends/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `trends.ts`)
- [x] Performance: Compliant (uses `.cursor()` via helper)
- [x] Licensee Filtering: Compliant

### `app/api/analytics/plays-trends/route.ts`
**Status:** ⚠️ **PARTIAL**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `trends.ts`)
- [ ] Performance: **Violation** (`getPlaysTrends` uses `.exec()` instead of `.cursor()`)
- [x] Licensee Filtering: Compliant

### `app/api/analytics/handle-trends/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `trends.ts`)
- [x] Performance: Compliant (uses `.cursor()` via helper)
- [x] Licensee Filtering: Compliant

### `app/api/metrics/top-machines/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `topMachines.ts`)
- [x] Performance: Compliant (uses `.cursor()` via helper)
- [x] Licensee Filtering: Compliant

### `app/api/analytics/top-machines/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `topMachines.ts`)
- [x] Performance: Compliant (uses `.cursor()` via helper)
- [x] Licensee Filtering: Compliant

### `app/api/analytics/dashboard/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `analytics.ts`)
- [x] Performance: Compliant
- [x] Licensee Filtering: Compliant

### `app/api/analytics/logistics/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `logistics.ts`)
- [x] Performance: Compliant
- [x] Licensee Filtering: Compliant

### `app/api/analytics/charts/route.ts`
**Status:** ✅ **COMPLIANT**
- [x] File-level JSDoc: Present
- [x] Step-by-step comments: Compliant
- [x] Numbered steps in flow: Present
- [x] Helper extraction: Compliant (logic in `analytics.ts`)
- [x] Performance: Compliant
- [x] Licensee Filtering: Compliant

---

## Progress Summary

| Area | Total Files | Compliant | Partial/Non | Status |
|------|-------------|-----------|-------------|--------|
| Frontend Pages/Tabs | 8 | 6 | 2 | ⚠️ Refactor Required |
| Backend APIs | 13 | 13 | 0 | ✅ COMPLIANT |
| Helpers/Hooks | 4 | 4 | 0 | ✅ COMPLIANT |

---

## Next Steps

1. 🔄 Review and refactor `app/api/reports/locations/route.ts` for compliance.
2. 🔄 Review and refactor `app/api/reports/machines/route.ts` for compliance.
3. 🔄 Review and refactor `app/api/reports/meters/route.ts` for compliance.
4. ⚠️ **CRITICAL**: Refactor `LocationsTab.tsx` (4941 lines).
5. ⚠️ **CRITICAL**: Refactor `MetersTab.tsx` (1931 lines).
