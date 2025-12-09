'use client';

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
 * Currency Display Component
 * Component for displaying currency amounts with proper formatting and conversion.
 *
 * Features:
 * - Currency amount formatting
 * - Currency conversion support
 * - Currency symbol and code display
 * - Precision control
 * - Conditional display based on licensee selection
 * - Tooltip with original amount
 *
 * @param amount - Amount to display
 * @param currency - Currency code (optional, uses default from store)
 * @param showSymbol - Whether to show currency symbol
 * @param showCode - Whether to show currency code
 * @param className - Additional CSS classes
 * @param precision - Decimal precision
 */
export function CurrencyDisplay({
  amount,
  currency,
  showSymbol: _showSymbol = true,
  showCode = false,
  className = '',
  precision = 2,
}: CurrencyDisplayProps) {
  const { formatAmount, getCurrencyInfo, shouldShowCurrency } =
    useCurrencyFormat();

  // Don't show currency formatting if not in "All Licensee" mode
  if (!shouldShowCurrency()) {
    return <span className={className}>{amount.toFixed(precision)}</span>;
  }

  const currencyInfo = getCurrencyInfo();
  const targetCurrency = currency || currencyInfo.code;

  const formattedAmount = formatAmount(amount, targetCurrency);

  return (
    <span
      className={className}
      title={`${amount.toFixed(precision)} ${targetCurrency}`}
    >
      {formattedAmount}
      {showCode && (
        <span className="ml-1 text-xs text-gray-500">{targetCurrency}</span>
      )}
    </span>
  );
}

export default CurrencyDisplay;
