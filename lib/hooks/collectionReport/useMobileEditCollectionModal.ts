/**
 * useMobileEditCollectionModal Hook
 *
 * Encapsulates state and logic for the Mobile Edit Collection Modal.
 * Handles location selection, machine fetching, validation, entry management, and navigation.
 */

'use client';

import { validateMachineEntry } from '@/lib/helpers/collectionReport';
import { sortMachinesAlphabetically } from '@/lib/helpers/collectionReport/mobileEditCollectionModalHelpers';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useUserStore } from '@/lib/store/userStore';
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { calculateMachineMovement } from '@/lib/utils/movement';
import axios, { type AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export type MobileModalState = {
  // Panel visibility states - ALL HIDDEN BY DEFAULT
  isMachineListVisible: boolean;
  isFormVisible: boolean;
  isCollectedListVisible: boolean;

  // Navigation state tracking
  navigationStack: string[]; // Track where user came from for proper back navigation
  isViewingFinancialForm: boolean; // Track if we're viewing financial form vs machine list

  // View machine confirmation
  showViewMachineConfirmation: boolean;

  // Search and filters
  searchTerm: string;
  collectedMachinesSearchTerm: string;

  // Edit mode tracking
  editingEntryId: string | null;

  // Form data
  formData: {
    metersIn: string;
    metersOut: string;
    ramClear: boolean;
    ramClearMetersIn: string;
    ramClearMetersOut: string;
    notes: string;
    collectionTime: Date;
    sasStartTime: Date | null;
    sasEndTime: Date | null;
    prevIn: string;
    prevOut: string;
    showAdvancedSas: boolean;
  };

  // Loading states
  isLoadingMachines: boolean;
  isProcessing: boolean;
  isLoadingCollections: boolean;

  // Store references for compatibility (these come from Zustand store)
  selectedLocation: string | null;
  selectedLocationName: string;
  lockedLocationId: string | undefined;
  availableMachines: CollectionReportMachineSummary[];
  collectedMachines: CollectionDocument[];
  originalCollections: CollectionDocument[]; // For dirty tracking
  selectedMachine: string | null;
  selectedMachineData: CollectionReportMachineSummary | null;
  hasUnsavedEdits: boolean; // Track if there are unsaved meter changes
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
  baseBalanceCorrection: string;
};

type UseMobileEditCollectionModalProps = {
  show: boolean;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  onClose: () => void;
};

export function useMobileEditCollectionModal({
  show,
  reportId,
  locations,
  onRefresh,
  onClose,
}: UseMobileEditCollectionModalProps) {
  const user = useUserStore(state => state.user);
  const locationsRef = useRef(locations);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // Get Zustand store state - use store directly for shared state
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
    selectedMachineId: storeMachineId,
  } = useCollectionModalStore();

  // Update all SAS times state
  const [updateAllSasStartDate, setUpdateAllSasStartDate] = useState<Date | undefined>(undefined);
  const [updateAllSasEndDate, setUpdateAllSasEndDate] = useState<Date | undefined>(undefined);

  // Initialize only mobile-specific UI state
  const [modalState, setModalState] = useState<MobileModalState>(() => ({
    isMachineListVisible: true,
    isFormVisible: false,
    isCollectedListVisible: false,
    navigationStack: [], // Track navigation history
    isViewingFinancialForm: false, // Start with machine list view
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
    // Store references for compatibility
    selectedLocation: selectedLocationId || null,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    originalCollections: [], // Initialize empty for dirty tracking
    selectedMachine: storeMachineId || null,
    selectedMachineData: null,
    hasUnsavedEdits: false, // Initialize as no unsaved edits
    financials: financials,
    baseBalanceCorrection: financials.balanceCorrection,
  }));

  // ============================================================================
  // Financial Calculations
  // ============================================================================

  /**
   * Calculate amount to collect based on machine entries and financial inputs
   */
  const calculateAmountToCollect = useCallback(() => {
    if (modalState.collectedMachines.length === 0 || modalState.isLoadingCollections) {
      setModalState(prev => ({
        ...prev,
        financials: { ...prev.financials, amountToCollect: '0' }
      }));
      return;
    }

    const totalMovementData = modalState.collectedMachines.map(entry => {
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
        gross: movement.gross,
      };
    });

    const totalGross = totalMovementData.reduce(
      (sum, m) => sum + m.gross,
      0
    );

    const taxes = Number(modalState.financials.taxes) || 0;
    const variance = Number(modalState.financials.variance) || 0;
    const advance = Number(modalState.financials.advance) || 0;
    const previousBalance = Number(modalState.financials.previousBalance) || 0;

    // Find matching location for profit share
    const location = locationsRef.current.find(
      loc => String(loc._id) === (lockedLocationId || selectedLocationId || modalState.selectedLocation)
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
    modalState.collectedMachines,
    modalState.isLoadingCollections,
    modalState.financials.taxes,
    modalState.financials.variance,
    modalState.financials.advance,
    modalState.financials.previousBalance,
    lockedLocationId,
    selectedLocationId,
    modalState.selectedLocation,
  ]);

  // Trigger calculation when relevant state changes
  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  // State for unsaved changes warning
  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);

  // Navigation helper functions
  const pushNavigation = useCallback((screen: string) => {
    setModalState(prev => ({
      ...prev,
      navigationStack: [...prev.navigationStack, screen],
    }));
  }, []);

  const popNavigation = useCallback(() => {
    setModalState(prev => {
      const newStack = [...prev.navigationStack];
      newStack.pop();

      // Get the next top panel
      const topPanel = newStack.length > 0 ? newStack[newStack.length - 1] : null;

      // Update panel visibility based on the new top
      return {
        ...prev,
        isMachineListVisible: topPanel === 'machine-list' || topPanel === null, // null means home
        isFormVisible: topPanel === 'form',
        isCollectedListVisible: topPanel === 'list',
        navigationStack: newStack,
      };
    });
  }, []);

  // State transitions
  const transitions = {
    selectLocation: (locationId: string) => {
      const location = locations.find(l => String(l._id) === locationId);
      const locationName = location?.name || '';

      // Update local state
      setModalState(prev => ({
        ...prev,
        selectedLocation: locationId,
        selectedLocationName: locationName,
        searchTerm: '',
      }));

      // Persist to Zustand store
      setStoreSelectedLocation(locationId, locationName);
    },

    showMachineList: () => {
      setModalState(prev => ({
        ...prev,
        isMachineListVisible: true,
        isFormVisible: false,
        isCollectedListVisible: false,
      }));
    },

    hideMachineList: () => {
      setModalState(prev => ({
        ...prev,
        isMachineListVisible: false,
      }));
    },

    selectMachine: (machine: CollectionReportMachineSummary) => {
      setModalState(prev => ({
        ...prev,
        selectedMachine: String(machine._id),
        selectedMachineData: machine,
        isFormVisible: true,
        isMachineListVisible: false,
        formData: {
          ...prev.formData,
          metersIn: '',
          metersOut: '',
          ramClear: false,
          ramClearMetersIn: '',
          ramClearMetersOut: '',
          notes: '',
          showAdvancedSas: false,
          sasStartTime: null,
          sasEndTime: null,
          collectionTime: prev.formData.collectionTime || new Date(),
          prevIn: (() => {
            const s = machine.sasMeters?.drop ?? null;
            const l = machine.collectionMeters?.metersIn;
            return (l !== null && l !== undefined && l > 0) ? l.toString() : ((s !== null && s > 0) ? s.toString() : '');
          })(),
          prevOut: (() => {
            const s = machine.sasMeters?.totalCancelledCredits ?? null;
            const l = machine.collectionMeters?.metersOut;
            return (l !== null && l !== undefined && l > 0) ? l.toString() : ((s !== null && s > 0) ? s.toString() : '');
          })(),
        },
      }));
    },
  };

  // Debounced values
  const debouncedSelectedMachineData = useDebounce(
    modalState.selectedMachineData,
    500
  );
  const debouncedEditingEntryId = useDebounce(modalState.editingEntryId, 1000);
  const debouncedFormDataMetersIn = useDebounce(
    modalState.formData.metersIn,
    1500
  );
  const debouncedFormDataMetersOut = useDebounce(
    modalState.formData.metersOut,
    1500
  );
  const debouncedFormDataNotes = useDebounce(modalState.formData.notes, 1500);

  // Inputs enabled logic
  const inputsEnabled = useMemo(() => {
    return !!modalState.selectedMachineData || !!modalState.selectedMachine;
  }, [modalState.selectedMachineData, modalState.selectedMachine]);

  // Validation for "Add Machine" button
  const isAddMachineEnabled = useMemo(() => {
    // Must have a machine selected
    if (!modalState.selectedMachineData) return false;

    // Must have meters in and out entered
    if (!modalState.formData.metersIn || !modalState.formData.metersOut)
      return false;

    // If RAM Clear is checked, must have RAM Clear meters
    if (
      modalState.formData.ramClear &&
      (!modalState.formData.ramClearMetersIn ||
        !modalState.formData.ramClearMetersOut)
    ) {
      return false;
    }

    return true;
  }, [
    modalState.selectedMachineData,
    modalState.formData.metersIn,
    modalState.formData.metersOut,
    modalState.formData.ramClear,
    modalState.formData.ramClearMetersIn,
    modalState.formData.ramClearMetersOut,
  ]);

  // Validate that all required fields have values before enabling Create Report button
  const isCreateReportsEnabled = useMemo(() => {
    // Must have machines in the list
    if (modalState.collectedMachines.length === 0) return false;

    // Check that all collected machines have required meter values
    const allMachinesHaveRequiredData = modalState.collectedMachines.every(
      machine =>
        machine.metersIn !== undefined &&
        machine.metersIn !== null &&
        machine.metersOut !== undefined &&
        machine.metersOut !== null
    );

    if (!allMachinesHaveRequiredData) return false;

    // Check that amount to collect has a value (auto-calculated, always required)
    const amountToCollectHasValue =
      modalState.financials.amountToCollect !== undefined &&
      modalState.financials.amountToCollect !== null &&
      modalState.financials.amountToCollect.toString().trim() !== '';

    // Finance fields validation
    const balanceCorrectionHasValue =
      modalState.financials.balanceCorrection !== undefined &&
      modalState.financials.balanceCorrection !== null &&
      modalState.financials.balanceCorrection.toString().trim() !== '';

    return amountToCollectHasValue && balanceCorrectionHasValue;
  }, [modalState.collectedMachines, modalState.financials]);

  // Helper function to get location ID from machine ID
  const getLocationIdFromMachine = useCallback(
    (machineId: string) => {
      // Find the location that contains this machine
      for (const location of locations) {
        if (location.machines) {
          const machine = location.machines.find(
            m => String(m._id) === machineId
          );
          if (machine) {
            return String(location._id);
          }
        }
      }
      return null;
    },
    [locations]
  );



  // Add or update machine in collection list
  const addMachineToList = useCallback(async () => {
    if (!modalState.selectedMachineData || modalState.isProcessing) return;

    // Use full validation on submit — use sasMeters as baseline for rollover check, fall back to collectionMeters
    // Full validation — prioritize manual overrides from formData
    const msd = modalState.selectedMachineData;
    const valPrevIn = modalState.formData.prevIn !== '' 
      ? Number(modalState.formData.prevIn)
      : (() => {
          const s = msd.sasMeters?.drop ?? null;
          const l = msd.collectionMeters?.metersIn;
          return (l !== null && l !== undefined && l > 0) ? l : ((s !== null && s > 0) ? s : 0);
        })();
    const valPrevOut = modalState.formData.prevOut !== '' 
      ? Number(modalState.formData.prevOut)
      : (() => {
          const s = msd.sasMeters?.totalCancelledCredits ?? null;
          const l = msd.collectionMeters?.metersOut;
          return (l !== null && l !== undefined && l > 0) ? l : ((s !== null && s > 0) ? s : 0);
        })();
    const validation = validateMachineEntry(
      String(msd._id),
      msd,
      modalState.formData.metersIn,
      modalState.formData.metersOut,
      user?._id as string,
      modalState.formData.ramClear,
      valPrevIn,
      valPrevOut,
      modalState.formData.ramClearMetersIn
        ? Number(modalState.formData.ramClearMetersIn)
        : undefined,
      modalState.formData.ramClearMetersOut
        ? Number(modalState.formData.ramClearMetersOut)
        : undefined,
      !!modalState.editingEntryId
    );

    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid machine data. Please check your inputs.', { duration: 5000 });
      return;
    }

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      const isEditing = !!modalState.editingEntryId;

      // Prepare collection payload for API
      const collectionPayload = {
        machineId: String(modalState.selectedMachineData._id),
        machineName: modalState.selectedMachineData.name || '',
        machineCustomName: modalState.selectedMachineData.custom?.name || '',
        serialNumber: modalState.selectedMachineData.serialNumber || '',
        location: selectedLocationName,
        collector: user?._id || '',
        metersIn: Number(modalState.formData.metersIn),
        metersOut: Number(modalState.formData.metersOut),
        prevIn: valPrevIn,
        prevOut: valPrevOut,
        notes: modalState.formData.notes,
        ...(modalState.formData.showAdvancedSas && modalState.formData.sasStartTime ? { sasStartTime: modalState.formData.sasStartTime } : {}),
        ...(modalState.formData.showAdvancedSas && modalState.formData.sasEndTime
          ? {
              sasEndTime: modalState.formData.sasEndTime,
              timestamp: modalState.formData.sasEndTime.toISOString(),
              collectionTime: modalState.formData.sasEndTime.toISOString(),
            }
          : {
              // Simple mode: sasEndTime = collectionTime (always saved, never undefined)
              sasEndTime: modalState.formData.collectionTime,
              timestamp: modalState.formData.collectionTime.toISOString(),
              collectionTime: modalState.formData.collectionTime.toISOString(),
            }),
        ramClear: modalState.formData.ramClear,
        ramClearMetersIn: modalState.formData.ramClearMetersIn
          ? Number(modalState.formData.ramClearMetersIn)
          : undefined,
        ramClearMetersOut: modalState.formData.ramClearMetersOut
          ? Number(modalState.formData.ramClearMetersOut)
          : undefined,
        locationReportId: isEditing
          ? modalState.collectedMachines.find(
            c => c._id === modalState.editingEntryId
          )?.locationReportId || reportId
          : reportId,
        isCompleted: false,
      };

      let createdCollection: CollectionDocument;

      if (isEditing) {
        const response = await axios.patch(
          `/api/collections?id=${modalState.editingEntryId}`,
          collectionPayload
        );
        createdCollection = response.data;
      } else {
        const response = await axios.post(
          '/api/collections',
          collectionPayload
        );
        createdCollection = response.data.data;
      }

      // Calculate new state values
      const newCollectedMachines = isEditing
        ? modalState.collectedMachines.map(m =>
          m._id === modalState.editingEntryId ? createdCollection : m
        )
        : [...modalState.collectedMachines, createdCollection];

      const newLockedLocationId =
        modalState.collectedMachines.length === 0 && !isEditing
          ? modalState.selectedLocation || undefined
          : modalState.lockedLocationId;

      // Update Zustand store first (outside of local state update)
      setStoreCollectedMachines(newCollectedMachines);
      if (
        newLockedLocationId &&
        newLockedLocationId !== modalState.lockedLocationId
      ) {
        setStoreLockedLocation(newLockedLocationId);
      }

      // Update local UI state
      setModalState(prev => {
        // Correctly handle navigation state
        const newStack = [...prev.navigationStack];
        // Only pop if we are actually on the form panel
        if (newStack[newStack.length - 1] === 'form') {
           newStack.pop();
        }

        return {
          ...prev,
          collectedMachines: newCollectedMachines,
          lockedLocationId: newLockedLocationId,
          isFormVisible: false,
          isMachineListVisible: newStack.length === 0,
          navigationStack: newStack,
          selectedMachine: null,
          selectedMachineData: null,
          editingEntryId: null,
          formData: {
            ...prev.formData,
            metersIn: '',
            metersOut: '',
            ramClear: false,
            ramClearMetersIn: '',
            ramClearMetersOut: '',
            notes: '',
            showAdvancedSas: false,
            sasStartTime: null,
            sasEndTime: null,
            prevIn: '',
            prevOut: '',
          },
        };
      });
    } catch (error: unknown) {
      console.error('Error adding/updating machine in list:', error);
      const axiosError = error as AxiosError<{
        error: string;
        details: string;
        expectedPrevIn: number;
        expectedPrevOut: number;
        actualPrevIn: number;
        actualPrevOut: number;
      }>;
      if (
        axiosError.response?.status === 400 &&
        axiosError.response?.data?.error === 'Invalid previous meter values'
      ) {
        const errorData = axiosError.response.data;
        toast.error(
          `Validation Error: ${errorData.details}\n\nExpected: PrevIn=${errorData.expectedPrevIn}, PrevOut=${errorData.expectedPrevOut}\nReceived: PrevIn=${errorData.actualPrevIn}, PrevOut=${errorData.actualPrevOut}\n\nPlease refresh and try again.`,
          { duration: 10000 }
        );
      } else {
        toast.error(
          `Failed to ${modalState.editingEntryId ? 'update' : 'add'} machine: ${error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    } finally {
      setModalState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [
    modalState.selectedMachineData,
    modalState.formData,
    selectedLocationName,
    modalState.isProcessing,
    modalState.editingEntryId,
    modalState.collectedMachines,
    user,
    setStoreCollectedMachines,
    setStoreLockedLocation,
  ]);

  // Delete machine from collection list
  const deleteMachineFromList = useCallback(
    async (entryId: string) => {
      setModalState(prev => ({ ...prev, isProcessing: true }));

      try {
        await axios.delete(`/api/collections?id=${entryId}`);

        // Calculate new state values
        const newCollectedMachines = modalState.collectedMachines.filter(
          m => m._id !== entryId
        );
        const newLockedLocationId =
          newCollectedMachines.length === 0
            ? undefined
            : modalState.lockedLocationId;

        // Update Zustand store first
        setStoreCollectedMachines(newCollectedMachines);
        if (newLockedLocationId !== modalState.lockedLocationId) {
          setStoreLockedLocation(newLockedLocationId);
        }

        // Update local UI state
        setModalState(prev => ({
          ...prev,
          collectedMachines: newCollectedMachines,
          originalCollections: prev.originalCollections.filter(
            m => m._id !== entryId
          ),
          lockedLocationId: newLockedLocationId,
          isProcessing: false,
        }));

        toast.success('Collection removed successfully');
      } catch (error) {
        console.error('Failed to delete collection:', error);
        setModalState(prev => ({ ...prev, isProcessing: false }));
        toast.error('Failed to remove collection. Please try again.');
      }
    },
    [
      modalState.collectedMachines,
      modalState.lockedLocationId,
      setStoreCollectedMachines,
      setStoreLockedLocation,
    ]
  );

  // Edit machine in collection list
  const editMachineInList = useCallback(
    async (entry: CollectionDocument) => {
      let machine = modalState.availableMachines.find(
        m => m._id === entry.machineId
      );

      if (!machine && entry.location) {
        const location = locations.find(loc => loc.name === entry.location);
        if (location && location.machines) {
          machine = location.machines.find(
            m => String(m._id) === entry.machineId
          );

          setModalState(prev => ({
            ...prev,
            availableMachines: location.machines,
            selectedLocation: String(location._id),
            selectedLocationName: location.name,
          }));

          setStoreAvailableMachines(location.machines);
          setStoreSelectedLocation(String(location._id), location.name);
        }
      }

      if (!machine) {
        return;
      }

      setModalState(prev => ({
        ...prev,
        selectedMachine: String(machine._id),
        selectedMachineData: machine,
        editingEntryId: entry._id,
        isFormVisible: true,
        isCollectedListVisible: false,
        formData: {
          metersIn: entry.metersIn.toString(),
          metersOut: entry.metersOut.toString(),
          ramClear: entry.ramClear || false,
          ramClearMetersIn: entry.ramClearMetersIn?.toString() || '',
          ramClearMetersOut: entry.ramClearMetersOut?.toString() || '',
          notes: entry.notes || '',
          collectionTime: entry.sasMeters?.sasEndTime ? new Date(entry.sasMeters.sasEndTime) : new Date(entry.timestamp),
          showAdvancedSas: false, // Ensure advanced is NOT selected by default when editing
          sasStartTime: entry.sasMeters?.sasStartTime ? new Date(entry.sasMeters.sasStartTime) : null,
          sasEndTime: entry.sasMeters?.sasEndTime ? new Date(entry.sasMeters.sasEndTime) : null,
          prevIn: entry.prevIn?.toString() || '',
          prevOut: entry.prevOut?.toString() || '',
        },
      }));
    },
    [
      modalState.availableMachines,
      locations,
      setStoreAvailableMachines,
      setStoreSelectedLocation,
    ]
  );

  // Sync mobile state with Zustand store
  useEffect(() => {
    setModalState(prev => ({
      ...prev,
      selectedLocation: selectedLocationId || null,
      selectedLocationName,
      lockedLocationId,
      availableMachines,
      collectedMachines,
    }));
  }, [
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
  ]);

  // Update collection report handler
  const updateCollectionReportHandler = useCallback(async (reconciliationData?: unknown) => {
    if (
      collectedMachines.length === 0 ||
      !selectedLocationId ||
      !selectedLocationName
    ) {
      return;
    }

    // Validation checks for unsaved changes
    if (modalState.editingEntryId && modalState.selectedMachineData) {
      const editingEntry = collectedMachines.find(
        e => e._id === modalState.editingEntryId
      );
      if (editingEntry) {
        const formMetersIn = modalState.formData.metersIn
          ? Number(modalState.formData.metersIn)
          : 0;
        const formMetersOut = modalState.formData.metersOut
          ? Number(modalState.formData.metersOut)
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
      !modalState.editingEntryId &&
      (modalState.selectedMachineData ||
        modalState.formData.metersIn ||
        modalState.formData.metersOut ||
        modalState.formData.notes?.trim())
    ) {
      toast.error(
        `You have unsaved machine data. Please add the machine to the list or cancel before updating the report.`,
        { duration: 10000, position: 'top-left' }
      );
      return;
    }

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      const { updateCollectionReport: updateReportAPI } = await import(
        '@/lib/helpers/collectionReport'
      );
      const { validateCollectionReportPayload } = await import(
        '@/lib/utils/validation'
      );

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
        const original = modalState.originalCollections.find(
          o => o._id === current._id
        );
        if (original) {
          const metersInChanged = current.metersIn !== original.metersIn;
          const metersOutChanged = current.metersOut !== original.metersOut;
          const timeChanged = 
            (current.timestamp && original.timestamp && 
             new Date(current.timestamp).getTime() !== new Date(original.timestamp).getTime()) ||
            (current.collectionTime && original.collectionTime && 
             new Date(current.collectionTime).getTime() !== new Date(original.collectionTime).getTime());

          if (metersInChanged || metersOutChanged || timeChanged) {
            changes.push({
              machineId: current.machineId,
              locationReportId: current.locationReportId || reportId,
              metersIn: current.metersIn || 0,
              metersOut: current.metersOut || 0,
              prevMetersIn: current.prevIn || 0,
              prevMetersOut: current.prevOut || 0,
              collectionId: current._id,
              timestamp: current.collectionTime ? new Date(current.collectionTime) : (current.timestamp ? new Date(current.timestamp) : new Date()),
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
            timestamp: current.collectionTime ? new Date(current.collectionTime) : (current.timestamp ? new Date(current.timestamp) : new Date()),
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
          toast.error('Failed to update machine histories. Please try again.');
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

      // Update collection report financials
      const payload = {
        variance: Number(modalState.financials.variance) || 0,
        previousBalance: Number(modalState.financials.previousBalance) || 0,
        currentBalance: 0,
        amountToCollect: Number(modalState.financials.amountToCollect) || 0,
        amountCollected:
          Number(modalState.financials.collectedAmount) ||
          Number(modalState.financials.amountToCollect) ||
          0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes: Number(modalState.financials.taxes) || 0,
        advance: Number(modalState.financials.advance) || 0,
        collector: user?._id || '',
        locationName: selectedLocationName,
        locationReportId: reportId,
        location: selectedLocationId || '',
        totalDrop: 0,
        totalCancelled: 0,
        totalGross: 0,
        totalSasGross: 0,
        timestamp: new Date().toISOString(),
        reconciliation: reconciliationData || null,
        varianceReason: modalState.financials.varianceReason,
        reasonShortagePayment: modalState.financials.reasonForShortagePayment,
        balanceCorrection: Number(modalState.financials.balanceCorrection) || 0,
        balanceCorrectionReas: modalState.financials.balanceCorrectionReason,
        machines: collectedMachines.map(entry => ({
          machineId: entry.machineId,
          metersIn: entry.metersIn || 0,
          metersOut: entry.metersOut || 0,
          prevMetersIn: entry.prevIn || 0,
          prevMetersOut: entry.prevOut || 0,
          timestamp:
            entry.timestamp instanceof Date
              ? entry.timestamp
              : new Date(entry.timestamp),
          locationReportId: entry.locationReportId || reportId,
        })),
      };

      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        console.error('❌ [MobileEditReport] Validation failed:', {
          errors: validation.errors,
          payload,
        });
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      await updateReportAPI(reportId, payload);

      toast.dismiss('mobile-update-report-toast');
      toast.success('Collection report updated successfully!');

      setModalState(prev => ({ ...prev, hasUnsavedEdits: false }));
      onRefresh();
      onClose();
    } catch (error) {
      toast.dismiss('mobile-update-report-toast');
      console.error('Failed to update collection report:', error);
      toast.error(
        `Failed to update collection report: ${error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setModalState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [
    collectedMachines,
    selectedLocationId,
    selectedLocationName,
    modalState.financials,
    modalState.originalCollections,
    modalState.editingEntryId,
    modalState.selectedMachineData,
    modalState.formData,
    user,
    onRefresh,
    onClose,
    reportId,
  ]);

  // Load existing report data for edit mode
  useEffect(() => {
    if (show && reportId && locations && locations.length > 0) {
      const loadReportData = async () => {
        try {
          setModalState(prev => ({
            ...prev,
            isLoadingCollections: true,
            isLoadingMachines: true,
          }));

          const reportResponse = await axios.get(
            `/api/collection-report/${reportId}`
          );
          const reportData = reportResponse.data;

          if (reportData.isEditing) {
            setModalState(prev => ({ ...prev, hasUnsavedEdits: true }));
          }

          const collectionsResponse = await axios.get(
            `/api/collections?locationReportId=${reportId}&_t=${Date.now()}`
          );
          const collections = collectionsResponse.data;

          const matchingLocation = locations.find(
            loc => loc.name === reportData.locationName
          );

          if (matchingLocation) {
            setStoreSelectedLocation(
              String(matchingLocation._id),
              matchingLocation.name
            );
            setStoreAvailableMachines(matchingLocation.machines || []);
            setStoreCollectedMachines(collections);


            setModalState(prev => ({
              ...prev,
              selectedLocation: String(matchingLocation._id),
              selectedLocationName: matchingLocation.name,
              collectedMachines: collections,
              originalCollections: JSON.parse(JSON.stringify(collections)),
              availableMachines: matchingLocation.machines || [],
              hasUnsavedEdits: reportData.isEditing || false,
              financials: {
                variance: String(reportData.locationMetrics?.variance || 0),
                previousBalance: String(
                  reportData.locationMetrics?.previousBalanceOwed || 0
                ),
                amountToCollect: String(
                  reportData.locationMetrics?.amountToCollect || 0
                ),
                collectedAmount: String(
                  reportData.locationMetrics?.collectedAmount || 0
                ),
                taxes: String(reportData.locationMetrics?.taxes || 0),
                advance: String(reportData.locationMetrics?.advance || 0),
                varianceReason:
                  reportData.locationMetrics?.varianceReason || '',
                reasonForShortagePayment:
                  reportData.locationMetrics?.reasonForShortage || '',
                balanceCorrection: String(
                  reportData.locationMetrics?.balanceCorrection || 0
                ),
                balanceCorrectionReason:
                  reportData.locationMetrics?.correctionReason || '',
              },
              isLoadingCollections: false,
              isLoadingMachines: false,
            }));
          } else {
            setModalState(prev => ({
              ...prev,
              isLoadingCollections: false,
              isLoadingMachines: false,
            }));
          }
        } catch (error) {
          console.error('Error loading report data:', error);
          toast.error('Failed to load report data');
          setModalState(prev => ({
            ...prev,
            isLoadingCollections: false,
            isLoadingMachines: false,
          }));
        }
      };

      loadReportData();
    }
  }, [
    show,
    reportId,
    locations,
    setStoreSelectedLocation,
    setStoreAvailableMachines,
    setStoreCollectedMachines,
  ]);



  // Reset modal state when modal opens - home screen shows machine cards grid directly
  useEffect(() => {
    if (show) {
      setModalState(prev => ({
        ...prev,
        isMachineListVisible: false,
        isFormVisible: false,
        isCollectedListVisible: false,
        navigationStack: [],
      }));
    }
  }, [show]);

  return {
    // State
    modalState,
    setModalState,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    showUnsavedChangesWarning,
    setShowUnsavedChangesWarning,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    entryToDelete,
    setEntryToDelete,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    user,

    // Store state
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    collectionTime,

    // Navigation
    pushNavigation,
    popNavigation,
    handleViewCollectedMachines: useCallback(() => {
      setModalState(prev => ({
        ...prev,
        isCollectedListVisible: true,
        isFormVisible: false,
        isMachineListVisible: false,
      }));
      pushNavigation('list');
    }, [pushNavigation]),
    transitions,

    // Validation
    inputsEnabled,
    isAddMachineEnabled,
    isCreateReportsEnabled,

    // Debounced values
    debouncedSelectedMachineData,
    debouncedEditingEntryId,
    debouncedFormDataMetersIn,
    debouncedFormDataMetersOut,
    debouncedFormDataNotes,

    // API functions
    addMachineToList,
    deleteMachineFromList,
    editMachineInList,
    updateCollectionReportHandler,

    // Base balance correction
    baseBalanceCorrection: modalState.baseBalanceCorrection,
    onBaseBalanceCorrectionChange: (value: string) => {
      setModalState(prev => ({ ...prev, baseBalanceCorrection: value }));
    },

    // Form data change handler
    onFormDataChange: (updates: Partial<MobileModalState['formData']>) => {
      setModalState(prev => {
        const newFormData = { ...prev.formData, ...updates };
        
        // Update global store if specific fields are present
        Object.entries(updates).forEach(([field, value]) => {
          setStoreFormData({ [field]: value } as Partial<typeof storeFormData>);
          
          // If turning on advanced SAS and times are null, set defaults
          if (field === 'showAdvancedSas' && value === true) {
            if (!newFormData.sasEndTime) {
              newFormData.sasEndTime = new Date(newFormData.collectionTime || new Date());
            }
            if (!newFormData.sasStartTime) {
              // Default start to 24h before end so they show distinct values
              const defaultStart = new Date(newFormData.sasEndTime as Date);
              defaultStart.setDate(defaultStart.getDate() - 1);
              newFormData.sasStartTime = defaultStart;
            }
          }
        });
        
        return {
          ...prev,
          formData: newFormData
        };
      });
    },

    // Collected amount change with calculations (to match PC and New modal)
    onCollectedAmountChange: (value: string) => {
      // Use the centralized store action
      setStoreCalculateCarryover(value, modalState.baseBalanceCorrection);
      
      // Also update local modalState for immediate UI feedback if needed
      setModalState(prev => ({
        ...prev,
        financials: {
          ...prev.financials,
          collectedAmount: value,
        }
      }));
    },

    // Helpers
    sortMachinesAlphabetically,
    getLocationIdFromMachine,

    // Update All SAS Times feature
    handleApplyAllDates: async () => {
      if (!updateAllSasStartDate && !updateAllSasEndDate) return;
      if (modalState.collectedMachines.length < 1) return;
      try {
        setModalState(prev => ({ ...prev, isProcessing: true }));
        const patchData: Record<string, string> = {};
        
        const startTimeISO = updateAllSasStartDate?.toISOString();
        const endTimeISO = updateAllSasEndDate?.toISOString();

        if (startTimeISO) patchData.sasStartTime = startTimeISO;
        if (endTimeISO) patchData.sasEndTime = endTimeISO;

        const results = await Promise.allSettled(
          modalState.collectedMachines.map(async entry => {
            if (!entry._id) return;
            return await axios.patch(`/api/collections?id=${entry._id}`, patchData);
          })
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
          toast.error(`${failed} machine${failed > 1 ? 's' : ''} failed to update`);
          return;
        }

        // Sync local state
        const updated = modalState.collectedMachines.map(e => ({
          ...e,
          sasMeters: {
            ...e.sasMeters,
            ...(startTimeISO ? { sasStartTime: startTimeISO } : {}),
            ...(endTimeISO ? { sasEndTime: endTimeISO } : {}),
          }
        }));

        setModalState(prev => ({
          ...prev,
          collectedMachines: updated,
          isProcessing: false
        }));

        toast.success('All SAS times updated successfully!');
        setUpdateAllSasStartDate(undefined);
        setUpdateAllSasEndDate(undefined);
      } catch {
        toast.error('Failed to update SAS times');
      } finally {
        setModalState(prev => ({ ...prev, isProcessing: false }));
      }
    },

    // Store actions
    setStoreSelectedLocation,
    setStoreLockedLocation,
    setStoreAvailableMachines,
    setStoreCollectedMachines,
  };
}

