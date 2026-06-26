/**
 * SessionsEventsPageContent Component
 *
 * Handles state, filtering, and data fetching for the session events page.
 * Features:
 * - Server-side pagination matching the cabinets activity log style
 * - Full filters panel: time period, event type, log level, game, event code cursor
 * - Event code cursor seek: jump to the page where a code first appears
 * - Responsive design with separate desktop table and mobile card views
 * - Expandable sequence details per event row
 *
 * @param props - Component props
 */

'use client';

import axios from 'axios';
import {
  ChevronDown,
  ChevronUp,
  History,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Fragment,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
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
  SessionEventsPageSkeleton,
  SessionEventsTableSkeleton,
} from '@/components/shared/ui/skeletons/SessionsSkeletons';
import ActivityLogDateFilter from '@/components/shared/ui/ActivityLogDateFilter';

import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { formatDate } from '@/lib/utils/date';
import type { TimePeriod } from '@/app/api/lib/types';

import type {
  MachineEvent,
  SessionDetails,
  SessionsEventsPageContentProps,
} from '@/lib/types/sessions';

// ============================================================================
// Types
// ============================================================================

type EventFilterOptions = {
  eventTypes: string[];
  eventLogLevels: string[];
  descriptions: string[];
  games: string[];
};

type EventPagination = {
  currentPage: number;
  hasMore: boolean;
  hasPrevPage: boolean;
  cursorResolved: boolean;
};

type EventFilters = {
  eventType: string;
  type: string; // log level
  event: string;
  game: string;
  command: string; // event code cursor
};

// ============================================================================
// Helpers
// ============================================================================

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

function formatNumber(val: unknown): string {
  if (
    val === undefined ||
    val === null ||
    (typeof val === 'number' && isNaN(val))
  )
    return '0';
  return Number(val).toLocaleString();
}

function formatList(list?: string[]): string {
  if (!list || list.length === 0) return 'None';
  return list.join(', ');
}

const DEFAULT_FILTERS: EventFilters = {
  eventType: '',
  type: '',
  event: '',
  game: '',
  command: '',
};

export function SessionsEventsPageContent({
  sessionId,
  machineId,
}: SessionsEventsPageContentProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const router = useRouter();
  const makeRequest = useAbortableRequest();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // Local date filter state — independent of the global dashboard store
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

  // ============================================================================
  // Batch pagination constants
  // ============================================================================
  const ITEMS_PER_PAGE = 20;
  const ITEMS_PER_BATCH = 100;
  const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 5

  // Session metadata
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  // Events — accumulated across batches; never replaced on page navigation
  const [accumulatedEvents, setAccumulatedEvents] = useState<MachineEvent[]>([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  // hasMoreData: true when the last fetched batch was full — server has more records
  const [hasMoreData, setHasMoreData] = useState(false);

  const [pagination, setPagination] = useState<EventPagination | null>(null);
  const [filterOptions, setFilterOptions] = useState<EventFilterOptions>({
    eventTypes: [],
    eventLogLevels: [],
    descriptions: [],
    games: [],
  });

  // Loading / error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded event rows
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Filters and page
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // Local command code input (before submitting cursor seek)
  const [commandInput, setCommandInput] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Local request tracking ref to prevent race conditions from out-of-order fetch completions
  const lastRequestIdRef = useRef<string>('');

  // ============================================================================
  // Computed — batch pagination
  // ============================================================================

  // Slice of accumulated events for the current client page
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return accumulatedEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [accumulatedEvents, currentPage, ITEMS_PER_PAGE]);

  // Show loaded client pages + 1 trigger page when the server has more records,
  // mirroring the useLocationsPageData pattern. No COUNT query needed.
  const effectiveTotalPages = useMemo(() => {
    const loadedPages = Math.ceil(accumulatedEvents.length / ITEMS_PER_PAGE) || 1;
    return hasMoreData ? loadedPages + 1 : loadedPages;
  }, [accumulatedEvents.length, hasMoreData, ITEMS_PER_PAGE]);

  // Index of the first command-matching row on the current page (-1 if none)
  const firstMatchIndex = useMemo(() => {
    if (!filters.command) return -1;
    return paginatedEvents.findIndex(
      ev => ev.command?.toLowerCase() === filters.command.toLowerCase()
    );
  }, [paginatedEvents, filters.command]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchData = useCallback(
    async (batchNumber: number) => {
      const requestId = Math.random().toString(36).substring(7);
      lastRequestIdRef.current = requestId;

      setLoading(true);
      setError(null);

      try {
        await makeRequest(async signal => {
          const params: Record<string, string> = {
            page: batchNumber.toString(),
            limit: String(ITEMS_PER_BATCH),
          };

          if (filters.eventType) params.eventType = filters.eventType;
          if (filters.type) params.type = filters.type;
          if (filters.event) params.event = filters.event;
          if (filters.game) params.game = filters.game;
          if (filters.command) params.command = filters.command;

          if (timePeriod === 'Custom' && dateRange?.from && dateRange?.to) {
            params.startDate = dateRange.from.toISOString();
            params.endDate = dateRange.to.toISOString();
          } else if (timePeriod && timePeriod !== 'All Time') {
            params.timePeriod = timePeriod;
          }

          const [sessionRes, eventsRes] = await Promise.all([
            axios.get(`/api/sessions/${sessionId}`, { signal }),
            axios.get(`/api/sessions/${sessionId}/${machineId}/events`, {
              params,
              signal,
            }),
          ]);

          if (lastRequestIdRef.current !== requestId) return;

          if (sessionRes.data.success) {
            setSession(sessionRes.data.data);
          }

          if (eventsRes.data.success && eventsRes.data.data) {
            const { events: eventsData, pagination: paginationData, filters: filterData } =
              eventsRes.data.data;

            // Accumulate events at the correct position in the full result array
            const offset = (batchNumber - 1) * ITEMS_PER_BATCH;
            setAccumulatedEvents(prev => {
              const updated = [...prev];
              (eventsData as MachineEvent[]).forEach((ev, index) => {
                updated[offset + index] = ev;
              });
              return updated;
            });

            setHasMoreData(paginationData?.hasMore ?? false);
            setPagination(paginationData ?? null);

            // If cursor seek resolved, navigate to the exact client page within this batch
            if (paginationData?.cursorResolved && filters.command && eventsData?.length) {
              const matchIndex = (eventsData as MachineEvent[]).findIndex(
                ev => ev.command?.toLowerCase() === filters.command.toLowerCase()
              );
              const indexInBatch = matchIndex >= 0 ? matchIndex : 0;
              const clientPage =
                (batchNumber - 1) * PAGES_PER_BATCH +
                Math.floor(indexInBatch / ITEMS_PER_PAGE) +
                1;
              setCurrentPage(clientPage);
            }

            if (filterData) {
              setFilterOptions(prev => ({
                eventTypes:
                  filterData.eventTypes?.length > 0
                    ? filterData.eventTypes
                    : prev.eventTypes,
                eventLogLevels:
                  filterData.eventLogLevels?.length > 0
                    ? filterData.eventLogLevels
                    : prev.eventLogLevels,
                descriptions: filterData.descriptions ?? prev.descriptions,
                games:
                  filterData.games?.length > 0
                    ? filterData.games
                    : prev.games,
              }));
            }
          }
        });
      } catch (err) {
        if (lastRequestIdRef.current !== requestId) return;
        if ((err as Error).name !== 'AbortError' && !axios.isCancel(err)) {
          console.error('[SessionEvents] Failed to fetch events:', err);
          setError('Failed to load events. Please try again.');
          toast.error('Failed to load session details');
        }
      } finally {
        if (lastRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [sessionId, machineId, makeRequest, filters, timePeriod, dateRange, ITEMS_PER_BATCH, ITEMS_PER_PAGE, PAGES_PER_BATCH]
  );

  // Fetch the batch that contains currentPage if it hasn't been loaded yet.
  // Adding the batch to loadedBatches BEFORE the async call prevents duplicate fetches
  // when the effect re-fires after loadedBatches updates (same pattern as useLocationsPageData).
  useEffect(() => {
    const batchNumber = Math.floor((currentPage - 1) / PAGES_PER_BATCH) + 1;
    if (!loadedBatches.has(batchNumber)) {
      setLoadedBatches(prev => new Set([...prev, batchNumber]));
      void fetchData(batchNumber);
    }
  }, [currentPage, fetchData, loadedBatches, PAGES_PER_BATCH]);

  // Scroll to the first matching row when a command filter is active,
  // or back to page-top on normal navigation.
  // requestAnimationFrame defers until after the browser has painted the rows,
  // preventing the query from running before the DOM is updated.
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (firstMatchIndex >= 0) {
        // Mobile cards and the desktop table both stamp [data-command-match].
        // Pick the visible one — offsetParent is null for display:none elements —
        // so scrollIntoView targets a row that actually has a layout box.
        const matches = document.querySelectorAll<HTMLElement>(
          '[data-command-match="true"]'
        );
        const visibleMatch = Array.from(matches).find(
          el => el.offsetParent !== null
        );
        visibleMatch?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (!filters.command) {
        // No command active — normal page navigation, scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Command active but no match on this page → leave scroll position unchanged
    });
    return () => cancelAnimationFrame(rafId);
  }, [firstMatchIndex, currentPage, filters.command]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const resetAccumulation = () => {
    setAccumulatedEvents([]);
    setLoadedBatches(new Set());
    setCurrentPage(1);
    setHasMoreData(false);
    setPagination(null);
  };

  const handleRefresh = () => {
    resetAccumulation();
    // The batch effect fires after state updates and fetches batch 1
  };

  const toggleEventExpansion = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // PaginationControls uses 0-based; our state is 1-based.
  // Scrolling is handled centrally by the scroll effect above.
  const handlePageChange = (zeroBased: number) => {
    setCurrentPage(zeroBased + 1);
  };

  const handleTimePeriodChange = (newPeriod: TimePeriod) => {
    resetAccumulation();
    setTimePeriod(newPeriod);
  };

  const handleDateRangeChange = (range: { from: Date; to: Date } | undefined) => {
    resetAccumulation();
    setDateRange(range);
  };

  const handleFilterChange = (partial: Partial<EventFilters>) => {
    resetAccumulation();
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const handleQuickTypeFilter = (type: string) => {
    handleFilterChange({ type: filters.type === type ? '' : type });
  };

  const handleCommandSeek = () => {
    const trimmed = commandInput.trim();
    handleFilterChange({ command: trimmed });
  };

  const handleCommandKeyDown = (
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') handleCommandSeek();
  };

  const handleClearCommandSeek = () => {
    setCommandInput('');
    handleFilterChange({ command: '' });
  };

  const handleClearAllFilters = () => {
    setCommandInput('');
    resetAccumulation();
    setFilters(DEFAULT_FILTERS);
  };

  const hasActiveFilters =
    !!filters.eventType ||
    !!filters.type ||
    !!filters.event ||
    !!filters.game ||
    !!filters.command;

  // ============================================================================
  // Render — Member Location Settings Card
  // ============================================================================

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
              {/* Points System */}
              <div className="space-y-2 text-sm">
                <h3 className="text-sm font-semibold text-gray-800">
                  Points System
                </h3>
                <div className="space-y-1.5 text-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium">Enable Points:</span>
                    <Badge
                      variant={enablePoints ? 'default' : 'secondary'}
                      className={enablePoints ? 'bg-green-100 text-green-800' : ''}
                    >
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
                    <span className="text-xs text-gray-500">
                      {formatList(pointsMethodGameTypes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Free Play System */}
              <div className="space-y-2 text-sm">
                <h3 className="text-sm font-semibold text-gray-800">
                  Free Play System
                </h3>
                <div className="space-y-1.5 text-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium">Enable Free Plays:</span>
                    <Badge
                      variant={enableFreePlays ? 'default' : 'secondary'}
                      className={
                        enableFreePlays ? 'bg-green-100 text-green-800' : ''
                      }
                    >
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
                    <span className="text-xs text-gray-500">
                      {formatList(freePlayGameTypes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-800">
                  Location Limit:
                </span>
                <span className="text-gray-700">
                  {formatNumber(locationLimit)}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // ============================================================================
  // Render — Filters Panel
  // ============================================================================

  const renderFiltersPanel = () => (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
      {/* Time period filter */}
      <div>
        <ActivityLogDateFilter
          timePeriod={timePeriod}
          onTimePeriodChange={handleTimePeriodChange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {/* Quick type filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-500 mr-2">
          Quick Filters:
        </span>
        <Button
          variant={filters.type === 'Critical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickTypeFilter('Critical')}
          className={
            filters.type === 'Critical'
              ? 'bg-red-600 hover:bg-red-700'
              : 'border-red-200 text-red-600 hover:bg-red-50'
          }
        >
          Critical
        </Button>
        <Button
          variant={
            filters.type === 'Warning' || filters.type === 'WARN'
              ? 'default'
              : 'outline'
          }
          size="sm"
          onClick={() => handleQuickTypeFilter('Warning')}
          className={
            filters.type === 'Warning' || filters.type === 'WARN'
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'border-orange-200 text-orange-500 hover:bg-orange-50'
          }
        >
          Warning
        </Button>
        <Button
          variant={filters.type === 'INFO' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickTypeFilter('INFO')}
          className={
            filters.type === 'INFO'
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'border-blue-200 text-blue-500 hover:bg-blue-50'
          }
        >
          INFO
        </Button>
        <Button
          variant={filters.eventType === 'SAS Event' ? 'default' : 'outline'}
          size="sm"
          onClick={() =>
            handleFilterChange({
              eventType:
                filters.eventType === 'SAS Event' ? '' : 'SAS Event',
            })
          }
          className={
            filters.eventType === 'SAS Event'
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'border-purple-200 text-purple-600 hover:bg-purple-50'
          }
        >
          SAS Event
        </Button>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAllFilters}
            className="ml-auto flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Dropdown filters grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Event Type */}
        <Select
          value={filters.eventType || 'all'}
          onValueChange={val =>
            handleFilterChange({ eventType: val === 'all' ? '' : val })
          }
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="All Event Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Event Types</SelectItem>
            {filterOptions.eventTypes.map(et => (
              <SelectItem key={et} value={et}>
                {et}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Log Level */}
        <Select
          value={filters.type || 'all'}
          onValueChange={val =>
            handleFilterChange({ type: val === 'all' ? '' : val })
          }
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {filterOptions.eventLogLevels.map(lvl => (
              <SelectItem key={lvl} value={lvl}>
                {lvl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Game */}
        <Select
          value={filters.game || 'all'}
          onValueChange={val =>
            handleFilterChange({ game: val === 'all' ? '' : val })
          }
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="All Games" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Games</SelectItem>
            {filterOptions.games.map(g => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Event Code cursor seek */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            ref={commandInputRef}
            placeholder="Jump to event code (e.g. 67, 1F, 30)…"
            value={commandInput}
            onChange={e => setCommandInput(e.target.value)}
            onKeyDown={handleCommandKeyDown}
            className="h-10 pl-8"
          />
        </div>
        <Button
          size="sm"
          className="h-10 shrink-0"
          onClick={handleCommandSeek}
          disabled={loading || !commandInput.trim()}
        >
          Jump to Code
        </Button>
        {filters.command && (
          <Button
            size="sm"
            variant="outline"
            className="h-10 shrink-0"
            onClick={handleClearCommandSeek}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Cursor seek resolved indicator */}
      {pagination?.cursorResolved && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
          Jumped to page {currentPage} — first occurrence of code &ldquo;{filters.command}&rdquo;
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Render — Desktop Events Table
  // ============================================================================

  const renderEventsTable = () => {
    if (loading && paginatedEvents.length === 0) return null;

    if (paginatedEvents.length === 0) {
      return (
        <div className="rounded-md border border-gray-200 bg-white p-12 text-center">
          <History className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No events found</h3>
          <p className="text-sm text-gray-500">
            No events match the current filters.
          </p>
        </div>
      );
    }

    return (
      <div className="hidden rounded-md border border-gray-200 bg-white lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-button text-white">
              <tr>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">
                  Type
                </th>
                <th className="p-4 text-left text-sm font-semibold uppercase tracking-wider">
                  Event
                </th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">
                  Code
                </th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">
                  Game
                </th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">
                  Date
                </th>
                <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedEvents.map((event, index) => {
                const isHighlighted = filters.command && event.command?.toLowerCase() === filters.command.toLowerCase();
                return (
                  <Fragment key={event._id}>
                    <tr
                      data-command-match={index === firstMatchIndex ? 'true' : undefined}
                      className={`transition-colors border-l-4 ${
                        isHighlighted
                          ? 'bg-amber-50/60 border-l-amber-500 hover:bg-amber-100/40'
                          : 'border-l-transparent hover:bg-gray-50/50'
                      }`}
                    >
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${getEventTypeColor(event.eventType)}`}
                      >
                        {event.eventType?.toUpperCase()}
                      </span>
                    </td>
                    <td
                      className="max-w-xs truncate p-4 text-left text-sm font-medium text-gray-900"
                      title={event.description}
                    >
                      {event.description}
                    </td>
                    <td className="p-4 text-center font-mono text-sm text-gray-500">
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
                      <td colSpan={6} className="bg-gray-50/50 p-6">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Sequence Process
                          </h4>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {event.sequence.map((step, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                              >
                                <span className="text-sm font-medium text-gray-700">
                                  {step.description}
                                </span>
                                <div className="flex gap-2">
                                  <Badge
                                    className={
                                      step.logLevel === 'ERROR'
                                        ? 'bg-red-100 text-red-800'
                                        : step.logLevel === 'WARN'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-green-100 text-green-800'
                                    }
                                  >
                                    {step.logLevel}
                                  </Badge>
                                  <Badge
                                    className={
                                      step.success
                                        ? 'bg-green-600'
                                        : 'bg-red-600'
                                    }
                                  >
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
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Render — Mobile Events Cards
  // ============================================================================

  const renderEventsCards = () => {
    if (loading && paginatedEvents.length === 0) return null;
    if (paginatedEvents.length === 0) return null;

    return (
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {paginatedEvents.map((event, index) => {
          const isHighlighted = filters.command && event.command?.toLowerCase() === filters.command.toLowerCase();
          return (
            <div
              key={event._id}
              data-command-match={index === firstMatchIndex ? 'true' : undefined}
              className={`overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md ${
                isHighlighted
                  ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-500'
                  : 'border-gray-200 bg-white'
              }`}
            >
            <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getEventTypeColor(event.eventType)}`}
                    >
                      {event.eventType?.toUpperCase()}
                    </span>
                    {event.sequence && event.sequence.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEventExpansion(event._id)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedEvents.has(event._id) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  <h3 className="text-sm font-bold leading-tight text-gray-900">
                    {event.description}
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-500">Event Code</span>
                  <span className="font-bold text-gray-800">
                    {event.command || '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-500">Game</span>
                  <span className="font-bold text-gray-800">
                    {event.gameName || '-'}
                  </span>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5 border-t pt-2">
                  <span className="text-gray-500">Timestamp</span>
                  <span className="font-bold text-gray-800">
                    {formatDate(event.date)}
                  </span>
                </div>
              </div>

              {expandedEvents.has(event._id) && event.sequence && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Sequence Details
                  </h4>
                  {event.sequence.map((step, idx) => (
                    <div key={idx} className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-gray-700">
                        {step.description}
                      </p>
                      <div className="flex gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            step.logLevel === 'ERROR'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {step.logLevel}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            step.success
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {step.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
        })}
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
        onRefresh={handleRefresh}
        refreshing={loading}
      >
        <div className="flex flex-col space-y-6">
          {/* Navigation Section */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="h-9"
            >
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
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Session Events
            </h1>
            <p className="text-sm text-gray-500">
              Viewing audit events for session{' '}
              <span className="font-mono text-gray-700">{sessionId}</span> on
              machine{' '}
              <span className="font-mono text-gray-700">{machineId}</span>.
            </p>
          </div>

          {session === null && loading ? (
            <SessionEventsPageSkeleton />
          ) : (
            <>
              {/* Member Location Settings */}
              {renderLocationSettings()}

              {/* Error display */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
                  <p className="font-bold">Fetch Error</p>
                  <p>{error}</p>
                </div>
              )}

              {/* Filters Panel */}
              {renderFiltersPanel()}

              {/* Events Data Area: Table / Cards / Pagination */}
              {loading && accumulatedEvents.length === 0 ? (
                <SessionEventsTableSkeleton />
              ) : (
                <>
                  {/* Mobile Cards */}
                  {renderEventsCards()}

                  {/* Desktop Table */}
                  {renderEventsTable()}

                  {/* Pagination */}
                  <PaginationControls
                    currentPage={currentPage - 1}
                    totalPages={effectiveTotalPages}
                    setCurrentPage={handlePageChange}
                  />
                </>
              )}
            </>
          )}
        </div>
      </PageLayout>
    </ProtectedRoute>
  );
}
