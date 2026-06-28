/**
 * Vault End-of-Day Reports Page Skeleton Loader
 *
 * Matches exact layout of VaultEndOfDayReportsPageContent
 * Shows loading states for the Summary tab content which is the default view
 *
 * @module components/ui/skeletons/VaultEndOfDayReportsSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function VaultEndOfDayReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Statistics Card */}
      <div className="rounded-lg border-t-4 border-orangeHighlight bg-container shadow-md">
        <div className="flex items-center justify-between p-6 pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map(index => (
              <div key={index} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16 sm:h-6 sm:w-20" />
                <Skeleton className="h-2 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Location Breakdown — 3-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Visual Breakdown */}
        <div className="rounded-lg bg-container shadow-md lg:col-span-1">
          <div className="p-6 pb-2">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-6 px-6 pb-6 pt-2">
            {[1, 2, 3].map(index => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Distribution Table */}
        <div className="rounded-lg bg-container shadow-md lg:col-span-2">
          <div className="p-6 pb-2">
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="px-6 pb-6 pt-2">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left">
                    <Skeleton className="h-4 w-28" />
                  </th>
                  <th className="pb-3 text-left">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="pb-3 text-right">
                    <Skeleton className="h-4 w-16" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map(index => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3 text-right">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50/50">
                  <td className="py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="py-3" />
                  <td className="py-3 text-right">
                    <Skeleton className="ml-auto h-5 w-24" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Closing Float - Denomination Breakdown */}
      <div className="rounded-lg bg-container shadow-md">
        <div className="flex items-center gap-2 p-6 pb-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="px-6 pb-6 pt-2">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map(index => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="py-3">
                  <Skeleton className="h-4 w-12" />
                </td>
                <td className="py-3">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
