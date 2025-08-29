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
  // Use timezone-aware date calculations for Trinidad
  const tz = "America/Port_of_Spain";
  const now = new Date();

  let startDate: Date;
  let endDate: Date;

  switch (timePeriod) {
    case "Today":
      // Start of today in Trinidad timezone
      startDate = new Date(
        now.toLocaleDateString("en-CA", { timeZone: tz }) + "T00:00:00.000Z"
      );
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;
    case "Yesterday":
      // Start of yesterday in Trinidad timezone
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      startDate = new Date(
        yesterday.toLocaleDateString("en-CA", { timeZone: tz }) +
          "T00:00:00.000Z"
      );
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;
    case "7d":
    case "last7days":
      // 7 days ago
      endDate = now;
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
    case "last30days":
      // 30 days ago
      endDate = now;
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
