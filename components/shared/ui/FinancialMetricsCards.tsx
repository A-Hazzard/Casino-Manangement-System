/**
 * Financial Metrics Cards Component
 * Component displaying financial metrics cards (Money In, Money Out, Gross) with currency conversion.
 *
 * Features:
 * - Financial metrics display (Money In, Money Out, Gross)
 * - Currency conversion support
 * - Licencee-specific currency resolution
 * - Loading states with skeleton
 * - Currency caching
 * - Responsive card layout
 *
 * @param totals - Financial totals object
 * @param loading - Whether data is loading
 * @param title - Card title
 * @param className - Additional CSS classes
 * @param disableCurrencyConversion - Whether to disable currency conversion
 */
'use client';

import CurrencyValueWithOverflow from '@/components/shared/ui/CurrencyValueWithOverflow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { DashboardFinancialMetricsSkeleton } from '@/components/shared/ui/skeletons/DashboardSkeletons';
import { fetchLicenceeById } from '@/lib/helpers/client';
import { getCountryCurrency, getLicenceeCurrency } from '@/lib/helpers/rates';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import {
    getGrossColorClass,
    getMoneyInColorClass,
    getMoneyOutColorClass,
} from '@/lib/utils/financial';
import type { CurrencyCode } from '@/shared/types/currency';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

type FinancialMetricsCardsProps = {
  totals: {
    moneyIn: number;
    moneyOut: number;
    gross: number;
    jackpot?: number;
  } | null;
  loading?: boolean;
  title?: string;
  className?: string;
  disableCurrencyConversion?: boolean;
  locationFiltered?: boolean;
  includeJackpot?: boolean;
  /** @deprecated useNetGross is now configured at the Licencee level and no longer needed as a prop */
  useNetGross?: boolean;
};

const licenceeCurrencyCache: Record<string, CurrencyCode> = {};

export default function FinancialMetricsCards({
  totals,
  loading = false,
  title = '',
  className = '',
  includeJackpot = false,
}: FinancialMetricsCardsProps) {
  const { selectedLicencee } = useDashBoardStore();
  const { displayCurrency } = useCurrencyFormat();
  const [resolvedCurrencyCode, setResolvedCurrencyCode] =
    useState<CurrencyCode>(displayCurrency);

  useEffect(() => {
    let cancelled = false;

    const resolveCurrency = async () => {
      const isAll =
        !selectedLicencee ||
        selectedLicencee === 'all' ||
        selectedLicencee === '';

      if (isAll) {
        if (!cancelled) {
          setResolvedCurrencyCode(displayCurrency);
        }
        return;
      }

      const cacheKey = selectedLicencee.trim();
      const cachedValue =
        licenceeCurrencyCache[cacheKey] ||
        licenceeCurrencyCache[cacheKey.toLowerCase()] ||
        licenceeCurrencyCache[
          Object.keys(licenceeCurrencyCache).find(
            key => key.toLowerCase() === cacheKey.toLowerCase()
          ) || ''
        ];

      if (cachedValue) {
        if (!cancelled) {
          setResolvedCurrencyCode(cachedValue);
        }
        return;
      }

      try {
        const licencee = await fetchLicenceeById(cacheKey);
        let currency = getLicenceeCurrency(licencee?.name || cacheKey);

        if (
          currency === 'USD' &&
          licencee &&
          (licencee.countryName || typeof licencee.country === 'string')
        ) {
          const fallback = licencee.countryName
            ? getCountryCurrency(licencee.countryName)
            : getCountryCurrency(
                typeof licencee.country === 'string' ? licencee.country : ''
              );
          if (fallback) {
            currency = fallback;
          }
        }

        if (!currency) {
          currency = 'USD';
        }

        licenceeCurrencyCache[cacheKey] = currency;
        if (licencee?.name) {
          licenceeCurrencyCache[licencee.name] = currency;
        }

        if (!cancelled) {
          setResolvedCurrencyCode(currency);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            '[FinancialMetricsCards] Failed to resolve licencee currency:',
            selectedLicencee,
            error
          );
        }
        if (!cancelled) {
          setResolvedCurrencyCode('USD');
        }
      }
    };

    resolveCurrency();

    return () => {
      cancelled = true;
    };
  }, [selectedLicencee, displayCurrency]);

  const currencyCode = resolvedCurrencyCode || displayCurrency || 'USD';

  // Show skeleton ONLY when actively loading.
  // If loading is false but totals is null, it means fetching finished with no data,
  // in which case we show 0 values instead of getting stuck on a skeleton.
  if (loading) {
    return <DashboardFinancialMetricsSkeleton count={4} />;
  }

  const formatNumberOnly = (value: number): string => {
    if (Number.isNaN(value)) {
      return '--';
    }

    const hasDecimals = value % 1 !== 0;
    const decimalPart = Math.abs(value % 1);
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
      maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
    }).format(value);
  };

  const formatCurrencyAmount = (value: number): string => {
    if (Number.isNaN(value)) {
      return '--';
    }

    return `${currencyCode} ${formatNumberOnly(value)}`;
  };

  const formatCurrencyWithScaling = (
    value: number
  ): { display: string; size: string } => {
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

    return {
      display: `${sign}${currencyCode} ${formatNumberOnly(absValue)}`,
      size: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
    };
  };

  const showJackpotIndicator = includeJackpot && (totals?.jackpot ?? 0) > 0;
  const jackpotBreakdownPopover = showJackpotIndicator ? (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex flex-shrink-0 cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none ml-1"
          aria-label="Money Out breakdown"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-xs p-3" side="top" align="center">
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-blue-600 flex items-center gap-1">
            Money Out Breakdown
          </p>
          <p>
            Base Total Cancelled Credits: <span className="font-bold">{((totals?.moneyOut || 0) - (totals?.jackpot || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
          <p>
            + Jackpot: <span className="font-bold text-amber-600">{(totals?.jackpot || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
          <p className="border-t border-gray-200 pt-1">
            Total Money Out: <span className="font-bold">{(totals?.moneyOut || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
          <p className="mt-2 text-[10px] text-gray-500 italic">
            * Jackpot is included in Money Out for this licencee.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
      )}

      {/* Mobile layout */}
      <div className="block md:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {/* Money In */}
          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-600">Money In</h3>
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              </div>
              <div className="space-y-2">
                <div className={`font-bold ${getMoneyInColorClass()} ${formatCurrencyWithScaling(totals?.moneyIn || 0).size}`}>
                  <CurrencyValueWithOverflow value={totals?.moneyIn} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
                </div>
              </div>
            </div>
          </div>

          {/* Money Out */}
          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-600">Money Out</h3>
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              </div>
              <div className="space-y-2">
                <div className={`inline-flex items-center font-bold ${getMoneyOutColorClass(totals?.moneyOut, totals?.moneyIn)} ${formatCurrencyWithScaling(totals?.moneyOut || 0).size}`}>
                  <span className={showJackpotIndicator ? 'border-b border-dotted border-gray-400' : ''}>
                    <CurrencyValueWithOverflow value={totals?.moneyOut} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
                  </span>
                  {jackpotBreakdownPopover}
                </div>
              </div>
            </div>
          </div>

          {/* Jackpot */}
          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-600">Jackpot</h3>
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              </div>
              <div className="space-y-2">
                <div className={`font-bold text-amber-600 ${formatCurrencyWithScaling(totals?.jackpot || 0).size}`}>
                  <CurrencyValueWithOverflow value={totals?.jackpot ?? 0} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
                </div>
              </div>
            </div>
          </div>

          {/* Gross */}
          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-600">Gross</h3>
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              </div>
              <div className="space-y-2">
                <div className={`font-bold ${getGrossColorClass(totals?.gross)} ${formatCurrencyWithScaling(totals?.gross || 0).size}`}>
                  <CurrencyValueWithOverflow value={totals?.gross} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Money In */}
          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">Money In</p>
            <div className="my-2 h-[4px] w-full rounded-full bg-buttonActive"></div>
            <div className="flex flex-1 items-center justify-center">
              <p className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getMoneyInColorClass()}`}>
                <CurrencyValueWithOverflow value={totals?.moneyIn} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
              </p>
            </div>
          </div>

          {/* Money Out */}
          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">Money Out</p>
            <div className="my-2 h-[4px] w-full rounded-full bg-lighterBlueHighlight"></div>
            <div className="flex flex-1 items-center justify-center">
              <span className={`inline-flex items-center overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getMoneyOutColorClass(totals?.moneyOut, totals?.moneyIn)}`}>
                <span className={showJackpotIndicator ? 'border-b border-dotted border-gray-400' : ''}>
                  <CurrencyValueWithOverflow value={totals?.moneyOut} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
                </span>
                {jackpotBreakdownPopover}
              </span>
            </div>
          </div>

          {/* Jackpot */}
          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">Jackpot</p>
            <div className="my-2 h-[4px] w-full rounded-full bg-amber-400"></div>
            <div className="flex flex-1 items-center justify-center">
              <p className="overflow-hidden break-words text-sm font-bold text-amber-600 sm:text-base md:text-lg lg:text-xl">
                <CurrencyValueWithOverflow value={totals?.jackpot ?? 0} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
              </p>
            </div>
          </div>

          {/* Gross */}
          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">Gross</p>
            <div className="my-2 h-[4px] w-full rounded-full bg-orangeHighlight"></div>
            <div className="flex flex-1 items-center justify-center">
              <p className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getGrossColorClass(totals?.gross)}`}>
                <CurrencyValueWithOverflow value={totals?.gross} formatCurrencyFn={formatCurrencyAmount} formatCurrencyWithScalingFn={formatCurrencyWithScaling} currencyCode={currencyCode} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

