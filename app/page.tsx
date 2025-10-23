"use client";

import PageLayout from "@/components/layout/PageLayout";
import MobileLayout from "@/components/layout/MobileLayout";
import PcLayout from "@/components/layout/PcLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageErrorBoundary from "@/components/ui/errors/PageErrorBoundary";

import { useCallback, useEffect, useRef } from "react";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { TimePeriod } from "@/shared/types/common";
import { useCurrency } from "@/lib/contexts/CurrencyContext";
import { FloatingRefreshButton } from "@/components/ui/FloatingRefreshButton";
import { PieChartLabelRenderer } from "@/components/ui/PieChartLabelRenderer";

import {
  loadGamingLocations,
  fetchMetricsData,
  fetchTopPerformingDataHelper,
} from "@/lib/helpers/dashboard";
import { CustomizedLabelProps } from "@/lib/types/componentProps";
import { DashboardTotals, TopPerformingData } from "@/lib/types";

// Custom hooks
import {
  useDashboardFilters,
  useDashboardRefresh,
  useDashboardScroll,
} from "@/lib/hooks/data";
import { useGlobalErrorHandler } from "@/lib/hooks/data/useGlobalErrorHandler";

/**
 * Dashboard Page Component
 * Main dashboard page with protected route and responsive layouts
 */
export default function Home() {
  return (
    <ProtectedRoute requiredPage="dashboard">
      <PageErrorBoundary>
        <DashboardContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}

/**
 * Dashboard Content Component
 * Client-side component that manages dashboard state and data fetching
 * Uses Zustand store for state management and responsive layouts
 */
function DashboardContent() {
  const { handleApiCallWithRetry } = useGlobalErrorHandler();
  const { displayCurrency } = useCurrency();

  // Create a stable reference to prevent infinite loops
  const stableHandleApiCallWithRetry = useCallback(handleApiCallWithRetry, [
    handleApiCallWithRetry,
  ]);
  const {
    loadingChartData,
    setLoadingChartData,
    loadingTopPerforming,
    setLoadingTopPerforming,
    activeFilters,
    setActiveFilters,
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
    topPerformingData,
    setTopPerformingData,
    pieChartSortIsOpen,
    setPieChartSortIsOpen,
  } = useDashBoardStore();

  // To compare new totals with previous ones.
  const prevTotals = useRef<DashboardTotals | null>(null);

  // Custom hooks for dashboard functionality
  const {
    activeMetricsFilter,
    activePieChartFilter,
    customDateRange,
    setActiveMetricsFilter,
    setActivePieChartFilter,
    setShowDatePicker,
  } = useDashboardFilters({ selectedLicencee });

  const { showFloatingRefresh } = useDashboardScroll();

  const { refreshing, handleRefresh } = useDashboardRefresh({
    selectedLicencee,
    activeMetricsFilter,
    activePieChartFilter,
    customDateRange,
    activeTab,
    displayCurrency, // ✅ ADDED: Pass currency to refresh hook
  });

  // Initialize selected licensee on component mount - removed to prevent infinite loop
  // The selectedLicencee is already initialized in the store

  // Fetch metrics and locations data when filters change
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingChartData(true);

      // Wrap API calls with error handling
      await stableHandleApiCallWithRetry(
        () => loadGamingLocations(setGamingLocations, selectedLicencee),
        "Dashboard Locations"
      );

      if (activeMetricsFilter) {
        await stableHandleApiCallWithRetry(
          () =>
            fetchMetricsData(
              activeMetricsFilter as TimePeriod,
              customDateRange || { startDate: new Date(), endDate: new Date() },
              selectedLicencee,
              setTotals,
              setChartData,
              setActiveFilters,
              setShowDatePicker,
              displayCurrency
            ),
          "Dashboard Metrics"
        );
      }

      setLoadingChartData(false);
    };
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeMetricsFilter,
    selectedLicencee,
    customDateRange,
    displayCurrency, // ✅ ADDED: Re-fetch when currency changes
    stableHandleApiCallWithRetry,
  ]);

  // Fetch top performing data when tab or filter changes
  useEffect(() => {
    // Fetch top performing data whenever we have a valid filter
    if (activePieChartFilter) {
      stableHandleApiCallWithRetry(
        () =>
          fetchTopPerformingDataHelper(
            activeTab,
            (activePieChartFilter || "Today") as TimePeriod,
            (data: TopPerformingData[]) =>
              setTopPerformingData(data as unknown as TopPerformingData),
            setLoadingTopPerforming
          ),
        "Dashboard Top Performing Data"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activePieChartFilter, stableHandleApiCallWithRetry]);

  // Handle custom date range changes separately
  useEffect(() => {
    if (activeMetricsFilter && customDateRange) {
      const fetchCustomMetrics = async () => {
        setLoadingChartData(true);

        await stableHandleApiCallWithRetry(
          () =>
            fetchMetricsData(
              activeMetricsFilter as TimePeriod,
              customDateRange,
              selectedLicencee,
              setTotals,
              setChartData,
              setActiveFilters,
              setShowDatePicker,
              displayCurrency
            ),
          "Dashboard Custom Metrics"
        );

        setLoadingChartData(false);
      };
      fetchCustomMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customDateRange,
    activeMetricsFilter,
    selectedLicencee,
    displayCurrency, // ✅ ADDED: Re-fetch when currency changes
    stableHandleApiCallWithRetry,
  ]);

  // Update previous totals reference when new data arrives
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

  // Note: Scroll handling and refresh functionality are now managed by custom hooks

  // Render function for pie chart labels
  const renderCustomizedLabel = (props: CustomizedLabelProps) => {
    return <PieChartLabelRenderer props={props} />;
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
      {/* Mobile Layout Section: Responsive layout for small screens */}
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
          activeMetricsFilter={activeMetricsFilter as TimePeriod}
          activePieChartFilter={(activePieChartFilter || "Today") as TimePeriod}
          topPerformingData={topPerformingData}
          setLoadingChartData={setLoadingChartData}
          setRefreshing={() => {}}
          setActiveFilters={setActiveFilters}
          setActiveTab={setActiveTab}
          setTotals={setTotals}
          setChartData={setChartData}
          setPieChartSortIsOpen={setPieChartSortIsOpen}
          setTopPerformingData={(data: TopPerformingData[]) =>
            setTopPerformingData(data as unknown as TopPerformingData)
          }
          setActiveMetricsFilter={setActiveMetricsFilter}
          setActivePieChartFilter={setActivePieChartFilter}
          renderCustomizedLabel={renderCustomizedLabel}
          selectedLicencee={selectedLicencee}
          loadingTopPerforming={loadingTopPerforming}
          onRefresh={handleRefresh}
          isChangingDateFilter={false}
        />
      </div>

      {/* Desktop Layout Section: Responsive layout for medium screens and up */}
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
          activeMetricsFilter={activeMetricsFilter as TimePeriod}
          activePieChartFilter={(activePieChartFilter || "Today") as TimePeriod}
          topPerformingData={topPerformingData}
          setLoadingChartData={setLoadingChartData}
          setRefreshing={() => {}}
          setActiveFilters={setActiveFilters}
          setActiveTab={setActiveTab}
          setTotals={setTotals}
          setChartData={setChartData}
          setPieChartSortIsOpen={setPieChartSortIsOpen}
          setTopPerformingData={(data: TopPerformingData[]) =>
            setTopPerformingData(data as unknown as TopPerformingData)
          }
          setActiveMetricsFilter={setActiveMetricsFilter}
          setActivePieChartFilter={setActivePieChartFilter}
          renderCustomizedLabel={renderCustomizedLabel}
          selectedLicencee={selectedLicencee}
          loadingTopPerforming={loadingTopPerforming}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Floating Action Button Section: Scroll-triggered refresh button */}
      <FloatingRefreshButton
        show={showFloatingRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </PageLayout>
  );
}
