/**
 * CollectionReportDetailsMobileField Component
 *
 * Renders a labeled data field for the mobile card view.
 * Supports currency formatting and bold text.
 */

'use client';

import { FC, ReactNode } from 'react';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';

type CollectionReportDetailsMobileFieldProps = {
  label: string;
  value: string | number | ReactNode;
  isCurrency?: boolean;
  isBold?: boolean;
  className?: string;
};

export const CollectionReportDetailsMobileField: FC<
  CollectionReportDetailsMobileFieldProps
> = ({ label, value, isCurrency = false, isBold = false, className = '' }) => {
  // ============================================================================
  // Currency
  // ============================================================================
  const { displayCurrency } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p
        className={`mt-0.5 font-medium ${isBold ? 'font-bold' : ''} ${className}`}
      >
        {isCurrency
          ? formatCurrencyWithCodeString(value as number ?? 0, displayCurrency)
          : value || '-'}
      </p>
    </div>
  );
};
