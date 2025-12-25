/**
 * Locations Page
 *
 * Displays and manages gaming locations with filtering, sorting, and pagination.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { useLocationsPageData } from '@/lib/hooks/locations/useLocationsPageData';
import { useLocationActionsStore } from '@/lib/store/locationActionsStore';

// UI Components
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import LocationTable from '@/components/ui/locations/LocationTable';
import LocationCard from '@/components/ui/locations/LocationCard';
import PaginationControls from '@/components/ui/PaginationControls';
import ClientOnly from '@/components/ui/common/ClientOnly';
import CabinetTableSkeleton from '@/components/ui/locations/CabinetTableSkeleton';
import LocationSkeleton from '@/components/ui/locations/LocationSkeleton';
import DeleteLocationModal from '@/components/ui/locations/DeleteLocationModal';
import EditLocationModal from '@/components/ui/locations/EditLocationModal';
import NewLocationModal from '@/components/ui/locations/NewLocationModal';

// Sections
import LocationsHeaderSection from '@/components/locations/details/LocationsHeaderSection';
import LocationsFilterSection from '@/components/locations/details/LocationsFilterSection';

function LocationsPageContent() {
  const router = useRouter();
  const { user } = useUserStore();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { openEditModal, openDeleteModal, closeDeleteModal } = useLocationActionsStore();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  
  const hook = useLocationsPageData();

  // Handle location click navigation
  const handleLocationClick = (locationId: string) => {
    if (locationId) {
      router.push(`/locations/${locationId}`);
    }
  };
  const {
    loading, refreshing, filteredLocationData, financialTotals,
    metricsTotals, metricsTotalsLoading, machineStats, machineStatsLoading,
    membershipStats, membershipStatsLoading, selectedFilters, searchTerm,
    currentPage, totalPages, handleRefresh, handleFilterChange,
    setSearchTerm, setCurrentPage, fetchData
  } = hook;

  const canManageLocations = useMemo(() => {
    const roles = user?.roles || [];
    return ['developer', 'admin', 'manager', 'location admin'].some(r => roles.includes(r));
  }, [user]);

  if (shouldShowNoLicenseeMessage(user)) {
    return <NoLicenseeAssigned />;
  }

  return (
    <>
      <DeleteLocationModal onDelete={() => {
        // Handle delete - will be implemented when delete functionality is added
        closeDeleteModal();
      }} />
      <EditLocationModal />
      <NewLocationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />

      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
      >
        <LocationsHeaderSection
          loading={loading}
          refreshing={refreshing}
          canManage={canManageLocations}
          onRefresh={handleRefresh}
          onNew={() => setIsNewModalOpen(true)}
        />

        <div className="mt-6">
          <FinancialMetricsCards
            totals={metricsTotals || financialTotals}
            loading={loading || metricsTotalsLoading}
            title="Total for all Locations"
          />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <DashboardDateFilters hideAllTime onCustomRangeGo={fetchData} />
            <MachineStatusWidget
              isLoading={machineStatsLoading || membershipStatsLoading}
              onlineCount={machineStats?.onlineMachines || 0}
              offlineCount={machineStats?.offlineMachines || 0}
              totalCount={machineStats?.totalMachines}
              membershipCount={membershipStats?.membershipCount || 0}
              showTotal showMembership
            />
        </div>

          <LocationsFilterSection
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onMultiFilterChange={() => {
              // Handle bulk filter changes if needed
            }}
          />
        </div>

        <div className="mt-6 flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              <ClientOnly fallback={<CabinetTableSkeleton />}>
                <div className="lg:hidden grid grid-cols-1 gap-4">
                  {[...Array(3)].map((_, i) => <LocationSkeleton key={i} />)}
          </div>
                <div className="hidden lg:block">
                  <CabinetTableSkeleton />
                </div>
                </ClientOnly>
              </div>
          ) : filteredLocationData.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No locations found matching your criteria.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredLocationData.map((loc) => (
                        <LocationCard
                    key={String(loc._id)} 
                    location={loc} 
                    onLocationClick={handleLocationClick} 
                    onEdit={(location) => openEditModal(location)}
                  />
                ))}
              </div>
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
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
                  formatCurrency={(amount) => `$${amount.toFixed(2)}`}
                />
              </div>
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

import { useMemo } from 'react';

export default function LocationsPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <PageErrorBoundary>
        <LocationsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
