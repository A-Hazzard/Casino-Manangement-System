/**
 * useVariationStreamCheck
 *
 * Drives the streaming pre-submit variation check
 * (POST /api/collection-reports/check-variations, Server-Sent Events).
 *
 * Exposes live per-machine progress (done / total / current machine name) so the UI
 * can verbosely show each machine being checked, then the final result whose numbers
 * match the report detail page (same backend helper).
 *
 * @module lib/hooks/collectionReport/useVariationStreamCheck
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { readSseStream } from '@/lib/utils/sseReader';

// ============================================================================
// Types
// ============================================================================

export type VariationCheckMachine = {
  machineId: string;
  machineName?: string;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  movementGross?: number;
  sasStartTime?: string;
  sasEndTime?: string;
};

export type MachineVariationRow = {
  machineId: string;
  machineName: string;
  meterGross: number;
  sasGross: number | null;
  variation: number | null;
  sasStartTime: string | null;
  sasEndTime: string | null;
};

export type VariationCheckResult = {
  hasVariations: boolean;
  totalVariation: number;
  machines: MachineVariationRow[];
};

// Backwards-compatible aliases so existing consumers can repoint their type imports
// here after the old useCollectionReportVariationCheck hook is removed. Field-compatible.
export type MachineVariationData = MachineVariationRow;
export type VariationsCheckResponse = VariationCheckResult;
export type CheckVariationsMachine = VariationCheckMachine;

export type VariationCheckStatus = 'idle' | 'checking' | 'done' | 'error';

type VariationCheckState = {
  status: VariationCheckStatus;
  done: number;
  total: number;
  currentMachineName: string | null;
  result: VariationCheckResult | null;
  error: string | null;
};

const INITIAL_STATE: VariationCheckState = {
  status: 'idle',
  done: 0,
  total: 0,
  currentMachineName: null,
  result: null,
  error: null,
};

// ============================================================================
// Main Hook
// ============================================================================

export function useVariationStreamCheck() {
  const [state, setState] = useState<VariationCheckState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  const run = useCallback(
    async (
      locationId: string,
      machines: VariationCheckMachine[],
      includeJackpot?: boolean
    ): Promise<VariationCheckResult | null> => {
      if (!locationId || machines.length === 0) {
        const empty: VariationCheckResult = {
          hasVariations: false,
          totalVariation: 0,
          machines: [],
        };
        setState({ ...INITIAL_STATE, status: 'done', result: empty });
        return empty;
      }

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      setState({
        ...INITIAL_STATE,
        status: 'checking',
        total: machines.length,
      });

      try {
        const response = await fetch(
          '/api/collection-reports/check-variations',
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationId, machines, includeJackpot }),
            signal: abortController.signal,
          }
        );

        const result = await readSseStream<VariationCheckResult>(
          response,
          () => {},
          (_phase, done, total, machineName) => {
            setState(prev => ({
              ...prev,
              status: 'checking',
              done,
              total,
              currentMachineName: machineName ?? prev.currentMachineName,
            }));
          }
        );

        setState(prev => ({
          ...prev,
          status: 'done',
          done: result.machines.length,
          total: result.machines.length,
          currentMachineName: null,
          result,
        }));
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setState(prev => ({ ...prev, status: 'idle' }));
          return null;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState(prev => ({ ...prev, status: 'error', error: message }));
        return null;
      } finally {
        if (abortRef.current === abortController) abortRef.current = null;
      }
    },
    []
  );

  return {
    status: state.status,
    done: state.done,
    total: state.total,
    currentMachineName: state.currentMachineName,
    result: state.result,
    error: state.error,
    run,
    cancel,
    reset,
  };
}
