/**
 * Country Card Skeleton Component
 * Loading skeleton for the country card (mobile view).
 *
 * Features:
 * - Matches AdministrationCountryCard layout structure
 * - 5 skeleton cards with name and 2 action icons
 * - Responsive design (mobile only)
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

function AdministrationCountryCardSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg bg-white p-4 shadow-md"
        >
          {/* Country Name + Action Icons */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdministrationCountryCardSkeleton;
