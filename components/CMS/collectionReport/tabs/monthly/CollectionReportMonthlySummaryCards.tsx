'use client';

import { DashboardFinancialMetricsSkeleton } from '@/components/shared/ui/skeletons/DashboardSkeletons';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { MonthlyReportSummary } from '@/lib/types/components';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financial';

type CollectionReportMonthlySummaryCardsProps = {
  summary: MonthlyReportSummary;
  loading?: boolean;
  title?: string;
};

const parseMetricValue = (
  value: string | number | null | undefined
): number | null => {
  if (value === '-' || value === undefined || value === null || value === '') {
    return null;
  }

  const numeric =
    typeof value === 'string'
      ? parseFloat(value.replace(/[$,]/g, ''))
      : value;

  return Number.isNaN(numeric) ? null : numeric;
};

export default function CollectionReportMonthlySummaryCards({
  summary,
  loading = false,
  title,
}: CollectionReportMonthlySummaryCardsProps) {
  const { displayCurrency } = useCurrencyFormat();

  const drop = parseMetricValue(summary.drop);
  const cancelledCredits = parseMetricValue(summary.cancelledCredits);
  const gross = parseMetricValue(summary.gross);
  const sasGross = parseMetricValue(summary.sasGross);

  const formatCurrency = (value: number | null) =>
    value === null
      ? '—'
      : formatCurrencyWithCodeString(value, displayCurrency);

  if (loading) {
    return <DashboardFinancialMetricsSkeleton count={2} />;
  }

  return (
    <div className="space-y-3">
      {title && (
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-purple-500 to-blue-500" />
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Drop
                </h3>
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              </div>
              <p
                className={`text-base font-bold ${getMoneyInColorClass(drop)}`}
              >
                {formatCurrency(drop)}
              </p>
            </div>
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Cancelled Credits
                </h3>
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              </div>
              <p
                className={`text-base font-bold ${getMoneyOutColorClass(cancelledCredits, drop)}`}
              >
                {formatCurrency(cancelledCredits)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500" />
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Gross
                </h3>
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              </div>
              <p className={`text-base font-bold ${getGrossColorClass(gross)}`}>
                {formatCurrency(gross)}
              </p>
            </div>
            <div className="flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  SAS Gross
                </h3>
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              </div>
              <p
                className={`text-base font-bold ${getGrossColorClass(sasGross)}`}
              >
                {formatCurrency(sasGross)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
