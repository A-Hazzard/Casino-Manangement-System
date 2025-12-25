/**
 * Dashboard Helper Functions
 *
 * Provides helper functions for fetching and managing dashboard data, including
 * metrics, totals, top-performing locations/cabinets, and gaming locations.
 * It supports filtering by time period, licensee, currency conversion, and
 * includes comprehensive error handling and performance optimizations.
 *
 * Features:
 * - Fetches dashboard totals and metrics data
 * - Loads gaming locations with filtering
 * - Fetches top-performing data
 * - Handles currency conversion
 * - Error handling and notifications
 * - Request deduplication for performance
 * - Date range calculations
 */

import {
  ActiveFilters,
  ActiveTab,
  dashboardData,
  DashboardTotals,
  locations,
  TopPerformingData,
} from '@/lib/types';

import getAllGamingLocations from '@/lib/helpers/locations';
import { fetchTopPerformingData } from '@/lib/helpers/topPerforming';
import { classifyError } from '@/lib/utils/errorHandling';
import { showErrorNotification } from '@/lib/utils/errorNotifications';
import { switchFilter } from '@/lib/utils/metrics';
import { deduplicateRequest } from '@/lib/utils/requestDeduplication';
import { TimePeriod } from '@/shared/types/common';
import axios from 'axios';

/**
 * Calculates pie chart label position data for rendering
 * @param props - Customized label properties
 * @returns Object with calculated position and styling data
 */

/**
 * Fetches and sets gaming locations data
 */
export const loadGamingLocations = async (
  setGamingLocations: (locations: locations) => void,
  selectedLicencee?: string,
  options?: {
    forceAll?: boolean;
  }
) => {
  try {
    // Lightweight locations fetch (minimal projection, no heavy lookups)
    const params = new URLSearchParams();
    params.append('minimal', '1');
    if (selectedLicencee && selectedLicencee !== 'all') {
      params.append('licencee', selectedLicencee);
    }
    if (options?.forceAll) {
      params.append('forceAll', 'true');
      params.append('showAll', 'true');
    }

    const requestKey = `/api/locations?${params.toString()}`;
    // Use deduplication to prevent duplicate requests
    const responseData = await deduplicateRequest(requestKey, async signal => {
      const response = await axios.get(requestKey, { signal });
      return response.data;
    });

    const { locations: locationsData } = responseData;
    setGamingLocations(locationsData);

    return locationsData;
  } catch (error) {
    // Check if this is a cancellation error (expected behavior, don't log or show notification)
    const axios = (await import('axios')).default;
    const isCanceled =
      axios.isCancel(error) ||
      (error instanceof Error &&
        (error.name === 'CanceledError' ||
          error.name === 'AbortError' ||
          error.message === 'canceled' ||
          error.message === 'The user aborted a request.')) ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'));

    // Re-throw cancellation errors so useAbortableRequest can handle them silently
    if (isCanceled) {
      throw error;
    }

    const apiError = classifyError(error);
    showErrorNotification(apiError, 'Gaming Locations');

    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading gaming locations:', error);
    }

    // Fallback to original method
    try {
      const fallbackLicencee =
        options?.forceAll && (!selectedLicencee || selectedLicencee === 'all')
          ? undefined
          : selectedLicencee;
      const locationsData = await getAllGamingLocations(fallbackLicencee);
      setGamingLocations(locationsData);
      return locationsData;
    } catch (fallbackError) {
      // Check if fallback error is also a cancellation
      const isFallbackCanceled =
        axios.isCancel(fallbackError) ||
        (fallbackError instanceof Error &&
          (fallbackError.name === 'CanceledError' ||
            fallbackError.name === 'AbortError' ||
            fallbackError.message === 'canceled' ||
            fallbackError.message === 'The user aborted a request.')) ||
        (fallbackError &&
          typeof fallbackError === 'object' &&
          'code' in fallbackError &&
          (fallbackError.code === 'ERR_CANCELED' ||
            fallbackError.code === 'ECONNABORTED'));

      if (isFallbackCanceled) {
        throw fallbackError;
      }

      const fallbackApiError = classifyError(fallbackError);
      showErrorNotification(fallbackApiError, 'Gaming Locations Fallback');
    }
  }
  return [];
};

/**
 * Fetches dashboard totals using the location aggregation API (same as locations page)
 * This ensures consistency between dashboard and locations page totals
 */
export const fetchDashboardTotals = async (
  activeMetricsFilter: TimePeriod,
  customDateRange: { startDate: Date; endDate: Date },
  selectedLicencee: string | undefined,
  setTotals: (totals: DashboardTotals | null) => void,
  displayCurrency?: string,
  signal?: AbortSignal,
  machineTypeFilter?: string | null,
  validateFilters?: () => boolean
) => {
  try {
    let url = `/api/locationAggregation?timePeriod=${activeMetricsFilter}`;

    if (
      activeMetricsFilter === 'Custom' &&
      customDateRange.startDate &&
      customDateRange.endDate
    ) {
      // Extract just the date part (YYYY-MM-DD)
      const fromDate = customDateRange.startDate.toISOString().split('T')[0];
      const toDate = customDateRange.endDate.toISOString().split('T')[0];
      url += `&startDate=${fromDate}&endDate=${toDate}`;
    }

    if (selectedLicencee && selectedLicencee !== 'all') {
      url += `&licencee=${selectedLicencee}`;
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    if (machineTypeFilter) {
      url += `&machineTypeFilter=${encodeURIComponent(machineTypeFilter)}`;
    }

    // Explicitly request a very high limit to ensure we get ALL filtered locations
    // This is critical for accurate totals calculation - we need all locations, not just first page
    // Note: limit and page are removed from deduplication key, so this won't prevent deduplication
    url += `&limit=1000000&page=1`;

    // Note: clearCache parameter removed - deduplication utility now handles this
    // The deduplication utility will normalize the request key and prevent duplicate calls

    console.log('🔍 [fetchDashboardTotals] Calling API:', url);
    // Use deduplication to prevent duplicate requests
    const locationData = await deduplicateRequest(url, async abortSignal => {
      const response = await axios.get(url, { signal: abortSignal || signal });
      return response.data;
    });

    console.log('🔍 [fetchDashboardTotals] API Response:', {
      hasData: !!locationData.data,
      dataLength: locationData.data?.length || 0,
      totalCount: locationData.totalCount || 0,
      page: locationData.page || 1,
      limit: locationData.limit || 0,
      responseKeys: Object.keys(locationData),
      firstFewLocations: (locationData.data || [])
        .slice(0, 3)
        .map(
          (loc: {
            name?: string;
            locationName?: string;
            moneyIn?: number;
            _id?: string;
          }) => ({
            name: loc.name || loc.locationName,
            _id: loc._id,
            moneyIn: loc.moneyIn,
          })
        ),
    });

    // Verify we got all locations - if dataLength < totalCount, we're missing data
    if (
      locationData.totalCount &&
      locationData.data?.length < locationData.totalCount
    ) {
      console.warn(
        '⚠️ [fetchDashboardTotals] WARNING: Not all locations received!',
        {
          received: locationData.data?.length || 0,
          total: locationData.totalCount,
          missing: locationData.totalCount - (locationData.data?.length || 0),
          page: locationData.page,
          limit: locationData.limit,
        }
      );
    }

    // Check if response has error
    if (locationData.error) {
      console.error(
        '❌ [fetchDashboardTotals] API returned error:',
        locationData.error
      );
      setTotals(null);
      return;
    }

    // Verify data structure
    if (!Array.isArray(locationData.data)) {
      console.error(
        '❌ [fetchDashboardTotals] API response.data is not an array:',
        {
          type: typeof locationData.data,
          value: locationData.data,
          responseKeys: Object.keys(locationData),
        }
      );
      setTotals(null);
      return;
    }

    // Sum up totals from all locations (same logic as locations page)
    const totals = locationData.data.reduce(
      (
        acc: DashboardTotals,
        loc: { moneyIn?: number; moneyOut?: number; gross?: number }
      ) => ({
        moneyIn: acc.moneyIn + (loc.moneyIn || 0),
        moneyOut: acc.moneyOut + (loc.moneyOut || 0),
        gross: acc.gross + (loc.gross || 0),
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    // Log sample of actual location data to verify values
    const sampleLocations = (locationData.data || [])
      .slice(0, 5)
      .map(
        (loc: {
          name?: string;
          moneyIn?: number;
          moneyOut?: number;
          gross?: number;
        }) => ({
          name: loc.name,
          moneyIn: loc.moneyIn,
          moneyOut: loc.moneyOut,
          gross: loc.gross,
        })
      );

    console.log('🔍 [fetchDashboardTotals] Calculated Totals:', {
      moneyIn: totals.moneyIn,
      moneyOut: totals.moneyOut,
      gross: totals.gross,
      locationCount: locationData.data.length,
      totalCount: locationData.totalCount,
      locationsWithData: locationData.data.filter(
        (loc: { moneyIn?: number }) => (loc.moneyIn || 0) > 0
      ).length,
      sampleLocations,
      sumOfSampleMoneyIn: sampleLocations.reduce(
        (sum: number, loc: { moneyIn?: number }) => sum + (loc.moneyIn || 0),
        0
      ),
    });

    // Validate filters haven't changed before updating totals
    // This prevents stale data from updating state when filters change rapidly
    if (validateFilters && !validateFilters()) {
      console.log(
        '🔍 [fetchDashboardTotals] Filters changed during request - ignoring stale totals',
        {
          totals,
          machineTypeFilter,
        }
      );
      return;
    }

    // Convert to DashboardTotals format
    setTotals(totals);
    console.log('🔍 [fetchDashboardTotals] setTotals called with:', totals);
  } catch (error) {
    // Silently handle aborted requests - this is expected behavior
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'CanceledError')
    ) {
      console.log(
        '🔍 [fetchDashboardTotals] Request aborted (filter/page change)'
      );
      return;
    }

    const apiError = classifyError(error);
    showErrorNotification(apiError, 'Dashboard Totals');

    console.error(
      '❌ [fetchDashboardTotals] Error fetching dashboard totals:',
      {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: (error as { response?: { data?: unknown; status?: number } })
          ?.response?.data,
        status: (error as { response?: { status?: number } })?.response?.status,
      }
    );

    setTotals(null);
  }
};

/**
 * Fetches metrics data based on active filter and licensee
 */
export const fetchMetricsData = async (
  activeMetricsFilter: TimePeriod,
  customDateRange: { startDate: Date; endDate: Date },
  selectedLicencee: string | undefined,
  setTotals: (totals: DashboardTotals | null) => void,
  setChartData: (data: dashboardData[]) => void,
  setActiveFilters: (filters: ActiveFilters) => void,
  setShowDatePicker: (show: boolean) => void,
  displayCurrency?: string,
  signal?: AbortSignal,
  granularity?: 'hourly' | 'minute'
) => {
  // Fetch both totals and chart data in parallel to ensure they complete together
  // This prevents the skeleton from disappearing when totals is set but chartData is still loading
  await Promise.all([
    fetchDashboardTotals(
      activeMetricsFilter,
      customDateRange,
      selectedLicencee,
      setTotals,
      displayCurrency,
      signal
    ),
    selectedLicencee
      ? switchFilter(
          activeMetricsFilter,
          () => {}, // Don't set totals here, we already did it above
          setChartData,
          activeMetricsFilter === 'Custom'
            ? customDateRange.startDate
            : undefined,
          activeMetricsFilter === 'Custom'
            ? customDateRange.endDate
            : undefined,
          selectedLicencee,
          setActiveFilters,
          setShowDatePicker,
          displayCurrency,
          signal,
          granularity
        )
      : switchFilter(
          activeMetricsFilter,
          () => {}, // Don't set totals here, we already did it above
          setChartData,
          activeMetricsFilter === 'Custom'
            ? customDateRange.startDate
            : undefined,
          activeMetricsFilter === 'Custom'
            ? customDateRange.endDate
            : undefined,
          undefined,
          setActiveFilters,
          setShowDatePicker,
          displayCurrency,
          signal,
          granularity
        ),
  ]);
};

/**
 * Fetches top performing data based on active tab and filter
 */
export const fetchTopPerformingDataHelper = async (
  activeTab: ActiveTab,
  activePieChartFilter: TimePeriod,
  setTopPerformingData: (data: TopPerformingData) => void,
  setLoadingTopPerforming: (loading: boolean) => void,
  selectedLicencee?: string,
  currency?: string,
  signal?: AbortSignal,
  customDateRange?: { startDate: Date; endDate: Date }
) => {
  // Only fetch data if there's a valid filter
  if (!activePieChartFilter) {
    setTopPerformingData([]);
    return;
  }

  try {
    setLoadingTopPerforming(true);
    // Clear existing data to prevent stale data display during loading or on error
    // This fixes the bug where switching tabs might show previous tab's data if fetch fails
    // setTopPerformingData([]); // Optional: enable this if we want to clear immediately, but keeping old data might be better UX if we handle error correctly.
    // Actually, for the tab switching bug, user sees stale data.
    // If we are switching tabs, we should probably clear or ensure the new data replaces it.

    const data = await fetchTopPerformingData(
      activeTab,
      activePieChartFilter,
      selectedLicencee,
      currency,
      signal,
      activePieChartFilter === 'Custom'
        ? customDateRange?.startDate
        : undefined,
      activePieChartFilter === 'Custom' ? customDateRange?.endDate : undefined
    );
    setTopPerformingData(data);
  } catch (error) {
    // Check if this is a cancelled request - don't treat as error
    const axios = (await import('axios')).default;
    if (axios.isCancel && axios.isCancel(error)) {
      // Request was cancelled, silently return
      return;
    }

    // Check for standard abort errors
    if (
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof Error && error.message === 'canceled') ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'))
    ) {
      // Request was cancelled, silently return
      return;
    }

    // Only show error notification for actual errors
    const apiError = classifyError(error);
    showErrorNotification(apiError, 'Top Performing Data');

    // On error, clear the data so we don't show stale/misleading info
    // This is crucial for fixing the "Cabinets tab showing Location modal" bug
    setTopPerformingData([]);

    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching top-performing data:', error);
    }
  } finally {
    setLoadingTopPerforming(false);
  }
};

/**
 * Handles the complete refresh functionality for dashboard
 */
export const handleDashboardRefresh = async (
  activeMetricsFilter: TimePeriod,
  customDateRange: { startDate: Date; endDate: Date },
  selectedLicencee: string | undefined,
  activeTab: ActiveTab,
  activePieChartFilter: TimePeriod,
  setRefreshing: (refreshing: boolean) => void,
  setLoadingChartData: (loading: boolean) => void,
  setLoadingTopPerforming: (loading: boolean) => void,
  setTotals: (totals: DashboardTotals | null) => void,
  setChartData: (data: dashboardData[]) => void,
  setActiveFilters: (filters: ActiveFilters) => void,
  setShowDatePicker: (show: boolean) => void,
  setTopPerformingData: (data: TopPerformingData) => void,
  displayCurrency?: string
) => {
  setRefreshing(true);
  setLoadingChartData(true);
  setLoadingTopPerforming(true);

  try {
    // In refresh: also refetch gaming locations to ensure map data stays in sync
    const locationsParams = new URLSearchParams();
    locationsParams.append('minimal', '1');
    if (selectedLicencee && selectedLicencee !== 'all') {
      locationsParams.append('licencee', selectedLicencee);
    }

    // Parallelize metrics + top-performing + a lightweight locations ping to warm caches
    const [, topPerformingDataResult] = await Promise.all([
      fetchMetricsData(
        activeMetricsFilter,
        customDateRange,
        selectedLicencee,
        setTotals,
        setChartData,
        setActiveFilters,
        setShowDatePicker,
        displayCurrency
      ),
      fetchTopPerformingData(
        activeTab,
        activePieChartFilter,
        selectedLicencee,
        displayCurrency,
        undefined,
        activePieChartFilter === 'Custom'
          ? customDateRange?.startDate
          : undefined,
        activePieChartFilter === 'Custom' ? customDateRange?.endDate : undefined
      ),
      axios.get(`/api/locations?${locationsParams.toString()}`),
    ]);
    setTopPerformingData(topPerformingDataResult);
  } catch (error) {
    const apiError = classifyError(error);
    showErrorNotification(apiError, 'Dashboard Refresh');

    if (process.env.NODE_ENV === 'development') {
      console.error('Error refreshing data:', error);
    }
  } finally {
    setRefreshing(false);
    setLoadingChartData(false);
    setLoadingTopPerforming(false);
  }
};

/**
 * Creates time filter buttons configuration
 */
export const getTimeFilterButtons = () => [
  { label: 'Today', value: 'Today' as TimePeriod },
  { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
  { label: 'Last 7 days', value: '7d' as TimePeriod },
  { label: '30 days', value: '30d' as TimePeriod },
  { label: 'Custom', value: 'Custom' as TimePeriod },
];
