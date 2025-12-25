/**
 * Common Skeletons
 *
 * Shared skeleton components used across multiple features
 *
 * Features:
 * - Table skeletons
 * - Chart skeletons
 * - Card skeletons
 * - Metric card skeletons
 * - Dropdown skeletons
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton component for location evaluation tables
 */
export const TableSkeleton = () => (
  <div className="space-y-3">
    {/* Header skeleton */}
    <div className="h-10 animate-pulse rounded bg-gray-200" />
    {/* Row skeletons */}
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
    ))}
  </div>
);

/**
 * Skeleton component for chart loading state
 */
export const ChartSkeleton = () => (
  <Card className="w-full">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-20" />
      </CardTitle>
    </CardHeader>
    <CardContent className="w-full">
      <div className="w-full overflow-x-auto">
        <div style={{ width: '100%' }}>
          <Skeleton className="h-[380px] w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton component for summary metrics cards
 */
export const CardSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="animate-pulse space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton component for metric cards (like dashboard stat cards)
 */
export const MetricCardSkeleton = () => (
  <div className="w-full rounded-lg bg-white px-4 py-6 shadow-md">
    <div className="mx-auto h-6 w-1/3 animate-pulse rounded bg-gray-200"></div>
  </div>
);

/**
 * Skeleton component for multiple metric cards
 */
export const MetricCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/**
 * Skeleton component for location selection dropdowns
 */
export const DropdownSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-10 w-full" />
    <div className="space-y-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  </div>
);

/**
 * Skeleton component for summary cards grid
 */
export const SummaryCardsSkeleton = () => (
  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Skeleton component for location selection section
 */
export const LocationSelectionSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    <DropdownSkeleton />
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

/**
 * Skeleton component for the main content area when loading
 */
export const MainContentSkeleton = () => (
  <div className="space-y-6">
    {/* Location selection skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <LocationSelectionSkeleton />
      </CardContent>
    </Card>

    {/* Summary cards skeleton */}
    <MetricCardsSkeleton count={4} />

    {/* Charts skeleton */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <TableSkeleton />
      </CardContent>
    </Card>
  </div>
);

/**
 * Component for charts with no data
 */
export const ChartNoData = ({
  title,
  icon,
  message,
}: {
  title: string;
  icon: React.ReactNode;
  message: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 text-gray-400">{icon}</div>
        <div className="mb-2 text-lg text-gray-500">No Data Available</div>
        <div className="text-sm text-gray-400">{message}</div>
      </div>
    </CardContent>
  </Card>
);

