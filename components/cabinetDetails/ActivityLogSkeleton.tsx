/**
 * Activity Log Skeleton Component
 * Loading skeleton for activity log table/cards.
 *
 * Features:
 * - Matches ActivityLogTable layout structure
 * - Desktop table skeleton (10 rows)
 * - Mobile cards skeleton (5 cards)
 * - Responsive design
 */
import { Skeleton } from '@/components/ui/skeleton';

const ActivityLogSkeleton = () => (
  <div className="w-full">
    {/* Desktop Table View Skeleton */}
    <div className="hidden w-full overflow-x-auto rounded-lg lg:block">
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
          {Array.from({ length: 10 }).map((_, index) => (
            <tr key={index} className="text-center">
              <td className="border border-border p-3">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </td>
              <td className="border border-border p-3 text-left">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </td>
              <td className="border border-border p-3">
                <Skeleton className="mx-auto h-4 w-8" />
              </td>
              <td className="border border-border p-3">
                <Skeleton className="mx-auto h-4 w-24" />
              </td>
              <td className="border border-border p-3">
                <Skeleton className="mx-auto h-4 w-32" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Cards View Skeleton */}
    <div className="block w-full space-y-4 lg:hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="w-full overflow-hidden rounded-lg border border-border bg-container shadow-md"
        >
          <div className="bg-button px-4 py-3 text-sm font-semibold text-white">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-16" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ActivityLogSkeleton;
