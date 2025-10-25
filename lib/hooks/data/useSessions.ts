import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { buildSessionsQueryParams } from '@/lib/helpers/sessions';
import { SESSIONS_PAGINATION } from '@/lib/constants/sessions';
import type { Session, PaginationData } from '@/lib/types/sessions';

/**
 * Custom hook for managing sessions data and state
 * Handles fetching, pagination, search, and sorting
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();

  /**
   * Fetch sessions from API
   */
  const fetchSessions = useCallback(async () => {
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
        page: currentPage,
        limit: SESSIONS_PAGINATION.DEFAULT_LIMIT,
        search: searchTerm,
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
      setSessions(data.sessions || []);
      setPagination(data.pagination || null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      toast.error(errorMessage);
      setSessions([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchTerm,
    sortBy,
    sortOrder,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
  ]);

  /**
   * Handle search input change
   */
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page
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
      setCurrentPage(1); // Reset to first page
    },
    [sortBy, sortOrder]
  );

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Fetch sessions when dependencies change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
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
    fetchSessions,
  };
}
