'use client';

import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { CurrencyCode } from '@/shared/types/currency';

/**
 * Hook for currency formatting and display
 */
export function useCurrencyFormat() {
  const {
    displayCurrency,
    formatAmount: contextFormatAmount,
    isAllLicensee,
  } = useCurrency();

  /**
   * Format an amount with the current display currency
   */
  const formatAmountWithCurrency = (
    amount: number,
    currency?: CurrencyCode
  ) => {
    return contextFormatAmount(amount, currency);
  };

  /**
   * Get the current display currency
   */
  const getCurrentCurrency = () => displayCurrency;

  /**
   * Check if currency conversion should be applied
   */
  const shouldShowCurrency = () => isAllLicensee;

  /**
   * Format amount with currency symbol only (no number formatting)
   */
  const formatAmountSimple = (amount: number, _currency?: CurrencyCode) => {
    return `$${amount.toFixed(2)}`;
  };

  /**
   * Get currency metadata for display
   */
  const getCurrencyInfo = () => ({
    code: displayCurrency,
    symbol: '$',
    name:
      displayCurrency === 'USD'
        ? 'US Dollar'
        : displayCurrency === 'TTD'
          ? 'Trinidad & Tobago Dollar'
          : displayCurrency === 'GYD'
            ? 'Guyanese Dollar'
            : displayCurrency === 'BBD'
              ? 'Barbados Dollar'
              : 'US Dollar',
  });

  return {
    formatAmount: formatAmountWithCurrency,
    formatAmountSimple,
    getCurrentCurrency,
    shouldShowCurrency,
    getCurrencyInfo,
    displayCurrency,
    isAllLicensee,
  };
}

