import {
  ActiveFilters,
  ActiveTab,
  dashboardData,
  dateRange,
  locations,
  TopPerformingData,
  UserAuthPayload,
} from "@/lib/types/index";
import { TimePeriod } from "@/app/api/lib/types";

export type DashBoardStore = {
  initialLoading: boolean;
  setInitialLoading: (_state: boolean) => void;

  loadingChartData: boolean;
  setLoadingChartData: (_state: boolean) => void;

  loadingTopPerforming: boolean;
  setLoadingTopPerforming: (_state: boolean) => void;

  refreshing: boolean;
  setRefreshing: (_state: boolean) => void;

  pieChartSortIsOpen: boolean;
  setPieChartSortIsOpen: (_state: boolean) => void;

  showDatePicker: boolean;
  setShowDatePicker: (_state: boolean) => void;

  activeTab: ActiveTab;
  setActiveTab: (_state: ActiveTab) => void;

  activeFilters: ActiveFilters;
  setActiveFilters: (_state: ActiveFilters) => void;

  totals: dashboardData | null;
  setTotals: (_state: dashboardData | null) => void;

  chartData: dashboardData[];
  setChartData: (_state: dashboardData[]) => void;

  activeMetricsFilter: TimePeriod;
  setActiveMetricsFilter: (_state: TimePeriod) => void;

  activePieChartFilter: TimePeriod;
  setActivePieChartFilter: (_state: TimePeriod) => void;

  customDateRange: dateRange;
  setCustomDateRange: (_state: dateRange) => void;

  topPerformingData: TopPerformingData[];
  setTopPerformingData: (_state: TopPerformingData[]) => void;

  gamingLocations: locations[];
  setGamingLocations: (_state: locations[]) => void;

  selectedLicencee: string;
  setSelectedLicencee: (_state: string) => void;
};

export type UserStore = {
  user: UserAuthPayload | null;
  setUser: (_user: UserAuthPayload) => void;
  clearUser: () => void;
};
