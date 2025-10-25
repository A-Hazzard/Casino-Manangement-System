import React from 'react';

export const CabinetCardsSkeleton: React.FC = () => (
  <div className="mt-4 space-y-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="relative mx-auto w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        {/* Top row: name and status dot */}
        <div className="mb-3 flex items-center justify-between">
          <div className="h-5 w-24 rounded bg-gray-200" />
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200" />
        </div>
        {/* Game and SMIB lines */}
        <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
        <div className="mb-2 h-4 w-1/3 rounded bg-gray-200" />
        {/* Divider */}
        <div className="mt-2 border-t border-gray-200 pt-2">
          {/* Money In */}
          <div className="mb-1 flex justify-between">
            <div className="h-3 w-14 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
          {/* Money Out */}
          <div className="mb-1 flex justify-between">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
          {/* Gross */}
          <div className="flex justify-between">
            <div className="h-3 w-10 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default CabinetCardsSkeleton;
