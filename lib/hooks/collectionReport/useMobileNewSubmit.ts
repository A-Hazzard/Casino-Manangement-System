/**
 * useMobileNewSubmit Hook
 *
 * Handles the two-step collection report submission process:
 * 1. Variation check (triggered from useVariationStreamCheck)
 * 2. Report creation with streaming progress updates
 *
 * @module lib/hooks/collectionReport/useMobileNewSubmit
 */

'use client';

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { calculateCabinetMovement } from '@/lib/utils/movement';
import { createCollectionReportStreaming } from '@/lib/helpers/collectionReport/fetching';
import { validateCollectionReportPayload } from '@/lib/utils/validation';
import type { CollectionDocument } from '@/lib/types/collection';
import { toast } from 'sonner';


type Financials = {
  variance: string;
  previousBalance: string;
  collectedAmount: string;
  amountToCollect: string;
  taxes: string;
  advance: string;
  varianceReason: string | undefined;
  reasonForShortagePayment: string | undefined;
  balanceCorrection: string;
  balanceCorrectionReason: string | undefined;
};

type ModalStateRef = {
  collectedMachines: CollectionDocument[];
  isProcessing: boolean;
};

type SetModalStateType = React.Dispatch<React.SetStateAction<ModalStateRef>>;

type CreateCollectionReportProps = {
  modalState: ModalStateRef;
  financials: Financials;
  selectedLocation: string;
  selectedLocationName: string;
  user: { _id: string; username: string } | null;
  onRefresh: () => void;
  onClose: () => void;
  setModalState: SetModalStateType;
  setCurrentCreatePhase: (phase: string | undefined) => void;
  setCurrentSubStep: (
    subStep: {
      phaseKey: string;
      done: number;
      total: number;
      machineName?: string;
      detail?: string;
    } | null
  ) => void;
  setShowCreateReportConfirmation?: (open: boolean) => void;
};

export function useMobileNewSubmit({
  modalState,
  financials,
  selectedLocation,
  selectedLocationName,
  user,
  onRefresh,
  onClose,
  setModalState,
  setCurrentCreatePhase,
  setCurrentSubStep,
  setShowCreateReportConfirmation,
}: CreateCollectionReportProps) {
  const createCollectionReport = useCallback(
    async (reconciliationData?: unknown) => {
      const machinesForReport = modalState.collectedMachines;

      if (machinesForReport.length === 0) {
        return;
      }

      if (!selectedLocation || !selectedLocationName) {
        return;
      }

      setModalState((prev) => ({ ...prev, isProcessing: true }));

      try {
        // ============================================================================
        // PHASE 0: Verbose per-machine validation
        // ============================================================================
        const progressTotal = machinesForReport.length;
        setCurrentSubStep({
          phaseKey: 'validating',
          done: 0,
          total: progressTotal,
          detail: 'Starting validation...',
        });

        for (let index = 0; index < machinesForReport.length; index++) {
          const entry = machinesForReport[index];
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

          await new Promise<void>((resolve) => setTimeout(resolve, 5));
        }

        setCurrentSubStep({
          phaseKey: 'validating',
          done: progressTotal,
          total: progressTotal,
          detail: 'Validation complete',
        });

        // Generate report ID
        const reportId = uuidv4();

        // Prepare report timestamp
        const reportTimestamp =
          machinesForReport[0].timestamp instanceof Date
            ? machinesForReport[0].timestamp
            : new Date(machinesForReport[0].timestamp);

        // Build payload
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
          location: selectedLocation || '',
          totalDrop: 0,
          totalCancelled: 0,
          totalGross: 0,
          totalSasGross: 0,
          timestamp: reportTimestamp.toISOString(),
          reconciliation: reconciliationData || null,
          varianceReason: financials.varianceReason,
          reasonShortagePayment: financials.reasonForShortagePayment,
          balanceCorrection: Number(financials.balanceCorrection) || 0,
          balanceCorrectionReas: financials.balanceCorrectionReason,
          collectionIds: machinesForReport.map((entry) => entry._id),
          machines: machinesForReport.map((entry) => ({
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
            locationReportId: reportId,
            ramClear: entry.ramClear,
            ramClearMetersIn: entry.ramClearMetersIn,
            ramClearMetersOut: entry.ramClearMetersOut,
          })),
        };

        // Validate payload
        const validation = validateCollectionReportPayload(payload);
        if (!validation.isValid) {
          console.error('❌ [MobileNewCollection] Validation failed:', {
            errors: validation.errors,
            payload,
          });
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Step 1: Create report
        toast.loading('Creating collection report...', {
          id: 'mobile-create-report-toast',
        });

        await createCollectionReportStreaming(
          payload,
          setCurrentCreatePhase,
          (phase, done, total, machineName) =>
            setCurrentSubStep({ phaseKey: phase, done, total, machineName })
        );

        // Step 2: Update collections
        const updatePromises = machinesForReport.map(async (collection) => {
          try {
            const axios = (await import('axios')).default;
            await axios.patch(
              `/api/collection-reports/collections?id=${collection._id}`,
              {
                locationReportId: reportId,
                isCompleted: true,
              }
            );
          } catch (error) {
            console.error(
              `Failed to update collection ${collection._id}:`,
              error
            );
          }
        });

        await Promise.all(updatePromises);

        toast.dismiss('mobile-create-report-toast');
        toast.success('Collection report created successfully!');

        // Refresh and close
        if (setShowCreateReportConfirmation) {
          setShowCreateReportConfirmation(false);
        }
        onRefresh();
        onClose();
      } catch (error) {
        toast.dismiss('mobile-create-report-toast');
        console.error('❌ Failed to create collection report:', error);

        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error
        ) {
          const axiosError = error as { response?: { data?: unknown } };
          errorMessage = JSON.stringify(axiosError.response?.data || error);
        }

        toast.error(`Failed to create collection report: ${errorMessage}`, {
          duration: 8000,
        });
        if (setShowCreateReportConfirmation) {
          setShowCreateReportConfirmation(false);
        }
      } finally {
        setModalState((prev) => ({ ...prev, isProcessing: false }));
        setCurrentCreatePhase(undefined);
        setCurrentSubStep(null);
      }
    },
    [
      modalState.collectedMachines,
      selectedLocation,
      selectedLocationName,
      financials,
      user,
      onRefresh,
      onClose,
      setModalState,
      setCurrentCreatePhase,
      setCurrentSubStep,
      setShowCreateReportConfirmation,
    ]
  );

  return { createCollectionReport };
}