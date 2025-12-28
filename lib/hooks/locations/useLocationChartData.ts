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

import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets';
import { getMachineChartData } from '@/lib/helpers/machineChart';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { dashboardData } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/shared/types/common';
import { useEffect, useMemo, useRef, useState } from 'react';

type UseLocationChartDataProps = {
  locationId: string;
  selectedLicencee: string | null;
  activeMetricsFilter: TimePeriod | null;
  customDateRange: { startDate: Date | string; endDate: Date | string } | null;
  activeView: 'machines' | 'members';
};

export function useLocationChartData({
  locationId,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  activeView,
}: UseLocationChartDataProps) {
  const { displayCurrency } = useCurrencyFormat();
  const makeChartRequest = useAbortableRequest();

  // ============================================================================
  // State Management
  // ============================================================================
  const [chartData, setChartData] = useState<dashboardData[]>([]);
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
        return hoursDiff <= 24; // Show toggle only if ≤ 24 hours
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
  // Only update if user hasn't manually set granularity
  useEffect(() => {
    if (hasManuallySetGranularityRef.current) {
      return;
    }

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
      return;
    }

    // On initial load, we need locationId at minimum
    if (!locationId) {
      return;
    }

    // Use 'Today' as default if activeMetricsFilter is not set
    const timePeriod = activeMetricsFilter || 'Today';

    // For Quarterly/All Time, granularity is just a display preference and shouldn't trigger refetch
    // Only include granularity in fetch key for Today/Yesterday where it affects API response
    const isShortPeriod = timePeriod === 'Today' || timePeriod === 'Yesterday';

    // Create a stable key for this fetch to prevent duplicate requests
    const fetchKey = JSON.stringify({
      locationId,
      selectedLicencee,
      timePeriod,
      customDateRange,
      displayCurrency,
      // Only include granularity for short periods where it affects the data
      ...(isShortPeriod ? { chartGranularity } : {}),
    });

    // Skip if this exact fetch was already made
    if (lastFetchParamsRef.current === fetchKey) {
      return;
    }

    lastFetchParamsRef.current = fetchKey;

    makeChartRequest(async signal => {
      setLoadingChartData(true);

      try {
        // Only pass granularity to API for Today/Yesterday where it affects the response
        // For Quarterly/All Time, granularity is handled client-side and shouldn't trigger refetch
        const granularity = isShortPeriod ? chartGranularity : undefined;

        // Fetch all machines at the location (with high limit to get all machines)
        const machinesResponse = await fetchCabinetsForLocation(
          locationId,
          selectedLicencee || undefined,
          timePeriod,
          undefined, // searchTerm
          customDateRange
            ? {
                from:
                  customDateRange.startDate instanceof Date
                    ? customDateRange.startDate
                    : new Date(customDateRange.startDate),
                to:
                  customDateRange.endDate instanceof Date
                    ? customDateRange.endDate
                    : new Date(customDateRange.endDate),
              }
            : undefined,
          1, // page
          10000, // high limit to get all machines
          displayCurrency,
          signal
        );

        const machines = machinesResponse.data;

        if (!machines || machines.length === 0) {
          setChartData([]);
          setDataSpan(null);
          return;
        }

        // Fetch chart data for all machines in parallel
        const chartPromises = machines.map(machine =>
          getMachineChartData(
            String(machine._id),
            timePeriod as TimePeriod,
            customDateRange?.startDate,
            customDateRange?.endDate,
            displayCurrency,
            selectedLicencee,
            granularity,
            signal
          )
        );

        const chartResults = await Promise.all(chartPromises);

        // Aggregate chart data from all machines
        const aggregatedDataMap = new Map<
          string,
          {
            moneyIn: number;
            moneyOut: number;
            gross: number;
            day: string;
            time: string;
          }
        >();
        let earliestMinDate: Date | null = null;
        let latestMaxDate: Date | null = null;

        chartResults.forEach(
          (result: {
            data: dashboardData[];
            dataSpan?: { minDate: string; maxDate: string };
          }) => {
            // Track data span
            if (result.dataSpan?.minDate && result.dataSpan?.maxDate) {
              const minDate = new Date(result.dataSpan.minDate);
              const maxDate = new Date(result.dataSpan.maxDate);

              if (!earliestMinDate || minDate < earliestMinDate) {
                earliestMinDate = minDate;
              }
              if (!latestMaxDate || maxDate > latestMaxDate) {
                latestMaxDate = maxDate;
              }
            }

            // Aggregate data points
            result.data.forEach((point: dashboardData) => {
              const key = `${point.day}_${point.time || ''}`;
              const existing = aggregatedDataMap.get(key);

              if (existing) {
                existing.moneyIn += point.moneyIn;
                existing.moneyOut += point.moneyOut;
                existing.gross += point.gross;
              } else {
                aggregatedDataMap.set(key, {
                  moneyIn: point.moneyIn,
                  moneyOut: point.moneyOut,
                  gross: point.gross,
                  day: point.day,
                  time: point.time || '',
                });
              }
            });
          }
        );

        // Convert map to array and format as dashboardData
        const aggregatedData: dashboardData[] = Array.from(
          aggregatedDataMap.values()
        ).map(values => ({
          xValue: values.time || values.day,
          day: values.day,
          time: values.time,
          moneyIn: values.moneyIn,
          moneyOut: values.moneyOut,
          gross: values.gross,
        }));

        // Sort by day and time
        aggregatedData.sort((a, b) => {
          const dayCompare = (a.day || '').localeCompare(b.day || '');
          if (dayCompare !== 0) return dayCompare;
          return (a.time || '').localeCompare(b.time || '');
        });

        setChartData(aggregatedData);

        // Store aggregated data span
        if (earliestMinDate !== null && latestMaxDate !== null) {
          const minDate: Date = earliestMinDate;
          const maxDate: Date = latestMaxDate;
          setDataSpan({
            minDate: minDate.toISOString(),
            maxDate: maxDate.toISOString(),
          });
        } else {
          setDataSpan(null);
        }
      } catch (error) {
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
    chartGranularity, // Keep this to refetch when user manually changes granularity
    activeView,
    makeChartRequest,
    // Removed showGranularitySelector - it's a computed value that shouldn't trigger fetches
  ]);

  // Separate effect to refetch when granularity is manually changed
  useEffect(() => {
    // Only refetch if granularity was manually set and we have data
    if (
      hasManuallySetGranularityRef.current &&
      activeView === 'machines' &&
      locationId &&
      chartData.length > 0
    ) {
      // Reset the flag and trigger a refetch by updating lastFetchParamsRef
      hasManuallySetGranularityRef.current = false;
      lastFetchParamsRef.current = '';
      // The main fetch effect will run because chartGranularity changed
    }
  }, [chartGranularity, activeView, locationId, chartData.length]);

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
  };
}
