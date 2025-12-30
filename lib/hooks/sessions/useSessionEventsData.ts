/**
 * useSessionEventsData Hook
 *
 * Coordinates all data and UI state for the session events page.
 */

'use client';

import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { isAbortError } from '@/lib/utils/errorHandling';
import type { MachineEvent } from '@/lib/types/sessions';
import type { SessionInfo } from '@/shared/types/entities';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function useSessionEventsData(sessionId: string, machineId: string) {
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();
  const makeEventsRequest = useAbortableRequest();

  // ============================================================================
  // State Management
  // ============================================================================
  const [allEvents, setAllEvents] = useState<MachineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [totalEventsFromAPI, setTotalEventsFromAPI] = useState<number>(0);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  const itemsPerPage = 20;
  const itemsPerBatch = 100;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // ============================================================================
  // Handlers
  // ============================================================================
  const fetchEvents = useCallback(async (batch: number = 1) => {
    setLoading(true);
    await makeEventsRequest(async signal => {
      const params = new URLSearchParams({
        page: batch.toString(),
        limit: itemsPerBatch.toString(),
      });

      if (activeMetricsFilter === 'Custom' && customDateRange?.startDate && customDateRange?.endDate) {
        params.append('startDate', new Date(customDateRange.startDate).toISOString());
        params.append('endDate', new Date(customDateRange.endDate).toISOString());
      } else if (activeMetricsFilter && activeMetricsFilter !== 'Custom') {
        // Simple period mapping - keeping it concise
        params.append('timePeriod', activeMetricsFilter);
      }

      try {
        const response = await axios.get(`/api/sessions/${sessionId}/${machineId}/events?${params}`, { signal });
        const { events, pagination } = response.data.data;
        if (pagination?.totalEvents) setTotalEventsFromAPI(pagination.totalEvents);
        
        setAllEvents(prev => {
          const existingIds = new Set(prev.map(e => e._id));
          return [...prev, ...events.filter((e: MachineEvent) => !existingIds.has(e._id))];
        });
      } catch (err) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(err)) {
          return;
        }
        toast.error('Failed to fetch events');
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    });
  }, [sessionId, machineId, activeMetricsFilter, customDateRange, makeEventsRequest]);

  const fetchSessionInfo = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const params = new URLSearchParams();
      
      if (activeMetricsFilter === 'Custom' && customDateRange?.startDate && customDateRange?.endDate) {
        params.append('startDate', new Date(customDateRange.startDate).toISOString());
        params.append('endDate', new Date(customDateRange.endDate).toISOString());
      } else if (activeMetricsFilter && activeMetricsFilter !== 'Custom') {
        params.append('timePeriod', activeMetricsFilter);
      }
      
      const url = `/api/sessions/${sessionId}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get(url);
      if (response.data.success) setSessionInfo(response.data.data);
    } catch {
      console.error('Failed to fetch session info');
    } finally {
      setLoadingSettings(false);
    }
  }, [sessionId, activeMetricsFilter, customDateRange]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(0);
    setAllEvents([]);
    setLoadedBatches(new Set([1]));
    fetchEvents(1);
    fetchSessionInfo();
  }, [fetchEvents, fetchSessionInfo]);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh, sessionId, machineId, activeMetricsFilter, customDateRange]);

  // Batch loading logic
  useEffect(() => {
    if (loading) return;
    const currentBatch = Math.floor(currentPage / pagesPerBatch) + 1;
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchEvents(nextBatch);
    }
  }, [currentPage, loading, loadedBatches, fetchEvents, pagesPerBatch]);

  // ============================================================================
  // Computed
  // ============================================================================
  const paginatedEvents = useMemo(() => {
    const start = (currentPage % pagesPerBatch) * itemsPerPage;
    return allEvents.slice(start, start + itemsPerPage);
  }, [allEvents, currentPage, pagesPerBatch, itemsPerPage]);

  const totalPages = useMemo(() => {
    const total = totalEventsFromAPI || allEvents.length;
    return Math.ceil(total / itemsPerPage) || 1;
  }, [totalEventsFromAPI, allEvents.length]);

  return {
    loading, loadingSettings, error, sessionInfo, isSettingsExpanded, paginatedEvents,
    currentPage, totalPages, expandedEvents,
    setMachinePage: setCurrentPage,
    setIsSettingsExpanded,
    toggleEventExpansion: (id: string) => {
      const newExpanded = new Set(expandedEvents);
      if (newExpanded.has(id)) newExpanded.delete(id);
      else newExpanded.add(id);
      setExpandedEvents(newExpanded);
    },
    handleRefresh,
  };
}


