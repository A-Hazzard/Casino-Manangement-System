import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Specific skeleton component for Dashboard Financial Metrics Cards
 * Matches the exact layout of FinancialMetricsCards component
 * Uses the same grid structure as the actual component
 */
export const DashboardFinancialMetricsSkeleton = () => (
  <div className="flex flex-col md:flex-row gap-4 w-full">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px]"
      >
        <div className="flex-1 flex flex-col justify-center">
            <Skeleton className="h-4 w-5/6 mx-auto mb-2" />
            <div className="w-full h-[4px] rounded-full my-2 bg-gray-200" />
            <div className="flex-1 flex items-center justify-center">
                <Skeleton className="h-8 w-4/5 mx-auto" />
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
  <div className="bg-container p-6 rounded-lg shadow-md flex-1">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="w-full h-[320px] bg-gray-200 rounded-md animate-pulse" />
  </div>
);

/**
 * Specific skeleton component for Dashboard Top Performing section
 * Matches the exact layout of the top performing data display
 */
export const DashboardTopPerformingSkeleton = () => (
  <div className="bg-container rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
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
  <div className="bg-container rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/2">
        <div className="w-full h-[300px] bg-gray-200 rounded-md animate-pulse" />
      </div>
      <div className="w-full lg:w-1/2 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
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
  <div className="bg-container rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 bg-gray-50 rounded-lg">
          <Skeleton className="h-4 w-32 mb-2" />
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
  <div className="flex items-center gap-2 bg-gray-200 rounded-md px-4 py-2">
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-4 w-16" />
  </div>
);
