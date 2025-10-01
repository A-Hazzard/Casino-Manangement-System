import {
  dashboardData,
  DashboardTotals,
  locations,
  ActiveFilters,
  TopPerformingData,
  ActiveTab,
} from "@/lib/types";
import { CustomizedLabelProps } from "@/lib/types/componentProps";
import { RADIAN } from "@/lib/constants/uiConstants";
import { fetchTopPerformingData } from "@/lib/helpers/topPerforming";
import getAllGamingLocations from "@/lib/helpers/locations";
import { TimePeriod } from "@/shared/types/common";
import { fetchMetricsData } from "@/lib/helpers/dashboard";

/**
 * Renders a customized label for pie chart visualization
 */
export const renderCustomizedLabel = (props: CustomizedLabelProps) => {
  const radius =
    props.innerRadius + (props.outerRadius - props.innerRadius) * 0.7;
  const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
  const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={props.percent < 0.1 ? "12px" : "14px"}
      fontWeight="bold"
    >
      {(props.percent * 100).toFixed(0)}%
    </text>
  );
};

/**
 * Fetches and sets gaming locations data
 */
export const loadGamingLocations = async (
  setGamingLocations: (locations: locations) => void
) => {
  const locationsData = await getAllGamingLocations();
  const validLocations = locationsData.filter(
    (loc) => {
      const locationWithGeoCoords = loc as typeof loc & { geoCoords?: { latitude?: number; longitude?: number; longtitude?: number } };
      return locationWithGeoCoords.geoCoords &&
        locationWithGeoCoords.geoCoords.latitude !== 0 &&
        locationWithGeoCoords.geoCoords.longitude !== 0;
    }
  );
  setGamingLocations(validLocations);
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
  setTotals: (totals: DashboardTotals | null) => void,
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
