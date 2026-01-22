import { Skeleton } from '@/components/shared/ui/skeleton';

/**
 * Specific skeleton component for Session Events Page
 * Only shows skeletons for membership settings and events sections
 * Used when data is being refetched (e.g., date filter changes)
 */
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
