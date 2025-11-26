/**
 * Currency Formatting Utilities
 *
 * Utility functions for formatting currency values with smart decimal handling.
 *
 * Features:
 * - Default USD formatting with smart decimal handling
 * - Custom currency code support
 * - Locale-specific formatting
 * - Plain number formatting with custom symbols
 * - Legacy format function for backwards compatibility
 */

// ============================================================================
// Default Currency Formatting
// ============================================================================
/**
 * Format currency using default USD formatting with smart decimal handling
 * For user-specific currency formatting, use the formatCurrency method from the settings store
 */
export function formatCurrency(value: number | null | undefined): string {
  const amount = value ?? 0;

  // Check if the amount has meaningful decimal places
  const hasDecimals = amount % 1 !== 0;
  const decimalPart = amount % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  });
}

// ============================================================================
// Legacy Formatting
// ============================================================================
/**
 * Legacy format function for backwards compatibility
 * @deprecated Use formatCurrency instead
 */
export default function formatCurrencyLegacy(
  value: number | null | undefined
): string {
  return (value ?? 0).toLocaleString();
}

// ============================================================================
// Custom Currency Formatting
// ============================================================================
/**
 * Format currency with specific currency code (bypasses user settings)
 */
export function formatCurrencyWithCode(
  value: number | null | undefined,
  currencyCode: string = 'USD'
): string {
  const amount = value ?? 0;

  // Check if the amount has meaningful decimal places
  const hasDecimals = amount % 1 !== 0;
  const decimalPart = amount % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  });
}

/**
 * Format currency for specific locale (bypasses user settings)
 */
export function formatCurrencyWithLocale(
  value: number | null | undefined,
  locale: string = 'en-US',
  currencyCode: string = 'USD'
): string {
  const amount = value ?? 0;

  // Check if the amount has meaningful decimal places
  const hasDecimals = amount % 1 !== 0;
  const decimalPart = amount % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return amount.toLocaleString(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  });
}

// ============================================================================
// Plain Number Formatting
// ============================================================================
/**
 * Format currency as a plain number with currency symbol
 */
export function formatCurrencyPlain(
  value: number | null | undefined,
  symbol: string = '$',
  position: 'before' | 'after' = 'before'
): string {
  const amount = value ?? 0;

  // Check if the amount has meaningful decimal places
  const hasDecimals = amount % 1 !== 0;
  const decimalPart = amount % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  });

  return position === 'before'
    ? `${symbol}${formattedAmount}`
    : `${formattedAmount}${symbol}`;
}
