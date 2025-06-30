/**
 * Format currency using default USD formatting
 * For user-specific currency formatting, use the formatCurrency method from the settings store
 */
export function formatCurrency(value: number | null | undefined): string {
  const amount = value ?? 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Legacy format function for backwards compatibility
 * @deprecated Use formatCurrency instead
 */
export default function formatCurrencyLegacy(
  value: number | null | undefined
): string {
  return (value ?? 0).toLocaleString();
}

/**
 * Format currency with specific currency code (bypasses user settings)
 */
export function formatCurrencyWithCode(
  value: number | null | undefined,
  currencyCode: string = "USD"
): string {
  const amount = value ?? 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format currency for specific locale (bypasses user settings)
 */
export function formatCurrencyWithLocale(
  value: number | null | undefined,
  locale: string = "en-US",
  currencyCode: string = "USD"
): string {
  const amount = value ?? 0;
  return amount.toLocaleString(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format currency as a plain number with currency symbol
 */
export function formatCurrencyPlain(
  value: number | null | undefined,
  symbol: string = "$",
  position: "before" | "after" = "before"
): string {
  const amount = value ?? 0;
  const formattedAmount = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return position === "before"
    ? `${symbol}${formattedAmount}`
    : `${formattedAmount}${symbol}`;
}
