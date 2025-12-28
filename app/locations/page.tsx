/**
 * Locations Page
 *
 * Displays and manages gaming locations with filtering, sorting, and pagination.
 *
 * Features:
 * - Location listing with table (desktop) and card (mobile) views
 * - Financial metrics summary cards
 * - Date filtering and machine status widgets
 * - Search and filter capabilities
 * - Pagination controls
 * - Create, edit, and delete location operations
 * - Role-based access control
 * - Responsive design for mobile and desktop
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import PageLayout from '@/components/layout/PageLayout';
import LocationsFilterSection from '@/components/locations/details/LocationsFilterSection';
import LocationsHeaderSection from '@/components/locations/details/LocationsHeaderSection';
import ClientOnly from '@/components/ui/common/ClientOnly';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import CabinetTableSkeleton from '@/components/ui/locations/CabinetTableSkeleton';
import DeleteLocationModal from '@/components/ui/locations/DeleteLocationModal';
import EditLocationModal from '@/components/ui/locations/EditLocationModal';
import LocationCard from '@/components/ui/locations/LocationCard';
import LocationSkeleton from '@/components/ui/locations/LocationSkeleton';
import LocationTable from '@/components/ui/locations/LocationTable';
import NewLocationModal from '@/components/ui/locations/NewLocationModal';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import PaginationControls from '@/components/ui/PaginationControls';
import { useLocationsPageData } from '@/lib/hooks/locations/useLocationsPageData';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useLocationActionsStore } from '@/lib/store/locationActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

/**
 * Locations Page Content Component
 *
 * Main content component that manages locations data, filtering, and rendering.
 */
function LocationsPageContent() {
  const router = useRouter();
  const { user } = useUserStore();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { openEditModal, openDeleteModal, closeDeleteModal } =
    useLocationActionsStore();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const locationsPageData = useLocationsPageData();

  const handleLocationClick = (locationId: string) => {
    if (locationId) {
      router.push(`/locations/${locationId}`);
    }
  };
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
    setSearchTerm,
    setCurrentPage,
    fetchData,
  } = locationsPageData;

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

  // If user has no licensee assigned, show the "No Licensee Assigned" message
  if (shouldShowNoLicenseeMessage(user)) {
    return <NoLicenseeAssigned />;
  }

  return (
    <>
      {/* Modal Components */}
      <DeleteLocationModal
        onDelete={() => {
          closeDeleteModal();
        }}
      />
      <EditLocationModal />
      <NewLocationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />

      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
      >
        {/* Page Header */}
        <LocationsHeaderSection
          loading={loading}
          refreshing={refreshing}
          canManage={canManageLocations}
          onRefresh={handleRefresh}
          onNew={() => setIsNewModalOpen(true)}
        />

        {/* Financial Metrics Cards */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={metricsTotals || financialTotals}
            loading={loading || metricsTotalsLoading}
            title="Total for all Locations"
          />
        </div>

        {/* Controls Row: Date filters and machine status widget */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <DashboardDateFilters hideAllTime onCustomRangeGo={fetchData} />
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

          {/* Search & Filter Section */}
          <LocationsFilterSection
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onMultiFilterChange={() => {}}
          />
        </div>

        {/* Locations List */}
        <div className="mt-0 flex-1">
          {/* Show loading skeletons while data is being fetched */}
          {loading ? (
            <div>
              <ClientOnly fallback={<CabinetTableSkeleton />}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
                  {[...Array(4)].map((_, i) => (
                    <LocationSkeleton key={i} />
                  ))}
                </div>
                <div className="hidden lg:block">
                  <CabinetTableSkeleton />
                </div>
              </ClientOnly>
            </div>
          ) : /* Show empty state message if no locations match the filters */
          filteredLocationData.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No locations found matching your criteria.
            </div>
          ) : (
            /* Content: Cards (Mobile) and Table (Desktop) */
            <div>
              {/* Mobile: Card View */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
                {filteredLocationData.map(loc => (
                  <LocationCard
                    key={String(loc._id)}
                    location={loc}
                    onLocationClick={handleLocationClick}
                    onEdit={location => openEditModal(location)}
                  />
                ))}
              </div>

              {/* Desktop: Table View */}
              <div className="hidden overflow-x-auto border border-gray-200 bg-white shadow-sm lg:block">
                <LocationTable
                  locations={filteredLocationData}
                  onLocationClick={handleLocationClick}
                  onAction={(action, loc) => {
                    if (action === 'edit') openEditModal(loc);
                    if (action === 'delete') openDeleteModal(loc);
                  }}
                  onSort={() => {}}
                  sortOption="locationName"
                  sortOrder="asc"
                  formatCurrency={amount => `$${amount.toFixed(2)}`}
                />
              </div>

              {/* Pagination */}
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

/**
 * Locations Page (Root Component)
 *
 * Protected route wrapper for the locations page with error boundary.
 */
export default function LocationsPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <PageErrorBoundary>
        <LocationsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
