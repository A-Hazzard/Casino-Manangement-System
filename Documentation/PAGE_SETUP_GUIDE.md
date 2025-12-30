# Page Setup Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** December 30, 2025  
**Version:** 1.0.0

## Table of Contents

1. [Page Wrapper Patterns](#page-wrapper-patterns)
2. [Wrapper Components Explained](#wrapper-components-explained)
3. [When to Use Each Wrapper](#when-to-use-each-wrapper)
4. [Complete Page Setup Example](#complete-page-setup-example)
5. [Adding Charts to a New Page](#adding-charts-to-a-new-page)
6. [Common Patterns and Best Practices](#common-patterns-and-best-practices)

---

## Page Wrapper Patterns

### Standard Page Pattern

Every page in this application follows a consistent wrapper pattern:

```typescript
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageErrorBoundary>
        <PageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

### Pattern with Suspense

For pages that use async components or dynamic imports:

```typescript
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <Suspense fallback={<PageSkeleton />}>
        <PageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
```

### Combined Pattern (Most Common)

Many pages combine `PageErrorBoundary` and `Suspense`:

```typescript
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <PageContent />
        </Suspense>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

### Wrapper Order

**Important:** Wrappers must be nested in this order (outermost to innermost):

1. `ProtectedRoute` (outermost - handles authentication first)
2. `PageErrorBoundary` (catches errors from page content)
3. `Suspense` (handles async loading states)
4. `PageContent` (innermost - your actual page content)

---

## Wrapper Components Explained

### ProtectedRoute

**File:** `components/auth/ProtectedRoute.tsx`

**Purpose:** Handles authentication and authorization before rendering page content.

**What it does:**

- Checks if user is authenticated (redirects to `/login` if not)
- Validates user roles and permissions
- Checks page-specific access requirements
- Shows loading spinner while checking authentication
- Shows `NoRoleAssigned` message if user has no roles
- Redirects collector-only users to collection-report page

**Props:**

```typescript
type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdminAccess?: boolean; // Default: false
  requiredPage?: PageName; // Optional page permission
};
```

**Props Explained:**

- `children`: The page content to render if authorized
- `requireAdminAccess`: If `true`, only admin/developer roles can access
- `requiredPage`: Specific page permission required (e.g., "dashboard", "locations", "machines")

**When to use:**

- **Always** use for pages that require authentication
- Use `requireAdminAccess={true}` for admin-only pages (e.g., administration)
- Use `requiredPage` for pages with specific permission requirements

**Example:**

```typescript
// Dashboard - requires "dashboard" page permission
<ProtectedRoute requiredPage="dashboard">
  <DashboardContent />
</ProtectedRoute>

// Administration - requires admin/developer role
<ProtectedRoute requireAdminAccess={true}>
  <AdministrationContent />
</ProtectedRoute>

// Locations - requires "locations" page permission
<ProtectedRoute requiredPage="locations">
  <LocationsContent />
</ProtectedRoute>
```

**Available Page Names:**

- `"dashboard"` - Dashboard page
- `"locations"` - Locations page
- `"machines"` - Machines/Cabinets page
- `"members"` - Members page
- `"reports"` - Reports page
- `"administration"` - Administration page
- `"collection-report"` - Collection report page

**Behavior:**

- Shows loading spinner while checking authentication
- Redirects to `/login` if not authenticated
- Redirects to `/unauthorized` if user lacks required permissions
- Shows `NoRoleAssigned` component if user has no roles
- Allows access if all checks pass

**📖 For detailed authentication and authorization documentation, see:**

- `Documentation/AUTHENTICATION_AND_AUTHORIZATION_GUIDE.md` - Complete guide on role-based access control, setting up page permissions, and component-level access checks

---

### PageErrorBoundary

**File:** `components/ui/errors/PageErrorBoundary.tsx`

**Purpose:** Catches JavaScript errors in the page component tree and displays a user-friendly error UI.

**What it does:**

- Catches errors during rendering, lifecycle methods, and constructors
- Shows error UI with retry functionality
- Handles `ChunkLoadError` (code splitting errors) by reloading the page
- Logs errors for debugging
- Provides fallback UI option

**Props:**

```typescript
type PageErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional custom error UI
  onError?: (error: unknown) => void; // Optional error callback
};
```

**Props Explained:**

- `children`: The page content to wrap
- `fallback`: Custom error UI component (optional)
- `onError`: Callback function called when error occurs (optional)

**When to use:**

- **Always** use for pages that fetch data or have complex logic
- Use when you want graceful error handling
- Use when you want to prevent the entire app from crashing

**Example:**

```typescript
<PageErrorBoundary>
  <PageContent />
</PageErrorBoundary>

// With custom fallback
<PageErrorBoundary fallback={<CustomErrorUI />}>
  <PageContent />
</PageErrorBoundary>
```

**Error Handling:**

- Catches runtime errors (not syntax errors)
- Shows `ConnectionError` component by default
- Provides retry button
- Automatically reloads page for `ChunkLoadError`

**Limitations:**

- Does NOT catch errors in:
  - Event handlers (use try/catch)
  - Async code (use try/catch)
  - Server-side rendering
  - Error boundaries themselves

---

### Suspense

**Purpose:** React component that displays a fallback UI while child components are loading.

**What it does:**

- Shows fallback UI while async operations complete
- Works with React Server Components
- Works with `lazy()` loaded components
- Works with `use()` hook for promises
- Prevents layout shift during loading

**Props:**

```typescript
type SuspenseProps = {
  children: React.ReactNode;
  fallback: React.ReactNode; // Required - what to show while loading
};
```

**Props Explained:**

- `children`: Components that may suspend (async operations)
- `fallback`: UI to show while children are loading (usually a skeleton loader)

**When to use:**

- When using `lazy()` for code splitting
- When components use `use()` hook with promises
- When you want to show loading state for async data
- When using React Server Components with async data

**When NOT to use:**

- For client-side data fetching (use loading states instead)
- For components that don't suspend
- When you already have loading state management

**Example:**

```typescript
// With lazy-loaded component
const LazyComponent = lazy(() => import('./LazyComponent'));

<Suspense fallback={<ComponentSkeleton />}>
  <LazyComponent />
</Suspense>

// With async server component
<Suspense fallback={<PageSkeleton />}>
  <AsyncPageContent />
</Suspense>
```

**Best Practices:**

- Always provide a skeleton loader that matches the content layout
- Use page-specific skeletons (not generic loaders)
- Place `Suspense` as close as possible to the component that suspends

---

## When to Use Each Wrapper

### Decision Tree

```
Is this page public? (login, etc.)
├─ NO → Use ProtectedRoute
│   ├─ Does it need specific permissions?
│   │   ├─ YES → Use requiredPage prop
│   │   └─ NO → Just ProtectedRoute
│   │
│   ├─ Does it have complex logic/data fetching?
│   │   ├─ YES → Add PageErrorBoundary
│   │   └─ NO → Optional (but recommended)
│   │
│   └─ Does it use lazy() or async server components?
│       ├─ YES → Add Suspense
│       └─ NO → Don't use Suspense
│
└─ YES → Skip ProtectedRoute
    └─ Use PageErrorBoundary and Suspense as needed
```

### Common Patterns by Page Type

#### 1. Simple Protected Page (Dashboard, Locations)

```typescript
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageErrorBoundary>
        <PageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

**Use when:**

- Page requires authentication
- Page has specific permission requirements
- Page has data fetching that could fail
- Page doesn't use lazy loading

**Examples:**

- Dashboard (`app/page.tsx`)
- Locations (`app/locations/page.tsx`)

#### 2. Protected Page with Suspense (Cabinets, Members, Reports)

```typescript
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <Suspense fallback={<PageSkeleton />}>
        <PageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
```

**Use when:**

- Page requires authentication
- Page uses lazy-loaded components
- Page uses async server components
- You want to show skeleton during initial load

**Examples:**

- Cabinets (`app/cabinets/page.tsx`)
- Members (`app/members/page.tsx`)
- Reports (`app/reports/page.tsx`)

#### 3. Protected Page with Both (Administration)

```typescript
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <PageContent />
        </Suspense>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

**Use when:**

- Page requires authentication
- Page has complex error-prone logic
- Page uses lazy loading
- You want both error handling and loading states

**Examples:**

- Administration (`app/administration/page.tsx`)

#### 4. Public Page (Login)

```typescript
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}
```

**Use when:**

- Page is public (no authentication required)
- Page uses lazy loading or async components

**Examples:**

- Login (`app/(auth)/login/page.tsx`)

#### 5. Detail Page (Location Details, Cabinet Details)

```typescript
export default function DetailPage() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageContent />
    </ProtectedRoute>
  );
}
```

**Use when:**

- Page is a detail view (uses URL params)
- Page handles its own error states internally
- Page doesn't use lazy loading

**Examples:**

- Location Details (`app/locations/[slug]/page.tsx`)
- Cabinet Details (`app/cabinets/[slug]/page.tsx`)

---

## Complete Page Setup Example

### Step-by-Step: Creating a New Page

Let's create a new "Analytics" page as an example:

#### Step 1: Create the Page File

**File:** `app/analytics/page.tsx`

```typescript
'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
import { Suspense } from 'react';
import { AnalyticsPageSkeleton } from '@/components/ui/skeletons/AnalyticsSkeletons';

/**
 * Analytics Page Content Component
 * Handles all state management and data fetching for the analytics page
 */
function AnalyticsPageContent() {
  // Your page logic here
  return (
    <div>
      {/* Page content */}
    </div>
  );
}

/**
 * Analytics Page (Root Component)
 * Protected route wrapper with error boundary and suspense
 */
export default function AnalyticsPage() {
  return (
    <ProtectedRoute requiredPage="reports"> {/* Use appropriate page permission */}
      <PageErrorBoundary>
        <Suspense fallback={<AnalyticsPageSkeleton />}>
          <AnalyticsPageContent />
        </Suspense>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

#### Step 2: Create the Skeleton Loader

**File:** `components/ui/skeletons/AnalyticsSkeletons.tsx`

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" /> {/* Page title */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Match your actual page layout */}
    </div>
  );
}
```

#### Step 3: Add Page Permission (if needed)

**File:** `lib/utils/permissions.ts`

```typescript
export type PageName =
  | 'dashboard'
  | 'locations'
  | 'machines'
  | 'members'
  | 'reports'
  | 'administration'
  | 'collection-report'
  | 'analytics'; // Add new page name
```

---

## Adding Charts to a New Page

### Step-by-Step: Adding a Chart to Your Page

#### Step 1: Import Required Components and Hooks

```typescript
import Chart from '@/components/ui/dashboard/Chart';
import { useLocationChartData } from '@/lib/hooks/locations/useLocationChartData';
// OR for dashboard-style charts:
import { getMetrics } from '@/lib/helpers/metrics';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
```

#### Step 2: Set Up Chart State and Hooks

**Option A: Using Existing Chart Hook (Recommended)**

```typescript
function YourPageContent() {
  const { selectedLicencee, activeMetricsFilter, customDateRange } = useDashBoardStore();
  const { displayCurrency } = useCurrency();

  // Use existing hook if available
  const chartDataHook = useLocationChartData({
    locationId: 'your-location-id', // Or use appropriate hook
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    activeView: 'machines', // Or 'members' if applicable
  });

  return (
    <Chart
      loadingChartData={chartDataHook.loadingChartData}
      chartData={chartDataHook.chartData}
      activeMetricsFilter={activeMetricsFilter || ''}
      granularity={chartDataHook.chartGranularity}
    />
  );
}
```

**Option B: Custom Chart Implementation**

```typescript
function YourPageContent() {
  const { selectedLicencee, activeMetricsFilter, customDateRange } = useDashBoardStore();
  const { displayCurrency } = useCurrency();
  const makeChartRequest = useAbortableRequest();

  const [chartData, setChartData] = useState<dashboardData[]>([]);
  const [loadingChartData, setLoadingChartData] = useState(true);
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>('hourly');

  // Fetch chart data
  useEffect(() => {
    if (!activeMetricsFilter) return;

    makeChartRequest(async signal => {
      setLoadingChartData(true);
      try {
        const data = await getMetrics(
          activeMetricsFilter as TimePeriod,
          customDateRange?.startDate,
          customDateRange?.endDate,
          selectedLicencee,
          displayCurrency,
          signal,
          chartGranularity
        );
        setChartData(data);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Error fetching chart data:', error);
        setChartData([]);
      } finally {
        setLoadingChartData(false);
      }
    });
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    chartGranularity,
    makeChartRequest,
  ]);

  return (
    <Chart
      loadingChartData={loadingChartData}
      chartData={chartData}
      activeMetricsFilter={activeMetricsFilter || ''}
      granularity={chartGranularity}
    />
  );
}
```

#### Step 3: Add Date Filters (Optional)

```typescript
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';

function YourPageContent() {
  // ... chart setup ...

  return (
    <div>
      <DashboardDateFilters
        onCustomRangeGo={() => {/* refresh chart */}}
        hideAllTime={false}
        showQuarterly={true}
        enableTimeInputs={true}
      />

      <Chart
        loadingChartData={loadingChartData}
        chartData={chartData}
        activeMetricsFilter={activeMetricsFilter || ''}
        granularity={chartGranularity}
      />
    </div>
  );
}
```

#### Step 4: Add Granularity Selector (Optional)

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function YourPageContent() {
  // ... chart setup ...

  const showGranularitySelector = useMemo(() => {
    if (activeMetricsFilter === 'Today' || activeMetricsFilter === 'Yesterday') {
      return true;
    }
    if (activeMetricsFilter === 'Custom' && customDateRange?.startDate && customDateRange?.endDate) {
      const diffTime = Math.abs(
        new Date(customDateRange.endDate).getTime() -
        new Date(customDateRange.startDate).getTime()
      );
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return daysDiff <= 2;
    }
    return false;
  }, [activeMetricsFilter, customDateRange]);

  return (
    <div>
      {showGranularitySelector && (
        <Select
          value={chartGranularity}
          onValueChange={(value) => setChartGranularity(value as 'hourly' | 'minute')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="minute">Minute</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Chart
        loadingChartData={loadingChartData}
        chartData={chartData}
        activeMetricsFilter={activeMetricsFilter || ''}
        granularity={chartGranularity}
      />
    </div>
  );
}
```

#### Step 5: Complete Example

```typescript
'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import Chart from '@/components/ui/dashboard/Chart';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { getMetrics } from '@/lib/helpers/metrics';
import { isAbortError } from '@/lib/utils/errorHandling';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import type { dashboardData } from '@/lib/types';
import type { TimePeriod } from '@/shared/types/common';
import { useState, useEffect, useMemo } from 'react';

function AnalyticsPageContent() {
  const { selectedLicencee, activeMetricsFilter, customDateRange } = useDashBoardStore();
  const { displayCurrency } = useCurrency();
  const makeChartRequest = useAbortableRequest();

  const [chartData, setChartData] = useState<dashboardData[]>([]);
  const [loadingChartData, setLoadingChartData] = useState(true);
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    () => getDefaultChartGranularity(activeMetricsFilter || 'Today')
  );

  const showGranularitySelector = useMemo(() => {
    return activeMetricsFilter === 'Today' || activeMetricsFilter === 'Yesterday';
  }, [activeMetricsFilter]);

  useEffect(() => {
    if (!activeMetricsFilter) return;

    makeChartRequest(async signal => {
      setLoadingChartData(true);
      try {
        const data = await getMetrics(
          activeMetricsFilter as TimePeriod,
          customDateRange?.startDate,
          customDateRange?.endDate,
          selectedLicencee,
          displayCurrency,
          signal,
          chartGranularity
        );
        setChartData(data);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Error fetching chart data:', error);
        setChartData([]);
      } finally {
        setLoadingChartData(false);
      }
    });
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    chartGranularity,
    makeChartRequest,
  ]);

  return (
    <PageLayout
      headerProps={{
        selectedLicencee,
        setSelectedLicencee,
        disabled: loadingChartData,
      }}
      pageTitle="Analytics"
    >
      <div className="space-y-6">
        <DashboardDateFilters
          onCustomRangeGo={() => {/* Chart will auto-refresh via useEffect */}}
        />

        {showGranularitySelector && (
          <Select
            value={chartGranularity}
            onValueChange={(value) => setChartGranularity(value as 'hourly' | 'minute')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="minute">Minute</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Chart
          loadingChartData={loadingChartData}
          chartData={chartData}
          activeMetricsFilter={activeMetricsFilter || ''}
          granularity={chartGranularity}
        />
      </div>
    </PageLayout>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requiredPage="reports">
      <PageErrorBoundary>
        <AnalyticsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

---

## Common Patterns and Best Practices

### Pattern 1: Separating Page Wrapper from Content

**Why:** Keeps the page file lean and separates concerns.

```typescript
// ✅ GOOD - Separated wrapper and content
export default function PageName() {
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageErrorBoundary>
        <PageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}

function PageContent() {
  // All page logic here
}
```

```typescript
// ❌ BAD - All logic in wrapper
export default function PageName() {
  // All page logic mixed with wrapper
  return (
    <ProtectedRoute requiredPage="page-name">
      <PageErrorBoundary>
        {/* 500 lines of page logic */}
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

### Pattern 2: Using PageLayout

**Why:** Provides consistent page structure (header, sidebar, etc.).

```typescript
function PageContent() {
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  return (
    <PageLayout
      headerProps={{
        selectedLicencee,
        setSelectedLicencee,
        disabled: loading,
      }}
      pageTitle="Page Title"
      hideOptions={false}
      hideLicenceeFilter={false}
      mainClassName="flex flex-col flex-1 p-4 md:p-6"
      showToaster={true}
    >
      {/* Page content */}
    </PageLayout>
  );
}
```

### Pattern 3: Error Handling in Content Component

**Why:** Handle errors at the appropriate level.

```typescript
function PageContent() {
  const makeRequest = useAbortableRequest();

  useEffect(() => {
    makeRequest(async signal => {
      try {
        // Fetch data
      } catch (error) {
        // Handle abort errors silently
        if (isAbortError(error)) return;

        // Handle actual errors
        console.error('Error:', error);
        toast.error('Failed to load data');
      }
    });
  }, [makeRequest]);
}
```

### Pattern 4: Loading States

**Why:** Provide good UX during data fetching.

```typescript
function PageContent() {
  const [loading, setLoading] = useState(true);

  // Show skeleton while loading
  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

### Pattern 5: Conditional Rendering Based on Permissions

**Why:** Show/hide features based on user permissions.

```typescript
function PageContent() {
  const { user } = useUserStore();
  const canManage = useMemo(() => {
    const roles = user?.roles || [];
    return ['developer', 'admin', 'manager'].some(r => roles.includes(r));
  }, [user]);

  return (
    <div>
      {canManage && (
        <Button onClick={handleCreate}>Create New</Button>
      )}
    </div>
  );
}
```

---

## Wrapper Component Reference

### ProtectedRoute

**Import:**

```typescript
import ProtectedRoute from '@/components/auth/ProtectedRoute';
```

**Props:**

- `children: React.ReactNode` (required)
- `requireAdminAccess?: boolean` (default: `false`)
- `requiredPage?: PageName` (optional)

**Usage:**

```typescript
<ProtectedRoute requiredPage="dashboard">
  <YourContent />
</ProtectedRoute>
```

### PageErrorBoundary

**Import:**

```typescript
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
```

**Props:**

- `children: React.ReactNode` (required)
- `fallback?: React.ReactNode` (optional)
- `onError?: (error: unknown) => void` (optional)

**Usage:**

```typescript
<PageErrorBoundary>
  <YourContent />
</PageErrorBoundary>
```

### Suspense

**Import:**

```typescript
import { Suspense } from 'react';
```

**Props:**

- `children: React.ReactNode` (required)
- `fallback: React.ReactNode` (required)

**Usage:**

```typescript
<Suspense fallback={<Skeleton />}>
  <YourContent />
</Suspense>
```

---

## Quick Reference: Page Setup Checklist

When creating a new page, use this checklist:

- [ ] Create page file in `app/[page-name]/page.tsx`
- [ ] Add `'use client'` directive if using client-side features
- [ ] Wrap with `ProtectedRoute` (if page requires auth)
- [ ] Add `requiredPage` prop if page has specific permissions
- [ ] Add `PageErrorBoundary` for error handling
- [ ] Add `Suspense` if using lazy loading or async components
- [ ] Create page-specific skeleton loader
- [ ] Separate wrapper component from content component
- [ ] Use `PageLayout` for consistent structure
- [ ] Add proper loading states
- [ ] Handle abort errors in data fetching
- [ ] Add page permission to `PageName` type (if new)

---

## Additional Resources

### Related Documentation

- `Documentation/AUTHENTICATION_AND_AUTHORIZATION_GUIDE.md` - **Complete guide on authentication, role-based access control, and setting up page permissions**
- `Documentation/CHARTS_ARCHITECTURE_GUIDE.md` - Chart system architecture
- `Documentation/CHARTS_IMPLEMENTATION_GUIDE.md` - Chart implementation details
- `Documentation/frontend/pages/dashboard.md` - Dashboard page example
- `Documentation/frontend/pages/locations.md` - Locations page example

### Key Files Reference

**Wrapper Components:**

- `components/auth/ProtectedRoute.tsx` - Authentication wrapper
- `components/ui/errors/PageErrorBoundary.tsx` - Error boundary
- `components/layout/PageLayout.tsx` - Page layout component

**Utilities:**

- `lib/utils/permissions.ts` - Page permission utilities
- `lib/utils/errorHandling.ts` - Error handling utilities
- `lib/hooks/useAbortableRequest.ts` - Abort controller hook

**Chart Components:**

- `components/ui/dashboard/Chart.tsx` - Main chart component
- `lib/hooks/locations/useLocationChartData.ts` - Location chart hook
- `lib/helpers/metrics.ts` - Dashboard metrics helper
