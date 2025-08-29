/**
 * Utility functions for color coding financial numbers
 * Green for positive values, red for negative values
 */

/**
 * Get the appropriate text color class for a financial value
 * @param value - The financial value to color code
 * @returns CSS class for text color
 */
export function getFinancialColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "text-gray-600"; // Default gray for null/undefined values
  }
  
  if (value > 0) {
    return "text-green-600"; // Green for positive values
  } else if (value < 0) {
    return "text-red-600"; // Red for negative values
  } else {
    return "text-gray-600"; // Gray for zero values
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
  positiveColor: string = "text-green-600",
  negativeColor: string = "text-red-600",
  zeroColor: string = "text-gray-600"
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
  currency: string = "USD"
): { formatted: string; colorClass: string } {
  const colorClass = getFinancialColorClass(value);
  
  if (value === null || value === undefined || isNaN(value)) {
    return {
      formatted: "$0.00",
      colorClass
    };
  }
  
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
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
export function formatNumberWithColor(
  value: number | null | undefined
): { formatted: string; colorClass: string } {
  const colorClass = getFinancialColorClass(value);
  
  if (value === null || value === undefined || isNaN(value)) {
    return {
      formatted: "0",
      colorClass
    };
  }
  
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return { formatted, colorClass };
}
