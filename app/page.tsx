/**
 * Dashboard Page
 *
 * Main dashboard page displaying key metrics, charts, and top-performing locations.
 *
 * Features:
 * - Financial metrics overview (totals, charts)
 * - Top-performing locations
 * - Gaming locations listing
 * - Date filtering (Today, Yesterday, Week, Month, All Time, Custom)
 * - Currency conversion for multi-licensee views
 * - Responsive design for mobile and desktop
 * - Real-time data refresh
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MobileLayout from '@/components/layout/MobileLayout';
import PageLayout from '@/components/layout/PageLayout';
import PcLayout from '@/components/layout/PcLayout';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';

import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { PieChartLabelRenderer } from '@/components/ui/PieChartLabelRenderer';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { TimePeriod, type ChartGranularity } from '@/shared/types/common';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchMetricsData,
  fetchTopPerformingDataHelper,
  loadGamingLocations,
} from '@/lib/helpers/dashboard';
import { DashboardTotals, TopPerformingData } from '@/lib/types';
import { CustomizedLabelProps } from '@/lib/types/componentProps';

// Custom hooks
import {
  useDashboardFilters,
  useDashboardRefresh,
  useDashboardScroll,
} from '@/lib/hooks/data';
import { useGlobalErrorHandler } from '@/lib/hooks/data/useGlobalErrorHandler';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useUserStore } from '@/lib/store/userStore';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';

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
 *
 * Client-side component that manages dashboard state and data fetching.
 * Uses Zustand store for state management and responsive layouts.
 */
function DashboardContent() {
  const { handleApiCallWithRetry } = useGlobalErrorHandler();
  const { displayCurrency } = useCurrency();
  const user = useUserStore(state => state.user);

  const makeMetricsRequest = useAbortableRequest();
  const makeTopPerformingRequest = useAbortableRequest();

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

  const prevTotals = useRef<DashboardTotals | null>(null);
  const prevFetchParams = useRef<string>('');
  const hasInitialFetchRef = useRef(false);
  const hasTopPerformingFetchedRef = useRef(false);
  const prevTopPerformingKeyRef = useRef<string>('');
  const fetchInProgressRef = useRef(false);
  const {
    activeMetricsFilter,
    customDateRange,
    setActiveMetricsFilter,
    setShowDatePicker,
  } = useDashboardFilters({ selectedLicencee });

  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>(
    () =>
      getDefaultChartGranularity(
        activeMetricsFilter || 'Today',
        customDateRange?.startDate,
        customDateRange?.endDate
      ) as ChartGranularity
  );

  /**
   * Determines whether to show the granularity selector.
   * Shown for Today/Yesterday periods, or Custom periods spanning ≤ 1 gaming day.
   */
  const showGranularitySelector = useMemo(() => {
    if (
      activeMetricsFilter === 'Today' ||
      activeMetricsFilter === 'Yesterday'
    ) {
      return true;
    }
    if (
      activeMetricsFilter === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
      // Check if spans more than 1 gaming day
      try {
        const range = getGamingDayRangeForPeriod(
          'Custom',
          8,
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate),
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate)
        );
        const hoursDiff =
          (range.rangeEnd.getTime() - range.rangeStart.getTime()) /
          (1000 * 60 * 60);
        // Only show granularity selector if the custom range is ≤ 24 hours
        return hoursDiff <= 24;
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    // Don't show granularity selector for other filter types
    return false;
  }, [activeMetricsFilter, customDateRange]);

  /**
   * Recalculates default chart granularity when date filters change.
   * For "Today" filter, recalculates periodically as time passes.
   */
  useEffect(() => {
    if (!activeMetricsFilter) return undefined;

    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        activeMetricsFilter,
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    updateGranularity();

    if (activeMetricsFilter === 'Today') {
      const interval = setInterval(updateGranularity, 60000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  const { showFloatingRefresh } = useDashboardScroll();

  const { refreshing, handleRefresh } = useDashboardRefresh({
    selectedLicencee,
    activeMetricsFilter,
    activePieChartFilter: activeMetricsFilter,
    customDateRange,
    activeTab,
    displayCurrency,
  });

  const isAdminUser = Boolean(
    user?.roles?.some(role => role === 'admin' || role === 'developer')
  );

  const defaultDateRange = useMemo(
    () => ({
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    }),
    []
  );

  /**
   * Creates a stable string representation of the date range for dependency comparison.
   * Prevents re-renders when object reference changes but dates are the same.
   */
  const dateRangeKey = useMemo(() => {
    const range = customDateRange || defaultDateRange;
    if (!range?.startDate || !range?.endDate) return '';
    return `${range.startDate.getTime()}-${range.endDate.getTime()}`;
  }, [customDateRange, defaultDateRange]);

  const effectiveDateRange = useMemo(() => {
    return customDateRange || defaultDateRange;
  }, [customDateRange, defaultDateRange]);

  /**
   * Fetches metrics data (totals, chart) and gaming locations when filters change.
   * Handles loading states and prevents duplicate API calls using fetch key tracking.
   */
  useEffect(() => {
    if (!activeMetricsFilter) {
      return;
    }

    const currentDateRangeKey = dateRangeKey;
    const fetchKey = `${activeMetricsFilter}-${selectedLicencee}-${currentDateRangeKey}-${displayCurrency}-${isAdminUser}-${chartGranularity}`;

    setLoadingChartData(true);
    fetchInProgressRef.current = true;

    // If we've already fetched data with these exact parameters, skip the fetch
    if (prevFetchParams.current === fetchKey) {
      setTimeout(() => {
        // Always clear loading state if we've already fetched with these parameters
        // Chart component will check totals to determine if skeleton should be shown
        useDashBoardStore.getState().setLoadingChartData(false);
      }, 0);
      return;
    }

    const fetchMetrics = async () => {
      try {
        await stableHandleApiCallWithRetry(
          () =>
            loadGamingLocations(setGamingLocations, selectedLicencee, {
              forceAll: isAdminUser || selectedLicencee === 'all',
            }),
          'Dashboard Locations'
        );

        const metricsResult = await makeMetricsRequest(async signal => {
          await fetchMetricsData(
            activeMetricsFilter as TimePeriod,
            effectiveDateRange,
            selectedLicencee,
            setTotals,
            setChartData,
            setActiveFilters,
            setShowDatePicker,
            displayCurrency,
            signal,
            chartGranularity === 'minute' ? 'minute' : 'hourly'
          );
        });

        // If the request was aborted (e.g., user changed filters quickly), don't update state
        if (metricsResult === null) {
          fetchInProgressRef.current = false;
          setLoadingChartData(false);
          return;
        }

        prevFetchParams.current = fetchKey;
        hasInitialFetchRef.current = true;
        fetchInProgressRef.current = false;
        setLoadingChartData(false);
      } catch (error) {
        prevFetchParams.current = '';
        hasInitialFetchRef.current = true;
        fetchInProgressRef.current = false;
        setLoadingChartData(false);
        setLoadingTopPerforming(false);
        throw error;
      }
    };

    fetchMetrics();
  }, [
    activeMetricsFilter,
    selectedLicencee,
    dateRangeKey,
    effectiveDateRange,
    displayCurrency,
    isAdminUser,
    stableHandleApiCallWithRetry,
    makeMetricsRequest,
    chartGranularity,
    setGamingLocations,
    setTotals,
    setChartData,
    setLoadingTopPerforming,
    setActiveFilters,
    setShowDatePicker,
    setLoadingChartData,
  ]);

  /**
   * Fetches top performing data when tab or filters change.
   * Separate from metrics data to allow independent loading states.
   */
  useEffect(() => {
    // Don't fetch if there's no active metrics filter selected
    if (!activeMetricsFilter) {
      return;
    }

    const effectiveTab = activeTab || 'Cabinets';
    const topPerformingKey = `top-performing-${effectiveTab}-${activeMetricsFilter}-${selectedLicencee}-${dateRangeKey}-${displayCurrency}`;

    // If we've already fetched top performing data with these exact parameters, skip the fetch
    if (prevTopPerformingKeyRef.current === topPerformingKey) {
      return;
    }

    const fetchTopPerforming = async () => {
      try {
        setLoadingTopPerforming(true);
        await makeTopPerformingRequest(async signal => {
          await fetchTopPerformingDataHelper(
            effectiveTab,
            activeMetricsFilter as TimePeriod,
            (data: TopPerformingData) => {
              setTopPerformingData(data);
              hasTopPerformingFetchedRef.current = true;
              prevTopPerformingKeyRef.current = topPerformingKey;
            },
            setLoadingTopPerforming,
            selectedLicencee,
            displayCurrency,
            signal,
            effectiveDateRange
          );
        });
      } catch (error) {
        console.error('Error fetching top performing data:', error);
        setLoadingTopPerforming(false);
      }
    };

    fetchTopPerforming();
  }, [
    activeTab,
    activeMetricsFilter,
    selectedLicencee,
    dateRangeKey,
    effectiveDateRange,
    displayCurrency,
    makeTopPerformingRequest,
    setTopPerformingData,
    setLoadingTopPerforming,
  ]);

  /**
   * Updates previous totals reference when new data arrives.
   * Used to detect when totals have actually changed.
   */
  useEffect(() => {
    // Only update prevTotals if we have new totals and they're different from previous
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

  /**
   * Custom renderer for pie chart labels.
   * Wraps the PieChartLabelRenderer component.
   */
  const renderCustomizedLabel = (props: CustomizedLabelProps) => {
    return <PieChartLabelRenderer props={props} />;
  };

  // If user has no licensee assigned, show the "No Licensee Assigned" message
  if (shouldShowNoLicenseeMessage(user)) {
    return <NoLicenseeAssigned />;
  }

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
      {/* Mobile Layout - Show mobile layout on screens smaller than md breakpoint */}
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
          activePieChartFilter={(activeMetricsFilter || 'Today') as TimePeriod}
          topPerformingData={topPerformingData}
          setLoadingChartData={setLoadingChartData}
          setRefreshing={() => {}}
          setActiveFilters={setActiveFilters}
          setActiveTab={setActiveTab}
          setTotals={setTotals}
          setChartData={setChartData}
          setPieChartSortIsOpen={setPieChartSortIsOpen}
          setTopPerformingData={(data: TopPerformingData) =>
            setTopPerformingData(data)
          }
          setActiveMetricsFilter={setActiveMetricsFilter}
          setActivePieChartFilter={setActiveMetricsFilter}
          renderCustomizedLabel={renderCustomizedLabel}
          selectedLicencee={selectedLicencee}
          loadingTopPerforming={loadingTopPerforming}
          hasTopPerformingFetched={hasTopPerformingFetchedRef.current}
          onRefresh={handleRefresh}
          isChangingDateFilter={false}
          chartGranularity={chartGranularity}
          setChartGranularity={setChartGranularity}
          showGranularitySelector={showGranularitySelector}
        />
      </div>

      {/* Desktop/Tablet Layout - Show desktop layout on md breakpoint and larger */}
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
          activePieChartFilter={(activeMetricsFilter || 'Today') as TimePeriod}
          topPerformingData={topPerformingData}
          setLoadingChartData={setLoadingChartData}
          setRefreshing={() => {}}
          setActiveFilters={setActiveFilters}
          setActiveTab={setActiveTab}
          setTotals={setTotals}
          setChartData={setChartData}
          setPieChartSortIsOpen={setPieChartSortIsOpen}
          setTopPerformingData={(data: TopPerformingData) =>
            setTopPerformingData(data)
          }
          setActiveMetricsFilter={setActiveMetricsFilter}
          setActivePieChartFilter={setActiveMetricsFilter}
          renderCustomizedLabel={renderCustomizedLabel}
          selectedLicencee={selectedLicencee}
          loadingTopPerforming={loadingTopPerforming}
          hasTopPerformingFetched={hasTopPerformingFetchedRef.current}
          onRefresh={handleRefresh}
          chartGranularity={chartGranularity}
          setChartGranularity={setChartGranularity}
          showGranularitySelector={showGranularitySelector}
        />
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        showRefresh={showFloatingRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </PageLayout>
  );
}
