'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';

import { Button } from '@/components/ui/button';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { NewCabinetModal } from '@/components/ui/cabinets/NewCabinetModal';
import { useNewCabinetStore } from '@/lib/store/newCabinetStore';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { useParams, useRouter } from 'next/navigation';
import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import CabinetGrid from '@/components/locationDetails/CabinetGrid';
import { Input } from '@/components/ui/input';
import gsap from 'gsap';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { ActionButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import {
  animateTableRows,
  animateSortDirection,
  animateColumnSort,
  filterAndSortCabinets as filterAndSortCabinetsUtil,
} from '@/lib/utils/ui';
import { calculateCabinetFinancialTotals } from '@/lib/utils/financial';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import CabinetCardsSkeleton from '@/components/ui/locations/CabinetCardsSkeleton';
import CabinetTableSkeleton from '@/components/ui/locations/CabinetTableSkeleton';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import NotFoundError from '@/components/ui/errors/NotFoundError';

import Link from 'next/link';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { ChevronDown } from 'lucide-react';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';

type CabinetSortOption =
  | 'assetNumber'
  | 'locationName'
  | 'moneyIn'
  | 'moneyOut'
  | 'jackpot'
  | 'gross'
  | 'cancelledCredits'
  | 'game'
  | 'smbId'
  | 'serialNumber'
  | 'lastOnline';

export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.slug as string;

  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // State for tracking date filter initialization
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);

  // Detect when date filter is properly initialized
  useEffect(() => {
    if (activeMetricsFilter && !dateFilterInitialized) {
      setDateFilterInitialized(true);
    }
  }, [activeMetricsFilter, dateFilterInitialized]);

  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cabinetsLoading, setCabinetsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<
    'All' | 'Online' | 'Offline'
  >('All');

  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOption, setSortOption] = useState<CabinetSortOption>('moneyIn');
  const [currentPage, setCurrentPage] = useState(0);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // Add back error state
  const [error, setError] = useState<string | null>(null);

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Calculate financial totals from cabinet data
  const financialTotals = calculateCabinetFinancialTotals(allCabinets);

  // Calculate machine status from cabinet data
  const machineStats = {
    onlineMachines: allCabinets.filter(cabinet => cabinet.online === true)
      .length,
    offlineMachines: allCabinets.filter(cabinet => cabinet.online === false)
      .length,
  };

  // ====== Filter Cabinets by search and sort ======
  const applyFiltersAndSort = useCallback(() => {
    const filtered = filterAndSortCabinetsUtil(
      allCabinets,
      searchTerm,
      sortOption,
      sortOrder
    );
    setFilteredCabinets(filtered);
    setCurrentPage(0); // Reset to first page when filters change
  }, [allCabinets, searchTerm, sortOption, sortOrder]);

  // Consolidated data fetch - single useEffect to prevent duplicate requests
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCabinetsLoading(true);
      try {
        // Only proceed if we have a valid activeMetricsFilter and it's been properly initialized
        if (!activeMetricsFilter || !dateFilterInitialized) {
          setAllCabinets([]);
          setError('No time period filter selected');
          setLoading(false);
          setCabinetsLoading(false);
          return;
        }

        // Fetch locations for the selected licensee
        const formattedLocations =
          await fetchAllGamingLocations(selectedLicencee);
        setLocations(formattedLocations);

        // Find the current location in the licensee's locations
        const currentLocation = formattedLocations.find(
          loc => loc.id === locationId
        );

        // Also check with toString() in case of ObjectId issues
        const currentLocationAlt = formattedLocations.find(
          loc => loc.id.toString() === locationId
        );

        // Use the first match found
        const foundLocation = currentLocation || currentLocationAlt;

        // Check if current location exists in new licensee's locations
        let shouldBypassLicenseeFilter = false;

        if (!foundLocation) {
          // Location doesn't exist for this licensee, try to find it in all locations
          console.warn(
            `Location ${locationId} not found for licensee ${selectedLicencee}, trying all locations...`
          );

          // Try fetching all locations to find this specific location
          const allLocations = await fetchAllGamingLocations('all');
          const locationInAllLocations = allLocations.find(
            loc => loc.id === locationId || loc.id.toString() === locationId
          );

          if (locationInAllLocations) {
            // Location exists but belongs to a different licensee
            console.warn(
              `Location found in all locations, but belongs to different licensee than ${selectedLicencee}`
            );
            console.warn(
              'Setting location from all locations:',
              locationInAllLocations.name
            );
            setLocationName(locationInAllLocations.name);
            setSelectedLocation(locationInAllLocations.name);

            // Set a flag to indicate we should bypass licensee filtering for API calls
            shouldBypassLicenseeFilter = true;
            setError(
              'Location belongs to different licensee - showing limited data'
            );
          } else {
            // Location truly doesn't exist
            setSelectedLocation('');
            setLocationName('');
            setAllCabinets([]);
            setError('Location not found');
            setLoading(false);
            setCabinetsLoading(false);
            return;
          }
        } else if (formattedLocations.length === 0) {
          // No locations for this licensee, clear selection
          setSelectedLocation('');
          setLocationName('');
          setAllCabinets([]);
          setError('No locations found for the selected licensee.');
          return;
        }

        // Use the found location data instead of making another API call
        if (foundLocation) {
          console.warn(
            'Setting location from found location:',
            foundLocation.name
          );
          setLocationName(foundLocation.name);
          setSelectedLocation(foundLocation.name);
        } else if (shouldBypassLicenseeFilter) {
          // Location was found in all locations but belongs to different licensee
          // selectedLocation and locationName were already set above
          console.warn(
            'Using location from all locations due to licensee mismatch'
          );
        } else {
          // Fallback if location truly not found - use a more descriptive name
          const fallbackName = `Unknown Location (${locationId})`;
          console.warn('Using fallback location name:', fallbackName);
          setLocationName(fallbackName);
          setSelectedLocation(fallbackName);
        }

        // Fetch cabinets data for the location
        try {
          // Only fetch if we have a valid activeMetricsFilter - no fallback
          if (!activeMetricsFilter) {
            setAllCabinets([]);
            setError('No time period filter selected');
            return;
          }

          // Check if we should bypass licensee filtering (location belongs to different licensee)
          const licenseeForCabinets = shouldBypassLicenseeFilter
            ? undefined
            : selectedLicencee;

          const cabinetsData = await fetchCabinetsForLocation(
            locationId, // Always use the URL slug for cabinet fetching
            licenseeForCabinets, // Use undefined if location belongs to different licensee
            activeMetricsFilter, // Pass the selected filter directly
            undefined, // Don't pass searchTerm (4th parameter)

            activeMetricsFilter === 'Custom' && customDateRange
              ? { from: customDateRange.startDate, to: customDateRange.endDate }
              : undefined // Only pass customDateRange when filter is "Custom"
          );
          setAllCabinets(cabinetsData);

          // Clear error only if we successfully fetched data or if it's a licensee mismatch
          if (shouldBypassLicenseeFilter) {
            setError(
              'Location belongs to different licensee - showing limited data'
            );
          } else {
            setError(null);
          }
        } catch (error) {
          // Error handling for cabinet data fetch
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching cabinets:', error);
          }
          setAllCabinets([]);
          setError('Failed to fetch cabinets data.');
        }
      } finally {
        setLoading(false);
        setCabinetsLoading(false);
      }
    };

    fetchData();
  }, [
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    router,
  ]);

  // Effect to re-run filtering and sorting when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // ====== Sorting / Pagination Logic ======
  const handleSortToggle = () => {
    animateSortDirection(sortOrder);
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleColumnSort = (column: CabinetSortOption) => {
    animateColumnSort(tableRef, column);

    if (sortOption === column) {
      handleSortToggle();
    } else {
      setSortOption(column);
      setSortOrder('desc'); // Default to desc when changing column
    }
    setIsFilterMenuOpen(false); // Close mobile menu on sort
  };

  // Pagination Calculations
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredCabinets?.length || 0 / itemsPerPage);

  // Animation hooks for filtering and sorting
  useEffect(() => {
    if (!loading && !cabinetsLoading) {
      animateTableRows(tableRef);
    }
  }, [
    filteredCabinets,
    sortOption,
    sortOrder,
    currentPage,
    loading,
    cabinetsLoading,
  ]);

  const handleFirstPage = () => setCurrentPage(0);
  const handleLastPage = () => setCurrentPage(totalPages - 1);
  const handlePrevPage = () =>
    currentPage > 0 && setCurrentPage(currentPage - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && setCurrentPage(currentPage + 1);

  // ====== Event Handlers ======
  const handleFilterChange = (status: 'All' | 'Online' | 'Offline') => {
    setSelectedStatus(status);

    if (!allCabinets) return;

    if (status === 'All') {
      setFilteredCabinets(allCabinets);
    } else if (status === 'Online') {
      setFilteredCabinets(
        allCabinets.filter(cabinet => cabinet.online === true)
      );
    } else if (status === 'Offline') {
      setFilteredCabinets(
        allCabinets.filter(cabinet => cabinet.online === false)
      );
    }
  };

  // Add a refresh function
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setCabinetsLoading(true);
    try {
      // Fetch cabinets data for the SELECTED location
      try {
        // Only fetch if we have a valid activeMetricsFilter and it's been properly initialized
        if (!activeMetricsFilter || !dateFilterInitialized) {
          setAllCabinets([]);
          setError('No time period filter selected');
          return;
        }

        const cabinetsData = await fetchCabinetsForLocation(
          locationId, // Always use the URL slug for cabinet fetching
          selectedLicencee,
          activeMetricsFilter,
          undefined, // Don't pass searchTerm

          activeMetricsFilter === 'Custom' && customDateRange
            ? { from: customDateRange.startDate, to: customDateRange.endDate }
            : undefined // Only pass customDateRange when filter is "Custom"
        );
        setAllCabinets(cabinetsData);
        setError(null); // Clear any previous errors on successful refresh
      } catch {
        setAllCabinets([]);
        setError('Failed to refresh cabinets. Please try again later.');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
      setCabinetsLoading(false);
    }
  }, [
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    locationId,
  ]);

  // Handle location change without navigation - just update the selected location
  const handleLocationChangeInPlace = (newLocationId: string) => {
    // Navigate to the new location URL
    router.push(`/locations/${newLocationId}`);
    setIsLocationDropdownOpen(false);
  };

  const { openCabinetModal } = useNewCabinetStore();

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: loading || cabinetsLoading || refreshing,
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
          <div className="space-y-3 sm:hidden">
            {/* Back button and title */}
            <div className="flex items-center gap-3">
              <Link href="/locations">
                <Button
                  variant="ghost"
                  className="rounded-full border border-gray-200 p-2 hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="flex-1 text-xl font-bold text-gray-800">
                Location Details
              </h1>
            </div>

            {/* Action buttons - stacked on mobile */}
            <div className="flex gap-2">
              <RefreshButton
                onClick={handleRefresh}
                isSyncing={refreshing}
                disabled={loading || cabinetsLoading || refreshing}
                label="Refresh"
                className="flex-1"
              />
              {loading || cabinetsLoading ? (
                <ActionButtonSkeleton width="flex-1" showIcon={false} />
              ) : (
                <Button
                  variant="default"
                  className="flex-1 bg-button text-white"
                  disabled={loading || cabinetsLoading || refreshing}
                  onClick={() => openCabinetModal(locationId)}
                >
                  Create
                </Button>
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
              <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
                Location Details
              </h1>
              <RefreshButton
                onClick={handleRefresh}
                isSyncing={refreshing}
                disabled={loading || cabinetsLoading || refreshing}
                label="Refresh"
                className="ml-auto"
              />
              {loading || cabinetsLoading ? (
                <ActionButtonSkeleton width="w-36" showIcon={false} />
              ) : (
                <Button
                  variant="default"
                  className="ml-2 bg-button text-white"
                  disabled={loading || cabinetsLoading || refreshing}
                  onClick={() => openCabinetModal(locationId)}
                >
                  Create Machine
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Financial Metrics Section: Location-specific financial overview */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={financialTotals}
            loading={loading || cabinetsLoading}
            title={`Financial Metrics for ${locationName || 'Location'}`}
          />
        </div>

        {/* Date Filters and Machine Status Section: Responsive layout for filters and status */}
        <div className="mt-4">
          {/* Desktop and md: Side by side layout */}
          <div className="hidden items-center justify-between gap-4 md:flex">
            <div className="min-w-0 flex-1">
              <DashboardDateFilters
                disabled={loading || cabinetsLoading || refreshing}
                onCustomRangeGo={handleRefresh}
                hideAllTime={false}
                enableTimeInputs={true}
              />
            </div>
            <div className="ml-4 w-auto flex-shrink-0">
              <MachineStatusWidget
                isLoading={loading || cabinetsLoading}
                onlineCount={machineStats.onlineMachines}
                offlineCount={machineStats.offlineMachines}
              />
            </div>
          </div>

          {/* Mobile: Stacked layout */}
          <div className="flex flex-col gap-4 md:hidden">
            <div className="w-full">
              <DashboardDateFilters
                disabled={loading || cabinetsLoading || refreshing}
                onCustomRangeGo={handleRefresh}
                hideAllTime={false}
                enableTimeInputs={true}
              />
            </div>
            <div className="w-full">
              <MachineStatusWidget
                isLoading={loading || cabinetsLoading}
                onlineCount={machineStats.onlineMachines}
                offlineCount={machineStats.offlineMachines}
              />
            </div>
          </div>
        </div>

        {/* Search and Location Selection Section: Desktop search bar with location dropdown */}
        <div className="mt-4 hidden items-center gap-4 bg-buttonActive p-4 md:flex">
          <div className="relative min-w-0 max-w-md flex-1">
            <Input
              type="text"
              placeholder="Search machines (Asset, SMID, Serial, Game)..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              disabled={loading || cabinetsLoading || refreshing}
              onChange={e => {
                if (loading || cabinetsLoading || refreshing) return;
                setSearchTerm(e.target.value);

                // Highlight matched items when searching
                if (tableRef.current && e.target.value.trim() !== '') {
                  // Add a subtle highlight pulse animation
                  gsap.to(tableRef.current, {
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    duration: 0.2,
                    onComplete: () => {
                      gsap.to(tableRef.current, {
                        backgroundColor: 'transparent',
                        duration: 0.5,
                      });
                    },
                  });
                }
              }}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Locations Dropdown */}
          <div className="relative flex-shrink-0" ref={locationDropdownRef}>
            <Button
              variant="outline"
              className={`flex items-center justify-between gap-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ${
                loading || cabinetsLoading || refreshing
                  ? 'cursor-not-allowed opacity-50'
                  : ''
              }`}
              disabled={loading || cabinetsLoading || refreshing}
              onClick={() =>
                !(loading || cabinetsLoading || refreshing) &&
                setIsLocationDropdownOpen(!isLocationDropdownOpen)
              }
            >
              <span className="truncate">
                {selectedLocation || locationName || 'Select Location'}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isLocationDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>
            {isLocationDropdownOpen && (
              <div className="absolute right-0 z-50 mt-1 w-full min-w-[200px] rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="max-h-60 overflow-y-auto">
                  {locations.map(loc => (
                    <button
                      key={loc.id}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                        locationId === loc.id ? 'bg-gray-100 font-medium' : ''
                      }`}
                      onClick={() => handleLocationChangeInPlace(loc.id)}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e =>
              handleFilterChange(e.target.value as 'All' | 'Online' | 'Offline')
            }
            className="h-9 w-auto max-w-[150px] truncate rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
            disabled={loading || cabinetsLoading || refreshing}
          >
            <option value="All">All Machines</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>
        </div>

        {/* Mobile: Search and Location Selection Section */}
        <div className="mt-4 flex flex-col gap-4 md:hidden">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Search machines (Asset, SMID, Serial, Game)..."
              className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              disabled={loading || cabinetsLoading || refreshing}
              onChange={e => {
                if (loading || cabinetsLoading || refreshing) return;
                setSearchTerm(e.target.value);

                // Highlight matched items when searching
                if (tableRef.current && e.target.value.trim() !== '') {
                  // Add a subtle highlight pulse animation
                  gsap.to(tableRef.current, {
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    duration: 0.2,
                    onComplete: () => {
                      gsap.to(tableRef.current, {
                        backgroundColor: 'transparent',
                        duration: 0.5,
                      });
                    },
                  });
                }
              }}
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Mobile: Location Dropdown */}
          <div className="relative w-full" ref={locationDropdownRef}>
            <Button
              variant="outline"
              className={`flex w-full items-center justify-between gap-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ${
                loading || cabinetsLoading || refreshing
                  ? 'cursor-not-allowed opacity-50'
                  : ''
              }`}
              disabled={loading || cabinetsLoading || refreshing}
              onClick={() =>
                !(loading || cabinetsLoading || refreshing) &&
                setIsLocationDropdownOpen(!isLocationDropdownOpen)
              }
            >
              <span className="truncate">
                {selectedLocation || locationName || 'Select Location'}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isLocationDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>
            {isLocationDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="max-h-60 overflow-y-auto">
                  {locations.map(loc => (
                    <button
                      key={loc.id}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                        locationId === loc.id ? 'bg-gray-100 font-medium' : ''
                      }`}
                      onClick={() => handleLocationChangeInPlace(loc.id)}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sort and Filter Section: Sort dropdown and filter controls */}
        <div className="mt-4 flex flex-col md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center rounded-md bg-buttonActive px-4 py-2">
              <span className="mr-2 text-sm text-white">Sort by:</span>
              <div className="relative inline-block">
                <select
                  value={sortOption}
                  onChange={e =>
                    handleColumnSort(e.target.value as CabinetSortOption)
                  }
                  className="appearance-none border-none bg-buttonActive pr-6 text-sm font-medium text-white focus:outline-none"
                >
                  <option value="moneyIn">Today</option>
                  <option value="gross">Yesterday</option>
                  <option value="assetNumber">Last 7 days</option>
                  <option value="jackpot">Last 30 days</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-white"
                />
              </div>
            </div>

            <RefreshButton
              onClick={handleRefresh}
              isSyncing={refreshing}
              disabled={loading || cabinetsLoading || refreshing}
              label="Refresh"
              size="sm"
              className="px-3"
            />
          </div>
        </div>

        {/* Mobile Filter Radio Buttons: Status filter controls */}
        <div className="mt-4 flex justify-start gap-4 md:hidden">
          <label className="flex cursor-pointer items-center space-x-2">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                selectedStatus === 'All'
                  ? 'border border-[#5119e9] bg-[#5119e9]'
                  : 'border border-[#5119e9] bg-white'
              }`}
              onClick={() => handleFilterChange('All')}
            >
              {selectedStatus === 'All' && (
                <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">All</span>
          </label>

          <label className="flex cursor-pointer items-center space-x-2">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                selectedStatus === 'Online'
                  ? 'border border-[#5119e9] bg-[#5119e9]'
                  : 'border border-[#5119e9] bg-white'
              }`}
              onClick={() => handleFilterChange('Online')}
            >
              {selectedStatus === 'Online' && (
                <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">Online</span>
          </label>

          <label className="flex cursor-pointer items-center space-x-2">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                selectedStatus === 'Offline'
                  ? 'border border-[#5119e9] bg-[#5119e9]'
                  : 'border border-[#5119e9] bg-white'
              }`}
              onClick={() => handleFilterChange('Offline')}
            >
              {selectedStatus === 'Offline' && (
                <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">Offline</span>
          </label>
        </div>

        {/* Mobile Sort and Filter Buttons: Action controls for mobile users */}
        <div className="mt-4 flex justify-between md:hidden">
          <Button
            variant="default"
            className="flex items-center gap-2 rounded-full bg-button px-6 py-2 text-white"
            onClick={handleSortToggle}
          >
            <ArrowUpDown size={16} />
            <span>Sort</span>
          </Button>

          <Button
            variant="default"
            className="flex items-center gap-2 rounded-full bg-button px-6 py-2 text-white"
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
          >
            <Filter size={16} />
            <span>Filter</span>
          </Button>

          {isFilterMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-4 z-10 mt-12 w-48 rounded-md border border-gray-200 bg-white shadow-lg"
            >
              <div className="border-b p-2 text-sm font-semibold">Sort by:</div>
              {[
                { label: 'Today', value: 'moneyIn' },
                { label: 'Yesterday', value: 'gross' },
                { label: 'Last 7 days', value: 'assetNumber' },
                { label: 'Last 30 days', value: 'jackpot' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() =>
                    handleColumnSort(opt.value as CabinetSortOption)
                  }
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    sortOption === opt.value ? 'bg-gray-100 font-medium' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Content Section: Main cabinet data display with responsive layouts */}
        <div className="w-full flex-1">
          {loading || cabinetsLoading ? (
            <>
              {/* Use CabinetTableSkeleton for lg+ only */}
              <div className="hidden lg:block">
                <CabinetTableSkeleton />
              </div>
              {/* Use CabinetCardsSkeleton for mobile and tablet (up to md) */}
              <div className="block lg:hidden">
                <CabinetCardsSkeleton />
              </div>
            </>
          ) : filteredCabinets.length === 0 ? (
            <div className="mt-10 text-center text-gray-500">
              No cabinets found{searchTerm ? ' matching your search' : ''}.
            </div>
          ) : filteredCabinets == null ? (
            <div className="mt-10 text-center text-gray-500">
              Loading cabinets...
            </div>
          ) : (
            <>
              <div ref={tableRef}>
                <CabinetGrid
                  filteredCabinets={
                    filteredCabinets
                      .filter(cab => getSerialNumberIdentifier(cab) !== 'N/A')
                      .map(cab => ({
                        ...cab,
                        isOnline: cab.online,
                      })) as ExtendedCabinetDetail[]
                  }
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  router={router}
                />
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center space-x-2 pb-6">
                  <Button
                    onClick={handleFirstPage}
                    disabled={currentPage === 0}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-700">Page</span>
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
                    className="w-16 rounded border px-2 py-1 text-center text-sm"
                    aria-label="Page number"
                  />
                  <span className="text-sm text-gray-700">of {totalPages}</span>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages - 1}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages - 1}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {error === 'Location not found' ? (
          <NotFoundError
            title="Location Not Found"
            message={`The location with ID "${locationId}" could not be found for the selected licensee.`}
            resourceType="location"
            showRetry={false}
            customBackText="Back to Locations"
            customBackHref="/locations"
          />
        ) : error ? (
          <div className="mt-10 text-center text-red-500">{error}</div>
        ) : null}

        <NewCabinetModal
          currentLocationName={locationName}
          onCreated={handleRefresh}
        />
      </PageLayout>

      {/* Cabinet Action Modals */}
      <EditCabinetModal onCabinetUpdated={handleRefresh} />
      <DeleteCabinetModal onCabinetDeleted={handleRefresh} />
    </>
  );
}
