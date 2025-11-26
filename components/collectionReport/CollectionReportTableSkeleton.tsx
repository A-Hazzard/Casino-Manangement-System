/**
 * Collection Report Table Skeleton Component
 * Loading skeleton for collection report table on desktop view.
 *
 * Features:
 * - Matches CollectionReportTable layout structure
 * - 8 skeleton rows
 * - 9 columns (Collector, Location, Gross, Machines, Collected, Uncollected, Location Revenue, Time, Details)
 * - Responsive design (desktop only)
 */
import React from 'react';

export default function CollectionReportTableSkeleton() {
  // ============================================================================
  // Render - Table Skeleton
  // ============================================================================
  return (
    <div className="hidden w-full min-w-0 overflow-x-auto bg-white shadow lg:block">
      <table className="w-full min-w-0 text-left text-sm">
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
                <div className="skeleton-bg h-4 w-24 rounded"></div>
              </td>
              {/* Location */}
              <td className="px-4 py-2">
                <div className="skeleton-bg h-4 w-32 rounded"></div>
              </td>
              {/* Gross */}
              <td className="px-4 py-2">
                <div className="skeleton-bg h-4 w-20 rounded"></div>
              </td>
              {/* Machines */}
              <td className="px-4 py-2">
                <div className="skeleton-bg h-4 w-12 rounded"></div>
              </td>
              {/* Collected */}
              <td className="px-4 py-2">
                <div className="skeleton-bg h-4 w-20 rounded"></div>
              </td>
              {/* Uncollected */}
              <td className="px-4 py-2">
                <div className="skeleton-bg h-4 w-20 rounded"></div>
              </td>
              {/* Location Revenue */}
              <td className="px-4 py-2">
                <div className="skeleton-bg h-4 w-24 rounded"></div>
              </td>
              {/* Time */}
              <td className="px-4 py-2">
                <div className="skeleton-bg h-4 w-20 rounded"></div>
              </td>
              {/* Details */}
              <td className="px-4 py-2">
                <div className="flex items-center justify-center">
                  <div className="skeleton-bg h-5 w-5 rounded"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
