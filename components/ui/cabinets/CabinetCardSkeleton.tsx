"use client";

export default function CabinetCardSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-100 rounded-lg p-4 w-full mx-auto relative shadow-sm mb-4"
        >
          {/* Status dot (top right) */}
          <span className="absolute top-3 right-3 w-3 h-3 rounded-full bg-gray-200" />
          {/* Asset number + Edit button */}
          <div className="flex justify-between items-center mb-2">
            <div className="h-5 w-1/3 skeleton-bg rounded" />
            <div className="h-5 w-5 skeleton-bg rounded-full" />
          </div>
          {/* SMIB and Location */}
          <div className="mb-3">
            <div className="h-4 w-1/2 skeleton-bg rounded mb-1"></div>
            <div className="h-4 w-2/3 skeleton-bg rounded"></div>
          </div>
          {/* Money In, Money Out, Gross */}
          <div className="flex flex-col space-y-2 text-sm mb-2">
            <div className="flex justify-between">
              <div className="h-4 w-20 skeleton-bg rounded" />
              <div className="h-4 w-24 skeleton-bg rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 skeleton-bg rounded" />
              <div className="h-4 w-24 skeleton-bg rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-16 skeleton-bg rounded" />
              <div className="h-4 w-24 skeleton-bg rounded" />
            </div>
          </div>
          {/* Buttons at the bottom */}
          <div className="flex gap-2 justify-between mt-2">
            <div className="h-7 w-28 skeleton-bg rounded" />
            <div className="h-7 w-28 skeleton-bg rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
