"use client";

export default function CabinetCardSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white shadow-sm rounded-lg p-4 w-full mx-auto relative border border-gray-100 mb-4"
        >
          {/* Header with Asset Number and Edit Button */}
          <div className="flex justify-between items-center mb-2">
            <div className="h-5 w-1/3 skeleton-bg rounded"></div>
            <div className="h-5 w-5 skeleton-bg rounded-full"></div>
          </div>

          {/* SMIB ID and Location */}
          <div className="mb-3">
            <div className="h-4 w-1/2 skeleton-bg rounded mb-1"></div>
            <div className="h-4 w-2/3 skeleton-bg rounded"></div>
          </div>

          {/* Financial Data */}
          <div className="text-sm">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex justify-between py-1">
                <div className="h-4 w-1/3 skeleton-bg rounded"></div>
                <div className="h-4 w-1/4 skeleton-bg rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
