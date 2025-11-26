'use client';

import React from 'react';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

interface CurrencyIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Currency Indicator Component
 * Component that displays the current currency being used.
 *
 * Features:
 * - Currency symbol and code display
 * - Conditional rendering (only shows when "All Licensee" is selected)
 * - Optional label display
 * - Currency info from store
 *
 * @param className - Additional CSS classes
 * @param showLabel - Whether to show "Currency:" label
 */
export function CurrencyIndicator({
  className = '',
  showLabel = true,
}: CurrencyIndicatorProps) {
  const { getCurrencyInfo, shouldShowCurrency } = useCurrencyFormat();

  // Don't render if not in "All Licensee" mode
  if (!shouldShowCurrency()) {
    return null;
  }

  const currencyInfo = getCurrencyInfo();

  return (
    <div
      className={`flex items-center gap-1 text-sm text-gray-600 ${className}`}
    >
      {showLabel && <span>Currency:</span>}
      <span className="font-medium">{currencyInfo.symbol}</span>
      <span className="text-xs text-gray-500">({currencyInfo.code})</span>
    </div>
  );
}

export default CurrencyIndicator;
