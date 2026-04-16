/**
 * CollectionReportDetailsLocationSummary Component
 *
 * Displays the high-level financial summary for a location, including
 * total drop/cancelled, machine gross, SAS gross, and variation.
 * Adapts to mobile and desktop layouts.
 */

'use client';

import { getFinancialColorClass } from '@/lib/utils/financial';
import { FC } from 'react';

type LocationSummaryData = {
  droppedCancelled?: string;
  metersGross?: number;
  sasGross?: number;
  variation?: number;
};

type CollectionReportDetailsLocationSummaryProps = {
  data: LocationSummaryData;
  isMobile?: boolean;
};

export const CollectionReportDetailsLocationSummary: FC<CollectionReportDetailsLocationSummaryProps> = ({ 
  data, 
  isMobile = false 
}) => {
  const { droppedCancelled, metersGross, sasGross, variation } = data;

  const rows = [
    { label: 'Total Drop / Total Cancelled', value: droppedCancelled || '0 / 0', raw: null },
    { label: 'Total Machine Gross', value: metersGross, isCurrency: true },
    { label: 'Total SAS Gross', value: sasGross, isCurrency: true },
    { label: 'Total Variation', value: variation, isCurrency: true },
  ];

  if (isMobile) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="bg-button p-3 text-white">
          <h3 className="font-semibold">Collection Report Machine Total Gross</h3>
        </div>
        <div className="space-y-2 p-4 text-sm">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-600">{row.label}</span>
              <span className={`font-medium ${row.isCurrency ? getFinancialColorClass(row.value as number) : 'text-gray-800'}`}>
                {row.isCurrency 
                  ? (row.value as number)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
                  : row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden rounded-lg bg-white shadow-md lg:block">
      <div className="rounded-t-lg bg-button px-4 py-2 font-semibold text-white">
        Collection Report Machine Total Gross
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i < rows.length - 1 ? "border-b border-gray-200" : ""}>
              <td className="p-3 font-medium text-gray-700">{row.label}</td>
              <td className={`p-3 text-right ${row.isCurrency ? getFinancialColorClass(row.value as number) : ''}`}>
                {row.isCurrency 
                  ? (row.value as number)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
                  : row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
