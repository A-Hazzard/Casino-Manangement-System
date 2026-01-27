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
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Cashiers Table Card */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="p-6">
          {/* Table Header */}
          <div className="mb-4 grid grid-cols-5 gap-4 border-b border-gray-200 pb-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Table Rows */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="grid grid-cols-5 gap-4 border-b border-gray-100 pb-4"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
