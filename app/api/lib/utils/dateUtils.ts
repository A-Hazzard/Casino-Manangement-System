/**
 * Date utility functions for API operations
 */

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type DateRangeAlt = {
  start: Date;
  end: Date;
};

/**
 * Gets date range for a given time period with Trinidad timezone support
 * @param timePeriod - Time period string (Today, Yesterday, 7d, 30d, etc.)
 * @returns Object with start and end dates
 */
export function getDateRangeForTimePeriod(timePeriod: string): DateRange {
  // Get current UTC time
  const now = new Date();

  // Shift to Trinidad time (UTC-4)
  const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  let startDate: Date;
  let endDate: Date;

  switch (timePeriod) {
    case "Today":
      // Define start and end of today in Trinidad time
      const startOfTodayTrinidad = new Date(trinidadNow);
      startOfTodayTrinidad.setHours(0, 0, 0, 0);

      const endOfTodayTrinidad = new Date(trinidadNow);
      endOfTodayTrinidad.setHours(23, 59, 59, 999);

      // Convert back to UTC for database query
      startDate = new Date(startOfTodayTrinidad.getTime() + 4 * 60 * 60 * 1000);
      endDate = new Date(endOfTodayTrinidad.getTime() + 4 * 60 * 60 * 1000);
      break;
    case "Yesterday":
      // Define start and end of yesterday in Trinidad time
      const startOfYesterdayTrinidad = new Date(trinidadNow);
      startOfYesterdayTrinidad.setDate(startOfYesterdayTrinidad.getDate() - 1);
      startOfYesterdayTrinidad.setHours(0, 0, 0, 0);

      const endOfYesterdayTrinidad = new Date(trinidadNow);
      endOfYesterdayTrinidad.setDate(endOfYesterdayTrinidad.getDate() - 1);
      endOfYesterdayTrinidad.setHours(23, 59, 59, 999);

      // Convert back to UTC for database query
      startDate = new Date(startOfYesterdayTrinidad.getTime() + 4 * 60 * 60 * 1000);
      endDate = new Date(endOfYesterdayTrinidad.getTime() + 4 * 60 * 60 * 1000);
      break;
    case "7d":
    case "last7days":
      // Define start of 7-day period in Trinidad time
      const startOf7DaysTrinidad = new Date(trinidadNow);
      startOf7DaysTrinidad.setDate(startOf7DaysTrinidad.getDate() - 7);
      startOf7DaysTrinidad.setHours(0, 0, 0, 0);

      // End is now (Trinidad time)
      const endOf7DaysTrinidad = new Date(trinidadNow);
      endOf7DaysTrinidad.setHours(23, 59, 59, 999);

      // Convert back to UTC for database query
      startDate = new Date(startOf7DaysTrinidad.getTime() + 4 * 60 * 60 * 1000);
      endDate = new Date(endOf7DaysTrinidad.getTime() + 4 * 60 * 60 * 1000);
      break;
    case "30d":
    case "last30days":
      // Define start of 30-day period in Trinidad time
      const startOf30DaysTrinidad = new Date(trinidadNow);
      startOf30DaysTrinidad.setDate(startOf30DaysTrinidad.getDate() - 30);
      startOf30DaysTrinidad.setHours(0, 0, 0, 0);

      // End is now (Trinidad time)
      const endOf30DaysTrinidad = new Date(trinidadNow);
      endOf30DaysTrinidad.setHours(23, 59, 59, 999);

      // Convert back to UTC for database query
      startDate = new Date(startOf30DaysTrinidad.getTime() + 4 * 60 * 60 * 1000);
      endDate = new Date(endOf30DaysTrinidad.getTime() + 4 * 60 * 60 * 1000);
      break;
    case "All Time":
      // For All Time, return undefined dates to fetch all records
      startDate = new Date(0); // Unix epoch
      endDate = new Date(8640000000000000); // Far future date
      break;
    case "Custom":
      // Custom date range would need to be handled with additional parameters
      // For now, default to all time
      startDate = new Date(0); // Unix epoch
      endDate = now;
      break;
    default:
      startDate = new Date(0); // Unix epoch
      endDate = now;
  }

  return { startDate, endDate };
}

/**
 * Formats date for database queries
 * @param date - Date object
 * @returns ISO string formatted for MongoDB
 */
export function formatDateForQuery(date: Date): string {
  return date.toISOString();
}

/**
 * Alternative function that returns { start, end } format for machines API compatibility
 * @param timePeriod - Time period string (Today, Yesterday, 7d, 30d, etc.)
 * @returns Object with start and end dates in alternative format
 */
export function getDateRangeForTimePeriodAlt(timePeriod: string): DateRangeAlt {
  const { startDate, endDate } = getDateRangeForTimePeriod(timePeriod);
  return { start: startDate, end: endDate };
}

/**
 * Validates date string and converts to Date object
 * @param dateString - Date string to validate
 * @returns Date object or null if invalid
 */
export function validateAndParseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
