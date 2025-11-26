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

/**
 * Build API query parameters for sessions
 */
export function buildSessionsQueryParams(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  licensee?: string;
  startDate?: Date;
  endDate?: Date;
}): URLSearchParams {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params.licensee) queryParams.append('licencee', params.licensee);
  if (params.startDate)
    queryParams.append('startDate', params.startDate.toISOString());
  if (params.endDate)
    queryParams.append('endDate', params.endDate.toISOString());

  return queryParams;
}
