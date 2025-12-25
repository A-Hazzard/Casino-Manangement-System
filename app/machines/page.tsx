/**
 * Machines/Cabinets Page
 *
 * Main page for managing machines/cabinets with multiple sections and filtering.
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
import Image from 'next/image';
import { Suspense, useState, useCallback, useMemo } from 'react';

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
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import { CabinetTableSkeleton } from '@/components/ui/cabinets/CabinetSkeletonLoader';

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

// Utils
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';

// Constants and types
import { CABINET_TABS_CONFIG } from '@/lib/constants/cabinets';
import { IMAGES } from '@/lib/constants/images';
// Removed unused Cabinet type import

/**
 * Machines/Cabinets Page Content Component
 * Handles all state management and data fetching for the machines/cabinets page
 */
function CabinetsPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  const { displayCurrency } = useCurrencyFormat();

  // ============================================================================
  // Custom Hooks
  // ============================================================================
  const {
    isNewMovementRequestModalOpen,
    isUploadSmibDataModalOpen,
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

  const user = useUserStore(state => state.user);

  // ============================================================================
  // Computed Values
  // ============================================================================
  // Check if current user is a developer
  const isDeveloper = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(role => 
      typeof role === 'string' && role.toLowerCase() === 'developer'
    );
  }, [user?.roles]);

  const {
    allCabinets,
    filteredCabinets: rawFilteredCabinets,
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

  // Filter out test cabinets (unless developer)
  const filteredCabinets = useMemo(() => {
    if (isDeveloper) {
      return rawFilteredCabinets; // Developers can see all cabinets including test ones
    }
    const testPattern = /^test/i;
    return rawFilteredCabinets.filter(cabinet => {
      const name = cabinet.custom?.name?.trim() || '';
      const serialNumber = getSerialNumberIdentifier(cabinet)?.trim() || '';
      return !testPattern.test(name) && !testPattern.test(serialNumber);
    });
  }, [rawFilteredCabinets, isDeveloper]);

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
    itemsPerPage: 10,
  });

  const { activeSection, handleSectionChange } = useCabinetNavigation();

  // ============================================================================
  // State Management
  // ============================================================================
  const [movementRefreshTrigger, setMovementRefreshTrigger] = useState(0);
  const [smibRefreshTrigger, setSmibRefreshTrigger] = useState(0);
  const [firmwareRefreshTrigger, setFirmwareRefreshTrigger] = useState(0);

  // ============================================================================
  // Computed Values - UI State
  // ============================================================================
  const showLocationFilter =
    new Set(locations.map(location => String(location._id ?? ''))).size > 1;

  // Note: Modal handlers are now managed by useCabinetModals hook

  // Note: Upload modal handler is now managed by useCabinetModals hook

  const handleMovementRequestSubmit = () => {
    // Only refresh if on cabinets or movement section
    if (activeSection === 'cabinets' || activeSection === 'movement') {
      loadCabinets();
    }
    closeNewMovementRequestModal();
  };

  // Context-aware refresh handler based on active section
  const handleRefresh = useCallback(async () => {
    if (activeSection === 'cabinets') {
      await loadCabinets();
    } else if (activeSection === 'movement') {
      setMovementRefreshTrigger(prev => prev + 1);
    } else if (activeSection === 'smib') {
      setSmibRefreshTrigger(prev => prev + 1);
    } else if (activeSection === 'firmware') {
      setFirmwareRefreshTrigger(prev => prev + 1);
    }
  }, [activeSection, loadCabinets]);

  // Location change handler
  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  // Game type change handler
  const handleGameTypeChange = (gameType: string) => {
    setSelectedGameType(gameType);
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================
  // Sort change handler
  const handleSortChange = () => {
    // This will be handled by the useCabinetSorting hook
    // Sort logic is managed by the hook
  };

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
        onRefresh={handleRefresh}
      />
      <UploadSmibDataModal
        isOpen={isUploadSmibDataModalOpen}
        onClose={closeUploadSmibDataModal}
        onRefresh={handleRefresh}
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
        {/* Page Header */}
        <div className="mt-4 flex w-full max-w-full items-center justify-between">
          <div className="flex w-full items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              Cabinets
            </h1>
            <Image
              src={IMAGES.cabinetsIcon}
              alt="Cabinet Icon"
              width={32}
              height={32}
              className="ml-2 h-6 w-6 sm:h-8 sm:w-8"
            />
          </div>

          {/* Desktop Action Buttons */}
          <CabinetActions
            activeSection={activeSection}
            selectedLocation={selectedLocation}
            locations={locations}
            onMovementRequestClick={() => {}}
            onCabinetCreated={loadCabinets}
            onCabinetUpdated={loadCabinets}
            onCabinetDeleted={loadCabinets}
          />
        </div>

        {/* Section Navigation */}
        <div className="mb-6 mt-8">
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
            className="mt-6"
          />
        )}

        {/* Date Filters - Only show on cabinets section */}
        {activeSection === 'cabinets' && (
          <div className="mb-0 mt-4 flex items-center justify-between gap-4">
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
            onRetry={loadCabinets}
            transformCabinet={transformCabinet}
            selectedLicencee={selectedLicencee}
          />
        ) : activeSection === 'smib' ? (
          <SMIBManagementTab refreshTrigger={smibRefreshTrigger} />
        ) : activeSection === 'movement' ? (
          <MovementRequests locations={locations} refreshTrigger={movementRefreshTrigger} />
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
