/**
 * useMobileEditSubmit Hook
 *
 * Handles the submission logic for the Mobile Edit Collection Modal:
 * - Calculating amount to collect
 * - Updating collection report (updateCollectionReportHandler)
 * - Validation and reconciliation
 */

'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { calculateCabinetMovement } from '@/lib/utils/movement';
import { updateCollectionReportStreaming } from '@/lib/helpers/collectionReport/fetching';
import { validateCollectionReportPayload } from '@/lib/utils/validation';
import type {
  CollectionDocument,
  MobileModalState,
  SubStepProgress,
} from './types';
import type { VariationsCheckResponse, CreateCollectionReportPayload } from '@/lib/types/api';

type UseMobileEditSubmitProps = {
  reportId: string;
  modalState: MobileModalState;
  setModalState: Dispatch<SetStateAction<MobileModalState>>;
  selectedLocationId: string | undefined;
  selectedLocationName: string;
  collectedMachines: CollectionDocument[];
  financials: MobileModalState['financials'];
  originalCollections: CollectionDocument[];
  editingEntryId: string | null;
  selectedMachineData: MobileModalState['selectedMachineData'];
  formData: MobileModalState['formData'];
  user: { _id: string; username: string } | null;
  onRefresh: () => void;
  onClose: () => void;
  show: boolean;
  locations: import('@/lib/types/api').CollectionReportLocationWithMachines[];
};

export function useMobileEditSubmit({
  reportId,
  modalState,
  setModalState,
  selectedLocationId,
  selectedLocationName,
  collectedMachines,
  financials,
  originalCollections,
  editingEntryId,
  selectedMachineData,
  formData,
  user,
  onRefresh,
  onClose,
  locations,
}: UseMobileEditSubmitProps) {
  // ============================================================================
  // State & Refs
  // ============================================================================
  const [currentSubStep, setCurrentSubStep] = useState<SubStepProgress | null>(null);
  const [currentEditPhase, setCurrentEditPhase] = useState<string | undefined>(
    undefined
  );

  const locationsRef = useRef<import('@/lib/types/api').CollectionReportLocationWithMachines[]>(locations);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // ============================================================================
  // Financial Calculations
  // ============================================================================
  const calculateAmountToCollect = useCallback(() => {
    if (
      collectedMachines.length === 0 ||
      modalState.isLoadingCollections
    ) {
      setModalState(prev => ({
        ...prev,
        financials: { ...prev.financials, amountToCollect: '0' },
      }));
      return;
    }

    const totalMovementData = collectedMachines.map(entry => {
      const movement = calculateCabinetMovement(
        entry.metersIn || 0,
        entry.metersOut || 0,
        entry.prevIn || 0,
        entry.prevOut || 0,
        entry.ramClear || false,
        undefined,
        undefined,
        entry.ramClearMetersIn ?? undefined,
        entry.ramClearMetersOut ?? undefined
      );
      return {
        gross: movement.gross,
      };
    });

    const totalGross = totalMovementData.reduce(
      (sum, machineEntry) => sum + machineEntry.gross,
      0
    );

    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;
    const previousBalance = Number(financials.previousBalance) || 0;

    const location = locationsRef.current?.find(
      loc =>
        String(loc._id) ===
        (modalState.lockedLocationId || selectedLocationId || modalState.selectedLocation)
    );
    const profitShare = location?.profitShare ?? 50;

    const partnerProfit =
      ((totalGross - variance - advance) * profitShare) / 100 - taxes;
    const amountToCollect =
      totalGross - variance - advance - partnerProfit + previousBalance;

    setModalState(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        amountToCollect: amountToCollect.toFixed(2),
      },
    }));
  }, [
    collectedMachines,
    modalState.isLoadingCollections,
    financials.taxes,
    financials.variance,
    financials.advance,
    financials.previousBalance,
    selectedLocationId,
    modalState.selectedLocation,
    modalState.lockedLocationId,
    setModalState,
  ]);

  // Trigger calculation when relevant state changes
  useEffect(() => {
    if (
      !modalState.isLoadingCollections &&
      collectedMachines.length >= 0
    ) {
      calculateAmountToCollect();
    }
  }, [
    collectedMachines.length,
    modalState.isLoadingCollections,
    financials.taxes,
    financials.variance,
    financials.advance,
    financials.previousBalance,
    modalState.selectedLocation,
    calculateAmountToCollect,
  ]);



  // ============================================================================
  // Update Collection Report Handler
  // ============================================================================
  const updateCollectionReportHandler = useCallback(
    async (reconciliationData?: VariationsCheckResponse) => {
      if (
        collectedMachines.length === 0 ||
        !selectedLocationId ||
        !selectedLocationName
      ) {
        return;
      }

      // Validation checks for unsaved changes
      if (editingEntryId && selectedMachineData) {
        const editingEntry = collectedMachines.find(
          entry => entry._id === editingEntryId
        );
        if (editingEntry) {
          const formMetersIn = formData.metersIn
            ? Number(formData.metersIn)
            : 0;
          const formMetersOut = formData.metersOut
            ? Number(formData.metersOut)
            : 0;
          const savedMetersIn = editingEntry.metersIn || 0;
          const savedMetersOut = editingEntry.metersOut || 0;

          if (
            formMetersIn !== savedMetersIn ||
            formMetersOut !== savedMetersOut
          ) {
            toast.warning(
              `Unsaved meter changes detected. Please update the machine entry before updating the report.`,
              { duration: 8000, position: 'top-left' }
            );
            return;
          }
        }
      }

      if (
        !editingEntryId &&
        (selectedMachineData ||
          formData.metersIn ||
          formData.metersOut ||
          formData.notes?.trim())
      ) {
        toast.error(
          `You have unsaved machine data. Please add the machine to the list or cancel before updating the report.`,
          { duration: 10000, position: 'top-left' }
        );
        return;
      }

      // Clear unsaved edits flag BEFORE async operations (prevents race with close handler)
      setModalState(prev => ({ ...prev, hasUnsavedEdits: false }));

      setModalState(prev => ({ ...prev, isProcessing: true }));

      try {
        // ============================================================================
        // PHASE 0: Verbose per-machine validation
        // ============================================================================
        const progressTotal = collectedMachines.length;
        setCurrentSubStep({
          phaseKey: 'validating',
          done: 0,
          total: progressTotal,
          detail: 'Starting validation...',
        });

        for (let index = 0; index < collectedMachines.length; index++) {
          const entry = collectedMachines[index];
          const machineName =
            (entry.machineName as string | undefined) ||
            (entry.serialNumber as string | undefined) ||
            entry.machineId ||
            `Machine ${index + 1}`;
          const detail = entry.ramClear
            ? 'RAM clear & meters'
            : 'meters, movement & SAS window';

          setCurrentSubStep({
            phaseKey: 'validating',
            done: index + 1,
            total: progressTotal,
            machineName,
            detail,
          });

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
            entry.ramClearMetersIn ?? undefined,
            entry.ramClearMetersOut ?? undefined
          );
          if (
            !Number.isFinite(movement.metersIn) ||
            !Number.isFinite(movement.metersOut) ||
            !Number.isFinite(movement.gross)
          ) {
            throw new Error(`${machineName} produced an invalid movement calculation.`);
          }

          // Yield to React so the UI updates for each machine
          await new Promise<void>(resolve => setTimeout(resolve, 5));
        }

        setCurrentSubStep({
          phaseKey: 'validating',
          done: progressTotal,
          total: progressTotal,
          detail: 'Validation complete',
        });

        toast.loading('Updating collection report...', {
          id: 'mobile-update-report-toast',
        });

        // Detect machine meter changes
        const changes: Array<{
          machineId: string;
          locationReportId: string;
          metersIn: number;
          metersOut: number;
          prevMetersIn: number;
          prevMetersOut: number;
          collectionId: string;
          timestamp: Date;
        }> = [];

        for (const current of collectedMachines) {
          const original = originalCollections.find(
            originalEntry => originalEntry._id === current._id
          );
          if (original) {
            const metersInChanged = current.metersIn !== original.metersIn;
            const metersOutChanged = current.metersOut !== original.metersOut;
            const timeChanged =
              (current.timestamp &&
                original.timestamp &&
                new Date(current.timestamp).getTime() !==
                  new Date(original.timestamp).getTime()) ||
              (current.collectionTime &&
                original.collectionTime &&
                new Date(current.collectionTime).getTime() !==
                  new Date(original.collectionTime).getTime());

            if (metersInChanged || metersOutChanged || timeChanged) {
              changes.push({
                machineId: current.machineId,
                locationReportId: current.locationReportId || reportId,
                metersIn: current.metersIn || 0,
                metersOut: current.metersOut || 0,
                prevMetersIn: current.prevIn || 0,
                prevMetersOut: current.prevOut || 0,
                collectionId: current._id,
                timestamp: current.collectionTime
                  ? new Date(current.collectionTime)
                  : current.timestamp
                    ? new Date(current.timestamp)
                    : new Date(),
              });
            }
          } else {
            changes.push({
              machineId: current.machineId,
              locationReportId: current.locationReportId || reportId,
              metersIn: current.metersIn || 0,
              metersOut: current.metersOut || 0,
              prevMetersIn: current.prevIn || 0,
              prevMetersOut: current.prevOut || 0,
              collectionId: current._id,
              timestamp: current.collectionTime
                ? new Date(current.collectionTime)
                : current.timestamp
                  ? new Date(current.timestamp)
                  : new Date(),
            });
          }
        }

        // Batch update machine histories if there are changes
        if (changes.length > 0) {
          const batchResponse = await axios.patch(
            `/api/collection-reports/${reportId}/update-history`,
            { changes }
          );

          if (!batchResponse.data.success) {
            toast.dismiss('mobile-update-report-toast');
            toast.error(
              'Failed to update machine histories. Please try again.'
            );
            return;
          }

          toast.dismiss('mobile-update-report-toast');
          toast.success(
            `Updated ${changes.length} machine histories successfully!`
          );
          toast.loading('Updating collection report...', {
            id: 'mobile-update-report-toast',
          });
        }

        // Calculate totals from collected machines for proper API update
        const totalMovementData = collectedMachines.map(entry => {
          const movement = calculateCabinetMovement(
            entry.metersIn || 0,
            entry.metersOut || 0,
            entry.prevIn || 0,
            entry.prevOut || 0,
            entry.ramClear || false,
            undefined,
            undefined,
            entry.ramClearMetersIn ?? undefined,
            entry.ramClearMetersOut ?? undefined
          );
          return {
            drop: movement.metersIn,
            cancelledCredits: movement.metersOut,
            gross: movement.gross,
            sasGross: entry.sasMeters?.gross || 0,
          };
        });

        const totals = totalMovementData.reduce(
          (prev, curr) => ({
            drop: prev.drop + curr.drop,
            cancelledCredits: prev.cancelledCredits + curr.cancelledCredits,
            gross: prev.gross + curr.gross,
            sasGross: prev.sasGross + curr.sasGross,
          }),
          { drop: 0, cancelledCredits: 0, gross: 0, sasGross: 0 }
        );

        // Update collection report financials
        const payload = {
          variance: Number(financials.variance) || 0,
          previousBalance: Number(financials.previousBalance) || 0,
          currentBalance: 0,
          amountToCollect: Number(financials.amountToCollect) || 0,
          amountCollected:
            Number(financials.collectedAmount) ||
            Number(financials.amountToCollect) ||
            0,
          amountUncollected: 0,
          partnerProfit: 0,
          taxes: Number(financials.taxes) || 0,
          advance: Number(financials.advance) || 0,
          collector: user?._id || '',
          locationName: selectedLocationName,
          locationReportId: reportId,
          location: selectedLocationId || '',
          totalDrop: totals.drop,
          totalCancelled: totals.cancelledCredits,
          totalGross: totals.gross,
          totalSasGross:
            reconciliationData?.machines.reduce(
              (sum: number, machineData) =>
                sum + (Number(machineData.sasGross) || 0),
              0
            ) ?? totals.sasGross,
          timestamp: (() => {
            const earliest = collectedMachines.reduce(
              (minDate, entry) => {
                const entryEndTime = entry.sasMeters?.sasEndTime
                  ? new Date(entry.sasMeters.sasEndTime)
                  : entry.collectionTime
                    ? new Date(entry.collectionTime)
                    : new Date();
                return entryEndTime < minDate ? entryEndTime : minDate;
              },
              new Date(
                collectedMachines[0]?.sasMeters?.sasEndTime ||
                  collectedMachines[0]?.collectionTime ||
                  new Date()
              )
            );
            return earliest.toISOString();
          })(),
          reconciliation: reconciliationData || null,
          varianceReason: financials.varianceReason,
          reasonShortagePayment: financials.reasonForShortagePayment,
          balanceCorrection:
            Number(financials.balanceCorrection) || 0,
          balanceCorrectionReas: financials.balanceCorrectionReason,
          machines: collectedMachines.map(entry => ({
            machineId: entry.machineId,
            locationId: entry.location || '',
            metersIn: entry.metersIn || 0,
            metersOut: entry.metersOut || 0,
            prevMetersIn: entry.prevIn || 0,
            prevMetersOut: entry.prevOut || 0,
            timestamp:
              entry.timestamp instanceof Date
                ? entry.timestamp
                : new Date(entry.timestamp),
            locationReportId: entry.locationReportId || reportId,
            ramClear: entry.ramClear,
            ramClearMetersIn: entry.ramClearMetersIn ?? undefined,
            ramClearMetersOut: entry.ramClearMetersOut ?? undefined,
          })),
        };

        const validation = validateCollectionReportPayload(payload as CreateCollectionReportPayload);
        if (!validation.isValid) {
          console.error('❌ [MobileEditReport] Validation failed:', {
            errors: validation.errors,
            payload,
          });
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        await updateCollectionReportStreaming(
          reportId,
          payload,
          setCurrentEditPhase,
          (phase, done, total, machineName) =>
            setCurrentSubStep({ phaseKey: phase, done, total, machineName })
        );

        toast.dismiss('mobile-update-report-toast');
        toast.success('Collection report updated successfully!');

        // Update originalCollections to match current state so we don't detect false "changes"
        setModalState(prev => ({
          ...prev,
          hasUnsavedEdits: false,
          originalCollections: JSON.parse(
            JSON.stringify(prev.collectedMachines)
          ),
        }));
        onRefresh();
        onClose();
      } catch (error) {
        toast.dismiss('mobile-update-report-toast');
        console.error('Failed to update collection report:', error);
        toast.error(
          `Failed to update collection report: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      } finally {
        setModalState(prev => ({ ...prev, isProcessing: false }));
        setCurrentEditPhase(undefined);
        setCurrentSubStep(null);
      }
    },
    [
      collectedMachines,
      selectedLocationId,
      selectedLocationName,
      financials,
      originalCollections,
      editingEntryId,
      selectedMachineData,
      formData,
      user,
      onRefresh,
      onClose,
      reportId,
      setModalState,
    ]
  );



  return {
    calculateAmountToCollect,
    updateCollectionReportHandler,
    currentSubStep,
    setCurrentSubStep,
    currentEditPhase,
    setCurrentEditPhase,
  };
}