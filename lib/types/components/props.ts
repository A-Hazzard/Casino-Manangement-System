import { ReactNode, RefObject } from 'react';
import { dashboardData, DashboardTotals } from '@/lib/types';
import type { CollectorSchedule } from '@/lib/types/components';
import { TimePeriod } from '@/shared/types';
import type { DateRange as RDPDateRange } from 'react-day-picker';
import type { CollectionReportLocationWithMachines } from '../api';
import type { LocationSelectItem } from '../location';

export type ChartProps = {
  loadingChartData: boolean;
  chartData: dashboardData[] | null;
  activeMetricsFilter: TimePeriod | '';
  totals?: DashboardTotals | null;
  granularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
  useNetGross?: boolean;
};

export type CustomizedLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
};

export type DateFiltersProps = {
  disabled?: boolean;
  onCustomRangeGo?: () => void;
  customRangeGoLabel?: string;
  hideAllTime: boolean;
  showQuarterly?: boolean;
  mode?: 'auto' | 'mobile' | 'desktop';
  enableTimeInputs?: boolean;
};

export type HeaderProps = {
  selectedLicencee?: string;
  pageTitle?: string;
  setSelectedLicencee?: (state: string) => void;
  hideOptions?: boolean;
  hideLicenceeFilter?: boolean;
  containerPaddingMobile?: string;
  disabled?: boolean;
  hideCurrencyFilter?: boolean;
};

export type CollectorTooltipData = {
  firstName?: string;
  lastName?: string;
  id?: string;
  email?: string;
};

export type CollectionReportRow = {
  _id: string;
  locationReportId: string;
  collector: string;
  collectorFullName?: string;
  collectorFullNameTooltip?: string;
  collectorTooltipData?: CollectorTooltipData;
  collectorUserNotFound?: boolean;
  location: string;
  gross: number | string;
  machines: string;
  collected: number | string;
  uncollected: string;
  variation: number | string;
  balance: number | string;
  locationRevenue: number | string;
  time: string;
  noSMIBLocation?: boolean;
  isLocalServer?: boolean;
};

export type SchedulerTableRow = {
  id: string;
  collector: string;
  location: string;
  creator: string;
  visitTime: string;
  createdAt: string;
  status: string;
  rawStartTime: string;
  rawEndTime: string;
  collectorName: string;
  locationName: string;
};

export type MonthlyReportSummary = {
  drop: string;
  cancelledCredits: string;
  gross: string;
  sasGross: string;
};

export type MonthlyReportDetailsRow = {
  gross: string;
  sasGross: string;
  [key: string]: string;
};

export type CollectionReportNewCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  locations: CollectionReportLocationWithMachines[];
  onRefresh?: () => void;
  onRefreshLocations?: () => void;
  onSuccess?: () => void;
};

export type CollectionReportEditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh?: () => void;
};

export type CollectionReportTableProps = {
  data: CollectionReportRow[];
  loading?: boolean;
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  sortField?: keyof CollectionReportRow;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof CollectionReportRow) => void;
  editableReportIds?: Set<string>;
  selectedLicencee?: string | null;
};

export type CollectionReportCardsProps = {
  data: CollectionReportRow[];
  gridLayout?: boolean;
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  editableReportIds?: Set<string>;
  loading?: boolean;
  onRefresh?: () => void;
  selectedLicencee?: string | null;
};

export type CollectionReportDesktopUIProps = {
  loading: boolean;
  filteredReports: CollectionReportRow[];
  desktopTableRef: RefObject<HTMLDivElement | null>;
  locations: LocationSelectItem[];
  selectedLocation: string | string[];
  onLocationChange: (value: string | string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (checked: boolean) => void;
  selectedFilters: string[];
  onFilterChange: (filter: string, checked: boolean) => void;
  onClearFilters: () => void;
  isSearching: boolean;
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  sortField?: keyof CollectionReportRow;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof CollectionReportRow) => void;
  selectedLicencee?: string;
  editableReportIds?: Set<string>;
};

export type CollectionReportMobileUIProps = {
  loading: boolean;
  filteredReports: CollectionReportRow[];
  mobileCardsRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  locations: LocationSelectItem[];
  selectedLocation: string | string[];
  onLocationChange: (value: string | string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (checked: boolean) => void;
  selectedFilters: string[];
  onFilterChange: (filter: string, checked: boolean) => void;
  onClearFilters: () => void;
  isSearching: boolean;
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  selectedLicencee?: string;
  editableReportIds?: Set<string>;
};

export type CollectionReportMonthlyDesktopUIProps = {
  locations: Array<{ id: string; name: string }>;
  monthlyLocation: string | string[];
  onMonthlyLocationChange: (value: string | string[]) => void;
  pendingRange?: RDPDateRange;
  onPendingRangeChange: (range?: RDPDateRange) => void;
  onApplyDateRange: () => void;
  onSetLastMonth: () => void;
  monthlySummary: MonthlyReportSummary;
  monthlyDetails: MonthlyReportDetailsRow[];
  monthlyCurrentItems: MonthlyReportDetailsRow[];
  monthlyLoading: boolean;
  monthlyTotalPages: number;
  monthlyPage: number;
  onPaginateMonthly: (page: number) => void;
  monthlyPaginationRef: RefObject<HTMLDivElement | null>;
  monthlyFirstItemIndex: number;
  monthlyLastItemIndex: number;
  sortField: keyof MonthlyReportDetailsRow;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: keyof MonthlyReportDetailsRow) => void;
};

export type MonthlyDesktopUIProps = CollectionReportMonthlyDesktopUIProps;

export type CollectionReportMonthlyMobileUIProps = {
  locations: Array<{ id: string; name: string }>;
  monthlyLocation: string | string[];
  onMonthlyLocationChange: (value: string | string[]) => void;
  pendingRange?: RDPDateRange;
  onPendingRangeChange: (range?: RDPDateRange) => void;
  onApplyDateRange: () => void;
  onSetLastMonth: () => void;
  monthlySummary: MonthlyReportSummary;
  monthlyDetails: MonthlyReportDetailsRow[];
  monthlyCurrentItems: MonthlyReportDetailsRow[];
  monthlyLoading: boolean;
  monthlyTotalPages: number;
  monthlyPage: number;
  onPaginateMonthly: (page: number) => void;
  monthlyFirstItemIndex: number;
  monthlyLastItemIndex: number;
};

export type MonthlyMobileUIProps = CollectionReportMonthlyMobileUIProps;

export type CollectionReportMonthlyDetailsTableProps = {
  details: MonthlyReportDetailsRow[];
  loading: boolean;
  sortField?: keyof MonthlyReportDetailsRow;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof MonthlyReportDetailsRow) => void;
};

export type CollectionReportMonthlySummaryTableProps = {
  summary: MonthlyReportSummary;
  loading: boolean;
};

export type CollectionReportManagerDesktopUIProps = {
  locations: LocationSelectItem[];
  collectors: string[];
  selectedSchedulerLocation: string;
  onSchedulerLocationChange: (value: string) => void;
  selectedCollector: string;
  onCollectorChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onResetSchedulerFilters: () => void;
  paginatedSchedulers: SchedulerTableRow[];
  loadingSchedulers: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onEdit?: (row: SchedulerTableRow) => void;
  onDelete?: (row: SchedulerTableRow) => void;
  showActions?: boolean;
};

export type CollectionReportManagerMobileUIProps = {
  locations: LocationSelectItem[];
  collectors: string[];
  selectedSchedulerLocation: string;
  onSchedulerLocationChange: (value: string) => void;
  selectedCollector: string;
  onCollectorChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onResetSchedulerFilters: () => void;
  paginatedSchedulers: SchedulerTableRow[];
  loadingSchedulers: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onEdit?: (row: SchedulerTableRow) => void;
  onDelete?: (row: SchedulerTableRow) => void;
  showActions?: boolean;
};

export type CollectionReportManagerScheduleTableProps = {
  data: SchedulerTableRow[];
  loading: boolean;
  onEdit?: (row: SchedulerTableRow) => void;
  onDelete?: (row: SchedulerTableRow) => void;
  showActions?: boolean;
};

export type CollectionReportManagerScheduleCardsProps = {
  data: SchedulerTableRow[];
  loading: boolean;
  onEdit?: (row: SchedulerTableRow) => void;
  onDelete?: (row: SchedulerTableRow) => void;
  showActions?: boolean;
};

export type CollectionReportManagerScheduleFiltersProps = {
  locations: LocationSelectItem[];
  collectors: string[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  selectedCollector: string;
  onCollectorChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onReset: () => void;
  loading: boolean;
};

export type CollectionReportCollectorDesktopUIProps = {
  locations: LocationSelectItem[];
  collectors: string[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  selectedCollector: string;
  onCollectorChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onResetFilters: () => void;
  collectorSchedules: CollectorSchedule[];
  paginatedSchedules: CollectorSchedule[];
  loadingCollectorSchedules: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onEdit?: (schedule: CollectorSchedule) => void;
  onDelete?: (schedule: CollectorSchedule) => void;
  showActions?: boolean;
};

export type CollectionReportCollectorMobileUIProps = {
  locations: LocationSelectItem[];
  collectors: string[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  selectedCollector: string;
  onCollectorChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onResetFilters: () => void;
  collectorSchedules: CollectorSchedule[];
  paginatedSchedules: CollectorSchedule[];
  loadingCollectorSchedules: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onEdit?: (schedule: CollectorSchedule) => void;
  onDelete?: (schedule: CollectorSchedule) => void;
  showActions?: boolean;
};

export type CollectionReportCollectorScheduleFiltersProps = {
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedCollector: string;
  onCollectorChange: (value: string) => void;
  collectors: string[];
  locations: LocationSelectItem[];
  onResetFilters: () => void;
  loading?: boolean;
};

export type CollectorScheduleFiltersProps = CollectionReportCollectorScheduleFiltersProps;

export type CollectionReportFiltersProps = {
  locations: Array<{ _id: string; name: string }>;
  selectedLocation: string | string[];
  onLocationChange: (value: string | string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (checked: boolean) => void;
  selectedFilters: string[];
  onFilterChange: (filter: string, checked: boolean) => void;
  onClearFilters: () => void;
  isSearching: boolean;
};

export type CollectionReportCollectorScheduleTableProps = {
  data: CollectorSchedule[];
  loading?: boolean;
  onEdit?: (schedule: CollectorSchedule) => void;
  onDelete?: (schedule: CollectorSchedule) => void;
  showActions?: boolean;
};

export type CollectorScheduleTableProps = CollectionReportCollectorScheduleTableProps;

export type CollectionReportCollectorScheduleCardsProps = {
  data: CollectorSchedule[];
  loading?: boolean;
  onEdit?: (schedule: CollectorSchedule) => void;
  onDelete?: (schedule: CollectorSchedule) => void;
  showActions?: boolean;
};

export type CollectorScheduleCardsProps = CollectionReportCollectorScheduleCardsProps;

export type MapPreviewProps = {
  gamingLocations?: Record<string, unknown>[];
  locationAggregates?: Record<string, unknown>[];
  aggLoading?: boolean;
  zoom?: number;
  center?: { lat: number; lng: number };
  height?: string;
  className?: string;
};

export type DashboardMobileLayoutProps = {
  children?: ReactNode;
  activeFilters: import('@/lib/types').ActiveFilters;
  activeTab: import('@/lib/types').ActiveTab;
  totals: import('@/lib/types').DashboardTotals | null;
  chartData: import('@/lib/types').dashboardData[];
  gamingLocations: import('@/lib/types').locations;
  loadingChartData: boolean;
  loadingTotals?: boolean;
  loadingLocations?: boolean;
  refreshing: boolean;
  pieChartSortIsOpen: boolean;
  activeMetricsFilter: import('@shared/types').TimePeriod | '';
  activePieChartFilter: import('@shared/types').TimePeriod | '';
  topPerformingData: import('@/lib/types').TopPerformingData;
  setLoadingChartData: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setActiveFilters: (filters: import('@/lib/types').ActiveFilters) => void;
  setActiveTab: (tab: import('@/lib/types').ActiveTab) => void;
  setTotals: (totals: import('@/lib/types').DashboardTotals | null) => void;
  setChartData: (data: import('@/lib/types').dashboardData[]) => void;
  setPieChartSortIsOpen: (isOpen: boolean) => void;
  setTopPerformingData: (data: import('@/lib/types').TopPerformingData) => void;
  setActiveMetricsFilter: (
    filter: import('@shared/types').TimePeriod | ''
  ) => void;
  setActivePieChartFilter: (
    filter: import('@shared/types').TimePeriod | ''
  ) => void;
  renderCustomizedLabel: (props: CustomizedLabelProps) => ReactNode;
  selectedLicencee?: string;
  setSelectedLicencee: (licencee: string) => void;
  loadingTopPerforming: boolean;
  hasTopPerformingFetched: boolean;
  onRefresh: () => Promise<void>;
  isChangingDateFilter?: boolean;
  chartGranularity: import('@shared/types/common').ChartGranularity;
  setChartGranularity: (
    granularity: import('@shared/types/common').ChartGranularity
  ) => void;
  showGranularitySelector: boolean;
  sortBy: 'totalDrop' | 'totalWin';
  setSortBy: (sortBy: 'totalDrop' | 'totalWin') => void;
  machineStats?: {
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
  } | null;
  machineStatsLoading?: boolean;
};

export type DashboardDesktopLayoutProps = DashboardMobileLayoutProps;
