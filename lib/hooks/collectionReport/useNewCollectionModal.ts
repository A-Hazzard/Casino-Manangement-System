/**
 * useNewCollectionModal Hook
 *
 * Manages state and logic for the New Collection Modal.
 * Handles location selection, machine fetching, validation, entry management,
 * and collection report creation.
 *
 * Architecture:
 * - Uses Zustand store for shared state (location, machines, financials)
 * - Local state for UI-specific concerns (modals, editing)
 * - Effects for side effects (fetching, syncing)
 * - Debounced values for expensive calculations
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { createCollectionReport } from '@/lib/helpers/collectionReport';
import {
  addMachineCollection,
  deleteMachineCollection,
} from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { updateCollection } from '@/lib/helpers/collections';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
  CreateCollectionReportPayload,
  MachineVariationData,
  VariationsCheckResponse,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { calculateDefaultCollectionTime } from '@/lib/utils/collection';
import { calculateMachineMovement } from '@/lib/utils/movement';
import { validateCollectionReportPayload } from '@/lib/utils/validation';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

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
// Helper Functions
// ============================================================================

/**
 * Sorts machines alphabetically with numeric awareness
 * Groups machines like "Machine 1, Machine 2, Machine 10" correctly
 */
function sortMachinesAlphabetically<
  T extends { name?: string; serialNumber?: string },
>(machines: T[]): T[] {
  return [...machines].sort((a, b) => {
    const nameA = (a.name || a.serialNumber || '').toString();
    const nameB = (b.name || b.serialNumber || '').toString();
    const matchA = nameA.match(/^(.+?)(\d+)?$/);
    const matchB = nameB.match(/^(.+?)(\d+)?$/);
    if (!matchA || !matchB) return nameA.localeCompare(nameB);
    const [, baseA, numA] = matchA;
    const [, baseB, numB] = matchB;
    const baseCompare = baseA.localeCompare(baseB);
    if (baseCompare !== 0) return baseCompare;
    const numAInt = numA ? parseInt(numA, 10) : 0;
    const numBInt = numB ? parseInt(numB, 10) : 0;
    return numAInt - numBInt;
  });
}

// ============================================================================
// Main Hook
// ============================================================================

export function useNewCollectionModal({
  show,
  locations,
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
    setSelectedLocation,
    lockedLocationId,
    setLockedLocation,
    collectedMachines: collectedMachineEntries,
    setCollectedMachines: setCollectedMachineEntries,
    financials,
    setFinancials,
    formData: storeFormData,
    setFormData: setStoreFormData,
    resetState: resetStoreState,
  } = useCollectionModalStore();

  // ==========================================================================
  // Local State - UI-specific concerns
  // ==========================================================================

  // Location & Machine Selection
  const [selectedLocationName] = useState('');
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState<
    string | undefined
  >(undefined);

  // Machine Data Entry
  const [isFirstCollection, setIsFirstCollection] = useState(false);
  const [previousCollectionTime, setPreviousCollectionTime] = useState<
    string | Date | undefined
  >(undefined);
  const [isLoadingExistingCollections, setIsLoadingExistingCollections] =
    useState(false);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Editing State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Bulk SAS Update
  const [updateAllSasStartDate, setUpdateAllSasStartDate] = useState<
    Date | undefined
  >(undefined);
  const [updateAllSasEndDate, setUpdateAllSasEndDate] = useState<
    Date | undefined
  >(undefined);

  // ==========================================================================
  // Form Data Bindings - Derive from store and create setters
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

  // Setter functions for form data
  const setCurrentCollectionTime = (val: Date) =>
    setStoreFormData({ collectionTime: val });
  const setCurrentMetersIn = (val: string) =>
    setStoreFormData({ metersIn: val });
  const setCurrentMetersOut = (val: string) =>
    setStoreFormData({ metersOut: val });
  const setCurrentRamClearMetersIn = (val: string) =>
    setStoreFormData({ ramClearMetersIn: val });
  const setCurrentRamClearMetersOut = (val: string) =>
    setStoreFormData({ ramClearMetersOut: val });
  const setCurrentMachineNotes = (val: string) =>
    setStoreFormData({ notes: val });
  const setCurrentRamClear = (val: boolean) =>
    setStoreFormData({ ramClear: val });
  const setSasStartTime = (val: Date | null) =>
    setStoreFormData({ sasStartTime: val });
  const setSasEndTime = (val: Date | null) =>
    setStoreFormData({ sasEndTime: val });
  const setPrevIn = (val: string | number | null) =>
    setStoreFormData({ prevIn: val?.toString() || '' });
  const setPrevOut = (val: string | number | null) =>
    setStoreFormData({ prevOut: val?.toString() || '' });

  // Derived prev values
  const prevIn = storePrevIn !== '' ? Number(storePrevIn) : null;
  const prevOut = storePrevOut !== '' ? Number(storePrevOut) : null;

  // ==========================================================================
  // Modal Confirmation State
  // ==========================================================================

  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showMachineRolloverWarning, setShowMachineRolloverWarning] =
    useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);
  const [showViewMachineConfirmation, setShowViewMachineConfirmation] =
    useState(false);
  const [pendingMachineSubmission, setPendingMachineSubmission] = useState<
    (() => void) | null
  >(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // ==========================================================================
  // Helper Functions (defined early for use in effects)
  // ==========================================================================

  /**
   * Find location ID for a given machine
   */
  const getLocationIdFromMachine = useCallback(
    (machineId: string) => {
      for (const location of locations) {
        if (location.machines?.some(m => String(m._id) === machineId)) {
          return String(location._id);
        }
      }
      return null;
    },
    [locations]
  );

  // ==========================================================================
  // Computed Values (useMemo)
  // ==========================================================================

  /**
   * Selected location object from locations array
   */
  const selectedLocation = useMemo(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    return locations.find(l => String(l._id) === locationIdToUse);
  }, [locations, selectedLocationId, lockedLocationId]);

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
   * Check if any confirmation modal is open
   */
  const anyConfirmationOpen = !!(
    showUpdateConfirmation ||
    showMachineRolloverWarning ||
    showDeleteConfirmation ||
    showCreateReportConfirmation
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
          _id: String(collectedEntry.machineId),
          name:
            collectedEntry.machineCustomName ||
            collectedEntry.serialNumber ||
            collectedEntry.machineId,
          serialNumber: collectedEntry.serialNumber || collectedEntry.machineId,
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
   * Whether meter input fields should be enabled
   */
  const inputsEnabled = useMemo(
    () => !!machineForDataEntry || !!selectedMachineId,
    [machineForDataEntry, selectedMachineId]
  );

  /**
   * Whether the "Add Machine" button should be enabled
   */
  const isAddMachineEnabled = useMemo(() => {
    if (!machineForDataEntry) return false;
    if (!currentMetersIn || !currentMetersOut) return false;
    if (
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut)
    )
      return false;
    return true;
  }, [
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
  ]);

  // ==========================================================================
  // Debounced Values
  // ==========================================================================

  const debouncedCurrentMetersIn = useDebounce(currentMetersIn, 500);
  const debouncedCurrentMetersOut = useDebounce(currentMetersOut, 500);
  const debouncedCurrentRamClearMetersIn = useDebounce(
    currentRamClearMetersIn,
    500
  );
  const debouncedCurrentRamClearMetersOut = useDebounce(
    currentRamClearMetersOut,
    500
  );

  // ==========================================================================
  // Refs
  // ==========================================================================

  const hasFetchedOnOpenRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const onRefreshLocationsRef = useRef(onRefreshLocations);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Sync refs when callbacks change
   */
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onRefreshLocationsRef.current = onRefreshLocations;
  });

  /**
   * Fetch machines when location changes
   */
  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    if (locationIdToUse) {
      const fetchMachinesForLocation = async () => {
        try {
          const response = await axios.get(
            `/api/machines?locationId=${locationIdToUse}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            setMachinesOfSelectedLocation(response.data.data);
          } else {
            setMachinesOfSelectedLocation([]);
          }
        } catch (error) {
          console.error('Error fetching machines for location:', error);
          setMachinesOfSelectedLocation([]);
        }
      };
      fetchMachinesForLocation();
      setSelectedMachineId(undefined);
    } else {
      setMachinesOfSelectedLocation([]);
      setSelectedMachineId(undefined);
      setMachineSearchTerm('');
    }
  }, [selectedLocationId, lockedLocationId]);

  /**
   * Update collection time when location changes
   */
  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    if (locationIdToUse) {
      const location = locations.find(l => String(l._id) === locationIdToUse);
      if (location?.gameDayOffset !== undefined) {
        const defaultTime = calculateDefaultCollectionTime(
          location.gameDayOffset
        );
        setCurrentCollectionTime(defaultTime);
      }
    }
  }, [selectedLocationId, lockedLocationId, locations]);

  /**
   * Calculate amount to collect based on collected machines
   */
  const calculateAmountToCollect = useCallback(() => {
    if (!collectedMachineEntries.length) {
      setFinancials({ amountToCollect: '0' });
      return;
    }

    const hasValidData = collectedMachineEntries.some(
      entry => entry.metersIn !== undefined && entry.metersOut !== undefined
    );
    if (!hasValidData) {
      setFinancials({ amountToCollect: '0' });
      return;
    }

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

    const reportTotalData = totalMovementData.reduce(
      (prev, current) => ({
        drop: prev.drop + current.drop,
        cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
        gross: prev.gross + current.gross,
      }),
      { drop: 0, cancelledCredits: 0, gross: 0 }
    );

    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;
    const balanceCorrection = Number(financials.balanceCorrection) || 0;
    const locationPreviousBalance = locationCollectionBalance;
    const profitShare = locationProfitShare;

    const partnerProfit =
      ((reportTotalData.gross - variance - advance) * profitShare) / 100 -
      taxes;
    const amountToCollect =
      reportTotalData.gross -
      variance -
      advance -
      partnerProfit +
      locationPreviousBalance +
      balanceCorrection;

    const collectedAmount = Number(financials.collectedAmount) || 0;

    setFinancials({
      amountToCollect: amountToCollect.toFixed(2),
      previousBalance: (collectedAmount - amountToCollect).toFixed(2),
    });
  }, [
    collectedMachineEntries,
    financials,
    locationCollectionBalance,
    locationProfitShare,
  ]);

  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  /**
   * Fetch existing collections when modal opens
   */
  const fetchExistingCollections = useCallback(
    async (locationId?: string) => {
      try {
        console.log('🔄 [NewCollection] fetchExistingCollections starting', {
          locationId,
        });
        setIsLoadingExistingCollections(true);
        let url = `/api/collections?incompleteOnly=true&_t=${Date.now()}`;
        if (locationId) url += `&location=${locationId}`;
        if (userId) url += `&collector=${userId}`;

        const response = await axios.get(url);
        console.log('📦 [NewCollection] fetchExistingCollections response:', {
          count: response.data?.length,
        });
        if (response.data && response.data.length > 0) {
          setCollectedMachineEntries(response.data);
          const sortedCollections = [...response.data].sort((a, b) => {
            const timeA = new Date(a.timestamp || a.collectionTime).getTime();
            const timeB = new Date(b.timestamp || b.collectionTime).getTime();
            return timeB - timeA;
          });

          if (sortedCollections.length > 0) {
            setCurrentCollectionTime(
              new Date(
                sortedCollections[0].timestamp ||
                  sortedCollections[0].collectionTime
              )
            );
          }

          const firstCollection = response.data[0];
          if (firstCollection.machineId) {
            const properLocationId = getLocationIdFromMachine(
              firstCollection.machineId
            );
            if (properLocationId) {
              const locationData = locations.find(
                loc => String(loc._id) === properLocationId
              );
              setSelectedLocation(properLocationId, locationData?.name || '');
              setLockedLocation(properLocationId);
              if (locationData) {
                setFinancials({
                  previousBalance: (
                    locationData.collectionBalance || 0
                  ).toString(),
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching existing collections:', error);
      } finally {
        setIsLoadingExistingCollections(false);
      }
    },
    [
      locations,
      userId,
      setSelectedLocation,
      setLockedLocation,
      setCollectedMachineEntries,
      setCurrentCollectionTime,
      setFinancials,
    ]
  );

  useEffect(() => {
    if (show) {
      if (!hasFetchedOnOpenRef.current) {
        fetchExistingCollections(undefined);
        hasFetchedOnOpenRef.current = true;
      }
    } else {
      hasFetchedOnOpenRef.current = false;
    }
  }, [show, fetchExistingCollections]);

  /**
   * Resolve location from machines if not yet set
   */
  useEffect(() => {
    if (
      show &&
      collectedMachineEntries.length > 0 &&
      !selectedLocationId &&
      locations.length > 0
    ) {
      const firstCollection = collectedMachineEntries[0];
      const properLocationId = getLocationIdFromMachine(
        firstCollection.machineId
      );
      if (properLocationId) {
        const locationData = locations.find(
          loc => String(loc._id) === properLocationId
        );
        setSelectedLocation(properLocationId, locationData?.name || '');
        setLockedLocation(properLocationId);
        if (locationData) {
          setFinancials({
            previousBalance: (locationData.collectionBalance || 0).toString(),
          });
        }
      }
    }
  }, [
    show,
    collectedMachineEntries,
    locations,
    selectedLocationId,
    getLocationIdFromMachine,
    setSelectedLocation,
    setLockedLocation,
    setFinancials,
  ]);

  /**
   * Refresh data when modal opens
   */
  useEffect(() => {
    if (show) {
      if (onRefreshLocationsRef.current) onRefreshLocationsRef.current();
      if (onRefreshRef.current) onRefreshRef.current();
    }
  }, [show]);

  /**
   * Populate form when machine is selected
   */
  useEffect(() => {
    if (selectedMachineId && machineForDataEntry) {
      const existingEntry = collectedMachineEntries.find(
        entry => entry.machineId === selectedMachineId
      );
      if (existingEntry) {
        // Editing existing entry
        setCurrentMetersIn(existingEntry.metersIn?.toString() || '');
        setCurrentMetersOut(existingEntry.metersOut?.toString() || '');
        setCurrentMachineNotes(existingEntry.notes || '');
        setCurrentRamClear(existingEntry.ramClear || false);
        setCurrentCollectionTime(
          existingEntry.timestamp
            ? new Date(existingEntry.timestamp)
            : new Date()
        );
        setPrevIn(existingEntry.prevIn || 0);
        setPrevOut(existingEntry.prevOut || 0);
        setSasStartTime(
          existingEntry.sasMeters?.sasStartTime
            ? new Date(existingEntry.sasMeters.sasStartTime)
            : null
        );
        setSasEndTime(
          existingEntry.sasMeters?.sasEndTime
            ? new Date(existingEntry.sasMeters.sasEndTime)
            : null
        );
        setShowAdvancedSas(false);
      } else {
        // New entry - fetch previous collection data
        setPrevIn(
          machineForDataEntry.collectionMeters?.metersIn ??
            machineForDataEntry.sasMeters?.drop ??
            0
        );
        setPrevOut(
          machineForDataEntry.collectionMeters?.metersOut ??
            machineForDataEntry.sasMeters?.totalCancelledCredits ??
            0
        );
        setCurrentMetersIn('');
        setCurrentMetersOut('');
        setCurrentMachineNotes('');
        setCurrentRamClear(false);

        // Fetch last collection time from API
        axios
          .get(
            `/api/collections/last-collection-time?machineId=${selectedMachineId}`
          )
          .then(res => {
            const data = res.data?.data;
            const lastTime = data?.collectionTime;
            setSasStartTime(lastTime ? new Date(lastTime) : null);
            if (data?.hasPreviousCollection) {
              setPrevIn(data.metersIn !== null ? data.metersIn : 0);
              setPrevOut(data.metersOut !== null ? data.metersOut : 0);
            }
          })
          .catch(() => {
            // Fallback to machine's cached collection time
            const machineFromLocation = locations
              .flatMap(l => l.machines || [])
              .find(m => String(m._id) === selectedMachineId);
            setSasStartTime(
              machineFromLocation?.collectionTime
                ? new Date(machineFromLocation.collectionTime)
                : null
            );
          });
      }

      // Set previous collection time from location
      const loc = locations.find(
        l => String(l._id) === (lockedLocationId || selectedLocationId)
      );
      setPreviousCollectionTime(loc?.previousCollectionTime);
    } else if (
      selectedMachineId === undefined &&
      machinesOfSelectedLocation.length > 0
    ) {
      setPrevIn(null);
      setPrevOut(null);
    }
  }, [
    selectedMachineId,
    machineForDataEntry,
    machinesOfSelectedLocation.length,
    locations,
    selectedLocationId,
    lockedLocationId,
    collectedMachineEntries,
  ]);

  // ==========================================================================
  // Event Handlers - Location & Machine Selection
  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  /**
   * Toggle advanced SAS mode and set default times if needed
   */
  const setShowAdvancedSas = (val: boolean | ((p: boolean) => boolean)) => {
    const newVal = typeof val === 'function' ? val(showAdvancedSas) : val;
    const updates: Partial<typeof storeFormData> = { showAdvancedSas: newVal };

    if (newVal) {
      const locationIdToUse = lockedLocationId || selectedLocationId;
      const location = locations.find(l => String(l._id) === locationIdToUse);
      const machine = locations
        .flatMap(l => l.machines || [])
        .find(m => String(m._id) === selectedMachineId);

      if (!sasStartTime) {
        const gameDayOffset = location?.gameDayOffset ?? 8;
        let defaultStart = new Date();
        defaultStart.setHours(gameDayOffset, 0, 0, 0);

        if (machine?.collectionTime) {
          defaultStart = new Date(machine.collectionTime);
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
        defaultEnd.setHours(gameDayOffset, 0, 0, 0);
        updates.sasEndTime = defaultEnd;
      }
    }

    setStoreFormData(updates);
  };

  // ==========================================================================
  // Event Handlers - Location & Machine Selection
  // ==========================================================================

  /**
   * Handle location dropdown change
   */
  const handleLocationChange = useCallback(
    (value: string) => {
      const selectedLoc = locations.find(loc => String(loc._id) === value);
      setSelectedLocation(value, selectedLoc?.name || '');
      if (selectedLoc) {
        setFinancials({
          previousBalance: (selectedLoc.collectionBalance || 0).toString(),
        });
        if (selectedLoc.gameDayOffset !== undefined) {
          const defaultTime = calculateDefaultCollectionTime(
            selectedLoc.gameDayOffset
          );
          setCurrentCollectionTime(defaultTime);
        }
      }
    },
    [locations, setSelectedLocation, setFinancials, setCurrentCollectionTime]
  );

  /**
   * Handle clicking disabled input field
   */
  const handleDisabledFieldClick = useCallback(() => {
    if (!inputsEnabled) {
      toast.warning('Please select a machine first', {
        duration: 3000,
        position: 'top-left',
      });
    }
  }, [inputsEnabled]);

  // ==========================================================================
  // Event Handlers - Machine Entry
  // ==========================================================================

  /**
   * Execute adding a machine entry to the collection
   */
  const executeAddEntry = useCallback(async () => {
    try {
      setIsProcessing(true);
      if (!machineForDataEntry || !selectedLocationId) return;

      const entryData: Partial<CollectionDocument> = {
        machineId: String(machineForDataEntry._id),
        location: selectedLocationName,
        metersIn: Number(currentMetersIn),
        metersOut: Number(currentMetersOut),
        prevIn: prevIn || 0,
        prevOut: prevOut || 0,
        timestamp: currentCollectionTime,
        collectionTime: currentCollectionTime,
        collector: userId,
        notes: currentMachineNotes,
        sasEndTime:
          showAdvancedSas && sasEndTime ? sasEndTime : currentCollectionTime,
        ...(showAdvancedSas && sasStartTime ? { sasStartTime } : {}),
        ...(showAdvancedSas && sasEndTime
          ? { timestamp: sasEndTime, collectionTime: sasEndTime }
          : {}),
        ramClear: currentRamClear,
        ...(currentRamClear
          ? {
              ramClearMetersIn: Number(currentRamClearMetersIn),
              ramClearMetersOut: Number(currentRamClearMetersOut),
            }
          : {
              ramClearMetersIn: undefined,
              ramClearMetersOut: undefined,
            }),
      };

      const createdCollection = await addMachineCollection(entryData);
      setCollectedMachineEntries([
        ...collectedMachineEntries,
        createdCollection,
      ]);
      setLockedLocation(selectedLocationId);
      setHasChanges(true);
      resetEntryForm();
      toast.success('Machine added to list', { position: 'top-left' });

      if (selectedLocationName) {
        const machineName =
          machineForDataEntry?.name ||
          machineForDataEntry?.serialNumber ||
          selectedMachineId;
        const detailParts = [
          `MIn: ${Number(currentMetersIn)}`,
          `MOut: ${Number(currentMetersOut)}`,
          `PrevIn: ${prevIn ?? 0}`,
          `PrevOut: ${prevOut ?? 0}`,
          `RAM Clear: ${currentRamClear ? 'Yes' : 'No'}`,
        ];
        if (currentRamClear) {
          detailParts.push(
            `RC MIn: ${Number(currentRamClearMetersIn)}`,
            `RC MOut: ${Number(currentRamClearMetersOut)}`
          );
        }
        if (currentMachineNotes)
          detailParts.push(`Notes: ${currentMachineNotes}`);
        await logActivityCallback(
          'create',
          'collection',
          String(createdCollection._id),
          `${machineName} at ${selectedLocationName}`,
          `Added machine ${machineName} to collection at ${selectedLocationName} — ${detailParts.join(', ')}`,
          null,
          {
            metersIn: Number(currentMetersIn),
            metersOut: Number(currentMetersOut),
            prevIn: prevIn ?? 0,
            prevOut: prevOut ?? 0,
            ramClear: currentRamClear,
            ramClearMetersIn: currentRamClear
              ? Number(currentRamClearMetersIn)
              : undefined,
            ramClearMetersOut: currentRamClear
              ? Number(currentRamClearMetersOut)
              : undefined,
            notes: currentMachineNotes || undefined,
          }
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to add machine: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    machineForDataEntry,
    selectedLocationId,
    selectedLocationName,
    currentMetersIn,
    currentMetersOut,
    prevIn,
    prevOut,
    currentCollectionTime,
    currentRamClear,
    currentMachineNotes,
    userId,
    sasStartTime,
    sasEndTime,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    logActivityCallback,
    selectedMachineId,
    showAdvancedSas,
  ]);

  /**
   * Handle add machine button click (with rollover check)
   */
  const handleAddEntry = useCallback(() => {
    if (!isAddMachineEnabled || isProcessing) return;

    const onConfirm = () => executeAddEntry();

    const effectivePrevIn =
      prevIn !== null
        ? prevIn
        : (machineForDataEntry?.collectionMeters?.metersIn ?? null);

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
  ]);

  /**
   * Handle add or update entry based on editing state
   */
  const handleAddOrUpdateEntry = useCallback(() => {
    if (editingEntryId) setShowUpdateConfirmation(true);
    else handleAddEntry();
  }, [editingEntryId, handleAddEntry]);

  // ==========================================================================
  // Event Handlers - Editing
  // ==========================================================================

  /**
   * Execute updating an existing machine entry
   */
  const executeUpdateEntry = useCallback(async () => {
    if (!editingEntryId) return;
    try {
      setIsProcessing(true);
      const entryToUpdate = collectedMachineEntries.find(
        e => String(e._id) === editingEntryId
      );
      if (!entryToUpdate) return;

      const updatedData: Partial<CollectionDocument> = {
        metersIn: Number(currentMetersIn),
        metersOut: Number(currentMetersOut),
        timestamp: currentCollectionTime,
        collectionTime: currentCollectionTime,
        ramClear: currentRamClear,
        notes: currentMachineNotes,
        prevIn: prevIn || 0,
        prevOut: prevOut || 0,
        ...(currentRamClear
          ? {
              ramClearMetersIn: Number(currentRamClearMetersIn),
              ramClearMetersOut: Number(currentRamClearMetersOut),
            }
          : { ramClearMetersIn: undefined, ramClearMetersOut: undefined }),
        sasEndTime:
          showAdvancedSas && sasEndTime ? sasEndTime : currentCollectionTime,
        ...(showAdvancedSas && sasStartTime ? { sasStartTime } : {}),
        ...(showAdvancedSas && sasEndTime
          ? { timestamp: sasEndTime, collectionTime: sasEndTime }
          : {}),
      };

      const updatedCollection = await updateCollection(
        editingEntryId,
        updatedData
      );
      const updatedList = collectedMachineEntries.map(e =>
        String(e._id) === editingEntryId ? updatedCollection : e
      );
      setCollectedMachineEntries(updatedList);
      setHasChanges(true);
      setEditingEntryId(null);
      resetEntryForm();
      toast.success('Machine updated successfully!');

      if (selectedLocationName) {
        const machineName =
          entryToUpdate.machineCustomName ||
          entryToUpdate.machineName ||
          entryToUpdate.serialNumber ||
          editingEntryId;
        const changes: string[] = [];
        if (entryToUpdate.metersIn !== Number(currentMetersIn))
          changes.push(
            `MIn: ${entryToUpdate.metersIn} → ${Number(currentMetersIn)}`
          );
        if (entryToUpdate.metersOut !== Number(currentMetersOut))
          changes.push(
            `MOut: ${entryToUpdate.metersOut} → ${Number(currentMetersOut)}`
          );
        if (entryToUpdate.ramClear !== currentRamClear)
          changes.push(
            `RAM Clear: ${entryToUpdate.ramClear ? 'Yes' : 'No'} → ${currentRamClear ? 'Yes' : 'No'}`
          );
        if ((entryToUpdate.notes || '') !== (currentMachineNotes || ''))
          changes.push(
            `Notes: "${entryToUpdate.notes || ''}" → "${currentMachineNotes || ''}"`
          );
        const detailStr =
          changes.length > 0 ? changes.join(', ') : 'No meter changes';
        await logActivityCallback(
          'update',
          'collection',
          editingEntryId,
          `${machineName} at ${selectedLocationName}`,
          `Updated machine ${machineName} at ${selectedLocationName} — ${detailStr}`,
          {
            metersIn: entryToUpdate.metersIn,
            metersOut: entryToUpdate.metersOut,
            prevIn: entryToUpdate.prevIn,
            prevOut: entryToUpdate.prevOut,
            ramClear: entryToUpdate.ramClear,
            notes: entryToUpdate.notes,
          },
          {
            metersIn: Number(currentMetersIn),
            metersOut: Number(currentMetersOut),
            prevIn: prevIn ?? 0,
            prevOut: prevOut ?? 0,
            ramClear: currentRamClear,
            notes: currentMachineNotes || undefined,
          }
        );
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      toast.error('Failed to update machine. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [
    editingEntryId,
    collectedMachineEntries,
    currentMetersIn,
    currentMetersOut,
    currentCollectionTime,
    currentRamClear,
    currentMachineNotes,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    showAdvancedSas,
    sasStartTime,
    sasEndTime,
    selectedLocationName,
    logActivityCallback,
  ]);

  /**
   * Confirm update with rollover check
   */
  const confirmUpdateEntry = useCallback(async () => {
    if (!editingEntryId) return;

    const onConfirm = () => executeUpdateEntry();
    const effectivePrevIn =
      prevIn !== null
        ? prevIn
        : (machineForDataEntry?.collectionMeters?.metersIn ?? null);

    if (effectivePrevIn !== null && Number(currentMetersIn) < effectivePrevIn) {
      setPendingMachineSubmission(() => onConfirm);
      setShowMachineRolloverWarning(true);
      setShowUpdateConfirmation(false);
      return;
    }
    onConfirm();
    setShowUpdateConfirmation(false);
  }, [
    editingEntryId,
    prevIn,
    currentMetersIn,
    machineForDataEntry,
    executeUpdateEntry,
  ]);

  /**
   * Start editing a collected entry
   */
  const handleEditCollectedEntry = useCallback(
    (id: string) => {
      const entry = collectedMachineEntries.find(e => String(e._id) === id);
      if (entry) {
        setEditingEntryId(id);
        setSelectedMachineId(entry.machineId);
        setCurrentMetersIn(entry.metersIn.toString());
        setCurrentMetersOut(entry.metersOut.toString());
        setCurrentMachineNotes(entry.notes || '');
        setCurrentRamClear(entry.ramClear || false);
        if (entry.ramClear) {
          setCurrentRamClearMetersIn(entry.ramClearMetersIn?.toString() || '');
          setCurrentRamClearMetersOut(
            entry.ramClearMetersOut?.toString() || ''
          );
        }
        setPrevIn(entry.prevIn || 0);
        setPrevOut(entry.prevOut || 0);
        setShowAdvancedSas(false);
        setSasStartTime(
          entry.sasMeters?.sasStartTime
            ? new Date(entry.sasMeters.sasStartTime)
            : null
        );
        setSasEndTime(
          entry.sasMeters?.sasEndTime
            ? new Date(entry.sasMeters.sasEndTime)
            : null
        );
        setCurrentCollectionTime(
          entry.timestamp ? new Date(entry.timestamp) : new Date()
        );
        toast.info('Editing machine collection entry');
      }
    },
    [collectedMachineEntries]
  );

  /**
   * Cancel editing mode
   */
  const handleCancelEdit = useCallback(() => {
    setEditingEntryId(null);
    resetEntryForm();
    toast.info('Edit cancelled');
  }, []);

  // ==========================================================================
  // Event Handlers - Deletion
  // ==========================================================================

  /**
   * Start delete confirmation for an entry
   */
  const handleDeleteCollectedEntry = useCallback((id: string) => {
    setEntryToDelete(id);
    setShowDeleteConfirmation(true);
  }, []);

  /**
   * Execute deletion of an entry
   */
  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    try {
      setIsProcessing(true);
      const entryData = collectedMachineEntries.find(
        e => String(e._id) === entryToDelete
      );
      await deleteMachineCollection(entryToDelete);
      if (entryData) {
        await logActivityCallback(
          'delete',
          'collection',
          entryToDelete,
          `${entryData.machineCustomName} at ${selectedLocationName}`,
          `Deleted collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`,
          entryData as unknown as Record<string, unknown>,
          null
        );
      }
      const updatedEntries = collectedMachineEntries.filter(
        e => String(e._id) !== entryToDelete
      );
      setCollectedMachineEntries(updatedEntries);
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
  };

  // ==========================================================================
  // Event Handlers - Rollover Warning
  // ==========================================================================

  const handleConfirmMachineRollover = useCallback(() => {
    if (pendingMachineSubmission) {
      pendingMachineSubmission();
      setPendingMachineSubmission(null);
    }
    setShowMachineRolloverWarning(false);
  }, [pendingMachineSubmission]);

  const handleCancelMachineRollover = useCallback(() => {
    setPendingMachineSubmission(null);
    setShowMachineRolloverWarning(false);
  }, []);

  // ==========================================================================
  // Event Handlers - Report Creation
  // ==========================================================================

  /**
   * Create collection report from collected machines
   */
  const confirmCreateReports = async (
    variationsData?: VariationsCheckResponse | null
  ) => {
    try {
      console.log('🚀 [NewCollection] confirmCreateReports started', {
        hasVariationsData: !!variationsData,
      });
      setIsProcessing(true);

      const storeState = useCollectionModalStore.getState();
      const locationIdToUse =
        storeState.lockedLocationId || storeState.selectedLocationId;
      const collectedEntries = storeState.collectedMachines;

      console.log('📍 [NewCollection] Location targeting (direct store):', {
        locationIdToUse,
        locationName: storeState.selectedLocationName,
        machinesCount: collectedEntries.length,
      });

      if (!locationIdToUse || collectedEntries.length === 0) {
        console.error('❌ [NewCollection] Blocked creation:', {
          reason: !locationIdToUse
            ? 'Missing location ID'
            : 'Empty machine list',
          locationIdToUse,
          machinesCount: collectedEntries.length,
        });
        toast.error(
          `Cannot create report: ${!locationIdToUse ? 'Location' : 'Machines'} missing.`
        );
        return;
      }

      const totalMovementData = collectedEntries.map(entry => {
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

      const reportTotalData = totalMovementData.reduce(
        (prev, current) => ({
          drop: prev.drop + current.drop,
          cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
          gross: prev.gross + current.gross,
        }),
        { drop: 0, cancelledCredits: 0, gross: 0 }
      );

      const reportId = uuidv4();

      const payload: CreateCollectionReportPayload = {
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        currentBalance: 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected:
          Number(financials.collectedAmount) ||
          Number(financials.amountToCollect) ||
          0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes: Number(financials.taxes) || 0,
        advance: Number(financials.advance) || 0,
        collector: userId || 'unknown',
        locationName: selectedLocationName,
        locationReportId: reportId,
        location: locationIdToUse,
        totalDrop: reportTotalData.drop,
        totalCancelled: reportTotalData.cancelledCredits,
        totalGross: reportTotalData.gross,
        totalSasGross:
          variationsData?.machines.reduce(
            (sum: number, m: MachineVariationData) =>
              sum + (Number(m.sasGross) || 0),
            0
          ) || 0,
        timestamp: currentCollectionTime,
        varianceReason: financials.varianceReason,
        previousCollectionTime: previousCollectionTime
          ? typeof previousCollectionTime === 'string'
            ? new Date(previousCollectionTime)
            : previousCollectionTime
          : undefined,
        locationProfitPerc: selectedLocation?.profitShare || 50,
        reasonShortagePayment: financials.reasonForShortagePayment,
        balanceCorrection: Number(financials.balanceCorrection) || 0,
        balanceCorrectionReas: financials.balanceCorrectionReason,
        includeJackpot: selectedLocation?.includeJackpot || false,
        machines: collectedEntries.map(e => {
          const varData = variationsData?.machines.find(
            m => m.machineId === e.machineId
          );
          return {
            machineId: String(e.machineId),
            metersIn: e.metersIn,
            metersOut: e.metersOut,
            prevMetersIn: e.prevIn || 0,
            prevMetersOut: e.prevOut || 0,
            timestamp: e.timestamp,
            locationReportId: reportId,
            sasGross: varData ? Number(varData.sasGross) || 0 : undefined,
            variation: varData ? Number(varData.variation) || 0 : undefined,
          };
        }),
        collectionIds: collectedEntries.map(e => String(e._id)),
      };

      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        console.error('❌ [NewCollection] Validation failed:', {
          errors: validation.errors,
          payload,
        });
        toast.error(`Validation Error: ${validation.errors.join(', ')}`, {
          duration: 8000,
          position: 'top-center',
        });
        return;
      }

      console.log('📤 [NewCollection] Sending payload to API...', payload);

      const result = await createCollectionReport(payload);
      await logActivityCallback(
        'create',
        'collection-report',
        String(result.report._id),
        `Collection Report for ${storeState.selectedLocationName}`,
        `Created collection report for ${collectedEntries.length} machines at ${storeState.selectedLocationName}`,
        null,
        result.report as unknown as Record<string, unknown>
      );

      toast.success('Collection report created successfully', {
        duration: 5000,
      });
      setCollectedMachineEntries([]);
      setLockedLocation(undefined);
      setSelectedLocation(undefined, '');
      setHasChanges(true);
      setShowCreateReportConfirmation(false);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create report: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================================================
  // Event Handlers - Bulk Operations
  // ==========================================================================

  /**
   * Apply SAS times to all collected machines
   */
  const handleApplyAllDates = useCallback(async () => {
    if (!updateAllSasStartDate && !updateAllSasEndDate) return;
    if (collectedMachineEntries.length < 2) return;
    try {
      setIsProcessing(true);
      const axiosInstance = (await import('axios')).default;
      const patchData: Record<string, string> = {};

      const startTimeISO = updateAllSasStartDate?.toISOString();
      const endTimeISO = updateAllSasEndDate?.toISOString();

      if (startTimeISO) patchData.sasStartTime = startTimeISO;
      if (endTimeISO) patchData.sasEndTime = endTimeISO;

      const results = await Promise.allSettled(
        collectedMachineEntries.map(async entry => {
          if (!entry._id) return;
          return await axiosInstance.patch(
            `/api/collections?id=${entry._id}`,
            patchData
          );
        })
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(
          `${failed} machine${failed > 1 ? 's' : ''} failed to update`
        );
        return;
      }

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
    } catch {
      toast.error('Failed to update SAS times');
    } finally {
      setIsProcessing(false);
    }
  }, [updateAllSasStartDate, updateAllSasEndDate, collectedMachineEntries]);

  // ==========================================================================
  // Event Handlers - Modal Close
  // ==========================================================================

  /**
   * Close modal and reset state
   */
  const handleClose = useCallback(() => {
    if (hasChanges && onRefresh) {
      onRefresh();
    }

    setCollectedMachineEntries([]);
    setSelectedLocation(undefined, '');
    setSelectedMachineId(undefined);
    setLockedLocation(undefined);
    setMachineSearchTerm('');
    setHasChanges(false);
    resetStoreState();
    setMachinesOfSelectedLocation([]);
    resetEntryForm();

    onClose();
  }, [hasChanges, onRefresh, onClose, resetStoreState]);

  /**
   * Reset entry form fields
   */
  const resetEntryForm = () => {
    setSelectedMachineId(undefined);
    setCurrentMetersIn('');
    setCurrentMetersOut('');
    setCurrentRamClearMetersIn('');
    setCurrentRamClearMetersOut('');
    setCurrentMachineNotes('');
    setCurrentRamClear(false);
    setSasStartTime(showAdvancedSas ? sasStartTime : null);
    setSasEndTime(showAdvancedSas ? sasEndTime : null);
    setShowAdvancedSas(showAdvancedSas);
  };

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Location & Machine Selection
    selectedLocationId,
    selectedLocationName,
    machinesOfSelectedLocation,
    machineSearchTerm,
    setMachineSearchTerm,
    lockedLocationId,
    selectedMachineId,
    setSelectedMachineId,
    filteredMachines,
    machineForDataEntry,
    inputsEnabled,
    isAddMachineEnabled,

    // Form Data
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
    prevIn: storePrevIn,
    setPrevIn,
    prevOut: storePrevOut,
    setPrevOut,

    // State
    isFirstCollection,
    setIsFirstCollection,
    collectedMachineEntries,
    isProcessing,
    editingEntryId,
    previousCollectionTime,
    isLoadingExistingCollections,
    baseBalanceCorrection: '0',
    setBaseBalanceCorrection: () => {},

    // Financials
    financials,
    setFinancials,

    // Confirmation Modals
    showUpdateConfirmation,
    setShowUpdateConfirmation,
    showMachineRolloverWarning,
    setShowMachineRolloverWarning,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    showViewMachineConfirmation,
    setShowViewMachineConfirmation,
    entryToDelete,
    setEntryToDelete,
    anyConfirmationOpen,

    // Bulk SAS Update
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,

    // Debounced Values
    debouncedCurrentMetersIn,
    debouncedCurrentMetersOut,
    debouncedCurrentRamClearMetersIn,
    debouncedCurrentRamClearMetersOut,

    // Event Handlers - Selection
    handleLocationChange,
    handleClose,
    handleDisabledFieldClick,

    // Event Handlers - Entry
    handleAddOrUpdateEntry,
    handleEditCollectedEntry,
    handleDeleteCollectedEntry,
    handleAddEntry,
    confirmUpdateEntry,
    confirmDeleteEntry,

    // Event Handlers - Rollover
    handleConfirmMachineRollover,
    handleCancelMachineRollover,
    handleCancelEdit,

    // Event Handlers - Report
    confirmCreateReports,

    // Event Handlers - Bulk
    handleApplyAllDates,
  };
}
