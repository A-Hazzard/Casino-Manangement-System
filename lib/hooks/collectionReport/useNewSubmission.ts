/**
 * useNewSubmission Hook
 *
 * Manages report creation and submission for the New Collection Report Modal.
 * Handles the create report flow with streaming progress, validation, and confirmation.
 *
 * Architecture:
 * - Receives shared state and functions from main hook via props
 * - Local state for processing UI (progress, phases, confirmations)
 * - Uses streaming API for real-time phase updates
 * - Validates before submission
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createCollectionReportStreaming } from '@/lib/helpers/collectionReport/fetching';
import { validateCollectionReportPayload } from '@/lib/utils/validation/collectionReports';
import { calculateCabinetMovement } from '@/lib/utils/movement';
import type { CollectionDocument } from '@/lib/types/collection';
import type { CreateCollectionReportPayload, MachineVariationData, VariationsCheckResponse } from '@/lib/types/api';
import type { ProcessingPhase, SubStepProgress } from '@/components/shared/ui/ProcessingPhaseBar';
import { toast } from 'sonner';

// ============================================================================
// Type Definitions
// ============================================================================

type UseNewSubmissionProps = {
  // Store state
  collectedMachineEntries: CollectionDocument[];
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
  selectedLocationId: string | undefined;
  selectedLocationName: string;
  lockedLocationId: string | undefined;
  userId: string | undefined;
  currentCollectionTime: Date;
  previousCollectionTime: string | Date | undefined;
  selectedLocation: { profitShare?: number; includeJackpot?: boolean } | null;
  setCollectedMachines: (machines: CollectionDocument[]) => void;
  setLockedLocation: (id: string | undefined) => void;
  setSelectedLocation: (id: string | undefined, name: string) => void;
  setHasChanges: (v: boolean) => void;
  resetStoreState: () => void;

  // Callbacks
  onSuccess?: () => void;
  onRefresh?: () => void;
  onClose: () => void;
  logActivityCallback: (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null
  ) => Promise<void>;
};

// ============================================================================
// Helper Functions
// ============================================================================

function buildCreatePhases(machineCount: number): ProcessingPhase[] {
  return [
    { key: 'validating', label: 'Validating report data', estimatedMs: 500 },
    { key: 'saving', label: 'Saving report', estimatedMs: 600 },
    { key: 'recalculating', label: 'Updating machine records', estimatedMs: Math.max(600, machineCount * 30), detail: `${machineCount} machine${machineCount !== 1 ? 's' : ''}` },
    { key: 'variation', label: 'Calculating variation', estimatedMs: 1200 },
    { key: 'meters', label: 'Creating meter records', estimatedMs: Math.max(500, machineCount * 20), detail: `${machineCount} machine${machineCount !== 1 ? 's' : ''}` },
    { key: 'activity', label: 'Recording activity', estimatedMs: 500 },
  ];
}

// ============================================================================
// Main Hook
// ============================================================================

export function useNewSubmission({
  collectedMachineEntries,
  financials,
  selectedLocationId,
  selectedLocationName,
  lockedLocationId,
  userId,
  currentCollectionTime,
  previousCollectionTime,
  selectedLocation,
  setCollectedMachines,
  setLockedLocation,
  setSelectedLocation,
  setHasChanges,
  resetStoreState,
  onSuccess,
  onRefresh,
  onClose,
  logActivityCallback,
}: UseNewSubmissionProps) {
  // ==========================================================================
  // Local State - UI-specific concerns
  // ==========================================================================

  const [isProcessing, setIsProcessing] = useState(false);
  const isCreatingRef = useRef(false);
  const [currentCreatePhase, setCurrentCreatePhase] = useState<string | undefined>();
  const [createReportProgress, setCreateReportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [currentSubStep, setCurrentSubStep] = useState<SubStepProgress | null>(null);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] = useState(false);
  const createProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const createPhases = buildCreatePhases(collectedMachineEntries.length);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * Create collection report from collected machines
   */
  const handleCreateReport = useCallback(
    async (variationsData?: VariationsCheckResponse | null) => {
      if (isCreatingRef.current) return;
      isCreatingRef.current = true;
      try {
        console.log('🚀 [NewCollection] handleCreateReport started', {
          hasVariationsData: !!variationsData,
        });
        setIsProcessing(true);

        const locationIdToUse = lockedLocationId || selectedLocationId;
        const collectedEntries = collectedMachineEntries;

        console.log('📍 [NewCollection] Location targeting:', {
          locationIdToUse,
          locationName: selectedLocationName,
          machinesCount: collectedEntries.length,
        });

        if (!locationIdToUse || collectedEntries.length === 0) {
          console.error('❌ [NewCollection] Blocked creation:', {
            reason: !locationIdToUse ? 'Missing location ID' : 'Empty machine list',
            locationIdToUse,
            machinesCount: collectedEntries.length,
          });
          toast.error(`Cannot create report: ${!locationIdToUse ? 'Location' : 'Machines'} missing.`);
          return;
        }

        // Start animated per-machine counter
        const progressTotal = collectedEntries.length;
        let progressDone = 0;
        setCreateReportProgress({ done: 0, total: progressTotal });
        const stepMs = Math.max(80, 3000 / progressTotal);
        createProgressIntervalRef.current = setInterval(() => {
          progressDone++;
          if (progressDone >= progressTotal - 1 && createProgressIntervalRef.current) {
            clearInterval(createProgressIntervalRef.current);
            createProgressIntervalRef.current = null;
          }
          setCreateReportProgress({ done: progressDone, total: progressTotal });
        }, stepMs);

        // PHASE 0: Verbose per-machine validation
        if (createProgressIntervalRef.current) {
          clearInterval(createProgressIntervalRef.current);
          createProgressIntervalRef.current = null;
        }

        setCurrentSubStep({
          phaseKey: 'validating',
          done: 0,
          total: progressTotal,
          detail: 'Starting validation...',
        });

        for (let index = 0; index < collectedEntries.length; index++) {
          const entry = collectedEntries[index];
          const machineName =
            entry.machineName || entry.serialNumber || entry.machineId || `Machine ${index + 1}`;
          const detail = entry.ramClear ? 'RAM clear & meters' : 'meters, movement & SAS window';

          setCurrentSubStep({
            phaseKey: 'validating',
            done: index + 1,
            total: progressTotal,
            machineName,
            detail,
          });
          setCreateReportProgress({ done: index + 1, total: progressTotal });

          if (!entry.machineId) {
            throw new Error(`${machineName} is missing a machine ID.`);
          }
          if (
            typeof entry.metersIn !== 'number' ||
            isNaN(entry.metersIn) ||
            typeof entry.metersOut !== 'number' ||
            isNaN(entry.metersOut)
          ) {
            throw new Error(`${machineName} has invalid meter values.`);
          }

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
          if (
            !Number.isFinite(movement.metersIn) ||
            !Number.isFinite(movement.metersOut) ||
            !Number.isFinite(movement.gross)
          ) {
            throw new Error(`${machineName} produced an invalid movement calculation.`);
          }

          // Yield to React so the UI updates for each machine
          await new Promise<void>((resolve) => setTimeout(resolve, 5));
        }

        setCurrentSubStep({
          phaseKey: 'validating',
          done: progressTotal,
          total: progressTotal,
          detail: 'Validation complete',
        });

        const totalMovementData = collectedEntries.map((entry) => {
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

        const reportTotalData = totalMovementData.reduce(
          (prev, current) => ({
            drop: prev.drop + current.drop,
            cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
            gross: prev.gross + current.gross,
          }),
          { drop: 0, cancelledCredits: 0, gross: 0 }
        );

        const reportId = uuidv4();

        const payload: CreateCollectionReportPayload = {
          variance: Number(financials.variance) || 0,
          previousBalance: Number(financials.previousBalance) || 0,
          currentBalance: 0,
          amountToCollect: Number(financials.amountToCollect) || 0,
          amountCollected:
            Number(financials.collectedAmount) || Number(financials.amountToCollect) || 0,
          amountUncollected: 0,
          partnerProfit: 0,
          taxes: Number(financials.taxes) || 0,
          advance: Number(financials.advance) || 0,
          collector: userId || 'unknown',
          locationName: selectedLocationName,
          locationReportId: reportId,
          location: locationIdToUse,
          totalDrop: reportTotalData.drop,
          totalCancelled: reportTotalData.cancelledCredits,
          totalGross: reportTotalData.gross,
          totalSasGross:
            variationsData?.machines.reduce(
              (sum: number, machineData: MachineVariationData) =>
                sum + (Number(machineData.sasGross) || 0),
              0
            ) || 0,
          timestamp:
            collectedEntries.length > 0
              ? new Date(
                  Math.max(
                    ...collectedEntries.map((entry) =>
                      entry.timestamp
                        ? new Date(entry.timestamp).getTime()
                        : currentCollectionTime.getTime()
                    )
                  )
                )
              : currentCollectionTime,
          varianceReason: financials.varianceReason,
          previousCollectionTime: previousCollectionTime
            ? typeof previousCollectionTime === 'string'
              ? new Date(previousCollectionTime)
              : previousCollectionTime
            : undefined,
          locationProfitPerc: selectedLocation?.profitShare || 50,
          reasonShortagePayment: financials.reasonForShortagePayment,
          balanceCorrection: Number(financials.balanceCorrection) || 0,
          balanceCorrectionReas: financials.balanceCorrectionReason,
          includeJackpot: selectedLocation?.includeJackpot || false,
          machines: collectedEntries.map((entry) => {
            const varData = variationsData?.machines.find(
              (variationMachine) => variationMachine.machineId === entry.machineId
            );
            return {
              collectionId: entry._id,
              machineId: String(entry.machineId),
              locationId: selectedLocationId || '',
              metersIn: entry.metersIn,
              metersOut: entry.metersOut,
              prevMetersIn: entry.prevIn || 0,
              prevMetersOut: entry.prevOut || 0,
              timestamp: entry.timestamp,
              locationReportId: reportId,
              sasGross: varData ? Number(varData.sasGross) || 0 : undefined,
              variation: varData ? Number(varData.variation) || 0 : undefined,
              ramClear: entry.ramClear,
              ramClearMetersIn: entry.ramClearMetersIn,
              ramClearMetersOut: entry.ramClearMetersOut,
            };
          }),
          collectionIds: collectedEntries.map((entry) => entry._id),
        };

        const validation = validateCollectionReportPayload(payload);
        if (!validation.isValid) {
          console.error('❌ [NewCollection] Validation failed:', {
            errors: validation.errors,
            payload,
          });
          toast.error(`Validation Error: ${validation.errors.join(', ')}`, {
            duration: 8000,
            position: 'top-center',
          });
          return;
        }

        console.log('📤 [NewCollection] Sending payload to API...', payload);

        const result = await createCollectionReportStreaming(
          payload,
          setCurrentCreatePhase,
          (phase, done, total, machineName) =>
            setCurrentSubStep({ phaseKey: phase, done, total, machineName })
        );

        // Snap counter to complete before the dialog closes
        if (createProgressIntervalRef.current) {
          clearInterval(createProgressIntervalRef.current);
          createProgressIntervalRef.current = null;
        }
        setCreateReportProgress({ done: progressTotal, total: progressTotal });
        setCurrentCreatePhase(undefined);
        setCurrentSubStep(null);

        const reportData = result.report as Record<string, unknown>;
        await logActivityCallback(
          'create',
          'collection-report',
          String(reportData._id),
          `Collection Report for ${selectedLocationName}`,
          `Created collection report for ${collectedEntries.length} machines at ${selectedLocationName}`,
          null,
          reportData
        );

        toast.success('Collection report created successfully', {
          duration: 5000,
        });
        setCollectedMachines([]);
        setLockedLocation(undefined);
        setSelectedLocation(undefined, '');
        setHasChanges(true);
        setShowCreateReportConfirmation(false);
        if (onSuccess) onSuccess();
        if (onRefresh) onRefresh();
        onClose();
      } catch (error) {
        if (createProgressIntervalRef.current) {
          clearInterval(createProgressIntervalRef.current);
          createProgressIntervalRef.current = null;
        }
        setCreateReportProgress(null);
        setCurrentSubStep(null);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to create report: ${errorMessage}`);
      } finally {
        isCreatingRef.current = false;
        setIsProcessing(false);
        setTimeout(() => {
          setCreateReportProgress(null);
          setCurrentSubStep(null);
        }, 600);
      }
    },
    [
      collectedMachineEntries,
      financials,
      lockedLocationId,
      selectedLocationId,
      selectedLocationName,
      userId,
      currentCollectionTime,
      previousCollectionTime,
      selectedLocation,
      setCollectedMachines,
      setLockedLocation,
      setSelectedLocation,
      setHasChanges,
      onSuccess,
      onRefresh,
      onClose,
      logActivityCallback,
    ]
  );

  /**
   * Discard changes and close modal
   */
  const handleDiscardChanges = useCallback(() => {
    setCollectedMachines([]);
    setLockedLocation(undefined);
    setSelectedLocation(undefined, '');
    setHasChanges(false);
    resetStoreState();
    onClose();
  }, [setCollectedMachines, setLockedLocation, setSelectedLocation, setHasChanges, resetStoreState, onClose]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    isProcessing,
    currentCreatePhase,
    createReportProgress,
    currentSubStep,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    createPhases,

    // Handlers
    handleCreateReport,
    handleDiscardChanges,
  };
}