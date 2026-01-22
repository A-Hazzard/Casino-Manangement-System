/**
 * useEditCollectionModal Hook
 *
 * Encapsulates state and logic for the Edit Collection Modal.
 * Handles location selection, machine fetching, validation, entry management, and report updates.
 *
 * Features:
 * - Location and machine selection
 * - Collection data editing
 * - Machine entry management (add, edit, delete)
 * - Financial data management
 * - Report updates
 * - Validation and error handling
 */

'use client';

import { updateCollectionReport } from '@/lib/helpers/collectionReport';
import {
  deleteMachineCollection,
  fetchCollectionsByReportId,
  sortMachinesAlphabetically,
} from '@/lib/helpers/collectionReport/editCollectionModalHelpers';
import { fetchCollectionReportById } from '@/lib/helpers/collectionReport/fetching';
import { validateMachineEntry } from '@/lib/helpers/collectionReport';
import { updateCollection } from '@/lib/helpers/collections';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';
import { useUserStore } from '@/lib/store/userStore';
import type {
  CollectionReportData,
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type {
  CollectionDocument,
  PreviousCollectionMeters,
} from '@/lib/types/collection';
import { calculateDefaultCollectionTime } from '@/lib/utils/collection';
import {
  calculateMachineMovement,
  calculateMovement,
} from '@/lib/utils/movement';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type UseEditCollectionModalProps = {
  show: boolean;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh?: () => void;
  onClose: () => void;
};

export function useEditCollectionModal({
  show,
  reportId,
  locations,
  onRefresh,
  onClose,
}: UseEditCollectionModalProps) {
  const user = useUserStore(state => state.user);
  const userId = user?._id;

  // ============================================================================
  // State Management
  // ============================================================================
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [collectedMachineEntries, setCollectedMachineEntries] = useState<
    CollectionDocument[]
  >([]);
  const [originalCollections, setOriginalCollections] = useState<
    CollectionDocument[]
  >([]);
  const [collectedMachinesSearchTerm, setCollectedMachinesSearchTerm] =
    useState('');
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [updateAllDate, setUpdateAllDate] = useState<Date | undefined>(
    undefined
  );
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showViewMachineConfirmation, setShowViewMachineConfirmation] =
    useState(false);
  const [viewMode, setViewMode] = useState<'machines' | 'collected'>(
    'machines'
  );
  const [currentCollectionTime, setCurrentCollectionTime] = useState<Date>(
    new Date()
  );
  const [currentMetersIn, setCurrentMetersIn] = useState('');
  const [currentMetersOut, setCurrentMetersOut] = useState('');
  const [currentRamClearMetersIn, setCurrentRamClearMetersIn] = useState('');
  const [currentRamClearMetersOut, setCurrentRamClearMetersOut] = useState('');
  const [currentMachineNotes, setCurrentMachineNotes] = useState('');
  const [currentRamClear, setCurrentRamClear] = useState(false);
  const [showAdvancedSas, setShowAdvancedSas] = useState(false);
  const [customSasStartTime, setCustomSasStartTime] = useState<Date | null>(
    null
  );
  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);
  const [isFirstCollection, setIsFirstCollection] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showUpdateReportConfirmation, setShowUpdateReportConfirmation] =
    useState(false);
  const [financials, setFinancials] = useState({
    taxes: '',
    advance: '',
    variance: '',
    varianceReason: '',
    amountToCollect: '',
    collectedAmount: '',
    balanceCorrection: '0',
    balanceCorrectionReason: '',
    previousBalance: '0',
    reasonForShortagePayment: '',
  });
  const [baseBalanceCorrection, setBaseBalanceCorrection] =
    useState<string>('');
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [hasSetCollectionTimeFromReport, setHasSetCollectionTimeFromReport] =
    useState(false);

  // ============================================================================
  // Refs for stable references
  // ============================================================================
  // Use ref to store locations to avoid dependency on array reference in effects
  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const selectedLocation = useMemo(
    () => locations.find(l => String(l._id) === selectedLocationId),
    [locations, selectedLocationId]
  );

  // Extract primitive values from selectedLocation to prevent unnecessary effect triggers
  const locationCollectionBalance = useMemo(
    () => selectedLocation?.collectionBalance ?? 0,
    [selectedLocation?.collectionBalance]
  );

  const locationProfitShare = useMemo(
    () => selectedLocation?.profitShare ?? 50,
    [selectedLocation?.profitShare]
  );

  const machineForDataEntry = useMemo(() => {
    let found = machinesOfSelectedLocation.find(
      m => String(m._id) === selectedMachineId
    );

    if (!found && selectedMachineId) {
      const collectedEntry = collectedMachineEntries.find(
        entry => entry.machineId === selectedMachineId
      );

      if (collectedEntry) {
        found = {
          _id: collectedEntry.machineId as string,
          name:
            collectedEntry.machineCustomName ||
            collectedEntry.serialNumber ||
            collectedEntry.machineId,
          serialNumber: collectedEntry.serialNumber || collectedEntry.machineId,
          collectionMeters: {
            metersIn: collectedEntry.prevIn || 0,
            metersOut: collectedEntry.prevOut || 0,
          },
        } as (typeof machinesOfSelectedLocation)[0];
      }
    }

    return found;
  }, [machinesOfSelectedLocation, selectedMachineId, collectedMachineEntries]);

  const filteredMachines = useMemo(() => {
    let result = machinesOfSelectedLocation;

    if (machineSearchTerm.trim()) {
      const searchLower = machineSearchTerm.toLowerCase();
      result = machinesOfSelectedLocation.filter(
        machine =>
          (machine.name && machine.name.toLowerCase().includes(searchLower)) ||
          (machine.serialNumber &&
            machine.serialNumber.toLowerCase().includes(searchLower)) ||
          (machine.custom?.name &&
            machine.custom.name.toLowerCase().includes(searchLower)) ||
          (machine.game && machine.game.toLowerCase().includes(searchLower))
      );
    }

    // Always sort alphabetically and numerically
    return sortMachinesAlphabetically(result);
  }, [machinesOfSelectedLocation, machineSearchTerm]);

  const isUpdateReportEnabled = useMemo(() => {
    return (
      collectedMachineEntries.length > 0 &&
      financials.variance !== '' &&
      financials.advance !== '' &&
      financials.taxes !== '' &&
      financials.previousBalance !== '' &&
      financials.collectedAmount !== ''
    );
  }, [collectedMachineEntries, financials]);

  // Real-time validation for meter inputs
  const validateMeterInputs = useCallback(() => {
    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      return;
    }

    // Check if RAM Clear meters are missing (but don't return early)
    const ramClearMetersMissing =
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut);

    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      prevIn || 0,
      prevOut || 0,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    // Combine validation warnings with RAM Clear meters missing warning
    const allWarnings = [...(validation.warnings || [])];
    if (ramClearMetersMissing) {
      allWarnings.push(
        'Please enter last meters before Ram clear (or rollover)'
      );
    }
  }, [
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    userId,
    currentRamClear,
    prevIn,
    prevOut,
  ]);

  // Debounced values
  const debouncedMachineForDataEntry = useDebounce(machineForDataEntry, 1000);
  const debouncedEditingEntryId = useDebounce(editingEntryId, 1000);
  const debouncedCurrentMetersIn = useDebounce(currentMetersIn, 1500);
  const debouncedCurrentMetersOut = useDebounce(currentMetersOut, 1500);
  const debouncedCurrentMachineNotes = useDebounce(currentMachineNotes, 1500);
  const debouncedCurrentRamClearMetersIn = useDebounce(
    currentRamClearMetersIn,
    1500
  );
  const debouncedCurrentRamClearMetersOut = useDebounce(
    currentRamClearMetersOut,
    1500
  );

  // Debounced validation on input changes
  const debouncedValidateMeterInputs = useDebouncedCallback(
    validateMeterInputs,
    3000
  );

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleClose = useCallback(() => {
    // Check if there are unsaved edits
    if (hasUnsavedEdits) {
      setShowUnsavedChangesWarning(true);
      return false;
    }

    // Check if user has unsaved machine data (selected machine or entered data)
    if (
      !editingEntryId &&
      (selectedMachineId ||
        currentMetersIn ||
        currentMetersOut ||
        currentMachineNotes.trim())
    ) {
      const enteredMetersIn = currentMetersIn ? Number(currentMetersIn) : 0;
      const enteredMetersOut = currentMetersOut ? Number(currentMetersOut) : 0;
      const hasNotes = currentMachineNotes.trim().length > 0;

      if (
        selectedMachineId ||
        enteredMetersIn !== 0 ||
        enteredMetersOut !== 0 ||
        hasNotes
      ) {
        toast.error(
          `You have unsaved machine data. ` +
            (selectedMachineId
              ? `Machine: ${machineForDataEntry?.name || machineForDataEntry?.serialNumber || 'selected machine'}. `
              : '') +
            (enteredMetersIn !== 0 || enteredMetersOut !== 0
              ? `Meters: In=${enteredMetersIn}, Out=${enteredMetersOut}. `
              : '') +
            (hasNotes
              ? `Notes: "${currentMachineNotes.substring(0, 30)}${currentMachineNotes.length > 30 ? '...' : ''}". `
              : '') +
            `Please click "Add Machine to List" to save this data, or cancel by clicking the X button and confirming you want to discard changes.`,
          {
            duration: 10000,
            position: 'top-left',
          }
        );
        setShowUnsavedChangesWarning(true);
        return false;
      }
    }

    if (hasChanges && onRefresh) {
      onRefresh();
    }
    onClose();
    return true;
  }, [
    hasChanges,
    onRefresh,
    onClose,
    hasUnsavedEdits,
    editingEntryId,
    selectedMachineId,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    machineForDataEntry?.name,
    machineForDataEntry?.serialNumber,
  ]);

  const handleDisabledFieldClick = useCallback(() => {
    if (!machineForDataEntry) {
      toast.warning('Please select a machine first', {
        duration: 3000,
        position: 'top-left',
      });
    }
  }, [machineForDataEntry]);

  const handleEditEntry = useCallback(
    async (entryId: string) => {
      if (isProcessing) return;

      const entryToEdit = collectedMachineEntries.find(e => e._id === entryId);
      if (entryToEdit) {
        // Set editing state
        setEditingEntryId(entryId);

        // Set the selected machine ID
        setSelectedMachineId(entryToEdit.machineId);

        // Populate form fields with existing data
        setCurrentMetersIn(entryToEdit.metersIn.toString());
        setCurrentMetersOut(entryToEdit.metersOut.toString());
        setCurrentMachineNotes(entryToEdit.notes || '');
        setCurrentRamClear(entryToEdit.ramClear || false);
        setCurrentRamClearMetersIn(
          entryToEdit.ramClearMetersIn?.toString() || ''
        );
        setCurrentRamClearMetersOut(
          entryToEdit.ramClearMetersOut?.toString() || ''
        );

        // Set the collection time
        if (entryToEdit.timestamp) {
          setCurrentCollectionTime(new Date(entryToEdit.timestamp));
        }

        // Set previous values for display
        setPrevIn(entryToEdit.prevIn || 0);
        setPrevOut(entryToEdit.prevOut || 0);

        toast.info(
          "Edit mode activated. Make your changes and click 'Update Entry in List'.",
          { position: 'top-left' }
        );
      }
    },
    [isProcessing, collectedMachineEntries]
  );

  const handleCancelEdit = useCallback(() => {
    // Reset editing state
    setEditingEntryId(null);

    // Clear all input fields
    setCurrentMetersIn('');
    setCurrentMetersOut('');
    setCurrentMachineNotes('');
    setCurrentRamClear(false);
    setCurrentRamClearMetersIn('');
    setCurrentRamClearMetersOut('');
    // Keep existing collectionTime - don't reset it

    // Reset prev values
    setPrevIn(null);
    setPrevOut(null);

    toast.info('Edit cancelled', { position: 'top-left' });
  }, []);

  const confirmAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // Validation logic here (same as existing validation)
    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      prevIn || 0,
      prevOut || 0,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
      !!editingEntryId
    );

    if (!validation.isValid) {
      toast.error(validation.error || 'Validation failed', {
        position: 'top-left',
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (editingEntryId) {
        // Find the existing collection to get its locationReportId
        const existingEntry = collectedMachineEntries.find(
          e => e._id === editingEntryId
        );

        // Update existing collection
        const result = await updateCollection(editingEntryId, {
          metersIn: Number(currentMetersIn),
          metersOut: Number(currentMetersOut),
          notes: currentMachineNotes,
          ramClear: currentRamClear,
          ramClearMetersIn: currentRamClearMetersIn
            ? Number(currentRamClearMetersIn)
            : undefined,
          ramClearMetersOut: currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined,
          timestamp: currentCollectionTime,
          prevIn: prevIn || 0,
          prevOut: prevOut || 0,
          // CRITICAL: Preserve the existing locationReportId for history update
          locationReportId: existingEntry?.locationReportId || reportId,
        });

        // Update local state
        setCollectedMachineEntries(prev =>
          prev.map(entry =>
            entry._id === editingEntryId ? { ...entry, ...result } : entry
          )
        );

        // Clear editing state and machine selection first to disable inputs
        setEditingEntryId(null);
        setSelectedMachineId('');

        // Then clear all form fields
        setCurrentMetersIn('');
        setCurrentMetersOut('');
        setCurrentMachineNotes('');
        setCurrentRamClear(false);
        setCurrentRamClearMetersIn('');
        setCurrentRamClearMetersOut('');
        setPrevIn(null);
        setPrevOut(null);

        toast.success('Machine updated!', { position: 'top-left' });
      } else {
        // Calculate movement with RAM Clear support using the same utility
        const previousMeters: PreviousCollectionMeters = {
          metersIn: prevIn || 0,
          metersOut: prevOut || 0,
        };

        const movement = calculateMovement(
          Number(currentMetersIn),
          Number(currentMetersOut),
          previousMeters,
          currentRamClear,
          currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
          currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined
        );

        // Round movement values to 2 decimal places
        const roundedMovement = {
          metersIn: Number(movement.metersIn.toFixed(2)),
          metersOut: Number(movement.metersOut.toFixed(2)),
          gross: Number(movement.gross.toFixed(2)),
        };

        // Add new collection to the list
        const newEntry: CollectionDocument = {
          _id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          machineId: selectedMachineId,
          machineName: machineForDataEntry?.name || '',
          serialNumber: machineForDataEntry?.serialNumber || '',
          machineCustomName: machineForDataEntry?.custom?.name || '',
          metersIn: Number(currentMetersIn),
          metersOut: Number(currentMetersOut),
          prevIn: prevIn || 0,
          prevOut: prevOut || 0,
          notes: currentMachineNotes,
          ramClear: currentRamClear,
          ramClearMetersIn: currentRamClearMetersIn
            ? Number(currentRamClearMetersIn)
            : undefined,
          ramClearMetersOut: currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined,
          timestamp: currentCollectionTime,
          location: selectedLocationName,
          locationReportId: reportId,
          collector: userId || '',
          isCompleted: false,
          softMetersIn: 0,
          softMetersOut: 0,
          sasMeters: {
            machine: selectedMachineId,
            drop: 0,
            totalCancelledCredits: 0,
            gross: 0,
            gamesPlayed: 0,
            jackpot: 0,
            sasStartTime: '',
            sasEndTime: '',
          },
          movement: roundedMovement,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        };

        // Save to database first
        try {
          const collectionPayload = {
            machineId: selectedMachineId,
            machineName: machineForDataEntry?.name || '',
            serialNumber: machineForDataEntry?.serialNumber || '',
            machineCustomName: machineForDataEntry?.custom?.name || '',
            metersIn: Number(currentMetersIn),
            metersOut: Number(currentMetersOut),
            notes: currentMachineNotes,
            ramClear: currentRamClear,
            ramClearMetersIn: currentRamClearMetersIn
              ? Number(currentRamClearMetersIn)
              : undefined,
            ramClearMetersOut: currentRamClearMetersOut
              ? Number(currentRamClearMetersOut)
              : undefined,
            timestamp: currentCollectionTime,
            location: selectedLocationName,
            locationReportId: reportId,
            collector: userId || '',
            ...(customSasStartTime && {
              sasMeters: {
                sasStartTime: customSasStartTime,
              },
            }),
          };

          const response = await axios.post(
            '/api/collections',
            collectionPayload
          );

          // Add to local state with the real ID from database
          const savedEntry = { ...newEntry, _id: response.data.data._id };
          setCollectedMachineEntries(prev => [...prev, savedEntry]);
          setHasChanges(true);

          // Reset form fields
          setCurrentMetersIn('');
          setCurrentMetersOut('');
          setCurrentMachineNotes('');
          setCurrentRamClear(false);
          setCurrentRamClearMetersIn('');
          setCurrentRamClearMetersOut('');
          setPrevIn(null);
          setPrevOut(null);
          setSelectedMachineId('');

          toast.success(
            'Machine added to collection list and saved to database!',
            { position: 'top-left' }
          );
        } catch (error) {
          console.error('Error saving collection to database:', error);
          toast.error('Failed to save machine to database. Please try again.', {
            position: 'top-left',
          });
        }
      }
    } catch {
      toast.error('Failed to update machine. Please try again.', {
        position: 'top-left',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    collectedMachineEntries,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    editingEntryId,
    prevIn,
    prevOut,
    userId,
    customSasStartTime,
    reportId,
    selectedLocationName,
  ]);

  const confirmUpdateEntry = useCallback(() => {
    setShowUpdateConfirmation(false);
    confirmAddOrUpdateEntry();
  }, [confirmAddOrUpdateEntry]);

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // If updating an existing entry, show confirmation dialog
    if (editingEntryId) {
      setShowUpdateConfirmation(true);
      return;
    }

    // If adding a new entry, proceed directly
    if (machineForDataEntry) {
      confirmAddOrUpdateEntry();
    }
  }, [
    isProcessing,
    editingEntryId,
    machineForDataEntry,
    confirmAddOrUpdateEntry,
  ]);

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      if (isProcessing) return;

      // Check if this is the last collection
      if (collectedMachineEntries.length === 1) {
        toast.error(
          'Cannot delete the last collection. A collection report must have at least one machine. Please add another machine before deleting this one.',
          {
            duration: 5000,
            position: 'top-left',
          }
        );
        return;
      }

      setEntryToDelete(entryId);
      setShowDeleteConfirmation(true);
    },
    [isProcessing, collectedMachineEntries.length]
  );

  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete) return;

    setIsProcessing(true);
    try {
      await deleteMachineCollection(entryToDelete);
      toast.success('Machine deleted!', { position: 'top-left' });

      // Remove the deleted entry from local state immediately
      setCollectedMachineEntries(prev =>
        prev.filter(entry => entry._id !== entryToDelete)
      );

      // CRITICAL: Also update originalCollections to prevent batch update errors
      setOriginalCollections(prev =>
        prev.filter(entry => entry._id !== entryToDelete)
      );

      // Refetch collections to ensure data consistency
      setIsLoadingCollections(true);
      try {
        const updatedCollections = await fetchCollectionsByReportId(reportId);
        setCollectedMachineEntries(updatedCollections);
        // CRITICAL: Also update originalCollections with the fresh data
        setOriginalCollections(JSON.parse(JSON.stringify(updatedCollections)));
      } catch (error) {
        console.error('Error refetching collections after delete:', error);
      } finally {
        setIsLoadingCollections(false);
      }

      setHasChanges(true);

      // Refresh machines data to show updated values (including reverted collectionMeters)
      if (onRefresh) {
        onRefresh();
      }

      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setEntryToDelete(null);
    } catch {
      toast.error('Failed to delete machine', { position: 'top-left' });
    } finally {
      setIsProcessing(false);
    }
  }, [entryToDelete, reportId, onRefresh]);

  const handleUpdateReport = useCallback(async () => {
    if (isProcessing || !userId || !reportData) {
      toast.error('Missing required data.', { position: 'top-left' });
      return;
    }

    // Check if there are any collections
    if (collectedMachineEntries.length === 0) {
      toast.error(
        'Cannot update report. At least one machine must be added to the collection report.',
        {
          duration: 5000,
          position: 'top-left',
        }
      );
      return;
    }

    // Check if user has unsaved form changes for currently selected machine
    if (editingEntryId && machineForDataEntry) {
      const editingEntry = collectedMachineEntries.find(
        e => e._id === editingEntryId
      );
      if (editingEntry) {
        const formMetersIn = currentMetersIn ? Number(currentMetersIn) : 0;
        const formMetersOut = currentMetersOut ? Number(currentMetersOut) : 0;
        const savedMetersIn = editingEntry.metersIn || 0;
        const savedMetersOut = editingEntry.metersOut || 0;

        // Check if form values differ from saved values
        if (
          formMetersIn !== savedMetersIn ||
          formMetersOut !== savedMetersOut
        ) {
          toast.warning(
            `Unsaved meter changes detected for ${machineForDataEntry.name || machineForDataEntry.serialNumber}. ` +
              `Current form: In=${formMetersIn}, Out=${formMetersOut}. ` +
              `Saved values: In=${savedMetersIn}, Out=${savedMetersOut}. ` +
              `Please click "Update Machine" to save changes or cancel the edit.`,
            {
              duration: 8000,
              position: 'top-left',
            }
          );
          return;
        }
      }
    }

    // Check if user has entered new machine data without adding it to the list
    if (
      !editingEntryId &&
      (selectedMachineId ||
        currentMetersIn ||
        currentMetersOut ||
        currentMachineNotes)
    ) {
      const enteredMetersIn = currentMetersIn ? Number(currentMetersIn) : 0;
      const enteredMetersOut = currentMetersOut ? Number(currentMetersOut) : 0;
      const hasNotes = currentMachineNotes.trim().length > 0;

      // If ANY data has been entered (machine selected, meters entered, or notes added)
      if (
        selectedMachineId ||
        enteredMetersIn !== 0 ||
        enteredMetersOut !== 0 ||
        hasNotes
      ) {
        toast.error(
          `You have unsaved machine data. ` +
            (selectedMachineId
              ? `Machine: ${machineForDataEntry?.name || machineForDataEntry?.serialNumber || 'selected machine'}. `
              : '') +
            (enteredMetersIn !== 0 || enteredMetersOut !== 0
              ? `Meters: In=${enteredMetersIn}, Out=${enteredMetersOut}. `
              : '') +
            (hasNotes
              ? `Notes: "${currentMachineNotes.substring(0, 30)}${currentMachineNotes.length > 30 ? '...' : ''}". `
              : '') +
            `Please click "Add Machine to List" to save this data, or cancel by unselecting the machine and clearing the form before updating the report.`,
          {
            duration: 10000,
            position: 'top-left',
          }
        );
        return;
      }
    }

    setIsProcessing(true);
    try {
      // PHASE 1: Detect machine meter changes and call batch update API
      const changes: Array<{
        machineId: string;
        locationReportId: string;
        metersIn: number;
        metersOut: number;
        prevMetersIn: number;
        prevMetersOut: number;
        collectionId: string;
      }> = [];

      for (const current of collectedMachineEntries) {
        const original = originalCollections.find(o => o._id === current._id);
        if (original) {
          // Check if meters changed
          const metersInChanged = current.metersIn !== original.metersIn;
          const metersOutChanged = current.metersOut !== original.metersOut;

          if (metersInChanged || metersOutChanged) {
            changes.push({
              machineId: current.machineId,
              locationReportId: current.locationReportId || reportId,
              metersIn: current.metersIn || 0,
              metersOut: current.metersOut || 0,
              prevMetersIn: current.prevIn || 0,
              prevMetersOut: current.prevOut || 0,
              collectionId: current._id,
            });
          }
        } else {
          // CRITICAL: This is a NEW machine added in this editing session
          changes.push({
            machineId: current.machineId,
            locationReportId: current.locationReportId || reportId,
            metersIn: current.metersIn || 0,
            metersOut: current.metersOut || 0,
            prevMetersIn: current.prevIn || 0,
            prevMetersOut: current.prevOut || 0,
            collectionId: current._id,
          });
        }
      }

      // If there are meter changes, call batch update API
      if (changes.length > 0) {
        const batchResponse = await axios.patch(
          `/api/collection-reports/${reportId}/update-history`,
          { changes }
        );

        if (!batchResponse.data.success) {
          toast.error('Failed to update machine histories. Please try again.', {
            position: 'top-left',
          });
          return;
        }

        toast.success(
          `Updated ${changes.length} machine histories successfully!`,
          { position: 'top-left' }
        );
      }

      // PHASE 2: Update collection report financials
      const updateData = {
        ...reportData,
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected: Number(financials.collectedAmount) || 0,
        taxes: Number(financials.taxes) || 0,
        advance: Number(financials.advance) || 0,
        varianceReason: financials.varianceReason,
        reasonShortagePayment: financials.reasonForShortagePayment,
        balanceCorrection: Number(financials.balanceCorrection) || 0,
        balanceCorrectionReas: financials.balanceCorrectionReason,
        collector: userId || '',
      };

      await updateCollectionReport(reportId, updateData);
      toast.success('Report updated successfully!', { position: 'top-left' });

      // Clear unsaved edits flag and close modal
      setHasUnsavedEdits(false);
      setHasChanges(true);

      // Refresh parent and close modal
      if (onRefresh) {
        onRefresh();
      }
      onClose();
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error('Failed to update report. Please try again.', {
        position: 'top-left',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    userId,
    reportData,
    financials,
    reportId,
    collectedMachineEntries,
    originalCollections,
    onClose,
    onRefresh,
    editingEntryId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    selectedMachineId,
  ]);

  // ============================================================================
  // Effects
  // ============================================================================
  // Update collection time when location changes (only if not already set from report data)
  // Use ref to store locations to avoid dependency on array reference
  useEffect(() => {
    if (show && selectedLocationId && !hasSetCollectionTimeFromReport) {
      const location = locationsRef.current.find(
        l => String(l._id) === selectedLocationId
      );
      if (location?.gameDayOffset !== undefined) {
        const defaultTime = calculateDefaultCollectionTime(
          location.gameDayOffset
        );
        setCurrentCollectionTime(prev => {
          if (prev.getTime() === defaultTime.getTime()) return prev;
          return defaultTime;
        });
      }
    }
  }, [show, selectedLocationId, hasSetCollectionTimeFromReport]);

  // Always fetch fresh machine data when location changes
  useEffect(() => {
    if (show && selectedLocationId) {
      const fetchMachinesForLocation = async () => {
        setIsLoadingMachines(true);
        try {
          const response = await axios.get(
            `/api/machines?locationId=${selectedLocationId}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            setMachinesOfSelectedLocation(response.data.data);
          } else {
            setMachinesOfSelectedLocation([]);
          }
        } catch (error) {
          console.error('Error fetching machines for location:', error);
          setMachinesOfSelectedLocation([]);
        } finally {
          setIsLoadingMachines(false);
        }
      };

      fetchMachinesForLocation();
    } else if (!show) {
      setMachinesOfSelectedLocation([]);
      setIsLoadingMachines(false);
    }
  }, [show, selectedLocationId]);

  // Check if this is the first collection for the selected machine
  useEffect(() => {
    if (show && selectedMachineId) {
      axios
        .get(
          `/api/collections/check-first-collection?machineId=${selectedMachineId}`
        )
        .then(response => {
          setIsFirstCollection(prev => {
            if (prev === response.data.isFirstCollection) return prev;
            return response.data.isFirstCollection;
          });
        })
        .catch(error => {
          console.error('Error checking first collection:', error);
          setIsFirstCollection(false);
        });
    } else if (!show) {
      setIsFirstCollection(false);
    }
  }, [show, selectedMachineId]);

  // Track previous calculation inputs to prevent unnecessary recalculations
  const prevCalculationRef = useRef<{
    entriesHash: string;
    taxes: string;
    variance: string;
    advance: string;
    collectionBalance: number;
    profitShare: number;
  } | null>(null);

  // Auto-calculate amount to collect when relevant data changes
  useEffect(() => {
    if (!show) {
      prevCalculationRef.current = null;
      return;
    }

    // Create a hash of entry IDs and key values to detect actual changes
    const entriesHash = collectedMachineEntries
      .map(
        e =>
          `${e._id}:${e.metersIn}:${e.metersOut}:${e.prevIn}:${e.prevOut}:${e.ramClear ? '1' : '0'}`
      )
      .join('|');

    const currentInputs = {
      entriesHash,
      taxes: financials.taxes,
      variance: financials.variance,
      advance: financials.advance,
      collectionBalance: locationCollectionBalance,
      profitShare: locationProfitShare,
    };

    // Check if inputs have actually changed
    if (prevCalculationRef.current) {
      const prev = prevCalculationRef.current;
      if (
        prev.entriesHash === currentInputs.entriesHash &&
        prev.taxes === currentInputs.taxes &&
        prev.variance === currentInputs.variance &&
        prev.advance === currentInputs.advance &&
        prev.collectionBalance === currentInputs.collectionBalance &&
        prev.profitShare === currentInputs.profitShare
      ) {
        return; // No changes, skip calculation
      }
    }

    // Update ref before calculation
    prevCalculationRef.current = currentInputs;

    if (!collectedMachineEntries.length) {
      setFinancials(prev => {
        if (prev.amountToCollect === '0') return prev;
        return { ...prev, amountToCollect: '0' };
      });
      return;
    }

    // Calculate total movement data from all machine entries using proper movement calculation
    const totalMovementData = collectedMachineEntries.map(entry => {
      const movement = calculateMachineMovement(
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

    // Sum up all movement data
    const reportTotalData = totalMovementData.reduce(
      (prev, current) => ({
        drop: prev.drop + current.drop,
        cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
        gross: prev.gross + current.gross,
      }),
      { drop: 0, cancelledCredits: 0, gross: 0 }
    );

    // Get financial values
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;

    // Use the location's previous balance, not the calculated one
    const locationPreviousBalance = locationCollectionBalance;

    // Get profit share from selected location (default to 50% if not available)
    const profitShare = locationProfitShare;

    // Calculate partner profit: Math.floor((gross - variance - advance) * profitShare / 100) - taxes
    const partnerProfit =
      Math.floor(
        ((reportTotalData.gross - variance - advance) * profitShare) / 100
      ) - taxes;

    // Calculate amount to collect: gross - variance - advance - partnerProfit + locationPreviousBalance
    const amountToCollect =
      reportTotalData.gross -
      variance -
      advance -
      partnerProfit +
      locationPreviousBalance;

    const newAmount = amountToCollect.toFixed(2);
    setFinancials(prev => {
      if (prev.amountToCollect === newAmount) return prev;
      return {
        ...prev,
        amountToCollect: newAmount,
      };
    });
  }, [
    show,
    collectedMachineEntries,
    financials.taxes,
    financials.variance,
    financials.advance,
    locationCollectionBalance,
    locationProfitShare,
  ]);

  // Update location name when location changes
  // Use ref to store locations to avoid dependency on array reference
  useEffect(() => {
    if (show && selectedLocationId) {
      const location = locationsRef.current.find(
        l => String(l._id) === selectedLocationId
      );
      if (location) {
        setSelectedLocationName(prev => {
          if (prev === location.name) return prev;
          return location.name;
        });
      }
    } else if (!show) {
      setSelectedLocationName(prev => {
        if (prev === '') return prev;
        return '';
      });
    }
  }, [show, selectedLocationId]);

  // Load report data
  useEffect(() => {
    if (show && reportId) {
      fetchCollectionReportById(reportId)
        .then((data) => {
          const reportData = data as CollectionReportData;
          setReportData(reportData);

          // CRITICAL: If report has isEditing: true, there are unsaved changes
          if (reportData.isEditing) {
            setHasUnsavedEdits(true);
          }

          // Set the collection time to the report's timestamp
          if (reportData.collectionDate && reportData.collectionDate !== '-') {
            setCurrentCollectionTime(new Date(reportData.collectionDate));
            setHasSetCollectionTimeFromReport(true);
          }

          setFinancials({
            taxes: reportData.locationMetrics?.taxes?.toString() || '',
            advance: reportData.locationMetrics?.advance?.toString() || '',
            variance: reportData.locationMetrics?.variance?.toString() || '',
            varianceReason: reportData.locationMetrics?.varianceReason || '',
            amountToCollect:
              reportData.locationMetrics?.amountToCollect?.toString() || '',
            collectedAmount:
              reportData.locationMetrics?.collectedAmount?.toString() || '',
            balanceCorrection:
              reportData.locationMetrics?.balanceCorrection?.toString() || '',
            balanceCorrectionReason:
              reportData.locationMetrics?.correctionReason || '',
            previousBalance:
              reportData.locationMetrics?.previousBalanceOwed?.toString() || '',
            reasonForShortagePayment:
              reportData.locationMetrics?.reasonForShortage || '',
          });
        })
        .catch(error => {
          console.error('Error loading report:', error);
          toast.error('Failed to load report data', { position: 'top-left' });
        });
    }
  }, [show, reportId]);

  // Load collections with fresh data fetching
  // Track if collections have been loaded to prevent re-loading
  const collectionsLoadedRef = useRef(false);

  useEffect(() => {
    if (show && reportId && !collectionsLoadedRef.current) {
      collectionsLoadedRef.current = true;
      setIsLoadingCollections(true);
      fetchCollectionsByReportId(reportId)
        .then(collections => {
          setCollectedMachineEntries(collections);
          // CRITICAL: Store original collections for dirty tracking
          setOriginalCollections(JSON.parse(JSON.stringify(collections)));
          if (collections.length > 0) {
            const firstMachine = collections[0];
            if (firstMachine.location) {
              const matchingLocation = locationsRef.current.find(
                loc => loc.name === firstMachine.location
              );
              if (matchingLocation) {
                const newLocationId = String(matchingLocation._id);
                // Only update if different to prevent unnecessary re-renders
                setSelectedLocationId(prev =>
                  prev === newLocationId ? prev : newLocationId
                );
                setSelectedMachineId('');
              }
            }
          }
        })
        .catch(error => {
          console.error('Error fetching collections:', error);
          setCollectedMachineEntries([]);
          setOriginalCollections([]);
        })
        .finally(() => setIsLoadingCollections(false));
    } else if (!show) {
      // Reset the flag when modal closes (state reset handled by dedicated reset effect)
      collectionsLoadedRef.current = false;
    }
  }, [show, reportId]);

  // Always fetch fresh machine data when modal opens to ensure latest meter values
  // Removed this effect as it was causing infinite loops
  // The onRefresh callback is not stable and causes re-renders
  // Data fetching is already handled by other effects when show/reportId changes
  // useEffect(() => {
  //   if (show && locations.length > 0) {
  //     if (onRefresh) {
  //       onRefresh();
  //     }
  //   }
  // }, [show, onRefresh, locations.length]);

  // Detect dirty state by comparing current vs original collections
  useEffect(() => {
    if (
      originalCollections.length === 0 ||
      collectedMachineEntries.length === 0
    ) {
      setHasUnsavedEdits(false);
      return;
    }

    let hasChanges = false;
    for (const current of collectedMachineEntries) {
      const original = originalCollections.find(o => o._id === current._id);
      if (original) {
        if (
          current.metersIn !== original.metersIn ||
          current.metersOut !== original.metersOut
        ) {
          hasChanges = true;
          break;
        }
      }
    }

    setHasUnsavedEdits(hasChanges);
  }, [collectedMachineEntries, originalCollections]);

  // Add beforeunload warning when there are unsaved changes
  useEffect(() => {
    if (!show || !hasUnsavedEdits) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [show, hasUnsavedEdits]);

  // Reset form when modal closes
  // This effect handles cleanup when modal closes
  // The collections loading effect also resets some state, but this ensures everything is reset
  useEffect(() => {
    if (!show) {
      // Reset all state
      setReportData(null);
      setSelectedLocationId('');
      setSelectedLocationName('');
      setSelectedMachineId('');
      setCollectedMachineEntries([]);
      setOriginalCollections([]);
      setHasChanges(false);
      setCurrentCollectionTime(new Date());
      setCurrentMetersIn('');
      setCurrentMetersOut('');
      setCurrentMachineNotes('');
      setHasSetCollectionTimeFromReport(false);
      setCurrentRamClear(false);
      setEditingEntryId(null);
      setFinancials({
        taxes: '',
        advance: '',
        variance: '',
        varianceReason: '',
        amountToCollect: '',
        collectedAmount: '',
        balanceCorrection: '0',
        balanceCorrectionReason: '',
        previousBalance: '0',
        reasonForShortagePayment: '',
      });
      setBaseBalanceCorrection('');
      // Reset collections loaded flag to allow reloading when modal opens again
      collectionsLoadedRef.current = false;
    }
  }, [show]);

  // Fetch previous meters when machine is selected (for new entries)
  useEffect(() => {
    if (show && machineForDataEntry && !editingEntryId) {
      // Check if this machine is already in the collected entries
      const isAlreadyCollected = collectedMachineEntries.some(
        entry => entry.machineId === String(machineForDataEntry._id)
      );

      if (isAlreadyCollected) {
        console.warn(
          '🔍 Machine already collected - skipping historical query (will use stored prevIn/prevOut when editing)'
        );
        return;
      }

      console.warn(
        '🔍 Setting prevIn/prevOut for new entry being added to historical report:',
        {
          machineId: machineForDataEntry._id,
          reportTimestamp: currentCollectionTime,
          reportTimestampISO: currentCollectionTime.toISOString(),
        }
      );

      // For historical reports, query for the actual previous collection at that time
      const fetchHistoricalPrevMeters = async () => {
        try {
          const { getPreviousCollectionMetersAtTime } = await import(
            '@/lib/helpers/historicalCollectionData'
          );

          const previousMeters = await getPreviousCollectionMetersAtTime(
            String(machineForDataEntry._id),
            currentCollectionTime
          );

          console.warn('🔍 Historical query result:', {
            previousMeters,
            machineId: machineForDataEntry._id,
            timestamp: currentCollectionTime.toISOString(),
          });

          if (previousMeters !== null) {
            console.warn('🔍 Using historical prevIn/prevOut:', previousMeters);
            setPrevIn(prev =>
              prev === previousMeters.prevIn ? prev : previousMeters.prevIn
            );
            setPrevOut(prev =>
              prev === previousMeters.prevOut ? prev : previousMeters.prevOut
            );
          } else {
            // Query failed - use 0 as safe fallback
            console.warn('🔍 Historical query returned null, using 0');
            setPrevIn(prev => (prev === 0 ? prev : 0));
            setPrevOut(prev => (prev === 0 ? prev : 0));
          }
        } catch (error) {
          console.error('Error fetching historical prev meters:', error);
          // Use 0 as safe fallback on error
          console.warn(
            '🔍 Error in historical query, using 0 as safe fallback'
          );
          setPrevIn(prev => (prev === 0 ? prev : 0));
          setPrevOut(prev => (prev === 0 ? prev : 0));
        }
      };

      fetchHistoricalPrevMeters();
    }
  }, [
    show,
    selectedMachineId,
    editingEntryId,
    currentCollectionTime,
    collectedMachineEntries,
    machineForDataEntry,
  ]);

  // Debounced machine selection validation
  useEffect(() => {
    if (debouncedMachineForDataEntry || debouncedEditingEntryId) {
      validateMeterInputs();
    }
  }, [
    debouncedMachineForDataEntry,
    debouncedEditingEntryId,
    validateMeterInputs,
  ]);

  // Debounced input field validation
  useEffect(() => {
    if (
      debouncedCurrentMetersIn ||
      debouncedCurrentMetersOut ||
      debouncedCurrentMachineNotes
    ) {
      debouncedValidateMeterInputs();
    }
  }, [
    debouncedCurrentMetersIn,
    debouncedCurrentMetersOut,
    debouncedCurrentMachineNotes,
    debouncedValidateMeterInputs,
  ]);

  return {
    // State
    reportData,
    setReportData,
    selectedLocationId,
    setSelectedLocationId,
    selectedLocationName,
    setSelectedLocationName,
    selectedMachineId,
    setSelectedMachineId,
    collectedMachineEntries,
    setCollectedMachineEntries,
    originalCollections,
    setOriginalCollections,
    collectedMachinesSearchTerm,
    setCollectedMachinesSearchTerm,
    machineSearchTerm,
    setMachineSearchTerm,
    updateAllDate,
    setUpdateAllDate,
    isLoadingCollections,
    setIsLoadingCollections,
    isProcessing,
    setIsProcessing,
    hasChanges,
    setHasChanges,
    hasUnsavedEdits,
    setHasUnsavedEdits,
    showUnsavedChangesWarning,
    setShowUnsavedChangesWarning,
    editingEntryId,
    setEditingEntryId,
    showUpdateConfirmation,
    setShowUpdateConfirmation,
    showViewMachineConfirmation,
    setShowViewMachineConfirmation,
    viewMode,
    setViewMode,
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
    setShowAdvancedSas,
    customSasStartTime,
    setCustomSasStartTime,
    prevIn,
    setPrevIn,
    prevOut,
    setPrevOut,
    isFirstCollection,
    setIsFirstCollection,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    entryToDelete,
    setEntryToDelete,
    showUpdateReportConfirmation,
    setShowUpdateReportConfirmation,
    financials,
    setFinancials,
    baseBalanceCorrection,
    setBaseBalanceCorrection,
    machinesOfSelectedLocation,
    setMachinesOfSelectedLocation,
    isLoadingMachines,
    setIsLoadingMachines,
    hasSetCollectionTimeFromReport,
    setHasSetCollectionTimeFromReport,

    // Computed
    selectedLocation,
    machineForDataEntry,
    filteredMachines,
    isUpdateReportEnabled,
    sortMachinesAlphabetically,

    // Debounced values
    debouncedMachineForDataEntry,
    debouncedEditingEntryId,
    debouncedCurrentMetersIn,
    debouncedCurrentMetersOut,
    debouncedCurrentMachineNotes,
    debouncedCurrentRamClearMetersIn,
    debouncedCurrentRamClearMetersOut,

    // Handlers
    handleClose,
    handleDisabledFieldClick,
    handleEditEntry,
    handleCancelEdit,
    handleAddOrUpdateEntry,
    confirmUpdateEntry,
    handleDeleteEntry,
    confirmDeleteEntry,
    handleUpdateReport,

    // User
    user,
    userId,
  };
}

