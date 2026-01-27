# Frontend Engineering Guidelines

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Version:** 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [Page.tsx Structure & Organization](#pagetsx-structure--organization)
3. [Component Structure & Organization](#component-structure--organization)
4. [Code Organization & Extraction](#code-organization--extraction)
5. [JSX Commenting & Spacing](#jsx-commenting--spacing)
6. [Helper Files Organization](#helper-files-organization)
7. [Hook Files Organization](#hook-files-organization)
8. [Utils Files Organization](#utils-files-organization)
9. [TypeScript Standards](#typescript-standards)
10. [Performance Optimization](#performance-optimization)

## Overview

This document provides comprehensive guidelines for frontend development in the Evolution One CMS system. It covers page structure, component organization, code extraction, JSX formatting, and maintainability standards.

### Key Principles

- **Lean Pages**: Keep `page.tsx` files thin wrappers that delegate to components
- **Modular Components**: Break down large components into smaller, focused pieces
- **Extracted Logic**: Move business logic to helpers, utils, and custom hooks
- **Readable JSX**: Use comments and spacing to make JSX easy to navigate
- **Type Safety**: Strict TypeScript with no `any` types
- **Maintainability**: Code should be easy to understand, modify, and extend

---

## Page.tsx Structure & Organization

**CRITICAL**: All `page.tsx` files must be lean wrappers that delegate logic to helpers and components.

### File Structure Requirements

1. **File-Level Documentation** (Required):

```typescript
/**
 * [Page Name] Page
 * [Brief description of the page]
 *
 * Features:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */
```

2. **Page Component Structure**:

```typescript
/**
 * [Page Name] Page Component
 * Thin wrapper that handles routing and authentication
 */
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageErrorBoundary>
        <PageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}

/**
 * [Page Name] Content Component
 * Handles all state management and data fetching for the page
 */
function PageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [state, setState] = useState();
  const data = useCustomHook();

  // ============================================================================
  // Data Fetching
  // ============================================================================
  useEffect(() => {
    // Data fetching logic
  }, [dependencies]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout>
      {/* Page content */}
    </PageLayout>
  );
}
```

### Logic Extraction Rules

**Extract to `lib/helpers/` when:**

- Data fetching logic (API calls)
- Complex state management
- Business logic calculations
- Data transformation
- Filter/search logic

**Extract to Custom Hooks when:**

- Reusable stateful logic
- Multiple related state variables
- Complex useEffect dependencies
- Data fetching with caching

**Extract to Components when:**

- Reusable UI patterns
- Complex rendering logic
- Form handling
- Table/list rendering

### File Length Guidelines

- **Maximum page.tsx length**: ~100-150 lines (wrapper only)
- **Maximum content component length**: ~300-500 lines
- **If component exceeds limit**: Extract sub-components or custom hooks
- **Complex pages**: Break into multiple smaller components

### Commenting Standards

Use section comments for major areas:

```typescript
// ============================================================================
// Hooks & State
// ============================================================================

// ============================================================================
// Data Fetching & Effects
// ============================================================================

// ============================================================================
// Computed Values & Memoization
// ============================================================================

// ============================================================================
// Event Handlers
// ============================================================================

// ============================================================================
// Render Logic
// ============================================================================
```

**Reference Examples:**

- `app/page.tsx` - Lean page wrapper
- `app/reports/page.tsx` - Simple page structure
- `app/members/page.tsx` - Delegates to MembersContent

---

## Component Structure & Organization

**CRITICAL**: Components must be focused, readable, and properly organized.

### Component Structure

1. **Component Documentation**:

```typescript
/**
 * [Component Name] Component
 * [Brief description of component purpose]
 *
 * @param props - Component props with clear type definitions
 */
```

2. **Component Organization**:

```typescript
export default function ComponentName(props: ComponentProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [state, setState] = useState();
  const data = useCustomHook();

  // ============================================================================
  // Computed Values & Memoization
  // ============================================================================
  const computedValue = useMemo(() => {
    // Expensive computation
  }, [dependencies]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleAction = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    // JSX
  );
}
```

### File Length Guidelines

- **Maximum component length**: ~400-500 lines
- **If component exceeds limit**: Extract sub-components or custom hooks
- **Complex components**: Break into smaller, focused components
- **Each component**: Should have a single, clear responsibility

### Component Extraction Rules

**Extract sub-component when:**

- Component has multiple distinct sections
- Section is reusable elsewhere
- Section has its own state/logic
- Component is becoming hard to read

**Extract custom hook when:**

- Logic is reusable across components
- Multiple related state variables
- Complex data fetching logic
- Complex effect dependencies

---

## Code Organization & Extraction

### Breaking Down Large Files

When a file exceeds recommended length limits, extract code systematically:

1. **Identify distinct sections** - Look for logical groupings of code
2. **Extract to helpers** - Move data fetching and business logic
3. **Extract to hooks** - Move reusable stateful logic
4. **Extract to components** - Move UI sections into separate components
5. **Update imports** - Ensure all extracted code is properly imported

### Helper Function Extraction

**Extract to `lib/helpers/` when:**

- Function is longer than 20-30 lines
- Function contains complex business logic
- Function is reusable across multiple components/pages
- Function performs API calls or data fetching
- Function contains data transformation logic

**Keep in component/page when:**

- Function is component-specific and very small (< 10 lines)
- Function is a simple event handler
- Function is only used once in the component

### Custom Hook Extraction

**Extract to `lib/hooks/` when:**

- Multiple related state variables are used together
- Complex useEffect logic with multiple dependencies
- Reusable data fetching patterns
- Complex form state management
- Reusable UI interaction logic

**Example:**

```typescript
// ❌ BAD - Complex logic in component
function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 50+ lines of data fetching logic
  }, [dependencies]);

  // ... more complex logic
}

// ✅ GOOD - Extracted to custom hook
function MyComponent() {
  const { data, loading, error } = useMyData(dependencies);
  // Component focuses on rendering
}
```

---

## JSX Commenting & Spacing

**CRITICAL**: JSX should be easy to navigate and understand. Use comments and spacing strategically.

### Commenting in JSX

**Use comments to:**

- Mark major UI sections (headers, filters, tables, forms, modals)
- Explain complex conditional rendering
- Document non-obvious UI behavior
- Indicate where data comes from
- Mark responsive breakpoints

**Comment Format:**

```tsx
{
  /* ============================================================================
   Header Section: Title, actions, and navigation
   ============================================================================ */
}
<div className="header-section">
  {/* Page Title */}
  <h1>Page Title</h1>

  {/* Action Buttons: Create, Edit, Delete */}
  <div className="actions">
    <Button>Create</Button>
  </div>
</div>;

{
  /* ============================================================================
   Filters Section: Search, date filters, and sorting
   ============================================================================ */
}
<div className="filters-section">
  {/* Search Input */}
  <Input placeholder="Search..." />

  {/* Date Range Filter */}
  <DateRangePicker />
</div>;

{
  /* ============================================================================
   Data Display Section: Table or cards with pagination
   ============================================================================ */
}
<div className="data-section">
  {/* Loading State */}
  {loading && <SkeletonLoader />}

  {/* Data Table */}
  {!loading && <Table>{/* Table content */}</Table>}

  {/* Pagination Controls */}
  {!loading && totalPages > 1 && <PaginationControls />}
</div>;
```

### Spacing in JSX

**Use spacing to:**

- Separate major UI sections (add blank lines between sections)
- Group related elements together
- Make nested structures readable
- Highlight important sections

**Spacing Guidelines:**

```tsx
{
  /* Good spacing - easy to scan */
}
<div className="page-container">
  {/* Header Section */}
  <div className="header">
    <h1>Title</h1>
  </div>

  {/* Filters Section */}
  <div className="filters">
    <Input />
    <Select />
  </div>

  {/* Content Section */}
  <div className="content">
    <Table />
  </div>
</div>;

{
  /* Bad spacing - hard to scan */
}
<div className="page-container">
  <div className="header">
    <h1>Title</h1>
  </div>
  <div className="filters">
    <Input />
    <Select />
  </div>
  <div className="content">
    <Table />
  </div>
</div>;
```

### Section Comment Examples

```tsx
{/* Modal Components: All modals used by this page */}
<EditModal />
<DeleteModal />
<CreateModal />

{/* Main Content: Page layout with data display */}
<PageLayout>
  {/* Page Header: Title and action buttons */}
  <div className="header">
    {/* ... */}
  </div>

  {/* Filters: Search, date range, and sorting */}
  <div className="filters">
    {/* ... */}
  </div>

  {/* Data Display: Table or cards */}
  <div className="data-display">
    {/* Loading State: Show skeleton while fetching */}
    {loading && <SkeletonLoader />}

    {/* Error State: Show error message */}
    {error && <ErrorMessage />}

    {/* Success State: Show data */}
    {!loading && !error && <DataTable />}
  </div>

  {/* Pagination: Navigation controls */}
  {!loading && totalPages > 1 && (
    <PaginationControls />
  )}
</PageLayout>
```

---

## Helper Files Organization

### File Structure

```typescript
/**
 * [Feature Name] Helper Functions
 * [Brief description of what these helpers do]
 *
 * Features:
 * - Feature 1
 * - Feature 2
 */

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch [data type] from API
 * @param params - Query parameters
 * @returns Promise resolving to [data type]
 */
export async function fetchData(params: Params): Promise<DataType> {
  // Implementation
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Transform [data] to [format]
 * @param data - Raw data
 * @returns Transformed data
 */
export function transformData(data: RawData): TransformedData {
  // Implementation
}
```

### Naming Conventions

- Use descriptive function names: `fetchUserData`, `calculateTotals`, `formatCurrency`
- Group related functions in the same file
- Export functions that are used in multiple places
- Keep file focused on a single domain/feature

---

## Hook Files Organization

### File Structure

```typescript
/**
 * [Feature Name] Custom Hooks
 * [Brief description of what these hooks provide]
 *
 * Features:
 * - Feature 1
 * - Feature 2
 */

// ============================================================================
// Data Fetching Hooks
// ============================================================================

/**
 * Hook for fetching and managing [data type]
 * @param params - Query parameters
 * @returns Object with data, loading, error, and refetch function
 */
export function useData(params: Params) {
  // ============================================================================
  // State
  // ============================================================================
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    // Data fetching logic
  }, [params]);

  // ============================================================================
  // Return
  // ============================================================================
  return { data, loading, error, refetch };
}
```

### Hook Organization

- Group related hooks in the same file
- Use section comments to organize hook internals
- Export hooks that are reusable
- Keep hooks focused on a single responsibility

---

## Utils Files Organization

### File Structure

```typescript
/**
 * [Feature Name] Utility Functions
 * [Brief description of what these utilities do]
 *
 * Features:
 * - Feature 1
 * - Feature 2
 */

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format [data type] for display
 * @param value - Value to format
 * @returns Formatted string
 */
export function formatValue(value: Value): string {
  // Implementation
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate [data type]
 * @param value - Value to validate
 * @returns True if valid, false otherwise
 */
export function validateValue(value: Value): boolean {
  // Implementation
}
```

### Utils Guidelines

- Keep functions pure (no side effects)
- No network calls in utils
- Group related utilities together
- Use section comments to organize

---

## TypeScript Standards

### Type Definitions

- **Prefer `type` over `interface`** - Use consistently across codebase
- **No `any` types** - Create proper type definitions
- **No underscore prefixes** - Never prefix variables with `_` (except `_id` for MongoDB)
- **Type organization**:
  - Shared types → `shared/types/`
  - Frontend types → `lib/types/`
  - Import types from appropriate files

### Type Safety

```typescript
// ✅ GOOD - Proper typing
type UserData = {
  id: string;
  name: string;
  email: string;
};

function fetchUser(id: string): Promise<UserData> {
  // Implementation
}

// ❌ BAD - Using any
function fetchUser(id: any): Promise<any> {
  // Implementation
}
```

---

## Performance Optimization

### Memoization

- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to child components
- Memoize derived data that's used in multiple places

### Data Fetching

- Use custom hooks for data fetching with caching
- Implement proper loading states
- Handle errors gracefully
- Debounce search inputs

### Component Optimization

- Extract expensive components
- Use React.memo for components that receive stable props
- Avoid unnecessary re-renders

---

## File Length Guidelines Summary

| File Type            | Maximum Lines | Action if Exceeded                    |
| -------------------- | ------------- | ------------------------------------- |
| `page.tsx` (wrapper) | 100-150       | Extract content to separate component |
| Content Component    | 300-400       | Extract sub-components or hooks       |
| Regular Component    | 400-500       | Extract sub-components or hooks       |
| Helper File          | 500-600       | Split into multiple focused files     |
| Hook File            | 300-400       | Split into multiple hooks             |
| Util File            | 300-400       | Split into multiple util files        |

---

## Best Practices Checklist

### For Every Page.tsx File

- [ ] File-level JSDoc with description and features
- [ ] Thin wrapper component (100-150 lines max)
- [ ] Content component extracted if needed
- [ ] ProtectedRoute wrapper
- [ ] PageErrorBoundary wrapper
- [ ] Logic extracted to helpers/hooks
- [ ] Proper section comments

### For Every Component File

- [ ] Component JSDoc with description
- [ ] Proper section organization (hooks, state, computed, handlers, effects, render)
- [ ] Section comments for major areas
- [ ] JSX comments for UI sections
- [ ] Proper spacing between sections
- [ ] Extracted sub-components if >400-500 lines
- [ ] Proper TypeScript types (no `any`)

### For Every Helper/Hook/Util File

- [ ] File-level JSDoc with description
- [ ] Section comments for function groups
- [ ] Function-level comments for exported functions
- [ ] Proper TypeScript types
- [ ] Focused on single domain/feature

---

**Reference Examples:**

- `app/page.tsx` - Exemplary page wrapper
- `app/machines/page.tsx` - Well-structured page with extracted hooks
- `app/members/page.tsx` - Lean wrapper delegating to MembersContent
- `app/reports/page.tsx` - Lean wrapper delegating to ReportsContent
- `components/reports/tabs/LocationsTab.tsx` - Well-organized component

### Refactoring Checklist

When refactoring a page, ensure:

- [ ] File-level JSDoc added
- [ ] Page wrapper is lean (<150 lines)
- [ ] Content component extracted if needed
- [ ] Logic extracted to helpers/hooks
- [ ] Section comments added
- [ ] JSX comments added for major sections
- [ ] Proper spacing between sections
- [ ] All imports organized
- [ ] TypeScript types are proper (no `any`)
- [ ] File length is within guidelines
- [ ] Tracker updated in `FRONTEND_REFACTORING_TRACKER.md`

---

**Last Updated:** November 22, 2025
