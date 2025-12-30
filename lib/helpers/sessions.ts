/**
 * Sessions Helper Functions
 *
 * Provides utility functions for formatting and processing session data,
 * including currency formatting, duration formatting, date formatting,
 * and query parameter building for session API calls.
 *
 * Features:
 * - Formats currency amounts with fallback for undefined/null values.
 * - Formats session duration in hours:minutes:seconds format.
 * - Formats date strings for display.
 * - Formats points/credits with fallback.
 * - Builds API query parameters for session requests.
 */

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format currency amount with fallback for undefined/null values
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format session duration in hours:minutes:seconds
 */
export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes || minutes === 0) return '0:00:00';

  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  return `${hours}:${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Format date string for display
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format points/credits with fallback
 */
export function formatPoints(points: number | undefined | null): string {
  if (points === null || points === undefined) return '0';
  return points.toLocaleString();
}

// ============================================================================
// API Query Building
// ============================================================================
// Note: buildSessionsQueryParams was removed as it was unused
