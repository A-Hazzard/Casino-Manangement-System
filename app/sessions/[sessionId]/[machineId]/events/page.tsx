/**
 * Session Events Page
 *
 * Displays detailed event information for a specific session and machine.
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import PageLayout from '@/components/layout/PageLayout';
import PaginationControls from '@/components/ui/PaginationControls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionEventsPageSkeleton } from '@/components/ui/skeletons/SessionsSkeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';

// Hooks
import { useSessionEventsData } from '@/lib/hooks/sessions/useSessionEventsData';

/**
 * Session Events Page Content Component
 */
function SessionEventsContent() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const machineId = params.machineId as string;

  const hook = useSessionEventsData(sessionId, machineId);
  const {
    loading,
    loadingSettings,
    sessionInfo,
    isSettingsExpanded,
    paginatedEvents,
    currentPage,
    totalPages,
    expandedEvents,
    setMachinePage,
    setIsSettingsExpanded,
    toggleEventExpansion,
    handleRefresh,
  } = hook;

  // Get time period label (matching DateRangeIndicator format)
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();
  const getTimePeriodLabel = () => {
    switch (activeMetricsFilter) {
      case 'Today':
        return 'Today';
      case 'Yesterday':
        return 'Yesterday';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case 'All Time':
        return 'All Time';
      case 'Custom':
        if (customDateRange?.startDate && customDateRange?.endDate) {
          const startDate = format(customDateRange.startDate, 'MMM d, yyyy');
          const endDate = format(customDateRange.endDate, 'MMM d, yyyy');
          return `${startDate} - ${endDate}`;
        }
        return 'Custom Range';
      default:
        return 'All Time';
    }
  };

  // Format member name
  const memberName =
    sessionInfo?.memberFirstName && sessionInfo?.memberLastName
      ? `${sessionInfo.memberFirstName} ${sessionInfo.memberLastName}`
      : sessionInfo?.memberId || 'Unknown Member';

  // Only show full page skeleton on initial load (no sessionInfo and no events)
  const isInitialLoad = loading && !sessionInfo && !paginatedEvents.length;

  if (isInitialLoad) {
    return (
      <PageLayout
        headerProps={{ disabled: true }}
        pageTitle="Session Events"
        hideOptions
        hideLicenceeFilter
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6"
      >
        <SessionEventsPageSkeleton />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      headerProps={{ disabled: loading }}
      pageTitle="Session Events"
      hideOptions
      hideLicenceeFilter
      hideCurrencyFilter
      mainClassName="flex flex-col flex-1 p-4 md:p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Events for Session {memberName} for {getTimePeriodLabel()}
        </h1>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-6">
        <DashboardDateFilters
          hideAllTime={false}
          onCustomRangeGo={handleRefresh}
        />
      </div>

      {/* Location Membership Settings Card */}
      {loadingSettings && !sessionInfo?.locationMembershipSettings ? (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between border-b border-gray-200 p-4 pb-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col">
                  <Skeleton className="mb-2 h-3 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : sessionInfo?.locationMembershipSettings ? (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              Location Membership Settings
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            >
              {isSettingsExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </CardHeader>
          {isSettingsExpanded && (
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessionInfo.locationMembershipSettings.locationLimit !==
                  undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Location Limit
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {sessionInfo.locationMembershipSettings.locationLimit.toLocaleString()}
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings.freePlayAmount !==
                  undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Free Play Amount
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      $
                      {sessionInfo.locationMembershipSettings.freePlayAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings.enablePoints !==
                  undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Enable Points
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {sessionInfo.locationMembershipSettings.enablePoints
                        ? 'Yes'
                        : 'No'}
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings.enableFreePlays !==
                  undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Enable Free Plays
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {sessionInfo.locationMembershipSettings.enableFreePlays
                        ? 'Yes'
                        : 'No'}
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings.gamesPlayedRatio !==
                  undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Games Played Ratio
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {sessionInfo.locationMembershipSettings.gamesPlayedRatio}
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings
                  .freePlayCreditsTimeout !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Free Play Credits Timeout
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {
                        sessionInfo.locationMembershipSettings
                          .freePlayCreditsTimeout
                      }{' '}
                      seconds
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings.pointsRatioMethod && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Points Ratio Method
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {sessionInfo.locationMembershipSettings.pointsRatioMethod}
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings.pointMethodValue !==
                  undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      Point Method Value
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {sessionInfo.locationMembershipSettings.pointMethodValue}
                    </span>
                  </div>
                )}
                {sessionInfo.locationMembershipSettings.pointsMethodGameTypes &&
                  sessionInfo.locationMembershipSettings.pointsMethodGameTypes
                    .length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500">
                        Points Method Game Types
                      </span>
                      <span className="mt-1 text-sm font-semibold text-gray-900">
                        {sessionInfo.locationMembershipSettings.pointsMethodGameTypes.join(
                          ', '
                        )}
                      </span>
                    </div>
                  )}
                {sessionInfo.locationMembershipSettings.freePlayGameTypes &&
                  sessionInfo.locationMembershipSettings.freePlayGameTypes
                    .length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500">
                        Free Play Game Types
                      </span>
                      <span className="mt-1 text-sm font-semibold text-gray-900">
                        {sessionInfo.locationMembershipSettings.freePlayGameTypes.join(
                          ', '
                        )}
                      </span>
                    </div>
                  )}
              </div>
            </CardContent>
          )}
        </Card>
      ) : null}

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        {loading && paginatedEvents.length === 0 && sessionInfo ? (
          // Table skeleton for desktop
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-button text-white hover:bg-button">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Event Type</TableHead>
                  <TableHead className="text-white">Description</TableHead>
                  <TableHead className="text-white">Game</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : paginatedEvents.length === 0 && !loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-2 text-lg font-medium text-gray-900">
                No events found
              </p>
              <p className="text-sm text-gray-500">
                There are no events for this session in the selected time
                period.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-button text-white hover:bg-button">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Event Type</TableHead>
                  <TableHead className="text-white">Description</TableHead>
                  <TableHead className="text-white">Game</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map(event => (
                  <TableRow
                    key={event._id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleEventExpansion(event._id)}
                  >
                    <TableCell className="text-sm font-medium text-gray-500">
                      {event.date
                        ? new Date(event.date).toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {event.eventType || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {event.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {event.gameName || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {expandedEvents.has(event._id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {paginatedEvents.some(event => expandedEvents.has(event._id)) && (
              <div className="border-t bg-gray-50 p-4">
                {paginatedEvents
                  .filter(event => expandedEvents.has(event._id))
                  .map(event => (
                    <div key={event._id} className="mb-4 last:mb-0">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(event, null, 2)}
                      </pre>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 lg:hidden">
        {loading && paginatedEvents.length === 0 && sessionInfo ? (
          // Card skeleton for mobile
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            </Card>
          ))
        ) : paginatedEvents.length === 0 && !loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-2 text-lg font-medium text-gray-900">
                No events found
              </p>
              <p className="text-sm text-gray-500">
                There are no events for this session in the selected time
                period.
              </p>
            </CardContent>
          </Card>
        ) : (
          paginatedEvents.map(event => (
            <Card key={event._id} className="overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50"
                onClick={() => toggleEventExpansion(event._id)}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">
                    {event.date ? new Date(event.date).toLocaleString() : 'N/A'}
                  </span>
                  <span className="font-bold text-gray-900">
                    {event.eventType || event.description || 'N/A'}
                  </span>
                  {event.gameName && (
                    <span className="text-xs text-gray-600">
                      Game: {event.gameName}
                    </span>
                  )}
                </div>
                {expandedEvents.has(event._id) ? (
                  <ChevronUp />
                ) : (
                  <ChevronDown />
                )}
              </div>
              {expandedEvents.has(event._id) && (
                <CardContent className="border-t bg-gray-50 p-4">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setMachinePage}
          />
        </div>
      )}
    </PageLayout>
  );
}

export default function SessionEventsPage() {
  return (
    <ProtectedRoute requiredPage="sessions">
      <SessionEventsContent />
    </ProtectedRoute>
  );
}
