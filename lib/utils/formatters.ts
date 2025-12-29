/**
 * Formatter Utilities
 *
 * Utility functions for formatting currency, numbers, and large values.
 *
 * Features:
 * - Currency formatting with smart decimals
 * - Large number formatting (K, M, B suffixes)
 * - Number formatting with commas
 */

// ============================================================================
// Currency Formatting
// ============================================================================
/**
 * Format currency values for display with smart decimal handling.
 * @param value - The numeric value to format.
 * @returns Formatted currency string (e.g., $1,234 or $1,234.56).
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '$0';
  }

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  }).format(value);
};

