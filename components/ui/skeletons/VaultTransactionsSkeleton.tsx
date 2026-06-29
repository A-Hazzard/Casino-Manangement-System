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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map(index => (
          <div
            key={index}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-[10px] w-24" />
                <Skeleton className="h-5 w-16 sm:h-6 sm:w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 sm:w-[180px] sm:flex-none" />
          <Skeleton className="h-9 flex-1 sm:w-[180px] sm:flex-none" />
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block">
        <div className="rounded-lg bg-white shadow-md">
          {/* Table Header */}
          <div className="bg-button">
            <div className="grid grid-cols-8 gap-4 p-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(index => (
                <Skeleton key={index} className="h-4 w-full bg-white/20" />
              ))}
            </div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(index => (
              <div key={index} className="grid grid-cols-8 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(colIndex => (
                  <Skeleton key={colIndex} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="lg:hidden">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(index => (
            <div
              key={index}
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

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
