"use client";

import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import PcLayout from "@/components/layout/PcLayout";
import Sidebar from "@/components/layout/Sidebar";
import { dashboardData } from "@/lib/types";
import { useCallback, useEffect, useRef } from "react";
import { TimePeriod } from "@/app/api/lib/types";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  calculatePieChartLabelData,
  loadGamingLocations,
  fetchMetricsData,
  fetchTopPerformingDataHelper,
  handleDashboardRefresh,
  getTimeFilterButtons,
} from "@/lib/helpers/dashboard";
import { CustomizedLabelProps } from "@/lib/types/componentProps";

// Create a client component to ensure the page only renders on the client
export default function Home() {
  return <DashboardContent />;
}

// Separate client component that uses zustand
function DashboardContent() {
  const {
    loadingChartData,
    setLoadingChartData,
    loadingTopPerforming,
    setLoadingTopPerforming,
    refreshing,
    setRefreshing,
    activeFilters,
    setActiveFilters,
    activeMetricsFilter,
    setActiveMetricsFilter,
    activePieChartFilter,
    setActivePieChartFilter,
    activeTab,
    setActiveTab,
    totals,
    setTotals,
    chartData,
    setChartData,
    gamingLocations,
    setGamingLocations,
    selectedLicencee,
    setSelectedLicencee,
    showDatePicker,
    setShowDatePicker,
    customDateRange,
    setCustomDateRange,
    topPerformingData,
    setTopPerformingData,
    pieChartSortIsOpen,
    setPieChartSortIsOpen,
  } = useDashBoardStore();
  const pathname = usePathname();
  // To compare new totals with previous ones.
  const prevTotals = useRef<dashboardData | null>(null);
  // To prevent double fetch on initial load
  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingChartData(true);
      try {
        if (!hasFetchedOnce.current) {
          await loadGamingLocations(setGamingLocations);
          hasFetchedOnce.current = true;
        }

        await fetchMetricsData(
          activeMetricsFilter,
          customDateRange,
          selectedLicencee,
          setTotals,
          setChartData,
          setActiveFilters,
          setShowDatePicker
        );
      } catch (error) {
        // Log error for debugging in development
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching metrics:", error);
        }
      } finally {
        setLoadingChartData(false);
      }
    };
    fetchMetrics();
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    setTotals,
    setChartData,
    setLoadingChartData,
    setGamingLocations,
    setActiveFilters,
    setShowDatePicker,
  ]);

  // Top Performing: Fetch top performing data separately.
  useEffect(() => {
    let isMounted = true;
    fetchTopPerformingDataHelper(
      activeTab,
      activePieChartFilter,
      setTopPerformingData,
      setLoadingTopPerforming
    ).catch((error) => {
      if (isMounted) {
        // Log error for debugging in development
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching top-performing data:", error);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    activePieChartFilter,
    setTopPerformingData,
    setLoadingTopPerforming,
  ]);

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
  }, [totals, setLoadingChartData]);

  // Handle refresh functionality
  const handleRefresh = useCallback(async () => {
    await handleDashboardRefresh(
      activeMetricsFilter,
      customDateRange,
      selectedLicencee,
      activeTab,
      activePieChartFilter,
      setRefreshing,
      setLoadingChartData,
      setLoadingTopPerforming,
      setTotals,
      setChartData,
      setActiveFilters,
      setShowDatePicker,
      setTopPerformingData
    );
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    activeTab,
    activePieChartFilter,
    setRefreshing,
    setLoadingChartData,
    setLoadingTopPerforming,
    setTotals,
    setChartData,
    setActiveFilters,
    setShowDatePicker,
    setTopPerformingData,
  ]);

  const timeFilterButtons = getTimeFilterButtons();

  // Render function for pie chart labels
  const renderCustomizedLabel = (props: CustomizedLabelProps) => {
    const labelData = calculatePieChartLabelData(props);
    return (
      <text
        x={labelData.x}
        y={labelData.y}
        fill={labelData.fill}
        textAnchor={labelData.textAnchor}
        dominantBaseline={labelData.dominantBaseline}
        fontSize={labelData.fontSize}
        fontWeight={labelData.fontWeight}
      >
        {labelData.text}
      </text>
    );
  };

  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden md:w-[80%] lg:w-full md:mx-auto md:pl-20 lg:pl-36">
        <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            disabled={loadingChartData || refreshing}
          />

          <div className="flex flex-col lg:hidden items-center justify-center w-full max-w-full">
            <Image
              src="/dashboardIcon.svg"
              alt="Dashboard Icon"
              width={20}
              height={20}
            />
            <h1 className="text-3xl lg:text-4xl font-semibold text-center lg:text-left w-full max-w-full">
              Dashboard
            </h1>
          </div>
          {/* Date Filter Controls (Desktop) */}
          <div className="hidden lg:flex space-x-2 overflow-x-auto flex-wrap justify-start mt-2">
            {timeFilterButtons.map((filter) => (
              <button
                key={filter.label}
                className={`px-2 py-1 text-xs lg:text-base rounded-full mb-1 whitespace-nowrap ${
                  activeMetricsFilter === filter.value
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-buttonActive"
                } ${
                  loadingChartData || refreshing
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={() =>
                  !(loadingChartData || refreshing) &&
                  setActiveMetricsFilter(filter.value)
                }
                disabled={loadingChartData || refreshing}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {/* Date Filter Controls (Mobile) */}
          <div className="flex lg:hidden justify-center my-4">
            <select
              className={`px-4 py-2 rounded-full text-sm bg-buttonActive text-white ${
                loadingChartData || refreshing
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              value={activeMetricsFilter}
              onChange={(e) =>
                setActiveMetricsFilter(e.target.value as TimePeriod)
              }
              disabled={loadingChartData || refreshing}
            >
              {timeFilterButtons.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Main dashboard layouts */}
          <PcLayout
            activeFilters={activeFilters}
            activeTab={activeTab}
            totals={totals}
            chartData={chartData}
            gamingLocations={gamingLocations}
            loadingChartData={loadingChartData}
            refreshing={refreshing}
            pieChartSortIsOpen={pieChartSortIsOpen}
            activeMetricsFilter={activeMetricsFilter}
            activePieChartFilter={activePieChartFilter}
            topPerformingData={topPerformingData}
            showDatePicker={showDatePicker}
            setLoadingChartData={setLoadingChartData}
            setRefreshing={setRefreshing}
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
            onRefresh={handleRefresh}
          />
          <MobileLayout
            activeFilters={activeFilters}
            activeTab={activeTab}
            totals={totals}
            chartData={chartData}
            gamingLocations={gamingLocations}
            loadingChartData={loadingChartData}
            refreshing={refreshing}
            pieChartSortIsOpen={pieChartSortIsOpen}
            activeMetricsFilter={activeMetricsFilter}
            activePieChartFilter={activePieChartFilter}
            topPerformingData={topPerformingData}
            showDatePicker={showDatePicker}
            setLoadingChartData={setLoadingChartData}
            setRefreshing={setRefreshing}
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
            onRefresh={handleRefresh}
            isChangingDateFilter={false}
          />
        </main>
      </div>
    </>
  );
}
