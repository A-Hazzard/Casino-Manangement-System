---
name: Loading States & Skeleton Loaders
description: Content-specific skeleton loaders that exactly match real content layout. NEVER use generic spinners or "Loading..." text.
---

# Loading States & Skeleton Loaders

Use when **implementing loading states** for any page or component with async data.

## CRITICAL RULES

1. **EVERY async operation MUST use a specific skeleton loader**
2. **NEVER use generic "Loading..." text or spinners**
3. **Skeleton MUST exactly match actual content layout**
4. **Each page/section needs its own dedicated skeleton**
5. **Skeleton must match responsive behavior** (mobile + desktop)

## Skeleton Requirements

### Content-Specific Structure

```typescript
// ✅ CORRECT - Specific skeleton for Machines Overview
export const MachinesOverviewSkeleton = () => (
  <div className="space-y-6">
    {/* Machine Statistics Cards - exactly matching real layout */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="min-h-[120px]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Filters matching real filters */}
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
    </div>

    {/* Table header matching real table */}
    <div className="border rounded-lg">
      <div className="grid grid-cols-4 gap-4 p-4 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>

    {/* Pagination controls */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-10" />
        ))}
      </div>
    </div>
  </div>
);

// ❌ WRONG - Generic skeleton
export const GenericSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);
```

## File Organization

Create skeletons in `components/ui/skeletons/`:

```
components/ui/skeletons/
├── ReportsSkeletons.tsx      # Report page skeletons
├── LocationsSkeletons.tsx    # Locations page skeletons
├── CabinetsSkeletons.tsx     # Cabinets page skeletons
├── DashboardSkeletons.tsx    # Dashboard skeletons
└── [PageName]Skeletons.tsx   # Page-specific skeletons
```

### Export Multiple Skeletons from One File

```typescript
// components/ui/skeletons/ReportsSkeletons.tsx

export const ReportsPageSkeleton = () => (
  // Main page layout skeleton
);

export const LocationsTabSkeleton = () => (
  // Locations tab skeleton
);

export const MachinesTabSkeleton = () => (
  // Machines tab skeleton
);

export const MetersTabSkeleton = () => (
  // Meters tab skeleton
);
```

### Import Specific Skeletons

```typescript
import {
  ReportsPageSkeleton,
  LocationsTabSkeleton,
  MachinesTabSkeleton,
} from '@/components/ui/skeletons/ReportsSkeletons';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('locations');
  const { data: locationsData, loading: loadingLocations } = useLocationsData();

  return (
    <PageLayout>
      {activeTab === 'locations' && (
        loadingLocations ? <LocationsTabSkeleton /> : <LocationsTab data={locationsData} />
      )}
      {activeTab === 'machines' && (
        loadingMachines ? <MachinesTabSkeleton /> : <MachinesTab data={machinesData} />
      )}
    </PageLayout>
  );
}
```

## Implementation Checklist

### Visual Accuracy

- ✅ Exact same card/grid dimensions as real content
- ✅ Proper visual hierarchy with headers and descriptions
- ✅ All interactive elements represented (buttons, inputs, dropdowns)
- ✅ Status indicators included (badges, dots, colors)
- ✅ Pagination controls represented
- ✅ Form fields with proper heights

### Responsive Matching

```typescript
// Skeleton must match responsive real content

// ✅ Desktop: Table view
<div className="hidden md:block">
  {/* Table skeleton */}
</div>

// ✅ Mobile: Card view
<div className="md:hidden">
  {/* Card skeleton repeated */}
</div>
```

### Implementation Standards

1. **Use Shadcn Skeleton component** for all elements
2. **Use `animate-pulse` class** for shimmer effect
3. **Match text heights** to real content (`h-4` for body, `h-8` for headings)
4. **Include spacing** that matches real content (`space-y-4`, `gap-2`)
5. **Use `className` composition** for maintainability

```typescript
const cardSkeletonClass = "min-h-[120px]";
const textSkeletonClass = "h-4 w-full";
const headingSkeletonClass = "h-8 w-32";

export const CardSkeleton = () => (
  <Card className={cardSkeletonClass}>
    <CardContent className="p-6 space-y-3">
      <Skeleton className={headingSkeletonClass} />
      <Skeleton className={textSkeletonClass} />
      <Skeleton className={textSkeletonClass} />
    </CardContent>
  </Card>
);
```

## Common Violations - AVOID

❌ Using same `MainContentSkeleton` for different content types
❌ Generic "Loading..." text instead of skeleton
❌ Spinner in content area instead of skeleton
❌ Skeleton that doesn't match actual content layout
❌ Skeleton hidden behind sidebar
❌ Same skeleton for different pages/tabs
❌ Not matching responsive breakpoints

## Usage Pattern

```typescript
import { PageContentSkeleton } from '@/components/ui/skeletons/PageSkeletons';

function MyPage() {
  const { data, loading, error } = usePageData();

  // ✅ Show specific skeleton while loading
  if (loading) return <PageContentSkeleton />;

  // Handle error
  if (error) return <ErrorMessage error={error} />;

  // Show actual content
  return <PageContent data={data} />;
}
```

## Performance Considerations

- Keep skeletons lightweight (avoid expensive animations)
- Use CSS animations instead of JavaScript
- Don't render unnecessary elements in skeleton
- Match real content size to prevent layout shift

## Code Review Checklist

- ✅ Every async operation has a skeleton
- ✅ No "Loading..." text or generic spinners
- ✅ Skeleton matches real content layout exactly
- ✅ Skeleton in dedicated file in `components/ui/skeletons/`
- ✅ Named specifically (e.g., `LocationsTabSkeleton`, not `TabSkeleton`)
- ✅ Responsive behavior matches real content
- ✅ Uses Shadcn Skeleton component
- ✅ Proper spacing and dimensions
- ✅ Skeleton visible during loading (not hidden)
