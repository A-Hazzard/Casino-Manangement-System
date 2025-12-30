/**
 * Location Machines Page
 *
 * Displays all machines/cabinets for a specific location with filtering and management.
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

import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import LocationCabinetsSection from '@/components/locations/sections/LocationCabinetsSection';
import { Button } from '@/components/ui/button';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { NewCabinetModal } from '@/components/ui/cabinets/NewCabinetModal';
import { ActionButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import { useLocationCabinetsData } from '@/lib/hooks/locations/useLocationCabinetsData';
import { useLocationChartData } from '@/lib/hooks/locations/useLocationChartData';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useNewCabinetStore } from '@/lib/store/newCabinetStore';
import { MapPinOff, PlusCircle, RefreshCw, Server, Users } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import MembersNavigation from '@/components/members/common/MembersNavigation';
import {
    MembersHandlersProvider,
    useMembersHandlers,
} from '@/components/members/context/MembersHandlersContext';
import MembersListTab from '@/components/members/tabs/MembersListTab';
import MembersSummaryTab from '@/components/members/tabs/MembersSummaryTab';
import {
    MembersListTabSkeleton,
    MembersSummaryTabSkeleton,
} from '@/components/ui/skeletons/MembersSkeletons';
import { MEMBERS_TABS_CONFIG } from '@/lib/constants/members';
import { useMembersNavigation } from '@/lib/hooks/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense } from 'react';

import { IMAGES } from '@/lib/constants/images';
import {
    useLocationMachineStats,
    useLocationMembershipStats,
} from '@/lib/hooks/data';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { hasMissingCoordinates } from '@/lib/utils/locationsPageUtils';
import type { AggregatedLocation } from '@/shared/types';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Location Members Content Component
 * Wrapper component for members tabs in location details page
 */
function LocationMembersContent({
  locationId,
  locationName,
  selectedLicencee,
  activeTab,
  handleTabClick,
  onRefreshReady,
}: {
  locationId: string;
  locationName: string;
  selectedLicencee: string | null;
  activeTab: string;
  handleTabClick: (tabId: string) => void;
  onRefreshReady?: (refreshHandler: (() => void) | undefined) => void;
}) {
  const { onRefresh, onNewMember, refreshing } = useMembersHandlers();

  // Expose refresh handler to parent component
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(onRefresh);
    }
  }, [onRefresh, onRefreshReady]);

  return (
    <div className="w-full">
      {/* Members Navigation */}
      <MembersNavigation
        availableTabs={MEMBERS_TABS_CONFIG}
        activeTab={activeTab as 'members' | 'summary-report'}
        onTabChange={handleTabClick}
        selectedLicencee={selectedLicencee || undefined}
        onRefresh={onRefresh}
        onNewMember={onNewMember}
        refreshing={refreshing}
        locationName={locationName}
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Suspense
            fallback={
              activeTab === 'members' ? (
                <MembersListTabSkeleton />
              ) : (
                <MembersSummaryTabSkeleton />
              )
            }
          >
            {activeTab === 'members' ? (
              <MembersListTab forcedLocationId={locationId} />
            ) : (
              <MembersSummaryTab selectedLicencee={selectedLicencee || ''} />
            )}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Location Machines Page Component
 * Handles all state management and data fetching for the location machines page
 */
export default function LocationPage() {
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

  const user = useUserStore(state => state.user);

  // ============================================================================
  // State Management
  // ============================================================================
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // ============================================================================
  // Computed Values - Permissions
  // ============================================================================
  const isAdminUser = Boolean(
    user?.roles?.some(role => role === 'admin' || role === 'developer')
  );

  // Check if user can create/edit machines
  const canManageMachines = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    if (userRoles.includes('collector')) {
      return false;
    }
    return [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
    ].some(role => userRoles.includes(role));
  }, [user]);

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
  });

  // Machine status stats from dedicated API (location-specific)
  const { machineStats, machineStatsLoading, refreshMachineStats } =
    useLocationMachineStats(locationId);
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
  const handleFilterChange = (status: 'All' | 'Online' | 'Offline') => {
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

  // ============================================================================
  // Early Returns
  // ============================================================================
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
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  // Determine if Members tab should be shown
  // Show if feature enabled AND (has members OR stats are still loading)
  const showMembersTab =
    cabinetsData.locationMembershipEnabled &&
    (membershipStatsLoading ||
      (membershipStats && membershipStats.membershipCount > 0));

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
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        {/* Header Section: Title, back button, and action buttons */}
        <div className="mt-4 w-full max-w-full">
          {/* Mobile Layout (below sm) */}
          <div className="sm:hidden">
            {/* Back button, title, and action icons aligned */}
            <div className="flex items-center gap-2">
              <Link href="/locations">
                <Button
                  variant="ghost"
                  className="h-8 w-8 flex-shrink-0 rounded-full border border-gray-200 p-1.5 hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="flex min-w-0 flex-1 items-center gap-2 truncate text-lg font-bold text-gray-800">
                Location Details
                {cabinetsData.locationData &&
                hasMissingCoordinates(
                  cabinetsData.locationData as AggregatedLocation
                ) ? (
                  <div className="group relative inline-flex flex-shrink-0">
                    <MapPinOff className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      This location&apos;s coordinates have not been set
                    </div>
                  </div>
                ) : (
                  <Image
                    src={IMAGES.locationIcon}
                    alt="Location Icon"
                    width={32}
                    height={32}
                    className="h-4 w-4 flex-shrink-0"
                  />
                )}
              </h1>
              {/* Refresh icon - Hidden on members tab */}
              {activeView !== 'members' && (
                <button
                  onClick={handleRefresh}
                  disabled={cabinetsData.refreshing}
                  className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${cabinetsData.refreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              )}
              {/* Create icon - Hidden for collectors and on members tab */}
              {activeView === 'machines' && (
                <>
                  {cabinetsData.loading || cabinetsData.cabinetsLoading ? (
                    <div className="h-4 w-4 flex-shrink-0" />
                  ) : canManageMachines ? (
                    <button
                      onClick={() => openCabinetModal(locationId)}
                      disabled={cabinetsData.refreshing}
                      className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Create Machine"
                    >
                      <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Desktop Layout (sm and above) */}
          <div className="hidden items-center justify-between sm:flex">
            <div className="flex w-full items-center gap-3">
              <Link href="/locations" className="mr-2">
                <Button
                  variant="ghost"
                  className="rounded-full border border-gray-200 p-2 hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="flex min-w-0 flex-1 items-center gap-2 truncate text-2xl font-bold text-gray-800 sm:text-3xl">
                Location Details
                {cabinetsData.locationData &&
                hasMissingCoordinates(
                  cabinetsData.locationData as AggregatedLocation
                ) ? (
                  <div className="group relative inline-flex flex-shrink-0">
                    <MapPinOff className="h-6 w-6 flex-shrink-0 text-red-600 sm:h-8 sm:w-8" />
                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      This location&apos;s coordinates have not been set
                    </div>
                  </div>
                ) : (
                  <Image
                    src={IMAGES.locationIcon}
                    alt="Location Icon"
                    width={32}
                    height={32}
                    className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
                  />
                )}
              </h1>
              {/* Mobile: Refresh icon - Hidden on members tab */}
              {activeView !== 'members' && (
                <button
                  onClick={handleRefresh}
                  disabled={cabinetsData.refreshing}
                  className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${cabinetsData.refreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              )}
            </div>
            {/* Desktop: Refresh icon and Create button on far right - Only show on machines tab */}
            {activeView === 'machines' && (
              <div className="ml-4 hidden flex-shrink-0 items-center gap-2 md:flex">
                {/* Refresh icon */}
                <button
                  onClick={handleRefresh}
                  disabled={cabinetsData.refreshing}
                  className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${cabinetsData.refreshing ? 'animate-spin' : ''}`}
                  />
                </button>
                {cabinetsData.loading || cabinetsData.cabinetsLoading ? (
                  <ActionButtonSkeleton width="w-36" showIcon={false} />
                ) : canManageMachines ? (
                  <Button
                    variant="default"
                    className="bg-button text-white"
                    disabled={cabinetsData.refreshing}
                    onClick={() => openCabinetModal(locationId)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Machine
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex w-full border-b border-gray-200">
          <button
            onClick={() => handleViewChange('machines')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeView === 'machines'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server className="h-4 w-4" />
            Machines
          </button>
          {showMembersTab && (
            <button
              onClick={() => handleViewChange('members')}
              className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeView === 'members'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4" />
              Members
            </button>
          )}
        </div>

        {activeView === 'members' ? (
          <MembersHandlersProvider>
            <LocationMembersContent
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
          <LocationCabinetsSection
            financialTotals={
              cabinetsData.financialTotals || {
                moneyIn: 0,
                moneyOut: 0,
                gross: 0,
              }
            }
            chartData={chartDataHook.chartData}
            filteredCabinets={cabinetsData.paginatedCabinets}
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
            refreshing={cabinetsData.refreshing}
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
            handleFilterChange={handleFilterChange}
            handleLocationChangeInPlace={(newLocationId: string) => {
              if (newLocationId === 'all') {
                router.push('/locations');
                return;
              }
              router.push(`/locations/${newLocationId}`);
            }}
          />
        )}

        <NewCabinetModal
          currentLocationName={cabinetsData.locationName}
          onCreated={handleRefresh}
        />
      </PageLayout>

      {/* Cabinet Action Modals */}
      <EditCabinetModal onCabinetUpdated={handleRefresh} />
      <DeleteCabinetModal onCabinetDeleted={handleRefresh} />
    </>
  );
}
