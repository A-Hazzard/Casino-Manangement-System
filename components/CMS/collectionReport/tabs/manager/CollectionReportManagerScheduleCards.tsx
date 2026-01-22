/**
 * Manager Schedule Cards Component
 * Mobile-friendly card view for displaying manager schedules.
 *
 * Features:
 * - Manager schedule data display
 * - Status badges
 * - Loading states
 * - Empty state handling
 * - Responsive design (mobile only)
 *
 * @param data - Array of scheduler table rows
 * @param loading - Whether data is loading
 */
import type { CollectionReportManagerScheduleCardsProps, SchedulerTableRow } from '@/lib/types/components';

export default function CollectionReportManagerScheduleCards({ data, loading }: CollectionReportManagerScheduleCardsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 lg:hidden">
        <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-t-4 border-buttonActive"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 lg:hidden">
        No scheduled visits found.
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
      {data.map((row: SchedulerTableRow) => (
        <div
          key={row.id}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                {row.location}
              </h3>
              <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize sm:px-2.5 sm:py-1 ${
                  row.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : row.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {row.status}
              </span>
            </div>
          </div>
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <div className="text-xs font-medium text-gray-500">Collector</div>
                <div className="mt-0.5 truncate text-sm font-medium text-gray-900 sm:mt-1">
                  {row.collector}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Manager</div>
                <div className="mt-0.5 truncate text-sm font-medium text-gray-900 sm:mt-1">
                  {row.creator}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Visit Time</div>
                <div className="mt-0.5 text-xs text-gray-900 sm:mt-1 sm:text-sm">{row.visitTime}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Created At</div>
                <div className="mt-0.5 text-xs text-gray-900 sm:mt-1 sm:text-sm">{row.createdAt}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

