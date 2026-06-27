/**
 * useMobileNewUI Hook
 *
 * Manages UI state and navigation for the mobile collection modal.
 * Handles panel transitions, navigation stack, and view visibility.
 *
 * @module lib/hooks/collectionReport/useMobileNewUI
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { MobileNavigationState, MobileModalState } from './types';

type UseMobileNewUIProps = {
  initialLocations: CollectionReportLocationWithMachines[];
  show: boolean;
  user?: { _id: string } | null;
};

export function useMobileNewUI({
  initialLocations,
  show,
  user,
}: UseMobileNewUIProps) {
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [internalLocations, setInternalLocations] = useState<
    CollectionReportLocationWithMachines[]
  >([]);
  const [modalState, setModalState] = useState<MobileNavigationState>(() => ({
    isMachineListVisible: false,
    isFormVisible: false,
    isCollectedListVisible: false,
    navigationStack: [],
    isViewingFinancialForm: false,
    showViewMachineConfirmation: false,
    searchTerm: '',
    collectedMachinesSearchTerm: '',
    editingEntryId: null,
    isLoadingMachines: false,
    isProcessing: false,
    isLoadingCollections: false,
    lockedLocationId: undefined,
    baseBalanceCorrection: '',
    collectedMachines: [],
    selectedLocation: null,
    selectedLocationName: '',
    availableMachines: [],
    originalCollections: [],
    selectedMachine: null,
    selectedMachineData: null,
    hasUnsavedEdits: false,
    baseTaxes: '',
    baseAdvance: '',
    basePreviousBalance: '',
    baseProfitShare: '50',
    baseIncludeJackpot: false,
    financials: {
      taxes: '',
      advance: '',
      variance: '',
      varianceReason: '',
      amountToCollect: '',
      collectedAmount: '',
      previousBalance: '',
      balanceCorrection: '',
      balanceCorrectionReason: '',
      varianceReasonShortage: '',
      reasonForShortagePayment: '',
    },
    formData: {
      metersIn: '',
      metersOut: '',
      ramClear: false,
      ramClearMetersIn: '',
      ramClearMetersOut: '',
      notes: '',
      collectionTime: new Date(),
      sasStartTime: null,
      sasEndTime: null,
      showAdvancedSas: false,
      prevIn: '',
      prevOut: '',
    },
  } as MobileModalState));

  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);
  const [updateAllSasStartDate, setUpdateAllSasStartDate] = useState<
    Date | undefined
  >(undefined);
  const [updateAllSasEndDate, setUpdateAllSasEndDate] = useState<
    Date | undefined
  >(undefined);
  const [sasUpdateProgress, setSasUpdateProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [currentCreatePhase, setCurrentCreatePhase] = useState<
    string | undefined
  >();
  const [currentSubStep, setCurrentSubStep] = useState<{
    phaseKey: string;
    done: number;
    total: number;
    machineName?: string;
    detail?: string;
  } | null>(null);

  const pushNavigation = useCallback((panel: string) => {
    setModalState((prev) => ({
      ...prev,
      navigationStack: [...prev.navigationStack, panel],
    }));
  }, []);

  const popNavigation = useCallback(() => {
    setModalState((prev) => {
      const newStack = [...prev.navigationStack];
      newStack.pop();

      const topPanel =
        newStack.length > 0 ? newStack[newStack.length - 1] : null;

      return {
        ...prev,
        isMachineListVisible:
          topPanel === 'machine-list' || topPanel === null,
        isFormVisible: topPanel === 'form',
        isCollectedListVisible: topPanel === 'list',
        navigationStack: newStack,
      };
    });
  }, []);

  const handleViewForm = useCallback(() => {
    pushNavigation('list');
    setModalState((prev) => ({
      ...prev,
      isFormVisible: false,
      isMachineListVisible: false,
      isCollectedListVisible: true,
      isViewingFinancialForm: true,
    }));
  }, [pushNavigation]);

  const handleViewCollectedMachines = useCallback(() => {
    pushNavigation('list');
    setModalState((prev) => ({
      ...prev,
      isCollectedListVisible: true,
      isFormVisible: false,
      isMachineListVisible: false,
      isViewingFinancialForm: false,
    }));
  }, [pushNavigation]);

  useEffect(() => {
    if (show && user?._id) {
      setIsLoadingLocations(true);
      import('@/lib/helpers/collectionReport/fetching').then(
        ({ getLocationsWithMachines }) => {
          getLocationsWithMachines(undefined, false)
            .then((locs) => {
              setInternalLocations(locs);
            })
            .catch((err) => {
              console.error('Error fetching collection metadata:', err);
            })
            .finally(() => setIsLoadingLocations(false));
        }
      );
    } else {
      setIsLoadingLocations(false);
    }
  }, [show, user?._id]);

  const locations =
    internalLocations.length > 0 ? internalLocations : initialLocations;

  const handleApplyAllDates = useCallback(
    async (
      collectedMachines: Array<{
        _id: string;
        machineId: string;
        sasMeters?: {
          sasStartTime?: Date | string;
          sasEndTime?: Date | string;
          machine?: string;
        };
      }>,
      setCollectedMachines: (machines: typeof collectedMachines) => void
    ) => {
      if (
        (!updateAllSasStartDate && !updateAllSasEndDate) ||
        collectedMachines.length < 1
      )
        return;
      try {
        setModalState((prev) => ({ ...prev, isProcessing: true }));
        const total = collectedMachines.length;
        setSasUpdateProgress({ completed: 0, total });
        const results = await Promise.allSettled(
          collectedMachines.map(async (entry) => {
            if (!entry._id) {
              setSasUpdateProgress((prev) =>
                prev ? { ...prev, completed: prev.completed + 1 } : null
              );
              return;
            }

            const updateData: Record<string, string> = {};
            if (updateAllSasStartDate) {
              updateData.sasStartTime = updateAllSasStartDate.toISOString();
            }
            if (updateAllSasEndDate) {
              updateData.sasEndTime = updateAllSasEndDate.toISOString();
            }

            const axios = (await import('axios')).default;
            const result = await axios.patch(
              `/api/collection-reports/collections/${entry._id}`,
              updateData
            );
            setSasUpdateProgress((prev) =>
              prev ? { ...prev, completed: prev.completed + 1 } : null
            );
            return result;
          })
        );
        const failed = results.filter(
          (result) => result.status === 'rejected'
        ).length;
        if (failed > 0) {
          const { toast } = await import('sonner');
          toast.error(
            `${failed} machine${failed > 1 ? 's' : ''} failed to update`
          );
          return;
        }
        const updated = collectedMachines.map((entry) => {
          const newEntry = { ...entry };
          if (!newEntry.sasMeters) {
            newEntry.sasMeters = {
              machine: newEntry.machineId || '',
              sasStartTime: new Date(0),
              sasEndTime: new Date(0),
            };
          } else {
            newEntry.sasMeters = { ...newEntry.sasMeters };
          }

          if (updateAllSasStartDate) {
            newEntry.sasMeters!.sasStartTime = updateAllSasStartDate;
          }
          if (updateAllSasEndDate) {
            newEntry.sasMeters!.sasEndTime = updateAllSasEndDate;
          }
          return newEntry;
        });

        setCollectedMachines(updated);
        setModalState((prev) => ({
          ...prev,
          collectedMachines: updated as unknown as MobileModalState['collectedMachines'],
          isProcessing: false,
        }));
        const { toast } = await import('sonner');
        toast.success('All SAS times updated successfully!');
        setUpdateAllSasStartDate(undefined);
        setUpdateAllSasEndDate(undefined);
      } catch (error) {
        console.error('Error applying all dates:', error);
        const { toast } = await import('sonner');
        toast.error('Failed to update dates');
        setModalState((prev) => ({ ...prev, isProcessing: false }));
      } finally {
        setSasUpdateProgress(null);
      }
    },
    [updateAllSasStartDate, updateAllSasEndDate]
  );

  useEffect(() => {
    if (modalState.collectedMachines.length === 0) return;
    const toDate = (
      val: Date | string | undefined | null
    ): Date | null => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val as string);
      return isNaN(d.getTime()) ? null : d;
    };
    const starts = modalState.collectedMachines
      .map((entry) => toDate(entry.sasMeters?.sasStartTime))
      .filter((date): date is Date => date !== null);
    const ends = modalState.collectedMachines
      .map((entry) => toDate(entry.sasMeters?.sasEndTime))
      .filter((date): date is Date => date !== null);
    if (starts.length > 0) {
      setUpdateAllSasStartDate(
        new Date(Math.min(...starts.map((date) => date.getTime())))
      );
    }
    if (ends.length > 0) {
      setUpdateAllSasEndDate(
        new Date(Math.max(...ends.map((date) => date.getTime())))
      );
    }
  }, [modalState.collectedMachines]);

  return {
    locations,
    isLoadingLocations,
    modalState,
    setModalState,
    showUnsavedChangesWarning,
    setShowUnsavedChangesWarning,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    pushNavigation,
    popNavigation,
    handleViewForm,
    handleViewCollectedMachines,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    handleApplyAllDates,
    sasUpdateProgress,
    currentCreatePhase,
    currentSubStep,
    setCurrentCreatePhase,
    setCurrentSubStep,
  };
}