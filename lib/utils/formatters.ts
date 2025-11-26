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

// ============================================================================
// Number Formatting
// ============================================================================
/**
 * Format large numbers with appropriate suffixes (K, M, B) and smart decimals.
 * @param value - The numeric value to format.
 * @returns Formatted number string.
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    const hasDecimals = billions % 1 !== 0;
    const decimalPart = billions % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return billions.toFixed(hasSignificantDecimals ? 1 : 0) + 'B';
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const hasDecimals = millions % 1 !== 0;
    const decimalPart = millions % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return millions.toFixed(hasSignificantDecimals ? 1 : 0) + 'M';
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    const hasDecimals = thousands % 1 !== 0;
    const decimalPart = thousands % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return thousands.toFixed(hasSignificantDecimals ? 1 : 0) + 'K';
  }
  return value.toString();
};

/**
 * Format a number as a percentage with smart decimal handling.
 * @param value - The numeric value to format.
 * @returns Formatted percentage string.
 */
export const formatPercentage = (value: number): string => {
  if (isNaN(value)) {
    return '0%';
  }

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;

  return `${value.toFixed(hasSignificantDecimals ? 1 : 0)}%`;
};

/**
 * Format a date/time string.
 * @param dateTime - The date/time string to format.
 * @returns Formatted date/time string.
 */
export const formatTime = (
  dateTime: string | Date | null | undefined
): string => {
  if (!dateTime) {
    return 'N/A';
  }

  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return 'Invalid Date';
  }
};
