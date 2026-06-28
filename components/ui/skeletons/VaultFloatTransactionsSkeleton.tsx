/**
 * Vault Float Transactions Page Skeleton Loader
 *
 * Matches exact layout of VaultFloatTransactionsPageContent
 * Shows loading states for all float transaction elements
 *
 * @module components/ui/skeletons/VaultFloatTransactionsSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function VaultFloatTransactionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Summary Cards — 2 cards on lg, matching content layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {[1, 2].map(index => (
          <div
            key={index}
            className="rounded-lg bg-container p-6 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-6 w-32 sm:h-7" />
              </div>
              {index === 2 && <Skeleton className="h-8 w-8 text-gray-400" />}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Current Cashier Floats Section */}
      <div className="hidden space-y-6 lg:block">
        {/* Current Cashier Floats */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="rounded-lg bg-white shadow-md">
            <div className="bg-button">
              <div className="grid grid-cols-7 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6, 7].map(index => (
                  <Skeleton key={index} className="h-4 w-full bg-white/20" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map(index => (
                <div key={index} className="grid grid-cols-7 gap-4 p-4">
                  {[1, 2, 3, 4, 5, 6, 7].map(colIndex => (
                    <Skeleton key={colIndex} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Float Transaction History */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="rounded-lg bg-white shadow-md">
            <div className="bg-button">
              <div className="grid grid-cols-6 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6].map(index => (
                  <Skeleton key={index} className="h-4 w-full bg-white/20" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map(index => (
                <div key={index} className="grid grid-cols-6 gap-4 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Tab-based layout skeleton */}
      <div className="lg:hidden">
        {/* Tab Bar */}
        <div className="mb-4 inline-flex h-11 min-w-max gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        {/* Mobile Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(index => (
            <div
              key={index}
              className="h-32 rounded-lg bg-gray-50"
            />
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
