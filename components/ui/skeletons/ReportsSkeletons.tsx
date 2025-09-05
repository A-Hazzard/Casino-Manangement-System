import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Skeleton component for location evaluation tables
 */
export const TableSkeleton = () => (
  <div className="space-y-3">
    {/* Header skeleton */}
    <div className="h-10 bg-gray-200 rounded animate-pulse" />
    {/* Row skeletons */}
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
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
      <div className="w-full h-[300px] p-6">
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
  <div className="w-full px-4 py-6 bg-white shadow-md rounded-lg">
    <div className="h-6 w-1/3 mx-auto bg-gray-200 rounded animate-pulse"></div>
  </div>
);

/**
 * Skeleton component for multiple metric cards
 */
export const MetricCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <ChartSkeleton key={i} />
    ))}
  </div>
);

/**
 * Skeleton component for revenue analysis charts grid
 */
export const RevenueAnalysisChartsSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <div className="h-10 bg-gray-200 rounded animate-pulse mb-3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse mb-2" />
          ))}
        </div>
        {/* Mobile cards skeleton */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
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
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
  message 
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
        <div className="text-gray-400 mb-4">
          {icon}
        </div>
        <div className="text-gray-500 text-lg mb-2">
          No Data Available
        </div>
        <div className="text-gray-400 text-sm">
          {message}
        </div>
      </div>
    </CardContent>
  </Card>
);
