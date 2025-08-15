"use client";

import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import PcLayout from "@/components/layout/PcLayout";
import Sidebar from "@/components/layout/Sidebar";
import { dashboardData } from "@/lib/types";
import { useCallback, useEffect, useRef } from "react";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  calculatePieChartLabelData,
  loadGamingLocations,
  fetchMetricsData,
  fetchTopPerformingDataHelper,
  handleDashboardRefresh,
} from "@/lib/helpers/dashboard";
import { CustomizedLabelProps } from "@/lib/types/componentProps";
import FinancialMetricsCards from "@/components/ui/FinancialMetricsCards";

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
    setShowDatePicker,
    customDateRange,
    topPerformingData,
    setTopPerformingData,
    pieChartSortIsOpen,
    setPieChartSortIsOpen,
  } = useDashBoardStore();
  const pathname = usePathname();
  // To compare new totals with previous ones.
  const prevTotals = useRef<dashboardData | null>(null);

  useEffect(() => {
    // On initial load, if no licensee is selected, default to empty string
    if (!selectedLicencee) {
      setSelectedLicencee("");
    }
  }, [selectedLicencee, setSelectedLicencee]);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingChartData(true);
      try {
        // Fetch locations and metrics in parallel
        await Promise.all([
          loadGamingLocations(setGamingLocations, selectedLicencee),
          fetchMetricsData(
            activeMetricsFilter,
            customDateRange,
            selectedLicencee,
            setTotals,
            setChartData,
            setActiveFilters,
            setShowDatePicker
          ),
        ]);
      } catch (error) {
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
      <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden xl:w-full xl:mx-auto md:pl-36 transition-all duration-300">
        <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            disabled={loadingChartData || refreshing}
          />

          {/* Removed duplicate Financial Metrics Cards from top to avoid duplication */}

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
            setLoadingChartData={setLoadingChartData}
            setRefreshing={setRefreshing}
            setActiveFilters={setActiveFilters}
            setActiveTab={setActiveTab}
            setTotals={setTotals}
            setChartData={setChartData}
            setPieChartSortIsOpen={setPieChartSortIsOpen}
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
            setLoadingChartData={setLoadingChartData}
            setRefreshing={setRefreshing}
            setActiveFilters={setActiveFilters}
            setActiveTab={setActiveTab}
            setTotals={setTotals}
            setChartData={setChartData}
            setPieChartSortIsOpen={setPieChartSortIsOpen}
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
