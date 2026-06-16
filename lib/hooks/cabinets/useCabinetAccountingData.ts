/**
 * useCabinetAccountingData Hook
 *
 * Manages accounting-related data and state for a specific cabinet.
 * Handles collection history transformation, server-side paginated activity log
 * fetching with filtering, and filter option population.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useCabinetUIStore } from '@/lib/store/cabinetUIStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type {
  GamingMachine as Cabinet,
  MachineDocument,
} from '@/shared/types/entities';
import type { CollectionData } from '@/lib/types/cabinet/details';
import type { TimePeriod as ApiTimePeriod } from '@/shared/types/common';
import type { CollectionMetersHistoryEntry } from '@/shared/types/common';
import type { MachineEventDocument } from '@/shared/types/models';

// ============================================================================
// Types
// ============================================================================

type ActivityLogFilters = {
  eventType: string;
  type: string;
  event: string;
  game: string;
  command: string;
};

type ActivityLogPagination = {
  currentPage: number;
  totalPages: number | null;
  totalEvents: number | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  cursorResolved: boolean;
  matchCount?: number;
  matchIndex?: number;
};

type ActivityLogFilterOptions = {
  eventTypes: string[];
  eventLogLevels: string[];
  games: string[];
};

type UseCabinetAccountingDataProps = {
  cabinet: Cabinet;
  activeMetricsTabContent: string;
  refreshTrigger?: number;
};

export function useCabinetAccountingData({
  cabinet,
  activeMetricsTabContent,
  refreshTrigger,
}: UseCabinetAccountingDataProps) {
  // ============================================================================
  // Store state
  // ============================================================================
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();
  const { getBillValidatorState, setBillValidatorTimePeriod } =
    useCabinetUIStore();
  const billValidatorState = getBillValidatorState(cabinet._id);
  const billValidatorTimePeriod = billValidatorState.timePeriod;
  const billValidatorDateRange = billValidatorState.customDateRange;

  // ============================================================================
  // Local state
  // ============================================================================
  const [collectionHistory, setCollectionHistory] = useState<CollectionData[]>(
    []
  );
  const [activityLog, setActivityLog] = useState<MachineEventDocument[]>([]);
  const [machine, setMachine] = useState<MachineDocument | null>(null);

  // Loading and error
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const [collectionHistoryError, setCollectionHistoryError] = useState<
    string | null
  >(null);
  const [activityLogError, setActivityLogError] = useState<string | null>(null);

  // Date filter state for the activity log
  const [activityLogDateRange, setActivityLogDateRange] = useState<
    { from: Date; to: Date } | undefined
  >();
  const [activityLogTimePeriod, setActivityLogTimePeriod] =
    useState<ApiTimePeriod>('7d');

  // Server-side pagination state
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [activityDisplayPage, setActivityDisplayPage] = useState(0);
  const [activityLogPagination, setActivityLogPagination] =
    useState<ActivityLogPagination | null>(null);

  // Match navigation state for cursor seek (prev/next stepping through matches)
  const [matchOrdinal, setMatchOrdinal] = useState(0);
  const [, setMatchCount] = useState(0);

  // Prevents useEffect from triggering a re-fetch when activityLogPage is synced
  // after a cursor-seek (server resolved to a different batch than requested)
  const isCursorSyncRef = useRef(false);

  // Granular filter state (mirrors the filter controls in the table)
  const [activityLogFilters, setActivityLogFilters] =
    useState<ActivityLogFilters>({
      eventType: '',
      type: '',
      event: '',
      game: '',
      command: '',
    });

  // Available options returned from the API for dropdown population
  const [activityLogFilterOptions, setActivityLogFilterOptions] =
    useState<ActivityLogFilterOptions>({
      eventTypes: [],
      eventLogLevels: [],
      games: [],
    });

  // ============================================================================
  // Effects — collection history (derived from cabinet prop)
  // ============================================================================
  useEffect(() => {
    try {
      if (cabinet) {
        setMachine(cabinet as MachineDocument);

        if (
          cabinet.collectionMetersHistory &&
          Array.isArray(cabinet.collectionMetersHistory)
        ) {
          const transformedHistory = cabinet.collectionMetersHistory
            .map((entry: CollectionMetersHistoryEntry) => {
              return {
                _id: entry._id,
                timestamp: entry.timestamp,
                metersIn: entry.metersIn || 0,
                metersOut: entry.metersOut || 0,
                prevIn: entry.prevMetersIn || 0,
                prevOut: entry.prevMetersOut || 0,
                locationReportId: entry.locationReportId || '',
                machineId: cabinet._id,
                reportVersion: entry.reportVersion,
              };
            })
            .sort((a, b) => {
              return (
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
              );
            });

          setCollectionHistory(transformedHistory);
          setCollectionHistoryError(null);
        } else {
          setCollectionHistory([]);
          setCollectionHistoryError(null);
        }
      }
    } catch (error) {
      console.error('Error processing collection history:', error);
      setCollectionHistoryError('Failed to load collection history');
    }
  }, [cabinet]);

  // ============================================================================
  // Effects — activity log (server-side fetch with all filter params)
  // ============================================================================
  const fetchActivityLog = useCallback(async () => {
    if (activeMetricsTabContent !== 'Activity Log') return;

    setActivityLogLoading(true);
    setActivityLogError(null);

    try {
      const params = new URLSearchParams();
      params.append('id', cabinet._id);
      params.append('page', String(activityLogPage));
      params.append('limit', '100');

      // Date range / time period
      if (
        activityLogTimePeriod === 'Custom' &&
        activityLogDateRange
      ) {
        params.append('startDate', activityLogDateRange.from.toISOString());
        params.append('endDate', activityLogDateRange.to.toISOString());
      } else if (activityLogTimePeriod !== 'All Time') {
        params.append('timePeriod', activityLogTimePeriod || '7d');
      }

      // Granular filters
      if (activityLogFilters.eventType) {
        params.append('eventType', activityLogFilters.eventType);
      }
      if (activityLogFilters.type) {
        params.append('type', activityLogFilters.type);
      }
      if (activityLogFilters.event) {
        params.append('event', activityLogFilters.event);
      }
      if (activityLogFilters.game) {
        params.append('game', activityLogFilters.game);
      }
      if (activityLogFilters.command) {
        params.append('command', activityLogFilters.command);
        params.append('matchOrdinal', String(matchOrdinal));
      }

      const eventsRes = await axios.get(
        `/api/cabinets/by-id/events?${params.toString()}`
      );

      const resData = eventsRes.data;
      setActivityLog(resData.events || []);
      setActivityLogPagination(resData.pagination || null);

      // When cursor seek resolves, sync to the exact batch + display page.
      // matchIndex is the 0-based global rank of the Nth match; compute the
      // local display page within the batch so the matching row is visible.
      if (resData.pagination?.cursorResolved) {
        const idx = resData.pagination?.matchIndex ?? -1;
        setMatchCount(resData.pagination?.matchCount ?? 0);
        if (idx >= 0) {
          const batchSize = 100;
          const displayPageSize = 20;
          isCursorSyncRef.current = true;
          setActivityLogPage(Math.floor(idx / batchSize) + 1);
          setActivityDisplayPage(Math.floor((idx % batchSize) / displayPageSize));
        }
      } else {
        setMatchCount(0);
      }

      // Populate filter dropdowns from first successful response
      if (resData.filters) {
        setActivityLogFilterOptions({
          eventTypes: resData.filters.eventTypes || [],
          eventLogLevels: resData.filters.eventLogLevels || [],
          games: resData.filters.games || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch machine events:', error);
      setActivityLog([]);
      setActivityLogPagination(null);
      setActivityLogError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch activity log'
      );
    } finally {
      setActivityLogLoading(false);
    }
  }, [
    cabinet._id,
    activeMetricsTabContent,
    activityLogPage,
    activityLogTimePeriod,
    activityLogDateRange,
    activityLogFilters,
    matchOrdinal,
    refreshTrigger,
  ]);

  useEffect(() => {
    if (isCursorSyncRef.current) {
      isCursorSyncRef.current = false;
      return;
    }
    fetchActivityLog();
  }, [fetchActivityLog]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleActivityLogFilterChange = useCallback(
    (filters: Partial<ActivityLogFilters>) => {
      // Reset match navigation whenever the command changes (new seek or cleared)
      if ('command' in filters) {
        setMatchOrdinal(0);
        setMatchCount(0);
      }
      setActivityLogFilters(prev => ({ ...prev, ...filters }));
      setActivityLogPage(1);
      setActivityDisplayPage(0);
    },
    []
  );

  // Accepts 0-based GLOBAL display page; computes which API batch to fetch
  const handleActivityLogPageChange = useCallback(
    (globalZeroBased: number) => {
      const newApiPage = Math.floor(globalZeroBased / 5) + 1;
      const newLocalPage = globalZeroBased % 5;
      if (newApiPage !== activityLogPage) {
        setActivityLogPage(newApiPage);
        setActivityDisplayPage(0);
      } else {
        setActivityDisplayPage(newLocalPage);
      }
    },
    [activityLogPage]
  );

  const handleActivityLogTimePeriodChange = useCallback(
    (period: ApiTimePeriod) => {
      setActivityLogTimePeriod(period);
      setActivityLogPage(1);
      setActivityDisplayPage(0);
    },
    []
  );

  const handleActivityLogDateRangeChange = useCallback(
    (range: { from: Date; to: Date } | undefined) => {
      setActivityLogDateRange(range);
      setActivityLogPage(1);
      setActivityDisplayPage(0);
    },
    []
  );

  // ============================================================================
  // Computed — activity log display pagination
  // ============================================================================
  const displayedActivityLog = activityLog.slice(
    activityDisplayPage * 20,
    (activityDisplayPage + 1) * 20
  );

  const globalActivityDisplayPage = (activityLogPage - 1) * 5 + activityDisplayPage;

  const currentBatchDisplayPages = Math.max(1, Math.ceil(activityLog.length / 20));
  const totalKnownDisplayPages = activityLogPagination
    ? activityLogPagination.totalEvents !== null
      ? Math.max(1, Math.ceil(activityLogPagination.totalEvents / 20))
      : activityLogPagination.hasNextPage
        ? activityLogPage * 5
        : (activityLogPage - 1) * 5 + currentBatchDisplayPages
    : 1;

  return {
    collectionHistory,
    activityLog,
    displayedActivityLog,
    globalActivityDisplayPage,
    totalKnownDisplayPages,
    machine,
    activityLogLoading,
    collectionHistoryError,
    activityLogError,
    activityLogDateRange,
    activityLogTimePeriod,
    activityLogPage,
    activityLogPagination,
    activityLogFilters,
    activityLogFilterOptions,
    billValidatorTimePeriod,
    billValidatorDateRange,
    activeMetricsFilter,
    customDateRange,
    setActivityLogDateRange: handleActivityLogDateRangeChange,
    setActivityLogTimePeriod: handleActivityLogTimePeriodChange,
    setActivityLogPage: handleActivityLogPageChange,
    setActivityLogFilters: handleActivityLogFilterChange,
    setBillValidatorTimePeriod: (period: ApiTimePeriod) =>
      setBillValidatorTimePeriod(cabinet._id, period),
    setMachine,
  };
}
