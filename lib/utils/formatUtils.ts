/**
 * Format Utilities
 *
 * Utility functions for formatting currency, percentages, and large numbers.
 *
 * Features:
 * - Currency formatting with smart decimals
 * - Percentage formatting
 * - Large number formatting (K, M, B suffixes)
 */

// ============================================================================
// Currency Formatting
// ============================================================================
/**
 * Format a number as currency with smart decimal handling
 * @param value - The number to format
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number): string => {
  if (isNaN(value)) {
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
// Percentage Formatting
// ============================================================================
/**
 * Format a number as percentage with smart decimal handling
 * @param value - The number to format
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number): string => {
  if (isNaN(value)) {
    return '0%';
  }

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return `${value.toFixed(hasSignificantDecimals ? 2 : 0)}%`;
};

// ============================================================================
// Large Number Formatting
// ============================================================================
/**
 * Format a large number with appropriate suffixes (K, M, B) and smart decimals
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) {
    const billions = value / 1000000000;
    const hasDecimals = billions % 1 !== 0;
    const decimalPart = billions % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return `${billions.toFixed(hasSignificantDecimals ? 1 : 0)}B`;
  } else if (value >= 1000000) {
    const millions = value / 1000000;
    const hasDecimals = millions % 1 !== 0;
    const decimalPart = millions % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return `${millions.toFixed(hasSignificantDecimals ? 1 : 0)}M`;
  } else if (value >= 1000) {
    const thousands = value / 1000;
    const hasDecimals = thousands % 1 !== 0;
    const decimalPart = thousands % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return `${thousands.toFixed(hasSignificantDecimals ? 1 : 0)}K`;
  }
  return value.toLocaleString();
};
