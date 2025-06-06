import React from "react";

export function MovementRequestCardSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white shadow-sm rounded-lg p-4 w-full mx-auto relative border border-gray-100 mb-4"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="h-5 w-1/3 skeleton-bg rounded"></div>
            <div className="h-5 w-5 skeleton-bg rounded-full"></div>
          </div>
          <div className="mb-3">
            <div className="h-4 w-1/2 skeleton-bg rounded mb-1"></div>
            <div className="h-4 w-2/3 skeleton-bg rounded"></div>
            <div className="h-4 w-1/3 skeleton-bg rounded mt-1"></div>
            <div className="h-4 w-1/4 skeleton-bg rounded mt-1"></div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-16 skeleton-bg rounded-full"></div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <div className="h-7 w-7 skeleton-bg rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MovementRequestsTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="table-fixed w-full border-collapse text-center">
        <thead className="bg-button text-white">
          <tr>
            <th className="p-3 border border-border border-t-0 text-sm">
              Creator
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              Location From
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              Location To
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              Cabinet In
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              Time
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              Status
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
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
                  className="p-3 bg-white text-sm border border-gray-200"
                >
                  <div className="h-4 w-3/4 mx-auto skeleton-bg rounded"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
