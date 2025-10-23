"use client";

import React from 'react';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CurrencyCode } from '@/shared/types/currency';

interface CurrencyDisplayProps {
  amount: number;
  currency?: CurrencyCode;
  showSymbol?: boolean;
  showCode?: boolean;
  className?: string;
  precision?: number;
}

/**
 * Component for displaying currency amounts with proper formatting
 */
export function CurrencyDisplay({ 
  amount, 
  currency, 
  showSymbol: _showSymbol = true, 
  showCode = false,
  className = "",
  precision = 2
}: CurrencyDisplayProps) {
  const { formatAmount, getCurrencyInfo, shouldShowCurrency } = useCurrencyFormat();

  // Don't show currency formatting if not in "All Licensee" mode
  if (!shouldShowCurrency()) {
    return (
      <span className={className}>
        {amount.toFixed(precision)}
      </span>
    );
  }

  const currencyInfo = getCurrencyInfo();
  const targetCurrency = currency || currencyInfo.code;
  
  const formattedAmount = formatAmount(amount, targetCurrency);
  
  return (
    <span className={className} title={`${amount.toFixed(precision)} ${targetCurrency}`}>
      {formattedAmount}
      {showCode && (
        <span className="ml-1 text-xs text-gray-500">
          {targetCurrency}
        </span>
      )}
    </span>
  );
}

export default CurrencyDisplay;
