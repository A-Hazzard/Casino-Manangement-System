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
import type { SchedulerTableRow } from '@/lib/types/componentProps';

type Props = {
  data: SchedulerTableRow[];
  loading: boolean;
};

export default function ManagerScheduleCards({ data, loading }: Props) {
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
    <div className="mt-4 space-y-3 lg:hidden">
      {data.map(row => (
        <div
          key={row.id}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {row.location}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
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
          <div className="px-4 py-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-500">Collector</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {row.collector}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Manager</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {row.creator}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Visit Time</div>
                <div className="mt-1 text-sm text-gray-900">{row.visitTime}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Created At</div>
                <div className="mt-1 text-sm text-gray-900">{row.createdAt}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
