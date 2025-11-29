import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-20" />
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <div className="h-[300px] w-full p-6">
        <Skeleton className="h-full w-full" />
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
  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <MetricCardSkeleton key={index} />
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
 * Skeleton component for machine hourly charts grid
 */
export const MachineHourlyChartsSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <ChartSkeleton key={i} />
    ))}
  </div>
);

/**
 * Skeleton component for revenue analysis charts grid
 */
export const RevenueAnalysisChartsSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <ChartSkeleton key={i} />
    ))}
  </div>
);

/**
 * Skeleton component for top machines table
 */
export const TopMachinesTableSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Desktop table skeleton */}
        <div className="hidden md:block">
          <div className="mb-3 h-10 animate-pulse rounded bg-gray-200" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="mb-2 h-12 animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
        {/* Mobile cards skeleton */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
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

/**
 * Skeleton component for meters table with filters
 */
export const MetersTableSkeleton = () => (
  <div className="space-y-6">
    {/* Filters skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>

    {/* Table skeleton */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Pagination skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for main reports page
 */
export const ReportsPageSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-8" />
    </div>

    {/* Date filters skeleton */}
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>

    {/* Navigation skeleton */}
    <div className="flex gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-24" />
      ))}
    </div>

    {/* Tab content skeleton */}
    <div className="space-y-6">
      <DashboardKPISkeleton />
      <DashboardChartsSkeleton />
      <LocationMapSkeleton />
    </div>
  </div>
);

/**
 * Skeleton component for Machines Overview tab
 */
export const MachinesOverviewSkeleton = () => (
  <div className="space-y-6">
    {/* Machine Statistics Cards */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

    {/* Filters and Search */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>

    {/* Table */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Pagination */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for Machines Evaluation tab
 */
export const MachinesEvaluationSkeleton = () => (
  <div className="space-y-6">
    {/* Location Selector */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Manufacturers Performance Chart */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>

    {/* Top 5 Machines Table */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Skeleton component for Machines Offline tab
 */
export const MachinesOfflineSkeleton = () => (
  <div className="space-y-6">
    {/* Header with offline indicator */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full bg-red-200" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-24" />
    </div>

    {/* Location Selector */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>

    {/* Search and Filters */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>

    {/* Offline Machines Table */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-4 rounded-full bg-red-200" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Pagination */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for Locations Overview tab
 */
export const LocationsOverviewSkeleton = () => (
  <div className="space-y-6">
    {/* Metrics Overview Cards */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Top Locations Table */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Pagination */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for Locations SAS Evaluation tab
 */
export const LocationsSASEvaluationSkeleton = () => (
  <div className="space-y-6">
    {/* Location Selector */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Summary Cards (when multiple locations selected) */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Machine Hourly Charts */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
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
      ))}
    </div>

    {/* Top Machines Table */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Skeleton component for Locations Revenue Analysis tab
 */
export const LocationsRevenueAnalysisSkeleton = () => (
  <div className="space-y-6">
    {/* Location Selector */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Summary Cards (when multiple locations selected) */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Revenue Analysis Charts */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
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
      ))}
    </div>

    {/* Top Machines Table */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Skeleton component for Meters tab
 * Matches the actual layout: Header, Location Selection card with two columns, Meters Export Report card
 */
export const MetersTabSkeleton = () => (
  <div className="space-y-6">
    {/* Header with Export Buttons */}
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* Location Selection & Controls Card */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-64" />
        </div>
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left Column: Location Selection Controls */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>

          {/* Right Column: simple placeholder (inline chart skeleton lives in MetersTab) */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Meters Export Report Card */}
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent>
        {/* Hourly Charts Skeleton - Matches MetersHourlyCharts loading state */}
        <div className="mb-6 space-y-4">
          {/* Games Played - Full Width Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          {/* Coin In and Coin Out - Side by Side Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Search bar skeleton */}
        <div className="mb-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>

            {/* Desktop table skeleton with proper column structure - lg and above */}
            <div className="hidden min-w-0 overflow-x-auto lg:block">
          <div className="min-w-full">
            <table className="w-full min-w-[800px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        <Skeleton className="h-4 w-16 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards skeleton - md and below (2x2 grid on md, single column on mobile) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
              {/* Header skeleton */}
              <div className="mb-4 flex flex-col border-b border-gray-100 pb-3">
                <Skeleton className="mb-2 h-6 w-24 rounded-lg" />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
              {/* Metrics grid skeleton */}
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="rounded-lg bg-white p-3 shadow-sm">
                    <Skeleton className="mb-1 h-3 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
                <div className="col-span-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-sm">
                  <Skeleton className="mb-1 h-3 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
              {/* View Machine button skeleton */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="mt-6 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
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
