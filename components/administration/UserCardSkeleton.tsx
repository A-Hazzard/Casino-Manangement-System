'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function UserCardSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-lg bg-white shadow-md"
        >
          <div className="flex items-center justify-between bg-blue-500 p-3 text-white">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-5 w-16 bg-white/20" />
              <Skeleton className="h-4 w-14 bg-white/20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full bg-white/20" />
              <Skeleton className="h-5 w-10 bg-white/20" />
            </div>
          </div>
          <div className="p-3">
            <Skeleton className="mb-2 h-4 w-40 max-w-full" />
            <Skeleton className="mb-3 h-4 w-24 max-w-full" />
            <div className="mt-2 flex items-center justify-end gap-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
