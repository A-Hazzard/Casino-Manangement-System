import React from 'react';

export const SessionEventsSkeleton = () => (
  <div className="w-full rounded-lg bg-container p-6 shadow">
    {/* Filter Controls Skeleton */}
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton-bg h-4 w-20"></div>
            <div className="skeleton-bg h-10 w-full rounded-md"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Table Skeleton */}
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-button text-white">
            <th className="border border-border p-3 text-sm">Type</th>
            <th className="border border-border p-3 text-sm">Event</th>
            <th className="border border-border p-3 text-sm">Event Code</th>
            <th className="border border-border p-3 text-sm">Game</th>
            <th className="border border-border p-3 text-sm">Date</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={index} className="hover:bg-muted">
              <td className="border border-border p-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="skeleton-bg h-4 w-4 rounded"></div>
                  <div className="skeleton-bg h-4 w-16 rounded"></div>
                </div>
              </td>
              <td className="border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="skeleton-bg h-4 w-32 rounded"></div>
                  <div className="skeleton-bg h-4 w-4 rounded"></div>
                </div>
              </td>
              <td className="border border-border p-3">
                <div className="skeleton-bg h-4 w-8 rounded font-mono"></div>
              </td>
              <td className="border border-border p-3">
                <div className="skeleton-bg h-4 w-24 rounded"></div>
              </td>
              <td className="border border-border p-3">
                <div className="skeleton-bg h-4 w-32 rounded"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pagination Skeleton */}
    <div className="mt-6 flex items-center justify-center gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="skeleton-bg h-8 w-8 rounded"></div>
      ))}
    </div>
  </div>
);
