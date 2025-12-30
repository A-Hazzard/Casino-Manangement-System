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
import { useSessionsFilters } from './useSessionsFilters';
import { isAbortError } from '@/lib/utils/errorHandling';
import { useDebounce } from '@/lib/utils/hooks';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Session = {
  _id: string;
  [key: string]: unknown;
};

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

export function useSessions() {
  const makeRequest = useAbortableRequest();
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const { searchTerm, sortBy, sortOrder } = useSessionsFilters();
  
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

  const itemsPerPage = 20;
  const itemsPerBatch = 100;
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
          params.append('startDate', new Date(customDateRange.startDate).toISOString());
          params.append('endDate', new Date(customDateRange.endDate).toISOString());
        } else if (activeMetricsFilter && activeMetricsFilter !== 'Custom') {
          params.append('dateFilter', activeMetricsFilter);
        }

        try {
          const response = await axios.get(`/api/sessions?${params}`, {
            signal,
          });

          if (response.data.success) {
            const { sessions, pagination: paginationData } = response.data.data;
            setPagination(paginationData);

            setAllSessions(prev => {
              const existingIds = new Set(prev.map(s => s._id));
              return [
                ...prev,
                ...sessions.filter((s: Session) => !existingIds.has(s._id)),
              ];
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
          setAllSessions([]);
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
      makeRequest,
    ]
  );

  // ============================================================================
  // Effects
  // ============================================================================
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
    fetchSessions,
  ]);

  // Batch loading logic
  useEffect(() => {
    if (loading) return;
    const currentBatch = Math.floor(currentPage / pagesPerBatch) + 1;
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchSessions(nextBatch);
    }
  }, [currentPage, loading, loadedBatches, fetchSessions, pagesPerBatch]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const sessions = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allSessions.slice(startIndex, endIndex);
  }, [allSessions, currentPage, itemsPerPage]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const refreshSessions = useCallback(() => {
    setCurrentPage(0);
    setAllSessions([]);
    setLoadedBatches(new Set([1]));
    fetchSessions(1);
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
  };
}
