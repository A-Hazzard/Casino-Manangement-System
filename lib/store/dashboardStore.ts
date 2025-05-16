import { create } from "zustand";
import { DashBoardStore } from "@/lib/types/store";

// Define a no-op version for SSR
const dummyState: DashBoardStore = {
  initialLoading: true,
  loadingChartData: false,
  loadingTopPerforming: false,
  pieChartSortIsOpen: false,
  showDatePicker: false,
  activeTab: "Cabinets",
  activeFilters: {
    Today: true,
    Yesterday: false,
    last7days: false,
    last30days: false,
    Custom: false,
  },
  activeMetricsFilter: "Today",
  activePieChartFilter: "Today",
  totals: null,
  chartData: [],
  gamingLocations: [],
  selectedLicencee: "",
  customDateRange: { startDate: new Date(), endDate: new Date() },
  topPerformingData: [],
  setInitialLoading: () => {},
  setLoadingChartData: () => {},
  setLoadingTopPerforming: () => {},
  setPieChartSortIsOpen: () => {},
  setShowDatePicker: () => {},
  setActiveTab: () => {},
  setActiveFilters: () => {},
  setActiveMetricsFilter: () => {},
  setActivePieChartFilter: () => {},
  setTotals: () => {},
  setChartData: () => {},
  setGamingLocations: () => {},
  setSelectedLicencee: () => {},
  setCustomDateRange: () => {},
  setTopPerformingData: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<DashBoardStore>((set) => ({
    initialLoading: true,
    loadingChartData: false,
    loadingTopPerforming: false,
    pieChartSortIsOpen: false,
    showDatePicker: false,
    activeTab: "Cabinets",
    activeFilters: {
      Today: true,
      Yesterday: false,
      last7days: false,
      last30days: false,
      Custom: false,
    },
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
    setLoadingTopPerforming: (loadingTopPerforming) =>
      set({ loadingTopPerforming }),
    setPieChartSortIsOpen: (pieChartSortIsOpen) => set({ pieChartSortIsOpen }),
    setShowDatePicker: (showDatePicker) => set({ showDatePicker }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setActiveFilters: (activeFilters) => set({ activeFilters }),
    setActiveMetricsFilter: (activeMetricsFilter) =>
      set({ activeMetricsFilter }),
    setActivePieChartFilter: (activePieChartFilter) =>
      set({ activePieChartFilter }),
    setTotals: (totals) => set({ totals }),
    setChartData: (chartData) => set({ chartData }),
    setGamingLocations: (gamingLocations) => set({ gamingLocations }),
    setSelectedLicencee: (selectedLicencee) => set({ selectedLicencee }),
    setCustomDateRange: (customDateRange) => set({ customDateRange }),
    setTopPerformingData: (topPerformingData) => set({ topPerformingData }),
  }));
};

// Create the store conditionally
let storeInstance: ReturnType<typeof createStore> | null = null;

// Helper to ensure we use the same instance
const getClientStore = () => {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
};

/**
 * Zustand store for managing dashboard state and metrics.
 *
 * - Tracks loading, filters, chart data, locations, and top-performing data.
 * - Provides actions to update all dashboard-related state.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating dashboard state.
 */
// Use this store only on client side
export const useDashBoardStore =
  typeof window !== "undefined" ? getClientStore() : create(() => dummyState);
