/**
 * Currency conversion types for Evolution1 CMS
 * Supports TTD, GYD, BBD, and USD currencies
 */

export type CurrencyCode = "TTD" | "GYD" | "BBD" | "USD";

export const LICENCEE_DEFAULT_CURRENCY: Record<string, CurrencyCode> = {
  TTG: "TTD",
  Cabana: "GYD",
  Barbados: "BBD",
};

export type ExchangeRate = {
  currency: CurrencyCode;
  rate: number;
  lastUpdated: Date;
};

export type ExchangeRates = {
  baseCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  lastUpdated: Date;
};

export type CurrencyConversionRequest = {
  amount: number;
  amountCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  rates: ExchangeRates;
};

export type CurrencyConversionResponse = {
  originalAmount: number;
  originalCurrency: CurrencyCode;
  convertedAmount: number;
  displayCurrency: CurrencyCode;
  exchangeRate: number;
  lastUpdated: Date;
};

export type CurrencyFilterState = {
  displayCurrency: CurrencyCode;
  isUserOverride: boolean;
  lastUpdated: Date;
};

export type CurrencyMeta = {
  displayCurrency: CurrencyCode;
  baseCurrency: CurrencyCode;
  ratesFetchedAt: Date;
  exchangeRate?: number;
};
