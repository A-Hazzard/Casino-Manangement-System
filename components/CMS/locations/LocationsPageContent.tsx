/**
 * Locations Page Content Component
 *
 * Main content component that manages locations data, filtering, and rendering.
 *
 * @module components/locations/LocationsPageContent
 */
'use client';

import LocationsPageFilterSection from '@/components/CMS/locations/LocationsPageFilterSection';
import LocationsPageHeaderSection from '@/components/CMS/locations/LocationsPageHeaderSection';
import LocationsReviewerDebugTable from '@/components/CMS/locations/LocationsReviewerDebugTable';
import LocationsCabinetTableSkeleton from '@/components/CMS/locations/LocationsCabinetTableSkeleton';
import PageLayout from '@/components/shared/layout/PageLayout';
import ClientOnly from '@/components/shared/ui/common/ClientOnly';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import FinancialMetricsCards from '@/components/shared/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/shared/ui/MachineStatusWidget';
import { NoLicenceeAssigned } from '@/components/shared/ui/NoLicenceeAssigned';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { useLocationsPageData } from '@/lib/hooks/locations/useLocationsPageData';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useLocationsActionsStore } from '@/lib/store/locationActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import type { AggregatedLocation } from '@/shared/types';
import { SHOW_REVIEWER_DEBUG_PANEL } from '@/lib/constants/uiConstants';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';
import { shouldShowNoLicenceeMessage } from '@/lib/utils/licencee';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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
  const { displayCurrency } = useCurrencyFormat();

  const {
    loading,
    refreshing,
    locationData,
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
    totalCount,
    isDataComplete,
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

  const isReviewer = useMemo(() => {
    const roles = user?.roles || [];
    return roles.includes('reviewer');
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

  /**
   * Restore an archived location back to active status.
   */
  const handleRestore = async (location: Partial<AggregatedLocation>) => {
    const loc = location as Record<string, unknown>;
    const locationId = loc.location as string;
    const locationName = loc.locationName as string;
    if (!locationId) return;

    try {
      await axios.patch('/api/locations', { id: locationId, action: 'restore' });
      toast.success(`${locationName || 'Location'} restored successfully`);
      handleRefresh();
    } catch {
      toast.error('Failed to restore location');
    }
  };

  // ============================================================================
  // Permission Checks
  // ============================================================================
  // If user has no licencee assigned, show the "No Licencee Assigned" message
  if (shouldShowNoLicenceeMessage(user)) {
    return <NoLicenceeAssigned />;
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
        onRefresh={handleRefresh}
        refreshing={refreshing}
      >
        {/* Page Header: Title and primary actions */}
        <LocationsPageHeaderSection
          loading={loading}
          refreshing={refreshing}
          canManage={canManageLocations}
          onRefresh={handleRefresh}
          onNew={() => setIsNewModalOpen(true)}
        />

        {/* Financial Performance Summary Cards */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={
              (isDataComplete && !metricsTotalsLoading)
                ? financialTotals
                : (metricsTotals || financialTotals)
            }
            loading={loading || metricsTotalsLoading}
            title="Total for all Locations"
          />
        </div>

        {/* ── REVIEWER DEBUG PANEL ─────────────────────────────────────────── */}
        {SHOW_REVIEWER_DEBUG_PANEL && isReviewer && !loading && locationData.length > 0 && (
          <LocationsReviewerDebugTable locationData={locationData} />
        )}
        {/* ── END REVIEWER DEBUG PANEL ─────────────────────────────────────── */}

        {/* Filters and Status Section */}
        <div className="flex flex-col gap-4">
          {/* Date range picker and machine status indicator */}
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center mt-4">
            <div className="order-1 w-auto flex-shrink-0">
              <DateFilters hideAllTime />
            </div>
            <div className="order-2 w-auto">
              <MachineStatusWidget
                isLoading={
                  machineStatsLoading ||
                  membershipStatsLoading ||
                  machineStats === null
                }
                title="Location Status"
                onlineLabel="Online Locations"
                offlineLabel="Offline Locations"
                onlineCount={machineStats?.onlineLocations || 0}
                offlineCount={machineStats?.offlineLocations || 0}
                totalCount={machineStats?.totalLocations}
                membershipCount={membershipStats?.membershipCount || 0}
                showTotal
                showMembership
              />
            </div>
          </div>

          {/* Search bar and multi-filter dropdowns */}
          <LocationsPageFilterSection
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onMultiFilterChange={handleMultiFilterChange}
            selectedStatus={locationsPageData.selectedStatus}
            onStatusChange={locationsPageData.setSelectedStatus}
          />
        </div>

        {/* ============================================================================
           Locations Listing: Responsive card/table view
           ============================================================================ */}
        <div className="mt-4 lg:mt-0 flex-1">
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
          locationData.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No locations found matching your criteria.
            </div>
          ) : (
            /* Main Content: Display data in appropriate format for viewport */
            <div>
              {/* Mobile View: Cards display */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
                {locationData.map(loc => (
                  <LocationsLocationCard
                    key={String(loc._id || loc.location || Math.random())}
                    location={loc}
                    onLocationClick={handleLocationClick}
                    onEdit={location => openEditModal(location)}
                    onDelete={location => openDeleteModal(location)}
                    onRestore={location => handleRestore(location)}
                    showArchived={locationsPageData.selectedStatus === 'Archived'}
                  />
                ))}
              </div>

              {/* Desktop View: Interactive data table */}
              <div className="hidden overflow-x-auto border border-gray-200 bg-white shadow-sm lg:block">
                <LocationsLocationTable
                  locations={locationData}
                  onLocationClick={handleLocationClick}
                  showArchived={locationsPageData.selectedStatus === 'Archived'}
                  onAction={(action, loc) => {
                    if (action === 'edit') openEditModal(loc);
                    if (action === 'delete') openDeleteModal(loc);
                    if (action === 'restore') handleRestore(loc);
                  }}
                  onSort={locationsPageData.handleSort}
                  sortOption={locationsPageData.sortOption}
                  sortOrder={locationsPageData.sortOrder}
                  formatCurrency={amount => formatCurrencyWithCodeString(amount, displayCurrency)}
                />
              </div>

              {/* Data Pagination Controls */}
              {totalPages > 1 && (
                <div className="my-4 flex w-full justify-center">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    limit={10}
                    setCurrentPage={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </PageLayout>
    </>
  );
}

