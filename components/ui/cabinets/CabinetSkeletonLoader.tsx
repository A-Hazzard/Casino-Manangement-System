"use client";

import { useEffect, useState } from "react";

export function CabinetCardSkeleton() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Don't render on server to prevent hydration mismatch
  }

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
      <table className="table-fixed w-full border-collapse text-center">
        <thead className="bg-button text-white">
          <tr>
            {/* Match headers from CabinetTable */}
            <th className="p-3 border border-border border-t-0 text-sm">
              <span>ASSET NUMBER</span>
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              <span>MONEY IN</span>
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              <span>MONEY OUT</span>
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              <span>JACKPOT</span>
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              <span>GROSS</span>
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              <span>ACTIONS</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200">
              {/* Asset/Status Column */}
              <td className="p-3 bg-white text-sm text-left border border-gray-200">
                <div className="h-4 w-3/4 mb-1 skeleton-bg rounded"></div>
                <div className="h-3 w-1/2 mb-1 skeleton-bg rounded"></div>
                <div className="h-3 w-1/3 mb-2 skeleton-bg rounded"></div>
                <div className="h-5 w-20 mt-2 skeleton-bg rounded-full"></div>
              </td>
              {/* Financial Columns */}
              {[...Array(4)].map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="p-3 bg-white text-sm text-center border border-gray-200"
                >
                  <div className="h-4 w-3/4 mx-auto skeleton-bg rounded"></div>
                </td>
              ))}
              {/* Actions Column */}
              <td className="p-3 bg-white text-sm border border-gray-200">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-7 w-7 skeleton-bg rounded-full"></div>
                  <div className="h-7 w-7 skeleton-bg rounded-full"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
