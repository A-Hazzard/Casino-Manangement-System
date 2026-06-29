/**
 * BulkDeleteProgressModal
 *
 * Shows real-time per-item deletion progress for V1 reports and V2 sessions.
 * Drives a sequential delete loop — one request at a time — so the progress
 * bar reflects actual work done, not a fake animation.
 */
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type BulkDeleteProgress = {
  current: number;
  total: number;
  currentLabel: string;
  failedCount: number;
  isDone: boolean;
};

type Props = {
  isOpen: boolean;
  progress: BulkDeleteProgress;
  noun: 'report' | 'session';
  onClose: () => void;
};

// ============================================================================
// Component
// ============================================================================

export default function BulkDeleteProgressModal({ isOpen, progress, noun, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Animate in on open
  useEffect(() => {
    if (!isOpen || !modalRef.current || !backdropRef.current) return;

    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    gsap.fromTo(modalRef.current, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
  }, [isOpen]);

  // Animate progress bar width
  useEffect(() => {
    if (!barRef.current || progress.total === 0) return;
    const pct = (progress.current / progress.total) * 100;
    gsap.to(barRef.current, { width: `${pct}%`, duration: 0.4, ease: 'power2.out' });
  }, [progress.current, progress.total]);

  // Auto-close 1.5 s after completion
  useEffect(() => {
    if (!progress.isDone) return;
    const timer = setTimeout(onClose, 1500);
    return () => clearTimeout(timer);
  }, [progress.isDone, onClose]);

  if (!isOpen) return null;

  const successCount = progress.current - progress.failedCount;
  const allFailed = progress.isDone && progress.failedCount === progress.total;
  const partialFailure = progress.isDone && progress.failedCount > 0 && !allFailed;
  const fullSuccess = progress.isDone && progress.failedCount === 0;

  const headerBg = progress.isDone
    ? fullSuccess
      ? 'bg-green-600'
      : partialFailure
        ? 'bg-amber-500'
        : 'bg-red-700'
    : 'bg-red-600';

  const StatusIcon = progress.isDone
    ? fullSuccess
      ? CheckCircle2
      : AlertTriangle
    : Trash2;

  const titleText = progress.isDone
    ? fullSuccess
      ? `Deleted ${progress.total} ${noun}${progress.total !== 1 ? 's' : ''}`
      : `Deleted ${successCount} of ${progress.total} ${noun}${progress.total !== 1 ? 's' : ''}`
    : `Deleting ${progress.total} ${noun}${progress.total !== 1 ? 's' : ''}…`;

  return (
    <div className="fixed inset-0 z-[100000]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ opacity: 0 }}
      />

      {/* Centering shell */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-sm overflow-hidden rounded-xl bg-container shadow-2xl"
          style={{ opacity: 0 }}
        >
          {/* ── Coloured header strip ── */}
          <div className={`${headerBg} px-5 py-4 transition-colors duration-500`}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <StatusIcon className="h-5 w-5 text-white" />
              </div>
              <p className="text-base font-bold text-white">{titleText}</p>
            </div>
          </div>

          {/* ── Progress track ── */}
          <div className="px-5 pt-5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-buttonInactive/30">
              <div
                ref={barRef}
                className={`h-full rounded-full transition-colors duration-500 ${
                  progress.isDone
                    ? fullSuccess
                      ? 'bg-green-500'
                      : 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: '0%' }}
              />
            </div>

            {/* Counter */}
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs font-medium text-grayHighlight/60">
                {progress.isDone ? 'Complete' : 'In progress'}
              </span>
              <span className="text-sm font-semibold tabular-nums text-grayHighlight">
                {progress.current}
                <span className="text-xs font-normal text-grayHighlight/50"> / {progress.total}</span>
              </span>
            </div>
          </div>

          {/* ── Status line ── */}
          <div className="min-h-[4rem] px-5 py-4">
            {progress.isDone ? (
              <div className="flex flex-col gap-1">
                {fullSuccess && (
                  <p className="text-sm font-medium text-green-600">
                    All {noun}s removed successfully.
                  </p>
                )}
                {partialFailure && (
                  <p className="text-sm font-medium text-amber-600">
                    {progress.failedCount} {noun}{progress.failedCount !== 1 ? 's' : ''} could not be deleted. Check the console for details.
                  </p>
                )}
                {allFailed && (
                  <p className="text-sm font-medium text-red-600">
                    All deletions failed. Check the console for details.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-grayHighlight/50">
                  Currently deleting
                </p>
                <p className="truncate text-sm font-semibold text-grayHighlight">
                  {progress.currentLabel || '—'}
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-border px-5 py-4">
            <p className="text-center text-xs font-medium text-grayHighlight/40">
              {progress.isDone ? 'Closing…' : 'Deleting…'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
