/**
 * Collection Report V2 Sessions Skeleton Loader
 *
 * Matches exact layout of CollectionReportV2Desktop and CollectionReportV2Mobile.
 * Shows loading states for session list during data fetching.
 */

'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CollectionReportV2SessionsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Desktop skeleton */}
      <div className="hidden md:block">
        <div className="rounded-lg bg-white shadow-md">
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex space-x-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 border-b border-gray-100 px-4 py-4"
            >
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-12 rounded" />
                <Skeleton className="h-6 w-14 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="space-y-4 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg bg-white p-4 shadow-md">
            <div className="mb-3 flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <Skeleton className="h-3 w-20" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-12 rounded" />
                <Skeleton className="h-6 w-14 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
