import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {CustomDate, TimePeriod} from '@/app/api/lib/types';

// Extend dayjs with the required plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = 'America/Port_of_Spain';

/**
 * Calculates the start and end dates for a specified time period based on a given timezone.
 *
 * @param {string} timePeriod - Specifies the period for date calculation. Acceptable values: 'Today', 'Yesterday', '7d', '30d'.
 * @param {string} [locationTimeZone='America/Port_of_Spain'] - Optional timezone identifier. Defaults to 'America/Port_of_Spain'.
 * @returns {{ startDate: Date, endDate: Date }} - An object containing the calculated start and end dates.
 */
export const getDatesForTimePeriod = (
    timePeriod: TimePeriod,
    locationTimeZone: string = DEFAULT_TIMEZONE
): CustomDate => {
  let startDate: Date;
  let endDate: Date;

  switch (timePeriod) {
    case 'Today':
      startDate = dayjs().tz(locationTimeZone).startOf('day').toDate();
      endDate = dayjs().tz(locationTimeZone).endOf('day').toDate();
      break;

    case 'Yesterday':
      startDate = dayjs()
          .tz(locationTimeZone)
          .subtract(1, 'day')
          .startOf('day')
          .toDate();
      endDate = dayjs().tz(locationTimeZone).subtract(1, 'day').endOf('day').toDate();
      break;

    case '7d':
      startDate = dayjs().tz(locationTimeZone).subtract(6, 'day').startOf('day').toDate();
      endDate = dayjs().tz(locationTimeZone).endOf('day').toDate();
      break;

    case '30d':
      startDate = dayjs().tz(locationTimeZone).subtract(29, 'day').startOf('day').toDate();
      endDate = dayjs().tz(locationTimeZone).endOf('day').toDate();
      break;

    default:
      startDate = dayjs().tz(locationTimeZone).startOf('day').toDate();
      endDate = dayjs().tz(locationTimeZone).endOf('day').toDate();
      break;
  }

  return { startDate, endDate };
};
