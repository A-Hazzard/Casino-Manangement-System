/**
 * Smart number formatting utilities that hide unnecessary decimal places
 * while preserving meaningful decimal values.
 */

/**
 * Formats a number with smart decimal handling.
 * Hides .00 decimals but shows .01 and above.
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export function formatSmartNumber(
  value: number,
  options: {
    decimals?: number;
    showDecimals?: boolean;
    currency?: string;
    style?: 'currency' | 'decimal' | 'percent';
  } = {}
): string {
  if (isNaN(value)) {
    return options.style === 'currency' ? '$0' : '0';
  }

  const {
    decimals = 2,
    showDecimals = true,
    currency = 'USD',
    style = 'decimal',
  } = options;

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const threshold = Math.pow(10, -decimals);
  const hasSignificantDecimals = hasDecimals && decimalPart >= threshold;

  const formatOptions: Intl.NumberFormatOptions = {
    style,
    ...(style === 'currency' && { currency }),
    minimumFractionDigits:
      showDecimals && hasSignificantDecimals ? decimals : 0,
    maximumFractionDigits:
      showDecimals && hasSignificantDecimals ? decimals : 0,
  };

  return new Intl.NumberFormat('en-US', formatOptions).format(value);
}

/**
 * Formats a number as currency with smart decimal handling.
 * @param value - The number to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatSmartCurrency(
  value: number,
  currency: string = 'USD'
): string {
  return formatSmartNumber(value, { style: 'currency', currency });
}

/**
 * Formats a number as percentage with smart decimal handling.
 * @param value - The number to format (should be between 0-1 for percentage)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatSmartPercentage(
  value: number,
  decimals: number = 1
): string {
  const percentage = value * 100;
  return formatSmartNumber(percentage, { decimals, style: 'percent' });
}

/**
 * Formats a number with smart decimal handling for display.
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatSmartDecimal(
  value: number,
  decimals: number = 2
): string {
  return formatSmartNumber(value, { decimals });
}

/**
 * Formats a large number with appropriate suffixes (K, M, B) and smart decimals.
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatSmartLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return formatSmartDecimal(billions, 1) + 'B';
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return formatSmartDecimal(millions, 1) + 'M';
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return formatSmartDecimal(thousands, 1) + 'K';
  }
  return formatSmartDecimal(value, 0);
}

/**
 * Formats a file size with appropriate units and smart decimals.
 * @param bytes - The file size in bytes
 * @returns Formatted file size string
 */
export function formatSmartFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    const gb = bytes / (1024 * 1024 * 1024);
    return formatSmartDecimal(gb, 2) + ' GB';
  }
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return formatSmartDecimal(mb, 2) + ' MB';
  }
  if (bytes >= 1024) {
    const kb = bytes / 1024;
    return formatSmartDecimal(kb, 2) + ' KB';
  }
  return bytes + ' B';
}
