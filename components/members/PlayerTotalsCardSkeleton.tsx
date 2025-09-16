import React from "react";

export default function PlayerTotalsCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mr-2"></div>
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
