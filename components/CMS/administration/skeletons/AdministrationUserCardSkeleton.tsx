/**
 * Administration User Card Skeleton Component
 * Loading skeleton for user cards on mobile view.
 *
 * Matches the exact layout of AdministrationUserCard:
 * - Blue header with avatar + role badges
 * - 7 body fields: Username, Name, Email, Enabled, Login Count, Last Login, Session
 * - Edit/Delete action buttons
 *
 * @module components/administration/AdministrationUserCardSkeleton
 */

'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

/**
 * Administration User Card Skeleton
 */
export function AdministrationUserCardSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-lg bg-white shadow-md"
        >
          {/* Blue header with avatar + role badges */}
          <div className="flex items-center gap-2 bg-blue-500 p-3 text-white">
            <Skeleton className="h-6 w-6 flex-shrink-0 rounded-full bg-white/20" />
            <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
              <Skeleton className="h-5 w-16 flex-shrink-0 rounded bg-white/20" />
              <Skeleton className="h-5 w-12 flex-shrink-0 rounded bg-white/20" />
            </div>
          </div>
          <div className="p-3">
            <Skeleton className="mb-1 h-4 w-40 max-w-full" />
            <Skeleton className="mb-1 h-4 w-32 max-w-full" />
            <Skeleton className="mb-1 h-4 w-36 max-w-full" />
            <Skeleton className="mb-1 h-4 w-20 max-w-full" />
            <Skeleton className="mb-1 h-4 w-16 max-w-full" />
            <Skeleton className="mb-1 h-4 w-32 max-w-full" />
            <Skeleton className="mb-3 h-4 w-14 max-w-full" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
              <Skeleton className="h-8 flex-1 rounded" />
              <Skeleton className="h-8 flex-1 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
