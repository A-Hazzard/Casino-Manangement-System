/**
 * Vault Overview Page Skeleton Loader
 *
 * Matches exact layout of VaultOverviewPageContent
 * Shows loading states for all vault overview elements
 *
 * @module components/ui/skeletons/VaultOverviewSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function VaultOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Vault Shift Promotion (Hidden if loading usually, but matches space if it would appear) */}

      <div className="flex justify-end">
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Vault Balance Card */}
      <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="hidden border-l border-gray-200 md:block" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-40" />
          </div>
          <div className="hidden border-l border-gray-200 md:block" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="hidden border-l border-gray-200 md:block" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {[1, 2, 3, 4].map(index => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
        ))}
      </div>

      {/* Advanced Dashboard (Charts) */}
      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-1 h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <Skeleton className="mb-4 h-7 w-48" />
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Skeleton className="mb-4 h-7 w-40" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Skeleton className="mb-4 h-7 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Vault Inventory Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(index => (
            <div
              key={index}
              className="flex flex-col items-center justify-center space-y-2 rounded-lg border border-gray-100 p-3"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Cash Desks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(index => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex flex-row items-center justify-between">
                <div className="flex flex-col space-y-2 text-indigo-700">
                  <Skeleton className="h-3 w-24" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2 rounded-lg bg-gray-50/50 p-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(index => (
            <Skeleton key={index} className="h-[70px] w-full" />
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50/50 p-4">
            <div className="grid grid-cols-8 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(index => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map(index => (
              <div key={index} className="p-4">
                <div className="grid grid-cols-8 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(index => (
                    <Skeleton key={index} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
