/**
 * CollectionReportDetailsMobileField Component
 *
 * Renders a labeled data field for the mobile card view.
 * Supports currency formatting and bold text.
 */

'use client';

import { FC } from 'react';

type CollectionReportDetailsMobileFieldProps = {
  label: string;
  value: string | number;
  isCurrency?: boolean;
  isBold?: boolean;
  className?: string;
};

export const CollectionReportDetailsMobileField: FC<CollectionReportDetailsMobileFieldProps> = ({ 
  label, 
  value, 
  isCurrency = false, 
  isBold = false, 
  className = '' 
}) => {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-0.5 font-medium ${isBold ? 'font-bold' : ''} ${className}`}>
        {isCurrency ? `$${(value as number)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : (value || '-')}
      </p>
    </div>
  );
};
