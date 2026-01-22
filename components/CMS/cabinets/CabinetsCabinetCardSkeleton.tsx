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
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="relative mx-auto w-full rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
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
            <Skeleton className="mb-1 h-4 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Financial Data - List Layout */}
          <div className="border-t border-gray-200 pt-2 text-sm">
            <div className="mb-1 flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="mb-1 flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="mb-1 flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

