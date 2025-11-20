import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { buildSessionsQueryParams } from '@/lib/helpers/sessions';
import { useDebounce } from '@/lib/utils/hooks';
import type { Session, PaginationData } from '@/lib/types/sessions';

/**
 * Custom hook for managing sessions data and state
 * Handles fetching, pagination, search, and sorting
 */
export function useSessions() {
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [totalSessionsFromAPI, setTotalSessionsFromAPI] = useState<number>(0);

  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();

  // Calculate which batch we need based on current page
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / pagesPerBatch) + 1;
  }, [pagesPerBatch]);

  /**
   * Fetch sessions from API
   */
  const fetchSessions = useCallback(async (batch: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (activeMetricsFilter === 'Custom' && customDateRange) {
        startDate = customDateRange.startDate;
        endDate = customDateRange.endDate;
      } else {
        // Handle other filter types
        const now = new Date();
        switch (activeMetricsFilter) {
          case 'Today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case 'Yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0));
            endDate = new Date(yesterday.setHours(23, 59, 59, 999));
            break;
          case 'last7days':
            startDate = new Date(now.setDate(now.getDate() - 7));
            endDate = new Date();
            break;
          case 'last30days':
            startDate = new Date(now.setDate(now.getDate() - 30));
            endDate = new Date();
            break;
        }
      }

      const queryParams = buildSessionsQueryParams({
        page: batch,
        limit: itemsPerBatch,
        search: debouncedSearchTerm,
        sortBy,
        sortOrder,
        licensee: selectedLicencee === 'all' ? undefined : selectedLicencee,
        startDate,
        endDate,
      });

      const response = await axios.get(
        `/api/sessions?${queryParams.toString()}`
      );
      const data = response.data;
      // API returns { success: true, data: { sessions, pagination } }
      const newSessions = data.data?.sessions || data.sessions || [];
      
      // Update total sessions count from API pagination
      if (data.data?.pagination?.totalSessions) {
        setTotalSessionsFromAPI(data.data.pagination.totalSessions);
      }
      
      // Merge new sessions into allSessions, avoiding duplicates
      setAllSessions(prev => {
        const existingIds = new Set(prev.map(s => s._id));
        const uniqueNewSessions = newSessions.filter((s: Session) => !existingIds.has(s._id));
        return [...prev, ...uniqueNewSessions];
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      toast.error(errorMessage);
      setAllSessions([]);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchTerm, // Use debounced value instead of searchTerm
    sortBy,
    sortOrder,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    itemsPerBatch,
  ]);

  /**
   * Handle search input change
   */
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(0); // Reset to first page
  }, []);

  /**
   * Handle sort change
   */
  const handleSort = useCallback(
    (field: string) => {
      if (field === sortBy) {
        // Toggle sort order if same field
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        // Set new field with default desc order
        setSortBy(field);
        setSortOrder('desc');
      }
      setCurrentPage(0); // Reset to first page
    },
    [sortBy, sortOrder]
  );

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Load initial batch on mount and when filters change
  useEffect(() => {
    setAllSessions([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    setTotalSessionsFromAPI(0); // Reset API total when filters change
    fetchSessions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearchTerm, // Use debounced search term
    sortBy,
    sortOrder,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
  ]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchSessions(nextBatch);
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchSessions(currentBatch);
    }
  }, [
    currentPage,
    loading,
    fetchSessions,
    itemsPerBatch,
    pagesPerBatch,
    loadedBatches,
    calculateBatchNumber,
  ]);

  // Get items for current page from the current batch
  const paginatedSessions = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return allSessions.slice(startIndex, endIndex);
  }, [allSessions, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages - use API total if available, otherwise use loaded sessions
  const totalPages = useMemo(() => {
    if (totalSessionsFromAPI > 0) {
      // Use API total for accurate pagination
      return Math.ceil(totalSessionsFromAPI / itemsPerPage);
    }
    // Fallback to loaded sessions count
    const totalItems = allSessions.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [totalSessionsFromAPI, allSessions.length, itemsPerPage]);

  // Create pagination object for compatibility
  const pagination: PaginationData | null = useMemo(() => {
    // Use API total if available, otherwise use loaded sessions count
    const totalCount = totalSessionsFromAPI > 0 ? totalSessionsFromAPI : allSessions.length;
    if (totalCount === 0 && allSessions.length === 0) return null;
    return {
      currentPage: currentPage + 1, // Convert to 1-based for display
      totalPages,
      totalSessions: totalCount, // Use API total or loaded count
      hasNextPage: currentPage < totalPages - 1,
      hasPrevPage: currentPage > 0,
    };
  }, [currentPage, totalPages, allSessions.length, totalSessionsFromAPI]);

  /**
   * Refresh sessions - clear and reload from batch 1
   */
  const refreshSessions = useCallback(async () => {
    setAllSessions([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    await fetchSessions(1);
  }, [fetchSessions]);

  return {
    sessions: paginatedSessions,
    loading,
    error,
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    pagination,
    handleSearch,
    handleSort,
    handlePageChange,
    refreshSessions,
    fetchSessions: () => fetchSessions(1),
  };
}
