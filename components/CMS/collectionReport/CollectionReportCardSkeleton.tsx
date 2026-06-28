/**
 * Collection Report Card Skeleton Component
 *
 * Loading skeleton for collection report cards on mobile view.
 * Matches exact layout of CollectionReportCards.
 *
 * Features:
 * - Matches CollectionReportCards layout structure
 * - Configurable count and grid layout
 * - Header with "Collector:" label, content fields, and action buttons
 * - Uses Skeleton component for animated loading states
 *
 * @param gridLayout - Whether to use grid layout
 * @param count - Number of skeleton cards to display
 */

import { Skeleton } from '@/components/shared/ui/skeleton';

type CollectionReportCardSkeletonProps = {
  gridLayout?: boolean;
  count?: number;
};

export default function CollectionReportCardSkeleton({
  gridLayout = false,
  count = 20,
}: CollectionReportCardSkeletonProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      className={`mt-4 flex w-full min-w-0 flex-col gap-4 px-2 md:px-4 ${
        gridLayout ? 'lg:hidden' : 'md:hidden'
      }`}
    >
      <div
        className={`${
          gridLayout ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'
        }`}
      >
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="card-item mb-4 transform overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md"
          >
            {/* Header skeleton — matches "Collector: [name]" pattern */}
            <div className="text-md rounded-t-lg bg-lighterBlueHighlight px-4 py-3 font-semibold text-white">
              <div className="flex items-center gap-2">
                <span>Collector:</span>
                <Skeleton className="h-4 w-32 bg-blue-300/50" />
              </div>
            </div>

            {/* Content skeleton */}
            <div className="flex flex-col gap-3 bg-white p-4">
              {/* Location */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Gross */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>

              {/* Machines */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>

              {/* Collected */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>

              {/* Uncollected */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>

              {/* Variation */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>

              {/* Balance */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>

              {/* Location Revenue */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>

              {/* Time */}
              <div className="flex justify-between">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Action Buttons — matches actual: Details + Edit + Delete */}
              <div className="mt-3 flex flex-col justify-center gap-2 md:flex-row">
                <Skeleton className="h-10 w-full rounded md:w-32" />
                <Skeleton className="h-10 w-full rounded md:w-10" />
                <Skeleton className="h-10 w-full rounded md:w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
