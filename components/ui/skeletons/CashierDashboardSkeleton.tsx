/**
 * Cashier Dashboard Page Skeleton Loader
 *
 * Matches exact layout of CashierDashboardPageContent
 * Shows loading states for cashier shift interface
 *
 * @module components/ui/skeletons/CashierDashboardSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CashierDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      {/* Shift Status Banner */}
      <Skeleton className="h-16 w-full rounded-lg" />

      {/* Shift Status Card — full width, matches ActiveShiftDashboard */}
      <div className="overflow-hidden rounded-lg border-t-4 border-emerald-500 bg-container shadow-md">
        <div className="flex items-center justify-between p-6 pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[1, 2, 3].map(index => (
              <div key={index}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1 h-5 w-20" />
                {index === 2 && <Skeleton className="mt-1 h-3 w-16" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Card — full width, 4-column grid */}
      <div className="rounded-lg border-t-4 border-button bg-container shadow-md">
        <div className="p-6 pb-2">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map(index => (
              <div
                key={index}
                className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-gray-200"
              >
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cashier Activity Section */}
      <div className="rounded-lg bg-container shadow-md">
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-36" />
          </div>
        </div>
        <div className="space-y-4 px-6 pb-6 pt-2">
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
