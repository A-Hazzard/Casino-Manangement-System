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

import { createCollectionReport as createCollectionReportAPI, validateMachineEntry } from '@/lib/helpers/collectionReport';
import { sortMachinesAlphabetically } from '@/lib/helpers/collectionReport/editCollectionModalHelpers';
import { logActivity } from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { calculateCabinetMovement } from '@/lib/utils/movement';
import { calculateDefaultCollectionTime } from '@/lib/utils/collection';
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
    formData: storeFormData,
    setFormData: setStoreFormData,
  } = useCollectionModalStore();

  // Expose store functions for component use
  const setStoreSelectedMachineExposed = setStoreSelectedMachine;
  const setStoreSelectedMachineDataExposed = setStoreSelectedMachineData;

  type MobileModalState = {
    isMachineListVisible: boolean;
    isFormVisible: boolean;
    isCollectedListVisible: boolean;
    navigationStack: string[];
    isViewingFinancialForm: boolean;
    showViewMachineConfirmation: boolean;
    searchTerm: string;
    collectedMachinesSearchTerm: string;
    editingEntryId: string | null;
    isLoadingMachines: boolean;
    isProcessing: boolean;
    isLoadingCollections: boolean;
    collectedMachines: CollectionDocument[];
    lockedLocationId: string | undefined;
    baseBalanceCorrection: string;
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
    financials: {
      collectedAmount: string;
      amountToCollect: string;
      previousBalance: string;
      taxes: string;
      advance: string;
      variance: string;
      varianceReason: string;
      balanceCorrection: string;
      balanceCorrectionReason: string;
      reasonForShortagePayment: string;
    };
  };

  const [modalState, setModalState] = useState<MobileModalState>(() => ({
    isMachineListVisible: false,
    isFormVisible: false,
    isCollectedListVisible: false,
    navigationStack: [],
    isViewingFinancialForm: false,
    showViewMachineConfirmation: false,
    searchTerm: '',
    collectedMachinesSearchTerm: '',
    editingEntryId: null,
    isLoadingMachines: false,
    isProcessing: false,
    isLoadingCollections: false,
    collectedMachines: [],
    lockedLocationId: undefined,
    baseBalanceCorrection: '',
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
    financials: {
      collectedAmount: financials.collectedAmount,
      amountToCollect: financials.amountToCollect,
      previousBalance: financials.previousBalance,
      taxes: financials.taxes,
      advance: financials.advance,
      variance: financials.variance,
      varianceReason: financials.varianceReason,
      balanceCorrection: financials.balanceCorrection,
      balanceCorrectionReason: financials.balanceCorrectionReason,
      reasonForShortagePayment: financials.reasonForShortagePayment,
    },
  }));

  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);
  const [updateAllSasStartDate, setUpdateAllSasStartDate] = useState<Date | undefined>(undefined);
  const [updateAllSasEndDate, setUpdateAllSasEndDate] = useState<Date | undefined>(undefined);

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
        let url = '/api/collection-reports/collections';
        if (locationId) {
          url += `?locationId=${locationId}`;
        }
        // Only get incomplete collections (no locationReportId)
        url += `${locationId ? '&' : '?'}incompleteOnly=true`;
        if (user?._id) {
          url += `&collector=${user._id}`;
        }

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
      user?._id,
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

        // Set default collection time based on gameDayOffset
        if (location.gameDayOffset !== undefined) {
          const defaultTime = calculateDefaultCollectionTime(location.gameDayOffset);
          setStoreFormData({ collectionTime: defaultTime });
        }
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
            `/api/cabinets?locationId=${locationIdToUse}&_t=${Date.now()}`
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
  // Financial Calculations
  // ============================================================================

  /**
   * Calculate amount to collect based on machine entries and financial inputs
   */
  const calculateAmountToCollect = useCallback(() => {
    if (modalState.collectedMachines.length === 0) {
      setStoreFinancials({ amountToCollect: '0' });
      return;
    }

    const totalMovementData = modalState.collectedMachines.map(entry => {
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
        gross: movement.gross,
      };
    });

    const totalGross = totalMovementData.reduce(
      (sum, m) => sum + m.gross,
      0
    );

    // Find matching location for profit share and baseline balance
    const location = locationsRef.current.find(
      loc => String(loc._id) === (lockedLocationId || selectedLocation)
    );
    const profitShare = location?.profitShare ?? 50;
    const baseBalance = location?.collectionBalance ?? 0;
    const balanceCorrection = Number(financials.balanceCorrection) || 0;
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;

    const partnerProfit =
      ((totalGross - variance - advance) * profitShare) / 100 - taxes;
    
    // Amount to collect = Machine Revenue - Expenses - Partner Profit + Baseline Balance + Correction
    const amountToCollect =
      totalGross - variance - advance - partnerProfit + baseBalance + balanceCorrection;

    const collectedAmount = Number(financials.collectedAmount) || 0;

    setStoreFinancials({
      amountToCollect: amountToCollect.toFixed(2),
      previousBalance: (collectedAmount - amountToCollect).toFixed(2),
    });
  }, [
    modalState.collectedMachines,
    modalState.isLoadingCollections,
    financials.taxes,
    financials.variance,
    financials.advance,
    financials.balanceCorrection,
    financials.collectedAmount,
    locations,
    lockedLocationId,
    selectedLocation,
    setStoreFinancials,
  ]);

  // Trigger calculation when relevant state changes
  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  // ============================================================================
  // View Handlers
  // ============================================================================

  const handleViewForm = useCallback(() => {
    pushNavigation('list');
    setModalState(prev => ({
      ...prev,
      isFormVisible: false,
      isMachineListVisible: false,
      isCollectedListVisible: true,
      isViewingFinancialForm: true,
    }));
  }, [pushNavigation]);

  const handleViewCollectedMachines = useCallback(() => {
    pushNavigation('list');
    setModalState(prev => ({
      ...prev,
      isCollectedListVisible: true,
      isFormVisible: false,
      isMachineListVisible: false,
      isViewingFinancialForm: false,
    }));
  }, [pushNavigation]);

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
    if (!storeFormData.metersIn || !storeFormData.metersOut)
      return false;

    // If RAM Clear is checked, must have RAM Clear meters
    if (
      storeFormData.ramClear &&
      (!storeFormData.ramClearMetersIn ||
        !storeFormData.ramClearMetersOut)
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
      financials.amountToCollect.toString().trim() !== '';

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

    // Full validation — prioritize manual overrides from formData
    const validationPrevIn = modalState.formData.prevIn !== '' 
      ? Number(modalState.formData.prevIn) 
      : (() => {
          const s = selectedMachineData.sasMeters?.drop ?? null;
          return (s !== null && s > 0) ? s : (selectedMachineData.collectionMeters?.metersIn ?? 0);
        })();
    const validationPrevOut = modalState.formData.prevOut !== '' 
      ? Number(modalState.formData.prevOut) 
      : (() => {
          const s = selectedMachineData.sasMeters?.totalCancelledCredits ?? null;
          return (s !== null && s > 0) ? s : (selectedMachineData.collectionMeters?.metersOut ?? 0);
        })();
    const validation = validateMachineEntry(
      String(selectedMachineData._id),
      selectedMachineData,
      modalState.formData.metersIn,
      modalState.formData.metersOut,
      user?._id as string,
      modalState.formData.ramClear,
      validationPrevIn,
      validationPrevOut,
      modalState.formData.ramClearMetersIn
        ? Number(modalState.formData.ramClearMetersIn)
        : undefined,
      modalState.formData.ramClearMetersOut
        ? Number(modalState.formData.ramClearMetersOut)
        : undefined,
      isEditing
    );

    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid machine data. Please check your inputs.', { duration: 5000 });
      return;
    }

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Prepare collection payload
      const collectionPayload = {
        machineId: String(selectedMachineData._id),
        location: selectedLocationName,
        collector: user?._id || '',
        notes: modalState.formData.notes,
        ramClear: modalState.formData.ramClear,
        ramClearMetersIn: modalState.formData.ramClearMetersIn
          ? Number(modalState.formData.ramClearMetersIn)
          : undefined,
        ramClearMetersOut: modalState.formData.ramClearMetersOut
          ? Number(modalState.formData.ramClearMetersOut)
          : undefined,
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
        metersIn: Number(modalState.formData.metersIn),
        metersOut: Number(modalState.formData.metersOut),
        prevIn: validationPrevIn,
        prevOut: validationPrevOut,
        locationReportId: '', // Will be set when report is created
        isCompleted: false,
      };

      let createdCollection: CollectionDocument;

      if (isEditing) {
        const response = await axios.patch(
          `/api/collection-reports/collections?id=${modalState.editingEntryId}`,
          collectionPayload
        );
        createdCollection = response.data.data;
      } else {
        const response = await axios.post(
          '/api/collection-reports/collections',
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

        // Correctly handle navigation state
        const newStack = [...prev.navigationStack];
        newStack.pop(); // Pop the 'form' panel

        return {
          ...prev,
          collectedMachines: newCollectedMachines,
          lockedLocationId: newLockedLocationId, // Lock on first machine
          isFormVisible: false,
          isMachineListVisible: false, // The home screen will show because stack is empty
          navigationStack: newStack,
          selectedMachine: null,
          selectedMachineData: null,
          editingEntryId: null, // Clear editing state
          formData: {
            ...prev.formData,
            metersIn: '',
            metersOut: '',
            ramClear: false,
            ramClearMetersIn: '',
            ramClearMetersOut: '',
            notes: '',
            // Keep showAdvancedSas, sasStartTime, sasEndTime if active
            showAdvancedSas: prev.formData.showAdvancedSas,
            sasStartTime: prev.formData.showAdvancedSas ? prev.formData.sasStartTime : null,
            sasEndTime: prev.formData.showAdvancedSas ? prev.formData.sasEndTime : null,
            prevIn: '',
            prevOut: '',
          }
        };
      });

      // Clear form data in store
      setStoreFormData({
        metersIn: '',
        metersOut: '',
        ramClear: false,
        ramClearMetersIn: '',
        ramClearMetersOut: '',
        notes: '',
        showAdvancedSas: modalState.formData.showAdvancedSas,
        sasStartTime: modalState.formData.showAdvancedSas ? modalState.formData.sasStartTime : null,
        sasEndTime: modalState.formData.showAdvancedSas ? modalState.formData.sasEndTime : null,
        prevIn: '',
        prevOut: '',
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

      // Log the add/update with meter details
      if (selectedLocationName) {
        const machineName = selectedMachineData?.name || selectedMachineData?.serialNumber || String(selectedMachineData?._id || '');
        const metersIn = Number(modalState.formData.metersIn);
        const metersOut = Number(modalState.formData.metersOut);
        const ramClear = modalState.formData.ramClear;
        const notes = modalState.formData.notes;
        if (isEditing) {
          const prevEntry = modalState.collectedMachines.find(m => m._id === modalState.editingEntryId);
          const changes: string[] = [];
          if (prevEntry && prevEntry.metersIn !== metersIn) changes.push(`MIn: ${prevEntry.metersIn} → ${metersIn}`);
          if (prevEntry && prevEntry.metersOut !== metersOut) changes.push(`MOut: ${prevEntry.metersOut} → ${metersOut}`);
          if (prevEntry && prevEntry.ramClear !== ramClear) changes.push(`RAM Clear: ${prevEntry.ramClear ? 'Yes' : 'No'} → ${ramClear ? 'Yes' : 'No'}`);
          if (prevEntry && (prevEntry.notes || '') !== (notes || '')) changes.push(`Notes: "${prevEntry.notes || ''}" → "${notes || ''}"`);
          const detailStr = changes.length > 0 ? changes.join(', ') : 'No meter changes';
          await logActivity(
            'update', 'collection',
            modalState.editingEntryId || String(createdCollection._id),
            `${machineName} at ${selectedLocationName}`,
            `Updated machine ${machineName} at ${selectedLocationName} — ${detailStr}`,
            user?._id as string, user?.username || 'unknown',
            prevEntry ? { metersIn: prevEntry.metersIn, metersOut: prevEntry.metersOut, ramClear: prevEntry.ramClear, notes: prevEntry.notes } : null,
            { metersIn, metersOut, ramClear, notes: notes || undefined }
          );
        } else {
          const detailParts = [`MIn: ${metersIn}`, `MOut: ${metersOut}`, `PrevIn: ${validationPrevIn}`, `PrevOut: ${validationPrevOut}`, `RAM Clear: ${ramClear ? 'Yes' : 'No'}`];
          if (ramClear) detailParts.push(`RC MIn: ${Number(modalState.formData.ramClearMetersIn) || 0}`, `RC MOut: ${Number(modalState.formData.ramClearMetersOut) || 0}`);
          if (notes) detailParts.push(`Notes: ${notes}`);
          await logActivity(
            'create', 'collection',
            String(createdCollection._id),
            `${machineName} at ${selectedLocationName}`,
            `Added machine ${machineName} to collection at ${selectedLocationName} — ${detailParts.join(', ')}`,
            user?._id as string, user?.username || 'unknown',
            null,
            { metersIn, metersOut, prevIn: validationPrevIn, prevOut: validationPrevOut, ramClear, notes: notes || undefined }
          );
        }
      }
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
      pushNavigation('form');
      const initialFormData = {
        metersIn: entry.metersIn.toString(),
        metersOut: entry.metersOut.toString(),
        ramClear: entry.ramClear || false,
        ramClearMetersIn: entry.ramClearMetersIn?.toString() || '',
        ramClearMetersOut: entry.ramClearMetersOut?.toString() || '',
        notes: entry.notes || '',
        collectionTime: new Date(entry.timestamp),
        showAdvancedSas: false, // Ensure advanced is NOT selected by default when editing
        sasStartTime: entry.sasMeters?.sasStartTime ? new Date(entry.sasMeters.sasStartTime) : null,
        sasEndTime: entry.sasMeters?.sasEndTime ? new Date(entry.sasMeters.sasEndTime) : null,
        prevIn: entry.prevIn?.toString() || '',
        prevOut: entry.prevOut?.toString() || '',
      };

      setModalState(prev => ({
        ...prev,
        selectedMachine: String(machine!._id),
        selectedMachineData: machine!,
        editingEntryId: entry._id, // Track which entry we're editing
        isFormVisible: true,
        isCollectedListVisible: false,
        formData: initialFormData,
      }));

      setStoreFormData(initialFormData);

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
        await axios.delete(`/api/collection-reports/collections?id=${entryId}`);

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
  const createCollectionReport = useCallback(async (reconciliationData?: unknown) => {
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
        amountCollected: Number(financials.collectedAmount) || Number(financials.amountToCollect) || 0,
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
        reconciliation: reconciliationData || null,
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
        console.error('❌ [MobileNewCollection] Validation failed:', {
          errors: validation.errors,
          payload,
        });
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
          await axios.patch(`/api/collection-reports/collections?id=${collection._id}`, {
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
      !show ||
      modalState.isLoadingCollections ||
      isUpdatingFromModalStateRef.current
    ) {
      return; // Don't sync while hidden, loading, or updating
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
    show,
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
    baseBalanceCorrection: modalState.baseBalanceCorrection,
    onBaseBalanceCorrectionChange: (value: string) => {
      setModalState(prev => ({ ...prev, baseBalanceCorrection: value }));
    },
    getLocationIdFromMachine,
    fetchExistingCollections,

    // Form data change handler
    onFormDataChange: (field: string, value: unknown) => {
      // Compute the new form data outside of the setState updater to avoid
      // calling external store setters during another component's render cycle.
      const currentFormData = { ...storeFormData };
      const newFormData = { ...currentFormData, [field]: value };

      // If turning on advanced SAS and times are null, set defaults
      if (field === 'showAdvancedSas' && value === true) {
        const location = locationsRef.current.find(l => String(l._id) === selectedLocation);
        const machine = selectedMachineData;

        if (!newFormData.sasStartTime) {
          let defaultStart = new Date();
          if (machine?.collectionTime) {
            defaultStart = new Date(machine.collectionTime);
          } else if (location?.previousCollectionTime) {
            defaultStart = new Date(location.previousCollectionTime);
          }
          newFormData.sasStartTime = defaultStart;
        }

        if (!newFormData.sasEndTime) {
          const gameDayOffset = location?.gameDayOffset ?? 8;
          const defaultEnd = new Date(newFormData.collectionTime || new Date());
          if (defaultEnd.getHours() < gameDayOffset) {
            defaultEnd.setDate(defaultEnd.getDate() - 1);
          }
          defaultEnd.setHours(gameDayOffset - 1, 59, 59, 0);
          newFormData.sasEndTime = defaultEnd;
        }
      }

      // Update both stores separately (never inside the other's updater)
      setStoreFormData(newFormData as Partial<typeof storeFormData>);
      setModalState(prev => ({
        ...prev,
        formData: newFormData,
      }));
    },

    storeFormData,
    setStoreFormData,

    // Update All Dates feature
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    handleApplyAllDates: async () => {
      if ((!updateAllSasStartDate && !updateAllSasEndDate) || modalState.collectedMachines.length < 1) return;
      try {
        setModalState(prev => ({ ...prev, isProcessing: true }));
        const results = await Promise.allSettled(
          modalState.collectedMachines.map(async entry => {
            if (!entry._id) return;

            const updateData: Record<string, unknown> = {};
            if (updateAllSasStartDate) {
              updateData['sasMeters.sasStartTime'] = updateAllSasStartDate.toISOString();
            }
            if (updateAllSasEndDate) {
              updateData['sasMeters.sasEndTime'] = updateAllSasEndDate.toISOString();
            }

            return await axios.patch(`/api/collection-reports/collections?id=${entry._id}`, updateData);
          })
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
          toast.error(`${failed} machine${failed > 1 ? 's' : ''} failed to update`);
          return;
        }
        // Refresh local list timestamps
        const updated = modalState.collectedMachines.map(e => {
          const newEntry = { ...e } as CollectionDocument;
          if (!newEntry.sasMeters) {
            newEntry.sasMeters = {
              machine: newEntry.machineId || '',
              drop: 0,
              totalCancelledCredits: 0,
              gross: 0,
              gamesPlayed: 0,
              jackpot: 0,
              sasStartTime: '',
              sasEndTime: '',
            };
          } else {
            newEntry.sasMeters = { ...newEntry.sasMeters };
          }
          
          if (updateAllSasStartDate) {
            newEntry.sasMeters.sasStartTime = updateAllSasStartDate.toISOString();
          }
          if (updateAllSasEndDate) {
            newEntry.sasMeters.sasEndTime = updateAllSasEndDate.toISOString();
          }
          return newEntry;
        });

        setModalState(prev => ({
          ...prev,
          collectedMachines: updated,
          isProcessing: false
        }));
        setStoreCollectedMachines(updated);
        toast.success('All SAS times updated successfully!');
        setUpdateAllSasStartDate(undefined);
        setUpdateAllSasEndDate(undefined);
      } catch (error) {
        console.error('Error applying all dates:', error);
        toast.error('Failed to update dates');
        setModalState(prev => ({ ...prev, isProcessing: false }));
      }
    },
  };
}

