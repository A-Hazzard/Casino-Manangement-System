/**
 * Members Member Skeleton Component
 *
 * Loading skeleton for a single member card (mobile view).
 * Renders one card at a time — used in a loop by MembersListTab.
 *
 * @module components/members/common/MembersMemberSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function MembersMemberSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="relative mx-auto w-full rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-5 w-3/4" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
