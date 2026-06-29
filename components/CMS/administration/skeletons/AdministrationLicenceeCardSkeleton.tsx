/**
 * Licencee Card Skeleton Component
 * Loading skeleton for licencee cards on mobile view.
 *
 * Features:
 * - Matches AdministrationLicenceeCard layout structure
 * - 5 skeleton cards
 * - Header with licencee name, body with 6 fields, 3 action buttons
 * - Responsive design
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

function AdministrationLicenceeCardSkeleton() {
  // ============================================================================
  // Render - Card Skeleton
  // ============================================================================
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-lg bg-white shadow-md"
        >
          {/* Header: Licencee name only */}
          <div className="bg-blue-500 p-3 text-white">
            <Skeleton className="h-5 w-32 bg-white/20" />
          </div>
          <div className="p-3">
            <div className="mb-3 space-y-2">
              {/* Country */}
              <div className="text-sm text-gray-600">
                <Skeleton className="h-4 w-28" />
              </div>
              {/* Valid From */}
              <div className="text-sm text-gray-600">
                <Skeleton className="h-4 w-24" />
              </div>
              {/* Expires */}
              <div className="text-sm text-gray-600">
                <Skeleton className="h-4 w-24" />
              </div>
              {/* Payment Status */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              {/* Include Jackpot */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              {/* Last Edited */}
              <div className="text-sm text-gray-600">
                <Skeleton className="h-4 w-28" />
              </div>
            </div>

            {/* Action Buttons: History, Edit, Delete */}
            <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdministrationLicenceeCardSkeleton;
