'use client';

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { InfoConfirmationDialog } from '@/components/ui/InfoConfirmationDialog';
import { LocationSelect } from '@/components/ui/custom-select';
import {
    Dialog,
    DialogContent,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';
import { PCDateTimePicker } from '@/components/ui/pc-date-time-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileCollectionModalSkeleton } from '@/components/ui/skeletons/MobileCollectionModalSkeleton';
import { validateMachineEntry } from '@/lib/helpers/collectionReportModal';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useUserStore } from '@/lib/store/userStore';
import type {
    CollectionReportLocationWithMachines,
    CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import { formatDate } from '@/lib/utils/formatting';
import { calculateMachineMovement } from '@/lib/utils/frontendMovementCalculation';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { getUserDisplayName } from '@/lib/utils/userDisplay';
import axios, { type AxiosError } from 'axios';
import { ArrowLeft, Edit3, ExternalLink, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type MobileEditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
};

type MobileModalState = {
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
};

export default function MobileEditCollectionModal({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: MobileEditCollectionModalProps) {
  const user = useUserStore(state => state.user);

  // Utility function for proper alphabetical and numerical sorting
  const sortMachinesAlphabetically = <
    T extends { name?: string; machineName?: string; serialNumber?: string },
  >(
    machines: T[]
  ): T[] => {
    return machines.sort((a, b) => {
      const nameA = (
        a.name ||
        a.machineName ||
        a.serialNumber ||
        ''
      ).toString();
      const nameB = (
        b.name ||
        b.machineName ||
        b.serialNumber ||
        ''
      ).toString();

      // Extract the base name and number parts
      const matchA = nameA.match(/^(.+?)(\d+)?$/);
      const matchB = nameB.match(/^(.+?)(\d+)?$/);

      if (!matchA || !matchB) {
        return nameA.localeCompare(nameB);
      }

      const [, baseA, numA] = matchA;
      const [, baseB, numB] = matchB;

      // First compare the base part alphabetically
      const baseCompare = baseA.localeCompare(baseB);
      if (baseCompare !== 0) {
        return baseCompare;
      }

      // If base parts are the same, compare numerically
      const numAInt = numA ? parseInt(numA, 10) : 0;
      const numBInt = numB ? parseInt(numB, 10) : 0;

      return numAInt - numBInt;
    });
  };

  // Get Zustand store state - use store directly for shared state
  const {
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    collectionTime,
    setSelectedLocation: setStoreSelectedLocation,
    setLockedLocation: setStoreLockedLocation,
    setAvailableMachines: setStoreAvailableMachines,
    setCollectedMachines: setStoreCollectedMachines,
  } = useCollectionModalStore();

  // Update all dates state - syncs with form collection time
  const [updateAllDate, setUpdateAllDate] = useState<Date | undefined>(
    undefined
  );

  // Initialize only mobile-specific UI state
  const [modalState, setModalState] = useState<MobileModalState>(() => ({
    isMachineListVisible: false,
    isFormVisible: false,
    isCollectedListVisible: false,
    navigationStack: [], // Track navigation history
    isViewingFinancialForm: false, // Start with machine list view
    showViewMachineConfirmation: false,
    searchTerm: '',
    collectedMachinesSearchTerm: '',
    editingEntryId: null,
    formData: {
      metersIn: '',
      metersOut: '',
      ramClear: false,
      ramClearMetersIn: '',
      ramClearMetersOut: '',
      notes: '',
      collectionTime: collectionTime,
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
    selectedMachine: null,
    selectedMachineData: null,
    hasUnsavedEdits: false, // Initialize as no unsaved edits
    financials: {
      taxes: '0',
      advance: '0',
      variance: '0',
      varianceReason: '',
      amountToCollect: '0',
      collectedAmount: '0',
      balanceCorrection: '0',
      balanceCorrectionReason: '',
      previousBalance: '0',
      reasonForShortagePayment: '',
    },
  }));

  // State for unsaved changes warning
  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
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
      const previousScreen = newStack.pop();

      // Hide all panels first
      const newState = {
        ...prev,
        isMachineListVisible: false,
        isFormVisible: false,
        isCollectedListVisible: false,
        navigationStack: newStack,
      };

      // Show the previous screen
      if (previousScreen === 'main') {
        // Stay on main screen (default state)
      } else if (previousScreen === 'form') {
        newState.isFormVisible = true;
      } else if (previousScreen === 'collected-list') {
        newState.isCollectedListVisible = true;
      }

      return newState;
    });
  }, []);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);

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
        isFormVisible: true, // Automatically show form when machine is selected
        formData: {
          ...prev.formData,
          // Keep existing collectionTime - don't reset it
          metersIn: '',
          metersOut: '',
          notes: '',
          ramClear: false,
          ramClearMetersIn: '',
          ramClearMetersOut: '',
        },
      }));
    },

    closeForm: () => {
      setModalState(prev => ({
        ...prev,
        isFormVisible: false,
        // Keep selectedMachine and selectedMachineData - don't clear them
      }));
    },

    showCollectedList: () => {
      setModalState(prev => ({
        ...prev,
        isCollectedListVisible: true,
        isFormVisible: false,
        isMachineListVisible: false,
      }));
    },

    closeCollectedList: () => {
      setModalState(prev => ({
        ...prev,
        isCollectedListVisible: false,
      }));
    },

    resetModal: () => {
      setModalState(prev => ({
        ...prev,
        selectedLocation: null,
        selectedLocationName: '',
        availableMachines: [],
        searchTerm: '',
        isMachineListVisible: false,
        isFormVisible: false,
        isCollectedListVisible: false,
      }));
    },
  };

  // Load machines from locations prop when location is selected
  useEffect(() => {
    const locationIdToUse =
      lockedLocationId || selectedLocationId || modalState.selectedLocation;
    if (locationIdToUse && locations.length > 0) {
      const location = locations.find(l => String(l._id) === locationIdToUse);
      if (location && location.machines) {
        setModalState(prev => ({
          ...prev,
          availableMachines: location.machines,
          isLoadingMachines: false,
        }));
        // Persist to Zustand store
        setStoreAvailableMachines(location.machines);
      }
    }
  }, [
    selectedLocationId,
    lockedLocationId,
    modalState.selectedLocation,
    locations,
    setStoreAvailableMachines,
  ]);

  // Calculate amount to collect based on collected machines and financial inputs
  useEffect(() => {
    // Don't calculate if we don't have collected machines
    if (!collectedMachines.length) {
      setModalState(prev => ({
        ...prev,
        financials: { ...prev.financials, amountToCollect: '0' },
      }));
      return;
    }

    // Calculate total movement data from all collected machines using proper movement calculation
    const totalMovementData = collectedMachines.reduce(
      (acc, machine) => {
        const movement = calculateMachineMovement(
          machine.metersIn || 0,
          machine.metersOut || 0,
          machine.prevIn || 0,
          machine.prevOut || 0,
          machine.ramClear || false,
          undefined, // ramClearCoinIn - may not be available in mobile context
          undefined, // ramClearCoinOut - may not be available in mobile context
          machine.ramClearMetersIn,
          machine.ramClearMetersOut
        );
        return {
          drop: acc.drop + movement.metersIn,
          cancelledCredits: acc.cancelledCredits + movement.metersOut,
          gross: acc.gross + movement.gross,
        };
      },
      { drop: 0, cancelledCredits: 0, gross: 0 }
    );

    // Get financial values
    const taxes = Number(modalState.financials.taxes) || 0;
    const variance = Number(modalState.financials.variance) || 0;
    const advance = Number(modalState.financials.advance) || 0;

    // Get location's previous balance
    const selectedLocation = locations.find(
      l => String(l._id) === selectedLocationId
    );
    const locationPreviousBalance = selectedLocation?.collectionBalance || 0;

    // Get profit share from selected location (default to 50% if not available)
    const profitShare = selectedLocation?.profitShare || 50;

    // Calculate partner profit: (gross - variance - advance) * profitShare / 100 - taxes
    const partnerProfit =
      ((totalMovementData.gross - variance - advance) * profitShare) / 100 -
      taxes;

    // Calculate amount to collect: gross - variance - advance - partnerProfit + locationPreviousBalance
    const amountToCollect =
      totalMovementData.gross -
      variance -
      advance -
      partnerProfit +
      locationPreviousBalance;

    setModalState(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        amountToCollect: amountToCollect.toFixed(2),
      },
    }));
  }, [
    collectedMachines,
    modalState.financials.taxes,
    modalState.financials.variance,
    modalState.financials.advance,
    selectedLocationId,
    locations,
  ]);

  // Real-time validation for meter inputs
  const validateMeterInputs = useCallback(() => {
    if (
      !modalState.selectedMachineData ||
      !modalState.formData.metersIn ||
      !modalState.formData.metersOut
    ) {
      return;
    }

    // Validation is now handled inline in the form components
  }, [modalState.selectedMachineData, modalState.formData.metersIn, modalState.formData.metersOut]);

  // Debounced validation on input changes (3 seconds)
  const debouncedValidateMeterInputs = useDebouncedCallback(
    validateMeterInputs,
    3000
  );
  useEffect(() => {
    debouncedValidateMeterInputs();
  }, [debouncedValidateMeterInputs]);

  // Debounced machine selection validation (1 second)
  const debouncedSelectedMachineData = useDebounce(
    modalState.selectedMachineData,
    1000
  );
  const debouncedEditingEntryId = useDebounce(modalState.editingEntryId, 1000);

  useEffect(() => {
    if (debouncedSelectedMachineData || debouncedEditingEntryId) {
      // Trigger validation when machine selection is debounced
      validateMeterInputs();
    }
  }, [
    debouncedSelectedMachineData,
    debouncedEditingEntryId,
    validateMeterInputs,
  ]);

  // Debounced input field validation (1.5 seconds)
  const debouncedFormDataMetersIn = useDebounce(
    modalState.formData.metersIn,
    1500
  );
  const debouncedFormDataMetersOut = useDebounce(
    modalState.formData.metersOut,
    1500
  );

  // Inputs enabled logic - same as desktop
  const inputsEnabled = useMemo(() => {
    return !!modalState.selectedMachineData || !!modalState.selectedMachine;
  }, [modalState.selectedMachineData, modalState.selectedMachine]);

  // Validation for "Add Machine" button - same logic as desktop
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

  // Validate that all required fields have values before enabling Create Report button - same as desktop
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
      modalState.financials.amountToCollect.toString().trim() !== '' &&
      Number(modalState.financials.amountToCollect) !== 0;

    // Finance fields validation - same as desktop
    const balanceCorrectionHasValue =
      modalState.financials.balanceCorrection !== undefined &&
      modalState.financials.balanceCorrection !== null &&
      modalState.financials.balanceCorrection.toString().trim() !== '';

    return amountToCollectHasValue && balanceCorrectionHasValue;
  }, [modalState.collectedMachines, modalState.financials]);
  const debouncedFormDataNotes = useDebounce(modalState.formData.notes, 1500);

  useEffect(() => {
    if (
      debouncedFormDataMetersIn ||
      debouncedFormDataMetersOut ||
      debouncedFormDataNotes
    ) {
      // Trigger validation when input fields change (debounced)
      validateMeterInputs();
    }
  }, [
    debouncedFormDataMetersIn,
    debouncedFormDataMetersOut,
    debouncedFormDataNotes,
    validateMeterInputs,
  ]);

  // Add or update machine in collection list
  const addMachineToList = useCallback(async () => {
    if (!modalState.selectedMachineData || modalState.isProcessing) return;

    // Use full validation on submit
    const validation = validateMachineEntry(
      String(modalState.selectedMachineData._id),
      modalState.selectedMachineData,
      modalState.formData.metersIn,
      modalState.formData.metersOut,
      user?._id as string,
      modalState.formData.ramClear,
      modalState.selectedMachineData.collectionMeters?.metersIn,
      modalState.selectedMachineData.collectionMeters?.metersOut,
      modalState.formData.ramClearMetersIn
        ? Number(modalState.formData.ramClearMetersIn)
        : undefined,
      modalState.formData.ramClearMetersOut
        ? Number(modalState.formData.ramClearMetersOut)
        : undefined,
      !!modalState.editingEntryId
    );

    if (!validation.isValid) {
      // Validation errors are now shown inline in the form
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
        collector: getUserDisplayName(user),
        metersIn: Number(modalState.formData.metersIn),
        metersOut: Number(modalState.formData.metersOut),
        // CRITICAL: Don't send prevIn/prevOut values - let the API calculate them from machine history
        // Sending 0 or any hardcoded value causes meter mismatches
        // The API will find the correct previous collection and use its metersIn/metersOut
        notes: modalState.formData.notes,
        timestamp: modalState.formData.collectionTime.toISOString(),
        ramClear: modalState.formData.ramClear,
        ramClearMetersIn: modalState.formData.ramClearMetersIn
          ? Number(modalState.formData.ramClearMetersIn)
          : undefined,
        ramClearMetersOut: modalState.formData.ramClearMetersOut
          ? Number(modalState.formData.ramClearMetersOut)
          : undefined,
        // CRITICAL: When editing, preserve the existing locationReportId
        // When creating new, it will be empty and set when report is created
        locationReportId: isEditing
          ? modalState.collectedMachines.find(
              c => c._id === modalState.editingEntryId
            )?.locationReportId || ''
          : '', // Will be set when report is created
        isCompleted: false,
      };

      let createdCollection: CollectionDocument;

      if (isEditing) {
        // Update existing collection
        const response = await axios.patch(
          `/api/collections?id=${modalState.editingEntryId}`,
          collectionPayload
        );
        createdCollection = response.data;
      } else {
        // Create new collection via API
        const response = await axios.post(
          '/api/collections',
          collectionPayload
        );
        createdCollection = response.data.data; // API returns { success: true, data: created }
      }

      console.warn('📱 Collection created/updated:', createdCollection);

      // Update local and Zustand state with the created/updated collection
      setModalState(prev => {
        const newCollectedMachines = isEditing
          ? prev.collectedMachines.map(m =>
              m._id === modalState.editingEntryId ? createdCollection : m
            )
          : [...prev.collectedMachines, createdCollection];

        const newLockedLocationId =
          prev.collectedMachines.length === 0 && !isEditing
            ? prev.selectedLocation || undefined
            : prev.lockedLocationId;

        // Persist to Zustand store
        setStoreCollectedMachines(newCollectedMachines);
        if (
          newLockedLocationId &&
          newLockedLocationId !== prev.lockedLocationId
        ) {
          setStoreLockedLocation(newLockedLocationId);
        }

        return {
          ...prev,
          collectedMachines: newCollectedMachines,
          // Lock location when first machine is added
          lockedLocationId: newLockedLocationId,
          isFormVisible: false,
          isMachineListVisible: true, // Navigate back to machine list after adding
          selectedMachine: null,
          selectedMachineData: null,
          editingEntryId: null, // Clear editing state
          formData: {
            ...prev.formData,
            // Keep existing collectionTime - don't reset it
            metersIn: '',
            metersOut: '',
            ramClear: false,
            ramClearMetersIn: '',
            ramClearMetersOut: '',
            notes: '',
          },
        };
      });

      // Success feedback is handled by UI state changes
    } catch (error: unknown) {
      console.error('Error adding/updating machine in list:', error);

      // Handle validation errors from backend
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
          `Failed to ${modalState.editingEntryId ? 'update' : 'add'} machine: ${
            error instanceof Error ? error.message : 'Unknown error'
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
        // Find the entry data before deletion for logging
        const entryToDeleteData = modalState.collectedMachines.find(
          e => e._id === entryId
        );
        
        // Call the delete API to actually delete from database
        await axios.delete(`/api/collections?id=${entryId}`);
        
        console.warn('📱 Mobile Edit: Collection deleted from database:', entryId);
        
        // Update local state after successful deletion
        setModalState(prev => {
          const newCollectedMachines = prev.collectedMachines.filter(
            m => m._id !== entryId
          );
          const newLockedLocationId =
            newCollectedMachines.length === 0 ? undefined : prev.lockedLocationId;

          // Persist to Zustand store
          setStoreCollectedMachines(newCollectedMachines);
          if (newLockedLocationId !== prev.lockedLocationId) {
            setStoreLockedLocation(newLockedLocationId);
          }

          return {
            ...prev,
            collectedMachines: newCollectedMachines,
            // CRITICAL: Also update originalCollections to prevent batch update errors
            // When we delete a machine, it's no longer in the report
            originalCollections: prev.originalCollections.filter(
              m => m._id !== entryId
            ),
            // Unlock location if no machines remain
            lockedLocationId: newLockedLocationId,
            isProcessing: false,
          };
        });
        
        toast.success(
          entryToDeleteData?.machineCustomName 
            ? `Removed ${entryToDeleteData.machineCustomName} from collection`
            : 'Collection removed successfully'
        );
      } catch (error) {
        console.error('📱 Mobile Edit: Failed to delete collection:', error);
        setModalState(prev => ({ ...prev, isProcessing: false }));
        toast.error('Failed to remove collection. Please try again.');
      }
    },
    [setStoreCollectedMachines, setStoreLockedLocation, modalState.collectedMachines]
  );

  // Edit machine in collection list
  const editMachineInList = useCallback(
    async (entry: CollectionDocument) => {
      // First check if machine is already in availableMachines
      let machine = modalState.availableMachines.find(
        m => m._id === entry.machineId
      );

      // If not found, try to load machines from the location
      if (!machine && entry.location) {
        // Find the location
        const location = locations.find(loc => loc.name === entry.location);
        if (location && location.machines) {
          machine = location.machines.find(
            m => String(m._id) === entry.machineId
          );

          // Update available machines
          setModalState(prev => ({
            ...prev,
            availableMachines: location.machines,
            selectedLocation: String(location._id),
            selectedLocationName: location.name,
          }));

          // Persist to Zustand store
          setStoreAvailableMachines(location.machines);
          setStoreSelectedLocation(String(location._id), location.name);
        }
      }

      if (!machine) {
        // Machine data not found - handle gracefully
        return;
      }

      setModalState(prev => ({
        ...prev,
        selectedMachine: String(machine._id),
        selectedMachineData: machine,
        editingEntryId: entry._id, // Track which entry we're editing
        isFormVisible: true,
        isCollectedListVisible: false,
        formData: {
          metersIn: entry.metersIn.toString(),
          metersOut: entry.metersOut.toString(),
          ramClear: entry.ramClear || false,
          ramClearMetersIn: entry.ramClearMetersIn?.toString() || '',
          ramClearMetersOut: entry.ramClearMetersOut?.toString() || '',
          notes: entry.notes || '',
          collectionTime: new Date(entry.timestamp),
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

  // Update collection report
  const updateCollectionReportHandler = useCallback(async () => {
    if (collectedMachines.length === 0) {
      return;
    }

    if (!selectedLocationId || !selectedLocationName) {
      return;
    }

    // Check if user has unsaved form changes for currently selected machine
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

        // Check if form values differ from saved values
        if (
          formMetersIn !== savedMetersIn ||
          formMetersOut !== savedMetersOut
        ) {
          toast.warning(
            `Unsaved meter changes detected for ${modalState.selectedMachineData.name || modalState.selectedMachineData.serialNumber}. ` +
              `Current form: In=${formMetersIn}, Out=${formMetersOut}. ` +
              `Saved values: In=${savedMetersIn}, Out=${savedMetersOut}. ` +
              `Please update the machine entry before updating the report.`,
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
    // This includes: machine selected OR any meter values entered OR notes entered
    if (
      !modalState.editingEntryId &&
      (modalState.selectedMachineData || 
       modalState.formData.metersIn || 
       modalState.formData.metersOut || 
       modalState.formData.notes?.trim())
    ) {
      const enteredMetersIn = modalState.formData.metersIn
        ? Number(modalState.formData.metersIn)
        : 0;
      const enteredMetersOut = modalState.formData.metersOut
        ? Number(modalState.formData.metersOut)
        : 0;
      const hasNotes = modalState.formData.notes?.trim().length > 0;

      // If ANY data has been entered (machine selected, meters entered, or notes added)
      if (modalState.selectedMachineData || enteredMetersIn !== 0 || enteredMetersOut !== 0 || hasNotes) {
        toast.error(
          `You have unsaved machine data. ` +
            (modalState.selectedMachineData ? `Machine: ${modalState.selectedMachineData.name || modalState.selectedMachineData.serialNumber}. ` : '') +
            (enteredMetersIn !== 0 || enteredMetersOut !== 0 ? `Meters: In=${enteredMetersIn}, Out=${enteredMetersOut}. ` : '') +
            (hasNotes ? `Notes: "${modalState.formData.notes.substring(0, 30)}${modalState.formData.notes.length > 30 ? '...' : ''}". ` : '') +
            `Please add the machine to the list or cancel before updating the report.`,
          {
            duration: 10000,
            position: 'top-left',
          }
        );
        return;
      }
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

      console.warn('📱 Updating collection report:', {
        reportId,
        collectedMachinesCount: collectedMachines.length,
        locationName: selectedLocationName,
        locationId: selectedLocationId,
      });

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

      for (const current of collectedMachines) {
        const original = modalState.originalCollections.find(
          o => o._id === current._id
        );
        if (original) {
          // Check if meters changed
          const metersInChanged = current.metersIn !== original.metersIn;
          const metersOutChanged = current.metersOut !== original.metersOut;

          if (metersInChanged || metersOutChanged) {
            console.warn(
              `🔍 Detected changes for machine ${current.machineId}:`,
              {
                originalMetersIn: original.metersIn,
                currentMetersIn: current.metersIn,
                originalMetersOut: original.metersOut,
                currentMetersOut: current.metersOut,
              }
            );

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
          // We need to create its collection history entry
          console.warn(`✨ Detected NEW machine added: ${current.machineId}`, {
            machineId: current.machineId,
            metersIn: current.metersIn,
            metersOut: current.metersOut,
            collectionId: current._id,
          });

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
        console.warn(
          `🔄 Calling batch update API for ${changes.length} machine(s)`
        );
        // CRITICAL: Use PATCH for updating, not POST
        const batchResponse = await axios.patch(
          `/api/collection-reports/${reportId}/update-history`,
          { changes }
        );

        if (!batchResponse.data.success) {
          toast.dismiss('mobile-update-report-toast');
          toast.error('Failed to update machine histories. Please try again.');
          return;
        }

        console.warn('✅ Machine histories updated successfully');
        toast.dismiss('mobile-update-report-toast');
        toast.success(
          `Updated ${changes.length} machine histories successfully!`
        );
        toast.loading('Updating collection report...', {
          id: 'mobile-update-report-toast',
        });
      } else {
        console.warn('ℹ️ No machine meter changes detected');
      }

      // PHASE 2: Update collection report financials
      const payload = {
        variance:
          modalState.financials.variance &&
          modalState.financials.variance.trim() !== ''
            ? Number(modalState.financials.variance)
            : 0,
        previousBalance:
          modalState.financials.previousBalance &&
          modalState.financials.previousBalance.trim() !== ''
            ? Number(modalState.financials.previousBalance)
            : 0,
        currentBalance: 0,
        amountToCollect: Number(modalState.financials.amountToCollect) || 0,
        amountCollected:
          modalState.financials.collectedAmount &&
          modalState.financials.collectedAmount.trim() !== ''
            ? Number(modalState.financials.collectedAmount)
            : 0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes:
          modalState.financials.taxes &&
          modalState.financials.taxes.trim() !== ''
            ? Number(modalState.financials.taxes)
            : 0,
        advance:
          modalState.financials.advance &&
          modalState.financials.advance.trim() !== ''
            ? Number(modalState.financials.advance)
            : 0,
        collectorName: getUserDisplayName(user),
        locationName: selectedLocationName,
        locationReportId: reportId,
        location: selectedLocationId || '',
        totalDrop: 0,
        totalCancelled: 0,
        totalGross: 0,
        totalSasGross: 0,
        timestamp: new Date().toISOString(),
        varianceReason: modalState.financials.varianceReason,
        reasonShortagePayment: modalState.financials.reasonForShortagePayment,
        balanceCorrection: Number(modalState.financials.balanceCorrection) || 0,
        balanceCorrectionReas: modalState.financials.balanceCorrectionReason,
        machines: collectedMachines.map(entry => ({
          machineId: entry.machineId,
          machineName: entry.machineName,
          collectionTime:
            entry.timestamp instanceof Date
              ? entry.timestamp.toISOString()
              : new Date(entry.timestamp).toISOString(),
          metersIn: entry.metersIn,
          metersOut: entry.metersOut,
          notes: entry.notes,
          useCustomTime: true,
          selectedDate:
            entry.timestamp instanceof Date
              ? entry.timestamp.toISOString().split('T')[0]
              : new Date(entry.timestamp).toISOString().split('T')[0],
          timeHH:
            entry.timestamp instanceof Date
              ? String(entry.timestamp.getHours()).padStart(2, '0')
              : String(new Date(entry.timestamp).getHours()).padStart(2, '0'),
          timeMM:
            entry.timestamp instanceof Date
              ? String(entry.timestamp.getMinutes()).padStart(2, '0')
              : String(new Date(entry.timestamp).getMinutes()).padStart(2, '0'),
        })),
      };

      // Validate payload before sending
      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Update the collection report
      await updateReportAPI(reportId, payload);

      toast.dismiss('mobile-update-report-toast');
      toast.success('Collection report updated successfully!');

      // Clear unsaved edits flag
      setModalState(prev => ({ ...prev, hasUnsavedEdits: false }));

      // Refresh and close
      onRefresh();
      onClose();
    } catch (error) {
      toast.dismiss('mobile-update-report-toast');
      console.error('❌ Failed to update collection report:', error);
      toast.error(
        `Failed to update collection report: ${
          error instanceof Error ? error.message : 'Unknown error'
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
    modalState.formData.metersIn,
    modalState.formData.metersOut,
    modalState.formData.notes,
    user,
    onRefresh,
    onClose,
    reportId,
  ]);

  // Don't reset modal state when closed - preserve state like desktop modal

  // Update modal state when props change (sync with desktop modal)
  useEffect(() => {
    setModalState(prev => {
      // Only update if the values have actually changed to prevent infinite loops
      const hasLocationChanged =
        prev.selectedLocation !== (selectedLocationId || null);
      const hasLocationNameChanged =
        prev.selectedLocationName !== (selectedLocationName || '');
      const hasLockedLocationChanged =
        prev.lockedLocationId !== (lockedLocationId || undefined);
      const hasAvailableMachinesChanged =
        JSON.stringify(prev.availableMachines) !==
        JSON.stringify(availableMachines);
      const hasCollectedMachinesChanged =
        JSON.stringify(prev.collectedMachines) !==
        JSON.stringify(collectedMachines);

      // Only update if something has actually changed
      if (
        !hasLocationChanged &&
        !hasLocationNameChanged &&
        !hasLockedLocationChanged &&
        !hasAvailableMachinesChanged &&
        !hasCollectedMachinesChanged
      ) {
        return prev;
      }

      return {
        ...prev,
        selectedLocation: selectedLocationId || null,
        selectedLocationName: selectedLocationName || '',
        lockedLocationId: lockedLocationId || undefined,
        availableMachines: availableMachines,
        collectedMachines: collectedMachines,
      };
    });
  }, [
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
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

          console.warn('📝 Loading report data for reportId:', reportId);

          // Fetch report data
          const reportResponse = await axios.get(
            `/api/collection-report/${reportId}`
          );
          const reportData = reportResponse.data;

          console.warn('📝 Report data loaded:', reportData.locationName);

          // CRITICAL: If report has isEditing: true, there are unsaved changes
          // This prevents users from closing the auto-reopened modal without saving
          if (reportData.isEditing) {
            console.warn(
              '⚠️ Report has isEditing: true - marking as having unsaved edits'
            );
            setModalState(prev => ({ ...prev, hasUnsavedEdits: true }));
          }

          // Fetch collections for this report
          const collectionsResponse = await axios.get(
            `/api/collections?locationReportId=${reportId}&_t=${Date.now()}`
          );
          const collections = collectionsResponse.data;

          console.warn('📝 Collections loaded:', collections.length);

          // Find the matching location
          const matchingLocation = locations.find(
            loc => loc.name === reportData.locationName
          );

          if (matchingLocation) {
            console.warn(
              '📝 Matching location found:',
              matchingLocation.name,
              'with',
              matchingLocation.machines?.length || 0,
              'machines'
            );

            // Update Zustand store FIRST
            setStoreSelectedLocation(
              String(matchingLocation._id),
              matchingLocation.name
            );
            setStoreAvailableMachines(matchingLocation.machines || []);
            setStoreCollectedMachines(collections);

            console.warn(
              '📝 Zustand store updated with',
              collections.length,
              'collected machines'
            );

            // Update modal state
            setModalState(prev => ({
              ...prev,
              selectedLocation: String(matchingLocation._id),
              selectedLocationName: matchingLocation.name,
              collectedMachines: collections,
              originalCollections: JSON.parse(JSON.stringify(collections)), // CRITICAL: Store for dirty tracking
              availableMachines: matchingLocation.machines || [],
              hasUnsavedEdits: reportData.isEditing || false, // Set based on report's isEditing flag
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

            console.warn('📝 Modal state updated successfully');
          } else {
            console.error(
              '📝 Matching location not found for:',
              reportData.locationName
            );
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

  // Additional effect to handle case where locations load after modal opens
  useEffect(() => {
    if (
      show &&
      reportId &&
      locations &&
      locations.length > 0 &&
      !modalState.selectedLocation
    ) {
      console.warn(
        '📝 Locations became available after modal opened, loading report data'
      );

      const loadReportData = async () => {
        try {
          setModalState(prev => ({
            ...prev,
            isLoadingCollections: true,
            isLoadingMachines: true,
          }));

          // Fetch report data
          const reportResponse = await axios.get(
            `/api/collection-report/${reportId}`
          );
          const reportData = reportResponse.data;

          // Fetch collections for this report
          const collectionsResponse = await axios.get(
            `/api/collections?locationReportId=${reportId}&_t=${Date.now()}`
          );
          const collections = collectionsResponse.data;

          // Find the matching location
          const matchingLocation = locations.find(
            loc => loc.name === reportData.locationName
          );

          if (matchingLocation) {
            // Update Zustand store FIRST
            setStoreSelectedLocation(
              String(matchingLocation._id),
              matchingLocation.name
            );
            setStoreAvailableMachines(matchingLocation.machines || []);
            setStoreCollectedMachines(collections);

            // Update modal state
            setModalState(prev => ({
              ...prev,
              selectedLocation: String(matchingLocation._id),
              selectedLocationName: matchingLocation.name,
              collectedMachines: collections,
              originalCollections: JSON.parse(JSON.stringify(collections)), // CRITICAL: Store for dirty tracking
              availableMachines: matchingLocation.machines || [],
              isLoadingCollections: false,
              isLoadingMachines: false,
            }));
          }
        } catch (error) {
          console.error('Error loading report data (delayed):', error);
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
    modalState.selectedLocation,
    setStoreSelectedLocation,
    setStoreAvailableMachines,
    setStoreCollectedMachines,
  ]);

  // Detect dirty state by comparing current vs original collections
  useEffect(() => {
    if (
      modalState.originalCollections.length === 0 ||
      collectedMachines.length === 0
    ) {
      setModalState(prev => ({ ...prev, hasUnsavedEdits: false }));
      return;
    }

    let hasChanges = false;
    for (const current of collectedMachines) {
      const original = modalState.originalCollections.find(
        o => o._id === current._id
      );
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

    setModalState(prev => ({ ...prev, hasUnsavedEdits: hasChanges }));
  }, [collectedMachines, modalState.originalCollections]);

  // Add beforeunload warning when there are unsaved changes
  useEffect(() => {
    if (!show || !modalState.hasUnsavedEdits) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [show, modalState.hasUnsavedEdits]);

  // Helper function to get location ID from machine ID using locations prop
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

  // Fetch existing collections when modal opens (like desktop component)
  const fetchExistingCollections = useCallback(
    async (locationId?: string) => {
      setModalState(prev => ({ ...prev, isLoadingCollections: true }));
      try {
        console.warn(
          '🔄 Mobile: Fetching existing collections for location:',
          locationId
        );

        let url = '/api/collections';
        if (locationId) {
          url += `?locationId=${locationId}`;
        }
        // Only get incomplete collections (no locationReportId)
        url += `${locationId ? '&' : '?'}incompleteOnly=true`;

        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
          console.warn(
            '🔄 Mobile: Found existing collections:',
            response.data.length
          );

          // Update Zustand store with existing collections
          setStoreCollectedMachines(response.data);

          // Get the proper location ID from the first machine
          const firstCollection = response.data[0];
          if (firstCollection.machineId) {
            const machineLocationId = getLocationIdFromMachine(
              firstCollection.machineId
            );
            if (machineLocationId) {
              console.warn(
                '🔄 Mobile: Auto-selecting location from first machine:',
                machineLocationId
              );

              // Find the matching location and set it
              const matchingLocation = locations.find(
                loc => String(loc._id) === machineLocationId
              );
              if (matchingLocation) {
                setStoreSelectedLocation(
                  machineLocationId,
                  matchingLocation.name
                );
                setStoreLockedLocation(machineLocationId);
              }
            }
          }
        } else {
          console.warn('🔄 Mobile: No existing collections found');
          // Clear any existing state if no collections found
          setStoreCollectedMachines([]);
        }
      } catch (error) {
        console.error('Error fetching existing collections:', error);
        setStoreCollectedMachines([]);
      } finally {
        setModalState(prev => ({ ...prev, isLoadingCollections: false }));
      }
    },
    [
      locations,
      setStoreCollectedMachines,
      setStoreSelectedLocation,
      setStoreLockedLocation,
      getLocationIdFromMachine,
    ]
  );

  // Fetch existing collections when modal opens (server-side driven, no local state dependency)
  useEffect(() => {
    if (show && locations.length > 0) {
      console.warn('🔄 Mobile: Modal opened - fetching fresh collections data');
      // Always fetch fresh data when modal opens, regardless of current state
      fetchExistingCollections(selectedLocationId);
    }
  }, [show, selectedLocationId, fetchExistingCollections, locations.length]);

  // Sync mobile state with Zustand store for proper state sharing
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

  // Reset modal state when modal opens to ensure proper view is shown
  useEffect(() => {
    if (show) {
      console.warn(
        '📱 Modal opened with',
        collectedMachines.length,
        'collected machines'
      );

      // If we have collected machines, show the collected machines list
      if (collectedMachines.length > 0) {
        console.warn('📱 Showing collected machines list');
        setModalState(prev => ({
          ...prev,
          isMachineListVisible: false,
          isFormVisible: false,
          isCollectedListVisible: true,
        }));
      } else if (collectedMachines.length === 0) {
        console.warn('📱 No collected machines, showing main screen');
        // Only reset panels if we have no collected machines (fresh start)
        setModalState(prev => ({
          ...prev,
          isMachineListVisible: false,
          isFormVisible: false,
          isCollectedListVisible: false,
        }));
      }
    }
  }, [show, setModalState, collectedMachines]);

  if (!show) return null;

  // Show skeleton loader while modal is loading
  if (modalState.isLoadingMachines || modalState.isLoadingCollections) {
    return <MobileCollectionModalSkeleton />;
  }

  return (
    <>
      <Dialog
        open={show}
        onOpenChange={isOpen => {
          // Prevent closing if confirmation dialogs are open
          if (
            !isOpen &&
            (showCreateReportConfirmation ||
              showDeleteConfirmation ||
              modalState.showViewMachineConfirmation ||
              showUnsavedChangesWarning)
          ) {
            return;
          }
          // Check for unsaved edits before closing
          if (!isOpen && modalState.hasUnsavedEdits) {
            setShowUnsavedChangesWarning(true);
            return;
          }
          // Check if user has unsaved machine data before closing
          if (!isOpen && !modalState.editingEntryId && 
              (modalState.selectedMachineData || 
               modalState.formData.metersIn || 
               modalState.formData.metersOut || 
               modalState.formData.notes?.trim())) {
            const enteredMetersIn = modalState.formData.metersIn ? Number(modalState.formData.metersIn) : 0;
            const enteredMetersOut = modalState.formData.metersOut ? Number(modalState.formData.metersOut) : 0;
            const hasNotes = modalState.formData.notes?.trim().length > 0;
            
            if (modalState.selectedMachineData || enteredMetersIn !== 0 || enteredMetersOut !== 0 || hasNotes) {
              toast.error(
                `You have unsaved machine data. Please add the machine to the list or cancel before closing.`,
                {
                  duration: 8000,
                  position: 'top-left',
                }
              );
              setShowUnsavedChangesWarning(true);
              return;
            }
          }
          if (!isOpen) {
            onClose();
          }
        }}
      >
        {/* Custom overlay with higher z-index */}
        {show && (
          <div className="fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm" />
        )}
        <DialogPortal>
          <DialogContent
            className="left-[50%] top-[50%] z-[110] m-0 h-full max-w-full translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-t-xl border-none bg-white p-0 shadow-xl sm:max-w-[80%] md:h-[90vh] md:rounded-xl"
            style={{ zIndex: 110 }}
          >
            {/* DialogTitle for accessibility - hidden visually */}
            <DialogTitle className="sr-only">
              Edit Collection Report
            </DialogTitle>

            {/* Main Content Area - ONLY LOCATION SELECTION VISIBLE BY DEFAULT */}
            <div className="flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div className="rounded-t-xl border-b bg-white p-4 md:rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Edit Collection Report</h2>
                </div>
              </div>

              {/* Summary Info - Show when location is selected */}
              {(lockedLocationId ||
                selectedLocationId ||
                modalState.selectedLocation) && (
                <div className="border-b bg-blue-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600">Location:</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalState.selectedLocationName ||
                          selectedLocationName ||
                          'Not selected'}
                      </p>
                    </div>
                    {(collectedMachines || modalState.collectedMachines || [])
                      .length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-600">
                          Machines Collected:
                        </p>
                        <p className="text-sm font-semibold text-green-600">
                          {
                            (
                              collectedMachines ||
                              modalState.collectedMachines ||
                              []
                            ).length
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location Selector - ALWAYS VISIBLE */}
              <div className="flex flex-1 flex-col overflow-hidden p-4">
                {modalState.isLoadingCollections ? (
                  <>
                    <div className="space-y-4">
                      <div className="py-4 text-center">
                        <p className="font-medium text-blue-600">
                          Checking if any collection reports is in progress
                          first
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Please wait while we check for incomplete collections
                        </p>
                      </div>
                      <div>
                        <Skeleton className="mb-2 h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3">
                        <Skeleton className="mb-2 h-4 w-48" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="mb-2 block text-sm font-medium">
                      Select Location
                    </label>
                    <LocationSelect
                      value={
                        lockedLocationId ||
                        selectedLocationId ||
                        modalState.selectedLocation ||
                        ''
                      }
                      onValueChange={transitions.selectLocation}
                      locations={locations.map(loc => ({
                        _id: String(loc._id),
                        name: loc.name,
                      }))}
                      placeholder="Choose a location..."
                      disabled={true} // Location is locked in edit mode
                      className="w-full"
                    />

                    <p className="mt-2 text-xs italic text-gray-500">
                      Location cannot be changed when editing a report
                    </p>

                    {/* Main Screen Buttons - Only show when location is selected */}
                    {(lockedLocationId ||
                      selectedLocationId ||
                      modalState.selectedLocation) && (
                      <div className="mt-6 space-y-3">
                        {/* Open Report Button - Only show when a machine is selected */}
                        {modalState.selectedMachine &&
                          modalState.selectedMachineData && (
                            <button
                              onClick={() => {
                                pushNavigation('main'); // Track that we came from main screen
                                setModalState(prev => ({
                                  ...prev,
                                  isFormVisible: true,
                                  isMachineListVisible: false,
                                  isCollectedListVisible: false,
                                }));
                              }}
                              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
                            >
                              Open Report
                            </button>
                          )}

                        {/* View Form Button - Show when there are collected machines */}
                        {modalState.collectedMachines.length > 0 && (
                          <button
                            onClick={() => {
                              pushNavigation('main'); // Track that we came from main screen
                              setModalState(prev => ({
                                ...prev,
                                isFormVisible: true,
                                isMachineListVisible: false,
                                isCollectedListVisible: false,
                                isViewingFinancialForm: true, // Show financial form instead of machine list
                              }));
                            }}
                            className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"
                          >
                            View Form ({modalState.collectedMachines.length}{' '}
                            machine
                            {modalState.collectedMachines.length !== 1
                              ? 's'
                              : ''}
                            )
                          </button>
                        )}

                        {/* View Collected Machines Button */}
                        <button
                          onClick={() => {
                            if (modalState.collectedMachines.length === 0) {
                              return;
                            }
                            pushNavigation('main'); // Track that we came from main screen
                            setModalState(prev => ({
                              ...prev,
                              isCollectedListVisible: true,
                              isMachineListVisible: false,
                              isFormVisible: false,
                              isViewingFinancialForm: false, // Show machine list instead of financial form
                            }));
                          }}
                          className={`w-full rounded-lg py-3 font-medium ${
                            modalState.collectedMachines.length === 0
                              ? 'cursor-not-allowed bg-gray-400 text-gray-200'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          View Collected Machines (
                          {modalState.collectedMachines.length})
                        </button>
                      </div>
                    )}

                    {/* Machines List - Show when isMachineListVisible is true */}
                    {modalState.isMachineListVisible && (
                      <div className="mt-6 flex min-h-0 flex-1 flex-col">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            Machines for{' '}
                            {(() => {
                              const locationIdToUse =
                                lockedLocationId ||
                                selectedLocationId ||
                                modalState.selectedLocation;
                              const location = locations.find(
                                l => String(l._id) === locationIdToUse
                              );
                              return (
                                location?.name ||
                                modalState.selectedLocationName ||
                                selectedLocationName
                              );
                            })()}
                          </h3>
                          <button
                            onClick={() => {
                              setModalState(prev => ({
                                ...prev,
                                isMachineListVisible: false,
                              }));
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <ArrowLeft className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Search bar for machines */}
                        {availableMachines.length > 3 && (
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="Search machines by name or serial number..."
                              value={modalState.searchTerm}
                              onChange={e =>
                                setModalState(prev => ({
                                  ...prev,
                                  searchTerm: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {/* Scrollable machine list container */}
                        <div
                          className="mobile-collection-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pb-4"
                          style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#d1d5db #f3f4f6',
                          }}
                        >
                          {modalState.isLoadingMachines ? (
                            <div className="space-y-3">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div
                                  key={i}
                                  className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 shadow"
                                >
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-3 w-1/2" />
                                  <Skeleton className="h-3 w-2/3" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            (() => {
                              // Filter machines based on search term
                              const filteredMachines = availableMachines.filter(
                                machine => {
                                  if (!modalState.searchTerm) return true;
                                  const searchLower =
                                    modalState.searchTerm.toLowerCase();
                                  return (
                                    (machine.serialNumber &&
                                      machine.serialNumber
                                        .toLowerCase()
                                        .includes(searchLower)) ||
                                    (machine.custom?.name &&
                                      machine.custom.name
                                        .toLowerCase()
                                        .includes(searchLower)) ||
                                    (machine.name &&
                                      machine.name
                                        .toLowerCase()
                                        .includes(searchLower))
                                  );
                                }
                              );

                              const sortedMachines =
                                sortMachinesAlphabetically(filteredMachines);

                              return sortedMachines.map(machine => {
                                const isSelected =
                                  modalState.selectedMachine ===
                                  String(machine._id);
                                const isCollected = (
                                  collectedMachines ||
                                  modalState.collectedMachines ||
                                  []
                                ).some(
                                  collected =>
                                    String(collected.machineId) ===
                                    String(machine._id)
                                );

                                return (
                                  <div
                                    key={String(machine._id)}
                                    className={`rounded-lg border-2 p-4 transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : isCollected
                                          ? 'border-green-300 bg-green-50 shadow-sm'
                                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                    }`}
                                  >
                                    <div
                                      className="cursor-pointer"
                                      onClick={() => {
                                        if (
                                          isCollected &&
                                          !modalState.editingEntryId
                                        ) {
                                          toast.info(
                                            `${
                                              machine.name ||
                                              machine.serialNumber
                                            } is already in the list.`,
                                            { position: 'top-left' }
                                          );
                                          return;
                                        }

                                        setModalState(prev => ({
                                          ...prev,
                                          selectedMachine: String(machine._id),
                                          selectedMachineData: machine,
                                          isFormVisible: true,
                                          isMachineListVisible: false,
                                        }));
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-primary">
                                            {machine.name ||
                                              machine.serialNumber}
                                          </h4>
                                          <p className="text-sm text-gray-600">
                                            Serial: {machine.serialNumber}
                                          </p>
                                          <div className="mt-2 flex gap-4">
                                            <p className="text-xs text-gray-500">
                                              Prev In:{' '}
                                              {machine.collectionMeters
                                                ?.metersIn || 0}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              Prev Out:{' '}
                                              {machine.collectionMeters
                                                ?.metersOut || 0}
                                            </p>
                                          </div>
                                        </div>
                                        {isCollected && (
                                          <span className="text-xs font-semibold text-green-600">
                                            Added
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          )}
                        </div>
                      </div>
                    )}

                    {/* Machines List - Show below buttons when location is selected (legacy) */}
                    {(lockedLocationId ||
                      selectedLocationId ||
                      modalState.selectedLocation) &&
                      !modalState.isMachineListVisible && (
                        <div className="mt-6 flex min-h-0 flex-1 flex-col">
                          <h3 className="mb-4 text-lg font-semibold">
                            Machines for{' '}
                            {(() => {
                              const locationIdToUse =
                                lockedLocationId ||
                                selectedLocationId ||
                                modalState.selectedLocation;
                              const location = locations.find(
                                l => String(l._id) === locationIdToUse
                              );
                              return (
                                location?.name ||
                                modalState.selectedLocationName ||
                                selectedLocationName
                              );
                            })()}
                          </h3>

                          {/* Search bar for machines */}
                          {availableMachines.length > 3 && (
                            <div className="mb-4">
                              <input
                                type="text"
                                placeholder="Search machines by name or serial number..."
                                value={modalState.searchTerm}
                                onChange={e =>
                                  setModalState(prev => ({
                                    ...prev,
                                    searchTerm: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}

                          {/* Scrollable machine list container */}
                          <div
                            className="mobile-collection-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pb-4"
                            style={{
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#d1d5db #f3f4f6',
                            }}
                          >
                            {modalState.isLoadingMachines ? (
                              // Skeleton loaders while fetching machines
                              [1, 2, 3, 4, 5].map(i => (
                                <div
                                  key={i}
                                  className="animate-pulse rounded-lg border bg-gray-50 p-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="mb-2 h-4 w-3/4 rounded bg-gray-300"></div>
                                      <div className="h-3 w-1/2 rounded bg-gray-300"></div>
                                    </div>
                                    <div className="h-8 w-16 rounded bg-gray-300"></div>
                                  </div>
                                </div>
                              ))
                            ) : availableMachines.length > 0 ? (
                              (() => {
                                // Filter machines based on search term
                                const filteredMachines =
                                  availableMachines.filter(machine => {
                                    if (!modalState.searchTerm.trim())
                                      return true;
                                    const searchTerm =
                                      modalState.searchTerm.toLowerCase();
                                    const machineName = (
                                      machine.name || ''
                                    ).toLowerCase();
                                    const serialNumber = (
                                      machine.serialNumber || ''
                                    ).toLowerCase();
                                    return (
                                      machineName.includes(searchTerm) ||
                                      serialNumber.includes(searchTerm)
                                    );
                                  });

                                // Sort the filtered machines alphabetically and numerically
                                const sortedMachines =
                                  sortMachinesAlphabetically(filteredMachines);

                                return sortedMachines.map(machine => {
                                  const isSelected =
                                    modalState.selectedMachine ===
                                    String(machine._id);
                                  const isCollected = (
                                    collectedMachines ||
                                    modalState.collectedMachines ||
                                    []
                                  ).some(
                                    collected =>
                                      String(collected.machineId) ===
                                      String(machine._id)
                                  );

                                  return (
                                    <div
                                      key={String(machine._id)}
                                      className={`rounded-lg border-2 p-4 transition-all ${
                                        isSelected
                                          ? 'border-blue-500 bg-blue-50 shadow-md'
                                          : isCollected
                                            ? 'border-green-300 bg-green-50 shadow-sm'
                                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <p className="break-words text-sm font-semibold text-primary">
                                            {formatMachineDisplayNameWithBold(
                                              machine
                                            )}
                                          </p>
                                          <div className="mt-1 space-y-1 text-xs text-gray-600">
                                            <p className="flex flex-col sm:flex-row sm:gap-2">
                                              <span>
                                                Prev In:{' '}
                                                {machine.collectionMeters
                                                  ?.metersIn || 0}
                                              </span>
                                              <span className="hidden sm:inline">
                                                |
                                              </span>
                                              <span>
                                                Prev Out:{' '}
                                                {machine.collectionMeters
                                                  ?.metersOut || 0}
                                              </span>
                                            </p>
                                          </div>
                                          {isCollected && (
                                            <div className="mt-1 flex items-center">
                                              <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                                              <p className="text-xs font-semibold text-green-600">
                                                Added to Collection
                                              </p>
                                            </div>
                                          )}
                                          {isSelected && (
                                            <div className="mt-1 flex items-center">
                                              <div className="mr-2 h-2 w-2 rounded-full bg-blue-500"></div>
                                              <p className="text-xs font-semibold text-blue-600">
                                                Selected
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => {
                                            if (isSelected) {
                                              // Unselect the machine
                                              setModalState(prev => ({
                                                ...prev,
                                                selectedMachine: null,
                                                selectedMachineData: null,
                                              }));
                                            } else {
                                              // Select the machine
                                              transitions.selectMachine(
                                                machine
                                              );
                                            }
                                          }}
                                          disabled={isCollected}
                                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                            isCollected
                                              ? 'cursor-not-allowed border border-green-300 bg-green-100 text-green-700'
                                              : isSelected
                                                ? 'border border-red-600 bg-red-600 text-white hover:bg-red-700'
                                                : 'border border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                          }`}
                                        >
                                          {isCollected
                                            ? '✓ Added'
                                            : isSelected
                                              ? 'Unselect'
                                              : 'Select'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                });
                              })()
                            ) : (
                              <div className="py-8 text-center text-gray-500">
                                <p>No machines found for this location.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>

            {/* Form Panel - Slide Up Overlay */}
            <div
              className={`fixed inset-0 z-[90] transform bg-white transition-all duration-300 ease-in-out md:inset-x-[10%] md:rounded-xl ${
                modalState.isFormVisible
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-full opacity-0'
              } `}
            >
              {modalState.isFormVisible && (
                <div className="flex h-full flex-col">
                  {/* Form Header */}
                  <div className="flex items-center justify-between border-b bg-blue-600 p-4 text-white">
                    <button
                      onClick={() => {
                        popNavigation(); // Use proper back navigation
                      }}
                      className="rounded-full p-2 hover:bg-blue-700"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-lg font-bold">
                      {modalState.editingEntryId
                        ? `Edit ${
                            modalState.selectedMachineData?.name || 'Machine'
                          }`
                        : modalState.selectedMachineData?.name || 'Machine'}
                    </h3>
                    <button
                      onClick={() => {
                        pushNavigation('form'); // Track that we came from form panel
                        setModalState(prev => ({
                          ...prev,
                          isCollectedListVisible: true,
                          isViewingFinancialForm: false, // Show machine list instead of financial form
                        }));
                      }}
                      className="rounded-full p-2 hover:bg-blue-700"
                    >
                      <span className="text-sm">
                        List ({modalState.collectedMachines.length})
                      </span>
                    </button>
                  </div>

                  {/* Form Content */}
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {/* Machine Info Display */}
                    <div className="relative rounded-lg bg-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">
                            {modalState.selectedMachineData
                              ? formatMachineDisplayNameWithBold(
                                  modalState.selectedMachineData
                                )
                              : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            SMIB:{' '}
                            {modalState.selectedMachineData?.relayId ||
                              modalState.selectedMachineData?.smbId ||
                              'N/A'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Current In:{' '}
                            {modalState.selectedMachineData?.collectionMeters
                              ?.metersIn || 0}{' '}
                            | Current Out:{' '}
                            {modalState.selectedMachineData?.collectionMeters
                              ?.metersOut || 0}
                          </p>
                        </div>
                        {modalState.selectedMachineData && (
                          <ExternalLink
                            className="ml-2 h-5 w-5 cursor-pointer text-blue-600 transition-transform hover:scale-110"
                            onClick={e => {
                              e.stopPropagation();
                              setModalState(prev => ({
                                ...prev,
                                showViewMachineConfirmation: true,
                              }));
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Collection Time */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Collection Time
                      </label>
                      <PCDateTimePicker
                        date={modalState.formData.collectionTime}
                        setDate={date => {
                          if (
                            date &&
                            date instanceof Date &&
                            !isNaN(date.getTime())
                          ) {
                            setModalState(prev => ({
                              ...prev,
                              formData: {
                                ...prev.formData,
                                collectionTime: date,
                              },
                            }));
                          }
                        }}
                        disabled={modalState.isProcessing}
                        placeholder="Select collection time"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This time applies to all machines in the collection
                        report
                      </p>
                    </div>

                    {/* Meter Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Meters In: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="0"
                          value={modalState.formData.metersIn}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              setModalState(prev => ({
                                ...prev,
                                formData: {
                                  ...prev.formData,
                                  metersIn: val,
                                },
                              }));
                            }
                          }}
                          disabled={!inputsEnabled || modalState.isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Prev In:{' '}
                          {modalState.selectedMachineData?.collectionMeters
                            ?.metersIn || 0}
                        </p>
                        {/* Regular Meters In Validation - same as desktop */}
                        {modalState.formData.metersIn &&
                          modalState.selectedMachineData?.collectionMeters
                            ?.metersIn &&
                          Number(modalState.formData.metersIn) <
                            Number(
                              modalState.selectedMachineData.collectionMeters
                                .metersIn
                            ) && (
                            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                              <p className="text-xs text-red-600">
                                Warning: Meters In (
                                {modalState.formData.metersIn}) should be higher
                                than or equal to Previous Meters In (
                                {
                                  modalState.selectedMachineData
                                    .collectionMeters.metersIn
                                }
                                )
                              </p>
                            </div>
                          )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Meters Out: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="0"
                          value={modalState.formData.metersOut}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              setModalState(prev => ({
                                ...prev,
                                formData: {
                                  ...prev.formData,
                                  metersOut: val,
                                },
                              }));
                            }
                          }}
                          disabled={!inputsEnabled || modalState.isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Prev Out:{' '}
                          {modalState.selectedMachineData?.collectionMeters
                            ?.metersOut || 0}
                        </p>
                        {/* Regular Meters Out Validation - same as desktop */}
                        {modalState.formData.metersOut &&
                          modalState.selectedMachineData?.collectionMeters
                            ?.metersOut &&
                          Number(modalState.formData.metersOut) <
                            Number(
                              modalState.selectedMachineData.collectionMeters
                                .metersOut
                            ) && (
                            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                              <p className="text-xs text-red-600">
                                Warning: Meters Out (
                                {modalState.formData.metersOut}) should be
                                higher than or equal to Previous Meters Out (
                                {
                                  modalState.selectedMachineData
                                    .collectionMeters.metersOut
                                }
                                )
                              </p>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* RAM Clear Section */}
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={modalState.formData.ramClear}
                          onChange={e => {
                            setModalState(prev => ({
                              ...prev,
                              formData: {
                                ...prev.formData,
                                ramClear: e.target.checked,
                                // Auto-fill RAM Clear meters with previous values when checked - same as desktop
                                ramClearMetersIn: e.target.checked
                                  ? modalState.selectedMachineData?.collectionMeters?.metersIn?.toString() ||
                                    ''
                                  : '',
                                ramClearMetersOut: e.target.checked
                                  ? modalState.selectedMachineData?.collectionMeters?.metersOut?.toString() ||
                                    ''
                                  : '',
                              },
                            }));
                          }}
                          disabled={!inputsEnabled || modalState.isProcessing}
                          className="h-4 w-4 disabled:cursor-not-allowed"
                        />
                        <span>RAM Clear</span>
                      </label>

                      {/* RAM Clear Meter Inputs - Only show when RAM Clear is checked - same as desktop */}
                      {modalState.formData.ramClear && (
                        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
                          <h4 className="mb-3 text-sm font-medium text-blue-800">
                            RAM Clear Meters (Before Rollover)
                          </h4>
                          <p className="mb-3 text-xs text-blue-600">
                            Please enter the last meter readings before the RAM
                            Clear occurred.
                          </p>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-blue-700">
                                RAM Clear Meters In:
                              </label>
                              <input
                                type="text"
                                placeholder="0"
                                value={modalState.formData.ramClearMetersIn}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                                    setModalState(prev => ({
                                      ...prev,
                                      formData: {
                                        ...prev.formData,
                                        ramClearMetersIn: val,
                                      },
                                    }));
                                  }
                                }}
                                disabled={
                                  !inputsEnabled || modalState.isProcessing
                                }
                                className={`w-full rounded-lg border border-blue-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  modalState.formData.ramClearMetersIn &&
                                  modalState.selectedMachineData
                                    ?.collectionMeters?.metersIn &&
                                  Number(modalState.formData.ramClearMetersIn) >
                                    Number(
                                      modalState.selectedMachineData
                                        .collectionMeters.metersIn
                                    )
                                    ? 'border-red-500 focus:border-red-500'
                                    : ''
                                }`}
                              />
                              {/* RAM Clear Meters In Validation - same as desktop */}
                              {modalState.formData.ramClearMetersIn &&
                                modalState.selectedMachineData?.collectionMeters
                                  ?.metersIn &&
                                Number(modalState.formData.ramClearMetersIn) >
                                  Number(
                                    modalState.selectedMachineData
                                      .collectionMeters.metersIn
                                  ) && (
                                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                                    <p className="text-xs text-red-600">
                                      Warning: RAM Clear Meters In (
                                      {modalState.formData.ramClearMetersIn})
                                      should be lower than or equal to Previous
                                      Meters In (
                                      {
                                        modalState.selectedMachineData
                                          .collectionMeters.metersIn
                                      }
                                      )
                                    </p>
                                  </div>
                                )}
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-blue-700">
                                RAM Clear Meters Out:
                              </label>
                              <input
                                type="text"
                                placeholder="0"
                                value={modalState.formData.ramClearMetersOut}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                                    setModalState(prev => ({
                                      ...prev,
                                      formData: {
                                        ...prev.formData,
                                        ramClearMetersOut: val,
                                      },
                                    }));
                                  }
                                }}
                                disabled={
                                  !inputsEnabled || modalState.isProcessing
                                }
                                className={`w-full rounded-lg border border-blue-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  modalState.formData.ramClearMetersOut &&
                                  modalState.selectedMachineData
                                    ?.collectionMeters?.metersOut &&
                                  Number(
                                    modalState.formData.ramClearMetersOut
                                  ) >
                                    Number(
                                      modalState.selectedMachineData
                                        .collectionMeters.metersOut
                                    )
                                    ? 'border-red-500 focus:border-red-500'
                                    : ''
                                }`}
                              />
                              {/* RAM Clear Meters Out Validation - same as desktop */}
                              {modalState.formData.ramClearMetersOut &&
                                modalState.selectedMachineData?.collectionMeters
                                  ?.metersOut &&
                                Number(modalState.formData.ramClearMetersOut) >
                                  Number(
                                    modalState.selectedMachineData
                                      .collectionMeters.metersOut
                                  ) && (
                                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                                    <p className="text-xs text-red-600">
                                      Warning: RAM Clear Meters Out (
                                      {modalState.formData.ramClearMetersOut})
                                      should be lower than or equal to Previous
                                      Meters Out (
                                      {
                                        modalState.selectedMachineData
                                          .collectionMeters.metersOut
                                      }
                                      )
                                    </p>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Notes (for this machine)
                      </label>
                      <textarea
                        value={modalState.formData.notes}
                        onChange={e =>
                          setModalState(prev => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              notes: e.target.value,
                            },
                          }))
                        }
                        disabled={!inputsEnabled || modalState.isProcessing}
                        className="h-20 w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                        placeholder="Machine-specific notes..."
                      />
                    </div>

                    {/* Financial Data (only for first machine) */}
                    {modalState.collectedMachines.length === 0 && (
                      <div className="border-t pt-4">
                        <h4 className="mb-3 text-center font-semibold">
                          Shared Financials for Batch
                        </h4>
                        <div className="space-y-4">
                          {/* Row 1: Taxes and Advance */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-sm font-medium">
                                Taxes
                              </label>
                              <input
                                type="text"
                                placeholder="0"
                                value={modalState.financials.taxes}
                                onChange={e =>
                                  (/^-?\d*\.?\d*$/.test(e.target.value) ||
                                    e.target.value === '') &&
                                  setModalState(prev => ({
                                    ...prev,
                                    financials: {
                                      ...prev.financials,
                                      taxes: e.target.value,
                                    },
                                  }))
                                }
                                disabled={modalState.isProcessing}
                                className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium">
                                Advance
                              </label>
                              <input
                                type="text"
                                placeholder="0"
                                value={modalState.financials.advance}
                                onChange={e =>
                                  (/^-?\d*\.?\d*$/.test(e.target.value) ||
                                    e.target.value === '') &&
                                  setModalState(prev => ({
                                    ...prev,
                                    financials: {
                                      ...prev.financials,
                                      advance: e.target.value,
                                    },
                                  }))
                                }
                                disabled={modalState.isProcessing}
                                className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          {/* Row 2: Variance */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Variance
                            </label>
                            <input
                              type="text"
                              placeholder="0"
                              value={modalState.financials.variance}
                              onChange={e =>
                                (/^-?\d*\.?\d*$/.test(e.target.value) ||
                                  e.target.value === '') &&
                                setModalState(prev => ({
                                  ...prev,
                                  financials: {
                                    ...prev.financials,
                                    variance: e.target.value,
                                  },
                                }))
                              }
                              disabled={modalState.isProcessing}
                              className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Row 3: Variance Reason */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Variance Reason
                            </label>
                            <textarea
                              placeholder="Variance Reason"
                              value={modalState.financials.varianceReason}
                              onChange={e =>
                                setModalState(prev => ({
                                  ...prev,
                                  financials: {
                                    ...prev.financials,
                                    varianceReason: e.target.value,
                                  },
                                }))
                              }
                              className="min-h-[80px] w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={modalState.isProcessing}
                            />
                          </div>

                          {/* Row 4: Amount To Collect */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Amount To Collect:{' '}
                              <span className="text-red-500">*</span>{' '}
                              <span className="text-xs text-gray-400">
                                (Auto-calculated)
                              </span>
                            </label>
                            <input
                              type="text"
                              placeholder="0"
                              value={modalState.financials.amountToCollect}
                              readOnly
                              className="w-full cursor-not-allowed rounded-lg border bg-gray-100 p-3"
                              title="This value is automatically calculated"
                            />
                          </div>

                          {/* Row 5: Collected Amount */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Collected Amount
                            </label>
                            <input
                              type="text"
                              placeholder="0"
                              value={modalState.financials.collectedAmount}
                              onChange={e => {
                                if (
                                  /^-?\d*\.?\d*$/.test(e.target.value) ||
                                  e.target.value === ''
                                ) {
                                  setModalState(prev => ({
                                    ...prev,
                                    financials: {
                                      ...prev.financials,
                                      collectedAmount: e.target.value,
                                    },
                                  }));
                                  // Trigger manual calculations
                                  setTimeout(() => {
                                    const amountCollected =
                                      Number(e.target.value) || 0;
                                    const amountToCollect =
                                      Number(
                                        modalState.financials.amountToCollect
                                      ) || 0;

                                    // Calculate previous balance: collectedAmount - amountToCollect
                                    let previousBalance =
                                      modalState.financials.previousBalance;
                                    if (
                                      e.target.value !== '' &&
                                      amountCollected >= 0
                                    ) {
                                      previousBalance = (
                                        amountCollected - amountToCollect
                                      ).toString();
                                    }

                                    setModalState(prev => ({
                                      ...prev,
                                      financials: {
                                        ...prev.financials,
                                        previousBalance: previousBalance,
                                        balanceCorrection:
                                          e.target.value === ''
                                            ? prev.financials
                                                .balanceCorrection || '0'
                                            : (
                                                (Number(
                                                  prev.financials
                                                    .balanceCorrection
                                                ) || 0) + amountCollected
                                              ).toString(),
                                      },
                                    }));
                                  }, 0);
                                }
                              }}
                              disabled={
                                modalState.isProcessing ||
                                modalState.financials.balanceCorrection.trim() ===
                                  ''
                              }
                              className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {modalState.financials.balanceCorrection.trim() ===
                              '' && (
                              <p className="mt-1 text-xs text-gray-500">
                                Enter a Balance Correction first, then the
                                Collected Amount will unlock.
                              </p>
                            )}
                          </div>

                          {/* Row 6: Balance Correction */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Balance Correction:{' '}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="0"
                              value={modalState.financials.balanceCorrection}
                              onChange={e => {
                                if (
                                  /^-?\d*\.?\d*$/.test(e.target.value) ||
                                  e.target.value === ''
                                ) {
                                  setModalState(prev => ({
                                    ...prev,
                                    financials: {
                                      ...prev.financials,
                                      balanceCorrection: e.target.value,
                                    },
                                  }));
                                }
                              }}
                              className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title="Balance correction amount (editable)"
                              disabled={
                                modalState.isProcessing ||
                                modalState.financials.collectedAmount.trim() !==
                                  ''
                              }
                            />
                            {modalState.financials.collectedAmount.trim() !==
                              '' && (
                              <p className="mt-1 text-xs text-gray-500">
                                Clear the Collected Amount to edit the Balance
                                Correction.
                              </p>
                            )}
                          </div>

                          {/* Row 7: Balance Correction Reason */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Balance Correction Reason
                            </label>
                            <textarea
                              placeholder="Correction Reason"
                              value={
                                modalState.financials.balanceCorrectionReason
                              }
                              onChange={e =>
                                setModalState(prev => ({
                                  ...prev,
                                  financials: {
                                    ...prev.financials,
                                    balanceCorrectionReason: e.target.value,
                                  },
                                }))
                              }
                              className="min-h-[80px] w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={modalState.isProcessing}
                            />
                          </div>

                          {/* Row 8: Previous Balance */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Previous Balance:{' '}
                              <span className="text-xs text-gray-400">
                                (Auto-calculated: collected amount - amount to
                                collect)
                              </span>
                            </label>
                            <input
                              type="text"
                              placeholder="0"
                              value={modalState.financials.previousBalance}
                              onChange={e =>
                                setModalState(prev => ({
                                  ...prev,
                                  financials: {
                                    ...prev.financials,
                                    previousBalance: e.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title="Auto-calculated as collected amount minus amount to collect (editable)"
                              disabled={modalState.isProcessing}
                            />
                          </div>

                          {/* Row 9: Reason For Shortage Payment */}
                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Reason For Shortage Payment
                            </label>
                            <textarea
                              placeholder="Shortage Reason"
                              value={
                                modalState.financials.reasonForShortagePayment
                              }
                              onChange={e =>
                                setModalState(prev => ({
                                  ...prev,
                                  financials: {
                                    ...prev.financials,
                                    reasonForShortagePayment: e.target.value,
                                  },
                                }))
                              }
                              className="min-h-[80px] w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={modalState.isProcessing}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Footer */}
                  <div className="space-y-3 border-t bg-gray-50 p-4">
                    {/* View Form Button - Show when there's at least 1 machine in collection */}
                    {modalState.collectedMachines.length > 0 && (
                      <button
                        onClick={() => {
                          pushNavigation('form'); // Track that we came from form panel
                          setModalState(prev => ({
                            ...prev,
                            isCollectedListVisible: true,
                            isViewingFinancialForm: true, // Show financial form instead of machine list
                          }));
                        }}
                        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        View Form ({modalState.collectedMachines.length} machine
                        {modalState.collectedMachines.length !== 1 ? 's' : ''})
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (
                          modalState.selectedMachineData &&
                          isAddMachineEnabled
                        ) {
                          addMachineToList();
                        }
                      }}
                      disabled={
                        modalState.isProcessing ||
                        !inputsEnabled ||
                        !isAddMachineEnabled
                      }
                      className={`w-full rounded-lg py-3 font-semibold transition-colors ${
                        isAddMachineEnabled &&
                        inputsEnabled &&
                        !modalState.isProcessing
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'cursor-not-allowed bg-gray-400 text-gray-200'
                      }`}
                    >
                      {modalState.isProcessing
                        ? modalState.editingEntryId
                          ? 'Updating...'
                          : 'Adding...'
                        : modalState.editingEntryId
                          ? 'Update Machine'
                          : 'Add Machine to List'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Collected Machines List - Slide Up Overlay */}
            <div
              className={`fixed inset-0 z-[90] transform bg-white shadow-xl transition-all duration-300 ease-in-out ${
                modalState.isCollectedListVisible
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-full opacity-0'
              } `}
            >
              {modalState.isCollectedListVisible && (
                <div className="flex h-full flex-col overflow-y-scroll">
                  {/* List Header */}
                  <div className="flex items-center justify-between rounded-t-xl border-b bg-green-600 p-4 text-white md:rounded-t-xl">
                    <button
                      onClick={() => {
                        popNavigation(); // Use proper back navigation
                      }}
                      className="rounded-full p-2 hover:bg-green-700"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">
                        Collected Machines (
                        {modalState.collectedMachines.length})
                      </h3>
                      {modalState.collectedMachines.length > 0 && (
                        <div className="flex rounded-lg bg-green-700 p-1">
                          <button
                            onClick={() => {
                              setModalState(prev => ({
                                ...prev,
                                isViewingFinancialForm: false,
                              }));
                            }}
                            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                              !modalState.isViewingFinancialForm
                                ? 'bg-white text-green-600'
                                : 'text-white hover:bg-green-600'
                            }`}
                          >
                            List
                          </button>
                          <button
                            onClick={() => {
                              setModalState(prev => ({
                                ...prev,
                                isViewingFinancialForm: true,
                              }));
                            }}
                            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                              modalState.isViewingFinancialForm
                                ? 'bg-white text-green-600'
                                : 'text-white hover:bg-green-600'
                            }`}
                          >
                            Financial
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Area - Show either machine list or financial form */}
                  <div className="flex flex-1 flex-col">
                    {modalState.collectedMachines.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center p-8">
                        <div className="text-center text-gray-500">
                          <p>No machines added to collection yet.</p>
                          <p className="mt-2 text-sm">
                            Go back and select machines to add them here.
                          </p>
                        </div>
                      </div>
                    ) : modalState.isViewingFinancialForm ? (
                      // Show Financial Form
                      <div className="flex flex-1 flex-col">
                        <div className="flex-1 overflow-y-auto">
                          {/* Financial Form Section */}
                          <div className="p-4">
                            <h3 className="mb-4 text-center text-lg font-semibold text-gray-700">
                              Financial Summary
                            </h3>

                            <div className="space-y-4">
                              {/* Row 1: Amount to Collect */}
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Amount to Collect *
                                </label>
                                <input
                                  type="text"
                                  value={modalState.financials.amountToCollect}
                                  readOnly
                                  className="w-full rounded-lg border bg-gray-100 p-3 font-semibold text-gray-700"
                                  title="Auto-calculated based on machine data and financial inputs"
                                />
                              </div>

                              {/* Row 2: Balance Correction */}
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Balance Correction *
                                </label>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={
                                    modalState.financials.balanceCorrection
                                  }
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (
                                      /^-?\d*\.?\d*$/.test(val) ||
                                      val === ''
                                    ) {
                                      setModalState(prev => ({
                                        ...prev,
                                        financials: {
                                          ...prev.financials,
                                          balanceCorrection: val,
                                        },
                                      }));
                                    }
                                  }}
                                  disabled={modalState.isProcessing}
                                  className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Row 3: Collected Amount */}
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Collected Amount
                                </label>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={modalState.financials.collectedAmount}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (
                                      /^-?\d*\.?\d*$/.test(val) ||
                                      val === ''
                                    ) {
                                      setModalState(prev => ({
                                        ...prev,
                                        financials: {
                                          ...prev.financials,
                                          collectedAmount: val,
                                        },
                                      }));
                                    }
                                  }}
                                  disabled={modalState.isProcessing}
                                  className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Row 4: Taxes */}
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Taxes
                                </label>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={modalState.financials.taxes}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (
                                      /^-?\d*\.?\d*$/.test(val) ||
                                      val === ''
                                    ) {
                                      setModalState(prev => ({
                                        ...prev,
                                        financials: {
                                          ...prev.financials,
                                          taxes: val,
                                        },
                                      }));
                                    }
                                  }}
                                  disabled={modalState.isProcessing}
                                  className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Row 5: Variance */}
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Variance
                                </label>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={modalState.financials.variance}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (
                                      /^-?\d*\.?\d*$/.test(val) ||
                                      val === ''
                                    ) {
                                      setModalState(prev => ({
                                        ...prev,
                                        financials: {
                                          ...prev.financials,
                                          variance: val,
                                        },
                                      }));
                                    }
                                  }}
                                  disabled={modalState.isProcessing}
                                  className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Row 6: Advance */}
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Advance
                                </label>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={modalState.financials.advance}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (
                                      /^-?\d*\.?\d*$/.test(val) ||
                                      val === ''
                                    ) {
                                      setModalState(prev => ({
                                        ...prev,
                                        financials: {
                                          ...prev.financials,
                                          advance: val,
                                        },
                                      }));
                                    }
                                  }}
                                  disabled={modalState.isProcessing}
                                  className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Row 7: Previous Balance */}
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Previous Balance
                                </label>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={modalState.financials.previousBalance}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (
                                      /^-?\d*\.?\d*$/.test(val) ||
                                      val === ''
                                    ) {
                                      setModalState(prev => ({
                                        ...prev,
                                        financials: {
                                          ...prev.financials,
                                          previousBalance: val,
                                        },
                                      }));
                                    }
                                  }}
                                  disabled={modalState.isProcessing}
                                  className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  title="Auto-calculated as collected amount minus amount to collect (editable)"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Financial Form Footer */}
                        <div className="border-t bg-gray-50 p-4">
                          <button
                            onClick={() => {
                              if (
                                modalState.collectedMachines.length === 0 ||
                                modalState.isProcessing
                              )
                                return;
                              
                              // Check if user is currently editing a machine entry
                              if (modalState.editingEntryId) {
                                setShowUnsavedChangesWarning(true);
                                return;
                              }
                              
                              // Check if there's unsaved form data
                              const enteredMetersIn = modalState.formData.metersIn ? Number(modalState.formData.metersIn) : 0;
                              const enteredMetersOut = modalState.formData.metersOut ? Number(modalState.formData.metersOut) : 0;
                              const hasNotes = modalState.formData.notes?.trim().length > 0;
                              
                              if (modalState.selectedMachineData || enteredMetersIn !== 0 || enteredMetersOut !== 0 || hasNotes) {
                                setShowUnsavedChangesWarning(true);
                                return;
                              }
                              
                              setShowCreateReportConfirmation(true);
                            }}
                            disabled={
                              !isCreateReportsEnabled || modalState.isProcessing
                            }
                            className={`w-full rounded-lg py-3 font-semibold transition-colors ${
                              isCreateReportsEnabled && !modalState.isProcessing
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'cursor-not-allowed bg-gray-400 text-gray-200'
                            }`}
                          >
                            {modalState.isProcessing
                              ? 'Updating Report...'
                              : `Update Collection Report (${modalState.collectedMachines.length} machines)`}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Show Machine List
                      <div className="mobile-collection-scrollbar flex-1 overflow-y-scroll">
                        <div className="space-y-3 p-4 pb-4">
                          {/* Update All Dates - Show if there are 2 or more machines */}
                          {modalState.collectedMachines.length >= 2 && (
                            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                              <label className="mb-2 block text-sm font-medium text-gray-700">
                                Update All Dates
                              </label>
                              <p className="mb-2 text-xs text-gray-600">
                                Select date/time to apply to all{' '}
                                {modalState.collectedMachines.length} machines
                              </p>
                              <PCDateTimePicker
                                date={updateAllDate}
                                setDate={date => {
                                  if (
                                    date &&
                                    date instanceof Date &&
                                    !isNaN(date.getTime())
                                  ) {
                                    setUpdateAllDate(date);
                                  }
                                }}
                                disabled={modalState.isProcessing}
                                placeholder="Select date/time"
                              />
                              <button
                                onClick={async () => {
                                  if (!updateAllDate) {
                                    toast.error('Please select a date/time first');
                                    return;
                                  }

                                  setModalState(prev => ({ ...prev, isProcessing: true }));

                                  try {
                                    toast.loading('Updating all machines...', {
                                      id: 'update-all-dates',
                                    });

                                    console.warn('🔄 Updating machines:', modalState.collectedMachines.map(m => ({ id: m._id, has_id: !!m._id })));

                                    // Update all collections in database
                                    const results = await Promise.allSettled(
                                      modalState.collectedMachines.map(async entry => {
                                        if (!entry._id) {
                                          console.warn('⚠️ Skipping entry without _id:', entry);
                                          return;
                                        }

                                        console.warn(`📝 Updating collection ${entry._id} to ${updateAllDate.toISOString()}`);
                                        return await axios.patch(
                                          `/api/collections?id=${entry._id}`,
                                          {
                                            timestamp: updateAllDate.toISOString(),
                                            collectionTime: updateAllDate.toISOString(),
                                          }
                                        );
                                      })
                                    );

                                    // Check for failures
                                    const failed = results.filter(
                                      r => r.status === 'rejected'
                                    ).length;

                                    // Update frontend state
                                    setModalState(prev => ({
                                      ...prev,
                                      collectedMachines: prev.collectedMachines.map(
                                        entry => ({
                                          ...entry,
                                          timestamp: updateAllDate,
                                          collectionTime: updateAllDate,
                                        })
                                      ),
                                      hasUnsavedEdits: true,
                                    }));

                                    toast.dismiss('update-all-dates');

                                    if (failed > 0) {
                                      toast.warning(
                                        `Updated ${modalState.collectedMachines.length - failed} machines, ${failed} failed`
                                      );
                                    } else {
                                      toast.success(
                                        `Updated ${modalState.collectedMachines.length} machines in database`
                                      );
                                    }
                                  } catch (error) {
                                    toast.dismiss('update-all-dates');
                                    console.error('Failed to update dates:', error);
                                    toast.error('Failed to update machines');
                                  } finally {
                                    setModalState(prev => ({ ...prev, isProcessing: false }));
                                  }
                                }}
                                disabled={!updateAllDate || modalState.isProcessing}
                                className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {modalState.isProcessing ? 'Updating...' : 'Apply to All Machines'}
                              </button>
                            </div>
                          )}

                          {/* Search bar for collected machines */}
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="Search collected machines..."
                              value={modalState.collectedMachinesSearchTerm}
                              onChange={e =>
                                setModalState(prev => ({
                                  ...prev,
                                  collectedMachinesSearchTerm: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {(() => {
                            const filteredMachines =
                              modalState.collectedMachines.filter(machine => {
                                if (
                                  !modalState.collectedMachinesSearchTerm.trim()
                                )
                                  return true;
                                const searchTerm =
                                  modalState.collectedMachinesSearchTerm.toLowerCase();
                                const machineName = (
                                  machine.machineName || ''
                                ).toLowerCase();
                                const serialNumber = (
                                  machine.serialNumber || ''
                                ).toLowerCase();
                                const machineCustomName = (
                                  machine.machineCustomName || ''
                                ).toLowerCase();
                                const game = (machine.game || '').toLowerCase();

                                return (
                                  machineName.includes(searchTerm) ||
                                  serialNumber.includes(searchTerm) ||
                                  machineCustomName.includes(searchTerm) ||
                                  game.includes(searchTerm)
                                );
                              });

                            // Sort the filtered machines alphabetically and numerically
                            const sortedMachines =
                              sortMachinesAlphabetically(filteredMachines);

                            if (
                              sortedMachines.length === 0 &&
                              modalState.collectedMachinesSearchTerm
                            ) {
                              return (
                                <div className="py-8 text-center text-gray-500">
                                  <p>
                                    No machines found matching &quot;
                                    {modalState.collectedMachinesSearchTerm}
                                    &quot;
                                  </p>
                                </div>
                              );
                            }

                            return sortedMachines.map(machine => (
                              <div
                                key={machine._id}
                                className="rounded-lg border border-gray-200 bg-white p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold">
                                      {formatMachineDisplayNameWithBold({
                                        serialNumber: machine.serialNumber,
                                        custom: {
                                          name: machine.machineCustomName,
                                        },
                                        game: machine.game,
                                      })}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600">
                                      In: {machine.metersIn} | Out:{' '}
                                      {machine.metersOut}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Time: {formatDate(machine.timestamp)}
                                    </p>
                                    {machine.notes && (
                                      <p className="mt-1 text-xs italic text-gray-500">
                                        Notes: {machine.notes}
                                      </p>
                                    )}
                                    {machine.ramClear && (
                                      <p className="mt-1 text-xs font-semibold text-red-600">
                                        RAM Cleared
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => editMachineInList(machine)}
                                      className="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                                      disabled={modalState.isProcessing}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEntryToDelete(machine._id);
                                        setShowDeleteConfirmation(true);
                                      }}
                                      className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200"
                                      disabled={modalState.isProcessing}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setEntryToDelete(null);
        }}
        onConfirm={() => {
          if (entryToDelete) {
            deleteMachineFromList(entryToDelete);
            setShowDeleteConfirmation(false);
            setEntryToDelete(null);
          }
        }}
        title="Confirm Delete"
        message="Are you sure you want to remove this machine from the collection list?"
        confirmText="Yes, Remove"
        cancelText="Cancel"
        isLoading={modalState.isProcessing}
      />

      {/* Update Report Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showCreateReportConfirmation}
        onClose={() => setShowCreateReportConfirmation(false)}
        onConfirm={updateCollectionReportHandler}
        title="Confirm Report Update"
        message={`You are about to update this collection report with ${modalState.collectedMachines.length} machine(s). Do you want to proceed?`}
        confirmText="Yes, Update Report"
        cancelText="Cancel"
        isLoading={modalState.isProcessing}
      />

      {/* View Machine Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={modalState.showViewMachineConfirmation}
        onClose={() =>
          setModalState(prev => ({
            ...prev,
            showViewMachineConfirmation: false,
          }))
        }
        onConfirm={() => {
          if (modalState.selectedMachineData?._id) {
            const machineUrl = `/machines/${modalState.selectedMachineData._id}`;
            window.open(machineUrl, '_blank');
          }
          setModalState(prev => ({
            ...prev,
            showViewMachineConfirmation: false,
          }));
        }}
        title="View Machine"
        message="Do you want to open this machine's details in a new tab?"
        confirmText="Yes, View Machine"
        cancelText="Cancel"
        isLoading={false}
      />

      {/* Unsaved Changes Warning Dialog */}
      <ConfirmationDialog
        isOpen={showUnsavedChangesWarning}
        onClose={() => setShowUnsavedChangesWarning(false)}
        onConfirm={() => setShowUnsavedChangesWarning(false)}
        title="Unsaved Changes"
        message="You have unsaved machine meter edits. Press 'Update Report' to save your changes before closing."
        confirmText="Keep Editing"
        cancelText=""
        isLoading={false}
      />
    </>
  );
}
