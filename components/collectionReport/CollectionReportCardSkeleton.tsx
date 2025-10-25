import React from 'react';

type CollectionReportCardSkeletonProps = {
  gridLayout?: boolean;
  count?: number;
};

export default function CollectionReportCardSkeleton({
  gridLayout = false,
  count = 4,
}: CollectionReportCardSkeletonProps) {
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
            {/* Header skeleton */}
            <div className="text-md rounded-t-lg bg-lighterBlueHighlight px-4 py-3 font-semibold text-white">
              <div className="skeleton-bg h-4 w-32 rounded"></div>
            </div>

            {/* Content skeleton */}
            <div className="flex flex-col gap-3 bg-white p-4">
              {/* Location */}
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-16 rounded"></div>
                <div className="skeleton-bg h-4 w-24 rounded"></div>
              </div>

              {/* Gross */}
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-12 rounded"></div>
                <div className="skeleton-bg h-4 w-20 rounded"></div>
              </div>

              {/* Machines */}
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-16 rounded"></div>
                <div className="skeleton-bg h-4 w-8 rounded"></div>
              </div>

              {/* Collected */}
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-16 rounded"></div>
                <div className="skeleton-bg h-4 w-20 rounded"></div>
              </div>

              {/* Uncollected */}
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-20 rounded"></div>
                <div className="skeleton-bg h-4 w-20 rounded"></div>
              </div>

              {/* Location Revenue */}
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-28 rounded"></div>
                <div className="skeleton-bg h-4 w-16 rounded"></div>
              </div>

              {/* Time */}
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-8 rounded"></div>
                <div className="skeleton-bg h-4 w-24 rounded"></div>
              </div>

              {/* Button */}
              <div className="mt-3 flex justify-center">
                <div className="skeleton-bg h-8 w-32 rounded border border-gray-300"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
