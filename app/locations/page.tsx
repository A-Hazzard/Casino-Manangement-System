/**
 * Locations Page
 *
 * Displays and manages gaming locations with filtering, sorting, and pagination.
 *
 * Features:
 * - Location listing with card (mobile) and table (desktop) views
 * - Search and filter by SMIB status
 * - Financial metrics overview
 * - Machine status widget
 * - Create, edit, and delete locations (role-based)
 * - Batch loading for performance
 * - Responsive design for mobile and desktop
 */

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
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Plus, PlusCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import PaginationControls from '@/components/ui/PaginationControls';
import { IMAGES } from '@/lib/constants/images';
import {
  useLocationData,
  useLocationMachineStats,
  useLocationModals,
  useLocationSorting,
} from '@/lib/hooks/data';
import { useGlobalErrorHandler } from '@/lib/hooks/data/useGlobalErrorHandler';
import { useUserStore } from '@/lib/store/userStore';
import { calculateLocationFinancialTotals } from '@/lib/utils/financial';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { fetchDashboardTotals } from '@/lib/helpers/dashboard';
import { DashboardTotals } from '@/lib/types';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';
import { animateCards, animateTableRows } from '@/lib/utils/ui';
import { AggregatedLocation } from '@/shared/types/common';
import Image from 'next/image';

/**
 * Locations Page Content Component
 * Handles all state management and data fetching for the locations page
 */
function LocationsPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const { handleApiCallWithRetry: _handleApiCallWithRetry } =
    useGlobalErrorHandler();
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  const user = useUserStore(state => state.user);
  const { openEditModal } = useLocationActionsStore();
  const { displayCurrency } = useCurrencyFormat();

  // ============================================================================
  // State Management
  // ============================================================================
  const [selectedFilters, setSelectedFilters] = useState<LocationFilter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [accumulatedLocations, setAccumulatedLocations] = useState<
    AggregatedLocation[]
  >([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  
  // Separate state for metrics totals (from dedicated API call)
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(false);

  // ============================================================================
  // Constants
  // ============================================================================
  const itemsPerPage = 10;
  const itemsPerBatch = 50;

  // ============================================================================
  // Custom Hooks - Data Management
  // ============================================================================
  const {
    locationData,
    loading,
    searchLoading,
    error,
    fetchData,
    totalCount,
    fetchBatch,
  } = useLocationData({
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      searchTerm,
      selectedFilters,
    });

  // ============================================================================
  // Refs
  // ============================================================================
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const lastLocationDataRef = useRef<AggregatedLocation[]>([]);
  const isResettingRef = useRef(false);

  // ============================================================================
  // Computed Values & Utilities
  // ============================================================================
  const licenseeName =
    getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';

  // Calculate which batch we need based on current page (each batch covers 5 pages of 10 items)
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / (itemsPerBatch / itemsPerPage)) + 1;
  }, [itemsPerBatch, itemsPerPage]);

  // Memoize selectedFilters string to avoid recreating on every render
  const selectedFiltersKey = useMemo(() => {
    return JSON.stringify(selectedFilters);
  }, [selectedFilters]);

  // Check if current user is a developer
  const isDeveloper = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(
      role => typeof role === 'string' && role.toLowerCase() === 'developer'
    );
  }, [user?.roles]);

  // Only managers, admins, developers, and location admins can create/edit/delete locations
  const canManageLocations = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Exclude collectors and technicians
    if (userRoles.includes('collector') || userRoles.includes('technician')) {
      return false;
    }
    return ['developer', 'admin', 'manager', 'location admin'].some(role =>
      userRoles.includes(role)
    );
  }, [user]);

  // Use accumulated locations for pagination (or filtered data for search)
  const locationsForPagination = searchTerm.trim()
    ? locationData
    : accumulatedLocations;

  // Filter out test locations (unless developer)
  const filteredLocationData = useMemo(() => {
    if (isDeveloper) {
      return locationsForPagination; // Developers can see all locations including test ones
    }
    const testPattern = /^test/i;
    return locationsForPagination.filter(location => {
      const name = location.name?.trim() || '';
      return !testPattern.test(name);
    });
  }, [locationsForPagination, isDeveloper]);

  // ============================================================================
  // Custom Hooks - Additional Functionality
  // ============================================================================
  const { machineStats, machineStatsLoading } = useLocationMachineStats();

  const {
    isNewLocationModalOpen,
    openNewLocationModal,
    closeNewLocationModal,
    handleLocationClick,
    handleTableAction,
  } = useLocationModals();

  const { sortOrder, sortOption, handleColumnSort, totalPages, currentItems } =
    useLocationSorting({
    locationData: filteredLocationData,
    selectedFilters,
    currentPage,
    totalCount: searchTerm.trim() ? undefined : totalCount,
    itemsPerPage,
  });

  // Calculate financial totals from location data (for backward compatibility, but metrics cards use metricsTotals)
  const financialTotals = calculateLocationFinancialTotals(
    accumulatedLocations.length > 0 ? accumulatedLocations : locationData
  );

  // Show loading state for search
  const isLoading = loading || searchLoading;

  // ============================================================================
  // Event Handlers
  // ============================================================================
  // Handler for refresh button
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ============================================================================
  // Effects - Data Fetching
  // ============================================================================
  // Memoize date range timestamps to avoid complex expressions in dependency array
  const startDateTimestamp = customDateRange?.startDate?.getTime();
  const endDateTimestamp = customDateRange?.endDate?.getTime();

  // Initialize: fetch first batch on mount and when filters change (excluding searchTerm)
  // Search is handled internally by useLocationData hook with debouncing
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Reset accumulated data when filters change
      isResettingRef.current = true;
      setAccumulatedLocations([]);
      setLoadedBatches(new Set());
      lastLocationDataRef.current = [];
      fetchData(1, itemsPerBatch);
      // Reset flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isResettingRef.current = false;
      }, 0);
    }
  }, [
    selectedLicencee,
    activeMetricsFilter,
    startDateTimestamp,
    endDateTimestamp,
    selectedFiltersKey,
    searchTerm,
    itemsPerBatch,
    fetchData,
  ]);

  // Update accumulated locations when new data arrives
  useEffect(() => {
    // Skip if we're in the middle of resetting
    if (isResettingRef.current) {
      return;
    }

    // Check if locationData actually changed by comparing IDs
    const currentIds = new Set(locationData.map(loc => loc._id));
    const lastIds = new Set(lastLocationDataRef.current.map(loc => loc._id));
    
    // Check if sets are different
    const dataChanged = 
      currentIds.size !== lastIds.size ||
      Array.from(currentIds).some(id => !lastIds.has(id)) ||
      Array.from(lastIds).some(id => !currentIds.has(id));

    if (!dataChanged && locationData.length > 0) {
      return;
    }

    if (locationData.length > 0 && !searchTerm.trim()) {
      setAccumulatedLocations(prev => {
        // Merge with existing, avoiding duplicates
        const existingIds = new Set(prev.map(loc => loc._id));
        const newLocations = locationData.filter(
          loc => !existingIds.has(loc._id)
        );
        return [...prev, ...newLocations];
      });
    } else if (searchTerm.trim()) {
      // For search, use the data directly
      setAccumulatedLocations(locationData);
    }

    // Update ref with current data
    lastLocationDataRef.current = locationData;
  }, [locationData, searchTerm]);

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee('');
    }
  }, [selectedLicencee, setSelectedLicencee]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedFilters, setCurrentPage]);

  // Separate useEffect to fetch metrics totals independently (like dashboard does)
  // This ensures metrics cards always show totals from all locations, separate from table pagination
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!activeMetricsFilter) {
        console.log('🔍 [LocationsPage] Skipping metrics fetch - no activeMetricsFilter');
        return;
      }

      console.log('🔍 [LocationsPage] Starting metrics totals fetch:', {
        activeMetricsFilter,
        selectedLicencee,
        displayCurrency,
        customDateRange: customDateRange ? {
          startDate: customDateRange.startDate?.toISOString(),
          endDate: customDateRange.endDate?.toISOString()
        } : null
      });

      setMetricsTotalsLoading(true);
      try {
        await new Promise<void>((resolve, reject) => {
          fetchDashboardTotals(
            activeMetricsFilter || 'Today',
            customDateRange || {
              startDate: new Date(),
              endDate: new Date(),
            },
            selectedLicencee,
            totals => {
              console.log('🔍 [LocationsPage] fetchDashboardTotals callback received:', {
                totals,
                moneyIn: totals?.moneyIn,
                moneyOut: totals?.moneyOut,
                gross: totals?.gross
              });
              setMetricsTotals(totals);
              console.log('🔍 [LocationsPage] setMetricsTotals called with:', totals);
              resolve();
            },
            displayCurrency
          ).catch(reject);
        });
      } catch (error) {
        console.error('❌ [LocationsPage] Failed to fetch metrics totals:', error);
        setMetricsTotals(null);
      } finally {
        setMetricsTotalsLoading(false);
        console.log('🔍 [LocationsPage] Metrics totals fetch completed');
      }
    };

    fetchMetrics();
  }, [activeMetricsFilter, selectedLicencee, customDateRange, displayCurrency]);

  // Fetch new batch when crossing batch boundary
  useEffect(() => {
    if (searchTerm.trim() || loading) return; // Skip for search or while loading

    const currentBatch = calculateBatchNumber(currentPage);
    const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5 pages per batch

    // Check if we're on the last page of the current batch
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => {
        const newSet = new Set(prev);
        newSet.add(nextBatch);
        return newSet;
      });
      fetchBatch(nextBatch, itemsPerBatch).then(result => {
        if (result.data.length > 0) {
          setAccumulatedLocations(prev => {
            const existingIds = new Set(prev.map(loc => loc._id));
            const newLocations = result.data.filter(
              loc => !existingIds.has(loc._id)
            );
            return [...prev, ...newLocations];
          });
        }
      });
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => {
        const newSet = new Set(prev);
        newSet.add(currentBatch);
        return newSet;
      });
      fetchBatch(currentBatch, itemsPerBatch).then(result => {
        if (result.data.length > 0) {
          setAccumulatedLocations(prev => {
            const existingIds = new Set(prev.map(loc => loc._id));
            const newLocations = result.data.filter(
              loc => !existingIds.has(loc._id)
            );
            return [...prev, ...newLocations];
          });
        }
      });
    }
  }, [
    currentPage,
    searchTerm,
    loading,
    loadedBatches,
    itemsPerBatch,
    itemsPerPage,
    calculateBatchNumber,
    fetchBatch,
  ]);

  // ============================================================================
  // Effects - UI Animations
  // ============================================================================
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

  // ============================================================================
  // Early Returns
  // ============================================================================
  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  if (showNoLicenseeMessage) {
    return <NoLicenseeAssigned />;
  }

  // ============================================================================
  // Render
  // ============================================================================
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
            {/* Mobile: Create icon - Hidden for collectors */}
            {!isLoading && canManageLocations && (
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
            ) : canManageLocations ? (
              <Button
                onClick={openNewLocationModal}
                className="flex-shrink-0 items-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <span>New Location</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Financial Metrics Section: Total financial overview cards */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={metricsTotals || financialTotals}
            loading={isLoading || metricsTotalsLoading}
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
              {/* Mobile and Tablet: show cards */}
              <div className="block lg:hidden">
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
                          canManageLocations={canManageLocations}
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
              <div className="hidden lg:block" ref={tableRef}>
                <LocationTable
                  locations={currentItems}
                  sortOption={sortOption}
                  sortOrder={sortOrder}
                  onSort={handleColumnSort}
                  onLocationClick={handleLocationClick}
                  onAction={handleTableAction}
                  formatCurrency={formatCurrency}
                  canManageLocations={canManageLocations}
                />
              </div>
            </>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && currentItems.length > 0 && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
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

/**
 * Locations Page Component
 * Thin wrapper that handles routing and authentication
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
