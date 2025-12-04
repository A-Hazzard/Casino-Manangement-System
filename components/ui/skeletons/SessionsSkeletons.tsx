import { Skeleton } from '@/components/ui/skeleton';

/**
 * Specific skeleton component for Sessions Page
 * Matches the exact layout with xl breakpoint and modern card design
 */
export const SessionsPageSkeleton = () => (
  <>
    {/* Desktop Table Skeleton - xl and above */}
    <div className="hidden rounded-md border bg-white xl:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-button text-white">
            <tr>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-16 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-20 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-24 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-20 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-16 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-16 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-16 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-20 bg-white/20" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto mb-1 h-4 w-24" />
                  <Skeleton className="mx-auto h-3 w-16" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto mb-1 h-4 w-20" />
                  <Skeleton className="mx-auto h-3 w-16" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-24" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-12" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-8 w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Card Grid Skeleton - below xl */}
    <div className="block rounded-md border bg-white p-4 xl:hidden">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border bg-white">
            {/* Card Header */}
            <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
            {/* Card Content */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="flex flex-col space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
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
 * Matches the exact layout of the session events page with shadcn-style table
 */
export const SessionEventsPageSkeleton = () => (
  <>
    {/* Desktop Table Skeleton - matches shadcn table style with 6 columns */}
    <div className="hidden rounded-md border md:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-button text-white">
            <tr>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-12 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-16 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-24 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-12 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-12 bg-white/20" />
              </th>
              <th className="p-3 text-center font-medium text-white">
                <Skeleton className="mx-auto h-4 w-16 bg-white/20" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-32" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-40" />
                </td>
                <td className="bg-white p-3 text-center">
                  <Skeleton className="mx-auto h-8 w-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Card Grid Skeleton - shown below md, 2 columns on lg */}
    <div className="grid grid-cols-1 gap-4 md:hidden lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-white">
          {/* Card Header */}
          <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center space-x-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-7 w-7" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
          {/* Card Content */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="flex flex-col space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex flex-col space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="col-span-2 flex flex-col space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);
