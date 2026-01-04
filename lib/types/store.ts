/**
 * Store Types
 * Types for Zustand stores across the application.
 *
 * Includes types for:
 * - Dashboard store (filters, data, loading states, currency)
 * - User store (authentication payload, actions)
 * - Firmware actions store (modals and selected firmware)
 * Used by various Zustand store implementations for state management.
 */
import { TimePeriod } from '@/shared/types/common';
import type { CurrencyCode } from '@/shared/types/currency';
import type { Firmware } from '@/shared/types/entities';
import type {
  ActiveFilters,
  ActiveTab,
  dashboardData,
  DashboardTotals,
  dateRange,
  locations,
  TopPerformingData,
} from './index';

// Firmware actions state type
export type FirmwareActionsState = {
  selectedFirmware: Firmware | null;
  isDeleteModalOpen: boolean;
  isDownloadModalOpen: boolean;
  openDeleteModal: (firmware: Firmware) => void;
  closeDeleteModal: () => void;
  openDownloadModal: (firmware: Firmware) => void;
  closeDownloadModal: () => void;
};

export type DashBoardStore = {
  initialLoading: boolean;
  setInitialLoading: (state: boolean) => void;

  loadingChartData: boolean;
  setLoadingChartData: (state: boolean) => void;

  loadingTopPerforming: boolean;
  setLoadingTopPerforming: (state: boolean) => void;

  refreshing: boolean;
  setRefreshing: (state: boolean) => void;

  pieChartSortIsOpen: boolean;
  setPieChartSortIsOpen: (state: boolean) => void;

  showDatePicker: boolean;
  setShowDatePicker: (state: boolean) => void;

  activeTab: ActiveTab;
  setActiveTab: (state: ActiveTab) => void;

  activeFilters: ActiveFilters;
  setActiveFilters: (state: ActiveFilters) => void;

  totals: DashboardTotals | null;
  setTotals: (state: DashboardTotals | null) => void;

  chartData: dashboardData[];
  setChartData: (state: dashboardData[]) => void;

  activeMetricsFilter: TimePeriod | '';
  setActiveMetricsFilter: (state: TimePeriod | '') => void;

  activePieChartFilter: TimePeriod | '';
  setActivePieChartFilter: (state: TimePeriod | '') => void;

  customDateRange: dateRange;
  setCustomDateRange: (state: dateRange) => void;

  pendingCustomDateRange?: dateRange;
  setPendingCustomDateRange: (state?: dateRange) => void;

  topPerformingData: TopPerformingData;
  setTopPerformingData: (state: TopPerformingData) => void;

  gamingLocations: locations;
  setGamingLocations: (state: locations) => void;

  selectedLicencee: string;
  setSelectedLicencee: (state: string) => void;

  // Sorting for top performing data
  sortBy: 'totalDrop' | 'totalWin';
  setSortBy: (state: 'totalDrop' | 'totalWin') => void;

  // Currency support
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (state: CurrencyCode) => void;
  isAllLicensee: boolean;
  setIsAllLicensee: (state: boolean) => void;
};

