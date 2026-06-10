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
  totalPages: number;
  totalEvents: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  cursorResolved: boolean;
};

type ActivityLogFilterOptions = {
  eventTypes: string[];
  eventLogLevels: string[];
  games: string[];
};

type ActivityLogItem = Record<string, unknown>;

type UseCabinetAccountingDataProps = {
  cabinet: Cabinet;
  activeMetricsTabContent: string;
};

export function useCabinetAccountingData({
  cabinet,
  activeMetricsTabContent,
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
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
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
            .map((entry: Record<string, unknown>) => {
              const id = entry._id;
              const timestamp = entry.timestamp;

              let entryId: string;
              if (id && typeof id === 'object' && '$oid' in id) {
                entryId = (id as { $oid: string }).$oid;
              } else {
                entryId = String(id || '');
              }

              let entryTimestamp: string | Date;
              if (
                timestamp &&
                typeof timestamp === 'object' &&
                '$date' in timestamp
              ) {
                entryTimestamp = (timestamp as { $date: string }).$date;
              } else {
                entryTimestamp = timestamp as string | Date;
              }

              return {
                _id: entryId,
                timestamp: entryTimestamp,
                metersIn: (entry.metersIn as number) || 0,
                metersOut: (entry.metersOut as number) || 0,
                prevIn: (entry.prevMetersIn as number) || 0,
                prevOut: (entry.prevMetersOut as number) || 0,
                locationReportId: (entry.locationReportId as string) || '',
                machineId: cabinet._id,
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
      } else if (activityLogTimePeriod && activityLogTimePeriod !== 'All Time') {
        params.append('timePeriod', activityLogTimePeriod);
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
      }

      const eventsRes = await axios.get(
        `/api/cabinets/by-id/events?${params.toString()}`
      );

      const resData = eventsRes.data;
      setActivityLog(resData.events || []);
      setActivityLogPagination(resData.pagination || null);

      // When cursor seek resolves to a different batch, sync activityLogPage
      // without triggering a re-fetch (isCursorSyncRef guards the effect)
      const serverBatchPage = resData.pagination?.currentPage;
      if (
        serverBatchPage &&
        serverBatchPage !== activityLogPage &&
        resData.pagination?.cursorResolved
      ) {
        isCursorSyncRef.current = true;
        setActivityLogPage(serverBatchPage);
        setActivityDisplayPage(0);
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

  // Reveal 5 pages per batch loaded; peek one batch ahead so the next-page
  // button is active on the last page of the current batch.
  const totalKnownDisplayPages = activityLogPagination
    ? Math.min(
        activityLogPage * 5 + (activityLogPagination.hasNextPage ? 5 : 0),
        Math.ceil(activityLogPagination.totalEvents / 20)
      )
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
