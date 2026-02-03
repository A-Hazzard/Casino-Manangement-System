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

import type { ActivityLog } from '@/app/api/lib/types/activityLog';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { DatePicker } from '@/components/shared/ui/date-picker';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shared/ui/select';
import { Skeleton } from '@/components/shared/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { formatDate } from '@/lib/utils/formatting';
import { Activity, ArrowUpDown, Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdministrationActivityLogsSearchBar from '../AdministrationActivityLogsSearchBar';
import AdministrationActivityLogCard from '../cards/AdministrationActivityLogCard';
import AdministrationActivityLogDescriptionDialog from '../modals/AdministrationActivityLogDescriptionDialog';
import AdministrationActivityLogCardSkeleton from '../skeletons/AdministrationActivityLogCardSkeleton';

type AdministrationActivityLogsTableProps = {
  className?: string;
};

function AdministrationActivityLogsTable({
  className,
}: AdministrationActivityLogsTableProps) {
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<
    'username' | 'email' | 'description' | '_id'
  >('username');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  // Sort states
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog states
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string, fieldId: string) => {
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
      const emailMatch = log.description.match(/(?:for|:)\s*([^\s:]+@[^\s:]+)/i);
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
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / pagesPerBatch) + 1;
  }, [pagesPerBatch]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch activity logs - initial batch and when filters change
  const fetchInitialBatch = useCallback(async () => {
    setLoading(true);
    setAllLogs([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);

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
      if (dateFilter) {
        const selectedDate = new Date(dateFilter);
        selectedDate.setHours(0, 0, 0, 0);
        params.append('startDate', selectedDate.toISOString());

        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());
      }

      const url = `/api/activity-logs?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const logs = data.data.activities || data.data.logs || [];
        setAllLogs(logs);
        setLoadedBatches(new Set([1]));
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
    dateFilter,
    sortBy,
    sortOrder,
    itemsPerBatch,
  ]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Build params for batch fetch
    const buildParams = () => {
      const params = new URLSearchParams({
        page: String(nextBatch),
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
      if (dateFilter) {
        const selectedDate = new Date(dateFilter);
        selectedDate.setHours(0, 0, 0, 0);
        params.append('startDate', selectedDate.toISOString());

        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());
      }
      return params;
    };

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      const params = buildParams();
      fetch(`/api/activity-logs?${params}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const logs = data.data.activities || data.data.logs || [];
            setAllLogs(prev => {
              const existingIds = new Set(prev.map((item: ActivityLog) => item._id));
              const newItems = logs.filter(
                (item: ActivityLog) => !existingIds.has(item._id)
              );
              return [...prev, ...newItems];
            });
          }
        })
        .catch(error => {
          console.error('Error fetching next batch:', error);
        });
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      const params = new URLSearchParams({
        page: String(currentBatch),
        limit: String(itemsPerBatch),
        sortBy,
        sortOrder,
      });
      // Add filters...
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
      if (dateFilter) {
        const selectedDate = new Date(dateFilter);
        selectedDate.setHours(0, 0, 0, 0);
        params.append('startDate', selectedDate.toISOString());

        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());
      }
      fetch(`/api/activity-logs?${params}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const logs = data.data.activities || data.data.logs || [];
            setAllLogs(prev => {
              const existingIds = new Set(prev.map((item: ActivityLog) => item._id));
              const newItems = logs.filter(
                (item: ActivityLog) => !existingIds.has(item._id)
              );
              return [...prev, ...newItems];
            });
          }
        })
        .catch(error => {
          console.error('Error fetching current batch:', error);
        });
    }
  }, [
    currentPage,
    loading,
    loadedBatches,
    debouncedSearchTerm,
    searchMode,
    actionFilter,
    resourceFilter,
    dateFilter,
    sortBy,
    sortOrder,
    itemsPerBatch,
    pagesPerBatch,
    calculateBatchNumber,
  ]);

  // Fetch initial batch when filters change
  useEffect(() => {
    fetchInitialBatch();
  }, [fetchInitialBatch]);

  // Get items for current page from the current batch
  const logs = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return allLogs.slice(startIndex, endIndex);
  }, [allLogs, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages based on all loaded batches
  const totalPages = useMemo(() => {
    const totalItems = allLogs.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [allLogs.length, itemsPerPage]);

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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 font-medium';
      case 'member':
        return 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200 font-medium';
      case 'licensee':
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

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setResourceFilter('all');
    setDateFilter(undefined);
    setCurrentPage(1);
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

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs ({allLogs.length.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <AdministrationActivityLogsSearchBar
            searchValue={searchTerm}
            setSearchValue={setSearchTerm}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            searchDropdownOpen={searchDropdownOpen}
            setSearchDropdownOpen={setSearchDropdownOpen}
          />

          {/* Filters */}
          <div className="mb-6 mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="machine">Machine</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="collection">Collection</SelectItem>
                <SelectItem value="licensee">Licensee</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="vault">Vault</SelectItem>
                <SelectItem value="cashier_shift">Cashier Shift</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <DatePicker
                date={dateFilter}
                setDate={setDateFilter}
                disabled={loading}
              />
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden rounded-lg border lg:block">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs && logs.length > 0 ? (
                      logs.map((log: ActivityLog) => (
                        <TableRow key={log._id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(log.timestamp)}
                          </TableCell>
                          <TableCell centered>
                            <div className="space-y-1">
                              {/* Username */}
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => copyToClipboard(getDisplayUsername(log), 'Username', `username-${log._id}`)}
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
                                    onClick={() => copyToClipboard(log.userId!, 'User ID', `userId-${log._id}`)}
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
                              {getDisplayEmail(log) && getDisplayEmail(log) !== getDisplayUsername(log) && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => copyToClipboard(getDisplayEmail(log)!, 'Email', `email-${log._id}`)}
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
                              {(log.action || 'unknown').toUpperCase()}
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
                              onClick={() => {
                                // Extract email/identifier from description if it's a login message
                                const description = log.description || log.details || 'No description';
                                const emailMatch = description.match(/(?:Successful login|Invalid password|User not found)[\s:]+([^\s]+@[^\s]+)/i);
                                const textToCopy = emailMatch ? emailMatch[1] : description;
                                copyToClipboard(textToCopy, 'Description', `description-${log._id}`);
                              }}
                              className="w-full cursor-pointer whitespace-normal break-words text-left text-sm transition-colors hover:text-blue-600 hover:underline"
                              title="Click to copy description"
                            >
                              <div className="flex items-start gap-1">
                                <span className="min-w-0 flex-1 break-words">
                                  {log.description ||
                                    log.details ||
                                    'No description'}
                                </span>
                                {copiedField === `description-${log._id}` ? (
                                  <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-600" />
                                ) : (
                                  <Copy className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-50" />
                                )}
                              </div>
                            </button>
                          </TableCell>
                          <TableCell centered className="font-mono text-sm">
                            <div className="flex flex-col items-center">
                              {log.ipAddress && log.ipAddress !== 'unknown' ? (
                                <button
                                  onClick={() => copyToClipboard(log.ipAddress!, 'IP Address', `ip-${log._id}`)}
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
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center">
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
              logs.map(log => (
                <AdministrationActivityLogCard
                  key={log._id}
                  log={log}
                  onDescriptionClick={handleDescriptionClick}
                />
              ))
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
          {!loading && logs.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Description Dialog */}
      <AdministrationActivityLogDescriptionDialog
        isOpen={isDescriptionDialogOpen}
        onClose={handleDialogClose}
        log={selectedLog}
        searchMode={searchMode}
      />
    </div>
  );
}

export default AdministrationActivityLogsTable;

