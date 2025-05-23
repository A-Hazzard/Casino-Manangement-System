import { buttonVariants } from "@/components/ui/button";
import {
  ActiveFilters,
  ActiveTab,
  dashboardData,
  dateRange,
  locations,
  TimeFrames,
  TopPerformingData,
} from "@/lib/types";
import { TimePeriod } from "@/lib/types/api";
import { VariantProps } from "class-variance-authority";
import { JSX } from "react";
import type { LocationSelectItem } from "./location";
import type { DateRange as RDPDateRange } from "react-day-picker";
import type { CollectionReportLocationWithMachines } from "./api";

export type DashboardLayoutProps = {
  activeTab: ActiveTab;
  topPerformingData: TopPerformingData[];
  activeMetricsFilter: TimePeriod;
  activePieChartFilter: TimePeriod;
  activeFilters: ActiveFilters;
  pieChartSortIsOpen: boolean;
  showDatePicker: boolean;
  CustomDateRange: dateRange;
  totals: dashboardData | null;
  chartData: dashboardData[];
  gamingLocations: locations[];
  loadingChartData: boolean;
  loadingTopPerforming?: boolean;
  initialLoading?: boolean;
  setLoadingChartData: (_state: boolean) => void;
  setCustomDateRange: (_state: dateRange) => void;
  setActiveTab: (_state: ActiveTab) => void;
  setActivePieChartFilter: (_state: TimePeriod) => void;
  setActiveFilters: (_state: ActiveFilters) => void;
  setActiveMetricsFilter: (_state: TimePeriod) => void;
  setTotals: (_state: dashboardData | null) => void;
  setChartData: (_state: dashboardData[]) => void;
  setPieChartSortIsOpen: (_state: boolean) => void;
  setShowDatePicker: (_state: boolean) => void;
  setTopPerformingData: (_state: TopPerformingData[]) => void;
  renderCustomizedLabel: (_props: CustomizedLabelProps) => JSX.Element;
  queryType?: "user" | "all";
  userId?: string | null;
  selectedLicencee: string;
};

export type PcLayoutProps = DashboardLayoutProps & {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
};

export type ChartProps = {
  loadingChartData: boolean;
  chartData: dashboardData[];
  activeMetricsFilter: TimePeriod;
};

export type MapPreviewProps = {
  chartData: dashboardData[];
  gamingLocations: locations[];
};

export type DateRangeProps = {
  CustomDateRange: dateRange;
  setCustomDateRange: (_state: dateRange) => void;
  setTotals: (_state: dashboardData | null) => void;
  setChartData: (_state: dashboardData[]) => void;
  selectedLicencee?: string;
  setActiveFilters?: (_state: ActiveFilters) => void;
  setShowDatePicker?: (_state: boolean) => void;
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export type CustomSelectProps = {
  selectedFilter: TimePeriod;
  placeholder?: string;
  activePieChartFilter?: TimePeriod;
  isActive: boolean;
  isMobile?: boolean;
  isTopPerforming?: boolean;
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
};

export type HeaderProps = {
  selectedLicencee?: string;
  pageTitle?: string;
  setSelectedLicencee?: (_state: string) => void;
  hideOptions?: boolean;
  hideLicenceeFilter?: boolean;
  containerPaddingMobile?: string;
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
export type MobileLayoutProps = DashboardLayoutProps;

// Represents a single row in the Collection Reports table
export type CollectionReportRow = {
  _id: string;
  locationReportId: string;
  collector: string;
  location: string;
  gross: number;
  machines: string;
  collected: number;
  uncollected: string;
  locationRevenue: number;
  time: string;
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
};

// Collection Report UI Props Types

export type CollectionDesktopUIProps = {
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (value: boolean) => void;
  isSearching: boolean;
  loading: boolean;
  filteredReports: CollectionReportRow[];
  desktopCurrentItems: CollectionReportRow[];
  desktopTotalPages: number;
  desktopPage: number;
  onPaginateDesktop: (page: number) => void;
  desktopPaginationRef: React.RefObject<HTMLDivElement | null>;
  desktopTableRef: React.RefObject<HTMLDivElement | null>;
  itemsPerPage: number;
};

export type CollectionMobileUIProps = {
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (value: boolean) => void;
  isSearching: boolean;
  loading: boolean;
  filteredReports: CollectionReportRow[];
  mobileCurrentItems: CollectionReportRow[];
  mobileTotalPages: number;
  mobilePage: number;
  onPaginateMobile: (page: number) => void;
  mobilePaginationRef: React.RefObject<HTMLDivElement | null>;
  mobileCardsRef: React.RefObject<HTMLDivElement | null>;
  itemsPerPage: number;
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
