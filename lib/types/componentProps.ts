import {buttonVariants} from "@/components/ui/button"
import {ActiveFilters, ActiveTab, dashboardData, dateRange, locations, TimeFrames, TopPerformingData} from "@/lib/types"
import {VariantProps} from "class-variance-authority"
import {Dispatch, JSX, SetStateAction} from "react"

export type DashboardLayoutProps = {
    activeTab: ActiveTab
    topPerformingData: TopPerformingData[]
    activeMetricsFilter: string
    activePieChartFilter: string
    activeFilters: ActiveFilters
    pieChartSortIsOpen: boolean
    showDatePicker: boolean
    CustomDateRange: dateRange
    totals: dashboardData | null
    chartData: dashboardData[]
    gamingLocations: locations[]
    loadingChartData: boolean
    setLoadingChartData: Dispatch<SetStateAction<boolean>>
    setCustomDateRange: Dispatch<SetStateAction<dateRange>>
    setActiveTab: Dispatch<SetStateAction<ActiveTab>>
    setActivePieChartFilter: Dispatch<SetStateAction<string>>
    setActiveFilters: Dispatch<SetStateAction<ActiveFilters>>
    setActiveMetricsFilter: Dispatch<SetStateAction<string>>
    setTotals: Dispatch<SetStateAction<dashboardData | null>>
    setChartData: Dispatch<SetStateAction<dashboardData[]>>
    setPieChartSortIsOpen: Dispatch<SetStateAction<boolean>>
    setShowDatePicker: Dispatch<SetStateAction<boolean>>
    setTopPerformingData: Dispatch<SetStateAction<TopPerformingData[]>>
    renderCustomizedLabel: (props: CustomizedLabelProps) => JSX.Element
    queryType?: "user" | "all";
    userId?: string | null;
    selectedLicencee: string;
    loadingTopPerforming?: boolean;

}

export type PcLayoutProps = DashboardLayoutProps
export type MobileLayoutProps = DashboardLayoutProps

export type ChartProps = {
    loadingChartData: DashboardLayoutProps["loadingChartData"],
    chartData: DashboardLayoutProps["chartData"],
    activeMetricsFilter: DashboardLayoutProps["activeMetricsFilter"],
}

export type MapPreviewProps = {
    chartData: DashboardLayoutProps["chartData"],
    gamingLocations: locations[]
}
export type DateRangeProps = {
    CustomDateRange: dateRange
    setCustomDateRange: Dispatch<SetStateAction<dateRange>>
    setTotals: Dispatch<SetStateAction<dashboardData | null>>
    setChartData: Dispatch<SetStateAction<dashboardData[]>>
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
    asChild?: boolean
}


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
    setShowDatePicker?: Dispatch<SetStateAction<boolean>>;
    disabled?: boolean; // NEW
};

export type CustomizedLabelProps = {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
}

export type licenceeSelectProps = {
    selected: string;
    onChange: (value: string) => void;
}

export type HeaderProps = {
    selectedLicencee: string;
    setSelectedLicencee: (value: string) => void;
};