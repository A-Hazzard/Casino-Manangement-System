/**
 * Collector Schedule Cards Component
 * Mobile-friendly card view for displaying collector schedules.
 *
 * Features:
 * - Collector schedule data display
 * - Status badges
 * - Date formatting
 * - Duration calculations
 * - Loading states
 * - Empty state handling
 * - Responsive design (mobile only)
 *
 * @param data - Array of collector schedule rows
 * @param loading - Whether data is loading
 */
import { formatDateString } from '@/lib/utils/dateUtils';
import { CollectorScheduleCardsProps } from '@/lib/types/componentProps';

export default function CollectorScheduleCards({
  data,
  loading,
}: CollectorScheduleCardsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 lg:hidden">
        <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-t-4 border-buttonActive"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 lg:hidden">
        No collector schedules found.
      </div>
    );
  }

  return (
    <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
      {data.map((schedule, index) => {
        const startTime = new Date(schedule.startTime);
        const endTime = new Date(schedule.endTime);
        const duration = (
          (endTime.getTime() - startTime.getTime()) /
          (1000 * 60 * 60)
        ).toFixed(1);

        return (
          <div
            key={schedule._id || index}
            className="card-item overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <div className="rounded-t-lg bg-button px-4 py-2 text-sm font-semibold text-white">
              {schedule.location || schedule.locationName}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Collector</span>
                <span className="font-semibold">
                  {schedule.collector || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Start Time</span>
                <span className="font-semibold">
                  {formatDateString(schedule.startTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">End Time</span>
                <span className="font-semibold">
                  {formatDateString(schedule.endTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Duration</span>
                <span className="font-semibold">{duration} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Status</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                    schedule.status === 'scheduled' ||
                    schedule.status === 'in-progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : schedule.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {schedule.status}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
