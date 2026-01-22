/**
 * Machines Skeletons
 *
 * Skeleton components for Machines-related tabs and features
 *
 * Features:
 * - Machines Overview tab skeleton
 * - Machines Evaluation tab skeleton
 * - Machines Offline tab skeleton
 * - Machine hourly charts skeleton
 * - Top machines table skeleton
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { ChartSkeleton } from './CommonSkeletons';

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
      <div className="text-sm text-gray-500">
        <Skeleton className="h-4 w-64" />
      </div>
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
 * Skeleton component for Machines Overview tab
 * Matches the exact structure: metric cards, filters, table
 */
export const MachinesOverviewSkeleton = () => (
  <div className="space-y-4">
    {/* Statistics Cards */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-1 h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Filters */}
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
      <div className="w-full min-w-0 flex-1 md:max-w-none">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="w-full md:w-auto md:min-w-[200px] md:max-w-[280px]">
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-full md:w-40" />
    </div>

    {/* Machines Table */}
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="mb-1 h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  </div>
);

/**
 * Chart Skeleton with Sidebar
 * Matches the structure of Games/Manufacturer Performance charts with sidebar
 */
const ChartWithSidebarSkeleton = ({
  title,
  metricCount = 7,
}: {
  title: string;
  metricCount?: number;
}) => (
  <Card>
    <CardHeader>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <div className="relative w-full">
            <Skeleton className="absolute left-2.5 top-2.5 h-4 w-4" />
            <Skeleton className="h-9 w-full pl-9" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-6 pb-0 pt-0">
      {/* Metric selection checkboxes */}
      <div className="mb-4 overflow-x-auto border-b pb-3 md:mb-6 md:pb-4">
        <div className="flex min-w-max flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-x-6">
          {Array.from({ length: metricCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5 md:gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded md:h-4 md:w-4" />
              <Skeleton className="h-3 w-20 md:h-3 md:w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Filters */}
      <div className="mb-4 space-y-3 lg:hidden">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Sidebar */}
        <div className="hidden w-full shrink-0 space-y-4 lg:block lg:w-64 lg:space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-28" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex max-h-[450px] flex-col gap-3 overflow-y-auto pr-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="min-w-0 flex-1">
          <div className="relative touch-pan-x overflow-x-auto overflow-y-hidden">
            <div style={{ minWidth: '600px', width: '100%' }}>
              <div className="h-[600px] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton component for Machines Evaluation tab
 * Matches the exact structure of the actual component
 */
export const MachinesEvaluationSkeleton = () => (
  <div className="mt-2 space-y-6">
    {/* ============================================================================
       Filters & Actions
       ============================================================================ */}
    <div className="mb-6 flex flex-col items-center gap-4 md:flex-row">
      <div className="w-full md:w-[420px]">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* ============================================================================
       Summary Section
       ============================================================================ */}
    <div className="mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Handle Statement */}
            <div>
              <Skeleton className="mb-2 h-4 w-full max-w-2xl" />
              <button className="text-xs font-medium text-blue-600 hover:text-blue-800">
                <Skeleton className="h-3 w-40" />
              </button>
            </div>
            {/* Win Statement */}
            <div>
              <Skeleton className="mb-2 h-4 w-full max-w-2xl" />
              <button className="text-xs font-medium text-blue-600 hover:text-blue-800">
                <Skeleton className="h-3 w-40" />
              </button>
            </div>
            {/* Games Played Statement */}
            <div>
              <Skeleton className="mb-2 h-4 w-full max-w-2xl" />
              <button className="text-xs font-medium text-blue-600 hover:text-blue-800">
                <Skeleton className="h-3 w-40" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* ============================================================================
       Performance Charts
       ============================================================================ */}

    {/* Manufacturers Performance Chart */}
    <div className="mb-6">
      <ChartWithSidebarSkeleton
        title="Manufacturers' Performance"
        metricCount={7}
      />
    </div>

    {/* Games Performance Chart */}
    <div className="mb-6">
      <ChartWithSidebarSkeleton title="Games' Performance" metricCount={7} />
    </div>

    {/* Games Performance Revenue Chart */}
    <div className="mb-6">
      <ChartWithSidebarSkeleton
        title="Games' Performance Revenue"
        metricCount={3}
      />
    </div>

    {/* ============================================================================
       Top & Bottom Machines Tables
       ============================================================================ */}

    {/* Top 5 Machines Table */}
    <TopMachinesTableSkeleton />

    {/* Bottom 5 Machines Table */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <div className="text-sm text-gray-500">
          <Skeleton className="h-4 w-80" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View Skeleton - 7 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
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
                  <Skeleton className="mx-auto h-4 w-14" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center">
                    <div className="mx-auto flex items-center justify-center gap-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3.5 w-3.5 rounded" />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="mx-auto flex items-center justify-center gap-1.5">
                      <Skeleton className="h-4 w-24 font-mono" />
                      <Skeleton className="h-3.5 w-3.5 rounded" />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="mx-auto h-4 w-16" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="mx-auto h-4 w-12" />
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
              <div className="mb-3">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="block space-y-2 text-xs sm:hidden">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
              <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className={j === 5 ? 'col-span-2' : ''}>
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
 * Matches the exact structure: summary cards, filters, table
 */
export const MachinesOfflineSkeleton = () => (
  <div className="space-y-4">
    {/* Offline Summary Cards */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-1 h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Filters */}
    <div className="mb-6 flex flex-col items-center gap-4 md:flex-row">
      <div className="flex-1">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="w-full md:w-[420px]">
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-full md:w-40" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>

    {/* Offline Machines Table */}
    <Card>
      <CardHeader>
        <Skeleton className="mb-1 h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-32" />
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
      </CardContent>
    </Card>
  </div>
);

