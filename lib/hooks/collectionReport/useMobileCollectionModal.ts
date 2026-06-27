/**
 * useMobileCollectionModal Hook (Composition)
 *
 * Thin composition hook that combines UI, Data, and Submit logic for the mobile collection modal.
 *
 * @module lib/hooks/collectionReport/useMobileCollectionModal
 */

'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useMobileNewUI } from './useMobileNewUI';
import { useMobileNewData } from './useMobileNewData';
import { useMobileNewSubmit } from './useMobileNewSubmit';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionDocument as StoreCollectionDocument } from '@/lib/types/collection';

type UseMobileCollectionModalProps = {
  show?: boolean;
  locations?: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  onClose: () => void;
};

export function useMobileCollectionModal({
  show,
  locations: propLocations = [],
  onRefresh,
  onClose,
}: UseMobileCollectionModalProps) {
  const user = useUserStore((state) => state.user);

  // UI Hook - handles navigation, panels, and view state
  const ui = useMobileNewUI({
    initialLocations: propLocations,
    show: show ?? false,
    user,
  });

  // Data Hook - handles machine selection, entries, form data, financials
  const data = useMobileNewData({
    show: show ?? false,
    locations: ui.locations,
    modalState: ui.modalState,
    setModalState: ui.setModalState,
    user: user ? { _id: user._id, username: user.username } : null,
  });

  // Submit Hook - handles report creation
  const submit = useMobileNewSubmit({
    modalState: {
      collectedMachines: ui.modalState.collectedMachines as unknown as StoreCollectionDocument[],
      isProcessing: ui.modalState.isProcessing,
    },
    financials: data.financials,
    selectedLocation: data.selectedLocation || '',
    selectedLocationName: data.selectedLocationName,
    user: user ? { _id: user._id, username: user.username } : null,
    onRefresh,
    onClose,
    setModalState: ui.setModalState as unknown as Dispatch<SetStateAction<{ collectedMachines: StoreCollectionDocument[]; isProcessing: boolean; }>>,
    setCurrentCreatePhase: ui.setCurrentCreatePhase,
    setCurrentSubStep: ui.setCurrentSubStep,
    setShowCreateReportConfirmation: ui.setShowCreateReportConfirmation,
  });

  // Return unified API matching original hook
  return {
    // From UI
    locations: ui.locations,
    isLoadingLocations: ui.isLoadingLocations,
    modalState: ui.modalState,
    setModalState: ui.setModalState,
    showUnsavedChangesWarning: ui.showUnsavedChangesWarning,
    setShowUnsavedChangesWarning: ui.setShowUnsavedChangesWarning,
    showDeleteConfirmation: ui.showDeleteConfirmation,
    setShowDeleteConfirmation: ui.setShowDeleteConfirmation,
    showCreateReportConfirmation: ui.showCreateReportConfirmation,
    setShowCreateReportConfirmation: ui.setShowCreateReportConfirmation,
    pushNavigation: ui.pushNavigation,
    popNavigation: ui.popNavigation,
    handleViewForm: ui.handleViewForm,
    handleViewCollectedMachines: ui.handleViewCollectedMachines,
    updateAllSasStartDate: ui.updateAllSasStartDate,
    setUpdateAllSasStartDate: ui.setUpdateAllSasStartDate,
    updateAllSasEndDate: ui.updateAllSasEndDate,
    setUpdateAllSasEndDate: ui.setUpdateAllSasEndDate,
    handleApplyAllDates: ui.handleApplyAllDates,
    sasUpdateProgress: ui.sasUpdateProgress,
    currentCreatePhase: ui.currentCreatePhase,
    currentSubStep: ui.currentSubStep,

    // From Data
    selectedLocation: data.selectedLocation,
    selectedLocationName: data.selectedLocationName,
    lockedLocationId: data.lockedLocationId,
    availableMachines: data.availableMachines,
    collectedMachines: data.collectedMachines,
    selectedMachine: data.selectedMachine,
    selectedMachineData: data.selectedMachineData,
    financials: data.financials,
    handleLocationChange: data.handleLocationChange,
    addMachineToList: data.addMachineToList,
    editMachineInList: data.editMachineInList,
    deleteMachineFromList: data.deleteMachineFromList,
    inputsEnabled: data.inputsEnabled,
    isAddMachineEnabled: data.isAddMachineEnabled,
    isCreateReportsEnabled: data.isCreateReportsEnabled,
    sortMachinesAlphabetically: data.sortMachinesAlphabetically,
    setStoreFinancials: data.setStoreFinancials,
    setStoreSelectedMachine: data.setStoreSelectedMachine,
    setStoreSelectedMachineData: data.setStoreSelectedMachineData,
    baseBalanceCorrection: data.baseBalanceCorrection,
    onBaseBalanceCorrectionChange: data.onBaseBalanceCorrectionChange,
    getLocationIdFromMachine: data.getLocationIdFromMachine,
    fetchExistingCollections: data.fetchExistingCollections,
    onFormDataChange: data.onFormDataChange,
    storeFormData: data.storeFormData,
    setStoreFormData: data.setStoreFormData,

    // From Submit
    createCollectionReport: submit.createCollectionReport,
  };
}