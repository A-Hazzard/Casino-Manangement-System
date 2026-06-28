/**
 * Collection Report Table Skeleton Component
 *
 * Loading skeleton for collection report table on desktop view.
 * Matches exact layout of CollectionReportTable — 11 columns.
 *
 * Features:
 * - Matches CollectionReportTable layout structure
 * - 20 skeleton rows
 * - 11 columns (Collector, Location, Gross, Machines, Collected, Uncollected, Variation, Balance, Location Revenue, Time, Details)
 * - Uses Skeleton component for animated loading states
 */

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CollectionReportTableSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="hidden w-full min-w-0 overflow-x-auto bg-white shadow md:block">
      <table className="w-full min-w-0 text-left text-sm">
        <thead className="bg-button text-white">
          <tr>
            <th className="px-2 py-2">COLLECTOR</th>
            <th className="px-2 py-2">LOCATION</th>
            <th className="px-2 py-2">GROSS</th>
            <th className="px-2 py-2">MACHINES</th>
            <th className="px-2 py-2">COLLECTED</th>
            <th className="px-2 py-2">UNCOLLECTED</th>
            <th className="px-2 py-2">VARIATION</th>
            <th className="px-2 py-2">BALANCE</th>
            <th className="px-2 py-2">LOCATION REVENUE</th>
            <th className="px-2 py-2">TIME</th>
            <th className="px-2 py-2">DETAILS</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 20 }).map((_, index) => (
            <tr key={index} className="border-b hover:bg-lighterGreenHighlight">
              {/* Collector */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-24" />
              </td>
              {/* Location */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-32" />
              </td>
              {/* Gross */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Machines */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-12" />
              </td>
              {/* Collected */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Uncollected */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Variation */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Balance */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Location Revenue */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-24" />
              </td>
              {/* Time */}
              <td className="px-4 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
              {/* Details */}
              <td className="px-4 py-2">
                <div className="flex items-center justify-center">
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
