import {
  dashboardData,
  locations,
  ActiveFilters,
  TopPerformingData,
  ActiveTab,
} from "@/lib/types";
import { CustomizedLabelProps } from "@/lib/types/componentProps";
import { RADIAN } from "@/lib/constants/uiConstants";
import { switchFilter } from "@/lib/utils/metrics";
import { fetchTopPerformingData } from "@/lib/helpers/topPerforming";
import getAllGamingLocations from "@/lib/helpers/locations";
import { TimePeriod } from "@/app/api/lib/types";

/**
 * Calculates pie chart label position data for rendering
 * @param props - Customized label properties
 * @returns Object with calculated position and styling data
 */
export const calculatePieChartLabelData = (props: CustomizedLabelProps) => {
  const radius =
    props.innerRadius + (props.outerRadius - props.innerRadius) * 0.7;
  const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
  const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);

  return {
    x,
    y,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontSize: props.percent < 0.1 ? "12px" : "14px",
    fontWeight: "bold" as const,
    fill: "white",
    text: `${(props.percent * 100).toFixed(0)}%`,
  };
};

/**
 * Fetches and sets gaming locations data
 */
export const loadGamingLocations = async (
  setGamingLocations: (locations: locations[]) => void
) => {
  const locationsData = await getAllGamingLocations();
  const validLocations = locationsData.filter(
    (loc) =>
      loc.geoCoords &&
      loc.geoCoords.latitude !== 0 &&
      loc.geoCoords.longitude !== 0
  );
  setGamingLocations(validLocations);
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
  if (selectedLicencee) {
    await switchFilter(
      activeMetricsFilter,
      setTotals,
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
      setTotals,
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
    await fetchMetricsData(
      activeMetricsFilter,
      customDateRange,
      selectedLicencee,
      setTotals,
      setChartData,
      setActiveFilters,
      setShowDatePicker
    );

    const topPerformingDataResult = await fetchTopPerformingData(
      activeTab,
      activePieChartFilter
    );
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
  { label: "Custom", value: "Custom" as TimePeriod },
];
