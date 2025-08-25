import { CustomDate, TimePeriod } from "@/app/api/lib/types";

/**
 * Calculates the start and end dates for a specified time period based on a given timezone.
 * Uses timezone-aware date calculations for Trinidad time (UTC-4).
 *
 * @param timePeriod - Specifies the period for date calculation. Acceptable values: 'Today', 'Yesterday', '7d', '30d', 'All Time'.
 * @returns An object containing the calculated start and end dates, or undefined dates for 'All Time'.
 */
export const getDatesForTimePeriod = (
  timePeriod: TimePeriod
): CustomDate => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // Use the exact same pattern as the working MongoDB query
  const now = new Date();

  // Helper function to get start of day in Trinidad time (4 AM UTC)
  const getStartOfDayTrinidad = (date: Date): Date => {
    // Create a new Date object to avoid mutating the original
    const newDate = new Date(date);
    // Set to 4 AM UTC which is midnight Trinidad time (UTC-4)
    newDate.setHours(4, 0, 0, 0);
    return newDate;
  };

  // Helper function to get end of day in Trinidad time
  const getEndOfDayTrinidad = (date: Date): Date => {
    // Create a new Date object to avoid mutating the original
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(3, 59, 59, 999);
    return nextDay;
  };

  switch (timePeriod) {
    case "Today":
      startDate = getStartOfDayTrinidad(now);
      endDate = new Date(now); // Create a new Date object to avoid mutation
      break;

    case "Yesterday":
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      startDate = getStartOfDayTrinidad(yesterday);
      endDate = getEndOfDayTrinidad(yesterday);
      break;

    case "7d":
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate = getStartOfDayTrinidad(sevenDaysAgo);
      endDate = new Date(now); // Create a new Date object to avoid mutation
      break;

    case "30d":
      const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDate = getStartOfDayTrinidad(thirtyDaysAgo);
      endDate = new Date(now); // Create a new Date object to avoid mutation
      break;

    case "All Time":
      // For All Time, return undefined dates to fetch all records
      startDate = undefined;
      endDate = undefined;
      break;

    default:
      // Default to Today
      startDate = getStartOfDayTrinidad(now);
      endDate = new Date(now); // Create a new Date object to avoid mutation
      break;
  }

  return { startDate, endDate };
};
