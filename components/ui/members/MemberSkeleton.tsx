'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function MemberSkeleton() {
  return (
    <div className="relative mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-2/3" />
      </div>

      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32 font-mono" />
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

      <div className="mt-2 flex justify-between gap-2">
        <Skeleton className="h-7 w-28 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}
