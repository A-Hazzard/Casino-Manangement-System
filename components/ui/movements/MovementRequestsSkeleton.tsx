import React from 'react';

export function MovementRequestCardSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="relative mx-auto mb-4 w-full rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="skeleton-bg h-5 w-1/3 rounded"></div>
            <div className="skeleton-bg h-5 w-5 rounded-full"></div>
          </div>
          <div className="mb-3">
            <div className="skeleton-bg mb-1 h-4 w-1/2 rounded"></div>
            <div className="skeleton-bg h-4 w-2/3 rounded"></div>
            <div className="skeleton-bg mt-1 h-4 w-1/3 rounded"></div>
            <div className="skeleton-bg mt-1 h-4 w-1/4 rounded"></div>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <div className="skeleton-bg h-5 w-16 rounded-full"></div>
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <div className="skeleton-bg h-7 w-7 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MovementRequestsTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-center">
        <thead className="bg-button text-white">
          <tr>
            <th className="border border-t-0 border-border p-3 text-sm">
              Creator
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              Location From
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              Location To
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              Cabinet In
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              Time
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              Status
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200">
              {[...Array(7)].map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="border border-gray-200 bg-white p-3 text-sm"
                >
                  <div className="skeleton-bg mx-auto h-4 w-3/4 rounded"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
