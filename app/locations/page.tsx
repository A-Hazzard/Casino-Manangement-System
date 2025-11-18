'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
import { FloatingRefreshButton } from '@/components/ui/FloatingRefreshButton';
import { Input } from '@/components/ui/input';
import CabinetTableSkeleton from '@/components/ui/locations/CabinetTableSkeleton';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { ActionButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useLocationActionsStore } from '@/lib/store/locationActionsStore';
import { LocationFilter } from '@/lib/types/location';
import { formatCurrency } from '@/lib/utils/number';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Plus, PlusCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';

import PageLayout from '@/components/layout/PageLayout';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ClientOnly from '@/components/ui/common/ClientOnly';
import { NetworkError } from '@/components/ui/errors';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import { Label } from '@/components/ui/label';
import DeleteLocationModal from '@/components/ui/locations/DeleteLocationModal';
import EditLocationModal from '@/components/ui/locations/EditLocationModal';
import LocationCard from '@/components/ui/locations/LocationCard';
import LocationSkeleton from '@/components/ui/locations/LocationSkeleton';
import LocationTable from '@/components/ui/locations/LocationTable';
import NewLocationModal from '@/components/ui/locations/NewLocationModal';
import { IMAGES } from '@/lib/constants/images';
import {
  useLocationData,
  useLocationMachineStats,
  useLocationModals,
  useLocationPagination,
  useLocationSorting,
} from '@/lib/hooks/data';
import { useGlobalErrorHandler } from '@/lib/hooks/data/useGlobalErrorHandler';
import { useUserStore } from '@/lib/store/userStore';
import { calculateLocationFinancialTotals } from '@/lib/utils/financial';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';
import { animateCards, animateTableRows } from '@/lib/utils/ui';
import Image from 'next/image';

function LocationsPageContent() {
  const { handleApiCallWithRetry: _handleApiCallWithRetry } =
    useGlobalErrorHandler();
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  const user = useUserStore(state => state.user);
  const licenseeName =
    getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';

  const { openEditModal } = useLocationActionsStore();

  const [selectedFilters, setSelectedFilters] = useState<LocationFilter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Refs for animations
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Custom hooks for data management
  const { locationData, loading, searchLoading, error, fetchData } =
    useLocationData({
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      searchTerm,
      selectedFilters,
    });

  // Check if current user is a developer
  const isDeveloper = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(role => 
      typeof role === 'string' && role.toLowerCase() === 'developer'
    );
  }, [user?.roles]);

  // Filter out test locations (unless developer)
  const filteredLocationData = useMemo(() => {
    if (isDeveloper) {
      return locationData; // Developers can see all locations including test ones
    }
    const testPattern = /^test/i;
    return locationData.filter(location => {
      const name = location.name?.trim() || '';
      return !testPattern.test(name);
    });
  }, [locationData, isDeveloper]);

  const {
    sortedData,
    sortOrder,
    sortOption,
    handleColumnSort,
    totalPages,
    currentItems,
  } = useLocationSorting({
    locationData: filteredLocationData,
    selectedFilters,
  });

  // Custom hooks for additional functionality
  const { machineStats, machineStatsLoading } = useLocationMachineStats();

  const {
    isNewLocationModalOpen,
    openNewLocationModal,
    closeNewLocationModal,
    handleLocationClick,
    handleTableAction,
  } = useLocationModals();

  const {
    currentPage,
    setCurrentPage,
    handleFirstPage,
    handleLastPage,
    handlePrevPage,
    handleNextPage,
  } = useLocationPagination({ totalPages });

  // Handler for refresh button
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Note: Machine stats and modal state are now managed by custom hooks

  // Calculate financial totals from location data
  const financialTotals = calculateLocationFinancialTotals(locationData);

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee('');
    }
  }, [selectedLicencee, setSelectedLicencee]);

  // Note: Machine stats fetching is now handled by useLocationMachineStats hook

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedFilters, setCurrentPage]);

  // Note: Scroll handling is now managed by custom hooks

  // Note: Pagination and action handlers are now managed by custom hooks

  // Show loading state for search
  const isLoading = loading || searchLoading;

  // Animate when filtered data changes (filtering, sorting, search, pagination)
  useEffect(() => {
    if (!isLoading && currentItems.length > 0) {
      // Animate table rows for desktop view
      if (tableRef.current) {
        animateTableRows(tableRef);
      }
      // Animate cards for mobile view
      if (cardsRef.current) {
        animateCards(cardsRef);
      }
    }
  }, [
    currentItems,
    selectedFilters,
    searchTerm,
    sortOption,
    sortOrder,
    isLoading,
  ]);

  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  if (showNoLicenseeMessage) {
    return <NoLicenseeAssigned />;
  }

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        {/* <MaintenanceBanner /> */}
        {/* Header Section: Title, refresh button, and new location button */}
        <div className="mt-4 flex w-full max-w-full items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="flex min-w-0 flex-1 items-center gap-2 truncate text-lg font-bold text-gray-800 sm:text-2xl md:text-3xl">
              Locations
              <Image
                src={IMAGES.locationIcon}
                alt="Location Icon"
                width={32}
                height={32}
                className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
              />
            </h1>
            {/* Mobile: Refresh icon */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            {/* Mobile: Create icon */}
            {!isLoading && (
              <button
                onClick={openNewLocationModal}
                disabled={isLoading}
                className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
                aria-label="New Location"
              >
                <PlusCircle className="h-4 w-4 text-green-600 hover:text-green-700 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
          {/* Desktop: Refresh icon and Create button on far right */}
          <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
            {/* Refresh icon */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            {isLoading ? (
              <ActionButtonSkeleton width="w-36" showIcon={true} />
            ) : (
              <Button
                onClick={openNewLocationModal}
                className="flex-shrink-0 items-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <span>New Location</span>
              </Button>
            )}
          </div>
        </div>

        {/* Financial Metrics Section: Total financial overview cards */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={financialTotals}
            loading={isLoading}
            title="Total for all Locations"
          />
        </div>

        {/* Date Filters Section: Desktop layout with date filters and machine status */}
        <div className="mb-0 mt-4 hidden items-center justify-between gap-4 md:flex">
          <div className="min-w-0 flex-1">
            <DashboardDateFilters
              hideAllTime={true}
              onCustomRangeGo={fetchData}
              disabled={isLoading}
            />
          </div>
          <div className="ml-4 w-auto flex-shrink-0">
            <MachineStatusWidget
              isLoading={machineStatsLoading}
              onlineCount={machineStats?.onlineMachines || 0}
              offlineCount={machineStats?.offlineMachines || 0}
              totalCount={machineStats?.totalMachines}
              showTotal={true}
            />
          </div>
        </div>

        {/* Mobile/Tablet: Date Filters and Machine Status stacked layout */}
        <div className="mt-4 flex flex-col gap-4 md:hidden">
          <div className="w-full">
            <DashboardDateFilters
              hideAllTime={true}
              onCustomRangeGo={fetchData}
              disabled={isLoading}
            />
          </div>
          <div className="w-full">
            <MachineStatusWidget
              isLoading={machineStatsLoading}
              onlineCount={machineStats?.onlineMachines || 0}
              offlineCount={machineStats?.offlineMachines || 0}
              totalCount={machineStats?.totalMachines}
              showTotal={true}
            />
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Search locations..."
              className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Mobile SMIB Filter Checkboxes */}
          <div className="flex w-full items-center justify-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobileSmibFilter"
                checked={selectedFilters.includes('SMIBLocationsOnly')}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedFilters(prev => [...prev, 'SMIBLocationsOnly']);
                  } else {
                    setSelectedFilters(prev =>
                      prev.filter(f => f !== 'SMIBLocationsOnly')
                    );
                  }
                }}
                className="border-buttonActive text-grayHighlight focus:ring-buttonActive"
              />
              <Label
                htmlFor="mobileSmibFilter"
                className="text-sm font-medium text-gray-700"
              >
                SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobileNoSmibFilter"
                checked={selectedFilters.includes('NoSMIBLocation')}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedFilters(prev => [...prev, 'NoSMIBLocation']);
                  } else {
                    setSelectedFilters(prev =>
                      prev.filter(f => f !== 'NoSMIBLocation')
                    );
                  }
                }}
                className="border-buttonActive text-grayHighlight focus:ring-buttonActive"
              />
              <Label
                htmlFor="mobileNoSmibFilter"
                className="text-sm font-medium text-gray-700"
              >
                No SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobileLocalServerFilter"
                checked={selectedFilters.includes('LocalServersOnly')}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedFilters(prev => [...prev, 'LocalServersOnly']);
                  } else {
                    setSelectedFilters(prev =>
                      prev.filter(f => f !== 'LocalServersOnly')
                    );
                  }
                }}
                className="border-buttonActive text-grayHighlight focus:ring-buttonActive"
              />
              <Label
                htmlFor="mobileLocalServerFilter"
                className="text-sm font-medium text-gray-700"
              >
                Local Server
              </Label>
            </div>
          </div>
        </div>

        {/* Search and Filter Section: Desktop search bar with SMIB filters */}
        <div className="mt-4 hidden items-center gap-4 bg-buttonActive p-4 md:flex">
          <div className="relative min-w-0 flex-1">
            <Input
              type="text"
              placeholder="Search locations..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* SMIB Filter Checkboxes */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="smibFilter"
                checked={selectedFilters.includes('SMIBLocationsOnly')}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedFilters(prev => [...prev, 'SMIBLocationsOnly']);
                  } else {
                    setSelectedFilters(prev =>
                      prev.filter(f => f !== 'SMIBLocationsOnly')
                    );
                  }
                }}
                className="border-white text-white focus:ring-white"
              />
              <Label
                htmlFor="smibFilter"
                className="whitespace-nowrap text-sm font-medium text-white"
              >
                SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="noSmibFilter"
                checked={selectedFilters.includes('NoSMIBLocation')}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedFilters(prev => [...prev, 'NoSMIBLocation']);
                  } else {
                    setSelectedFilters(prev =>
                      prev.filter(f => f !== 'NoSMIBLocation')
                    );
                  }
                }}
                className="border-white text-white focus:ring-white"
              />
              <Label
                htmlFor="noSmibFilter"
                className="whitespace-nowrap text-sm font-medium text-white"
              >
                No SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="localServerFilter"
                checked={selectedFilters.includes('LocalServersOnly')}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedFilters(prev => [...prev, 'LocalServersOnly']);
                  } else {
                    setSelectedFilters(prev =>
                      prev.filter(f => f !== 'LocalServersOnly')
                    );
                  }
                }}
                className="border-white text-white focus:ring-white"
              />
              <Label
                htmlFor="localServerFilter"
                className="whitespace-nowrap text-sm font-medium text-white"
              >
                Local Server
              </Label>
            </div>
          </div>
        </div>

        {/* Content Section: Main data display with responsive layouts */}
        <div className="w-full flex-1">
          {error ? (
            <NetworkError
              title="Failed to Load Locations"
              message="Unable to load location data. Please check your connection and try again."
              onRetry={fetchData}
              isRetrying={refreshing}
              errorDetails={error}
            />
          ) : isLoading ? (
            <>
              {/* Mobile: show 3 card skeletons */}
              <div className="block md:hidden">
                <ClientOnly
                  fallback={
                    <div className="grid grid-cols-1 gap-4">
                      {[...Array(3)].map((_, i) => (
                        <LocationSkeleton key={i} />
                      ))}
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <LocationSkeleton key={i} />
                    ))}
                  </div>
                </ClientOnly>
              </div>
              {/* Desktop: show 1 table skeleton */}
              <div className="hidden md:block">
                <ClientOnly fallback={<CabinetTableSkeleton />}>
                  <CabinetTableSkeleton />
                </ClientOnly>
              </div>
            </>
          ) : currentItems.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-lg text-gray-500">
                {searchTerm
                  ? 'No locations found matching your search.'
                  : `No locations found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}.`}
              </span>
            </div>
          ) : (
            <>
              {/* Mobile: show cards */}
              <div className="block md:hidden">
                <ClientOnly
                  fallback={
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[...Array(3)].map((_, i) => (
                        <LocationSkeleton key={i} />
                      ))}
                    </div>
                  }
                >
                  <div
                    className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                    ref={cardsRef}
                  >
                    {!isLoading ? (
                      currentItems.map((location, index) => (
                        <LocationCard
                          key={`${location._id}-${index}`}
                          location={location}
                          onLocationClick={handleLocationClick}
                          onEdit={() => openEditModal(location)}
                        />
                      ))
                    ) : (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <LocationSkeleton key={i} />
                        ))}
                      </>
                    )}
                  </div>
                </ClientOnly>
              </div>
              {/* Desktop: show table */}
              <div className="hidden md:block" ref={tableRef}>
                <LocationTable
                  locations={currentItems}
                  sortOption={sortOption}
                  sortOrder={sortOrder}
                  onSort={handleColumnSort}
                  onLocationClick={handleLocationClick}
                  onAction={handleTableAction}
                  formatCurrency={formatCurrency}
                />
              </div>
            </>
          )}
        </div>

        {/* Pagination Section: Navigation controls for data pages */}
        {totalPages > 1 && (
          <>
            {/* Mobile Pagination */}
            <div className="mt-4 flex flex-col space-y-3 sm:hidden">
              <div className="text-center text-xs text-gray-600">
                Page {currentPage + 1} of {totalPages} ({sortedData.length}{' '}
                locations)
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFirstPage}
                  disabled={currentPage === 0}
                  className="px-2 py-1 text-xs"
                >
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="px-2 py-1 text-xs"
                >
                  ‹
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage + 1}
                    onChange={e => {
                      let val = Number(e.target.value);
                      if (isNaN(val)) val = 1;
                      if (val < 1) val = 1;
                      if (val > totalPages) val = totalPages;
                      setCurrentPage(val - 1);
                    }}
                    className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-xs text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                    aria-label="Page number"
                  />
                  <span className="text-xs text-gray-600">of {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                  className="px-2 py-1 text-xs"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLastPage}
                  disabled={currentPage === totalPages - 1}
                  className="px-2 py-1 text-xs"
                >
                  »»
                </Button>
              </div>
            </div>
            {/* Desktop Pagination */}
            <div className="mt-4 hidden items-center justify-center space-x-2 sm:flex">
              <Button
                onClick={handleFirstPage}
                disabled={currentPage === 0}
                variant="ghost"
              >
                <DoubleArrowLeftIcon />
              </Button>
              <Button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                variant="ghost"
              >
                <ChevronLeftIcon />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage + 1}
                  onChange={e => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > totalPages) val = totalPages;
                    setCurrentPage(val - 1);
                  }}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                  aria-label="Page number"
                />
                <span className="text-sm text-gray-600">of {totalPages}</span>
              </div>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                variant="ghost"
              >
                <ChevronRightIcon />
              </Button>
              <Button
                onClick={handleLastPage}
                disabled={currentPage === totalPages - 1}
                variant="ghost"
              >
                <DoubleArrowRightIcon />
              </Button>
            </div>
          </>
        )}
      </PageLayout>
      <EditLocationModal onLocationUpdated={fetchData} />
      <DeleteLocationModal onDelete={fetchData} />
      <NewLocationModal
        isOpen={isNewLocationModalOpen}
        onClose={closeNewLocationModal}
        onCreated={fetchData}
      />

      {/* Floating Refresh Button */}
      <FloatingRefreshButton
        show={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </>
  );
}

export default function LocationsPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <PageErrorBoundary>
        <LocationsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
