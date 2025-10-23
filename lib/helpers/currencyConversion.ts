/**
 * Currency conversion helper functions for API responses
 * Only applies when "All Licensee" is selected
 */

import type { CurrencyCode, FinancialDataWithCurrency, CurrencyMetadata } from '@/shared/types/currency';
import { 
  shouldApplyConversion, 
  convertToUSD, 
  convertFromUSD, 
  getLicenseeCurrency,
  getExchangeRates 
} from './rates';

/**
 * Convert a single financial data object
 */
export function convertFinancialData<T extends Record<string, unknown>>(
  data: T,
  licensee: string,
  displayCurrency: CurrencyCode
): FinancialDataWithCurrency<T> {
  if (!shouldApplyConversion(licensee)) {
    return { ...data, currencyMeta: undefined };
  }

  const licenseeCurrency = getLicenseeCurrency(licensee);
  const exchangeRate = getExchangeRates()[displayCurrency];
  
  const convertedData = { ...data } as T;
  
  // Convert financial fields
  const financialFields = [
    'coinIn', 'coinOut', 'totalCancelledCredits', 'totalHandPaidCancelledCredits',
    'totalWonCredits', 'drop', 'jackpot', 'currentCredits', 'moneyIn', 'moneyOut', 'gross',
    'totalDrop', 'totalGross', 'revenue', 'handle', 'winLoss', 'totalRevenue', 'totalHandle',
    'totalWin', 'totalJackpot', 'totalPlays', 'avgRevenue', 'avgDrop', 'avgCancelledCredits'
  ];

  financialFields.forEach(field => {
    if (typeof data[field] === 'number') {
      const usdValue = convertToUSD(data[field] as number, licensee);
      (convertedData as Record<string, unknown>)[field] = convertFromUSD(usdValue, displayCurrency);
    }
  });

  return {
    ...convertedData,
    currencyMeta: {
      originalCurrency: licenseeCurrency,
      displayCurrency,
      exchangeRate,
      converted: true
    }
  };
}

/**
 * Convert an array of financial data objects
 */
export function convertFinancialDataArray<T extends Record<string, unknown>>(
  data: T[],
  licensee: string,
  displayCurrency: CurrencyCode
): Array<FinancialDataWithCurrency<T>> {
  if (!shouldApplyConversion(licensee)) {
    return data.map(item => ({ ...item, currencyMeta: undefined }));
  }

  return data.map(item => convertFinancialData(item, licensee, displayCurrency));
}

/**
 * Convert meter data specifically (from meters collection)
 */
export function convertMeterData<T extends Record<string, unknown>>(
  meterData: T,
  licensee: string,
  displayCurrency: CurrencyCode
): FinancialDataWithCurrency<T> {
  if (!shouldApplyConversion(licensee)) {
    return { ...meterData, currencyMeta: undefined };
  }

  const licenseeCurrency = getLicenseeCurrency(licensee);
  const exchangeRate = getExchangeRates()[displayCurrency];
  
  const convertedData = { ...meterData } as T;
  
  // Convert top-level financial fields
  const topLevelFields = [
    'coinIn', 'coinOut', 'totalCancelledCredits', 'totalHandPaidCancelledCredits',
    'totalWonCredits', 'drop', 'jackpot', 'currentCredits', 'gamesPlayed', 'gamesWon'
  ];

  topLevelFields.forEach(field => {
    if (typeof meterData[field] === 'number') {
      const usdValue = convertToUSD(meterData[field] as number, licensee);
      (convertedData as Record<string, unknown>)[field] = convertFromUSD(usdValue, displayCurrency);
    }
  });

  // Convert movement object fields
  if ((meterData as Record<string, unknown>).movement && typeof (meterData as Record<string, unknown>).movement === 'object') {
    const movement = (meterData as Record<string, unknown>).movement as Record<string, unknown>;
    const convertedMovement = { ...movement };
    
    const movementFields = [
      'coinIn', 'coinOut', 'totalCancelledCredits', 'totalHandPaidCancelledCredits',
      'totalWonCredits', 'drop', 'jackpot', 'currentCredits', 'gamesPlayed', 'gamesWon'
    ];

    movementFields.forEach(field => {
      if (typeof movement[field] === 'number') {
        const usdValue = convertToUSD(movement[field] as number, licensee);
        convertedMovement[field] = convertFromUSD(usdValue, displayCurrency);
      }
    });

    (convertedData as Record<string, unknown>).movement = convertedMovement;
  }

  // Convert viewingAccountDenomination fields
  if ((meterData as Record<string, unknown>).viewingAccountDenomination && typeof (meterData as Record<string, unknown>).viewingAccountDenomination === 'object') {
    const viewingAccount = (meterData as Record<string, unknown>).viewingAccountDenomination as Record<string, unknown>;
    const convertedViewingAccount = { ...viewingAccount };
    
    if (typeof viewingAccount.drop === 'number') {
      const usdValue = convertToUSD(viewingAccount.drop, licensee);
      convertedViewingAccount.drop = convertFromUSD(usdValue, displayCurrency);
    }
    
    if (typeof viewingAccount.totalCancelledCredits === 'number') {
      const usdValue = convertToUSD(viewingAccount.totalCancelledCredits, licensee);
      convertedViewingAccount.totalCancelledCredits = convertFromUSD(usdValue, displayCurrency);
    }

    (convertedData as Record<string, unknown>).viewingAccountDenomination = convertedViewingAccount;
  }

  return {
    ...convertedData,
    currencyMeta: {
      originalCurrency: licenseeCurrency,
      displayCurrency,
      exchangeRate,
      converted: true
    }
  };
}

/**
 * Convert aggregated financial data (sums, totals, etc.)
 */
export function convertAggregatedData<T extends Record<string, unknown>>(
  aggregatedData: T,
  licensee: string,
  displayCurrency: CurrencyCode
): FinancialDataWithCurrency<T> {
  if (!shouldApplyConversion(licensee)) {
    return { ...aggregatedData, currencyMeta: undefined };
  }

  const licenseeCurrency = getLicenseeCurrency(licensee);
  const exchangeRate = getExchangeRates()[displayCurrency];
  
  const convertedData = { ...aggregatedData } as T;
  
  // Convert aggregated financial fields
  const aggregatedFields = [
    'totalDrop', 'totalCancelledCredits', 'totalGross', 'totalRevenue', 'totalHandle',
    'totalWin', 'totalJackpot', 'totalPlays', 'avgRevenue', 'avgDrop', 'avgCancelledCredits',
    'moneyIn', 'moneyOut', 'gross', 'revenue', 'drop', 'cancelledCredits'
  ];

  aggregatedFields.forEach(field => {
    if (typeof aggregatedData[field] === 'number') {
      const usdValue = convertToUSD(aggregatedData[field] as number, licensee);
      (convertedData as Record<string, unknown>)[field] = convertFromUSD(usdValue, displayCurrency);
    }
  });

  return {
    ...convertedData,
    currencyMeta: {
      originalCurrency: licenseeCurrency,
      displayCurrency,
      exchangeRate,
      converted: true
    }
  };
}

/**
 * Convert dashboard totals data
 */
export function convertDashboardTotals<T extends Record<string, unknown>>(
  totalsData: T,
  licensee: string,
  displayCurrency: CurrencyCode
): FinancialDataWithCurrency<T> {
  if (!shouldApplyConversion(licensee)) {
    return { ...totalsData, currencyMeta: undefined };
  }

  const licenseeCurrency = getLicenseeCurrency(licensee);
  const exchangeRate = getExchangeRates()[displayCurrency];
  
  const convertedData = { ...totalsData };
  
  // Convert dashboard total fields
  const dashboardFields = [
    'totalDrop', 'totalCancelledCredits', 'totalGross', 'totalRevenue',
    'moneyIn', 'moneyOut', 'gross', 'revenue', 'drop', 'cancelledCredits'
  ];

  dashboardFields.forEach(field => {
    if (typeof totalsData[field] === 'number') {
      const usdValue = convertToUSD(totalsData[field] as number, licensee);
      (convertedData as Record<string, unknown>)[field] = convertFromUSD(usdValue, displayCurrency);
    }
  });

  return {
    ...convertedData,
    currencyMeta: {
      originalCurrency: licenseeCurrency,
      displayCurrency,
      exchangeRate,
      converted: true
    }
  };
}

/**
 * Add currency metadata to API response
 */
export function addCurrencyMetadata<T>(
  data: T,
  licensee: string,
  displayCurrency: CurrencyCode
): T & { currencyMeta?: CurrencyMetadata } {
  if (!shouldApplyConversion(licensee)) {
    return { ...data, currencyMeta: undefined };
  }

  const licenseeCurrency = getLicenseeCurrency(licensee);
  const exchangeRate = getExchangeRates()[displayCurrency];

  return {
    ...data,
    currencyMeta: {
      originalCurrency: licenseeCurrency,
      displayCurrency,
      exchangeRate,
      converted: true
    }
  };
}

/**
 * Check if currency conversion should be applied based on licensee
 */
export function shouldApplyCurrencyConversion(licensee: string | null | undefined): boolean {
  return shouldApplyConversion(licensee);
}
