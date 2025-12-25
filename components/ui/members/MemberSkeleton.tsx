'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function MemberSkeleton() {
  return (
    <div className="relative mx-auto w-full rounded-lg border border-border bg-card p-4 shadow-sm transition-all">
      {/* Member Name and Location */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Member Name */}
          <Skeleton className="mb-2 h-5 w-3/4" />
          {/* Location Name with icon */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-3 rounded-sm" />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {/* Points Badge */}
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Grid: Member ID, Occupation, Joined, Win/Loss */}
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Skeleton className="h-9 rounded-md" />
        <Skeleton className="h-9 rounded-md" />
        <Skeleton className="h-9 rounded-md" />
      </div>
    </div>
  );
}
