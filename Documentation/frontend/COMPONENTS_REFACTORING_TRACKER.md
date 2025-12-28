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
