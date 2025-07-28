
import { CustomDate, TimePeriod } from "@/app/api/lib/types";

const DEFAULT_TIMEZONE = "America/Port_of_Spain";

/**
 * Calculates the start and end dates for a specified time period based on a given timezone.
 *
 * @param timePeriod - Specifies the period for date calculation. Acceptable values: 'Today', 'Yesterday', '7d', '30d'.
 * @param locationTimeZone - (Optional) Timezone identifier. Defaults to 'America/Port_of_Spain'.
 * @returns An object containing the calculated start and end dates.
 */
export const getDatesForTimePeriod = (
  timePeriod: TimePeriod,
  _locationTimeZone: string = DEFAULT_TIMEZONE
): CustomDate => {
  let startDate: Date;
  let endDate: Date;

  const now = new Date();

  switch (timePeriod) {
    case "Today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;

    case "Yesterday":
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      break;

    case "7d":
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      startDate = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;

    case "30d":
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      startDate = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;

    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
};




