'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import ActivityLogsSearchBar from './ActivityLogsSearchBar';
import ActivityLogCard from './ActivityLogCard';
import ActivityLogCardSkeleton from './ActivityLogCardSkeleton';
import ActivityLogDescriptionDialog from './ActivityLogDescriptionDialog';
import { DatePicker } from '@/components/ui/date-picker';
import type { ActivityLog } from '@/app/api/lib/types/activityLog';

type ActivityLogsTableProps = {
  className?: string;
};

const ActivityLogsTable: React.FC<ActivityLogsTableProps> = ({ className }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<
    'username' | 'email' | 'description'
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

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch activity logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        sortBy,
        sortOrder,
      });

      if (debouncedSearchTerm) {
        if (searchMode === 'username') {
          params.append('username', debouncedSearchTerm);
        } else if (searchMode === 'email') {
          params.append('email', debouncedSearchTerm);
        } else {
          params.append('search', debouncedSearchTerm);
        }
      }
      if (actionFilter && actionFilter !== 'all')
        params.append('action', actionFilter);
      if (resourceFilter && resourceFilter !== 'all')
        params.append('resource', resourceFilter);
      if (dateFilter) {
        // Set start of the selected day
        const selectedDate = new Date(dateFilter);
        selectedDate.setHours(0, 0, 0, 0);
        params.append('startDate', selectedDate.toISOString());

        // Set end of the selected day
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());

        console.warn('Date filter applied:', {
          original: dateFilter.toISOString(),
          startDate: selectedDate.toISOString(),
          endDate: endDate.toISOString(),
        });
      }

      const url = `/api/activity-logs?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.activities || data.data.logs || []);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
        setHasNextPage(data.data.pagination.hasNextPage);
        setHasPrevPage(data.data.pagination.hasPrevPage);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearchTerm,
    searchMode,
    actionFilter,
    resourceFilter,
    dateFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
            Activity Logs ({totalCount.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <ActivityLogsSearchBar
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
                      logs.map(log => (
                        <TableRow key={log._id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(log.timestamp)}
                          </TableCell>
                          <TableCell centered>
                            <div>
                              {searchMode === 'email' ? (
                                <>
                                  <div className="font-medium">
                                    {log.actor?.email || 'N/A'}
                                  </div>
                                  {log.username && (
                                    <div className="text-sm text-gray-500">
                                      {log.username}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="font-medium">
                                    {log.username}
                                  </div>
                                  {log.actor?.email && (
                                    <div className="text-sm text-gray-500">
                                      {log.actor.email}
                                    </div>
                                  )}
                                </>
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
                              onClick={() => handleDescriptionClick(log)}
                              className="w-full cursor-pointer whitespace-normal break-words text-left text-sm transition-colors hover:text-blue-600 hover:underline"
                              title="Click to view full description"
                            >
                              <div className="flex items-start gap-1">
                                <span className="min-w-0 flex-1 break-words">
                                  {log.description ||
                                    log.details ||
                                    'No description'}
                                </span>
                                <span className="mt-0.5 flex-shrink-0 text-xs text-blue-500">
                                  📋
                                </span>
                              </div>
                            </button>
                          </TableCell>
                          <TableCell centered className="font-mono text-sm">
                            <div className="flex flex-col items-center">
                              <span className="text-gray-800">
                                {log.ipAddress || 'N/A'}
                              </span>
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
                <ActivityLogCardSkeleton key={i} />
              ))
            ) : logs && logs.length > 0 ? (
              logs.map(log => (
                <ActivityLogCard
                  key={log._id}
                  log={log}
                  searchMode={searchMode}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 50 + 1} to{' '}
                {Math.min(currentPage * 50, totalCount)} of {totalCount} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={!hasPrevPage}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!hasPrevPage}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={!hasNextPage}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description Dialog */}
      <ActivityLogDescriptionDialog
        isOpen={isDescriptionDialogOpen}
        onClose={handleDialogClose}
        log={selectedLog}
        searchMode={searchMode}
      />
    </div>
  );
};

export default ActivityLogsTable;
