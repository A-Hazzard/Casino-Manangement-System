import {
    ActiveFilters,
    ActiveTab,
    dashboardData,
    dateRange,
    locations,
    TopPerformingData, UserAuthPayload,
} from "@/lib/types/index";
import { TimePeriod } from "@/app/api/lib/types";

export type DashBoardStore = {
    initialLoading: boolean;
    setInitialLoading: (state: boolean) => void;

    loadingChartData: boolean;
    setLoadingChartData: (state: boolean) => void;

    loadingTopPerforming: boolean;
    setLoadingTopPerforming: (state: boolean) => void;

    pieChartSortIsOpen: boolean;
    setPieChartSortIsOpen: (state: boolean) => void;

    showDatePicker: boolean;
    setShowDatePicker: (state: boolean) => void;

    activeTab: ActiveTab;
    setActiveTab: (state: ActiveTab) => void;

    activeFilters: ActiveFilters;
    setActiveFilters: (state: ActiveFilters) => void;

    totals: dashboardData | null;
    setTotals: (state: dashboardData | null) => void;

    chartData: dashboardData[];
    setChartData: (state: dashboardData[]) => void;

    activeMetricsFilter: TimePeriod;
    setActiveMetricsFilter: (state: TimePeriod) => void;

    activePieChartFilter: TimePeriod;
    setActivePieChartFilter: (state: TimePeriod) => void;

    customDateRange: dateRange;
    setCustomDateRange: (state: dateRange) => void;

    topPerformingData: TopPerformingData[];
    setTopPerformingData: (state: TopPerformingData[]) => void;

    gamingLocations: locations[];
    setGamingLocations: (state: locations[]) => void;

    selectedLicencee: string;
    setSelectedLicencee: (state: string) => void;
};

export type UserStore = {
    user: UserAuthPayload | null;
    setUser: (user: UserAuthPayload) => void;
    clearUser: () => void;
}