import { buttonVariants } from "@/components/ui/button";
import { ActiveFilters, ActiveTab, dashboardData, dateRange, locations, TimeFrames, TopPerformingData } from "@/lib/types";
import { VariantProps } from "class-variance-authority";
import { JSX } from "react";

export type DashboardLayoutProps = {
    activeTab: ActiveTab;
    topPerformingData: TopPerformingData[];
    activeMetricsFilter: string;
    activePieChartFilter: string;
    activeFilters: ActiveFilters;
    pieChartSortIsOpen: boolean;
    showDatePicker: boolean;
    CustomDateRange: dateRange;
    totals: dashboardData | null;
    chartData: dashboardData[];
    gamingLocations: locations[];
    loadingChartData: boolean;
    setLoadingChartData: (state: boolean) => void;
    setCustomDateRange: (state: dateRange) => void;
    setActiveTab: (state: ActiveTab) => void;
    setActivePieChartFilter: (state: string) => void;
    setActiveFilters: (state: ActiveFilters) => void;
    setActiveMetricsFilter: (state: string) => void;
    setTotals: (state: dashboardData | null) => void;
    setChartData: (state: dashboardData[]) => void;
    setPieChartSortIsOpen: (state: boolean) => void;
    setShowDatePicker: (state: boolean) => void;
    setTopPerformingData: (state: TopPerformingData[]) => void;
    renderCustomizedLabel: (props: CustomizedLabelProps) => JSX.Element;
    queryType?: "user" | "all";
    userId?: string | null;
    selectedLicencee: string;
    loadingTopPerforming?: boolean;
};

export type PcLayoutProps = DashboardLayoutProps;
export type MobileLayoutProps = DashboardLayoutProps;

export type ChartProps = {
    loadingChartData: boolean;
    chartData: dashboardData[];
    activeMetricsFilter: string;
};

export type MapPreviewProps = {
    chartData: dashboardData[];
    gamingLocations: locations[];
};

export type DateRangeProps = {
    CustomDateRange: dateRange;
    setCustomDateRange: (state: dateRange) => void;
    setTotals: (state: dashboardData | null) => void;
    setChartData: (state: dashboardData[]) => void;
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
};

export type CustomSelectProps = {
    selectedFilter: string;
    placeholder?: string;
    activePieChartFilter?: string;
    isActive: boolean;
    isMobile?: boolean;
    isTopPerforming?: boolean;
    timeFrames: TimeFrames[];
    activeFilters: ActiveFilters;
    onSelect: (value: string) => void;
    setShowDatePicker?: (state: boolean) => void;
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
    onChange: (value: string) => void;
};

export type HeaderProps = {
    selectedLicencee: string;
    setSelectedLicencee: (value: string) => void;
};
