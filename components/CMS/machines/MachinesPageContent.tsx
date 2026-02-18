/**
 * Machines Page Content Component
 * Handles all state management and data fetching for the machines/cabinets page.
 *
 * @module components/machines/MachinesPageContent
 */
'use client';

import { CabinetsActions } from '@/components/CMS/cabinets/CabinetsActions';
import { CabinetsCabinetContentDisplay } from '@/components/CMS/cabinets/CabinetsCabinetContentDisplay';
import { CabinetsCabinetSearchFilters } from '@/components/CMS/cabinets/CabinetsCabinetSearchFilters';
import CabinetsMovementRequests from '@/components/CMS/cabinets/CabinetsMovementRequests';
import CabinetsNavigation from '@/components/CMS/cabinets/CabinetsNavigation';
import CabinetsSMIBManagementTab from '@/components/CMS/cabinets/CabinetsSMIBManagementTab';
import CabinetsDeleteCabinetModal from '@/components/CMS/cabinets/modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from '@/components/CMS/cabinets/modals/CabinetsEditCabinetModal';
import CabinetsNewCabinetModal from '@/components/CMS/cabinets/modals/CabinetsNewCabinetModal';
import PageLayout from '@/components/shared/layout/PageLayout';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import FinancialMetricsCards from '@/components/shared/ui/FinancialMetricsCards';
import SMIBFirmwareSection from '@/components/shared/ui/firmware/SMIBFirmwareSection';
import UploadSmibDataModal from '@/components/shared/ui/firmware/UploadSmibDataModal';
import NewMovementRequestModal from '@/components/shared/ui/movements/NewMovementRequestModal';
import { CABINET_TABS_CONFIG, IMAGES } from '@/lib/constants';
import {
    useCabinetData,
    useCabinetFilters,
    useCabinetModals,
    useCabinetSorting,
} from '@/lib/hooks/data';
import { useCabinetNavigation } from '@/lib/hooks/navigation';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

export default function MachinesPageContent() {
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
  const user = useUserStore(state => state.user);

  // ============================================================================
  // State Management
  // ============================================================================
  const [movementRefreshTrigger, setMovementRefreshTrigger] = useState(0);
  const [smibRefreshTrigger, setSmibRefreshTrigger] = useState(0);
  const [firmwareRefreshTrigger, setFirmwareRefreshTrigger] = useState(0);

  // ============================================================================
  // Custom Hooks for Data & Logic
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

  const { activeSection, handleSectionChange } = useCabinetNavigation();

  // ============================================================================
  // Computed Values & Memoization
  // ============================================================================
  /**
   * Check if current user is a developer.
   */
  const isDeveloper = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(
      role => typeof role === 'string' && role.toLowerCase() === 'developer'
    );
  }, [user?.roles]);

  /**
   * Filters out test cabinets for non-developers.
   */
  const filteredCabinets = useMemo(() => {
    if (isDeveloper) return rawFilteredCabinets;
    
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

  const showLocationFilter =
    new Set(locations.map(location => String(location._id ?? ''))).size > 1;

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handles movement request submission and refreshes appropriate sections.
   */
  const handleMovementRequestSubmit = () => {
    if (activeSection === 'cabinets' || activeSection === 'movement') {
      loadCabinets();
    }
    closeNewMovementRequestModal();
  };

  /**
   * Context-aware refresh handler that refreshes data based on active section.
   */
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

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Modal Components */}
      <CabinetsEditCabinetModal onCabinetUpdated={handleRefresh} />
      <CabinetsDeleteCabinetModal onCabinetDeleted={handleRefresh} />
      <CabinetsNewCabinetModal
        locations={locations}
        currentLocationName={
          Array.isArray(selectedLocation)
            ? selectedLocation.length > 0 && selectedLocation[0] !== 'all'
              ? locations.find(l => String(l._id) === String(selectedLocation[0]))?.name
              : undefined
            : selectedLocation !== 'all'
              ? locations.find(l => String(l._id) === String(selectedLocation))?.name
              : undefined
        }
        onCreated={handleRefresh}
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
        onRefresh={handleRefresh}
        refreshing={loading}
      >
        {/* Page Header Area */}
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

          <CabinetsActions
            activeSection={activeSection}
            selectedLocation={selectedLocation}
            locations={locations}
            onMovementRequestClick={() => {}}
            onCabinetCreated={loadCabinets}
            onCabinetUpdated={loadCabinets}
            onCabinetDeleted={loadCabinets}
          />
        </div>

        {/* Tab-based Section Navigation */}
        <div className="mb-6 mt-8">
          <CabinetsNavigation
            tabs={CABINET_TABS_CONFIG}
            activeSection={activeSection}
            onChange={handleSectionChange}
          />
        </div>

        {/* ============================================================================
           Tab Content: Main Cabinets Section
           ============================================================================ */}
        {activeSection === 'cabinets' && (
          <>
            {/* Summary Metrics Cards */}
            <FinancialMetricsCards
              totals={financialTotals}
              loading={loading}
              title="Total for all Machines"
              className="mt-6"
            />

            {/* Date Filtering Controls */}
            <div className="mb-0 mt-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <DateFilters
                  disabled={loading}
                  hideAllTime={true}
                  onCustomRangeGo={loadCabinets}
                  enableTimeInputs={true}
                />
              </div>
            </div>

            {/* Advanced Search and Data Filters */}
            <CabinetsCabinetSearchFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedLocation={selectedLocation}
              locations={locations}
              onLocationChange={setSelectedLocation}
              showLocationFilter={showLocationFilter}
              selectedGameType={selectedGameType}
              gameTypes={gameTypes}
              onGameTypeChange={setSelectedGameType}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              sortOption={sortOption}
              sortOrder={sortOrder}
              onSortChange={() => {}}
              activeSection={activeSection}
            />

            {/* Data Display: Grid/List View with Pagination */}
            <CabinetsCabinetContentDisplay
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
          </>
        )}

        {/* ============================================================================
           Other Section Contents (Lazy Loaded)
           ============================================================================ */}
        {activeSection === 'smib' && (
          <CabinetsSMIBManagementTab refreshTrigger={smibRefreshTrigger} />
        )}
        
        {activeSection === 'movement' && (
          <CabinetsMovementRequests
            locations={locations}
            refreshTrigger={movementRefreshTrigger}
          />
        )}
        
        {activeSection === 'firmware' && (
          <SMIBFirmwareSection refreshTrigger={firmwareRefreshTrigger} />
        )}
      </PageLayout>
    </>
  );
}

