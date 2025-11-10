'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SyncButton } from '@/components/ui/RefreshButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Date formatting function for SAS times
const formatSasTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateString; // Return original if parsing fails
  }
};

// Layout components

import PageLayout from '@/components/layout/PageLayout';
import NotFoundError from '@/components/ui/errors/NotFoundError';

// Skeleton components
import {
  CardSkeleton,
  CollectionReportSkeleton,
  TableSkeleton,
} from '@/components/ui/skeletons/CollectionReportDetailSkeletons';

// Helper functions
import { MachineSearchBar } from '@/components/collectionReport/MachineSearchBar';
import { fetchCollectionReportById } from '@/lib/helpers/collectionReport';
import {
  animateDesktopTabTransition,
  calculateLocationTotal,
  calculateSasMetricsTotals,
} from '@/lib/helpers/collectionReportDetailPage';
import {
  checkSasTimeIssues,
  syncMetersForReport,
} from '@/lib/helpers/collectionReportDetailPageData';
import { fetchCollectionsByLocationReportId } from '@/lib/helpers/collections';
import { formatCurrency } from '@/lib/utils/currency';
import { getFinancialColorClass } from '@/lib/utils/financialColors';
import { validateCollectionReportData } from '@/lib/utils/validation';
import axios from 'axios';
import { toast } from 'sonner';

// Types
import type { CollectionReportData, MachineMetric } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import type {
  CollectionIssue,
  CollectionIssueDetails,
} from '@/shared/types/entities';

// Components
import { CollectionIssueModal } from '@/components/collectionReport/CollectionIssueModal';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';

function CollectionReportPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const user = useUserStore(state => state.user);

  const reportId = params.reportId as string;
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Initialize activeTab from URL or default to "Machine Metrics"
  const [activeTab, setActiveTab] = useState<
    'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare'
  >(() => {
    const section = searchParams?.get('section');
    if (section === 'location') return 'Location Metrics';
    if (section === 'sas') return 'SAS Metrics Compare';
    if (section === 'machine') return 'Machine Metrics';
    return 'Machine Metrics'; // default
  });
  const [collections, setCollections] = useState<CollectionDocument[]>([]);
  const ITEMS_PER_PAGE = 10;
  const [machinePage, setMachinePage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);
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

  // Track the issue state when auto-fix was last triggered to prevent infinite loops
  const lastAutoFixIssuesRef = useRef<string>('');

  // Search and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof MachineMetric>('sasGross');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const tabContentRef = useRef<HTMLDivElement>(null);

  // Sort handler
  const handleSort = (field: keyof MachineMetric) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setMachinePage(1); // Reset to first page when sorting
  };

  // Use resolved machine data from backend instead of generating from raw collections
  const metricsData = useMemo(
    () => reportData?.machineMetrics || [],
    [reportData?.machineMetrics]
  );

  // Utility function for proper alphabetical and numerical sorting
  const sortMachinesAlphabetically = (machines: MachineMetric[]) => {
    return machines.sort((a, b) => {
      const nameA = (a.machineId || '').toString();
      const nameB = (b.machineId || '').toString();

      // Extract the base name and number parts
      const matchA = nameA.match(/^(.+?)(\d+)?$/);
      const matchB = nameB.match(/^(.+?)(\d+)?$/);

      if (!matchA || !matchB) {
        return nameA.localeCompare(nameB);
      }

      const [, baseA, numA] = matchA;
      const [, baseB, numB] = matchB;

      // First compare the base part alphabetically
      const baseCompare = baseA.localeCompare(baseB);
      if (baseCompare !== 0) {
        return baseCompare;
      }

      // If base parts are the same, compare numerically
      const numAInt = numA ? parseInt(numA, 10) : 0;
      const numBInt = numB ? parseInt(numB, 10) : 0;

      return numAInt - numBInt;
    });
  };

  // Search and sort logic
  const filteredAndSortedData = useMemo(() => {
    let filtered = metricsData;

    // Apply search filter
    if (searchTerm) {
      filtered = metricsData.filter(metric =>
        (metric.machineId?.toLowerCase() || '').includes(
          searchTerm.toLowerCase()
        )
      );
    }

    // Apply sorting
    let sorted = [...filtered];

    // If sorting by machineId, use alphabetical and numerical sorting
    if (sortField === 'machineId') {
      sorted = sortMachinesAlphabetically(filtered);
      // Reverse if descending order
      if (sortDirection === 'desc') {
        sorted = sorted.reverse();
      }
    } else {
      // For other fields, use the existing sorting logic
      sorted = [...filtered].sort((a, b) => {
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
  }, [metricsData, searchTerm, sortField, sortDirection]);

  const machineTotalPages = Math.ceil(
    filteredAndSortedData.length / ITEMS_PER_PAGE
  );
  const hasData = filteredAndSortedData.length > 0;

  // Apply pagination to the filtered and sorted data
  const startIndex = (machinePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMetricsData = filteredAndSortedData.slice(
    startIndex,
    endIndex
  );

  // Function to check for SAS time issues using the enhanced API
  const checkForSasTimeIssues = useCallback(async (reportId: string) => {
    try {
      const issueDetails: CollectionIssueDetails =
        await checkSasTimeIssues(reportId);

      // Separate SAS time issues from collection history issues
      const sasTimeIssues = issueDetails.issues.filter(
        issue =>
          issue.issueType !== 'prev_meters_mismatch' ||
          !issue.collectionId.includes('machine-') ||
          !issue.collectionId.includes('-history-')
      );
      const collectionHistoryIssues = issueDetails.issues.filter(
        issue =>
          issue.issueType === 'prev_meters_mismatch' &&
          issue.collectionId.includes('machine-') &&
          issue.collectionId.includes('-history-')
      );

      setHasSasTimeIssues(sasTimeIssues.length > 0);
      setHasCollectionHistoryIssues(collectionHistoryIssues.length > 0);
      setSasTimeIssues(issueDetails.issues);

      // Also check for orphaned history entries and other machine-level issues
      // This will only check machines in this specific report (no global scan)
      try {
        const axios = (await import('axios')).default;
        const issuesResponse = await axios.get(
          '/api/collection-reports/check-all-issues',
          {
            params: { reportId },
          }
        );

        console.warn('🔍 Machine history check response:', issuesResponse.data);
        console.warn('🔍 Looking for reportId:', reportId);

        const reportIssues = issuesResponse.data.reportIssues || {};
        console.warn('🔍 All report issues keys:', Object.keys(reportIssues));

        // The reportIssues object uses MongoDB _id as keys, and we're looking for our reportId
        // Since we called the API with reportId, there should be exactly one entry in reportIssues
        const reportKeys = Object.keys(reportIssues);

        if (reportKeys.length === 0) {
          console.warn(`❌ No report issues found in response`);
          setHasCollectionHistoryIssues(false);
        } else {
          // Get the first (and should be only) report's issues
          const reportKey = reportKeys[0];
          const reportIssueData = reportIssues[reportKey];

          console.warn(`🔍 Found report key: ${reportKey}`);
          console.warn(`🔍 Report issue data:`, reportIssueData);

          if (
            reportIssueData &&
            reportIssueData.hasIssues &&
            reportIssueData.issueCount > 0
          ) {
            console.warn(
              `✅ Setting hasCollectionHistoryIssues to true (${reportIssueData.issueCount} issues found)`
            );
            setHasCollectionHistoryIssues(true);
            // Store the machines with issues
            const machinesWithIssues = reportIssueData.machines || [];
            console.warn(
              `📋 Machines with collection history issues:`,
              machinesWithIssues
            );
            setCollectionHistoryMachines(machinesWithIssues);
          } else {
            console.warn(
              `❌ No machine history issues found, hasCollectionHistoryIssues remains false`
            );
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

  // Function to handle clicking on a collection issue
  const handleIssueClick = (issue: CollectionIssue) => {
    // Switch to Machine Metrics tab
    setActiveTab('Machine Metrics');

    // Find the machine in the collections list
    const machineCollection = collections.find(
      c => c._id === issue.collectionId
    );
    if (machineCollection) {
      // Find the page this machine is on
      const machineIndex = filteredAndSortedData.findIndex(
        m => m.machineId === machineCollection.machineId
      );

      if (machineIndex !== -1) {
        const pageNumber = Math.floor(machineIndex / ITEMS_PER_PAGE) + 1;
        setMachinePage(pageNumber);

        // Wait for page render, then scroll to and highlight the machine
        setTimeout(() => {
          const machineRow = document.querySelector(
            `[data-machine-id="${machineCollection.machineId}"]`
          );
          if (machineRow) {
            machineRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add temporary highlight effect
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

    // Still show the issue details modal
    setSelectedIssue(issue);
    setShowCollectionIssueModal(true);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCollectionReportById(reportId)
      .then(data => {
        if (data === null) {
          setError('Report not found. Please use a valid report ID.');
          setReportData(null);
        } else if (!validateCollectionReportData(data)) {
          setError('Invalid report data received from server.');
          setReportData(null);
        } else {
          setReportData(data);
          // Check for SAS time issues when data is loaded
          checkForSasTimeIssues(reportId);
        }
      })
      .catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching collection report:', error);
        }
        setError('Failed to fetch report data. Please try again.');
        setReportData(null);
      })
      .finally(() => setLoading(false));

    fetchCollectionsByLocationReportId(reportId)
      .then(setCollections)
      .catch(() => setCollections([]));
    // Note: checkForSasTimeIssues intentionally omitted to prevent dependency loop
    // It's called once on initial load above (line 416), which is sufficient
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  // AUTO-FIX: Automatically fix collection history issues when detected
  // PRINCIPLE: Collections are always right, history might be wrong
  // This ensures history is automatically synced to match collection documents
  useEffect(() => {
    // Only trigger auto-fix once per page session
    // Once auto-fix has run, it never runs again until page remounts
    // This prevents infinite loops even if requery finds new/different issues
    if (
      (hasSasTimeIssues || hasCollectionHistoryIssues) &&
      !isFixingReport &&
      !loading &&
      reportData &&
      lastAutoFixIssuesRef.current === '' // Only run if never attempted
    ) {
      console.warn(
        '🔧 Auto-fix: Collection issues detected, automatically fixing (ONE TIME ONLY)...'
      );
      console.warn(
        '   PRINCIPLE: Collection documents are source of truth, syncing history to match'
      );

      // Mark that auto-fix has been attempted - NEVER reset during page session
      lastAutoFixIssuesRef.current = 'attempted';

      // Automatically trigger fix
      const autoFix = async () => {
        setIsFixingReport(true);
        try {
          const response = await axios.post(
            `/api/collection-reports/fix-report`,
            {
              reportId,
            }
          );

          if (response.data.success) {
            const { results } = response.data;
            const issuesFixed =
              results.issuesFixed.sasTimesFixed +
              results.issuesFixed.movementCalculationsFixed +
              results.issuesFixed.prevMetersFixed +
              results.issuesFixed.historyEntriesFixed +
              results.issuesFixed.machineHistoryFixed;

            console.warn(`✅ Auto-fix completed: Fixed ${issuesFixed} issues`);

            // Silently refresh data
            const data = await fetchCollectionReportById(reportId);
            if (data) {
              setReportData(data);
            }

            await checkForSasTimeIssues(reportId);

            const collectionsData =
              await fetchCollectionsByLocationReportId(reportId);
            setCollections(collectionsData);

            // Show subtle success notification
            toast.success('Collection history automatically synchronized', {
              description: `${issuesFixed} issues resolved automatically`,
              duration: 4000,
            });
          }
        } catch (error) {
          console.error('Auto-fix failed:', error);
          // Don't show error to user for auto-fix - manual button still available
        } finally {
          setIsFixingReport(false);
        }
      };

      autoFix();
    }
    // NOTE: lastAutoFixIssuesRef is NEVER reset during page session to prevent infinite loops
    // If user needs to re-run auto-fix, they must refresh the page or use manual "Fix Report" button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasSasTimeIssues,
    hasCollectionHistoryIssues,
    isFixingReport,
    loading,
    reportId,
  ]);

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

  useEffect(() => {
    animateDesktopTabTransition(tabContentRef);
  }, [activeTab]);

  // Handle scroll to show/hide floating refresh button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setShowFloatingRefresh(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle tab change with URL update
  const handleTabChange = (
    tab: 'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare'
  ) => {
    setActiveTab(tab);

    // Update URL based on tab selection
    const sectionMap: Record<string, string> = {
      'Machine Metrics': 'machine',
      'Location Metrics': 'location',
      'SAS Metrics Compare': 'sas',
    };

    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('section', sectionMap[tab]);
    const newUrl = `/collection-report/report/${reportId}?${params.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  const handleSyncClick = () => {
    setShowSyncConfirmation(true);
  };

  const handleSyncConfirm = async () => {
    setShowSyncConfirmation(false);
    setRefreshing(true);
    setError(null);
    try {
      // First sync the meters
      await syncMetersForReport(reportId);

      // Then refresh the data
      const data = await fetchCollectionReportById(reportId);
      if (data === null) {
        setError('Report not found. Please use a valid report ID.');
        setReportData(null);
      } else if (!validateCollectionReportData(data)) {
        setError('Invalid report data received from server.');
        setReportData(null);
      } else {
        setReportData(data);
        // Check for SAS time issues after sync
        checkForSasTimeIssues(reportId);
      }
      const collectionsData =
        await fetchCollectionsByLocationReportId(reportId);
      setCollections(collectionsData);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error syncing meters:', error);
      }
      setError('Failed to sync meter data.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFixReportClick = () => {
    setShowFixReportConfirmation(true);
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
          `Fixed ${issuesFixed} issues in ${results.collectionsProcessed} collections`,
          {
            description: `SAS: ${
              results.issuesFixed.sasTimesFixed
            }, Movement: ${
              results.issuesFixed.movementCalculationsFixed
            }, Prev Meters: ${results.issuesFixed.prevMetersFixed}, History: ${
              results.issuesFixed.historyEntriesFixed +
              results.issuesFixed.machineHistoryFixed
            }`,
          }
        );

        // Refresh data
        const data = await fetchCollectionReportById(reportId);
        if (data === null) {
          setError('Report not found. Please use a valid report ID.');
          setReportData(null);
        } else if (!validateCollectionReportData(data)) {
          setError('Invalid report data received from server.');
          setReportData(null);
        } else {
          setReportData(data);
          // Check for issues after fix
          checkForSasTimeIssues(reportId);
        }
        const collectionsData =
          await fetchCollectionsByLocationReportId(reportId);
        setCollections(collectionsData);
      } else {
        toast.error(response.data.error || 'Failed to fix report');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fixing report:', error);
      }
      toast.error('Failed to fix report. Please try again.');
    } finally {
      setIsFixingReport(false);
    }
  };

  if (loading) {
    return <CollectionReportSkeleton />;
  }

  if (error) {
    return (
      <PageLayout
        headerProps={{
          containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
          disabled: loading,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NotFoundError
          title="Report Error"
          message={error}
          resourceType="report"
          showRetry={false}
          customBackText="Back to Collection Reports"
          customBackHref="/collection-reports"
        />
      </PageLayout>
    );
  }

  if (!reportData) {
    return (
      <PageLayout
        headerProps={{
          containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
          disabled: loading,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NotFoundError
          title="Report Not Found"
          message={`The collection report with ID "${reportId}" could not be found.`}
          resourceType="report"
          showRetry={false}
          customBackText="Back to Collection Reports"
          customBackHref="/collection-reports"
        />
      </PageLayout>
    );
  }

  const TabButton = ({
    label,
  }: {
    label: 'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare';
  }) => (
    <button
      onClick={() => !loading && handleTabChange(label)}
      disabled={loading}
      className={`w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-colors ${
        activeTab === label
          ? 'bg-buttonActive text-white'
          : 'text-gray-700 hover:bg-gray-100'
      } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {label}
    </button>
  );

  const MachineMetricsContent = ({ loading }: { loading: boolean }) => {
    if (loading) {
      return (
        <>
          <div className="lg:hidden">
            <CardSkeleton />
          </div>
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        </>
      );
    }
    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 text-4xl">🛠️</div>
          <p className="mb-2 text-lg font-semibold text-gray-600">
            No machine metrics available for this report.
          </p>
          <p className="text-sm text-gray-400">
            Try another report or check back later.
          </p>
        </div>
      );
    }
    return (
      <div>
        <div className="space-y-4 lg:hidden">
          <h2 className="my-4 text-center text-xl font-bold">
            Machine Metrics
          </h2>
          {metricsData.some(m => m.ramClear) && (
            <div className="rounded-md border-l-4 border-orange-500 bg-orange-100 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-orange-700">
                    {metricsData.filter(m => m.ramClear).length} machine(s) were
                    ram cleared
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar - Mobile */}
          <MachineSearchBar
            value={searchTerm}
            onChange={value => {
              setSearchTerm(value);
              setMachinePage(1);
            }}
            onClear={() => setMachinePage(1)}
            placeholder="Search machines by name or ID..."
            resultCount={filteredAndSortedData.length}
            totalCount={metricsData.length}
          />

          {paginatedMetricsData.map((metric: MachineMetric) => (
            <div
              key={metric.id}
              data-machine-id={metric.machineId}
              className={`overflow-hidden rounded-lg shadow-md transition-all ${
                metric.ramClear
                  ? 'border-l-4 border-orange-500 bg-orange-50 shadow-lg'
                  : 'bg-white'
              }`}
            >
              <div className="bg-lighterBlueHighlight p-3 text-white">
                <div className="flex items-center justify-between">
                  <h3
                    className="cursor-pointer font-semibold hover:underline"
                    onClick={() => {
                      if (metric.actualMachineId) {
                        const url = `/cabinets/${metric.actualMachineId}`;
                        if (process.env.NODE_ENV === 'development') {
                          console.warn('Navigating to:', url);
                        }
                        router.push(url);
                      } else {
                        if (process.env.NODE_ENV === 'development') {
                          console.warn(
                            'No actualMachineId found for machine:',
                            metric.machineId
                          );
                        }
                      }
                    }}
                  >
                    {metric.machineId}
                  </h3>
                  {metric.ramClear && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full border-2 border-orange-600 bg-orange-500 shadow-lg">
                            <Zap className="h-3 w-3 text-white" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold text-orange-600">
                            ⚡ Machine was ram cleared
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dropped / Cancelled</span>
                  <span className="font-medium text-gray-800">
                    {metric.dropCancelled || '0 / 0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Meters Gross</span>
                  <span className="font-medium text-gray-800">
                    {metric.metersGross?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SAS Gross</span>
                  <span className="font-medium text-gray-800">
                    {metric.sasGross?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variation</span>
                  <span className="font-medium text-gray-800">
                    {metric.variation !== undefined && metric.variation !== null
                      ? metric.variation.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SAS Times</span>
                  <div className="text-right font-medium text-gray-800">
                    <div>{formatSasTime(metric.sasStartTime || '')}</div>
                    <div>{formatSasTime(metric.sasEndTime || '')}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Mobile Pagination */}
          <div className="mt-6 flex items-center justify-center space-x-2 lg:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMachinePage(1)}
              disabled={machinePage === 1}
              className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
            >
              <DoubleArrowLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMachinePage(p => Math.max(1, p - 1))}
              disabled={machinePage === 1}
              className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-700">Page</span>
            <input
              type="number"
              min={1}
              max={machineTotalPages}
              value={machinePage}
              onChange={e => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > machineTotalPages) val = machineTotalPages;
                setMachinePage(val);
              }}
              className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
              aria-label="Page number"
            />
            <span className="text-sm text-gray-700">
              of {machineTotalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setMachinePage(p => Math.min(machineTotalPages, p + 1))
              }
              disabled={machinePage === machineTotalPages}
              className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMachinePage(machineTotalPages)}
              disabled={machinePage === machineTotalPages}
              className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
            >
              <DoubleArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="hidden lg:block">
          {metricsData.some(m => m.ramClear) && (
            <div className="mb-4 rounded-md border-l-4 border-orange-500 bg-orange-100 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-orange-700">
                    {metricsData.filter(m => m.ramClear).length} machine(s) were
                    ram cleared
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <MachineSearchBar
            value={searchTerm}
            onChange={value => {
              setSearchTerm(value);
              setMachinePage(1);
            }}
            onClear={() => setMachinePage(1)}
            placeholder="Search machines by name or ID..."
            resultCount={filteredAndSortedData.length}
            totalCount={metricsData.length}
          />

          <div className="overflow-x-auto rounded-lg bg-white pb-6 shadow-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-button hover:bg-button">
                  <TableHead
                    className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
                    onClick={() => handleSort('machineId')}
                  >
                    <div className="flex items-center gap-1">
                      MACHINE
                      {sortField === 'machineId' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
                    onClick={() => handleSort('dropCancelled')}
                  >
                    <div className="flex items-center gap-1">
                      DROP/CANCELLED
                      {sortField === 'dropCancelled' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
                    onClick={() => handleSort('metersGross')}
                  >
                    <div className="flex items-center gap-1">
                      METER GROSS
                      {sortField === 'metersGross' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
                    onClick={() => handleSort('sasGross')}
                  >
                    <div className="flex items-center gap-1">
                      SAS GROSS
                      {sortField === 'sasGross' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
                    onClick={() => handleSort('variation')}
                  >
                    <div className="flex items-center gap-1">
                      VARIATION
                      {sortField === 'variation' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-white">
                    SAS TIMES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMetricsData.map((metric: MachineMetric) => (
                  <TableRow
                    key={metric.id}
                    data-machine-id={metric.machineId}
                    className={`transition-all hover:bg-gray-50 ${
                      metric.ramClear
                        ? 'border-l-4 border-orange-500 bg-orange-50 shadow-sm'
                        : ''
                    }`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="cursor-pointer rounded bg-lighterBlueHighlight px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-lighterBlueHighlight/80"
                          onClick={() => {
                            if (process.env.NODE_ENV === 'development') {
                              console.warn('Machine click debug:', {
                                machineId: metric.machineId,
                                actualMachineId: metric.actualMachineId,
                                metric: metric,
                              });
                            }
                            if (metric.actualMachineId) {
                              const url = `/cabinets/${metric.actualMachineId}`;
                              if (process.env.NODE_ENV === 'development') {
                                console.warn('Navigating to:', url);
                              }
                              router.push(url);
                            } else {
                              if (process.env.NODE_ENV === 'development') {
                                console.warn(
                                  'No actualMachineId found for machine:',
                                  metric.machineId
                                );
                              }
                            }
                          }}
                        >
                          {metric.machineId}
                        </span>
                        {metric.ramClear && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full border-2 border-orange-600 bg-orange-500 shadow-lg">
                                  <Zap className="h-3 w-3 text-white" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold text-orange-600">
                                  ⚡ Machine was ram cleared
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{metric.dropCancelled || '0 / 0'}</TableCell>
                    <TableCell>
                      {metric.metersGross?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || '0.00'}
                    </TableCell>
                    <TableCell>
                      {metric.sasGross?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || '0.00'}
                    </TableCell>
                    <TableCell>
                      {metric.variation !== undefined &&
                      metric.variation !== null
                        ? metric.variation.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        const start = metric.sasStartTime
                          ? new Date(metric.sasStartTime)
                          : null;
                        const end = metric.sasEndTime
                          ? new Date(metric.sasEndTime)
                          : null;
                        const inverted = !!(start && end && start > end);
                        return (
                          <div
                            className={
                              inverted ? 'font-semibold text-red-600' : ''
                            }
                          >
                            <div>
                              {formatSasTime(metric.sasStartTime || '')}
                            </div>
                            <div>{formatSasTime(metric.sasEndTime || '')}</div>
                            {inverted && (
                              <div className="mt-1 text-[10px]">
                                Warning: Start is after End
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-6 flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMachinePage(1)}
                disabled={machinePage === 1}
                className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
              >
                <DoubleArrowLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMachinePage(p => Math.max(1, p - 1))}
                disabled={machinePage === 1}
                className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-700">Page</span>
              <input
                type="number"
                min={1}
                max={machineTotalPages}
                value={machinePage}
                onChange={e => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > machineTotalPages) val = machineTotalPages;
                  setMachinePage(val);
                }}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                aria-label="Page number"
              />
              <span className="text-sm text-gray-700">
                of {machineTotalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setMachinePage(p => Math.min(machineTotalPages, p + 1))
                }
                disabled={machinePage === machineTotalPages}
                className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMachinePage(machineTotalPages)}
                disabled={machinePage === machineTotalPages}
                className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
              >
                <DoubleArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LocationMetricsContent = ({ loading }: { loading: boolean }) => {
    if (loading) {
      return (
        <>
          <div className="lg:hidden">
            <CardSkeleton />
          </div>
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        </>
      );
    }

    return (
      <>
        {/* Mobile layout */}
        <div className="space-y-4 lg:hidden">
          <h2 className="my-4 text-center text-xl font-bold">
            Location Metrics
          </h2>
          <div className="overflow-hidden rounded-lg bg-white shadow-md">
            <div className="bg-button p-3 text-white">
              <h3 className="font-semibold">Location Total</h3>
            </div>
            <div className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Total Drop / Total Cancelled
                </span>
                <span className="font-medium text-gray-800">
                  {reportData?.locationMetrics?.droppedCancelled || '0 / 0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Meters Gross</span>
                <span
                  className={`font-medium ${getFinancialColorClass(
                    reportData?.locationMetrics?.metersGross
                  )}`}
                >
                  {reportData?.locationMetrics?.metersGross?.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  ) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total SAS Gross</span>
                <span
                  className={`font-medium ${getFinancialColorClass(
                    reportData?.locationMetrics?.sasGross
                  )}`}
                >
                  {reportData?.locationMetrics?.sasGross?.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  ) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Variation</span>
                <span
                  className={`font-medium ${getFinancialColorClass(
                    reportData?.locationMetrics?.variation
                  )}`}
                >
                  {reportData?.locationMetrics?.variation !== undefined &&
                  reportData?.locationMetrics?.variation !== null
                    ? reportData.locationMetrics.variation.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="overflow-hidden rounded-lg bg-white shadow-md">
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Variance</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.variance) || 0
                    )}`}
                  >
                    {reportData?.locationMetrics?.variance?.toLocaleString?.() ||
                      reportData?.locationMetrics?.variance ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variance Reason</span>
                  <span className="font-medium">
                    {reportData?.locationMetrics?.varianceReason || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount To Collect</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.amountToCollect) || 0
                    )}`}
                  >
                    {reportData?.locationMetrics?.amountToCollect?.toLocaleString?.() ||
                      reportData?.locationMetrics?.amountToCollect ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collected Amount</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.collectedAmount) || 0
                    )}`}
                  >
                    {reportData?.locationMetrics?.collectedAmount?.toLocaleString?.() ||
                      reportData?.locationMetrics?.collectedAmount ||
                      0}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow-md">
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Location Revenue</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.locationRevenue) || 0
                    )}`}
                  >
                    {reportData?.locationMetrics?.locationRevenue?.toLocaleString?.() ||
                      reportData?.locationMetrics?.locationRevenue ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Uncollected</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.amountUncollected) ||
                        0
                    )}`}
                  >
                    {reportData?.locationMetrics?.amountUncollected?.toLocaleString?.() ||
                      reportData?.locationMetrics?.amountUncollected ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Machines Number</span>
                  <span className="font-medium">
                    {reportData?.locationMetrics?.machinesNumber || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason For Shortage</span>
                  <span className="font-medium">
                    {reportData?.locationMetrics?.reasonForShortage || '-'}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow-md">
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.taxes) || 0
                    )}`}
                  >
                    {reportData?.locationMetrics?.taxes?.toLocaleString?.() ||
                      reportData?.locationMetrics?.taxes ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Advance</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.advance) || 0
                    )}`}
                  >
                    {reportData?.locationMetrics?.advance?.toLocaleString?.() ||
                      reportData?.locationMetrics?.advance ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Previous Balance Owed</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(
                        reportData?.locationMetrics?.previousBalanceOwed
                      ) || 0
                    )}`}
                  >
                    {reportData?.locationMetrics?.previousBalanceOwed?.toLocaleString?.() ||
                      reportData?.locationMetrics?.previousBalanceOwed ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Balance Owed</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.currentBalanceOwed) ||
                        0
                    )}`}
                  >
                    {reportData?.locationMetrics?.currentBalanceOwed?.toLocaleString?.() ||
                      reportData?.locationMetrics?.currentBalanceOwed ||
                      0}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow-md">
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance Correction</span>
                  <span
                    className={`font-medium ${getFinancialColorClass(
                      Number(reportData?.locationMetrics?.balanceCorrection) ||
                        0
                    )}`}
                  >
                    {reportData?.locationMetrics?.balanceCorrection?.toLocaleString?.() ||
                      reportData?.locationMetrics?.balanceCorrection ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Correction Reason</span>
                  <span className="font-medium">
                    {reportData?.locationMetrics?.correctionReason || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden rounded-lg bg-white shadow-md lg:block">
          {/* Top summary table */}
          <div className="rounded-t-lg bg-button px-4 py-2 font-semibold text-white">
            Location Total
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-3 font-medium text-gray-700">
                  Total Drop / Total Cancelled
                </td>
                <td className="p-3 text-right">
                  {reportData?.locationMetrics?.droppedCancelled || '0 / 0'}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-3 font-medium text-gray-700">
                  Total Meters Gross
                </td>
                <td
                  className={`p-3 text-right ${getFinancialColorClass(
                    reportData?.locationMetrics?.metersGross
                  )}`}
                >
                  {reportData?.locationMetrics?.metersGross?.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  ) || '0.00'}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-3 font-medium text-gray-700">
                  Total SAS Gross
                </td>
                <td
                  className={`p-3 text-right ${getFinancialColorClass(
                    reportData?.locationMetrics?.sasGross
                  )}`}
                >
                  {reportData?.locationMetrics?.sasGross?.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  ) || '0.00'}
                </td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-gray-700">
                  Total Variation
                </td>
                <td
                  className={`p-3 text-right ${getFinancialColorClass(
                    reportData?.locationMetrics?.variation
                  )}`}
                >
                  {reportData?.locationMetrics?.variation !== undefined &&
                  reportData?.locationMetrics?.variation !== null
                    ? reportData.locationMetrics.variation.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )
                    : '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Detail grids */}
          <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-4">
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Variance</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(reportData?.locationMetrics?.variance) || 0
                      )}`}
                    >
                      {reportData?.locationMetrics?.variance?.toLocaleString?.() ||
                        reportData?.locationMetrics?.variance ||
                        0}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Variance Reason</td>
                    <td className="p-3 text-right">
                      {reportData?.locationMetrics?.varianceReason || '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Amount To Collect</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(reportData?.locationMetrics?.amountToCollect) ||
                          0
                      )}`}
                    >
                      {reportData?.locationMetrics?.amountToCollect?.toLocaleString?.() ||
                        reportData?.locationMetrics?.amountToCollect ||
                        0}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Collected Amount</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(reportData?.locationMetrics?.collectedAmount) ||
                          0
                      )}`}
                    >
                      {reportData?.locationMetrics?.collectedAmount?.toLocaleString?.() ||
                        reportData?.locationMetrics?.collectedAmount ||
                        0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Location Revenue</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(reportData?.locationMetrics?.locationRevenue) ||
                          0
                      )}`}
                    >
                      {reportData?.locationMetrics?.locationRevenue?.toLocaleString?.() ||
                        reportData?.locationMetrics?.locationRevenue ||
                        0}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Amount Uncollected</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(
                          reportData?.locationMetrics?.amountUncollected
                        ) || 0
                      )}`}
                    >
                      {reportData?.locationMetrics?.amountUncollected?.toLocaleString?.() ||
                        reportData?.locationMetrics?.amountUncollected ||
                        0}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Machines Number</td>
                    <td className="p-3 text-right">
                      {reportData?.locationMetrics?.machinesNumber || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Reason For Shortage</td>
                    <td className="p-3 text-right">
                      {reportData?.locationMetrics?.reasonForShortage || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Taxes</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(reportData?.locationMetrics?.taxes) || 0
                      )}`}
                    >
                      {reportData?.locationMetrics?.taxes?.toLocaleString?.() ||
                        reportData?.locationMetrics?.taxes ||
                        0}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Advance</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(reportData?.locationMetrics?.advance) || 0
                      )}`}
                    >
                      {reportData?.locationMetrics?.advance?.toLocaleString?.() ||
                        reportData?.locationMetrics?.advance ||
                        0}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Previous Balance Owed</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(
                          reportData?.locationMetrics?.previousBalanceOwed
                        ) || 0
                      )}`}
                    >
                      {reportData?.locationMetrics?.previousBalanceOwed?.toLocaleString?.() ||
                        reportData?.locationMetrics?.previousBalanceOwed ||
                        0}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Current Balance Owed</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(
                          reportData?.locationMetrics?.currentBalanceOwed
                        ) || 0
                      )}`}
                    >
                      {reportData?.locationMetrics?.currentBalanceOwed?.toLocaleString?.() ||
                        reportData?.locationMetrics?.currentBalanceOwed ||
                        0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">Balance Correction</td>
                    <td
                      className={`p-3 text-right ${getFinancialColorClass(
                        Number(
                          reportData?.locationMetrics?.balanceCorrection
                        ) || 0
                      )}`}
                    >
                      {reportData?.locationMetrics?.balanceCorrection?.toLocaleString?.() ||
                        reportData?.locationMetrics?.balanceCorrection ||
                        0}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Correction Reason</td>
                    <td className="p-3 text-right">
                      {reportData?.locationMetrics?.correctionReason || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  const SASMetricsCompareContent = ({ loading }: { loading: boolean }) => {
    if (loading) {
      return (
        <>
          <div className="lg:hidden">
            <CardSkeleton />
          </div>
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        </>
      );
    }

    // Use the sasMetrics from reportData if available, otherwise calculate from collections
    const sasMetrics = reportData?.sasMetrics || {
      dropped: 0,
      cancelled: 0,
      gross: 0,
    };
    const { totalSasDrop, totalSasCancelled, totalSasGross } =
      reportData?.sasMetrics
        ? {
            totalSasDrop: sasMetrics.dropped,
            totalSasCancelled: sasMetrics.cancelled,
            totalSasGross: sasMetrics.gross,
          }
        : calculateSasMetricsTotals(collections);

    return (
      <>
        <div className="space-y-4 lg:hidden">
          <h2 className="my-4 text-center text-xl font-bold">
            SAS Metrics Compare
          </h2>
          <div className="overflow-hidden rounded-lg bg-white shadow-md">
            <div className="bg-lighterBlueHighlight p-3 text-white">
              <h3 className="font-semibold">SAS Totals</h3>
            </div>
            <div className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Drop Total</span>
                <span
                  className={`font-medium ${getFinancialColorClass(
                    totalSasDrop
                  )}`}
                >
                  {totalSasDrop.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Cancelled Total</span>
                <span
                  className={`font-medium ${getFinancialColorClass(
                    totalSasCancelled
                  )}`}
                >
                  {totalSasCancelled.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Gross Total</span>
                <span
                  className={`font-medium ${getFinancialColorClass(
                    totalSasGross
                  )}`}
                >
                  {totalSasGross.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden overflow-x-auto rounded-lg bg-white shadow-md lg:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-button hover:bg-button">
                <TableHead className="font-semibold text-white">
                  METRIC
                </TableHead>
                <TableHead className="font-semibold text-white">
                  VALUE
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-gray-50">
                <TableCell className="font-medium">SAS Drop Total</TableCell>
                <TableCell className={getFinancialColorClass(totalSasDrop)}>
                  {totalSasDrop.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  SAS Cancelled Total
                </TableCell>
                <TableCell
                  className={getFinancialColorClass(totalSasCancelled)}
                >
                  {totalSasCancelled.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-gray-50">
                <TableCell className="font-medium">SAS Gross Total</TableCell>
                <TableCell className={getFinancialColorClass(totalSasGross)}>
                  {totalSasGross.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  const renderDesktopTabContent = () => {
    switch (activeTab) {
      case 'Machine Metrics':
        return <MachineMetricsContent loading={false} />;
      case 'Location Metrics':
        return <LocationMetricsContent loading={false} />;
      case 'SAS Metrics Compare':
        return <SASMetricsCompareContent loading={false} />;
      default:
        return <MachineMetricsContent loading={false} />;
    }
  };

  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  if (showNoLicenseeMessage) {
    return (
      <PageLayout
        headerProps={{
          containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
          disabled: false,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      headerProps={{
        containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
        disabled: loading || refreshing,
      }}
      pageTitle=""
      hideOptions={true}
      hideLicenceeFilter={true}
      mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
      showToaster={false}
    >
      {/* Header Section: Back button, title, and sync button */}
      <div className="hidden px-2 pt-6 lg:block lg:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/collection-report">
              <Button
                variant="ghost"
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-100"
              >
                <ArrowLeft size={18} className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Collection Report Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <SyncButton
              onClick={handleSyncClick}
              isSyncing={refreshing}
              label="Sync Meters"
              disabled={loading || refreshing || isFixingReport}
            />
            {(hasSasTimeIssues || hasCollectionHistoryIssues) && (
              <Button
                onClick={handleFixReportClick}
                disabled={loading || refreshing || isFixingReport}
                variant="outline"
                className="flex items-center gap-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
              >
                {isFixingReport ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fixing Report...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Fix Report
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Report Header Section: Location name, report ID, and financial summary */}
      <div className="px-2 pb-6 pt-2 lg:px-6 lg:pt-4">
        <div className="rounded-lg bg-white py-4 shadow lg:border-t-4 lg:border-lighterBlueHighlight lg:bg-container lg:py-8">
          <div className="px-4 py-2 text-center lg:py-4">
            <div className="mb-2 text-xs text-gray-500 lg:hidden">
              COLLECTION REPORT
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-800 lg:text-4xl">
              {reportData.locationName}
            </h1>
            <p className="mb-4 text-sm text-gray-600 lg:text-base">
              Report ID: {reportData.reportId}
            </p>
            {(() => {
              const locationTotal = calculateLocationTotal(collections);
              const textColorClass =
                locationTotal < 0 ? 'text-red-600' : 'text-green-600';
              return (
                <p className={`text-lg font-semibold`}>
                  Location Total:{' '}
                  <span className={textColorClass}>
                    {formatCurrency(locationTotal)}
                  </span>
                </p>
              );
            })()}
            <div className="mt-4 space-y-2 lg:hidden">
              <SyncButton
                onClick={handleSyncClick}
                isSyncing={refreshing}
                label="Sync Meters"
                disabled={loading || refreshing || isFixingReport}
                className="w-full justify-center"
              />
              {(hasSasTimeIssues || hasCollectionHistoryIssues) && (
                <Button
                  onClick={handleFixReportClick}
                  disabled={loading || refreshing || isFixingReport}
                  variant="outline"
                  className="flex w-full items-center justify-center gap-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                >
                  {isFixingReport ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Fixing Report...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Fix Report
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner for SAS Time Issues - Developer Only */}
      {user?.roles?.includes('developer') && (hasSasTimeIssues || hasCollectionHistoryIssues) && (
        <div className="mx-2 mb-6 lg:mx-6">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  {hasSasTimeIssues && hasCollectionHistoryIssues
                    ? 'Multiple Issues Detected'
                    : hasSasTimeIssues
                      ? 'SAS Time Issues Detected'
                      : 'Collection History Issues Detected'}
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    {hasSasTimeIssues && hasCollectionHistoryIssues
                      ? 'This report has multiple types of data inconsistencies:'
                      : hasSasTimeIssues
                        ? 'This report has SAS time inconsistencies:'
                        : 'This report has collection history inconsistencies:'}
                  </p>
                  <div className="mt-2 space-y-1">
                    {/* Show SAS Time Issues */}
                    {hasSasTimeIssues && sasTimeIssues.length > 0 && (
                      <div>
                        <p className="font-semibold text-yellow-800">
                          SAS Time Issues:
                        </p>
                        {sasTimeIssues
                          .reduce(
                            (acc, issue) => {
                              const existing = acc.find(
                                item => item.machineName === issue.machineName
                              );
                              if (existing) {
                                existing.issues.push(issue);
                              } else {
                                acc.push({
                                  machineName: issue.machineName,
                                  issues: [issue],
                                });
                              }
                              return acc;
                            },
                            [] as {
                              machineName: string;
                              issues: CollectionIssue[];
                            }[]
                          )
                          .map((machine, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <button
                                onClick={() =>
                                  handleIssueClick(machine.issues[0])
                                }
                                className="cursor-pointer text-blue-600 underline hover:text-blue-800"
                              >
                                {machine.machineName} ({machine.issues.length}{' '}
                                issue
                                {machine.issues.length > 1 ? 's' : ''})
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Show Collection History Issues */}
                    {hasCollectionHistoryIssues && (
                      <div className="mt-3">
                        <p className="font-semibold text-yellow-800">
                          Collection History Issues:
                        </p>
                        {collectionHistoryMachines.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {collectionHistoryMachines.map(
                              (machineName, index) => (
                                <p
                                  key={index}
                                  className="text-sm text-yellow-700"
                                >
                                  •{' '}
                                  <span className="font-medium">
                                    {machineName}
                                  </span>{' '}
                                  has orphaned or duplicate history entries
                                </p>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-yellow-700">
                            • Some machines in this report have collection
                            history inconsistencies
                          </p>
                        )}
                        <p className="mt-2 text-xs italic text-yellow-600">
                          Use the &quot;Fix Report&quot; button below to
                          automatically correct these issues.
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2">
                    {hasSasTimeIssues && sasTimeIssues.length > 0
                      ? 'Click on any machine name above to navigate to it, or use the "Fix Report" button to automatically correct all issues.'
                      : 'Use the "Fix Report" button below to automatically correct all issues.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Content Section: Sidebar navigation and main content */}
      <div className="hidden px-2 pb-6 lg:flex lg:flex-row lg:space-x-6 lg:px-6">
        <div className="mb-6 lg:mb-0 lg:w-1/4">
          <div className="space-y-2 rounded-lg bg-white p-3 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Report Sections
            </h3>
            <div className="space-y-2">
              <TabButton label="Machine Metrics" />
              <TabButton label="Location Metrics" />
              <TabButton label="SAS Metrics Compare" />
            </div>
          </div>
        </div>
        <div className="lg:w-3/4" ref={tabContentRef}>
          {renderDesktopTabContent()}
        </div>
      </div>
      {/* Mobile Content Section: Select navigation for mobile devices */}
      <div className="px-2 pb-6 lg:hidden lg:px-6">
        {/* Mobile Navigation Select */}
        <div className="mb-6">
          <select
            value={activeTab}
            onChange={e => handleTabChange(e.target.value as typeof activeTab)}
            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            disabled={loading || refreshing}
          >
            <option value="Machine Metrics">Machine Metrics</option>
            <option value="Location Metrics">Location Metrics</option>
            <option value="SAS Metrics Compare">SAS Metrics Compare</option>
          </select>
        </div>

        {/* Mobile Content - Show only active tab */}
        <div className="space-y-4">
          {activeTab === 'Machine Metrics' && (
            <MachineMetricsContent loading={false} />
          )}
          {activeTab === 'Location Metrics' && (
            <LocationMetricsContent loading={false} />
          )}
          {activeTab === 'SAS Metrics Compare' && (
            <SASMetricsCompareContent loading={false} />
          )}
        </div>
      </div>

      {/* Floating Refresh Button Section: Animated refresh button for scroll */}
      <AnimatePresence>
        {showFloatingRefresh && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <motion.button
              onClick={handleSyncClick}
              disabled={refreshing}
              className="rounded-full bg-button p-3 text-container shadow-lg transition-colors duration-200 hover:bg-buttonActive disabled:cursor-not-allowed disabled:opacity-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RefreshCw
                className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Meters Confirmation Modal */}
      <Dialog
        open={showSyncConfirmation}
        onOpenChange={setShowSyncConfirmation}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sync Meters</DialogTitle>
            <DialogDescription>
              <div>
                This will synchronize the meter readings for all machines in
                this collection report. This process will:
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Update meter readings from the gaming machines</li>
                  <li>• Recalculate SAS metrics and financial totals</li>
                  <li>• Refresh the report data with the latest information</li>
                </ul>
                <p className="mt-3 text-sm font-medium text-gray-800">
                  This action cannot be undone. Continue?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowSyncConfirmation(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSyncConfirm}
              disabled={refreshing}
              className="w-full bg-buttonActive hover:bg-buttonActive/90 sm:w-auto"
            >
              {refreshing ? 'Syncing...' : 'Sync Meters'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Report Confirmation Modal */}
      <Dialog
        open={showFixReportConfirmation}
        onOpenChange={setShowFixReportConfirmation}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fix Report Issues</DialogTitle>
            <DialogDescription>
              <div>
                This unified fix will automatically detect and resolve ALL
                issues in this report:
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
                  <li>Fix SAS time issues (inverted, missing, incorrect)</li>
                  <li>Recalculate movement values</li>
                  <li>Fix prevIn/prevOut meter mismatches</li>
                  <li>Rebuild collection history entries</li>
                  <li>Sync machine history with collections</li>
                  <li>Update machine meters and timestamps</li>
                </ul>
                <p className="mt-3 text-sm font-medium text-gray-800">
                  This comprehensive fix addresses all meter tracking issues
                  automatically.
                </p>
                <p className="mt-4 font-semibold text-destructive">
                  This action cannot be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowFixReportConfirmation(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFixReportConfirm}
              variant="destructive"
              disabled={isFixingReport}
              className="w-full sm:w-auto"
            >
              {isFixingReport ? 'Fixing Report...' : 'Fix Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collection Issue Detail Modal */}
      {selectedIssue && (
        <CollectionIssueModal
          isOpen={showCollectionIssueModal}
          onClose={() => {
            setShowCollectionIssueModal(false);
            setSelectedIssue(null);
          }}
          issue={selectedIssue}
        />
      )}
    </PageLayout>
  );
}

export default function CollectionReportPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <CollectionReportPageContent />
    </ProtectedRoute>
  );
}
