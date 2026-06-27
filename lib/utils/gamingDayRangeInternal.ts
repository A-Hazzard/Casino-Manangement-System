/**
 * Gaming Day Range Internal Helpers
 *
 * Private helper functions for gaming day range calculations.
 * Not intended for direct consumer import — use the public API
 * from gamingDayRange.ts instead.
 *
 * @module lib/utils/gamingDayRangeInternal
 */

import type { GamingDayRange } from './gamingDayRange';

// ============================================================================
// Time Period Handlers
// ============================================================================

/**
 * Handle "Today" time period.
 * If current hour is before gaming day start, use yesterday's date.
 *
 * @internal
 */
export function handleToday(
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
 *
 * @internal
 */
export function handleYesterday(
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
 *
 * @internal
 */
export function handleLastDays(
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
 * Handle "All Time" — return very wide range.
 *
 * @internal
 */
export function handleAllTime(): GamingDayRange {
  return {
    rangeStart: new Date(0),
    rangeEnd: new Date('2100-01-01T23:59:59.999Z'),
  };
}

/**
 * Handle "Custom" time period.
 *
 * @internal
 */
export function handleCustom(
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
 * Handle "LastHour" — return last 60 minutes.
 *
 * @internal
 */
export function handleLastHour(): GamingDayRange {
  const endNow = new Date();
  const startOneHourAgo = new Date(endNow.getTime() - 60 * 60 * 1000);
  return { rangeStart: startOneHourAgo, rangeEnd: endNow };
}

/**
 * Handle unknown time periods — fallback to midnight to midnight.
 *
 * @internal
 */
export function handleDefault(today: Date): GamingDayRange {
  const fallbackStart = new Date(today);
  fallbackStart.setUTCHours(0, 0, 0, 0);
  const fallbackEnd = new Date(today);
  fallbackEnd.setUTCHours(23, 59, 59, 999);
  return { rangeStart: fallbackStart, rangeEnd: fallbackEnd };
}

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculate gaming day range for a single date.
 *
 * @internal
 */
export function calculateGamingDayRange(
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
 *
 * @internal
 */
export function calculateMultiDayRange(
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
 *
 * @internal
 */
export function expandToGamingDays(
  customStartDate: Date,
  customEndDate: Date,
  gameDayStartHour: number,
  timezoneOffset: number
): GamingDayRange {
  const startRange = calculateGamingDayRange(
    customStartDate,
    gameDayStartHour,
    timezoneOffset
  );

  const endRange = calculateGamingDayRange(
    customEndDate,
    gameDayStartHour,
    timezoneOffset
  );

  return {
    rangeStart: startRange.rangeStart,
    rangeEnd: endRange.rangeEnd,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current time in local timezone.
 *
 * @internal
 */
export function getCurrentLocalTime(timezoneOffset: number): Date {
  const nowUtc = new Date();
  return new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
}

/**
 * Get local calendar date from local time.
 *
 * @internal
 */
export function getLocalDateFromUTC(nowLocal: Date): Date {
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
 *
 * @internal
 */
export function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Check if a date has explicit time components (not midnight).
 *
 * @internal
 */
export function hasExplicitTime(date: Date, timezoneOffset: number): boolean {
  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0;

  const localDate = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  const isLocalMidnight =
    localDate.getUTCHours() === 0 &&
    localDate.getUTCMinutes() === 0 &&
    localDate.getUTCSeconds() === 0;

  return !isUtcMidnight && !isLocalMidnight;
}

/**
 * Check if a date is valid.
 *
 * @internal
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}
