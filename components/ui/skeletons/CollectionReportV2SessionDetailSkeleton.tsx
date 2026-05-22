/**
 * Collection Report V2 Session Detail Skeleton Loader
 *
 * Matches the exact layout of the CollectionReportV2SessionDetail page
 * Used while machine meter capture data is loading.
 *
 * @module components/ui/skeletons/CollectionReportV2SessionDetailSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CollectionReportV2SessionDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back button skeleton */}
        <Skeleton className="mb-6 h-4 w-28" />

        {/* Progress bar skeleton */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Machine capture card skeleton */}
        <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
          {/* Header */}
          <div className="mb-6 border-b border-gray-100 pb-4">
            <Skeleton className="mb-2 h-6 w-48" />
            <Skeleton className="mb-2 h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>

          {/* System meters skeleton */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-3 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg sm:h-24" />
              <Skeleton className="h-20 rounded-lg sm:h-24" />
            </div>
          </div>

          {/* Photo area skeleton */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-40 w-full rounded-lg sm:h-48" />
          </div>

          {/* Meter match buttons skeleton */}
          <div className="mb-6">
            <Skeleton className="mb-3 h-4 w-72" />
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Skeleton className="h-16 flex-1 rounded-lg" />
              <Skeleton className="h-16 flex-1 rounded-lg" />
            </div>
          </div>

          {/* Actions skeleton */}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2 sm:gap-3">
              <Skeleton className="h-10 w-16 rounded-lg sm:w-20" />
              <Skeleton className="h-10 w-28 rounded-lg sm:w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
