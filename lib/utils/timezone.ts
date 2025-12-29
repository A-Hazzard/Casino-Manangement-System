/**
 * Timezone Utility for Trinidad and Tobago (UTC-4)
 *
 * This utility handles conversion between UTC and Trinidad local time.
 * Trinidad is UTC-4 year-round (no daylight saving time).
 *
 * Features:
 * - UTC <-> Trinidad time conversion
 * - Current Trinidad time helpers
 * - Object date field conversion
 * - Response data conversion helpers
 */

// ============================================================================
// Conversion Functions
// ============================================================================
/**
 * Formats a UTC date as Trinidad local time string.
 * @param utcDate - Date in UTC.
 * @param options - Intl.DateTimeFormatOptions.
 * @returns Formatted date string in Trinidad time.
 */
export function formatTrinidadTime(
  utcDate: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  // Use timeZone option for accurate conversion regardless of browser timezone
  // This is more reliable than manually adjusting hours with setHours()
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'America/Port_of_Spain', // Trinidad and Tobago timezone (UTC-4)
  };

  return utcDate.toLocaleString('en-US', {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Creates a date range filter for MongoDB queries adjusted for Trinidad timezone
 * @param startDate - Start date in Trinidad local time
 * @param endDate - End date in Trinidad local time
 * @returns Object with UTC dates for MongoDB queries
 */


