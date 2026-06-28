import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';

/**
 * Specific skeleton component for Dashboard Financial Metrics Cards
 * Matches the exact layout of FinancialMetricsCards component
 * Mobile: 2 merged cards (Money In|Money Out, Jackpot|Gross)
 * Desktop: 4 individual cards
 */
export const DashboardFinancialMetricsSkeleton = ({
  count = 3,
}: {
  count?: number;
}) => (
  <div className="space-y-4">
    {/* Mobile skeleton — matches merged card layout */}
    <div className="block md:hidden">
      <div className="grid grid-cols-1 gap-3">
        {/* Money In | Money Out merged card */}
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-purple-500 to-blue-500"></div>
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>

        {/* Jackpot | Gross merged card */}
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500"></div>
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Desktop skeleton — matches individual card layout */}
    <div className="hidden md:block">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6"
          >
            <Skeleton className="mx-auto mb-2 h-4 w-5/6" />
            <div className="my-2 h-[4px] w-full rounded-full bg-gray-200" />
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="mx-auto h-8 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Specific skeleton component for Dashboard Chart
 * Matches the exact layout of the Chart component
 */
export const DashboardChartSkeleton = () => (
  <div className="w-full max-w-full rounded-lg bg-container p-4 shadow-md">
    {/* Metric selection checkboxes skeleton - matches the actual 4 checkbox legend items */}
    <div className="mb-6 overflow-x-auto border-b pb-4">
      <div className="flex min-w-max flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
    {/* Chart area */}
    <div className="h-[320px] w-full animate-pulse rounded-md bg-gray-200" />
  </div>
);

/**
 * Specific skeleton component for Dashboard Top Performing section
 * Matches the exact layout of the top performing data display with tabs, list, and pie chart
 */
export const DashboardTopPerformingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-40" />
    </div>

    {/* Tabs skeleton - matches the actual tab structure */}
    <div className="relative flex w-full flex-col rounded-lg rounded-tl-3xl rounded-tr-3xl bg-container shadow-md">
      <div className="flex">
        <div className="w-full rounded-tl-xl rounded-tr-3xl bg-gray-100 px-4 py-2">
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="w-full rounded-tr-3xl bg-gray-100 px-4 py-2">
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      {/* Content area skeleton - matches the two-column layout (list + pie chart) */}
      <div className="mb-0 rounded-lg rounded-tl-none rounded-tr-3xl bg-container p-6 shadow-sm">
        <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-center xl:justify-between">
          {/* Left side - List skeleton */}
          <ul className="w-full flex-1 space-y-2 lg:w-auto">
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Skeleton className="h-4 w-4 flex-shrink-0 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
              </li>
            ))}
          </ul>
          {/* Right side - Pie chart skeleton */}
          <div className="h-40 min-h-[160px] w-40 min-w-[160px] flex-shrink-0 md:mx-auto lg:mx-0">
            <Skeleton className="h-full w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for dashboard KPI cards
 */
export const DashboardKPISkeleton = () => (
  <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="p-6">
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
