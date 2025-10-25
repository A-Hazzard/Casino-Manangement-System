/**
 * Shared date formatting utility using Intl.DateTimeFormat
 * Replaces moment/dayjs usage with native JavaScript date formatting
 */

import type { DateFormatOptions, DateInput } from '@shared/types/dateFormat';

// Re-export shared types for convenience
export type { DateFormatOptions, DateInput };

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
 * Format date and time for display (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export function formatDisplayDateTime(date: DateInput): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
 * Format date for database storage (e.g., "2024-01-15T14:30:00.000Z")
 */
export function formatForDatabase(date: DateInput): string {
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  return dateObj.toISOString();
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: DateInput): string {
  const now = new Date();
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if a date is today
 */
export function isToday(date: DateInput): boolean {
  const today = new Date();
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  return dateObj.toDateString() === today.toDateString();
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: DateInput): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  return dateObj.toDateString() === yesterday.toDateString();
}

/**
 * Get start of day (00:00:00)
 */
export function startOfDay(date: DateInput): Date {
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  const newDate = new Date(dateObj);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Get end of day (23:59:59)
 */
export function endOfDay(date: DateInput): Date {
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  const newDate = new Date(dateObj);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}
