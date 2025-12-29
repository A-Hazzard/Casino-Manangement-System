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
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
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
 * Format date as local time string with timezone offset
 * Preserves the local time intent by including timezone offset in the string
 *
 * Example: If user selects 11:45 AM in Trinidad (UTC-4), this formats as
 * "2025-12-07T11:45:00-04:00" instead of converting to UTC "2025-12-07T15:45:00.000Z"
 *
 * @param date - Date object representing local time
 * @param timezoneOffset - UTC offset in hours (default: -4 for Trinidad/Guyana/Barbados)
 * @returns ISO 8601 formatted string with timezone offset (e.g., "2025-12-07T11:45:00-04:00")
 */
export function formatLocalDateTimeString(
  date: DateInput,
  timezoneOffset: number = -4
): string {
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }

  // Extract local time components (not UTC)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  // Format timezone offset (e.g., -04:00, +05:30)
  const offsetHours = Math.abs(timezoneOffset);
  const offsetSign = timezoneOffset >= 0 ? '+' : '-';
  const offsetHoursStr = String(offsetHours).padStart(2, '0');
  const offsetMinutes = Math.abs((timezoneOffset % 1) * 60);
  const offsetMinutesStr = String(Math.floor(offsetMinutes)).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHoursStr}:${offsetMinutesStr}`;
}
