/**
 * useSessions Hook
 *
 * Fetches and manages sessions data with pagination and batch loading.
 *
 * Features:
 * - Fetches sessions from API
 * - Handles pagination and batch loading
 * - Manages loading, error, and pagination states
 */

'use client';

import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { PaginationData, Session } from '@/lib/types/sessions';
import { isAbortError } from '@/lib/utils/errors';
import { useDebounce } from '@/lib/utils/hooks';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSessionsFilters } from './useSessionsFilters';

export function useSessions() {
  const makeRequest = useAbortableRequest();
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const filterControls = useSessionsFilters();
  const { searchTerm, sortBy, sortOrder, statusFilter } = filterControls;
  
  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // ============================================================================
  // State Management
  // ============================================================================
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const [currentBatch, setCurrentBatch] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const itemsPerPage = 20;
  const itemsPerBatch = 100;

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchSessions = useCallback(
    async (batch: number = 1, append: boolean = false) => {
      setLoading(true);
      await makeRequest(async signal => {
        const params = new URLSearchParams({
          page: batch.toString(),
          limit: itemsPerBatch.toString(),
        });

        if (debouncedSearchTerm) {
          params.append('search', debouncedSearchTerm);
        }

        if (statusFilter && statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        if (sortBy) {
          params.append('sortBy', sortBy);
        }

        if (sortOrder) {
          params.append('sortOrder', sortOrder);
        }

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.append('licencee', selectedLicencee);
        }

        if (
          activeMetricsFilter === 'Custom' &&
          customDateRange?.startDate &&
          customDateRange?.endDate
        ) {
          const startDate =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate as unknown as string);
          
          const endDate =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate as unknown as string);

          params.append('startDate', startDate.toISOString());
          params.append('endDate', endDate.toISOString());
        } else if (activeMetricsFilter && activeMetricsFilter !== 'Custom') {
          const now = new Date();
          let startDate: Date;
          let endDate: Date;

          switch (activeMetricsFilter) {
            case 'Today':
              startDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              );
              endDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                23,
                59,
                59
              );
              break;
            case 'Yesterday':
              startDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 1
              );
              endDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 1,
                23,
                59,
                59
              );
              break;
            case '7d':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              endDate = now;
              break;
            case '30d':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              endDate = now;
              break;
            case 'Quarterly':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              endDate = now;
              break;
            case 'All Time':
              startDate = new Date(0); // 1970
              endDate = now;
              break;
            default:
              // Fallback to 7d
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              endDate = now;
          }

          params.append('startDate', startDate.toISOString());
          params.append('endDate', endDate.toISOString());
        }

        try {
          const response = await axios.get(`/api/sessions?${params}`, {
            signal,
          });

          if (response.data.success) {
            const { sessions, pagination: paginationData } = response.data.data;
            setPagination(paginationData);
            setHasMore(paginationData.hasNextPage);

            setAllSessions(prev => {
              if (append) {
                const existingIds = new Set(prev.map(s => s._id));
                const newSessions = sessions.filter((s: Session) => !existingIds.has(s._id));
                return [...prev, ...newSessions];
              }
              return sessions;
            });

            setError(null);
          }
        } catch (err) {
          if (isAbortError(err)) {
            return;
          }

          const errorMessage =
            err instanceof Error ? err.message : 'Failed to fetch sessions';
          setError(errorMessage);
          toast.error(errorMessage);
          if (batch === 1) {
            setAllSessions([]);
          }
        } finally {
          setLoading(false);
        }
      });
    },
    [
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      debouncedSearchTerm,
      sortBy,
      sortOrder,
      statusFilter,
      makeRequest,
    ]
  );

  // ============================================================================
  // Effects
  // ============================================================================
  // Initial load or filter change
  useEffect(() => {
    setCurrentPage(0);
    setCurrentBatch(1);
    setAllSessions([]);
    setLoadedBatches(new Set([1]));
    
    // Initial load: fetch first batch to get 100 items (5 pages)
    fetchSessions(1, false);
  }, [
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    debouncedSearchTerm,
    sortBy,
    sortOrder,
    statusFilter,
    fetchSessions,
  ]);

  // Batch loading logic (removed)

  // ============================================================================
  // Computed Values
  // ============================================================================
  const sessions = useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return allSessions.slice(start, end);
  }, [allSessions, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!allSessions.length) return 0;
    return Math.ceil(allSessions.length / itemsPerPage);
  }, [allSessions, itemsPerPage]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    
    // If we are moving to the last page of loaded data and there's more on the server,
    // fetch the next batch in the background.
    if (page >= totalPages - 1 && hasMore && !loading) {
      const nextBatch = currentBatch + 1;
      if (!loadedBatches.has(nextBatch)) {
        void fetchSessions(nextBatch, true);
        setLoadedBatches(prev => new Set(prev).add(nextBatch));
        setCurrentBatch(nextBatch);
      }
    }
  }, [totalPages, hasMore, loading, currentBatch, loadedBatches, fetchSessions]);

  const refreshSessions = useCallback(async () => {
    setCurrentPage(0);
    setCurrentBatch(1);
    setAllSessions([]);
    setLoadedBatches(new Set([1]));
    await fetchSessions(1, false);
  }, [fetchSessions]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextBatch = currentBatch + 1;
    setCurrentBatch(nextBatch);
    await fetchSessions(nextBatch, true);
  }, [hasMore, loading, currentBatch, fetchSessions]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    sessions,
    loading,
    error,
    pagination,
    currentPage,
    totalPages,
    handlePageChange,
    refreshSessions,
    loadMore,
    hasMore,
    // Filter controls
    searchTerm,
    sortBy,
    sortOrder,
    statusFilter,
    setSearchTerm: filterControls.setSearchTerm,
    setSortBy: filterControls.setSortBy,
    setSortOrder: filterControls.setSortOrder,
    setStatusFilter: filterControls.setStatusFilter,
    handleSort: filterControls.handleSort,
    clearFilters: filterControls.clearFilters,
    hasActiveFilters: filterControls.hasActiveFilters,
    getSortIcon: filterControls.getSortIcon,
  };
}

