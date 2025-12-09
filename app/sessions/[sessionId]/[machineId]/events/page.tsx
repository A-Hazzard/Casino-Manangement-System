/**
 * Session Events Page
 *
 * Displays detailed event information for a specific session and machine.
 *
 * Features:
 * - Event listing with pagination
 * - Expandable event details
 * - Date filtering
 * - Batch-based pagination for performance
 * - Responsive design for mobile and desktop
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import PageLayout from '@/components/layout/PageLayout';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import PaginationControls from '@/components/ui/PaginationControls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionEventsPageSkeleton } from '@/components/ui/skeletons/SessionsSkeletons';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import type { MachineEvent } from '@/lib/types/sessions';
import type { SessionInfo } from '@/shared/types/entities';

/**
 * Session Events Page Component
 * Handles all state management and data fetching for the session events page
 */
export default function SessionEventsPage() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const machineId = params.machineId as string;
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();

  // AbortController for events fetching
  const makeEventsRequest = useAbortableRequest();

  // ============================================================================
  // State Management
  // ============================================================================
  const [allEvents, setAllEvents] = useState<MachineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [totalEventsFromAPI, setTotalEventsFromAPI] = useState<number>(0);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedLicencee, setSelectedLicencee] = useState('All Licensees');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  // ============================================================================
  // Constants
  // ============================================================================
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // ============================================================================
  // Computed Values & Utilities
  // ============================================================================
  // Calculate which batch we need based on current page
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleFilter = useCallback(() => {
    // Reset to first page when filtering
    setCurrentPage(0);
    setAllEvents([]);
    setLoadedBatches(new Set([1]));
  }, []);

  const fetchEvents = useCallback(
    async (batch: number = 1) => {
      setLoading(true);
      setError(null);

      await makeEventsRequest(async signal => {
        const params = new URLSearchParams({
          page: batch.toString(),
          limit: itemsPerBatch.toString(),
        });

        if (activeMetricsFilter === 'Custom' && customDateRange) {
          const sd =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate as unknown as string);
          const ed =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate as unknown as string);
          params.append('startDate', sd.toISOString());
          params.append('endDate', ed.toISOString());
        } else if (activeMetricsFilter && activeMetricsFilter !== 'Custom') {
          const now = new Date();
          let startDate: Date;
          let endDate: Date;

          switch (activeMetricsFilter) {
            case 'Today':
              startDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              );
              endDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                23,
                59,
                59
              );
              break;
            case 'Yesterday':
              startDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 1
              );
              endDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 1,
                23,
                59,
                59
              );
              break;
            case 'last7days':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              endDate = now;
              break;
            case 'last30days':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              endDate = now;
              break;
            default:
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              endDate = now;
          }

          params.append('startDate', startDate.toISOString());
          params.append('endDate', endDate.toISOString());
        }

        try {
          const response = await axios.get(
            `/api/sessions/${sessionId}/${machineId}/events?${params}`,
            { signal }
          );

          const data = response.data;
          const responseData = data.data;
          const newEvents = responseData.events || [];

          if (responseData.pagination?.totalEvents) {
            setTotalEventsFromAPI(responseData.pagination.totalEvents);
          }

          setAllEvents(prev => {
            const existingIds = new Set(prev.map(e => e._id));
            const uniqueNewEvents = newEvents.filter(
              (e: MachineEvent) => !existingIds.has(e._id)
            );
            return [...prev, ...uniqueNewEvents];
          });
        } catch (err) {
          // Check if this is a cancelled request - don't treat as error
          const axios = (await import('axios')).default;
          if (axios.isCancel && axios.isCancel(err)) {
            // Request was cancelled, silently return without changing loading state
            // The next request will handle loading state
            return;
          }

          // Check for standard abort errors
          if (
            (err instanceof Error && err.name === 'AbortError') ||
            (err instanceof Error && err.message === 'canceled') ||
            (err &&
              typeof err === 'object' &&
              'code' in err &&
              (err.code === 'ERR_CANCELED' || err.code === 'ECONNABORTED'))
          ) {
            // Request was cancelled, silently return without changing loading state
            // The next request will handle loading state
            return;
          }

          // Only show error for actual errors
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Events Page Error:', err);
          }
          toast.error('Failed to fetch events');
          setAllEvents([]);
          setLoading(false);
        }

        // Only set loading to false on successful completion
        setLoading(false);
      });
    },
    [
      sessionId,
      machineId,
      activeMetricsFilter,
      customDateRange,
      itemsPerBatch,
      makeEventsRequest,
    ]
  );

  const fetchSessionInfo = useCallback(async () => {
    try {
      const response = await axios.get(`/api/sessions/${sessionId}`);
      if (response.data.success && response.data.data) {
        setSessionInfo(response.data.data as SessionInfo);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to fetch session info:', err);
      }
      // Don't show error toast - session info is optional
    }
  }, [sessionId]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(0);
    setAllEvents([]);
    setLoadedBatches(new Set([1]));
    setSessionInfo(null);
    fetchEvents(1);
    fetchSessionInfo();
  }, [fetchEvents, fetchSessionInfo]);

  // Load session info on mount
  useEffect(() => {
    fetchSessionInfo();
  }, [fetchSessionInfo]);

  // Load initial batch on mount and when filters change
  useEffect(() => {
    setAllEvents([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    fetchEvents(1);
    // Note: fetchEvents is a useCallback with all necessary dependencies
    // We don't include fetchEvents in deps to avoid re-triggering when it's recreated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, machineId, activeMetricsFilter, customDateRange]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchEvents(nextBatch);
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchEvents(currentBatch);
    }
    // Note: fetchEvents is a useCallback with all necessary dependencies
    // We don't include fetchEvents in deps to avoid re-triggering when it's recreated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    loading,
    itemsPerBatch,
    pagesPerBatch,
    loadedBatches,
    calculateBatchNumber,
  ]);

  // Get items for current page from the current batch
  const paginatedEvents = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return allEvents.slice(startIndex, endIndex);
  }, [allEvents, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages - use API total if available, otherwise use loaded events
  const totalPages = useMemo(() => {
    if (totalEventsFromAPI > 0) {
      // Use API total for accurate pagination
      return Math.ceil(totalEventsFromAPI / itemsPerPage);
    }
    // Fallback to loaded events count
    const totalItems = allEvents.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [totalEventsFromAPI, allEvents.length, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'priority':
        return 'bg-red-100 text-red-800';
      case 'significant':
        return 'bg-yellow-100 text-yellow-800';
      case 'general':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderLocationSettings = () => {
    if (loading && !sessionInfo) {
      return (
        <Card className="mb-6 border border-gray-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Member Location Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!sessionInfo || !sessionInfo.locationMembershipSettings) {
      return null;
    }

    const {
      locationLimit,
      freePlayAmount,
      enablePoints,
      enableFreePlays,
      pointsRatioMethod,
      pointMethodValue,
      gamesPlayedRatio,
      pointsMethodGameTypes,
      freePlayGameTypes,
      freePlayCreditsTimeout,
    } = sessionInfo.locationMembershipSettings;

    const formatNumber = (value?: number) => {
      if (value === undefined || value === null) {
        return '-';
      }
      return value.toLocaleString();
    };

    const formatList = (values?: string[]) => {
      if (!values || values.length === 0) {
        return '-';
      }
      return values.join(', ');
    };

    return (
      <Card className="mb-6 border border-gray-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Member Location Settings
            </CardTitle>
            <p className="mt-1 text-sm text-gray-600">
              Session {sessionInfo._id} for member {sessionInfo.memberId}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsExpanded(prev => !prev)}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-medium text-gray-700">
              {isSettingsExpanded ? 'Hide' : 'Show'} settings
            </span>
            {isSettingsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        {isSettingsExpanded && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  Points System
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Enable Points:</span>{' '}
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        enablePoints
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {enablePoints ? 'Yes' : 'No'}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Points Method:</span>{' '}
                    {pointsRatioMethod || '-'}
                  </p>
                  <p>
                    <span className="font-medium">Points Value:</span>{' '}
                    {formatNumber(pointMethodValue)}
                  </p>
                  <p>
                    <span className="font-medium">Games Played Ratio:</span>{' '}
                    {formatNumber(gamesPlayedRatio)}
                  </p>
                  <p>
                    <span className="font-medium">Game Types:</span>{' '}
                    {formatList(pointsMethodGameTypes)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  Free Play System
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Enable Free Plays:</span>{' '}
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        enableFreePlays
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {enableFreePlays ? 'Yes' : 'No'}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Free Play Amount:</span>{' '}
                    {formatNumber(freePlayAmount)}
                  </p>
                  <p>
                    <span className="font-medium">Timeout (seconds):</span>{' '}
                    {formatNumber(freePlayCreditsTimeout)}
                  </p>
                  <p>
                    <span className="font-medium">Game Types:</span>{' '}
                    {formatList(freePlayGameTypes)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  Location Limits
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Location Limit:</span>{' '}
                    {formatNumber(locationLimit)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderEventsTable = () => {
    if (loading && allEvents.length === 0) {
      return <SessionEventsPageSkeleton />;
    }

    if (paginatedEvents.length === 0) {
      return (
        <div className="rounded-md border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No events found for this session
          </p>
        </div>
      );
    }

    return (
      <div className="hidden rounded-md border md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-button text-white">
              <tr>
                <th className="p-3 text-center font-medium text-white">Type</th>
                <th className="p-3 text-center font-medium text-white">
                  Event
                </th>
                <th className="p-3 text-center font-medium text-white">
                  Event Code
                </th>
                <th className="p-3 text-center font-medium text-white">Game</th>
                <th className="p-3 text-center font-medium text-white">Date</th>
                <th className="p-3 text-center font-medium text-white">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedEvents.map(event => (
                <Fragment key={event._id}>
                  <tr className="border-b hover:bg-muted/30">
                    <td className="bg-white p-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getEventTypeColor(
                          event.eventType
                        )}`}
                      >
                        {event.eventType}
                      </span>
                    </td>
                    <td className="bg-white p-3 text-center text-sm text-gray-900">
                      {event.description}
                    </td>
                    <td className="bg-white p-3 text-center text-sm text-gray-900">
                      {event.command || '-'}
                    </td>
                    <td className="bg-white p-3 text-center text-sm text-gray-900">
                      {event.gameName || '-'}
                    </td>
                    <td className="bg-white p-3 text-center text-sm text-gray-900">
                      {formatDate(event.date)}
                    </td>
                    <td className="bg-white p-3 text-center">
                      {event.sequence && event.sequence.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventExpansion(event._id)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedEvents.has(event._id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expandedEvents.has(event._id) && event.sequence && (
                    <tr>
                      <td colSpan={6} className="border-b bg-muted/20 p-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">
                            Sequence Details:
                          </h4>
                          {event.sequence.map((step, index) => (
                            <div
                              key={index}
                              className="ml-4 rounded-md border border-gray-200 bg-white p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">
                                  {step.description}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      step.logLevel === 'ERROR'
                                        ? 'bg-red-100 text-red-800'
                                        : step.logLevel === 'WARN'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {step.logLevel}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      step.success
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {step.success ? 'SUCCESS' : 'FAILED'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEventsCards = () => {
    if (loading && allEvents.length === 0) {
      return <SessionEventsPageSkeleton />;
    }

    if (paginatedEvents.length === 0) {
      return (
        <div className="rounded-md border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No events found for this session
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {paginatedEvents.map(event => (
          <div
            key={event._id}
            className="overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
          >
            {/* Card Header */}
            <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center space-x-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getEventTypeColor(
                        event.eventType
                      )}`}
                    >
                      {event.eventType}
                    </span>
                    {event.sequence && event.sequence.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEventExpansion(event._id)}
                        className="h-7 w-7 p-0"
                      >
                        {expandedEvents.has(event._id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {event.description}
                  </h3>
                </div>
              </div>
            </div>

            {/* Card Content - 2x2 Grid */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Event Code
                  </span>
                  <span className="font-semibold text-gray-900">
                    {event.command || '-'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Game</span>
                  <span className="font-semibold text-gray-900">
                    {event.gameName || '-'}
                  </span>
                </div>
                <div className="col-span-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Date & Time
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatDate(event.date)}
                  </span>
                </div>
              </div>

              {expandedEvents.has(event._id) && event.sequence && (
                <div className="mt-4 space-y-2 border-t pt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Sequence Details
                  </h4>
                  {event.sequence.map((step, index) => (
                    <div
                      key={index}
                      className="rounded-md border bg-muted/10 p-3"
                    >
                      <div className="flex flex-col space-y-2">
                        <span className="text-sm font-medium text-gray-900">
                          {step.description}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              step.logLevel === 'ERROR'
                                ? 'bg-red-100 text-red-800'
                                : step.logLevel === 'WARN'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {step.logLevel}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              step.success
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {step.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <ProtectedRoute requiredPage="sessions">
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        mainClassName="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4"
        showToaster={false}
      >
        {/* Main Content Section: Session events display with navigation and filters */}
        <div className="mt-8 w-full">
          {/* Navigation Section: Back button and refresh */}
          <div className="mb-6 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Back to Sessions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>

          {/* Header Section: Page title and description */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Session Events</h1>
            <p className="text-gray-600">
              Machine events for Session {sessionId} on Machine {machineId}
            </p>
          </div>

          {/* Member Location Settings Section: Session membership configuration */}
          {renderLocationSettings()}

          {/* Date Filter Section: Auto mode shows buttons on md+, select on mobile */}
          <div className="mb-6">
            <DashboardDateFilters
              onCustomRangeGo={handleFilter}
              hideAllTime={false}
              mode="auto"
            />
          </div>

          {/* Error Display Section: Error messages and notifications */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <h2 className="font-semibold text-red-800">Error</h2>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Desktop Events Display Section: Table view for desktop users */}
          <div className="hidden lg:block">{renderEventsTable()}</div>

          {/* Mobile Events Display Section: Card view for mobile users */}
          <div className="block lg:hidden">{renderEventsCards()}</div>

          {/* Pagination Section: Navigation controls for event pages */}
          {!loading && paginatedEvents.length > 0 && totalPages > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={handlePageChange}
            />
          )}
        </div>
      </PageLayout>
    </ProtectedRoute>
  );
}
