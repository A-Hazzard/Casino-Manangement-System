/**
 * Locations Page Content Component
 *
 * Main content component that manages locations data, filtering, and rendering.
 *
 * @module components/locations/LocationsPageContent
 */
'use client';

import LocationsDetailsFilterSection from '@/components/CMS/locations/details/LocationsDetailsFilterSection';
import LocationsDetailsHeaderSection from '@/components/CMS/locations/details/LocationsDetailsHeaderSection';
import LocationsCabinetTableSkeleton from '@/components/CMS/locations/LocationsCabinetTableSkeleton';
import PageLayout from '@/components/shared/layout/PageLayout';
import ClientOnly from '@/components/shared/ui/common/ClientOnly';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import FinancialMetricsCards from '@/components/shared/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/shared/ui/MachineStatusWidget';
import { NoLicenseeAssigned } from '@/components/shared/ui/NoLicenseeAssigned';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { useLocationsPageData } from '@/lib/hooks/locations/useLocationsPageData';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useLocationsActionsStore } from '@/lib/store/locationActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licensee';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import LocationsLocationCard from './LocationsLocationCard';
import LocationsLocationSkeleton from './LocationsLocationSkeleton';
import LocationsLocationTable from './LocationsLocationTable';
import LocationsDeleteLocationModal from './modals/LocationsDeleteLocationModal';
import LocationsEditLocationModal from './modals/LocationsEditLocationModal';
import LocationsNewLocationModal from './modals/LocationsNewLocationModal';

export default function LocationsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const router = useRouter();
  const { user } = useUserStore();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { openEditModal, openDeleteModal, closeDeleteModal } =
    useLocationsActionsStore();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Custom hook for locations page data and logic
  const locationsPageData = useLocationsPageData();

  const {
    loading,
    refreshing,
    filteredLocationData,
    financialTotals,
    metricsTotals,
    metricsTotalsLoading,
    machineStats,
    machineStatsLoading,
    membershipStats,
    membershipStatsLoading,
    selectedFilters,
    searchTerm,
    currentPage,
    totalPages,
    handleRefresh,
    handleFilterChange,
    handleMultiFilterChange,
    setSearchTerm,
    setCurrentPage,
  } = locationsPageData;

  // ============================================================================
  // Computed Values & Memoization
  // ============================================================================
  /**
   * Check if the current user can manage (create/edit/delete) locations.
   * Only developers, admins, managers, and location admins can manage locations.
   */
  const canManageLocations = useMemo(() => {
    const roles = user?.roles || [];
    return ['developer', 'admin', 'manager', 'location admin'].some(r =>
      roles.includes(r)
    );
  }, [user]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Navigate to a specific location's detail page.
   */
  const handleLocationClick = (locationId: string) => {
    if (locationId) {
      router.push(`/locations/${locationId}`);
    }
  };

  // ============================================================================
  // Permission Checks
  // ============================================================================
  // If user has no licensee assigned, show the "No Licensee Assigned" message
  if (shouldShowNoLicenseeMessage(user)) {
    return <NoLicenseeAssigned />;
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Modal Components for CRUD operations */}
      <LocationsDeleteLocationModal
        onDelete={() => {
          handleRefresh();
          closeDeleteModal();
        }}
      />
      <LocationsEditLocationModal onLocationUpdated={handleRefresh} />
      <LocationsNewLocationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={handleRefresh}
      />

      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
      >
        {/* Page Header: Title and primary actions */}
        <LocationsDetailsHeaderSection
          loading={loading}
          refreshing={refreshing}
          canManage={canManageLocations}
          onRefresh={handleRefresh}
          onNew={() => setIsNewModalOpen(true)}
        />

        {/* Financial Performance Summary Cards */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={metricsTotals || financialTotals}
            loading={loading || metricsTotalsLoading}
            title="Total for all Locations"
          />
        </div>

        {/* Filters and Status Section */}
        <div className="flex flex-col gap-4">
          {/* Date range picker and machine status indicator */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <DateFilters hideAllTime />
            <div className="w-auto flex-shrink-0">
              <MachineStatusWidget
                isLoading={
                  machineStatsLoading ||
                  membershipStatsLoading ||
                  machineStats === null
                }
                onlineCount={machineStats?.onlineMachines || 0}
                offlineCount={machineStats?.offlineMachines || 0}
                totalCount={machineStats?.totalMachines}
                membershipCount={membershipStats?.membershipCount || 0}
                showTotal
                showMembership
              />
            </div>
          </div>

          {/* Search bar and multi-filter dropdowns */}
          <LocationsDetailsFilterSection
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onMultiFilterChange={handleMultiFilterChange}
          />
        </div>

        {/* ============================================================================
           Locations Listing: Responsive card/table view
           ============================================================================ */}
        <div className="mt-0 flex-1">
          {/* Show loading skeletons while data is being fetched */}
          {loading ? (
            <div>
              <ClientOnly fallback={<LocationsCabinetTableSkeleton />}>
                {/* Mobile skeletons */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
                  {[...Array(4)].map((_, i) => (
                    <LocationsLocationSkeleton key={i} />
                  ))}
                </div>
                {/* Desktop table skeleton */}
                <div className="hidden lg:block">
                  <LocationsCabinetTableSkeleton />
                </div>
              </ClientOnly>
            </div>
          ) : /* Show empty state message if no locations match the filters */
          filteredLocationData.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No locations found matching your criteria.
            </div>
          ) : (
            /* Main Content: Display data in appropriate format for viewport */
            <div>
              {/* Mobile View: Cards display */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
                {filteredLocationData.map(loc => (
                  <LocationsLocationCard
                    key={String(loc._id || loc.location || Math.random())}
                    location={loc}
                    onLocationClick={handleLocationClick}
                    onEdit={location => openEditModal(location)}
                  />
                ))}
              </div>

              {/* Desktop View: Interactive data table */}
              <div className="hidden overflow-x-auto border border-gray-200 bg-white shadow-sm lg:block">
                <LocationsLocationTable
                  locations={filteredLocationData}
                  onLocationClick={handleLocationClick}
                  onAction={(action, loc) => {
                    if (action === 'edit') openEditModal(loc);
                    if (action === 'delete') openDeleteModal(loc);
                  }}
                  onSort={locationsPageData.handleSort}
                  sortOption={locationsPageData.sortOption}
                  sortOrder={locationsPageData.sortOrder}
                  formatCurrency={amount =>
                    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                />
              </div>

              {/* Data Pagination Controls */}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              )}
            </div>
          )}
        </div>
      </PageLayout>
    </>
  );
}

