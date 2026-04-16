---
name: Page & Component Structure
description: page.tsx thin wrappers, component organization with section comments, and JSX formatting patterns.
---

# Page & Component Structure

Use when **creating or refactoring page.tsx files and React components**.

## page.tsx Structure - THIN WRAPPER PATTERN

```typescript
/**
 * [Page Name] Page
 * [Brief description of the page]
 *
 * Features:
 * - Feature 1
 * - Feature 2
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

## Component Organization

**Required section comments:**

```typescript
/**
 * [Component Name] Component
 * [Brief description of component purpose]
 *
 * @param props - Component props with clear type definitions
 */
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

## JSX Commenting & Spacing

**Major sections use block comments:**

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
</div>

{/* Spacing between major sections */}

{
  /* ============================================================================
   Filters Section: Search, date range, and sorting controls
   ============================================================================ */
}
<div className="filters">
  {/* Search Input */}
  <SearchInput />

  {/* Date Range Picker */}
  <DateRangePicker />
</div>

{/* Data Display Section */}
{loading && <PageSkeleton />}
{error && <ErrorMessage />}
{!loading && !error && <DataTable />}
```

## Logic Extraction Rules

### Extract to `lib/helpers/` when:

- Data fetching logic (API calls)
- Complex state management
- Business logic calculations
- Data transformation
- Filter/search logic

```typescript
// lib/helpers/locations.ts
export async function fetchLocationData(params) {
  // Complex data fetching logic
}

// Component uses it
import { fetchLocationData } from '@/lib/helpers/locations';

function LocationsContent() {
  useEffect(() => {
    fetchLocationData(params).then(setData);
  }, [params]);
}
```

### Extract to Custom Hooks when:

- Reusable stateful logic
- Multiple related state variables
- Complex useEffect dependencies
- Data fetching with caching

```typescript
// lib/hooks/useLocationData.ts
export function useLocationData(params) {
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch logic
  }, [params]);

  return { data, loading };
}

// Component
function LocationsContent() {
  const { data, loading } = useLocationData(params);
}
```

### Extract to Sub-Components when:

- Reusable UI patterns
- Complex rendering logic
- Form handling
- Table/list rendering

```typescript
// components/LocationsTable.tsx
function LocationsTable({ locations, onEdit, onDelete }) {
  return (
    <table>
      {/* Table implementation */}
    </table>
  );
}

// Parent component
function LocationsContent() {
  return <LocationsTable locations={data} onEdit={handleEdit} onDelete={handleDelete} />;
}
```

## File Length Guidelines

- **page.tsx wrapper**: ~100-150 lines (thin wrapper only)
- **Content component**: ~300-400 lines max
- **Reusable component**: ~400-500 lines max
- **If exceeds**: Extract sub-components or custom hooks

## Responsive JSX Patterns

```tsx
{
  /* Desktop view: Table layout */
}
<div className="hidden md:block">
  <DataTable data={data} />
</div>

{
  /* Mobile view: Card layout */
}
<div className="md:hidden space-y-4">
  {data.map((item) => (
    <DataCard key={item.id} data={item} />
  ))}
</div>
```

## Conditional Rendering with Error Boundary

```tsx
{
  /* Loading State: Show skeleton while fetching */
}
{loading && <PageSkeleton />}

{
  /* Error State: Show error message */
}
{error && <ErrorMessage error={error} />}

{
  /* Success State: Show data */
}
{!loading && !error && (
  <>
    {/* Content here */}
  </>
)}
```

## Code Review Checklist

- ✅ page.tsx is thin wrapper only (<150 lines)
- ✅ Complex logic extracted to helpers or hooks
- ✅ Component has section comments
- ✅ Hooks, handlers, effects organized in order
- ✅ Render section is last
- ✅ JSX has meaningful comments for major sections
- ✅ No dense JSX blocks without spacing
- ✅ Responsive behavior marked with breakpoint comments
- ✅ Component under 500 lines
- ✅ Sub-components extracted if needed
