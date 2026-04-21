'use client';

import { toast } from 'sonner';
import type { CollectionReportMonthlySummaryTableProps } from '@/lib/types/components';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { getGrossColorClass } from '@/lib/utils/financial';

// ============================================================================
// Config — mirrors FinancialMetricsCards desktop colour palette
// ============================================================================

const METRICS = [
  {
    key: 'drop' as const,
    label: 'Drop',
    bar: 'bg-buttonActive',
  },
  {
    key: 'cancelledCredits' as const,
    label: 'Cancelled Credits',
    bar: 'bg-lighterBlueHighlight',
  },
  {
    key: 'gross' as const,
    label: 'Gross',
    bar: 'bg-orangeHighlight',
  },
  {
    key: 'sasGross' as const,
    label: 'SAS Gross',
    bar: 'bg-amber-400',
  },
];

// ============================================================================
// Component
// ============================================================================

export default function CollectionReportMonthlySummaryTable({
  summary,
  loading,
}: CollectionReportMonthlySummaryTableProps) {
  const { formatAmount } = useCurrencyFormat();

  const formatVal = (v: number | string | null | undefined) => {
    if (v === '-' || v === undefined || v === null || v === '') return '—';
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(num) ? String(v) : formatAmount(num);
  };

  const colorCls = (v: number | string | null | undefined) => {
    if (v === '-' || v === undefined || v === null || v === '') return '';
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(num) ? '' : getGrossColorClass(num);
  };

  const copy = async (text: string, label: string) => {
    if (!text || text === '-') { toast.error(`No ${label} value to copy`); return; }
    try {
      await navigator.clipboard.writeText(text.replace('$', '').replace(/,/g, '').trim());
      toast.success(`${label} copied to clipboard`);
    } catch { toast.error(`Failed to copy ${label}`); }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[120px] animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {METRICS.map(metric => {
        const raw = summary[metric.key];
        const formatted = formatVal(raw);
        const cls = colorCls(raw);

        return (
          <div
            key={metric.key}
            className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6"
          >
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              {metric.label}
            </p>
            <div className={`my-2 h-[4px] w-full rounded-full ${metric.bar}`} />
            <div className="flex flex-1 items-center justify-center">
              <button
                onClick={() => copy(String(raw ?? ''), metric.label)}
                className="hover:opacity-70"
                title="Click to copy"
              >
                <span className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${cls || 'text-gray-900'}`}>
                  {formatted}
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
