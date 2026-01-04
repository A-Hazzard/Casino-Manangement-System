import { dashboardData, DashboardTotals } from '@/lib/types';
import type { CollectorSchedule } from '@/lib/types/components';
import { TimePeriod } from '@/shared/types';
import type { DateRange as RDPDateRange } from 'react-day-picker';
import type { CollectionReportLocationWithMachines } from './api';
import type { LocationSelectItem } from './location';

export type ChartProps = {
  loadingChartData: boolean;
  chartData: dashboardData[];
  activeMetricsFilter: TimePeriod | '';
  totals?: DashboardTotals | null;
  granularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
};

export type CustomizedLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
};

// Centralized props type for date filters to comply with Next.js rules on shared typing
export type DateFiltersProps = {
  disabled?: boolean;
  onCustomRangeGo?: () => void;
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

// Tooltip data for collector hover
export type CollectorTooltipData = {
  firstName?: string;
  lastName?: string;
  id?: string;
  email?: string;
};

// Represents a single row in the Collection Reports table
export type CollectionReportRow = {
  _id: string;
  locationReportId: string;
  collector: string;
  collectorFullName?: string; // Display name (username → firstName → email → collectorName)
  collectorFullNameTooltip?: string; // Full name for tooltip (firstName + lastName when available)
  collectorTooltipData?: CollectorTooltipData; // Tooltip data with firstName, lastName, ID, email
  collectorUserNotFound?: boolean; // True if collector user no longer exists
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
};

// Monthly report summary type
export type MonthlyReportSummary = {
  drop: string;
  cancelledCredits: string;
  gross: string;
  sasGross: string;
};

// Monthly report details row type
export type MonthlyReportDetailsRow = {
  location: string;
  drop: string;
  win: string;
  gross: string;
  sasGross: string;
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

// Collection Report UI Props Types

export type CollectionReportTableProps = {
  data: CollectionReportRow[];
  loading?: boolean;
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  sortField?: keyof CollectionReportRow;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof CollectionReportRow) => void;
  editableReportIds?: Set<string>; // Set of locationReportIds that can be edited
  selectedLicencee?: string | null;
};

export type CollectionReportCardsProps = {
  data: CollectionReportRow[];
  gridLayout?: boolean; // New prop to control grid vs single column layout
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  editableReportIds?: Set<string>; // Set of locationReportIds that can be edited
  loading?: boolean;
  onRefresh?: () => void;
  selectedLicencee?: string | null;
};

export type CollectionReportDesktopUIProps = {
  loading: boolean;
  filteredReports: CollectionReportRow[];
  desktopTableRef: React.RefObject<HTMLDivElement | null>;
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
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
  editableReportIds?: Set<string>; // Set of locationReportIds that can be edited (most recent per location)
};

export type CollectionReportMobileUIProps = {
  loading: boolean;
  filteredReports: CollectionReportRow[];
  mobileCardsRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
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
  editableReportIds?: Set<string>; // Set of locationReportIds that can be edited (most recent per location)
};

export type CollectionReportMonthlyDesktopUIProps = {
  locations: Array<{ id: string; name: string }>;
  monthlyLocation: string;
  onMonthlyLocationChange: (value: string) => void;
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
  monthlyPaginationRef: React.RefObject<HTMLDivElement | null>;
  monthlyFirstItemIndex: number;
  monthlyLastItemIndex: number;
};

export type MonthlyDesktopUIProps = CollectionReportMonthlyDesktopUIProps;

export type CollectionReportMonthlyMobileUIProps = {
  locations: Array<{ id: string; name: string }>;
  monthlyLocation: string;
  onMonthlyLocationChange: (value: string) => void;
  pendingRange?: RDPDateRange;
  onPendingRangeChange: (range?: RDPDateRange) => void;
  onApplyDateRange: () => void;
  onSetLastMonth: () => void;
  monthlySummary: MonthlyReportSummary;
  monthlyDetails: MonthlyReportDetailsRow[];
  monthlyLoading: boolean;
};

export type MonthlyMobileUIProps = CollectionReportMonthlyMobileUIProps;

export type CollectionReportMonthlyDetailsTableProps = {
  details: MonthlyReportDetailsRow[];
  loading: boolean;
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
  schedulers: SchedulerTableRow[];
  loadingSchedulers: boolean;
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
  schedulers: SchedulerTableRow[];
  loadingSchedulers: boolean;
};

export type CollectionReportManagerScheduleTableProps = {
  data: SchedulerTableRow[];
  loading: boolean;
};

export type CollectionReportManagerScheduleCardsProps = {
  data: SchedulerTableRow[];
  loading: boolean;
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

// Collector Schedule prop types
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
  loadingCollectorSchedules: boolean;
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
  loadingCollectorSchedules: boolean;
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
  selectedLocation: string;
  onLocationChange: (value: string) => void;
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
};

export type CollectorScheduleTableProps = CollectionReportCollectorScheduleTableProps;

export type CollectionReportCollectorScheduleCardsProps = {
  data: CollectorSchedule[];
  loading?: boolean;
};

export type CollectorScheduleCardsProps = CollectionReportCollectorScheduleCardsProps;

export type MapPreviewProps = {
  gamingLocations?: any[];
  locationAggregates?: Record<string, unknown>[];
  aggLoading?: boolean;
  zoom?: number;
  center?: { lat: number; lng: number };
  height?: string;
  className?: string;
};

// Layout Props
export type DashboardMobileLayoutProps = {
  children?: React.ReactNode;
  activeFilters: import('@/lib/types').ActiveFilters;
  activeTab: import('@/lib/types').ActiveTab;
  totals: import('@/lib/types').DashboardTotals | null;
  chartData: import('@/lib/types').dashboardData[];
  gamingLocations: import('@/lib/types').locations;
  loadingChartData: boolean;
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
  renderCustomizedLabel: (props: CustomizedLabelProps) => React.ReactNode;
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
};

export type DashboardDesktopLayoutProps = DashboardMobileLayoutProps;
