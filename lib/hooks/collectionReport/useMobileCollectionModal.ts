/**
 * useMobileCollectionModal Hook
 *
 * Manages state and operations for the mobile collection modal interface.
 *
 * Features:
 * - Machine selection and collection entry management
 * - Form state management for meter readings
 * - Navigation stack for modal panels
 * - Collection report creation
 * - Modal initialization with collection discovery
 * - Full validation system
 * - Location locking
 */

'use client';

import { createCollectionReport as createCollectionReportAPI } from '@/lib/helpers/collectionReport';
import { sortMachinesAlphabetically } from '@/lib/helpers/collectionReport/editCollectionModalHelpers';
import { validateMachineEntry } from '@/lib/helpers/collectionReportModal';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import axios, { type AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type UseMobileCollectionModalProps = {
  show?: boolean;
  locations?: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  onClose: () => void;
};

export function useMobileCollectionModal({
  show,
  locations = [],
  onRefresh,
  onClose,
}: UseMobileCollectionModalProps) {
  const user = useUserStore(state => state.user);

  const {
    selectedLocationId: selectedLocation,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    selectedMachineId: selectedMachine,
    selectedMachineData,
    financials,
    setCollectedMachines: setStoreCollectedMachines,
    setSelectedMachineId: setStoreSelectedMachine,
    setSelectedMachineData: setStoreSelectedMachineData,
    setFinancials: setStoreFinancials,
    setSelectedLocation: setStoreSelectedLocation,
    setAvailableMachines: setStoreAvailableMachines,
    setLockedLocation: setStoreLockedLocation,
  } = useCollectionModalStore();

  // Expose store functions for component use
  const setStoreSelectedMachineExposed = setStoreSelectedMachine;
  const setStoreSelectedMachineDataExposed = setStoreSelectedMachineData;

  const [modalState, setModalState] = useState({
    isMachineListVisible: false,
    isFormVisible: false,
    isCollectedListVisible: false,
    navigationStack: [] as string[],
    isViewingFinancialForm: false,
    showViewMachineConfirmation: false,
    searchTerm: '',
    collectedMachinesSearchTerm: '',
    editingEntryId: null as string | null,
    formData: {
      metersIn: '',
      metersOut: '',
      ramClear: false,
      ramClearMetersIn: '',
      ramClearMetersOut: '',
      notes: '',
      collectionTime: new Date(),
    },
    isLoadingMachines: false,
    isProcessing: false,
    isLoadingCollections: false,
    collectedMachines: [] as CollectionDocument[],
    lockedLocationId: undefined as string | undefined,
  });

  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);

  // Refs to prevent infinite loops
  const hasFetchedOnOpenRef = useRef(false);
  const isUpdatingFromModalStateRef = useRef(false);
  const locationsRef = useRef(locations);

  // Update locations ref when locations change
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Find which location a machine belongs to
   */
  const getLocationIdFromMachine = useCallback((machineId: string) => {
    // Find the location that contains this machine
    for (const location of locationsRef.current) {
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
  }, []);

  // ============================================================================
  // Navigation Helpers
  // ============================================================================

  const pushNavigation = useCallback((panel: string) => {
    setModalState(prev => ({
      ...prev,
      navigationStack: [...prev.navigationStack, panel],
    }));
  }, []);

  const popNavigation = useCallback(() => {
    setModalState(prev => {
      const newStack = [...prev.navigationStack];
      newStack.pop();

      // Hide all panels first
      const newState = {
        ...prev,
        isMachineListVisible: false,
        isFormVisible: false,
        isCollectedListVisible: false,
        navigationStack: newStack,
      };

      // If we're going back to main, ensure all panels are hidden
      // The main screen will show when navigationStack.length === 0
      return newState;
    });
  }, []);

  // ============================================================================
  // Collection Discovery & Initialization
  // ============================================================================

  /**
   * Fetch existing incomplete collections when modal opens
   */
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

          // Update local state
          setModalState(prev => ({
            ...prev,
            collectedMachines: response.data,
          }));

          // Auto-attach location from first machine
          const firstCollection = response.data[0];
          if (firstCollection.machineId) {
            const machineLocationId = getLocationIdFromMachine(
              firstCollection.machineId
            );
            if (machineLocationId) {
              // Find matching location
              const matchingLocation = locationsRef.current.find(
                loc => String(loc._id) === machineLocationId
              );
              if (matchingLocation) {
                // Set location in store
                setStoreSelectedLocation(
                  machineLocationId,
                  matchingLocation.name
                );
                // Lock location (can't change once collections exist)
                setStoreLockedLocation(machineLocationId);
                setModalState(prev => ({
                  ...prev,
                  lockedLocationId: machineLocationId,
                }));
              }
            }
          }
        } else {
          // Clear any existing state if no collections found
          setStoreCollectedMachines([]);
          setModalState(prev => ({
            ...prev,
            collectedMachines: [],
          }));
        }
      } catch (error) {
        console.error('Error fetching existing collections:', error);
        setStoreCollectedMachines([]);
        setModalState(prev => ({
          ...prev,
          collectedMachines: [],
        }));
      } finally {
        setModalState(prev => ({ ...prev, isLoadingCollections: false }));
      }
    },
    [
      setStoreCollectedMachines,
      setStoreSelectedLocation,
      setStoreLockedLocation,
      getLocationIdFromMachine,
    ]
  );

  // Fetch existing collections when modal opens
  useEffect(() => {
    if (show && locations.length > 0) {
      if (!hasFetchedOnOpenRef.current) {
        console.warn(
          '🔄 Mobile: Modal opened - fetching fresh collections data'
        );
        // Always fetch fresh data when modal opens, regardless of current state
        // Don't pass locationId on initial fetch to get all incomplete collections
        fetchExistingCollections(undefined);
        hasFetchedOnOpenRef.current = true;
      }
    } else if (!show) {
      // Reset the ref when modal closes
      hasFetchedOnOpenRef.current = false;
    }
  }, [show, fetchExistingCollections, locations.length]);

  // ============================================================================
  // Location Management
  // ============================================================================

  // Location change handler
  const handleLocationChange = useCallback(
    (locationId: string) => {
      // Find the location to get its name
      const location = locationsRef.current.find(
        loc => String(loc._id) === locationId
      );
      const locationName = location?.name || '';

      // Update store
      setStoreSelectedLocation(locationId, locationName);

      // Update financials with location's collection balance
      if (location) {
        setStoreFinancials({
          previousBalance: (location.collectionBalance || 0).toString(),
        });
      }

      // Reset selected machine when location changes
      setStoreSelectedMachine(undefined);
      setStoreSelectedMachineData(null);
    },
    [
      setStoreSelectedLocation,
      setStoreFinancials,
      setStoreSelectedMachine,
      setStoreSelectedMachineData,
    ]
  );

  // Fetch machines when location changes
  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocation;
    if (locationIdToUse) {
      setModalState(prev => ({ ...prev, isLoadingMachines: true }));
      const fetchMachinesForLocation = async () => {
        try {
          const response = await axios.get(
            `/api/machines?locationId=${locationIdToUse}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            setStoreAvailableMachines(response.data.data);
          } else {
            setStoreAvailableMachines([]);
          }
        } catch (error) {
          console.error('Error fetching machines for location:', error);
          setStoreAvailableMachines([]);
        } finally {
          setModalState(prev => ({ ...prev, isLoadingMachines: false }));
        }
      };
      fetchMachinesForLocation();
    } else {
      setStoreAvailableMachines([]);
      setModalState(prev => ({ ...prev, isLoadingMachines: false }));
    }
  }, [selectedLocation, lockedLocationId, setStoreAvailableMachines]);

  // ============================================================================
  // View Handlers
  // ============================================================================

  const handleViewForm = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isFormVisible: true,
      isMachineListVisible: false,
      isCollectedListVisible: false,
      isViewingFinancialForm: true,
    }));
  }, []);

  const handleViewCollectedMachines = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isCollectedListVisible: true,
      isFormVisible: false,
      isMachineListVisible: false,
      isViewingFinancialForm: false,
    }));
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const inputsEnabled = useMemo(() => {
    return !!selectedMachine && !!selectedMachineData;
  }, [selectedMachine, selectedMachineData]);

  const isAddMachineEnabled = useMemo(() => {
    // Must have a machine selected
    if (!selectedMachineData) return false;

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
    selectedMachineData,
    modalState.formData.metersIn,
    modalState.formData.metersOut,
    modalState.formData.ramClear,
    modalState.formData.ramClearMetersIn,
    modalState.formData.ramClearMetersOut,
  ]);

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
      financials.amountToCollect !== undefined &&
      financials.amountToCollect !== null &&
      financials.amountToCollect.toString().trim() !== '' &&
      Number(financials.amountToCollect) !== 0;

    // Finance fields validation
    const balanceCorrectionHasValue =
      financials.balanceCorrection !== undefined &&
      financials.balanceCorrection !== null &&
      financials.balanceCorrection.toString().trim() !== '';

    return amountToCollectHasValue && balanceCorrectionHasValue;
  }, [modalState.collectedMachines, financials]);

  // ============================================================================
  // Machine Collection Operations
  // ============================================================================

  /**
   * Add or update machine in collection list
   */
  const addMachineToList = useCallback(async () => {
    if (!selectedMachineData || modalState.isProcessing) return;

    const isEditing = !!modalState.editingEntryId;

    // Full validation
    const validation = validateMachineEntry(
      String(selectedMachineData._id),
      selectedMachineData,
      modalState.formData.metersIn,
      modalState.formData.metersOut,
      user?._id as string,
      modalState.formData.ramClear,
      selectedMachineData.collectionMeters?.metersIn,
      selectedMachineData.collectionMeters?.metersOut,
      modalState.formData.ramClearMetersIn
        ? Number(modalState.formData.ramClearMetersIn)
        : undefined,
      modalState.formData.ramClearMetersOut
        ? Number(modalState.formData.ramClearMetersOut)
        : undefined,
      isEditing
    );

    if (!validation.isValid) {
      // Validation errors are now shown inline in the form
      return;
    }

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Prepare collection payload
      const collectionPayload = {
        machineId: String(selectedMachineData._id),
        location: selectedLocationName,
        collector: user?._id || '',
        metersIn: Number(modalState.formData.metersIn),
        metersOut: Number(modalState.formData.metersOut),
        // CRITICAL: Don't send prevIn/prevOut values
        // Let the API calculate them from machine history
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
        const response = await axios.patch(
          `/api/collections?id=${modalState.editingEntryId}`,
          collectionPayload
        );
        createdCollection = response.data.data;
      } else {
        const response = await axios.post(
          '/api/collections',
          collectionPayload
        );
        createdCollection = response.data.data;
      }

      // Enrich collection data
      const enrichedCollection = {
        ...createdCollection,
        machineName: selectedMachineData?.name || createdCollection.machineName,
        serialNumber:
          selectedMachineData?.serialNumber || createdCollection.serialNumber,
        machineCustomName:
          selectedMachineData?.custom?.name ||
          createdCollection.machineCustomName,
        game: selectedMachineData?.game || createdCollection.game,
      };

      // Update state
      setModalState(prev => {
        const newCollectedMachines = isEditing
          ? prev.collectedMachines.map(m =>
              m._id === modalState.editingEntryId ? enrichedCollection : m
            )
          : [...prev.collectedMachines, enrichedCollection];

        const newLockedLocationId =
          prev.collectedMachines.length === 0 && !isEditing
            ? selectedLocation || undefined
            : prev.lockedLocationId;

        return {
          ...prev,
          collectedMachines: newCollectedMachines,
          lockedLocationId: newLockedLocationId, // Lock on first machine
          isFormVisible: false,
          isMachineListVisible: true, // Navigate back to machine list
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

      // Sync to Zustand store
      setStoreCollectedMachines(
        isEditing
          ? modalState.collectedMachines.map(m =>
              m._id === modalState.editingEntryId ? enrichedCollection : m
            )
          : [...modalState.collectedMachines, enrichedCollection]
      );

      if (
        modalState.collectedMachines.length === 0 &&
        !isEditing &&
        selectedLocation
      ) {
        setStoreLockedLocation(selectedLocation);
      }

      setStoreSelectedMachine(undefined);
      setStoreSelectedMachineData(null);

      toast.success(`Machine ${isEditing ? 'updated' : 'added'} successfully!`);
    } catch (error: unknown) {
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
    selectedMachineData,
    modalState,
    user,
    selectedLocationName,
    selectedLocation,
    setStoreCollectedMachines,
    setStoreLockedLocation,
    setStoreSelectedMachine,
    setStoreSelectedMachineData,
  ]);

  /**
   * Edit machine in list
   */
  const editMachineInList = useCallback(
    (entry: CollectionDocument) => {
      // First check if machine is already in availableMachines
      let machine = availableMachines.find(
        m => String(m._id) === entry.machineId
      );

      // If not found, try to load machines from the location
      if (!machine && entry.location) {
        const location = locationsRef.current.find(
          loc => loc.name === entry.location
        );
        if (location && location.machines) {
          machine = location.machines.find(
            m => String(m._id) === entry.machineId
          );

          // Update available machines
          setStoreAvailableMachines(location.machines);
          setStoreSelectedLocation(String(location._id), location.name);
        }
      }

      if (!machine) {
        // Machine data not found - handle gracefully
        toast.error('Machine data not found. Please refresh and try again.');
        return;
      }

      // Populate form with existing data
      setModalState(prev => ({
        ...prev,
        selectedMachine: String(machine!._id),
        selectedMachineData: machine!,
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

      setStoreSelectedMachine(String(machine._id));
      setStoreSelectedMachineData(machine);
    },
    [
      availableMachines,
      setStoreAvailableMachines,
      setStoreSelectedLocation,
      setStoreSelectedMachine,
      setStoreSelectedMachineData,
    ]
  );

  /**
   * Delete machine from list
   */
  const deleteMachineFromList = useCallback(
    async (entryId: string) => {
      setModalState(prev => ({ ...prev, isProcessing: true }));

      try {
        // Find entry data (for logging)
        const entryToDeleteData = modalState.collectedMachines.find(
          e => e._id === entryId
        );

        // Delete from database
        await axios.delete(`/api/collections?id=${entryId}`);

        // Update local state
        setModalState(prev => {
          const newCollectedMachines = prev.collectedMachines.filter(
            m => m._id !== entryId
          );
          const newLockedLocationId =
            newCollectedMachines.length === 0
              ? undefined
              : prev.lockedLocationId;

          return {
            ...prev,
            collectedMachines: newCollectedMachines,
            // Unlock location if no machines remain
            lockedLocationId: newLockedLocationId,
            isProcessing: false,
          };
        });

        // Sync to Zustand store
        setStoreCollectedMachines(
          modalState.collectedMachines.filter(m => m._id !== entryId)
        );

        if (modalState.collectedMachines.length === 1) {
          // Was last machine, unlock location
          setStoreLockedLocation(undefined);
        }

        toast.success(
          entryToDeleteData?.machineCustomName
            ? `Removed ${entryToDeleteData.machineCustomName} from collection`
            : 'Collection removed successfully'
        );
      } catch (error) {
        console.error('📱 Mobile: Failed to delete collection:', error);
        setModalState(prev => ({ ...prev, isProcessing: false }));
        toast.error('Failed to remove collection. Please try again.');
      }
    },
    [
      modalState.collectedMachines,
      setStoreCollectedMachines,
      setStoreLockedLocation,
    ]
  );

  // ============================================================================
  // Report Creation
  // ============================================================================

  /**
   * Create collection report
   */
  const createCollectionReport = useCallback(async () => {
    const machinesForReport = modalState.collectedMachines;

    if (machinesForReport.length === 0) {
      return;
    }

    if (!selectedLocation || !selectedLocationName) {
      return;
    }

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Generate report ID
      const { v4: uuidv4 } = await import('uuid');
      const reportId = uuidv4();

      // Prepare report timestamp
      const reportTimestamp =
        machinesForReport[0].timestamp instanceof Date
          ? machinesForReport[0].timestamp
          : new Date(machinesForReport[0].timestamp);

      // Build payload
      const payload = {
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        currentBalance: 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected: Number(financials.collectedAmount) || 0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes: Number(financials.taxes) || 0,
        advance: Number(financials.advance) || 0,
        collector: user?._id || '',
        locationName: selectedLocationName,
        locationReportId: reportId,
        location: selectedLocation || '',
        totalDrop: 0,
        totalCancelled: 0,
        totalGross: 0,
        totalSasGross: 0,
        timestamp: reportTimestamp.toISOString(),
        varianceReason: financials.varianceReason,
        reasonShortagePayment: financials.reasonForShortagePayment,
        balanceCorrection: Number(financials.balanceCorrection) || 0,
        balanceCorrectionReas: financials.balanceCorrectionReason,
        machines: machinesForReport.map(entry => ({
          machineId: entry.machineId,
          metersIn: entry.metersIn || 0,
          metersOut: entry.metersOut || 0,
          prevMetersIn: entry.prevIn || 0,
          prevMetersOut: entry.prevOut || 0,
          timestamp:
            entry.timestamp instanceof Date
              ? entry.timestamp
              : new Date(entry.timestamp),
          locationReportId: reportId,
        })),
      };

      // Validate payload
      const { validateCollectionReportPayload } = await import(
        '@/lib/utils/validation'
      );

      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        console.error('❌ Validation failed:', validation.errors);
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 1: Create report
      toast.loading('Creating collection report...', {
        id: 'mobile-create-report-toast',
      });

      await createCollectionReportAPI(payload);

      // Step 2: Update collections
      const updatePromises = machinesForReport.map(async collection => {
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
          // Don't throw here - report is already created, just log the error
        }
      });

      await Promise.all(updatePromises);

      toast.dismiss('mobile-create-report-toast');
      toast.success('Collection report created successfully!');

      // Refresh and close
      onRefresh();
      onClose();
    } catch (error) {
      toast.dismiss('mobile-create-report-toast');
      console.error('❌ Failed to create collection report:', error);

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error
      ) {
        const axiosError = error as { response?: { data?: unknown } };
        errorMessage = JSON.stringify(axiosError.response?.data || error);
      }

      toast.error(`Failed to create collection report: ${errorMessage}`, {
        duration: 8000,
      });
    } finally {
      setModalState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [
    modalState.collectedMachines,
    selectedLocation,
    selectedLocationName,
    financials,
    user,
    onRefresh,
    onClose,
  ]);

  // ============================================================================
  // State Synchronization
  // ============================================================================

  // Sync local state collectedMachines to Zustand store
  useEffect(() => {
    if (
      modalState.isLoadingCollections ||
      isUpdatingFromModalStateRef.current
    ) {
      return; // Don't sync while loading or updating
    }

    // Only sync if modalState.collectedMachines is different from Zustand store
    if (
      modalState.collectedMachines.length !== collectedMachines.length ||
      modalState.collectedMachines.some(
        (m, i) => m._id !== collectedMachines[i]?._id
      )
    ) {
      isUpdatingFromModalStateRef.current = true;
      setStoreCollectedMachines(modalState.collectedMachines);

      // Also sync lockedLocationId if it changed
      if (modalState.lockedLocationId !== lockedLocationId) {
        if (modalState.lockedLocationId) {
          setStoreLockedLocation(modalState.lockedLocationId);
        } else {
          setStoreLockedLocation(undefined);
        }
      }

      // Reset flag after a microtask
      queueMicrotask(() => {
        isUpdatingFromModalStateRef.current = false;
      });
    }
  }, [
    modalState.collectedMachines,
    modalState.lockedLocationId,
    modalState.isLoadingCollections,
    collectedMachines,
    lockedLocationId,
    setStoreCollectedMachines,
    setStoreLockedLocation,
  ]);

  // ============================================================================
  // Return Values
  // ============================================================================

  return {
    modalState,
    setModalState,
    showUnsavedChangesWarning,
    setShowUnsavedChangesWarning,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    selectedLocation,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines: modalState.collectedMachines,
    selectedMachine,
    selectedMachineData,
    financials,
    pushNavigation,
    popNavigation,
    handleLocationChange,
    handleViewForm,
    handleViewCollectedMachines,
    addMachineToList,
    editMachineInList,
    deleteMachineFromList,
    createCollectionReport,
    inputsEnabled,
    isAddMachineEnabled,
    isCreateReportsEnabled,
    sortMachinesAlphabetically,
    setStoreFinancials,
    setStoreSelectedMachine: setStoreSelectedMachineExposed,
    setStoreSelectedMachineData: setStoreSelectedMachineDataExposed,
    getLocationIdFromMachine,
    fetchExistingCollections,
  };
}
