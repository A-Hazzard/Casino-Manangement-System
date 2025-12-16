import { CustomDate, TimePeriod } from '@/app/api/lib/types';

/**
 * Calculates the start and end dates for a specified time period based on a given timezone.
 * Uses timezone-aware date calculations for Trinidad time (UTC-4).
 *
 * @param timePeriod - Specifies the period for date calculation. Acceptable values: 'Today', 'Yesterday', '7d', '30d', 'All Time', 'Custom'.
 * @returns An object containing the calculated start and end dates, or undefined dates for 'All Time'.
 */
export const getDatesForTimePeriod = (timePeriod: TimePeriod): CustomDate => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // Use local timezone-aware date calculations
  // This ensures "Today" uses the user's local date, not UTC date

  switch (timePeriod) {
    case 'Today':
      // Define today's range in local timezone, then convert to UTC for database queries
      const now = new Date();
      const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      );
      const todayLocal = localDate.toISOString().split('T')[0]; // Get YYYY-MM-DD in local timezone

      // Create UTC dates for the local date
      startDate = new Date(todayLocal + 'T00:00:00.000Z');
      endDate = new Date(todayLocal + 'T23:59:59.999Z');
      break;

    case 'Yesterday':
      // Define yesterday's range in local timezone
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayLocal = new Date(
        yesterday.getTime() - yesterday.getTimezoneOffset() * 60000
      );
      const yesterdayLocalStr = yesterdayLocal.toISOString().split('T')[0];

      startDate = new Date(yesterdayLocalStr + 'T00:00:00.000Z');
      endDate = new Date(yesterdayLocalStr + 'T23:59:59.999Z');
      break;

    case '7d':
    case 'last7days':
      // Define 7-day range (including today, so go back 6 days)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const weekStartLocal = new Date(
        weekStart.getTime() - weekStart.getTimezoneOffset() * 60000
      );
      const weekStartLocalStr = weekStartLocal.toISOString().split('T')[0];

      const today7d = new Date();
      const today7dLocal = new Date(
        today7d.getTime() - today7d.getTimezoneOffset() * 60000
      );
      const today7dLocalStr = today7dLocal.toISOString().split('T')[0];

      startDate = new Date(weekStartLocalStr + 'T00:00:00.000Z');
      endDate = new Date(today7dLocalStr + 'T23:59:59.999Z');
      break;

    case '30d':
    case 'last30days':
      // Define 30-day range (including today, so go back 29 days)
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 29);
      const monthStartLocal = new Date(
        monthStart.getTime() - monthStart.getTimezoneOffset() * 60000
      );
      const monthStartLocalStr = monthStartLocal.toISOString().split('T')[0];

      const today30d = new Date();
      const today30dLocal = new Date(
        today30d.getTime() - today30d.getTimezoneOffset() * 60000
      );
      const today30dLocalStr = today30dLocal.toISOString().split('T')[0];

      startDate = new Date(monthStartLocalStr + 'T00:00:00.000Z');
      endDate = new Date(today30dLocalStr + 'T23:59:59.999Z');
      break;

    case 'Quarterly':
      // Define quarterly range (last 90 days / 3 months, including today, so go back 89 days)
      const quarterStart = new Date();
      quarterStart.setDate(quarterStart.getDate() - 89);
      const quarterStartLocal = new Date(
        quarterStart.getTime() - quarterStart.getTimezoneOffset() * 60000
      );
      const quarterStartLocalStr = quarterStartLocal
        .toISOString()
        .split('T')[0];

      const todayQuarterly = new Date();
      const todayQuarterlyLocal = new Date(
        todayQuarterly.getTime() - todayQuarterly.getTimezoneOffset() * 60000
      );
      const todayQuarterlyLocalStr = todayQuarterlyLocal
        .toISOString()
        .split('T')[0];

      startDate = new Date(quarterStartLocalStr + 'T00:00:00.000Z');
      endDate = new Date(todayQuarterlyLocalStr + 'T23:59:59.999Z');
      break;

    case 'All Time':
      // For All Time, return undefined dates to fetch all records
      startDate = undefined;
      endDate = undefined;
      break;

    default:
      // Default to Today using local timezone
      const defaultNow = new Date();
      const defaultLocal = new Date(
        defaultNow.getTime() - defaultNow.getTimezoneOffset() * 60000
      );
      const defaultTodayLocal = defaultLocal.toISOString().split('T')[0];

      startDate = new Date(defaultTodayLocal + 'T00:00:00.000Z');
      endDate = new Date(defaultTodayLocal + 'T23:59:59.999Z');
      break;
  }

  return { startDate, endDate };
};
