/**
 * LocationChartSection Component
 *
 * Displays the performance chart for a location with granularity options.
 *
 * Features:
 * - Interactive metrics chart
 * - Time granularity selector (Hourly/Minute/Daily/Weekly/Monthly)
 * - Loading state handling
 * - Zero totals placeholder
 */

'use client';

import Chart from '@/components/ui/dashboard/Chart';
import type { dashboardData } from '@/lib/types';
import type { TimePeriod } from '@/shared/types/common';
import { motion } from 'framer-motion';

type LocationChartSectionProps = {
  chartData: dashboardData[];
  loadingChartData: boolean;
  activeMetricsFilter: string | null;
  chartGranularity: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
  onGranularityChange: (
    value: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  ) => void;
  showGranularitySelector: boolean;
  availableGranularityOptions?: Array<'daily' | 'weekly' | 'monthly'>;
  financialTotals: { moneyIn: number; moneyOut: number; gross: number };
  loading?: boolean; // For checking if we should show zero totals placeholder
};

export default function LocationChartSection({
  chartData,
  loadingChartData,
  activeMetricsFilter,
  chartGranularity,
  onGranularityChange,
  showGranularitySelector,
  availableGranularityOptions = [],
  financialTotals,
  loading = false,
}: LocationChartSectionProps) {
  // Check if all financial totals are zero
  const hasZeroTotals =
    financialTotals.moneyIn === 0 &&
    financialTotals.moneyOut === 0 &&
    financialTotals.gross === 0;

  // Show placeholder message if all totals are zero and data is not loading
  if (!loadingChartData && !loading && hasZeroTotals) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md">
        <div className="mb-2 text-lg text-gray-500">No Metrics Data</div>
        <div className="text-center text-sm text-gray-400">
          No metrics data available for the selected time period
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="mt-4 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex flex-col space-y-4">
        {/* Granularity Selector - Show for Today/Yesterday or Quarterly/All Time with available options */}
        {showGranularitySelector && (
          <div className="flex items-center justify-end gap-2">
            <label
              htmlFor="chart-granularity-location"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Granularity:
            </label>
            <select
              id="chart-granularity-location"
              value={chartGranularity}
              onChange={e =>
                onGranularityChange(
                  e.target.value as
                    | 'hourly'
                    | 'minute'
                    | 'daily'
                    | 'weekly'
                    | 'monthly'
                )
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {/* Show hourly/minute options for Today/Yesterday periods */}
              {(activeMetricsFilter === 'Today' ||
                activeMetricsFilter === 'Yesterday') && (
                <>
                  <option value="minute">Minute</option>
                  <option value="hourly">Hourly</option>
                </>
              )}
              {/* Show monthly/weekly options for longer time periods with sufficient data */}
              {availableGranularityOptions &&
                availableGranularityOptions.includes('monthly') && (
                <>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </>
              )}
              {/* Show daily/weekly options for medium time periods */}
              {availableGranularityOptions &&
                availableGranularityOptions.includes('daily') &&
                !availableGranularityOptions.includes('monthly') && (
                  <>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </>
                )}
            </select>
          </div>
        )}

        {/* Scrollable Chart Container for Mobile */}
        <div className="w-full touch-pan-x overflow-x-auto overflow-y-hidden">
          <div className="min-w-full">
            <Chart
              loadingChartData={loadingChartData}
              chartData={chartData}
              activeMetricsFilter={activeMetricsFilter as TimePeriod}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
