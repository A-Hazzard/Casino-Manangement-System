import PageLayout from '@/components/shared/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';

type CabinetDetailsLoadingStateProps = {
  selectedLicencee: string;
  setSelectedLicencee: (licencee: string) => void;
  error?: string | null;
};

/**
 * Specific skeleton component for Cabinet Detail page that matches the exact layout
 */
const CabinetDetailPageSkeleton = () => (
  <div className="flex flex-1 flex-col overflow-x-hidden p-4 md:p-6">
    {/* Back button skeleton */}
    <div className="mb-2 mt-4">
      <Skeleton className="h-9 w-32" />
    </div>

    {/* Cabinet Info Header skeleton */}
    <div className="relative mb-6 mt-6">
      <div className="flex flex-col justify-between md:flex-row md:items-center">
        <div className="mb-4 md:mb-0">
          {/* Cabinet name and edit button */}
          <div className="mb-2 flex items-center">
            <Skeleton className="mr-2 h-8 w-48" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          {/* Cabinet details */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>

        {/* Online status and refresh button */}
        <div className="mt-2 flex items-center gap-2 md:mt-0">
          <div className="flex items-center rounded-lg border bg-container px-3 py-1.5 shadow-sm">
            <Skeleton className="mr-2 h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>

    {/* SMIB Configuration skeleton */}
    <div className="mt-4 rounded-lg bg-container shadow-md shadow-purple-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-48" />
          {/* SMIB status skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="px-6 pb-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:justify-between md:gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-2 md:text-right">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    </div>

    {/* Date filtering UI skeleton */}
    <div className="mb-2 mt-4 max-w-full">
      {/* Mobile select dropdown skeleton */}
      <div className="mb-4 w-full xl:hidden">
        <Skeleton className="h-12 w-full md:w-48" />
      </div>

      {/* Desktop time period filters skeleton */}
      <div className="mb-4 hidden flex-wrap justify-center gap-2 lg:justify-end xl:flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Mobile horizontal slider skeleton */}
      <div className="w-full touch-pan-x overflow-x-auto rounded-md p-2 pb-4 lg:hidden">
        <div className="flex min-w-max space-x-2 px-1 pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded" />
          ))}
        </div>
      </div>
    </div>

    {/* Chart skeleton - Above Accounting Details on md+ screens */}
    <div className="hidden md:block mb-6">
      <div className="rounded-lg bg-container p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="h-[320px] w-full animate-pulse rounded-md bg-gray-200" />
      </div>
    </div>

    {/* Accounting Details skeleton */}
    <div className="space-y-6">
      {/* Sidebar skeleton */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-64 lg:flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="mb-2 h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Metrics cards skeleton */}
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-16" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Table skeleton */}
              <div className="space-y-3">
                <div className="h-12 animate-pulse rounded bg-gray-200" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded bg-gray-100"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    {/* Chart skeleton - Below Accounting Details on mobile */}
    <div className="md:hidden mt-6">
      <div className="rounded-lg bg-container p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="h-[320px] w-full animate-pulse rounded-md bg-gray-200" />
      </div>
    </div>
  </div>
);

/**
 * Loading state component for cabinet details page
 */
export const CabinetDetailsLoadingState = ({
  selectedLicencee,
  setSelectedLicencee,
  error,
}: CabinetDetailsLoadingStateProps) => (
  <PageLayout
    headerProps={{
      selectedLicencee,
      setSelectedLicencee,
    }}
    
    hideOptions={true}
    hideLicenceeFilter={false}
    mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
    showToaster={false}
  >
    <CabinetDetailPageSkeleton />
    {error && <div className="mt-4 text-center text-destructive">{error}</div>}
  </PageLayout>
);

// Skeleton loaders for individual accounting tabs
export const MetricsSkeleton = () => (
  <div
    className="flex w-full max-w-full flex-wrap gap-3 md:gap-4"
    style={{ rowGap: '1rem' }}
  >
    {[1, 2, 3, 4, 5].map(i => (
      <div
        key={i}
        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
      >
        <div className="mb-2 h-4 animate-pulse rounded bg-gray-200 md:mb-4"></div>
        <div className="mb-4 h-1 w-full bg-gray-300 md:mb-6"></div>
        <div className="flex h-6 items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent md:h-5 md:w-5"></div>
        </div>
      </div>
    ))}
  </div>
);

export const LiveMetricsSkeleton = () => (
  <div className="grid max-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="rounded-lg bg-container p-4 shadow md:p-6">
        <div className="mb-2 h-4 animate-pulse rounded bg-gray-200 md:mb-4"></div>
        <div className="mb-4 h-1 w-full bg-gray-300 md:mb-6"></div>
        <div className="flex h-6 items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent md:h-5 md:w-5"></div>
        </div>
      </div>
    ))}
  </div>
);

export const ConfigurationsSkeleton = () => (
  <div className="flex w-full flex-col flex-wrap items-center gap-4 sm:flex-row sm:items-stretch sm:justify-start">
    {[1, 2].map(i => (
      <div
        key={i}
        className="flex w-64 max-w-full flex-col overflow-hidden rounded-lg shadow"
      >
        <div className="flex items-center justify-center bg-gray-400 p-3">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-300"></div>
        </div>
        <div className="flex items-center justify-center bg-white p-4">
          <div className="h-6 w-20 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    ))}
  </div>
);


