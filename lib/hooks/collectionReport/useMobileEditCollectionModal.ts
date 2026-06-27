/**
 * useMobileEditCollectionModal Hook (Composition Root)
 *
 * Thin composition hook that combines:
 * - useMobileEditUI: panel visibility, animations, navigation
 * - useMobileEditData: data fetching, entry CRUD
 * - useMobileEditSubmit: submission logic
 *
 * @module lib/hooks/collectionReport/useMobileEditCollectionModal
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback, useState } from 'react';
import { useMobileEditUI } from './useMobileEditUI';
import { useMobileEditData } from './useMobileEditData';
import { useMobileEditSubmit } from './useMobileEditSubmit';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { MobileModalState } from './types';
export type { MobileModalState };
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useUserStore } from '@/lib/store/userStore';

// ============================================================================
// Types
// ============================================================================

type UseMobileEditCollectionModalProps = {
  show: boolean;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  onClose: () => void;
};

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Main hook for the Mobile Edit Collection Modal.
 * Composes UI, Data, and Submit sub-hooks.
 */
export function useMobileEditCollectionModal({
  show,
  reportId,
  locations,
  onRefresh,
  onClose,
}: UseMobileEditCollectionModalProps) {
  // ============================================================================
  // Shared State & Store Access
  // ============================================================================
  const user = useUserStore((state) => state.user);

  const {
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    collectionTime,
    financials,
    formData: storeFormData,
    setFormData: setStoreFormData,
    setSelectedLocation: setStoreSelectedLocation,
    setLockedLocation: setStoreLockedLocation,
    setAvailableMachines: setStoreAvailableMachines,
    setCollectedMachines: setStoreCollectedMachines,
    calculateCarryover: setStoreCalculateCarryover,
  } = useCollectionModalStore();

  // ============================================================================
  // Initialize Local Modal State
  // ============================================================================
  const [modalState, setModalState] = useState<MobileModalState>(() => ({
    isMachineListVisible: false,
    isFormVisible: false,
    isCollectedListVisible: true,
    navigationStack: ['list'],
    isViewingFinancialForm: false,
    showViewMachineConfirmation: false,
    searchTerm: '',
    collectedMachinesSearchTerm: '',
    editingEntryId: null,
    formData: {
      metersIn: storeFormData.metersIn,
      metersOut: storeFormData.metersOut,
      ramClear: storeFormData.ramClear,
      ramClearMetersIn: storeFormData.ramClearMetersIn,
      ramClearMetersOut: storeFormData.ramClearMetersOut,
      notes: storeFormData.notes,
      collectionTime: storeFormData.collectionTime,
      showAdvancedSas: storeFormData.showAdvancedSas,
      sasStartTime: storeFormData.sasStartTime,
      sasEndTime: storeFormData.sasEndTime,
      prevIn: storeFormData.prevIn,
      prevOut: storeFormData.prevOut,
    },
    isLoadingMachines: false,
    isProcessing: false,
    isLoadingCollections: false,
    selectedLocation: selectedLocationId || null,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines: collectedMachines as unknown as MobileModalState['collectedMachines'],
    originalCollections: [],
    selectedMachine: null,
    selectedMachineData: null,
    hasUnsavedEdits: false,
    financials: financials as import('./types').MobileFinancials,
    baseBalanceCorrection: financials.balanceCorrection,
    baseTaxes: financials.taxes,
    baseAdvance: financials.advance,
    basePreviousBalance: financials.previousBalance,
    baseProfitShare: '50',
    baseIncludeJackpot: false,
  }));

  // ============================================================================
  // Compose Sub-Hooks
  // ============================================================================
  const ui = useMobileEditUI({
    modalState,
    setModalState,
    show,
  });

  const data = useMobileEditData({
    show,
    reportId,
    locations,
    onRefresh,
    onClose,
    modalState,
    setModalState,
  });

  const submit = useMobileEditSubmit({
    reportId,
    modalState,
    setModalState,
    selectedLocationId,
    selectedLocationName,
    collectedMachines: collectedMachines as unknown as MobileModalState['collectedMachines'],
    financials,
    originalCollections: modalState.originalCollections,
    editingEntryId: modalState.editingEntryId,
    selectedMachineData: modalState.selectedMachineData,
    formData: modalState.formData,
    user,
    onRefresh,
    onClose,
    show,
    locations,
  });

  // ============================================================================
  // Form Data Change Handler
  // ============================================================================
  const onFormDataChange = useCallback(
    (updates: Partial<MobileModalState['formData']>) => {
      // First, update the Zustand store outside of the state updater
      setStoreFormData(updates as unknown as Parameters<typeof setStoreFormData>[0]);

      // Then update local state
      setModalState((prev: MobileModalState) => {
        const newFormData = { ...prev.formData, ...updates };

        // If turning on advanced SAS and times are null, set defaults
        if (updates.showAdvancedSas === true) {
          if (!newFormData.sasEndTime) {
            newFormData.sasEndTime = new Date(
              newFormData.collectionTime || new Date()
            );
          }
          if (!newFormData.sasStartTime) {
            const endTime = newFormData.sasEndTime;
            const defaultStart = new Date(
              endTime instanceof Date ? endTime.getTime() : new Date().getTime()
            );
            defaultStart.setDate(defaultStart.getDate() - 1);
            newFormData.sasStartTime = defaultStart;
          }
        }

        return {
          ...prev,
          formData: newFormData,
        };
      });
    },
    [setStoreFormData, setModalState]
  );

  // ============================================================================
  // Financial Data Change Handler
  // ============================================================================
  const onCollectedAmountChange = useCallback(
    (value: string) => {
      // Use the centralized store action
      setStoreCalculateCarryover(value, modalState.baseBalanceCorrection);

      // Also update local modalState for immediate UI feedback
      setModalState((prev: MobileModalState) => ({
        ...prev,
        financials: {
          ...prev.financials,
          collectedAmount: value,
        },
      }));
    },
    [setStoreCalculateCarryover, modalState.baseBalanceCorrection, setModalState]
  );

  const onBaseBalanceCorrectionChange = useCallback(
    (value: string) => {
      setModalState((prev: MobileModalState) => ({ ...prev, baseBalanceCorrection: value }));
    },
    [setModalState]
  );

  // ============================================================================
  // Exported API - Composed from all three sub-hooks
  // ============================================================================
  return {
    // Core state
    modalState,
    setModalState,
    clearUnsavedEdits: data.clearUnsavedEdits,

    // UI state & navigation
    pushNavigation: ui.pushNavigation,
    popNavigation: ui.popNavigation,
    handleViewCollectedMachines: ui.handleViewCollectedMachines,
    transitions: ui.transitions,
    resetModalState: ui.resetModalState,

    // Store state (for compatibility)
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    collectionTime,
    financials,
    formData: storeFormData,
    setStoreSelectedLocation,
    setStoreLockedLocation,
    setStoreAvailableMachines,
    setStoreCollectedMachines,
    setStoreCalculateCarryover,

    // Computed values
    inputsEnabled: data.inputsEnabled,
    isAddMachineEnabled: data.isAddMachineEnabled,
    isCreateReportsEnabled: data.isCreateReportsEnabled,
    hasUnsavedEdits: modalState.hasUnsavedEdits,
    newMachineIds: data.newMachineIds,

    // Debounced values
    debouncedSelectedMachineData: data.debouncedSelectedMachineData,
    debouncedEditingEntryId: data.debouncedEditingEntryId,
    debouncedFormDataMetersIn: data.debouncedFormDataMetersIn,
    debouncedFormDataMetersOut: data.debouncedFormDataMetersOut,
    debouncedFormDataNotes: data.debouncedFormDataNotes,

    // CRUD operations
    addMachineToList: data.addMachineToList,
    deleteMachineFromList: data.deleteMachineFromList,
    confirmDeleteEntry: data.confirmDeleteEntry,
    editMachineInList: data.editMachineInList,

    // Submission
    updateCollectionReportHandler: submit.updateCollectionReportHandler,

    // Update All SAS Times
    updateAllSasStartDate: data.updateAllSasStartDate,
    setUpdateAllSasStartDate: data.setUpdateAllSasStartDate,
    updateAllSasEndDate: data.updateAllSasEndDate,
    setUpdateAllSasEndDate: data.setUpdateAllSasEndDate,
    handleApplyAllDates: data.handleApplyAllDates,
    sasUpdateProgress: data.sasUpdateProgress,
    currentSubStep: submit.currentSubStep,
    currentEditPhase: submit.currentEditPhase,

    // Confirmation dialogs
    showUnsavedChangesWarning: data.showUnsavedChangesWarning,
    setShowUnsavedChangesWarning: data.setShowUnsavedChangesWarning,
    showDeleteConfirmation: data.showDeleteConfirmation,
    setShowDeleteConfirmation: data.setShowDeleteConfirmation,
    entryToDelete: data.entryToDelete,
    setEntryToDelete: data.setEntryToDelete,
    showCreateReportConfirmation: data.showCreateReportConfirmation,
    setShowCreateReportConfirmation: data.setShowCreateReportConfirmation,

    // Helpers
    sortMachinesAlphabetically: data.sortMachinesAlphabetically,
    getLocationIdFromMachine: data.getLocationIdFromMachine,

    // Form handlers
    onFormDataChange,
    onCollectedAmountChange,
    onBaseBalanceCorrectionChange,

    // Base balance correction
    baseBalanceCorrection: modalState.baseBalanceCorrection,

    // User
    user,
  };
}