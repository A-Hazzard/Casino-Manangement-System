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
 *
 * Architecture:
 * - Uses Zustand store for shared state (form data, collected machines, financials)
 * - Local state for UI-specific concerns
 * - Complex state synchronization with debouncing
 * - Dirty tracking for unsaved changes
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { updateCollectionReport } from '@/lib/helpers/collectionReport';
import {
  deleteMachineCollection,
  fetchCollectionsByReportId,
  sortMachinesAlphabetically,
} from '@/lib/helpers/collectionReport/editCollectionModalHelpers';
import { fetchCollectionReportById } from '@/lib/helpers/collectionReport/fetching';
import { validateMachineEntry } from '@/lib/helpers/collectionReport';
import { logActivity } from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { updateCollection } from '@/lib/helpers/collections';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
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
import type { VariationsCheckResponse } from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';
import {
  calculateCabinetMovement,
  calculateMovement,
} from '@/lib/utils/movement';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Type Definitions
// ============================================================================

type UseEditCollectionModalProps = {
  show: boolean;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh?: () => void;
  onClose: () => void;
};

// ============================================================================
// Main Hook
// ============================================================================

export function useEditCollectionModal({
  show,
  reportId,
  locations: propLocations,
  onRefresh,
  onClose,
}: UseEditCollectionModalProps) {
  // ==========================================================================
  // User State
  // ==========================================================================
  const user = useUserStore(state => state.user);
  const userId = user?._id;

  // ==========================================================================
  // Store State - Collection Modal Store
  // ==========================================================================
  const {
    collectedMachines: collectedMachineEntries,
    setCollectedMachines: setCollectedMachineEntries,
    financials,
    setFinancials,
    formData: storeFormData,
    setFormData: setStoreFormData,
    calculateCarryover: storeCalculateCarryover,
    setSelectedLocation: setStoreSelectedLocation,
  } = useCollectionModalStore();

  const [internalLocations, setInternalLocations] = useState<CollectionReportLocationWithMachines[]>([]);
  
  // Use internal locations if available, fallback to prop
  const locations = internalLocations.length > 0 ? internalLocations : propLocations;

  const {
    selectedLocationId: storeLocationId,
    selectedLocationName: storeLocationName,
    selectedMachineId: storeMachineId,
    setSelectedMachineId: setStoreMachineId,
  } = useCollectionModalStore();

  // ==========================================================================
  // Local State - Report Data
  // ==========================================================================
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );

  // ==========================================================================
  // Local State - Selection & Identity
  // ==========================================================================
  const selectedLocationId = storeLocationId || '';
  const selectedLocationName = storeLocationName || '';
  const selectedMachineId = storeMachineId || '';

  // ==========================================================================
  // Local State - Collections Management
  // ==========================================================================
  const [originalCollections, setOriginalCollections] = useState<
    CollectionDocument[]
  >([]);
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [hasSetCollectionTimeFromReport, setHasSetCollectionTimeFromReport] =
    useState(false);

  // ==========================================================================
  // Local State - Search & Filter
  // ==========================================================================
  const [collectedMachinesSearchTerm, setCollectedMachinesSearchTerm] =
    useState('');
  const [machineSearchTerm, setMachineSearchTerm] = useState('');

  // ==========================================================================
  // Local State - Processing & Loading
  // ==========================================================================
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);
  const [isFirstCollection, setIsFirstCollection] = useState(false);

  // ==========================================================================
  // Local State - Editing Mode
  // ==========================================================================
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showViewMachineConfirmation, setShowViewMachineConfirmation] =
    useState(false);
  const [viewMode, setViewMode] = useState<'machines' | 'collected'>(
    'machines'
  );

  // ==========================================================================
  // Local State - Confirmation Dialogs
  // ==========================================================================
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showUpdateReportConfirmation, setShowUpdateReportConfirmation] =
    useState(false);
  const [showMachineRolloverWarning, setShowMachineRolloverWarning] =
    useState(false);
  const [pendingMachineSubmission, setPendingMachineSubmission] = useState<
    (() => void) | null
  >(null);

  // ==========================================================================
  // Local State - Bulk SAS Update
  // ==========================================================================
  const [updateAllSasStartDate, setUpdateAllSasStartDate] = useState<
    Date | undefined
  >(undefined);
  const [updateAllSasEndDate, setUpdateAllSasEndDate] = useState<
    Date | undefined
  >(undefined);
  const [baseBalanceCorrection, setBaseBalanceCorrection] =
    useState<string>('');

  // ==========================================================================
  // Form Data Bindings - From Store
  // ==========================================================================
  const currentCollectionTime = storeFormData.collectionTime;
  const currentMetersIn = storeFormData.metersIn;
  const currentMetersOut = storeFormData.metersOut;
  const currentRamClearMetersIn = storeFormData.ramClearMetersIn;
  const currentRamClearMetersOut = storeFormData.ramClearMetersOut;
  const currentMachineNotes = storeFormData.notes;
  const currentRamClear = storeFormData.ramClear;
  const showAdvancedSas = storeFormData.showAdvancedSas;
  const sasStartTime = storeFormData.sasStartTime;
  const sasEndTime = storeFormData.sasEndTime;

  // ==========================================================================
  // Form Data Setters
  // ==========================================================================
  const setCurrentMetersIn = useCallback(
    (val: string) => setStoreFormData({ metersIn: val }),
    [setStoreFormData]
  );
  const setCurrentMetersOut = useCallback(
    (val: string) => setStoreFormData({ metersOut: val }),
    [setStoreFormData]
  );
  const setCurrentRamClearMetersIn = useCallback(
    (val: string) => setStoreFormData({ ramClearMetersIn: val }),
    [setStoreFormData]
  );
  const setCurrentRamClearMetersOut = useCallback(
    (val: string) => setStoreFormData({ ramClearMetersOut: val }),
    [setStoreFormData]
  );
  const setCurrentMachineNotes = useCallback(
    (val: string) => setStoreFormData({ notes: val }),
    [setStoreFormData]
  );
  const setCurrentRamClear = useCallback(
    (val: boolean) => setStoreFormData({ ramClear: val }),
    [setStoreFormData]
  );
  const setCurrentCollectionTime = useCallback(
    (val: Date) => setStoreFormData({ collectionTime: val }),
    [setStoreFormData]
  );
  const setSelectedMachineId = (id: string) =>
    setStoreMachineId(id || undefined);

  /**
   * Toggle advanced SAS mode and set default times if needed
   */
  const setShowAdvancedSas = useCallback(
    (val: boolean | ((p: boolean) => boolean)) => {
      const newVal = typeof val === 'function' ? val(showAdvancedSas) : val;
      const updates: Partial<typeof storeFormData> = {
        showAdvancedSas: newVal,
      };

      if (newVal) {
        const location = locations.find(
          location => String(location._id) === selectedLocationId
        );
        const machineEntry = collectedMachineEntries.find(
          entry => String(entry.machineId) === selectedMachineId
        );
        const machineInfo = machinesOfSelectedLocation.find(
          m => String(m._id) === selectedMachineId
        );

        if (!sasStartTime) {
          let defaultStart = new Date();
          if (machineEntry?.timestamp) {
            defaultStart = new Date(machineEntry.timestamp);
          } else if (machineInfo?.collectionTime) {
            defaultStart = new Date(machineInfo.collectionTime);
          } else if (location?.previousCollectionTime) {
            defaultStart = new Date(location.previousCollectionTime);
          }
          updates.sasStartTime = defaultStart;
        }

        if (!sasEndTime) {
          const gameDayOffset = location?.gameDayOffset ?? 8;
          const defaultEnd = new Date(currentCollectionTime || new Date());
          if (defaultEnd.getHours() < gameDayOffset) {
            defaultEnd.setDate(defaultEnd.getDate() - 1);
          }
          defaultEnd.setHours(gameDayOffset - 1, 59, 59, 0);
          updates.sasEndTime = defaultEnd;
        }
      }

      setStoreFormData(updates);
    },
    [
      showAdvancedSas,
      selectedLocationId,
      locations,
      sasStartTime,
      sasEndTime,
      currentCollectionTime,
      setStoreFormData,
      selectedMachineId,
      collectedMachineEntries,
    ]
  );

  const setSasStartTime = useCallback(
    (val: Date | null) => setStoreFormData({ sasStartTime: val }),
    [setStoreFormData]
  );
  const setSasEndTime = useCallback(
    (val: Date | null) => setStoreFormData({ sasEndTime: val }),
    [setStoreFormData]
  );

  const prevIn =
    storeFormData.prevIn !== '' ? Number(storeFormData.prevIn) : null;
  const prevOut =
    storeFormData.prevOut !== '' ? Number(storeFormData.prevOut) : null;
  const setPrevIn = useCallback(
    (val: string | number | null) =>
      setStoreFormData({ prevIn: val?.toString() || '' }),
    [setStoreFormData]
  );
  const setPrevOut = useCallback(
    (val: string | number | null) =>
      setStoreFormData({ prevOut: val?.toString() || '' }),
    [setStoreFormData]
  );

  // ==========================================================================
  // Refs
  // ==========================================================================
  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // ==========================================================================
  // Fetch rich metadata when modal opens
  useEffect(() => {
    if (show && userId) {
      setIsLoadingLocations(true);
      import('@/lib/helpers/collectionReport/fetching').then(({ getLocationsWithMachines }) => {
        getLocationsWithMachines(undefined, false)
          .then(locs => {
            setInternalLocations(locs);
          })
          .catch(err => {
            console.error('Error fetching collection metadata:', err);
          })
          .finally(() => setIsLoadingLocations(false));
      });
    } else {
      setIsLoadingLocations(false);
    }
  }, [show, userId]);


  // ==========================================================================
  // Computed Values
  // ==========================================================================

  /**
   * Selected location object from locations array
   */
  const selectedLocation = useMemo(
    () => locations.find(location => String(location._id) === selectedLocationId),
    [locations, selectedLocationId]
  );

  /**
   * Location's collection balance for calculations
   */
  const locationCollectionBalance = useMemo(
    () => selectedLocation?.collectionBalance ?? 0,
    [selectedLocation?.collectionBalance]
  );

  /**
   * Location's profit share percentage
   */
  const locationProfitShare = useMemo(
    () => selectedLocation?.profitShare ?? 50,
    [selectedLocation?.profitShare]
  );

  /**
   * Machine being edited or added
   */
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
          custom: { name: collectedEntry.machineCustomName },
          game: collectedEntry.game,
          collectionMeters: {
            metersIn: collectedEntry.prevIn || 0,
            metersOut: collectedEntry.prevOut || 0,
          },
        } as CollectionReportMachineSummary;
      }
    }

    return found;
  }, [machinesOfSelectedLocation, selectedMachineId, collectedMachineEntries]);

  /**
   * Filter machines based on search term
   */
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

    return sortMachinesAlphabetically(result);
  }, [machinesOfSelectedLocation, machineSearchTerm]);

  /**
   * Whether update report button should be enabled
   */
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

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Real-time validation for meter inputs
   */
  const validateMeterInputs = useCallback(() => {
    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      return;
    }

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

  // ==========================================================================
  // Debounced Values
  // ==========================================================================
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
  const debouncedValidateMeterInputs = useDebouncedCallback(
    validateMeterInputs,
    3000
  );

  // ==========================================================================
  // Form Data Setters - Additional
  // ==========================================================================
  const setSelectedLocationId = (id: string) =>
    setStoreSelectedLocation(
      id,
      locations.find(location => String(location._id) === id)?.name || ''
    );
  const setSelectedLocationName = (name: string) =>
    setStoreSelectedLocation(selectedLocationId, name);

  // ==========================================================================
  // Refs
  // ==========================================================================
  const prevCalculationRef = useRef<{
    entriesHash: string;
    taxes: string;
    variance: string;
    advance: string;
    collectionBalance: number;
    profitShare: number;
  } | null>(null);

  // ==========================================================================
  // Event Handlers - Modal Close
  // ============================================================================

  /**
   * Close modal with unsaved changes warning check
   */
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

  // ==========================================================================
  // Event Handlers - Form Validation
  // ============================================================================

  /**
   * Show warning when clicking disabled field
   */
  const handleDisabledFieldClick = useCallback(() => {
    if (!machineForDataEntry) {
      toast.warning('Please select a machine first', {
        duration: 3000,
        position: 'top-left',
      });
    }
  }, [machineForDataEntry]);

  // ==========================================================================
  // Event Handlers - Entry Editing
  // ============================================================================

  /**
   * Start editing an existing entry
   */
  const handleEditEntry = useCallback(
    async (entryId: string) => {
      if (isProcessing) return;

      const entryToEdit = collectedMachineEntries.find(entry => entry._id === entryId);
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

        // Ensure advanced is NOT selected by default when editing.
        // Must happen BEFORE setCurrentCollectionTime so the store auto-sync
        // correctly sets sasEndTime = collectionTime in simple mode.
        setShowAdvancedSas(false);

        // Set the collection time — store auto-sync will set sasEndTime = this value
        if (entryToEdit.sasMeters?.sasEndTime) {
          setCurrentCollectionTime(new Date(entryToEdit.sasMeters.sasEndTime));
          setSasEndTime(new Date(entryToEdit.sasMeters.sasEndTime));
        } else if (entryToEdit.timestamp) {
          setCurrentCollectionTime(new Date(entryToEdit.timestamp));
        }

        if (entryToEdit.sasMeters?.sasStartTime) {
          setSasStartTime(new Date(entryToEdit.sasMeters.sasStartTime));
        } else {
          setSasStartTime(null);
        }

        // Set previous values for display.
        // CRITICAL: Use ?? (nullish coalescing) not || so that a legitimately-stored
        // prevIn=0 is respected. The || operator treated 0 as "missing" and replaced it
        // with stale machine collectionMeters data, causing visible reversion after edits.
        //
        // Only fall back to machine meter data when prevIn/prevOut are strictly
        // null/undefined — meaning the field was never stored for this collection at all.
        const storedPrevIn = entryToEdit.prevIn ?? null;
        const storedPrevOut = entryToEdit.prevOut ?? null;

        let effectivePrevIn = storedPrevIn !== null ? storedPrevIn : 0;
        let effectivePrevOut = storedPrevOut !== null ? storedPrevOut : 0;

        // Only apply machine meter fallbacks when the collection genuinely has no
        // prevIn/prevOut stored (null/undefined coming from the DB).
        if (storedPrevIn === null || storedPrevOut === null) {
          const machine = machinesOfSelectedLocation.find(
            m => String(m._id) === entryToEdit.machineId
          );
          if (machine) {
            const sasIn = machine.sasMeters?.drop ?? null;
            const sasOut = machine.sasMeters?.totalCancelledCredits ?? null;
            const legacyIn = machine.collectionMeters?.metersIn ?? null;
            const legacyOut = machine.collectionMeters?.metersOut ?? null;
            if (storedPrevIn === null) {
              effectivePrevIn =
                sasIn !== null && sasIn > 0 ? sasIn : (legacyIn ?? 0);
            }
            if (storedPrevOut === null) {
              effectivePrevOut =
                sasOut !== null && sasOut > 0 ? sasOut : (legacyOut ?? 0);
            }
          }
        }

        setPrevIn(effectivePrevIn);
        setPrevOut(effectivePrevOut);

        toast.info(
          "Edit mode activated. Make your changes and click 'Update Entry in List'.",
          { position: 'top-left' }
        );
      }
    },
    [
      isProcessing,
      collectedMachineEntries,
      machinesOfSelectedLocation,
      setEditingEntryId,
      setSelectedMachineId,
      setCurrentMetersIn,
      setCurrentMetersOut,
      setCurrentMachineNotes,
      setCurrentRamClear,
      setCurrentRamClearMetersIn,
      setCurrentRamClearMetersOut,
      setCurrentCollectionTime,
      setShowAdvancedSas,
      setPrevIn,
      setPrevOut,
    ]
  );

  // ==========================================================================
  // Event Handlers - Entry Cancellation
  // ============================================================================

  /**
   * Cancel editing and reset form
   */
  const handleCancelEdit = useCallback(() => {
    // Reset editing state
    setEditingEntryId(null);
    // CRITICAL: Also clear the selected machine — without this, selectedMachineId remains set
    // after cancel, causing handleUpdateReport to incorrectly block with "unsaved machine data".
    setSelectedMachineId('');
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

    // Reset SAS overrides
    setSasStartTime(showAdvancedSas ? sasStartTime : null);
    setSasEndTime(showAdvancedSas ? sasEndTime : null);
    setShowAdvancedSas(showAdvancedSas);

    toast.info('Edit cancelled', { position: 'top-left' });
  }, [
    setSasStartTime,
    setSasEndTime,
    setShowAdvancedSas,
    setEditingEntryId,
    setSelectedMachineId,
    setCurrentMetersIn,
    setCurrentMetersOut,
    setCurrentMachineNotes,
    setCurrentRamClear,
    setCurrentRamClearMetersIn,
    setCurrentRamClearMetersOut,
    setPrevIn,
    setPrevOut,
    showAdvancedSas,
    sasStartTime,
    sasEndTime,
  ]);

  // ==========================================================================
  // Event Handlers - Rollover Warning
  // ============================================================================

  /**
   * Confirm machine rollover warning
   */
  const handleConfirmMachineRollover = useCallback(() => {
    if (pendingMachineSubmission) {
      pendingMachineSubmission();
      setPendingMachineSubmission(null);
    }
    setShowMachineRolloverWarning(false);
  }, [pendingMachineSubmission]);

  /**
   * Cancel machine rollover warning
   */
  const handleCancelMachineRollover = useCallback(() => {
    setPendingMachineSubmission(null);
    setShowMachineRolloverWarning(false);
    setIsProcessing(false);
  }, []);

  // ==========================================================================
  // Event Handlers - Add/Update Entry
  // ============================================================================

  /**
   * Execute add or update entry operation
   */
  const executeAddOrUpdateEntry = useCallback(async () => {
    setIsProcessing(true);

    // Capture form values synchronously BEFORE any awaits so they are never stale
    const capturedEditingEntryId = editingEntryId;
    const capturedMetersIn = Number(currentMetersIn);
    const capturedMetersOut = Number(currentMetersOut);
    const capturedPrevIn = prevIn !== null ? prevIn : 0;
    const capturedPrevOut = prevOut !== null ? prevOut : 0;
    const capturedNotes = currentMachineNotes;
    const capturedRamClear = currentRamClear;
    const capturedRamClearMetersIn = currentRamClearMetersIn
      ? Number(currentRamClearMetersIn)
      : undefined;
    const capturedRamClearMetersOut = currentRamClearMetersOut
      ? Number(currentRamClearMetersOut)
      : undefined;
    const capturedCollectionTime = currentCollectionTime;
    const capturedSasStartTime = sasStartTime;
    const capturedSasEndTime = sasEndTime;
    const capturedShowAdvancedSas = showAdvancedSas;
    // Capture the current entries array so the post-await map doesn't use a stale closure.
    // NOTE: Zustand setters only accept values (not functional updaters like React's useState),
    // so we snapshot the array here and pass the mapped result directly.
    const capturedEntries = collectedMachineEntries;

    try {
      if (capturedEditingEntryId) {
        // Find the existing collection to get its locationReportId
        const existingEntry = collectedMachineEntries.find(
          entry => entry._id === capturedEditingEntryId
        );

        // Update existing collection
        const result = await updateCollection(capturedEditingEntryId, {
          metersIn: capturedMetersIn,
          metersOut: capturedMetersOut,
          notes: capturedNotes,
          ramClear: capturedRamClear,
          ramClearMetersIn: capturedRamClearMetersIn,
          ramClearMetersOut: capturedRamClearMetersOut,
          timestamp: capturedCollectionTime,
          collectionTime: capturedCollectionTime,
          prevIn: capturedPrevIn,
          prevOut: capturedPrevOut,
          // CRITICAL: Preserve the existing locationReportId for history update
          locationReportId: existingEntry?.locationReportId || reportId,
          // sasEndTime always saved: advanced uses user-set value, simple uses collectionTime
          sasEndTime:
            capturedShowAdvancedSas && capturedSasEndTime
              ? capturedSasEndTime
              : capturedCollectionTime,
          ...(capturedShowAdvancedSas && capturedSasStartTime
            ? { sasStartTime: capturedSasStartTime }
            : {}),
          ...(capturedShowAdvancedSas && capturedSasEndTime
            ? {
                timestamp: capturedSasEndTime,
                collectionTime: capturedSasEndTime,
              }
            : {}),
        });

        // CRITICAL: Build the updated entries array from the pre-await snapshot (capturedEntries)
        // rather than the closure variable, so we never overwrite concurrent state changes.
        // Always trust capturedPrevIn/capturedPrevOut over the API response — these are exactly
        // what the user typed, whereas the API cascade may have re-adjusted them.
        setCollectedMachineEntries(
          capturedEntries.map(entry => {
            if (entry._id !== capturedEditingEntryId) return entry;
            return {
              ...entry,
              metersIn: result.metersIn ?? capturedMetersIn,
              metersOut: result.metersOut ?? capturedMetersOut,
              // Always trust what the user typed for prevIn/prevOut
              prevIn: capturedPrevIn,
              prevOut: capturedPrevOut,
              notes: result.notes ?? capturedNotes,
              ramClear: result.ramClear ?? capturedRamClear,
              ramClearMetersIn:
                result.ramClearMetersIn ?? capturedRamClearMetersIn,
              ramClearMetersOut:
                result.ramClearMetersOut ?? capturedRamClearMetersOut,
              timestamp: result.timestamp ?? capturedCollectionTime,
              collectionTime: result.collectionTime ?? capturedCollectionTime,
              movement: result.movement ?? entry.movement,
              sasMeters: result.sasMeters ?? entry.sasMeters,
              softMetersIn: result.softMetersIn ?? entry.softMetersIn,
              softMetersOut: result.softMetersOut ?? entry.softMetersOut,
              updatedAt: result.updatedAt ?? entry.updatedAt,
              // Always keep original display/identity fields to prevent "Unknown" regression
              machineName: entry.machineName,
              serialNumber: entry.serialNumber,
              machineCustomName: entry.machineCustomName,
              game: entry.game,
              location: entry.location,
              machineId: entry.machineId,
            };
          })
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

        // Reset SAS overrides after update
        setSasStartTime(showAdvancedSas ? sasStartTime : null);
        setSasEndTime(showAdvancedSas ? sasEndTime : null);
        setShowAdvancedSas(showAdvancedSas);

        toast.success('Machine updated!', { position: 'top-left' });

        // Log the update with before/after field comparison
        const existingForLog = capturedEntries.find(
          entry => entry._id === capturedEditingEntryId
        );
        if (existingForLog && selectedLocationName) {
          const machineName =
            existingForLog.machineCustomName ||
            existingForLog.machineName ||
            existingForLog.serialNumber ||
            capturedEditingEntryId;
          const changes: string[] = [];
          if (existingForLog.metersIn !== capturedMetersIn)
            changes.push(
              `MIn: ${existingForLog.metersIn} → ${capturedMetersIn}`
            );
          if (existingForLog.metersOut !== capturedMetersOut)
            changes.push(
              `MOut: ${existingForLog.metersOut} → ${capturedMetersOut}`
            );
          if (existingForLog.ramClear !== capturedRamClear)
            changes.push(
              `RAM Clear: ${existingForLog.ramClear ? 'Yes' : 'No'} → ${capturedRamClear ? 'Yes' : 'No'}`
            );
          if ((existingForLog.notes || '') !== (capturedNotes || ''))
            changes.push(
              `Notes: "${existingForLog.notes || ''}" → "${capturedNotes || ''}"`
            );
          const detailStr =
            changes.length > 0 ? changes.join(', ') : 'No meter changes';
          await logActivity(
            'update',
            'collection',
            capturedEditingEntryId,
            `${machineName} at ${selectedLocationName}`,
            `Updated machine ${machineName} at ${selectedLocationName} — ${detailStr}`,
            userId,
            user?.username || 'unknown',
            {
              metersIn: existingForLog.metersIn,
              metersOut: existingForLog.metersOut,
              prevIn: existingForLog.prevIn,
              prevOut: existingForLog.prevOut,
              ramClear: existingForLog.ramClear,
              notes: existingForLog.notes,
            },
            {
              metersIn: capturedMetersIn,
              metersOut: capturedMetersOut,
              prevIn: capturedPrevIn,
              prevOut: capturedPrevOut,
              ramClear: capturedRamClear,
              notes: capturedNotes || undefined,
            }
          );
        }
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
            collectionTime: currentCollectionTime, // KEEP IN SYNC
            location: selectedLocationName,
            locationReportId: reportId,
            collector: userId || '',
            // sasEndTime always saved: advanced uses user-set value, simple uses collectionTime
            sasEndTime:
              showAdvancedSas && sasEndTime
                ? sasEndTime
                : currentCollectionTime,
            ...(showAdvancedSas && sasStartTime ? { sasStartTime } : {}),
            ...(showAdvancedSas && sasEndTime
              ? { timestamp: sasEndTime, collectionTime: sasEndTime }
              : {}),
          };

          const response = await axios.post(
            '/api/collection-reports/collections',
            collectionPayload
          );

          // Add to local state with the real ID from database
          const savedEntry = { ...newEntry, _id: response.data.data._id };
          setCollectedMachineEntries([...collectedMachineEntries, savedEntry]);
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

          // Reset SAS overrides after add
          setSasStartTime(showAdvancedSas ? sasStartTime : null);
          setSasEndTime(showAdvancedSas ? sasEndTime : null);
          setShowAdvancedSas(showAdvancedSas);

          toast.success(
            'Machine added to collection list and saved to database!',
            { position: 'top-left' }
          );

          // Log the machine addition with meter details
          if (selectedLocationName) {
            const machineName =
              machineForDataEntry?.name ||
              machineForDataEntry?.serialNumber ||
              selectedMachineId;
            const detailParts = [
              `MIn: ${capturedMetersIn}`,
              `MOut: ${capturedMetersOut}`,
              `PrevIn: ${capturedPrevIn}`,
              `PrevOut: ${capturedPrevOut}`,
              `RAM Clear: ${capturedRamClear ? 'Yes' : 'No'}`,
            ];
            if (capturedRamClear)
              detailParts.push(
                `RC MIn: ${capturedRamClearMetersIn ?? 0}`,
                `RC MOut: ${capturedRamClearMetersOut ?? 0}`
              );
            if (capturedNotes) detailParts.push(`Notes: ${capturedNotes}`);
            await logActivity(
              'create',
              'collection',
              response.data.data._id,
              `${machineName} at ${storeLocationName}`,
              `Added machine ${machineName} to collection at ${storeLocationName} — ${detailParts.join(', ')}`,
              userId,
              user?.username || 'unknown',
              null,
              {
                metersIn: capturedMetersIn,
                metersOut: capturedMetersOut,
                prevIn: capturedPrevIn,
                prevOut: capturedPrevOut,
                ramClear: capturedRamClear,
                notes: capturedNotes || undefined,
              }
            );
          }
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
    editingEntryId,
    collectedMachineEntries,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    prevIn,
    prevOut,
    reportId,
    showAdvancedSas,
    sasStartTime,
    sasEndTime,
    selectedMachineId,
    machineForDataEntry,
    selectedLocationName,
    userId,
    setCollectedMachineEntries,
    setHasChanges,
    setEditingEntryId,
    setSelectedMachineId,
    setCurrentMetersIn,
    setCurrentMetersOut,
    setCurrentMachineNotes,
    setCurrentRamClear,
    setCurrentRamClearMetersIn,
    setCurrentRamClearMetersOut,
    setPrevIn,
    setPrevOut,
  ]);

  /**
   * Validate and confirm add/update entry
   */
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

    const onConfirm = () => executeAddOrUpdateEntry();

    // Fallback to live machine data when prevIn state hasn't resolved yet
    // (race: after editing an entry, prevIn resets to null until the effect re-fires)
    const sasInFallback = machineForDataEntry?.sasMeters?.drop ?? null;
    const legacyInFallback =
      machineForDataEntry?.collectionMeters?.metersIn ?? null;
    const effectivePrevIn =
      prevIn !== null
        ? prevIn
        : sasInFallback !== null && sasInFallback > 0
          ? sasInFallback
          : legacyInFallback;

    if (effectivePrevIn !== null && Number(currentMetersIn) < effectivePrevIn) {
      setPendingMachineSubmission(() => onConfirm);
      setShowMachineRolloverWarning(true);
      return;
    }

    onConfirm();
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    userId,
    currentRamClear,
    prevIn,
    prevOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    editingEntryId,
    currentCollectionTime,
    executeAddOrUpdateEntry,
  ]);

  /**
   * Confirm entry update after rollover check
   */
  const confirmUpdateEntry = useCallback(() => {
    setShowUpdateConfirmation(false);
    confirmAddOrUpdateEntry();
  }, [confirmAddOrUpdateEntry]);

  /**
   * Handle add or update entry based on editing state
   */
  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // Always go directly to confirmAddOrUpdateEntry — the confirmation dialog
    // was never rendered in the JSX so the old gate silently blocked all updates.
    if (editingEntryId || machineForDataEntry) {
      confirmAddOrUpdateEntry();
    }
  }, [
    isProcessing,
    editingEntryId,
    machineForDataEntry,
    confirmAddOrUpdateEntry,
  ]);

  // ==========================================================================
  // Event Handlers - Entry Deletion
  // ============================================================================

  /**
   * Start delete confirmation for an entry
   */
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

  /**
   * Execute entry deletion
   */
  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete) return;

    setIsProcessing(true);
    try {
      await deleteMachineCollection(entryToDelete);
      toast.success('Machine deleted!', { position: 'top-left' });

      // Remove the deleted entry from local state immediately
      setCollectedMachineEntries(
        collectedMachineEntries.filter(entry => entry._id !== entryToDelete)
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

  // ==========================================================================
  // Event Handlers - Report Operations
  // ============================================================================

  /**
   * Update the collection report with all changes
   */
  const handleUpdateReport = useCallback(
    async (reconciliationData?: VariationsCheckResponse) => {
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
          entry => entry._id === editingEntryId
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
        const enteredMetersOut = currentMetersOut
          ? Number(currentMetersOut)
          : 0;
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

      // Variations check via native alert removed. The custom UI modal (VariationsConfirmationDialog)
      // now handles the confirmation before this function is called.

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
          timestamp: Date;
          ramClear?: boolean;
          ramClearMetersIn?: number;
          ramClearMetersOut?: number;
        }> = [];

        for (const current of collectedMachineEntries) {
          const original = originalCollections.find(originalCollection => originalCollection._id === current._id);
          if (original) {
            // Check if meters or collection time changed
            const metersInChanged = current.metersIn !== original.metersIn;
            const metersOutChanged = current.metersOut !== original.metersOut;
            const prevInChanged = current.prevIn !== original.prevIn;
            const prevOutChanged = current.prevOut !== original.prevOut;

            // Timestamp comparison (ISO mismatch check)
            const timeChanged =
              (current.timestamp &&
                original.timestamp &&
                new Date(current.timestamp).getTime() !==
                  new Date(original.timestamp).getTime()) ||
              (current.collectionTime &&
                original.collectionTime &&
                new Date(current.collectionTime).getTime() !==
                  new Date(original.collectionTime).getTime());

            if (
              metersInChanged ||
              metersOutChanged ||
              prevInChanged ||
              prevOutChanged ||
              timeChanged
            ) {
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
                ramClear: current.ramClear,
                ramClearMetersIn: current.ramClearMetersIn,
                ramClearMetersOut: current.ramClearMetersOut,
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
              timestamp: current.collectionTime
                ? new Date(current.collectionTime)
                : current.timestamp
                  ? new Date(current.timestamp)
                  : new Date(),
              ramClear: current.ramClear,
              ramClearMetersIn: current.ramClearMetersIn,
              ramClearMetersOut: current.ramClearMetersOut,
            });
          }
        }

        // If there are changes (meters or time), call batch update API
        if (changes.length > 0) {
          const batchResponse = await axios.patch(
            `/api/collection-reports/${reportId}/update-history`,
            { changes }
          );

          if (!batchResponse.data.success) {
            toast.error(
              'Failed to update machine histories. Please try again.',
              {
                position: 'top-left',
              }
            );
            return;
          }

          toast.success(
            `Updated ${changes.length} machine histories successfully!`,
            { position: 'top-left' }
          );
        }

        // Recalculate report totals based on currently collected machines
        const totalMovementData = collectedMachineEntries.map(entry => {
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

        // PHASE 2: Update collection report financials and totals
        const updateData: Record<string, unknown> = {
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
          reconciliation: reconciliationData || null,
          collector: userId || '',
          totalDrop: totals.drop,
          totalCancelled: totals.cancelledCredits,
          totalGross: totals.gross,
          totalSasGross: totals.sasGross,
          machinesCollected: collectedMachineEntries.length.toString(),
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
    },
    [
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
    ]
  );

  // ==========================================================================
  // Event Handlers - Bulk Operations
  // ============================================================================

  /**
   * Apply SAS dates to all collected machines
   */
  const handleApplyAllDates = useCallback(async () => {
    if (!updateAllSasStartDate && !updateAllSasEndDate) return;
    if (collectedMachineEntries.length < 2) return;
    try {
      setIsProcessing(true);
      const axios = (await import('axios')).default;
      const patchData: Record<string, string> = {};

      const startTimeISO = updateAllSasStartDate?.toISOString();
      const endTimeISO = updateAllSasEndDate?.toISOString();

      if (startTimeISO) patchData.sasStartTime = startTimeISO;
      if (endTimeISO) patchData.sasEndTime = endTimeISO;

      const results = await Promise.allSettled(
        collectedMachineEntries.map(async entry => {
          if (!entry._id) return;
          return await axios.patch(
            `/api/collection-reports/collections?id=${entry._id}`,
            patchData
          );
        })
      );
      const failed = results.filter(result => result.status === 'rejected').length;
      if (failed > 0) {
        toast.error(
          `${failed} machine${failed > 1 ? 's' : ''} failed to update`
        );
        return;
      }

      // Update local state so UI reflects changes immediately without needing refresh/close
      const updatedEntries = collectedMachineEntries.map(entry => ({
        ...entry,
        sasMeters: {
          ...entry.sasMeters,
          ...(startTimeISO ? { sasStartTime: startTimeISO } : {}),
          ...(endTimeISO ? { sasEndTime: endTimeISO } : {}),
        },
      }));
      setCollectedMachineEntries(updatedEntries);

      toast.success('All SAS times updated successfully!');
      setUpdateAllSasStartDate(undefined);
      setUpdateAllSasEndDate(undefined);
    } catch (error) {
      console.error('Failed to update SAS times:', error);
      toast.error('Failed to update SAS times');
    } finally {
      setIsProcessing(false);
    }
  }, [
    updateAllSasStartDate,
    updateAllSasEndDate,
    collectedMachineEntries,
    setCollectedMachineEntries,
  ]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Sync locations ref when locations change
   */
  // ==========================================================================
  // Collection Time Updates
  // ==========================================================================

  /**
   * Update collection time when location changes
   */
  useEffect(() => {
    if (show && selectedLocationId && !hasSetCollectionTimeFromReport) {
      const location = locationsRef.current.find(
        location => String(location._id) === selectedLocationId
      );
      if (location?.gameDayOffset !== undefined) {
        const defaultTime = calculateDefaultCollectionTime(
          location.gameDayOffset
        );
        setCurrentCollectionTime(defaultTime);
      }
    }
  }, [show, selectedLocationId, hasSetCollectionTimeFromReport]);

  // ==========================================================================
  // Machine Data Fetching
  // ==========================================================================

  /**
   * Fetch machines when location changes
   */
  useEffect(() => {
    if (show && selectedLocationId) {
      const fetchMachinesForLocation = async () => {
        setIsLoadingMachines(true);
        try {
          const response = await axios.get(
            `/api/cabinets?locationId=${selectedLocationId}&_t=${Date.now()}`
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

  // ==========================================================================
  // First Collection Check
  // ==========================================================================

  /**
   * Check if machine is first collection
   */
  useEffect(() => {
    if (show && selectedMachineId) {
      axios
        .get(
          `/api/collection-reports/collections/check-first-collection?machineId=${selectedMachineId}`
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

  // ==========================================================================
  // Amount Calculation
  // ==========================================================================

  /**
   * Auto-calculate amount to collect when relevant data changes
   */
  useEffect(() => {
    if (!show) {
      prevCalculationRef.current = null;
      return;
    }

    // Create a hash of entry IDs and key values to detect actual changes
    const entriesHash = collectedMachineEntries
      .map(
        entry =>
          `${entry._id}:${entry.metersIn}:${entry.metersOut}:${entry.prevIn}:${entry.prevOut}:${entry.ramClear ? '1' : '0'}`
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
      if (financials.amountToCollect !== '0') {
        setFinancials({ amountToCollect: '0' });
      }
      return;
    }

    // Calculate total movement data from all machine entries using proper movement calculation
    const totalMovementData = collectedMachineEntries.map(entry => {
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
    if (financials.amountToCollect !== newAmount) {
      setFinancials({
        amountToCollect: newAmount,
      });
    }
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
        location => String(location._id) === selectedLocationId
      );
      if (location) {
        if (selectedLocationName !== location.name) {
          setSelectedLocationName(location.name);
        }
      }
    } else if (!show) {
      if (selectedLocationName !== '') {
        setSelectedLocationName('');
      }
    }
  }, [show, selectedLocationId]);

  // Load report data
  useEffect(() => {
    if (show && reportId) {
      fetchCollectionReportById(reportId)
        .then(data => {
          const reportData = data as CollectionReportData;
          setReportData(reportData);

          // Set location from report - resolve BOTH id and name immediately
          if (reportData.locationName) {
            const matchingLoc = locationsRef.current.find(
              location => location.name === reportData.locationName
            );
            if (matchingLoc) {
              // Set both id and name together so the dropdown shows correctly
              setStoreSelectedLocation(
                String(matchingLoc._id),
                matchingLoc.name
              );
            } else {
              // Fallback: set name only (id will be set when collections load)
              setSelectedLocationName(reportData.locationName);
            }
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
                if (selectedLocationId !== newLocationId) {
                  setSelectedLocationId(newLocationId);
                }
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
      const original = originalCollections.find(originalCollection => originalCollection._id === current._id);
      if (original) {
        if (
          current.metersIn !== original.metersIn ||
          current.metersOut !== original.metersOut ||
          (current.timestamp &&
            original.timestamp &&
            new Date(current.timestamp).getTime() !==
              new Date(original.timestamp).getTime()) ||
          (current.collectionTime &&
            original.collectionTime &&
            new Date(current.collectionTime).getTime() !==
              new Date(original.collectionTime).getTime())
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
          const { getPreviousCollectionMetersAtTime } =
            await import('@/lib/helpers/historicalCollectionData');

          const previousMeters = await getPreviousCollectionMetersAtTime(
            String(machineForDataEntry._id),
            currentCollectionTime
          );

          console.warn('🔍 Historical query result:', {
            previousMeters,
            machineId: machineForDataEntry._id,
            timestamp: currentCollectionTime.toISOString(),
          });

          // Helper: resolve sasMeters → collectionMeters → 0 for this machine
          const resolveMachineFallback = (which: 'in' | 'out') => {
            const sasVal =
              which === 'in'
                ? (machineForDataEntry?.sasMeters?.drop ?? null)
                : (machineForDataEntry?.sasMeters?.totalCancelledCredits ??
                  null);
            const legacyVal =
              which === 'in'
                ? (machineForDataEntry?.collectionMeters?.metersIn ?? null)
                : (machineForDataEntry?.collectionMeters?.metersOut ?? null);
            return sasVal !== null && sasVal > 0 ? sasVal : (legacyVal ?? 0);
          };

          if (previousMeters !== null) {
            console.warn('🔍 Using historical prevIn/prevOut:', previousMeters);
            // If the query returns 0 (common for SAS integration where no past Collections exist),
            // fall back to sasMeters.drop / totalCancelledCredits, then collectionMeters.
            if (previousMeters.prevIn === 0 && previousMeters.prevOut === 0) {
              console.warn(
                '🔍 Historical query returned 0, falling back to machine sasMeters'
              );
              const fbIn = resolveMachineFallback('in');
              const fbOut = resolveMachineFallback('out');
              if (prevIn !== fbIn) setPrevIn(fbIn);
              if (prevOut !== fbOut) setPrevOut(fbOut);
            } else {
              if (prevIn !== previousMeters.prevIn)
                setPrevIn(previousMeters.prevIn);
              if (prevOut !== previousMeters.prevOut)
                setPrevOut(previousMeters.prevOut);
            }
          } else {
            // Query failed — use sasMeters → collectionMeters → 0
            console.warn(
              '🔍 Historical query returned null, falling back to machine sasMeters'
            );
            const fbIn = resolveMachineFallback('in');
            const fbOut = resolveMachineFallback('out');
            if (prevIn !== fbIn) setPrevIn(fbIn);
            if (prevOut !== fbOut) setPrevOut(fbOut);
          }
        } catch (error) {
          console.error('Error fetching historical prev meters:', error);
          console.warn(
            '🔍 Error in historical query, falling back to machine sasMeters'
          );
          const sasIn = machineForDataEntry?.sasMeters?.drop ?? null;
          const sasOut =
            machineForDataEntry?.sasMeters?.totalCancelledCredits ?? null;
          const legacyIn =
            machineForDataEntry?.collectionMeters?.metersIn ?? null;
          const legacyOut =
            machineForDataEntry?.collectionMeters?.metersOut ?? null;
          const fbIn = sasIn !== null && sasIn > 0 ? sasIn : (legacyIn ?? 0);
          const fbOut =
            sasOut !== null && sasOut > 0 ? sasOut : (legacyOut ?? 0);
          if (prevIn !== fbIn) setPrevIn(fbIn);
          if (prevOut !== fbOut) setPrevOut(fbOut);
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
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
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
    showMachineRolloverWarning,
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
    sasStartTime,
    setSasStartTime,
    sasEndTime,
    setSasEndTime,
    prevIn: storeFormData.prevIn,
    setPrevIn,
    prevOut: storeFormData.prevOut,
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
    calculateCarryover: storeCalculateCarryover,
    baseBalanceCorrection,
    setBaseBalanceCorrection,
    machinesOfSelectedLocation,
    setMachinesOfSelectedLocation,
    isLoadingLocations,
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
    handleConfirmMachineRollover,
    handleCancelMachineRollover,
    handleApplyAllDates,

    // User
    user,
    userId,
  };
}

