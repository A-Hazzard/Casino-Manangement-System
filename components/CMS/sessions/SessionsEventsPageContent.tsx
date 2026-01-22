/**
 * SessionsEventsPageContent Component
 *
 * Handles state and data fetching for the session events page.
 * Features a responsive design with separate desktop and mobile views.
 *
 * @param props - Component props
 */

'use client';

import axios from 'axios';
import { ChevronDown, ChevronUp, History, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { SessionEventsPageSkeleton } from '@/components/shared/ui/skeletons/SessionsSkeletons';

import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { formatDate } from '@/lib/utils/date';

import type { MachineEvent, SessionDetails, SessionsEventsPageContentProps } from '@/lib/types/sessions';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns color classes based on event type
 */
function getEventTypeColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'priority':
      return 'bg-red-100 text-red-800';
    case 'significant':
      return 'bg-yellow-100 text-yellow-800';
    case 'general':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Formats numeric values safely
 */
function formatNumber(val: any): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number(val).toLocaleString();
}

/**
 * Formats list of strings safely
 */
function formatList(list?: string[]): string {
  if (!list || list.length === 0) return 'None';
  return list.join(', ');
}

export function SessionsEventsPageContent({
  sessionId,
  machineId,
}: SessionsEventsPageContentProps) {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const router = useRouter();
  const makeRequest = useAbortableRequest();
  const { 
    activeMetricsFilter, 
    customDateRange,
    selectedLicencee,
    setSelectedLicencee 
  } = useDashBoardStore();

  // ============================================================================
  // State Management
  // ============================================================================
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [events, setEvents] = useState<MachineEvent[]>([]);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
    totalEvents: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const [_filters, setFilters] = useState<{
    eventTypes: string[];
    events: string[];
    games: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchData = useCallback(async (page = 1, isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setError(null);
    }

    try {
      await makeRequest(async (signal) => {
        // Build query params for filters
        // Sync activeMetricsFilter and customDateRange from DashboardStore
        const params: Record<string, string> = {
          page: page.toString(),
          limit: '10',
        };

        // Handle date filtering - use startDate/endDate for Custom, timePeriod for others
        if (activeMetricsFilter === 'Custom' && customDateRange?.startDate && customDateRange?.endDate) {
          const startDate = customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate);
          const endDate = customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate);
          params.startDate = startDate.toISOString().split('T')[0];
          params.endDate = endDate.toISOString().split('T')[0];
        } else if (activeMetricsFilter && activeMetricsFilter !== 'All Time') {
          // Map dashboard filter values to API timePeriod values
          const timePeriodMap: Record<string, string> = {
            'Today': 'today',
            'Yesterday': 'yesterday',
            '7d': '7d',
            '30d': '30d',
          };
          const apiTimePeriod = timePeriodMap[activeMetricsFilter] || activeMetricsFilter.toLowerCase();
          params.timePeriod = apiTimePeriod;
        }

        // Fetch session info and events in parallel
        const [sessionRes, eventsRes] = await Promise.all([
          axios.get(`/api/sessions/${sessionId}`, { signal }),
          axios.get(`/api/sessions/${sessionId}/${machineId}/events`, { 
            params,
            signal 
          }),
        ]);

        // Extract session data from nested response structure
        if (sessionRes.data.success) {
          setSession(sessionRes.data.data);
        }

        // Extract events, pagination, and filters from nested response structure
        if (eventsRes.data.success && eventsRes.data.data) {
          const { events: eventsData, pagination: paginationData, filters: filtersData } = eventsRes.data.data;
          setEvents(eventsData || []);
          setPagination(paginationData || null);
          setFilters(filtersData || null);
        }
      });
    } catch (err: any) {
      if (err.name !== 'AbortError' && !axios.isCancel(err)) {
        console.error('Failed to fetch session events:', err);
        setError('Failed to load events. Please try again.');
        toast.error('Failed to load session details');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, machineId, makeRequest, activeMetricsFilter, customDateRange]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(pagination?.currentPage || 1, true);
  };

  const toggleEventExpansion = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePageChange = (page: number) => {
    // API uses 1-based pagination, but PaginationControls uses 0-based
    // Convert to 1-based for API call
    fetchData(page + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  /**
   * Member Location Settings Component
   */
  const renderLocationSettings = () => {
    if (loading && !session) {
      return (
        <Card className="mb-6 border border-gray-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Member Location Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[...Array(2)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!session || !session.locationMembershipSettings) {
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
    } = session.locationMembershipSettings;

    return (
      <Card className="mb-6 border border-gray-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Member Location Settings
            </CardTitle>
            <p className="mt-1 text-sm text-gray-600">
              Session {session._id} for member {session.memberId}
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
              {/* Points System Section */}
              <div className="space-y-2 text-sm">
                <h3 className="text-sm font-semibold text-gray-800">Points System</h3>
                <div className="space-y-1.5 text-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium">Enable Points:</span>
                    <Badge variant={enablePoints ? 'default' : 'secondary'} className={enablePoints ? 'bg-green-100 text-green-800' : ''}>
                      {enablePoints ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Method:</span>
                    <span>{pointsRatioMethod || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Value:</span>
                    <span>{formatNumber(pointMethodValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Ratio:</span>
                    <span>{formatNumber(gamesPlayedRatio)}</span>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="font-medium">Game Types:</span>
                    <span className="text-xs text-gray-500">{formatList(pointsMethodGameTypes)}</span>
                  </div>
                </div>
              </div>

              {/* Free Play System Section */}
              <div className="space-y-2 text-sm">
                <h3 className="text-sm font-semibold text-gray-800">Free Play System</h3>
                <div className="space-y-1.5 text-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium">Enable Free Plays:</span>
                    <Badge variant={enableFreePlays ? 'default' : 'secondary'} className={enableFreePlays ? 'bg-green-100 text-green-800' : ''}>
                      {enableFreePlays ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Amount:</span>
                    <span>{formatNumber(freePlayAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Timeout (s):</span>
                    <span>{formatNumber(freePlayCreditsTimeout)}</span>
                  </div>
                   <div className="flex flex-col gap-1 pt-1">
                    <span className="font-medium">Game Types:</span>
                    <span className="text-xs text-gray-500">{formatList(freePlayGameTypes)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-800">Location Limit:</span>
                <span className="text-gray-700">{formatNumber(locationLimit)}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  /**
   * Desktop Events Table
   */
  const renderEventsTable = () => {
    if (loading && events.length === 0) return null;

    if (events.length === 0) {
      return (
        <div className="rounded-md border border-gray-200 bg-white p-12 text-center">
          <History className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No events found</h3>
          <p className="text-sm text-gray-500">No events recorded for this session period.</p>
        </div>
      );
    }

    return (
      <div className="hidden rounded-md border border-gray-200 bg-white lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-button text-white">
              <tr>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">Type</th>
                <th className="p-4 text-left text-sm font-semibold uppercase tracking-wider">Event</th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">Code</th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">Game</th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">Date</th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map(event => (
                <Fragment key={event._id}>
                  <tr className="transition-colors hover:bg-gray-50/50">
                    <td className="p-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${getEventTypeColor(event.eventType)}`}>
                        {event.eventType?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-left text-sm font-medium text-gray-900 max-w-xs truncate" title={event.description}>
                      {event.description}
                    </td>
                    <td className="p-4 text-center text-sm text-gray-500 font-mono">
                      {event.command || '-'}
                    </td>
                    <td className="p-4 text-center text-sm text-gray-600">
                      {event.gameName || '-'}
                    </td>
                    <td className="p-4 text-center text-sm text-gray-500">
                      {formatDate(event.date)}
                    </td>
                    <td className="p-4 text-center">
                      {event.sequence && event.sequence.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventExpansion(event._id)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedEvents.has(event._id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </td>
                  </tr>

                  {expandedEvents.has(event._id) && event.sequence && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50/50 p-6">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Sequence Process</h4>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {event.sequence.map((step, idx) => (
                              <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                <span className="text-sm font-medium text-gray-700">{step.description}</span>
                                <div className="flex gap-2">
                                  <Badge className={
                                    step.logLevel === 'ERROR' ? 'bg-red-100 text-red-800' :
                                    step.logLevel === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }>
                                    {step.logLevel}
                                  </Badge>
                                  <Badge className={step.success ? 'bg-green-600' : 'bg-red-600'}>
                                    {step.success ? 'OK' : 'FAIL'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
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

  /**
   * Mobile Events Cards
   */
  const renderEventsCards = () => {
    if (loading && events.length === 0) return null;

    if (events.length === 0) return null;

    return (
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {events.map(event => (
          <div key={event._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getEventTypeColor(event.eventType)}`}>
                      {event.eventType?.toUpperCase()}
                    </span>
                    {event.sequence && event.sequence.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => toggleEventExpansion(event._id)} className="h-6 w-6 p-0">
                        {expandedEvents.has(event._id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    {event.description}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-500">Event Code</span>
                  <span className="font-bold text-gray-800">{event.command || '-'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-500">Game</span>
                  <span className="font-bold text-gray-800">{event.gameName || '-'}</span>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5 border-t pt-2">
                  <span className="text-gray-500">Timestamp</span>
                  <span className="font-bold text-gray-800">{formatDate(event.date)}</span>
                </div>
              </div>

              {expandedEvents.has(event._id) && event.sequence && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sequence Details</h4>
                  {event.sequence.map((step, idx) => (
                    <div key={idx} className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-gray-700">{step.description}</p>
                      <div className="flex gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          step.logLevel === 'ERROR' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {step.logLevel}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          step.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {step.success ? 'SUCCESS' : 'FAILED'}
                        </span>
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
  // Main Render
  // ============================================================================

  return (
    <ProtectedRoute requiredPage="sessions">
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        mainClassName="flex flex-col flex-1 px-4 py-6 sm:p-8 w-full max-w-full space-y-6 mt-4"
        showToaster={false}
      >
        <div className="flex flex-col space-y-6">
          {/* Navigation Section */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="h-9">
              <History className="mr-2 h-4 w-4" />
              Back to Sessions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Header Section */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Session Events</h1>
            <p className="text-sm text-gray-500">
              Viewing audit events for session <span className="font-mono text-gray-700">{sessionId}</span> 
              on machine <span className="font-mono text-gray-700">{machineId}</span>.
            </p>
          </div>

          {loading && events.length === 0 ? (
            <SessionEventsPageSkeleton />
          ) : (
            <>
              {/* Member Location Settings Section */}
              {renderLocationSettings()}

              {/* Filter Section */}
              <Card className="border-none bg-transparent shadow-none">
                <DateFilters 
                  onCustomRangeGo={handleRefresh} 
                  hideAllTime={false}
                  mode="auto"
                  hideIndicator
                />
              </Card>

              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
                  <p className="font-bold">Fetch Error</p>
                  <p>{error}</p>
                </div>
              )}

              {/* Mobile Card Grid View */}
              {renderEventsCards()}

              {/* Desktop Table View */}
              {renderEventsTable()}

              {/* Pagination Section - Use server-side pagination from API */}
              {!loading && pagination && pagination.totalPages > 1 && (
                <PaginationControls
                  currentPage={pagination.currentPage - 1} // Convert from 1-based to 0-based
                  totalPages={pagination.totalPages}
                  setCurrentPage={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </PageLayout>
    </ProtectedRoute>
  );
}

