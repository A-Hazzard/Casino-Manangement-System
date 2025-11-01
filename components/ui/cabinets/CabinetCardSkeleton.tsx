'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function CabinetCardSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="relative mx-auto mb-4 w-full rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
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
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
