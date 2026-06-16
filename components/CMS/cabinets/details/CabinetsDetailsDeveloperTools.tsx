'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { MuiDateCalendar } from '@/components/shared/ui/MuiDateCalendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { MetersTableSkeleton } from '@/components/shared/ui/skeletons/CabinetDetailSkeletons';

type RawMeterDoc = Record<string, unknown>;

type MetersApiResponse = {
  success: boolean;
  data: RawMeterDoc[];
  total: number | null;
  apiPage: number;
  hasMore: boolean;
  matchIndex: number;
  matchCount: number;
};

type TimePeriod = 'Today' | 'Yesterday' | '7d' | '30d' | 'All Time' | 'Custom';

type CabinetsDetailsDeveloperToolsProps = {
  cabinetId: string;
  refreshTrigger?: number;
};

const DATE_COLS = ['readAt', 'createdAt', 'updatedAt', 'deletedAt'];

// Rows shown per display page, and how many meters each API call fetches.
const DISPLAY_PAGE_SIZE = 20;
const API_BATCH_SIZE = 100;

type DateField = 'readAt' | 'createdAt' | 'updatedAt' | 'deletedAt';

const PREFERRED_COL_ORDER = [
  '_id',
  'machine',
  'drop',
  'totalCancelledCredits',
  'coinIn',
  'coinOut',
  'jackpot',
  'currentCredits',
  'gamesPlayed',
  'gamesWon',
  'totalWonCredits',
  'totalHandPaidCancelledCredits',
  'location',
  'locationSession',
  'meterSource',
  'isRamClear',
  'isSupplemental',
  'readAt',
  'createdAt',
  'updatedAt',
  'deletedAt',
];

function getDateRange(period: TimePeriod): { startDate?: Date; endDate?: Date } {
  const now = new Date();
  if (period === 'All Time') return {};
  if (period === 'Today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: now };
  }
  if (period === 'Yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }
  if (period === '7d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { startDate: start, endDate: now };
  }
  if (period === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: now };
  }
  return {};
}

function formatCellValue(col: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (DATE_COLS.includes(col)) {
    const d = new Date(value as string);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function deriveColumns(meters: RawMeterDoc[]): string[] {
  if (meters.length === 0) return PREFERRED_COL_ORDER;

  const seen = new Set<string>(PREFERRED_COL_ORDER);
  const movCols = new Set<string>();

  for (const meter of meters) {
    for (const key of Object.keys(meter)) {
      if (key !== 'movement') seen.add(key);
    }
    const mov = meter.movement as Record<string, unknown> | undefined;
    if (mov) {
      for (const sub of Object.keys(mov)) movCols.add(`movement.${sub}`);
    }
  }

  const result: string[] = [];

  // Preferred columns up to and including lifetime values
  const LIFETIME_END = 'totalHandPaidCancelledCredits';
  const insertIdx = PREFERRED_COL_ORDER.indexOf(LIFETIME_END) + 1;
  for (let index = 0; index < insertIdx; index++) {
    result.push(PREFERRED_COL_ORDER[index]);
  }

  // Movement columns right after lifetime values
  for (const col of movCols) result.push(col);

  // Remaining preferred columns (location, dates, etc.)
  for (let index = insertIdx; index < PREFERRED_COL_ORDER.length; index++) {
    result.push(PREFERRED_COL_ORDER[index]);
  }

  // Any other columns not in preferred order
  for (const col of seen) {
    if (!result.includes(col)) result.push(col);
  }
  return result;
}

function getCellValue(meter: RawMeterDoc, col: string): unknown {
  if (col.startsWith('movement.')) {
    const sub = col.slice('movement.'.length);
    return (meter.movement as Record<string, unknown> | undefined)?.[sub];
  }
  return meter[col];
}

const TIME_PERIODS: TimePeriod[] = [
  'Today',
  'Yesterday',
  '7d',
  '30d',
  'All Time',
  'Custom',
];

const FILTER_LABELS: Record<TimePeriod, string> = {
  Today: 'Today',
  Yesterday: 'Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  'All Time': 'All Time',
  Custom: 'Custom',
};

function formatCustomRangeLabel(from?: Date, to?: Date): string {
  if (!from || !to) return 'Custom';
  const fmt = (d: Date) =>
    d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

export default function CabinetsDetailsDeveloperTools({
  cabinetId,
  refreshTrigger,
}: CabinetsDetailsDeveloperToolsProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [customDateRange, setCustomDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [meters, setMeters] = useState<RawMeterDoc[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [displayPage, setDisplayPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateField, setDateField] = useState<DateField>('readAt');
  const [loadedApiPage, setLoadedApiPage] = useState(1);

  // Search inputs (typed/selected) vs. the applied search that is actually run.
  // Search only executes on Enter or the Search button — never while typing.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [searchMatchMode, setSearchMatchMode] = useState<'contains' | 'exact'>('contains');
  const [appliedTerm, setAppliedTerm] = useState('');
  const [appliedColumn, setAppliedColumn] = useState('');
  const [appliedMatchMode, setAppliedMatchMode] = useState<'contains' | 'exact'>('contains');
  const [matchOrdinal, setMatchOrdinal] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Data fetching
  // ============================================================================
  const fetchMeters = useCallback(
    async (
      period: TimePeriod,
      customFrom?: string,
      customTo?: string,
      apiPage = 1,
      targetDisplayPage = 0,
      searchTerm = '',
      searchColumnArg = '',
      ordinal = 0,
      matchMode: 'contains' | 'exact' = 'contains'
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        let range: { startDate?: Date; endDate?: Date } = {};
        if (period === 'Custom') {
          if (customFrom) range.startDate = new Date(customFrom);
          if (customTo) range.endDate = new Date(customTo);
        } else {
          range = getDateRange(period);
        }
        if (range.startDate)
          params.set('startDate', range.startDate.toISOString());
        if (range.endDate) params.set('endDate', range.endDate.toISOString());
        if (dateField !== 'readAt') params.set('dateField', dateField);
        params.set('apiPage', String(apiPage));
        const term = searchTerm.trim();
        if (term) {
          params.set('search', term);
          if (searchColumnArg) params.set('searchColumn', searchColumnArg);
          params.set('matchOrdinal', String(ordinal));
          if (matchMode === 'exact') params.set('matchMode', 'exact');
        }

        const { data } = await axios.get<MetersApiResponse>(
          `/api/cabinets/${cabinetId}/meters?${params.toString()}`
        );

        if (!data.success) {
          setError('API returned failure');
          return;
        }

        setMeters(data.data);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setLoadedApiPage(data.apiPage);

        if (term) {
          // Hop to the requested match, mirroring the activity-log cursor seek.
          // matchIndex is the match's global 0-based position in the listing.
          setMatchCount(data.matchCount ?? 0);
          if (data.matchIndex >= 0) {
            setDisplayPage(Math.floor(data.matchIndex / DISPLAY_PAGE_SIZE));
          } else {
            setDisplayPage(targetDisplayPage);
          }
        } else {
          // Plain batch load (pagination): leave applied-search state alone.
          setDisplayPage(targetDisplayPage);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [cabinetId, dateField]
  );

  // Context change (period, date field via fetchMeters identity, refresh, custom
  // range) reloads the unsearched list from page 1 and clears any applied search
  // — search itself only runs on an explicit Enter / Search button press, never
  // here. Custom ranges wait for both ends to be chosen.
  useEffect(() => {
    setAppliedTerm('');
    setAppliedColumn('');
    setAppliedMatchMode('contains');
    setMatchOrdinal(0);
    setMatchCount(0);
    if (timePeriod === 'Custom') {
      const from = customDateRange.from?.toISOString();
      const to = customDateRange.to?.toISOString();
      if (!from || !to) return;
      fetchMeters('Custom', from, to, 1, 0);
    } else {
      fetchMeters(timePeriod, undefined, undefined, 1, 0);
    }
  }, [timePeriod, refreshTrigger, customDateRange, fetchMeters]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handlePeriodClick = useCallback(
    (period: TimePeriod) => {
      if (period === 'Custom') {
        setTimePeriod('Custom');
        setPopoverOpen(true);
      } else {
        setPopoverOpen(false);
        setTimePeriod(period);
      }
    },
    []
  );

  const handleCustomApply = useCallback(
    (range?: { from: Date; to: Date }) => {
      setPopoverOpen(false);
      if (!range || !range.from || !range.to) return;
      // Setting the range triggers the unified fetch effect.
      setCustomDateRange({ from: range.from, to: range.to });
      setTimePeriod('Custom');
    },
    []
  );

  // Loads the batch holding a global display page when it differs from the
  // currently loaded batch; otherwise just moves within the loaded batch.
  const goToDisplayPage = useCallback(
    (zeroBased: number) => {
      const targetApiPage =
        Math.floor((zeroBased * DISPLAY_PAGE_SIZE) / API_BATCH_SIZE) + 1;
      if (targetApiPage !== loadedApiPage) {
        const from =
          timePeriod === 'Custom'
            ? customDateRange.from?.toISOString()
            : undefined;
        const to =
          timePeriod === 'Custom'
            ? customDateRange.to?.toISOString()
            : undefined;
        fetchMeters(timePeriod, from, to, targetApiPage, zeroBased);
      } else {
        setDisplayPage(zeroBased);
      }
    },
    [loadedApiPage, timePeriod, customDateRange, fetchMeters]
  );

  // Runs the current search box (Enter or Search button), seeking to match #1.
  const runSearch = useCallback(() => {
    const term = searchQuery.trim();
    setAppliedTerm(term);
    setAppliedColumn(searchColumn);
    setAppliedMatchMode(searchMatchMode);
    setMatchOrdinal(0);
    if (!term) setMatchCount(0);
    const from =
      timePeriod === 'Custom'
        ? customDateRange.from?.toISOString()
        : undefined;
    const to =
      timePeriod === 'Custom' ? customDateRange.to?.toISOString() : undefined;
    fetchMeters(timePeriod, from, to, 1, 0, term, searchColumn, 0, searchMatchMode);
  }, [searchQuery, searchColumn, searchMatchMode, timePeriod, customDateRange, fetchMeters]);

  // Steps to the Nth match of the applied search (prev/next across all pages).
  const goToMatch = useCallback(
    (ordinal: number) => {
      if (!appliedTerm || ordinal < 0 || ordinal >= matchCount) return;
      setMatchOrdinal(ordinal);
      const from =
        timePeriod === 'Custom'
          ? customDateRange.from?.toISOString()
          : undefined;
      const to =
        timePeriod === 'Custom' ? customDateRange.to?.toISOString() : undefined;
      fetchMeters(timePeriod, from, to, 1, 0, appliedTerm, appliedColumn, ordinal, appliedMatchMode);
    },
    [appliedTerm, appliedColumn, appliedMatchMode, matchCount, timePeriod, customDateRange, fetchMeters]
  );

  // ============================================================================
  // Derived
  // ============================================================================
  const columns = deriveColumns(meters);
  const localOffset = displayPage % (API_BATCH_SIZE / DISPLAY_PAGE_SIZE);
  const displayedMeters = meters.slice(
    localOffset * DISPLAY_PAGE_SIZE,
    (localOffset + 1) * DISPLAY_PAGE_SIZE
  );
  const currentBatchDisplayPages = Math.max(1, Math.ceil(meters.length / DISPLAY_PAGE_SIZE));
  const totalDisplayPages = total !== null
    ? Math.max(1, Math.ceil(total / DISPLAY_PAGE_SIZE))
    : hasMore
      ? loadedApiPage * (API_BATCH_SIZE / DISPLAY_PAGE_SIZE)
      : (loadedApiPage - 1) * (API_BATCH_SIZE / DISPLAY_PAGE_SIZE) + currentBatchDisplayPages;

  // ============================================================================
  // Search matching (highlights reflect the applied search, not live typing)
  // ============================================================================
  const searchLower = appliedTerm.toLowerCase();

  const matchMap = useMemo(() => {
    if (!searchLower) return null;

    const isMatch = (val: unknown): boolean => {
      if (val == null) return false;
      const str = String(val).toLowerCase();
      return appliedMatchMode === 'exact' ? str === searchLower : str.includes(searchLower);
    };

    const map = new Map<number, Set<string>>();
    for (let rowIndex = 0; rowIndex < displayedMeters.length; rowIndex++) {
      const meter = displayedMeters[rowIndex];
      const matchedCols = new Set<string>();

      if (appliedColumn) {
        if (isMatch(getCellValue(meter, appliedColumn))) matchedCols.add(appliedColumn);
      } else {
        for (const [key, val] of Object.entries(meter)) {
          if (key === 'movement') continue;
          if (isMatch(val)) matchedCols.add(key);
        }

        const mov = meter.movement as Record<string, unknown> | undefined;
        if (mov) {
          for (const [sub, val] of Object.entries(mov)) {
            if (isMatch(val)) matchedCols.add(`movement.${sub}`);
          }
        }
      }

      if (matchedCols.size > 0) map.set(rowIndex, matchedCols);
    }
    return map;
  }, [displayedMeters, searchLower, appliedColumn, appliedMatchMode]);

  const hasAnyMatch = matchMap && matchMap.size > 0;

  const firstMatchCol = useMemo(() => {
    if (!matchMap) return null;
    for (const cols of matchMap.values()) {
      for (const col of cols) {
        return col;
      }
    }
    return null;
  }, [matchMap]);

  useEffect(() => {
    if (!firstMatchCol || !tableContainerRef.current) return;
    const rafId = requestAnimationFrame(() => {
      const container = tableContainerRef.current;
      if (!container) return;
      const colIndex = columns.indexOf(firstMatchCol);
      if (colIndex < 0) return;
      const cellWidth = 120;
      const scrollTarget = colIndex * cellWidth;
      container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(rafId);
  }, [firstMatchCol, columns]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="w-full overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {TIME_PERIODS.filter(p => p !== 'Custom').map(period => (
          <Button
            key={period}
            onClick={() => handlePeriodClick(period)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              timePeriod === period
                ? 'bg-buttonActive text-white'
                : 'bg-button text-white hover:bg-button/90'
            }`}
          >
            {FILTER_LABELS[period]}
          </Button>
        ))}

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                timePeriod === 'Custom'
                  ? 'bg-buttonActive text-white'
                  : 'bg-button text-white hover:bg-button/90'
              }`}
            >
              {timePeriod === 'Custom' && customDateRange.from && customDateRange.to
                ? formatCustomRangeLabel(customDateRange.from, customDateRange.to)
                : 'Custom'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" side="bottom">
            <MuiDateCalendar
              date={customDateRange.from}
              endDate={customDateRange.to}
              showTime={true}
              buttonLabel="Apply"
              onSelect={handleCustomApply}
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <label
            htmlFor="devDateFieldSelect"
            className="text-sm font-medium text-gray-600 whitespace-nowrap"
          >
            Date Field
          </label>
          <select
            id="devDateFieldSelect"
            value={dateField}
            onChange={e => setDateField(e.target.value as DateField)}
            className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
          >
            <option value="readAt">Read Time</option>
            <option value="createdAt">Created Time</option>
            <option value="updatedAt">Updated Time</option>
            <option value="deletedAt">Deleted Time</option>
          </select>
        </div>
      </div>

      {/* Search — runs only on Enter or the Search button */}
      <div className="my-3 flex flex-wrap items-center gap-2 pl-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={
              searchColumn ? `Search ${searchColumn}...` : 'Search all fields...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
              }
            }}
            className="h-9 w-64 pl-8 text-sm"
          />
        </div>

        {/* Column scope */}
        <select
          aria-label="Search column"
          value={searchColumn}
          onChange={e => setSearchColumn(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
        >
          <option value="">All fields</option>
          {columns.map(col => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>

        {/* Match mode */}
        <select
          aria-label="Match mode"
          value={searchMatchMode}
          onChange={e => setSearchMatchMode(e.target.value as 'contains' | 'exact')}
          className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
        >
          <option value="contains">Contains</option>
          <option value="exact">Exact</option>
        </select>

        {/* Run search */}
        <Button
          onClick={runSearch}
          className="h-9 rounded-md bg-buttonActive px-4 text-sm text-white hover:bg-buttonActive/90"
        >
          Search
        </Button>

        {/* Match navigation */}
        {!loading && appliedTerm && matchCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Button
              onClick={() => goToMatch(matchOrdinal - 1)}
              disabled={matchOrdinal <= 0}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Previous match"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[5rem] text-center tabular-nums">
              {matchOrdinal + 1} of {matchCount}
            </span>
            <Button
              onClick={() => goToMatch(matchOrdinal + 1)}
              disabled={matchOrdinal >= matchCount - 1}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Next match"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!loading && appliedTerm && matchCount === 0 && (
          <span className="text-sm font-medium text-amber-700">No matches</span>
        )}
      </div>

      {/* Status line */}
      {!loading && !error && meters.length > 0 && total !== null && (
        <p className="text-xs text-grayHighlight">
          {total} meter{total !== 1 ? 's' : ''} total
        </p>
      )}

      {/* Loading */}
      {loading && <MetersTableSkeleton />}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Table */}
      {!loading && meters.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-container shadow-sm">
          {hasAnyMatch && (
            <div className="border-b border-gray-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {matchMap!.size} row{matchMap!.size !== 1 ? 's' : ''} matched on
              this page
            </div>
          )}
          <div ref={tableContainerRef} className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {columns.map(col => (
                    <TableHead
                      key={col}
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-grayHighlight"
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMeters.map((meter, rowIndex) => {
                  const matchedCols = matchMap?.get(rowIndex);
                  const isRowMatch = !!matchedCols;
                  return (
                    <TableRow
                      key={String(meter._id ?? rowIndex)}
                      data-search-match={isRowMatch ? 'true' : undefined}
                      className={`transition-colors border-l-4 ${
                        isRowMatch
                          ? 'bg-amber-50/60 border-l-amber-500 hover:bg-amber-100/40'
                          : meter.deletedAt
                            ? 'bg-red-50/60 opacity-70 border-l-transparent'
                            : rowIndex % 2 === 0
                              ? 'bg-white border-l-transparent'
                              : 'bg-gray-50/50 border-l-transparent'
                      } hover:bg-muted/50`}
                    >
                      {columns.map(col => {
                        const value = getCellValue(meter, col);
                        const display = formatCellValue(col, value);
                        const isCellMatch = matchedCols?.has(col) ?? false;
                        return (
                          <TableCell
                            key={col}
                            className={`whitespace-nowrap px-3 py-2 text-xs ${
                              col === '_id'
                                ? 'font-mono text-[10px] text-grayHighlight'
                                : 'text-gray-700'
                            } ${
                              col === 'deletedAt' && value != null
                                ? 'font-medium text-red-600'
                                : ''
                            } ${isCellMatch ? 'bg-amber-200/70 font-semibold' : ''}`}
                          >
                            {display}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meters.length > 0 && (
        <PaginationControls
          currentPage={displayPage}
          totalPages={totalDisplayPages}
          totalCount={total}
          setCurrentPage={goToDisplayPage}
          hasMore={hasMore}
        />
      )}

      {/* Empty state */}
      {!loading && total === 0 && !error && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-gray-200 bg-container text-sm text-grayHighlight shadow-sm">
          No meters found for the selected period.
        </div>
      )}
    </div>
  );
}
