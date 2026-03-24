/**
 * Shared date formatting utility using Intl.DateTimeFormat
 * Replaces moment/dayjs usage with native JavaScript date formatting
 */

import type { DateFormatOptions, DateInput } from '@/shared/types/dateFormat';

// Re-export shared types for convenience
// No re-exports needed as they are unused outside this file

/**
 * Format a date using Intl.DateTimeFormat
 * @param date - Date to format (Date object, string, or timestamp)
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: DateInput,
  options: DateFormatOptions = {}
): string {
  try {
    const dateObj =
      typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

    const formatter = new Intl.DateTimeFormat(
      options.locale || 'en-US',
      options
    );

    return formatter.format(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date for display (e.g., "Jan 15, 2024")
 */
export function formatDisplayDate(date: DateInput): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time only (e.g., "2:30 PM")
 */
export function formatTime(date: DateInput): string {
  return formatDate(date, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Convert 24-hour format time string to 12-hour format
 * @param time24 - Time string in 24-hour format (e.g., "14:00", "09:30", "23:45")
 * @returns Time string in 12-hour format (e.g., "2:00 PM", "9:30 AM", "11:45 PM")
 */
export function formatTime12Hour(time24: string): string {
  try {
    // Handle formats like "HH:MM" or "HH:MM:SS"
    const [hours, minutes] = time24.split(':').map(Number);

    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return time24; // Return original if invalid
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const minutesStr = minutes.toString().padStart(2, '0');

    return `${hour12}:${minutesStr} ${period}`;
  } catch (error) {
    console.warn('Time formatting error:', error);
    return time24; // Return original on error
  }
}

/**
 * Format date for API/ISO format (e.g., "2024-01-15")
 */
export function formatISODate(date: DateInput): string {
  return formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
}

/**
 * Trinidad timezone offset constant (AST - Atlantic Standard Time)
 * This system is designed for Trinidad operations
 */
export const TRINIDAD_TIMEZONE_OFFSET = -4;

/**
 * Format date as Trinidad time string with timezone offset
 *
 * This function ensures that regardless of where the user is located,
 * their selected time is always interpreted as Trinidad time (UTC-4).
 *
 * Example: A user in Japan selects "8:00 AM" on March 23
 * - Extracts: 8:00 AM (local time components)
 * - Formats as: "2025-03-23T08:00:00-04:00"
 * - Backend interprets as: 8:00 AM Trinidad = 12:00 UTC
 *
 * This ensures all users, regardless of their timezone, see the same data
 * when selecting the same local time.
 *
 * @param date - Date object representing user's selected date/time
 * @returns ISO 8601 formatted string with Trinidad timezone offset (e.g., "2025-12-07T11:45:00-04:00")
 */
export function formatLocalDateTimeString(
  date: DateInput,
  timezoneOffset: number = TRINIDAD_TIMEZONE_OFFSET
): string {
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }

  // Extract the user's selected time components (these are in their local timezone)
  // We treat these as if they were selected in Trinidad
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  // Always use Trinidad timezone offset
  const offsetHours = Math.abs(timezoneOffset);
  const offsetSign = timezoneOffset >= 0 ? '+' : '-';
  const offsetHoursStr = String(offsetHours).padStart(2, '0');
  const offsetMinutes = Math.abs((timezoneOffset % 1) * 60);
  const offsetMinutesStr = String(Math.floor(offsetMinutes)).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHoursStr}:${offsetMinutesStr}`;
}

/**
 * @deprecated Use formatLocalDateTimeString instead.
 * This function's previous behavior was incorrect for multi-timezone deployments.
 */
export const formatTrinidadDateTime = formatLocalDateTimeString;

/**
 * Create a Date object in Trinidad timezone from local time components.
 *
 * This function ensures that regardless of the user's browser timezone,
 * the selected time is interpreted as Trinidad time (UTC-4).
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month 1-12 (e.g., 3 for March)
 * @param day - Day of month 1-31
 * @param hours - Hours 0-23 (in Trinidad time)
 * @param minutes - Minutes 0-59
 * @param seconds - Seconds 0-59 (optional, defaults to 0)
 * @returns Date object representing the Trinidad time in UTC
 *
 * @example
 * // Create March 23, 2026 at 8:00 AM Trinidad time
 * const date = createDateInTrinidadTime(2026, 3, 23, 8, 0);
 * // This creates a Date that represents 8:00 AM Trinidad = 12:00 PM UTC
 */
export function createDateInTrinidadTime(
  year: number,
  month: number, // 1-12
  day: number,
  hours: number,
  minutes: number,
  seconds: number = 0
): Date {
  // Convert Trinidad local time to UTC
  // UTC = Trinidad - offset, where offset = -4
  // So UTC = Trinidad local + 4 hours
  const utcHours = hours - TRINIDAD_TIMEZONE_OFFSET;

  // Create date using UTC methods to avoid browser timezone issues
  const date = new Date();
  date.setUTCFullYear(year, month - 1, day); // Month is 0-indexed in JS
  date.setUTCHours(utcHours, minutes, seconds, 0);

  return date;
}

/**
 * Set the time on an existing Date object to gaming day start hour.
 *
 * @param date - The date to modify
 * @param gameDayOffset - The hour when gaming day starts (e.g., 8 for 8 AM)
 * @returns New Date with gaming day start time (Trinidad timezone)
 */
export function setTimeToGamingDayStart(
  date: Date,
  gameDayOffset: number
): Date {
  const result = new Date(date);
  const year = result.getFullYear();
  const month = result.getMonth() + 1;
  const day = result.getDate();

  return createDateInTrinidadTime(year, month, day, gameDayOffset, 0, 0);
}

/**
 * Set the time on an existing Date object to gaming day end time.
 * Gaming day end is (gameDayOffset - 1):59:59 (one minute before start).
 *
 * @param date - The date to modify
 * @param gameDayOffset - The hour when gaming day starts (e.g., 8 for 8 AM)
 * @returns New Date with gaming day end time (Trinidad timezone)
 */
export function setTimeToGamingDayEnd(date: Date, gameDayOffset: number): Date {
  const result = new Date(date);
  const year = result.getFullYear();
  const month = result.getMonth() + 1;
  const day = result.getDate();

  // End hour is one minute before gameDayOffset (e.g., 7:59:59 for offset 8)
  // Special case: if gameDayOffset is 0, end is 23:59:59
  const endHour = gameDayOffset === 0 ? 23 : gameDayOffset - 1;
  const endMinutes = 59;
  const endSeconds = 59;

  return createDateInTrinidadTime(
    year,
    month,
    day,
    endHour,
    endMinutes,
    endSeconds
  );
}

/**
 * Create the end of gaming day in Trinidad timezone.
 * This is (gameDayOffset - 1):59:59 on the next day.
 *
 * @param date - The date to base the calculation on
 * @param gameDayOffset - The hour when gaming day starts (e.g., 8 for 8 AM)
 * @returns Date representing end of gaming day (Trinidad time)
 */
export function getGamingDayEndInTrinidad(
  date: Date,
  gameDayOffset: number = 8
): Date {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = tomorrow.getMonth() + 1;
  const day = tomorrow.getDate();

  // End hour is one minute before gameDayOffset (e.g., 7:59:59 for offset 8)
  // Special case: if gameDayOffset is 0, end is 23:59:59
  const endHour = gameDayOffset === 0 ? 23 : gameDayOffset - 1;

  return createDateInTrinidadTime(year, month, day, endHour, 59, 59);
}
