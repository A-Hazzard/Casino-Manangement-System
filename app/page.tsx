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
import { useCallback, useEffect, useMemo, useRef } from 'react';

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

  // ============================================================================
  // Custom Hooks
  // ============================================================================
  const {
    activeMetricsFilter,
    customDateRange,
    setActiveMetricsFilter,
    setShowDatePicker,
  } = useDashboardFilters({ selectedLicencee });

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
    const fetchKey = `${activeMetricsFilter}-${selectedLicencee}-${dateRangeKey}-${displayCurrency}-${isAdminUser}`;

    // Skip if this exact fetch was already triggered
    if (prevFetchParams.current === fetchKey) {
      return;
    }

    // Update the previous fetch params
    prevFetchParams.current = fetchKey;

    const fetchMetrics = async () => {
      setLoadingChartData(true);

      try {
        // Wrap API calls with error handling
        await stableHandleApiCallWithRetry(
          () =>
            loadGamingLocations(setGamingLocations, selectedLicencee, {
              forceAll: isAdminUser || selectedLicencee === 'all',
            }),
          'Dashboard Locations'
        );

        await makeMetricsRequest(
          async signal => {
            await fetchMetricsData(
              activeMetricsFilter as TimePeriod,
              effectiveDateRange,
              selectedLicencee,
              setTotals,
              setChartData,
              setActiveFilters,
              setShowDatePicker,
              displayCurrency,
              signal
            );
          },
          `Dashboard Metrics (${activeMetricsFilter}, Licensee: ${selectedLicencee || 'all'})`
        );
      } finally {
        setLoadingChartData(false);
      }
    };

    fetchMetrics();
    // Note: We use dateRangeKey (string) instead of effectiveDateRange (object) in dependencies
    // to prevent re-runs when object reference changes but dates are the same.
    // Zustand setters are stable and don't need to be in dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeMetricsFilter,
    selectedLicencee,
    dateRangeKey, // String key - only changes when actual dates change
    displayCurrency,
    isAdminUser,
    stableHandleApiCallWithRetry,
    makeMetricsRequest,
  ]);

  // Track if we're in initial load phase for automatic fallback
  const isInitialLoadRef = useRef(true);
  const fallbackAttemptsRef = useRef<TimePeriod[]>([]);
  const isAutomaticFallbackRef = useRef(false);

  // Fetch top performing data when tab or filter changes
  // Use activeMetricsFilter instead of activePieChartFilter to sync with chart/metrics
  useEffect(() => {
    // Fetch top performing data whenever we have a valid filter
    if (!activeMetricsFilter) {
      return;
    }

    const currentFilter = (activeMetricsFilter || 'Today') as TimePeriod;

    // If this is not an automatic fallback and we're not in initial load, user manually changed filter
    if (!isAutomaticFallbackRef.current && !isInitialLoadRef.current) {
      // User manually changed filter, disable automatic fallbacks
      fallbackAttemptsRef.current = [];
    }

    makeTopPerformingRequest(
      async signal => {
        await fetchTopPerformingDataHelper(
          activeTab,
          currentFilter,
          (data: TopPerformingData) => {
            setTopPerformingData(data);

            // If no data and we're in initial load, try fallback periods
            if (
              isInitialLoadRef.current &&
              data.length === 0 &&
              !fallbackAttemptsRef.current.includes(currentFilter)
            ) {
              fallbackAttemptsRef.current.push(currentFilter);

              // Define fallback order: Today -> Yesterday -> 7d -> 30d
              const fallbackOrder: TimePeriod[] = [
                'Today',
                'Yesterday',
                '7d',
                '30d',
              ];
              const currentIndex = fallbackOrder.indexOf(currentFilter);
              const nextFallback = fallbackOrder[currentIndex + 1];

              if (
                nextFallback &&
                !fallbackAttemptsRef.current.includes(nextFallback)
              ) {
                // Automatically switch to next fallback period
                isAutomaticFallbackRef.current = true;
                setActiveMetricsFilter(nextFallback);
                // Reset flag after state update
                setTimeout(() => {
                  isAutomaticFallbackRef.current = false;
                }, 0);
              } else {
                // All fallbacks exhausted, mark initial load as complete
                isInitialLoadRef.current = false;
                isAutomaticFallbackRef.current = false;
              }
            } else if (data.length > 0) {
              // Data found, mark initial load as complete
              isInitialLoadRef.current = false;
              isAutomaticFallbackRef.current = false;
            }
          },
          setLoadingTopPerforming,
          selectedLicencee,
          displayCurrency,
          signal
        );
      },
      `Dashboard Top Performing (${activeTab}, ${currentFilter}, Licensee: ${selectedLicencee || 'all'})`
    );
    // Zustand setters are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    activeMetricsFilter, // Use activeMetricsFilter instead of activePieChartFilter
    selectedLicencee,
    displayCurrency,
    makeTopPerformingRequest,
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
          onRefresh={handleRefresh}
          isChangingDateFilter={false}
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
