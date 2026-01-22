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

import { fetchCollectionReportById } from '@/lib/helpers/collectionReport';
import { checkSasTimeIssues } from '@/lib/helpers/collectionReport/detailData';
import { fetchCollectionsByLocationReportId } from '@/lib/helpers/collections';
import type { CollectionReportData, MachineMetric } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { validateCollectionReportData } from '@/lib/utils/validation';
import type {
  CollectionIssue,
  CollectionIssueDetails,
} from '@/shared/types/entities';
import axios from 'axios';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type TabType = 'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare';

export function useCollectionReportDetailsData() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = params.reportId as string;

  // ============================================================================
  // State Management
  // ============================================================================
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionDocument[]>([]);
  const [machinePage, setMachinePage] = useState(1);
  const [showFixReportConfirmation, setShowFixReportConfirmation] =
    useState(false);
  const [isFixingReport, setIsFixingReport] = useState(false);
  const [hasSasTimeIssues, setHasSasTimeIssues] = useState(false);
  const [hasCollectionHistoryIssues, setHasCollectionHistoryIssues] =
    useState(false);
  const [collectionHistoryMachines, setCollectionHistoryMachines] = useState<
    string[]
  >([]);
  const [sasTimeIssues, setSasTimeIssues] = useState<CollectionIssue[]>([]);
  const [showCollectionIssueModal, setShowCollectionIssueModal] =
    useState(false);
  const [selectedIssue, setSelectedIssue] = useState<CollectionIssue | null>(
    null
  );
  const [sortField, setSortField] = useState<keyof MachineMetric>('sasGross');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize activeTab from URL or default to "Machine Metrics"
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const section = searchParams?.get('section');
    if (section === 'location') return 'Location Metrics';
    if (section === 'sas') return 'SAS Metrics Compare';
    if (section === 'machine') return 'Machine Metrics';
    return 'Machine Metrics';
  });

  // ============================================================================
  // Refs
  // ============================================================================
  const hasRedirectedRef = useRef(false);
  const lastAutoFixIssuesRef = useRef<string>('');
  const tabContentRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Constants
  // ============================================================================
  const ITEMS_PER_PAGE = 10;

  // ============================================================================
  // Helper Functions
  // ============================================================================
  const sortMachinesAlphabetically = useCallback(
    (machines: MachineMetric[]) => {
      return machines.sort((a, b) => {
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
    },
    []
  );

  const checkForSasTimeIssues = useCallback(async (id: string) => {
    try {
      const issueDetails: CollectionIssueDetails = await checkSasTimeIssues(id);

      const sasIssues = issueDetails.issues.filter(
        issue =>
          issue.issueType !== 'prev_meters_mismatch' ||
          !issue.collectionId.includes('machine-') ||
          !issue.collectionId.includes('-history-')
      );
      const historyIssues = issueDetails.issues.filter(
        issue =>
          issue.issueType === 'prev_meters_mismatch' &&
          issue.collectionId.includes('machine-') &&
          issue.collectionId.includes('-history-')
      );

      setHasSasTimeIssues(sasIssues.length > 0);
      setHasCollectionHistoryIssues(historyIssues.length > 0);
      setSasTimeIssues(issueDetails.issues);

      try {
        const issuesResponse = await axios.get(
          '/api/collection-reports/check-all-issues',
          {
            params: { reportId: id },
          }
        );

        const reportIssues = issuesResponse.data.reportIssues || {};
        const reportKeys = Object.keys(reportIssues);

        if (reportKeys.length > 0) {
          const reportKey = reportKeys[0];
          const reportIssueData = reportIssues[reportKey];

          if (
            reportIssueData &&
            reportIssueData.hasIssues &&
            reportIssueData.issueCount > 0
          ) {
            setHasCollectionHistoryIssues(true);
            setCollectionHistoryMachines(reportIssueData.machines || []);
          } else {
            setHasCollectionHistoryIssues(false);
            setCollectionHistoryMachines([]);
          }
        }
      } catch (error) {
        console.error('Error checking machine history issues:', error);
      }
    } catch (error) {
      console.error('Error checking SAS time issues:', error);
      setHasSasTimeIssues(false);
      setHasCollectionHistoryIssues(false);
      setSasTimeIssues([]);
    }
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================
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
  }, [
    reportData?.machineMetrics,
    sortField,
    sortDirection,
    sortMachinesAlphabetically,
  ]);

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

  const machineTotalPages = useMemo(() => {
    const total = Math.ceil(
      filteredSortedAndSearchedData.length / ITEMS_PER_PAGE
    );
    return total > 0 ? total : 1;
  }, [filteredSortedAndSearchedData.length]);

  const paginatedMetricsData = useMemo(() => {
    const startIndex = (machinePage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSortedAndSearchedData.slice(startIndex, endIndex);
  }, [filteredSortedAndSearchedData, machinePage]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleSort = (field: keyof MachineMetric) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setMachinePage(1);
  };

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

  const handleIssueClick = (issue: CollectionIssue) => {
    setActiveTab('Machine Metrics');
    const machineCollection = collections.find(
      c => c._id === issue.collectionId
    );

    if (machineCollection) {
      const machineIndex = filteredAndSortedData.findIndex(
        m => m.machineId === machineCollection.machineId
      );

      if (machineIndex !== -1) {
        const pageNumber = Math.floor(machineIndex / ITEMS_PER_PAGE) + 1;
        setMachinePage(pageNumber);

        setTimeout(() => {
          const machineRow = document.querySelector(
            `[data-machine-id="${machineCollection.machineId}"]`
          );
          if (machineRow) {
            machineRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            machineRow.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
            setTimeout(() => {
              machineRow.classList.remove(
                'ring-2',
                'ring-blue-500',
                'bg-blue-50'
              );
            }, 3000);
          }
        }, 100);
      }
    }

    setSelectedIssue(issue);
    setShowCollectionIssueModal(true);
  };

  const handleFixReportConfirm = async () => {
    setShowFixReportConfirmation(false);
    setIsFixingReport(true);
    setError(null);
    try {
      const response = await axios.post(`/api/collection-reports/fix-report`, {
        reportId,
      });

      if (response.data.success) {
        const { results } = response.data;
        const issuesFixed =
          results.issuesFixed.sasTimesFixed +
          results.issuesFixed.movementCalculationsFixed +
          results.issuesFixed.prevMetersFixed +
          results.issuesFixed.historyEntriesFixed +
          results.issuesFixed.machineHistoryFixed;

        toast.success(
          `Fixed ${issuesFixed} issues in ${results.collectionsProcessed} collections`
        );

        const data = await fetchCollectionReportById(reportId);
        if (data) {
          setReportData(data);
          checkForSasTimeIssues(reportId);
        }
        const collectionsData =
          await fetchCollectionsByLocationReportId(reportId);
        setCollections(collectionsData);
      } else {
        toast.error(response.data.error || 'Failed to fix report');
      }
    } catch (error) {
      console.error('Error fixing report:', error);
      toast.error('Failed to fix report. Please try again.');
    } finally {
      setIsFixingReport(false);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================
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
          checkForSasTimeIssues(reportId);
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
  }, [reportId, checkForSasTimeIssues]);

  useEffect(() => {
    if (reportData?.isEditing && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      toast.info('Resuming unfinished edit...');
      router.push(`/collection-report?resume=${reportId}`);
    }
  }, [reportData?.isEditing, reportId, router]);

  // Keep state in sync with URL changes (for browser back/forward)
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

  // Auto-fix effect
  useEffect(() => {
    if (
      (hasSasTimeIssues || hasCollectionHistoryIssues) &&
      !isFixingReport &&
      !loading &&
      reportData &&
      lastAutoFixIssuesRef.current === ''
    ) {
      lastAutoFixIssuesRef.current = 'attempted';
      const autoFix = async () => {
        setIsFixingReport(true);
        try {
          const response = await axios.post(
            `/api/collection-reports/fix-report`,
            { reportId }
          );
          if (response.data.success) {
            const data = await fetchCollectionReportById(reportId);
            if (data) setReportData(data);
            await checkForSasTimeIssues(reportId);
            const collectionsData =
              await fetchCollectionsByLocationReportId(reportId);
            setCollections(collectionsData);
            toast.success('Collection history automatically synchronized');
          }
        } catch (error) {
          console.error('Auto-fix failed:', error);
        } finally {
          setIsFixingReport(false);
        }
      };
      autoFix();
    }
  }, [
    hasSasTimeIssues,
    hasCollectionHistoryIssues,
    isFixingReport,
    loading,
    reportId,
    reportData,
    checkForSasTimeIssues,
  ]);

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
    showFixReportConfirmation,
    isFixingReport,
    hasSasTimeIssues,
    hasCollectionHistoryIssues,
    sasTimeIssues,
    showCollectionIssueModal,
    selectedIssue,
    collectionHistoryMachines,
    paginatedMetricsData,
    machineTotalPages,
    tabContentRef,
    // Setters
    setMachinePage,
    setSearchTerm,
    setShowFixReportConfirmation,
    setShowCollectionIssueModal,
    // Handlers
    handleSort,
    handleTabChange,
    handleIssueClick,
    handleFixReportConfirm,
    handleFixReportClick: () => setShowFixReportConfirmation(true),
  };
}

