/**
 * Vault Overview Page Skeleton Loader
 *
 * Matches exact layout of VaultOverviewPageContent
 * Shows loading states for all dashboard elements
 *
 * @module components/ui/skeletons/VaultOverviewSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function VaultOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="text-right">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1 h-5 w-24" />
          </div>
        </div>
      </div>

      {/* Shift Review Panel Skeleton */}
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      {/* Vault Balance Card Skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-10 w-48" />
            <Skeleton className="mt-1 h-4 w-40" />
          </div>
          <Skeleton className="h-12 w-24" />
        </div>
      </div>

      {/* Metric Cards Row Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-1 h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cash Desks Status Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-1 h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Recent Activity Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
