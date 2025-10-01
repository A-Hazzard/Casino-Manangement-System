import { buttonVariants } from "@/components/ui/button";
import {
  ActiveFilters,
  ActiveTab,
  dashboardData,
  DashboardTotals,
  dateRange,
  locations,
  TimeFrames,
  TopPerformingData,
} from "@/lib/types";
import { TimePeriod } from "@shared/types";
import { VariantProps } from "class-variance-authority";
import { JSX } from "react";
import type { LocationSelectItem } from "./location";
import type { DateRange as RDPDateRange } from "react-day-picker";
import type { CollectionReportLocationWithMachines } from "./api";
import { LatLng } from "leaflet";
import type { CollectorSchedule } from "@/lib/types/components";

export type DashboardLayoutProps = {
  activeTab: ActiveTab;
  topPerformingData: TopPerformingData;
  activeMetricsFilter: TimePeriod | "";
  activePieChartFilter: TimePeriod | "";
  activeFilters: ActiveFilters;
  pieChartSortIsOpen: boolean;
  totals: DashboardTotals | null;
  chartData: dashboardData[];
  gamingLocations: locations;
  /** Optional pre-fetched aggregation data to avoid duplicate API calls */
  locationAggregates?: Record<string, unknown>[];
  /** Optional loading flag when aggregation is being fetched externally */
  aggLoading?: boolean;
  loadingChartData: boolean;
  loadingTopPerforming?: boolean;
  refreshing: boolean;
  initialLoading?: boolean;
  setLoadingChartData: (_state: boolean) => void;
  setRefreshing: (_state: boolean) => void;
  setActiveTab: (_state: ActiveTab) => void;
  setActivePieChartFilter: (_state: TimePeriod | "") => void;
  setActiveFilters: (_state: ActiveFilters) => void;
  setActiveMetricsFilter: (_state: TimePeriod) => void;
  setTotals: (_state: DashboardTotals | null) => void;
  setChartData: (_state: dashboardData[]) => void;
  setPieChartSortIsOpen: (_state: boolean) => void;
  setTopPerformingData: (_state: TopPerformingData[]) => void;
  onRefresh: () => void;
  renderCustomizedLabel: (_props: CustomizedLabelProps) => JSX.Element;
  queryType?: "user" | "all";
  userId?: string | null;
  selectedLicencee: string;
};

export type PcLayoutProps = DashboardLayoutProps;

export type ChartProps = {
  loadingChartData: boolean;
  chartData: dashboardData[];
  activeMetricsFilter: TimePeriod | "";
};

export type MapPreviewProps = {
  gamingLocations: locations;
  /** Optional pre-fetched aggregation data to avoid duplicate API calls */
  locationAggregates?: Record<string, unknown>[];
  /** Optional loading flag when aggregation is being fetched externally */
  aggLoading?: boolean;
};

export type DateRangeProps = {
  CustomDateRange: dateRange;
  setCustomDateRange: (_state: dateRange) => void;
  setTotals?: (_state: dashboardData | null) => void;
  setChartData?: (_state: dashboardData[]) => void;
  selectedLicencee?: string;
  setActiveFilters: (_state: ActiveFilters) => void;
  setShowDatePicker?: (_state: boolean) => void;
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export type CustomSelectProps = {
  selectedFilter: TimePeriod | "";
  placeholder?: string;
  activePieChartFilter?: TimePeriod | "";
  isActive: boolean;
  timeFrames: TimeFrames[];
  activeFilters: ActiveFilters;
  onSelect: (_value: TimePeriod) => void;
  setShowDatePicker?: (_state: boolean) => void;
  disabled?: boolean;
};

export type CustomizedLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
};

export type licenceeSelectProps = {
  selected: string;
  onChange: (_value: string) => void;
  disabled?: boolean;
};

// Centralized props type for date filters to comply with Next.js rules on shared typing
export type DashboardDateFiltersProps = {
  disabled?: boolean;
  onCustomRangeGo?: () => void;
  hideAllTime: boolean;
  mode?: "auto" | "mobile" | "desktop";
};

export type HeaderProps = {
  selectedLicencee?: string;
  pageTitle?: string;
  setSelectedLicencee?: (_state: string) => void;
  hideOptions?: boolean;
  hideLicenceeFilter?: boolean;
  containerPaddingMobile?: string;
  disabled?: boolean;
};

// Next.js page parameter types for dynamic routes
export type PageParams = {
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export type PageParamsWithId = {
  params: {
    id: string;
  };
};

export type PageParamsWithSlug = {
  params: {
    slug: string;
  };
};

// Restore MobileLayoutProps as a type alias for DashboardLayoutProps
export type MobileLayoutProps = DashboardLayoutProps & {
  isChangingDateFilter: boolean;
};

// Represents a single row in the Collection Reports table
export type CollectionReportRow = {
  _id: string;
  locationReportId: string;
  collector: string;
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

export type NewCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  locations: CollectionReportLocationWithMachines[];
  onRefresh?: () => void;
};

// Collection Report UI Props Types

export type CollectionDesktopUIProps = {
  loading: boolean;
  filteredReports: CollectionReportRow[];
  desktopCurrentItems: CollectionReportRow[];
  desktopTotalPages: number;
  desktopPage: number;
  onPaginateDesktop: (_page: number) => void;
  desktopPaginationRef: React.RefObject<HTMLDivElement | null>;
  desktopTableRef: React.RefObject<HTMLDivElement | null>;
  itemsPerPage: number;
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (_value: string) => void;
  search: string;
  onSearchChange: (_value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (checked: boolean) => void;
  selectedFilters: string[];
  onFilterChange: (filter: string, checked: boolean) => void;
  onClearFilters: () => void;
  isSearching: boolean;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
};

export type CollectionMobileUIProps = {
  loading: boolean;
  filteredReports: CollectionReportRow[];
  mobileCurrentItems: CollectionReportRow[];
  mobileTotalPages: number;
  mobilePage: number;
  onPaginateMobile: (_page: number) => void;
  mobilePaginationRef: React.RefObject<HTMLDivElement | null>;
  mobileCardsRef: React.RefObject<HTMLDivElement | null>;
  itemsPerPage: number;
  disabled?: boolean;
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (_value: string) => void;
  search: string;
  onSearchChange: (_value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (checked: boolean) => void;
  selectedFilters: string[];
  onFilterChange: (filter: string, checked: boolean) => void;
  onClearFilters: () => void;
  isSearching: boolean;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
};

export type MonthlyDesktopUIProps = {
  allLocationNames: string[];
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

export type MonthlyMobileUIProps = {
  allLocationNames: string[];
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

export type ManagerDesktopUIProps = {
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

export type ManagerMobileUIProps = {
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

// Collector Schedule prop types
export type CollectorScheduleDesktopUIProps = {
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

export type CollectorScheduleMobileUIProps = {
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

export type CollectorScheduleFiltersProps = {
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

export type CollectorScheduleTableProps = {
  data: CollectorSchedule[];
  loading?: boolean;
};

export type CollectorScheduleCardsProps = {
  data: CollectorSchedule[];
  loading?: boolean;
};

export type LocationPickerMapProps = {
  onLocationSelect: (latlng: LatLng) => void;
};

export type CollectionReportDateFilter =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom"
  | "alltime";

export type DateRangeFilterProps = {
  dateRange?: RDPDateRange;
  onApply: (range?: RDPDateRange) => void;
  className?: string;
};
