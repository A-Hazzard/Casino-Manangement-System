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
import { PlusCircle, RefreshCw, Search, Server, Users } from 'lucide-react';
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
import { formatLocalDateTimeString } from '@/shared/utils/dateFormat';
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
              <MembersSummaryTab forcedLocationId={locationId} />
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
  const locationId = params.slug as string;

  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // Show granularity selector only for Today or Yesterday
  const showGranularitySelector =
    activeMetricsFilter === 'Today' || activeMetricsFilter === 'Yesterday';

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
  const [locationMembershipEnabled, setLocationMembershipEnabled] =
    useState<boolean>(false);
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
  // Chart granularity selector (only shown for Today/Yesterday/Custom)
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    'hourly'
  );
  // Prevent premature data fetching
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const chartRequestInProgress = useRef(false);
  const cabinetsRequestInProgress = useRef(false);
  const prevCabinetsFetchKey = useRef<string>('');
  const prevChartFetchKey = useRef<string>('');

  // View Toggle State - check URL params for view
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<'machines' | 'members'>(() => {
    const viewParam = searchParams.get('view');
    return viewParam === 'members' ? 'members' : 'machines';
  });

  // Members Tab Navigation
  const { activeTab, handleTabClick } =
    useMembersNavigation(MEMBERS_TABS_CONFIG);

  // ============================================================================
  // Refs
  // ============================================================================
  const tableRef = useRef<HTMLDivElement>(null);
  const membersRefreshHandlerRef = useRef<(() => void) | undefined>(undefined);

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

  // Reset view to machines when location changes
  useEffect(() => {
    setActiveView('machines');
  }, [locationId]);

  // Prevent access to members tab if location doesn't have membership enabled
  useEffect(() => {
    if (activeView === 'members' && !locationMembershipEnabled) {
      setActiveView('machines');
      // Update URL to remove view=members if manually accessed
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('view');
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }, [activeView, locationMembershipEnabled]);

  // Sync URL with activeView
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (activeView === 'members' && locationMembershipEnabled) {
      currentUrl.searchParams.set('view', 'members');
    } else {
      currentUrl.searchParams.delete('view');
    }
    window.history.replaceState({}, '', currentUrl.toString());
  }, [activeView, locationMembershipEnabled]);

  // Detect when date filter is properly initialized
  useEffect(() => {
    if (activeMetricsFilter) {
      setDateFilterInitialized(true);
    }
  }, [activeMetricsFilter]);

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
    // Create a unique key for this fetch to detect actual filter changes
    // Only include customDateRange in the key if the filter is actually "Custom"
    const dateRangeKey =
      activeMetricsFilter === 'Custom' && customDateRange
        ? JSON.stringify(customDateRange)
        : 'none';
    const fetchKey = `${locationId}-${selectedLicencee}-${activeMetricsFilter}-${dateRangeKey}-${debouncedSearchTerm}-${displayCurrency}`;

    const fetchData = async () => {
      // Only proceed if filters are initialized
      if (
        !activeMetricsFilter ||
        !dateFilterInitialized ||
        !filtersInitialized
      ) {
        setAllCabinets([]);
        setAccumulatedCabinets([]);
        setLoadedBatches(new Set());
        setLoading(false);
        setCabinetsLoading(false);
        return;
      }

      // Prevent duplicate requests - only fetch if fetch key changed
      // This prevents unnecessary refetches when the same filter combination is already loaded
      if (prevCabinetsFetchKey.current === fetchKey) {
        return;
      }

      // Prevent concurrent requests
      if (cabinetsRequestInProgress.current) {
        return;
      }

      // Mark this fetch key as the current one (before starting request)
      // This prevents duplicate requests for the same filter combination
      prevCabinetsFetchKey.current = fetchKey;

      cabinetsRequestInProgress.current = true;
      setLoading(true);
      setCabinetsLoading(true);

      try {
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
            // Store membershipEnabled status (check both membershipEnabled and enableMembership)
            setLocationMembershipEnabled(
              locationData.membershipEnabled === true ||
                locationData.enableMembership === true
            );
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

        // Also check membershipEnabled from formattedLocations if not already set
        if (currentLocation && !locationMembershipEnabled) {
          // Check if location has membership enabled (may be in different field names)
          const hasMembership =
            (
              currentLocation as {
                membershipEnabled?: boolean;
                enableMembership?: boolean;
              }
            ).membershipEnabled === true ||
            (
              currentLocation as {
                membershipEnabled?: boolean;
                enableMembership?: boolean;
              }
            ).enableMembership === true;
          if (hasMembership) {
            setLocationMembershipEnabled(true);
          }
        }

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

          const result = await makeCabinetsRequest(async signal => {
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
          });

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
        cabinetsRequestInProgress.current = false;
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
    filtersInitialized, // Wait for filters to be ready
    locationMembershipEnabled,
  ]);

  // Effect to re-run filtering and sorting when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Initialize filters flag - set immediately when activeMetricsFilter is available
  // This must be in a separate effect to ensure flags are set before other effects check them
  useEffect(() => {
    if (activeMetricsFilter) {
      if (!dateFilterInitialized) {
        setDateFilterInitialized(true);
      }
      if (!filtersInitialized) {
        setFiltersInitialized(true);
      }
    }
  }, [activeMetricsFilter, dateFilterInitialized, filtersInitialized]);

  // Fetch chart data for location based on time period and filters
  useEffect(() => {
    // Debug: Log why we might not be fetching
    if (process.env.NODE_ENV === 'development') {
      const conditions = {
        locationId: !!locationId,
        locationIdValue: locationId,
        activeMetricsFilter,
        dateFilterInitialized,
        filtersInitialized,
        customDateRange,
      };
      console.log('[Location Chart] useEffect triggered:', conditions);
      console.log('[Location Chart] Condition check:', {
        hasLocationId: !!locationId,
        hasActiveMetricsFilter: !!activeMetricsFilter,
        isDateFilterInitialized: dateFilterInitialized,
        isFiltersInitialized: filtersInitialized,
        allMet:
          !!locationId &&
          !!activeMetricsFilter &&
          dateFilterInitialized &&
          filtersInitialized,
      });
    }

    // On initial load, we need locationId and activeMetricsFilter at minimum
    if (!locationId || !activeMetricsFilter) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[Location Chart] Skipping fetch - missing required params',
          {
            missingLocationId: !locationId,
            missingActiveMetricsFilter: !activeMetricsFilter,
          }
        );
      }
      return;
    }

    // Create a unique key for this fetch to detect actual filter changes
    // Use individual date values instead of JSON.stringify to ensure proper change detection
    const startDateStr = customDateRange.startDate
      ? customDateRange.startDate instanceof Date
        ? customDateRange.startDate.toISOString()
        : String(customDateRange.startDate)
      : '';
    const endDateStr = customDateRange.endDate
      ? customDateRange.endDate instanceof Date
        ? customDateRange.endDate.toISOString()
        : String(customDateRange.endDate)
      : '';
    const fetchKey = `${locationId}-${activeMetricsFilter}-${startDateStr}-${endDateStr}-${selectedLicencee}-${displayCurrency}-${chartGranularity}`;

    // Debug: Log fetch key changes
    if (process.env.NODE_ENV === 'development') {
      console.log('[Location Chart] Fetch key check:', {
        currentKey: fetchKey,
        previousKey: prevChartFetchKey.current,
        keysMatch: prevChartFetchKey.current === fetchKey,
        requestInProgress: chartRequestInProgress.current,
        fetchKeyChanged: prevChartFetchKey.current !== fetchKey,
      });
    }

    // If fetch key changed, we need to fetch new data (always allow on change)
    const fetchKeyChanged = prevChartFetchKey.current !== fetchKey;

    // Only skip if:
    // 1. Fetch key hasn't changed (same filters)
    // 2. We've already fetched this exact combination
    // 3. No request is currently in progress
    if (
      !fetchKeyChanged &&
      prevChartFetchKey.current === fetchKey &&
      !chartRequestInProgress.current
    ) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[Location Chart] Skipping - already fetched this combination'
        );
      }
      return;
    }

    // If fetch key changed, always fetch (even if request is in progress - abort controller will cancel previous)
    // Only skip if same key and request already in progress
    if (!fetchKeyChanged && chartRequestInProgress.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[Location Chart] Request already in progress for this key'
        );
      }
      return;
    }

    const fetchChartData = async () => {
      // Set request in progress flag to prevent concurrent requests
      chartRequestInProgress.current = true;
      setLoadingChartData(true);

      // Note: We DON'T set prevChartFetchKey here - we'll set it after successful fetch
      // This ensures that if the fetch fails or is cancelled, we can retry

      try {
        await makeChartRequest(async signal => {
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

            // Check if dates have time components (not midnight)
            const hasTime =
              sd.getHours() !== 0 ||
              sd.getMinutes() !== 0 ||
              sd.getSeconds() !== 0 ||
              ed.getHours() !== 0 ||
              ed.getMinutes() !== 0 ||
              ed.getSeconds() !== 0;

            if (hasTime) {
              // Send local time with timezone offset to preserve user's time selection
              url += `&startDate=${formatLocalDateTimeString(sd, -4)}&endDate=${formatLocalDateTimeString(ed, -4)}`;
            } else {
              // Date-only: send ISO date format for gaming day offset to apply
              url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
            }
          }

          if (selectedLicencee && selectedLicencee !== 'all') {
            url += `&licencee=${encodeURIComponent(selectedLicencee)}`;
          }

          if (displayCurrency) {
            url += `&currency=${displayCurrency}`;
          }

          // Pass granularity preference for Today/Yesterday
          const granularity = showGranularitySelector
            ? chartGranularity
            : undefined;
          if (granularity) {
            url += `&granularity=${granularity}`;
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

            // Debug: Log the raw API response
            if (process.env.NODE_ENV === 'development') {
              console.log('[Location Chart] API Response:', {
                trendsCount: trends?.length || 0,
                isHourly,
                locationId,
                sampleTrend: trends?.[0],
                trendKeys: trends?.[0] ? Object.keys(trends[0]) : [],
                hasLocationData: trends?.[0]?.[locationId] ? 'yes' : 'no',
              });
            }

            // Safety check: ensure trends is an array
            if (!trends || !Array.isArray(trends) || trends.length === 0) {
              console.warn('[Location Chart] No trends data received');
              setChartData([]);
              return;
            }

            // Check if API response contains minute-level data (time format is "HH:MM" with non-zero minutes)
            const hasMinuteLevelData = trends.some(trend => {
              if (!trend.time) return false;
              const timeParts = trend.time.split(':');
              if (timeParts.length !== 2) return false;
              const minutes = parseInt(timeParts[1], 10);
              return !isNaN(minutes) && minutes !== 0; // Has non-zero minutes
            });

            // Determine if we should use minute or hourly based on API response and granularity
            let useMinute = false;
            let useHourly = false;

            if (granularity) {
              // Manual granularity override (from selector)
              if (granularity === 'minute') {
                useMinute = true;
                useHourly = false;
              } else if (granularity === 'hourly') {
                useMinute = false;
                useHourly = true;
              }
            } else {
              // Auto-detect based on API response
              useMinute = hasMinuteLevelData;
              useHourly = isHourly && !hasMinuteLevelData;
            }

            // Transform trends to dashboardData format
            const transformedData: dashboardData[] = trends.map(trend => {
              // Find location data - try exact match first, then try string comparison
              let locationData:
                | {
                    drop: number;
                    gross: number;
                    totalCancelledCredits?: number;
                  }
                | undefined;

              // First try direct access
              if (trend[locationId]) {
                locationData = trend[locationId] as {
                  drop: number;
                  gross: number;
                  totalCancelledCredits?: number;
                };
              } else {
                // Try to find by string comparison (handles ObjectId vs string differences)
                const locationKey = Object.keys(trend).find(
                  key =>
                    key !== 'day' &&
                    key !== 'time' &&
                    String(key) === String(locationId)
                );
                if (locationKey) {
                  locationData = trend[locationKey] as {
                    drop: number;
                    gross: number;
                    totalCancelledCredits?: number;
                  };
                }
              }

              // Debug: Log mismatch on first trend only
              if (
                !locationData &&
                trends.indexOf(trend) === 0 &&
                process.env.NODE_ENV === 'development'
              ) {
                const locationKeys = Object.keys(trend).filter(
                  k => k !== 'day' && k !== 'time'
                );
                console.warn('[Location Chart] LocationId mismatch:', {
                  requestedLocationId: locationId,
                  availableLocationIds: locationKeys,
                  sampleTrend: trend,
                });
              }

              // Preserve minute-level data if it exists, otherwise use hourly or daily
              let time = trend.time || '';
              let xValue: string;

              if (useMinute) {
                // Minute-level: preserve original time (e.g., "14:15")
                time = trend.time || '';
                xValue = time;
              } else if (useHourly) {
                // Hourly: use time as-is (already formatted as "HH:00")
                time = trend.time || '';
                xValue = time;
              } else {
                // Daily: use day as xValue
                xValue = trend.day;
              }

              return {
                xValue,
                day: trend.day,
                time,
                moneyIn: locationData?.drop || 0,
                moneyOut: locationData?.totalCancelledCredits || 0,
                gross: locationData?.gross || 0,
              };
            });

            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('[Location Chart] Transformed data:', {
                trendsCount: trends.length,
                transformedCount: transformedData.length,
                sample: transformedData.slice(0, 3),
                locationId,
                allZero: transformedData.every(
                  d => d.moneyIn === 0 && d.moneyOut === 0 && d.gross === 0
                ),
                firstTrendLocationData: trends[0]?.[locationId],
                trendLocationIds: trends[0]
                  ? Object.keys(trends[0]).filter(
                      k => k !== 'day' && k !== 'time'
                    )
                  : [],
              });
            }

            // Filter data to only include times within the selected custom range
            let filteredData = transformedData;
            // Declare variables in outer scope so they're available in console.log statements
            let startUTCTime = '';
            let endUTCTime = '';

            if (
              timePeriod === 'Custom' &&
              customDateRange.startDate &&
              customDateRange.endDate &&
              (useMinute || useHourly)
            ) {
              const sd =
                customDateRange.startDate instanceof Date
                  ? customDateRange.startDate
                  : new Date(customDateRange.startDate);
              const ed =
                customDateRange.endDate instanceof Date
                  ? customDateRange.endDate
                  : new Date(customDateRange.endDate);

              // Check if dates have time components (not midnight)
              const hasTime =
                sd.getHours() !== 0 ||
                sd.getMinutes() !== 0 ||
                sd.getSeconds() !== 0 ||
                ed.getHours() !== 0 ||
                ed.getMinutes() !== 0 ||
                ed.getSeconds() !== 0;

              if (hasTime) {
                // Convert local time to UTC for comparison (AST is UTC-4)
                // API returns times in UTC format
                // Create proper Date objects to handle day rollover correctly
                const startLocal = new Date(sd);
                const endLocal = new Date(ed);

                // Convert to UTC by creating a Date object with UTC components
                const startUTC = new Date(
                  Date.UTC(
                    startLocal.getFullYear(),
                    startLocal.getMonth(),
                    startLocal.getDate(),
                    startLocal.getHours() + 4, // AST is UTC-4, so add 4 for UTC
                    startLocal.getMinutes(),
                    0,
                    0
                  )
                );
                const endUTC = new Date(
                  Date.UTC(
                    endLocal.getFullYear(),
                    endLocal.getMonth(),
                    endLocal.getDate(),
                    endLocal.getHours() + 4, // AST is UTC-4, so add 4 for UTC
                    endLocal.getMinutes(),
                    0,
                    0
                  )
                );

                // Format UTC times for comparison (HH:MM format)
                const startUTCHour = startUTC.getUTCHours();
                const startUTCMinute = startUTC.getUTCMinutes();
                const endUTCHour = endUTC.getUTCHours();
                const endUTCMinute = endUTC.getUTCMinutes();

                startUTCTime = `${startUTCHour.toString().padStart(2, '0')}:${startUTCMinute.toString().padStart(2, '0')}`;
                endUTCTime = `${endUTCHour.toString().padStart(2, '0')}:${endUTCMinute.toString().padStart(2, '0')}`;

                // Helper function to convert HH:MM time string to total minutes for comparison
                const timeToMinutes = (timeStr: string): number => {
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  return hours * 60 + minutes;
                };

                // Check if range spans multiple days
                const rangeStartDay = sd.toISOString().split('T')[0];
                const rangeEndDay = ed.toISOString().split('T')[0];
                const isMultiDay = rangeStartDay !== rangeEndDay;

                // Filter data points that fall within the time range
                filteredData = transformedData.filter(item => {
                  if (!item.time) return false;

                  // Get the day from the item
                  const itemDay = item.day;

                  // Handle single-day vs multi-day ranges
                  if (!isMultiDay) {
                    // Single day: only include items from the same day
                    if (itemDay !== rangeStartDay) {
                      return false;
                    }
                  } else {
                    // Multi-day: include items from any day within the range
                    if (itemDay < rangeStartDay || itemDay > rangeEndDay) {
                      return false;
                    }
                  }

                  // Convert times to minutes for accurate comparison
                  const itemTimeMinutes = timeToMinutes(item.time);
                  const startTimeMinutes = timeToMinutes(startUTCTime);
                  const endTimeMinutes = timeToMinutes(endUTCTime);

                  // For multi-day ranges, apply time filtering only to start and end days
                  if (isMultiDay) {
                    // For items on start day, only include if time >= startTime
                    if (itemDay === rangeStartDay) {
                      if (useHourly && !useMinute) {
                        const itemHour = Math.floor(itemTimeMinutes / 60);
                        const startHour = Math.floor(startTimeMinutes / 60);
                        return itemHour >= startHour;
                      }
                      return itemTimeMinutes >= startTimeMinutes;
                    }

                    // For items on end day, only include if time <= endTime
                    if (itemDay === rangeEndDay) {
                      if (useHourly && !useMinute) {
                        const itemHour = Math.floor(itemTimeMinutes / 60);
                        const endHour = Math.floor(endTimeMinutes / 60);
                        return itemHour <= endHour;
                      }
                      return itemTimeMinutes <= endTimeMinutes;
                    }

                    // For items in between start and end days, include all
                    // (no time filtering needed for middle days)
                    return true;
                  }

                  // Single-day range: apply time filtering as before
                  // For hourly data, check if the hour falls within range
                  if (useHourly && !useMinute) {
                    const itemHour = Math.floor(itemTimeMinutes / 60);
                    const startHour = Math.floor(startTimeMinutes / 60);
                    const endHour = Math.floor(endTimeMinutes / 60);

                    // If range crosses midnight (end < start), handle wrap-around
                    if (endHour < startHour) {
                      return itemHour >= startHour || itemHour <= endHour;
                    }
                    return itemHour >= startHour && itemHour <= endHour;
                  }

                  // For minute-level data, compare exact times (inclusive range)
                  // Include times >= startTime and <= endTime
                  if (endTimeMinutes < startTimeMinutes) {
                    // Handle wrap-around (shouldn't happen for same day, but just in case)
                    return (
                      itemTimeMinutes >= startTimeMinutes ||
                      itemTimeMinutes <= endTimeMinutes
                    );
                  }

                  return (
                    itemTimeMinutes >= startTimeMinutes &&
                    itemTimeMinutes <= endTimeMinutes
                  );
                });

                if (process.env.NODE_ENV === 'development') {
                  console.log('[Location Chart] Filtered data by time range:', {
                    startUTCTime,
                    endUTCTime,
                    originalCount: transformedData.length,
                    filteredCount: filteredData.length,
                    sampleFiltered: filteredData.slice(0, 3),
                  });
                }
              }
            }

            // Safety check: if filtering removed all data but we had data, use unfiltered data
            // This prevents data loss when filtering is too aggressive
            if (filteredData.length === 0 && transformedData.length > 0) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(
                  '[Location Chart] Time filtering removed all data, using unfiltered data instead',
                  {
                    timePeriod,
                    transformedDataLength: transformedData.length,
                    startUTCTime,
                    endUTCTime,
                    useMinute,
                    useHourly,
                  }
                );
              }
              // Use transformedData instead of filteredData to prevent data loss
              filteredData = transformedData;
            }

            // For minute granularity (Today, Yesterday, Custom): only show actual data points (no filling)
            // User wants to see ONLY times that are in the JSON response, not filled-in zeros
            if (useMinute) {
              // Return filtered data - don't fill zeros for any minute granularity
              // This ensures only actual data points from the API response within the selected range are displayed
              setChartData(filteredData);
            } else {
              // For hourly or daily: use filtered data (or fill if needed)
              setChartData(filteredData);
            }

            // Only mark fetch key as complete AFTER successful data fetch
            // This ensures that if filters change while fetch is in progress, we can fetch again
            prevChartFetchKey.current = fetchKey;
          } catch (error) {
            // Check if it's a cancellation - if so, re-throw so makeChartRequest handles it
            const axios = (await import('axios')).default;
            if (
              axios.isCancel(error) ||
              (error instanceof Error &&
                (error.message === 'canceled' ||
                  error.name === 'AbortError' ||
                  error.message === 'The user aborted a request.'))
            ) {
              throw error; // Re-throw so makeChartRequest can handle it silently
            }
            console.error('Error fetching chart data:', error);
            setChartData([]);
          }
        });
      } catch (error) {
        // Errors are handled by makeChartRequest - don't log cancellations
        const axios = (await import('axios')).default;
        const isCancellation =
          axios.isCancel(error) ||
          (error instanceof Error &&
            (error.message === 'canceled' ||
              error.name === 'AbortError' ||
              error.message === 'The user aborted a request.'));

        if (!isCancellation) {
          console.error('Error in chart fetch:', error);
          // Only clear chart data on actual errors, not cancellations
          setChartData([]);
          // On error, reset fetch key so we can retry
          prevChartFetchKey.current = '';
        } else {
          // On cancellation, reset the fetch key so we can retry on next change
          prevChartFetchKey.current = '';
        }
      } finally {
        chartRequestInProgress.current = false;
        setLoadingChartData(false);
      }
    };

    fetchChartData();
    // Note: makeChartRequest is stable from useAbortableRequest and doesn't need to trigger refetch
    // The fetchKey comparison handles detecting actual filter changes
  }, [
    locationId,
    activeMetricsFilter,
    customDateRange.startDate,
    customDateRange.endDate,
    customDateRange, // Include the full object to ensure updates are detected
    selectedLicencee,
    displayCurrency,
    chartGranularity,
    filtersInitialized, // Wait for filters to be ready
    dateFilterInitialized,
    showGranularitySelector, // Memoized value that affects granularity selection
    makeChartRequest, // Stable ref from useAbortableRequest - included for completeness
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
    // If members view is active, trigger members refresh handler
    if (activeView === 'members' && membersRefreshHandlerRef.current) {
      membersRefreshHandlerRef.current();
      return;
    }

    // Only refresh machines/charts if on machines view
    if (activeView !== 'machines') {
      return;
    }

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

          const result = await makeCabinetsRequest(async signal => {
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
          });

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
        const allChartData = await makeChartRequest(async signal => {
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
        });

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
    activeView,
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
              {/* Refresh icon - Hidden on members tab */}
              {activeView !== 'members' && (
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
              )}
              {/* Create icon - Hidden for collectors and on members tab */}
              {activeView === 'machines' && (
                <>
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
                <Image
                  src={IMAGES.locationIcon}
                  alt="Location Icon"
                  width={32}
                  height={32}
                  className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
                />
              </h1>
              {/* Mobile: Refresh icon - Hidden on members tab */}
              {activeView !== 'members' && (
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
              )}
            </div>
            {/* Desktop: Refresh icon and Create button on far right - Only show on machines tab */}
            {activeView === 'machines' && (
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
            )}
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex w-full border-b border-gray-200">
          <button
            onClick={() => setActiveView('machines')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeView === 'machines'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server className="h-4 w-4" />
            Machines
          </button>
          {locationMembershipEnabled && (
            <button
              onClick={() => setActiveView('members')}
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
              locationName={locationName}
              selectedLicencee={selectedLicencee}
              activeTab={activeTab}
              handleTabClick={handleTabClick}
              onRefreshReady={handler => {
                membersRefreshHandlerRef.current = handler;
              }}
            />
          </MembersHandlersProvider>
        ) : (
          <>
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
              {/* Granularity Selector - Only show for Today/Yesterday */}
              {showGranularitySelector && (
                <div className="mb-3 flex items-center justify-end gap-2">
                  <label
                    htmlFor="chart-granularity-location"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Granularity:
                  </label>
                  <select
                    id="chart-granularity-location"
                    value={chartGranularity}
                    onChange={e =>
                      setChartGranularity(e.target.value as 'hourly' | 'minute')
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="minute">Minute</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              )}
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
                    hideAllTime={true}
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
                    hideAllTime={true}
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
                        handleFilterChange(
                          value as 'All' | 'Online' | 'Offline'
                        )
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
                        handleFilterChange(
                          value as 'All' | 'Online' | 'Offline'
                        )
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
                        {
                          value: 'moneyIn-asc',
                          label: 'Money In (Lowest First)',
                        },
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
                        {
                          value: 'jackpot-desc',
                          label: 'Jackpot (Highest First)',
                        },
                        {
                          value: 'jackpot-asc',
                          label: 'Jackpot (Lowest First)',
                        },
                        {
                          value: 'assetNumber-asc',
                          label: 'Asset Number (A to Z)',
                        },
                        {
                          value: 'assetNumber-desc',
                          label: 'Asset Number (Z to A)',
                        },
                        {
                          value: 'locationName-asc',
                          label: 'Location (A to Z)',
                        },
                        {
                          value: 'locationName-desc',
                          label: 'Location (Z to A)',
                        },
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
