/**
 * Metrics Utilities
 *
 * Utility functions for dashboard metrics and filter handling.
 *
 * Features:
 * - Filter change handling
 * - Metrics data fetching
 * - Currency formatting
 * - Collection document calculations (SAS Gross, Variation)
 * - SAS time formatting
 */

import { getMetrics } from '@/lib/helpers/metrics';
import { TimePeriod } from '@/shared/types';
import { ActiveFilters, dashboardData } from '@/lib/types/index';

// ============================================================================
// Metrics Fetching Functions
// ============================================================================
/**
 * Fetches new metrics data based on selected filter.
 */
export async function switchFilter(
  filter: TimePeriod,
  setTotals: (state: dashboardData | null) => void,
  setChartData: (state: dashboardData[]) => void,
  startDate?: Date,
  endDate?: Date,
  licencee?: string,
  setActiveFilters?: (filters: ActiveFilters) => void,
  setShowDatePicker?: (state: boolean) => void,
  displayCurrency?: string,
  signal?: AbortSignal,
  granularity?: 'hourly' | 'minute'
): Promise<void> {
  try {
    // If setActiveFilters is provided, update the filter state
    if (setActiveFilters) {
      const newFilters: ActiveFilters = {
        Today: filter === 'Today',
        Yesterday: filter === 'Yesterday',
        last7days: filter === '7d',
        last30days: filter === '30d',
        Custom: filter === 'Custom',
      };
      setActiveFilters(newFilters);
    }

    // If setShowDatePicker is provided, update date picker visibility
    if (setShowDatePicker) {
      setShowDatePicker(filter === 'Custom');
    }

    const data: dashboardData[] = await getMetrics(
      filter,
      startDate,
      endDate,
      licencee,
      displayCurrency,
      signal,
      granularity
    );

    if (data.length > 0) {
      setChartData(data);
      setTotals({
        xValue: 'total',
        day: 'total',
        time: 'total',
        moneyIn: data.reduce((acc, cur) => acc + cur.moneyIn, 0),
        moneyOut: data.reduce((acc, cur) => acc + cur.moneyOut, 0),
        gross: data.reduce((acc, cur) => acc + cur.gross, 0),
        location: undefined,
        geoCoords: undefined,
      });
    } else {
      console.warn('🚨 No metrics data returned');
      setTotals(null);
      setChartData([]);
    }
  } catch (error) {
    console.error('🚨 Error fetching metrics:', error);
  }
}

// ============================================================================
// Collection Calculation Functions
// ============================================================================


