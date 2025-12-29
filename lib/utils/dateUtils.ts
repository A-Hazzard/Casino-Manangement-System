/**
 * Date Utility Functions
 *
 * Date utility functions for API operations with timezone support.
 *
 * Features:
 * - Date range calculations for time periods
 * - Trinidad timezone (UTC-4) support
 * - API-friendly date formatting
 * - Date range type definitions
 */

// ============================================================================
// Types
// ============================================================================
export type DateRange = {
  startDate?: Date;
  endDate?: Date;
  start?: Date;
  end?: Date;
  from?: Date;
  to?: Date;
  [key: string]: any;
};

// ============================================================================
// Date Range Functions
// ============================================================================

/**
 * Formats a date string or Date object to a readable format
 * @param dateInput - Date string, Date object, or timestamp
 * @returns Formatted date string or "Invalid Date" if parsing fails
 */
export function formatDateString(dateInput: string | Date | number): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}
