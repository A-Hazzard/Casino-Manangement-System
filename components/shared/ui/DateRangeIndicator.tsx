/**
 * Date Range Indicator Component
 * Component for displaying the currently active date range filter.
 *
 * Features:
 * - Displays active time period filter
 * - Custom date range formatting
 * - Time information display (when applicable)
 * - Integration with dashboard store
 * - Date formatting
 *
 * @param className - Additional CSS classes
 */
'use client';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { format } from 'date-fns';

type DateRangeIndicatorProps = {
  className?: string;
};

export default function DateRangeIndicator({
  className = '',
}: DateRangeIndicatorProps) {
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();

  const getDateRangeText = () => {
    switch (activeMetricsFilter) {
      case 'Today':
        return 'Today';
      case 'Yesterday':
        return 'Yesterday';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case 'All Time':
        return 'All Time';
      case 'Custom':
        if (customDateRange?.startDate && customDateRange?.endDate) {
          const { gameDayOffset } = useDashBoardStore.getState();
          const sd = customDateRange.startDate;
          const ed = customDateRange.endDate;

          // Display the local time dates as calendar dates
          const startDate = format(sd, 'MMM d, yyyy');
          const endDate = format(ed, 'MMM d, yyyy');

          // Check if times are different from the gaming day default
          const startHours = sd.getHours();
          const startMinutes = sd.getMinutes();
          const endHours = ed.getHours();
          const endMinutes = ed.getMinutes();

          const isDefaultStartTime =
            startHours === gameDayOffset && startMinutes === 0;
          const isDefaultEndTime =
            endHours === (gameDayOffset === 0 ? 23 : gameDayOffset - 1) &&
            endMinutes === 59;

          if (!isDefaultStartTime || !isDefaultEndTime) {
            // Show time information
            const startTimeStr = format(sd, 'h:mm a');
            const endTimeStr = format(ed, 'h:mm a');
            return `${startDate} ${startTimeStr} - ${endDate} ${endTimeStr}`;
          }

          return `${startDate} - ${endDate}`;
        }
        return 'Custom Range';
      default:
        return 'Today';
    }
  };

  const getDateRangeDescription = () => {
    switch (activeMetricsFilter) {
      case 'Today':
        return format(new Date(), 'EEEE, MMMM d, yyyy');
      case 'Yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return format(yesterday, 'EEEE, MMMM d, yyyy');
      case '7d':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return `${format(sevenDaysAgo, 'MMM d')} - ${format(new Date(), 'MMM d, yyyy')}`;
      case '30d':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return `${format(thirtyDaysAgo, 'MMM d')} - ${format(new Date(), 'MMM d, yyyy')}`;
      case 'All Time':
        return 'All available data';
      case 'Custom':
        if (customDateRange?.startDate && customDateRange?.endDate) {
          const { gameDayOffset } = useDashBoardStore.getState();
          const sd = customDateRange.startDate;
          const ed = customDateRange.endDate;

          // Display the local time dates as calendar dates
          const startDate = format(sd, 'EEEE, MMMM d, yyyy');
          const endDate = format(ed, 'EEEE, MMMM d, yyyy');

          // Check if times are different from the gaming day default
          const startHours = sd.getHours();
          const startMinutes = sd.getMinutes();
          const endHours = ed.getHours();
          const endMinutes = ed.getMinutes();

          const isDefaultStartTime =
            startHours === gameDayOffset && startMinutes === 0;
          const isDefaultEndTime =
            endHours === (gameDayOffset === 0 ? 23 : gameDayOffset - 1) &&
            endMinutes === 59;

          if (!isDefaultStartTime || !isDefaultEndTime) {
            // Show time information
            const startTimeStr = format(sd, 'h:mm a');
            const endTimeStr = format(ed, 'h:mm a');
            return `${startDate} at ${startTimeStr} to ${endDate} at ${endTimeStr}`;
          }

          return `${startDate} to ${endDate}`;
        }
        return 'Custom date range selected';
      default:
        return format(new Date(), 'EEEE, MMMM d, yyyy');
    }
  };

  return (
    <div className={`text-sm text-gray-600 ${className}`}>
      <div className="font-medium text-gray-800">{getDateRangeText()}</div>
      <div className="text-xs text-gray-500">{getDateRangeDescription()}</div>
    </div>
  );
}

