'use client';

import type { ActivityLog } from '@/shared/types/activityLog';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { safeFormatDate } from '@/lib/utils/formatting';
import { isIdValue, resolveIdToName } from '@/lib/utils/id';
import { formatValue } from '@/lib/utils/date';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

type ResolvedChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

type AdministrationActivityLogDescriptionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  log: ActivityLog | null;
  searchMode: 'username' | 'email' | 'description' | '_id';
};

function RenderAuditValue({
  value,
  type,
}: {
  value: string;
  type: 'before' | 'after';
}) {
  if (
    !value ||
    value === '—' ||
    value === 'Not set' ||
    value === 'Empty object' ||
    value === 'Empty array' ||
    value === 'Empty'
  ) {
    return <span className="italic text-gray-400">{value || '—'}</span>;
  }

  // Check if it is a comma-separated key-value pairs string (e.g. "Key1: Val1, Key2: Val2")
  if (value.includes(', ') && value.includes(': ')) {
    const items = value.split(', ');
    const pairs = items.map(item => {
      const idx = item.indexOf(': ');
      if (idx !== -1) {
        return {
          key: item.substring(0, idx).trim(),
          val: item.substring(idx + 2).trim(),
        };
      }
      return { key: '', val: item.trim() };
    });

    // Check if the majority of items had a key-value colon structure
    const hasKeys = pairs.filter(p => p.key !== '').length >= items.length / 2;

    if (hasKeys) {
      return (
        <div className="border-gray-150/70 overflow-hidden rounded border bg-white shadow-sm">
          <table className="w-full table-fixed text-[10px] leading-tight">
            <tbody>
              {pairs.map((p, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-slate-50/50"
                >
                  <td className="w-5/12 break-words border-r border-gray-100 bg-gray-50/30 px-2 py-1.5 font-semibold text-gray-500">
                    {p.key || 'Item'}
                  </td>
                  <td
                    className={`w-7/12 break-words px-2 py-1.5 font-medium ${type === 'before' ? 'bg-rose-50/10 text-rose-700' : 'bg-emerald-50/10 text-emerald-700'}`}
                  >
                    {p.val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // Default rendering (as simple text)
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {value}
    </div>
  );
}

const ACTION_CONFIG: Record<
  string,
  { header: string; badge: string; dot: string }
> = {
  create: {
    header: 'bg-emerald-600',
    badge: 'bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/30',
    dot: 'bg-emerald-300',
  },
  update: {
    header: 'bg-blue-600',
    badge: 'bg-blue-500/25 text-blue-100 ring-1 ring-blue-400/30',
    dot: 'bg-blue-300',
  },
  delete: {
    header: 'bg-rose-600',
    badge: 'bg-rose-500/25 text-rose-100 ring-1 ring-rose-400/30',
    dot: 'bg-rose-300',
  },
  login: {
    header: 'bg-green-600',
    badge: 'bg-green-500/25 text-green-100 ring-1 ring-green-400/30',
    dot: 'bg-green-300',
  },
  logout: {
    header: 'bg-slate-600',
    badge: 'bg-slate-500/25 text-slate-100 ring-1 ring-slate-400/30',
    dot: 'bg-slate-300',
  },
  default: {
    header: 'bg-slate-600',
    badge: 'bg-slate-500/25 text-slate-100 ring-1 ring-slate-400/30',
    dot: 'bg-slate-300',
  },
};

const RESOURCE_BADGE: Record<string, string> = {
  user: 'bg-indigo-100 text-indigo-700',
  machine: 'bg-orange-100 text-orange-700',
  cabinet: 'bg-orange-100 text-orange-700',
  location: 'bg-teal-100 text-teal-700',
  collection: 'bg-yellow-100 text-yellow-700',
  'collection-report': 'bg-yellow-100 text-yellow-700',
  collection_report: 'bg-yellow-100 text-yellow-700',
  member: 'bg-pink-100 text-pink-700',
  licencee: 'bg-cyan-100 text-cyan-700',
  country: 'bg-lime-100 text-lime-700',
  session: 'bg-violet-100 text-violet-700',
};

function formatFieldLabel(field: string) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/\./g, ' › ')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="ml-1 inline-flex shrink-0 items-center rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function parseMachineDetail(value: string) {
  const parts = value.split(': In: ');
  const name = parts[0] || 'Unknown Machine';
  const rest = parts[1] || '';

  const outParts = rest.split(', Out: ');
  const metersIn = outParts[0] || '—';
  const afterIn = outParts[1] || '';

  let metersOut = afterIn;
  let details = '';
  let notes = '';

  if (afterIn.includes(' (')) {
    const idx = afterIn.indexOf(' (');
    metersOut = afterIn.substring(0, idx);
    details = afterIn.substring(idx + 2);
    if (details.endsWith(')')) {
      details = details.slice(0, -1);
    }
  } else if (afterIn.includes(', Notes: ')) {
    const idx = afterIn.indexOf(', Notes: ');
    metersOut = afterIn.substring(0, idx);
    notes = afterIn.substring(idx + 9);
  }

  if (details && details.includes('), Notes: ')) {
    const idx = details.indexOf('), Notes: ');
    notes = details.substring(idx + 10);
    details = details.substring(0, idx);
  }

  return {
    name,
    metersIn,
    metersOut,
    details: details || null,
    notes: notes || null,
  };
}

function MetaRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
}) {
  if (!value || value === 'N/A' || value === 'unknown') return null;
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center">
        <span
          className={`min-w-0 break-all text-xs text-gray-800 ${mono ? 'font-mono' : 'font-medium'}`}
        >
          {value}
        </span>
        {copyable && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t px-5 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function CollectionReportView({ log }: { log: ActivityLog }) {
  // Extract data from newData if available
  const data = (log.newData || log.metadata?.newData || {}) as Record<
    string,
    unknown
  >;
  const hasNewData = Object.keys(data).length > 0;

  // Fallback parsing from changes if newData is not available
  const changes = log.changes || [];

  const getFieldValue = (field: string, fallback: unknown = 0): unknown => {
    if (hasNewData && data[field] !== undefined) {
      return data[field];
    }
    const match = changes.find(c => c.field === field);
    return match ? match.newValue : fallback;
  };

  const getNumericValue = (field: string, fallback = 0): number => {
    const val = getFieldValue(field, fallback);
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  const amountCollected = getNumericValue('amountCollected');
  const amountToCollect = getNumericValue('amountToCollect');
  const variance = getNumericValue('variance');
  const partnerProfit = getNumericValue('partnerProfit');
  const taxes = getNumericValue('taxes');
  const advance = getNumericValue('advance');
  const totalDrop = getNumericValue('totalDrop');
  const totalCancelled = getNumericValue('totalCancelled');
  const totalGross = getNumericValue('totalGross');
  const totalSasGross = getNumericValue('totalSasGross');
  const locationProfitPerc = getNumericValue('locationProfitPerc');
  const balanceCorrection = getNumericValue('balanceCorrection');

  const varianceReason =
    String(getFieldValue('varianceReason', '') || '') || null;
  const reasonShortagePayment =
    String(getFieldValue('reasonShortagePayment', '') || '') || null;
  const balanceCorrectionReas =
    String(getFieldValue('balanceCorrectionReas', '') || '') || null;

  // Extract machines
  let machinesList: Array<{
    name: string;
    metersIn: number;
    metersOut: number;
    prevIn?: number;
    prevOut?: number;
    ramClear: boolean;
    ramClearMetersIn?: number;
    ramClearMetersOut?: number;
    notes?: string | null;
  }> = [];

  if (hasNewData && Array.isArray(data.machines)) {
    machinesList = (data.machines as Array<Record<string, unknown>>).map(m => {
      const customName = String(m.customName || m.machineCustomName || '');
      const manuf = String(m.manuf || '');
      const serialNumber = String(m.serialNumber || '');
      let resolvedName = String(m.displayName || '');
      if (!resolvedName && serialNumber) {
        const parts = [customName, manuf].filter(Boolean);
        resolvedName =
          parts.length > 0
            ? `${serialNumber} (${parts.join(', ')})`
            : serialNumber;
      }
      if (!resolvedName)
        resolvedName = String(m.machineName || m.machineId || 'Machine');
      return {
        name: resolvedName,
        metersIn: Number(m.metersIn || 0),
        metersOut: Number(m.metersOut || 0),
        prevIn:
          m.prevMetersIn !== undefined
            ? Number(m.prevMetersIn)
            : m.prevIn !== undefined
              ? Number(m.prevIn)
              : undefined,
        prevOut:
          m.prevMetersOut !== undefined
            ? Number(m.prevMetersOut)
            : m.prevOut !== undefined
              ? Number(m.prevOut)
              : undefined,
        ramClear: Boolean(m.ramClear || false),
        ramClearMetersIn:
          m.ramClearMetersIn !== undefined
            ? Number(m.ramClearMetersIn)
            : undefined,
        ramClearMetersOut:
          m.ramClearMetersOut !== undefined
            ? Number(m.ramClearMetersOut)
            : undefined,
        notes: m.notes ? String(m.notes) : null,
      };
    });
  } else {
    // Parse from changes machine_X_details
    const machineChanges = changes.filter(c =>
      c.field.match(/^machine_\d+_details$/)
    );
    machinesList = machineChanges.map(c => {
      const parsed = parseMachineDetail(String(c.newValue));
      let prevIn = undefined;
      let prevOut = undefined;
      const prevMatch = parsed.details?.match(
        /Prev:\s*(\d+)\s*In,\s*(\d+)\s*Out/
      );
      if (prevMatch) {
        prevIn = Number(prevMatch[1]);
        prevOut = Number(prevMatch[2]);
      }
      return {
        name: parsed.name,
        metersIn: Number(parsed.metersIn),
        metersOut: Number(parsed.metersOut),
        prevIn,
        prevOut,
        ramClear: String(c.newValue).includes('RAM Cleared'),
        notes: parsed.notes,
      };
    });
  }

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <div className="space-y-5">
      {/* Overview stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-300 bg-gray-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Collected
          </p>
          <p className="text-sm font-bold text-gray-800">
            {formatCurrency(amountCollected)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-300 bg-gray-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Expected
          </p>
          <p className="text-sm font-semibold text-gray-800">
            {formatCurrency(amountToCollect)}
          </p>
        </div>
        <div
          className={`rounded-lg border-2 p-3 ${variance < 0 ? 'border-red-300 bg-red-50/50' : 'border-green-300 bg-green-50/50'}`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider ${variance < 0 ? 'text-red-500' : 'text-green-500'}`}
          >
            Variance
          </p>
          <p
            className={`text-sm font-bold ${variance < 0 ? 'text-red-700' : 'text-green-700'}`}
          >
            {variance > 0 ? '+' : ''}
            {formatCurrency(variance)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-300 bg-gray-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Partner Profit
          </p>
          <p className="text-sm font-semibold text-gray-800">
            {formatCurrency(partnerProfit)}
          </p>
        </div>
      </div>

      {/* Additional details grid */}
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-2.5">
          <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Taxes
          </span>
          <span className="font-semibold text-gray-700">
            {formatCurrency(taxes)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-2.5">
          <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Advance
          </span>
          <span className="font-semibold text-gray-700">
            {formatCurrency(advance)}
          </span>
        </div>
        {balanceCorrection !== 0 && (
          <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-2.5">
            <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              Correction
            </span>
            <span className="font-semibold text-gray-700">
              {formatCurrency(balanceCorrection)}
            </span>
          </div>
        )}
        {locationProfitPerc > 0 && (
          <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-2.5">
            <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              Profit Split
            </span>
            <span className="font-semibold text-gray-700">
              {locationProfitPerc}%
            </span>
          </div>
        )}
      </div>

      {/* Operations Performance grid */}
      <div className="rounded-lg border border-slate-300 bg-white p-3">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Operations Summary
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <div>
            <p className="text-[9px] font-medium text-gray-400">Total Drop</p>
            <p className="font-semibold text-gray-800">
              {formatCurrency(totalDrop)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium text-gray-400">
              Total Cancelled
            </p>
            <p className="font-semibold text-gray-800">
              {formatCurrency(totalCancelled)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium text-gray-400">Total Gross</p>
            <p className="font-semibold text-gray-800">
              {formatCurrency(totalGross)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium text-gray-400">
              Total SAS Gross
            </p>
            <p className="font-semibold text-gray-800">
              {formatCurrency(totalSasGross)}
            </p>
          </div>
        </div>
      </div>

      {/* Reasons Alert box */}
      {(varianceReason || reasonShortagePayment || balanceCorrectionReas) && (
        <div className="space-y-2">
          {varianceReason && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-amber-800">
                Variance Reason
              </span>
              <p className="italic leading-relaxed text-amber-900">
                "{varianceReason}"
              </p>
            </div>
          )}
          {reasonShortagePayment && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-amber-800">
                Shortage / Payment Reason
              </span>
              <p className="italic leading-relaxed text-amber-900">
                "{reasonShortagePayment}"
              </p>
            </div>
          )}
          {balanceCorrectionReas && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-amber-800">
                Correction Reason
              </span>
              <p className="italic leading-relaxed text-amber-900">
                "{balanceCorrectionReas}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recorded Machines list */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Recorded Machines ({machinesList.length})
        </h4>

        <div className="grid gap-3 sm:grid-cols-2">
          {machinesList.map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-indigo-200 bg-indigo-50/10 p-3 shadow-sm transition-all hover:bg-white hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between border-b border-indigo-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-900">
                  {m.name}
                </span>
                {m.ramClear && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-red-700 ring-1 ring-red-500/20">
                    RAM Clear
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                    Current In
                  </p>
                  <p className="font-mono font-medium text-gray-800">
                    {m.metersIn.toLocaleString()}
                  </p>
                  {m.prevIn !== undefined && (
                    <p className="font-mono text-[9px] text-gray-400">
                      Prev: {m.prevIn.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                    Current Out
                  </p>
                  <p className="font-mono font-medium text-gray-800">
                    {m.metersOut.toLocaleString()}
                  </p>
                  {m.prevOut !== undefined && (
                    <p className="font-mono text-[9px] text-gray-400">
                      Prev: {m.prevOut.toLocaleString()}
                    </p>
                  )}
                </div>

                {m.ramClear &&
                  (m.ramClearMetersIn !== undefined ||
                    m.ramClearMetersOut !== undefined) && (
                    <div className="col-span-2 mt-1 rounded border border-red-100/50 bg-red-50/50 p-2 text-[10px]">
                      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
                        Meters Before RAM Clear
                      </p>
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div>
                          In: {m.ramClearMetersIn?.toLocaleString() || '—'}
                        </div>
                        <div>
                          Out: {m.ramClearMetersOut?.toLocaleString() || '—'}
                        </div>
                      </div>
                    </div>
                  )}

                {m.notes && (
                  <div className="col-span-2 mt-1 rounded border border-amber-100/50 bg-amber-50/50 p-2 text-[10px]">
                    <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-600">
                      Machine Notes
                    </p>
                    <p className="italic leading-relaxed text-amber-900">
                      "{m.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdministrationActivityLogDescriptionDialog({
  isOpen,
  onClose,
  log,
  searchMode,
}: AdministrationActivityLogDescriptionDialogProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [resolvedChanges, setResolvedChanges] = useState<ResolvedChange[]>([]);
  const [loading, setLoading] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (!isOpen || !log?.changes?.length) {
      setResolvedChanges([]);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const resolved = await Promise.all(
          log
            .changes!.filter(c => !isIdValue(c.newValue))
            .map(async c => ({
              field: c.field,
              oldValue: isIdValue(c.oldValue)
                ? await resolveIdToName(c.oldValue, c.field)
                : formatValue(c.oldValue, c.field),
              newValue: formatValue(c.newValue, c.field),
            }))
        );
        if (alive) setResolvedChanges(resolved);
      } catch {
        if (alive) setResolvedChanges([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isOpen, log]);

  // ============================================================================
  // Computed Values & Guards
  // ============================================================================
  if (!log) return null;

  const action = (log.action || 'unknown').toLowerCase();
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.default;
  const resourceKey = log.resource?.toLowerCase() ?? '';
  const resourceBadge =
    RESOURCE_BADGE[resourceKey] ?? 'bg-gray-100 text-gray-600';
  const description =
    log.description || log.details || 'No description available';
  const displayUsername =
    searchMode === 'email'
      ? log.actor?.email || log.username || ''
      : log.username || log.actor?.email || '';
  const displayEmail =
    log.actor?.email &&
    log.actor.email !== 'unknown' &&
    log.actor.email !== displayUsername
      ? log.actor.email
      : null;

  const generalChanges = resolvedChanges.filter(
    c => !c.field.match(/^machine_\d+_details$/)
  );
  const machineChanges = resolvedChanges.filter(c =>
    c.field.match(/^machine_\d+_details$/)
  );

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Mobile: full-height sheet. Desktop: auto-height modal capped at 85vh */}
      <DialogContent
        className={`flex h-full flex-col gap-0 overflow-hidden rounded-none p-0 shadow-2xl transition-all duration-300 sm:h-auto sm:max-h-[85vh] sm:rounded-xl ${
          generalChanges.length > 0 ||
          resourceKey === 'collection-report' ||
          resourceKey === 'collection_report'
            ? 'sm:max-w-4xl'
            : 'sm:max-w-lg'
        }`}
      >
        <DialogTitle className="sr-only">Activity Log Details</DialogTitle>

        {/* ── Coloured header ── */}
        <div className={`shrink-0 ${cfg.header} px-5 pb-4 pt-5 text-white`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cfg.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {action}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${resourceBadge}`}
            >
              {log.resource || 'unknown'}
            </span>
            <span className="ml-auto shrink-0 text-[11px] text-white/60">
              {safeFormatDate(log.timestamp)}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-white/90">{description}</p>
        </div>

        {/* ── Scrollable body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Actor */}
          <Section title="Actor">
            <MetaRow label="User" value={displayUsername} copyable />
            {displayEmail && (
              <MetaRow label="Email" value={displayEmail} copyable />
            )}
            <MetaRow label="User ID" value={log.userId} mono copyable />
            <MetaRow label="Role" value={log.actor?.role} />
          </Section>

          {/* Resource */}
          <Section title="Resource">
            <MetaRow label="Name" value={log.resourceName} />
            <MetaRow label="ID" value={log.resourceId} mono copyable />
          </Section>

          {/* Technical */}
          <Section title="Technical">
            <MetaRow label="IP" value={log.ipAddress} mono copyable />
            <MetaRow label="Log ID" value={log._id} mono copyable />
          </Section>

          {/* Changes / Collection Report View */}
          {resourceKey === 'collection-report' ||
          resourceKey === 'collection_report' ? (
            <Section title="Collection Report Overview">
              <CollectionReportView log={log} />
            </Section>
          ) : (
            <>
              {(generalChanges.length > 0 || machineChanges.length === 0) && (
                <Section
                  title={`Changes${generalChanges.length ? ` (${generalChanges.length})` : ''}`}
                >
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div
                          key={i}
                          className="h-16 animate-pulse rounded-lg bg-gray-100"
                        />
                      ))}
                    </div>
                  ) : generalChanges.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                      <table className="w-full min-w-[600px] table-fixed border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/75 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            <th className="w-1/4 px-4 py-3 font-semibold">
                              Field
                            </th>
                            <th className="w-3/8 px-4 py-3 font-semibold">
                              Before
                            </th>
                            <th className="w-3/8 px-4 py-3 font-semibold">
                              After
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {generalChanges.map((change, i) => (
                            <tr
                              key={i}
                              className="transition-colors hover:bg-slate-50/50"
                            >
                              <td className="px-4 py-3.5 align-top font-semibold text-gray-700">
                                {formatFieldLabel(change.field)}
                              </td>
                              <td className="px-4 py-3.5 align-top">
                                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-rose-100/50 bg-rose-50/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-rose-700">
                                  <RenderAuditValue
                                    value={change.oldValue}
                                    type="before"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3.5 align-top">
                                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-emerald-100/50 bg-emerald-50/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-700">
                                  <RenderAuditValue
                                    value={change.newValue}
                                    type="after"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 py-5 text-center">
                      <p className="text-xs text-gray-400">
                        No general field changes recorded
                      </p>
                    </div>
                  )}
                </Section>
              )}

              {/* Machine Details Breakdown */}
              {machineChanges.length > 0 && (
                <Section
                  title={`Reported Machines Breakdown (${machineChanges.length})`}
                >
                  <div className="grid gap-3">
                    {machineChanges.map((change, i) => {
                      const parsed = parseMachineDetail(change.newValue);
                      return (
                        <div
                          key={i}
                          className="rounded-lg border border-indigo-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="mb-2 flex items-center justify-between border-b border-indigo-50/50 pb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-900">
                              {parsed.name}
                            </span>
                            {parsed.notes && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-500/20">
                                Notes
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                                In
                              </p>
                              <p className="font-mono text-[11px] font-medium text-gray-800">
                                {parsed.metersIn}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                                Out
                              </p>
                              <p className="font-mono text-[11px] font-medium text-gray-800">
                                {parsed.metersOut}
                              </p>
                            </div>

                            {parsed.details && (
                              <div className="col-span-2 mt-1 rounded bg-indigo-50/50 p-2">
                                <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
                                  Details / Manual
                                </p>
                                <p className="text-[11px] font-medium text-indigo-800">
                                  {parsed.details}
                                </p>
                              </div>
                            )}

                            {parsed.notes && (
                              <div className="col-span-2 mt-1 rounded bg-amber-50/50 p-2">
                                <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-500">
                                  Collector Notes
                                </p>
                                <p className="text-[11px] italic text-amber-900">
                                  {parsed.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 justify-end border-t bg-gray-50 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdministrationActivityLogDescriptionDialog;
