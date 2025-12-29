# Codebase Cleanup Tracker

## Task Overview
Cleanup unused exports, types, and functions based on `npx knip` output and fix all TypeScript/Lint errors.

## Phase 1: Initial Knip Cleanup (Completed)
- Removed unused exports from `lib/helpers`, `lib/utils`, and `app/api/lib/helpers/`.
- Removed unused types from `shared/types/` and `lib/types/`.
- De-exported functions that are only used internally.

## Phase 2: Restoring Critical Exports (Completed)
- Restored `dateRange` properties (`startDate`, `endDate`).
- Restored `ActiveFilters` members (`Today`, `Yesterday`, etc.).
- Restored `TopPerformingItem` properties (`customName`, `game`, `color`).
- Restored missing skeletons (`ChartSkeleton`, `MetricCardsSkeleton`).
- Restored missing utility functions (`formatTrinidadTime`, `getUserByEmail`).

## Phase 3: Type Consistency & Fixing Errors (Completed)
- Fixed `logActivity` calls in `app/api/collections/route.ts` to match new signature.
- Fixed `MapPreviewProps` missing properties.
- Resolved `dateRange` type mismatches in `useCabinetData`, `LocationPage`, and `useLocationChartData`.
- Fixed `LocationExportData` mapping in `locationsTabHelpers.ts`.
- Consolidated `UserDocument` in `shared/types/auth.ts` to fix circular dependency.

## Phase 4: Final Cleanup (Completed)
- Removed truly unused functions and variables identified by `knip` and `tsc --noEmit`.
- Fixed type mismatches in `dateRange` and `LocationExportData`.
- Resolved circular dependency in `UserDocument` by consolidating in `shared/types/auth.ts`.
- Verified project with `pnpm type-check` (PASS).
- Noted ESLint circular structure error (pre-existing, depth in node_modules).

### Final Status:
- Total Errors Resolved: ~638
- Unused Exports Removed: ~150
- Codebase Integrity: Verified by TypeScript Compiler.
