/**
 * Cashier Management Panel Skeleton Loader
 *
 * Matches exact layout of CashierManagementPanel
 * Shows loading states for all cashier management elements
 *
 * @module components/ui/skeletons/CashierManagementSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CashierManagementSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Section Skeleton */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          {/* Search Skeleton */}
          <Skeleton className="h-10 w-full rounded-xl md:max-w-[280px]" />
          {/* Filter Group Skeleton */}
          <div className="flex w-fit items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Cashiers Table Card */}
      <div className="rounded-lg bg-container shadow-md">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="px-6 pb-6 pt-2">
          {/* Table Header — 7 columns */}
          <div className="mb-4 grid grid-cols-7 gap-4 border-b border-gray-200 pb-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Table Rows — 7 columns */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(index => (
              <div
                key={index}
                className="grid grid-cols-7 gap-4 border-b border-gray-100 pb-4"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
