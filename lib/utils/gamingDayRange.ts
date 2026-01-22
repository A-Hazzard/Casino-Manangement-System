/**
 * Gaming Day Range Utility
 *
 * This utility handles the calculation of gaming day ranges based on each location's
 * gameDayOffset setting. Gaming days don't follow standard calendar days - they start
 * at a specific hour (e.g., 9AM) and run until the same hour the next day.
 *
 * Features:
 * - Gaming day range calculation
 * - Timezone offset handling for different licensees
 * - Support for custom game day offsets
 * - Date range calculations for time periods
 *
 * Example: If gameDayOffset is 9 (9AM start):
 * - "Today" becomes: 9AM today to 9AM tomorrow (Trinidad time)
 * - "Last 7 days" becomes: 9AM 7 days ago to 9AM tomorrow (Trinidad time)
 */

// ============================================================================
// Type Definitions
// ============================================================================
export type GamingDayRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

// ============================================================================
// Timezone Functions
// ============================================================================

/**
 * Calculate gaming day range for a single date
 * @param selectedDate - The date to calculate the gaming day for
 * @param gameDayStartHour - The hour when the gaming day starts (0-23, in local timezone)
 * @param timezoneOffset - UTC offset in hours (e.g., -4 for UTC-4, default -4 for Trinidad/Guyana/Barbados)
 * @returns Object with rangeStart and rangeEnd in UTC
 */
function getGamingDayRange(
  selectedDate: Date,
  gameDayStartHour: number = 0,
  timezoneOffset: number = -4
): GamingDayRange {
  // Gaming day runs from gameDayStartHour to (gameDayStartHour - 1ms) next day (local time)
  // Convert local time to UTC by subtracting the timezone offset
  // Example: For UTC-4 with offset 9: local 9 AM = 9 - (-4) = 13:00 UTC

  // Gaming day start on the selected date at gameDayStartHour (e.g., offset 9 = 9:00:00.000 AM local)
  const rangeStart = new Date(selectedDate);
  rangeStart.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);

  // Gaming day end is 1 millisecond before the next gaming day starts
  // (e.g., offset 9 = next day at 8:59:59.999 AM local)
  const rangeEnd = new Date(selectedDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1); // Move to next day
  rangeEnd.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0); // Set to start hour
  rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1); // Subtract 1ms

  return { rangeStart, rangeEnd };
}

/**
 * Calculate gaming day range for a multi-day period
 * @param startDate - The start date of the period
 * @param endDate - The end date of the period
 * @param gameDayStartHour - The hour when the gaming day starts (0-23, local timezone)
 * @param timezoneOffset - UTC offset in hours (e.g., -4 for UTC-4, default -4 for Trinidad/Guyana/Barbados)
 * @returns Object with rangeStart and rangeEnd in UTC
 */
function getGamingDayRangeMultiDay(
  startDate: Date,
  endDate: Date,
  gameDayStartHour: number = 0,
  timezoneOffset: number = -4
): GamingDayRange {
  // For multi-day ranges, start from the gaming day start hour of the start date
  // and end 1ms before the gaming day start hour of the day after the end date

  // Gaming day start on the start date at gameDayStartHour
  const rangeStart = new Date(startDate);
  rangeStart.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);

  // Gaming day end is 1 millisecond before the next gaming day starts (day after end date)
  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1); // Move to day after end date
  rangeEnd.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0); // Set to start hour
  rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1); // Subtract 1ms

  return { rangeStart, rangeEnd };
}

/**
 * Calculate gaming day range based on time period
 * @param timePeriod - The time period ("Today", "Yesterday", "last7days", "last30days", "Custom")
 * @param customStartDate - Custom start date (required for "Custom" period)
 * @param customEndDate - Custom end date (required for "Custom" period)
 * @param gameDayStartHour - The hour when the gaming day starts (0-23, Trinidad time)
 * @returns Object with rangeStart and rangeEnd in UTC
 */
export function getGamingDayRangeForPeriod(
  timePeriod: string,
  gameDayStartHour: number = 0,
  customStartDate?: Date,
  customEndDate?: Date,
  timezoneOffset: number = -4
): GamingDayRange {
  // Get current time in LOCAL timezone (Trinidad/Guyana/Barbados = UTC-4)
  // This ensures "Today" is based on local time, not UTC time
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);

  if (timePeriod === 'Yesterday') {
    console.error(
      `[GAMING DAY DEBUG] timePeriod=Yesterday, nowUtc=${nowUtc.toISOString()}, timezoneOffset=${timezoneOffset}, nowLocal=${nowLocal.toISOString()}`
    );
  }

  // Use the local date for "today" calculations in UTC
  const today = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate()
    )
  );

  switch (timePeriod) {
    case 'Today':
      // 🔧 FIX: If current time is before gaming day start hour, use YESTERDAY
      // Example: If it's 2 AM and gaming day starts at 8 AM, we're still in yesterday's gaming day
      const currentHour = nowLocal.getUTCHours();
      const todayOrYesterday =
        currentHour < gameDayStartHour
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000) // Use yesterday
          : today; // Use today
      return getGamingDayRange(
        todayOrYesterday,
        gameDayStartHour,
        timezoneOffset
      );

    case 'Yesterday':
      // "Yesterday" refers to the calendar day before "today".
      // However, if we are currently before the gaming day start hour,
      // "today" (gaming day) is actually yesterday's calendar day,
      // so "Yesterday" (gaming day) must be the day before that.
      const currentHourY = nowLocal.getUTCHours();
      const todayY =
        currentHourY < gameDayStartHour
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000) // Shift back if in early morning
          : today;
      const calendarYesterday = new Date(
        todayY.getTime() - 24 * 60 * 60 * 1000
      );
      return getGamingDayRange(
        calendarYesterday,
        gameDayStartHour,
        timezoneOffset
      );

    case 'last7days':
    case '7d':
      // 🔧 FIX: Base calculation on current gaming day
      const currentHour7d = nowLocal.getUTCHours();
      const today7d =
        currentHour7d < gameDayStartHour
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
          : today;
      const sevenDaysAgo = new Date(today7d);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6 because today is day 1
      return getGamingDayRangeMultiDay(
        sevenDaysAgo,
        today7d,
        gameDayStartHour,
        timezoneOffset
      );

    case 'last30days':
    case '30d':
      // 🔧 FIX: Base calculation on current gaming day
      const currentHour30d = nowLocal.getUTCHours();
      const today30d =
        currentHour30d < gameDayStartHour
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
          : today;
      const thirtyDaysAgo = new Date(today30d);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // -29 because today is day 1
      return getGamingDayRangeMultiDay(
        thirtyDaysAgo,
        today30d,
        gameDayStartHour,
        timezoneOffset
      );

    case 'Quarterly':
      // 🔧 FIX: Base calculation on current gaming day
      const currentHourQ = nowLocal.getUTCHours();
      const todayQ =
        currentHourQ < gameDayStartHour
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
          : today;
      const ninetyDaysAgo = new Date(todayQ);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89); // -89 because today is day 1
      return getGamingDayRangeMultiDay(
        ninetyDaysAgo,
        todayQ,
        gameDayStartHour,
        timezoneOffset
      );

    case 'All Time':
      // For All Time, return a very wide range to include all records
      return {
        rangeStart: new Date(0),
        rangeEnd: new Date('2100-01-01T23:59:59.999Z'),
      };

    case 'Custom':
      if (!customStartDate || !customEndDate) {
        throw new Error(
          'Custom start and end dates are required for Custom time period'
        );
      }

      // Validate dates are valid Date objects
      if (
        !(customStartDate instanceof Date) ||
        !(customEndDate instanceof Date) ||
        isNaN(customStartDate.getTime()) ||
        isNaN(customEndDate.getTime())
      ) {
        throw new Error(
          `Invalid date values: startDate=${customStartDate}, endDate=${customEndDate}`
        );
      }

      // For custom dates, apply gaming day offset
      // User selects: Oct 31 to Oct 31 (same day)
      // Means: Oct 31 gaming day start (e.g., 11 AM) to Nov 1 gaming day start (e.g., 11 AM) exclusive
      // If user selects: Sep 1 to Sep 30 (range)
      // Means: Sep 1 gaming day start (e.g., 11 AM) to Oct 1 gaming day start (e.g., 11 AM) exclusive

      const startGamingDay = getGamingDayRange(
        customStartDate,
        gameDayStartHour,
        timezoneOffset
      );

      // Check if start and end dates are the same day, or if endDate is startDate + 1 day
      // (Some date pickers set endDate to startDate + 1 day when selecting a single day)
      const startDateStr = customStartDate.toISOString().split('T')[0];
      const endDateStr = customEndDate.toISOString().split('T')[0];
      const isSameDay = startDateStr === endDateStr;

      // Check if endDate is exactly 1 day after startDate (single day selection)
      const startDateOnly = new Date(startDateStr + 'T00:00:00.000Z');
      const endDateOnly = new Date(endDateStr + 'T00:00:00.000Z');
      const daysDiff = Math.floor(
        (endDateOnly.getTime() - startDateOnly.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const isSingleDaySelection = isSameDay || daysDiff === 1;

      if (isSingleDaySelection) {
        // Single day selection: Only include that day's gaming day
        // Gaming day for Nov 16: Nov 16 11:00 AM to Nov 17 10:59:59.999 AM (inclusive)
        const endGamingDay = getGamingDayRange(
          customStartDate, // Use startDate for single day selection
          gameDayStartHour,
          timezoneOffset
        );
        return {
          rangeStart: startGamingDay.rangeStart,
          rangeEnd: endGamingDay.rangeEnd, // End of the selected day's gaming day (Nov 17 10:59:59.999 AM)
        };
      } else {
        // Date range: Include all gaming days from start to end (inclusive)
        // For end date, we want to include the FULL gaming day, so we get the next gaming day start
        const endDateNextDay = new Date(customEndDate);
        endDateNextDay.setDate(endDateNextDay.getDate() + 1);
        const endGamingDay = getGamingDayRange(
          endDateNextDay,
          gameDayStartHour,
          timezoneOffset
        );

        return {
          rangeStart: startGamingDay.rangeStart,
          rangeEnd: endGamingDay.rangeStart, // Use start of next gaming day to include full last day
        };
      }

    default:
      // Fallback to standard day boundaries for unknown periods
      const fallbackStart = new Date(today);
      fallbackStart.setUTCHours(0, 0, 0, 0);
      const fallbackEnd = new Date(today);
      fallbackEnd.setUTCHours(23, 59, 59, 999);
      return { rangeStart: fallbackStart, rangeEnd: fallbackEnd };
  }
}

/**
 * Get all gaming day ranges for multiple locations
 * This is useful when aggregating data across locations with different gameDayOffsets
 * @param locations - Array of location objects with _id and gameDayOffset
 * @param timePeriod - The time period
 * @param customStartDate - Custom start date (for Custom period)
 * @param customEndDate - Custom end date (for Custom period)
 * @returns Map of locationId to GamingDayRange
 */
export function getGamingDayRangesForLocations(
  locations: Array<{ _id: string; gameDayOffset?: number }>,
  timePeriod: string,
  customStartDate?: Date,
  customEndDate?: Date,
  timezoneOffset: number = -4
): Map<string, GamingDayRange> {
  const ranges = new Map<string, GamingDayRange>();

  for (const location of locations) {
    // Use ?? instead of || to properly handle 0 as a valid value
    // Default to 8 (8 AM) if gameDayOffset is undefined
    const gameDayOffset = location.gameDayOffset ?? 8;
    const range = getGamingDayRangeForPeriod(
      timePeriod,
      gameDayOffset,
      customStartDate,
      customEndDate,
      timezoneOffset
    );
    ranges.set(location._id, range);
  }

  return ranges;
}

