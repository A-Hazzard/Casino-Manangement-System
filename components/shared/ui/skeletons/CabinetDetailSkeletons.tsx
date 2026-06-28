/**
 * Cabinet Detail Skeletons
 *
 * Content-specific skeleton loaders for the Cabinet Detail page.
 * Each skeleton exactly matches the layout of its corresponding real content.
 *
 * @module components/shared/ui/skeletons/CabinetDetailSkeletons
 */

import PageLayout from '@/components/shared/layout/PageLayout';
import { Skeleton } from '@/components/shared/ui/skeleton';

type CabinetDetailsLoadingStateProps = {
  selectedLicencee: string;
  setSelectedLicencee: (licencee: string) => void;
  error?: string | null;
};

const CabinetDetailPageSkeleton = () => (
  <div className="flex w-full min-w-0 flex-col gap-6 overflow-hidden">
    {/* Summary Section */}
    <div className="space-y-6">
      <div className="mb-2 mt-4">
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="relative mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="mb-1 h-7 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>

            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <div className="hidden items-center gap-2 rounded-lg border bg-white px-3 py-1.5 shadow-sm sm:flex">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </div>

    {/* SMIB Section */}
    <div className="mt-4 w-full max-w-full overflow-x-hidden rounded-lg bg-container shadow-md shadow-purple-200">
      <div className="flex w-full min-w-0 max-w-full flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Skeleton className="h-5 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="h-9 w-32 rounded-md sm:flex-none" />
          <Skeleton className="h-9 w-40 rounded-md sm:flex-none" />
          <Skeleton className="h-5 w-5 flex-shrink-0" />
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full overflow-x-hidden px-4 pb-2 sm:px-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
          <div>
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="sm:text-right">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-1 h-4 w-40 sm:mt-0" />
          </div>
        </div>
      </div>
    </div>

    {/* Chart Section */}
    <div className="mt-4 w-full">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="w-full overflow-hidden">
          <div className="h-[320px] w-full animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
    </div>

    {/* Accounting Details Section */}
    <div className="mt-8 w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="mt-2 rounded-lg bg-container p-4 shadow-md shadow-purple-200 md:p-6">
        <Skeleton className="mb-4 h-6 w-48" />

        <div className="mb-4 flex overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-9 w-24 shrink-0 rounded-md"
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row">
          <div className="mb-4 hidden w-48 flex-shrink-0 lg:mb-0 lg:mr-6 lg:block">
            <div>
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className={`px-4 py-2.5 ${index < 7 ? 'border-b border-border' : ''}`}
                >
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          <div className="w-full min-w-0 flex-grow">
            <Skeleton className="mb-4 hidden h-5 w-24 md:block" />

            <div
              className="flex w-full max-w-full flex-wrap gap-3 md:gap-4"
              style={{ rowGap: '1rem' }}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                >
                  <Skeleton className="mb-2 h-4 w-20 md:mb-4" />
                  <div className="mb-4 h-1 w-full bg-gray-200 md:mb-6" />
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

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

export const MetricsSkeleton = () => (
  <div
    className="flex w-full max-w-full flex-wrap gap-3 md:gap-4"
    style={{ rowGap: '1rem' }}
  >
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
      >
        <Skeleton className="mb-2 h-4 w-20 md:mb-4" />
        <div className="mb-4 h-1 w-full bg-gray-200 md:mb-6" />
        <div className="flex items-center justify-center">
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    ))}
  </div>
);

export const LiveMetricsSkeleton = () => (
  <div className="grid max-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className="rounded-lg bg-container p-4 shadow md:p-6">
        <Skeleton className="mb-2 h-4 w-20 md:mb-4" />
        <div className="mb-4 h-1 w-full bg-gray-200 md:mb-6" />
        <div className="flex items-center justify-center">
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    ))}
  </div>
);

export const ConfigurationsSkeleton = () => (
  <div className="flex w-full flex-col flex-wrap items-center gap-4 sm:flex-row sm:items-stretch sm:justify-start">
    {Array.from({ length: 2 }).map((_, index) => (
      <div
        key={index}
        className="flex w-64 max-w-full flex-col overflow-hidden rounded-lg shadow"
      >
        <div className="flex items-center justify-center bg-gray-400 p-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center justify-center bg-white p-4">
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    ))}
  </div>
);

export const MetersTableSkeleton = () => (
  <div className="space-y-4">
    <div className="max-w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-buttonInactive/50">
            {Array.from({ length: 6 }).map((_, index) => (
              <th key={index} className="px-3 py-2">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-b border-border ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
            >
              {Array.from({ length: 6 }).map((_, colIndex) => (
                <td key={colIndex} className="px-3 py-2">
                  <Skeleton
                    className={`h-3 ${colIndex === 0 ? 'w-24' : colIndex < 3 ? 'w-16' : 'w-12'}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
