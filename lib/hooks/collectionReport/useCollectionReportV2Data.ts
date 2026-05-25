'use client';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { LocationSelectItem } from '@/lib/types/location';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
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
  const [selectedLocation, setSelectedLocation] = useState<string | string[]>(
    'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<
    'collector' | 'location' | 'sessionId' | 'locationId'
  >('collector');
  const [sortField, setSortField] = useState<string>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showArchived, setShowArchived] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  const fetchSessions = async () => {
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
      if (showArchived) params.set('includeDeleted', 'true');

      const res = await axios.get(
        `/api/collection-reports-v2/sessions?${params.toString()}`,
        { signal: controller.signal }
      );
      if (res.data?.success) {
        setSessions(res.data.data);
        setTotalSessions(res.data.pagination?.total ?? 0);
      }
    } catch (error) {
      if (axios.isCancel(error) || (error instanceof Error && error.name === 'CanceledError')) {
        return;
      }
      console.error('[useCollectionReportV2Data] fetch error:', error);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleSort = (field: string) => {
      setSortDirection(prevDir => {
        if (sortField === field) {
          return prevDir === 'asc' ? 'desc' : 'asc';
        }
        return 'desc';
      });
      setSortField(field);
      setCurrentPage(0);
    };

  const onRefresh = async () => {
    setIsRefreshing(true);
    setCurrentPage(0);
    await fetchSessions();
    setIsRefreshing(false);
  };

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ============================================================================
  // Computed
  // ============================================================================

  const filteredSessions = (() => {
    if (!selectedLocation || selectedLocation === 'all') return sessions;
    if (Array.isArray(selectedLocation)) {
      if (selectedLocation.length === 0) return sessions;
      return sessions.filter(session =>
        selectedLocation.includes(session.locationId)
      );
    }
    return sessions.filter(session => session.locationId === selectedLocation);
  })();

  const totalPages = Math.ceil(totalSessions / ITEMS_PER_PAGE) || 1;

  return {
    sessions: filteredSessions,
    loading,
    isRefreshing,
    locations,
    selectedLocation,
    setSelectedLocation: setSelectedLocation as React.Dispatch<
      React.SetStateAction<string | string[]>
    >,
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
    showArchived,
    setShowArchived,
  };
}
