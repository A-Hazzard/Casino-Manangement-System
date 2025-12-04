'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function MemberSkeleton() {
  return (
    <div className="relative mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow">
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

      {/* Financial Metrics */}
      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
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
