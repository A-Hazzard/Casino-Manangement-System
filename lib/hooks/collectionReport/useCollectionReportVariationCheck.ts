/**
 * useCollectionReportVariationCheck
 *
 * Hook for checking variations in unsaved collection report data before submission.
 * Manages loading, error, and minimized states for variation checking.
 *
 * Features:
 * - Calls /api/collection-reports/check-variations endpoint
 * - Automatically re-checks when machines data changes (with debounce)
 * - Manages UI states (checking, complete, error, minimized)
 * - Pre-creates manual meter documents for offline/non-SMIB machines before
 *   the variation check fires, with per-machine progress state
 * - Provides methods to toggle minimize state and reset
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type CheckVariationsMachine = {
  machineId: string;
  machineName?: string;
  metersIn: number;
  metersOut: number;
  sasStartTime?: string | Date;
  sasEndTime?: string | Date;
  prevMetersIn?: number;
  prevMetersOut?: number;
  /** Pre-calculated movement gross from a saved collection document (e.g. collection.movement.gross).
   * When provided the API uses this value directly instead of recalculating from raw meters,
   * which ensures RAM-clear entries produce the same meterGross as the report detail page. */
  movementGross?: number;
  /** Pre-computed SAS gross from a saved collection's sasMeters.gross.
   * When provided the API uses this value directly instead of querying live Meters,
   * which prevents offline SMIB machines from showing phantom variation. */
  storedSasGross?: number;
}

export type MachineVariationData = {
  machineId: string;
  machineName: string;
  variation: number | string;
  sasGross: number | string;
  meterGross: number;
  sasStartTime?: string | Date | null;
  sasEndTime?: string | Date | null;
}

export type VariationsCheckResponse = {
  hasVariations: boolean;
  totalVariation: number;
  machines: MachineVariationData[];
}

export type PreCreateMeterPayload = {
  machineId: string;
  collectionId?: string;
  locationId: string;
  sessionId?: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  customName?: string;
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  sasEndTime?: string | Date;
};

type VariationCheckState = {
  isChecking: boolean;
  checkComplete: boolean;
  hasVariations: boolean | null;
  variationsData: VariationsCheckResponse | null;
  error: string | null;
  isMinimized: boolean;
  isPreCreating: boolean;
  currentMeterMachineName: string | null;
  meterCreationError: string | null;
}

const DEFAULT_STATE: VariationCheckState = {
  isChecking: false,
  checkComplete: false,
  hasVariations: null,
  variationsData: null,
  error: null,
  isMinimized: false,
  isPreCreating: false,
  currentMeterMachineName: null,
  meterCreationError: null,
};

type UseVariationCheckOptions = {
  autoCheckOnEdit?: boolean; // Auto re-check when machines change
  debounceMs?: number; // Debounce delay for auto-check
}

export function useCollectionReportVariationCheck(
  options: UseVariationCheckOptions = {}
) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { debounceMs = 500 } = options;

  const [state, setState] = useState<VariationCheckState>(DEFAULT_STATE);
  const lastMachinesRef = useRef<CheckVariationsMachine[] | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Check variations for the given machines in a location
   */
  const checkVariations = useCallback(
    async (
      locationId: string,
      machines: CheckVariationsMachine[],
      includeJackpot?: boolean
    ) => {
      if (!locationId) {
        setState(prev => ({ ...prev, error: 'Invalid location' }));
        return;
      }

      // If no machines to check (e.g. all machines are offline), trivially
      // no variations — skip the API call entirely.
      if (machines.length === 0) {
        setState({
          ...DEFAULT_STATE,
          checkComplete: true,
          hasVariations: false,
          variationsData: {
            hasVariations: false,
            totalVariation: 0,
            machines: [],
          },
        });
        return;
      }

      setState({
        ...DEFAULT_STATE,
        isChecking: true,
      });

      try {
        const response = await fetch(
          '/api/collection-reports/check-variations',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locationId,
              machines,
              includeJackpot,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to check variations');
        }

        const data = await response.json();

        setState(prev => ({
          ...prev,
          isChecking: false,
          checkComplete: true,
          hasVariations: data.data.hasVariations,
          variationsData: data.data,
          error: null,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setState(prev => ({
          ...prev,
          isChecking: false,
          checkComplete: false,
          hasVariations: null,
          variationsData: null,
          error: errorMessage,
        }));
      }
    },
    []
  );

  /**
   * Auto re-check when machines change (with debounce)
   */
  const triggerAutoCheck = useCallback(
    (
      locationId: string,
      machines: CheckVariationsMachine[],
      includeJackpot?: boolean
    ) => {
      // Debounce re-checks
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        // Only check if we have a previous check and machines have changed
        if (state.checkComplete && machines.length > 0) {
          checkVariations(locationId, machines, includeJackpot);
        }
      }, debounceMs);

      lastMachinesRef.current = machines;
    },
    [state.checkComplete, checkVariations, debounceMs]
  );

  /**
   * Toggle minimize state
   */
  const toggleMinimize = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  }, []);

  /**
   * Pre-create manual meters for offline/non-SMIB machines, then run the
   * variation check. Shows per-machine progress in the UI.
   *
   * - If no preCreatePayloads are provided, skips straight to checkVariations.
   * - On any meter-creation failure, sets meterCreationError and stops — the
   *   variation check does NOT run.
   */
  const preCreateThenCheck = useCallback(
    async (
      locationId: string,
      variationMachines: CheckVariationsMachine[],
      preCreatePayloads: PreCreateMeterPayload[],
      includeJackpot?: boolean
    ) => {
      if (!locationId || (variationMachines.length === 0 && preCreatePayloads.length === 0)) {
        setState(prev => ({ ...prev, error: 'Invalid location or machines' }));
        return;
      }

      console.log(
        `[preCreateThenCheck] ▶️ location=${locationId} preCreatePayloads=${preCreatePayloads.length} variationMachines=${variationMachines.length}`
      );

      // ============================================================
      // Phase 1: Pre-create meters for offline/non-SMIB machines
      // ============================================================
      if (preCreatePayloads.length > 0) {
        setState({
          ...DEFAULT_STATE,
          isPreCreating: true,
        });

        // Track whether any meter was actually written to the DB so we can
        // guarantee the "Creating Manual Meters" message stays visible long
        // enough for the user to read it.  React renders are macro-tasks; very
        // fast local-dev fetches complete as microtasks before the first paint,
        // so without an explicit floor the message can be skipped entirely.
        const preCreateStartTime = Date.now();
        let anyMeterCreated = false;

        for (const payload of preCreatePayloads) {
          setState(prev => ({
            ...prev,
            currentMeterMachineName: payload.customName ?? 'Machine',
          }));

          console.log(
            `[preCreateThenCheck] 📤 POST pre-create-meters machine=${payload.machineId} ` +
              `customName="${payload.customName ?? 'Machine'}" collection=${payload.collectionId ?? 'none'}`
          );

          try {
            const response = await fetch(
              '/api/collection-reports/pre-create-meters',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...payload,
                  sasEndTime:
                    payload.sasEndTime instanceof Date
                      ? payload.sasEndTime.toISOString()
                      : payload.sasEndTime,
                }),
              }
            );

            const data = await response.json();

            console.log(
              `[preCreateThenCheck] 📥 Response machine=${payload.machineId} status=${response.status} ` +
                `success=${data.success} created=${data.created} skipped=${data.skipped} error=${data.error ?? 'none'}`
            );

            if (!response.ok || !data.success) {
              const displayName =
                data.customName ?? payload.customName ?? 'Machine';
              console.error(
                `[preCreateThenCheck] ❌ Failed for machine=${payload.machineId} ("${displayName}"): ${data.error ?? 'unknown'}`
              );
              setState(prev => ({
                ...prev,
                isPreCreating: false,
                currentMeterMachineName: displayName,
                meterCreationError:
                  data.error ?? 'Failed to create meter documents',
              }));
              return;
            }

            if (data.created) {
              anyMeterCreated = true;
            } else if (!data.skipped) {
              const displayName =
                data.customName ?? payload.customName ?? 'Machine';
              console.error(
                `[preCreateThenCheck] ❌ Meter not created and not skipped for machine=${payload.machineId} ("${displayName}")`
              );
              setState(prev => ({
                ...prev,
                isPreCreating: false,
                currentMeterMachineName: displayName,
                meterCreationError: `Failed to create meter for ${displayName}`,
              }));
              return;
            }
          } catch (err) {
            console.error(
              `[preCreateThenCheck] ❌ Network error for machine=${payload.machineId}:`,
              err instanceof Error ? err.message : 'Unknown error'
            );
            setState(prev => ({
              ...prev,
              isPreCreating: false,
              meterCreationError:
                err instanceof Error ? err.message : 'Unknown error occurred',
            }));
            return;
          }
        }

        console.log(
          `[preCreateThenCheck] Phase 1 complete — anyMeterCreated=${anyMeterCreated}`
        );

        // If meters were created, hold the message on screen for at least
        // 1 second — this is the explicit visual confirmation that the meter
        // exists before the variation check fires.  Online SMIB machines that
        // were skipped (data.created === false) get no artificial delay.
        if (anyMeterCreated) {
          const elapsed = Date.now() - preCreateStartTime;
          const MIN_DISPLAY_MS = 1000;
          if (elapsed < MIN_DISPLAY_MS) {
            await new Promise<void>(resolve =>
              setTimeout(resolve, MIN_DISPLAY_MS - elapsed)
            );
          }
        }

        // All pre-creates confirmed done — clear phase before handing off
        setState(prev => ({
          ...prev,
          isPreCreating: false,
          currentMeterMachineName: null,
        }));
      }

      // ============================================================
      // Phase 2: Run variation check (only for online machines)
      // ============================================================
      if (variationMachines.length === 0) {
        // All machines are offline/non-SMIB — no SAS data to compare
        // against. The manually-created meters match collection values
        // exactly, so variation is trivially 0. Skip the API call entirely.
        console.log(
          '[preCreateThenCheck] ⏭️ No online machines — skipping variation check'
        );
        setState(prev => ({
          ...prev,
          isChecking: false,
          checkComplete: true,
          hasVariations: false,
          variationsData: {
            hasVariations: false,
            totalVariation: 0,
            machines: [],
          },
          error: null,
        }));
      } else {
        console.log(
          '[preCreateThenCheck] ▶️ Phase 2: running variation check'
        );
        await checkVariations(locationId, variationMachines, includeJackpot);
      }
    },
    [checkVariations]
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    lastMachinesRef.current = null;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Cleanup debounce timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isChecking: state.isChecking,
    checkComplete: state.checkComplete,
    hasVariations: state.hasVariations,
    variationsData: state.variationsData,
    error: state.error,
    isMinimized: state.isMinimized,
    isPreCreating: state.isPreCreating,
    currentMeterMachineName: state.currentMeterMachineName,
    meterCreationError: state.meterCreationError,

    // Methods
    checkVariations,
    preCreateThenCheck,
    triggerAutoCheck,
    toggleMinimize,
    reset,
  };
}
