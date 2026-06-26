import { Skeleton } from '@/components/shared/ui/skeleton';

/**
 * Skeleton for the sessions list page table (desktop + mobile cards).
 * Matches SessionsDesktopTable (8 cols) and SessionsMobileCards layout.
 */
export const SessionsListSkeleton = () => (
  <>
    {/* Desktop Table Skeleton */}
    <div className="hidden rounded-md border border-gray-200 bg-white lg:block">
      <table className="w-full">
        <thead>
          <tr className="bg-button">
            {['Player', 'Machine', 'Start Time', 'Duration', 'Handle', 'Jackpot', 'Points', 'Actions'].map(
              col => (
                <th key={col} className="h-12 px-3 align-middle">
                  <Skeleton className="h-4 w-16 bg-white/20" />
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b">
              {/* Player */}
              <td className="p-3">
                <Skeleton className="mb-1 h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </td>
              {/* Machine */}
              <td className="p-3">
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </td>
              {/* Start Time */}
              <td className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-28" />
              </td>
              {/* Duration */}
              <td className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </td>
              {/* Handle */}
              <td className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </td>
              {/* Jackpot */}
              <td className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </td>
              {/* Points */}
              <td className="p-3 text-center">
                <Skeleton className="mx-auto h-4 w-12" />
              </td>
              {/* Actions */}
              <td className="p-3 text-center">
                <Skeleton className="mx-auto h-8 w-20 rounded-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Cards Skeleton */}
    <div className="block p-4 lg:hidden">
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 5 }).map((_, cardIndex) => (
          <div key={cardIndex} className="overflow-hidden rounded-lg border bg-white">
            <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Skeleton className="mb-1 h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {Array.from({ length: 5 }).map((_, fieldIndex) => (
                  <div key={fieldIndex} className={fieldIndex === 4 ? 'col-span-2 border-t pt-2' : ''}>
                    <Skeleton className="mb-1 h-3 w-14" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
);

/**
 * Specific skeleton component for Session Events Page
 * Only shows skeletons for membership settings and events sections
 * Used when data is being refetched (e.g., date filter changes)
 */
export const SessionEventsTableSkeleton = () => (
  <>
    {/* Desktop Table Skeleton */}
    <div className="hidden lg:block">
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b bg-button text-white hover:bg-button">
                <th className="h-12 px-4 align-middle font-medium text-white">
                  <Skeleton className="h-4 w-16 bg-white/20" />
                </th>
                <th className="h-12 px-4 align-middle font-medium text-white">
                  <Skeleton className="h-4 w-24 bg-white/20" />
                </th>
                <th className="h-12 px-4 align-middle font-medium text-white">
                  <Skeleton className="h-4 w-32 bg-white/20" />
                </th>
                <th className="h-12 px-4 align-middle font-medium text-white">
                  <Skeleton className="h-4 w-20 bg-white/20" />
                </th>
                <th className="h-12 px-4 align-middle font-medium text-white">
                  <Skeleton className="h-4 w-20 bg-white/20" />
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-4 align-middle">
                     <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="p-4 align-middle">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="p-4 align-middle">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="p-4 align-middle">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="p-4 align-middle">
                    <Skeleton className="h-8 w-8" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Mobile Card Skeleton */}
    <div className="space-y-4 lg:hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
        </div>
      ))}
    </div>
  </>
);

const SessionEventsContentSkeleton = () => (
  <>
    {/* Location Membership Settings Card Skeleton */}
    <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-row items-center justify-between border-b border-gray-200 p-4 pb-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="mb-2 h-3 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <SessionEventsTableSkeleton />
  </>
);

/**
 * Full page skeleton for initial load
 * Shows complete page structure
 * Note: Padding is handled by PageLayout's mainClassName
 */
export const SessionEventsPageSkeleton = () => (
  <div className="flex flex-1 flex-col space-y-6">
    {/* Header Section: Title and Refresh Button */}
    <div className="mb-6 flex items-center justify-between">
      <Skeleton className="h-8 w-96" />
      <Skeleton className="h-9 w-24" />
    </div>

    {/* Date Filters Section */}
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>

    <SessionEventsContentSkeleton />
  </div>
);
