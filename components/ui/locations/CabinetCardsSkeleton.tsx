import React from "react";

export const CabinetCardsSkeleton: React.FC = () => (
  <div className="space-y-4 mt-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="bg-white border border-gray-200 rounded-lg p-4 w-full mx-auto relative shadow-sm"
      >
        {/* Top row: name and status dot */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-gray-200 rounded" />
          <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200" />
        </div>
        {/* Game and SMIB lines */}
        <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
        {/* Divider */}
        <div className="border-t border-gray-200 mt-2 pt-2">
          {/* Money In */}
          <div className="flex justify-between mb-1">
            <div className="h-3 w-14 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
          {/* Money Out */}
          <div className="flex justify-between mb-1">
            <div className="h-3 w-16 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
          {/* Gross */}
          <div className="flex justify-between">
            <div className="h-3 w-10 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default CabinetCardsSkeleton;
