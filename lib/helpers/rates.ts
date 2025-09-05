import type { ExchangeRates, CurrencyCode } from "@/shared/types";

/**
 * Exchange rates helper for currency conversion
 * Uses fixed exchange rates instead of external APIs
 */

// Fixed exchange rates (no external API calls)
const FIXED_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  TTD: 6.75, // 1 USD = 6.75 TTD
  GYD: 209.5, // 1 USD = 209.5 GYD
  BBD: 2.0, // 1 USD = 2.0 BBD
};

/**
 * Get fixed exchange rates (no API calls)
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const rates: ExchangeRates = {
    baseCurrency: "USD",
    rates: FIXED_RATES,
    lastUpdated: new Date(),
  };

  return rates;
}

/**
 * Convert amount from one currency to another
 */
export function convertAmount({
  amount,
  amountCurrency,
  displayCurrency,
  rates,
}: {
  amount: number;
  amountCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  rates: ExchangeRates;
}): number {
  if (amountCurrency === displayCurrency) {
    return amount;
  }

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
 * Get the default currency for a licensee
 */
export function getLicenseeDefaultCurrency(licenseeName: string): CurrencyCode {
  const licenseeDefaults: Record<string, CurrencyCode> = {
    TTG: "TTD",
    Cabana: "GYD",
    Barbados: "BBD",
  };
  return licenseeDefaults[licenseeName] || "USD";
}

/**
 * Check if exchange rates are stale (always false for fixed rates)
 */
export function areRatesStale(_rates: ExchangeRates): boolean {
  // Fixed rates never go stale
  return false;
}

/**
 * Force refresh of exchange rates (no-op for fixed rates)
 */
export function forceRefreshRates(): void {
  // No-op since we use fixed rates
}
