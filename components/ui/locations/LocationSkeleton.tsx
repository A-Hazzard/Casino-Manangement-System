'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Location Skeleton Loader
 * Matches the exact structure of LocationCard (mobile) and LocationTable (desktop)
 */
export default function LocationSkeleton() {
  return (
    <>
      {/* Desktop skeleton (table) - matches LocationTable */}
      <div className="m-0 hidden w-full overflow-x-auto lg:block">
        <div className="overflow-x-auto bg-white shadow">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-[#00b517] hover:bg-[#00b517]">
                <th className="relative cursor-pointer p-3 text-left font-semibold text-white">
                  LOCATION NAME
                </th>
                <th className="relative cursor-pointer p-3 text-center font-semibold text-white">
                  MONEY IN
                </th>
                <th className="relative cursor-pointer p-3 text-center font-semibold text-white">
                  MONEY OUT
                </th>
                <th className="relative cursor-pointer p-3 text-center font-semibold text-white">
                  GROSS
                </th>
                <th className="p-3 text-center font-semibold text-white">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="hover:bg-muted">
                  {/* First column: Location name with icons and badges */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1.5">
                      {/* Row 1: Location name with icons */}
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-32" />
                        {/* Icon placeholders */}
                        <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                      </div>
                      {/* Row 2: Status badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    </div>
                  </td>
                  {/* Financial columns */}
                  <td className="p-3 text-center">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="mx-auto h-4 w-20" />
                  </td>
                  {/* Actions column */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile skeleton (cards) - matches LocationCard */}
      <div className="mt-4 block lg:hidden">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="relative mb-4 w-full rounded-lg border border-border bg-container p-4 shadow-sm"
          >
            {/* Location Name with Icons */}
            <div className="mb-3 flex flex-col gap-2">
              <div className="inline-flex items-start gap-1.5">
                <Skeleton className="h-5 w-3/4" />
                {/* Icon placeholders */}
                <Skeleton className="h-4 w-4 rounded-full flex-shrink-0 mt-0.5" />
              </div>

              {/* Status Badges Below Name */}
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="mb-2 flex flex-col space-y-2 text-sm">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Gross (separate row) */}
            <div className="mb-3 mt-1 flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
              <Skeleton className="h-8 flex-1 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
