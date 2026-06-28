/**
 * Locations Skeletons
 *
 * Skeleton components for Locations-related tabs and features
 *
 * Features:
 * - Locations Overview tab skeleton
 * - Locations SAS Evaluation tab skeleton
 * - Locations Revenue Analysis tab skeleton
 * - Revenue analysis charts skeleton
 */

'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { ChartSkeleton } from './CommonSkeletons';
import { ReportsLocationCardSkeleton } from '@/components/CMS/reports/common/ReportsLocationCard';
import { ReportsLocationsSummaryMetricsSkeleton } from '@/components/CMS/reports/common/ReportsLocationsSummaryMetrics';
import { ReportsMachineCardSkeleton } from '@/components/CMS/reports/common/ReportsMachineCard';
import {
  MachineHourlyChartsSkeleton,
  TopMachinesTableSkeleton,
} from './MachinesSkeletons';

/**
 * Skeleton component for revenue analysis charts grid
 * Note: This component does NOT include its own grid wrapper since it's rendered
 * inside a grid container. It just returns the individual chart skeletons.
 */
const RevenueAnalysisChartsSkeleton = () => (
  <>
    {/* Granularity Selector Skeleton */}
    <div className="flex items-center justify-end gap-2">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-9 w-32" />
    </div>

    {/* Charts Grid Skeleton - 3 columns */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <ChartSkeleton key={index} />
      ))}
    </div>
  </>
);

/**
 * Skeleton component for Locations SAS Evaluation tab
 * Note: Location selector is rendered separately above this skeleton
 */
export const LocationsSASEvaluationSkeleton = () => (
  <div className="space-y-6">
    {/* Enhanced Location Table - 12 columns */}
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
        {/* Desktop table skeleton - 12 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {Array.from({ length: 12 }).map((_, index) => (
                  <th key={index} className="px-4 py-3">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {Array.from({ length: 12 }).map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-3">
                      <Skeleton className="mx-auto h-4 w-20" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards skeleton */}
        <div className="md:hidden">
          <ReportsLocationCardSkeleton count={5} />
        </div>
        {/* Pagination skeleton */}
        <div className="mt-4 flex items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </CardContent>
    </Card>

    {/* Summary Cards (when multiple locations selected) */}
    <ReportsLocationsSummaryMetricsSkeleton />

    {/* Machine Hourly Charts */}
    <MachineHourlyChartsSkeleton />

    {/* Top 5 Machines Table - 11 columns */}
    <TopMachinesTableSkeleton />
  </div>
);

/**
 * Skeleton component for Locations Revenue Analysis tab
 * Note: Location selector is rendered separately above this skeleton
 */
export const LocationsRevenueAnalysisSkeleton = () => (
  <div className="space-y-6">
    {/* Revenue Analysis Table - 10 columns */}
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
        {/* Desktop table skeleton - 10 columns */}
        <div className="hidden lg:block">
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <th key={index} className="p-3">
                      <Skeleton className="mx-auto h-4 w-24" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {Array.from({ length: 10 }).map((_, colIndex) => (
                      <td key={colIndex} className="p-3">
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
        <div className="lg:hidden">
          <ReportsLocationCardSkeleton count={6} />
        </div>
        {/* Pagination skeleton */}
        <div className="mt-4 flex items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </CardContent>
    </Card>

    {/* Summary Cards (when multiple locations selected) */}
    <ReportsLocationsSummaryMetricsSkeleton />

    {/* Revenue Analysis Charts */}
    <RevenueAnalysisChartsSkeleton />

    {/* Top 5 Machines Table - 13 columns */}
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
        {/* Desktop table skeleton - 13 columns */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                {Array.from({ length: 13 }).map((_, index) => (
                  <th key={index} className="p-3">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  {Array.from({ length: 13 }).map((_, colIndex) => (
                    <td key={colIndex} className="p-3">
                      <Skeleton className="mx-auto h-4 w-16" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards skeleton */}
        <div className="md:hidden">
          <ReportsMachineCardSkeleton count={5} />
        </div>
      </CardContent>
    </Card>
  </div>
);
