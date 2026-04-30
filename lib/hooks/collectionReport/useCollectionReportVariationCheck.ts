/**
 * useCollectionReportVariationCheck
 *
 * Hook for checking variations in unsaved collection report data before submission.
 * Manages loading, error, and minimized states for variation checking.
 *
 * Features:
 * - Calls /api/collection-report/check-variations endpoint
 * - Automatically re-checks when machines data changes (with debounce)
 * - Manages UI states (checking, complete, error, minimized)
 * - Provides methods to toggle minimize state and reset
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface CheckVariationsMachine {
  machineId: string;
  machineName?: string;
  metersIn: number;
  metersOut: number;
  sasStartTime?: string;
  sasEndTime?: string;
  prevMetersIn?: number;
  prevMetersOut?: number;
  /** Pre-calculated movement gross from a saved collection document (e.g. collection.movement.gross).
   * When provided the API uses this value directly instead of recalculating from raw meters,
   * which ensures RAM-clear entries produce the same meterGross as the report detail page. */
  movementGross?: number;
}

export interface MachineVariationData {
  machineId: string;
  machineName: string;
  variation: number | string;
  sasGross: number | string;
  meterGross: number;
  sasStartTime?: string | null;
  sasEndTime?: string | null;
}

export interface VariationsCheckResponse {
  hasVariations: boolean;
  totalVariation: number;
  machines: MachineVariationData[];
}

interface VariationCheckState {
  isChecking: boolean;
  checkComplete: boolean;
  hasVariations: boolean | null;
  variationsData: VariationsCheckResponse | null;
  error: string | null;
  isMinimized: boolean;
}

const DEFAULT_STATE: VariationCheckState = {
  isChecking: false,
  checkComplete: false,
  hasVariations: null,
  variationsData: null,
  error: null,
  isMinimized: false,
};

interface UseVariationCheckOptions {
  autoCheckOnEdit?: boolean; // Auto re-check when machines change
  debounceMs?: number; // Debounce delay for auto-check
}

export function useCollectionReportVariationCheck(options: UseVariationCheckOptions = {}) {
  const { debounceMs = 500 } = options;

  const [state, setState] = useState<VariationCheckState>(DEFAULT_STATE);
  const lastMachinesRef = useRef<CheckVariationsMachine[] | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check variations for the given machines in a location
   */
  const checkVariations = useCallback(
    async (locationId: string, machines: CheckVariationsMachine[], includeJackpot?: boolean) => {
      if (!locationId || machines.length === 0) {
        setState(prev => ({ ...prev, error: 'Invalid location or machines' }));
        return;
      }

      setState({
        isChecking: true,
        checkComplete: false,
        hasVariations: null,
        variationsData: null,
        error: null,
        isMinimized: false,
      });

      try {
        const response = await fetch('/api/collection-reports/check-variations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            machines,
            includeJackpot,
          }),
        });

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
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
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
    (locationId: string, machines: CheckVariationsMachine[], includeJackpot?: boolean) => {
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
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    lastMachinesRef.current = null;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

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

    // Methods
    checkVariations,
    triggerAutoCheck,
    toggleMinimize,
    reset,
  };
}
