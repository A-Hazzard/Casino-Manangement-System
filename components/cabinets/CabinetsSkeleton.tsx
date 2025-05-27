import React from "react";

export default function CabinetsSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4">
      <div>
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 relative shadow-sm"
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
      </div>
    </div>
  );
}
