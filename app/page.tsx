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
  // State - Chart Granularity
  // ============================================================================
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    'minute'
  );

  // ============================================================================
  // Refs
  // ============================================================================
  // To compare new totals with previous ones.
  const prevTotals = useRef<DashboardTotals | null>(null);
  // Track previous fetch parameters to prevent duplicate API calls
  const prevFetchParams = useRef<string>('');
  // Track if we've done an initial fetch to distinguish between "no data loaded" and "loaded but empty"
  const hasInitialFetchRef = useRef(false);

  // ============================================================================
  // Custom Hooks
  // ============================================================================
  const {
    activeMetricsFilter,
    customDateRange,
    setActiveMetricsFilter,
    setShowDatePicker,
  } = useDashboardFilters({ selectedLicencee });

  // Show granularity selector for Today/Yesterday/Custom
  const showGranularitySelector = useMemo(() => {
    return (
      activeMetricsFilter === 'Today' ||
      activeMetricsFilter === 'Yesterday' ||
      activeMetricsFilter === 'Custom'
    );
  }, [activeMetricsFilter]);

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
    // Include chartGranularity to trigger refetch when granularity changes
    const currentDateRangeKey = dateRangeKey;
    const fetchKey = `${activeMetricsFilter}-${selectedLicencee}-${currentDateRangeKey}-${displayCurrency}-${isAdminUser}-${chartGranularity}`;

    // Skip if this exact fetch was already triggered and completed
    if (prevFetchParams.current === fetchKey) {
      return;
    }

    // Set loading to true before starting fetch to show skeleton immediately
    setLoadingChartData(true);

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

        await makeMetricsRequest(async signal => {
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

        // Only update previous fetch params AFTER successful fetch
        // This ensures that if filters change while fetch is in progress, we can fetch again
        prevFetchParams.current = fetchKey;
        hasInitialFetchRef.current = true; // Mark that we've done at least one fetch

        // Set loading to false after a delay to ensure both totals and chartData state updates have propagated
        // This prevents the skeleton from disappearing before data is visible
        // The delay allows React to batch state updates and ensures both totals and chartData are set
        setTimeout(() => {
          setLoadingChartData(false);
        }, 200);
      } catch (error) {
        // On error, reset fetch key so we can retry
        prevFetchParams.current = '';
        hasInitialFetchRef.current = true; // Still mark as fetched even on error
        // Set loading to false on error as well, but after a brief delay
        setTimeout(() => {
          setLoadingChartData(false);
        }, 200);
        throw error;
      }
    };

    fetchMetrics();
    // Note: dateRangeKey is used in fetchKey, so it must be in dependencies
    // effectiveDateRange is also included to ensure effect runs when dates change
    // Zustand setters (setGamingLocations, setTotals, etc.) are stable and don't need to be in dependencies.
    // loadGamingLocations is a stable function import and doesn't need to be in dependencies.
    // makeMetricsRequest and stableHandleApiCallWithRetry are stable (from useCallback/useAbortableRequest).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeMetricsFilter,
    selectedLicencee,
    dateRangeKey, // Used in fetchKey - must be in dependencies
    effectiveDateRange, // Memoized - only changes when dates actually change
    displayCurrency,
    isAdminUser,
    stableHandleApiCallWithRetry,
    makeMetricsRequest,
    chartGranularity,
  ]);

  // Track if we're in initial load phase for automatic fallback
  const isInitialLoadRef = useRef(true);
  const fallbackAttemptsRef = useRef<TimePeriod[]>([]);
  const isAutomaticFallbackRef = useRef(false);
  const lastProcessedKeyRef = useRef<string>('');
  const hasTopPerformingFetchedRef = useRef(false);

  // Fetch top performing data when tab or filter changes
  // Use activeMetricsFilter instead of activePieChartFilter to sync with chart/metrics
  useEffect(() => {
    // Fetch top performing data whenever we have a valid filter
    if (!activeMetricsFilter) {
      return;
    }

    // Skip if we're in automatic fallback mode to prevent loops
    if (isAutomaticFallbackRef.current) {
      return;
    }

    // Create a unique key combining tab and filter to detect both changes
    const currentKey = `${activeTab}-${activeMetricsFilter}`;

    // Skip if we've already processed this exact combination
    // This prevents re-processing when the effect runs due to other dependency changes
    if (lastProcessedKeyRef.current === currentKey) {
      return;
    }

    const currentFilter = (activeMetricsFilter || 'Today') as TimePeriod;
    lastProcessedKeyRef.current = currentKey;

    // Reset fetch status when tab or filter changes to show skeleton during new fetch
    hasTopPerformingFetchedRef.current = false;

    // If this is not an automatic fallback and we're not in initial load, user manually changed filter
    if (!isAutomaticFallbackRef.current && !isInitialLoadRef.current) {
      // User manually changed filter, disable automatic fallbacks
      fallbackAttemptsRef.current = [];
    }

    // Set loading to true before starting fetch
    setLoadingTopPerforming(true);

    makeTopPerformingRequest(async signal => {
      await fetchTopPerformingDataHelper(
        activeTab,
        currentFilter,
        (data: TopPerformingData) => {
          setTopPerformingData(data);
          hasTopPerformingFetchedRef.current = true; // Mark that we've completed a fetch

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
              // Set flag BEFORE state update to prevent effect from running
              isAutomaticFallbackRef.current = true;
              lastProcessedKeyRef.current = ''; // Reset to allow processing of new filter
              setActiveMetricsFilter(nextFallback);
              // Reset flag after a delay to allow the new filter to load
              setTimeout(() => {
                isAutomaticFallbackRef.current = false;
              }, 500); // Increased delay to ensure state update completes
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
    });
  }, [
    activeTab,
    activeMetricsFilter,
    selectedLicencee,
    displayCurrency,
    makeTopPerformingRequest,
    setActiveMetricsFilter,
    setLoadingTopPerforming,
    setTopPerformingData,
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
