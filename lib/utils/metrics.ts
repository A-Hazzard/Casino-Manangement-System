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
import type { CollectionDocument } from '@/lib/types/collections';
import { TimePeriod } from '@shared/types';
import { ActiveFilters, dashboardData } from '../types';

// ============================================================================
// Filter Handling Functions
// ============================================================================
/**
 * Handles a change in the active dashboard filter.
 *
 * Updates the active filter state, toggles the Custom date picker if needed,
 * and updates the active metrics filter label.
 */
export async function handleFilterChange(
  filterKey: keyof ActiveFilters,
  setActiveFilters: (filters: ActiveFilters) => void,
  setShowDatePicker: (state: boolean) => void,
  setActiveMetricsFilter: (state: TimePeriod) => void
): Promise<void> {
  const newFilters: ActiveFilters = {
    Today: false,
    Yesterday: false,
    last7days: false,
    last30days: false,
    Custom: false,
  };

  newFilters[filterKey] = true;
  setActiveFilters(newFilters); //  Now correctly updating state!

  const label = (
    filterKey === 'last7days'
      ? '7d'
      : filterKey === 'last30days'
        ? '30d'
        : filterKey.charAt(0).toUpperCase() + filterKey.slice(1)
  ) as TimePeriod;

  setActiveMetricsFilter(label);

  setShowDatePicker(filterKey === 'Custom');
}

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
// Formatting Functions
// ============================================================================
/**
 * Formats a given number as a localized USD currency string with smart decimal handling.
 *
 * @param {number} value - The number to format.
 * @returns {string} The formatted currency string in USD.
 */
export function formatNumber(value: number): string {
  if (isNaN(value)) {
    return '$0';
  }

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  }).format(value);
}

/**
 * Formats a given number with currency conversion support.
 * This function should be used in components that have access to the currency context.
 *
 * @param {number} value - The number to format.
 * @param {string} currency - The currency code to format in.
 * @returns {string} The formatted currency string.
 */
export function formatNumberWithCurrency(
  value: number,
  currency: string = 'USD'
): string {
  if (isNaN(value)) {
    return '$0';
  }

  // Check if the value has meaningful decimal places
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
    maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
  }).format(value);
}

// ============================================================================
// Collection Calculation Functions
// ============================================================================
/**
 * Calculates the SAS Gross for a collection document.
 * @param col - The collection document.
 * @returns The SAS Gross (drop - totalCancelledCredits).
 */
export function calculateSasGross(col: CollectionDocument): number {
  if (!col.sasMeters) return 0;
  return (col.sasMeters.drop || 0) - (col.sasMeters.totalCancelledCredits || 0);
}

/**
 * Calculates the variation for a collection document.
 * @param col - The collection document.
 * @returns The variation (Meter Gross - SAS Gross) or "No SAS Data" if SAS data is missing.
 */
export function calculateVariation(col: CollectionDocument): number | string {
  // Check if SAS data exists - if not, return "No SAS Data"
  // Note: sasMeters.gross can be 0 (valid value), so we only check for undefined/null
  if (
    !col.sasMeters ||
    col.sasMeters.gross === undefined ||
    col.sasMeters.gross === null
  ) {
    return 'No SAS Data';
  }
  return (col.movement.gross || 0) - calculateSasGross(col);
}

// ============================================================================
// SAS Time Formatting Functions
// ============================================================================
/**
 * Formats the SAS Times for a collection document.
 * @param col - The collection document.
 * @returns The SAS start and end times, each on a new line.
 */
export function formatSasTimes(col: CollectionDocument): string {
  if (!col.sasMeters) return '-';
  return `${col.sasMeters.sasStartTime || '-'}\n${
    col.sasMeters.sasEndTime || '-'
  }`;
}
