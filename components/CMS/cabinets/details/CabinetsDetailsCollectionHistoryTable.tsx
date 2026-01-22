/**
 * Cabinets Details Collection History Table Component
 * Table component for displaying cabinet collection history with sorting and navigation.
 *
 * Features:
 * - Collection history display with meters in/out
 * - Sortable columns
 * - Navigation to collection report details
 * - Large number formatting with tooltips
 * - Responsive design
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { ModernDateRangePicker } from '@/components/shared/ui/ModernDateRangePicker';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import { useUserStore } from '@/lib/store/userStore';
import {
  AlertCircle,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

// ============================================================================
// Helper Functions
// ============================================================================

const formatLargeNumber = (num: number): string => {
  if (num === 0) return '0';
  if (num < 1000) return num.toLocaleString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num < 1000000000000) return `${(num / 1000000000).toFixed(1)}B`;
  return `${(num / 1000000000000).toFixed(1)}T`;
};

const SmartNumberDisplay: React.FC<{ value: number }> = ({ value }) => {
  const formattedFull = value.toLocaleString();
  const formattedCompact = formatLargeNumber(value);
  const shouldAbbreviate = value >= 1000;
  const displayValue = shouldAbbreviate ? formattedCompact : formattedFull;

  if (!shouldAbbreviate) {
    return <span>{displayValue}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            {displayValue}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-mono text-sm">{formattedFull}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================================================
// Types
// ============================================================================

type CollectionData = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  locationReportId: string;
};

type SortField = 'timestamp' | 'metersIn' | 'metersOut' | 'prevIn' | 'prevOut';
type SortDirection = 'asc' | 'desc' | null;
type TimeFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d' | '90d' | '1y' | '2y' | 'custom';

type CabinetsDetailsCollectionHistoryTableProps = {
  data: CollectionData[];
  machineId?: string;
  onFixHistory?: () => void;
  isFixing?: boolean;
  hasIssues?: boolean;
  isCheckingIssues?: boolean;
  issuesMap?: Record<string, string>;
  defaultTimeFilter?: TimeFilter;
  customRange?: { from: Date; to: Date };
};

export function CabinetsDetailsCollectionHistoryTable({
  data,
  machineId,
  onFixHistory,
  isFixing = false,
  hasIssues = false,
  isCheckingIssues = false,
  issuesMap = {},
  defaultTimeFilter = 'all',
  customRange,
}: CabinetsDetailsCollectionHistoryTableProps) {
  const router = useRouter();
  const user = useUserStore(state => state.user);
  const isDeveloper = (user?.roles || []).includes('developer');

  const [timeFilter, setTimeFilter] = useState<TimeFilter>(defaultTimeFilter);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Local state for custom date range picker
  const [localDateRange, setLocalDateDateRange] = useState<DateRange | undefined>({
    from: customRange?.from,
    to: customRange?.to
  });

  // Sync with defaultTimeFilter when it changes globally
  React.useEffect(() => {
    if (defaultTimeFilter) {
      setTimeFilter(defaultTimeFilter);
    }
  }, [defaultTimeFilter]);

  // Sync local dates with global range if provided
  React.useEffect(() => {
    if (customRange) {
      setLocalDateDateRange({
        from: customRange.from,
        to: customRange.to
      });
    }
  }, [customRange]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    if (timeFilter !== 'all') {
      const tz = 'America/Port_of_Spain';
      const now = new Date();
      
      // Get current date parts in target timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const parts = formatter.formatToParts(now);
      const year = parseInt(parts.find(p => p.type === 'year')!.value);
      const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
      const day = parseInt(parts.find(p => p.type === 'day')!.value);

      let startDate: Date;
      let endDate: Date;

      switch (timeFilter) {
        case 'today':
          // AST 00:00:00 = UTC 04:00:00 (AST is UTC-4)
          // We use UTC 04:00:00 because the server pre-adjusts dates by -4 hours 
          // AND the data is stored as AST 00:00:00.
          // Wait, if the server ALREADY adjusted it to AST, we should compare against AST boundaries.
          startDate = new Date(Date.UTC(year, month, day, 4, 0, 0, 0));
          endDate = new Date(Date.UTC(year, month, day + 1, 3, 59, 59, 999));
          break;
        case 'yesterday':
          startDate = new Date(Date.UTC(year, month, day - 1, 4, 0, 0, 0));
          endDate = new Date(Date.UTC(year, month, day, 3, 59, 59, 999));
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = new Date();
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = new Date();
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          endDate = new Date();
          break;
        case '1y':
          // Start of the previous calendar year to be more inclusive
          startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
          endDate = new Date();
          break;
        case '2y':
          // Going back 2 full calendar years
          startDate = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0);
          endDate = new Date();
          break;
        case 'custom':
          startDate = localDateRange?.from || customRange?.from || new Date(0);
          endDate = localDateRange?.to || customRange?.to || new Date();
          
          // Ensure end date includes the whole day if manually picked
          if (localDateRange?.to) {
            endDate = new Date(localDateRange.to);
            endDate.setHours(23, 59, 59, 999);
          }
          break;
        default:
          startDate = new Date(0);
          endDate = new Date();
      }

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField as keyof CollectionData];
        let bValue: any = b[sortField as keyof CollectionData];

        if (aValue === undefined || aValue === null) aValue = 0;
        if (bValue === undefined || bValue === null) bValue = 0;

        if (sortField === 'timestamp') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortDirection === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [data, timeFilter, sortField, sortDirection, customRange, localDateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / pageSize));
  const paged = useMemo(
    () => filteredAndSortedData.slice((page - 1) * pageSize, page * pageSize),
    [filteredAndSortedData, page]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
      } else {
        setSortDirection('desc');
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    if (sortDirection === 'asc') return <ChevronUp className="h-4 w-4" />;
    if (sortDirection === 'desc') return <ChevronDown className="h-4 w-4" />;
    return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
  };

  React.useEffect(() => {
    setPage(1);
  }, [timeFilter]);

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-grayHighlight">
          No collection history data found for this machine.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by time:</span>
            <Select
              value={timeFilter}
              onValueChange={(value: TimeFilter) => setTimeFilter(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                {isDeveloper && <SelectItem value="30d">Last 30 days</SelectItem>}
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="2y">Last 2 years</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Custom Date Picker */}
          {timeFilter === 'custom' && (
            <div className="flex flex-col gap-2">
              <ModernDateRangePicker
                value={localDateRange}
                onChange={setLocalDateDateRange}
                hideGoButton={true}
                onGo={() => {
                  // The filtering is reactive to localDateRange, so this just acts as a confirmation/close
                  // If we want it to ONLY filter on Go, we'd need another state layer.
                  // But standard behavior in this app is reactive.
                }}
                onCancel={() => {
                  setTimeFilter('all');
                  setLocalDateDateRange(undefined);
                }}
                onSetLastMonth={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                  setLocalDateDateRange({ from: firstDay, to: lastDay });
                }}
              />
            </div>
          )}

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4 ml-auto">
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedData.length} of {data.length} entries
            </div>
            {machineId && onFixHistory && hasIssues && (
              <Button
                onClick={onFixHistory}
                disabled={isFixing || isCheckingIssues}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                {isCheckingIssues ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Checking...
                  </>
                ) : isFixing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Fixing...
                  </>
                ) : (
                  <>🔧 Fix History</>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="hidden w-full overflow-x-auto xl:block">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="w-[160px] cursor-pointer select-none px-2 text-left hover:bg-muted/50"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-1">
                    Time
                    {getSortIcon('timestamp')}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[85px] cursor-pointer select-none px-2 text-left hover:bg-muted/50"
                  onClick={() => handleSort('metersIn')}
                >
                  <div className="flex items-center gap-1">
                    Meters In
                    {getSortIcon('metersIn')}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[85px] cursor-pointer select-none px-2 text-left hover:bg-muted/50"
                  onClick={() => handleSort('metersOut')}
                >
                  <div className="flex items-center gap-1">
                    Meters Out
                    {getSortIcon('metersOut')}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[85px] cursor-pointer select-none px-2 text-left hover:bg-muted/50"
                  onClick={() => handleSort('prevIn')}
                >
                  <div className="flex items-center gap-1">
                    Prev. In
                    {getSortIcon('prevIn')}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[85px] cursor-pointer select-none px-2 text-left hover:bg-muted/50"
                  onClick={() => handleSort('prevOut')}
                >
                  <div className="flex items-center gap-1">
                    Prev. Out
                    {getSortIcon('prevOut')}
                  </div>
                </TableHead>
                <TableHead className="w-[110px] px-2 text-left">
                  Collection Report
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row, index) => {
                const hasIssue = row.locationReportId && issuesMap[row.locationReportId];
                return (
                  <TableRow
                    key={`${row.locationReportId}-${row.timestamp}-${index}`}
                    className={hasIssue ? 'bg-red-50/50 hover:bg-red-100/50' : ''}
                  >
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2">
                        {hasIssue && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-help">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="z-50 max-w-xs bg-slate-900 text-white">
                              <p className="text-xs">{issuesMap[row.locationReportId]}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span className="truncate">
                          {new Date(row.timestamp).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="truncate px-2 text-left">
                      <SmartNumberDisplay value={row.metersIn || 0} />
                    </TableCell>
                    <TableCell className="truncate px-2 text-left">
                      <SmartNumberDisplay value={row.metersOut || 0} />
                    </TableCell>
                    <TableCell className="truncate px-2 text-left">
                      <SmartNumberDisplay value={row.prevIn || 0} />
                    </TableCell>
                    <TableCell className="truncate px-2 text-left">
                      <SmartNumberDisplay value={row.prevOut || 0} />
                    </TableCell>
                    <TableCell className="truncate px-2 text-left">
                      {row.locationReportId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2 py-1 text-xs"
                          onClick={() => router.push(`/collection-report/report/${row.locationReportId}`)}
                        >
                          VIEW REPORT
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="w-full space-y-3 xl:hidden">
          {paged.map((row, index) => {
            const hasIssue = row.locationReportId && issuesMap[row.locationReportId];
            return (
              <Card
                key={`${row.locationReportId}-${row.timestamp}-${index}`}
                className={hasIssue ? 'border-red-500 bg-red-50/50' : ''}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2">
                      Collection Entry
                      {hasIssue && <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hasIssue && (
                    <div className="rounded border border-red-300 bg-red-100 p-2 text-xs leading-tight text-red-800">
                      <strong className="block pb-1">⚠️ Issue:</strong>
                      <span className="break-words">{issuesMap[row.locationReportId]}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Meters In:</span>
                      <span className="font-semibold"><SmartNumberDisplay value={row.metersIn || 0} /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Meters Out:</span>
                      <span className="font-semibold"><SmartNumberDisplay value={row.metersOut || 0} /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Prev. In:</span>
                      <span className="font-semibold"><SmartNumberDisplay value={row.prevIn || 0} /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Prev. Out:</span>
                      <span className="font-semibold"><SmartNumberDisplay value={row.prevOut || 0} /></span>
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    {new Date(row.timestamp).toLocaleString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </div>
                  {row.locationReportId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/collection-report/report/${row.locationReportId}`)}
                    >
                      VIEW REPORT
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>{'<<'}</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>{'<'}</Button>
          <span className="px-2 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>{'>'}</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>{'>>'}</Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

