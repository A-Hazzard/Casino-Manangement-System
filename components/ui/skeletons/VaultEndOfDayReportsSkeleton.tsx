/**
 * Vault End-of-Day Reports Page Skeleton Loader
 *
 * Matches exact layout of VaultEndOfDayReportsPageContent
 * Shows loading states for all report sections and tables
 *
 * @module components/ui/skeletons/VaultEndOfDayReportsSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function VaultEndOfDayReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Daily Activity Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-6 w-56" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-6 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Closing Float - Denomination Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="mt-4 overflow-x-auto">
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
              {[1, 2, 3, 4, 5, 6].map(i => (
                <tr key={i} className="border-b border-gray-100">
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
              <tr className="bg-gray-50">
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

      {/* Closing Slot Count */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="py-3">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="py-3"></td>
                <td className="py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Desk Closing Floats */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-32" />
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map(i => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="py-3">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="py-3"></td>
                <td className="py-3"></td>
                <td className="py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Vault Closing Balance */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-6 w-48" />
        <div className="mt-4 space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-1 h-8 w-24" />
              </div>
            ))}
          </div>

          {/* Variance Alert */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5" />
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-1 h-4 w-64" />
              </div>
            </div>
          </div>

          {/* Balance Breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-1 h-6 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
