/**
 * Currency conversion types for Evolution CMS
 * Only applies when "All Licensee" is selected
 */

export type CurrencyCode = 'USD' | 'TTD' | 'GYD' | 'BBD';

export type ExchangeRates = {
  USD: number;
  TTD: number;
  GYD: number;
  BBD: number;
};

export type LicenseeCurrencyMapping = {
  TTG: 'TTD';
  Cabana: 'GYD';
  Barbados: 'BBD';
};

export type CurrencyConversionRequest = {
  value: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
};

export type CurrencyConversionResponse = {
  originalValue: number;
  convertedValue: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  exchangeRate: number;
  timestamp: string;
};

export type CurrencyMetadata = {
  originalCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  exchangeRate: number;
  converted: boolean;
};

export type FinancialDataWithCurrency<T = Record<string, unknown>> = T & {
  currencyMeta?: CurrencyMetadata;
};

export type CurrencyFilterState = {
  displayCurrency: CurrencyCode;
  isAllLicensee: boolean;
  shouldConvert: boolean;
};

export type CurrencyContextType = {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (currency: CurrencyCode) => void;
  formatAmount: (amount: number, currency?: CurrencyCode) => string;
  convertAmount: (
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode
  ) => number;
  isAllLicensee: boolean;
  shouldApplyConversion: boolean;
};
