/**
 * useNewCollectionModal Hook (Refactored)
 *
 * Thin composition of sub-hooks for the Create New Collection Report Modal.
 * Delegates to:
 * - useNewSelection: Location/machine selection
 * - useNewEntries: Entry management (add/edit/delete)
 * - useNewFinancials: Financial calculations
 * - useNewSubmission: Report creation
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { getLocationsWithMachines } from '@/lib/helpers/collectionReport/fetching';
import { validateMachineEntry } from '@/lib/helpers/collectionReport/modal';
import { toast } from 'sonner';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@shared/types';

// Sub-hooks
import { useNewSelection } from './useNewSelection';
import { useNewEntries } from './useNewEntries';
import { useNewFinancials } from './useNewFinancials';
import { useNewSubmission } from './useNewSubmission';

// ============================================================================
// Type Definitions
// ============================================================================

type UseNewCollectionModalProps = {
  show: boolean;
  locations: CollectionReportLocationWithMachines[];
  userId: string | undefined;
  onRefresh?: () => void;
  onRefreshLocations?: () => void;
  onSuccess?: () => void;
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
// Main Hook
// ============================================================================

export function useNewCollectionModal({
  show,
  locations: propLocations,
  userId,
  onRefresh,
  onRefreshLocations,
  onSuccess,
  onClose,
  logActivityCallback,
}: UseNewCollectionModalProps) {
  // ==========================================================================
  // Store State - Shared across modals
  // ==========================================================================
  const {
    selectedLocationId,
    selectedLocationName,
    setSelectedLocation,
    lockedLocationId,
    setLockedLocation,
    collectedMachines: collectedMachineEntries,
    setCollectedMachines,
    financials,
    setFinancials,
    formData: storeFormData,
    setFormData: setStoreFormData,
    resetState: resetStoreState,
  } = useCollectionModalStore();

  // ==========================================================================
  // Form Data Bindings
  // ==========================================================================

  const {
    collectionTime: currentCollectionTime,
    metersIn: currentMetersIn,
    metersOut: currentMetersOut,
    ramClearMetersIn: currentRamClearMetersIn,
    ramClearMetersOut: currentRamClearMetersOut,
    notes: currentMachineNotes,
    ramClear: currentRamClear,
    showAdvancedSas,
    sasStartTime,
    sasEndTime,
    prevIn: storePrevIn,
    prevOut: storePrevOut,
  } = storeFormData;

  const setCurrentCollectionTime = useCallback((val: Date) => setStoreFormData({ collectionTime: val }), [setStoreFormData]);
  const setCurrentMetersIn = useCallback((val: string) => setStoreFormData({ metersIn: val }), [setStoreFormData]);
  const setCurrentMetersOut = useCallback((val: string) => setStoreFormData({ metersOut: val }), [setStoreFormData]);
  const setCurrentRamClearMetersIn = useCallback((val: string) => setStoreFormData({ ramClearMetersIn: val }), [setStoreFormData]);
  const setCurrentRamClearMetersOut = useCallback((val: string) => setStoreFormData({ ramClearMetersOut: val }), [setStoreFormData]);
  const setCurrentMachineNotes = useCallback((val: string) => setStoreFormData({ notes: val }), [setStoreFormData]);
  const setCurrentRamClear = useCallback((val: boolean) => setStoreFormData({ ramClear: val }), [setStoreFormData]);
  const setSasStartTime = useCallback((val: Date | string | null) => setStoreFormData({ sasStartTime: val === null ? null : typeof val === 'string' ? new Date(val) : val }), [setStoreFormData]);
  const setSasEndTime = useCallback((val: Date | string | null) => setStoreFormData({ sasEndTime: val === null ? null : typeof val === 'string' ? new Date(val) : val }), [setStoreFormData]);
  const setPrevIn = useCallback((val: string | number | null) => setStoreFormData({ prevIn: val?.toString() || '' }), [setStoreFormData]);
  const setPrevOut = useCallback((val: string | number | null) => setStoreFormData({ prevOut: val?.toString() || '' }), [setStoreFormData]);

  const prevIn = storePrevIn !== '' ? Number(storePrevIn) : null;
  const prevOut = storePrevOut !== '' ? Number(storePrevOut) : null;

  // ==========================================================================
  // Local State
  // ==========================================================================

  const [isLoadingTime] = useState(false);
  const [updateAllSasStartDate, setUpdateAllSasStartDate] = useState<Date | undefined>(undefined);
  const [updateAllSasEndDate, setUpdateAllSasEndDate] = useState<Date | undefined>(undefined);
  const [sasUpdateProgress, setSasUpdateProgress] = useState<{ completed: number; total: number } | null>(null);
  const [showViewMachineConfirmation, setShowViewMachineConfirmation] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Machine selection state (not in useNewSelection sub-hook)
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>(undefined);
  const [machineForDataEntry, setMachineForDataEntry] = useState<CollectionReportMachineSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showMachineRolloverWarning, setShowMachineRolloverWarning] = useState(false);
  const [, setPendingMachineSubmission] = useState<(() => void) | null>(null);
  const [isFirstCollection, setIsFirstCollection] = useState(false);
  const [previousCollectionTime] = useState<Date | string | undefined>(undefined);
  const isAddMachineEnabled = useMemo(() => {
    if (!machineForDataEntry) return false;
    if (!currentMetersIn || !currentMetersOut) return false;
    return true;
  }, [machineForDataEntry, currentMetersIn, currentMetersOut]);
  const [currentJackpot] = useState<number>(0);

  const onRefreshRef = useRef(onRefresh);
  const onRefreshLocationsRef = useRef(onRefreshLocations);

  // ==========================================================================
  // Debounced Values
  // ==========================================================================

  const debouncedCurrentMetersIn = useDebounce(currentMetersIn, 500);
  const debouncedCurrentMetersOut = useDebounce(currentMetersOut, 500);
  const debouncedCurrentRamClearMetersIn = useDebounce(currentRamClearMetersIn, 500);
  const debouncedCurrentRamClearMetersOut = useDebounce(currentRamClearMetersOut, 500);

  // ==========================================================================
  // Sub-Hooks
  // ==========================================================================

  // Selection hook (location, machines, search)
  const selection = useNewSelection({
    locations: propLocations,
    selectedLocationId,
    lockedLocationId,
    setSelectedLocation,
    setLockedLocation,
    setCurrentCollectionTime,
  });

  // Add machine to collected list — calls the collections API, appends the
  // result to collectedMachineEntries, then resets the form for the next entry.
  const executeAddEntry = useCallback(async () => {
    if (!machineForDataEntry || !selectedMachineId || isProcessing) return;

    const effectivePrevIn = prevIn !== null ? prevIn : (machineForDataEntry.collectionMeters?.metersIn ?? 0);
    const effectivePrevOut = prevOut !== null ? prevOut : (machineForDataEntry.collectionMeters?.metersOut ?? 0);

    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      effectivePrevIn,
      effectivePrevOut,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
      false
    );

    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid machine data. Please check your inputs.', { duration: 5000 });
      return;
    }

    setIsProcessing(true);
    try {
      const collectionTime = sasEndTime ?? currentCollectionTime;
      const payload = {
        machineId: selectedMachineId,
        location: selectedLocationId || '',
        collector: userId || '',
        notes: currentMachineNotes,
        ramClear: currentRamClear,
        ramClearMetersIn: currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
        ramClearMetersOut: currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
        ...(sasStartTime ? { sasStartTime } : {}),
        sasEndTime: collectionTime instanceof Date ? collectionTime : new Date(collectionTime),
        timestamp: (collectionTime instanceof Date ? collectionTime : new Date(collectionTime)).toISOString(),
        collectionTime: (collectionTime instanceof Date ? collectionTime : new Date(collectionTime)).toISOString(),
        metersIn: Number(currentMetersIn),
        metersOut: Number(currentMetersOut),
        prevIn: effectivePrevIn,
        prevOut: effectivePrevOut,
        locationReportId: '',
        isCompleted: false,
      };

      const response = await axios.post('/api/collection-reports/collections', payload);
      const created = response.data.data as CollectionDocument;

      const enriched = {
        ...created,
        machineName: machineForDataEntry.name || created.machineName,
        serialNumber: machineForDataEntry.serialNumber || created.serialNumber,
        machineCustomName: machineForDataEntry.custom?.name || created.machineCustomName,
        game: machineForDataEntry.game || created.game,
      };

      setCollectedMachines([...collectedMachineEntries, enriched as typeof collectedMachineEntries[number]]);

      // Lock the location after first machine is added
      if (collectedMachineEntries.length === 0 && selectedLocationId) {
        setLockedLocation(selectedLocationId);
      }

      setHasChanges(true);

      // Reset form but keep the machine selected for potential follow-up
      setStoreFormData({
        metersIn: '',
        metersOut: '',
        ramClear: false,
        ramClearMetersIn: '',
        ramClearMetersOut: '',
        notes: '',
        prevIn: '',
        prevOut: '',
      });
      setSelectedMachineId(undefined);
      setMachineForDataEntry(null);
      setEditingEntryId(null);

      const displayName = machineForDataEntry.custom?.name || machineForDataEntry.name || machineForDataEntry.serialNumber || 'Machine';
      const serialPart = machineForDataEntry.serialNumber ? ` · ${machineForDataEntry.serialNumber}` : '';
      const gamePart = machineForDataEntry.game ? ` · ${machineForDataEntry.game}` : '';
      toast.success(`${displayName}${serialPart}${gamePart} added to list`);
    } catch (error) {
      console.error('[executeAddEntry] Error:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to add machine. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [
    machineForDataEntry, selectedMachineId, isProcessing, prevIn, prevOut,
    currentMetersIn, currentMetersOut, userId, currentRamClear,
    currentRamClearMetersIn, currentRamClearMetersOut, sasStartTime, sasEndTime,
    currentCollectionTime, currentMachineNotes, selectedLocationId,
    collectedMachineEntries, setCollectedMachines, setLockedLocation,
    setHasChanges, setStoreFormData, setIsProcessing,
  ]);

  // Entries hook (add/edit/delete machines)
  const entries = useNewEntries({
    collectedMachineEntries,
    setCollectedMachines,
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    setLockedLocation,
    userId,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentMachineNotes,
    currentRamClear,
    currentCollectionTime,
    sasStartTime,
    sasEndTime,
    showAdvancedSas,
    storePrevIn,
    storePrevOut,
    selectedMachineId,
    setSelectedMachineId,
    machineForDataEntry,
    logActivityCallback,
    isAddMachineEnabled,
    isProcessing,
    setIsProcessing,
    setHasChanges,
    resetEntryForm: () => {
      setSelectedMachineId(undefined);
      setMachineForDataEntry(null);
      setEditingEntryId(null);
    },
    setShowMachineRolloverWarning,
    setPendingMachineSubmission,
    prevIn,
    prevOut,
    executeAddEntry,
    executeUpdateEntry: async () => {},
    setEditingEntryId,
    editingEntryId,
    setShowUpdateConfirmation,
    confirmUpdateEntry: async () => {},
  });

  // Financials hook (calculations)
  const financialsHook = useNewFinancials({
    financials,
    setFinancials,
    locationCollectionBalance: selection.locationCollectionBalance,
    locationProfitShare: selection.locationProfitShare,
    collectedMachineEntries: entries.collectedMachineEntries,
  });

  // Submission hook (create report)
  const submission = useNewSubmission({
    collectedMachineEntries: entries.collectedMachineEntries,
    financials,
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    userId,
    currentCollectionTime,
    previousCollectionTime: previousCollectionTime,
    selectedLocation: selection.selectedLocation as { profitShare?: number; includeJackpot?: boolean } | null,
    setCollectedMachines,
    setLockedLocation,
    setSelectedLocation,
    setHasChanges,
    resetStoreState,
    onSuccess,
    onRefresh,
    onClose,
    logActivityCallback,
  });

  // ==========================================================================
  // Effects
  // ==========================================================================

  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onRefreshLocationsRef.current = onRefreshLocations;
  });

  useEffect(() => {
    if (show && userId) {
      selection.setIsLoadingLocations(true);
      getLocationsWithMachines(undefined, false)
        .then((locs: CollectionReportLocationWithMachines[]) => {
          selection.setInternalLocations(locs);
        })
        .catch((err: unknown) => {
          console.error('Error fetching collection metadata:', err);
          toast.error('Failed to load collection metadata');
        })
        .finally(() => selection.setIsLoadingLocations(false));
    } else {
      selection.setIsLoadingLocations(false);
    }
  }, [show, userId, selection.setInternalLocations, selection.setIsLoadingLocations]);

  // Populate machineForDataEntry whenever the selected machine changes.
  // Without this, machineForDataEntry stays null and the data-entry form never renders.
  useEffect(() => {
    if (!selectedMachineId) {
      setMachineForDataEntry(null);
      return;
    }
    const found = selection.machinesOfSelectedLocation.find(
      machine => String(machine._id) === selectedMachineId
    );
    setMachineForDataEntry(found ?? null);
  }, [selectedMachineId, selection.machinesOfSelectedLocation]);

  // When a machine is selected, pre-fill prevIn/prevOut and sasStartTime from its
  // most recent collection data. machine.collectionMeters and collectionTime are
  // updated by both V1 and V2 flows, so these always reflect the latest
  // collection regardless of which version wrote them.
  useEffect(() => {
    if (!machineForDataEntry) {
      setPrevIn(null);
      setPrevOut(null);
      setSasStartTime(null);
      return;
    }
    const collectionIn = machineForDataEntry.collectionMeters?.metersIn;
    const collectionOut = machineForDataEntry.collectionMeters?.metersOut;
    setPrevIn(collectionIn != null && collectionIn > 0 ? collectionIn : null);
    setPrevOut(collectionOut != null && collectionOut > 0 ? collectionOut : null);

    // Auto-fill SAS start time from the machine's last collection time — this
    // is the end of the previous session which becomes the start of this one.
    if (machineForDataEntry.collectionTime) {
      setSasStartTime(new Date(machineForDataEntry.collectionTime));
    } else {
      setSasStartTime(null);
    }
  }, [machineForDataEntry]);

  useEffect(() => {
    if (!currentRamClear) return;
    const ramIn = debouncedCurrentRamClearMetersIn ? Number(debouncedCurrentRamClearMetersIn) : null;
    const ramOut = debouncedCurrentRamClearMetersOut ? Number(debouncedCurrentRamClearMetersOut) : null;
    const pIn = prevIn !== null ? prevIn : 0;
    const pOut = prevOut !== null ? prevOut : 0;
    if (ramIn !== null && ramIn < pIn) {
      toast.warning(`RAM clear Meters In (${ramIn}) is less than the previous value (${pIn}). It must be ≥ previous.`, { position: 'top-left', duration: 5000 });
    }
    if (ramOut !== null && ramOut < pOut) {
      toast.warning(`RAM clear Meters Out (${ramOut}) is less than the previous value (${pOut}). It must be ≥ previous.`, { position: 'top-left', duration: 5000 });
    }
  }, [debouncedCurrentRamClearMetersIn, debouncedCurrentRamClearMetersOut, currentRamClear, prevIn, prevOut]);

  useEffect(() => {
    financialsHook.calculateAmountToCollect();
  }, [financialsHook.calculateAmountToCollect]);

  useEffect(() => {
    if (entries.collectedMachineEntries.length === 0) return;
    const toDate = (val: Date | string | undefined | null): Date | null => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val as string);
      return isNaN(d.getTime()) ? null : d;
    };
    const starts = entries.collectedMachineEntries
      .map((entry) => toDate(entry.sasMeters?.sasStartTime))
      .filter((date): date is Date => date !== null);
    const ends = entries.collectedMachineEntries
      .map((entry) => toDate(entry.sasMeters?.sasEndTime))
      .filter((date): date is Date => date !== null);
    if (starts.length > 0) setUpdateAllSasStartDate(new Date(Math.min(...starts.map((d) => d.getTime()))));
    if (ends.length > 0) setUpdateAllSasEndDate(new Date(Math.max(...ends.map((d) => d.getTime()))));
  }, [entries.collectedMachineEntries]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleClose = useCallback(() => {
    if (hasChanges && onRefresh) onRefresh();
    setCollectedMachines([]);
    setSelectedLocation(undefined, '');
    setSelectedMachineId(undefined);
    setLockedLocation(undefined);
    selection.setMachineSearchTerm('');
    setHasChanges(false);
    resetStoreState();
    // Clear machine selection state
    setSelectedMachineId(undefined);
    setMachineForDataEntry(null);
    setEditingEntryId(null);
    onClose();
  }, [hasChanges, onRefresh, onClose, setCollectedMachines, setSelectedLocation, setSelectedMachineId, setLockedLocation, selection.setMachineSearchTerm, resetStoreState]);

  const handleLocationChange = useCallback((value: string) => {
    selection.handleLocationChange(value);
    if (selection.selectedLocation) {
      setFinancials({ previousBalance: (selection.selectedLocation.collectionBalance || 0).toString() });
    }
  }, [selection, setFinancials]);

  const handleApplyAllDates = useCallback(async () => {
    if (!updateAllSasStartDate && !updateAllSasEndDate) return;
    if (entries.collectedMachineEntries.length < 1) return;
    try {
      setIsProcessing(true);
      const axiosInstance = (await import('axios')).default;
      const patchData: Record<string, string> = {};
      const startTimeISO = updateAllSasStartDate?.toISOString();
      const endTimeISO = updateAllSasEndDate?.toISOString();
      if (startTimeISO) patchData.sasStartTime = startTimeISO;
      if (endTimeISO) patchData.sasEndTime = endTimeISO;
      const total = entries.collectedMachineEntries.length;
      setSasUpdateProgress({ completed: 0, total });
      const results = await Promise.allSettled(
        entries.collectedMachineEntries.map(async (entry) => {
          if (!entry._id) {
            setSasUpdateProgress((prev) => prev ? { ...prev, completed: prev.completed + 1 } : null);
            return;
          }
          await axiosInstance.patch(`/api/collection-reports/collections/${entry._id}`, patchData);
          setSasUpdateProgress((prev) => prev ? { ...prev, completed: prev.completed + 1 } : null);
        })
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`${failed} machine${failed > 1 ? 's' : ''} failed to update`);
        return;
      }
      const updatedEntries = entries.collectedMachineEntries.map((entry) => {
        const sasMeters = { ...entry.sasMeters };
        const getSasStartTime = (): Date | undefined => startTimeISO ? new Date(startTimeISO as string) : entry.sasMeters?.sasStartTime instanceof Date ? entry.sasMeters?.sasStartTime : entry.sasMeters?.sasStartTime ? new Date(entry.sasMeters.sasStartTime as string) : undefined;
        const getSasEndTime = (): Date | undefined => endTimeISO ? new Date(endTimeISO as string) : entry.sasMeters?.sasEndTime instanceof Date ? entry.sasMeters?.sasEndTime : entry.sasMeters?.sasEndTime ? new Date(entry.sasMeters.sasEndTime as string) : undefined;
        sasMeters.sasStartTime = getSasStartTime();
        sasMeters.sasEndTime = getSasEndTime();
        return { ...entry, sasMeters };
      });
      setCollectedMachines(updatedEntries as typeof entries.collectedMachineEntries);
      toast.success('All SAS times updated successfully!');
      setUpdateAllSasStartDate(undefined);
      setUpdateAllSasEndDate(undefined);
    } catch {
      toast.error('Failed to update SAS times');
    } finally {
      setIsProcessing(false);
      setSasUpdateProgress(null);
    }
  }, [updateAllSasStartDate, updateAllSasEndDate, entries.collectedMachineEntries, setIsProcessing, setCollectedMachines, setUpdateAllSasStartDate, setUpdateAllSasEndDate, setSasUpdateProgress]);

  // ==========================================================================
  // Computed
  // ==========================================================================

  const anyConfirmationOpen = !!(
    submission.showCreateReportConfirmation ||
    entries.showDeleteConfirmation ||
    showUpdateConfirmation ||
    showMachineRolloverWarning
  );

  // ==========================================================================
  // Return - Combined API
  // ==========================================================================

  return {
    locations: selection.locations,
    isLoadingLocations: selection.isLoadingLocations,
    isLoadingMachines: selection.isLoadingMachines,
    isLoadingTime,
    selectedLocationId,
    selectedLocationName,
    machinesOfSelectedLocation: selection.machinesOfSelectedLocation,
    machineSearchTerm: selection.machineSearchTerm,
    setMachineSearchTerm: selection.setMachineSearchTerm,
    lockedLocationId,
    selectedMachineId,
    setSelectedMachineId,
    filteredMachines: selection.filteredMachines,
    machineForDataEntry,
    inputsEnabled: !!selectedMachineId && !!machineForDataEntry,
    isAddMachineEnabled,
    isMiddleReportWarning: false,
    selectedLocation: selection.selectedLocation,
    locationCollectionBalance: selection.locationCollectionBalance,
    locationProfitShare: selection.locationProfitShare,
    currentCollectionTime,
    setCurrentCollectionTime,
    currentMetersIn,
    setCurrentMetersIn,
    currentMetersOut,
    setCurrentMetersOut,
    currentRamClearMetersIn,
    setCurrentRamClearMetersIn,
    currentRamClearMetersOut,
    setCurrentRamClearMetersOut,
    currentMachineNotes,
    setCurrentMachineNotes,
    currentRamClear,
    setCurrentRamClear,
    showAdvancedSas,
    setShowAdvancedSas: (val: boolean) => setStoreFormData({ showAdvancedSas: val }),
    sasStartTime,
    setSasStartTime,
    sasEndTime,
    setSasEndTime,
    prevIn: storePrevIn,
    setPrevIn,
    prevOut: storePrevOut,
    setPrevOut,
    jackpot: currentJackpot,
    includeJackpot: selection.selectedLocation?.includeJackpot ?? false,
    isFirstCollection,
    setIsFirstCollection,
    collectedMachineEntries: entries.collectedMachineEntries,
    setCollectedMachineEntries: setCollectedMachines,
    setLockedLocation,
    setHasChanges,
    userId,
    isProcessing: isProcessing || submission.isProcessing,
    editingEntryId: entries.editingEntryId,
    previousCollectionTime,
    isLoadingExistingCollections: false,
    baseBalanceCorrection: '0',
    setBaseBalanceCorrection: () => {},
    financials: financialsHook.financials,
    setFinancials: financialsHook.setFinancials,
    showUpdateConfirmation,
    setShowUpdateConfirmation,
    showMachineRolloverWarning,
    setShowMachineRolloverWarning,
    showDeleteConfirmation: entries.showDeleteConfirmation,
    setShowDeleteConfirmation: entries.setShowDeleteConfirmation,
    showCreateReportConfirmation: submission.showCreateReportConfirmation,
    setShowCreateReportConfirmation: submission.setShowCreateReportConfirmation,
    showViewMachineConfirmation,
    setShowViewMachineConfirmation,
    entryToDelete: entries.entryToDelete,
    setEntryToDelete: entries.setEntryToDelete,
    anyConfirmationOpen,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    debouncedCurrentMetersIn,
    debouncedCurrentMetersOut,
    debouncedCurrentRamClearMetersIn,
    debouncedCurrentRamClearMetersOut,
    handleLocationChange,
    handleClose,
    handleDisabledFieldClick: () => {},
    handleAddOrUpdateEntry: () => {},
    handleEditCollectedEntry: entries.handleEditEntry,
    handleDeleteCollectedEntry: entries.handleDeleteEntry,
    handleAddEntry: entries.handleAddEntry,
    executeAddEntry,
    confirmUpdateEntry: async () => {},
    confirmDeleteEntry: entries.confirmDeleteEntry,
    handleConfirmMachineRollover: () => { setPendingMachineSubmission(null); setShowMachineRolloverWarning(false); },
    handleCancelMachineRollover: () => { setPendingMachineSubmission(null); setShowMachineRolloverWarning(false); },
    handleCancelEdit: () => { setEditingEntryId(null); setMachineForDataEntry(null); setSelectedMachineId(undefined); },
    confirmCreateReports: submission.handleCreateReport,
    handleApplyAllDates,
    sasUpdateProgress,
    createReportProgress: submission.createReportProgress,
    createPhases: submission.createPhases,
    currentCreatePhase: submission.currentCreatePhase,
    currentSubStep: submission.currentSubStep,
  };
}