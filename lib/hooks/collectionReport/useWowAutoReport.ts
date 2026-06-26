/**
 * useWowAutoReport Hook
 *
 * Developer-only automation for WOW (Wheel of Wonders) collection reports. WOW machine
 * meters are synced and read-only, so a collector normally adds each machine one-by-one.
 *
 * This hook automates that for every uncollected WOW machine, then opens the
 * submit/variation dialog (it does NOT auto-finalize). To stay responsive on large
 * locations (70+ machines) it does NOT drive the heavy per-machine form UI — instead, for
 * each machine in turn it: highlights it (`onHighlight`), fetches its synced meters in the
 * background, persists the collection directly (`persist`), then adds it to the collected
 * list (`commit`) BEFORE moving on to the next machine. This per-item cadence means the
 * user watches each machine appear in the list on the right as it is scanned, exactly like
 * a human adding them one at a time.
 *
 * Machines with no synced data cannot be collected (blank read-only meters), so they are
 * skipped and reported.
 *
 * @module lib/hooks/collectionReport/useWowAutoReport
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export type WowAutoReportMachine = { id: string; name: string };

export type WowAutoReportMeters = {
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  /** ISO timestamp the prevIn reading corresponds to — persisted as sasStartTime. */
  baselineAt?: string | null;
  /** ISO timestamp of the latest synced meter read — used as sasEndTime in recent mode. */
  currentReadAt?: string | null;
};

export type UseWowAutoReportConfig<TEntry = unknown> = {
  enabled: boolean;
  machines: WowAutoReportMachine[];
  /**
   * Count of machines already collected on this report. Progress is reported against the
   * full location (startOffset + machines.length) and resumes from this offset — e.g. with
   * 5 already collected and 63 to add, the first step shows "6/68".
   */
  startOffset?: number;
  /** ISO start-time for the SAS window (used as first-report baseline fallback). */
  startTimeIso?: string;
  /** ISO end-time cutoff for the synced reading (defaults to now). */
  endTimeIso?: string;
  /** Persist one machine's collection (POST only — no React state updates). */
  persist: (
    machine: WowAutoReportMachine,
    meters: WowAutoReportMeters,
    ctx?: {
      collectionTime?: Date;
      gameDayOffset?: number;
      /** When true, use the synced meter readAt timestamps directly instead of aligning to the gaming day. */
      useMeterTimes?: boolean;
    }
  ) => Promise<TEntry | null>;
  /** Add ONE saved entry to the collected list (called per machine, before the next scan). */
  commit: (savedEntry: TEntry) => void;
  /** Lightweight highlight of the machine currently being processed. */
  onHighlight?: (machineId: string | null) => void;
  /** Open the submit/variation dialog (does not finalize). */
  openSubmit: () => void;
};

export type WowAutoReportResult = {
  added: number;
  skipped: WowAutoReportMachine[];
};

export type WowAutoReportRunOverrides = {
  startTimeIso?: string;
  endTimeIso?: string;
  gameDayOffset?: number;
};

export type WowAutoReportPhase = 'idle' | 'fetching' | 'saving';

export type WowAutoReportControl = {
  enabled: boolean;
  isRunning: boolean;
  phase: WowAutoReportPhase;
  progress: { done: number; total: number };
  /** Summary of the last completed run (added count + skipped machines), or null. */
  result: WowAutoReportResult | null;
  run: (overrides?: WowAutoReportRunOverrides) => void;
  stop: () => void;
  /** Dismiss the last-run summary shown in the modal. */
  clearResult: () => void;
};

// ============================================================================
// Constants
// ============================================================================

const PERSIST_CONCURRENCY = 10;

// ============================================================================
// Main Hook
// ============================================================================

export function useWowAutoReport<TEntry = unknown>(
  config: UseWowAutoReportConfig<TEntry>
): WowAutoReportControl {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<WowAutoReportPhase>('idle');
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [result, setResult] = useState<WowAutoReportResult | null>(null);

  const clearResult = useCallback(() => setResult(null), []);

  // Keep the latest config in a ref so the async loop always sees fresh closures.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  const runningRef = useRef(false);
  const abortedRef = useRef(false);

  const stop = useCallback(() => {
    abortedRef.current = true;
    runningRef.current = false;
    setIsRunning(false);
    configRef.current.onHighlight?.(null);
  }, []);

  const run = useCallback(async (overrides?: WowAutoReportRunOverrides) => {
    if (runningRef.current) return;
    const { enabled, machines } = configRef.current;
    if (!enabled) return;

    if (machines.length === 0) {
      toast.info('No WOW machines available to add.', { position: 'top-left' });
      return;
    }

    const startOffset = configRef.current.startOffset ?? 0;
    const total = startOffset + machines.length;
    const endTimeIso =
      overrides?.endTimeIso ?? configRef.current.endTimeIso ?? new Date().toISOString();
    const startTimeIso = overrides?.startTimeIso ?? configRef.current.startTimeIso;

    abortedRef.current = false;
    runningRef.current = true;
    setIsRunning(true);
    setPhase('fetching');
    setResult(null);
    setProgress({ done: startOffset, total });

    const skipped: WowAutoReportMachine[] = [];
    let savedCount = 0;
    let completedCount = 0;

    try {
      // ── Phase 1: batch-fetch all meter readings in one request ──────────────
      // Replaces N sequential GET calls (one per machine) with a single POST.
      type MeterCacheEntry = {
        metersIn: number | null;
        metersOut: number | null;
        prevIn: number | null;
        prevOut: number | null;
        baselineAt?: string | null;
        currentReadAt?: string | null;
      };
      let metersCache: Record<string, MeterCacheEntry> = {};
      try {
        const batchBody: Record<string, unknown> = {
          machineIds: machines.map(machine => machine.id),
          endTime: endTimeIso,
        };
        if (startTimeIso) batchBody.startTime = startTimeIso;

        const batchRes = await fetch(
          '/api/collection-reports/collections/wow-meters/batch',
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchBody),
          }
        );
        const batchJson = await batchRes.json();
        if (batchJson?.success && batchJson.data) {
          metersCache = batchJson.data as Record<string, MeterCacheEntry>;
        }
      } catch (fetchErr) {
        console.error(
          '[useWowAutoReport] Batch meter fetch failed:',
          fetchErr instanceof Error ? fetchErr.message : 'Unknown error'
        );
      }

      if (abortedRef.current) return;
      setPhase('saving');

      // ── Phase 2: persist all machines concurrently (PERSIST_CONCURRENCY at a time) ─
      // Entries are committed to the list as each one finishes so the user
      // sees them appear progressively rather than all at once.
      const persistCtx = {
        collectionTime: overrides?.endTimeIso ? new Date(overrides.endTimeIso) : undefined,
        gameDayOffset: overrides?.gameDayOffset,
        useMeterTimes: !overrides?.endTimeIso,
      };

      for (let chunkStart = 0; chunkStart < machines.length; chunkStart += PERSIST_CONCURRENCY) {
        if (abortedRef.current) break;

        const chunk = machines.slice(
          chunkStart,
          Math.min(chunkStart + PERSIST_CONCURRENCY, machines.length)
        );

        await Promise.all(
          chunk.map(async machine => {
            if (abortedRef.current) return;

            const cached = metersCache[machine.id];
            if (!cached || cached.metersIn == null) {
              skipped.push(machine);
              completedCount++;
              setProgress({ done: startOffset + completedCount, total });
              return;
            }

            const meters: WowAutoReportMeters = {
              metersIn: Number(cached.metersIn),
              metersOut: Number(cached.metersOut ?? 0),
              prevIn: Number(cached.prevIn ?? 0),
              prevOut: Number(cached.prevOut ?? 0),
              baselineAt: cached.baselineAt ?? null,
              currentReadAt: cached.currentReadAt ?? null,
            };

            try {
              const entry = await configRef.current.persist(machine, meters, persistCtx);
              if (entry) {
                configRef.current.commit(entry);
                savedCount++;
              } else {
                skipped.push(machine);
              }
            } catch (persistErr) {
              console.error(
                `[useWowAutoReport] Failed to persist ${machine.name}:`,
                persistErr instanceof Error ? persistErr.message : 'Unknown error'
              );
              skipped.push(machine);
            }

            completedCount++;
            setProgress({ done: startOffset + completedCount, total });
          })
        );
      }

      configRef.current.onHighlight?.(null);

      if (skipped.length > 0) {
        console.warn(
          `[useWowAutoReport] Skipped ${skipped.length} WOW machine(s) with no synced data:`,
          skipped
        );
      }
      setResult({ added: savedCount, skipped });

      if (!abortedRef.current && savedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
        configRef.current.openSubmit();
      }
    } catch (autoErr) {
      console.error(
        '[useWowAutoReport] Auto report failed:',
        autoErr instanceof Error ? autoErr.message : 'Unknown error'
      );
      toast.error('Auto report failed. See console for details.', {
        position: 'top-left',
      });
    } finally {
      configRef.current.onHighlight?.(null);
      runningRef.current = false;
      setIsRunning(false);
      setPhase('idle');
    }
  }, []);

  return {
    enabled: config.enabled,
    isRunning,
    phase,
    progress,
    result,
    run,
    stop,
    clearResult,
  };
}
