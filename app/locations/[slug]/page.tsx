'use client';

import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { useDebounce } from '@/lib/utils/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import CabinetGrid from '@/components/locationDetails/CabinetGrid';
import { Button } from '@/components/ui/button';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { NewCabinetModal } from '@/components/ui/cabinets/NewCabinetModal';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import { CustomSelect } from '@/components/ui/custom-select';
import NotFoundError from '@/components/ui/errors/NotFoundError';
import UnauthorizedError from '@/components/ui/errors/UnauthorizedError';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import { Input } from '@/components/ui/input';
import CabinetCardsSkeleton from '@/components/ui/locations/CabinetCardsSkeleton';
import CabinetTableSkeleton from '@/components/ui/locations/CabinetTableSkeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import { ActionButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useNewCabinetStore } from '@/lib/store/newCabinetStore';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import { calculateCabinetFinancialTotals } from '@/lib/utils/financial';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import {
  animateColumnSort,
  animateSortDirection,
  filterAndSortCabinets as filterAndSortCabinetsUtil,
} from '@/lib/utils/ui';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import gsap from 'gsap';
import { PlusCircle, RefreshCw, Search } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { IMAGES } from '@/lib/constants/images';
import { useUserStore } from '@/lib/store/userStore';
import { getAuthHeaders } from '@/lib/utils/auth';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';

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

  const user = useUserStore(state => state.user);
  const isAdminUser = Boolean(
    user?.roles?.some(role => role === 'admin' || role === 'developer')
  );

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
  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [locationName, setLocationName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<
    'All' | 'Online' | 'Offline'
  >('All');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');

  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [accumulatedCabinets, setAccumulatedCabinets] = useState<Cabinet[]>([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOption, setSortOption] = useState<CabinetSortOption>('moneyIn');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  const tableRef = useRef<HTMLDivElement>(null);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

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

  // Extract game types from cabinets
  const gameTypes = useMemo(() => {
    const uniqueGameTypes = Array.from(
      new Set(
        allCabinets
          .map(cabinet => cabinet.game || cabinet.installedGame)
          .filter(game => game && game.trim() !== '')
      )
    ).sort();
    return uniqueGameTypes;
  }, [allCabinets]);

  // Calculate which batch we need based on current page
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // Fetch new batch when crossing batch boundary
  useEffect(() => {
    if (loading || cabinetsLoading || !activeMetricsFilter) return;

    const currentBatch = calculateBatchNumber(currentPage);

    // Check if we're on the last page of the current batch
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      const nextBatchNumber = nextBatch;
      // Don't fetch next batch if searching (search fetches all results)
      if (debouncedSearchTerm?.trim()) {
        return;
      }

      fetchCabinetsForLocation(
        locationId,
        selectedLicencee,
        activeMetricsFilter,
        undefined, // No searchTerm for batch fetching
        activeMetricsFilter === 'Custom' && customDateRange
          ? { from: customDateRange.startDate, to: customDateRange.endDate }
          : undefined,
        nextBatchNumber,
        itemsPerBatch
      ).then(result => {
        if (result.data.length > 0) {
          setLoadedBatches(prev => new Set([...prev, nextBatchNumber]));
          setAccumulatedCabinets(prev => {
            const existingIds = new Set(prev.map(cab => cab._id));
            const newCabinets = result.data.filter(
              cab => !existingIds.has(cab._id)
            );
            return [...prev, ...newCabinets];
          });
        }
      });
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      // Don't fetch batch if searching (search fetches all results)
      if (debouncedSearchTerm?.trim()) {
        return;
      }

      fetchCabinetsForLocation(
        locationId,
        selectedLicencee,
        activeMetricsFilter,
        undefined, // No searchTerm for batch fetching
        activeMetricsFilter === 'Custom' && customDateRange
          ? { from: customDateRange.startDate, to: customDateRange.endDate }
          : undefined,
        currentBatch,
        itemsPerBatch
      ).then(result => {
        if (result.data.length > 0) {
          setLoadedBatches(prev => new Set([...prev, currentBatch]));
          setAccumulatedCabinets(prev => {
            const existingIds = new Set(prev.map(cab => cab._id));
            const newCabinets = result.data.filter(
              cab => !existingIds.has(cab._id)
            );
            return [...prev, ...newCabinets];
          });
        }
      });
    }
  }, [
    currentPage,
    loading,
    cabinetsLoading,
    activeMetricsFilter,
    loadedBatches,
    locationId,
    selectedLicencee,
    customDateRange,
    calculateBatchNumber,
    pagesPerBatch,
    searchTerm, // Skip batch fetching when searching
  ]);

  // Update allCabinets when accumulatedCabinets changes
  useEffect(() => {
    setAllCabinets(accumulatedCabinets);
  }, [accumulatedCabinets]);

  // Get items for current page from the current batch
  // When searching, use allCabinets directly (API returns all search results)
  // When not searching, use accumulatedCabinets (batched loading)
  const paginatedCabinets = useMemo(() => {
    // When searching, API returns all results, so use allCabinets directly
    const sourceCabinets = debouncedSearchTerm?.trim()
      ? allCabinets
      : accumulatedCabinets;

    // Calculate position within current batch (0-4 for pages 0-4, 0-4 for pages 5-9, etc.)
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;

    return sourceCabinets.slice(startIndex, endIndex);
  }, [
    accumulatedCabinets,
    allCabinets,
    currentPage,
    itemsPerPage,
    pagesPerBatch,
    debouncedSearchTerm,
  ]);

  // Calculate total pages based on all loaded batches (dynamically increases as batches load)
  // When searching, use allCabinets length (API returns all search results)
  const effectiveTotalPages = useMemo(() => {
    const totalItems = debouncedSearchTerm?.trim()
      ? allCabinets.length
      : accumulatedCabinets.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [
    accumulatedCabinets.length,
    allCabinets.length,
    itemsPerPage,
    debouncedSearchTerm,
  ]);

  // ====== Filter Cabinets by search and sort ======
  // Filter and sort from paginated cabinets (current page's data from loaded batches)
  const applyFiltersAndSort = useCallback(() => {
    // When searchTerm is provided, API already filtered the results
    // We only need to apply sorting and other filters (game type, status)
    // Don't apply search filter again since API already handled it
    let filtered = filterAndSortCabinetsUtil(
      paginatedCabinets,
      '', // Empty search term since API already handled search filtering
      sortOption,
      sortOrder
    );

    // Apply game type filter
    if (selectedGameType && selectedGameType !== 'all') {
      filtered = filtered.filter(cabinet => {
        const cabinetGame = cabinet.game || cabinet.installedGame;
        return cabinetGame === selectedGameType;
      });
    }

    // Apply status filter
    if (selectedStatus && selectedStatus !== 'All') {
      filtered = filtered.filter(cabinet => {
        if (selectedStatus === 'Online') {
          return cabinet.online === true;
        } else if (selectedStatus === 'Offline') {
          return cabinet.online === false;
        }
        return true;
      });
    }

    setFilteredCabinets(filtered);
  }, [
    paginatedCabinets,
    sortOption,
    sortOrder,
    selectedStatus,
    selectedGameType,
  ]);

  // Reset to default view when search is cleared
  useEffect(() => {
    if (!debouncedSearchTerm?.trim()) {
      // Reset to first page, clear accumulated data, and reset batches when search is cleared
      setCurrentPage(0);
      setAccumulatedCabinets([]);
      setLoadedBatches(new Set([1]));
    }
  }, [debouncedSearchTerm]);

  // Reset to first page when other filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [sortOption, sortOrder, selectedStatus, selectedGameType]);

  // Consolidated data fetch - single useEffect to prevent duplicate requests
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCabinetsLoading(true);
      try {
        // Only proceed if we have a valid activeMetricsFilter and it's been properly initialized
        if (!activeMetricsFilter || !dateFilterInitialized) {
          setAllCabinets([]);
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
          setError('No time period filter selected');
          setLoading(false);
          setCabinetsLoading(false);
          return;
        }

        // First, try to fetch location details to check access
        try {
          const locationResponse = await axios.get(
            `/api/locations/${locationId}`,
            {
              headers: getAuthHeaders(),
            }
          );

          // Location exists and user has access
          const locationData =
            locationResponse.data?.location || locationResponse.data;
          if (locationData) {
            setLocationName(locationData.name || 'Location');
            setSelectedLocationId(locationId);
          }
        } catch (locationError) {
          // Check if it's a 403 Unauthorized error
          const errorWithStatus = locationError as Error & {
            status?: number;
            isUnauthorized?: boolean;
            response?: { status?: number };
          };

          if (
            errorWithStatus?.response?.status === 403 ||
            errorWithStatus?.status === 403 ||
            errorWithStatus?.isUnauthorized ||
            (locationError instanceof Error &&
              locationError.message?.includes('Unauthorized')) ||
            (locationError instanceof Error &&
              locationError.message?.includes('do not have access'))
          ) {
            // Location exists but user doesn't have access
            setError('UNAUTHORIZED');
            setLoading(false);
            setCabinetsLoading(false);
            return;
          } else if (errorWithStatus?.response?.status === 404) {
            // Location doesn't exist
            setError('Location not found');
            setLoading(false);
            setCabinetsLoading(false);
            return;
          }
          // For other errors, continue to try fetching locations list
        }

        // Fetch locations for the selected licensee
        const formattedLocations = await fetchAllGamingLocations(
          isAdminUser ? 'all' : selectedLicencee
        );
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

        if (!foundLocation && formattedLocations.length > 0) {
          // Location doesn't exist for this licensee
          setSelectedLocationId('');
          setLocationName('');
          setAllCabinets([]);
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
          setError('Location not found');
          setLoading(false);
          setCabinetsLoading(false);
          return;
        } else if (formattedLocations.length === 0) {
          // No locations for this licensee, clear selection
          setSelectedLocationId('');
          setLocationName('');
          setAllCabinets([]);
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
          setError('No locations found for the selected licensee.');
          setLoading(false);
          setCabinetsLoading(false);
          return;
        }

        // Use the found location data
        if (foundLocation) {
          setLocationName(foundLocation.name);
          setSelectedLocationId(foundLocation.id);
        }

        // Fetch cabinets data for the location
        try {
          // Only fetch if we have a valid activeMetricsFilter - no fallback
          if (!activeMetricsFilter) {
            setAllCabinets([]);
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
            setError('No time period filter selected');
            return;
          }

          // When searching, fetch all results (no pagination limit) to find matches across all machines
          // Otherwise, use pagination for performance
          const effectivePage = debouncedSearchTerm?.trim() ? 1 : 1;
          const effectiveLimit = debouncedSearchTerm?.trim()
            ? undefined
            : itemsPerBatch;

          const result = await fetchCabinetsForLocation(
            locationId, // Always use the URL slug for cabinet fetching
            selectedLicencee,
            activeMetricsFilter, // Pass the selected filter directly
            debouncedSearchTerm?.trim() || undefined, // Pass debouncedSearchTerm to API
            activeMetricsFilter === 'Custom' && customDateRange
              ? { from: customDateRange.startDate, to: customDateRange.endDate }
              : undefined, // Only pass customDateRange when filter is "Custom"
            effectivePage, // page
            effectiveLimit // limit (undefined when searching = fetch all)
          );
          setAllCabinets(result.data);
          // When search is cleared, reset accumulated data to start fresh
          if (!debouncedSearchTerm?.trim()) {
            setAccumulatedCabinets(result.data);
            setLoadedBatches(new Set([1]));
          } else {
            // When searching, use allCabinets directly (API returns all results)
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
          }
          setError(null);
        } catch (error) {
          // Error handling for cabinet data fetch
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching cabinets:', error);
          }

          // Check if it's a 403 Unauthorized error
          const errorWithStatus = error as Error & {
            status?: number;
            isUnauthorized?: boolean;
            response?: { status?: number };
          };
          if (
            errorWithStatus?.status === 403 ||
            errorWithStatus?.isUnauthorized ||
            errorWithStatus?.response?.status === 403 ||
            (error instanceof Error &&
              error.message?.includes('Unauthorized')) ||
            (error instanceof Error &&
              error.message?.includes('do not have access'))
          ) {
            setError('UNAUTHORIZED');
            setAllCabinets([]);
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
          } else {
            setAllCabinets([]);
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
            setError('Failed to fetch cabinets data.');
          }
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
    isAdminUser,
    debouncedSearchTerm, // Use debounced value to trigger fetch only after user stops typing
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
  };

  // Animation hooks for filtering and sorting
  useEffect(() => {
    if (!loading && !cabinetsLoading && filteredCabinets.length > 0) {
      // Small delay to ensure DOM is updated before animation
      const timeoutId = setTimeout(() => {
        if (tableRef.current) {
          // Try to animate table rows (for desktop view)
          const tableRows = tableRef.current.querySelectorAll('tbody tr');
          if (tableRows.length > 0) {
            gsap.fromTo(
              tableRows,
              { opacity: 0, y: 15 },
              {
                opacity: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.05,
                ease: 'power2.out',
              }
            );
          }

          // Try to animate cards (for mobile view)
          const cardsContainer = tableRef.current.querySelector('.grid');
          if (cardsContainer) {
            const cards = Array.from(cardsContainer.children);
            if (cards.length > 0) {
              gsap.fromTo(
                cards,
                { opacity: 0, scale: 0.95, y: 15 },
                {
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  duration: 0.4,
                  stagger: 0.08,
                  ease: 'back.out(1.5)',
                }
              );
            }
          }
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [
    filteredCabinets,
    selectedStatus,
    selectedGameType,
    searchTerm,
    sortOption,
    sortOrder,
    currentPage,
    loading,
    cabinetsLoading,
  ]);

  // ====== Event Handlers ======
  const handleFilterChange = (status: 'All' | 'Online' | 'Offline') => {
    setSelectedStatus(status);
    // Status filter is now handled in applyFiltersAndSort
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
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
          setError('No time period filter selected');
          return;
        }

        // When searching, fetch all results (no pagination limit) to find matches across all machines
        const effectivePage = debouncedSearchTerm?.trim() ? 1 : 1;
        const effectiveLimit = debouncedSearchTerm?.trim()
          ? undefined
          : itemsPerBatch;

        const result = await fetchCabinetsForLocation(
          locationId, // Always use the URL slug for cabinet fetching
          selectedLicencee,
          activeMetricsFilter,
          debouncedSearchTerm?.trim() || undefined, // Pass debouncedSearchTerm to API
          activeMetricsFilter === 'Custom' && customDateRange
            ? { from: customDateRange.startDate, to: customDateRange.endDate }
            : undefined, // Only pass customDateRange when filter is "Custom"
          effectivePage, // page
          effectiveLimit // limit (undefined when searching = fetch all)
        );
        setAllCabinets(result.data);
        // When search is cleared, reset accumulated data to start fresh
        if (!debouncedSearchTerm?.trim()) {
          setAccumulatedCabinets(result.data);
          setLoadedBatches(new Set([1]));
        } else {
          // When searching, use allCabinets directly (API returns all results)
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
        }
        setError(null); // Clear any previous errors on successful refresh
      } catch {
        setAllCabinets([]);
        setAccumulatedCabinets([]);
        setLoadedBatches(new Set());
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
    debouncedSearchTerm,
    itemsPerBatch,
  ]);

  // Handle location change without navigation - just update the selected location
  const handleLocationChangeInPlace = (newLocationId: string) => {
    if (newLocationId === 'all') {
      setSelectedLocationId('all');
      router.push('/locations');
      return;
    }

    setSelectedLocationId(newLocationId);
    router.push(`/locations/${newLocationId}`);
  };

  const { openCabinetModal } = useNewCabinetStore();

  const locationSelectOptions = useMemo(
    () => locations.map(loc => ({ id: loc.id, name: loc.name })),
    [locations]
  );
  const showLocationSelect = locationSelectOptions.length > 1;

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
                <Image
                  src={IMAGES.locationIcon}
                  alt="Location Icon"
                  width={32}
                  height={32}
                  className="h-4 w-4 flex-shrink-0"
                />
              </h1>
              {/* Refresh icon */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>
              {/* Create icon */}
              {loading || cabinetsLoading ? (
                <div className="h-4 w-4 flex-shrink-0" />
              ) : (
                <button
                  onClick={() => openCabinetModal(locationId)}
                  disabled={refreshing}
                  className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Create Machine"
                >
                  <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
                </button>
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
                className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
            {/* Desktop: Refresh icon and Create button on far right */}
            <div className="ml-4 hidden flex-shrink-0 items-center gap-2 md:flex">
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
              {loading || cabinetsLoading ? (
                <ActionButtonSkeleton width="w-36" showIcon={false} />
              ) : (
                <Button
                  variant="default"
                  className="bg-button text-white"
                  disabled={refreshing}
                  onClick={() => openCabinetModal(locationId)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
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
            disableCurrencyConversion={true}
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
                totalCount={allCabinets.length}
                showTotal={true}
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
                totalCount={allCabinets.length}
                showTotal={true}
              />
            </div>
          </div>
        </div>

        {/* Search and Location Selection Section: Desktop search bar with location dropdown */}
        <div className="mt-4 hidden flex-col gap-4 bg-buttonActive p-4 md:flex">
          {/* Search Input - Full Width */}
          <div className="relative w-full">
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

          {/* Filter Buttons - Below Search */}
          <div className="flex flex-wrap items-center gap-4">
            {showLocationSelect && (
              <div className="w-auto min-w-[180px] max-w-[220px] flex-shrink-0">
                <LocationSingleSelect
                  locations={locationSelectOptions}
                  selectedLocation={selectedLocationId || locationId}
                  onSelectionChange={handleLocationChangeInPlace}
                  includeAllOption={true}
                  allOptionLabel="All Locations"
                  showSasBadge={false}
                  className="w-full"
                />
              </div>
            )}

            {/* Game Type Filter */}
            <div className="w-auto min-w-[180px] max-w-[200px] flex-shrink-0">
              <CustomSelect
                value={selectedGameType}
                onValueChange={setSelectedGameType}
                options={[
                  { value: 'all', label: 'All Games' },
                  ...gameTypes
                    .filter((gameType): gameType is string => !!gameType)
                    .map(gameType => ({
                      value: gameType,
                      label: gameType,
                    })),
                ]}
                placeholder="All Games"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={true}
                emptyMessage="No game types found"
              />
            </div>

            {/* Status Filter */}
            <div className="w-auto min-w-[120px] max-w-[150px] flex-shrink-0">
              <CustomSelect
                value={selectedStatus}
                onValueChange={value =>
                  handleFilterChange(value as 'All' | 'Online' | 'Offline')
                }
                options={[
                  { value: 'All', label: 'All Machines' },
                  { value: 'Online', label: 'Online' },
                  { value: 'Offline', label: 'Offline' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={true}
                emptyMessage="No status options found"
              />
            </div>
          </div>
        </div>

        {/* Mobile: Horizontal scrollable filters - Same layout as cabinets page */}
        <div className="mt-4 md:hidden">
          {/* Search Input - Full width */}
          <div className="relative mb-3 w-full">
            <Input
              type="text"
              placeholder="Search machines..."
              className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              onChange={e => {
                if (loading || cabinetsLoading || refreshing) return;
                setSearchTerm(e.target.value);

                // Highlight matched items when searching
                if (tableRef.current && e.target.value.trim() !== '') {
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
              disabled={loading || cabinetsLoading || refreshing}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Filters - Horizontal scrollable */}
          <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex gap-2 overflow-x-auto pb-2">
            <div className="flex min-w-max gap-2">
              {showLocationSelect && (
                <div className="w-40 flex-shrink-0">
                  <LocationSingleSelect
                    locations={locationSelectOptions}
                    selectedLocation={selectedLocationId || locationId}
                    onSelectionChange={handleLocationChangeInPlace}
                    includeAllOption={true}
                    allOptionLabel="All Locations"
                    showSasBadge={false}
                    className="w-full"
                  />
                </div>
              )}
              <div className="relative w-36 flex-shrink-0">
                <CustomSelect
                  value={selectedGameType}
                  onValueChange={setSelectedGameType}
                  options={[
                    { value: 'all', label: 'All Games' },
                    ...gameTypes
                      .filter((gameType): gameType is string => !!gameType)
                      .map(gameType => ({
                        value: gameType,
                        label: gameType,
                      })),
                  ]}
                  placeholder="All Games"
                  className="w-full"
                  triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                  searchable={true}
                  emptyMessage="No game types found"
                />
              </div>
              <div className="relative w-32 flex-shrink-0">
                <CustomSelect
                  value={selectedStatus}
                  onValueChange={value =>
                    handleFilterChange(value as 'All' | 'Online' | 'Offline')
                  }
                  options={[
                    { value: 'All', label: 'All Machines' },
                    { value: 'Online', label: 'Online' },
                    { value: 'Offline', label: 'Offline' },
                  ]}
                  placeholder="All Status"
                  className="w-full"
                  triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                  searchable={true}
                  emptyMessage="No status options found"
                />
              </div>
              <div className="relative w-40 flex-shrink-0">
                <CustomSelect
                  value={`${sortOption}-${sortOrder}`}
                  onValueChange={value => {
                    const [option, order] = value.split('-');
                    handleColumnSort(option as CabinetSortOption);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  options={[
                    {
                      value: 'moneyIn-desc',
                      label: 'Money In (Highest First)',
                    },
                    { value: 'moneyIn-asc', label: 'Money In (Lowest First)' },
                    {
                      value: 'moneyOut-desc',
                      label: 'Money Out (Highest First)',
                    },
                    {
                      value: 'moneyOut-asc',
                      label: 'Money Out (Lowest First)',
                    },
                    {
                      value: 'gross-desc',
                      label: 'Gross Revenue (Highest First)',
                    },
                    {
                      value: 'gross-asc',
                      label: 'Gross Revenue (Lowest First)',
                    },
                    { value: 'jackpot-desc', label: 'Jackpot (Highest First)' },
                    { value: 'jackpot-asc', label: 'Jackpot (Lowest First)' },
                    {
                      value: 'assetNumber-asc',
                      label: 'Asset Number (A to Z)',
                    },
                    {
                      value: 'assetNumber-desc',
                      label: 'Asset Number (Z to A)',
                    },
                    { value: 'locationName-asc', label: 'Location (A to Z)' },
                    { value: 'locationName-desc', label: 'Location (Z to A)' },
                    {
                      value: 'lastOnline-desc',
                      label: 'Last Online (Most Recent)',
                    },
                    {
                      value: 'lastOnline-asc',
                      label: 'Last Online (Oldest First)',
                    },
                  ]}
                  placeholder="Sort by"
                  className="w-full"
                  triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm whitespace-nowrap"
                  searchable={true}
                  emptyMessage="No sort options found"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display - Cover entire page if error */}
        {error === 'UNAUTHORIZED' || error === 'Location not found' ? (
          error === 'UNAUTHORIZED' ? (
            <UnauthorizedError
              title="Access Denied"
              message="You are not authorized to view details for this location."
              resourceType="location"
              customBackText="Back to Locations"
              customBackHref="/locations"
            />
          ) : (
            <NotFoundError
              title="Location Not Found"
              message={`No location found for this ID (${locationId}) for your licence.`}
              resourceType="location"
              showRetry={false}
              customBackText="Back to Locations"
              customBackHref="/locations"
            />
          )
        ) : (
          <>
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
                  No cabinets found
                  {debouncedSearchTerm ? ' matching your search' : ''}.
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
                          .filter(
                            cab => getSerialNumberIdentifier(cab) !== 'N/A'
                          )
                          .map(cab => ({
                            ...cab,
                            isOnline: cab.online,
                          })) as ExtendedCabinetDetail[]
                      }
                      currentPage={0}
                      itemsPerPage={itemsPerPage}
                      router={router}
                    />
                  </div>

                  {!loading && effectiveTotalPages > 1 && (
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={effectiveTotalPages}
                      setCurrentPage={setCurrentPage}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}

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
