/**
 * Vault Transfers Page Skeleton Loader
 *
 * Matches exact layout of VaultTransfersPageContent
 * Shows loading states for all elements including metrics and tables
 *
 * @module components/ui/skeletons/VaultTransfersSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function VaultTransfersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Transfer Button */}
      <div>
        <Skeleton className="h-12 w-40" />
      </div>

      {/* Pending Transfers Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden lg:block">
          <div className="rounded-lg border border-gray-200 bg-white">
            {/* Table Header */}
            <div className="border-b border-gray-200">
              <div className="grid grid-cols-7 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            {/* Table Rows */}
            <div className="divide-y divide-gray-200">
              {[1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-7 gap-4 p-4">
                  {[1, 2, 3, 4, 5, 6, 7].map(j => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="lg:hidden">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transfer History Section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />

        {/* Desktop Table Skeleton */}
        <div className="hidden lg:block">
          <div className="rounded-lg border border-gray-200 bg-white">
            {/* Table Header */}
            <div className="border-b border-gray-200">
              <div className="grid grid-cols-7 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            {/* Table Rows */}
            <div className="divide-y divide-gray-200">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="grid grid-cols-7 gap-4 p-4">
                  {[1, 2, 3, 4, 5, 6, 7].map(j => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="lg:hidden">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
