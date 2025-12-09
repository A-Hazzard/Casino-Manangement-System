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
          // Display the local time dates as calendar dates
          const startDate = format(customDateRange.startDate, 'MMM d, yyyy');
          const endDate = format(customDateRange.endDate, 'MMM d, yyyy');

          // Check if times are different from midnight/end of day (indicating custom time was set)
          const startTime =
            customDateRange.startDate.getHours() * 60 +
            customDateRange.startDate.getMinutes();
          const isEndOfDay =
            customDateRange.endDate.getHours() === 23 &&
            customDateRange.endDate.getMinutes() === 59;

          if (startTime !== 0 || !isEndOfDay) {
            // Show time information
            const startTimeStr = format(customDateRange.startDate, 'h:mm a');
            const endTimeStr = format(customDateRange.endDate, 'h:mm a');
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
          // Display the local time dates as calendar dates
          const startDate = format(
            customDateRange.startDate,
            'EEEE, MMMM d, yyyy'
          );
          const endDate = format(customDateRange.endDate, 'EEEE, MMMM d, yyyy');

          // Check if times are different from midnight/end of day (indicating custom time was set)
          const startTime =
            customDateRange.startDate.getHours() * 60 +
            customDateRange.startDate.getMinutes();
          const isEndOfDay =
            customDateRange.endDate.getHours() === 23 &&
            customDateRange.endDate.getMinutes() === 59;

          if (startTime !== 0 || !isEndOfDay) {
            // Show time information
            const startTimeStr = format(customDateRange.startDate, 'h:mm a');
            const endTimeStr = format(customDateRange.endDate, 'h:mm a');
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
