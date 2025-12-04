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
import { filterAndSortCabinets as filterAndSortCabinetsUtil } from '@/lib/utils/ui';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import gsap from 'gsap';
import { PlusCircle, RefreshCw, Search } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import Chart from '@/components/ui/dashboard/Chart';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { IMAGES } from '@/lib/constants/images';
import { getMetrics } from '@/lib/helpers/metrics';
import {
  useLocationMachineStats,
  useLocationMembershipStats,
} from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type { dashboardData } from '@/lib/types';
import { getAuthHeaders } from '@/lib/utils/auth';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { TimePeriod } from '@/shared/types/common';
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
  const locationId = params.slug as string;

  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  const user = useUserStore(state => state.user);

  // AbortController for different query types
  const makeCabinetsRequest = useAbortableRequest();
  const makeChartRequest = useAbortableRequest();
  const { displayCurrency } = useCurrencyFormat();

  // ============================================================================
  // State Management
  // ============================================================================
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);

  // ============================================================================
  // Computed Values - Permissions
  // ============================================================================
  const isAdminUser = Boolean(
    user?.roles?.some(role => role === 'admin' || role === 'developer')
  );

  // Check if user can create/edit machines
  // Technicians can create/edit machines, collectors cannot
  const canManageMachines = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Collectors cannot create/edit machines
    if (userRoles.includes('collector')) {
      return false;
    }
    // Technicians, managers, admins, developers, and location admins can manage machines
    return [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
    ].some(role => userRoles.includes(role));
  }, [user]);

  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cabinetsLoading, setCabinetsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<dashboardData[]>([]);
  const [loadingChartData, setLoadingChartData] = useState(false);

  // ============================================================================
  // Refs
  // ============================================================================
  const tableRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Constants
  // ============================================================================
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // ============================================================================
  // Computed Values
  // ============================================================================
  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Calculate financial totals from cabinet data
  const financialTotals = calculateCabinetFinancialTotals(allCabinets);

  // Machine status stats from dedicated API (location-specific)
  const { machineStats, machineStatsLoading, refreshMachineStats } =
    useLocationMachineStats(locationId);
  const { membershipStats, membershipStatsLoading, refreshMembershipStats } =
    useLocationMembershipStats(locationId);

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

  // ============================================================================
  // Effects - Initialization
  // ============================================================================
  // Detect when date filter is properly initialized
  useEffect(() => {
    if (activeMetricsFilter && !dateFilterInitialized) {
      setDateFilterInitialized(true);
    }
  }, [activeMetricsFilter, dateFilterInitialized]);

  // ============================================================================
  // Effects - Data Fetching
  // ============================================================================
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
        itemsPerBatch,
        displayCurrency
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
        itemsPerBatch,
        displayCurrency
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
    debouncedSearchTerm, // Skip batch fetching when searching
    displayCurrency,
  ]);

  // Update allCabinets when accumulatedCabinets changes
  useEffect(() => {
    setAllCabinets(accumulatedCabinets);
  }, [accumulatedCabinets]);

  // Determine the full source set to work from (all loaded cabinets for the period)
  const sourceCabinets = useMemo(
    () => (debouncedSearchTerm?.trim() ? allCabinets : accumulatedCabinets),
    [allCabinets, accumulatedCabinets, debouncedSearchTerm]
  );

  // ====== Filter & Sort Cabinets, then Paginate ======
  // Filter and sort from the full loaded set so sorting is global, not per-page
  const applyFiltersAndSort = useCallback(() => {
    // When searchTerm is provided, API already filtered the results
    // We only need to apply sorting and other filters (game type, status)
    // Don't apply search filter again since API already handled it
    let filtered = filterAndSortCabinetsUtil(
      sourceCabinets,
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
  }, [sourceCabinets, sortOption, sortOrder, selectedStatus, selectedGameType]);

  // Calculate total pages based on the filtered & sorted set
  const effectiveTotalPages = useMemo(() => {
    const totalItems = filteredCabinets.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [filteredCabinets.length, itemsPerPage]);

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

          const result = await makeCabinetsRequest(
            async signal => {
              return await fetchCabinetsForLocation(
                locationId,
                selectedLicencee,
                activeMetricsFilter,
                debouncedSearchTerm?.trim() || undefined,
                activeMetricsFilter === 'Custom' && customDateRange
                  ? {
                      from: customDateRange.startDate,
                      to: customDateRange.endDate,
                    }
                  : undefined,
                effectivePage,
                effectiveLimit,
                displayCurrency,
                signal
              );
            },
            `Location Cabinets (${locationId}, ${activeMetricsFilter}, Licensee: ${selectedLicencee || 'all'})`
          );

          if (!result) {
            // Request was aborted
            return;
          }
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
    displayCurrency,
    makeCabinetsRequest,
  ]);

  // Effect to re-run filtering and sorting when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Fetch chart data for location based on time period and filters
  useEffect(() => {
    if (!locationId || !activeMetricsFilter || !dateFilterInitialized) {
      setChartData([]);
      return;
    }

    const fetchChartData = async () => {
      setLoadingChartData(true);

      await makeChartRequest(
        async signal => {
          const timePeriod = activeMetricsFilter as TimePeriod;

          let url = `/api/analytics/location-trends?locationIds=${locationId}&timePeriod=${timePeriod}`;

          if (
            timePeriod === 'Custom' &&
            customDateRange.startDate &&
            customDateRange.endDate
          ) {
            const sd =
              customDateRange.startDate instanceof Date
                ? customDateRange.startDate
                : new Date(customDateRange.startDate);
            const ed =
              customDateRange.endDate instanceof Date
                ? customDateRange.endDate
                : new Date(customDateRange.endDate);
            url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
          }

          if (selectedLicencee && selectedLicencee !== 'all') {
            url += `&licencee=${encodeURIComponent(selectedLicencee)}`;
          }

          if (displayCurrency) {
            url += `&currency=${displayCurrency}`;
          }

          try {
            const response = await axios.get<{
              trends: Array<{
                day: string;
                time?: string;
                [key: string]:
                  | {
                      drop: number;
                      gross: number;
                      totalCancelledCredits?: number;
                    }
                  | string
                  | undefined;
              }>;
              isHourly: boolean;
            }>(url, {
              headers: {
                'Cache-Control': 'no-cache',
              },
              signal,
            });

            const { trends, isHourly } = response.data;

            const transformedData = trends.map(trend => {
              const locationData = trend[locationId] as
                | {
                    drop: number;
                    gross: number;
                    totalCancelledCredits?: number;
                  }
                | undefined;

              const xValue = isHourly ? trend.time || '' : trend.day;

              return {
                xValue,
                day: trend.day,
                time: trend.time || '',
                moneyIn: locationData?.drop || 0,
                moneyOut: locationData?.totalCancelledCredits || 0,
                gross: locationData?.gross || 0,
              };
            });

            setChartData(transformedData);
          } catch (error) {
            console.error('Error fetching chart data:', error);
            setChartData([]);
          }
        },
        `Location Chart (${locationId}, ${activeMetricsFilter}, Licensee: ${selectedLicencee || 'all'})`
      );

      setLoadingChartData(false);
    };

    fetchChartData();
  }, [
    locationId,
    activeMetricsFilter,
    customDateRange.startDate,
    customDateRange.endDate,
    selectedLicencee,
    displayCurrency,
    dateFilterInitialized,
    makeChartRequest,
  ]);

  // ====== Animation hooks for filtering and sorting ======
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
      // Refresh machine status and membership stats
      await Promise.all([refreshMachineStats(), refreshMembershipStats()]);
      // Fetch cabinets data for the SELECTED location
      try {
        // Only fetch if we have a valid activeMetricsFilter and it's been properly initialized
        if (!activeMetricsFilter || !dateFilterInitialized) {
          setAllCabinets([]);
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
          setError('No time period filter selected');
        } else {
          // When searching, fetch all results (no pagination limit) to find matches across all machines
          const effectivePage = debouncedSearchTerm?.trim() ? 1 : 1;
          const effectiveLimit = debouncedSearchTerm?.trim()
            ? undefined
            : itemsPerBatch;

          const result = await makeCabinetsRequest(
            async signal => {
              return await fetchCabinetsForLocation(
                locationId,
                selectedLicencee,
                activeMetricsFilter,
                debouncedSearchTerm?.trim() || undefined,
                activeMetricsFilter === 'Custom' && customDateRange
                  ? {
                      from: customDateRange.startDate,
                      to: customDateRange.endDate,
                    }
                  : undefined,
                effectivePage,
                effectiveLimit,
                displayCurrency,
                signal
              );
            },
            `Location Cabinets Refresh (${locationId}, ${activeMetricsFilter}, Licensee: ${selectedLicencee || 'all'})`
          );

          if (!result) {
            // Request was aborted
            return;
          }

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
        }
      } catch {
        setAllCabinets([]);
        setAccumulatedCabinets([]);
        setLoadedBatches(new Set());
        setError('Failed to refresh cabinets. Please try again later.');
      }

      // Refresh chart data
      setLoadingChartData(true);
      try {
        const timePeriod = activeMetricsFilter as TimePeriod;
        const allChartData = await makeChartRequest(
          async signal => {
            return await getMetrics(
              timePeriod,
              customDateRange.startDate,
              customDateRange.endDate,
              selectedLicencee && selectedLicencee !== 'all'
                ? selectedLicencee
                : undefined,
              displayCurrency,
              signal
            );
          },
          `Location Chart Data (${locationId}, ${activeMetricsFilter}, Licensee: ${selectedLicencee || 'all'})`
        );

        if (!allChartData) {
          // Request was aborted
          setLoadingChartData(false);
          return;
        }

        // Filter chart data by the current location
        // The location field in chart data can be either ID or name
        // Try multiple matching strategies to ensure we catch the data
        let filteredChartData = allChartData.filter(item => {
          const itemLocation = item.location;
          if (!itemLocation) return false;

          // Convert to strings for comparison
          const locationIdStr = String(locationId);
          const selectedLocationIdStr = selectedLocationId
            ? String(selectedLocationId)
            : '';
          const locationNameStr = locationName
            ? String(locationName).toLowerCase()
            : '';
          const itemLocationStr = String(itemLocation).toLowerCase();

          return (
            itemLocation === locationId ||
            itemLocation === locationIdStr ||
            itemLocation === selectedLocationId ||
            itemLocation === selectedLocationIdStr ||
            itemLocation === locationName ||
            itemLocationStr === locationNameStr ||
            // Also check if location name matches (case-insensitive)
            (locationName && itemLocationStr.includes(locationNameStr)) ||
            (locationName && locationNameStr.includes(itemLocationStr))
          );
        });

        // If no filtered data found, try showing all data (might be aggregated already)
        // This handles cases where location filtering might not work due to data structure
        if (filteredChartData.length === 0 && allChartData.length > 0) {
          // If we have data but filtering returned nothing, use all data
          // This might happen if the API already filtered by location or if location field format differs
          filteredChartData = allChartData;
        }

        setChartData(filteredChartData);
      } catch (error) {
        console.error('Error refreshing chart data:', error);
        setChartData([]);
      } finally {
        setLoadingChartData(false);
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
    selectedLocationId,
    locationName,
    refreshMachineStats,
    refreshMembershipStats,
    debouncedSearchTerm,
    itemsPerBatch,
    displayCurrency,
    makeCabinetsRequest,
    makeChartRequest,
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

  // ============================================================================
  // Render
  // ============================================================================
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
              {/* Create icon - Hidden for collectors */}
              {loading || cabinetsLoading ? (
                <div className="h-4 w-4 flex-shrink-0" />
              ) : canManageMachines ? (
                <button
                  onClick={() => openCabinetModal(locationId)}
                  disabled={refreshing}
                  className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Create Machine"
                >
                  <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
                </button>
              ) : null}
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
              ) : canManageMachines ? (
                <Button
                  variant="default"
                  className="bg-button text-white"
                  disabled={refreshing}
                  onClick={() => openCabinetModal(locationId)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Machine
                </Button>
              ) : null}
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

        {/* Chart Section: Location-specific metrics chart */}
        <div className="mt-4">
          <Chart
            loadingChartData={loadingChartData}
            chartData={chartData}
            activeMetricsFilter={activeMetricsFilter as TimePeriod}
          />
        </div>

        {/* Date Filters and Machine Status Section: Responsive layout for filters and status */}
        <div className="mt-4">
          {/* Desktop and md: Side by side layout */}
          <div className="hidden items-center justify-between gap-4 md:flex">
            <div className="min-w-0 flex-1">
              <DashboardDateFilters
                onCustomRangeGo={handleRefresh}
                hideAllTime={false}
                enableTimeInputs={true}
              />
            </div>
            <div className="ml-4 w-auto flex-shrink-0">
              <MachineStatusWidget
                isLoading={machineStatsLoading || membershipStatsLoading}
                onlineCount={machineStats?.onlineMachines || 0}
                offlineCount={machineStats?.offlineMachines || 0}
                totalCount={machineStats?.totalMachines}
                showTotal={true}
                membershipCount={membershipStats?.membershipCount || 0}
                showMembership={true}
              />
            </div>
          </div>

          {/* Mobile: Stacked layout */}
          <div className="flex flex-col gap-4 md:hidden">
            <div className="w-full">
              <DashboardDateFilters
                onCustomRangeGo={handleRefresh}
                hideAllTime={false}
                enableTimeInputs={true}
              />
            </div>
            <div className="w-full">
              <MachineStatusWidget
                isLoading={machineStatsLoading || membershipStatsLoading}
                onlineCount={machineStats?.onlineMachines || 0}
                offlineCount={machineStats?.offlineMachines || 0}
                totalCount={machineStats?.totalMachines}
                showTotal={true}
                membershipCount={membershipStats?.membershipCount || 0}
                showMembership={true}
              />
            </div>
          </div>
        </div>

        {/* Search and Location Selection Section: Desktop search bar with location dropdown */}
        <div className="mt-4 hidden bg-buttonActive p-4 md:flex">
          {/* Search Input, Sort, and Filters on same row */}
          <div className="flex w-full flex-wrap items-center gap-4">
            {/* Search Input - Takes available space */}
            <div className="relative min-w-0 flex-1">
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

            {/* Filter Buttons - On the right, wrap when needed */}
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
                    setSortOption(option as CabinetSortOption);
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
                      currentPage={currentPage}
                      itemsPerPage={itemsPerPage}
                      router={router}
                      sortOption={sortOption}
                      sortOrder={sortOrder}
                      onSortChange={(option, order) => {
                        setSortOption(option);
                        setSortOrder(order);
                      }}
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
