/**
 * useMobileEditCollectionModal Hook
 *
 * Encapsulates state and logic for the Mobile Edit Collection Modal.
 * Handles location selection, machine fetching, validation, entry management, and navigation.
 */

'use client';

import { sortMachinesAlphabetically } from '@/lib/helpers/collectionReport/mobileEditCollectionModalHelpers';
import { validateMachineEntry } from '@/lib/helpers/collectionReport';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useUserStore } from '@/lib/store/userStore';
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import axios, { type AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
      modalState.financials.amountToCollect.toString().trim() !== '' &&
      Number(modalState.financials.amountToCollect) !== 0;

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

  // Fetch existing collections when modal opens
  const fetchExistingCollections = useCallback(
    async (locationId?: string) => {
      setModalState(prev => ({ ...prev, isLoadingCollections: true }));
      try {
        let url = '/api/collections';
        if (locationId) {
          url += `?locationId=${locationId}`;
        }
        // Only get incomplete collections (no locationReportId)
        url += `${locationId ? '&' : '?'}incompleteOnly=true`;

        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
          // Update Zustand store with existing collections
          setStoreCollectedMachines(response.data);

          // Get the proper location ID from the first machine
          const firstCollection = response.data[0];
          if (firstCollection.machineId) {
            const machineLocationId = getLocationIdFromMachine(
              firstCollection.machineId
            );
            if (machineLocationId) {
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
        notes: modalState.formData.notes,
        timestamp: modalState.formData.collectionTime.toISOString(),
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
            )?.locationReportId || ''
          : '',
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

      // Update local and Zustand state
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
          lockedLocationId: newLockedLocationId,
          isFormVisible: false,
          isMachineListVisible: true,
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
        await axios.delete(`/api/collections?id=${entryId}`);

        setModalState(prev => {
          const newCollectedMachines = prev.collectedMachines.filter(
            m => m._id !== entryId
          );
          const newLockedLocationId =
            newCollectedMachines.length === 0
              ? undefined
              : prev.lockedLocationId;

          setStoreCollectedMachines(newCollectedMachines);
          if (newLockedLocationId !== prev.lockedLocationId) {
            setStoreLockedLocation(newLockedLocationId);
          }

          return {
            ...prev,
            collectedMachines: newCollectedMachines,
            originalCollections: prev.originalCollections.filter(
              m => m._id !== entryId
            ),
            lockedLocationId: newLockedLocationId,
            isProcessing: false,
          };
        });

        toast.success('Collection removed successfully');
      } catch (error) {
        console.error('Failed to delete collection:', error);
        setModalState(prev => ({ ...prev, isProcessing: false }));
        toast.error('Failed to remove collection. Please try again.');
      }
    },
    [setStoreCollectedMachines, setStoreLockedLocation]
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
  const updateCollectionReportHandler = useCallback(async () => {
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
      }> = [];

      for (const current of collectedMachines) {
        const original = modalState.originalCollections.find(
          o => o._id === current._id
        );
        if (original) {
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
        collector: user?._id || '',
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

  // Fetch existing collections when modal opens
  useEffect(() => {
    if (show && locations.length > 0) {
      fetchExistingCollections(selectedLocationId);
    }
    // Only run when show transitions to true or location ID changes while open
  }, [show, selectedLocationId, fetchExistingCollections, locations.length]);

  // Reset modal state when modal opens
  useEffect(() => {
    if (show) {
      if (collectedMachines.length > 0) {
        setModalState(prev => ({
          ...prev,
          isMachineListVisible: false,
          isFormVisible: false,
          isCollectedListVisible: true,
        }));
      } else if (collectedMachines.length === 0) {
        setModalState(prev => ({
          ...prev,
          isMachineListVisible: false,
          isFormVisible: false,
          isCollectedListVisible: false,
        }));
      }
    }
  }, [show, collectedMachines]);

  return {
    // State
    modalState,
    setModalState,
    updateAllDate,
    setUpdateAllDate,
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

    // Helpers
    sortMachinesAlphabetically,
    getLocationIdFromMachine,
    fetchExistingCollections,

    // Store actions
    setStoreSelectedLocation,
    setStoreLockedLocation,
    setStoreAvailableMachines,
    setStoreCollectedMachines,
  };
}

