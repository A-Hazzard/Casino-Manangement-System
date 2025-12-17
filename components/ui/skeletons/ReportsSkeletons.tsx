import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';

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
 * Note: This component does NOT include its own grid wrapper since it's rendered
 * inside a grid container. It just returns the individual chart skeletons.
 */
export const MachineHourlyChartsSkeleton = () => (
  <>
    {/* Granularity Selector Skeleton */}
    <div className="flex items-center justify-end gap-2">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-9 w-32" />
    </div>

    {/* Charts Grid Skeleton */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <ChartSkeleton key={i} />
      ))}
    </div>
  </>
);

/**
 * Skeleton component for revenue analysis charts grid
 * Note: This component does NOT include its own grid wrapper since it's rendered
 * inside a grid container. It just returns the individual chart skeletons.
 */
export const RevenueAnalysisChartsSkeleton = () => (
  <>
    {/* Granularity Selector Skeleton */}
    <div className="flex items-center justify-end gap-2">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-9 w-32" />
    </div>

    {/* Charts Grid Skeleton - 3 columns */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <ChartSkeleton key={i} />
      ))}
    </div>
  </>
);

/**
 * Skeleton component for top machines table
 * Matches the exact structure of the Top 5 Machines table
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
      {/* Desktop Table View Skeleton */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {/* 11 columns matching the actual table */}
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-12" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-14" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-24" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="w-18 mx-auto h-4" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-24" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                {/* Location column - with link icon */}
                <td className="p-3 text-center">
                  <div className="mx-auto flex items-center justify-center gap-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3.5 w-3.5 rounded" />
                  </div>
                </td>
                {/* Machine column - with link icon */}
                <td className="p-3 text-center">
                  <div className="mx-auto flex items-center justify-center gap-1.5">
                    <Skeleton className="h-4 w-24 font-mono" />
                    <Skeleton className="h-3.5 w-3.5 rounded" />
                  </div>
                </td>
                {/* Game column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                {/* Manufacturer column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </td>
                {/* Money In column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                {/* Win/Loss column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                {/* Jackpot column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </td>
                {/* Avg. Wag. per Game column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </td>
                {/* Actual Hold column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-12" />
                </td>
                {/* Theoretical Hold column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-12" />
                </td>
                {/* Games Played column */}
                <td className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View Skeleton */}
      <div className="space-y-4 md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            {/* Card Header - Machine name and location/game */}
            <div className="mb-3">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>

            {/* Tiny screen layout (< 425px) - Single column with flex justify-between */}
            <div className="block space-y-2 text-xs sm:hidden">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>

            {/* Small screen layout (425px+) - Two columns grid */}
            <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className={j === 6 ? 'col-span-2' : ''}>
                  <Skeleton className="mb-1 h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ))}
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
 * Skeleton component for Machines Overview tab - TABLE ONLY
 * Note: Metric cards and filters are rendered separately above/before this skeleton
 */
export const MachinesOverviewSkeleton = () => (
  <div className="space-y-3">
    {/* Desktop table skeleton - matches actual table structure (8 columns) */}
    <div className="hidden md:block">
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </th>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </th>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </th>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </th>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </th>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </th>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </th>
                <th className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="mx-auto h-5 w-16" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-8 w-16" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    {/* Mobile cards skeleton - matches actual mobile card structure */}
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="mb-3 flex min-w-0 items-start justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          {/* Tiny screen layout skeleton */}
          <div className="block space-y-2 text-xs sm:hidden">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          {/* Small screen layout skeleton (425px+) - Two columns */}
          <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
            <div>
              <Skeleton className="mb-1 h-3 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-2">
              <Skeleton className="mb-1 h-3 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
    {/* Pagination skeleton */}
    <div className="flex items-center justify-between pt-4">
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
 * Note: Filters are rendered separately above this skeleton
 */
export const MachinesEvaluationSkeleton = () => (
  <div className="space-y-6">
    {/* Manufacturers Performance Chart */}
    <div className="mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Manufacturers Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Chart area with proper spacing matching actual chart */}
          <div className="w-full" style={{ height: '450px' }}>
            {/* Y-axis label area */}
            <div className="mb-2 flex items-center">
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Chart bars area - grouped bars */}
            <div className="flex h-[350px] items-end gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-1 items-end gap-0.5">
                  {/* Multiple bars per manufacturer - grouped together */}
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton
                      key={j}
                      className="w-full"
                      style={{
                        height: `${[40, 35, 30, 25, 20, 15, 45][j]}%`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* X-axis labels area */}
            <div className="mt-4 flex justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>
            {/* Legend area */}
            <div className="mt-4 flex flex-wrap gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Summary Section */}
    <div className="mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-center">
            <Skeleton className="mx-auto h-5 w-64" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <Skeleton className="mx-auto mb-2 h-4 w-32" />
                <Skeleton className="mx-auto h-6 w-16" />
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <Skeleton className="mx-auto mb-2 h-4 w-24" />
                <Skeleton className="mx-auto h-6 w-16" />
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <Skeleton className="mx-auto mb-2 h-4 w-40" />
                <Skeleton className="mx-auto h-6 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Games Performance Chart */}
    <div className="mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Games Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Chart area with proper spacing matching actual chart */}
          <div className="w-full" style={{ height: '450px' }}>
            {/* Y-axis label area */}
            <div className="mb-2 flex items-center">
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Chart bars area - grouped bars */}
            <div className="flex h-[350px] items-end gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-1 items-end gap-0.5">
                  {/* Multiple bars per game - grouped together */}
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton
                      key={j}
                      className="w-full"
                      style={{
                        height: `${[40, 35, 30, 25, 20, 15, 45][j]}%`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* X-axis labels area */}
            <div className="mt-4 flex justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
            {/* Legend area */}
            <div className="mt-4 flex flex-wrap gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Games Performance Revenue Chart */}
    <div className="mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Games Performance Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Chart area with proper spacing matching actual chart */}
          <div className="w-full" style={{ height: '450px' }}>
            {/* Y-axis label area */}
            <div className="mb-2 flex items-center">
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Chart bars area - grouped bars */}
            <div className="flex h-[350px] items-end gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-1 items-end gap-0.5">
                  {/* Multiple bars per game - grouped together */}
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton
                      key={j}
                      className="w-full"
                      style={{
                        height: `${[50, 40, 45][j]}%`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* X-axis labels area */}
            <div className="mt-4 flex justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
            {/* Legend area */}
            <div className="mt-4 flex flex-wrap gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Top 5 Machines Table */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table skeleton - 11 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                {Array.from({ length: 11 }).map((_, i) => (
                  <th key={i} className="p-3">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="p-3">
                      <Skeleton className="mx-auto h-4 w-16" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards skeleton */}
        <div className="space-y-4 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="mb-3">
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              {/* Tiny screen layout skeleton */}
              <div className="block space-y-2 text-xs sm:hidden">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
              {/* Small screen layout skeleton */}
              <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className={j === 6 ? 'col-span-2' : ''}>
                    <Skeleton className="mb-1 h-3 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Skeleton component for Machines Offline tab
 * Note: Filters are rendered separately above this skeleton
 */
export const MachinesOfflineSkeleton = () => (
  <div className="space-y-4">
    {/* Offline Badge */}
    <div className="mb-4">
      <Skeleton className="h-6 w-40" />
    </div>

    {/* Desktop Table View - 5 columns */}
    <div className="hidden rounded-md border md:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-24" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-28" />
              </th>
              <th className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <div>
                    <Skeleton className="mb-1 h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </td>
                <td className="p-3">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="p-3">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="p-3">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="p-3">
                  <Skeleton className="h-8 w-16" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Mobile Card View */}
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="mb-3">
            <div className="flex items-start justify-between">
              <div>
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
          {/* Tiny screen layout skeleton */}
          <div className="block space-y-2 text-xs sm:hidden">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          {/* Small screen layout skeleton */}
          <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
            <div>
              <Skeleton className="mb-1 h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>

    {/* Pagination */}
    <div className="flex items-center justify-between pt-4">
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
 * Note: Metric cards are rendered separately above this skeleton
 */
export const LocationsOverviewSkeleton = () => (
  <div className="space-y-6">
    {/* Interactive Map - Full width */}
    <div className="w-full overflow-hidden rounded-lg border border-gray-200">
      <Skeleton className="h-[400px] w-full" />
    </div>

    {/* Location Overview Table - 7 columns */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </CardTitle>
            <div className="text-sm text-gray-500">
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table skeleton - 7 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="mx-auto h-4 w-20" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards skeleton */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="mb-3 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
              <div className="space-y-2 border-t border-gray-100 pt-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Pagination skeleton */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Skeleton component for Locations SAS Evaluation tab
 * Note: Location selector is rendered separately above this skeleton
 */
export const LocationsSASEvaluationSkeleton = () => (
  <div className="space-y-6">
    {/* Enhanced Location Table - 9 columns */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <div className="text-sm text-gray-500">
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table skeleton - 9 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {Array.from({ length: 9 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="mx-auto h-4 w-20" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards skeleton - EnhancedLocationTable has mobile view */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Summary Cards (when multiple locations selected) */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="mb-2 h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Machine Hourly Charts */}
    <MachineHourlyChartsSkeleton />

    {/* Top 5 Machines Table - 11 columns */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table skeleton - 11 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                {Array.from({ length: 11 }).map((_, i) => (
                  <th key={i} className="p-3">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="p-3">
                      <Skeleton className="mx-auto h-4 w-16" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards skeleton */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Skeleton component for Locations Revenue Analysis tab
 * Note: Location selector is rendered separately above this skeleton
 */
export const LocationsRevenueAnalysisSkeleton = () => (
  <div className="space-y-6">
    {/* Revenue Analysis Table - 5 columns */}
    <Card>
      <CardContent className="p-6">
        {/* Search and Controls skeleton */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <Skeleton className="h-10 flex-1" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {/* Desktop table skeleton - 5 columns */}
        <div className="hidden lg:block">
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="p-3">
                      <Skeleton className="mx-auto h-4 w-24" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="p-3">
                        <Skeleton className="mx-auto h-4 w-20" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Mobile cards skeleton */}
        <div className="space-y-4 lg:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Summary Cards (when multiple locations selected) */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="mb-2 h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Revenue Analysis Charts */}
    <RevenueAnalysisChartsSkeleton />

    {/* Top 5 Machines Table - 11 columns */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </CardTitle>
        <div className="text-sm text-gray-500">
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table skeleton - 11 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                {Array.from({ length: 11 }).map((_, i) => (
                  <th key={i} className="p-3">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="p-3">
                      <Skeleton className="mx-auto h-4 w-16" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards skeleton */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
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
                      <Skeleton className="mx-auto h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        <Skeleton className="mx-auto h-4 w-16" />
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
            <div
              key={i}
              className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm"
            >
              {/* Header skeleton */}
              <div className="mb-4 flex flex-col border-b border-gray-100 pb-3">
                <Skeleton className="mb-2 h-6 w-24 rounded-lg" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
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
              <div className="mt-4 border-t border-gray-100 pt-4">
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
