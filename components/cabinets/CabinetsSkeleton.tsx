import React from "react";

export default function CabinetsSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="mt-4 flex justify-between">
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
