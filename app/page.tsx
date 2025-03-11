"use client";

import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import PcLayout from "@/components/layout/PcLayout";
import Sidebar from "@/components/layout/Sidebar";
import CustomSelect from "@/components/ui/CustomSelect";
import DateRange from "@/components/ui/dateRange";
import { RADIAN, timeFrames } from "@/lib/constants/uiConstants";
import { fetchTopPerformingData } from "@/lib/helpers/topPerforming";
import {
    ActiveFilters,
    ActiveTab,
    dashboardData,
    dateRange,
    locations,
    TopPerformingData,
} from "@/lib/types";
import { CustomizedLabelProps } from "@/lib/types/componentProps";
import { switchFilter } from "@/lib/utils/metrics";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import LoadingOverlay from "@/components/layout/LoadingOverlay";
import getAllGamingLocations from "@/lib/helpers/locations";
import {TimePeriod} from "@/app/api/lib/types";

export default function Home() {
    // Full-page overlay shown only on the first load.
    const [initialLoading, setInitialLoading] = useState(true);
    // Used for showing skeleton loaders in the aggregator (chart & metrics) area.
    const [loadingChartData, setLoadingChartData] = useState(false);
    // New state for top-performing loading.
    const [loadingTopPerforming, setLoadingTopPerforming] = useState(false);

    const [pieChartSortIsOpen, setPieChartSortIsOpen] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>("Cabinets");
    const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
        Today: true,
        Yesterday: false,
        last7days: false,
        last30days: false,
        Custom: false,
    });
    const [totals, setTotals] = useState<dashboardData | null>(null);
    const [chartData, setChartData] = useState<dashboardData[]>([]);
    const [activeMetricsFilter, setActiveMetricsFilter] = useState("Today");
    // Top performing filter state – separate from aggregator filter.
    const [activePieChartFilter, setActivePieChartFilter] = useState("Today");
    const [CustomDateRange, setCustomDateRange] = useState<dateRange>({
        startDate: new Date(),
        endDate: new Date(),
    });
    const [topPerformingData, setTopPerformingData] = useState<TopPerformingData[]>([]);
    const [gamingLocations, setGamingLocations] = useState<locations[]>([]);
    // Licencee state: empty string means "All Licencee"
    const [selectedLicencee, setSelectedLicencee] = useState("");

    // To compare new totals with previous ones.
    const prevTotals = useRef<dashboardData | null>(null);

    // Memoized custom label for Chart.
    const renderCustomizedLabel = useCallback((props: CustomizedLabelProps) => {
        const radius = props.innerRadius + (props.outerRadius - props.innerRadius) * 0.7;
        const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
        const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={props.percent < 0.1 ? "12px" : "14px"}
                fontWeight="bold"
            >
                {(props.percent * 100).toFixed(0)}%
            </text>
        );
    }, []);

    // Derive the active time period from activeFilters.
    const getTimeFrame = useCallback(() => {
        if (activeFilters.Today) return "Today";
        if (activeFilters.Yesterday) return "Yesterday";
        if (activeFilters.last7days) return "7d";
        if (activeFilters.last30days) return "30d";
        if (activeFilters.Custom) return "Custom";
        return "Today";
    }, [activeFilters]);

    function handleSelectChange(value: string) {
        const updatedFilters: ActiveFilters = {
            Today: value === "Today",
            Yesterday: value === "Yesterday",
            last7days: value === "7d",
            last30days: value === "30d",
            Custom: value === "Custom",
        };
        setActiveFilters(updatedFilters);
    }

    // Aggregator: Fetch chartData and totals.
    useEffect(() => {
        async function loadData() {
            setLoadingChartData(true);
            try {
                // On initial load, fetch locations only.
                if (initialLoading) {
                    const locationsData = await getAllGamingLocations();
                    const validLocations = locationsData.filter(
                        (loc) =>
                            loc.geoCoords &&
                            loc.geoCoords.latitude !== 0 &&
                            loc.geoCoords.longitude !== 0
                    );
                    setGamingLocations(validLocations);
                }
                const timeFrame = getTimeFrame() as TimePeriod;
                setActiveMetricsFilter(timeFrame);

                // Only pass licencee if selected.
                if (selectedLicencee) {
                    await switchFilter(timeFrame, setTotals, setChartData, undefined, undefined, selectedLicencee);
                } else {
                    await switchFilter(timeFrame, setTotals, setChartData);
                }
            } catch (error) {
                console.error("Error fetching metrics:", error);
            } finally {
                if (initialLoading) {
                    setInitialLoading(false);
                }
                // Leave loadingChartData true until new totals are received.
            }
        }
        void loadData();
    }, [activeFilters, getTimeFrame, selectedLicencee, initialLoading]);

    // Top Performing: Fetch top performing data separately.
    useEffect(() => {
        async function loadTopPerforming() {
            setLoadingTopPerforming(true);
            try {
                const data = await fetchTopPerformingData(activeTab, activePieChartFilter);
                setTopPerformingData(data);
            } catch (error) {
                console.error("Error fetching top-performing data:", error);
            } finally {
                setLoadingTopPerforming(false);
            }
        }
        void loadTopPerforming();
    }, [activeTab, activePieChartFilter]);


    // When totals update with new data, disable aggregator child skeleton loaders.
    useEffect(() => {
        if (
            totals &&
            (!prevTotals.current ||
                totals.moneyIn !== prevTotals.current.moneyIn ||
                totals.moneyOut !== prevTotals.current.moneyOut ||
                totals.gross !== prevTotals.current.gross)
        ) {
            setLoadingChartData(false);
            prevTotals.current = totals;
        }
    }, [totals]);

    // Full-page overlay is shown only on initial load.
    if (initialLoading) {
        return <LoadingOverlay finished={false} />;
    }

    return (
        <>
            <Sidebar />
            <div className="md:w-[80%] md:mx-auto md:pl-20 lg:pl-10 min-h-screen bg-background flex">
                <main className="flex-1 p-6 space-y-6">
                    <Header selectedLicencee={selectedLicencee} setSelectedLicencee={setSelectedLicencee} />
                    <div className="mx-auto lg:mx-0 flex gap-2 w-fit">
                        <h1 className="text-3xl lg:text-5xl font-semibold">Dashboard</h1>
                        <Image
                            src="/dashboardIcon.svg"
                            width={25}
                            height={25}
                            className="w-6 lg:w-10"
                            alt="dashboard icon"
                        />
                    </div>
                    {/* Mobile aggregator filter select */}
                    <div className="w-fit mx-auto lg:hidden">
                        <CustomSelect
                            timeFrames={timeFrames}
                            onSelect={handleSelectChange}
                            selectedFilter={activeMetricsFilter}
                            activeFilters={activeFilters}
                            isActive={true}
                            isMobile={true}
                            setShowDatePicker={setShowDatePicker}
                            disabled={loadingChartData}  // Disable until aggregator data is fetched
                        />
                    </div>

                    {showDatePicker && (
                        <div className="w-fit mx-auto lg:hidden my-4">
                            <DateRange
                                CustomDateRange={CustomDateRange}
                                setCustomDateRange={setCustomDateRange}
                                setTotals={setTotals}
                                setChartData={setChartData}
                            />
                        </div>
                    )}
                    <PcLayout
                        activeFilters={activeFilters}
                        activeTab={activeTab}
                        totals={totals}
                        chartData={chartData}
                        gamingLocations={gamingLocations}
                        loadingChartData={loadingChartData}
                        pieChartSortIsOpen={pieChartSortIsOpen}
                        activeMetricsFilter={activeMetricsFilter}
                        activePieChartFilter={activePieChartFilter}
                        topPerformingData={topPerformingData}
                        showDatePicker={showDatePicker}
                        setLoadingChartData={setLoadingChartData}
                        CustomDateRange={CustomDateRange}
                        setCustomDateRange={setCustomDateRange}
                        setActiveFilters={setActiveFilters}
                        setActiveTab={setActiveTab}
                        setTotals={setTotals}
                        setChartData={setChartData}
                        setPieChartSortIsOpen={setPieChartSortIsOpen}
                        setShowDatePicker={setShowDatePicker}
                        setTopPerformingData={setTopPerformingData}
                        setActiveMetricsFilter={setActiveMetricsFilter}
                        setActivePieChartFilter={setActivePieChartFilter}
                        renderCustomizedLabel={renderCustomizedLabel}
                        selectedLicencee={selectedLicencee}
                        // Pass top-performing loading state to disable its filter select
                        loadingTopPerforming={loadingTopPerforming}
                    />
                    <MobileLayout
                        activeFilters={activeFilters}
                        activeTab={activeTab}
                        totals={totals}
                        chartData={chartData}
                        gamingLocations={gamingLocations}
                        loadingChartData={loadingChartData}
                        pieChartSortIsOpen={pieChartSortIsOpen}
                        activeMetricsFilter={activeMetricsFilter}
                        activePieChartFilter={activePieChartFilter}
                        topPerformingData={topPerformingData}
                        showDatePicker={showDatePicker}
                        setLoadingChartData={setLoadingChartData}
                        CustomDateRange={CustomDateRange}
                        setCustomDateRange={setCustomDateRange}
                        setActiveFilters={setActiveFilters}
                        setActiveTab={setActiveTab}
                        setTotals={setTotals}
                        setChartData={setChartData}
                        setPieChartSortIsOpen={setPieChartSortIsOpen}
                        setShowDatePicker={setShowDatePicker}
                        setTopPerformingData={setTopPerformingData}
                        setActiveMetricsFilter={setActiveMetricsFilter}
                        setActivePieChartFilter={setActivePieChartFilter}
                        renderCustomizedLabel={renderCustomizedLabel}
                        selectedLicencee={selectedLicencee}
                        loadingTopPerforming={loadingTopPerforming}
                    />
                </main>
            </div>
        </>
    );
}
