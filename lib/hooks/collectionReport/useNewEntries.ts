/**
 * useNewEntries Hook
 *
 * Manages entry state and operations for the New Collection Report Modal.
 * Handles adding, editing, and deleting machine entries.
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback, useState } from 'react';
import type { CollectionDocument } from '@/lib/types/collection';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { toast } from 'sonner';

// ============================================================================
// Type Definitions
// ============================================================================

type UseNewEntriesProps = {
  // Store state
  collectedMachineEntries: CollectionDocument[];
  setCollectedMachines: (machines: CollectionDocument[]) => void;
  selectedLocationId: string | undefined;
  selectedLocationName: string;
  lockedLocationId: string | undefined;
  setLockedLocation: (id: string | undefined) => void;
  userId: string | undefined;

  // Form data
  currentMetersIn: string;
  currentMetersOut: string;
  currentRamClearMetersIn: string;
  currentRamClearMetersOut: string;
  currentMachineNotes: string;
  currentRamClear: boolean;
  currentCollectionTime: Date;
  sasStartTime: Date | null;
  sasEndTime: Date | null;
  showAdvancedSas: boolean;
  storePrevIn: string;
  storePrevOut: string;

  // Selection state
  selectedMachineId: string | undefined;
  setSelectedMachineId: (id: string | undefined) => void;
  machineForDataEntry: CollectionReportMachineSummary | null;

  // Helpers
  logActivityCallback: (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null
  ) => Promise<void>;
  isAddMachineEnabled: boolean;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  setHasChanges: (v: boolean) => void;
  resetEntryForm: () => void;
  setShowMachineRolloverWarning: (v: boolean) => void;
  setPendingMachineSubmission: (fn: (() => void) | null) => void;
  prevIn: number | null;
  prevOut: number | null;
  executeAddEntry: () => Promise<void>;
  executeUpdateEntry: () => Promise<void>;
  setEditingEntryId: (id: string | null) => void;
  editingEntryId: string | null;
  setShowUpdateConfirmation: (v: boolean) => void;
  confirmUpdateEntry: () => Promise<void>;
};

// ============================================================================
// Main Hook
// ============================================================================

export function useNewEntries({
  // Store state
  collectedMachineEntries,
  setCollectedMachines,
  selectedLocationName,

  // Form data
  currentMetersIn,

  // Selection
  setSelectedMachineId,
  machineForDataEntry,

  // Helpers
  logActivityCallback,
  isAddMachineEnabled,
  isProcessing,
  setIsProcessing,
  setHasChanges,
  resetEntryForm,
  setShowMachineRolloverWarning,
  setPendingMachineSubmission,
  prevIn,
  executeAddEntry,
  setEditingEntryId,
  editingEntryId,
  setLockedLocation,
}: UseNewEntriesProps) {
  // Local State
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [originalCollections, setOriginalCollections] = useState<CollectionDocument[]>([]);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  // Handlers
  const handleAddEntry = useCallback(() => {
    if (!isAddMachineEnabled || isProcessing) return;

    const onConfirm = () => executeAddEntry();

    const effectivePrevIn =
      prevIn !== null
        ? prevIn
        : machineForDataEntry?.collectionMeters?.metersIn ?? null;

    if (effectivePrevIn !== null && Number(currentMetersIn) < effectivePrevIn) {
      setPendingMachineSubmission(() => onConfirm);
      setShowMachineRolloverWarning(true);
      return;
    }
    onConfirm();
  }, [
    isAddMachineEnabled,
    isProcessing,
    prevIn,
    currentMetersIn,
    machineForDataEntry,
    executeAddEntry,
    setPendingMachineSubmission,
    setShowMachineRolloverWarning,
  ]);

  const handleEditEntry = useCallback(
    (id: string) => {
      const entry = collectedMachineEntries.find(
        (entry) => String(entry._id) === id
      );
      if (entry) {
        setEditingEntryId(id);
        setSelectedMachineId(entry.machineId);
        setHasUnsavedEdits(true);
        toast.info('Editing machine collection entry');
      }
    },
    [collectedMachineEntries, setEditingEntryId, setSelectedMachineId, setHasUnsavedEdits]
  );

  const handleDeleteEntry = useCallback((id: string) => {
    setEntryToDelete(id);
    setShowDeleteConfirmation(true);
  }, []);

  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete) return;
    try {
      setIsProcessing(true);
      const updatedEntries = collectedMachineEntries.filter(
        (e) => String(e._id) !== entryToDelete
      );
      setCollectedMachines(updatedEntries);
      setOriginalCollections((prev) =>
        prev.filter((e) => String(e._id) !== entryToDelete)
      );
      setHasChanges(true);
      if (editingEntryId === entryToDelete) {
        setEditingEntryId(null);
        resetEntryForm();
      }
      if (updatedEntries.length === 0) setLockedLocation(undefined);
      setShowDeleteConfirmation(false);
      setEntryToDelete(null);
      toast.success('Collection entry removed');
    } catch {
      toast.error('Failed to delete collection entry');
    } finally {
      setIsProcessing(false);
    }
  }, [
    entryToDelete,
    collectedMachineEntries,
    selectedLocationName,
    editingEntryId,
    setCollectedMachines,
    setOriginalCollections,
    setHasChanges,
    setLockedLocation,
    setEditingEntryId,
    resetEntryForm,
    setShowDeleteConfirmation,
    setEntryToDelete,
    setIsProcessing,
    logActivityCallback,
  ]);

  const handleUpdateEntryInList = useCallback(
    (updatedCollection: CollectionDocument) => {
      const updatedList = collectedMachineEntries.map((entry) =>
        String(entry._id) === updatedCollection._id ? updatedCollection : entry
      );
      setCollectedMachines(updatedList);
      setOriginalCollections((prev) =>
        prev.map((e) => (String(e._id) === updatedCollection._id ? updatedCollection : e))
      );
      setHasChanges(true);
    },
    [collectedMachineEntries, setCollectedMachines, setOriginalCollections, setHasChanges]
  );

  return {
    // State
    collectedMachineEntries,
    originalCollections,
    setOriginalCollections,
    editingEntryId,
    hasUnsavedEdits,
    setHasUnsavedEdits,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    entryToDelete,
    setEntryToDelete,

    // Handlers
    handleAddEntry,
    handleEditEntry,
    handleDeleteEntry,
    confirmDeleteEntry,
    handleUpdateEntryInList,
  };
}