/**
 * Exchange Rate Helper Functions
 *
 * Provides helper functions for currency conversion and exchange rate management.
 * Currency conversion only applies when "All Licensee" is selected. It handles
 * conversion between USD (base currency) and other currencies (TTD, GYD, BBD),
 * and provides utilities for currency formatting and display.
 *
 * Features:
 * - Manages fixed exchange rates for USD, TTD, GYD, and BBD.
 * - Maps licensees to their respective currencies.
 * - Converts values between currencies (to/from USD, between currencies).
 * - Provides currency symbols and names for display.
 * - Formats amounts with currency symbols.
 * - Handles currency conversion for financial data arrays.
 */

import { getLicenseeName } from '@/lib/utils/licensee';
import type {
    CurrencyCode,
    ExchangeRates,
    LicenseeCurrencyMapping,
} from '@/shared/types/currency';

// Fixed exchange rates (USD as base currency)
const FIXED_RATES: ExchangeRates = {
  USD: 1.0, // Base currency
  TTD: 6.75, // 1 USD = 6.75 TTD
  GYD: 207.98, // 1 USD = 209.5 GYD
  BBD: 2.0, // 1 USD = 2.0 BBD
};

// Licensee to currency mapping
const LICENSEE_CURRENCY: LicenseeCurrencyMapping = {
  TTG: 'TTD', // Trinidad & Tobago
  Cabana: 'GYD', // Guyana
  Barbados: 'BBD', // Barbados
};

// Country name to currency mapping (for locations without licensees)
const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  'Trinidad and Tobago': 'TTD',
  'Trinidad & Tobago': 'TTD',
  Trinidad: 'TTD',
  Guyana: 'GYD',
  Barbados: 'BBD',
};

// ============================================================================
// Currency Mapping Functions
// ============================================================================

/**
 * Get the currency for a specific licensee
 */
export function getLicenseeCurrency(licensee: string): CurrencyCode {
  if (!licensee) {
    return 'USD';
  }

  const normalized =
    getLicenseeName(licensee) || (licensee as keyof LicenseeCurrencyMapping);

  return (
    LICENSEE_CURRENCY[normalized as keyof LicenseeCurrencyMapping] || 'USD'
  );
}

/**
 * Get the currency for a specific country
 */
export function getCountryCurrency(countryName: string): CurrencyCode {
  return COUNTRY_CURRENCY_MAP[countryName] || 'USD';
}

// ============================================================================
// Currency Conversion Logic
// ============================================================================

/**
 * Check if a licensee should have currency conversion applied
 */
export function shouldApplyConversion(
  licensee: string | null | undefined
): boolean {
  // Only apply conversion when "All Licensee" is selected (licensee is null, undefined, or "all")
  return !licensee || licensee === 'all' || licensee === '';
}

// ============================================================================
// Currency Conversion Functions
// ============================================================================

/**
 * Convert a value from a licensee's currency to USD
 */
export function convertToUSD(
  value: number,
  licenseeOrCurrency: string
): number {
  // Check if it's an actual currency code (must exist in FIXED_RATES)
  const isCurrencyCode = licenseeOrCurrency in FIXED_RATES;

  const sourceCurrency = isCurrencyCode
    ? (licenseeOrCurrency as CurrencyCode)
    : getLicenseeCurrency(licenseeOrCurrency);

  if (sourceCurrency === 'USD') {
    return value;
  }

  const rate = FIXED_RATES[sourceCurrency];

  // Safety check: if rate is undefined, return original value without conversion
  if (!rate || isNaN(rate)) {
    console.error(
      `⚠️ Currency conversion error: No rate found for ${sourceCurrency} (from ${licenseeOrCurrency})`
    );
    return value;
  }

  return value / rate;
}

/**
 * Convert a value from USD to a target currency
 */
export function convertFromUSD(
  value: number,
  targetCurrency: CurrencyCode
): number {
  if (targetCurrency === 'USD') {
    return value;
  }

  const rate = FIXED_RATES[targetCurrency];

  // Safety check: if rate is undefined, return original value without conversion
  if (!rate || isNaN(rate)) {
    console.error(
      `⚠️ Currency conversion error: No rate found for ${targetCurrency}`
    );
    return value;
  }

  return value * rate;
}

/**
 * Convert a value from one currency to another
 */
export function convertCurrency(
  value: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) {
    return value;
  }

  // Convert to USD first, then to target currency
  const usdValue =
    fromCurrency === 'USD' ? value : value / FIXED_RATES[fromCurrency];
  return toCurrency === 'USD' ? usdValue : usdValue * FIXED_RATES[toCurrency];
}

/**
 * Get all available currencies
 */
export function getAvailableCurrencies(): CurrencyCode[] {
  return ['USD', 'TTD', 'GYD', 'BBD'];
}

/**
 * Get exchange rates
 */
export function getExchangeRates(): ExchangeRates {
  return { ...FIXED_RATES };
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    USD: '$',
    TTD: 'TT$',
    GYD: 'G$',
    BBD: 'Bds$',
  };
  return symbols[currency];
}

/**
 * Get currency name for display
 */
export function getCurrencyName(currency: CurrencyCode): string {
  const names: Record<CurrencyCode, string> = {
    USD: 'US Dollar',
    TTD: 'Trinidad & Tobago Dollar',
    GYD: 'Guyanese Dollar',
    BBD: 'Barbados Dollar',
  };
  return names[currency];
}

// ============================================================================
// Currency Formatting Functions
// ============================================================================

/**
 * Format amount with currency symbol
 */
export function formatAmount(
  amount: number,
  currency: CurrencyCode = 'USD'
): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol}${formatted}`;
}


