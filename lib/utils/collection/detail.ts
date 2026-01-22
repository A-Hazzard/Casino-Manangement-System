/**
 * Collection Report Detail Utility Functions
 *
 * Utility functions for formatting and processing collection report detail data.
 *
 * Features:
 * - SAS time formatting
 * - Machine sorting utilities
 */

// ============================================================================
// Date Formatting Functions
// ============================================================================

/**
 * Format SAS time for display
 * @param dateString - Date string to format
 * @returns Formatted date string or "No SAS Time" if invalid
 */
export function formatSasTime(dateString: string): string {
  // Handle missing/empty dates
  if (!dateString || dateString === '-' || dateString === '') {
    return 'No SAS Time';
  }

  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'No SAS Time';
    }
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return 'No SAS Time'; // Better than showing "Invalid Date"
  }
}


