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

    const response = await axios.get(`/api/locations?${params.toString()}`);
    const { locations: locationsData } = response.data;

    setGamingLocations(locationsData);

    return locationsData;
  } catch (error) {
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
  displayCurrency?: string
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

    // Add cache-busting parameter to ensure fresh data (especially for location admins)
    // This prevents stale cache from showing incorrect totals
    url += `&clearCache=true`;

    console.log('🔍 [fetchDashboardTotals] Calling API:', url);
    const response = await axios.get(url);
    const locationData = response.data;

    console.log('🔍 [fetchDashboardTotals] API Response:', {
      hasData: !!locationData.data,
      dataLength: locationData.data?.length || 0,
      responseKeys: Object.keys(locationData),
      firstFewLocations: (locationData.data || []).slice(0, 3).map((loc: { name?: string; locationName?: string; moneyIn?: number; _id?: string }) => ({
        name: loc.name || loc.locationName,
        _id: loc._id,
        moneyIn: loc.moneyIn
      })),
      fullResponse: locationData // Log full response for debugging
    });

    // Check if response has error
    if (locationData.error) {
      console.error('❌ [fetchDashboardTotals] API returned error:', locationData.error);
      setTotals(null);
      return;
    }

    // Verify data structure
    if (!Array.isArray(locationData.data)) {
      console.error('❌ [fetchDashboardTotals] API response.data is not an array:', {
        type: typeof locationData.data,
        value: locationData.data,
        responseKeys: Object.keys(locationData)
      });
      setTotals(null);
      return;
    }

    // Sum up totals from all locations (same logic as locations page)
    const totals = locationData.data.reduce(
      (acc: DashboardTotals, loc: { moneyIn?: number; moneyOut?: number; gross?: number }) => ({
        moneyIn: acc.moneyIn + (loc.moneyIn || 0),
        moneyOut: acc.moneyOut + (loc.moneyOut || 0),
        gross: acc.gross + (loc.gross || 0),
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    console.log('🔍 [fetchDashboardTotals] Calculated Totals:', {
      moneyIn: totals.moneyIn,
      moneyOut: totals.moneyOut,
      gross: totals.gross,
      locationCount: locationData.data.length,
      locationsWithData: locationData.data.filter((loc: { moneyIn?: number }) => (loc.moneyIn || 0) > 0).length
    });

    // Convert to DashboardTotals format
    setTotals(totals);
    console.log('🔍 [fetchDashboardTotals] setTotals called with:', totals);
  } catch (error) {
    const apiError = classifyError(error);
    showErrorNotification(apiError, 'Dashboard Totals');

    console.error('❌ [fetchDashboardTotals] Error fetching dashboard totals:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      response: (error as { response?: { data?: unknown; status?: number } })?.response?.data,
      status: (error as { response?: { status?: number } })?.response?.status
    });

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
  displayCurrency?: string
) => {
  // Fetch totals using the dedicated API
  await fetchDashboardTotals(
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    setTotals,
    displayCurrency
  );

  // Fetch chart data using the existing method
  if (selectedLicencee) {
    await switchFilter(
      activeMetricsFilter,
      () => {}, // Don't set totals here, we already did it above
      setChartData,
      activeMetricsFilter === 'Custom' ? customDateRange.startDate : undefined,
      activeMetricsFilter === 'Custom' ? customDateRange.endDate : undefined,
      selectedLicencee,
      setActiveFilters,
      setShowDatePicker,
      displayCurrency
    );
  } else {
    await switchFilter(
      activeMetricsFilter,
      () => {}, // Don't set totals here, we already did it above
      setChartData,
      activeMetricsFilter === 'Custom' ? customDateRange.startDate : undefined,
      activeMetricsFilter === 'Custom' ? customDateRange.endDate : undefined,
      undefined,
      setActiveFilters,
      setShowDatePicker,
      displayCurrency
    );
  }
};

/**
 * Fetches top performing data based on active tab and filter
 */
export const fetchTopPerformingDataHelper = async (
  activeTab: ActiveTab,
  activePieChartFilter: TimePeriod,
  setTopPerformingData: (data: TopPerformingData) => void,
  setLoadingTopPerforming: (loading: boolean) => void,
  selectedLicencee?: string
) => {
  // Only fetch data if there's a valid filter
  if (!activePieChartFilter) {
    setTopPerformingData([]);
    return;
  }

  try {
    setLoadingTopPerforming(true);
    const data = await fetchTopPerformingData(
      activeTab,
      activePieChartFilter,
      selectedLicencee
    );
    setTopPerformingData(data);
  } catch (error) {
    const apiError = classifyError(error);
    showErrorNotification(apiError, 'Top Performing Data');

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
      fetchTopPerformingData(activeTab, activePieChartFilter, selectedLicencee),
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
