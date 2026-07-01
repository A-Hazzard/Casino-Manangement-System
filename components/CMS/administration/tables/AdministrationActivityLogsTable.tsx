/**
 * Activity Logs Table Component
 * Comprehensive table component for displaying and managing activity logs.
 *
 * Features:
 * - Activity log display (table on desktop, cards on mobile)
 * - Search functionality with multiple modes (username, email, description, ID)
 * - Date range filtering
 * - Pagination with batch loading
 * - Sorting capabilities
 * - Copy to clipboard functionality
 * - Activity log card integration
 * - Activity log description dialog
 * - Loading states and skeletons
 * - Responsive design
 *
 * @param props - Component props
 */
'use client';

import type { ActivityLog } from '@/shared/types/activityLog';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import type { TimePeriod } from '@/shared/types/common';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useUserStore } from '@/lib/store/userStore';
import { safeFormatDate } from '@/lib/utils/formatting';
import { Checkbox } from '@/components/shared/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { exportActivityLogs } from '@/lib/helpers/administration/activityLogExport';
import {
  Activity,
  ArrowUpDown,
  Check,
  Copy,
  Download,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import AdministrationActivityLogCard from '../cards/AdministrationActivityLogCard';
import AdministrationActivityLogDescriptionDialog from '../modals/AdministrationActivityLogDescriptionDialog';
import AdministrationBulkDeleteActivityLogsModal from '../modals/AdministrationBulkDeleteActivityLogsModal';
import AdministrationDeleteActivityLogModal from '../modals/AdministrationDeleteActivityLogModal';
import AdministrationClearActivityLogsModal from '../modals/AdministrationClearActivityLogsModal';
import { AdministrationActivityLogsFilterBar } from '../AdministrationActivityLogsFilterBar';
import AdministrationActivityLogCardSkeleton from '../skeletons/AdministrationActivityLogCardSkeleton';
import AdministrationActivityLogTableSkeleton from '../skeletons/AdministrationActivityLogTableSkeleton';

type AdministrationActivityLogsTableProps = {
  className?: string;
};

function AdministrationActivityLogsTable({
  className,
}: AdministrationActivityLogsTableProps) {
  // ============================================================================
  // State & Refs
  // ============================================================================
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const itemsPerPage = 20;
  const itemsPerBatch = 40;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 2
  const [serverTotalCount, setServerTotalCount] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<
    'username' | 'email' | 'description' | '_id'
  >('username');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [isJumping, setIsJumping] = useState(false);

  // Track requested batches for arbitrary page jumps
  const requestedBatchRef = useRef<Set<number>>(new Set());
  const prevPageRef = useRef(currentPage);

  // Sort states
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog states
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Delete states
  const { user: currentUser } = useUserStore();
  const userRoles = currentUser?.roles?.map(r => r?.toLowerCase()) || [];
  const isDeveloper = userRoles.includes('developer');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  // ObjectID resolution state (developer-only)
  const [resolveProgress, setResolveProgress] = useState<{
    updated: number;
    total: number;
    remaining: number;
  } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [logToDelete, setLogToDelete] = useState<ActivityLog | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Copy to clipboard function
  const copyToClipboard = async (
    text: string,
    label: string,
    fieldId: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  // Extract attempted identifier from description for failed logins
  const getDisplayUsername = (log: ActivityLog) => {
    // If username is "unknown" and description contains an identifier, extract it
    if (log.username === 'unknown' && log.description) {
      // Try to extract email/username from description like "Invalid password for: email@example.com"
      const emailMatch = log.description.match(
        /(?:for|:)\s*([^\s:]+@[^\s:]+)/i
      );
      if (emailMatch) return emailMatch[1];

      const userMatch = log.description.match(/(?:for|:)\s*([^\s:]+)/i);
      if (userMatch) return userMatch[1];
    }
    return log.username || 'Unknown User';
  };

  // Get display email (prefer actor.email, fallback to username if it's an email)
  const getDisplayEmail = (log: ActivityLog) => {
    if (log.actor?.email && log.actor.email !== 'unknown') {
      return log.actor.email;
    }
    // If username looks like an email, use it
    const username = log.username || '';
    if (/\S+@\S+\.\S+/.test(username)) {
      return username;
    }
    return null;
  };

  // Calculate which batch corresponds to the current page
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // Debounce search term
  useEffect(() => {
    // Immediate feedback: show loading while debouncing
    if (searchTerm && searchTerm.trim() !== debouncedSearchTerm) {
      setLoading(true);
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  // Fetch activity logs - initial batch and when filters change
  const fetchInitialBatch = useCallback(async () => {
    setLoading(true);
    setAllLogs([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    setSelectedIds(new Set());

    try {
      const params = new URLSearchParams({
        page: '1',
        limit: String(itemsPerBatch),
        sortBy,
        sortOrder,
      });

      if (debouncedSearchTerm) {
        if (searchMode === 'username') {
          params.append('username', debouncedSearchTerm);
        } else if (searchMode === 'email') {
          params.append('email', debouncedSearchTerm);
        } else if (searchMode === '_id') {
          params.append('resourceId', debouncedSearchTerm);
        } else {
          params.append('search', debouncedSearchTerm);
        }
      }
      if (actionFilter && actionFilter !== 'all')
        params.append('action', actionFilter);
      if (resourceFilter && resourceFilter !== 'all')
        params.append('resource', resourceFilter);
      if (timePeriod && timePeriod !== 'All Time') {
        params.append('timePeriod', timePeriod);
      }
      if (dateRange) {
        params.append('startDate', dateRange.from.toISOString());
        params.append('endDate', dateRange.to.toISOString());
      }

      const url = `/api/activity-logs?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const logs = data.data.activities || data.data.logs || [];
        setAllLogs(logs);
        setLoadedBatches(new Set([1]));

        if (data.data.pagination) {
          setServerTotalCount(data.data.pagination.totalCount || 0);
          setServerTotalPages(data.data.pagination.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchTerm,
    searchMode,
    actionFilter,
    resourceFilter,
    timePeriod,
    dateRange,
    sortBy,
    sortOrder,
    itemsPerBatch,
  ]);

  // Calculate total pages based on server data
  const totalPages = useMemo(() => {
    return serverTotalPages > 0 ? serverTotalPages : 1;
  }, [serverTotalPages]);

  // Fetch batches on page change — handles sequential nav and arbitrary jumps
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const prevPage = prevPageRef.current;
    prevPageRef.current = currentPage;

    // Detect arbitrary jump (skip-forward or skip-back, not sequential +1/-1)
    const isSequentialNav =
      Math.abs(currentPage - prevPage) === 1 ||
      currentPage === 0 ||
      currentPage === totalPages - 1;

    // Build params helper
    const buildParamsForBatch = (batch: number) => {
      const params = new URLSearchParams({
        page: String(batch),
        limit: String(itemsPerBatch),
        sortBy,
        sortOrder,
      });

      if (debouncedSearchTerm) {
        if (searchMode === 'username') {
          params.append('username', debouncedSearchTerm);
        } else if (searchMode === 'email') {
          params.append('email', debouncedSearchTerm);
        } else if (searchMode === '_id') {
          params.append('resourceId', debouncedSearchTerm);
        } else {
          params.append('search', debouncedSearchTerm);
        }
      }
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (resourceFilter && resourceFilter !== 'all') params.append('resource', resourceFilter);
      if (timePeriod && timePeriod !== 'All Time') params.append('timePeriod', timePeriod);
      if (dateRange) {
        params.append('startDate', dateRange.from.toISOString());
        params.append('endDate', dateRange.to.toISOString());
      }
      return params;
    };

    // Fetch a specific batch and merge into allLogs
    const fetchBatch = async (batch: number) => {
      if (requestedBatchRef.current.has(batch)) return;
      requestedBatchRef.current.add(batch);

      if (!isSequentialNav) {
        setIsJumping(true);
      }

      setLoadedBatches(prev => new Set([...prev, batch]));
      const params = buildParamsForBatch(batch);
      try {
        const res = await fetch(`/api/activity-logs?${params}`);
        const data = await res.json();
        if (data.success) {
          const logs = data.data.activities || data.data.logs || [];
          setAllLogs(prev => {
            const existingIds = new Set(prev.map((item: ActivityLog) => item._id));
            const newItems = logs.filter((item: ActivityLog) => !existingIds.has(item._id));
            return [...prev, ...newItems];
          });
        }
      } catch (error) {
        console.error('Error fetching batch:', error);
      } finally {
        setIsJumping(false);
      }
    };

    // Ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      fetchBatch(currentBatch);
    }

    // For arbitrary jumps, also ensure the batch containing the target page is loaded
    if (!isSequentialNav && !loadedBatches.has(currentBatch)) {
      // fetchBatch already called above, no need to duplicate
    }

    // Sequential next-batch prefetch (same as before for smooth scrolling)
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      fetchBatch(nextBatch);
    }
  }, [
    currentPage,
    loading,
    loadedBatches,
    debouncedSearchTerm,
    searchMode,
    actionFilter,
    resourceFilter,
    timePeriod,
    dateRange,
    sortBy,
    sortOrder,
    itemsPerBatch,
    pagesPerBatch,
    totalPages,
    calculateBatchNumber,
  ]);

  // Get items for current page from the current batch
  const logs = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return allLogs.slice(startIndex, endIndex);
  }, [allLogs, currentPage, itemsPerPage, pagesPerBatch]);

  const pageIds = useMemo(
    () =>
      logs
        .map(log => log._id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    [logs]
  );

  const selectedCount = selectedIds.size;

  const allPageSelected =
    pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

  const selectedLogs = useMemo(
    () =>
      allLogs.filter(
        log => typeof log._id === 'string' && selectedIds.has(log._id)
      ),
    [allLogs, selectedIds]
  );

  const emptyStateColSpan = isDeveloper ? 8 : 7;

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllPageSelection = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const everySelected =
        pageIds.length > 0 && pageIds.every(id => next.has(id));
      if (everySelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [pageIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExportSelected = useCallback(
    (format: 'csv' | 'json') => {
      if (selectedLogs.length === 0) return;
      exportActivityLogs(selectedLogs, format, 'activity-logs-selected');
      toast.success(
        `Exported ${selectedLogs.length} activity log${selectedLogs.length !== 1 ? 's' : ''} as ${format.toUpperCase()}`
      );
    },
    [selectedLogs]
  );

  const handleCopySelectedIds = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      await navigator.clipboard.writeText(Array.from(selectedIds).join('\n'));
      toast.success(
        `Copied ${selectedIds.size} log ID${selectedIds.size !== 1 ? 's' : ''} to clipboard`
      );
    } catch {
      toast.error('Failed to copy log IDs');
    }
  }, [selectedIds]);

  const handleBulkDelete = useCallback(
    async (deleteType: 'soft' | 'hard') => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setIsBulkDeleting(true);
      try {
        const response = await fetch('/api/activity-logs/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, deleteType }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success(
            `${data.data.deletedCount} activity log${data.data.deletedCount !== 1 ? 's' : ''} ${deleteType === 'hard' ? 'permanently removed' : 'marked as deleted'}`
          );
          setIsBulkDeleteModalOpen(false);
          clearSelection();
          fetchInitialBatch();
        } else {
          toast.error(data.message || 'Failed to delete selected activity logs');
        }
      } catch (error) {
        console.error('[handleBulkDelete] Error:', error instanceof Error ? error.message : 'Unknown error');
        toast.error('An error occurred while deleting selected logs');
      } finally {
        setIsBulkDeleting(false);
      }
    },
    [selectedIds, clearSelection, fetchInitialBatch]
  );

  // Fetch initial batch when filters change
  useEffect(() => {
    fetchInitialBatch();
  }, [fetchInitialBatch]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Get action badge styling with enhanced colors and icons
  const getActionBadgeStyle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 font-semibold';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-semibold';
      case 'archive':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-semibold';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 font-semibold';
      case 'view':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 font-semibold';
      case 'login':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 font-semibold';
      case 'logout':
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-semibold';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-semibold';
    }
  };

  // Get resource badge styling with enhanced colors
  const getResourceBadgeStyle = (resource: string) => {
    switch (resource.toLowerCase()) {
      case 'user':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 font-medium';
      case 'machine':
      case 'cabinet':
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 font-medium';
      case 'location':
        return 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 font-medium';
      case 'collection':
      case 'collection-report':
      case 'collection_report':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 font-medium';
      case 'member':
        return 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200 font-medium';
      case 'licencee':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200 font-medium';
      case 'session':
        return 'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200 font-medium';
      case 'vault':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 font-medium';
      case 'cashier_shift':
        return 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200 font-medium';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-medium';
    }
  };

  // Handle description click
  const handleDescriptionClick = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsDescriptionDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDescriptionDialogOpen(false);
    setSelectedLog(null);
  };

  // Listen for refresh event from parent component
  useEffect(() => {
    const handleRefreshEvent = () => {
      fetchInitialBatch();
      toast.success('Activity logs refreshed');
    };

    window.addEventListener('refreshActivityLogs', handleRefreshEvent);
    return () => {
      window.removeEventListener('refreshActivityLogs', handleRefreshEvent);
    };
  }, [fetchInitialBatch]);

  // Developer-only: poll to resolve ObjectID resourceNames every 5 seconds
  useEffect(() => {
    if (!isDeveloper) return;

    const runResolve = async () => {
      if (isResolving) return;
      setIsResolving(true);
      try {
        const res = await fetch('/api/admin/resolve-machine-names?limit=100');
        const data = await res.json();
        if (data.success) {
          setResolveProgress({
            updated: data.updated,
            total: data.total,
            remaining: data.remaining,
          });
          // If any logs were updated, refresh the table
          if (data.updated > 0) {
            fetchInitialBatch();
          }
        }
      } catch {
        // Silently ignore resolution errors
      } finally {
        setIsResolving(false);
      }
    };

    // Run immediately on mount
    runResolve();

    // Then poll every 5 seconds while there are remaining logs
    const interval = setInterval(() => {
      if (resolveProgress === null || resolveProgress.remaining > 0) {
        runResolve();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isDeveloper, fetchInitialBatch]);

  // Handle delete action
  const handleDeleteClick = (log: ActivityLog) => {
    setLogToDelete(log);
    setIsDeleteModalOpen(true);
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className={className}>
      {/* Developer-only: ObjectID resolution progress banner */}
      {isDeveloper && resolveProgress !== null && resolveProgress.total > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-800">
          <span className="font-semibold text-violet-600">[DEV]</span>
          {resolveProgress.remaining > 0 ? (
            <>
              <span className="flex-1">
                Resolving machine names:{' '}
                <strong>{resolveProgress.updated}</strong> updated this pass,{' '}
                <strong>{resolveProgress.remaining}</strong> remaining…
              </span>
              <button
                type="button"
                onClick={() => {
                  const runResolve = async () => {
                    if (isResolving) return;
                    setIsResolving(true);
                    try {
                      const res = await fetch(
                        '/api/admin/resolve-machine-names?limit=100'
                      );
                      const data = await res.json();
                      if (data.success) {
                        setResolveProgress({
                          updated: data.updated,
                          total: data.total,
                          remaining: data.remaining,
                        });
                        if (data.updated > 0) {
                          fetchInitialBatch();
                        }
                      }
                    } catch {
                      // Silently ignore
                    } finally {
                      setIsResolving(false);
                    }
                  };
                  runResolve();
                }}
                disabled={isResolving}
                className="flex-shrink-0 rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {isResolving ? 'Resolving…' : 'Resolve Now'}
              </button>
            </>
          ) : (
            <span>
              Machine name resolution complete —{' '}
              <strong>{resolveProgress.total}</strong> names resolved.
            </span>
          )}
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs ({allLogs.length.toLocaleString()})
          </CardTitle>
          {isDeveloper && (
            <Button
              onClick={() => setIsClearLogsModalOpen(true)}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2 self-start bg-red-600 font-semibold text-white hover:bg-red-700 sm:self-auto"
            >
              <Trash2 className="h-4 w-4" />
              Clear Activity Logs
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <AdministrationActivityLogsFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            searchDropdownOpen={searchDropdownOpen}
            onSearchDropdownToggle={() => setSearchDropdownOpen(prev => !prev)}
            actionFilter={actionFilter}
            onActionFilterChange={setActionFilter}
            resourceFilter={resourceFilter}
            onResourceFilterChange={setResourceFilter}
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
            onDateRangeChange={setDateRange}
            onClearFilters={() => {
              setSearchTerm('');
              setSearchMode('username');
              setActionFilter('all');
              setResourceFilter('all');
              setTimePeriod('All Time');
              setDateRange(undefined);
            }}
            hasActiveFilters={!!(searchTerm || actionFilter !== 'all' || resourceFilter !== 'all' || timePeriod !== 'All Time' || dateRange)}
            disabled={loading}
          />

          {selectedCount > 0 && (
            <div className="mb-3 mt-4 flex flex-wrap items-center gap-2 rounded-md border border-buttonActive/30 bg-buttonActive/5 px-3 py-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedCount} selected
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm text-white hover:bg-emerald-700">
                    <Download className="h-4 w-4" /> Export Selected
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-1" align="start" side="bottom">
                  <button
                    type="button"
                    onClick={() => handleExportSelected('csv')}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSelected('json')}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    JSON
                  </button>
                </PopoverContent>
              </Popover>
              <Button
                onClick={handleCopySelectedIds}
                variant="outline"
                className="h-8 rounded-md px-3 text-sm"
              >
                <Copy className="mr-1.5 h-4 w-4" />
                Copy IDs
              </Button>
              {isDeveloper && (
                <Button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  disabled={isBulkDeleting}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm text-white hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4" /> Delete Selected
                </Button>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="ml-1 text-sm text-gray-500 hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden rounded-lg border lg:block">
            {loading ? (
              <AdministrationActivityLogTableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={toggleAllPageSelection}
                          aria-label="Select all activity logs on this page"
                        />
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('timestamp')}
                          className="h-auto p-0 font-semibold"
                        >
                          Timestamp
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead centered>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('username')}
                          className="h-auto p-0 font-semibold"
                        >
                          User
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead centered>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('action')}
                          className="h-auto p-0 font-semibold"
                        >
                          Action
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead centered>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('resource')}
                          className="h-auto p-0 font-semibold"
                        >
                          Resource
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-0 max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                        Description
                      </TableHead>
                      <TableHead centered>IP Address</TableHead>
                      {isDeveloper && <TableHead centered>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs && logs.length > 0 ? (
                      logs.map((log: ActivityLog) => {
                        const logId = log._id ?? '';
                        const isRowSelected =
                          logId.length > 0 && selectedIds.has(logId);
                        return (
                        <TableRow
                          key={log._id}
                          className={
                            isRowSelected
                              ? 'border-l-4 border-l-buttonActive bg-buttonActive/5'
                              : undefined
                          }
                        >
                          <TableCell>
                            {logId ? (
                              <Checkbox
                                checked={isRowSelected}
                                onCheckedChange={() => toggleRowSelection(logId)}
                                aria-label={`Select activity log ${logId}`}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {safeFormatDate(log.timestamp)}
                          </TableCell>
                          <TableCell centered>
                            <div className="space-y-1">
                              {/* Username */}
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      getDisplayUsername(log),
                                      'Username',
                                      `username-${log._id}`
                                    )
                                  }
                                  className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                                  title="Click to copy username"
                                >
                                  {getDisplayUsername(log)}
                                  {copiedField === `username-${log._id}` ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              </div>

                              {/* User ID */}
                              {log.userId && log.userId !== 'unknown' && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        log.userId!,
                                        'User ID',
                                        `userId-${log._id}`
                                      )
                                    }
                                    className="flex items-center gap-1 font-mono text-xs text-gray-700 hover:text-blue-600 hover:underline"
                                    title="Click to copy user ID"
                                  >
                                    {log.userId}
                                    {copiedField === `userId-${log._id}` ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3 opacity-50" />
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* Email (only show if different from username) */}
                              {getDisplayEmail(log) &&
                                getDisplayEmail(log) !==
                                  getDisplayUsername(log) && (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          getDisplayEmail(log)!,
                                          'Email',
                                          `email-${log._id}`
                                        )
                                      }
                                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 hover:underline"
                                      title="Click to copy email"
                                    >
                                      {getDisplayEmail(log)}
                                      {copiedField === `email-${log._id}` ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3 opacity-50" />
                                      )}
                                    </button>
                                  </div>
                                )}
                            </div>
                          </TableCell>
                          <TableCell centered>
                            <Badge
                              className={getActionBadgeStyle(
                                log.action || 'unknown'
                              )}
                            >
                              {(log.action || 'unknown').toLowerCase() ===
                              'archive'
                                ? 'Archived'
                                : (log.action || 'unknown').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell centered>
                            <Badge
                              className={getResourceBadgeStyle(
                                log.resource || 'unknown'
                              )}
                            >
                              {log.resource || 'unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-0 max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                            <button
                              onClick={() => handleDescriptionClick(log)}
                              className="w-full cursor-pointer whitespace-normal break-words text-left text-sm transition-colors hover:text-blue-600 hover:underline"
                              title="Click to view details"
                            >
                              <div className="flex items-start gap-1">
                                <span className="min-w-0 flex-1 break-words">
                                  {log.description ||
                                    log.details ||
                                    'No description'}
                                </span>
                                <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-50" />
                              </div>
                            </button>
                          </TableCell>
                          <TableCell centered className="font-mono text-sm">
                            <div className="flex flex-col items-center">
                              {log.ipAddress && log.ipAddress !== 'unknown' ? (
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      log.ipAddress!,
                                      'IP Address',
                                      `ip-${log._id}`
                                    )
                                  }
                                  className="flex items-center gap-1 text-gray-800 hover:text-blue-600 hover:underline"
                                  title="Click to copy IP address"
                                >
                                  <span>{log.ipAddress}</span>
                                  {copiedField === `ip-${log._id}` ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-gray-800">N/A</span>
                              )}
                              {log.ipAddress &&
                                log.ipAddress.includes('(Local)') && (
                                  <span className="mt-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
                                    Local Network
                                  </span>
                                )}
                              {log.ipAddress &&
                                log.ipAddress.includes('(Public)') && (
                                  <span className="mt-1 rounded bg-green-50 px-2 py-1 text-xs text-green-600">
                                    Public IP
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          {isDeveloper && (
                            <TableCell centered>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(log)}
                                className="h-8 w-8 text-destructive hover:bg-red-50"
                                title="Delete Log"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={emptyStateColSpan} className="py-8 text-center">
                          <div className="text-gray-500">
                            <Activity className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                            <p className="text-lg font-medium">
                              No activity logs found
                            </p>
                            <p className="text-sm">
                              Try adjusting your search or filter criteria
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="space-y-4 px-1 lg:hidden">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <AdministrationActivityLogCardSkeleton key={i} />
              ))
            ) : logs && logs.length > 0 ? (
              logs.map(log => {
                const logId = log._id ?? '';
                const isRowSelected =
                  logId.length > 0 && selectedIds.has(logId);
                return (
                <AdministrationActivityLogCard
                  key={log._id}
                  log={log}
                  onDescriptionClick={handleDescriptionClick}
                  canDelete={isDeveloper}
                  onDelete={handleDeleteClick}
                  isSelected={isRowSelected}
                  onToggleSelect={
                    logId ? () => toggleRowSelection(logId) : undefined
                  }
                />
              );
              })
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Activity className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-lg font-medium">No activity logs found</p>
                <p className="text-sm">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            totalCount={serverTotalCount}
            showTotalCount
            isLoadingPage={isJumping}
          />
        </CardContent>
      </Card>

      {/* Description Dialog */}
      <AdministrationActivityLogDescriptionDialog
        isOpen={isDescriptionDialogOpen}
        onClose={handleDialogClose}
        log={selectedLog}
        searchMode={searchMode}
      />

      <AdministrationDeleteActivityLogModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        log={logToDelete}
        onDelete={async (deleteType) => {
          if (!logToDelete) return;
          try {
            const response = await fetch(
              `/api/activity-logs/${logToDelete._id}?deleteType=${deleteType}`,
              { method: 'DELETE' }
            );
            const data = await response.json();
            if (data.success) {
              toast.success(
                `Activity log ${deleteType === 'hard' ? 'permanently removed' : 'marked as deleted'}`
              );
              setIsDeleteModalOpen(false);
              setLogToDelete(null);
              fetchInitialBatch();
            } else {
              toast.error(data.message || 'Failed to delete activity log');
            }
          } catch (error) {
            console.error('Error deleting activity log:', error);
            toast.error('An error occurred while deleting');
          }
        }}
      />

      <AdministrationBulkDeleteActivityLogsModal
        open={isBulkDeleteModalOpen}
        onOpenChange={setIsBulkDeleteModalOpen}
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
      />

      <AdministrationClearActivityLogsModal
        open={isClearLogsModalOpen}
        onOpenChange={setIsClearLogsModalOpen}
        onClear={async () => {
          try {
            const response = await fetch('/api/activity-logs', {
              method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
              toast.success(data.message || 'Successfully cleared all activity logs');
              setIsClearLogsModalOpen(false);
              fetchInitialBatch();
            } else {
              toast.error(data.message || 'Failed to clear activity logs');
            }
          } catch (error) {
            console.error('Error clearing activity logs:', error);
            toast.error('An error occurred while clearing activity logs');
          }
        }}
      />
    </div>
  );
}

export default AdministrationActivityLogsTable;
