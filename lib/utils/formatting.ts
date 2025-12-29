/**
 * Formatting Utilities
 *
 * Utility functions for formatting currency, numbers, and dates.
 *
 * Features:
 * - Currency formatting with smart decimals
 * - Number formatting with commas
 * - Date formatting
 */

// ============================================================================
// Currency Formatting
// ============================================================================
/**
 * Formats a number as currency with smart decimal handling.
 * Hides .00 decimals but shows .01 and above.
 */
export function formatCurrency(value: number): string {
  if (isNaN(value)) {
    return '$0';
  }

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  });
}

// ============================================================================
// Date Formatting
// ============================================================================
/**
 * Format a date string to readable format
 */
export function formatDate(dateString: string | Date | undefined): string {
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
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

