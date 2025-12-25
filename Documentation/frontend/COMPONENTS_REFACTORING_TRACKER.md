# Components Refactoring Tracker

This tracker monitors the refactoring of components in the `components/` directory that exceed 1000 lines of code. The goal is to break them down into smaller, reusable, well-organized components following the project's engineering rules.

## Refactoring Guidelines

- **Maximum component length**: ~400-500 lines
- **Extract sub-components** when sections are distinct, reusable, or have their own state/logic
- **Extract custom hooks** for reusable stateful logic to `lib/hooks/`
- **Extract helper functions** based on project structure:
  - **API-related logic** → `lib/helpers/` or specific feature directories
  - **Shared utilities** → `lib/utils/` or `utils/`
  - **Feature-specific code** → `lib/[feature]/` (e.g., `lib/reports/`, `lib/locations/`)
  - **Shared code** (frontend + backend) → `shared/` (types, utilities, constants)
- **Export all extracted functions/components** - they must be properly exported for reuse
- **Maintain proper JSDoc** documentation
- **Follow section organization** with clear comments
- **Ensure type safety** - no `any` types
- **No unused variables** - All declared variables must be used or removed
- **No underscore prefixes** - Never prefix variables or functions with underscores
- **Check dependencies before deleting** - Use grep to verify usage before removal

## Project Structure Rules

When extracting functions/components:

- **`lib/helpers/`** - API-related logic and helpers (data fetching, API calls)
- **`lib/utils/`** - Shared utilities (formatting, calculations, transformations)
- **`lib/hooks/`** - Custom React hooks (stateful logic, data fetching hooks)
- **`lib/[feature]/`** - Feature-specific code (e.g., `lib/reports/`, `lib/locations/`)
- **`shared/`** - Code used by both frontend and backend (types, utilities, constants)
- **`components/ui/`** - Reusable UI components
- **`components/[feature]/`** - Feature-specific components

## Files Over 1000 Lines

| File                                                               | Lines       | Status    | Notes                                                                                                                                    |
| ------------------------------------------------------------------ | ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `components/reports/tabs/LocationsTab.tsx`                         | 5118 → ~548 | COMPLETED | Refactored: Hook + 3 tab components + helpers                                                                                            |
| `components/reports/tabs/MetersTab.tsx`                            | 1930 → ~403 | COMPLETED | Refactored: Hook + 2 components + helpers (79% reduction)                                                                                |
| `components/ui/skeletons/ReportsSkeletons.tsx`                     | 1651 → ~101 | COMPLETED | Split into 6 feature-specific skeleton files (94% reduction)                                                                             |
| `components/collectionReport/NewCollectionModal.tsx`               | 3604 → ~503 | COMPLETED | Refactored: Hook + 4 components + helpers (86% reduction) - Location/Machine Selection, Form Fields, Financials, Collected Machines List |
| `components/ui/cabinets/EditCabinetModal.tsx`                      | 1360 → ~896 | COMPLETED | Normalization functions + 3 components extracted (Basic Info, Location/Config, Collection Settings) - 464 lines saved (34% reduction)    |
| `components/ui/members/EditMemberModal.tsx`                        | 1057 → ~400 | COMPLETED | Extracted form fields, profile header, validation hook, and form state hook                                                              |
| `components/collectionReport/mobile/MobileCollectionModal.tsx`     | 2163 → ~100 | COMPLETED | Refactored: Hook + Location/Machine selection components extracted                                                                       |
| `components/collectionReport/EditCollectionModal.tsx`              | 2877 → ~225 | COMPLETED | Refactored: Hook + 3 form sections extracted                                                                                             |
| `components/administration/AddUserModal.tsx`                       | 1703 → ~85  | COMPLETED | Refactored: Hook + Form/Permissions components extracted                                                                                 |
| `components/layout/ProfileModal.tsx`                               | 2531 → ~150 | COMPLETED | Refactored: Hook + Header/BasicInfo/Assignments/Address/Password components extracted                                                    |
| `components/members/tabs/MembersSummaryTab.tsx`                    | 1365 → ~55  | COMPLETED | Refactored: Hook + KPICards/Table components extracted                                                                                   |
| `components/ui/GamesPerformanceChart.tsx`                          | 1259 → ~75  | COMPLETED | Refactored: Hook + Tooltip component extracted                                                                                           |
| `components/ui/ManufacturerPerformanceChart.tsx`                   | 1277 → ~75  | COMPLETED | Refactored: Hook + Tooltip component extracted                                                                                           |
| `components/ui/GamesPerformanceRevenueChart.tsx`                   | 1117 → ~555 | COMPLETED | Extracted GameMultiSelect, GamesRevenueTooltip, and useGamesRevenueData hook                                                             |
| `components/reports/common/LocationMap.tsx`                        | 1127 → ~60  | COMPLETED | Refactored: Hook + Marker component extracted                                                                                            |
| `components/collectionReport/mobile/MobileEditCollectionModal.tsx` | 3556 → ~293 | COMPLETED | Refactored: Hook + 2 components (91% reduction) - Location selector and machine list extracted                                           |

## Refactoring Progress

### Completed

- `components/ui/members/EditMemberModal.tsx` - Extracted form fields, profile header, validation hook, and form state hook
- `components/ui/GamesPerformanceRevenueChart.tsx` - Extracted GameMultiSelect, GamesRevenueTooltip, and useGamesRevenueData hook
- `components/reports/tabs/LocationsTab.tsx` (5118 → ~548 lines)
- `components/reports/tabs/MetersTab.tsx` (1930 → ~403 lines)
- `components/ui/skeletons/ReportsSkeletons.tsx` (1651 → ~101 lines)
- `components/collectionReport/NewCollectionModal.tsx` (3604 → ~503 lines)
- `components/collectionReport/mobile/MobileEditCollectionModal.tsx` (3556 → ~293 lines)
- `components/collectionReport/EditCollectionModal.tsx` (2877 → ~225 lines)
- `components/collectionReport/mobile/MobileCollectionModal.tsx` (2163 → ~100 lines)
- `components/administration/AddUserModal.tsx` (1703 → ~85 lines)
- `components/layout/ProfileModal.tsx` (2531 → ~150 lines)
- `components/members/tabs/MembersSummaryTab.tsx` (1365 → ~55 lines)
- `components/ui/GamesPerformanceChart.tsx` (1259 → ~75 lines)
- `components/ui/ManufacturerPerformanceChart.tsx` (1277 → ~75 lines)
- `components/reports/common/LocationMap.tsx` (1127 → ~60 lines)

### In Progress

- None

### Pending

- None

## Critical Requirements from nextjs-rules.mdc

### TypeScript Discipline

- **No `any` types** - Create appropriate type definitions
- **No underscore prefixes** - Never prefix variables/functions with underscores
- **All types in appropriate directories** - `shared/types/`, `types/`, or `lib/types/`
- **Prefer `type` over `interface`** for consistency
- **Check dependencies before deleting** - Use grep to verify usage

### Component Structure

- **File-level JSDoc** required for all components >200 lines
- **Section comments** using `// ============================================================================`
- **Logical grouping** of hooks, handlers, effects, and render logic
- **Memoization** - Use `useMemo` and `useCallback` appropriately
- **Maximum component length** - ~400-500 lines, extract if longer

### Loading States & Skeletons

- **MANDATORY: Specific skeleton loaders** - Each page/tab must have its own skeleton
- **NEVER use generic loading states** - No "Loading...", "Loading Data", or generic spinners
- **Skeleton must match content layout** - Exact dimensions, spacing, and structure
- **Content-specific skeletons** - `PageNameSkeleton`, `TabNameSkeleton`, `SectionNameSkeleton`
- **File organization** - `components/ui/skeletons/[PageName]Skeletons.tsx`

### Performance Optimization

- **Database queries** - Use `.cursor({ batchSize: 1000 })` for Meters aggregations
- **Direct field access** - Use `location` field directly, avoid `$lookup` operations
- **N+1 prevention** - Batch queries, no looping database calls
- **Memoization** - Use `useMemo` for expensive calculations
- **Debouncing** - Use for search inputs to prevent excessive API calls

### API Route Structure

- **File-level JSDoc** with route description and features
- **Step-by-step comments** using `// ============================================================================` separators
- **Numbered steps** - Each major operation must be a numbered step
- **Flow documentation** - Document flow in function JSDoc before implementation
- **Helper extraction** - Extract complex logic to `app/api/lib/helpers/[feature].ts`
- **Performance tracking** - Track execution time for potentially slow operations

### Page.tsx Structure

- **Lean wrapper** - Page component should only handle routing/authentication
- **Content component** - Extract complex logic to separate component
- **Helper extraction** - Extract data fetching to `lib/helpers/`
- **Custom hooks** - Extract reusable stateful logic to custom hooks
- **Section comments** - Use section comments to organize code

### JSX Commenting & Spacing

- **JSX comments** - Mark major UI sections (headers, filters, tables, forms, modals, pagination)
- **Section comments** - Use `{/* ============================================================================ */}` format
- **Spacing guidelines** - Separate major UI sections with blank lines
- **Group related elements** together

## Notes

- All components over 1000 lines have been refactored
- Logic has been moved to custom hooks in `lib/hooks/`
- UI sections have been extracted to sub-components
- File sizes have been significantly reduced, most well below the 500-line target
- Type safety has been maintained, replacing `any` with specific types or extended interfaces
- Unused variables and imports have been cleaned up
