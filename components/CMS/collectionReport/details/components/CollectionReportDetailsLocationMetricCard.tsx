/**
 * CollectionReportDetailsLocationMetricCard Component
 *
 * Renders a section of location-level metrics with a title and a list of key-value pairs.
 * Used within the location metrics grid.
 */

'use client';

import { getFinancialColorClass } from '@/lib/utils/financial';
import { FC } from 'react';

type MetricItem = {
  label: string;
  value: string | number | undefined | null;
  isCurrency?: boolean;
};

type CollectionReportDetailsLocationMetricCardProps = {
  title: string;
  items: MetricItem[];
};

export const CollectionReportDetailsLocationMetricCard: FC<CollectionReportDetailsLocationMetricCardProps> = ({ 
  title, 
  items 
}) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm lg:shadow-none">
      <div className="bg-gray-100/50 px-3 py-2 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm lg:text-base">{title}</h3>
      </div>
      <div className="p-3 lg:p-4">
        <table className="w-full text-sm">
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={i < items.length - 1 ? "border-b border-gray-100/50" : ""}>
                <td className="py-2 text-gray-600 font-medium">{item.label}</td>
                <td className={`py-2 text-right font-semibold ${item.isCurrency ? getFinancialColorClass(item.value as number) : 'text-gray-900'}`}>
                  {item.isCurrency 
                    ? `$${(item.value as number)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                    : (item.value ?? '-')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
