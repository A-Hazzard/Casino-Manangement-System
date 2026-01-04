/**
 * Dashboard Page Content component
 * Handles all state management and data fetching for the dashboard page.
 *
 * Features:
 * - Financial metrics overview
 * - Responsive layout switching (Mobile vs Desktop)
 * - Real-time data refresh
 * - Date filtering synchronization
 */
'use client';

import DashboardDesktopLayout from '@/components/dashboard/DashboardDesktopLayout';
import DashboardMobileLayout from '@/components/dashboard/DashboardMobileLayout';
import PageLayout from '@/components/layout/PageLayout';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { PieChartLabelRenderer } from '@/components/ui/PieChartLabelRenderer';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import {
  fetchMetricsData,
  fetchTopPerformingDataHelper,
  loadGamingLocations,
} from '@/lib/helpers/dashboard';
import {
  useDashboardFilters,
  useDashboardRefresh,
  useDashboardScroll,
} from '@/lib/hooks/data';
import { useGlobalErrorHandler } from '@/lib/hooks/data/useGlobalErrorHandler';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { DashboardTotals, TopPerformingData } from '@/lib/types';
import { CustomizedLabelProps } from '@/lib/types/componentProps';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { TimePeriod, type ChartGranularity } from '@/shared/types/common';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Dashboard Page Content Component
 */
export default function DashboardPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
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
    sortBy,
    setSortBy,
  } = useDashBoardStore();

  const prevTotals = useRef<DashboardTotals | null>(null);
  const prevFetchParams = useRef<string>('');
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

  const { showFloatingRefresh } = useDashboardScroll();

  const { refreshing, handleRefresh } = useDashboardRefresh({
    selectedLicencee,
    activeMetricsFilter,
    activePieChartFilter: activeMetricsFilter,
    customDateRange,
    activeTab,
    displayCurrency,
  });

  // ============================================================================
  // Computed Values & Memoization
  // ============================================================================
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
        return hoursDiff <= 24;
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    return false;
  }, [activeMetricsFilter, customDateRange]);

  const isAdminUser = useMemo(
    () =>
      Boolean(
        user?.roles?.some(role => role === 'admin' || role === 'developer')
      ),
    [user]
  );

  const effectiveDateRange = useMemo(
    () => ({
      startDate:
        customDateRange?.startDate || new Date(new Date().setHours(0, 0, 0, 0)),
      endDate:
        customDateRange?.endDate ||
        new Date(new Date().setHours(23, 59, 59, 999)),
    }),
    [customDateRange]
  );

  const dateRangeKey = useMemo(
    () =>
      `${effectiveDateRange.startDate.getTime()}-${effectiveDateRange.endDate.getTime()}`,
    [effectiveDateRange]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Recalculates default chart granularity when date filters change.
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

  /**
   * Fetches metrics data (totals, chart) and gaming locations.
   */
  useEffect(() => {
    if (!activeMetricsFilter) return;

    const currentDateRangeKey = dateRangeKey;
    const fetchKey = `${activeMetricsFilter}-${selectedLicencee}-${currentDateRangeKey}-${displayCurrency}-${isAdminUser}-${chartGranularity}`;

    if (prevFetchParams.current === fetchKey) {
      setLoadingChartData(false);
      return;
    }

    const fetchMetrics = async () => {
      setLoadingChartData(true);
      fetchInProgressRef.current = true;

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

        if (metricsResult !== null) {
          prevFetchParams.current = fetchKey;
        }
      } catch (error) {
        prevFetchParams.current = '';
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        fetchInProgressRef.current = false;
        setLoadingChartData(false);
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
    setActiveFilters,
    setShowDatePicker,
    setLoadingChartData,
  ]);

  /**
   * Fetches top performing data.
   */
  useEffect(() => {
    if (!activeMetricsFilter) return;

    const effectiveTab = activeTab || 'Cabinets';
    const topPerformingKey = `top-performing-${effectiveTab}-${activeMetricsFilter}-${selectedLicencee}-${dateRangeKey}-${displayCurrency}`;

    if (prevTopPerformingKeyRef.current === topPerformingKey) return;

    const fetchTopPerforming = async () => {
      setLoadingTopPerforming(true);
      try {
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
      } finally {
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
   */
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

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const renderCustomizedLabel = useCallback(
    (props: CustomizedLabelProps) => <PieChartLabelRenderer props={props} />,
    []
  );

  // ============================================================================
  // Render
  // ============================================================================
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
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <DashboardMobileLayout
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
          setTopPerformingData={setTopPerformingData}
          setActiveMetricsFilter={setActiveMetricsFilter}
          setActivePieChartFilter={setActiveMetricsFilter}
          renderCustomizedLabel={renderCustomizedLabel}
          selectedLicencee={selectedLicencee}
          setSelectedLicencee={setSelectedLicencee}
          loadingTopPerforming={loadingTopPerforming}
          hasTopPerformingFetched={hasTopPerformingFetchedRef.current}
          onRefresh={handleRefresh}
          isChangingDateFilter={false}
          chartGranularity={chartGranularity}
          setChartGranularity={setChartGranularity}
          showGranularitySelector={showGranularitySelector}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DashboardDesktopLayout
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
          setTopPerformingData={setTopPerformingData}
          setActiveMetricsFilter={setActiveMetricsFilter}
          setActivePieChartFilter={setActiveMetricsFilter}
          renderCustomizedLabel={renderCustomizedLabel}
          selectedLicencee={selectedLicencee}
          setSelectedLicencee={setSelectedLicencee}
          loadingTopPerforming={loadingTopPerforming}
          hasTopPerformingFetched={hasTopPerformingFetchedRef.current}
          onRefresh={handleRefresh}
          chartGranularity={chartGranularity}
          setChartGranularity={setChartGranularity}
          showGranularitySelector={showGranularitySelector}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </div>

      <FloatingActionButtons
        showRefresh={showFloatingRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </PageLayout>
  );
}
