'use client';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { LocationSelectItem } from '@/lib/types/location';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type V2Session = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  licencee: string;
  collector: string;
  collectorName: string;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  createdAt: string;
};

const ITEMS_PER_PAGE = 20;

// ============================================================================
// Hook
// ============================================================================

export function useCollectionReportV2Data(
  selectedLicencee: string,
  locations: LocationSelectItem[]
) {
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();

  const [sessions, setSessions] = useState<V2Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // ============================================================================
  // Fetch
  // ============================================================================

  const fetchSessions = useCallback(async () => {
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
      params.set('page', String(currentPage + 1));
      params.set('limit', String(ITEMS_PER_PAGE));

      const res = await axios.get(
        `/api/collection-reports-v2/sessions?${params.toString()}`
      );
      if (res.data?.success) {
        setSessions(res.data.data);
        setTotalSessions(res.data.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('[useCollectionReportV2Data] fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedLicencee, activeMetricsFilter, customDateRange, currentPage]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ============================================================================
  // Client-side location filter
  // ============================================================================

  const filteredSessions = useMemo(() => {
    if (!selectedLocation || selectedLocation === 'all') return sessions;
    return sessions.filter(session => session.locationId === selectedLocation);
  }, [sessions, selectedLocation]);

  const totalPages = useMemo(
    () => Math.ceil(totalSessions / ITEMS_PER_PAGE) || 1,
    [totalSessions]
  );

  return {
    sessions: filteredSessions,
    loading,
    locations,
    selectedLocation,
    setSelectedLocation,
    currentPage,
    setCurrentPage,
    totalPages,
    totalSessions,
    onRefresh: fetchSessions,
  };
}
