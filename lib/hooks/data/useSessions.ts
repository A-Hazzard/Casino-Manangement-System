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
import { isAbortError } from '@/lib/utils/errorHandling';
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

  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchSessions = useCallback(
    async (batch: number = 1) => {
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

            setAllSessions(prev => {
              // If it's the first batch (e.g. new filter/search), replace entirely
              if (batch === 1) return sessions;

              // Otherwise append new sessions, avoiding duplicates
              const existingIds = new Set(prev.map(s => s._id));
              const newSessions = sessions.filter((s: Session) => !existingIds.has(s._id));
              return [...prev, ...newSessions];
            });

            setError(null);
          }
        } catch (err) {
          // Silently handle aborted requests - this is expected behavior when switching filters
          if (isAbortError(err)) {
            return;
          }

          const errorMessage =
            err instanceof Error ? err.message : 'Failed to fetch sessions';
          setError(errorMessage);
          toast.error(errorMessage);
          // Only clear sessions on error if strict mode caused double fetch
          // But usually we don't want to clear if just one batch failed?
          // For now, cleaner to just clear or keep old data. 
          // If first batch fails, clear sessions.
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
    setAllSessions([]);
    setLoadedBatches(new Set([1]));
    fetchSessions(1);
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

  // Batch loading logic
  useEffect(() => {
    if (loading) return;
    const currentBatch = Math.floor(currentPage / pagesPerBatch) + 1;
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Check if we need to load the next batch
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      // Check if we actually have more pages on server before fetching
      if (pagination && pagination.hasNextPage) {
        setLoadedBatches(prev => new Set([...prev, nextBatch]));
        fetchSessions(nextBatch);
      }
    }
  }, [currentPage, loading, loadedBatches, fetchSessions, pagesPerBatch, pagination]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const sessions = useMemo(() => {
    // Calculate start/end indices based on total accumulated items
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return allSessions.slice(start, end);
  }, [allSessions, currentPage, itemsPerPage]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const refreshSessions = useCallback(async () => {
    setCurrentPage(0);
    setAllSessions([]);
    setLoadedBatches(new Set([1]));
    await fetchSessions(1);
  }, [fetchSessions]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    sessions,
    loading,
    error,
    pagination,
    currentPage,
    handlePageChange,
    refreshSessions,
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
