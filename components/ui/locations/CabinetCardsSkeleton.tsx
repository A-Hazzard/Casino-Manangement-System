import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Cabinet Cards Skeleton Loader
 * Matches the exact structure of CabinetCardMobile component
 */
const CabinetCardsSkeleton: React.FC = () => (
  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
    {[...Array(10)].map((_, i) => (
      <div
        key={i}
        className="relative mx-auto w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        {/* Header with Asset Number and Status Indicator */}
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>

        {/* Game Name */}
        <div className="mb-1">
          <Skeleton className="h-4 w-40" />
        </div>

        {/* SMIB ID */}
        <div className="mb-1 flex items-center gap-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Financial Data */}
        <div className="mt-2 border-t border-gray-200 pt-2">
          <div className="mb-1 flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mb-1 flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export default CabinetCardsSkeleton;
