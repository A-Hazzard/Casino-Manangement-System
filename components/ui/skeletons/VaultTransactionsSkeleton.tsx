/**
 * Vault Transactions Page Skeleton Loader
 *
 * Matches exact layout of VaultTransactionsPageContent
 * Shows loading states for all elements including metrics and table
 *
 * @module components/ui/skeletons/VaultTransactionsSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function VaultTransactionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-[180px]" />
        <Skeleton className="h-9 w-[180px]" />
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
                <Skeleton className="mt-1 h-8 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Details Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded border" />
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block">
        <div className="rounded-lg border border-gray-200 bg-white">
          {/* Table Header */}
          <div className="border-b border-gray-200">
            <div className="grid grid-cols-8 gap-4 p-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="grid grid-cols-8 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
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
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </div>
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
  );
}
