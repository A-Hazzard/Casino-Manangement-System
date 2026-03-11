/**
 * Currency conversion types for Evolution CMS
 * Only applies when "All Licencee" is selected
 */

export type CurrencyCode = 'USD' | 'TTD' | 'GYD' | 'BBD';

export type ExchangeRates = {
  USD: number;
  TTD: number;
  GYD: number;
  BBD: number;
};

export type LicenceeCurrencyMapping = {
  TTG: 'TTD';
  Cabana: 'GYD';
  Barbados: 'BBD';
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
  isAllLicencee: boolean;
  shouldApplyConversion: boolean;
};

