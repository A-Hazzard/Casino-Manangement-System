/**
 * Formatting Utilities
 *
 * Utility functions for formatting currency and numbers.
 *
 * Features:
 * - Currency formatting with smart decimals
 * - Number formatting with commas
 * - Date formatting (re-exported from date utilities)
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
// Date Formatting (Re-exported for convenience)
// ============================================================================
/**
 * Re-export formatDate from date utilities for backward compatibility
 * The actual implementation is in lib/utils/date/formatting.ts
 */
export { formatDate } from './date/formatting';


