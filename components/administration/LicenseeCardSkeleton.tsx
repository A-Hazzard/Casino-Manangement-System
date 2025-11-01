'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function LicenseeCardSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse overflow-hidden rounded-lg bg-white shadow-md"
        >
          <div className="flex items-center justify-between bg-blue-500 p-3 text-white">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-5 w-20 bg-white/20" />
              <Skeleton className="h-4 w-16 bg-white/20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full bg-white/20" />
              <Skeleton className="h-4 w-12 bg-white/20" />
            </div>
          </div>
          <div className="p-3">
            <div className="space-y-2 mb-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-t border-gray-200 pt-3 mt-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
