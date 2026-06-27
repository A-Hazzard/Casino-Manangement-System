/**
 * useNewFinancials Hook
 *
 * Manages financial calculations and state for the New Collection Report Modal.
 * Handles amount to collect, total movement, taxes, advance, variance, etc.
 *
 * Architecture:
 * - Receives shared state and functions from main hook via props
 * - Computed values derived from collected entries
 * - Callbacks for recalculating when entries change
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback } from 'react';
import { calculateCabinetMovement } from '@/lib/utils/movement';
import type { CollectionDocument } from '@/lib/types/collection';

// ============================================================================
// Type Definitions
// ============================================================================

type UseNewFinancialsProps = {
  // Store state
  financials: {
    taxes: string;
    advance: string;
    variance: string;
    varianceReason: string;
    amountToCollect: string;
    collectedAmount: string;
    balanceCorrection: string;
    balanceCorrectionReason: string;
    previousBalance: string;
    reasonForShortagePayment: string;
  };
  setFinancials: (financials: Partial<{
    taxes: string;
    advance: string;
    variance: string;
    varianceReason: string;
    amountToCollect: string;
    collectedAmount: string;
    balanceCorrection: string;
    balanceCorrectionReason: string;
    previousBalance: string;
    reasonForShortagePayment: string;
  }>) => void;
  locationCollectionBalance: number;
  locationProfitShare: number;

  // Entries for calculation
  collectedMachineEntries: CollectionDocument[];
};

// ============================================================================
// Main Hook
// ============================================================================

export function useNewFinancials({
  financials,
  setFinancials,
  locationCollectionBalance,
  locationProfitShare,
  collectedMachineEntries,
}: UseNewFinancialsProps) {
  // ==========================================================================
  // Computed Values
  // ==========================================================================

  /**
   * Calculate total movement from collected entries
   */
  const calculateTotalMovementFromEntries = useCallback(() => {
    if (!collectedMachineEntries.length) {
      return { drop: 0, cancelledCredits: 0, gross: 0 };
    }

    const totalMovementData = collectedMachineEntries.map((entry) => {
      const movement = calculateCabinetMovement(
        entry.metersIn || 0,
        entry.metersOut || 0,
        entry.prevIn || 0,
        entry.prevOut || 0,
        entry.ramClear || false,
        undefined,
        undefined,
        entry.ramClearMetersIn,
        entry.ramClearMetersOut
      );
      return {
        drop: movement.metersIn,
        cancelledCredits: movement.metersOut,
        gross: movement.gross,
      };
    });

    return totalMovementData.reduce(
      (prev, current) => ({
        drop: prev.drop + current.drop,
        cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
        gross: prev.gross + current.gross,
      }),
      { drop: 0, cancelledCredits: 0, gross: 0 }
    );
  }, [collectedMachineEntries]);

  /**
   * Calculate amount to collect based on current entries and financials
   */
  const calculateAmountToCollect = useCallback(() => {
    if (!collectedMachineEntries.length) {
      if (financials.amountToCollect !== '0') {
        setFinancials({ amountToCollect: '0' });
      }
      return;
    }

    const hasValidData = collectedMachineEntries.some(
      (entry) => entry.metersIn !== undefined && entry.metersOut !== undefined
    );
    if (!hasValidData) {
      if (financials.amountToCollect !== '0') {
        setFinancials({ amountToCollect: '0' });
      }
      return;
    }

    const totalMovementData = calculateTotalMovementFromEntries();

    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;
    const balanceCorrection = Number(financials.balanceCorrection) || 0;
    const profitShare = locationProfitShare;

    const partnerProfit =
      ((totalMovementData.gross - variance - advance) * profitShare) / 100 - taxes;
    const amountToCollect =
      totalMovementData.gross - variance - advance - partnerProfit + locationCollectionBalance + balanceCorrection;

    const collectedAmount = Number(financials.collectedAmount) || 0;

    const nextAmountToCollect = amountToCollect.toFixed(2);
    const nextPreviousBalance = (collectedAmount - amountToCollect).toFixed(2);

    if (
      financials.amountToCollect !== nextAmountToCollect ||
      financials.previousBalance !== nextPreviousBalance
    ) {
      setFinancials({
        amountToCollect: nextAmountToCollect,
        previousBalance: nextPreviousBalance,
      });
    }
  }, [
    collectedMachineEntries,
    calculateTotalMovementFromEntries,
    financials.taxes,
    financials.variance,
    financials.advance,
    financials.balanceCorrection,
    financials.collectedAmount,
    locationCollectionBalance,
    locationProfitShare,
    setFinancials,
  ]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * Handle financial field changes
   */
  const handleFinancialChange = useCallback(
    (field: string, value: string | number) => {
      setFinancials({ [field]: value.toString() });
    },
    [setFinancials]
  );

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    financials,
    setFinancials,

    // Computed
    totalMovement: calculateTotalMovementFromEntries(),

    // Handlers
    handleFinancialChange,
    calculateAmountToCollect,
    calculateTotalMovementFromEntries,
  };
}