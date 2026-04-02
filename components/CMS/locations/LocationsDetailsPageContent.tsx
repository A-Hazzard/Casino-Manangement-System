/**
 * Locations Details Page Content Component
 *
 * Handles all state management and data fetching for the location details page.
 *
 * Features:
 * - Machine listing with card (mobile) and table (desktop) views
 * - Search and filter capabilities
 * - Financial metrics overview
 * - Machine status widget
 * - Create, edit, and delete machines (role-based)
 * - Pagination
 * - Responsive design for mobile and desktop
 */

'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { NoLicenceeAssigned } from '@/components/shared/ui/NoLicenceeAssigned';
import { useCallback, useEffect, useRef, useState } from 'react';

import CabinetsDeleteCabinetModal from '@/components/CMS/cabinets/modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from '@/components/CMS/cabinets/modals/CabinetsEditCabinetModal';
import CabinetsNewCabinetModal from '@/components/CMS/cabinets/modals/CabinetsNewCabinetModal';
import LocationsDetailsCabinetsSection from '@/components/CMS/locations/sections/LocationsDetailsCabinetsSection';
import { useLocationCabinetsData } from '@/lib/hooks/locations/useLocationCabinetsData';
import { useLocationChartData } from '@/lib/hooks/locations/useLocationChartData';
import {
    canEditMachines,
    canManageLocations,
    canViewArchivedMachines,
    hasAdminAccess,
    UserRole
} from '@/lib/utils/permissions';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { SHOW_REVIEWER_DEBUG_PANEL } from '@/lib/constants/uiConstants';
import { useLocationsActionsStore } from '@/lib/store/locationActionsStore';
import { shouldShowNoLicenceeMessage } from '@/lib/utils/licencee';
import LocationsEditLocationModal from './modals/LocationsEditLocationModal';

import LocationsDetailsMembersSection from '@/components/CMS/locations/sections/LocationsDetailsMembersSection';
import { MembersHandlersProvider } from '@/components/CMS/members/context/MembersHandlersContext';
import { MEMBERS_TABS_CONFIG } from '@/lib/constants';
import {
  useLocationMachineStats,
  useLocationMembershipStats,
} from '@/lib/hooks/data';
import { useUserStore, type UserStore } from '@/lib/store/userStore';
import { useMembersNavigation } from '@/lib/hooks/navigation';
import type { AggregatedLocation } from '@/shared/types';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useNewCabinetStore } from '@/lib/store/newCabinetStore';
import LocationsDetailsHeader from './details/LocationsDetailsHeader';
import LocationsDetailsViewToggle from './details/LocationsDetailsViewToggle';
import ReviewerDebugPanel from '@/components/shared/ui/ReviewerDebugPanel';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

/**
 * Locations Details Page Content Component
 */
export default function LocationsDetailsPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = params.slug as string;
  const tabParam = searchParams.get('tab');

  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  const user = useUserStore((state: UserStore) => state.user);

  // ============================================================================
  // State Management
  // ============================================================================
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // ============================================================================
  // Computed Values - Permissions
  // ============================================================================
  const userRoles = (user?.roles || []) as UserRole[];
  const isAdminUser = hasAdminAccess(userRoles);
  const canManageMachines = canEditMachines(userRoles);
  const canEditLocation = canManageLocations(userRoles);
  const canViewArchived = canViewArchivedMachines(userRoles);
  const canPermanentlyDelete = isAdminUser || userRoles.includes('developer');

  // View Toggle State - checks URL param first, defaults to machines
  const [activeView, setActiveView] = useState<'machines' | 'members'>(
    tabParam === 'members' ? 'members' : 'machines'
  );

  // ============================================================================
  // Custom Hooks
  // ============================================================================
  const cabinetsData = useLocationCabinetsData({
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    filtersInitialized,
    isAdminUser,
    setDateFilterInitialized,
    setFiltersInitialized,
  });

  const chartDataHook = useLocationChartData({
    locationId,
    selectedLicencee,
    activeMetricsFilter: activeMetricsFilter || null,
    customDateRange,
    activeView,
    status: cabinetsData.selectedStatus,
    gameType: cabinetsData.selectedGameType,
    searchTerm: cabinetsData.debouncedSearchTerm,
    includeArchived: cabinetsData.showArchived,
  });

  // Machine status stats from dedicated API (location-specific)
  const { machineStats, machineStatsLoading, refreshMachineStats } =
    useLocationMachineStats(
      locationId,
      cabinetsData.selectedGameType === 'all' ? undefined : cabinetsData.selectedGameType,
      cabinetsData.searchTerm
    );
  const { membershipStats, membershipStatsLoading, refreshMembershipStats } =
    useLocationMembershipStats(locationId);

  // Members Tab Navigation
  // Disable URL sync for location details page to prevent conflicts
  const { activeTab, handleTabClick } = useMembersNavigation(
    MEMBERS_TABS_CONFIG,
    true
  );

  // ============================================================================
  // Refs
  // ============================================================================
  const membersRefreshHandlerRef = useRef<(() => void) | undefined>(undefined);

  // Refresh machine stats when date filters change
  useEffect(() => {
    if (
      activeView === 'machines' &&
      activeMetricsFilter &&
      dateFilterInitialized
    ) {
      refreshMachineStats();
    }
  }, [
    activeMetricsFilter,
    customDateRange,
    activeView,
    dateFilterInitialized,
    refreshMachineStats,
  ]);

  // ============================================================================
  // Effects - Initialization & Sync
  // ============================================================================

  // Sync state with URL parameter
  useEffect(() => {
    if (tabParam === 'members') {
      setActiveView('members');
    } else {
      setActiveView('machines');
    }
  }, [tabParam]);

  // If we are on members tab but it should be hidden (and not loading), redirect to machines
  useEffect(() => {
    if (
      activeView === 'members' &&
      !membershipStatsLoading &&
      membershipStats &&
      membershipStats.membershipCount === 0 &&
      cabinetsData.locationMembershipEnabled
    ) {
      // If user manually navigated to ?tab=members but there are no members, switch back
      handleViewChange('machines');
    }
  }, [
    activeView,
    membershipStatsLoading,
    membershipStats,
    cabinetsData.locationMembershipEnabled,
  ]);

  // Detect when date filter is properly initialized
  useEffect(() => {
    if (activeMetricsFilter) {
      setDateFilterInitialized(true);
    }
  }, [activeMetricsFilter]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleFilterChange = (status: string) => {
    cabinetsData.setSelectedStatus(status);
  };

  const handleViewChange = (view: 'machines' | 'members') => {
    setActiveView(view);

    // Create new URLSearchParams to preserve other params if they exist (though currently none strictly needed)
    const newParams = new URLSearchParams(searchParams.toString());

    if (view === 'members') {
      newParams.set('tab', 'members');
    } else {
      newParams.delete('tab');
    }

    // Construct new path
    const newPath = `?${newParams.toString()}`;
    router.push(newPath);
  };

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    // If members view is active, trigger members refresh handler
    if (activeView === 'members' && membersRefreshHandlerRef.current) {
      membersRefreshHandlerRef.current();
      return;
    }

    // Only refresh machines/charts if on machines view
    if (activeView !== 'machines') {
      return;
    }

    // Refresh machine status and membership stats
    await Promise.all([refreshMachineStats(), refreshMembershipStats()]);
    // Refresh cabinets data (hook handles the refresh)
    await cabinetsData.refreshCabinets();
    // Refresh chart data
    chartDataHook.refreshChart();
  }, [
    activeView,
    refreshMachineStats,
    refreshMembershipStats,
    cabinetsData,
    chartDataHook,
  ]);

  const { openCabinetModal } = useNewCabinetStore();
  const { openEditModal } = useLocationsActionsStore();

  /**
   * Restores a soft-deleted cabinet by clearing its deletedAt field.
   */
  const handleRestoreCabinet = async (cabinet: Cabinet) => {
    if (!confirm(`Are you sure you want to restore machine ${cabinet.serialNumber || cabinet.custom?.name || 'N/A'}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${locationId}/cabinets/${cabinet._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore' }),
      });

      const result = await response.json();
      if (result.success) {
        import('sonner').then(({ toast }) => toast.success('Machine restored successfully'));
        handleRefresh();
      } else {
        import('sonner').then(({ toast }) => toast.error(result.error || 'Failed to restore machine'));
      }
    } catch (error) {
       console.error('Error restoring cabinet:', error);
       import('sonner').then(({ toast }) => toast.error('An error occurred during restoration'));
    }
  };

  /**
   * Permanently deletes a cabinet from the database.
   * This action is restricted to admins and developers.
   */
  const handlePermanentDeleteCabinet = async (cabinet: Cabinet) => {
    if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY delete machine ${cabinet.serialNumber || cabinet.custom?.name || 'N/A'}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${locationId}/cabinets/${cabinet._id}?hardDelete=true`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        import('sonner').then(({ toast }) => toast.success('Machine permanently deleted'));
        handleRefresh();
      } else {
        import('sonner').then(({ toast }) => toast.error(result.error || 'Failed to delete machine permanently'));
      }
    } catch (error) {
      console.error('Error permanently deleting cabinet:', error);
      import('sonner').then(({ toast }) => toast.error('An error occurred during permanent deletion'));
    }
  };

  // ============================================================================
  // Early Returns
  // ============================================================================
  // Show "No Licencee Assigned" message for non-admin users without licencees
  const showNoLicenceeMessage = shouldShowNoLicenceeMessage(user);
  if (showNoLicenceeMessage) {
    return (
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NoLicenceeAssigned />
      </PageLayout>
    );
  }

  // Determine if Members tab should be shown
  // Show if feature enabled AND (has members OR stats are still loading)
  const showMembersTab = !!(
    cabinetsData.locationMembershipEnabled &&
    (membershipStatsLoading ||
      (membershipStats && membershipStats.membershipCount > 0))
  );

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled:
            cabinetsData.loading ||
            cabinetsData.cabinetsLoading ||
            cabinetsData.refreshing,
        }}
        
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
        onRefresh={handleRefresh}
        refreshing={cabinetsData.refreshing}
      >
        {/* Header Section: Title, back button, and action buttons */}
        <LocationsDetailsHeader
          locationId={locationId}
          locationData={cabinetsData.locationData as AggregatedLocation}
          loading={cabinetsData.loading || cabinetsData.cabinetsLoading}
          refreshing={cabinetsData.refreshing}
          activeView={activeView}
          canManageMachines={canManageMachines}
          onRefresh={handleRefresh}
          onEditLocation={(loc) => {
            if (canEditLocation) {
              openEditModal(loc);
            }
          }}
          onNewMachine={openCabinetModal}
        />

        {/* View Toggle */}
        <LocationsDetailsViewToggle
          activeView={activeView}
          showMembersTab={showMembersTab}
          onViewChange={handleViewChange}
        />

        {/* Reviewer Debug Panel */}
        {SHOW_REVIEWER_DEBUG_PANEL && 
         user?.roles?.map((r: string) => r?.toLowerCase()).includes('reviewer') && 
         cabinetsData.financialTotals?._raw && (
          <div className="mb-6">
            <ReviewerDebugPanel
              rawValues={cabinetsData.financialTotals._raw}
              finalValues={cabinetsData.financialTotals}
              multiplier={user?.multiplier || 0.05}
            />
          </div>
        )}

        {activeView === 'members' ? (
          <MembersHandlersProvider>
            <LocationsDetailsMembersSection
              locationId={locationId}
              locationName={cabinetsData.locationName}
              selectedLicencee={selectedLicencee}
              activeTab={activeTab}
              handleTabClick={handleTabClick}
              onRefreshReady={handler => {
                membersRefreshHandlerRef.current = handler;
              }}
            />
          </MembersHandlersProvider>
        ) : (
          <LocationsDetailsCabinetsSection
            financialTotals={cabinetsData.financialTotals}
            chartData={chartDataHook.chartData}
            filteredCabinets={cabinetsData.filteredCabinets}
            gameTypes={cabinetsData.gameTypes}
            locationName={cabinetsData.locationName}
            locationId={locationId}
            selectedLocationId={cabinetsData.selectedLocationId}
            locations={cabinetsData.locations}
            error={cabinetsData.error}
            loading={cabinetsData.loading}
            cabinetsLoading={cabinetsData.cabinetsLoading}
            loadingChartData={chartDataHook.loadingChartData}
            machineStatsLoading={machineStatsLoading}
            membershipStatsLoading={membershipStatsLoading}
            showGranularitySelector={chartDataHook.showGranularitySelector}
            chartGranularity={chartDataHook.chartGranularity}
            availableGranularityOptions={
              chartDataHook.availableGranularityOptions
            }
            activeMetricsFilter={activeMetricsFilter}
            searchTerm={cabinetsData.searchTerm}
            selectedStatus={cabinetsData.selectedStatus}
            selectedGameType={cabinetsData.selectedGameType}
            sortOption={cabinetsData.sortOption}
            sortOrder={cabinetsData.sortOrder}
            currentPage={cabinetsData.currentPage}
            effectiveTotalPages={cabinetsData.effectiveTotalPages}
            totalCount={cabinetsData.totalCount}
            debouncedSearchTerm={cabinetsData.debouncedSearchTerm || ''}
            machineStats={machineStats}
            membershipStats={membershipStats}
            setSearchTerm={cabinetsData.setSearchTerm}
            setSelectedStatus={cabinetsData.setSelectedStatus}
            setSelectedGameType={cabinetsData.setSelectedGameType}
            setSortOption={cabinetsData.setSortOption}
            setSortOrder={cabinetsData.setSortOrder}
            setCurrentPage={cabinetsData.setCurrentPage}
            setChartGranularity={chartDataHook.setChartGranularity}
            setSelectedLocationId={cabinetsData.setSelectedLocationId}
            handleRefresh={handleRefresh}
            includeJackpot={cabinetsData.includeJackpot}
            handleFilterChange={handleFilterChange}
            showArchived={cabinetsData.showArchived}
            setShowArchived={cabinetsData.setShowArchived}
            canViewArchived={canViewArchived}
            onRestore={handleRestoreCabinet}
            onPermanentDelete={handlePermanentDeleteCabinet}
            canPermanentlyDeleteMachines={canPermanentlyDelete}
            handleLocationChangeInPlace={(newLocationId: string) => {
              if (newLocationId === 'all') {
                router.push('/locations');
                return;
              }
              router.push(`/locations/${newLocationId}`);
            }}
          />
        )}

        <CabinetsNewCabinetModal
          currentLocationName={cabinetsData.locationName}
          onCreated={handleRefresh}
        />
      </PageLayout>

      {/* Cabinet Action Modals */}
      <CabinetsEditCabinetModal onCabinetUpdated={handleRefresh} />
      <CabinetsDeleteCabinetModal onCabinetDeleted={handleRefresh} />

      {/* Location Action Modals */}
      <LocationsEditLocationModal onLocationUpdated={handleRefresh} />
    </>
  );
}
