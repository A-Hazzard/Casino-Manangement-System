/**
 * Reports Data Store (Analytics Data Store)
 * Zustand store for managing analytics and reporting data across the application.
 *
 * Features:
 * - Stores KPI metrics, performance trends, and top performing machines
 * - Manages location data, selections, and comparisons
 * - Tracks machine data, selections, and contribution analysis
 * - Handles logistics entries and filtering
 * - Manages chart data for dashboard, locations, and machines
 * - Tracks data refresh timestamps for cache invalidation
 * - Provides cache management and section-specific data clearing
 * - SSR-safe with dummy state for server rendering
 *
 * @returns Zustand hook for accessing and updating analytics data state.
 */
import { create } from 'zustand';
import {
  KpiMetric,
  CasinoLocation,
  GamingMachine,
  LogisticsEntry,
  ChartDataPoint,
} from '@/lib/types/reports';

// ============================================================================
// Types
// ============================================================================

type AnalyticsDataStore = {
  // Dashboard data
  kpiMetrics: KpiMetric[];
  setKpiMetrics: (metrics: KpiMetric[]) => void;

  performanceTrends: ChartDataPoint[];
  setPerformanceTrends: (trends: ChartDataPoint[]) => void;

  topPerformingMachines: Array<{
    machineId: string;
    machineName: string;
    locationName: string;
    metric: number;
    metricType: string;
  }>;
  setTopPerformingMachines: (
    machines: Array<{
      machineId: string;
      machineName: string;
      locationName: string;
      metric: number;
      metricType: string;
    }>
  ) => void;

  // Location data
  locations: CasinoLocation[];
  setLocations: (locations: CasinoLocation[]) => void;

  selectedLocations: CasinoLocation[];
  setSelectedLocations: (locations: CasinoLocation[]) => void;

  locationComparisons: CasinoLocation[];
  setLocationComparisons: (comparisons: CasinoLocation[]) => void;

  // Machine data
  machines: GamingMachine[];
  setMachines: (machines: GamingMachine[]) => void;

  selectedMachines: GamingMachine[];
  setSelectedMachines: (machines: GamingMachine[]) => void;

  machineComparisons: GamingMachine[];
  setMachineComparisons: (comparisons: GamingMachine[]) => void;

  machineContributionData: {
    locationId: string;
    locationName: string;
    totalMachines: number;
    contributionSummary: string;
  } | null;
  setMachineContributionData: (
    data: {
      locationId: string;
      locationName: string;
      totalMachines: number;
      contributionSummary: string;
    } | null
  ) => void;

  // Logistics data
  logisticsEntries: LogisticsEntry[];
  setLogisticsEntries: (entries: LogisticsEntry[]) => void;

  filteredLogisticsEntries: LogisticsEntry[];
  setFilteredLogisticsEntries: (entries: LogisticsEntry[]) => void;

  // Chart data
  chartData: {
    dashboard: ChartDataPoint[];
    locations: Record<string, ChartDataPoint[]>;
    machines: Record<string, ChartDataPoint[]>;
  };
  setChartData: (
    section: 'dashboard' | 'locations' | 'machines',
    data: ChartDataPoint[] | Record<string, ChartDataPoint[]>
  ) => void;

  // Data refresh timestamps
  lastUpdated: {
    dashboard: Date | null;
    locations: Date | null;
    machines: Date | null;
    logistics: Date | null;
  };
  setLastUpdated: (
    section: 'dashboard' | 'locations' | 'machines' | 'logistics'
  ) => void;

  // Cache management
  clearCache: () => void;
  clearSectionData: (
    section: 'dashboard' | 'locations' | 'machines' | 'logistics'
  ) => void;
};

// ============================================================================
// Store Creation
// ============================================================================

// Define a no-op version for SSR
const dummyState: AnalyticsDataStore = {
  kpiMetrics: [],
  setKpiMetrics: () => {},
  performanceTrends: [],
  setPerformanceTrends: () => {},
  topPerformingMachines: [],
  setTopPerformingMachines: () => {},
  locations: [],
  setLocations: () => {},
  selectedLocations: [],
  setSelectedLocations: () => {},
  locationComparisons: [],
  setLocationComparisons: () => {},
  machines: [],
  setMachines: () => {},
  selectedMachines: [],
  setSelectedMachines: () => {},
  machineComparisons: [],
  setMachineComparisons: () => {},
  machineContributionData: null,
  setMachineContributionData: () => {},
  logisticsEntries: [],
  setLogisticsEntries: () => {},
  filteredLogisticsEntries: [],
  setFilteredLogisticsEntries: () => {},
  chartData: {
    dashboard: [],
    locations: {},
    machines: {},
  },
  setChartData: () => {},
  lastUpdated: {
    dashboard: null,
    locations: null,
    machines: null,
    logistics: null,
  },
  setLastUpdated: () => {},
  clearCache: () => {},
  clearSectionData: () => {},
};

const createStore = () => {
  return create<AnalyticsDataStore>(set => ({
  // Dashboard data
  kpiMetrics: [],
  setKpiMetrics: metrics => set({ kpiMetrics: metrics }),

  performanceTrends: [],
  setPerformanceTrends: trends => set({ performanceTrends: trends }),

  topPerformingMachines: [],
  setTopPerformingMachines: machines =>
    set({ topPerformingMachines: machines }),

  // Location data
  locations: [],
  setLocations: locations => set({ locations }),

  selectedLocations: [],
  setSelectedLocations: locations => set({ selectedLocations: locations }),

  locationComparisons: [],
  setLocationComparisons: comparisons =>
    set({ locationComparisons: comparisons }),

  // Machine data
  machines: [],
  setMachines: machines => set({ machines }),

  selectedMachines: [],
  setSelectedMachines: machines => set({ selectedMachines: machines }),

  machineComparisons: [],
  setMachineComparisons: comparisons =>
    set({ machineComparisons: comparisons }),

  machineContributionData: null,
  setMachineContributionData: data => set({ machineContributionData: data }),

  // Logistics data
  logisticsEntries: [],
  setLogisticsEntries: entries => set({ logisticsEntries: entries }),

  filteredLogisticsEntries: [],
  setFilteredLogisticsEntries: entries =>
    set({ filteredLogisticsEntries: entries }),

  // Chart data
  chartData: {
    dashboard: [],
    locations: {},
    machines: {},
  },
  setChartData: (section, data) =>
    set(state => ({
      chartData: {
        ...state.chartData,
        [section]: data,
      },
    })),

  // Data refresh timestamps
  lastUpdated: {
    dashboard: null,
    locations: null,
    machines: null,
    logistics: null,
  },
  setLastUpdated: section =>
    set(state => ({
      lastUpdated: {
        ...state.lastUpdated,
        [section]: new Date(),
      },
    })),

  // Cache management
  clearCache: () =>
    set({
      kpiMetrics: [],
      performanceTrends: [],
      topPerformingMachines: [],
      locations: [],
      selectedLocations: [],
      locationComparisons: [],
      machines: [],
      selectedMachines: [],
      machineComparisons: [],
      machineContributionData: null,
      logisticsEntries: [],
      filteredLogisticsEntries: [],
      chartData: {
        dashboard: [],
        locations: {},
        machines: {},
      },
      lastUpdated: {
        dashboard: null,
        locations: null,
        machines: null,
        logistics: null,
      },
    }),

  clearSectionData: section =>
    set(state => {
      switch (section) {
        case 'dashboard':
          return {
            kpiMetrics: [],
            performanceTrends: [],
            topPerformingMachines: [],
            chartData: {
              ...state.chartData,
              dashboard: [],
            },
            lastUpdated: {
              ...state.lastUpdated,
              dashboard: null,
            },
          };
        case 'locations':
          return {
            selectedLocations: [],
            locationComparisons: [],
            chartData: {
              ...state.chartData,
              locations: {},
            },
            lastUpdated: {
              ...state.lastUpdated,
              locations: null,
            },
          };
        case 'machines':
          return {
            selectedMachines: [],
            machineComparisons: [],
            machineContributionData: null,
            chartData: {
              ...state.chartData,
              machines: {},
            },
            lastUpdated: {
              ...state.lastUpdated,
              machines: null,
            },
          };
        case 'logistics':
          return {
            logisticsEntries: [],
            filteredLogisticsEntries: [],
            lastUpdated: {
              ...state.lastUpdated,
              logistics: null,
            },
          };
        default:
          return state;
      }
    }),
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

// Use this store only on client side
export const useAnalyticsDataStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);
