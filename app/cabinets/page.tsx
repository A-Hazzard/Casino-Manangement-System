/**
 * Cabinets Page
 *
 * Main page for managing cabinets/machines with multiple sections and filtering.
 *
 * Features:
 * - Cabinets section: View, create, edit, and delete cabinets
 * - Movement Requests section: Manage cabinet movement requests
 * - SMIB Management section: Manage SMIB devices
 * - Firmware section: Manage SMIB firmware
 * - Search and filter capabilities
 * - Batch-based pagination for performance
 * - Responsive design for mobile and desktop
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import Image from 'next/image';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

// Modal components
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { NewCabinetModal } from '@/components/ui/cabinets/NewCabinetModal';
import UploadSmibDataModal from '@/components/ui/firmware/UploadSmibDataModal';
import NewMovementRequestModal from '@/components/ui/movements/NewMovementRequestModal';

// Section components
import CabinetsNavigation from '@/components/cabinets/CabinetsNavigation';
import MovementRequests from '@/components/cabinets/MovementRequests';
import SMIBManagementTab from '@/components/cabinets/SMIBManagementTab';
import SMIBFirmwareSection from '@/components/ui/firmware/SMIBFirmwareSection';

// New extracted components
import { CabinetActions } from '@/components/cabinets/CabinetActions';
import { CabinetContentDisplay } from '@/components/cabinets/CabinetContentDisplay';
import { CabinetSearchFilters } from '@/components/cabinets/CabinetSearchFilters';

// UI components
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import { CabinetTableSkeleton } from '@/components/ui/cabinets/CabinetSkeletonLoader';
import Chart from '@/components/ui/dashboard/Chart';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { RefreshCw } from 'lucide-react';

// Custom hooks
import { IMAGES } from '@/lib/constants/images';
import { getMetrics } from '@/lib/helpers/metrics';
import {
  useCabinetData,
  useCabinetSorting,
  useLocationMachineStats,
} from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import type { TimePeriod } from '@/shared/types';

// Configuration
const CABINET_TABS_CONFIG: {
  id: 'cabinets' | 'movement' | 'smib' | 'firmware';
  label: string;
  icon: string;
}[] = [
  { id: 'cabinets', label: 'Cabinets', icon: '🎰' },
  { id: 'movement', label: 'Movement Requests', icon: '🔄' },
  { id: 'smib', label: 'SMIB Management', icon: '🧩' },
  { id: 'firmware', label: 'Firmware', icon: '🛠️' },
];

/**
 * Cabinets Page Content Component
 * Handles all state management and data fetching for the page
 */
function CabinetsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const {
    activeMetricsFilter,
    selectedLicencee,
    setSelectedLicencee,
    customDateRange,
    displayCurrency,
    setChartData,
    setLoadingChartData,
    setTotals: setFinancialTotals,
  } = useDashBoardStore();

  const { user } = useUserStore();
  const [activeSection, setActiveSection] = useState<
    'cabinets' | 'movement' | 'smib' | 'firmware'
  >('cabinets');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [smibRefreshTrigger, setSmibRefreshTrigger] = useState(0);
  const [movementRefreshTrigger, setMovementRefreshTrigger] = useState(0);
  const [firmwareRefreshTrigger, setFirmwareRefreshTrigger] = useState(0);
  const [isNewMovementRequestModalOpen, setIsNewMovementRequestModalOpen] =
    useState(false);
  const [isUploadSmibDataModalOpen, setIsUploadSmibDataModalOpen] =
    useState(false);

  const closeUploadSmibDataModal = () => {
    setIsUploadSmibDataModalOpen(false);
  };

  // Chart granularity state
  // Initialize after activeMetricsFilter and customDateRange are available
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    'hourly'
  );

  // ============================================================================
  // Data Fetching Hooks
  // ============================================================================
  const {
    allCabinets,
    filteredCabinets,
    loading,
    error,
    locations,
    gameTypes,
    financialTotals: hookFinancialTotals,
    metricsTotals,
    initialLoading,
    metricsTotalsLoading,
    loadCabinets,
  } = useCabinetData({
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    searchTerm,
  });

  const {
    sortOption,
    sortOrder,
    handleColumnSort,
    currentPage,
    totalPages,
    setCurrentPage,
    paginatedCabinets,
    transformCabinet,
  } = useCabinetSorting({
    filteredCabinets,
    itemsPerPage: 10,
    useBatchPagination: true,
  });

  // Get machine stats for all locations (no locationId specified)
  const { machineStats, machineStatsLoading } = useLocationMachineStats();

  // ============================================================================
  // Chart Data & Metrics
  // ============================================================================
  const makeRequest = useAbortableRequest();
  const [localChartData, setLocalChartData] = useState<
    Array<{ day: string; time: string; drop: number; gross: number }>
  >([]);
  const [loadingChartData, setLoadingChartDataLocal] = useState(false);
  const chartRequestIdRef = useRef(0);

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

  // Track if filters are initialized (similar to location page pattern)
  // This prevents premature requests before dependencies are ready
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Initialize filters flag - wait until activeMetricsFilter is available
  // This ensures dependencies are stable before making the first request
  useEffect(() => {
    if (activeMetricsFilter && !filtersInitialized) {
      setFiltersInitialized(true);
    }
  }, [activeMetricsFilter, filtersInitialized]);

  // Load initial data on mount and when filters change
  useEffect(() => {
    // Skip if filters are not yet initialized
    if (!filtersInitialized || !activeMetricsFilter) {
      return;
    }

    // Load cabinets when filters change
    loadCabinets();
  }, [
    filtersInitialized,
    activeMetricsFilter,
    selectedLicencee,
    customDateRange,
    displayCurrency,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    loadCabinets,
  ]);

  // Fetch chart data and metrics totals
  useEffect(() => {
    if (!activeMetricsFilter || !filtersInitialized) {
      return;
    }

    if (
      activeMetricsFilter === 'Custom' &&
      (!customDateRange?.startDate || !customDateRange?.endDate)
    ) {
      return;
    }

    const fetchChartAndMetrics = async () => {
      chartRequestIdRef.current += 1;
      const reqId = chartRequestIdRef.current;
      setLoadingChartDataLocal(true);
      setLoadingChartData(true);

      try {
        await makeRequest(async (signal: AbortSignal) => {
          const metricsData = await getMetrics(
            activeMetricsFilter as TimePeriod,
            customDateRange?.startDate,
            customDateRange?.endDate,
            selectedLicencee,
            displayCurrency,
            signal,
            chartGranularity === 'minute' ? 'minute' : 'hourly'
          );

          if (reqId !== chartRequestIdRef.current) return;
          // Check if request was aborted (returns empty array)
          if (!metricsData || metricsData.length === 0) {
            setLocalChartData([]);
            setChartData([]);
            return;
          }
          // Convert dashboardData[] to chart format
          const chartDataFormatted = metricsData.map(item => ({
            day: item.day || '',
            time: item.time || '',
            drop: item.moneyIn || 0,
            gross: item.gross || 0,
          }));
          setLocalChartData(chartDataFormatted);
          setChartData(
            chartDataFormatted.map(item => ({
              xValue: item.time || item.day,
              day: item.day,
              time: item.time,
              moneyIn: item.drop,
              moneyOut: 0,
              gross: item.gross,
            }))
          );
        }, 'chart');
      } catch (error) {
        if (reqId !== chartRequestIdRef.current) return;
        console.error('Error fetching chart and metrics data:', error);
        setLocalChartData([]);
        setChartData([]);
      } finally {
        if (reqId !== chartRequestIdRef.current) return;
        setLoadingChartDataLocal(false);
        setLoadingChartData(false);
      }
    };

    fetchChartAndMetrics();
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    chartGranularity,
    filtersInitialized,
    makeRequest,
    setChartData,
    setLoadingChartData,
    setFinancialTotals,
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleSectionChange = (
    section: 'cabinets' | 'movement' | 'smib' | 'firmware'
  ) => {
    setActiveSection(section);
  };

  const openNewMovementRequestModal = () => {
    setIsNewMovementRequestModalOpen(true);
  };

  const closeNewMovementRequestModal = () => {
    setIsNewMovementRequestModalOpen(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      if (activeSection === 'cabinets') {
        // Refresh cabinets data
        await loadCabinets();

        // Refresh chart data
        if (
          activeMetricsFilter === 'Custom' &&
          (!customDateRange?.startDate || !customDateRange?.endDate)
        ) {
          // Skip chart refresh until valid dates are present
        } else {
          setLoadingChartDataLocal(true);
          setLoadingChartData(true);
          chartRequestIdRef.current += 1;
          const reqId = chartRequestIdRef.current;
          try {
            await makeRequest(async (signal: AbortSignal) => {
              const metricsData = await getMetrics(
                activeMetricsFilter as TimePeriod,
                customDateRange?.startDate,
                customDateRange?.endDate,
                selectedLicencee,
                displayCurrency,
                signal,
                chartGranularity === 'minute' ? 'minute' : 'hourly'
              );

              if (reqId !== chartRequestIdRef.current) return;
              // Check if request was aborted (returns empty array)
              if (!metricsData || metricsData.length === 0) {
                setLocalChartData([]);
                setChartData([]);
                return;
              }
              // Convert dashboardData[] to chart format
              const chartDataFormatted = metricsData.map(item => ({
                day: item.day || '',
                time: item.time || '',
                drop: item.moneyIn || 0,
                gross: item.gross || 0,
              }));
              setLocalChartData(chartDataFormatted);
              setChartData(
                chartDataFormatted.map(item => ({
                  xValue: item.time || item.day,
                  day: item.day,
                  time: item.time,
                  moneyIn: item.drop,
                  moneyOut: 0,
                  gross: item.gross,
                }))
              );
            }, 'chart');
          } catch (error) {
            console.error('Error refreshing chart data:', error);
            setLocalChartData([]);
            setChartData([]);
          } finally {
            if (reqId !== chartRequestIdRef.current) return;
            setLoadingChartDataLocal(false);
            setLoadingChartData(false);
          }
        }
      } else if (activeSection === 'movement') {
        setMovementRefreshTrigger(prev => prev + 1);
      } else if (activeSection === 'smib') {
        setSmibRefreshTrigger(prev => prev + 1);
      } else if (activeSection === 'firmware') {
        setFirmwareRefreshTrigger(prev => prev + 1);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleMovementRequestSubmit = () => {
    loadCabinets();
    setMovementRefreshTrigger(prev => prev + 1);
    closeNewMovementRequestModal();
  };

  // Location change handler
  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  // Game type change handler
  const handleGameTypeChange = (gameType: string) => {
    setSelectedGameType(gameType);
  };

  // Sort change handler
  const handleSortChange = (_option: string, _order: 'asc' | 'desc') => {
    // This will be handled by the useCabinetSorting hook
  };

  // ============================================================================
  // Early Returns
  // ============================================================================
  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);

  if (showNoLicenseeMessage) {
    return (
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Modal Components */}
      <EditCabinetModal onCabinetUpdated={loadCabinets} />
      <DeleteCabinetModal onCabinetDeleted={loadCabinets} />
      <NewCabinetModal
        locations={locations}
        currentLocationName={
          selectedLocation !== 'all'
            ? locations.find(location => location._id === selectedLocation)
                ?.name
            : undefined
        }
        onCreated={loadCabinets}
      />
      <NewMovementRequestModal
        isOpen={isNewMovementRequestModalOpen}
        onClose={closeNewMovementRequestModal}
        locations={locations}
        onSubmit={handleMovementRequestSubmit}
        onRefresh={loadCabinets}
      />
      <UploadSmibDataModal
        isOpen={isUploadSmibDataModalOpen}
        onClose={closeUploadSmibDataModal}
        onRefresh={loadCabinets}
      />

      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        {/* Mobile-friendly header layout */}
        <div className="mt-4 w-full max-w-full">
          {/* Mobile Layout - All on same line */}
          <div className="mb-4 flex items-center gap-2 md:hidden">
            <h1 className="flex min-w-0 flex-1 items-center gap-2 truncate text-2xl font-bold text-gray-800">
              Cabinets
              <Image
                src={IMAGES.cabinetsIcon}
                alt="Cabinet Icon"
                width={40}
                height={40}
                className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6"
              />
            </h1>
            {/* Refresh icon */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            {/* Create icon */}
            {loading ? (
              <div className="h-4 w-4 flex-shrink-0" />
            ) : (
              <CabinetActions
                activeSection={activeSection}
                selectedLocation={selectedLocation}
                locations={locations}
                onMovementRequestClick={openNewMovementRequestModal}
                onCabinetCreated={loadCabinets}
                onCabinetUpdated={loadCabinets}
                onCabinetDeleted={loadCabinets}
                loading={loading}
              />
            )}
          </div>

          {/* Desktop Layout - Title and actions on same row */}
          <div className="mb-4 hidden items-center justify-between md:flex">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800 sm:text-3xl">
              Cabinets
              <Image
                src={IMAGES.cabinetsIcon}
                alt="Cabinet Icon"
                width={32}
                height={32}
                className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
              />
            </h1>
            {/* Desktop: Refresh icon and Create button on far right */}
            <div className="flex items-center gap-2">
              {/* Refresh icon */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>
              <CabinetActions
                activeSection={activeSection}
                selectedLocation={selectedLocation}
                locations={locations}
                onMovementRequestClick={openNewMovementRequestModal}
                onCabinetCreated={loadCabinets}
                onCabinetUpdated={loadCabinets}
                onCabinetDeleted={loadCabinets}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="mb-4 mt-6">
          <CabinetsNavigation
            tabs={CABINET_TABS_CONFIG}
            activeSection={activeSection}
            onChange={handleSectionChange}
          />
        </div>

        {/* Financial Metrics Cards - Only show on cabinets section */}
        {activeSection === 'cabinets' && (
          <>
            <FinancialMetricsCards
              totals={metricsTotals || hookFinancialTotals}
              loading={loading || metricsTotalsLoading}
              title="Total for all Machines"
              className="mb-4 mt-4"
            />

            {/* Chart - Only show on cabinets section */}
            <div className="mb-4">
              {/* Granularity Selector - Only show for Today/Yesterday */}
              {showGranularitySelector && (
                <div className="mb-3 flex items-center justify-end gap-2">
                  <label
                    htmlFor="chart-granularity"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Granularity:
                  </label>
                  <select
                    id="chart-granularity"
                    value={chartGranularity}
                    onChange={e =>
                      setChartGranularity(e.target.value as 'hourly' | 'minute')
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="minute">Minute</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              )}
              <Chart
                loadingChartData={loadingChartData}
                chartData={localChartData.map(item => ({
                  xValue: item.time || item.day,
                  day: item.day,
                  time: item.time,
                  moneyIn: item.drop,
                  moneyOut: 0,
                  gross: item.gross,
                }))}
                activeMetricsFilter={activeMetricsFilter as TimePeriod}
              />
            </div>
          </>
        )}

        {/* Date Filters and Machine Status - Only show on cabinets section */}
        {activeSection === 'cabinets' && (
          <div className="mb-2 mt-4">
            <div className="mb-3 md:hidden">
              <DashboardDateFilters
                hideAllTime={true}
                onCustomRangeGo={loadCabinets}
                enableTimeInputs={true}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="hidden min-w-0 flex-1 items-center md:flex">
                <DashboardDateFilters
                  hideAllTime={true}
                  onCustomRangeGo={loadCabinets}
                  enableTimeInputs={true}
                />
              </div>
              <div className="flex w-auto flex-shrink-0 items-center">
                <MachineStatusWidget
                  isLoading={machineStatsLoading}
                  onlineCount={machineStats?.onlineMachines || 0}
                  offlineCount={machineStats?.offlineMachines || 0}
                  totalCount={machineStats?.totalMachines}
                  showTotal={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters - Only show on cabinets section */}
        {activeSection === 'cabinets' && (
          <CabinetSearchFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedLocation={selectedLocation}
            locations={locations}
            onLocationChange={handleLocationChange}
            showLocationFilter={true}
            selectedGameType={selectedGameType}
            gameTypes={gameTypes}
            onGameTypeChange={handleGameTypeChange}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            sortOption={sortOption}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            activeSection={activeSection}
          />
        )}

        {/* Section Content */}
        {activeSection === 'cabinets' ? (
          <CabinetContentDisplay
            paginatedCabinets={paginatedCabinets}
            filteredCabinets={filteredCabinets}
            allCabinets={allCabinets}
            initialLoading={initialLoading}
            loading={loading}
            error={error}
            sortOption={sortOption}
            sortOrder={sortOrder}
            currentPage={currentPage}
            totalPages={totalPages}
            onSort={handleColumnSort}
            onPageChange={setCurrentPage}
            onEdit={_cabinet => {
              // Edit functionality is handled by the CabinetActions component
            }}
            onDelete={_cabinet => {
              // Delete functionality is handled by the CabinetActions component
            }}
            onRetry={loadCabinets}
            transformCabinet={transformCabinet}
            selectedLicencee={selectedLicencee}
          />
        ) : activeSection === 'smib' ? (
          <SMIBManagementTab refreshTrigger={smibRefreshTrigger} />
        ) : activeSection === 'movement' ? (
          <MovementRequests
            locations={locations}
            refreshTrigger={movementRefreshTrigger}
          />
        ) : activeSection === 'firmware' ? (
          <SMIBFirmwareSection refreshTrigger={firmwareRefreshTrigger} />
        ) : (
          <SMIBManagementTab refreshTrigger={smibRefreshTrigger} />
        )}
      </PageLayout>
    </>
  );
}

/**
 * Cabinets Page Component
 * Thin wrapper that handles routing and authentication
 */
export default function CabinetsPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <Suspense fallback={<CabinetTableSkeleton />}>
        <CabinetsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
