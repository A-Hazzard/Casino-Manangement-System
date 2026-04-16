/**
 * Collector Schedule Cards Component
 * Mobile-friendly card view for displaying collector schedules.
 *
 * Features:
 * - Collector schedule data display
 * - Status badges
 * - Edit and soft-delete actions (manager, admin, location admin, owner, developer)
 * - Date formatting and duration calculations
 * - Loading states
 * - Empty state handling
 * - Responsive design (mobile only)
 */
import { Button } from '@/components/shared/ui/button';
import type { CollectionReportCollectorScheduleCardsProps, CollectorSchedule } from '@/lib/types/components';
import { formatDateString } from '@/lib/utils/date';
import { Pencil, Trash2 } from 'lucide-react';

export default function CollectionReportCollectorScheduleCards({
  data,
  loading,
  onEdit,
  onDelete,
  showActions = false,
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
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
      {data.map((schedule: CollectorSchedule, index: number) => {
        const startTime = new Date(schedule.startTime);
        const endTime = new Date(schedule.endTime);
        const duration = (
          (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        ).toFixed(1);

        return (
          <div
            key={schedule._id || index}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Card Header */}
            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 sm:px-4 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                  {schedule.locationName || schedule.location}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize sm:px-2.5 sm:py-1 ${
                      schedule.status === 'scheduled' || schedule.status === 'in-progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : schedule.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {schedule.status}
                  </span>
                  {showActions && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-button"
                        onClick={() => onEdit?.(schedule)}
                        title="Edit schedule"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                        onClick={() => onDelete?.(schedule)}
                        title="Delete schedule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="px-3 py-3 sm:px-4 sm:py-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-500">Collector</div>
                  <div className="mt-0.5 truncate text-sm font-medium text-gray-900 sm:mt-1">
                    {schedule.collectorName || schedule.collector || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Duration</div>
                  <div className="mt-0.5 text-sm text-gray-900 sm:mt-1">{duration} hours</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Start Time</div>
                  <div className="mt-0.5 text-xs text-gray-900 sm:mt-1 sm:text-sm">
                    {formatDateString(schedule.startTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">End Time</div>
                  <div className="mt-0.5 text-xs text-gray-900 sm:mt-1 sm:text-sm">
                    {formatDateString(schedule.endTime)}
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
