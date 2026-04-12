/**
 * useCollectionReportVariationCheckFlow
 *
 * Manages the complete variation checking flow for collection report creation/editing.
 * Handles: check popover visibility, variations display state, confirmation dialogs.
 *
 * This hook orchestrates the full pre-submission validation flow:
 * 1. Show variation check popover with spinner
 * 2. Call check-variations API
 * 3. Handle result: show variations list or success state
 * 4. Allow minimizing variations modal
 * 5. Show final confirmation before submitting with variations
 */

import { useState, useCallback } from 'react';
import { useCollectionReportVariationCheck, type CheckVariationsMachine } from './useCollectionReportVariationCheck';

type VariationFlowState = 'idle' | 'checking' | 'no-variations' | 'with-variations' | 'error' | 'minimized';

interface UseVariationCheckFlowOptions {
  autoCheckOnEdit?: boolean;
  debounceMs?: number;
}

export function useCollectionReportVariationCheckFlow(options: UseVariationCheckFlowOptions = {}) {
  const {
    isChecking,
    checkComplete,
    hasVariations,
    variationsData,
    error,
    isMinimized,
    checkVariations: performCheck,
    toggleMinimize,
    reset,
  } = useCollectionReportVariationCheck(options);

  const [flowState, setFlowState] = useState<VariationFlowState>('idle');
  const [showConfirmationWithVariations, setShowConfirmationWithVariations] = useState(false);

  /**
   * Start the variation check flow
   */
  const startVariationCheck = useCallback(
    async (locationId: string, machines: CheckVariationsMachine[], includeJackpot?: boolean) => {
      setFlowState('checking');
      await performCheck(locationId, machines, includeJackpot);
    },
    [performCheck]
  );

  /**
   * Handle check completion - determine next state
   */
  const handleCheckComplete = useCallback(() => {
    if (error) {
      setFlowState('error');
    } else if (!hasVariations) {
      setFlowState('no-variations');
    } else {
      setFlowState('with-variations');
    }
  }, [error, hasVariations]);

  /**
   * User minimized the variations modal
   */
  const handleMinimizeVariations = useCallback(() => {
    toggleMinimize();
    setFlowState('minimized');
  }, [toggleMinimize]);

  /**
   * User clicked submit after reviewing/minimizing variations
   */
  const handleSubmitWithVariations = useCallback(() => {
    setShowConfirmationWithVariations(true);
  }, []);

  /**
   * User confirmed submission with variations
   */
  const handleConfirmSubmitWithVariations = useCallback(() => {
    setShowConfirmationWithVariations(false);
    setFlowState('idle');
    reset();
    // Return signal to proceed with actual submission
    return true;
  }, [reset]);

  /**
   * Cancel the variation check flow
   */
  const handleCancel = useCallback(() => {
    setFlowState('idle');
    setShowConfirmationWithVariations(false);
    reset();
  }, [reset]);

  /**
   * Retry variation check
   */
  const handleRetry = useCallback(
    async (locationId: string, machines: CheckVariationsMachine[], includeJackpot?: boolean) => {
      setFlowState('checking');
      await performCheck(locationId, machines, includeJackpot);
    },
    [performCheck]
  );

  return {
    // State
    flowState,
    isChecking,
    checkComplete,
    hasVariations,
    variationsData,
    error,
    isMinimized,
    showConfirmationWithVariations,

    // Methods
    startVariationCheck,
    handleCheckComplete,
    handleMinimizeVariations,
    handleSubmitWithVariations,
    handleConfirmSubmitWithVariations,
    handleCancel,
    handleRetry,
  };
}
