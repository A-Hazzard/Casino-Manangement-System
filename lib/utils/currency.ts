import type {
  CurrencyCode,
  ExchangeRates,
  CurrencyConversionRequest,
} from "@/shared/types";

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

/**
 * Convert amount from one currency to another using exchange rates
 */
export function convertCurrency({
  amount,
  amountCurrency,
  displayCurrency,
  rates,
}: CurrencyConversionRequest): number {
  if (amountCurrency === displayCurrency) {
    return amount;
  }

  // Convert to base currency first, then to display currency
  const baseRate = rates.rates[amountCurrency];
  const displayRate = rates.rates[displayCurrency];

  if (!baseRate || !displayRate) {
    console.warn(
      `Missing exchange rates for ${amountCurrency} or ${displayCurrency}`
    );
    return amount;
  }

  // Convert: amount / baseRate * displayRate
  return (amount / baseRate) * displayRate;
}

/**
 * Format money with currency conversion support
 */
export function formatMoney(
  value: number | null | undefined,
  displayCurrency: CurrencyCode,
  rates?: ExchangeRates,
  originalCurrency?: CurrencyCode
): string {
  if (value == null) return formatCurrencyWithCode(0, displayCurrency);

  let amount = value;

  // Convert currency if rates and original currency are provided
  if (rates && originalCurrency && originalCurrency !== displayCurrency) {
    amount = convertCurrency({
      amount: value,
      amountCurrency: originalCurrency,
      displayCurrency,
      rates,
    });
  }

  return formatCurrencyWithCode(amount, displayCurrency);
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    USD: "$",
    TTD: "TT$",
    GYD: "GY$",
    BBD: "BBD$",
  };

  return symbols[currencyCode] || currencyCode;
}

/**
 * Get currency name for a given currency code
 */
export function getCurrencyName(currencyCode: CurrencyCode): string {
  const names: Record<CurrencyCode, string> = {
    USD: "US Dollar",
    TTD: "Trinidad & Tobago Dollar",
    GYD: "Guyanese Dollar",
    BBD: "Barbados Dollar",
  };

  return names[currencyCode] || currencyCode;
}
