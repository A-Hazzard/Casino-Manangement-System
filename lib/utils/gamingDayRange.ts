/**
 * Gaming Day Range Utility
 *
 * This utility handles the calculation of gaming day ranges based on each location's
 * gameDayOffset setting. Gaming days don't follow standard calendar days - they start
 * at a specific hour (e.g., 9AM) and run until the same hour the next day.
 *
 * Example: If gameDayOffset is 9 (9AM start):
 * - "Today" becomes: 9AM today to 9AM tomorrow (Trinidad time)
 * - "Last 7 days" becomes: 9AM 7 days ago to 9AM tomorrow (Trinidad time)
 */

export type GamingDayRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

/**
 * Get UTC offset for a licensee
 * @param licenseeName - The licensee name (e.g., "TTG", "Cabana", "Barbados")
 * @returns UTC offset in hours (positive for UTC+, negative for UTC-)
 */
export function getTimezoneOffsetForLicensee(licenseeName: string): number {
  // Trinidad and Tobago Gaming (TTG) = UTC-4
  if (
    licenseeName?.toLowerCase().includes('ttg') ||
    licenseeName?.toLowerCase().includes('trinidad')
  ) {
    return -4;
  }

  // Guyana (Cabana) = UTC-4
  if (
    licenseeName?.toLowerCase().includes('cabana') ||
    licenseeName?.toLowerCase().includes('guyana')
  ) {
    return -4;
  }

  // Barbados = UTC-4
  if (licenseeName?.toLowerCase().includes('barbados')) {
    return -4;
  }

  // Default to UTC-4 (Trinidad time) if not matched
  return -4;
}

/**
 * Calculate gaming day range for a single date
 * @param selectedDate - The date to calculate the gaming day for
 * @param gameDayStartHour - The hour when the gaming day starts (0-23, in local timezone)
 * @param timezoneOffset - UTC offset in hours (e.g., -4 for UTC-4, default -4 for Trinidad/Guyana/Barbados)
 * @returns Object with rangeStart and rangeEnd in UTC
 */
export function getGamingDayRange(
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
export function getGamingDayRangeMultiDay(
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
      // 🔧 FIX: Yesterday's gaming day should be relative to current gaming day
      // If it's 2 AM and we're in yesterday's gaming day, "Yesterday" = day before yesterday
      const currentHour2 = nowLocal.getUTCHours();
      const yesterdayBase =
        currentHour2 < gameDayStartHour
          ? new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
          : new Date(today.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      return getGamingDayRange(yesterdayBase, gameDayStartHour, timezoneOffset);

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

    case 'Custom':
      if (!customStartDate || !customEndDate) {
        throw new Error(
          'Custom start and end dates are required for Custom time period'
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
    const gameDayOffset = location.gameDayOffset || 0;
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

/**
 * Helper function to check if a date is within a gaming day range
 * @param date - The date to check
 * @param range - The gaming day range
 * @returns True if the date is within the range
 */
export function isDateInGamingDayRange(
  date: Date,
  range: GamingDayRange
): boolean {
  return date >= range.rangeStart && date <= range.rangeEnd;
}

/**
 * Helper function to format gaming day range for display
 * @param range - The gaming day range
 * @param gameDayOffset - The gaming day offset for display
 * @returns Formatted string representation of the range
 */
export function formatGamingDayRange(
  range: GamingDayRange,
  gameDayOffset: number
): string {
  const startTime = range.rangeStart.toLocaleString(undefined, {
    timeZone: 'America/Port_of_Spain',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const endTime = range.rangeEnd.toLocaleString(undefined, {
    timeZone: 'America/Port_of_Spain',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${startTime} - ${endTime} (${gameDayOffset}:00 AM start)`;
}
