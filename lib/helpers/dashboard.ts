import {
  dashboardData,
  DashboardTotals,
  locations,
  ActiveFilters,
  TopPerformingData,
  ActiveTab,
} from "@/lib/types";

import { switchFilter } from "@/lib/utils/metrics";
import { fetchTopPerformingData } from "@/lib/helpers/topPerforming";
import getAllGamingLocations from "@/lib/helpers/locations";
import { TimePeriod } from "@/shared/types/common";
import axios from "axios";
import { classifyError } from "@/lib/utils/errorHandling";
import { showErrorNotification } from "@/lib/utils/errorNotifications";

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
  selectedLicencee?: string
) => {
  try {
    // Lightweight locations fetch (minimal projection, no heavy lookups)
    const params = new URLSearchParams();
    params.append("minimal", "1");
    if (selectedLicencee && selectedLicencee !== "all") {
      params.append("licencee", selectedLicencee);
    }

    const response = await axios.get(`/api/locations?${params.toString()}`);
    const { locations: locationsData } = response.data;

    setGamingLocations(locationsData);
  } catch (error) {
    const apiError = classifyError(error);
    showErrorNotification(apiError, "Gaming Locations");

    if (process.env.NODE_ENV === "development") {
      console.error("Error loading gaming locations:", error);
    }

    // Fallback to original method
    try {
      const locationsData = await getAllGamingLocations(selectedLicencee);
      setGamingLocations(locationsData);
    } catch (fallbackError) {
      const fallbackApiError = classifyError(fallbackError);
      showErrorNotification(fallbackApiError, "Gaming Locations Fallback");
    }
  }
};

/**
 * Fetches dashboard totals using the dedicated totals API
 */
export const fetchDashboardTotals = async (
  activeMetricsFilter: TimePeriod,
  customDateRange: { startDate: Date; endDate: Date },
  selectedLicencee: string | undefined,
  setTotals: (totals: DashboardTotals | null) => void,
  displayCurrency?: string
) => {
  try {
    let url = `/api/dashboard/totals?timePeriod=${activeMetricsFilter}`;

    if (
      activeMetricsFilter === "Custom" &&
      customDateRange.startDate &&
      customDateRange.endDate
    ) {
      url += `&startDate=${customDateRange.startDate.toISOString()}&endDate=${customDateRange.endDate.toISOString()}`;
    }

    if (selectedLicencee && selectedLicencee !== "all") {
      url += `&licencee=${selectedLicencee}`;
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    // Log the API call
    console.warn("=== FETCH DASHBOARD TOTALS DEBUG ===");
    console.warn("API URL:", url);
    console.warn("Parameters:", {
      activeMetricsFilter,
      selectedLicencee,
      displayCurrency,
      customDateRange,
    });

    const response = await axios.get(url);
    const totals = response.data;

    // Log the response
    console.warn("API Response:", {
      moneyIn: totals.moneyIn,
      moneyOut: totals.moneyOut,
      gross: totals.gross,
      currency: totals.currency,
      converted: totals.converted,
    });

    // Convert to DashboardTotals format
    setTotals({
      moneyIn: totals.moneyIn || 0,
      moneyOut: totals.moneyOut || 0,
      gross: totals.gross || 0,
    });
  } catch (error) {
    const apiError = classifyError(error);
    showErrorNotification(apiError, "Dashboard Totals");

    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching dashboard totals:", error);
    }

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
      activeMetricsFilter === "Custom" ? customDateRange.startDate : undefined,
      activeMetricsFilter === "Custom" ? customDateRange.endDate : undefined,
      selectedLicencee,
      setActiveFilters,
      setShowDatePicker
    );
  } else {
    await switchFilter(
      activeMetricsFilter,
      () => {}, // Don't set totals here, we already did it above
      setChartData,
      activeMetricsFilter === "Custom" ? customDateRange.startDate : undefined,
      activeMetricsFilter === "Custom" ? customDateRange.endDate : undefined,
      undefined,
      setActiveFilters,
      setShowDatePicker
    );
  }
};

/**
 * Fetches top performing data based on active tab and filter
 */
export const fetchTopPerformingDataHelper = async (
  activeTab: ActiveTab,
  activePieChartFilter: TimePeriod,
  setTopPerformingData: (data: TopPerformingData[]) => void,
  setLoadingTopPerforming: (loading: boolean) => void
) => {
  // Only fetch data if there's a valid filter
  if (!activePieChartFilter) {
    setTopPerformingData([]);
    return;
  }

  try {
    setLoadingTopPerforming(true);
    const data = await fetchTopPerformingData(activeTab, activePieChartFilter);
    setTopPerformingData(data);
  } catch (error) {
    const apiError = classifyError(error);
    showErrorNotification(apiError, "Top Performing Data");

    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching top-performing data:", error);
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
  setTopPerformingData: (data: TopPerformingData[]) => void,
  displayCurrency?: string
) => {
  setRefreshing(true);
  setLoadingChartData(true);
  setLoadingTopPerforming(true);

  try {
    // In refresh: also refetch gaming locations to ensure map data stays in sync
    const locationsParams = new URLSearchParams();
    locationsParams.append("minimal", "1");
    if (selectedLicencee && selectedLicencee !== "all") {
      locationsParams.append("licencee", selectedLicencee);
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
      fetchTopPerformingData(activeTab, activePieChartFilter),
      axios.get(`/api/locations?${locationsParams.toString()}`),
    ]);
    setTopPerformingData(topPerformingDataResult);
  } catch (error) {
    const apiError = classifyError(error);
    showErrorNotification(apiError, "Dashboard Refresh");

    if (process.env.NODE_ENV === "development") {
      console.error("Error refreshing data:", error);
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
  { label: "Today", value: "Today" as TimePeriod },
  { label: "Yesterday", value: "Yesterday" as TimePeriod },
  { label: "Last 7 days", value: "7d" as TimePeriod },
  { label: "30 days", value: "30d" as TimePeriod },
  { label: "All Time", value: "All Time" as TimePeriod },
  { label: "Custom", value: "Custom" as TimePeriod },
];
