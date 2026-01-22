/**
 * useLocationChartData Hook
 *
 * Manages chart data fetching for the location details page.
 *
 * Features:
 * - Chart data fetching with abort controller support
 * - Granularity detection (hourly/minute)
 * - Data transformation for chart display
 * - Request deduplication
 */

'use client';

import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { dashboardData } from '@/lib/types';
import { dateRange as DateRange } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chart';
import { isAbortError } from '@/lib/utils/errors';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/shared/types/common';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseLocationChartDataProps = {
  locationId: string;
  selectedLicencee: string | null;
  activeMetricsFilter: TimePeriod | null;
  customDateRange: DateRange | null;
  activeView: 'machines' | 'members';
  status?: 'All' | 'Online' | 'Offline';
  gameType?: string;
};

export function useLocationChartData({
  locationId,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  activeView,
  status,
  gameType,
}: UseLocationChartDataProps) {
  const { displayCurrency } = useCurrencyFormat();
  const makeChartRequest = useAbortableRequest();

  // ============================================================================
  // State Management
  // ============================================================================
  const [chartData, setChartData] = useState<dashboardData[] | null>(null);
  const [loadingChartData, setLoadingChartData] = useState(true);
  const [chartGranularity, setChartGranularity] = useState<
    'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  >(() =>
    getDefaultChartGranularity(
      activeMetricsFilter || 'Today',
      customDateRange?.startDate,
      customDateRange?.endDate
    )
  );
  const [availableGranularityOptions, setAvailableGranularityOptions] =
    useState<Array<'daily' | 'weekly' | 'monthly'>>([]);

  // Ref for tracking manual granularity changes
  const hasManuallySetGranularityRef = useRef(false);
  // Ref to track the last fetch parameters to prevent unnecessary refetches
  const lastFetchParamsRef = useRef<string>('');
  // State to force refresh when refresh button is clicked (state triggers re-render)
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dataSpan, setDataSpan] = useState<{
    minDate: string;
    maxDate: string;
  } | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================
  // Show granularity selector for Today/Yesterday/Custom (only if Custom spans ≤ 1 gaming day)
  // Also show for Quarterly/All Time if data span >= 1 week
  const showGranularitySelector = useMemo(() => {
    if (
      activeMetricsFilter === 'Today' ||
      activeMetricsFilter === 'Yesterday'
    ) {
      return true;
    }
    if (
      activeMetricsFilter === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
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
        const daysDiff = hoursDiff / 24;
        return daysDiff <= 2; // Show toggle only if ≤ 2 days (48 hours)
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    // For Quarterly and All Time, show selector if we have available options (data span >= 1 week)
    if (
      (activeMetricsFilter === 'Quarterly' ||
        activeMetricsFilter === 'All Time') &&
      availableGranularityOptions.length > 0
    ) {
      return true;
    }
    return false;
  }, [activeMetricsFilter, customDateRange, availableGranularityOptions]);

  // Recalculate default granularity when date filters change
  // Reset manual flag when time period changes so appropriate defaults are used
  useEffect(() => {
    // Reset manual granularity flag when time period changes
    // This ensures switching from Quarterly->Today resets granularity appropriately
    hasManuallySetGranularityRef.current = false;

    if (!activeMetricsFilter) return;

    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        activeMetricsFilter as TimePeriod,
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    // Update immediately
    updateGranularity();

    // For "Today" filter, set up interval to recalculate every minute
    // This ensures granularity switches from 'minute' to 'hourly' when 5 hours pass
    if (activeMetricsFilter === 'Today') {
      const interval = setInterval(updateGranularity, 60000); // Every minute
      return () => clearInterval(interval);
    }

    return undefined;
  }, [
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // ============================================================================
  // Effects - Data Fetching
  // ============================================================================
  // Reset lastFetchParamsRef on unmount to ensure fresh fetch on remount
  useEffect(() => {
    return () => {
      lastFetchParamsRef.current = '';
    };
  }, []);

  // Update granularity based on data span
  // This effect should NOT trigger a refetch - it only updates UI state
  useEffect(() => {
    if (
      activeMetricsFilter !== 'Quarterly' &&
      activeMetricsFilter !== 'All Time'
    ) {
      setAvailableGranularityOptions([]);
      return;
    }

    if (!dataSpan || !dataSpan.minDate || !dataSpan.maxDate) {
      setAvailableGranularityOptions([]);
      return;
    }

    const minDate = new Date(dataSpan.minDate);
    const maxDate = new Date(dataSpan.maxDate);
    const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const newOptions: Array<'daily' | 'weekly' | 'monthly'> =
      daysDiff < 7
        ? []
        : daysDiff < 60
          ? ['daily', 'weekly']
          : ['monthly', 'weekly'];

    setAvailableGranularityOptions(prev => {
      if (JSON.stringify(prev) === JSON.stringify(newOptions)) return prev;
      return newOptions;
    });

    // Only update granularity if user hasn't manually set it
    // Use functional update to avoid triggering other effects
    if (!hasManuallySetGranularityRef.current) {
      setChartGranularity(prev => {
        if (daysDiff < 7) {
          return prev !== 'daily' ? 'daily' : prev;
        } else if (daysDiff < 60) {
          return ['daily', 'weekly'].includes(prev) ? prev : 'daily';
        } else {
          return ['monthly', 'weekly'].includes(prev) ? prev : 'monthly';
        }
      });
    }
  }, [activeMetricsFilter, dataSpan]);

  // Fetch chart data
  // This effect should only run when core parameters change, not when granularity/selector change
  useEffect(() => {
    // Only fetch if machines view is active
    if (activeView !== 'machines') {
      setLoadingChartData(false);
      return;
    }

    // On initial load, we need locationId at minimum
    if (!locationId) {
      setLoadingChartData(false);
      return;
    }

    // Use 'Today' as default if activeMetricsFilter is not set
    // This ensures we always fetch on initial load even if activeMetricsFilter is null
    const timePeriod = activeMetricsFilter || 'Today';

    // Determine when granularity should be included in API call and fetch key
    // 1. For Today/Yesterday/Custom (≤ 2 days): granularity affects API response (hourly/minute)
    // 2. For Quarterly/All Time: granularity affects API response when monthly/weekly (needs server aggregation)
    const isShortPeriod =
      timePeriod === 'Today' ||
      timePeriod === 'Yesterday' ||
      (timePeriod === 'Custom' &&
        customDateRange?.startDate &&
        customDateRange?.endDate);

    // For Custom periods, check if it's ≤ 2 days
    let shouldIncludeGranularity = isShortPeriod;
    if (
      timePeriod === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
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
        const daysDiff = hoursDiff / 24;
        shouldIncludeGranularity = daysDiff <= 2;
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        shouldIncludeGranularity = false;
      }
    }

    // For Quarterly/All Time, include granularity if it's monthly or weekly (needs server aggregation)
    const isLongPeriod =
      timePeriod === 'Quarterly' || timePeriod === 'All Time';
    const needsServerAggregation =
      isLongPeriod &&
      (chartGranularity === 'monthly' || chartGranularity === 'weekly');

    // Include granularity in fetch key if it affects the API response
    const shouldIncludeInFetchKey =
      shouldIncludeGranularity || needsServerAggregation;

    // Create a stable key for this fetch to prevent duplicate requests
    // Include refreshTrigger to force refresh when refresh button is clicked
    const fetchKey = JSON.stringify({
      locationId,
      selectedLicencee,
      timePeriod,
      customDateRange,
      displayCurrency,
      refreshTrigger,
      status,
      gameType,
      // Include granularity when it affects the data (short periods or monthly/weekly for long periods)
      ...(shouldIncludeInFetchKey ? { chartGranularity } : {}),
    });

    // Skip if this exact fetch was already made (unless refresh was triggered)
    const shouldSkip = lastFetchParamsRef.current === fetchKey && refreshTrigger === 0;

    if (shouldSkip) {
      return;
    }

    lastFetchParamsRef.current = fetchKey;

    makeChartRequest(async signal => {
      setLoadingChartData(true);

      try {
        // Pass granularity to API when:
        // 1. Short periods (Today/Yesterday/Custom ≤ 2 days) - affects hourly/minute aggregation
        // 2. Long periods (Quarterly/All Time) with monthly/weekly - needs server aggregation
        const granularity =
          shouldIncludeGranularity || needsServerAggregation
            ? chartGranularity
            : undefined;

        // Ensure we default to daily if granularity is not specifically determined
        // This prevents 400 errors for queries where the backend expects a granularity
        const effectiveGranularity = granularity || 'daily';

        // Always use location-trends API (server-side aggregation) for all time periods
        // This replaces the previous client-side aggregation of individual machine charts
        const params: Record<string, string> = {
          locationIds: locationId,
          timePeriod: timePeriod as string,
        };

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licencee = selectedLicencee;
        }

        if (displayCurrency) {
          params.currency = displayCurrency;
        }

        // Add status filter
        if (status && status !== 'All') {
          params.status = status.toLowerCase();
        }

        // Add game type filter
        if (gameType && gameType !== 'all') {
          params.gameType = gameType;
        }

        // Add custom date range params only for Custom period
        if (
          timePeriod === 'Custom' &&
          customDateRange?.startDate &&
          customDateRange?.endDate
        ) {
          const startDate =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate);
          const endDate =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate);

          params.startDate = startDate.toISOString().split('T')[0];
          params.endDate = endDate.toISOString().split('T')[0];
        }

        // Always pass granularity if it's defined (calculated earlier based on period length)
        if (effectiveGranularity) {
          params.granularity = effectiveGranularity;
        } else if (granularity) {
          params.granularity = granularity;
        }

        const response = await axios.get('/api/analytics/location-trends', {
          params,
          signal,
          timeout: 120000,
        });

        // Transform location-trends response to dashboardData format
        const trendsData = response.data?.trends || [];
        const transformedData: dashboardData[] = trendsData.map(
          (item: {
            day: string;
            time?: string;
            [locationId: string]:
              | {
                  handle: number;
                  winLoss: number;
                  jackpot: number;
                  plays: number;
                  drop: number;
                  totalCancelledCredits: number;
                  gross: number;
                }
              | string
              | undefined;
          }) => {
            const locationData = item[locationId];
            if (!locationData || typeof locationData === 'string') {
              return {
                xValue: item.time || item.day,
                day: item.day,
                time: item.time,
                moneyIn: 0,
                moneyOut: 0,
                gross: 0,
              };
            }

            return {
              xValue: item.time || item.day,
              day: item.day,
              time: item.time,
              moneyIn: locationData.drop || 0,
              moneyOut: locationData.totalCancelledCredits || 0,
              gross: locationData.gross || 0,
            };
          }
        );

        setChartData(transformedData);

        // Extract data span from response if available
        if (response.data?.dataSpan) {
          setDataSpan(response.data.dataSpan);
        } else if (transformedData.length > 0) {
          // Calculate data span from transformed data
          // For hourly data, use day + time to get accurate timestamps
          const timestamps: Date[] = [];
          transformedData.forEach(d => {
            if (d.day && d.time) {
              try {
                const timeParts = d.time.split(':');
                const hours = parseInt(timeParts[0] || '0', 10);
                const minutes = parseInt(timeParts[1] || '0', 10);
                const dateStr = d.day.split('T')[0]; // Get YYYY-MM-DD part
                const timestamp = new Date(
                  `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
                );
                if (!isNaN(timestamp.getTime())) {
                  timestamps.push(timestamp);
                }
              } catch {
                // Fallback to day only
                const dayDate = new Date(d.day);
                if (!isNaN(dayDate.getTime())) {
                  timestamps.push(dayDate);
                }
              }
            } else if (d.day) {
              const dayDate = new Date(d.day);
              if (!isNaN(dayDate.getTime())) {
                timestamps.push(dayDate);
              }
            }
          });

          if (timestamps.length > 0) {
            const minDate = new Date(
              Math.min(...timestamps.map(t => t.getTime()))
            );
            const maxDate = new Date(
              Math.max(...timestamps.map(t => t.getTime()))
            );
            setDataSpan({
              minDate: minDate.toISOString(),
              maxDate: maxDate.toISOString(),
            });

            // Update granularity based on actual data span ONLY on initial load
            // Once user manually changes granularity, NEVER auto-update it again
            // The hasManuallySetGranularityRef flag prevents any auto-updates after manual change
            if (!hasManuallySetGranularityRef.current) {
              const hoursDiff =
                (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60);
              const shouldBeHourly = hoursDiff > 5;

              // Only update if we're in a period that supports granularity
              // AND the current granularity doesn't match what it should be based on data span
              // This ensures we only update on initial load, not after user changes it
              if (
                (activeMetricsFilter === 'Today' ||
                  activeMetricsFilter === 'Yesterday' ||
                  (activeMetricsFilter === 'Custom' &&
                    customDateRange?.startDate &&
                    customDateRange?.endDate)) &&
                ((shouldBeHourly && chartGranularity === 'minute') ||
                  (!shouldBeHourly && chartGranularity === 'hourly'))
              ) {
                // Only update on initial load - once user changes it manually, this won't run
                setChartGranularity(shouldBeHourly ? 'hourly' : 'minute');
              }
            }
            // If hasManuallySetGranularityRef.current is true, do nothing - respect user's choice
          } else {
            setDataSpan(null);
          }
        } else {
          setDataSpan(null);
        }

        return;
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching chart data:', error);
        }
        setChartData([]);
      } finally {
        setLoadingChartData(false);
      }
    });
  }, [
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
    chartGranularity, // Include chartGranularity to trigger refetch when monthly/weekly is selected for Quarterly/All Time
    activeView,
    makeChartRequest,
    refreshTrigger, // Include refreshTrigger in dependencies to trigger refetch when refresh button is clicked
    status,
    gameType,
  ]);

  // Note: When user manually changes granularity, the setChartGranularity function
  // clears lastFetchParamsRef which triggers a refetch via the main effect.
  // We DON'T reset hasManuallySetGranularityRef here - once user sets it manually,
  // we should respect their choice and never auto-update again.

  // ============================================================================
  // Refresh Function
  // ============================================================================
  const refreshChart = useCallback(() => {
    // Increment refresh trigger state to force refetch (state change triggers effect)
    setRefreshTrigger(prev => prev + 1);
    // Clear last fetch params to force refetch
    lastFetchParamsRef.current = '';
  }, []);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    chartData,
    loadingChartData,
    chartGranularity,
    setChartGranularity: (
      value: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
    ) => {
      hasManuallySetGranularityRef.current = true;
      lastFetchParamsRef.current = ''; // Clear cache to force refetch
      setChartGranularity(value);
    },
    showGranularitySelector,
    availableGranularityOptions,
    refreshChart, // Expose refresh function
  };
}

