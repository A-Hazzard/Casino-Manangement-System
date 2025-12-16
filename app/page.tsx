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

import { FloatingRefreshButton } from '@/components/ui/FloatingRefreshButton';
import { PieChartLabelRenderer } from '@/components/ui/PieChartLabelRenderer';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { TimePeriod } from '@/shared/types/common';
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
 * Client-side component that manages dashboard state and data fetching
 * Uses Zustand store for state management and responsive layouts
 */
function DashboardContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const { handleApiCallWithRetry } = useGlobalErrorHandler();
  const { displayCurrency } = useCurrency();
  const user = useUserStore(state => state.user);

  // AbortController for metrics and top performing queries
  const makeMetricsRequest = useAbortableRequest();
  const makeTopPerformingRequest = useAbortableRequest();

  // Create a stable reference to prevent infinite loops
  const stableHandleApiCallWithRetry = useCallback(handleApiCallWithRetry, [
    handleApiCallWithRetry,
  ]);

  // ============================================================================
  // State Management (Zustand Store)
  // ============================================================================
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

  // ============================================================================
  // Refs
  // ============================================================================
  // To compare new totals with previous ones.
  const prevTotals = useRef<DashboardTotals | null>(null);
  // Track previous fetch parameters to prevent duplicate API calls
  const prevFetchParams = useRef<string>('');
  // Track if we've done an initial fetch to distinguish between "no data loaded" and "loaded but empty"
  const hasInitialFetchRef = useRef(false);
  // Track if top-performing data has been fetched
  const hasTopPerformingFetchedRef = useRef(false);
  // Track previous top performing fetch key to prevent duplicates
  const prevTopPerformingKeyRef = useRef<string>('');
  // Track if we've started a fetch to distinguish between initial state and loading state
  const fetchInProgressRef = useRef(false);

  // ============================================================================
  // Custom Hooks
  // ============================================================================
  const {
    activeMetricsFilter,
    customDateRange,
    setActiveMetricsFilter,
    setShowDatePicker,
  } = useDashboardFilters({ selectedLicencee });

  // ============================================================================
  // State - Chart Granularity
  // ============================================================================
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    () =>
      getDefaultChartGranularity(
        activeMetricsFilter || 'Today',
        customDateRange?.startDate,
        customDateRange?.endDate
      )
  );

  // Show granularity selector for Today/Yesterday/Custom (only if Custom spans ≤ 1 gaming day)
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
          8, // Default gaming day start hour
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
        return hoursDiff <= 24; // Show toggle only if ≤ 24 hours
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    return false;
  }, [activeMetricsFilter, customDateRange]);

  // Recalculate default granularity when date filters change
  // For "Today", also recalculate periodically as time passes
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

    // Update immediately
    updateGranularity();

    // For "Today" filter, set up interval to recalculate every minute
    // This ensures granularity switches from 'minute' to 'hourly' when 5 hours pass
    if (activeMetricsFilter === 'Today') {
      const interval = setInterval(updateGranularity, 60000); // Every minute
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
    activePieChartFilter: activeMetricsFilter, // Sync with activeMetricsFilter
    customDateRange,
    activeTab,
    displayCurrency, // ✅ ADDED: Pass currency to refresh hook
  });

  // Initialize selected licensee on component mount - removed to prevent infinite loop
  // The selectedLicencee is already initialized in the store

  // ============================================================================
  // Computed Values
  // ============================================================================
  const isAdminUser = Boolean(
    user?.roles?.some(role => role === 'admin' || role === 'developer')
  );

  // Create a stable default date range to avoid creating new objects on every render
  const defaultDateRange = useMemo(
    () => ({
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    }),
    []
  );

  // Create a stable string representation of the date range for dependency comparison
  // This prevents re-renders when object reference changes but dates are the same
  const dateRangeKey = useMemo(() => {
    const range = customDateRange || defaultDateRange;
    if (!range?.startDate || !range?.endDate) return '';
    return `${range.startDate.getTime()}-${range.endDate.getTime()}`;
  }, [customDateRange, defaultDateRange]);

  // Memoize the effective date range - only recalculate when dates actually change
  const effectiveDateRange = useMemo(() => {
    return customDateRange || defaultDateRange;
  }, [customDateRange, defaultDateRange]);

  // ============================================================================
  // Effects - Data Fetching
  // ============================================================================

  // Fetch metrics and locations data when filters change
  useEffect(() => {
    // Skip if no active filter
    if (!activeMetricsFilter) {
      return;
    }

    // Create a unique key for this fetch to prevent duplicate calls
    // Use dateRangeKey (string) for comparison, but effectiveDateRange is in dependencies
    // Include chartGranularity to trigger refetch when it changes
    // NOTE: activeTab is NOT included - charts/cards should NOT refetch on tab change
    const currentDateRangeKey = dateRangeKey;
    const fetchKey = `${activeMetricsFilter}-${selectedLicencee}-${currentDateRangeKey}-${displayCurrency}-${isAdminUser}-${chartGranularity}`;

    // Set loading to true IMMEDIATELY when filters change to show skeleton
    // This must happen BEFORE the early return check to ensure skeleton shows even if fetch is skipped
    // Note: We DON'T clear totals/chartData here - let the Chart component handle showing skeleton
    // while loadingChartData is true. This prevents the "No Metrics Data" flash that happens
    // when totals is set before chartData, or when we clear data unnecessarily.
    setLoadingChartData(true);
    fetchInProgressRef.current = true;

    // Skip if this exact fetch was already triggered and completed
    // Note: We still set loading above so skeleton shows, but we won't refetch
    if (prevFetchParams.current === fetchKey) {
      // If we already have data for this fetch key, clear loading immediately
      // Otherwise, keep loading true until data arrives (handled by useEffect below)
      // Use a small timeout to check after state has propagated
      setTimeout(() => {
        const currentTotals = useDashBoardStore.getState().totals;
        const currentChartData = useDashBoardStore.getState().chartData;
        if (currentTotals && Array.isArray(currentChartData)) {
          useDashBoardStore.getState().setLoadingChartData(false);
        }
      }, 0);
      return;
    }

    const fetchMetrics = async () => {
      try {
        // Wrap API calls with error handling
        await stableHandleApiCallWithRetry(
          () =>
            loadGamingLocations(setGamingLocations, selectedLicencee, {
              forceAll: isAdminUser || selectedLicencee === 'all',
            }),
          'Dashboard Locations'
        );

        // Fetch metrics data (charts and cards) - NOT top performing data
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

        // If request was aborted, don't update state
        if (metricsResult === null) {
          fetchInProgressRef.current = false;
          setLoadingChartData(false);
          return;
        }

        // Only update previous fetch params AFTER successful fetch
        // This ensures that if filters change while fetch is in progress, we can fetch again
        prevFetchParams.current = fetchKey;
        hasInitialFetchRef.current = true; // Mark that we've done at least one fetch
        fetchInProgressRef.current = false; // Mark fetch as complete

        // The useEffect below was causing a bug where loading state would be cleared immediately
        // because it saw stale data from the previous fetch.
        // Now we explicitly clear loading state here, after we know the new data has been fetched.
        setLoadingChartData(false);

        // Store timeout ID for cleanup if needed (though this is in an async function, so cleanup is handled by component unmount)
      } catch (error) {
        // On error, reset fetch key so we can retry
        prevFetchParams.current = '';
        hasInitialFetchRef.current = true; // Still mark as fetched even on error
        fetchInProgressRef.current = false; // Mark fetch as complete (even on error)
        // Set loading to false on error immediately
        setLoadingChartData(false);
        setLoadingTopPerforming(false);
        throw error;
      }
    };

    fetchMetrics();
  }, [
    activeMetricsFilter,
    // activeTab removed - charts/cards should NOT refetch on tab change
    selectedLicencee,
    dateRangeKey,
    effectiveDateRange,
    displayCurrency,
    isAdminUser,
    stableHandleApiCallWithRetry,
    makeMetricsRequest,
    // makeTopPerformingRequest removed - top performing has separate useEffect
    chartGranularity,
    setGamingLocations,
    setTotals,
    setChartData,
    setLoadingTopPerforming,
    setActiveFilters,
    setShowDatePicker,
    setLoadingChartData,
    // setLoadingTopPerforming removed - top performing has separate useEffect
    // setTopPerformingData removed - top performing has separate useEffect
  ]);

  // Separate useEffect for top performing data - refetches when tab OR filters change
  useEffect(() => {
    // Skip if no active filter
    if (!activeMetricsFilter) {
      return;
    }

    const effectiveTab = activeTab || 'Cabinets';
    const topPerformingKey = `top-performing-${effectiveTab}-${activeMetricsFilter}-${selectedLicencee}-${dateRangeKey}-${displayCurrency}`;

    // Skip if this exact fetch was already triggered and completed
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

  // ============================================================================
  // Event Handlers & Computed Functions
  // ============================================================================
  // Render function for pie chart labels
  const renderCustomizedLabel = (props: CustomizedLabelProps) => {
    return <PieChartLabelRenderer props={props} />;
  };

  // ============================================================================
  // Early Returns
  // ============================================================================
  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  if (showNoLicenseeMessage) {
    return <NoLicenseeAssigned />;
  }

  // ============================================================================
  // Render
  // ============================================================================
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
      {/* <MaintenanceBanner /> */}
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

      {/* Desktop/Tablet Layout Section: md+ */}
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

      {/* Floating Action Button Section: Scroll-triggered refresh button */}
      <FloatingRefreshButton
        show={showFloatingRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </PageLayout>
  );
}
