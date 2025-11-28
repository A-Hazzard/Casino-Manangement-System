import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftIcon } from '@radix-ui/react-icons';

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
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
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
    pageTitle=""
    hideOptions={true}
    hideLicenceeFilter={false}
    mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
    showToaster={false}
  >
    <CabinetDetailPageSkeleton />
    {error && <div className="mt-4 text-center text-destructive">{error}</div>}
  </PageLayout>
);

type CabinetDetailsErrorStateProps = {
  selectedLicencee: string;
  setSelectedLicencee: (licencee: string) => void;
  error: string;
  onRetry: () => void;
};

/**
 * Error state component for cabinet details page
 */
export const CabinetDetailsErrorState = ({
  selectedLicencee,
  setSelectedLicencee,
  error,
  onRetry,
}: CabinetDetailsErrorStateProps) => (
  <PageLayout
    headerProps={{
      selectedLicencee,
      setSelectedLicencee,
    }}
    pageTitle=""
    hideOptions={true}
    hideLicenceeFilter={false}
    mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
    showToaster={false}
  >
    <div className="flex flex-1 flex-col overflow-x-hidden p-4 md:p-6">
      {/* Back button */}
      <div className="mb-2 mt-4">
        <Button
          variant="outline"
          className="flex items-center border-buttonActive bg-container text-buttonActive transition-colors duration-300 hover:bg-buttonActive hover:text-container"
          size="sm"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Cabinets
        </Button>
      </div>

      {/* Error message */}
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              Error Loading Cabinet Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={onRetry} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </PageLayout>
);
