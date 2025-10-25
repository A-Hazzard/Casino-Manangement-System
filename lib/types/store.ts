import {
  ActiveFilters,
  ActiveTab,
  dashboardData,
  DashboardTotals,
  dateRange,
  locations,
  TopPerformingData,
} from '@/lib/types/index';
import type { UserAuthPayload } from '@/shared/types/auth';
import { TimePeriod } from '@/shared/types/common';
import type { Firmware } from '@/shared/types/entities';
import type { CurrencyCode } from '@/shared/types/currency';

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

  totals: DashboardTotals | null;
  setTotals: (_state: DashboardTotals | null) => void;

  chartData: dashboardData[];
  setChartData: (_state: dashboardData[]) => void;

  activeMetricsFilter: TimePeriod | '';
  setActiveMetricsFilter: (_state: TimePeriod | '') => void;

  activePieChartFilter: TimePeriod | '';
  setActivePieChartFilter: (_state: TimePeriod | '') => void;

  customDateRange: dateRange;
  setCustomDateRange: (_state: dateRange) => void;

  pendingCustomDateRange?: dateRange;
  setPendingCustomDateRange: (_state?: dateRange) => void;

  topPerformingData: TopPerformingData;
  setTopPerformingData: (_state: TopPerformingData) => void;

  gamingLocations: locations;
  setGamingLocations: (_state: locations) => void;

  selectedLicencee: string;
  setSelectedLicencee: (_state: string) => void;

  // Currency support
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (_state: CurrencyCode) => void;
  isAllLicensee: boolean;
  setIsAllLicensee: (_state: boolean) => void;
};

export type UserStore = {
  user: UserAuthPayload | null;
  setUser: (_user: UserAuthPayload) => void;
  clearUser: () => void;
};

// Frontend-specific store types
export type FirmwareActionsState = {
  selectedFirmware: Firmware | null;
  isDeleteModalOpen: boolean;
  isDownloadModalOpen: boolean;
  openDeleteModal: (firmware: Firmware) => void;
  closeDeleteModal: () => void;
  openDownloadModal: (firmware: Firmware) => void;
  closeDownloadModal: () => void;
};
