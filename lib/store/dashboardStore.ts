import { DashBoardStore } from '@/lib/types/store';
import type { CurrencyCode } from '@/shared/types/currency';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define a no-op version for SSR
const dummyState: DashBoardStore = {
  initialLoading: true,
  loadingChartData: true,
  loadingTotals: true,
  loadingLocations: true,
  loadingTopPerforming: true,
  refreshing: false,
  pieChartSortIsOpen: false,
  showDatePicker: false,
  activeTab: 'Cabinets',
  activeFilters: {
    Today: true,
    Yesterday: false,
    last7days: false,
    last30days: false,
    Custom: false,
  },
  activeMetricsFilter: 'Today',
  activePieChartFilter: 'Today',
  totals: null,
  chartData: null,
  gamingLocations: [],
  selectedLicencee: '',
  sortBy: 'totalDrop',
  customDateRange: {
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setHours(23, 59, 59, 999)),
  },
  // Currency support
  displayCurrency: 'USD' as CurrencyCode,
  isAllLicensee: false,
  pendingCustomDateRange: undefined,
  topPerformingData: [],
  setInitialLoading: () => {},
  setLoadingChartData: () => {},
  setLoadingTotals: () => {},
  setLoadingLocations: () => {},
  setLoadingTopPerforming: () => {},
  setRefreshing: () => {},
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
  setSortBy: () => {},
  setCustomDateRange: () => {},
  setPendingCustomDateRange: () => {},
  setTopPerformingData: () => {},
  // Currency methods
  setDisplayCurrency: () => {},
  setIsAllLicensee: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<DashBoardStore>()(
    persist<DashBoardStore>(
      set => ({
        initialLoading: true,
        loadingChartData: true,
        loadingTotals: true,
        loadingLocations: true,
        loadingTopPerforming: true,
        refreshing: false,
        pieChartSortIsOpen: false,
        showDatePicker: false,
        activeTab: 'Cabinets',
        activeFilters: {
          Today: false,
          Yesterday: false,
          last7days: false,
          last30days: false,
          Custom: false,
        },
        activeMetricsFilter: 'Today',
        activePieChartFilter: 'Today',
        totals: null,
        chartData: null,
        gamingLocations: [],
  selectedLicencee: '',
  sortBy: 'totalDrop',
  customDateRange: {
          startDate: new Date(new Date().setHours(0, 0, 0, 0)),
          endDate: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        pendingCustomDateRange: undefined,
        topPerformingData: [],
        displayCurrency: 'USD' as CurrencyCode,
        isAllLicensee: false,

        setInitialLoading: initialLoading => set({ initialLoading }),
        setLoadingChartData: loadingChartData => set({ loadingChartData }),
        setLoadingTotals: loadingTotals => set({ loadingTotals }),
        setLoadingLocations: loadingLocations => set({ loadingLocations }),
        setLoadingTopPerforming: loadingTopPerforming =>
          set({ loadingTopPerforming }),
        setRefreshing: refreshing => set({ refreshing }),
        setPieChartSortIsOpen: pieChartSortIsOpen =>
          set({ pieChartSortIsOpen }),
        setShowDatePicker: showDatePicker => set({ showDatePicker }),
        setActiveTab: activeTab => set({ activeTab }),
        setActiveFilters: activeFilters => set({ activeFilters }),
        setActiveMetricsFilter: activeMetricsFilter =>
          set({ activeMetricsFilter }),
        setActivePieChartFilter: activePieChartFilter =>
          set({ activePieChartFilter }),
        setTotals: totals => set({ totals }),
        setChartData: chartData => set({ chartData }),
        setGamingLocations: gamingLocations => set({ gamingLocations }),
        setSelectedLicencee: selectedLicencee => {
          set({ selectedLicencee });
        },
        setSortBy: sortBy => set({ sortBy }),
        setCustomDateRange: customDateRange => set({ customDateRange }),
        setPendingCustomDateRange: pendingCustomDateRange =>
          set({ pendingCustomDateRange }),
        setTopPerformingData: topPerformingData => set({ topPerformingData }),
        // Currency methods
        setDisplayCurrency: displayCurrency => set({ displayCurrency }),
        setIsAllLicensee: isAllLicensee => set({ isAllLicensee }),
      }),
      {
        name: 'dashboard-store',
        partialize: state =>
          ({
            selectedLicencee: state.selectedLicencee,
            activeMetricsFilter: state.activeMetricsFilter,
            customDateRange: state.customDateRange,
          }) as unknown as DashBoardStore,
        // Merge persisted state while reviving customDateRange to Date instances
        merge: (persistedState: unknown, currentState: unknown) => {
          const persisted = (persistedState || {}) as Partial<DashBoardStore>;
          const cur = (currentState || {}) as DashBoardStore;
          const range = persisted.customDateRange as
            | { startDate?: Date | string; endDate?: Date | string }
            | undefined;
          let revivedRange: { startDate: Date; endDate: Date } | undefined;
          if (range?.startDate && range?.endDate) {
            const sd =
              range.startDate instanceof Date
                ? range.startDate
                : new Date(range.startDate);
            const ed =
              range.endDate instanceof Date
                ? range.endDate
                : new Date(range.endDate);
            revivedRange = { startDate: sd, endDate: ed };
          }
          return {
            ...cur,
            ...persisted,
            ...(revivedRange ? { customDateRange: revivedRange } : {}),
            // Force reset loading states and chartData to ensure consistent initial load
            initialLoading: true,
            loadingChartData: true,
            loadingTotals: true,
            loadingLocations: true,
            loadingTopPerforming: true,
            chartData: null,
            totals: null,
          } as DashBoardStore;
        },
      }
    )
  );
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
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);

