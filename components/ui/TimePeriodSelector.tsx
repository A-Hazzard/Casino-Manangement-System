/**
 * Time Period Selector Component
 * Mobile-only time period selector dropdown for dashboard metrics.
 *
 * Features:
 * - Time period selection dropdown
 * - Integration with dashboard store
 * - Loading and refreshing state handling
 * - Mobile-only display (hidden on desktop)
 * - Disabled state during loading
 */
'use client';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { getTimeFilterButtons } from '@/lib/helpers/dashboard';
import type { TimePeriod } from '@shared/types';

export function TimePeriodSelector() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    loadingChartData,
    refreshing,
  } = useDashBoardStore();

  const timeFilterButtons = getTimeFilterButtons();

  return (
    <div className="my-4 flex justify-center lg:hidden">
      <select
        className={`rounded-full bg-buttonActive px-4 py-2 text-sm text-white ${
          loadingChartData || refreshing ? 'cursor-not-allowed opacity-50' : ''
        }`}
        value={activeMetricsFilter}
        onChange={e => setActiveMetricsFilter(e.target.value as TimePeriod)}
        disabled={loadingChartData || refreshing}
      >
        {timeFilterButtons.map(filter => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </div>
  );
}
