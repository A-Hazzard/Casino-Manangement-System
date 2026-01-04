/**
 * Members Member Skeleton Component
 *
 * Loading skeleton for the member card view.
 *
 * @module components/members/common/MembersMemberSkeleton
 */
'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function MembersMemberSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="relative mx-auto w-full rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
