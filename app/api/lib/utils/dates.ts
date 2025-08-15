import { CustomDate, TimePeriod } from "@/app/api/lib/types";

const DEFAULT_TIMEZONE = "America/Port_of_Spain";

/**
 * Calculates the start and end dates for a specified time period based on a given timezone.
 * Uses timezone-aware date calculations similar to the working MongoDB query pattern.
 *
 * @param timePeriod - Specifies the period for date calculation. Acceptable values: 'Today', 'Yesterday', '7d', '30d', 'All Time'.
 * @param locationTimeZone - (Optional) Timezone identifier. Defaults to 'America/Port_of_Spain'.
 * @returns An object containing the calculated start and end dates, or undefined dates for 'All Time'.
 */
export const getDatesForTimePeriod = (
  timePeriod: TimePeriod,
  locationTimeZone: string = DEFAULT_TIMEZONE
): CustomDate => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // Use timezone-aware date calculations
  const now = new Date();

  // Helper function to get timezone-aware start of day
  const getStartOfDay = (date: Date, timezone: string): Date => {
    // Create a date in the target timezone
    const options = {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    } as const;
    const localDate = date.toLocaleDateString("en-CA", options); // YYYY-MM-DD format
    return new Date(`${localDate}T00:00:00.000Z`);
  };

  // Helper function to get timezone-aware end of day
  const getEndOfDay = (date: Date, timezone: string): Date => {
    const startOfDay = getStartOfDay(date, timezone);
    return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999
  };

  switch (timePeriod) {
    case "Today":
      startDate = getStartOfDay(now, locationTimeZone);
      endDate = getEndOfDay(now, locationTimeZone);
      break;

    case "Yesterday":
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      startDate = getStartOfDay(yesterday, locationTimeZone);
      endDate = getEndOfDay(yesterday, locationTimeZone);
      break;

    case "7d":
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate = getStartOfDay(sevenDaysAgo, locationTimeZone);
      endDate = getEndOfDay(now, locationTimeZone);
      break;

    case "30d":
      const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDate = getStartOfDay(thirtyDaysAgo, locationTimeZone);
      endDate = getEndOfDay(now, locationTimeZone);
      break;

    case "All Time":
      // For All Time, return undefined dates to fetch all records
      startDate = undefined;
      endDate = undefined;
      break;

    default:
      // Default to Today
      startDate = getStartOfDay(now, locationTimeZone);
      endDate = getEndOfDay(now, locationTimeZone);
      break;
  }

  return { startDate, endDate };
};
