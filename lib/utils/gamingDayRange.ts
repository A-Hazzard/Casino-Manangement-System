/**
 * Gaming Day Range Utility
 *
 * Handles calculation of gaming day ranges based on location-specific gameDayOffset settings.
 * Gaming days follow business rules, not calendar days:
 * - Start at a configurable hour (e.g., 8 AM Trinidad time)
 * - Run until 1ms before the same hour the next day
 *
 * @module lib/utils/gamingDayRange
 */

import {
  calculateGamingDayRange,
  getCurrentLocalTime,
  getLocalDateFromUTC,
  handleAllTime,
  handleCustom,
  handleDefault,
  handleLastDays,
  handleLastHour,
  handleToday,
  handleYesterday,
} from './gamingDayRangeInternal';

// ============================================================================
// Types & Constants
// ============================================================================

/**
 * Represents a gaming day time range in UTC.
 */
export type GamingDayRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

/**
 * Default timezone offset for Trinidad/Guyana/Barbados (UTC-4).
 */
const DEFAULT_TIMEZONE_OFFSET = -4;

/**
 * Default gaming day start hour (8 AM).
 */
const DEFAULT_GAME_DAY_START_HOUR = 8;

// ============================================================================
// Public API — Entry Points
// ============================================================================

/**
 * Main entry point: Calculate gaming day range for a time period.
 *
 * @param timePeriod - Time period (Today, Yesterday, last7days, 30d, Custom, All Time, LastHour)
 * @param gameDayStartHour - Hour when gaming day starts in local time (default: 8 AM)
 * @param customStartDate - Required when timePeriod is "Custom"
 * @param customEndDate - Required when timePeriod is "Custom"
 * @param timezoneOffset - UTC offset (default: -4 for UTC-4)
 * @returns Gaming day range in UTC
 */
export function getGamingDayRangeForPeriod(
  timePeriod: string,
  gameDayStartHour: number = DEFAULT_GAME_DAY_START_HOUR,
  customStartDate?: Date,
  customEndDate?: Date,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): GamingDayRange {
  const nowLocal = getCurrentLocalTime(timezoneOffset);
  const today = getLocalDateFromUTC(nowLocal);

  switch (timePeriod) {
    case 'Today':
      return handleToday(nowLocal, today, gameDayStartHour, timezoneOffset);

    case 'Yesterday':
      return handleYesterday(nowLocal, today, gameDayStartHour, timezoneOffset);

    case 'last7days':
    case '7d':
      return handleLastDays(
        nowLocal,
        today,
        gameDayStartHour,
        timezoneOffset,
        6
      );

    case 'last30days':
    case '30d':
      return handleLastDays(
        nowLocal,
        today,
        gameDayStartHour,
        timezoneOffset,
        29
      );

    case 'Quarterly':
      return handleLastDays(
        nowLocal,
        today,
        gameDayStartHour,
        timezoneOffset,
        89
      );

    case 'All Time':
      return handleAllTime();

    case 'Custom':
      return handleCustom(
        customStartDate,
        customEndDate,
        gameDayStartHour,
        timezoneOffset
      );

    case 'LastHour':
      return handleLastHour();

    default:
      return handleDefault(today);
  }
}

/**
 * Get gaming day range for a single date or time period.
 *
 * @param dateOrTimePeriod - A Date object to calculate range for, or a period string
 * @param gameDayStartHourOrTimezoneOffset - Gaming day start hour (when Date) or timezone offset (when string)
 * @param customStartDateOrTimezoneOffset - Custom start date (when string) or timezone offset (when Date)
 * @param customEndDate - Required when timePeriod is "Custom"
 * @param timezoneOffset - UTC offset override
 * @returns Gaming day range in UTC
 */
export function getGamingDayRange(
  dateOrTimePeriod: Date | string,
  gameDayStartHourOrTimezoneOffset?: number,
  customStartDateOrTimezoneOffset?: Date | number,
  customEndDate?: Date,
  timezoneOffset?: number
): GamingDayRange {
  if (dateOrTimePeriod instanceof Date) {
    return calculateGamingDayRange(
      dateOrTimePeriod,
      gameDayStartHourOrTimezoneOffset ?? DEFAULT_GAME_DAY_START_HOUR,
      typeof customStartDateOrTimezoneOffset === 'number'
        ? customStartDateOrTimezoneOffset
        : DEFAULT_TIMEZONE_OFFSET
    );
  }
  return getGamingDayRangeForPeriod(
    dateOrTimePeriod,
    gameDayStartHourOrTimezoneOffset,
    typeof customStartDateOrTimezoneOffset === 'object' &&
      customStartDateOrTimezoneOffset instanceof Date
      ? customStartDateOrTimezoneOffset
      : undefined,
    customEndDate,
    typeof customStartDateOrTimezoneOffset === 'number'
      ? customStartDateOrTimezoneOffset
      : timezoneOffset
  );
}

/**
 * Get gaming day ranges for multiple locations with different offsets.
 *
 * @param locations - Array of locations with their gameDayOffset settings
 * @param timePeriod - Time period to calculate
 * @param customStartDate - Required when timePeriod is "Custom"
 * @param customEndDate - Required when timePeriod is "Custom"
 * @param timezoneOffset - UTC offset (default: -4)
 * @returns Map of locationId to GamingDayRange
 */
export function getGamingDayRangesForLocations(
  locations: Array<{ _id: string; gameDayOffset?: number }>,
  timePeriod: string,
  customStartDate?: Date,
  customEndDate?: Date,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Map<string, GamingDayRange> {
  const ranges = new Map<string, GamingDayRange>();

  for (const location of locations) {
    const gameDayOffset = location.gameDayOffset ?? DEFAULT_GAME_DAY_START_HOUR;
    const range = getGamingDayRangeForPeriod(
      timePeriod,
      gameDayOffset,
      customStartDate,
      customEndDate,
      timezoneOffset
    );
    ranges.set(String(location._id), range);
  }

  return ranges;
}
