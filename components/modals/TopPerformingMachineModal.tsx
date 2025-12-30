/**
 * Top Performing Machine Preview Modal
 *
 * Displays a preview of a top performing machine with:
 * - Machine information (name, game, location)
 * - Performance metrics overview
 * - Chart visualization
 * - Navigation button to view machine details
 *
 * Features:
 * - Modal overlay with backdrop
 * - Machine details display
 * - Performance metrics cards
 * - Chart visualization (similar to dashboard)
 * - Navigation to machine location
 */

'use client';

import { Button } from '@/components/ui/button';
import Chart from '@/components/ui/dashboard/Chart';
import { DashboardChartSkeleton } from '@/components/ui/skeletons/DashboardSkeletons';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import {
  getMachineChartData,
  getMachineMetrics,
  type MachineMetricsData,
} from '@/lib/helpers/machineChart';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { dashboardData } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { formatCurrencyWithCode } from '@/lib/utils/currency';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { formatMachineDisplayName } from '@/lib/utils/machineDisplay';
import { TimePeriod } from '@/shared/types/common';
import gsap from 'gsap';
import { ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type TopPerformingMachineModalProps = {
  open: boolean;
  machineId: string;
  machineName: string;
  game?: string;
  locationName?: string;
  locationId?: string;
  onClose: () => void;
  onNavigate: () => void;
};

export default function TopPerformingMachineModal({
  open,
  machineId,
  machineName,
  game,
  locationName,
  onClose,
  onNavigate,
}: TopPerformingMachineModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [machineData, setMachineData] = useState<MachineMetricsData | null>(
    null
  );
  const [chartData, setChartData] = useState<dashboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const router = useRouter();
  const { displayCurrency } = useCurrency();
  const { activePieChartFilter, activeMetricsFilter, customDateRange } =
    useDashBoardStore();

  // Use activeMetricsFilter if available (from machine detail page), otherwise fall back to activePieChartFilter (from dashboard)
  const effectiveTimePeriod =
    activeMetricsFilter || activePieChartFilter || 'Today';

  // Chart granularity state - initialize after store values are available
  const [chartGranularity, setChartGranularity] = useState<
    'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  >('hourly');

  // Show granularity selector for Today/Yesterday/Custom (only if Custom spans ≤ 1 gaming day)
  // Never show for 7d and 30d - they always use daily format
  const showGranularitySelector = useMemo(() => {
    const timePeriod = effectiveTimePeriod as TimePeriod;

    // Never show granularity selector for 7d and 30d
    if (timePeriod === '7d' || timePeriod === '30d') {
      return false;
    }

    if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
      return true;
    }
    if (
      timePeriod === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
      // Check if spans more than 1 gaming day
      try {
        const range = getGamingDayRangeForPeriod(
          'Custom',
          8, // Default gaming day start hour
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate),
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate)
        );
        const hoursDiff =
          (range.rangeEnd.getTime() - range.rangeStart.getTime()) /
          (1000 * 60 * 60);
        return hoursDiff <= 24; // Show toggle only if ≤ 24 hours
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    return false;
  }, [effectiveTimePeriod, customDateRange]);

  // Recalculate default granularity when date filters change
  // For "Today", also recalculate periodically as time passes
  // For 7d and 30d, always use 'hourly' (which displays as daily format in Chart component)
  useEffect(() => {
    const timePeriod = effectiveTimePeriod as TimePeriod;

    // Force 'hourly' for 7d and 30d (Chart component will display as daily format)
    if (
      timePeriod === '7d' ||
      timePeriod === '30d' ||
      timePeriod === 'last7days' ||
      timePeriod === 'last30days'
    ) {
      setChartGranularity('hourly');
      return;
    }

    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        timePeriod,
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    // Update immediately
    updateGranularity();

    // For "Today" filter, set up interval to recalculate every minute
    // This ensures granularity switches from 'minute' to 'hourly' when 5 hours pass
    if (timePeriod === 'Today') {
      const interval = setInterval(updateGranularity, 60000); // Every minute
      return () => clearInterval(interval);
    }

    return undefined;
  }, [
    effectiveTimePeriod,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // Fetch machine data and chart data
  useEffect(() => {
    if (!open || !machineId) return;

    const startDate = customDateRange?.startDate;
    const endDate = customDateRange?.endDate;

    const fetchData = async () => {
      setLoading(true);
      setLoadingChart(true);

      try {
        // Use effectiveTimePeriod which prioritizes activeMetricsFilter (from machine detail page) over activePieChartFilter (from dashboard)
        const timePeriod = effectiveTimePeriod as TimePeriod;

        // Fetch machine metrics and chart data in parallel
        // For 7d and 30d, don't pass granularity (API will return daily data)
        // For other periods, use the selected granularity
        const shouldPassGranularity =
          timePeriod !== '7d' &&
          timePeriod !== '30d' &&
          timePeriod !== 'last7days' &&
          timePeriod !== 'last30days';
        const granularityParam = shouldPassGranularity
          ? chartGranularity === 'minute'
            ? 'minute'
            : 'hourly'
          : undefined;

        const [metrics, chartResult] = await Promise.all([
          getMachineMetrics(
            machineId,
            timePeriod,
            startDate,
            endDate,
            displayCurrency
          ),
          getMachineChartData(
            machineId,
            timePeriod,
            startDate,
            endDate,
            displayCurrency,
            undefined,
            granularityParam
          ),
        ]);

        setMachineData(metrics);
        setChartData(chartResult.data);
      } catch (error) {
        console.error('Error fetching machine data:', error);
      } finally {
        setLoading(false);
        setLoadingChart(false);
      }
    };

    fetchData();
  }, [
    open,
    machineId,
    effectiveTimePeriod,
    customDateRange,
    displayCurrency,
    chartGranularity,
  ]);

  // Animate modal on open/close
  useEffect(() => {
    if (!open) return;

    const modal = modalRef.current;
    const backdrop = backdropRef.current;

    if (modal && backdrop) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }

    return () => {
      if (modal && backdrop) {
        gsap.to(backdrop, { opacity: 0, duration: 0.2 });
        gsap.to(modal, {
          opacity: 0,
          scale: 0.9,
          y: 20,
          duration: 0.2,
          onComplete: () => {
            setMachineData(null);
            setChartData([]);
          },
        });
      }
    };
  }, [open, modalRef, backdropRef]);

  if (!open) return null;

  const formattedMachineName = formatMachineDisplayName({
    serialNumber: machineName,
    game: game || machineData?.game,
    custom: { name: machineName },
  });

  const handleNavigate = () => {
    // Navigate to machine details page
    if (machineId) {
      router.push(`/cabinets/${machineId}`);
    }
    onNavigate();
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Machine Preview
            </h2>
            <p className="mt-1 text-sm text-gray-500">{formattedMachineName}</p>
            {locationName && (
              <p className="mt-1 text-sm text-gray-500">
                Location: {locationName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Performance Metrics */}
          {loading ? (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : machineData ? (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Money In</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(machineData.moneyIn, displayCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Money Out</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(
                    machineData.moneyOut,
                    displayCurrency
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Gross</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(machineData.gross, displayCurrency)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Chart */}
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Performance Chart
            </h3>
            {loadingChart ? (
              <DashboardChartSkeleton />
            ) : (
              <>
                {/* Granularity Selector - Only show for Today/Yesterday/Custom */}
                {showGranularitySelector && (
                  <div className="mb-3 flex items-center justify-end gap-2">
                    <label
                      htmlFor="chart-granularity-machine-modal"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Granularity:
                    </label>
                    <select
                      id="chart-granularity-machine-modal"
                      value={chartGranularity}
                      onChange={e =>
                        setChartGranularity(
                          e.target.value as 'hourly' | 'minute'
                        )
                      }
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="minute">Minute</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                )}
                <Chart
                  loadingChartData={loadingChart}
                  chartData={chartData}
                  activeMetricsFilter={effectiveTimePeriod as TimePeriod}
                />
              </>
            )}
          </div>

          {/* Additional Metrics */}
          {loading ? (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : machineData ? (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">
                  Games Played
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {machineData.gamesPlayed.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">Jackpot</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrencyWithCode(machineData.jackpot, displayCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">Coin In</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrencyWithCode(machineData.coinIn, displayCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">Coin Out</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrencyWithCode(machineData.coinOut, displayCurrency)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Navigation Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleNavigate}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Machine
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
