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
import type { CollectionReportCollectorScheduleCardsProps } from '@/lib/types/componentProps';
import type { CollectorSchedule } from '@/lib/types/components';

export default function CollectionReportCollectorScheduleCards({
  data,
  loading,
}: CollectionReportCollectorScheduleCardsProps) {
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
    <div className="mt-4 space-y-3 lg:hidden">
      {data.map((schedule: CollectorSchedule, index: number) => {
        const startTime = new Date(schedule.startTime);
        const endTime = new Date(schedule.endTime);
        const duration = (
          (endTime.getTime() - startTime.getTime()) /
          (1000 * 60 * 60)
        ).toFixed(1);

        return (
          <div
            key={schedule._id || index}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  {schedule.location || schedule.locationName}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
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
            <div className="px-4 py-4">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-gray-500">
                    Collector
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {schedule.collector || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">
                    Start Time
                  </div>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatDateString(schedule.startTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">End Time</div>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatDateString(schedule.endTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Duration</div>
                  <div className="mt-1 text-sm text-gray-900">
                    {duration} hours
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
