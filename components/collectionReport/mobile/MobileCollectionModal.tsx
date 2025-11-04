'use client';

import {
  MobileCollectedListPanel,
  MobileFormPanel,
} from '@/components/collectionReport/forms';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { InfoConfirmationDialog } from '@/components/ui/InfoConfirmationDialog';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
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
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type MobileCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  onRefreshLocations?: () => void;
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
  selectedMachine: string | null;
  selectedMachineData: CollectionReportMachineSummary | null;
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

export default function MobileCollectionModal({
  show,
  onClose,
  locations = [],
  onRefresh,
  onRefreshLocations,
}: MobileCollectionModalProps) {
  const user = useUserStore(state => state.user);

  // Refresh locations when modal opens
  useEffect(() => {
    if (show && onRefreshLocations) {
      console.warn('🔄 [Mobile Modal] Refreshing locations data');
      onRefreshLocations();
    }
  }, [show, onRefreshLocations]);

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
    selectedMachine: null,
    selectedMachineData: null,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        locationReportId: '', // Will be set when report is created
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any;
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
    user,
    setStoreCollectedMachines,
    setStoreLockedLocation,
  ]);

  // Delete machine from collection list
  const deleteMachineFromList = useCallback(
    (entryId: string) => {
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
          // Unlock location if no machines remain
          lockedLocationId: newLockedLocationId,
        };
      });
      // Success feedback is handled by UI state changes
    },
    [setStoreCollectedMachines, setStoreLockedLocation]
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

  // Create collection report
  const createCollectionReport = useCallback(async () => {
    if (collectedMachines.length === 0) {
      return;
    }

    if (!selectedLocationId || !selectedLocationName) {
      return;
    }

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      const { v4: uuidv4 } = await import('uuid');
      const { createCollectionReport: createReportAPI } = await import(
        '@/lib/helpers/collectionReport'
      );
      const { validateCollectionReportPayload } = await import(
        '@/lib/utils/validation'
      );

      toast.loading('Creating collection report...', {
        id: 'mobile-create-report-toast',
      });

      // Generate a single locationReportId for all collections in this report
      const reportId = uuidv4();

      // Step 1: Update all existing collections with the report ID and mark as completed
      const updatePromises = collectedMachines.map(async collection => {
        try {
          await axios.patch(`/api/collections?id=${collection._id}`, {
            locationReportId: reportId,
            isCompleted: true,
          });
        } catch (error) {
          console.error(
            `Failed to update collection ${collection._id}:`,
            error
          );
          throw error;
        }
      });

      await Promise.all(updatePromises);

      // Step 2: Create a single collection report with all the financial data
      // Use the collection time from the first machine as the report timestamp
      const reportTimestamp =
        collectedMachines[0].timestamp instanceof Date
          ? collectedMachines[0].timestamp
          : new Date(collectedMachines[0].timestamp);

      console.warn('📱 Creating collection report:', {
        reportId,
        reportTimestamp: reportTimestamp.toISOString(),
        collectedMachinesCount: collectedMachines.length,
        locationName: selectedLocationName,
        locationId: selectedLocationId,
      });

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
        timestamp: reportTimestamp.toISOString(),
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

      // Create the collection report
      await createReportAPI(payload);

      toast.dismiss('mobile-create-report-toast');
      toast.success('Collection report created successfully!');

      // Refresh and close
      onRefresh();
      onClose();
    } catch (error) {
      toast.dismiss('mobile-create-report-toast');
      console.error('❌ Failed to create collection report:', error);
      toast.error(
        `Failed to create collection report: ${
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
    user,
    onRefresh,
    onClose,
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

  // Mobile modal now gets state from desktop modal props - no need for independent loading

  // This effect is no longer needed - machines are loaded from locations prop in the earlier effect

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

  // Reset modal state when modal opens to ensure CollectedMachinesList is hidden
  useEffect(() => {
    if (show) {
      // If we have collected machines, show the collected machines list
      if (collectedMachines.length > 0) {
        setModalState(prev => ({
          ...prev,
          isMachineListVisible: false,
          isFormVisible: false,
          isCollectedListVisible: true,
        }));
      } else if (collectedMachines.length === 0) {
        // Only reset panels if we have no collected machines (fresh start)
        setModalState(prev => ({
          ...prev,
          isMachineListVisible: false,
          isFormVisible: false,
          isCollectedListVisible: false,
        }));
      }
      // If we have collected machines in create mode, keep panels as-is
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]); // Removed collectedMachines.length dependency to prevent override after adding machine

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
              modalState.showViewMachineConfirmation)
          ) {
            return;
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
            <DialogTitle className="sr-only">New Collection Report</DialogTitle>

            {/* Main Content Area - ONLY LOCATION SELECTION VISIBLE BY DEFAULT */}
            <div className="flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div className="rounded-t-xl border-b bg-white p-4 md:rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">New Collection Report</h2>
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
                    <div
                      className={
                        modalState.isProcessing ||
                        lockedLocationId !== undefined ||
                        collectedMachines.length > 0 ||
                        modalState.isLoadingCollections
                          ? 'pointer-events-none opacity-50'
                          : ''
                      }
                    >
                      <LocationSingleSelect
                        locations={locations.map(loc => ({
                          id: String(loc._id),
                          name: loc.name,
                          sasEnabled: false,
                        }))}
                        selectedLocation={
                          lockedLocationId ||
                          selectedLocationId ||
                          modalState.selectedLocation ||
                          ''
                        }
                        onSelectionChange={transitions.selectLocation}
                        placeholder="Choose a location..."
                        includeAllOption={false}
                      />
                    </div>

                    {modalState.lockedLocationId && (
                      <p className="mt-2 text-xs italic text-gray-500">
                        Location is locked to the first machine&apos;s location
                      </p>
                    )}

                    {/* Toggle Buttons - Only show when location is selected */}
                    {(lockedLocationId ||
                      selectedLocationId ||
                      modalState.selectedLocation) && (
                      <div className="mt-6 space-y-3">
                        {/* Open Report Button - Only show when a machine is selected */}
                        {modalState.selectedMachine && (
                          <button
                            onClick={() => {
                              pushNavigation('main'); // Track that we came from main screen
                              setModalState(prev => ({
                                ...prev,
                                isFormVisible: true,
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
                                isCollectedListVisible: true,
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

                        <button
                          onClick={() => {
                            if (modalState.collectedMachines.length === 0) {
                              return;
                            }
                            pushNavigation('main'); // Track that we came from main screen
                            setModalState(prev => ({
                              ...prev,
                              isCollectedListVisible: true,
                              isViewingFinancialForm: false, // Show machine list instead of financial form
                            }));
                          }}
                          className={`w-full rounded-lg py-3 font-medium ${
                            (
                              collectedMachines ||
                              modalState.collectedMachines ||
                              []
                            ).length === 0
                              ? 'cursor-not-allowed bg-gray-400 text-gray-200'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          View Collected Machines (
                          {
                            (
                              collectedMachines ||
                              modalState.collectedMachines ||
                              []
                            ).length
                          }
                          )
                        </button>
                      </div>
                    )}

                    {/* Machines List - Show below buttons when location is selected */}
                    {(lockedLocationId ||
                      selectedLocationId ||
                      modalState.selectedLocation) && (
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
                              const filteredMachines = availableMachines.filter(
                                machine => {
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
                                }
                              );

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
                                            transitions.selectMachine(machine);
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
            <MobileFormPanel
              isVisible={modalState.isFormVisible}
              onBack={() => popNavigation()}
              onViewCollectedList={() => {
                pushNavigation('form');
                setModalState(prev => ({
                  ...prev,
                  isCollectedListVisible: true,
                  isViewingFinancialForm: false,
                }));
              }}
              selectedMachineData={modalState.selectedMachineData}
              editingEntryId={modalState.editingEntryId}
              formData={modalState.formData}
              financials={modalState.financials}
              collectedMachinesCount={modalState.collectedMachines.length}
              isProcessing={modalState.isProcessing}
              inputsEnabled={inputsEnabled}
              isAddMachineEnabled={isAddMachineEnabled}
              formatMachineDisplay={formatMachineDisplayNameWithBold}
              onViewMachine={() => {
                setModalState(prev => ({
                  ...prev,
                  showViewMachineConfirmation: true,
                }));
              }}
              onFormDataChange={(field, value) => {
                setModalState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, [field]: value },
                }));
              }}
              onFinancialDataChange={(field, value) => {
                setModalState(prev => ({
                  ...prev,
                  financials: { ...prev.financials, [field]: value },
                }));
              }}
              onAddMachine={() => {
                if (modalState.selectedMachineData && isAddMachineEnabled) {
                  addMachineToList();
                }
              }}
              autoFillRamClearMeters={checked => {
                setModalState(prev => ({
                  ...prev,
                  formData: {
                    ...prev.formData,
                    ramClear: checked,
                    ramClearMetersIn: checked
                      ? modalState.selectedMachineData?.collectionMeters?.metersIn?.toString() ||
                        ''
                      : '',
                    ramClearMetersOut: checked
                      ? modalState.selectedMachineData?.collectionMeters?.metersOut?.toString() ||
                        ''
                      : '',
                  },
                }));
              }}
              onCollectedAmountChange={value => {
                if (/^-?\d*\.?\d*$/.test(value) || value === '') {
                  setModalState(prev => ({
                    ...prev,
                    financials: {
                      ...prev.financials,
                      collectedAmount: value,
                    },
                  }));
                  setTimeout(() => {
                    const amountCollected = Number(value) || 0;
                    const amountToCollect =
                      Number(modalState.financials.amountToCollect) || 0;
                    let previousBalance = modalState.financials.previousBalance;
                    if (value !== '' && amountCollected >= 0) {
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
                          value === ''
                            ? prev.financials.balanceCorrection || '0'
                            : (
                                (Number(prev.financials.balanceCorrection) ||
                                  0) + amountCollected
                              ).toString(),
                      },
                    }));
                  }, 0);
                }
              }}
            />

            {/* Collected Machines List - Slide Up Overlay */}
            <MobileCollectedListPanel
              isVisible={modalState.isCollectedListVisible}
              onBack={() => popNavigation()}
              collectedMachines={modalState.collectedMachines}
              searchTerm={modalState.collectedMachinesSearchTerm}
              onSearchChange={term => {
                setModalState(prev => ({
                  ...prev,
                  collectedMachinesSearchTerm: term,
                }));
              }}
              isViewingFinancialForm={modalState.isViewingFinancialForm}
              onToggleView={isFinancial => {
                setModalState(prev => ({
                  ...prev,
                  isViewingFinancialForm: isFinancial,
                }));
              }}
              financials={modalState.financials}
              isProcessing={modalState.isProcessing}
              isCreateReportsEnabled={isCreateReportsEnabled}
              formatMachineDisplay={formatMachineDisplayNameWithBold}
              formatDate={formatDate}
              sortMachines={sortMachinesAlphabetically}
              onEditMachine={editMachineInList}
              onDeleteMachine={machineId => {
                setEntryToDelete(machineId);
                setShowDeleteConfirmation(true);
              }}
              onFinancialDataChange={(field, value) => {
                setModalState(prev => ({
                  ...prev,
                  financials: { ...prev.financials, [field]: value },
                }));
              }}
              onCreateReport={() => {
                if (
                  modalState.collectedMachines.length === 0 ||
                  modalState.isProcessing
                )
                  return;
                setShowCreateReportConfirmation(true);
              }}
            />
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

      {/* Create Report Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showCreateReportConfirmation}
        onClose={() => setShowCreateReportConfirmation(false)}
        onConfirm={createCollectionReport}
        title="Confirm Collection Report"
        message={`You are about to create a collection report for ${
          modalState.collectedMachines.length
        } machine(s) with collection time: ${
          modalState.collectedMachines.length > 0 &&
          modalState.collectedMachines[0].timestamp
            ? formatDate(modalState.collectedMachines[0].timestamp)
            : 'Not set'
        }. Do you want to proceed?`}
        confirmText="Yes, Create Report"
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
    </>
  );
}
