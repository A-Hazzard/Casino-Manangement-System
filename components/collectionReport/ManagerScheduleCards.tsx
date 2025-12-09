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
    <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
      {data.map(row => (
        <div
          key={row.id}
          className="card-item overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          <div className="rounded-t-lg bg-button px-4 py-2 text-sm font-semibold text-white">
            {row.location}
          </div>
          <div className="flex flex-col gap-2 p-4">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Collector</span>
              <span className="font-semibold">{row.collector}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Manager</span>
              <span className="font-semibold">{row.creator}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Visit Time</span>
              <span className="font-semibold">{row.visitTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Created At</span>
              <span className="font-semibold">{row.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Status</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
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
        </div>
      ))}
    </div>
  );
}
