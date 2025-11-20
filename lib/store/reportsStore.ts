import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ReportView,
  ReportConfig,
  ReportData,
  DashboardWidget,
  CustomerMetrics,
  VoucherMetrics,
  ComplianceMetrics,
  RealTimeMetrics,
  ScheduledReport,
  UserReportPreferences,
  ReportGenerationStatus,
  PerformanceComparison,
} from '@/lib/types/reports';

type ReportsState = {
  // Current view and navigation
  activeView: ReportView;
  isLoading: boolean;
  error: string | null;

  // User permissions and access control
  userPermissions: {
    roles: string[];
    permissions: string[];
    locationIds: string[];
  } | null;

  // Dashboard state
  dashboardWidgets: DashboardWidget[];
  realTimeMetrics: RealTimeMetrics | null;

  // Report configuration
  currentReportConfig: ReportConfig | null;
  reportData: ReportData | null;

  // Customer metrics
  customerMetrics: CustomerMetrics | null;

  // Voucher tracking
  voucherMetrics: VoucherMetrics | null;

  // Compliance data
  complianceMetrics: ComplianceMetrics | null;

  // Performance comparisons
  performanceComparisons: PerformanceComparison[];

  // Scheduling
  scheduledReports: ScheduledReport[];

  // User preferences
  userPreferences: UserReportPreferences | null;

  // Report generation
  generationStatus: ReportGenerationStatus | null;

  // Filters and selections
  selectedDateRange: {
    start: Date;
    end: Date;
  };
  selectedLocations: string[];
  selectedMachines: string[];

  // UI state
  sidebarCollapsed: boolean;
  fullscreenMode: boolean;
  refreshInterval: number | null;
  isMachineComparisonModalOpen: boolean;
};

type ReportsActions = {
  // Navigation actions
  setActiveView: (view: ReportView) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Dashboard actions
  updateDashboardWidgets: (widgets: DashboardWidget[]) => void;
  updateRealTimeMetrics: (metrics: RealTimeMetrics) => void;
  addDashboardWidget: (widget: DashboardWidget) => void;
  removeDashboardWidget: (widgetId: string) => void;
  reorderDashboardWidgets: (widgets: DashboardWidget[]) => void;

  // Report configuration actions
  setReportConfig: (config: ReportConfig) => void;
  updateReportConfig: (updates: Partial<ReportConfig>) => void;
  clearReportConfig: () => void;
  setReportData: (data: ReportData) => void;

  // Customer metrics actions
  updateCustomerMetrics: (metrics: CustomerMetrics) => void;

  // Voucher tracking actions
  updateVoucherMetrics: (metrics: VoucherMetrics) => void;

  // Compliance actions
  updateComplianceMetrics: (metrics: ComplianceMetrics) => void;

  // Performance comparison actions
  updatePerformanceComparisons: (comparisons: PerformanceComparison[]) => void;
  addPerformanceComparison: (comparison: PerformanceComparison) => void;

  // Scheduled reports actions
  updateScheduledReports: (reports: ScheduledReport[]) => void;
  addScheduledReport: (report: ScheduledReport) => void;
  updateScheduledReport: (
    id: string,
    updates: Partial<ScheduledReport>
  ) => void;
  deleteScheduledReport: (id: string) => void;

  // User preferences actions
  updateUserPreferences: (preferences: UserReportPreferences) => void;

  // Report generation actions
  updateGenerationStatus: (status: ReportGenerationStatus) => void;
  clearGenerationStatus: () => void;

  // Filter actions
  setDateRange: (start: Date, end: Date) => void;
  setSelectedLocations: (locations: string[]) => void;
  setSelectedMachines: (machines: string[]) => void;
  addSelectedLocation: (locationId: string) => void;
  removeSelectedLocation: (locationId: string) => void;
  addSelectedMachine: (machineId: string) => void;
  removeSelectedMachine: (machineId: string) => void;
  clearAllFilters: () => void;

  // UI actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleFullscreen: () => void;
  setRefreshInterval: (interval: number | null) => void;
  setIsMachineComparisonModalOpen: (open: boolean) => void;

  // Data refresh actions
  refreshAllData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshCustomerData: () => Promise<void>;
  refreshVoucherData: () => Promise<void>;
  refreshComplianceData: () => Promise<void>;
};

const initialState: ReportsState = {
  // Current view and navigation
  activeView: 'meters',
  isLoading: false,
  error: null,
  userPermissions: null,

  // Dashboard state
  dashboardWidgets: [],
  realTimeMetrics: null,

  // Report configuration
  currentReportConfig: null,
  reportData: null,

  // Customer metrics
  customerMetrics: null,

  // Voucher tracking
  voucherMetrics: null,

  // Compliance data
  complianceMetrics: null,

  // Performance comparisons
  performanceComparisons: [],

  // Scheduling
  scheduledReports: [],

  // User preferences
  userPreferences: null,

  // Report generation
  generationStatus: null,

  // Filters and selections
  selectedDateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  },
  selectedLocations: [],
  selectedMachines: [],

  // UI state
  sidebarCollapsed: false,
  fullscreenMode: false,
  refreshInterval: null,
  isMachineComparisonModalOpen: false,
};

export const useReportsStore = create<ReportsState & ReportsActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Navigation actions
      setActiveView: view => set({ activeView: view }),
      setLoading: loading => set({ isLoading: loading }),
      setError: error => set({ error }),

      // Dashboard actions
      updateDashboardWidgets: widgets => set({ dashboardWidgets: widgets }),
      updateRealTimeMetrics: metrics => set({ realTimeMetrics: metrics }),
      addDashboardWidget: widget =>
        set(state => ({
          dashboardWidgets: [...state.dashboardWidgets, widget],
        })),
      removeDashboardWidget: widgetId =>
        set(state => ({
          dashboardWidgets: state.dashboardWidgets.filter(
            w => w.id !== widgetId
          ),
        })),
      reorderDashboardWidgets: widgets => set({ dashboardWidgets: widgets }),

      // Report configuration actions
      setReportConfig: config => set({ currentReportConfig: config }),
      updateReportConfig: updates =>
        set(state => ({
          currentReportConfig: state.currentReportConfig
            ? { ...state.currentReportConfig, ...updates }
            : null,
        })),
      clearReportConfig: () =>
        set({ currentReportConfig: null, reportData: null }),
      setReportData: data => set({ reportData: data }),

      // Customer metrics actions
      updateCustomerMetrics: metrics => set({ customerMetrics: metrics }),

      // Voucher tracking actions
      updateVoucherMetrics: metrics => set({ voucherMetrics: metrics }),

      // Compliance actions
      updateComplianceMetrics: metrics => set({ complianceMetrics: metrics }),

      // Performance comparison actions
      updatePerformanceComparisons: comparisons =>
        set({ performanceComparisons: comparisons }),
      addPerformanceComparison: comparison =>
        set(state => ({
          performanceComparisons: [...state.performanceComparisons, comparison],
        })),

      // Scheduled reports actions
      updateScheduledReports: reports => set({ scheduledReports: reports }),
      addScheduledReport: report =>
        set(state => ({
          scheduledReports: [...state.scheduledReports, report],
        })),
      updateScheduledReport: (id, updates) =>
        set(state => ({
          scheduledReports: state.scheduledReports.map(r =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      deleteScheduledReport: id =>
        set(state => ({
          scheduledReports: state.scheduledReports.filter(r => r.id !== id),
        })),

      // User preferences actions
      updateUserPreferences: preferences =>
        set({ userPreferences: preferences }),

      // Report generation actions
      updateGenerationStatus: status => set({ generationStatus: status }),
      clearGenerationStatus: () => set({ generationStatus: null }),

      // Filter actions
      setDateRange: (start, end) => set({ selectedDateRange: { start, end } }),
      setSelectedLocations: locations => set({ selectedLocations: locations }),
      setSelectedMachines: machines => set({ selectedMachines: machines }),
      addSelectedLocation: locationId =>
        set(state => ({
          selectedLocations: state.selectedLocations.includes(locationId)
            ? state.selectedLocations
            : [...state.selectedLocations, locationId],
        })),
      removeSelectedLocation: locationId =>
        set(state => ({
          selectedLocations: state.selectedLocations.filter(
            id => id !== locationId
          ),
        })),
      addSelectedMachine: machineId =>
        set(state => ({
          selectedMachines: state.selectedMachines.includes(machineId)
            ? state.selectedMachines
            : [...state.selectedMachines, machineId],
        })),
      removeSelectedMachine: machineId =>
        set(state => ({
          selectedMachines: state.selectedMachines.filter(
            id => id !== machineId
          ),
        })),
      clearAllFilters: () =>
        set({
          selectedLocations: [],
          selectedMachines: [],
          selectedDateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date(),
          },
        }),

      // UI actions
      toggleSidebar: () =>
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      toggleFullscreen: () =>
        set(state => ({ fullscreenMode: !state.fullscreenMode })),
      setRefreshInterval: interval => set({ refreshInterval: interval }),
      setIsMachineComparisonModalOpen: open =>
        set({ isMachineComparisonModalOpen: open }),

      // Data refresh actions
      refreshAllData: async () => {
        const {
          refreshDashboard,
          refreshCustomerData,
          refreshVoucherData,
          refreshComplianceData,
        } = get();
        set({ isLoading: true, error: null });
        try {
          await Promise.all([
            refreshDashboard(),
            refreshCustomerData(),
            refreshVoucherData(),
            refreshComplianceData(),
          ]);
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to refresh data',
          });
        } finally {
          set({ isLoading: false });
        }
      },

      refreshDashboard: async () => {
        // Implementation would fetch dashboard data from API
      },

      refreshCustomerData: async () => {
        // Implementation would fetch customer data from API
      },

      refreshVoucherData: async () => {
        // Implementation would fetch voucher data from API
      },

      refreshComplianceData: async () => {
        // Implementation would fetch compliance data from API
      },
    }),
    {
      name: 'reports-store',
    }
  )
);
