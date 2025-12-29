import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Specific skeleton component for Dashboard Financial Metrics Cards
 * Matches the exact layout of FinancialMetricsCards component
 * Uses the same grid structure as the actual component
 */
export const DashboardFinancialMetricsSkeleton = () => (
  <div className="flex w-full flex-col gap-4 md:flex-row">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="flex min-h-[120px] flex-1 flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6"
      >
        <div className="flex flex-1 flex-col justify-center">
          <Skeleton className="mx-auto mb-2 h-4 w-5/6" />
          <div className="my-2 h-[4px] w-full rounded-full bg-gray-200" />
          <div className="flex flex-1 items-center justify-center">
            <Skeleton className="mx-auto h-8 w-4/5" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Specific skeleton component for Dashboard Chart
 * Matches the exact layout of the Chart component
 */
export const DashboardChartSkeleton = () => (
  <div className="flex-1 rounded-lg bg-container p-6 shadow-md">
    <div className="mb-4 flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="h-[320px] w-full animate-pulse rounded-md bg-gray-200" />
  </div>
);

/**
 * Specific skeleton component for Dashboard Top Performing section
 * Matches the exact layout of the top performing data display with tabs, list, and pie chart
 */
export const DashboardTopPerformingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-40" />
    </div>

    {/* Tabs skeleton - matches the actual tab structure */}
    <div className="relative flex w-full flex-col rounded-lg rounded-tl-3xl rounded-tr-3xl bg-container shadow-md">
      <div className="flex">
        <div className="w-full rounded-tl-xl rounded-tr-3xl bg-gray-100 px-4 py-2">
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="w-full rounded-tr-3xl bg-gray-100 px-4 py-2">
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      {/* Content area skeleton - matches the two-column layout (list + pie chart) */}
      <div className="mb-0 rounded-lg rounded-tl-none rounded-tr-3xl bg-container p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
          {/* Left side - List skeleton */}
          <ul className="flex-1 space-y-2 lg:min-w-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Skeleton className="h-4 w-4 flex-shrink-0 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
              </li>
            ))}
          </ul>
          {/* Right side - Pie chart skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for dashboard KPI cards
 */
export const DashboardKPISkeleton = () => (
  <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </Card>
    ))}
  </div>
);

/**
 * Skeleton component for dashboard charts section
 */
export const DashboardChartsSkeleton = () => (
  <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-28" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  </div>
);

/**
 * Skeleton component for location map
 */
export const LocationMapSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-24" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </CardContent>
  </Card>
);
