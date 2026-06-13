/**
 * useNewCollectionModal Hook
 *
 * Manages state and logic for the Create New Collection Report Modal.
 * Handles location selection, machine fetching, validation, meter reading entry management,
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
import { getLocationsWithMachines } from '@/lib/helpers/collectionReport/fetching';
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
import { calculateCabinetMovement } from '@/lib/utils/movement';
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
function sortMachinesAlphabetically(
  machines: CollectionReportMachineSummary[]
): CollectionReportMachineSummary[] {
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
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [internalLocations, setInternalLocations] = useState<
    CollectionReportLocationWithMachines[]
  >([]);

  // Use internal locations if available, fallback to prop
  const locations =
    internalLocations.length > 0 ? internalLocations : propLocations;
  const [selectedMachineId, setSelectedMachineId] = useState<
    string | undefined
  >(undefined);

  // Machine Data Entry
  const [isFirstCollection, setIsFirstCollection] = useState(false);
  const [previousCollectionTime, setPreviousCollectionTime] = useState<
    string | Date | undefined
  >(undefined);
  const [machineFirstCollectionTime, setMachineFirstCollectionTime] =
    useState<Date | null>(null);
  const [machineLastCollectionTime, setMachineLastCollectionTime] =
    useState<Date | null>(null);
  const [isLoadingExistingCollections, setIsLoadingExistingCollections] =
    useState(false);
  const [isLoadingTime, setIsLoadingTime] = useState(false);

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
  const [sasUpdateProgress, setSasUpdateProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

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
  const setSasStartTime = (val: Date | string | null) =>
    setStoreFormData({
      sasStartTime:
        val === null ? null : typeof val === 'string' ? new Date(val) : val,
    });
  const setSasEndTime = (val: Date | string | null) =>
    setStoreFormData({
      sasEndTime:
        val === null ? null : typeof val === 'string' ? new Date(val) : val,
    });
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
   * Resolve a location id from a collection's `location` field. That field stores
   * the location _id (current records) but may hold the location name on legacy
   * records, so match against either.
   */
  const getLocationIdFromCollection = useCallback(
    (locationIdentifier: string) => {
      const found = locations.find(
        location =>
          String(location._id) === locationIdentifier ||
          location.name === locationIdentifier
      );
      return found ? String(found._id) : null;
    },
    [locations]
  );

  // ==========================================================================
  // Computed
  // ==========================================================================

  /**
   * Selected location object from locations array
   */
  const selectedLocation = useMemo(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    return locations.find(location => String(location._id) === locationIdToUse);
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
      machine => machine._id === selectedMachineId
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

  const isMiddleReportWarning = useMemo(() => {
    if (machineFirstCollectionTime && machineLastCollectionTime) {
      const startInMiddle =
        sasStartTime &&
        sasStartTime > machineFirstCollectionTime &&
        sasStartTime < machineLastCollectionTime;
      const targetTime = sasEndTime || currentCollectionTime;
      const endInMiddle =
        targetTime &&
        targetTime > machineFirstCollectionTime &&
        targetTime < machineLastCollectionTime;
      if (startInMiddle || endInMiddle) {
        return true;
      }
    }
    return false;
  }, [
    machineFirstCollectionTime,
    machineLastCollectionTime,
    sasStartTime,
    sasEndTime,
    currentCollectionTime,
  ]);

  /**
   * Whether the "Add Machine" button should be enabled
   */
  const isAddMachineEnabled = useMemo(() => {
    if (isMiddleReportWarning) return false;
    if (!machineForDataEntry) return false;
    if (!currentMetersIn || !currentMetersOut) return false;
    if (
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut)
    )
      return false;

    // RAM Clear validation: RAM clear meters must be >= previous meters (prevIn/prevOut)
    if (currentRamClear) {
      if (
        Number(currentRamClearMetersIn) < Number(storePrevIn || 0) ||
        Number(currentRamClearMetersOut) < Number(storePrevOut || 0)
      ) {
        return false;
      }
    }

    // SAS Time validation: if advanced SAS is enabled, check time logic
    if (
      showAdvancedSas &&
      sasStartTime &&
      sasEndTime &&
      sasStartTime > sasEndTime
    ) {
      return false;
    }

    return true;
  }, [
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    storePrevIn,
    storePrevOut,
    showAdvancedSas,
    sasStartTime,
    sasEndTime,
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

  // Fetch rich metadata when modal opens
  useEffect(() => {
    if (show && userId) {
      setIsLoadingLocations(true);
      getLocationsWithMachines(undefined, false)
        .then((locs: CollectionReportLocationWithMachines[]) => {
          setInternalLocations(locs);
        })
        .catch((err: unknown) => {
          console.error('Error fetching collection metadata:', err);
          toast.error('Failed to load collection metadata');
        })
        .finally(() => setIsLoadingLocations(false));
    } else {
      setIsLoadingLocations(false);
    }
  }, [show, userId]);

  /**
   * Fetch machines when location changes
   */
  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    if (locationIdToUse) {
      const fetchMachinesForLocation = async () => {
        setIsLoadingMachines(true);
        try {
          const response = await axios.get(
            `/api/cabinets?locationId=${locationIdToUse}&_t=${Date.now()}`
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
      const location = locations.find(
        location => String(location._id) === locationIdToUse
      );
      if (location?.gameDayOffset !== undefined) {
        const defaultTime = calculateDefaultCollectionTime(
          location.gameDayOffset
        );
        setCurrentCollectionTime(defaultTime);
      }
    }
  }, [selectedLocationId, lockedLocationId, locations]);

  /**
   * Warn the user when RAM clear meters are less than the previous values
   */
  useEffect(() => {
    if (!currentRamClear) return;
    const ramIn = debouncedCurrentRamClearMetersIn
      ? Number(debouncedCurrentRamClearMetersIn)
      : null;
    const ramOut = debouncedCurrentRamClearMetersOut
      ? Number(debouncedCurrentRamClearMetersOut)
      : null;
    const pIn = prevIn !== null ? prevIn : 0;
    const pOut = prevOut !== null ? prevOut : 0;
    if (ramIn !== null && ramIn < pIn) {
      toast.warning(
        `RAM clear Meters In (${ramIn}) is less than the previous value (${pIn}). It must be ≥ previous.`,
        { position: 'top-left', duration: 5000 }
      );
    }
    if (ramOut !== null && ramOut < pOut) {
      toast.warning(
        `RAM clear Meters Out (${ramOut}) is less than the previous value (${pOut}). It must be ≥ previous.`,
        { position: 'top-left', duration: 5000 }
      );
    }
  }, [
    debouncedCurrentRamClearMetersIn,
    debouncedCurrentRamClearMetersOut,
    currentRamClear,
    prevIn,
    prevOut,
  ]);

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
    // List only the specific financials fields that are read inside the callback.
    // Using the entire `financials` object here causes an infinite loop because
    // setFinancials() creates a new object reference, which recreates this callback,
    // which triggers the useEffect([calculateAmountToCollect]) to re-run, forever.
    financials.taxes,
    financials.variance,
    financials.advance,
    financials.balanceCorrection,
    financials.collectedAmount,
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
        let url = `/api/collection-reports/collections?incompleteOnly=true&_t=${Date.now()}`;
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
          if (firstCollection.location) {
            const properLocationId = getLocationIdFromCollection(
              firstCollection.location
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
      getLocationIdFromCollection,
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
      const properLocationId = getLocationIdFromCollection(
        firstCollection.location
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
    getLocationIdFromCollection,
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
        setShowAdvancedSas(false);
        setSasStartTime(
          existingEntry.sasMeters?.sasStartTime
            ? (existingEntry.sasMeters?.sasStartTime ?? undefined)
            : null
        );
        setSasEndTime(
          existingEntry.sasMeters?.sasEndTime
            ? existingEntry.sasMeters?.sasEndTime
            : null
        );
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
        setIsLoadingTime(true);
        axios
          .get(
            `/api/collection-reports/collections/last-collection-time?machineId=${selectedMachineId}`
          )
          .then(res => {
            const data = res.data?.data;
            const lastTime = data?.collectionTime;
            const firstTime = data?.firstCollectionTime;

            if (firstTime) setMachineFirstCollectionTime(new Date(firstTime));
            else setMachineFirstCollectionTime(null);

            if (lastTime) {
              setMachineLastCollectionTime(new Date(lastTime));
              setSasStartTime(new Date(lastTime));
            } else {
              setMachineLastCollectionTime(null);
              const loc = locations.find(
                l => String(l._id) === (lockedLocationId || selectedLocationId)
              );
              const gameDayOffset = loc?.gameDayOffset ?? 8;
              const now = new Date();
              const currentGamingDayStart = new Date(now);
              if (now.getHours() < gameDayOffset) {
                currentGamingDayStart.setDate(
                  currentGamingDayStart.getDate() - 1
                );
              }
              currentGamingDayStart.setHours(gameDayOffset, 0, 0, 0);
              setSasStartTime(
                new Date(currentGamingDayStart.getTime() - 24 * 60 * 60 * 1000)
              );
            }
            if (data?.hasPreviousCollection) {
              setPrevIn(data.metersIn !== null ? data.metersIn : 0);
              setPrevOut(data.metersOut !== null ? data.metersOut : 0);
            }
          })
          .catch(() => {
            setMachineFirstCollectionTime(null);
            setMachineLastCollectionTime(null);
            const machineFromLocation = machinesOfSelectedLocation.find(
              m => String(m._id) === selectedMachineId
            );
            if (machineFromLocation?.collectionTime) {
              setSasStartTime(new Date(machineFromLocation.collectionTime));
            } else {
              const loc = locations.find(
                l => String(l._id) === (lockedLocationId || selectedLocationId)
              );
              const gameDayOffset = loc?.gameDayOffset ?? 8;
              const now = new Date();
              const currentGamingDayStart = new Date(now);
              if (now.getHours() < gameDayOffset) {
                currentGamingDayStart.setDate(
                  currentGamingDayStart.getDate() - 1
                );
              }
              currentGamingDayStart.setHours(gameDayOffset, 0, 0, 0);
              setSasStartTime(
                new Date(currentGamingDayStart.getTime() - 24 * 60 * 60 * 1000)
              );
            }
          })
          .finally(() => {
            setIsLoadingTime(false);
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
      setMachineFirstCollectionTime(null);
      setMachineLastCollectionTime(null);
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
  // Handlers
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
      const location = locations.find(
        location => String(location._id) === locationIdToUse
      );
      const machine = machinesOfSelectedLocation.find(
        m => String(m._id) === selectedMachineId
      );

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
  // Handlers
  // ==========================================================================

  /**
   * Handle location dropdown change
   */
  const handleLocationChange = useCallback(
    (value: string) => {
      const location = locations.find(
        location => String(location._id) === value
      );
      setSelectedLocation(value, location?.name || '');
      if (location) {
        setFinancials({
          previousBalance: (location.collectionBalance || 0).toString(),
        });
        if (location.gameDayOffset !== undefined) {
          const defaultTime = calculateDefaultCollectionTime(
            location.gameDayOffset
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
  // Handlers
  // ==========================================================================

  /**
   * Execute adding a machine entry to the collection
   */
  const executeAddEntry = useCallback(async () => {
    try {
      setIsProcessing(true);
      if (!machineForDataEntry || !selectedLocationId) return;

      console.log('[executeAddEntry] Starting to add machine entry');
      console.log('[executeAddEntry] sasEndTime:', sasEndTime);
      console.log('[executeAddEntry] sasStartTime:', sasStartTime);
      console.log(
        '[executeAddEntry] currentCollectionTime:',
        currentCollectionTime
      );
      console.log('[executeAddEntry] showAdvancedSas:', showAdvancedSas);

      // Calculate prevIn/prevOut using helper (same as edit)
      // Priority: 1. Previous collection, 2. Machine collectionMeters
      const prevIn = (() => {
        const sasDrop = machineForDataEntry.sasMeters?.drop ?? null;
        const collectionIn = machineForDataEntry.collectionMeters?.metersIn;
        return collectionIn !== null &&
          collectionIn !== undefined &&
          collectionIn > 0
          ? collectionIn.toString()
          : sasDrop !== null && sasDrop > 0
            ? sasDrop.toString()
            : '0';
      })();
      const prevOut = (() => {
        const sasCancelled =
          machineForDataEntry.sasMeters?.totalCancelledCredits ?? null;
        const collectionOut = machineForDataEntry.collectionMeters?.metersOut;
        return collectionOut !== null &&
          collectionOut !== undefined &&
          collectionOut > 0
          ? collectionOut.toString()
          : sasCancelled !== null && sasCancelled > 0
            ? sasCancelled.toString()
            : '0';
      })();

      // Determine the time to use for timestamp, collectionTime, and sasEndTime
      // In simple mode: use sasEndTime if available, otherwise currentCollectionTime
      // In advanced mode: use sasEndTime if available, otherwise currentCollectionTime
      const timeForNew = sasEndTime || currentCollectionTime;
      console.log(
        '[executeAddEntry] timeForNew (sasEndTime || currentCollectionTime):',
        timeForNew
      );

      const entryData: Partial<CollectionDocument> = {
        machineId: selectedMachineId,
        location: selectedLocationId || '',
        collector: userId,
        metersIn: Number(currentMetersIn),
        metersOut: Number(currentMetersOut),
        prevIn: Number(prevIn) || 0,
        prevOut: Number(prevOut) || 0,
        timestamp: timeForNew,
        collectionTime: timeForNew,
        notes: currentMachineNotes,
        sasEndTime: sasEndTime || timeForNew,
        ...(sasStartTime ? { sasStartTime } : {}),
        ramClear: currentRamClear,
        ...(currentRamClear
          ? {
              ramClearMetersIn: Number(currentRamClearMetersIn),
              ramClearMetersOut: Number(currentRamClearMetersOut),
            }
          : {}),
      };

      console.log(
        '[executeAddEntry] entryData being sent:',
        JSON.stringify(entryData, null, 2)
      );

      // Guard: validate SAS time ordering before hitting the API
      if (entryData.sasStartTime && entryData.sasEndTime) {
        const sasStart = new Date(entryData.sasStartTime as string | Date);
        const sasEnd = new Date(entryData.sasEndTime as string | Date);
        if (sasStart >= sasEnd) {
          toast.error('SAS start time must be before end time', {
            description: `Start: ${sasStart.toLocaleString()} · End: ${sasEnd.toLocaleString()}`,
            duration: 7000,
          });
          setIsProcessing(false);
          return;
        }
      }

      const createdCollection = await addMachineCollection(entryData);
      console.log(
        '[executeAddEntry] createdCollection response:',
        JSON.stringify(createdCollection, null, 2)
      );

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
          `PrevIn: ${prevIn || 0}`,
          `PrevOut: ${prevOut || 0}`,
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
      const apiMessage = (error as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      const errorMessage =
        apiMessage ??
        (error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Failed to add machine: ${errorMessage}`, { duration: 7000 });
    } finally {
      setIsProcessing(false);
    }
  }, [
    machineForDataEntry,
    selectedLocationId,
    selectedLocationName,
    currentMetersIn,
    currentMetersOut,
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
  // Handlers
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

      console.log('[executeUpdateEntry] Starting to update machine entry');
      console.log('[executeUpdateEntry] sasEndTime:', sasEndTime);
      console.log('[executeUpdateEntry] sasStartTime:', sasStartTime);
      console.log(
        '[executeUpdateEntry] currentCollectionTime:',
        currentCollectionTime
      );
      console.log('[executeUpdateEntry] showAdvancedSas:', showAdvancedSas);

      // Determine the time to use for timestamp, collectionTime, and sasEndTime
      const timeForUpdate = sasEndTime || currentCollectionTime;
      console.log(
        '[executeUpdateEntry] timeForUpdate (sasEndTime || currentCollectionTime):',
        timeForUpdate
      );

      const updatedData: Partial<CollectionDocument> = {
        metersIn: Number(currentMetersIn),
        metersOut: Number(currentMetersOut),
        ramClear: currentRamClear,
        notes: currentMachineNotes,
        prevIn: Number(prevIn) || 0,
        prevOut: Number(prevOut) || 0,
        ...(currentRamClear
          ? {
              ramClearMetersIn: Number(currentRamClearMetersIn),
              ramClearMetersOut: Number(currentRamClearMetersOut),
            }
          : {}),
        sasEndTime: timeForUpdate,
        ...(sasStartTime ? { sasStartTime } : {}),
        timestamp: timeForUpdate,
        collectionTime: timeForUpdate,
      };

      console.log(
        '[executeUpdateEntry] updatedData being sent:',
        JSON.stringify(updatedData, null, 2)
      );

      const updatedCollection = await updateCollection(
        editingEntryId,
        updatedData
      );
      console.log(
        '[executeUpdateEntry] updatedCollection response:',
        JSON.stringify(updatedCollection, null, 2)
      );

      const updatedList = collectedMachineEntries.map(entry =>
        String(entry._id) === editingEntryId ? updatedCollection : entry
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
      const entry = collectedMachineEntries.find(
        entry => String(entry._id) === id
      );
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
  // Handlers
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
  // Handlers
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
  // Handlers
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
            (sum: number, machineData: MachineVariationData) =>
              sum + (Number(machineData.sasGross) || 0),
            0
          ) || 0,
        // Use latest/most recent timestamp from all machines for the report
        timestamp:
          collectedEntries.length > 0
            ? new Date(
                Math.max(
                  ...collectedEntries.map(entry =>
                    entry.timestamp
                      ? new Date(entry.timestamp).getTime()
                      : currentCollectionTime.getTime()
                  )
                )
              )
            : currentCollectionTime,
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
        machines: collectedEntries.map(entry => {
          const varData = variationsData?.machines.find(
            variationMachine => variationMachine.machineId === entry.machineId
          );
          return {
            collectionId: entry._id,
            machineId: String(entry.machineId),
            locationId: selectedLocationId || '',
            metersIn: entry.metersIn,
            metersOut: entry.metersOut,
            prevMetersIn: entry.prevIn || 0,
            prevMetersOut: entry.prevOut || 0,
            timestamp: entry.timestamp,
            locationReportId: reportId,
            sasGross: varData ? Number(varData.sasGross) || 0 : undefined,
            variation: varData ? Number(varData.variation) || 0 : undefined,
            ramClear: entry.ramClear,
            ramClearMetersIn: entry.ramClearMetersIn,
            ramClearMetersOut: entry.ramClearMetersOut,
          };
        }),
        collectionIds: collectedEntries.map(entry => entry._id),
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
      if (onRefresh) onRefresh();
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
  // Handlers
  // ==========================================================================

  /**
   * Apply SAS times to all collected machines
   */
  const handleApplyAllDates = useCallback(async () => {
    if (!updateAllSasStartDate && !updateAllSasEndDate) return;
    if (collectedMachineEntries.length < 1) return;
    try {
      setIsProcessing(true);
      const axiosInstance = (await import('axios')).default;
      const patchData: Record<string, string> = {};

      const startTimeISO = updateAllSasStartDate?.toISOString();
      const endTimeISO = updateAllSasEndDate?.toISOString();

      if (startTimeISO) patchData.sasStartTime = startTimeISO;
      if (endTimeISO) patchData.sasEndTime = endTimeISO;

      const total = collectedMachineEntries.length;
      setSasUpdateProgress({ completed: 0, total });
      const results = await Promise.allSettled(
        collectedMachineEntries.map(async entry => {
          if (!entry._id) {
            setSasUpdateProgress(prev =>
              prev ? { ...prev, completed: prev.completed + 1 } : null
            );
            return;
          }
          const result = await axiosInstance.patch(
            `/api/collection-reports/collections/${entry._id}`,
            patchData
          );
          setSasUpdateProgress(prev =>
            prev ? { ...prev, completed: prev.completed + 1 } : null
          );
          return result;
        })
      );
      const failed = results.filter(
        result => result.status === 'rejected'
      ).length;
      if (failed > 0) {
        toast.error(
          `${failed} machine${failed > 1 ? 's' : ''} failed to update`
        );
        return;
      }

      const updatedEntries = collectedMachineEntries.map(entry => {
        const sasMeters = { ...entry.sasMeters };
        // Ensure sasStartTime is Date | undefined (never string)
        const getSasStartTime = (): Date | undefined => {
          if (startTimeISO) return new Date(startTimeISO as string);
          const existing = entry.sasMeters?.sasStartTime;
          if (!existing) return undefined;
          return existing instanceof Date
            ? existing
            : new Date(existing as string);
        };
        sasMeters.sasStartTime = getSasStartTime();
        // Ensure sasEndTime is Date | undefined (never string)
        const getSasEndTime = (): Date | undefined => {
          if (endTimeISO) return new Date(endTimeISO as string);
          const existing = entry.sasMeters?.sasEndTime;
          if (!existing) return undefined;
          return existing instanceof Date
            ? existing
            : new Date(existing as string);
        };
        sasMeters.sasEndTime = getSasEndTime();
        return { ...entry, sasMeters };
      });
      setCollectedMachineEntries(
        updatedEntries as typeof collectedMachineEntries
      );

      toast.success('All SAS times updated successfully!');
      setUpdateAllSasStartDate(undefined);
      setUpdateAllSasEndDate(undefined);
    } catch {
      toast.error('Failed to update SAS times');
    } finally {
      setIsProcessing(false);
      setSasUpdateProgress(null);
    }
  }, [updateAllSasStartDate, updateAllSasEndDate, collectedMachineEntries]);

  // Auto-populate "Update All SAS Times" pickers from the current entries:
  // start = earliest sasStartTime, end = latest sasEndTime.
  useEffect(() => {
    if (collectedMachineEntries.length === 0) return;
    const toDate = (val: Date | string | undefined | null): Date | null => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val as string);
      return isNaN(d.getTime()) ? null : d;
    };
    const starts = collectedMachineEntries
      .map(entry => toDate(entry.sasMeters?.sasStartTime))
      .filter((t): t is Date => t !== null);
    const ends = collectedMachineEntries
      .map(entry => toDate(entry.sasMeters?.sasEndTime))
      .filter((t): t is Date => t !== null);
    if (starts.length > 0) {
      setUpdateAllSasStartDate(new Date(Math.min(...starts.map(t => t.getTime()))));
    }
    if (ends.length > 0) {
      setUpdateAllSasEndDate(new Date(Math.max(...ends.map(t => t.getTime()))));
    }
  }, [collectedMachineEntries]);

  // ==========================================================================
  // Handlers
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
    locations,
    isLoadingLocations,
    isLoadingMachines,
    isLoadingTime,
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
    isMiddleReportWarning,

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
    sasUpdateProgress,
  };
}
