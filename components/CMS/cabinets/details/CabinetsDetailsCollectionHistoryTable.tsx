/**
 * Cabinets Details Collection History Table
 *
 * Displays collection meter history for a machine. Computes movement (Drop,
 * Payout, Gross) from raw meter deltas and renders a sortable desktop table
 * and stacked mobile cards. Supports time-based filtering, pagination, and
 * inline edit/delete for admin/manager roles.
 *
 * @module components/CMS/cabinets/details/CabinetsDetailsCollectionHistoryTable
 */

'use client';

import { FC, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, buttonVariants } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';
import { ModernDateRangePicker } from '@/components/shared/ui/ModernDateRangePicker';
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
import { ConfirmationDialog } from '@/components/shared/ui/ConfirmationDialog';
import { Input } from '@/components/shared/ui/input';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { useUserStore } from '@/lib/store/userStore';
import { gsap } from 'gsap';
import axios from 'axios';
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

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
  machineId?: string;
  reportVersion?: number;
};

type EnrichedRow = CollectionData & {
  drop: number;
  payout: number;
  gross: number;
};

type SortField =
  | 'timestamp'
  | 'metersIn'
  | 'metersOut'
  | 'drop'
  | 'payout'
  | 'gross';
type SortDirection = 'asc' | 'desc' | null;

export type TimeFilter =
  | 'all'
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | '1y'
  | '2y'
  | 'custom';

type CabinetsDetailsCollectionHistoryTableProps = {
  data: CollectionData[];
  defaultTimeFilter?: TimeFilter;
  customRange?: { from: Date; to: Date };
  onRefresh?: () => void;
};

// ============================================================================
// Helper Components
// ============================================================================

const formatLargeNumber = (num: number): string => {
  if (num === 0) return '0';
  if (Math.abs(num) < 1_000_000) return num.toLocaleString();
  if (Math.abs(num) < 1_000_000_000)
    return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) < 1_000_000_000_000)
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  return `${(num / 1_000_000_000_000).toFixed(1)}T`;
};

const SmartNumber: FC<{ value: number; className?: string }> = ({
  value,
  className,
}) => {
  const full = value.toLocaleString();
  const compact = formatLargeNumber(value);
  const abbreviated = Math.abs(value) >= 100_000_000;

  if (!abbreviated) {
    return <span className={className}>{full}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'cursor-help underline decoration-dotted underline-offset-2',
            className
          )}
        >
          {compact}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-mono text-sm">{full}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const VersionBadge: FC<{ version?: number }> = ({ version }) => (
  <span
    className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
      version === 2
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        : 'bg-muted text-muted-foreground'
    )}
  >
    V{version ?? 1}
  </span>
);

// ============================================================================
// Edit Panel (Portal slide-in from right)
// ============================================================================

type EditFormData = { metersIn: number; metersOut: number; prevIn: number; prevOut: number };

type EditCollectionPanelProps = {
  open: boolean;
  entry: CollectionData | null;
  formData: EditFormData;
  onChange: (data: EditFormData) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  grossClass: (v: number) => string;
};

const EditCollectionPanel: FC<EditCollectionPanelProps> = ({
  open,
  entry,
  formData,
  onChange,
  onSubmit,
  onClose,
  grossClass,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && panelRef.current && backdropRef.current) {
      gsap.fromTo(panelRef.current, { x: '100%' }, { x: '0%', duration: 0.35, ease: 'power3.out' });
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    }
  }, [open]);

  if (!open || !entry) return null;

  const drop = formData.metersIn - formData.prevIn;
  const payout = formData.metersOut - formData.prevOut;
  const gross = drop - payout;

  const stats = [
    { label: 'Drop', value: drop, colored: false },
    { label: 'Payout', value: payout, colored: false },
    { label: 'Gross', value: gross, colored: true },
  ];

  const fields: Array<{ key: keyof EditFormData; label: string; sub: string }> = [
    { key: 'metersIn', label: 'Meters In', sub: 'collected' },
    { key: 'metersOut', label: 'Meters Out', sub: 'collected' },
    { key: 'prevIn', label: 'Prev. In', sub: 'baseline' },
    { key: 'prevOut', label: 'Prev. Out', sub: 'baseline' },
  ];

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[100000]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        style={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-container shadow-2xl"
        style={{ transform: 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-border bg-button px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Edit Collection Entry</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
                    entry.reportVersion === 2
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/80'
                  )}
                >
                  V{entry.reportVersion ?? 1}
                </span>
              </div>
              <span className="text-xs text-white/60">
                {new Date(entry.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-1 p-5">
            {/* 2×2 input grid */}
            <div className="grid grid-cols-2 gap-3">
              {fields.map(({ key, label, sub }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-grayHighlight/60">
                      {sub}
                    </span>
                    <span className="text-sm font-semibold text-grayHighlight">{label}</span>
                  </div>
                  <Input
                    type="number"
                    value={formData[key]}
                    onChange={e => onChange({ ...formData, [key]: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
              ))}
            </div>

            {/* Movement stats */}
            <div className="mt-5 rounded-lg border border-border bg-buttonInactive/30 p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-grayHighlight/50">
                Live Movement
              </p>
              <div className="grid grid-cols-3 divide-x divide-border">
                {stats.map(({ label, value, colored }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5 px-2 first:pl-0 last:pr-0">
                    <span className="text-[11px] text-grayHighlight/60">{label}</span>
                    <span
                      className={cn(
                        'font-mono text-xl font-bold tabular-nums',
                        colored ? grossClass(value) : 'text-buttonActive'
                      )}
                    >
                      {value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-grayHighlight transition-colors hover:bg-buttonInactive/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-button px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-buttonActive"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function CabinetsDetailsCollectionHistoryTable({
  data,
  defaultTimeFilter = 'all',
  customRange,
  onRefresh,
}: CabinetsDetailsCollectionHistoryTableProps) {
  // ============================================================================
  // Store & Permissions
  // ============================================================================
  const user = useUserStore(state => state.user);
  const isDeveloper = (user?.roles ?? []).includes('developer');
  const isAdmin = (user?.roles ?? []).includes('admin');
  const isManager = (user?.roles ?? []).includes('manager');
  const canModifyHistory = isDeveloper || isAdmin || isManager;

  // ============================================================================
  // State
  // ============================================================================
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(defaultTimeFilter);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [isDeleting, setIsDeleting] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<CollectionData | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<CollectionData | null>(null);
  const [editFormData, setEditFormData] = useState({
    metersIn: 0,
    metersOut: 0,
    prevIn: 0,
    prevOut: 0,
  });

  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>({
    from: customRange?.from,
    to: customRange?.to,
  });

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (entryToEdit) {
      setEditFormData({
        metersIn: entryToEdit.metersIn,
        metersOut: entryToEdit.metersOut,
        prevIn: entryToEdit.prevIn,
        prevOut: entryToEdit.prevOut,
      });
    }
  }, [entryToEdit]);

  useEffect(() => {
    if (defaultTimeFilter) setTimeFilter(defaultTimeFilter);
  }, [defaultTimeFilter]);

  useEffect(() => {
    if (customRange) setLocalDateRange({ from: customRange.from, to: customRange.to });
  }, [customRange]);

  useEffect(() => {
    setPage(0);
  }, [timeFilter]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleDeleteConfirm = async () => {
    if (!entryToDelete?.machineId) return;
    try {
      const res = await axios.patch(
        `/api/cabinets/${entryToDelete.machineId}/collection-history`,
        { operation: 'delete', entryId: entryToDelete._id }
      );
      if (res.data.success) {
        toast.success('Collection entry deleted');
        onRefresh?.();
        setIsDeleting(false);
        setEntryToDelete(null);
      } else {
        toast.error(res.data.error || 'Failed to delete entry');
      }
    } catch {
      toast.error('An error occurred while deleting');
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!entryToEdit?.machineId) return;
    try {
      const res = await axios.patch(
        `/api/cabinets/${entryToEdit.machineId}/collection-history`,
        {
          operation: 'update',
          entryId: entryToEdit._id,
          entry: {
            metersIn: Number(editFormData.metersIn),
            metersOut: Number(editFormData.metersOut),
            prevMetersIn: Number(editFormData.prevIn),
            prevMetersOut: Number(editFormData.prevOut),
            timestamp: entryToEdit.timestamp,
            locationReportId: entryToEdit.locationReportId,
          },
        }
      );
      if (res.data.success) {
        toast.success('Collection entry updated');
        onRefresh?.();
        setIsEditing(false);
        setEntryToEdit(null);
      } else {
        toast.error(res.data.error || 'Failed to update entry');
      }
    } catch {
      toast.error('An error occurred while updating');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev =>
        prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc'
      );
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0);
  };

  const openEdit = (row: CollectionData) => {
    setEntryToEdit(row);
    setIsEditing(true);
  };

  const openDelete = (row: CollectionData) => {
    setEntryToDelete(row);
    setIsDeleting(true);
  };

  // ============================================================================
  // Computed Data
  // ============================================================================
  const enriched = useMemo<EnrichedRow[]>(
    () =>
      data.map(row => ({
        ...row,
        drop: row.metersIn - row.prevIn,
        payout: row.metersOut - row.prevOut,
        gross:
          row.metersIn - row.prevIn - (row.metersOut - row.prevOut),
      })),
    [data]
  );

  const filteredAndSorted = useMemo<EnrichedRow[]>(() => {
    let filtered = [...enriched];

    if (timeFilter !== 'all') {
      const tz = 'America/Port_of_Spain';
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(now);
      const year = parseInt(parts.find(p => p.type === 'year')!.value);
      const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
      const day = parseInt(parts.find(p => p.type === 'day')!.value);

      let start: Date;
      let end: Date;

      switch (timeFilter) {
        case 'today':
          start = new Date(Date.UTC(year, month, day, 4, 0, 0, 0));
          end = new Date(Date.UTC(year, month, day + 1, 3, 59, 59, 999));
          break;
        case 'yesterday':
          start = new Date(Date.UTC(year, month, day - 1, 4, 0, 0, 0));
          end = new Date(Date.UTC(year, month, day, 3, 59, 59, 999));
          break;
        case '7d':
          start = new Date(now.getTime() - 7 * 86_400_000);
          end = now;
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 86_400_000);
          end = now;
          break;
        case '90d':
          start = new Date(now.getTime() - 90 * 86_400_000);
          end = now;
          break;
        case '1y':
          start = new Date(now.getFullYear() - 1, 0, 1);
          end = now;
          break;
        case '2y':
          start = new Date(now.getFullYear() - 2, 0, 1);
          end = now;
          break;
        case 'custom': {
          start = localDateRange?.from ?? customRange?.from ?? new Date(0);
          const rawEnd = localDateRange?.to ?? customRange?.to ?? now;
          end = new Date(rawEnd);
          end.setHours(23, 59, 59, 999);
          break;
        }
        default:
          start = new Date(0);
          end = now;
      }

      filtered = filtered.filter(item => {
        const d = new Date(item.timestamp);
        return d >= start && d <= end;
      });
    }

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortField] as number | string | Date;
        const bVal = b[sortField] as number | string | Date;

        let diff = 0;
        if (sortField === 'timestamp') {
          diff = new Date(aVal).getTime() - new Date(bVal).getTime();
        } else {
          diff = (aVal as number) - (bVal as number);
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
    }

    return filtered;
  }, [enriched, timeFilter, sortField, sortDirection, localDateRange, customRange]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paged = useMemo(
    () => filteredAndSorted.slice(page * pageSize, (page + 1) * pageSize),
    [filteredAndSorted, page, pageSize]
  );

  // ============================================================================
  // Render Helpers
  // ============================================================================
  const SortIcon: FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field)
      return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    if (sortDirection === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
    if (sortDirection === 'desc')
      return <ChevronDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  };

  const SortableHead: FC<{
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }> = ({ field, children, className }) => (
    <TableHead
      className={cn(
        'cursor-pointer select-none whitespace-nowrap hover:bg-muted/60',
        sortField === field && 'text-foreground',
        className
      )}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  const reportHref = (row: CollectionData) =>
    row.reportVersion === 2
      ? `/collection-report/report/session/${row.locationReportId}`
      : `/collection-report/report/${row.locationReportId}`;

  const grossClass = (gross: number) =>
    gross > 0
      ? 'text-green-600 dark:text-green-400'
      : gross < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  // ============================================================================
  // Time Filter Pills
  // ============================================================================
  type PillDef = { value: TimeFilter; label: string; devOnly?: boolean };
  const pills: PillDef[] = [
    { value: 'all', label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D', devOnly: true },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: '2y', label: '2Y' },
    { value: 'custom', label: 'Custom' },
  ];

  // ============================================================================
  // Empty State
  // ============================================================================
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No collection history for this machine.
        </p>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <TooltipProvider>
      <div className="w-full space-y-4">

        {/* ── Filter Bar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {pills
                .filter(p => !p.devOnly || isDeveloper)
                .map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setTimeFilter(p.value)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      timeFilter === p.value
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {filteredAndSorted.length} / {data.length}
            </span>
          </div>

          {timeFilter === 'custom' && (
            <ModernDateRangePicker
              value={localDateRange}
              onChange={setLocalDateRange}
              hideGoButton
              onGo={() => undefined}
              onCancel={() => {
                setTimeFilter('all');
                setLocalDateRange(undefined);
              }}
              onSetLastMonth={() => {
                const now = new Date();
                setLocalDateRange({
                  from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                  to: new Date(now.getFullYear(), now.getMonth(), 0),
                });
              }}
            />
          )}
        </div>

        {/* ── Desktop Table (xl+) ────────────────────────────────────── */}
        <div className="hidden w-full overflow-x-auto xl:block">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <SortableHead field="timestamp" className="w-[155px] pl-3">
                  Date &amp; Time
                </SortableHead>
                <SortableHead field="metersIn" className="w-[105px] text-right">
                  Meters In
                </SortableHead>
                <SortableHead field="metersOut" className="w-[105px] text-right">
                  Meters Out
                </SortableHead>
                <SortableHead field="drop" className="w-[100px] text-right">
                  Drop
                </SortableHead>
                <SortableHead field="payout" className="w-[100px] text-right">
                  Payout
                </SortableHead>
                <SortableHead field="gross" className="w-[100px] text-right">
                  Gross
                </SortableHead>
                <TableHead className="w-[145px]">Report</TableHead>
                {canModifyHistory && (
                  <TableHead className="w-[80px] text-center">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row, index) => (
                <TableRow
                  key={`${row.locationReportId}-${row.timestamp}-${index}`}
                  className="group"
                >
                  {/* Date & Time */}
                  <TableCell className="py-2.5 pl-3">
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium">
                        {new Date(row.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(row.timestamp).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </TableCell>

                  {/* Meters In */}
                  <TableCell className="py-2.5 text-right font-mono text-sm">
                    <SmartNumber value={row.metersIn ?? 0} />
                  </TableCell>

                  {/* Meters Out */}
                  <TableCell className="py-2.5 text-right font-mono text-sm">
                    <SmartNumber value={row.metersOut ?? 0} />
                  </TableCell>

                  {/* Drop */}
                  <TableCell className="py-2.5 text-right font-mono text-sm">
                    <SmartNumber value={row.drop} />
                  </TableCell>

                  {/* Payout */}
                  <TableCell className="py-2.5 text-right font-mono text-sm">
                    <SmartNumber value={row.payout} />
                  </TableCell>

                  {/* Gross */}
                  <TableCell className="py-2.5 text-right font-mono text-sm">
                    <SmartNumber
                      value={row.gross}
                      className={cn('font-semibold', grossClass(row.gross))}
                    />
                  </TableCell>

                  {/* Report */}
                  <TableCell className="py-2.5">
                    {row.locationReportId && (
                      <div className="flex items-center gap-1.5">
                        <VersionBadge version={row.reportVersion} />
                        <a
                          href={reportHref(row)}
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'sm' }),
                            'h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground'
                          )}
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </TableCell>

                  {/* Actions */}
                  {canModifyHistory && (
                    <TableCell className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => openDelete(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ── Mobile Cards (<xl) ─────────────────────────────────────── */}
        <div className="w-full space-y-2 xl:hidden">
          {paged.map((row, index) => (
            <div
              key={`mobile-${row.locationReportId}-${row.timestamp}-${index}`}
              className="rounded-lg border bg-card shadow-sm"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">
                    {new Date(row.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(row.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
                {row.locationReportId && (
                  <div className="flex items-center gap-2">
                    <VersionBadge version={row.reportVersion} />
                    <a
                      href={reportHref(row)}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'h-7 gap-1 px-2.5 text-xs'
                      )}
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="px-4 py-3">
                {/* Raw meters row */}
                <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Meters In
                    </p>
                    <p className="font-mono text-sm font-medium">
                      <SmartNumber value={row.metersIn ?? 0} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Meters Out
                    </p>
                    <p className="font-mono text-sm font-medium">
                      <SmartNumber value={row.metersOut ?? 0} />
                    </p>
                  </div>
                </div>

                {/* Movement row */}
                <div className="grid grid-cols-3 gap-x-2 rounded-md bg-muted/40 px-3 py-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Drop
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      <SmartNumber value={row.drop} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Payout
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      <SmartNumber value={row.payout} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Gross
                    </p>
                    <p className={cn('font-mono text-sm font-bold', grossClass(row.gross))}>
                      <SmartNumber value={row.gross} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer — actions */}
              {canModifyHistory && (
                <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => openDelete(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          setCurrentPage={setPage}
          totalCount={filteredAndSorted.length}
          showTotalCount={false}
        />

        {/* ── Dialogs ────────────────────────────────────────────────── */}
        <ConfirmationDialog
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setEntryToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Collection Entry"
          message="Are you sure you want to permanently delete this collection entry? This action cannot be undone."
          confirmText="Yes, Delete"
          cancelText="Cancel"
        />

        <EditCollectionPanel
          open={isEditing}
          entry={entryToEdit}
          formData={editFormData}
          onChange={setEditFormData}
          onSubmit={handleEditSubmit}
          onClose={() => setIsEditing(false)}
          grossClass={grossClass}
        />
      </div>
    </TooltipProvider>
  );
}
