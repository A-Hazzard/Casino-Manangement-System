/**
 * Reports Skeletons
 *
 * Central export file for all report-related skeleton components.
 * Re-exports from feature-specific skeleton files for better organization.
 *
 * This file maintains backward compatibility by re-exporting all skeletons
 * that were previously in this file, now organized by feature.
 */

'use client';

// Re-export common skeletons
export {
  SummaryCardsSkeleton,
  MetricCardsSkeleton,
  ChartNoData,
  ChartSkeleton,
} from './CommonSkeletons';

// Re-export dashboard skeletons
export {
  LocationMapSkeleton,
} from './DashboardSkeletons';

// Re-export machines skeletons
export {
  MachineHourlyChartsSkeleton,
  TopMachinesTableSkeleton,
  MachinesOverviewSkeleton,
  MachinesEvaluationSkeleton,
  MachinesOfflineSkeleton,
} from './MachinesSkeletons';

// Re-export locations skeletons
export {
  LocationsSASEvaluationSkeleton,
  LocationsRevenueAnalysisSkeleton,
} from './LocationsSkeletons';

// Re-export meters skeletons
export {
} from './MetersSkeletons';

/**
 * Skeleton component for main reports page
 */
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DashboardKPISkeleton,
  DashboardChartsSkeleton,
  LocationMapSkeleton,
} from './DashboardSkeletons';

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
