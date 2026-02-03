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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';

/**
 * Skeleton component for summary cards grid
 */
export const SummaryCardsSkeleton = () => (
  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/**
 * Skeleton component for metric cards with configurable count
 */
export const MetricCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/**
 * Skeleton component for chart containers
 */
export const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-[320px] w-full animate-pulse rounded-md bg-gray-200" />
    </CardContent>
  </Card>
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

/**
 * Skeleton component for tables
 */
export const TableSkeleton = ({ 
  rows = 5, 
  cols = 4 
}: { 
  rows?: number; 
  cols?: number 
}) => (
  <Card>
    <CardContent className="p-0">
      <div className="animate-pulse">
        <div className="border-b px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-4">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);
