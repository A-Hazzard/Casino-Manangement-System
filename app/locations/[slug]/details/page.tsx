/**
 * Location Details Page
 *
 * Displays detailed information about a specific location including metrics and cabinets.
 *
 * Features:
 * - Location information display
 * - Financial metrics summary
 * - Cabinet listing with filtering and sorting
 * - Accounting details
 * - Responsive design for mobile and desktop
 */

'use client';

import PageLayout from '@/components/layout/PageLayout';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import AccountingDetails from '@/components/cabinetDetails/AccountingDetails';
import { CabinetContentDisplay } from '@/components/cabinets/CabinetContentDisplay';
import LocationInfoSkeleton from '@/components/location/LocationInfoSkeleton';
import MetricsSummary from '@/components/locationDetails/MetricsSummary';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { Button } from '@/components/ui/button';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import CurrencyValueWithOverflow from '@/components/ui/CurrencyValueWithOverflow';
import RefreshButton from '@/components/ui/RefreshButton';
import {
  fetchAllGamingLocations,
  fetchCabinets,
  fetchLocationDetails,
  fetchLocationDetailsById,
} from '@/lib/helpers/locations';
import { useCabinetSorting } from '@/lib/hooks/data';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { ExtendedCabinetDetail, LocationInfo } from '@/lib/types/pages';
import { formatCurrency } from '@/lib/utils';
import { calculateCabinetFinancialTotals } from '@/lib/utils/financial';
import { getFinancialColorClass } from '@/lib/utils/financialColors';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
// import type { GamingMachine } from "@/shared/types/entities";

/**
 * Location Details Page Component
 * Handles all state management and data fetching for the location details page
 */
export default function LocationDetailsPage() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const {
    selectedLicencee,
    activeMetricsFilter,
    setSelectedLicencee,
  } = useDashBoardStore();

  const { formatAmount, shouldShowCurrency, displayCurrency } =
    useCurrencyFormat();
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // ============================================================================
  // State Management
  // ============================================================================
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [cabinets, setCabinets] = useState<ExtendedCabinetDetail[]>([]);
  const [allCabinets, setAllCabinets] = useState<ExtendedCabinetDetail[]>([]); // Store all cabinets for totals calculation
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCabinets, setFilteredCabinets] = useState<
    ExtendedCabinetDetail[]
  >([]);
  const [activeMetricsTabContent, setActiveMetricsTabContent] =
    useState('Range Metrics');
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [selectedCabinet, setSelectedCabinet] =
    useState<ExtendedCabinetDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);

  // Calculate financial totals from all cabinets (not just paginated ones)
  const locationFinancialTotals = useMemo(() => {
    return calculateCabinetFinancialTotals(allCabinets);
  }, [allCabinets]);

  // Calculate machine status from all cabinets
  const machineStatus = useMemo(() => {
    const total = allCabinets.length;
    const online = allCabinets.filter(cabinet => {
      if (!cabinet.lastActivity) return false;
      const lastActive = new Date(cabinet.lastActivity);
      const now = new Date();
      const minutesSinceLastActivity = (now.getTime() - lastActive.getTime()) / (1000 * 60);
      return minutesSinceLastActivity <= 3;
    }).length;
    const offline = total - online;
    return { total, online, offline };
  }, [allCabinets]);

  // ============================================================================
  // Constants
  // ============================================================================
  const itemsPerPage = 10;

  // Use the same sorting hook as the cabinets page
  const {
    sortOrder,
    sortOption,
    currentPage,
    paginatedCabinets,
    totalPages,
    handleColumnSort,
    setCurrentPage,
    transformCabinet,
  } = useCabinetSorting({
    filteredCabinets,
    itemsPerPage,
  });

  // Update selected cabinet when paginated cabinets change
  useEffect(() => {
    if (paginatedCabinets.length > 0 && !selectedCabinet) {
      setSelectedCabinet(paginatedCabinets[0]);
    }
  }, [paginatedCabinets, selectedCabinet]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  // Handle cabinet updates
  const handleCabinetUpdated = () => {
    // Refresh the data when a cabinet is updated
    handleRefresh();
  };

  // Edit and delete handlers - accept Machine type from CabinetContentDisplay
  const handleEdit = (
    cabinet: ExtendedCabinetDetail | ReturnType<typeof transformCabinet>
  ) => {
    // Find the original cabinet from allCabinets to ensure we have all ExtendedCabinetDetail properties
    const originalCabinet = allCabinets.find(c => c._id === cabinet._id);
    if (originalCabinet) {
      openEditModal(originalCabinet);
    }
  };

  const handleDelete = (
    cabinet: ExtendedCabinetDetail | ReturnType<typeof transformCabinet>
  ) => {
    // Find the original cabinet from allCabinets to ensure we have all ExtendedCabinetDetail properties
    const originalCabinet = allCabinets.find(c => c._id === cabinet._id);
    if (originalCabinet) {
      openDeleteModal(originalCabinet);
    }
  };

  // Effect to handle licensee changes - refetch locations and update selection
  useEffect(() => {
    const handleLicenceeChange = async () => {
      try {
        // Check if current location exists for the new licensee by fetching location details
        const locationData = await fetchLocationDetailsById(
          slug,
          selectedLicencee
        );

        // If location data is null or the name is the slug (fallback), it means the location doesn't exist for this licensee
        if (!locationData.data || locationData.name === slug) {
          // Try to get the first available location for this licensee
          const formattedLocations =
            await fetchAllGamingLocations(selectedLicencee);

          if (formattedLocations.length > 0) {
            // Current location doesn't belong to new licensee, redirect to first available
            const firstLocation = formattedLocations[0];
            router.replace(`/locations/${firstLocation.id}/details`);
          } else {
            // No locations for this licensee, clear cabinets
            setCabinets([]);
            setFilteredCabinets([]);
            setSelectedCabinet(null);
          }
        }
      } catch (error) {
        console.error('Error handling licencee change:', error);
      }
    };

    // Only run if we have a licensee selected
    if (selectedLicencee) {
      handleLicenceeChange();
    }
  }, [selectedLicencee, router, slug]);

  // Use helpers to fetch data
  useEffect(() => {
    // Only proceed if we have a valid activeMetricsFilter - no fallback
    if (!activeMetricsFilter) {
      console.warn(
        '⚠️ No activeMetricsFilter available in location details, skipping data fetch'
      );
      setCabinets([]);
      setFilteredCabinets([]);
      setSelectedCabinet(null);
      setMetricsLoading(false);
      return;
    }

    setMetricsLoading(true);

    const initializePage = async () => {
      try {
        // Fetch location details and cabinets in parallel
        const [location, cabinets] = await Promise.all([
          fetchLocationDetails(slug, selectedLicencee, displayCurrency),
          fetchCabinets(
            slug,
            activeMetricsFilter,
            selectedLicencee,
            displayCurrency
          ),
        ]);

        if (location) setLocationInfo(location);
        setCabinets(cabinets);
        setAllCabinets(cabinets); // Store all cabinets for totals calculation

        // Don't pre-sort here - let the sorted useMemo handle it based on sortOption/sortOrder
        // This ensures the sort state is the single source of truth
        setFilteredCabinets(cabinets);
        setCurrentPage(0); // Reset to first page when data loads
      } catch (error) {
        console.error('Error initializing page:', error);
        // Set empty arrays on error to prevent loading states
        setCabinets([]);
        setFilteredCabinets([]);
        setSelectedCabinet(null);
      } finally {
        setMetricsLoading(false);
      }
    };

    initializePage();
  }, [slug, activeMetricsFilter, selectedLicencee, displayCurrency, setCurrentPage]);

  // Add refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    setMetricsLoading(true);
    try {
      // Only proceed if we have a valid activeMetricsFilter - no fallback
      if (!activeMetricsFilter) {
        console.warn(
          '⚠️ No activeMetricsFilter available during refresh in location details, skipping data fetch'
        );
        setCabinets([]);
        setFilteredCabinets([]);
        setSelectedCabinet(null);
        setMetricsLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch location details and cabinets in parallel
      const [location, cabinets] = await Promise.all([
        fetchLocationDetails(slug, selectedLicencee, displayCurrency),
        fetchCabinets(
          slug,
          activeMetricsFilter,
          selectedLicencee,
          displayCurrency
        ),
      ]);

      if (location) setLocationInfo(location);
      setCabinets(cabinets);
      setAllCabinets(cabinets); // Store all cabinets for totals calculation
      setFilteredCabinets(cabinets);
      setCurrentPage(0); // Reset to first page when refreshing
    } catch (error) {
      console.error('Error refreshing data:', error);
      // Set empty arrays on error to prevent loading states
      setCabinets([]);
      setFilteredCabinets([]);
      setSelectedCabinet(null);
    } finally {
      setMetricsLoading(false);
      setRefreshing(false);
    }
  };

  // Handle scroll to show/hide floating refresh button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setShowFloatingRefresh(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Utility function for proper alphabetical and numerical sorting
  // Handle search filtering - just filter, don't sort (sorting is handled by sorted useMemo)
  useEffect(() => {
    if (!searchTerm.trim()) {
      // When search is cleared, show all cabinets (they will be sorted by the sorted useMemo)
      setFilteredCabinets(cabinets);
      setCurrentPage(0); // Reset to first page when clearing search
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = cabinets.filter(cabinet => {
        const cabinetRecord = cabinet as Record<string, unknown>;
        // Check custom.name (lowercase - primary per schema) first, then Custom.name (uppercase - legacy fallback)
        const customName =
          (
            (cabinetRecord.custom as Record<string, unknown>)?.name ||
            (cabinetRecord.Custom as Record<string, unknown>)?.name
          )
            ?.toString()
            .toLowerCase() || '';

        const cabinetId = String(cabinet._id || '').toLowerCase();
        return (
          cabinet.assetNumber?.toLowerCase().includes(searchLower) ||
          cabinet.smbId?.toLowerCase().includes(searchLower) ||
          cabinet.serialNumber?.toLowerCase().includes(searchLower) ||
          cabinet.game?.toLowerCase().includes(searchLower) ||
          cabinet.locationName?.toLowerCase().includes(searchLower) ||
          customName.includes(searchLower) ||
          cabinetId.includes(searchLower)
        );
      });

      // Don't sort here - let the sorted useMemo handle it based on current sortOption/sortOrder
      setFilteredCabinets(filtered);
      setCurrentPage(0); // Reset to first page when searching
    }
  }, [searchTerm, cabinets, setCurrentPage]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <EditCabinetModal onCabinetUpdated={handleCabinetUpdated} />
      <DeleteCabinetModal />

      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: metricsLoading || refreshing,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 p-4 md:p-6 w-full max-w-full overflow-x-hidden"
        showToaster={false}
      >
        <div className="mb-6 flex items-center">
          <Link href="/locations" className="mr-4">
            <Button
              variant="ghost"
              className="rounded-full border border-gray-200 p-2 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Location Details</h1>
          <div className="ml-auto">
            <RefreshButton
              onClick={handleRefresh}
              isSyncing={refreshing}
              disabled={metricsLoading || refreshing}
              label="Refresh"
            />
          </div>
        </div>

        {/* Date Filters and Machine Status */}
        <div className="mb-6">
          <div className="mb-3">
            <DashboardDateFilters
              hideAllTime={false}
              onCustomRangeGo={handleRefresh}
              disabled={metricsLoading || refreshing}
              enableTimeInputs={false}
              mode="desktop"
              showIndicatorOnly={true}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 flex items-center">
              <DashboardDateFilters
                hideAllTime={false}
                onCustomRangeGo={handleRefresh}
                disabled={metricsLoading || refreshing}
                enableTimeInputs={false}
                mode="desktop"
                hideIndicator={true}
              />
            </div>
            <div className="w-auto flex-shrink-0 flex items-center">
              <MachineStatusWidget
                isLoading={metricsLoading}
                onlineCount={machineStatus.online}
                offlineCount={machineStatus.offline}
                totalCount={machineStatus.total}
                showTotal={true}
              />
            </div>
          </div>
        </div>

        {locationInfo ? (
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <h2 className="mb-4 text-lg font-semibold">
                  Location Information
                </h2>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Name:</span>{' '}
                    {locationInfo.name}
                  </p>
                  <p>
                    <span className="font-medium">Address:</span>{' '}
                    {locationInfo.address || '-'}
                  </p>
                  <p>
                    <span className="font-medium">Licensee:</span>{' '}
                    {locationInfo.licencee || '-'}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-semibold">Metrics</h2>
                <div className="grid grid-cols-1 gap-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Total Cabinets</p>
                    <p className="text-lg font-semibold">
                      {cabinets?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Money In</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationFinancialTotals?.moneyIn || 0
                      )}`}
                    >
                      {shouldShowCurrency()
                        ? formatAmount(
                            locationFinancialTotals?.moneyIn || 0,
                            displayCurrency
                          )
                        : formatCurrency(locationFinancialTotals?.moneyIn || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Money Out</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationFinancialTotals?.moneyOut || 0
                      )}`}
                    >
                      {shouldShowCurrency()
                        ? formatAmount(
                            locationFinancialTotals?.moneyOut || 0,
                            displayCurrency
                          )
                        : formatCurrency(
                            locationFinancialTotals?.moneyOut || 0
                          )}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-semibold">Performance</h2>
                <div className="grid grid-cols-1 gap-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Gross</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationFinancialTotals?.gross || 0
                      )}`}
                    >
                      <CurrencyValueWithOverflow
                        value={locationFinancialTotals?.gross || 0}
                        formatCurrencyFn={formatCurrency}
                      />
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Net</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationInfo.net
                      )}`}
                    >
                      <CurrencyValueWithOverflow
                        value={locationInfo.net || 0}
                        formatCurrencyFn={formatCurrency}
                      />
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-semibold">Cabinet Status</h2>
                <div className="grid grid-cols-1 gap-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Online Cabinets</p>
                    <p className="text-lg font-semibold">
                      {cabinets?.filter(cabinet => cabinet.isOnline).length ||
                        0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Offline Cabinets</p>
                    <p className="text-lg font-semibold">
                      {cabinets?.filter(cabinet => !cabinet.isOnline).length ||
                        0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!locationInfo && <LocationInfoSkeleton />}

        {!locationInfo && (
          <MetricsSummary location={locationInfo} cabinets={cabinets} />
        )}
        {/* Search and Filter Bar */}
        <div className="mt-4 flex items-center gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4">
          <div className="relative min-w-0 max-w-md flex-1">
            <input
              type="text"
              placeholder="Search machines..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Cabinet Table and Cards - Using same component as cabinets page */}
        <CabinetContentDisplay
          paginatedCabinets={paginatedCabinets}
          filteredCabinets={filteredCabinets}
          allCabinets={allCabinets}
          initialLoading={false}
          loading={metricsLoading}
          error={null}
          sortOption={sortOption}
          sortOrder={sortOrder}
          currentPage={currentPage}
          totalPages={totalPages}
          onSort={handleColumnSort}
          onPageChange={setCurrentPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRetry={handleRefresh}
          transformCabinet={transformCabinet}
          selectedLicencee={selectedLicencee}
        />

        {selectedCabinet && (
          <AccountingDetails
            cabinet={selectedCabinet}
            loading={metricsLoading}
            activeMetricsTabContent={activeMetricsTabContent}
            setActiveMetricsTabContent={setActiveMetricsTabContent}
            activeMetricsFilter="All Time"
          />
        )}

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
                className="rounded-full bg-button p-3 text-container shadow-lg transition-colors duration-200 hover:bg-buttonActive disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RefreshCw
                  className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`}
                />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </PageLayout>
    </>
  );
}
