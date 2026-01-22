'use client';

import { useRef } from 'react';
import MobileValuePopover from '@/components/shared/ui/MobileValuePopover';
import { useTextOverflow } from '@/lib/hooks/useTextOverflow';
import { formatCurrency } from '@/lib/utils/currency';

type CurrencyValueWithOverflowProps = {
  value: number | null | undefined;
  className?: string;
  formatCurrencyFn?: (value: number) => string;
  formatCurrencyWithScalingFn?: (value: number) => { display: string; size: string };
  currencyCode?: string;
};

/**
 * Currency Value With Overflow Component
 * Component for displaying currency values with overflow handling and mobile popover.
 *
 * Features:
 * - Currency value display with scaling (K, M)
 * - Text overflow detection
 * - Mobile popover for full value display
 * - Custom currency formatting functions
 * - Responsive text sizing
 *
 * @param value - Currency value to display
 * @param className - Additional CSS classes
 * @param formatCurrencyFn - Custom currency formatting function
 * @param formatCurrencyWithScalingFn - Custom scaling formatter function
 * @param currencyCode - Currency code for formatting
 */

// ============================================================================
// Types & Helper Functions
// ============================================================================

/**
 * Helper function to create a scaling formatter
 */
function createScalingFormatter(currencyCode: string = 'USD') {
  return (value: number): { display: string; size: string } => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1_000_000) {
      const millions = absValue / 1_000_000;
      return {
        display: `${sign}${currencyCode} ${millions.toFixed(1)}M`,
        size: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
      };
    }

    if (absValue >= 1_000) {
      const thousands = absValue / 1_000;
      return {
        display: `${sign}${currencyCode} ${thousands.toFixed(1)}K`,
        size: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
      };
    }

    // Extract number part from formatted currency for consistency
    const hasDecimals = absValue % 1 !== 0;
    const decimalPart = Math.abs(absValue % 1);
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
      maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
    }).format(absValue);

    return {
      display: `${sign}${currencyCode} ${formattedNumber}`,
      size: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
    };
  };
}

/**
 * Component that displays a currency value with overflow-based scaling
 * Only scales when the value would overflow its container
 */
export default function CurrencyValueWithOverflow({
  value,
  className = '',
  formatCurrencyFn = formatCurrency,
  formatCurrencyWithScalingFn,
  currencyCode = 'USD',
}: CurrencyValueWithOverflowProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  // Always call hooks before any early returns
  const fullFormattedValue = value !== null && value !== undefined ? formatCurrencyFn(value) : '';
  const isOverflowing = useTextOverflow(fullFormattedValue, containerRef);

  if (value === null || value === undefined) {
    return <span className={className}>--</span>;
  }

  // Use provided scaling function or create default one
  const scalingFn = formatCurrencyWithScalingFn || createScalingFormatter(currencyCode);
  const scaledFormat = scalingFn(value);
  const displayValue = isOverflowing
    ? scaledFormat.display
    : fullFormattedValue;

  return (
    <span ref={containerRef} className={className}>
      <MobileValuePopover
        displayValue={displayValue}
        fullValue={fullFormattedValue}
        showIcon={isOverflowing}
      />
    </span>
  );
}


