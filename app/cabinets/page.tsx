'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';

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
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { RefreshCw } from 'lucide-react';

// Custom hooks
import {
  useCabinetData,
  useCabinetFilters,
  useCabinetModals,
  useCabinetSorting,
} from '@/lib/hooks/data';
import { useCabinetNavigation } from '@/lib/hooks/navigation';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

// Store hooks
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';

// Utilities
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';

// Constants and types
import { CABINET_TABS_CONFIG } from '@/lib/constants/cabinets';
import { IMAGES } from '@/lib/constants/images';
// Removed unused Cabinet type import

function CabinetsPageContent() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  const user = useUserStore(state => state.user);

  const { displayCurrency } = useCurrencyFormat();

  // Custom hooks for cabinet functionality
  const {
    isNewMovementRequestModalOpen,
    isUploadSmibDataModalOpen,
    openNewMovementRequestModal,
    closeNewMovementRequestModal,
    closeUploadSmibDataModal,
  } = useCabinetModals();

  const {
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    setSearchTerm,
    setSelectedLocation,
    setSelectedGameType,
    setSelectedStatus,
  } = useCabinetFilters();

  // Custom hooks for data management
  const {
    allCabinets,
    filteredCabinets,
    locations,
    gameTypes,
    financialTotals,
    initialLoading,
    loading,
    error,
    loadCabinets,
  } = useCabinetData({
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    displayCurrency,
  });

  const showLocationFilter =
    new Set(locations.map(location => String(location._id ?? ''))).size > 1;

  const itemsPerPage = 10;
  const itemsPerBatch = 50;

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

  // Calculate which batch of 50 items we need (each batch covers 5 pages of 10 items)
  // Page 0-4 = batch 1, Page 5-9 = batch 2, etc.
  const calculateBatchNumber = (page: number) => {
    return Math.floor(page / (itemsPerBatch / itemsPerPage)) + 1;
  };

  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5 pages per batch

  // Track loaded batches to avoid refetching
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));

  // Load initial batch on mount and when filters change
  useEffect(() => {
    setLoadedBatches(new Set([1]));
    loadCabinets(1, itemsPerBatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    searchTerm,
  ]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);

    // Check if we're on the last page of the current batch
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      loadCabinets(nextBatch, itemsPerBatch);
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      loadCabinets(currentBatch, itemsPerBatch);
    }
  }, [
    currentPage,
    loading,
    loadCabinets,
    itemsPerBatch,
    pagesPerBatch,
    loadedBatches,
  ]);

  const { activeSection, handleSectionChange } = useCabinetNavigation();

  const [refreshing, setRefreshing] = useState(false);
  const [movementRefreshTrigger, setMovementRefreshTrigger] = useState(0);
  const [smibRefreshTrigger, setSmibRefreshTrigger] = useState(0);
  const [firmwareRefreshTrigger, setFirmwareRefreshTrigger] = useState(0);

  // Context-aware refresh handler based on active section
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeSection === 'cabinets') {
        await loadCabinets();
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
    setMovementRefreshTrigger(prev => prev + 1); // 🔧 FIX: Trigger movement requests refresh
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
    // Sort logic is managed by the hook
  };

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
        {/* <MaintenanceBanner /> */}
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
          <FinancialMetricsCards
            totals={financialTotals}
            loading={loading}
            title="Total for all Machines"
            className="mb-4 mt-4"
          />
        )}

        {/* Machine Statistics - Only show on cabinets section */}
        {activeSection === 'cabinets' && (
          <div className="mb-2 mt-4 flex items-center justify-end gap-4">
            <MachineStatusWidget
              isLoading={loading}
              onlineCount={allCabinets.filter(c => c.online === true).length}
              offlineCount={allCabinets.filter(c => c.online === false).length}
              totalCount={allCabinets.length}
              showTotal={true}
            />
          </div>
        )}

        {/* Date Filters - Only show on cabinets section */}
        {activeSection === 'cabinets' && (
          <div className="mb-2 mt-2 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DashboardDateFilters
                disabled={loading}
                hideAllTime={true}
                onCustomRangeGo={loadCabinets}
                enableTimeInputs={true}
              />
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
            showLocationFilter={showLocationFilter}
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

export default function CabinetsPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <Suspense fallback={<CabinetTableSkeleton />}>
        <CabinetsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
