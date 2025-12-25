/**
 * CabinetChartSection Component
 *
 * Displays the performance chart for a cabinet with granularity options.
 *
 * Features:
 * - Interactive metrics chart
 * - Time granularity selector (Hourly/Minute)
 * - Loading state handling
 */

'use client';

import Chart from '@/components/ui/dashboard/Chart';
import type { dashboardData } from '@/lib/types';
import type { TimePeriod } from '@/shared/types/common';
import { motion } from 'framer-motion';

type CabinetChartSectionProps = {
  chartData: dashboardData[];
  loadingChart: boolean;
  activeMetricsFilter: string | null;
  chartGranularity: 'hourly' | 'minute';
  onGranularityChange: (value: 'hourly' | 'minute') => void;
};

export default function CabinetChartSection({
  chartData,
  loadingChart,
  activeMetricsFilter,
  chartGranularity,
  onGranularityChange,
}: CabinetChartSectionProps) {
  return (
    <motion.div
      className="mt-4 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex flex-col space-y-4">
        {/* Granularity Selector - Always visible like on meters tab and dashboard */}
        <div className="flex items-center justify-end gap-2">
          <label
            htmlFor="chart-granularity"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Granularity:
          </label>
          <select
            id="chart-granularity"
            value={chartGranularity}
            onChange={e =>
              onGranularityChange(e.target.value as 'hourly' | 'minute')
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="minute">Minute</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>

        {/* Scrollable Chart Container for Mobile */}
        <div className="w-full touch-pan-x overflow-x-auto overflow-y-hidden">
          <div className="min-w-full">
            <Chart
              loadingChartData={loadingChart}
              chartData={chartData}
              activeMetricsFilter={activeMetricsFilter as TimePeriod}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
