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
import type { CollectionReportData, MachineMetric } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { validateCollectionReportData } from '@/lib/utils/validation';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Type Definitions
// ============================================================================

type TabType = 'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare';

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 20;

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
  return [...machines].sort((a, b) => {
    const nameA = (a.machineId || '').toString();
    const nameB = (b.machineId || '').toString();

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

  // ==========================================================================
  // Local State - Data & Loading
  // ==========================================================================
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionDocument[]>([]);

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
    const section = searchParams?.get('section');
    if (section === 'location') return 'Location Metrics';
    if (section === 'sas') return 'SAS Metrics Compare';
    if (section === 'machine') return 'Machine Metrics';
    return 'Machine Metrics';
  });

  // ==========================================================================
  // Refs
  // ==========================================================================
  const hasRedirectedRef = useRef(false);
  const tabContentRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // Computed Values
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
      sorted = [...metricsData].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

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
  // Event Handlers - Table Controls
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
  // Event Handlers - Tab Navigation
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
  // Event Handlers - Data Operations
  // ==========================================================================

  /**
   * Refresh report and collections data
   */
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCollectionReportById(reportId);
      if (data) {
        setReportData(data);
      }
      const collectionsData =
        await fetchCollectionsByLocationReportId(reportId);
      setCollections(collectionsData);
    } catch (error) {
      console.error('Error refreshing report data:', error);
      toast.error('Failed to refresh report data');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Initial data fetch on mount
   */
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCollectionReportById(reportId)
      .then(data => {
        if (!data) {
          setError('Report not found. Please use a valid report ID.');
        } else if (!validateCollectionReportData(data)) {
          setError('Invalid report data received from server.');
        } else {
          setReportData(data);
        }
      })
      .catch(err => {
        if (
          err?.response?.status === 403 ||
          err?.message?.includes('Unauthorized')
        ) {
          setError('UNAUTHORIZED');
        } else {
          setError('Failed to fetch report data. Please try again.');
        }
      })
      .finally(() => setLoading(false));

    fetchCollectionsByLocationReportId(reportId)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [reportId]);

  /**
   * Reset pagination when search term changes
   */
  useEffect(() => {
    setMachinePage(1);
  }, [searchTerm]);

  /**
   * Redirect to collection list if report is in editing state
   */
  useEffect(() => {
    if (reportData?.isEditing && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      toast.info('Resuming unfinished edit...');
      router.push(`/collection-report?resume=${reportId}`);
    }
  }, [reportData?.isEditing, reportId, router]);

  /**
   * Sync tab state with URL changes (browser back/forward)
   */
  useEffect(() => {
    const section = searchParams?.get('section');
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

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    reportId,
    reportData,
    loading,
    error,
    collections,
    machinePage,
    activeTab,
    searchTerm,
    sortField,
    sortDirection,
    paginatedMetricsData,
    machineTotalPages,
    tabContentRef,
    // Setters
    setMachinePage,
    setSearchTerm,
    // Handlers
    handleSort,
    handleTabChange,
    handleRefresh,
  };
}
