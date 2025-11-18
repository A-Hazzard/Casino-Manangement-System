'use client';

import { DashboardFinancialMetricsSkeleton } from '@/components/ui/skeletons/DashboardSkeletons';
import CurrencyValueWithOverflow from '@/components/ui/CurrencyValueWithOverflow';
import { fetchLicenseeById } from '@/lib/helpers/clientLicensees';
import { getCountryCurrency, getLicenseeCurrency } from '@/lib/helpers/rates';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { CurrencyCode } from '@/shared/types/currency';
import React, { useEffect, useState } from 'react';

type FinancialMetricsCardsProps = {
  totals: {
    moneyIn: number;
    moneyOut: number;
    gross: number;
  } | null;
  loading?: boolean;
  title?: string;
  className?: string;
  disableCurrencyConversion?: boolean;
};

const licenseeCurrencyCache: Record<string, CurrencyCode> = {};

export default function FinancialMetricsCards({
  totals,
  loading = false,
  title = 'Financial Metrics',
  className = '',
  disableCurrencyConversion: _disableCurrencyConversion = false,
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
        licenseeCurrencyCache[cacheKey] ||
        licenseeCurrencyCache[cacheKey.toLowerCase()] ||
        licenseeCurrencyCache[
          Object.keys(licenseeCurrencyCache).find(
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
        const licensee = await fetchLicenseeById(cacheKey);
        let currency = getLicenseeCurrency(licensee?.name || cacheKey);

        if (
          currency === 'USD' &&
          licensee &&
          (licensee.countryName || typeof licensee.country === 'string')
        ) {
          const fallback = licensee.countryName
            ? getCountryCurrency(licensee.countryName)
            : getCountryCurrency(
                typeof licensee.country === 'string' ? licensee.country : ''
              );
          if (fallback) {
            currency = fallback;
          }
        }

        if (!currency) {
          currency = 'USD';
        }

        licenseeCurrencyCache[cacheKey] = currency;
        if (licensee?.name) {
          licenseeCurrencyCache[licensee.name] = currency;
        }

        if (!cancelled) {
          setResolvedCurrencyCode(currency);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            '[FinancialMetricsCards] Failed to resolve licensee currency:',
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

  if (loading) {
    return <DashboardFinancialMetricsSkeleton />;
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


  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
      )}

      <div className="block md:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>

            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-600">
                  Money In
                </h3>
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              </div>

              <div className="space-y-2">
                <div
                  className={`font-bold text-gray-900 ${formatCurrencyWithScaling(totals?.moneyIn || 0).size}`}
                >
                  <CurrencyValueWithOverflow
                    value={totals?.moneyIn}
                    formatCurrencyFn={formatCurrencyAmount}
                    formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                    currencyCode={currencyCode}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>

            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-600">
                  Money Out
                </h3>
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              </div>

              <div className="space-y-2">
                <div
                  className={`font-bold text-gray-900 ${formatCurrencyWithScaling(totals?.moneyOut || 0).size}`}
                >
                  <CurrencyValueWithOverflow
                    value={totals?.moneyOut}
                    formatCurrencyFn={formatCurrencyAmount}
                    formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                    currencyCode={currencyCode}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>

            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-600">
                  Gross
                </h3>
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              </div>

              <div className="space-y-2">
                <div
                  className={`font-bold text-gray-900 ${formatCurrencyWithScaling(totals?.gross || 0).size}`}
                >
                  <CurrencyValueWithOverflow
                    value={totals?.gross}
                    formatCurrencyFn={formatCurrencyAmount}
                    formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                    currencyCode={currencyCode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              Money In
            </p>
            <div className="my-2 h-[4px] w-full rounded-full bg-buttonActive"></div>
            <div className="flex flex-1 items-center justify-center">
              <p className="overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl">
                <CurrencyValueWithOverflow
                  value={totals?.moneyIn}
                  formatCurrencyFn={formatCurrencyAmount}
                  formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                  currencyCode={currencyCode}
                />
              </p>
            </div>
          </div>

          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              Money Out
            </p>
            <div className="my-2 h-[4px] w-full rounded-full bg-lighterBlueHighlight"></div>
            <div className="flex flex-1 items-center justify-center">
              <p className="overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl">
                <CurrencyValueWithOverflow
                  value={totals?.moneyOut}
                  formatCurrencyFn={formatCurrencyAmount}
                  formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                  currencyCode={currencyCode}
                />
              </p>
            </div>
          </div>

          <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6 md:col-span-2 lg:col-span-2 xl:col-span-1">
            <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
              Gross
            </p>
            <div className="my-2 h-[4px] w-full rounded-full bg-orangeHighlight"></div>
            <div className="flex flex-1 items-center justify-center">
              <p className="overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl">
                <CurrencyValueWithOverflow
                  value={totals?.gross}
                  formatCurrencyFn={formatCurrencyAmount}
                  formatCurrencyWithScalingFn={formatCurrencyWithScaling}
                  currencyCode={currencyCode}
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
