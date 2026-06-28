import { Skeleton } from '@/components/shared/ui/skeleton';
import { Card, CardContent } from '@/components/shared/ui/card';

/**
 * Specific skeleton component for Members Page Layout
 * Matches the exact layout of the members page with navigation and content
 */
export const MembersPageSkeleton = () => (
  <div className="flex h-full flex-col">
    {/* Navigation skeleton */}
    <div className="mb-6 flex items-center justify-between">
      <div className="flex space-x-1">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Main content skeleton */}
    <div className="flex-1">
      <MembersListTabSkeleton />
    </div>
  </div>
);

/**
 * Specific skeleton component for Members List Tab
 * Matches the exact layout of the MembersListTab component:
 * Mobile search/sort, summary cards, desktop search, cards/table, pagination
 */
export const MembersListTabSkeleton = () => (
  <div className="space-y-4">
    {/* Mobile: Search + Sort */}
    <div className="mt-4 flex flex-col gap-3 lg:hidden">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-10 shrink-0 rounded" />
      </div>
    </div>

    {/* Summary cards (localhost only) */}
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Desktop: Search in purple box */}
    <div className="hidden items-center gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4 lg:flex">
      <Skeleton className="h-9 max-w-md flex-1 rounded-md" />
    </div>

    {/* Content skeleton: Mobile cards + Desktop table */}
    <div className="space-y-4">
      {/* Mobile cards */}
      <div className="block space-y-4 lg:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex flex-col gap-0.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-3">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full table-fixed">
            <thead className="bg-button">
              <tr>
                {['FULL NAME', 'LOCATION', 'WIN/LOSS', 'JOINED', 'ACTIONS'].map(col => (
                  <th key={col} className="p-4 text-left font-semibold text-white">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100">
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-5 w-32" />
                      <div className="flex gap-1">
                        <Skeleton className="h-4 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded-full" />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-left">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Pagination skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/**
 * Specific skeleton component for Members Summary Tab
 * Matches the exact layout of the MembersSummaryTab component:
 * Title bar, KPI cards, search bars, and members table
 */
export const MembersSummaryTabSkeleton = () => (
  <div className="space-y-4">
    {/* Title bar */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-7 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>

    {/* KPI Cards: 1-2 cards based on localhost */}
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Desktop search bar */}
    <div className="hidden items-center gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4 lg:flex">
      <Skeleton className="h-9 max-w-md flex-1 rounded-md" />
    </div>

    {/* Members table skeleton */}
    <div className="overflow-x-auto bg-white shadow">
      <table className="w-full">
        <thead className="bg-[#00b517]">
          <tr>
            {['FULL NAME', 'ADDRESS', 'PHONE NUMBER', 'LAST LOGIN', 'CREATED AT', 'WIN/LOSS', 'LOCATION', 'ACTIONS'].map(col => (
              <th key={col} className="p-3 text-left text-sm font-semibold text-white">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={index} className="border-b">
              <td className="bg-white p-3"><Skeleton className="h-4 w-32" /></td>
              <td className="bg-white p-3"><Skeleton className="h-4 w-40" /></td>
              <td className="bg-white p-3"><Skeleton className="h-4 w-24" /></td>
              <td className="bg-white p-3"><Skeleton className="h-4 w-24" /></td>
              <td className="bg-white p-3"><Skeleton className="h-4 w-24" /></td>
              <td className="bg-white p-3"><Skeleton className="h-4 w-20" /></td>
              <td className="bg-white p-3"><Skeleton className="h-4 w-28" /></td>
              <td className="bg-white p-3"><Skeleton className="h-8 w-16" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
