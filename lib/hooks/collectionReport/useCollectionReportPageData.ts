/**
 * useCollectionReportPageData Hook
 *
 * Coordinates all data, filtering, and UI state for the collection report dashboard.
 *
 * Architecture:
 * - Uses dashboard store for licencee and filter state
 * - Uses user store for role-based permissions
 * - Batched loading for efficient pagination
 * - Debounced search to reduce API calls
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { COLLECTION_TABS_CONFIG } from '@/lib/constants';
import {
  fetchCollectionReportsByLicencee,
} from '@/lib/helpers/collectionReport/fetching';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useCollectionNavigation } from '@/lib/hooks/navigation';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionView } from '@/lib/types/collection';
import type { CollectionReportRow } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import axios from 'axios';
import { parse } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCollectionReportFilters } from './useCollectionReportFilters';

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 20;
const ITEMS_PER_BATCH = 40;
const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 2

// ============================================================================
// Main Hook
// ============================================================================

export function useCollectionReportPageData() {
  // ==========================================================================
  // Navigation & URL State
  // ==========================================================================
  const searchParams = useSearchParams();
  const { pushToUrl } = useCollectionNavigation(COLLECTION_TABS_CONFIG);

  // ==========================================================================
  // Store State
  // ==========================================================================
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const { user } = useUserStore();

  // ==========================================================================
  // Local State - Tab & View
  // ==========================================================================
  const [activeTab, setActiveTab] = useState<CollectionView>(() => {
    const section = searchParams?.get('section');
    return (section as CollectionView) || 'collection';
  });

  // ==========================================================================
  // Local State - Loading & Data
  // ==========================================================================
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing] = useState(false);
  const [allReports, setAllReports] = useState<CollectionReportRow[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());

  // ==========================================================================
  // Local State - Search & Filter
  // ==========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [locationsWithMachines, setLocationsWithMachines] = useState<
    CollectionReportLocationWithMachines[]
  >([]);

  // ==========================================================================
  // Local State - Modal Visibility
  // ==========================================================================
  const [showNewCollectionMobile, setShowNewCollectionMobile] = useState(false);
  const [showNewCollectionDesktop, setShowNewCollectionDesktop] =
    useState(false);
  const [showEditMobile, setShowEditMobile] = useState(false);
  const [showEditDesktop, setShowEditDesktop] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // ==========================================================================
  // Debounced Values
  // ==========================================================================
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ==========================================================================
  // Refs
  // ==========================================================================
  const hasReceivedFirstResponseRef = useRef(false);
  const hasStartedFirstLoadRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==========================================================================
  // Computed Values - Filters
  // ==========================================================================
  const filters = useCollectionReportFilters({
    allReports,
    locations,
    searchTerm: debouncedSearch,
    timePeriod: activeMetricsFilter,
    dateRange: customDateRange,
  });

  const filteredReports = useMemo(() => {
    return filters.filteredReports;
  }, [filters.filteredReports]);

  // ==========================================================================
  // Computed Values - Pagination
  // ==========================================================================

  /**
   * Paginated reports from filtered results
   */
  const paginatedReports = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredReports.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReports, currentPage]);

  /**
   * Whether we need to fetch more data for current page
   */
  const isDataMissingForPage = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const isAtEndOfLoaded = filteredReports.length <= startIndex;
    const hasMoreOnServer = allReports.length < totalReports;

    return isAtEndOfLoaded && hasMoreOnServer;
  }, [filteredReports.length, allReports.length, currentPage, totalReports]);

  /**
   * Total pages based on displayed (client-side filtered) reports
   * Prevents empty pages when date/location filters reduce visible count
   */
  const totalPages = useMemo(() => {
    const displayedCount = filteredReports.length;
    const displayedPages = Math.ceil(displayedCount / ITEMS_PER_PAGE) || 1;

    const isFiltered =
      (Array.isArray(filters.selectedLocation) ? filters.selectedLocation.length > 0 && !filters.selectedLocation.includes('all') : filters.selectedLocation !== 'all') ||
      filters.showUncollectedOnly ||
      filters.selectedFilters.length > 0;

    // If we have more on server, and we are either not filtered OR we are at the end of our current matches,
    // show one more page to allow fetching the next batch.
    if (allReports.length < totalReports && totalReports > 0) {
      // If we are filtered, we only show an extra page if the current matches are a multiple of ITEMS_PER_PAGE
      // or if we have no matches yet, suggesting there might be more in the next batch.
      if (isFiltered) {
        if (displayedCount === 0 || (displayedCount > 0 && displayedCount % ITEMS_PER_PAGE === 0)) {
           const serverTotalPages = Math.ceil(totalReports / ITEMS_PER_PAGE) || 1;
           return Math.min(displayedPages + 1, serverTotalPages);
        }
        return displayedPages;
      }

      const serverTotalPages = Math.ceil(totalReports / ITEMS_PER_PAGE) || 1;
      return Math.min(displayedPages + 1, serverTotalPages);
    }

    return displayedPages;
  }, [
    filteredReports.length,
    allReports.length,
    totalReports,
    filters.selectedLocation,
    filters.showUncollectedOnly,
    filters.selectedFilters.length,
  ]);

  // ==========================================================================
  // Computed Values - Permissions
  // ==========================================================================

  /**
   * Calculate which reports are editable based on user role and recency
   * - Developers can edit everything
   * - Owners, Admins, Managers can edit only the two most recent reports per location
   */
  const editableReportIds = useMemo(() => {
    if (!user || !user.roles) return new Set<string>();

    const userRoles = (user.roles || []) as string[];
    const isOwner = userRoles.includes('owner');
    const isDeveloper = userRoles.includes('developer');
    const isAdmin = userRoles.includes('admin');
    const isManager = userRoles.includes('manager');

    if (isDeveloper) {
      return new Set(allReports.map(r => r.locationReportId));
    }

    if (isOwner || isAdmin || isManager) {
      const reportsByLocation: Record<string, CollectionReportRow[]> = {};

      allReports.forEach(report => {
        const loc = report.location || 'unknown';
        if (!reportsByLocation[loc]) {
          reportsByLocation[loc] = [];
        }
        reportsByLocation[loc].push(report);
      });

      const editableIds = new Set<string>();

      Object.keys(reportsByLocation).forEach(loc => {
        const sorted = [...reportsByLocation[loc]].sort((a, b) => {
          const aTime = parse(
            a.time || '',
            'dd LLL yyyy, hh:mm:ss a',
            new Date()
          ).getTime();
          const bTime = parse(
            b.time || '',
            'dd LLL yyyy, hh:mm:ss a',
            new Date()
          ).getTime();
          return bTime - aTime;
        });

        sorted.slice(0, 2).forEach(report => {
          if (report.locationReportId) {
            editableIds.add(report.locationReportId);
          }
        });
      });

      return editableIds;
    }

    return new Set<string>();
  }, [allReports, user]);

  // ==========================================================================
  // Event Handlers - Tab Navigation
  // ==========================================================================

  /**
   * Handle tab change and sync with URL
   */
  const handleTabChange = useCallback(
    (tab: string) => {
      const newTab = tab as CollectionView;
      setActiveTab(newTab);
      pushToUrl(newTab);
    },
    [pushToUrl]
  );

  // ==========================================================================
  // Event Handlers - Data Fetching
  // ==========================================================================

  /**
   * Calculate batch number for pagination
   */
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / PAGES_PER_BATCH) + 1;
  }, []);

  /**
   * Fetch reports batch from API
   */
  const fetchReports = useCallback(
    async (batch: number = 1) => {
      if (activeTab !== 'collection') {
        setLoading(false);
        if (!hasReceivedFirstResponseRef.current) {
          hasReceivedFirstResponseRef.current = true;
          setInitialLoading(false);
        }
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!hasStartedFirstLoadRef.current) {
        hasStartedFirstLoadRef.current = true;
        setInitialLoading(true);
      }

      setLoading(true);
      try {
        const result = await fetchCollectionReportsByLicencee(
          selectedLicencee || undefined,
          activeMetricsFilter === 'Custom'
            ? { from: customDateRange.startDate, to: customDateRange.endDate }
            : undefined,
          activeMetricsFilter === 'Custom' ? 'Custom' : undefined,
          batch,
          ITEMS_PER_BATCH,
          0,
          undefined,
          debouncedSearch,
          controller.signal,
          Array.isArray(filters.selectedLocation) ? filters.selectedLocation : (filters.selectedLocation !== 'all' ? [filters.selectedLocation] : undefined)
        );

        if (result) {
          setAllReports(prev => {
            const existingIds = new Set(prev.map(r => r._id));
            const uniqueNewReports = result.data.filter(
              (r: CollectionReportRow) => !existingIds.has(r._id)
            );
            return [...prev, ...uniqueNewReports];
          });

          if (result.pagination?.total !== undefined) {
            setTotalReports(result.pagination.total);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'CanceledError') {
          return;
        }
        console.error('[fetchReports] error:', err);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          if (!hasReceivedFirstResponseRef.current) {
            hasReceivedFirstResponseRef.current = true;
            setInitialLoading(false);
          }
        }
      }
    },
    [
      activeTab,
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      debouncedSearch,
    ]
  );

  /**
   * Refresh reports by resetting state and fetching first batch
   */
  const refreshReports = useCallback(async () => {
    setAllReports([]);
    setTotalReports(0);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    await fetchReports(1);
  }, [fetchReports]);

  // ==========================================================================
  // Event Handlers - CRUD Operations
  // ==========================================================================

  /**
   * Open create modal based on screen size
   */
  const handleCreate = () => {
    const isMobile = window.innerWidth < 1280;
    if (isMobile) {
      setShowNewCollectionMobile(true);
      setShowNewCollectionDesktop(false);
    } else {
      setShowNewCollectionDesktop(true);
      setShowNewCollectionMobile(false);
    }
  };

  /**
   * Open edit modal for a report based on screen size
   */
  const handleEdit = (id: string) => {
    if (!id) {
      console.warn('[handleEdit] No ID provided');
      return;
    }
    setEditingReportId(id);
    const isMobile = window.innerWidth < 1280;
    if (isMobile) {
      setShowEditMobile(true);
      setShowEditDesktop(false);
    } else {
      setShowEditDesktop(true);
      setShowEditMobile(false);
    }
  };

  /**
   * Start delete confirmation for a report
   */
  const handleDelete = (id: string) => {
    setReportToDelete(id);
    setShowDeleteConfirmation(true);
  };

  /**
   * Execute report deletion
   */
  const confirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      await axios.delete(`/api/collection-reports/${reportToDelete}`);
      toast.success('Report deleted');
      refreshReports();
    } catch {
      toast.error('Failed to delete report');
    } finally {
      setShowDeleteConfirmation(false);
      setReportToDelete(null);
    }
  };

  // ==========================================================================
  // Event Handlers - Search
  // ==========================================================================

  /**
   * Handle search term change with state reset
   */
  const handleSetSearchTerm = useCallback(
    (term: string) => {
      if (term.trim() !== searchTerm.trim()) {
        setSearchTerm(term);
        setAllReports([]);
        setTotalReports(0);
        setLoadedBatches(new Set());
        setCurrentPage(0);
      }
    },
    [searchTerm]
  );

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Fetch locations on licencee change
   * Uses lightweight metadata fetch for performance
   */
  useEffect(() => {
    fetchAllGamingLocations(selectedLicencee || undefined).then(locs => {
      // Map to standardized location format
      const formatted = locs.map(l => ({
        _id: String(l.id),
        name: l.name,
      }));
      setLocations(formatted);
      // Initialize metadata array as empty, modals will handle their own rich fetching
      setLocationsWithMachines([]);
    });
  }, [selectedLicencee]);

  /**
   * Initial data fetch and reset on tab/filter change
   */
  useEffect(() => {
    if (activeTab === 'collection') {
      setAllReports([]);
      setTotalReports(0);
      setLoadedBatches(new Set());
      setCurrentPage(0);
      setLoading(true);
      setInitialLoading(true);
      hasReceivedFirstResponseRef.current = false;
      hasStartedFirstLoadRef.current = false;
      fetchReports(1);
    } else {
      setLoading(false);
    }
  }, [fetchReports, activeTab]);

  /**
   * Fetch next batch when crossing batch boundaries
   */
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % PAGES_PER_BATCH === 0;
    const nextBatch = currentBatch + 1;

    const hasMoreData = totalReports === 0 || allReports.length < totalReports;

    if (isLastPageOfBatch && !loadedBatches.has(nextBatch) && hasMoreData) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchReports(nextBatch);
    }

    if (!loadedBatches.has(currentBatch) && hasMoreData) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchReports(currentBatch);
    }
  }, [
    currentPage,
    loading,
    fetchReports,
    loadedBatches,
    calculateBatchNumber,
    totalReports,
    allReports.length,
  ]);

  /**
   * Sync modal visibility with screen size
   */
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1280;
      if (showNewCollectionMobile && !isMobile) {
        setShowNewCollectionMobile(false);
        setShowNewCollectionDesktop(true);
      } else if (showNewCollectionDesktop && isMobile) {
        setShowNewCollectionDesktop(false);
        setShowNewCollectionMobile(true);
      }

      if (showEditMobile && !isMobile) {
        setShowEditMobile(false);
        setShowEditDesktop(true);
      } else if (showEditDesktop && isMobile) {
        setShowEditDesktop(false);
        setShowEditMobile(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [
    showNewCollectionMobile,
    showNewCollectionDesktop,
    showEditMobile,
    showEditDesktop,
  ]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    activeTab,
    loading:
      loading ||
      initialLoading ||
      isDataMissingForPage ||
      searchTerm !== debouncedSearch,
    initialLoading,
    refreshing,
    allReports,
    filteredReports,
    paginatedReports,
    currentPage,
    totalPages,
    totalReports,
    searchTerm,
    locations,
    locationsWithMachines,
    filters,
    showNewCollectionMobile,
    showNewCollectionDesktop,
    showEditMobile,
    showEditDesktop,
    editingReportId,
    showDeleteConfirmation,
    editableReportIds,
    // Tab Handlers
    handleTabChange,
    handleRefresh: useCallback(async () => {
      await refreshReports();
    }, [refreshReports]),
    // CRUD Handlers
    handleCreate,
    handleEdit,
    handleDelete,
    confirmDelete,
    // Setters
    setSearchTerm: handleSetSearchTerm,
    setCurrentPage,
    setShowNewCollectionMobile,
    setShowNewCollectionDesktop,
    setShowEditMobile,
    setShowEditDesktop,
    setShowDeleteConfirmation,
    setEditingReportId,
    // Data Refresh
    onRefreshLocations: useCallback(async () => {
      const locs = await fetchAllGamingLocations(
        selectedLicencee || undefined
      );
      const formatted = locs.map(l => ({
        _id: String(l.id),
        name: l.name,
      }));
      setLocations(formatted);
      setLocationsWithMachines([]);
    }, [selectedLicencee]),
  };
}
