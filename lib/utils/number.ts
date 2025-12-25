/**
 * Number Formatting Utilities
 *
 * Utility functions for formatting numbers and currency values with smart decimal handling.
 *
 * Features:
 * - Currency formatting with smart decimal handling (hides .00, shows .01+)
 * - Number formatting with smart decimal handling
 * - Legacy currency formatting for backwards compatibility
 * - Locale-aware formatting (en-US)
 */

// ============================================================================
// Currency Formatting
// ============================================================================
/**
 * Formats a number into a currency string with smart decimal handling.
 * Hides .00 decimals but shows .01 and above.
 * @param amount - The number to format.
 * @param currency - The currency code (e.g., 'USD'). Defaults to 'USD'.
 * @returns A formatted currency string (e.g., "$1,234" or "$1,234.56").
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD'
): string => {
  if (isNaN(amount)) {
    return '';
  }

  // Check if the amount has meaningful decimal places
  const hasDecimals = amount % 1 !== 0;
  const decimalPart = amount % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  }).format(amount);
};

// ============================================================================
// Number Formatting
// ============================================================================
/**
 * Formats a number with smart decimal handling for non-currency values.
 * Hides .00 decimals but shows .01 and above.
 *
 * @param value - The number to format.
 * @returns A formatted number string (e.g., "1,234" or "1,234.56").
 */
export const formatNumber = (value: number): string => {
  if (isNaN(value)) {
    return '0';
  }

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  }).format(value);
};

// ============================================================================
// Legacy Formatting
// ============================================================================
/**
 * Formats a number as currency with smart decimal handling (legacy function for compatibility).
 *
 * @param amount - The number to format.
 * @param currency - The currency code (e.g., 'USD'). Defaults to 'USD'.
 * @returns A formatted currency string.
 */
export const formatCurrencyLegacy = (
  amount: number,
  currency: string = 'USD'
): string => {
  return formatCurrency(amount, currency);
};
