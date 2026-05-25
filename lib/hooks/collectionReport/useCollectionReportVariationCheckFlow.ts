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

import { useState } from 'react';
import {
  useCollectionReportVariationCheck,
  type CheckVariationsMachine,
} from './useCollectionReportVariationCheck';

type VariationFlowState =
  | 'idle'
  | 'checking'
  | 'no-variations'
  | 'with-variations'
  | 'error'
  | 'minimized';

interface UseVariationCheckFlowOptions {
  autoCheckOnEdit?: boolean;
  debounceMs?: number;
}

export function useCollectionReportVariationCheckFlow(
  options: UseVariationCheckFlowOptions = {}
) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
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
  const [showConfirmationWithVariations, setShowConfirmationWithVariations] =
    useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Start the variation check flow
   */
  const startVariationCheck = async (
      locationId: string,
      machines: CheckVariationsMachine[],
      includeJackpot?: boolean
    ) => {
      setFlowState('checking');
      await performCheck(locationId, machines, includeJackpot);
    };

  /**
   * Handle check completion - determine next state
   */
  const handleCheckComplete = () => {
    if (error) {
      setFlowState('error');
    } else if (!hasVariations) {
      setFlowState('no-variations');
    } else {
      setFlowState('with-variations');
    }
  };

  /**
   * User minimized the variations modal
   */
  const handleMinimizeVariations = () => {
    toggleMinimize();
    setFlowState('minimized');
  };

  /**
   * User clicked submit after reviewing/minimizing variations
   */
  const handleSubmitWithVariations = () => {
    setShowConfirmationWithVariations(true);
  };

  /**
   * User confirmed submission with variations
   */
  const handleConfirmSubmitWithVariations = () => {
    setShowConfirmationWithVariations(false);
    setFlowState('idle');
    reset();
    // Return signal to proceed with actual submission
    return true;
  };

  /**
   * Cancel the variation check flow
   */
  const handleCancel = () => {
    setFlowState('idle');
    setShowConfirmationWithVariations(false);
    reset();
  };

  /**
   * Retry variation check
   */
  const handleRetry = async (
      locationId: string,
      machines: CheckVariationsMachine[],
      includeJackpot?: boolean
    ) => {
      setFlowState('checking');
      await performCheck(locationId, machines, includeJackpot);
    };

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
