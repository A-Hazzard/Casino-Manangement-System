/**
 * Activity Log Card Skeleton Component
 * Loading skeleton for activity log cards.
 *
 * Features:
 * - Matches AdministrationActivityLogCard layout structure
 * - Header, user info, description, and action button skeletons
 * - Responsive design
 */
'use client';

import { Card, CardContent } from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';

function AdministrationActivityLogCardSkeleton() {
  // ============================================================================
  // Render - Card Skeleton
  // ============================================================================
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="text-left sm:text-right">
            <Skeleton className="mb-1 h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* User Info */}
        <div className="mb-3">
          <Skeleton className="mb-1 h-4 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>

        {/* Description */}
        <div className="mb-3">
          <Skeleton className="mb-1 h-4 w-full" />
          <Skeleton className="mb-1 h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Show More Button */}
        <div className="flex justify-end">
          <Skeleton className="h-8 w-20" />
        </div>

        {/* Resource Info */}
        <div className="mt-3 border-t border-gray-100 pt-3">
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export default AdministrationActivityLogCardSkeleton;

