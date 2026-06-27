/**
 * Custom hook for Locations Tab filtering logic
 *
 * Handles filter state management, time period conversion,
 * parameter building, and debounced search for the Locations tab.
 *
 * @module lib/hooks/reports/useLocationsFiltering
 */

import { useCallback, useMemo } from 'react';
import { TimePeriod } from '@/lib/types/api';

type UseLocationsFilteringProps = {
  activeMetricsFilter: string;
  customDateRange: { startDate: Date | null; endDate: Date | null } | null;
  selectedLicencee: string;
  displayCurrency: string;
  activeTab: string;
  itemsPerPage: number;
  itemsPerBatch: number;
  pagesPerBatch: number;
};

/**
 * Custom hook for Locations Tab filtering logic
 */
export function useLocationsFiltering({
  activeMetricsFilter,
  customDateRange,
  selectedLicencee,
  displayCurrency,
  activeTab: _activeTab,
  itemsPerPage: _itemsPerPage,
  itemsPerBatch: _itemsPerBatch,
  pagesPerBatch,
}: UseLocationsFilteringProps) {
  // ============================================================================
  // Filter State & Helpers
  // ============================================================================

  /**
   * Convert activeMetricsFilter to TimePeriod
   */
  const getTimePeriod = useCallback((): TimePeriod => {
    if (activeMetricsFilter === 'Today') return 'Today';
    if (activeMetricsFilter === 'Yesterday') return 'Yesterday';
    if (activeMetricsFilter === 'last7days' || activeMetricsFilter === '7d')
      return '7d';
    if (activeMetricsFilter === 'last30days' || activeMetricsFilter === '30d')
      return '30d';
    if (activeMetricsFilter === 'Quarterly') return 'Quarterly';
    if (activeMetricsFilter === 'All Time') return 'All Time';
    if (activeMetricsFilter === 'Custom') return 'Custom';
    return 'Today';
  }, [activeMetricsFilter]);

  /**
   * Build time period params for API calls
   */
  const buildTimePeriodParams = useCallback(
    (params: Record<string, string | string[]>) => {
      if (activeMetricsFilter === 'Today') {
        params.timePeriod = 'Today';
      } else if (activeMetricsFilter === 'Yesterday') {
        params.timePeriod = 'Yesterday';
      } else if (
        activeMetricsFilter === 'last7days' ||
        activeMetricsFilter === '7d'
      ) {
        params.timePeriod = '7d';
      } else if (
        activeMetricsFilter === 'last30days' ||
        activeMetricsFilter === '30d'
      ) {
        params.timePeriod = '30d';
      } else if (activeMetricsFilter === 'Quarterly') {
        params.timePeriod = 'Quarterly';
      } else if (activeMetricsFilter === 'All Time') {
        params.timePeriod = 'All Time';
      } else if (
        activeMetricsFilter === 'Custom' &&
        customDateRange?.startDate &&
        customDateRange?.endDate
      ) {
        params.timePeriod = 'Custom';
        const sd =
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate as string);
        const ed =
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate as string);
        // Format from local date parts (not toISOString, which is UTC) so the
        // selected day isn't shifted across the UTC boundary in Trinidad time.
        const formatLocalDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        params.startDate = formatLocalDate(sd);
        params.endDate = formatLocalDate(ed);
      } else {
        params.timePeriod = 'Today';
      }

      if (selectedLicencee && selectedLicencee !== 'all') {
        params.licencee = selectedLicencee;
      }

      if (displayCurrency) {
        params.currency = displayCurrency;
      }
    },
    [activeMetricsFilter, customDateRange, selectedLicencee, displayCurrency]
  );

  /**
   * Calculate which batch we need based on current page
   */
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // Create stable date range key to prevent infinite loops
  const dateRangeKey = useMemo(() => {
    if (!customDateRange?.startDate || !customDateRange?.endDate) {
      return '';
    }
    return `${customDateRange.startDate.getTime()}-${customDateRange.endDate.getTime()}`;
  }, [customDateRange?.startDate, customDateRange?.endDate]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Filter conversion
    getTimePeriod,
    buildTimePeriodParams,
    calculateBatchNumber,
    dateRangeKey,

    // Derived filter values
    timePeriod: getTimePeriod(),
    hasCustomDateRange:
      activeMetricsFilter === 'Custom' &&
      !!customDateRange?.startDate &&
      !!customDateRange?.endDate,
    effectiveLicencee: selectedLicencee && selectedLicencee !== 'all' ? selectedLicencee : '',
  };
}