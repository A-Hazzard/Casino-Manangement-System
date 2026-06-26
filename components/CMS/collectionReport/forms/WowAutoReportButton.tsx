/**
 * WowAutoReportButton
 *
 * Developer-only button for all-WOW locations. Clicking it opens a portal-based
 * confirmation dialog (same pattern as ConfirmationDialog / InfoConfirmationDialog)
 * that sits above all other modals. The user chooses between "Recent Report"
 * (run immediately using the synced meters' actual readAt timestamps) or "Custom Time"
 * (pick SAS start/end times from ModernCalendar pickers before running).
 *
 * @module components/CMS/collectionReport/forms/WowAutoReportButton
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { Bot, Loader2, X, Clock, Zap, ArrowLeft } from 'lucide-react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@/components/shared/ui/button';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import { ProcessingPhaseBar } from '@/components/shared/ui/ProcessingPhaseBar';
import type { ProcessingPhase } from '@/components/shared/ui/ProcessingPhaseBar';
import type { WowAutoReportControl } from '@/lib/hooks/collectionReport/useWowAutoReport';

// ============================================================================
// Types
// ============================================================================

type WowAutoReportButtonProps = {
  control: WowAutoReportControl;
  disabled?: boolean;
};

// ============================================================================
// Component
// ============================================================================

export default function WowAutoReportButton({
  control,
  disabled = false,
}: WowAutoReportButtonProps) {
  // ============================================================================
  // Local State
  // ============================================================================
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'choice' | 'custom'>('choice');
  const [customStartTime, setCustomStartTime] = useState<Date>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });
  const [customEndTime, setCustomEndTime] = useState<Date>(() => new Date());

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const autoPhases = useMemo((): ProcessingPhase[] => {
    const machineCount = control.progress.total;
    return [
      { label: 'Fetching WOW meter readings', estimatedMs: 1500 },
      { label: 'Saving collections',          estimatedMs: Math.max(1000, machineCount * 60), detail: `${machineCount} machine${machineCount !== 1 ? 's' : ''}` },
    ];
  }, [control.progress.total]);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (showModal) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [showModal]);

  // ============================================================================
  // Render guard
  // ============================================================================
  if (!control.enabled) return null;

  const { isRunning, progress, result } = control;

  // ============================================================================
  // Handlers
  // ============================================================================
  function openModal() {
    setMode('choice');
    setShowModal(true);
  }

  function closeModal() {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: 100,
      duration: 0.3,
      ease: 'power2.in',
      overwrite: true,
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => setShowModal(false),
    });
  }

  /** Recent Report: use the actual synced meter readAt timestamps. */
  function handleRecentReport() {
    closeModal();
    control.run();
  }

  /** Custom Time: use the user-picked start/end */
  function handleStartCustom() {
    closeModal();
    control.run({
      startTimeIso: customStartTime.toISOString(),
      endTimeIso: customEndTime.toISOString(),
    });
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-2">
      {/* Trigger / running row */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={openModal}
          disabled={disabled || isRunning}
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-purple-300 bg-purple-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          title="Developer tool — auto-adds every WOW machine, then opens the submit dialog"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress.done}/{progress.total}
            </>
          ) : (
            <>
              <Bot className="h-3 w-3" />
              Auto Report
            </>
          )}
        </button>

        {isRunning && (
          <button
            type="button"
            onClick={() => control.stop()}
            className="flex items-center justify-center gap-1 rounded border border-red-300 bg-red-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        )}
      </div>

      {/* Phase progress bar — visible while running */}
      {isRunning && (
        <ProcessingPhaseBar
          phases={autoPhases}
          isActive={isRunning}
          color="purple"
        />
      )}

      {/* In-modal run summary */}
      {!isRunning && result && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="font-bold text-amber-900">
              Added {result.added} • Skipped {result.skipped.length}
            </p>
            <button
              type="button"
              onClick={control.clearResult}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-amber-700 hover:bg-amber-100"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {result.skipped.length > 0 && (
            <>
              <p className="font-semibold text-amber-800">
                No synced meter data — not added:
              </p>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto pr-1">
                {result.skipped.map(machine => (
                  <li key={machine.id} className="text-amber-900">
                    {machine.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Portal modal — renders above all other modals via document.body */}
      {showModal &&
        createPortal(
          <div className="pointer-events-auto fixed inset-0 z-[100000]">
            {/* Dim backdrop */}
            <div
              ref={backdropRef}
              className="absolute inset-0 bg-black/50"
              onClick={e => {
                if (e.target === e.currentTarget) closeModal();
              }}
            />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <div
                ref={modalRef}
                className="w-full max-w-sm rounded-md bg-container shadow-lg"
                style={{ opacity: 0, transform: 'translateY(-20px)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-buttonActive">Start Auto Report</h2>
                    <Button
                      variant="ghost"
                      onClick={closeModal}
                      className="h-8 w-8 p-0 text-grayHighlight hover:bg-buttonInactive/10"
                    >
                      <Cross2Icon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* ── Mode: initial choice ─────────────────────────────── */}
                {mode === 'choice' && (
                  <>
                    <div className="p-6 text-center">
                      <p className="text-sm text-grayHighlight">
                        Would you like to set a custom time in the past or make
                        a recent report?
                      </p>
                      <p className="mt-2 text-xs text-grayHighlight/70">
                        Recent Report uses the timestamps from the synced meters
                        themselves.
                      </p>
                    </div>

                    <div className="border-t border-border p-4">
                      <div className="flex justify-center gap-3">
                        <Button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode('custom');
                          }}
                          className="bg-button text-white hover:bg-buttonActive"
                        >
                          <Clock className="mr-1.5 h-4 w-4" />
                          Custom Time
                        </Button>
                        <Button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRecentReport();
                          }}
                          className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                        >
                          <Zap className="mr-1.5 h-4 w-4" />
                          Recent Report
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Mode: custom time pickers ────────────────────────── */}
                {mode === 'custom' && (
                  <>
                    <div className="space-y-4 p-6">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-grayHighlight">
                          SAS Start Time
                        </label>
                        <ModernCalendar
                          date={
                            customStartTime
                              ? { from: customStartTime, to: customStartTime }
                              : undefined
                          }
                          onSelect={range => {
                            if (range?.from) setCustomStartTime(range.from);
                          }}
                          enableTimeInputs
                          mode="single"
                          maxDate={customEndTime}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-grayHighlight">
                          SAS End Time
                        </label>
                        <ModernCalendar
                          date={
                            customEndTime
                              ? { from: customEndTime, to: customEndTime }
                              : undefined
                          }
                          onSelect={range => {
                            if (range?.from) setCustomEndTime(range.from);
                          }}
                          enableTimeInputs
                          mode="single"
                          minDate={customStartTime}
                          maxDate={new Date()}
                        />
                      </div>
                    </div>

                    <div className="border-t border-border p-4">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode('choice');
                          }}
                          className="text-grayHighlight hover:bg-buttonInactive/10"
                        >
                          <ArrowLeft className="mr-1.5 h-4 w-4" />
                          Back
                        </Button>
                        <Button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStartCustom();
                          }}
                          className="bg-purple-600 text-white hover:bg-purple-700"
                        >
                          <Bot className="mr-1.5 h-4 w-4" />
                          Start Auto Report
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
