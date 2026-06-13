'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { MetersTableSkeleton } from '@/components/shared/ui/skeletons/CabinetDetailSkeletons';

type RawMeterDoc = Record<string, unknown>;

type TimePeriod = 'Today' | 'Yesterday' | '7d' | '30d' | 'All Time' | 'Custom';

type CabinetsDetailsDeveloperToolsProps = {
  cabinetId: string;
  refreshTrigger?: number;
};

const DATE_COLS = ['readAt', 'createdAt', 'updatedAt', 'deletedAt'];

const PREFERRED_COL_ORDER = [
  '_id',
  'machine',
  'location',
  'locationSession',
  'meterSource',
  'isRamClear',
  'isSupplemental',
  'readAt',
  'createdAt',
  'updatedAt',
  'deletedAt',
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
  for (const col of PREFERRED_COL_ORDER) result.push(col);
  for (const col of seen) {
    if (!PREFERRED_COL_ORDER.includes(col)) result.push(col);
  }
  for (const col of movCols) result.push(col);
  return result;
}

function getCellValue(meter: RawMeterDoc, col: string): unknown {
  if (col.startsWith('movement.')) {
    const sub = col.slice('movement.'.length);
    return (meter.movement as Record<string, unknown> | undefined)?.[sub];
  }
  return meter[col];
}

const TIME_PERIODS: TimePeriod[] = ['Today', 'Yesterday', '7d', '30d', 'All Time', 'Custom'];

export default function CabinetsDetailsDeveloperTools({
  cabinetId,
  refreshTrigger,
}: CabinetsDetailsDeveloperToolsProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [meters, setMeters] = useState<RawMeterDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [displayPage, setDisplayPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DISPLAY_PAGE_SIZE = 20;
  const API_BATCH_SIZE = 100;

  // ============================================================================
  // Data fetching
  // ============================================================================
  const fetchMeters = useCallback(
    async (period: TimePeriod, from: string, to: string, apiPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        let range: { startDate?: Date; endDate?: Date } = {};
        if (period === 'Custom') {
          if (from) range.startDate = new Date(from);
          if (to) range.endDate = new Date(to);
        } else {
          range = getDateRange(period);
        }
        if (range.startDate) params.set('startDate', range.startDate.toISOString());
        if (range.endDate) params.set('endDate', range.endDate.toISOString());
        params.set('apiPage', String(apiPage));

        const { data } = await axios.get<{
          success: boolean;
          data: RawMeterDoc[];
          total: number;
          apiPage: number;
          hasMore: boolean;
        }>(`/api/cabinets/${cabinetId}/meters?${params.toString()}`);

        if (data.success) {
          setMeters(data.data);
          setTotal(data.total);
          setDisplayPage(0);
        } else {
          setError('API returned failure');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [cabinetId]
  );

  // Auto-fetch on mount, whenever non-custom period changes, or on external refresh
  useEffect(() => {
    if (timePeriod !== 'Custom') {
      fetchMeters(timePeriod, '', '');
    }
  }, [timePeriod, fetchMeters, refreshTrigger]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleCustomApply = useCallback(() => {
    fetchMeters('Custom', customFrom, customTo);
  }, [fetchMeters, customFrom, customTo]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleDisplayPageChange = useCallback(
    (zeroBased: number) => {
      const apiPage = Math.floor((zeroBased * DISPLAY_PAGE_SIZE) / API_BATCH_SIZE) + 1;
      const currentApiPage = Math.floor((displayPage * DISPLAY_PAGE_SIZE) / API_BATCH_SIZE) + 1;
      if (apiPage !== currentApiPage) {
        fetchMeters(timePeriod, customFrom, customTo, apiPage);
      } else {
        setDisplayPage(zeroBased);
      }
    },
    [displayPage, timePeriod, customFrom, customTo, fetchMeters]
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
  const totalDisplayPages = Math.ceil(Math.min(total, API_BATCH_SIZE) / DISPLAY_PAGE_SIZE);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {/* Time period filters */}
      <div className="rounded-lg border border-border bg-buttonInactive/30 p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-grayHighlight">
          Filters
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {TIME_PERIODS.map(period => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                timePeriod === period
                  ? 'bg-buttonActive text-white'
                  : 'bg-muted text-grayHighlight hover:bg-muted/80'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {timePeriod === 'Custom' && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-grayHighlight">From</span>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="rounded border border-border bg-container px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-grayHighlight">To</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="rounded border border-border bg-container px-2 py-1 text-sm"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={loading}
              className="rounded bg-buttonActive px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Status line */}
      {!loading && !error && (
        <p className="text-xs text-grayHighlight">
          {total} meter{total !== 1 ? 's' : ''} total
        </p>
      )}
      {loading && (
        <MetersTableSkeleton />
      )}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Table */}
      {!loading && total > 0 && (
        <div className="max-w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-buttonInactive/50">
                {columns.map(col => (
                  <th
                    key={col}
                    className="whitespace-nowrap border-r border-border px-3 py-2 text-left font-semibold text-grayHighlight last:border-r-0"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedMeters.map((meter, rowIndex) => (
                <tr
                  key={String(meter._id ?? rowIndex)}
                  className={`border-b border-border last:border-b-0 ${
                    meter.deletedAt
                      ? 'bg-red-50 opacity-70'
                      : rowIndex % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50/50'
                  }`}
                >
                  {columns.map(col => {
                    const value = getCellValue(meter, col);
                    const display = formatCellValue(col, value);
                    return (
                      <td
                        key={col}
                        className={`whitespace-nowrap border-r border-border px-3 py-2 last:border-r-0 ${
                          col === '_id' ? 'font-mono text-[10px] text-grayHighlight' : ''
                        } ${col === 'deletedAt' && value != null ? 'font-medium text-red-600' : ''}`}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <PaginationControls
          currentPage={displayPage}
          totalPages={totalDisplayPages}
          totalCount={total}
          setCurrentPage={handleDisplayPageChange}
        />
      )}

      {!loading && total === 0 && !error && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border text-sm text-grayHighlight">
          No meters found for the selected period.
        </div>
      )}
    </div>
  );
}
