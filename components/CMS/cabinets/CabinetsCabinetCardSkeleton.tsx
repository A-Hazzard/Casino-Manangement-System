/**
 * Cabinets Cabinet Card Skeleton Component
 *
 * Loading skeleton for the cabinet card view.
 *
 * @module components/cabinets/CabinetsCabinetCardSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CabinetsCabinetCardSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="relative mx-auto w-full rounded-lg border border-gray-100 bg-white p-3 md:p-4 shadow-sm"
        >
          {/* Header with Asset Number and Status Indicator */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-2 w-2 rounded-full" />
            </div>
          </div>

          {/* SMIB ID and Details */}
          <div className="mb-3">
            <Skeleton className="mb-1 h-4 w-24" />
            <Skeleton className="mb-1 h-3 w-16 rounded-full" />
            <Skeleton className="mb-1 h-4 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Financial Data — matches stacked Money In|Money Out + Jackpot|Gross grid layout */}
          <div className="border-t border-gray-200 pt-2">
            {/* Money In | Money Out grid */}
            <div className="mb-1 grid grid-cols-2 gap-1">
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <Skeleton className="mb-1 h-2.5 w-14" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <Skeleton className="mb-1 h-2.5 w-14" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            {/* Jackpot | Gross grid */}
            <div className="grid grid-cols-2 gap-1">
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <Skeleton className="mb-1 h-2.5 w-14" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <Skeleton className="mb-1 h-2.5 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
