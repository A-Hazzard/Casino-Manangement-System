'use client';

import { useEffect, useState } from 'react';

export function CabinetCardSkeleton() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Don't render on server to prevent hydration mismatch
  }

  return (
    <div className="mt-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="relative mx-auto mb-4 w-full rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
        >
          {/* Header with Asset Number and Edit Button */}
          <div className="mb-2 flex items-center justify-between">
            <div className="skeleton-bg h-5 w-1/3 rounded"></div>
            <div className="skeleton-bg h-5 w-5 rounded-full"></div>
          </div>

          {/* SMIB ID and Location */}
          <div className="mb-3">
            <div className="skeleton-bg mb-1 h-4 w-1/2 rounded"></div>
            <div className="skeleton-bg h-4 w-2/3 rounded"></div>
          </div>

          {/* Financial Data */}
          <div className="text-sm">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex justify-between py-1">
                <div className="skeleton-bg h-4 w-1/3 rounded"></div>
                <div className="skeleton-bg h-4 w-1/4 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CabinetTableSkeleton() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Don't render on server to prevent hydration mismatch
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-center">
        <thead className="bg-button text-white">
          <tr>
            {/* Match headers from CabinetTable */}
            <th className="border border-t-0 border-border p-3 text-sm">
              <span>ASSET NUMBER</span>
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              <span>MONEY IN</span>
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              <span>MONEY OUT</span>
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              <span>JACKPOT</span>
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              <span>GROSS</span>
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              <span>ACTIONS</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200">
              {/* Asset/Status Column */}
              <td className="border border-gray-200 bg-white p-3 text-left text-sm">
                <div className="skeleton-bg mb-1 h-4 w-3/4 rounded"></div>
                <div className="skeleton-bg mb-1 h-3 w-1/2 rounded"></div>
                <div className="skeleton-bg mb-2 h-3 w-1/3 rounded"></div>
                <div className="skeleton-bg mt-2 h-5 w-20 rounded-full"></div>
              </td>
              {/* Financial Columns */}
              {[...Array(4)].map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="border border-gray-200 bg-white p-3 text-center text-sm"
                >
                  <div className="skeleton-bg mx-auto h-4 w-3/4 rounded"></div>
                </td>
              ))}
              {/* Actions Column */}
              <td className="border border-gray-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="skeleton-bg h-7 w-7 rounded-full"></div>
                  <div className="skeleton-bg h-7 w-7 rounded-full"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
