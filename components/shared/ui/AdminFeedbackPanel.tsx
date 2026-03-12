/**
 * Admin Feedback Panel
 * Floating panel for admin/developer users to view and manage feedback submissions,
 * with the ability to switch to submitting their own feedback.
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/ui/dialog';
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Textarea } from '@/components/shared/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MessageSquare,
  PenLine,
  RefreshCw,
  Save,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import FeedbackForm from './FeedbackForm';

// ============================================================================
// Types & Constants
// ============================================================================

type Feedback = {
  _id: string;
  email: string;
  category: string;
  description: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  archived: boolean;
  firstName?: string | null;
  lastName?: string | null;
  licenceeName?: string | null;
  username?: string | null;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug Report',
  suggestion: '💡 Suggestion',
  'general-review': '⭐ General Review',
  'feature-request': '✨ Feature Request',
  performance: '⚡ Performance',
  'ui-ux': '🎨 UI/UX',
  other: '📝 Other',
};

const STATUS_PILL: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-800 border-amber-200',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const STATUS_LEFT_BORDER: Record<string, string> = {
  pending:  'border-l-amber-400',
  reviewed: 'border-l-blue-400',
  resolved: 'border-l-emerald-400',
};

type AdminFeedbackPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Called when pending count may have changed (e.g. after an update) */
  onCountChange?: () => void;
};

type View = 'list' | 'detail';

// ============================================================================
// Component
// ============================================================================

export default function AdminFeedbackPanel({
  isOpen,
  onClose,
  onCountChange,
}: AdminFeedbackPanelProps) {
  const [view, setView] = useState<View>('list');
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback?status=pending&limit=50&page=1');
      const data = await res.json();
      if (data.success) setFeedbackList(data.data || []);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView('list');
      setSelected(null);
      fetchFeedback();
    }
  }, [isOpen, fetchFeedback]);

  const handleSelect = (item: Feedback) => {
    setSelected(item);
    setEditStatus(item.status);
    setEditNotes(item.notes || '');
    setView('detail');
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setIsUpdating(true);
    try {
      const updateData: Record<string, unknown> = { _id: selected._id };
      if (editStatus !== selected.status) updateData.status = editStatus;
      const currentNotes = selected.notes || '';
      if (editNotes.trim() !== currentNotes.trim()) updateData.notes = editNotes.trim() || null;

      if (Object.keys(updateData).length === 1) {
        toast.info('No changes to save');
        setIsUpdating(false);
        return;
      }

      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');

      const updated: Feedback = { ...selected, ...data.feedback };
      setSelected(updated);
      setFeedbackList(prev => prev.map(f => f._id === updated._id ? updated : f));
      toast.success('Feedback updated');
      onCountChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const pendingCount = feedbackList.length;
  const displayName = selected
    ? [selected.firstName, selected.lastName].filter(Boolean).join(' ') || null
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          isMobileFullScreen={false}
          showCloseButton={false}
          className="flex max-h-[88vh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-2xl p-0 shadow-2xl"
        >
          <DialogTitle className="sr-only">Feedback Panel</DialogTitle>

          {/* ── Header ── */}
          <div className="relative shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 px-5 pb-4 pt-5">
            <button
              onClick={view === 'detail' ? () => setView('list') : onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
            >
              {view === 'detail' ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  {view === 'detail' ? 'Feedback Details' : 'Feedback'}
                </h2>
                <p className="text-xs text-blue-200">
                  {view === 'list' && pendingCount > 0
                    ? `${pendingCount} pending review`
                    : view === 'list'
                    ? 'All submissions'
                    : 'Review & update'}
                </p>
              </div>
            </div>

            {/* List-view action buttons */}
            {view === 'list' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={fetchFeedback}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white transition hover:bg-white/30 disabled:opacity-60"
                >
                  <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
                  Refresh
                </button>
                <button
                  onClick={() => { onClose(); setIsFeedbackFormOpen(true); }}
                  className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white transition hover:bg-white/30"
                >
                  <PenLine className="h-3 w-3" />
                  Submit Feedback
                </button>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* LIST VIEW */}
            {view === 'list' && (
              loading ? (
                <div className="flex items-center justify-center py-14">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-300" />
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="mt-3 text-sm font-medium text-gray-600">All caught up!</p>
                  <p className="mt-1 text-xs text-gray-400">No feedback submissions yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {feedbackList.map(item => (
                    <button
                      key={item._id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'w-full border-l-[3px] px-5 py-3.5 text-left transition hover:bg-gray-50 active:bg-gray-100',
                        STATUS_LEFT_BORDER[item.status] ?? 'border-l-gray-200'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {[item.firstName, item.lastName].filter(Boolean).join(' ') || item.email}
                          </p>
                          {(item.firstName || item.lastName) && (
                            <p className="truncate text-xs text-gray-400">{item.email}</p>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px]', STATUS_PILL[item.status])}
                          >
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[10px] text-gray-400">
                        {format(new Date(item.submittedAt), 'MMM d, yyyy · HH:mm')}
                      </p>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* DETAIL VIEW */}
            {view === 'detail' && selected && (
              <div className="space-y-4 px-5 py-4">

                {/* Submitter card */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                      {(selected.firstName?.[0] || selected.email[0]).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {displayName ?? <span className="text-gray-400">Anonymous</span>}
                      </p>
                      <p className="truncate text-xs text-gray-500">{selected.email}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                        {selected.username && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />@{selected.username}
                          </span>
                        )}
                        {selected.licenceeName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />{selected.licenceeName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', STATUS_PILL[selected.status])}>
                    {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[selected.category] || selected.category}
                  </Badge>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {format(new Date(selected.submittedAt), 'MMM d, yyyy · HH:mm')}
                  </span>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Description */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Description
                  </p>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {selected.description}
                    </p>
                  </div>
                </div>

                {/* Status selector */}
                <div>
                  <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Status
                  </Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="rounded-xl border-gray-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Admin Notes
                  </Label>
                  {selected.notes && editNotes === selected.notes ? (
                    <div
                      onClick={() => {/* allow editing */}}
                      className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
                        {selected.notes}
                      </p>
                    </div>
                  ) : null}
                  <Textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Add internal notes about this feedback..."
                    className={cn(
                      'min-h-[80px] resize-none rounded-xl border-gray-200 text-sm focus:border-blue-300',
                      selected.notes && editNotes === selected.notes && 'mt-2'
                    )}
                  />
                </div>

                {/* Review trail */}
                {selected.reviewedBy && selected.reviewedAt && (
                  <p className="text-[11px] text-gray-400">
                    Reviewed by{' '}
                    <span className="font-medium text-gray-600">{selected.reviewedBy}</span>
                    {' · '}
                    {format(new Date(selected.reviewedAt), 'MMM d, yyyy · HH:mm')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Footer (detail only) ── */}
          {view === 'detail' && (
            <div className="shrink-0 border-t bg-gray-50/80 px-5 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('list')}
                  className="text-gray-500"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {isUpdating ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Separate submit-feedback modal */}
      <FeedbackForm
        isOpen={isFeedbackFormOpen}
        onClose={() => setIsFeedbackFormOpen(false)}
      />
    </>
  );
}
