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
import { format, isSameDay } from 'date-fns';

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
          const sd = customDateRange.startDate;
          const ed = customDateRange.endDate;

          // Check for "Date Only" intent (Midnight in UTC or Local is usually used for date-only pickers)
          const isDateOnlyIntent = (
            sd.getHours() === 0 && sd.getMinutes() === 0 &&
            ed.getHours() === 0 && ed.getMinutes() === 0
          );

          if (isDateOnlyIntent) {
            // Display as full gaming days for the selected dates
            const startDate = format(sd, 'MMM d, yyyy');
            const endDate = format(ed, 'MMM d, yyyy');
            
            // If same day, show the full window representing that day
            if (isSameDay(sd, ed)) {
                return `${startDate}`;
            }
            return `${startDate} - ${endDate}`;
          }

          // Otherwise show with specific times
          const startDate = format(sd, 'MMM d, yyyy');
          const endDate = format(ed, 'MMM d, yyyy');
          const startTimeStr = format(sd, 'h:mm a');
          const endTimeStr = format(ed, 'h:mm a');
          return `${startDate} ${startTimeStr} - ${endDate} ${endTimeStr}`;
        }
        return 'Custom Range';
      default:
        return 'Today';
    }
  };

  const getDateRangeDescription = () => {
    const { gameDayOffset } = useDashBoardStore.getState();
    const formatGamingTime = (h: number) => {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        return `${h12}:00 ${ampm}`;
    };
    const formatGamingEnd = (h: number) => {
        const endH = (h - 1 + 24) % 24;
        const h12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH;
        const ampm = endH >= 12 ? 'PM' : 'AM';
        return `${h12}:59 ${ampm}`;
    };

    switch (activeMetricsFilter) {
      case 'Today':
        return `Today at ${formatGamingTime(gameDayOffset)} to tomorrow at ${formatGamingEnd(gameDayOffset)}`;
      case 'Yesterday':
        return `Yesterday at ${formatGamingTime(gameDayOffset)} to today at ${formatGamingEnd(gameDayOffset)}`;
      case '7d':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return `${format(sevenDaysAgo, 'MMM d')} to ${format(new Date(), 'MMM d, yyyy')}`;
      case '30d':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return `${format(thirtyDaysAgo, 'MMM d')} to ${format(new Date(), 'MMM d, yyyy')}`;
      case 'All Time':
        return 'All available data';
      case 'Custom':
        if (customDateRange?.startDate && customDateRange?.endDate) {
          const sd = customDateRange.startDate;
          const ed = customDateRange.endDate;

          const isDateOnlyIntent = (
            sd.getHours() === 0 && sd.getMinutes() === 0 &&
            ed.getHours() === 0 && ed.getMinutes() === 0
          );

          if (isDateOnlyIntent) {
            const startDateStr = format(sd, 'EEEE, MMMM d, yyyy');
            
            if (isSameDay(sd, ed)) {
                // If single day selected, show it as a full gaming day window
                const nextDay = new Date(sd);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayStr = format(nextDay, 'EEEE, MMMM d, yyyy');
                return `${startDateStr} at ${formatGamingTime(gameDayOffset)} to ${nextDayStr} at ${formatGamingEnd(gameDayOffset)}`;
            }
            
            const nextDayOfEnd = new Date(ed);
            nextDayOfEnd.setDate(nextDayOfEnd.getDate() + 1);
            const nextDayStr = format(nextDayOfEnd, 'EEEE, MMMM d, yyyy');
            return `${startDateStr} at ${formatGamingTime(gameDayOffset)} to ${nextDayStr} at ${formatGamingEnd(gameDayOffset)}`;
          }

          // Specific times
          const startDate = format(sd, 'EEEE, MMMM d, yyyy');
          const endDate = format(ed, 'EEEE, MMMM d, yyyy');
          const startTimeStr = format(sd, 'h:mm a');
          const endTimeStr = format(ed, 'h:mm a');
          return `${startDate} at ${startTimeStr} to ${endDate} at ${endTimeStr}`;
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

