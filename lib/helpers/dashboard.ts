import {
  dashboardData,
  locations,
  ActiveFilters,
  TopPerformingData,
  ActiveTab,
} from "@/lib/types";

import { switchFilter } from "@/lib/utils/metrics";
import { fetchTopPerformingData } from "@/lib/helpers/topPerforming";
import getAllGamingLocations from "@/lib/helpers/locations";
import { TimePeriod } from "@/app/api/lib/types";
import axios from "axios";

/**
 * Calculates pie chart label position data for rendering
 * @param props - Customized label properties
 * @returns Object with calculated position and styling data
 */


/**
 * Fetches and sets gaming locations data
 */
export const loadGamingLocations = async (
  setGamingLocations: (locations: locations[]) => void,
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
    console.error("Error loading gaming locations:", error);
    // Fallback to original method
    const locationsData = await getAllGamingLocations(selectedLicencee);
    setGamingLocations(locationsData);
  }
};

/**
 * Fetches dashboard totals using the dedicated totals API
 */
export const fetchDashboardTotals = async (
  activeMetricsFilter: TimePeriod,
  customDateRange: { startDate: Date; endDate: Date },
  selectedLicencee: string | undefined,
  setTotals: (totals: dashboardData | null) => void
) => {
  try {
    let url = `/api/dashboard/totals?timePeriod=${activeMetricsFilter}`;
    
    if (activeMetricsFilter === "Custom" && customDateRange.startDate && customDateRange.endDate) {
      url += `&startDate=${customDateRange.startDate.toISOString()}&endDate=${customDateRange.endDate.toISOString()}`;
    }
    
    if (selectedLicencee && selectedLicencee !== "all") {
      url += `&licencee=${selectedLicencee}`;
    }

    const response = await axios.get(url);
    const totals = response.data;

    // Convert to dashboardData format
    setTotals({
      day: "",
      time: "",
      moneyIn: totals.moneyIn || 0,
      moneyOut: totals.moneyOut || 0,
      gross: totals.gross || 0,
    });
  } catch (error) {
    console.error("Error fetching dashboard totals:", error);
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
  setTotals: (totals: dashboardData | null) => void,
  setChartData: (data: dashboardData[]) => void,
  setActiveFilters: (filters: ActiveFilters) => void,
  setShowDatePicker: (show: boolean) => void
) => {
  // Fetch totals using the dedicated API
  await fetchDashboardTotals(
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    setTotals
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
    console.error("Error fetching top-performing data:", error);
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
  setTotals: (totals: dashboardData | null) => void,
  setChartData: (data: dashboardData[]) => void,
  setActiveFilters: (filters: ActiveFilters) => void,
  setShowDatePicker: (show: boolean) => void,
  setTopPerformingData: (data: TopPerformingData[]) => void
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
        setShowDatePicker
      ),
      fetchTopPerformingData(activeTab, activePieChartFilter),
      axios.get(`/api/locations?${locationsParams.toString()}`),
    ]);
    setTopPerformingData(topPerformingDataResult);
  } catch (error) {
    console.error("Error refreshing data:", error);
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
