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

/**
 * Represents a gaming day time range in UTC.
 */
export type GamingDayRange = {
  /** Start of the gaming day range (inclusive) in UTC */
  rangeStart: Date;
  /** End of the gaming day range (inclusive) in UTC */
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

/* ============================================================================
 * PUBLIC API - Entry Points
 * ============================================================================ */

/**
 * Main entry point: Calculate gaming day range for a time period.
 *
 * @param timePeriod - Time period (Today, Yesterday, last7days, 30d, Custom, All Time, LastHour)
 * @param gameDayStartHour - Hour when gaming day starts in local time (default: 8 AM)
 * @param customStartDate - Required when timePeriod is "Custom"
 * @param customEndDate - Required when timePeriod is "Custom"
 * @param timezoneOffset - UTC offset (default: -4 for UTC-4)
 * @returns Gaming day range in UTC
 *
 * @example
 * // Get "Today" gaming day range
 * getGamingDayRangeForPeriod('Today', 8);
 *
 * @example
 * // Get "Custom" range
 * getGamingDayRangeForPeriod('Custom', 8, new Date('2025-03-22'), new Date('2025-03-23'));
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
 * Get gaming day ranges for multiple locations with different offsets.
 *
 * @param locations - Array of locations with their gameDayOffset settings
 * @param timePeriod - Time period to calculate
 * @param customStartDate - Required when timePeriod is "Custom"
 * @param customEndDate - Required when timePeriod is "Custom"
 * @param timezoneOffset - UTC offset (default: -4)
 * @returns Map of locationId to GamingDayRange
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

/* ============================================================================
 * TIME PERIOD HANDLERS
 * ============================================================================ */

/**
 * Handle "Today" time period.
 * If current hour is before gaming day start, use YESTERDAY's date.
 */
function handleToday(
  nowLocal: Date,
  today: Date,
  gameDayStartHour: number,
  timezoneOffset: number
): GamingDayRange {
  const currentHour = nowLocal.getUTCHours();
  const dateToUse =
    currentHour < gameDayStartHour ? subtractDays(today, 1) : today;
  return calculateGamingDayRange(dateToUse, gameDayStartHour, timezoneOffset);
}

/**
 * Handle "Yesterday" time period.
 */
function handleYesterday(
  nowLocal: Date,
  today: Date,
  gameDayStartHour: number,
  timezoneOffset: number
): GamingDayRange {
  const currentHour = nowLocal.getUTCHours();
  const effectiveToday =
    currentHour < gameDayStartHour ? subtractDays(today, 1) : today;
  const calendarYesterday = subtractDays(effectiveToday, 1);
  return calculateGamingDayRange(
    calendarYesterday,
    gameDayStartHour,
    timezoneOffset
  );
}

/**
 * Handle "last7days", "30d", "Quarterly" time periods.
 */
function handleLastDays(
  nowLocal: Date,
  today: Date,
  gameDayStartHour: number,
  timezoneOffset: number,
  daysToSubtract: number
): GamingDayRange {
  const currentHour = nowLocal.getUTCHours();
  const effectiveToday =
    currentHour < gameDayStartHour ? subtractDays(today, 1) : today;
  const startDate = subtractDays(effectiveToday, daysToSubtract);
  return calculateMultiDayRange(
    startDate,
    effectiveToday,
    gameDayStartHour,
    timezoneOffset
  );
}

/**
 * Handle "All Time" - return very wide range.
 */
function handleAllTime(): GamingDayRange {
  return {
    rangeStart: new Date(0),
    rangeEnd: new Date('2100-01-01T23:59:59.999Z'),
  };
}

/**
 * Handle "Custom" time period.
 * If dates have specific times, use exact times. Otherwise, apply gaming day expansion.
 */
function handleCustom(
  customStartDate: Date | undefined,
  customEndDate: Date | undefined,
  gameDayStartHour: number,
  timezoneOffset: number
): GamingDayRange {
  if (!customStartDate || !customEndDate) {
    throw new Error(
      'Custom start and end dates are required for Custom time period'
    );
  }

  if (!isValidDate(customStartDate) || !isValidDate(customEndDate)) {
    throw new Error(
      `Invalid date values: startDate=${customStartDate}, endDate=${customEndDate}`
    );
  }

  const hasSpecificTime =
    hasExplicitTime(customStartDate, timezoneOffset) || 
    hasExplicitTime(customEndDate, timezoneOffset);

  if (hasSpecificTime) {
    const finalStart = customStartDate;
    let finalEnd = customEndDate;
    // Auto-correct if end time is before or equal to start time (e.g., user picked 8:00 AM to 7:59 AM on the same date)
    // This perfectly captures the user's intent to query until the next day's 7:59 AM.
    if (finalEnd.getTime() <= finalStart.getTime()) {
      finalEnd = new Date(finalEnd.getTime() + 24 * 60 * 60 * 1000);
    }
    return { rangeStart: finalStart, rangeEnd: finalEnd };
  }

  return expandToGamingDays(
    customStartDate,
    customEndDate,
    gameDayStartHour,
    timezoneOffset
  );
}

/**
 * Handle "LastHour" - return last 60 minutes.
 */
function handleLastHour(): GamingDayRange {
  const endNow = new Date();
  const startOneHourAgo = new Date(endNow.getTime() - 60 * 60 * 1000);
  return { rangeStart: startOneHourAgo, rangeEnd: endNow };
}

/**
 * Handle unknown time periods - fallback to midnight to midnight.
 */
function handleDefault(today: Date): GamingDayRange {
  const fallbackStart = new Date(today);
  fallbackStart.setUTCHours(0, 0, 0, 0);
  const fallbackEnd = new Date(today);
  fallbackEnd.setUTCHours(23, 59, 59, 999);
  return { rangeStart: fallbackStart, rangeEnd: fallbackEnd };
}

/* ============================================================================
 * CORE CALCULATION FUNCTIONS
 * ============================================================================ */

/**
 * Calculate gaming day range for a single date.
 * Gaming day: gameDayStartHour today → 1ms before same hour tomorrow.
 *
 * @param selectedDate - Calendar date to calculate from (local time)
 * @param gameDayStartHour - Hour when gaming day starts (0-23)
 * @param timezoneOffset - UTC offset (e.g., -4 for UTC-4)
 * @returns Gaming day range in UTC
 */
function calculateGamingDayRange(
  selectedDate: Date,
  gameDayStartHour: number,
  timezoneOffset: number
): GamingDayRange {
  const rangeStart = new Date(selectedDate);
  rangeStart.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);

  const rangeEnd = new Date(selectedDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  rangeEnd.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);
  rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

  return { rangeStart, rangeEnd };
}

/**
 * Calculate gaming day range for multiple days.
 * Start: gaming day start on startDate
 * End: 1ms before gaming day start on day after endDate
 */
function calculateMultiDayRange(
  startDate: Date,
  endDate: Date,
  gameDayStartHour: number,
  timezoneOffset: number
): GamingDayRange {
  const rangeStart = new Date(startDate);
  rangeStart.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);

  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  rangeEnd.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);
  rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

  return { rangeStart, rangeEnd };
}

/**
 * Expand date-only selections to full gaming days.
 * Single day: gaming day from startDate to end of that day
 * Range: gaming days from startDate to endDate (inclusive)
 */
function expandToGamingDays(
  customStartDate: Date,
  customEndDate: Date,
  gameDayStartHour: number,
  timezoneOffset: number
): GamingDayRange {
  const startGamingDay = calculateGamingDayRange(
    customStartDate,
    gameDayStartHour,
    timezoneOffset
  );
  const daysDiff = calculateDaysDifference(customStartDate, customEndDate);
  const isSingleDay = daysDiff < 1;

  if (isSingleDay) {
    const endGamingDay = calculateGamingDayRange(
      customStartDate,
      gameDayStartHour,
      timezoneOffset
    );
    return {
      rangeStart: startGamingDay.rangeStart,
      rangeEnd: endGamingDay.rangeEnd,
    };
  }

  const nextDayAfterEnd = subtractDays(customEndDate, -1);
  const endGamingDay = calculateGamingDayRange(
    nextDayAfterEnd,
    gameDayStartHour,
    timezoneOffset
  );

  return {
    rangeStart: startGamingDay.rangeStart,
    rangeEnd: endGamingDay.rangeStart,
  };
}

/* ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================ */

/**
 * Get current time in local timezone.
 */
function getCurrentLocalTime(timezoneOffset: number): Date {
  const nowUtc = new Date();
  return new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
}

/**
 * Get local calendar date from local time.
 */
function getLocalDateFromUTC(nowLocal: Date): Date {
  return new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate()
    )
  );
}

/**
 * Subtract days from a date.
 */
function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Check if a date has explicit time components (not midnight).
 */
function hasExplicitTime(date: Date, timezoneOffset: number): boolean {
  // Check if it's midnight in the specified timezone
  const localDate = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  return localDate.getUTCHours() !== 0 || localDate.getUTCMinutes() !== 0;
}

/**
 * Check if a date is valid.
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Calculate days difference between two dates.
 */
function calculateDaysDifference(start: Date, end: Date): number {
  // Normalize both dates to midnight UTC based on their LOCAL calendar date
  // This avoids timezone shifts where 11 PM Local becomes tomorrow in UTC
  const startLocal = new Date(start.getTime() + DEFAULT_TIMEZONE_OFFSET * 60 * 60 * 1000);
  const endLocal = new Date(end.getTime() + DEFAULT_TIMEZONE_OFFSET * 60 * 60 * 1000);
  
  const startUTC = Date.UTC(
    startLocal.getUTCFullYear(),
    startLocal.getUTCMonth(),
    startLocal.getUTCDate()
  );
  const endUTC = Date.UTC(
    endLocal.getUTCFullYear(),
    endLocal.getUTCMonth(),
    endLocal.getUTCDate()
  );
  
  return Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24));
}
