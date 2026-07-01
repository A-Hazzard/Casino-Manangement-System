/**
 * Cabinet Live Metrics Cards
 *
 * Featured 4-card section for live SAS meter values on the cabinet detail page.
 * Matches the FinancialMetricsCards responsive layout pattern.
 */

'use client';

import CurrencyValueWithOverflow from '@/components/shared/ui/CurrencyValueWithOverflow';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CabinetLiveMeterValues } from '@/lib/helpers/cabinets/liveMeters';
import {
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financial';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';

type CabinetLiveMetricsCardsProps = {
  values: CabinetLiveMeterValues;
  className?: string;
};

export default function CabinetLiveMetricsCards({
  values,
  className = '',
}: CabinetLiveMetricsCardsProps) {
  const { displayCurrency } = useCurrencyFormat();

  const formatCurrencyAmount = (value: number): string => {
    if (Number.isNaN(value)) {
      return '--';
    }
    return formatCurrencyWithCodeString(value, displayCurrency);
  };

  const formatCurrencyWithScaling = (
    value: number
  ): { display: string; size: string } => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1_000_000) {
      const millions = absValue / 1_000_000;
      return {
        display: `${sign}${displayCurrency} ${millions.toFixed(1)}M`,
        size: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
      };
    }

    if (absValue >= 1_000) {
      const thousands = absValue / 1_000;
      return {
        display: `${sign}${displayCurrency} ${thousands.toFixed(1)}K`,
        size: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
      };
    }

    const hasDecimals = absValue % 1 !== 0;
    const decimalPart = Math.abs(absValue % 1);
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
      maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
    }).format(absValue);

    return {
      display: `${sign}${displayCurrency} ${formattedNumber}`,
      size: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile layout */}
      <div className="block md:hidden">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-purple-500 to-blue-500" />
            <div className="flex divide-x divide-gray-100">
              <div className="flex-1 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Drop
                  </h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                </div>
                <div
                  className={`font-bold ${getMoneyInColorClass(values.drop)} text-base`}
                >
                  <CurrencyValueWithOverflow
                    value={values.drop}
                    formatCurrencyFn={formatCurrencyAmount}
                    formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                    currencyCode={displayCurrency}
                  />
                </div>
              </div>

              <div className="flex-1 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Total Cancelled Credits
                  </h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                </div>
                <div
                  className={`font-bold ${getMoneyOutColorClass(values.totalCancelledCredits, values.drop)} text-base`}
                >
                  <CurrencyValueWithOverflow
                    value={values.totalCancelledCredits}
                    formatCurrencyFn={formatCurrencyAmount}
                    formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                    currencyCode={displayCurrency}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-amber-500 to-emerald-500" />
            <div className="flex divide-x divide-gray-100">
              <div className="flex-1 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Jackpot
                  </h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                </div>
                <div className="text-base font-bold text-amber-600">
                  <CurrencyValueWithOverflow
                    value={values.jackpot}
                    formatCurrencyFn={formatCurrencyAmount}
                    formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                    currencyCode={displayCurrency}
                  />
                </div>
              </div>

              <div className="flex-1 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Total Won Credits
                  </h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-base font-bold text-emerald-600">
                  <CurrencyValueWithOverflow
                    value={values.totalWonCredits}
                    formatCurrencyFn={formatCurrencyAmount}
                    formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                    currencyCode={displayCurrency}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              Drop
            </p>
            <div className="my-2 h-[4px] w-full rounded-full bg-buttonActive" />
            <div className="flex flex-1 items-center justify-center">
              <p
                className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getMoneyInColorClass(values.drop)}`}
              >
                <CurrencyValueWithOverflow
                  value={values.drop}
                  formatCurrencyFn={formatCurrencyAmount}
                  formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                  currencyCode={displayCurrency}
                />
              </p>
            </div>
          </div>

          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              Total Cancelled Credits
            </p>
            <div className="my-2 h-[4px] w-full rounded-full bg-lighterBlueHighlight" />
            <div className="flex flex-1 items-center justify-center">
              <p
                className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getMoneyOutColorClass(values.totalCancelledCredits, values.drop)}`}
              >
                <CurrencyValueWithOverflow
                  value={values.totalCancelledCredits}
                  formatCurrencyFn={formatCurrencyAmount}
                  formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                  currencyCode={displayCurrency}
                />
              </p>
            </div>
          </div>

          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              Jackpot
            </p>
            <div className="my-2 h-[4px] w-full rounded-full bg-amber-400" />
            <div className="flex flex-1 items-center justify-center">
              <p className="overflow-hidden break-words text-sm font-bold text-amber-600 sm:text-base md:text-lg lg:text-xl">
                <CurrencyValueWithOverflow
                  value={values.jackpot}
                  formatCurrencyFn={formatCurrencyAmount}
                  formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                  currencyCode={displayCurrency}
                />
              </p>
            </div>
          </div>

          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              Total Won Credits
            </p>
            <div className="my-2 h-[4px] w-full rounded-full bg-greenHighlight" />
            <div className="flex flex-1 items-center justify-center">
              <p className="overflow-hidden break-words text-sm font-bold text-emerald-600 sm:text-base md:text-lg lg:text-xl">
                <CurrencyValueWithOverflow
                  value={values.totalWonCredits}
                  formatCurrencyFn={formatCurrencyAmount}
                  formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                  currencyCode={displayCurrency}
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
