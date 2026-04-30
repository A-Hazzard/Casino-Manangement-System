/**
 * Movement Request Utilities
 *
 * Utility functions for movement request operations.
 *
 * Features:
 * - Status color coding
 * - Date formatting for movement requests
 */

import { formatFullDate } from '../date/formatting';


// ============================================================================
// Status Functions
// ============================================================================
/**
 * Get the color class for a movement request status.
 * @param status MovementRequestStatus
 * @returns string (Tailwind color class)
 */
export function getStatusColor(status: string): string {
  if (!status) { console.error('[getStatusColor] status is required'); return 'bg-gray-200 text-gray-500'; }
  switch (status) {
    case 'completed':
      return 'bg-greenHighlight/20 text-greenHighlight';
    case 'pending':
      return 'bg-orangeHighlight/20 text-orangeHighlight';
    default:
      return 'bg-gray-200 text-gray-500';
  }
}

// ============================================================================
// Date Formatting Functions
// ============================================================================

/**
 * Format a date for display in movement requests.
 * @param date Date or string
 * @returns string with date and time
 */
export function formatMovementRequestDate(date: Date | string): string {
  if (!date) { console.error('[formatMovementRequestDate] date is required'); return ''; }
  return formatFullDate(date);
}

