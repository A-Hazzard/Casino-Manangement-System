import React from "react";

export default function LocationInfoSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>

      <div className="flex flex-wrap gap-4 mt-6">
        <div className="h-12 bg-gray-200 rounded w-24"></div>
        <div className="h-12 bg-gray-200 rounded w-24"></div>
        <div className="h-12 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
}
