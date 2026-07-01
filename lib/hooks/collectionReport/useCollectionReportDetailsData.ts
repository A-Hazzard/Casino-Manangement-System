/**
 * useCollectionReportDetailsData Hook
 *
 * Manages all state and logic for the collection report detail page.
 *
 * Features:
 * - Data fetching for report details and machine collections
 * - Sorting, searching, and pagination for machine metrics
 * - SAS time issue detection and auto-fix logic
 * - Report fixing/finalization handlers
 * - URL synchronization for tab state
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { fetchCollectionReportById } from '@/lib/helpers/collectionReport';
import { fetchCollectionsByLocationReportId } from '@/lib/helpers/collections';
import { useRequestWithRetry } from '@/lib/hooks/data/useRequestWithRetry';
import type { CollectionReportData, MachineMetric } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { validateCollectionReportData } from '@/lib/utils/validation/collectionReports';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

type TabType = 'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare';

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 20;

/**
 * Per-attempt request timeout before the request is aborted and retried.
 * The report's meter aggregation can legitimately take ~30s, so allow generous headroom —
 * a true timeout means a slow/hung connection, not a missing report.
 */
const ATTEMPT_TIMEOUT_MS = 60000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sorts machines alphabetically with numeric awareness
 * Groups machines like "Machine 1, Machine 2, Machine 10" correctly
 */
function sortMachinesAlphabetically(
  machines: MachineMetric[]
): MachineMetric[] {
  return [...machines].sort((machineA, machineB) => {
    const nameA = (machineA.machineId || '').toString();
    const nameB = (machineB.machineId || '').toString();

    const matchA = nameA.match(/^(.+?)(\d+)?$/);
    const matchB = nameB.match(/^(.+?)(\d+)?$/);

    if (!matchA || !matchB) {
      return nameA.localeCompare(nameB);
    }

    const [, baseA, numA] = matchA;
    const [, baseB, numB] = matchB;

    const baseCompare = baseA.localeCompare(baseB);
    if (baseCompare !== 0) {
      return baseCompare;
    }

    const numAInt = numA ? parseInt(numA, 10) : 0;
    const numBInt = numB ? parseInt(numB, 10) : 0;

    return numAInt - numBInt;
  });
}

// ============================================================================
// Main Hook
// ============================================================================

export function useCollectionReportDetailsData() {
  // ==========================================================================
  // Navigation & URL State
  // ==========================================================================
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = params.reportId as string;
  const highlightMachineId = searchParams?.get('highlightMachine') ?? undefined;

  // ==========================================================================
  // Data Loading — resilient fetch with retry, timeout, and countdown
  // ==========================================================================
  // Load the report (required) and its collections (best-effort) together so the
  // page has a single retryable unit. A collections-only failure falls back to []
  // and does NOT fail the whole load — only the report fetch drives error state.
  const loadReportData = useCallback(
    async (signal: AbortSignal) => {
      const config = { signal, timeout: ATTEMPT_TIMEOUT_MS };
      const [report, collectionsData] = await Promise.all([
        fetchCollectionReportById(reportId, config),
        fetchCollectionsByLocationReportId(reportId, config).catch(
          () => [] as CollectionDocument[]
        ),
      ]);
      return { report, collections: collectionsData };
    },
    [reportId]
  );

  const {
    data: retryData,
    error: retryError,
    isLoading,
    isRetrying,
    attempt,
    maxRetries,
    retryCountdown,
    execute: loadAll,
  } = useRequestWithRetry(loadReportData, {
    attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
  });

  const reportData = useMemo<CollectionReportData | null>(() => {
    const report = retryData?.report;
    if (!report) return null;
    return validateCollectionReportData(report) ? report : null;
  }, [retryData]);

  const collections = useMemo<CollectionDocument[]>(
    () => retryData?.collections ?? [],
    [retryData]
  );

  // Map low-level retry errors / missing data to the page's error codes.
  //   'UNAUTHORIZED' -> access denied screen
  //   'CONNECTION'   -> timeout/connection screen (report likely exists; retry)
  //   any other string -> genuine "not found" screen
  const error = useMemo<string | null>(() => {
    if (retryError) {
      if (
        retryError.status === 403 ||
        retryError.message?.includes('Unauthorized')
      ) {
        return 'UNAUTHORIZED';
      }
      // Timeout / connection / network / server errors mean the request never finished —
      // the report probably DOES exist, so surface a connection error (with retry), not 404.
      if (
        retryError.isTimeoutError ||
        retryError.isConnectionError ||
        retryError.isNetworkError ||
        retryError.status === 500 ||
        retryError.status === 502 ||
        retryError.status === 503 ||
        retryError.status === 504
      ) {
        return 'CONNECTION';
      }
      return 'Failed to fetch report data. Please try again.';
    }
    if (retryData && !retryData.report) {
      return 'Report not found. Please use a valid report ID.';
    }
    if (
      retryData?.report &&
      !validateCollectionReportData(retryData.report)
    ) {
      return 'Invalid report data received from server.';
    }
    return null;
  }, [retryError, retryData]);

  // Raw message for the connection-error detail panel.
  const errorDetail = retryError?.message ?? null;

  // Keep the skeleton up until the first attempt resolves (avoids a NotFound flash).
  const loading = isLoading || (!retryData && !retryError);

  // ==========================================================================
  // Local State - Table Controls
  // ==========================================================================
  const [machinePage, setMachinePage] = useState(1);
  const [sortField, setSortField] = useState<keyof MachineMetric>('sasGross');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // ==========================================================================
  // Local State - Tab Navigation
  // ==========================================================================
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (searchParams?.get('highlightMachine')) return 'Machine Metrics';
    const section = searchParams?.get('section');
    if (section === 'location') return 'Location Metrics';
    if (section === 'sas') return 'SAS Metrics Compare';
    if (section === 'machine') return 'Machine Metrics';
    return 'Machine Metrics';
  });

  // ==========================================================================
  // Refs
  // ==========================================================================
  const tabContentRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // Computed
  // ==========================================================================

  /**
   * Data sorted by the selected field, with special handling for machine names
   */
  const filteredAndSortedData = useMemo(() => {
    const metricsData = reportData?.machineMetrics || [];
    let sorted = [...metricsData];

    if (sortField === 'machineId') {
      sorted = sortMachinesAlphabetically(metricsData);
      if (sortDirection === 'desc') {
        sorted = sorted.reverse();
      }
    } else {
      sorted = [...metricsData].sort((metricA, metricB) => {
        const aValue = metricA[sortField];
        const bValue = metricB[sortField];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return 0;
      });
    }

    return sorted;
  }, [reportData?.machineMetrics, sortField, sortDirection]);

  /**
   * Data filtered by search term across multiple fields
   */
  const filteredSortedAndSearchedData = useMemo(() => {
    let data = filteredAndSortedData;

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      data = data.filter(item => {
        return (
          item.machineId?.toLowerCase().includes(lowerSearch) ||
          item.actualMachineId?.toLowerCase().includes(lowerSearch) ||
          item.dropCancelled?.toLowerCase().includes(lowerSearch) ||
          item.metersGross?.toString().toLowerCase().includes(lowerSearch) ||
          item.sasGross?.toString().toLowerCase().includes(lowerSearch)
        );
      });
    }

    return data;
  }, [filteredAndSortedData, searchTerm]);

  /**
   * Total pages for machine metrics pagination
   */
  const machineTotalPages = useMemo(() => {
    const total = Math.ceil(
      filteredSortedAndSearchedData.length / ITEMS_PER_PAGE
    );
    return total > 0 ? total : 1;
  }, [filteredSortedAndSearchedData.length]);

  /**
   * Current page slice of machine metrics
   */
  const paginatedMetricsData = useMemo(() => {
    const startIndex = (machinePage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSortedAndSearchedData.slice(startIndex, endIndex);
  }, [filteredSortedAndSearchedData, machinePage]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * Handle column header click for sorting
   */
  const handleSort = (field: keyof MachineMetric) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setMachinePage(1);
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * Handle tab change and sync with URL
   */
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const sectionMap: Record<string, string> = {
      'Machine Metrics': 'machine',
      'Location Metrics': 'location',
      'SAS Metrics Compare': 'sas',
    };

    const urlParams = new URLSearchParams(searchParams?.toString() || '');
    urlParams.set('section', sectionMap[tab]);
    const newUrl = `/collection-report/report/${reportId}?${urlParams.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * Refresh report and collections data (re-runs the retryable load).
   */
  const handleRefresh = useCallback(() => {
    loadAll();
  }, [loadAll]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Initial data fetch on mount and whenever the report changes.
   * `loadAll` is stable; `reportId` re-triggers the load (and aborts the prior one).
   */
  useEffect(() => {
    loadAll();
  }, [reportId, loadAll]);

  /**
   * Reset pagination when search term changes
   */
  useEffect(() => {
    setMachinePage(1);
  }, [searchTerm]);

  /**
   * Sync tab state with URL changes (browser back/forward)
   */
  useEffect(() => {
    const section = searchParams?.get('section');
    if (searchParams?.get('highlightMachine')) {
      if (activeTab !== 'Machine Metrics') {
        setActiveTab('Machine Metrics');
      }
      return;
    }
    if (section === 'location' && activeTab !== 'Location Metrics') {
      setActiveTab('Location Metrics');
    } else if (section === 'sas' && activeTab !== 'SAS Metrics Compare') {
      setActiveTab('SAS Metrics Compare');
    } else if (section === 'machine' && activeTab !== 'Machine Metrics') {
      setActiveTab('Machine Metrics');
    } else if (!section && activeTab !== 'Machine Metrics') {
      setActiveTab('Machine Metrics');
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (!highlightMachineId || filteredSortedAndSearchedData.length === 0) {
      return;
    }

    const machineIndex = filteredSortedAndSearchedData.findIndex(
      metric => metric.actualMachineId === highlightMachineId
    );

    if (machineIndex < 0) {
      return;
    }

    const targetPage = Math.floor(machineIndex / ITEMS_PER_PAGE) + 1;
    setMachinePage(previousPage =>
      previousPage === targetPage ? previousPage : targetPage
    );
  }, [highlightMachineId, filteredSortedAndSearchedData]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    reportId,
    reportData,
    loading,
    error,
    errorDetail,
    collections,
    // Retry / progress state
    isRetrying,
    attempt,
    maxRetries,
    retryCountdown,
    machinePage,
    activeTab,
    searchTerm,
    sortField,
    sortDirection,
    paginatedMetricsData,
    machineTotalPages,
    tabContentRef,
    highlightMachineId,
    // Setters
    setMachinePage,
    setSearchTerm,
    // Handlers
    handleSort,
    handleTabChange,
    handleRefresh,
  };
}
