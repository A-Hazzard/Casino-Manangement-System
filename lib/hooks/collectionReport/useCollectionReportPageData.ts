/**
 * useCollectionReportPageData Hook
 *
 * Coordinates all data, filtering, and UI state for the collection report dashboard.
 */

'use client';

import { COLLECTION_TABS_CONFIG } from '@/lib/constants';
import {
    fetchCollectionReportsByLicencee,
    getLocationsWithMachines,
} from '@/lib/helpers/collectionReport';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useCollectionNavigation } from '@/lib/hooks/navigation';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionView } from '@/lib/types/collection';
import type { CollectionReportRow } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCollectionReportFilters } from './useCollectionReportFilters';

export function useCollectionReportPageData() {
  const searchParams = useSearchParams();
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();

  // ============================================================================
  // Tab & View State
  // ============================================================================
  const [activeTab, setActiveTab] = useState<CollectionView>(() => {
    const section = searchParams?.get('section');
    return (section as CollectionView) || 'collection';
  });

  const { pushToUrl } = useCollectionNavigation(COLLECTION_TABS_CONFIG);

  // ============================================================================
  // Collection Reports State
  // ============================================================================
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when fetchReports is called
  const [refreshing] = useState(false);
  const [allReports, setAllReports] = useState<CollectionReportRow[]>([]);
  const hasReceivedFirstResponseRef = useRef(false);
  const hasStartedFirstLoadRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [locationsWithMachines, setLocationsWithMachines] = useState<
    CollectionReportLocationWithMachines[]
  >([]);

  const itemsPerPage = 20;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  const filters = useCollectionReportFilters(allReports, locations);

  // ============================================================================
  // Modal State
  // ============================================================================
  const [showNewCollectionMobile, setShowNewCollectionMobile] = useState(false);
  const [showNewCollectionDesktop, setShowNewCollectionDesktop] =
    useState(false);
  const [showEditMobile, setShowEditMobile] = useState(false);
  const [showEditDesktop, setShowEditDesktop] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleTabChange = useCallback(
    (tab: string) => {
      const newTab = tab as CollectionView;
      setActiveTab(newTab);
      pushToUrl(newTab);
    },
    [pushToUrl]
  );

  // Calculate which batch we need based on current page
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  const fetchReports = useCallback(
    async (batch: number = 1) => {
      if (activeTab !== 'collection') {
        setLoading(false);
        return;
      }
      
      // Mark that we've started the first load
      if (!hasStartedFirstLoadRef.current) {
        hasStartedFirstLoadRef.current = true;
        // Ensure initialLoading is true when we start the first load
        setInitialLoading(true);
      }
      
      setLoading(true);
      try {
        const result = await fetchCollectionReportsByLicencee(
          selectedLicencee || undefined,
          activeMetricsFilter === 'Custom'
            ? { from: customDateRange.startDate, to: customDateRange.endDate }
            : undefined,
          activeMetricsFilter === 'Custom' ? 'Custom' : activeMetricsFilter,
          batch,
          itemsPerBatch,
          0,
          undefined,
          debouncedSearch
        );
        if (result) {
          // Merge new reports into allReports, avoiding duplicates
          setAllReports(prev => {
            const existingIds = new Set(prev.map(r => r._id));
            const uniqueNewReports = result.data.filter(
              (r: CollectionReportRow) => !existingIds.has(r._id)
            );
            return [...prev, ...uniqueNewReports];
          });
          // Update total count from pagination
          if (result.pagination?.total) {
            setTotalReports(result.pagination.total);
          }
        }
      } finally {
        setLoading(false);
        // Only set initialLoading to false after first response (success or error)
        if (!hasReceivedFirstResponseRef.current) {
          hasReceivedFirstResponseRef.current = true;
          setInitialLoading(false);
        }
      }
    },
    [
      activeTab,
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      debouncedSearch,
      itemsPerBatch,
    ]
  );

  const refreshReports = useCallback(async () => {
    setAllReports([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    await fetchReports(1);
  }, [fetchReports]);

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

  const handleDelete = (id: string) => {
    setReportToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      await axios.delete(`/api/collection-report/${reportToDelete}`);
      toast.success('Report deleted');
      refreshReports();
    } catch {
      toast.error('Failed to delete report');
    } finally {
      setShowDeleteConfirmation(false);
      setReportToDelete(null);
    }
  };

  // Resize handler
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

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    fetchAllGamingLocations(selectedLicencee || undefined).then(locs => {
      setLocations(locs.map(l => ({ _id: l.id, name: l.name })));
    });
    getLocationsWithMachines(selectedLicencee || undefined).then(
      setLocationsWithMachines
    );
  }, [selectedLicencee]);

  // Load initial batch on mount and when filters change
  useEffect(() => {
    // Only fetch if we're on the collection tab
    if (activeTab === 'collection') {
      setAllReports([]);
      setLoadedBatches(new Set());
      setCurrentPage(0);
      setLoading(true);
      fetchReports(1);
    } else {
      // If not on collection tab, ensure loading is false
      setLoading(false);
    }
  }, [fetchReports, activeTab]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Check if we have more data to load
    // If totalReports is 0, we haven't received the total yet, so continue fetching
    // If totalReports > 0, only fetch if we haven't loaded all items yet
    const hasMoreData = totalReports === 0 || allReports.length < totalReports;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch) && hasMoreData) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchReports(nextBatch);
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch) && hasMoreData) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchReports(currentBatch);
    }
  }, [
    currentPage,
    loading,
    fetchReports,
    itemsPerBatch,
    pagesPerBatch,
    loadedBatches,
    calculateBatchNumber,
    totalReports,
    allReports.length,
  ]);

  // Apply filters to all reports (client-side filtering after server-side search)
  const filteredReports = useMemo(() => {
    return filters.filteredReports;
  }, [filters.filteredReports]);

  // Calculate paginated reports from filtered results
  const paginatedReports = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  // Calculate total pages based on filtered results
  // This matches the members page pattern: use filtered length for pagination
  const totalPages = useMemo(() => {
    return Math.ceil(filteredReports.length / itemsPerPage) || 1;
  }, [filteredReports.length, itemsPerPage]);

  return {
    activeTab,
    loading: loading || initialLoading, // Combine both loading states
    initialLoading,
    refreshing,
    allReports,
    filteredReports,
    paginatedReports,
    currentPage,
    totalPages,
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
    handleTabChange,
    handleRefresh: useCallback(async () => {
      await refreshReports();
    }, [refreshReports]),
    handleEdit,
    handleDelete,
    confirmDelete,
    setSearchTerm,
    setCurrentPage,
    setShowNewCollectionMobile,
    setShowNewCollectionDesktop,
    setShowEditMobile,
    setShowEditDesktop,
    setShowDeleteConfirmation,
    setEditingReportId,
    onRefreshLocations: useCallback(async () => {
      const locs = await fetchAllGamingLocations(selectedLicencee || undefined);
      setLocations(locs.map(l => ({ _id: l.id, name: l.name })));
      const locsWithMachines = await getLocationsWithMachines(
        selectedLicencee || undefined
      );
      setLocationsWithMachines(locsWithMachines);
    }, [selectedLicencee]),
  };
}

