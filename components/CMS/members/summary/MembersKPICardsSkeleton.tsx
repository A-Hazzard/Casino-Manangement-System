/**
 * Members KPI Cards Skeleton Component
 * Matches the layout of MembersKPICards
 */

'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function MembersKPICardsSkeleton() {
  const isLocalhost =
    typeof window !== 'undefined' && window.location.hostname === 'localhost';

  return (
    <div
      className={`mb-6 grid grid-cols-1 gap-4 ${isLocalhost ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}
    >
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="ml-4 flex-1">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>

      {isLocalhost && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="ml-4 flex-1">
              <Skeleton className="mb-2 h-4 w-28" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


