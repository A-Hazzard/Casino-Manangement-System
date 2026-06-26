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
import { useCallback, useEffect, useRef, useState } from 'react';

import CabinetsDeleteCabinetModal from '@/components/CMS/cabinets/modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from '@/components/CMS/cabinets/modals/CabinetsEditCabinetModal';
import CabinetsNewCabinetModal from '@/components/CMS/cabinets/modals/CabinetsNewCabinetModal';
import { InfoConfirmationDialog } from '@/components/shared/ui/InfoConfirmationDialog';
import LocationsDetailsCabinetsSection from '@/components/CMS/locations/sections/LocationsDetailsCabinetsSection';
import { useLocationCabinetsData } from '@/lib/hooks/locations/useLocationCabinetsData';
import { useLocationChartData } from '@/lib/hooks/locations/useLocationChartData';
import {
  canEditMachines,
  canManageLocations,
  canViewArchivedMachines,
  hasAdminAccess,
  UserRole,
} from '@/lib/utils/permissions';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useLocationsActionsStore } from '@/lib/store/locationActionsStore';
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
import { toast } from 'sonner';
import LocationsDetailsHeader from './details/LocationsDetailsHeader';
import LocationsDetailsViewToggle from './details/LocationsDetailsViewToggle';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

/**
 * Locations Details Page Content Component
 */
export default function LocationsDetailsPageContent() {
  // ============================================================================
  // State & Hooks
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

  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Confirmation dialog state for restore and permanent delete
  const [restoreTarget, setRestoreTarget] = useState<Cabinet | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cabinet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Toggle State - checks URL param first, defaults to machines
  const [activeView, setActiveView] = useState<'machines' | 'members'>(
    tabParam === 'members' ? 'members' : 'machines'
  );

  const cabinetsData = useLocationCabinetsData({
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    filtersInitialized,
    isAdminUser: hasAdminAccess((user?.roles || []) as UserRole[]),
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
      cabinetsData.selectedGameType === 'all'
        ? undefined
        : cabinetsData.selectedGameType,
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

  const membersRefreshHandlerRef = useRef<(() => void) | undefined>(undefined);

  const { openCabinetModal } = useNewCabinetStore();
  const { openEditModal } = useLocationsActionsStore();

  // ============================================================================
  // Computed
  // ============================================================================
  const userRoles = (user?.roles || []) as UserRole[];
  const isAdminUser = hasAdminAccess(userRoles);
  const canManageMachines = canEditMachines(userRoles);
  const canEditLocation = canManageLocations(userRoles);
  const canViewArchived = canViewArchivedMachines(userRoles);
  const canPermanentlyDelete = isAdminUser || userRoles.includes('developer');

  // Determine if Members tab should be shown
  // Show if feature enabled AND (has members OR stats are still loading)
  const showMembersTab = !!(
    cabinetsData.locationMembershipEnabled &&
    (membershipStatsLoading ||
      (membershipStats && membershipStats.membershipCount > 0))
  );

  // ============================================================================
  // Effects
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
  // Handlers
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

    // Refresh location document (re-runs SMIB auto-tag + updates locationData)
    await cabinetsData.refreshLocation();
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

  // Custom range handler — does NOT call refreshCabinets() because the
  // useLocationCabinetsData effect already re-fetches when filters change.
  // Calling refreshCabinets() here caused a race condition where
  // refreshCabinets() cleared prevCabinetsFetchKey while the effect's fetch
  // was in-flight, preventing the finally block from turning off loading.
  const handleCustomRangeGo = useCallback(async () => {
    if (activeView !== 'machines') return;

    await cabinetsData.refreshLocation();
    await Promise.all([refreshMachineStats(), refreshMembershipStats()]);
    chartDataHook.refreshChart();
  }, [
    activeView,
    refreshMachineStats,
    refreshMembershipStats,
    cabinetsData,
    chartDataHook,
  ]);

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

  /**
   * Restores a soft-deleted cabinet by clearing its deletedAt field.
   */
  const handleRestoreCabinet = (cabinet: Cabinet) => {
    setRestoreTarget(cabinet);
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;

    setIsRestoring(true);
    try {
      const response = await fetch(`/api/cabinets/${restoreTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Machine restored successfully');
        setRestoreTarget(null);
        handleRefresh();
      } else {
        toast.error(result.error || 'Failed to restore machine');
      }
    } catch {
      toast.error('An error occurred during restoration');
    } finally {
      setIsRestoring(false);
    }
  };

  /**
   * Permanently deletes a cabinet from the database.
   * This action is restricted to admins and developers.
   */
  const handlePermanentDeleteCabinet = (cabinet: Cabinet) => {
    setDeleteTarget(cabinet);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/cabinets/${deleteTarget._id}?hardDelete=true`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Machine permanently deleted');
        setDeleteTarget(null);
        handleRefresh();
      } else {
        toast.error(result.error || 'Failed to delete machine permanently');
      }
    } catch {
      toast.error('An error occurred during permanent deletion');
    } finally {
      setIsDeleting(false);
    }
  };

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
          refreshing={cabinetsData.refreshing}
          activeView={activeView}
          canManageMachines={canManageMachines}
          onRefresh={handleRefresh}
          onEditLocation={loc => {
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
            selectedSmibStatus={cabinetsData.selectedSmibStatus}
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
            setSelectedSmibStatus={cabinetsData.setSelectedSmibStatus}
            setSortOption={cabinetsData.setSortOption}
            setSortOrder={cabinetsData.setSortOrder}
            setCurrentPage={cabinetsData.setCurrentPage}
            setChartGranularity={chartDataHook.setChartGranularity}
            setSelectedLocationId={cabinetsData.setSelectedLocationId}
            handleRefresh={handleRefresh}
            onCustomRangeGo={handleCustomRangeGo}
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

      {/* Confirmation Dialogs */}
      <InfoConfirmationDialog
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Machine"
        message={`Are you sure you want to restore ${
          restoreTarget?.serialNumber || restoreTarget?.custom?.name || 'this machine'
        }? It will become active again.`}
        confirmText="Restore"
        cancelText="Cancel"
        isLoading={isRestoring}
      />
      <InfoConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmPermanentDelete}
        title="Permanently Delete Machine"
        message={`CRITICAL: Are you sure you want to PERMANENTLY delete ${
          deleteTarget?.serialNumber || deleteTarget?.custom?.name || 'this machine'
        }? This action cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </>
  );
}
