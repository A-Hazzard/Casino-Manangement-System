import type { CurrencyCode, ExchangeRates, CurrencyMeta } from "@/shared/types";
import { convertAmount } from "./rates";

/**
 * Helper functions for adding currency conversion to API responses
 */

/**
 * Convert financial fields in an object to the specified display currency
 */
export function convertFinancialFields<T extends Record<string, unknown>>(
  obj: T,
  displayCurrency: CurrencyCode,
  rates: ExchangeRates,
  originalCurrency: CurrencyCode = "USD"
): T {
  const converted = { ...obj } as T;

  // List of financial fields that should be converted
  const financialFields = [
    "moneyIn",
    "moneyOut",
    "gross",
    "drop",
    "totalCancelledCredits",
    "totalGross",
    "totalDrop",
    "totalCancelledCredits",
    "coinIn",
    "coinOut",
    "jackpot",
    "handle",
    "win",
    "amount",
    "balance",
    "profit",
    "revenue",
    "cost",
    "variance",
    "previousBalance",
    "currentBalance",
    "amountToCollect",
    "amountCollected",
    "amountUncollected",
    "partnerProfit",
    "taxes",
    "advance",
  ];

  for (const field of financialFields) {
    if (
      field in converted &&
      typeof (converted as Record<string, unknown>)[field] === "number"
    ) {
      (converted as Record<string, unknown>)[field] = convertAmount({
        amount: (converted as Record<string, unknown>)[field] as number,
        amountCurrency: originalCurrency,
        displayCurrency,
        rates,
      });
    }
  }

  return converted;
}

/**
 * Convert financial fields in an array of objects
 */
export function convertFinancialFieldsArray<T extends Record<string, unknown>>(
  array: T[],
  displayCurrency: CurrencyCode,
  rates: ExchangeRates,
  originalCurrency: CurrencyCode = "USD"
): T[] {
  return array.map((item) =>
    convertFinancialFields(item, displayCurrency, rates, originalCurrency)
  );
}

/**
 * Add currency metadata to API response
 */
export function addCurrencyMeta(
  response: Record<string, unknown>,
  displayCurrency: CurrencyCode,
  rates: ExchangeRates
): Record<string, unknown> {
  const currencyMeta: CurrencyMeta = {
    displayCurrency,
    baseCurrency: rates.baseCurrency,
    ratesFetchedAt: rates.lastUpdated,
    exchangeRate: rates.rates[displayCurrency],
  };

  const existingMeta = response.meta as Record<string, unknown> | undefined;

  return {
    ...response,
    meta: {
      ...(existingMeta || {}),
      currency: currencyMeta,
    },
  };
}

/**
 * Get the original currency for a licensee
 */
export function getLicenseeOriginalCurrency(
  licenseeName?: string
): CurrencyCode {
  if (!licenseeName) return "USD";

  const licenseeDefaults: Record<string, CurrencyCode> = {
    TTG: "TTD",
    Cabana: "GYD",
    Barbados: "BBD",
  };

  return licenseeDefaults[licenseeName] || "USD";
}

/**
 * Process API response to include currency conversion
 */
export function processResponseWithCurrency<T extends Record<string, unknown>>(
  response: T,
  displayCurrency: CurrencyCode,
  rates: ExchangeRates,
  licenseeName?: string
): T & { meta: { currency: CurrencyMeta } } {
  const originalCurrency = getLicenseeOriginalCurrency(licenseeName);

  // Convert financial fields in the response
  let convertedResponse: T;

  if (Array.isArray(response)) {
    convertedResponse = convertFinancialFieldsArray(
      response as Record<string, unknown>[],
      displayCurrency,
      rates,
      originalCurrency
    ) as unknown as T;
  } else if (typeof response === "object" && response !== null) {
    convertedResponse = convertFinancialFields(
      response,
      displayCurrency,
      rates,
      originalCurrency
    ) as T;
  } else {
    convertedResponse = response;
  }

  // Add currency metadata
  return addCurrencyMeta(convertedResponse, displayCurrency, rates) as T & {
    meta: { currency: CurrencyMeta };
  };
}

/**
 * Extract currency conversion parameters from request
 */
export function extractCurrencyParams(searchParams: URLSearchParams): {
  displayCurrency: CurrencyCode;
  licenseeName?: string;
} {
  const displayCurrency =
    (searchParams.get("currency") as CurrencyCode) || "USD";
  const licenseeName = searchParams.get("licencee") || undefined;

  return { displayCurrency, licenseeName };
}
