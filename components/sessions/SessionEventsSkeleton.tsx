import React from "react";

export const SessionEventsSkeleton = () => (
  <div className="bg-container p-6 rounded-lg shadow w-full">
    {/* Filter Controls Skeleton */}
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 w-20 skeleton-bg"></div>
            <div className="h-10 w-full skeleton-bg rounded-md"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Table Skeleton */}
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-button text-white">
            <th className="p-3 border border-border text-sm">Type</th>
            <th className="p-3 border border-border text-sm">Event</th>
            <th className="p-3 border border-border text-sm">Event Code</th>
            <th className="p-3 border border-border text-sm">Game</th>
            <th className="p-3 border border-border text-sm">Date</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={index} className="hover:bg-muted">
              <td className="p-3 border border-border">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 skeleton-bg rounded"></div>
                  <div className="h-4 w-16 skeleton-bg rounded"></div>
                </div>
              </td>
              <td className="p-3 border border-border">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 skeleton-bg rounded"></div>
                  <div className="w-4 h-4 skeleton-bg rounded"></div>
                </div>
              </td>
              <td className="p-3 border border-border">
                <div className="h-4 w-8 skeleton-bg rounded font-mono"></div>
              </td>
              <td className="p-3 border border-border">
                <div className="h-4 w-24 skeleton-bg rounded"></div>
              </td>
              <td className="p-3 border border-border">
                <div className="h-4 w-32 skeleton-bg rounded"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pagination Skeleton */}
    <div className="flex justify-center items-center mt-6 gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="w-8 h-8 skeleton-bg rounded"></div>
      ))}
    </div>
  </div>
);
