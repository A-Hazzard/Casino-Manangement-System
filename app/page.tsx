"use client";

import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import PcLayout from "@/components/layout/PcLayout";
import Sidebar from "@/components/layout/Sidebar";
import CustomSelect from "@/components/ui/CustomSelect";
import DateRange from "@/components/ui/dateRange";
import {RADIAN, timeFrames} from "@/lib/constants/uiConstants";
import {fetchTopPerformingData} from "@/lib/helpers/topPerforming";
import {ActiveFilters, dashboardData,} from "@/lib/types";
import {CustomizedLabelProps} from "@/lib/types/componentProps";
import {switchFilter} from "@/lib/utils/metrics";
import Image from "next/image";
import {useCallback, useEffect, useRef} from "react";
import LoadingOverlay from "@/components/layout/LoadingOverlay";
import getAllGamingLocations from "@/lib/helpers/locations";
import {TimePeriod} from "@/app/api/lib/types";
import {useDashBoardStore} from "@/lib/ store/dashboardStore";

export default function Home() {
    const {
        initialLoading, setInitialLoading,
        loadingChartData, setLoadingChartData,
        loadingTopPerforming, setLoadingTopPerforming,
        activeFilters, setActiveFilters,
        activeMetricsFilter, setActiveMetricsFilter,
        activePieChartFilter, setActivePieChartFilter,
        activeTab, setActiveTab,
        totals, setTotals,
        chartData, setChartData,
        gamingLocations, setGamingLocations,
        selectedLicencee, setSelectedLicencee,
        showDatePicker, setShowDatePicker,
        customDateRange, setCustomDateRange,
        topPerformingData, setTopPerformingData,
        pieChartSortIsOpen, setPieChartSortIsOpen
    } = useDashBoardStore();
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
                setLoadingChartData(false);
                if (initialLoading) {
                    setInitialLoading(false);
                }
            }
        }
        void loadData();
    }, [activeFilters, selectedLicencee, initialLoading, setActiveMetricsFilter, setTotals, setChartData, setInitialLoading, setLoadingChartData, setGamingLocations]);

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
                                CustomDateRange={customDateRange}
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
                        CustomDateRange={customDateRange}
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
                        CustomDateRange={customDateRange}
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
