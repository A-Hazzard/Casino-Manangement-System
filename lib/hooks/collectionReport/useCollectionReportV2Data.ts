'use client';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCollectionReportUIStore } from '@/lib/store/collectionReportUIStore';
import type { LocationSelectItem } from '@/lib/types/location';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

// ============================================================================
// Types
// ============================================================================

export type V2Session = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  noSMIBLocation?: boolean;
  licencee: string;
  collector: string;
  collectorName: string;
  collectorEmail: string;
  collectorFirstName: string;
  collectorLastName: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  totalMachineGross: number;
  totalSasGross: number;
  totalGrossDifference: number;
  createdAt: string;
  deletedAt?: string;
};

const ITEMS_PER_PAGE = 20;

// ============================================================================
// Hook
// ============================================================================

export function useCollectionReportV2Data(
  selectedLicencee: string,
  locations: LocationSelectItem[]
) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();

  const [sessions, setSessions] = useState<V2Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const selectedLocation = useCollectionReportUIStore(
    state => state.selectedLocation
  );
  const setSelectedLocation = useCollectionReportUIStore(
    state => state.setSelectedLocation
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<
    'collector' | 'location' | 'sessionId' | 'locationId'
  >('collector');
  const [sortField, setSortField] = useState<string>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk selection state
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    new Set()
  );
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{
    current: number;
    total: number;
    currentLabel: string;
    failedCount: number;
    isDone: boolean;
  } | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  const fetchSessions = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLicencee && selectedLicencee !== 'all') {
        params.set('licencee', selectedLicencee);
      }
      if (activeMetricsFilter) params.set('timePeriod', activeMetricsFilter);
      if (activeMetricsFilter === 'Custom') {
        if (customDateRange.startDate)
          params.set(
            'startDate',
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate.toISOString()
              : String(customDateRange.startDate)
          );
        if (customDateRange.endDate)
          params.set(
            'endDate',
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate.toISOString()
              : String(customDateRange.endDate)
          );
      }
      if (debouncedSearchTerm) {
        params.set('search', debouncedSearchTerm);
        params.set('searchType', searchType);
      }
      params.set('page', String(currentPage + 1));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (sortField) params.set('sortField', sortField);
      if (sortDirection) params.set('sortDirection', sortDirection);

      const res = await axios.get(
        `/api/collection-reports-v2/sessions?${params.toString()}`,
        { signal: controller.signal }
      );
      if (res.data?.success && !controller.signal.aborted) {
        setSessions(res.data.data);
        setTotalSessions(res.data.pagination?.total ?? 0);
      }
    } catch (error) {
      if (
        axios.isCancel(error) ||
        (error instanceof Error && error.name === 'CanceledError')
      ) {
        return;
      }
      console.error('[useCollectionReportV2Data] fetch error:', error);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    currentPage,
    debouncedSearchTerm,
    searchType,
    sortField,
    sortDirection,
  ]);

  const handleSort = useCallback(
    (field: string) => {
      setSortDirection(prevDir => {
        if (sortField === field) {
          return prevDir === 'asc' ? 'desc' : 'asc';
        }
        return 'desc';
      });
      setSortField(field);
      setCurrentPage(0);
    },
    [sortField]
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(0);
    await fetchSessions();
    setIsRefreshing(false);
  }, [fetchSessions]);

  // ============================================================================
  // Computed
  // ============================================================================

  const filteredSessions = useMemo(() => {
    if (!selectedLocation || selectedLocation === 'all') return sessions;
    if (Array.isArray(selectedLocation)) {
      if (selectedLocation.length === 0) return sessions;
      return sessions.filter(session =>
        selectedLocation.includes(session.locationId)
      );
    }
    return sessions.filter(session => session.locationId === selectedLocation);
  }, [sessions, selectedLocation]);

  // Bulk selection handlers
  const handleSelectAllSessions = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allIds = new Set(
          filteredSessions
            .map(s => s.sessionId)
            .filter(Boolean) as string[]
        );
        setSelectedSessionIds(allIds);
      } else {
        setSelectedSessionIds(new Set());
      }
    },
    [filteredSessions]
  );

  const handleSessionSelectionChange = useCallback(
    (sessionId: string, checked: boolean) => {
      if (sessionId === '__select_all__') {
        handleSelectAllSessions(checked);
        return;
      }
      setSelectedSessionIds(prev => {
        const next = new Set(prev);
        if (checked) {
          next.add(sessionId);
        } else {
          next.delete(sessionId);
        }
        return next;
      });
    },
    [handleSelectAllSessions]
  );

  const clearV2Selection = useCallback(() => {
    setSelectedSessionIds(new Set());
    setShowBulkDeleteConfirm(false);
  }, []);

  const confirmV2BulkDelete = useCallback(async () => {
    const ids = Array.from(selectedSessionIds);
    if (ids.length === 0) return;

    setShowBulkDeleteConfirm(false);
    setIsBulkDeleting(true);
    setBulkDeleteProgress({ current: 0, total: ids.length, currentLabel: '', failedCount: 0, isDone: false });

    let failedCount = 0;

    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      const session = sessions.find(s => s.sessionId === id);
      const label = session
        ? `${session.locationName} (${new Date(session.createdAt).toLocaleDateString()})`
        : id;

      setBulkDeleteProgress({ current: index + 1, total: ids.length, currentLabel: label, failedCount, isDone: false });

      try {
        await axios.delete(`/api/collection-reports-v2/sessions/${id}`);
      } catch (error) {
        failedCount++;
        console.error(
          `[confirmV2BulkDelete] Failed to delete session ${id}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    setBulkDeleteProgress(prev => prev ? { ...prev, isDone: true, failedCount } : null);
    setIsBulkDeleting(false);
  }, [selectedSessionIds, sessions]);

  const closeV2BulkDeleteProgress = useCallback(async () => {
    setBulkDeleteProgress(null);
    setSelectedSessionIds(new Set());
    await onRefresh();
  }, [onRefresh]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const totalPages = useMemo(
    () => Math.ceil(totalSessions / ITEMS_PER_PAGE) || 1,
    [totalSessions]
  );

  return {
    sessions: filteredSessions,
    loading,
    isRefreshing,
    locations,
    selectedLocation,
    setSelectedLocation,
    currentPage,
    setCurrentPage,
    totalPages,
    totalSessions,
    onRefresh,
    searchTerm,
    setSearchTerm,
    searchType,
    setSearchType,
    sortField,
    sortDirection,
    handleSort,
    selectedSessionIds,
    handleSessionSelectionChange,
    handleSelectAllSessions,
    clearV2Selection,
    confirmV2BulkDelete,
    closeV2BulkDeleteProgress,
    bulkDeleteProgress,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    isBulkDeleting,
  };
}
