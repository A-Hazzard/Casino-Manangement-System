import React from "react";

interface CollectionReportCardSkeletonProps {
  gridLayout?: boolean;
  count?: number;
}

export default function CollectionReportCardSkeleton({
  gridLayout = false,
  count = 4,
}: CollectionReportCardSkeletonProps) {
  return (
    <div
      className={`flex flex-col mt-4 px-2 md:px-4 gap-4 w-full min-w-0 ${
        gridLayout ? "lg:hidden" : "md:hidden"
      }`}
    >
      <div
        className={`${
          gridLayout ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"
        }`}
      >
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="card-item bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden mb-4 transform hover:scale-[1.02]"
          >
            {/* Header skeleton */}
            <div className="bg-lighterBlueHighlight text-white px-4 py-3 font-semibold text-md rounded-t-lg">
              <div className="h-4 w-32 skeleton-bg rounded"></div>
            </div>

            {/* Content skeleton */}
            <div className="p-4 flex flex-col gap-3 bg-white">
              {/* Location */}
              <div className="flex justify-between">
                <div className="h-4 w-16 skeleton-bg rounded"></div>
                <div className="h-4 w-24 skeleton-bg rounded"></div>
              </div>

              {/* Gross */}
              <div className="flex justify-between">
                <div className="h-4 w-12 skeleton-bg rounded"></div>
                <div className="h-4 w-20 skeleton-bg rounded"></div>
              </div>

              {/* Machines */}
              <div className="flex justify-between">
                <div className="h-4 w-16 skeleton-bg rounded"></div>
                <div className="h-4 w-8 skeleton-bg rounded"></div>
              </div>

              {/* Collected */}
              <div className="flex justify-between">
                <div className="h-4 w-16 skeleton-bg rounded"></div>
                <div className="h-4 w-20 skeleton-bg rounded"></div>
              </div>

              {/* Uncollected */}
              <div className="flex justify-between">
                <div className="h-4 w-20 skeleton-bg rounded"></div>
                <div className="h-4 w-20 skeleton-bg rounded"></div>
              </div>

              {/* Location Revenue */}
              <div className="flex justify-between">
                <div className="h-4 w-28 skeleton-bg rounded"></div>
                <div className="h-4 w-16 skeleton-bg rounded"></div>
              </div>

              {/* Time */}
              <div className="flex justify-between">
                <div className="h-4 w-8 skeleton-bg rounded"></div>
                <div className="h-4 w-24 skeleton-bg rounded"></div>
              </div>

              {/* Button */}
              <div className="flex justify-center mt-3">
                <div className="h-8 w-32 skeleton-bg rounded border border-gray-300"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
