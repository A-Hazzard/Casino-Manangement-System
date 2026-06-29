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
    <div className="bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back + Close button row */}
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Progress bar skeleton */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Machine capture card skeleton */}
        <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
          {/* Machine Header */}
          <div className="mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </div>

          {/* Collection Period (SAS Times) skeleton */}
          <div className="mb-6">
            <div className="space-y-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-4" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          {/* System meters skeleton */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-3 w-36" />
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-1 h-6 w-24 sm:h-7" />
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-1 h-6 w-24 sm:h-7" />
              </div>
            </div>
          </div>

          {/* Photo area skeleton */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-3 w-24" />
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
            <div className="flex gap-2">
              <Skeleton className="h-10 w-16 rounded-lg sm:w-20" />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Skeleton className="h-10 w-24 rounded-lg sm:w-28" />
              <Skeleton className="h-10 w-28 rounded-lg sm:w-36" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
