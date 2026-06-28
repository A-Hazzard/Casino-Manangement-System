'use client';

import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { MonthlyReportDetailsRow } from '@/lib/types/components';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';
import {
  getGrossColorClass,
  getMoneyInColorClass,
} from '@/lib/utils/financial';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

type CollectionReportMonthlyLocationCardProps = {
  detail: MonthlyReportDetailsRow;
  locationId: string | null;
};

const parseMetricValue = (value: string | undefined): number => {
  if (!value || value === '-') return 0;
  const numeric = parseFloat(value.replace(/[$,]/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
};

export default function CollectionReportMonthlyLocationCard({
  detail,
  locationId,
}: CollectionReportMonthlyLocationCardProps) {
  const { displayCurrency } = useCurrencyFormat();

  const drop = parseMetricValue(detail.drop);
  const win = parseMetricValue(detail.win);
  const gross = parseMetricValue(detail.gross);
  const sasGross = parseMetricValue(detail.sasGross);

  const formatCurrency = (value: number) =>
    formatCurrencyWithCodeString(value, displayCurrency);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="min-w-0 flex-1">
          {locationId ? (
            <Link
              href={`/locations/${locationId}`}
              className="group inline-flex max-w-full items-center gap-1.5"
            >
              <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-buttonActive">
                {detail.location}
              </h3>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-buttonActive" />
            </Link>
          ) : (
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {detail.location}
            </h3>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Drop</p>
          <p className={`text-sm font-medium ${getMoneyInColorClass(drop)}`}>
            {formatCurrency(drop)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Win</p>
          <MoneyOutCell
            moneyOut={win}
            moneyIn={drop}
            jackpot={0}
            displayValue={formatCurrency(win)}
            showInfoIcon={false}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Gross</p>
          <p className={`text-sm font-semibold ${getGrossColorClass(gross)}`}>
            {formatCurrency(gross)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">SAS Gross</p>
          <p
            className={`text-sm font-semibold ${getGrossColorClass(sasGross)}`}
          >
            {formatCurrency(sasGross)}
          </p>
        </div>
      </div>
    </div>
  );
}
