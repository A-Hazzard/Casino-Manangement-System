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
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/shared/types/common';
import { formatLocalDateTimeString } from '@/shared/utils/dateFormat';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

type UseLocationChartDataProps = {
  locationId: string;
  selectedLicencee: string | null;
  activeMetricsFilter: TimePeriod | null;
  customDateRange: { startDate: Date | string; endDate: Date | string } | null;
  dateFilterInitialized: boolean;
  filtersInitialized: boolean;
  activeView: 'machines' | 'members';
};

export function useLocationChartData({
  locationId,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  dateFilterInitialized,
  filtersInitialized,
  activeView,
}: UseLocationChartDataProps) {
  const { displayCurrency } = useCurrencyFormat();
  const makeChartRequest = useAbortableRequest();

  // ============================================================================
  // State Management
  // ============================================================================
  const [chartData, setChartData] = useState<dashboardData[]>([]);
  const [loadingChartData, setLoadingChartData] = useState(false);
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    'hourly'
  );

  // Refs for preventing duplicate requests
  const chartRequestInProgress = useRef(false);
  const prevChartFetchKey = useRef<string>('');

  // ============================================================================
  // Computed Values
  // ============================================================================
  // Show granularity selector for Today/Yesterday/Custom (only if Custom spans ≤ 1 gaming day)
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
    return false;
  }, [activeMetricsFilter, customDateRange]);

  // Initialize and recalculate default granularity when date filters change
  useEffect(() => {
    if (!activeMetricsFilter) return undefined;

    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        activeMetricsFilter as TimePeriod,
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    updateGranularity();

    // For "Today" filter, set up interval to recalculate every minute
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
  useEffect(() => {
    // Only fetch if machines view is active
    if (activeView !== 'machines') {
      return;
    }

    // On initial load, we need locationId and activeMetricsFilter at minimum
    if (!locationId || !activeMetricsFilter) {
      return;
    }

    // Create a unique key for this fetch
    const startDateStr = customDateRange?.startDate
      ? customDateRange.startDate instanceof Date
        ? customDateRange.startDate.toISOString()
        : String(customDateRange.startDate)
      : '';
    const endDateStr = customDateRange?.endDate
      ? customDateRange.endDate instanceof Date
        ? customDateRange.endDate.toISOString()
        : String(customDateRange.endDate)
      : '';
    const fetchKey = `${locationId}-${activeMetricsFilter}-${startDateStr}-${endDateStr}-${selectedLicencee}-${displayCurrency}-${chartGranularity}`;

    // If fetch key changed, we need to fetch new data
    const fetchKeyChanged = prevChartFetchKey.current !== fetchKey;

    // Only skip if same key and request already in progress
    if (!fetchKeyChanged && chartRequestInProgress.current) {
      return;
    }

    // Skip if filters not initialized
    if (!dateFilterInitialized || !filtersInitialized) {
      return;
    }

    const fetchChartData = async () => {
      chartRequestInProgress.current = true;
      setLoadingChartData(true);

      try {
        await makeChartRequest(async signal => {
          const timePeriod = activeMetricsFilter as TimePeriod;

          let url = `/api/analytics/location-trends?locationIds=${locationId}&timePeriod=${timePeriod}`;

          if (
            timePeriod === 'Custom' &&
            customDateRange?.startDate &&
            customDateRange?.endDate
          ) {
            const sd =
              customDateRange.startDate instanceof Date
                ? customDateRange.startDate
                : new Date(customDateRange.startDate);
            const ed =
              customDateRange.endDate instanceof Date
                ? customDateRange.endDate
                : new Date(customDateRange.endDate);

            const hasTime =
              sd.getHours() !== 0 ||
              sd.getMinutes() !== 0 ||
              sd.getSeconds() !== 0 ||
              ed.getHours() !== 0 ||
              ed.getMinutes() !== 0 ||
              ed.getSeconds() !== 0;

            if (hasTime) {
              url += `&startDate=${formatLocalDateTimeString(sd, -4)}&endDate=${formatLocalDateTimeString(ed, -4)}`;
            } else {
              url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
            }
          }

          if (selectedLicencee && selectedLicencee !== 'all') {
            url += `&licencee=${encodeURIComponent(selectedLicencee)}`;
          }

          if (displayCurrency) {
            url += `&currency=${displayCurrency}`;
          }

          const granularity = showGranularitySelector
            ? chartGranularity
            : undefined;
          if (granularity) {
            url += `&granularity=${granularity}`;
          }

          const response = await axios.get<{
            trends: Array<{
              day: string;
              time?: string;
              [key: string]:
                | {
                    drop: number;
                    gross: number;
                    totalCancelledCredits?: number;
                  }
                | string
                | undefined;
            }>;
            isHourly: boolean;
          }>(url, {
            headers: {
              'Cache-Control': 'no-cache',
            },
            signal,
          });

          const { trends, isHourly } = response.data;

          if (!trends || !Array.isArray(trends) || trends.length === 0) {
            setChartData([]);
            return;
          }

          // Check if API response contains minute-level data
          const hasMinuteLevelData = trends.some(trend => {
            if (!trend.time) return false;
            const timeParts = trend.time.split(':');
            if (timeParts.length !== 2) return false;
            const minutes = parseInt(timeParts[1], 10);
            return !isNaN(minutes) && minutes !== 0;
          });

          // Determine granularity
          let useMinute = false;
          let useHourly = false;

          if (granularity) {
            if (granularity === 'minute') {
              useMinute = true;
            } else if (granularity === 'hourly') {
              useHourly = true;
            }
          } else {
            useMinute = hasMinuteLevelData;
            useHourly = isHourly && !hasMinuteLevelData;
          }

          // Transform trends to dashboardData format
          const transformedData: dashboardData[] = trends.map(trend => {
            let locationData:
              | {
                  drop: number;
                  gross: number;
                  totalCancelledCredits?: number;
                }
              | undefined;

            if (trend[locationId]) {
              locationData = trend[locationId] as {
                drop: number;
                gross: number;
                totalCancelledCredits?: number;
              };
            } else {
              const locationKey = Object.keys(trend).find(
                key =>
                  key !== 'day' &&
                  key !== 'time' &&
                  String(key) === String(locationId)
              );
              if (locationKey) {
                locationData = trend[locationKey] as {
                  drop: number;
                  gross: number;
                  totalCancelledCredits?: number;
                };
              }
            }

            let time = trend.time || '';
            let xValue: string;

            if (useMinute) {
              time = trend.time || '';
              xValue = time;
            } else if (useHourly) {
              time = trend.time || '';
              xValue = time;
            } else {
              xValue = trend.day;
            }

            return {
              xValue,
              day: trend.day || '',
              time,
              moneyIn: locationData?.drop || 0,
              moneyOut: locationData?.totalCancelledCredits || 0,
              gross: locationData?.gross || 0,
            };
          });

          setChartData(transformedData);
          prevChartFetchKey.current = fetchKey;
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching chart data:', error);
        }
        setChartData([]);
      } finally {
        setLoadingChartData(false);
        chartRequestInProgress.current = false;
      }
    };

    fetchChartData();
  }, [
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    filtersInitialized,
    displayCurrency,
    chartGranularity,
    showGranularitySelector,
    activeView,
    makeChartRequest,
  ]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    chartData,
    loadingChartData,
    chartGranularity,
    setChartGranularity,
    showGranularitySelector,
  };
}
