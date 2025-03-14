import { create } from "zustand";
import {
    ActiveFilters, ActiveTab, dashboardData, dateRange,
    TopPerformingData, locations
} from "@/lib/types";

type DashboardStore = {
    initialLoading: boolean;
    loadingChartData: boolean;
    loadingTopPerforming: boolean;
    pieChartSortIsOpen: boolean;
    showDatePicker: boolean;
    activeTab: ActiveTab;
    activeFilters: ActiveFilters;
    activeMetricsFilter: string;
    activePieChartFilter: string;
    totals: dashboardData | null;
    chartData: dashboardData[];
    gamingLocations: locations[];
    selectedLicencee: string;
    customDateRange: dateRange;
    topPerformingData: TopPerformingData[];

    setInitialLoading: (state: boolean) => void;
    setLoadingChartData: (state: boolean) => void;
    setLoadingTopPerforming: (state: boolean) => void;
    setPieChartSortIsOpen: (state: boolean) => void;
    setShowDatePicker: (state: boolean) => void;
    setActiveTab: (state: ActiveTab) => void;
    setActiveFilters: (state: ActiveFilters) => void;
    setActiveMetricsFilter: (state: string) => void;
    setActivePieChartFilter: (state: string) => void;
    setTotals: (state: dashboardData | null) => void;
    setChartData: (state: dashboardData[]) => void;
    setGamingLocations: (state: locations[]) => void;
    setSelectedLicencee: (state: string) => void;
    setCustomDateRange: (state: dateRange) => void;
    setTopPerformingData: (state: TopPerformingData[]) => void;
};

export const useDashBoardStore = create<DashboardStore>((set) => ({
    initialLoading: true,
    loadingChartData: false,
    loadingTopPerforming: false,
    pieChartSortIsOpen: false,
    showDatePicker: false,
    activeTab: "Cabinets",
    activeFilters: { Today: true, Yesterday: false, last7days: false, last30days: false, Custom: false },
    activeMetricsFilter: "Today",
    activePieChartFilter: "Today",
    totals: null,
    chartData: [],
    gamingLocations: [],
    selectedLicencee: "",
    customDateRange: { startDate: new Date(), endDate: new Date() },
    topPerformingData: [],

    setInitialLoading: (initialLoading) => set({ initialLoading }),
    setLoadingChartData: (loadingChartData) => set({ loadingChartData }),
    setLoadingTopPerforming: (loadingTopPerforming) => set({ loadingTopPerforming }),
    setPieChartSortIsOpen: (pieChartSortIsOpen) => set({ pieChartSortIsOpen }),
    setShowDatePicker: (showDatePicker) => set({ showDatePicker }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setActiveFilters: (activeFilters) => set({ activeFilters }),
    setActiveMetricsFilter: (activeMetricsFilter) => set({ activeMetricsFilter }),
    setActivePieChartFilter: (activePieChartFilter) => set({ activePieChartFilter }),
    setTotals: (totals) => set({ totals }),
    setChartData: (chartData) => set({ chartData }),
    setGamingLocations: (gamingLocations) => set({ gamingLocations }),
    setSelectedLicencee: (selectedLicencee) => set({ selectedLicencee }),
    setCustomDateRange: (customDateRange) => set({ customDateRange }),
    setTopPerformingData: (topPerformingData) => set({ topPerformingData }),
}));
