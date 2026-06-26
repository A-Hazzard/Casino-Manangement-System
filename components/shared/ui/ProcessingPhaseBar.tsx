/**
 * ProcessingPhaseBar
 *
 * Multi-phase progress display. Supports two modes:
 *
 * Timer-driven (default): cycles through phases automatically using
 * `estimatedMs` — fills each bar 0→90%, then advances. Used for operations
 * where no server feedback is available (e.g. WOW Auto Report).
 *
 * Server-driven (`serverPhase` prop): the bar only advances when the server
 * emits a new phase key via SSE. The fill animation still runs within the
 * current phase for visual feedback, but the phase label never advances ahead
 * of what the server has reported.
 *
 * Sub-step progress: when `subStep` is provided and matches the current phase,
 * shows per-machine detail (e.g. "Processing machine 34 of 47") and uses the
 * sub-step progress to drive the bar fill instead of the timer.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ProcessingPhase = {
  key?: string;
  label: string;
  detail?: string;
  estimatedMs: number;
};

export type SubStepProgress = {
  phaseKey: string;
  done: number;
  total: number;
  /** Name of the machine currently being processed (for per-machine phases). */
  machineName?: string;
  /** Free-form detail about what is being validated/calculated for the current item. */
  detail?: string;
};

type ProcessingPhaseBarProps = {
  phases: ProcessingPhase[];
  isActive: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple';
  serverPhase?: string;
  progress?: { done: number; total: number };
  subStep?: SubStepProgress | null;
};

// ============================================================================
// Color Maps
// ============================================================================

const BAR_COLOR = {
  blue: 'bg-button',
  green: 'bg-green-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
};

const DOT_ACTIVE_COLOR = {
  blue: 'bg-button',
  green: 'bg-green-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
};

// ============================================================================
// Component
// ============================================================================

export function ProcessingPhaseBar({
  phases,
  isActive,
  color = 'blue',
  serverPhase,
  progress,
  subStep,
}: ProcessingPhaseBarProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [barProgress, setBarProgress] = useState(0);

  const phasesRef = useRef(phases);
  const phaseIndexRef = useRef(0);
  const phaseStartRef = useRef<number>(0);
  const hadProgressRef = useRef(false);
  const isServerDrivenRef = useRef(serverPhase !== undefined);

  phasesRef.current = phases;
  isServerDrivenRef.current = serverPhase !== undefined;

  // Server-driven: advance phase when `serverPhase` key changes.
  useEffect(() => {
    if (!serverPhase) return;
    const idx = phasesRef.current.findIndex(p => p.key === serverPhase);
    if (idx !== -1 && idx !== phaseIndexRef.current) {
      phaseIndexRef.current = idx;
      phaseStartRef.current = Date.now();
      setPhaseIndex(idx);
      setBarProgress(0);
    }
  }, [serverPhase]);

  // Drive the bar from real sub-step progress when available. This snaps the
  // bar to the exact percentage and skips the animated timer fill so the user
  // sees stable, machine-by-machine progress instead of a bar that pulses left
  // to right while waiting for the next update.
  useEffect(() => {
    if (!isActive) return;
    const snapshot = phasesRef.current;
    const currentPhase = snapshot[phaseIndexRef.current];
    if (!currentPhase) return;
    if (
      subStep &&
      subStep.phaseKey === currentPhase.key &&
      subStep.total > 0
    ) {
      const subProgress = Math.min(90, (subStep.done / subStep.total) * 100);
      setBarProgress(subProgress);
    }
  }, [isActive, subStep?.phaseKey, subStep?.done, subStep?.total]);

  // Interval: fills the bar within the current phase only when no granular
  // sub-step progress is available for that phase.
  useEffect(() => {
    if (!isActive) {
      if (hadProgressRef.current) setBarProgress(100);
      return;
    }

    hadProgressRef.current = true;
    phaseIndexRef.current = 0;
    phaseStartRef.current = Date.now();
    setPhaseIndex(0);
    setBarProgress(0);

    const interval = setInterval(() => {
      const snapshot = phasesRef.current;
      const currentPhase = snapshot[phaseIndexRef.current];
      if (!currentPhase) return;

      // Skip timer animation when real sub-step progress is driving this phase.
      if (
        subStep &&
        subStep.phaseKey === currentPhase.key &&
        subStep.total > 0
      ) {
        return;
      }

      const elapsed = Date.now() - phaseStartRef.current;
      const progress = Math.min(90, (elapsed / currentPhase.estimatedMs) * 100);
      setBarProgress(progress);

      // Only auto-advance in timer-driven mode (no serverPhase).
      if (
        !isServerDrivenRef.current &&
        elapsed >= currentPhase.estimatedMs &&
        phaseIndexRef.current < snapshot.length - 1
      ) {
        phaseIndexRef.current += 1;
        phaseStartRef.current = Date.now();
        setPhaseIndex(phaseIndexRef.current);
        setBarProgress(0);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, subStep?.phaseKey, subStep?.total]);

  if (phases.length === 0) return null;

  const currentPhase = phases[Math.min(phaseIndex, phases.length - 1)];
  const barColor = BAR_COLOR[color];
  const dotColor = DOT_ACTIVE_COLOR[color];

  // Determine if we should show sub-step detail for the current phase
  const showSubStep =
    subStep &&
    currentPhase.key &&
    subStep.phaseKey === currentPhase.key &&
    subStep.total > 0;

  return (
    <div className="w-full space-y-1.5">
      {/* Label row */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-grayHighlight">
          {currentPhase.label}
        </span>
        <div className="flex items-baseline gap-2">
          {showSubStep ? (
            <span className="shrink-0 tabular-nums text-xs font-semibold text-grayHighlight/70">
              {subStep.done} / {subStep.total}
            </span>
          ) : progress && progress.total > 0 ? (
            <span className="shrink-0 tabular-nums text-xs font-semibold text-grayHighlight/70">
              {progress.done} / {progress.total}
            </span>
          ) : null}
          <span className="shrink-0 tabular-nums text-xs text-grayHighlight/50">
            Step {phaseIndex + 1} of {phases.length}
          </span>
        </div>
      </div>

      {/* Sub-step detail line */}
      {showSubStep && (
        <p className="text-xs text-grayHighlight/50">
          {subStep.machineName && subStep.detail
            ? `${currentPhase.label}: ${subStep.machineName} — ${subStep.detail}`
            : subStep.machineName
              ? `${currentPhase.label}: ${subStep.machineName}`
              : subStep.detail
                ? subStep.detail
                : subStep.done < subStep.total
                  ? `Processing machine ${subStep.done} of ${subStep.total}...`
                  : 'Finalizing...'}
        </p>
      )}

      {/* Detail (from phase definition, shown when no sub-step) */}
      {!showSubStep && currentPhase.detail && (
        <p className="text-xs text-grayHighlight/40">{currentPhase.detail}</p>
      )}

      {/* Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-100`}
          style={{ width: `${Math.round(barProgress)}%` }}
        />
      </div>

      {/* Phase dots */}
      <div className="flex justify-center gap-1.5 pt-0.5">
        {phases.map((_, dotIndex) => (
          <div
            key={dotIndex}
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
              dotIndex < phaseIndex
                ? `${dotColor} opacity-40`
                : dotIndex === phaseIndex
                  ? dotColor
                  : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
