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
} from '../index';

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

  loadingTotals: boolean;
  setLoadingTotals: (state: boolean) => void;

  loadingLocations: boolean;
  setLoadingLocations: (state: boolean) => void;

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

  chartData: dashboardData[] | null;
  setChartData: (state: dashboardData[] | null) => void;

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

  sortBy: 'totalDrop' | 'totalWin';
  setSortBy: (state: 'totalDrop' | 'totalWin') => void;

  displayCurrency: CurrencyCode;
  setDisplayCurrency: (state: CurrencyCode) => void;
  isAllLicencee: boolean;
  setIsAllLicencee: (state: boolean) => void;
  gameDayOffset: number;
  setGameDayOffset: (state: number) => void;
};


