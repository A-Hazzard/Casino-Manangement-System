import React from "react";

export default function CollectionReportTableSkeleton() {
  return (
    <div className="hidden lg:block overflow-x-auto bg-white shadow w-full min-w-0">
      <table className="w-full min-w-0 text-sm text-left">
        <thead className="bg-button text-white">
          <tr>
            <th className="px-2 py-2">COLLECTOR</th>
            <th className="px-2 py-2">LOCATION</th>
            <th className="px-2 py-2">GROSS</th>
            <th className="px-2 py-2">MACHINES</th>
            <th className="px-2 py-2">COLLECTED</th>
            <th className="px-2 py-2">UNCOLLECTED</th>
            <th className="px-2 py-2">LOCATION REVENUE</th>
            <th className="px-2 py-2">TIME</th>
            <th className="px-2 py-2">DETAILS</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={index} className="border-b hover:bg-lighterGreenHighlight">
              {/* Collector */}
              <td className="px-4 py-2">
                <div className="h-4 w-24 skeleton-bg rounded"></div>
              </td>
              {/* Location */}
              <td className="px-4 py-2">
                <div className="h-4 w-32 skeleton-bg rounded"></div>
              </td>
              {/* Gross */}
              <td className="px-4 py-2">
                <div className="h-4 w-20 skeleton-bg rounded"></div>
              </td>
              {/* Machines */}
              <td className="px-4 py-2">
                <div className="h-4 w-12 skeleton-bg rounded"></div>
              </td>
              {/* Collected */}
              <td className="px-4 py-2">
                <div className="h-4 w-20 skeleton-bg rounded"></div>
              </td>
              {/* Uncollected */}
              <td className="px-4 py-2">
                <div className="h-4 w-20 skeleton-bg rounded"></div>
              </td>
              {/* Location Revenue */}
              <td className="px-4 py-2">
                <div className="h-4 w-24 skeleton-bg rounded"></div>
              </td>
              {/* Time */}
              <td className="px-4 py-2">
                <div className="h-4 w-20 skeleton-bg rounded"></div>
              </td>
              {/* Details */}
              <td className="px-4 py-2">
                <div className="flex items-center justify-center">
                  <div className="h-5 w-5 skeleton-bg rounded"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
