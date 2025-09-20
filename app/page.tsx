"use client";

import PageLayout from "@/components/layout/PageLayout";
import MobileLayout from "@/components/layout/MobileLayout";
import PcLayout from "@/components/layout/PcLayout";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { TimePeriod } from "@/app/api/lib/types";


import {
  loadGamingLocations,
  fetchMetricsData,
  fetchTopPerformingDataHelper,
  handleDashboardRefresh,
} from "@/lib/helpers/dashboard";
import { calculatePieChartLabelData } from "@/lib/utils/chart";
import { CustomizedLabelProps } from "@/lib/types/componentProps";
import { DashboardTotals, TopPerformingData } from '@/lib/types';



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
  
  
  // To compare new totals with previous ones.
  const prevTotals = useRef<DashboardTotals | null>(null);
  
  // Floating refresh button state
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);

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
        // Only fetch metrics if a filter is selected
        const metricsPromise = activeMetricsFilter 
          ? fetchMetricsData(
              activeMetricsFilter,
              customDateRange,
              selectedLicencee,
              setTotals,
              setChartData,
              setActiveFilters,
              setShowDatePicker
            )
          : Promise.resolve();
          
        // Fetch locations and metrics in parallel
        await Promise.all([
          loadGamingLocations(setGamingLocations, selectedLicencee),
          metricsPromise,
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
    setActiveFilters,
    setChartData,
    setGamingLocations,
    setLoadingChartData,
    setShowDatePicker,
    setTotals,
  ]);

  // Top Performing: Fetch top performing data separately.
  useEffect(() => {
    let isMounted = true;
    
    // Fetch top performing data whenever we have a valid filter
    if (activePieChartFilter) {
      fetchTopPerformingDataHelper(
        activeTab,
        activePieChartFilter as TimePeriod,
        (data: TopPerformingData[]) => setTopPerformingData(data as unknown as TopPerformingData),
        setLoadingTopPerforming
      ).catch((error) => {
        if (isMounted) {
          // Log error for debugging in development
          if (process.env.NODE_ENV === "development") {
            console.error("Error fetching top-performing data:", error);
          }
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    activePieChartFilter,
    setLoadingTopPerforming,
    setTopPerformingData,
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
      prevTotals.current = totals;
    }
  }, [totals]);

  // Handle scroll to show/hide floating refresh button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setShowFloatingRefresh(scrollTop > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle refresh functionality
  const handleRefresh = useCallback(async () => {
    // Don't refresh if no filter is selected
    if (!activeMetricsFilter) return;
    
    await handleDashboardRefresh(
      activeMetricsFilter,
      customDateRange,
      selectedLicencee,
      activeTab,
      activePieChartFilter as TimePeriod,
      setRefreshing,
      setLoadingChartData,
      setLoadingTopPerforming,
      setTotals,
      setChartData,
      setActiveFilters,
      setShowDatePicker,
      (data: TopPerformingData[]) => setTopPerformingData(data as unknown as TopPerformingData)
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

  // Render function for pie chart labels - must stay in component for JSX
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
    <PageLayout
      headerProps={{
        selectedLicencee,
        setSelectedLicencee,
        disabled: loadingChartData || refreshing,
      }}
      pageTitle="Dashboard"
      hideOptions={false}
      hideLicenceeFilter={false}
      mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
      showToaster={true}
    >
      {/* Mobile layout for small screens */}
      <div className="block md:hidden">
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
              setTopPerformingData={(data: TopPerformingData[]) => setTopPerformingData(data as unknown as TopPerformingData)}
              setActiveMetricsFilter={setActiveMetricsFilter}
              setActivePieChartFilter={setActivePieChartFilter}
              renderCustomizedLabel={renderCustomizedLabel}
              selectedLicencee={selectedLicencee}
              loadingTopPerforming={loadingTopPerforming}
              onRefresh={handleRefresh}
              isChangingDateFilter={false}
            />
          </div>

          {/* PC layout for medium screens and up */}
          <div className="hidden md:block">
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
              setTopPerformingData={(data: TopPerformingData[]) => setTopPerformingData(data as unknown as TopPerformingData)}
              setActiveMetricsFilter={setActiveMetricsFilter}
              setActivePieChartFilter={setActivePieChartFilter}
              renderCustomizedLabel={renderCustomizedLabel}
              selectedLicencee={selectedLicencee}
              loadingTopPerforming={loadingTopPerforming}
              onRefresh={handleRefresh}
            />
          </div>

        {/* Floating Refresh Button */}
        <AnimatePresence>
          {showFloatingRefresh && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <motion.button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-button text-container p-3 rounded-full shadow-lg hover:bg-buttonActive transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RefreshCw
                  className={`w-6 h-6 ${refreshing ? "animate-spin" : ""}`}
                />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
    </PageLayout>
  );
}
