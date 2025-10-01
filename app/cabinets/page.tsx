"use client";

import { Suspense } from "react";
import Image from "next/image";
import PageLayout from "@/components/layout/PageLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Modal components
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { NewCabinetModal } from "@/components/ui/cabinets/NewCabinetModal";
import NewMovementRequestModal from "@/components/ui/movements/NewMovementRequestModal";
import UploadSmibDataModal from "@/components/ui/firmware/UploadSmibDataModal";

// Section components
import SMIBManagement from "@/components/cabinets/SMIBManagement";
import MovementRequests from "@/components/cabinets/MovementRequests";
import SMIBFirmwareSection from "@/components/ui/firmware/SMIBFirmwareSection";
import CabinetsNavigation from "@/components/cabinets/CabinetsNavigation";

// New extracted components
import { CabinetActions } from "@/components/cabinets/CabinetActions";
import { CabinetSearchFilters } from "@/components/cabinets/CabinetSearchFilters";
import { CabinetContentDisplay } from "@/components/cabinets/CabinetContentDisplay";

// UI components
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import FinancialMetricsCards from "@/components/ui/FinancialMetricsCards";
import { CabinetTableSkeleton } from "@/components/ui/cabinets/CabinetSkeletonLoader";

// Custom hooks
import {
  useCabinetData,
  useCabinetSorting,
  useCabinetFilters,
  useCabinetModals,
} from "@/lib/hooks/data";
import { useCabinetNavigation } from "@/lib/hooks/navigation";

// Store hooks
import { useDashBoardStore } from "@/lib/store/dashboardStore";

// Constants and types
import { CABINET_TABS_CONFIG } from "@/lib/constants/cabinets";
import { IMAGES } from "@/lib/constants/images";
// Removed unused Cabinet type import

function CabinetsPageContent() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // Custom hooks for cabinet functionality
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
    setSearchTerm,
    setSelectedLocation,
    setSelectedGameType,
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
  });

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

  // Note: Modal handlers are now managed by useCabinetModals hook

  // Note: Upload modal handler is now managed by useCabinetModals hook

  const handleMovementRequestSubmit = () => {
    loadCabinets();
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
  const handleSortChange = (_option: string, _order: "asc" | "desc") => {
    // This will be handled by the useCabinetSorting hook
    // Sort logic is managed by the hook
  };

  return (
    <>
      {/* Modal Components */}
      <EditCabinetModal onCabinetUpdated={loadCabinets} />
      <DeleteCabinetModal onCabinetDeleted={loadCabinets} />
      <NewCabinetModal
        locations={locations}
        currentLocationName={
          selectedLocation !== "all"
            ? locations.find((location) => location._id === selectedLocation)
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
        {/* Page Header */}
        <div className="flex items-center justify-between mt-4 w-full max-w-full">
          <div className="flex items-center gap-3 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Cabinets
            </h1>
            <Image
              src={IMAGES.cabinetsIcon}
              alt="Cabinet Icon"
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8 ml-2"
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
        <div className="mt-8 mb-6">
          <CabinetsNavigation
            tabs={CABINET_TABS_CONFIG}
            activeSection={activeSection}
            onChange={handleSectionChange}
            isLoading={loading}
          />
        </div>

        {/* Financial Metrics Cards - Only show on cabinets section */}
        {activeSection === "cabinets" && (
          <FinancialMetricsCards
            totals={financialTotals}
            loading={loading}
            title="Total for all Machines"
            className="mt-6"
          />
        )}

        {/* Date Filters */}
        <div className="flex items-center justify-between mt-4 mb-0 gap-4">
          <div className="flex-1 min-w-0">
            <DashboardDateFilters
              disabled={loading}
              hideAllTime={true}
              onCustomRangeGo={loadCabinets}
            />
          </div>
        </div>

        {/* Search and Filters */}
        <CabinetSearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedLocation={selectedLocation}
          locations={locations}
          onLocationChange={handleLocationChange}
          selectedGameType={selectedGameType}
          gameTypes={gameTypes}
          onGameTypeChange={handleGameTypeChange}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          activeSection={activeSection}
        />

        {/* Section Content */}
        {activeSection === "cabinets" ? (
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
            onEdit={(_cabinet) => {
              // Edit functionality is handled by the CabinetActions component
            }}
            onDelete={(_cabinet) => {
              // Delete functionality is handled by the CabinetActions component
            }}
            onRetry={loadCabinets}
            transformCabinet={transformCabinet}
          />
        ) : activeSection === "smib" ? (
          <SMIBManagement />
        ) : activeSection === "movement" ? (
          <MovementRequests locations={locations} />
        ) : activeSection === "firmware" ? (
          <SMIBFirmwareSection />
        ) : (
          <SMIBManagement />
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
