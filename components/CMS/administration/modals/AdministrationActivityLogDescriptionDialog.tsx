'use client';

import type { ActivityLog } from '@/shared/types/activityLog';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { formatDate } from '@/lib/utils/formatting';
import { isIdValue, resolveIdToName } from '@/lib/utils/id';
import { formatValue } from '@/lib/utils/date';
import { ArrowRight, Check, Copy } from 'lucide-react';
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

const ACTION_CONFIG: Record<string, { header: string; badge: string; dot: string }> = {
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
  user:       'bg-indigo-100 text-indigo-700',
  machine:    'bg-orange-100 text-orange-700',
  cabinet:    'bg-orange-100 text-orange-700',
  location:   'bg-teal-100 text-teal-700',
  collection: 'bg-yellow-100 text-yellow-700',
  member:     'bg-pink-100 text-pink-700',
  licencee:   'bg-cyan-100 text-cyan-700',
  country:    'bg-lime-100 text-lime-700',
  session:    'bg-violet-100 text-violet-700',
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
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function MetaRow({ label, value, mono, copyable }: { label: string; value?: string | null; mono?: boolean; copyable?: boolean }) {
  if (!value || value === 'N/A' || value === 'unknown') return null;
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <div className="flex min-w-0 flex-1 items-center">
        <span className={`min-w-0 break-all text-xs text-gray-800 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
        {copyable && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t px-5 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      {children}
    </div>
  );
}

function AdministrationActivityLogDescriptionDialog({
  isOpen,
  onClose,
  log,
  searchMode,
}: AdministrationActivityLogDescriptionDialogProps) {
  const [resolvedChanges, setResolvedChanges] = useState<ResolvedChange[]>([]);
  const [loading, setLoading] = useState(false);

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
          log.changes!
            .filter(c => !isIdValue(c.newValue))
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
    return () => { alive = false; };
  }, [isOpen, log]);

  if (!log) return null;

  const action = (log.action || 'unknown').toLowerCase();
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.default;
  const resourceKey = log.resource?.toLowerCase() ?? '';
  const resourceBadge = RESOURCE_BADGE[resourceKey] ?? 'bg-gray-100 text-gray-600';
  const description = log.description || log.details || 'No description available';
  const displayUsername = searchMode === 'email'
    ? (log.actor?.email || log.username || '')
    : (log.username || log.actor?.email || '');
  const displayEmail = log.actor?.email && log.actor.email !== 'unknown' && log.actor.email !== displayUsername
    ? log.actor.email
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Mobile: full-height sheet. Desktop: auto-height modal capped at 85vh */}
      <DialogContent className="flex h-full flex-col gap-0 overflow-hidden rounded-none p-0 shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-xl">
        <DialogTitle className="sr-only">Activity Log Details</DialogTitle>

        {/* ── Coloured header ── */}
        <div className={`shrink-0 ${cfg.header} px-5 pb-4 pt-5 text-white`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cfg.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {action}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${resourceBadge}`}>
              {log.resource || 'unknown'}
            </span>
            <span className="ml-auto shrink-0 text-[11px] text-white/60">{formatDate(log.timestamp)}</span>
          </div>
          <p className="text-sm leading-relaxed text-white/90">{description}</p>
        </div>

        {/* ── Scrollable body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {/* Actor */}
          <Section title="Actor">
            <MetaRow label="User" value={displayUsername} copyable />
            {displayEmail && <MetaRow label="Email" value={displayEmail} copyable />}
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

          {/* Changes */}
          <Section title={`Changes${resolvedChanges.length ? ` (${resolvedChanges.length})` : ''}`}>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />)}
              </div>
            ) : resolvedChanges.length > 0 ? (
              <div className="space-y-2">
                {resolvedChanges.map((change, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="mb-2 text-[11px] font-semibold text-gray-500">
                      {formatFieldLabel(change.field)}
                    </p>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">Before</p>
                        <span className="inline-block max-w-full break-all rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          {change.oldValue || '—'}
                        </span>
                      </div>
                      <ArrowRight className="mt-5 h-3 w-3 shrink-0 text-gray-300" />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">After</p>
                        <span className="inline-block max-w-full break-all rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          {change.newValue || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 py-5 text-center">
                <p className="text-xs text-gray-400">No field changes recorded</p>
              </div>
            )}
          </Section>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex justify-end border-t bg-gray-50 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdministrationActivityLogDescriptionDialog;
