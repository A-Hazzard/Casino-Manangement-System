/**
 * Cabinets Details Activity Log Table Component
 *
 * Displays machine activity logs with server-side filtering, pagination, and
 * event-code cursor seek. All filter changes trigger a callback to the parent
 * which re-fetches from the API — no client-side filtering or pagination.
 *
 * Features:
 * - Machine event log display with expandable sequence details
 * - Quick-filter buttons (Critical, Warning, INFO, SAS Event)
 * - Time picker for filtering by time-of-day window
 * - Event type dropdown from server-returned filter options
 * - Event code input for cursor seek (jump to first page where code appears)
 * - Server-side PaginationControls
 * - Success/failure indicators on sequence steps
 */

import { FC, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { CheckIcon, MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import { Search } from 'lucide-react';

import PaginationControls from '@/components/shared/ui/PaginationControls';
import CabinetsDetailsActivityLogSkeleton from '@/components/CMS/cabinets/details/CabinetsDetailsActivityLogSkeleton';

// ============================================================================
// Types
// ============================================================================

export type CabinetsDetailsMachineEvent = {
  _id: string;
  message?: {
    incomingMessage?: {
      typ: string;
      rly: string;
      mac: string;
      pyd: string;
    };
    serialNumber?: string;
    game?: string;
    gamingLocation?: string;
  };
  machine: string;
  relay?: string;
  commandType?: string;
  command?: string;
  description?: string;
  date: string | Date;
  cabinetId?: string;
  gameName?: string;
  location?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  sequence?: Array<{
    description: string;
    logLevel: string;
    success: boolean;
    createdAt: string;
  }>;
  eventType?: string;
  eventLogLevel?: string;
  eventSuccess?: boolean;
};

type ActivityLogFilters = {
  eventType: string;
  type: string;
  event: string;
  game: string;
  command: string;
};

type ActivityLogPagination = {
  currentPage: number;
  totalPages: number | null;
  totalEvents: number | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  cursorResolved: boolean;
};

type ActivityLogFilterOptions = {
  eventTypes: string[];
  eventLogLevels: string[];
  games: string[];
};

type CabinetsDetailsActivityLogTableProps = {
  data: CabinetsDetailsMachineEvent[];
  pagination: ActivityLogPagination | null;
  displayPage: number;
  totalDisplayPages: number;
  filters: ActivityLogFilters;
  filterOptions: ActivityLogFilterOptions;
  loading?: boolean;
  onFilterChange: (filters: Partial<ActivityLogFilters>) => void;
  onPageChange: (globalZeroBased: number) => void;
  /** time-of-day window applied locally (no server round-trip needed for time filter) */
  onTimeWindowChange?: (startTime: string, endTime: string) => void;
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateString: string | Date) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatTimeValue(timeStr: string): { hours: number; minutes: number; isPM: boolean } {
  if (!timeStr) return { hours: 0, minutes: 0, isPM: false };
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m, isPM: h >= 12 };
}

function toTimeString(hours24: number, minutes: number): string {
  return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Time input matching the MuiDateCalendar TimeInput style —
 * separate hour/minute boxes with AM/PM selector.
 */
function ActivityTimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (timeStr: string) => void;
}) {
  const { hours, minutes, isPM } = formatTimeValue(value);
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  const inputClass =
    'w-[40px] rounded border border-border bg-background px-1 text-center text-[13px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const selectClass =
    'rounded border border-border bg-muted/50 px-1 text-[13px] focus:border-primary focus:outline-none';

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <input
          type="text"
          value={displayHour === 0 && !isPM ? '' : String(displayHour)}
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
            const parsed = parseInt(raw);
            if (raw === '' || isNaN(parsed) || parsed < 0 || parsed > 12) return;
            const h24 = isPM ? (parsed === 12 ? 12 : parsed + 12) : parsed === 12 ? 0 : parsed;
            onChange(toTimeString(h24, minutes));
          }}
          placeholder="12"
          className={inputClass}
        />
        <span className="text-[13px] font-medium text-foreground">:</span>
        <input
          type="text"
          value={String(minutes).padStart(2, '0')}
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
            const parsed = parseInt(raw);
            if (raw === '' || isNaN(parsed) || parsed < 0 || parsed > 59) return;
            onChange(toTimeString(hours, parsed));
          }}
          placeholder="00"
          className={inputClass}
        />
        <select
          value={isPM ? 'PM' : 'AM'}
          onChange={e => {
            const newIsPM = e.target.value === 'PM';
            const newH24 = newIsPM
              ? displayHour === 12 ? 12 : displayHour + 12
              : displayHour === 12 ? 0 : displayHour;
            onChange(toTimeString(newH24, minutes));
          }}
          className={selectClass}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

/**
 * Renders the Activity Log table with server-side pagination and filters.
 */
export const CabinetsDetailsActivityLogTable: FC<
  CabinetsDetailsActivityLogTableProps
> = ({
  data,
  pagination,
  displayPage,
  totalDisplayPages,
  filters,
  filterOptions,
  loading = false,
  onFilterChange,
  onPageChange,
}) => {
  // ============================================================================
  // State
  // ============================================================================
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    new Set()
  );

  // Local time-of-day window (applied to displayed rows only — too fine-grained for a server round-trip)
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Local command code input before submitting the cursor seek
  const [commandInput, setCommandInput] = useState(filters.command);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Track first matching row for scroll-to-match on cursor seek
  const [firstMatchIndex, setFirstMatchIndex] = useState(-1);

  // ============================================================================
  // Handlers
  // ============================================================================
  const toggleSequence = (eventId: string) => {
    const newExpanded = new Set(expandedSequences);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedSequences(newExpanded);
  };

  const handleQuickFilter = (type: string) => {
    const newType = filters.type === type ? '' : type;
    onFilterChange({ type: newType });
  };

  const handleEventTypeChange = (value: string) => {
    onFilterChange({ eventType: value === 'all' ? '' : value });
  };

  const handleLogLevelChange = (value: string) => {
    onFilterChange({ type: value === 'all' ? '' : value });
  };

  const handleGameChange = (value: string) => {
    onFilterChange({ game: value === 'all' ? '' : value });
  };

  const handleCommandSeek = () => {
    onFilterChange({ command: commandInput.trim() });
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommandSeek();
    }
  };

  const handleClearCommandSeek = () => {
    setCommandInput('');
    onFilterChange({ command: '' });
  };

  const handleClearAllFilters = () => {
    setCommandInput('');
    setStartTime('');
    setEndTime('');
    onFilterChange({ eventType: '', type: '', event: '', game: '', command: '' });
  };

  const handlePageChange = (zeroBased: number) => {
    onPageChange(zeroBased);
  };

  // ============================================================================
  // Computed — local time-of-day window filter (cosmetic only, no refetch)
  // ============================================================================
  const displayedData = data.filter(item => {
    if (!startTime && !endTime) return true;
    const itemDate = new Date(item.date);
    if (isNaN(itemDate.getTime())) return false;
    const itemMinutes = itemDate.getHours() * 60 + itemDate.getMinutes();
    if (startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      if (itemMinutes < sh * 60 + sm) return false;
    }
    if (endTime) {
      const [eh, em] = endTime.split(':').map(Number);
      if (itemMinutes > eh * 60 + em) return false;
    }
    return true;
  });

  const hasActiveFilters =
    filters.eventType ||
    filters.type ||
    filters.event ||
    filters.game ||
    filters.command;

  // ============================================================================
  // Computed — command match tracking for amber highlighting
  // ============================================================================
  const commandMatchMap = useMemo(() => {
    if (!filters.command || !pagination?.cursorResolved) return null;
    const map = new Map<number, boolean>();
    displayedData.forEach((row, index) => {
      const code = (row.command ?? '').toLowerCase();
      if (code === filters.command.toLowerCase()) {
        map.set(index, true);
      }
    });
    return map;
  }, [filters.command, pagination?.cursorResolved, displayedData]);

  const hasAnyCommandMatch = commandMatchMap && commandMatchMap.size > 0;

  // Find first matching row index for scroll
  useEffect(() => {
    if (commandMatchMap && commandMatchMap.size > 0) {
      const firstIdx = commandMatchMap.keys().next().value;
      setFirstMatchIndex(firstIdx ?? -1);
    } else {
      setFirstMatchIndex(-1);
    }
  }, [commandMatchMap]);

  // Scroll first matching row into view
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (firstMatchIndex >= 0) {
        const matches = document.querySelectorAll<HTMLElement>(
          '[data-command-match="true"]'
        );
        const visibleMatch = Array.from(matches).find(
          el => el.offsetParent !== null
        );
        visibleMatch?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [firstMatchIndex, pagination?.currentPage, filters.command]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
      <div className="w-full">
        {/* Filter Controls */}
        <div className="mb-4 rounded-lg bg-container p-4 shadow-sm space-y-4">

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-medium text-grayHighlight">
              Quick Filters:
            </span>
            <Button
              variant={filters.type === 'Critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('Critical')}
              className={
                filters.type === 'Critical'
                  ? 'bg-buttonActive text-white hover:bg-buttonActive/90'
                  : 'bg-button text-white hover:bg-button/90'
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
              onClick={() => handleQuickFilter('Warning')}
              className={
                filters.type === 'Warning' || filters.type === 'WARN'
                  ? 'bg-buttonActive text-white hover:bg-buttonActive/90'
                  : 'bg-button text-white hover:bg-button/90'
              }
            >
              Warning
            </Button>
            <Button
              variant={filters.type === 'INFO' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('INFO')}
              className={
                filters.type === 'INFO'
                  ? 'bg-buttonActive text-white hover:bg-buttonActive/90'
                  : 'bg-button text-white hover:bg-button/90'
              }
            >
              INFO
            </Button>
            <Button
              variant={
                filters.eventType === 'SAS Event' ? 'default' : 'outline'
              }
              size="sm"
              onClick={() =>
                onFilterChange({
                  eventType:
                    filters.eventType === 'SAS Event' ? '' : 'SAS Event',
                })
              }
              className={
                filters.eventType === 'SAS Event'
                  ? 'bg-buttonActive text-white hover:bg-buttonActive/90'
                  : 'bg-button text-white hover:bg-button/90'
              }
            >
              SAS Event
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Granular Filters Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Start Time */}
            <ActivityTimeInput
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
            />

            {/* End Time */}
            <ActivityTimeInput
              label="End Time"
              value={endTime}
              onChange={setEndTime}
            />

            {/* Event Type dropdown */}
            <div>
              <Select
                value={filters.eventType || 'all'}
                onValueChange={handleEventTypeChange}
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
                  {!filterOptions.eventTypes.includes('SAS Event') && (
                    <SelectItem value="SAS Event">SAS Event</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Log Level dropdown */}
            <div>
              <Select
                value={filters.type || 'all'}
                onValueChange={handleLogLevelChange}
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
            </div>
          </div>

          {/* Second filter row: Game + Event Code cursor */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Game dropdown */}
            <div>
              <Select
                value={filters.game || 'all'}
                onValueChange={handleGameChange}
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
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={commandInputRef}
                  placeholder="Jump to event code (e.g. 67, 1F)…"
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
                Jump
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
          </div>

          {/* Cursor seek indicator */}
          {pagination?.cursorResolved && filters.command && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              Jumped to page {pagination.currentPage}{pagination.totalPages !== null ? ` of ${pagination.totalPages}` : ''} — first occurrence of code &ldquo;{filters.command}&rdquo;
            </div>
          )}
        </div>

        {loading ? (
          <CabinetsDetailsActivityLogSkeleton />
        ) : (
        <>
        {/* Desktop Table View */}
        <div className="hidden w-full overflow-x-auto rounded-lg border border-gray-200 bg-container shadow-sm lg:block">
          {hasAnyCommandMatch && (
            <div className="border-b border-gray-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {commandMatchMap!.size} row{commandMatchMap!.size !== 1 ? 's' : ''} matched on this page
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-grayHighlight">Type</TableHead>
                <TableHead className="text-grayHighlight">Event</TableHead>
                <TableHead className="text-grayHighlight">Event Code</TableHead>
                <TableHead className="text-grayHighlight">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedData.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-grayHighlight">
                    No activity log data found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
              {displayedData.map((row, idx) => {
                const logLevel = row.eventLogLevel || 'General';
                const isRowMatch = commandMatchMap?.get(idx) ?? false;
                const rowBgClass = isRowMatch
                  ? 'bg-amber-50/60 border-l-amber-500 hover:bg-amber-100/40'
                  : logLevel === 'Critical'
                    ? 'bg-red-50/60 hover:bg-red-100/40'
                    : logLevel === 'Warning' || logLevel === 'Warn'
                      ? 'bg-orange-50/60 hover:bg-orange-100/40'
                      : 'hover:bg-muted';

                return (
                  <Fragment key={row._id || idx}>
                    <TableRow
                      className={`text-center transition-colors border-l-4 ${rowBgClass}`}
                      data-command-match={isRowMatch ? 'true' : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <CheckIcon className="h-4 w-4 text-green-500" />
                          {row.eventType || 'General'}
                        </div>
                      </TableCell>
                      <TableCell isFirstColumn={true}>
                        <div className="flex items-center justify-between">
                          <span>{row.description || 'No activity'}</span>
                          {row.sequence && row.sequence.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSequence(row._id)}
                              className="rounded p-1 transition-colors hover:bg-muted"
                            >
                              {expandedSequences.has(row._id) ? (
                                <MinusIcon className="h-4 w-4 text-green-500 hover:text-green-600" />
                              ) : (
                                <PlusIcon className="h-4 w-4 text-green-500 hover:text-green-600" />
                              )}
                            </Button>
                          )}
                        </div>
                        {/* Sequence Dropdown */}
                        {expandedSequences.has(row._id) &&
                          row.sequence &&
                          row.sequence.length > 0 && (
                            <div className="mt-3 border-t border-border pt-3">
                              <h4 className="mb-2 text-sm font-medium text-foreground">
                                Sequence Details
                              </h4>
                              <div className="space-y-2">
                                {row.sequence.map((seq, seqIdx) => (
                                  <div
                                    key={seqIdx}
                                    className="rounded border bg-muted/40 p-2 text-xs"
                                  >
                                    <div className="mb-1 flex items-center justify-between">
                                      <span className="font-medium">
                                        {seq.description}
                                      </span>
                                      <span
                                        className={`rounded px-1 py-0.5 text-xs ${
                                          seq.success
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {seq.logLevel}
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      {formatDate(seq.createdAt)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </TableCell>
                      <TableCell
                        className={`font-mono ${
                          isRowMatch ? 'bg-amber-200/70 font-semibold' : ''
                        }`}
                      >
                        {row.command || '00'}
                      </TableCell>
                      <TableCell>{formatDate(row.date)}</TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block w-full space-y-4 lg:hidden">
          {displayedData.map((row, idx) => {
            const isRowMatch = commandMatchMap?.get(idx) ?? false;
            return (
              <div
                key={row._id || idx}
                className={`w-full overflow-hidden rounded-lg border shadow-md ${
                  isRowMatch
                    ? 'border-amber-400 bg-amber-50/60'
                    : 'border-border bg-container'
                }`}
                data-command-match={isRowMatch ? 'true' : undefined}
              >
                <div className="bg-button px-4 py-3 text-sm font-semibold text-white">
                  <div className="flex items-center justify-between">
                    <span>{row.eventType || 'General'}</span>
                    <CheckIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-foreground">Event</span>
                    <div className="flex items-center gap-2">
                      <span className="ml-2 break-all text-right">
                        {row.description || 'No activity'}
                      </span>
                      {row.sequence && row.sequence.length > 0 && (
                        <button
                          onClick={() => toggleSequence(row._id)}
                          className="rounded p-1 transition-colors hover:bg-muted"
                        >
                          {expandedSequences.has(row._id) ? (
                            <MinusIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                          ) : (
                            <PlusIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">Event Code</span>
                    <span className={`font-mono font-medium ${
                      isRowMatch ? 'bg-amber-200/70 px-1 rounded' : ''
                    }`}>
                      {row.command || '00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">Date</span>
                    <span className="text-sm font-medium">
                      {formatDate(row.date)}
                    </span>
                  </div>

                  {/* Mobile Sequence Dropdown */}
                  {expandedSequences.has(row._id) &&
                    row.sequence &&
                    row.sequence.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        <h4 className="mb-2 text-sm font-medium text-foreground">
                          Sequence Details
                        </h4>
                        <div className="space-y-2">
                          {row.sequence.map((seq, seqIdx) => (
                            <div key={seqIdx} className="rounded bg-muted/40 p-2">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-medium">
                                  {seq.description}
                                </span>
                                <span
                                  className={`rounded px-1 py-0.5 text-xs ${
                                    seq.success
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {seq.logLevel}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(seq.createdAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
          {displayedData.length === 0 && !loading && (
            <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-container text-sm text-grayHighlight">
              No activity log data found for the selected filters.
            </div>
          )}
        </div>

        {/* Pagination controls */}
        <PaginationControls
          currentPage={displayPage}
          totalPages={totalDisplayPages}
          totalCount={pagination?.totalEvents ?? null}
          setCurrentPage={handlePageChange}
          hasMore={pagination?.hasNextPage ?? false}
        />
        </>
        )}
      </div>
  );
};
