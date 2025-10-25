import React from 'react';
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
 * Matches the exact layout of the top performing data display
 */
export const DashboardTopPerformingSkeleton = () => (
  <div className="rounded-lg bg-container p-6 shadow-md">
    <div className="mb-4 flex items-center justify-between">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="mb-1 h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Specific skeleton component for Dashboard Pie Chart
 * Matches the exact layout of the pie chart section
 */
export const DashboardPieChartSkeleton = () => (
  <div className="rounded-lg bg-container p-6 shadow-md">
    <div className="mb-4 flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full lg:w-1/2">
        <div className="h-[300px] w-full animate-pulse rounded-md bg-gray-200" />
      </div>
      <div className="w-full space-y-3 lg:w-1/2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Specific skeleton component for Dashboard Gaming Locations
 * Matches the exact layout of the gaming locations display
 */
export const DashboardGamingLocationsSkeleton = () => (
  <div className="rounded-lg bg-container p-6 shadow-md">
    <div className="mb-4 flex items-center justify-between">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-gray-50 p-4">
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Specific skeleton component for Dashboard Date Filters
 * Matches the exact layout of the date filter buttons
 */
export const DashboardDateFiltersSkeleton = () => (
  <div className="flex flex-wrap items-center gap-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-8 w-20 rounded-full" />
    ))}
  </div>
);

/**
 * Specific skeleton component for Dashboard Refresh Button
 * Matches the exact layout of the refresh button
 */
export const DashboardRefreshButtonSkeleton = () => (
  <div className="flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2">
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-4 w-16" />
  </div>
);
