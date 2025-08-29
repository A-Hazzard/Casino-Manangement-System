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
  const TZ_OFFSET_MINUTES = 4 * 60; // UTC-4 for Trinidad
  const now = new Date();
  const trinidadNow = new Date(now.getTime() - TZ_OFFSET_MINUTES * 60000);

  // Helper function to get start of day in Trinidad time
  const getStartOfDayTrinidad = (date: Date): Date => {
    const startLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const startUTC = new Date(startLocal.getTime() + TZ_OFFSET_MINUTES * 60000);
    return startUTC;
  };

  // Helper function to get end of day in Trinidad time
  const getEndOfDayTrinidad = (date: Date): Date => {
    const startLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const startUTC = new Date(startLocal.getTime() + TZ_OFFSET_MINUTES * 60000);
    const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
    return endUTC;
  };

  switch (timePeriod) {
    case "Today":
      startDate = getStartOfDayTrinidad(trinidadNow);
      endDate = new Date(now); // Use current time as end
      break;

    case "Yesterday":
      const yesterday = new Date(trinidadNow.getTime() - 24 * 60 * 60 * 1000);
      startDate = getStartOfDayTrinidad(yesterday);
      endDate = getEndOfDayTrinidad(yesterday);
      break;

    case "7d":
      const sevenDaysAgo = new Date(trinidadNow.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate = getStartOfDayTrinidad(sevenDaysAgo);
      endDate = new Date(now); // Use current time as end
      break;

    case "30d":
      const thirtyDaysAgo = new Date(trinidadNow.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDate = getStartOfDayTrinidad(thirtyDaysAgo);
      endDate = new Date(now); // Use current time as end
      break;

    case "All Time":
      // For All Time, return undefined dates to fetch all records
      startDate = undefined;
      endDate = undefined;
      break;

    default:
      // Default to Today
      startDate = getStartOfDayTrinidad(trinidadNow);
      endDate = new Date(now); // Use current time as end
      break;
  }

  return { startDate, endDate };
};
