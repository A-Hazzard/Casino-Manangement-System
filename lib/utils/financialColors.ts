/**
 * Financial Color Utilities
 *
 * Utility functions for color coding financial numbers.
 *
 * Features:
 * - Color coding for positive/negative/zero values
 * - Custom color support
 * - CSS class generation
 * - Green for positive, red for negative, gray for zero/null
 * - Specific rules for Money In, Money Out, and Gross
 */

// ============================================================================
// Color Class Functions
// ============================================================================

/**
 * Get color class for Money In (always green)
 * @param value - The Money In value (unused, but kept for consistency)
 * @returns CSS class for text color (always green)
 */
export function getMoneyInColorClass(
  _value: number | null | undefined
): string {
  return 'text-green-600'; // Always green for Money In
}

/**
 * Get color class for Money Out
 * - Blue if less than Money In (acceptable/neutral state)
 * - Red if more than Money In (warning state)
 * @param moneyOut - The Money Out value
 * @param moneyIn - The Money In value for comparison
 * @returns CSS class for text color
 */
export function getMoneyOutColorClass(
  moneyOut: number | null | undefined,
  moneyIn: number | null | undefined
): string {
  if (
    moneyOut === null ||
    moneyOut === undefined ||
    isNaN(moneyOut) ||
    moneyIn === null ||
    moneyIn === undefined ||
    isNaN(moneyIn)
  ) {
    return 'text-gray-600'; // Default gray for null/undefined values
  }

  // Blue if Money Out is less than Money In (acceptable), red if more (warning)
  return moneyOut < moneyIn ? 'text-blue-600' : 'text-red-600';
}

/**
 * Get color class for Gross
 * - Green if positive
 * - Red if negative
 * @param value - The Gross value
 * @returns CSS class for text color
 */
export function getGrossColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'text-gray-600'; // Default gray for null/undefined values
  }

  if (value > 0) {
    return 'text-green-600'; // Green for positive values
  } else if (value < 0) {
    return 'text-red-600'; // Red for negative values
  } else {
    return 'text-gray-600'; // Gray for zero values
  }
}
/**
 * Get the appropriate text color class for a financial value
 * @param value - The financial value to color code
 * @returns CSS class for text color
 */
export function getFinancialColorClass(
  value: number | null | undefined
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'text-gray-600'; // Default gray for null/undefined values
  }

  if (value > 0) {
    return 'text-green-600'; // Green for positive values
  } else if (value < 0) {
    return 'text-red-600'; // Red for negative values
  } else {
    return 'text-gray-600'; // Gray for zero values
  }
}

/**
 * Get the appropriate text color class for a financial value with custom colors
 * @param value - The financial value to color code
 * @param positiveColor - Custom color class for positive values (default: text-green-600)
 * @param negativeColor - Custom color class for negative values (default: text-red-600)
 * @param zeroColor - Custom color class for zero values (default: text-gray-600)
 * @returns CSS class for text color
 */
export function getFinancialColorClassCustom(
  value: number | null | undefined,
  positiveColor: string = 'text-green-600',
  negativeColor: string = 'text-red-600',
  zeroColor: string = 'text-gray-600'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return zeroColor;
  }

  if (value > 0) {
    return positiveColor;
  } else if (value < 0) {
    return negativeColor;
  } else {
    return zeroColor;
  }
}

/**
 * Format currency with color coding
 * @param value - The financial value to format and color
 * @param currency - The currency code (default: USD)
 * @returns Object with formatted value and color class
 */
export function formatCurrencyWithColor(
  value: number | null | undefined,
  currency: string = 'USD'
): { formatted: string; colorClass: string } {
  const colorClass = getFinancialColorClass(value);

  if (value === null || value === undefined || isNaN(value)) {
    return {
      formatted: '$0.00',
      colorClass,
    };
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return { formatted, colorClass };
}

/**
 * Format number with color coding (no currency symbol)
 * @param value - The financial value to format and color
 * @returns Object with formatted value and color class
 */
export function formatNumberWithColor(value: number | null | undefined): {
  formatted: string;
  colorClass: string;
} {
  const colorClass = getFinancialColorClass(value);

  if (value === null || value === undefined || isNaN(value)) {
    return {
      formatted: '0',
      colorClass,
    };
  }

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return { formatted, colorClass };
}
