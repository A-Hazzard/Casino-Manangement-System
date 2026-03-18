/**
 * useNewCollectionModal Hook
 *
 * Encapsulates state and logic for the New Collection Modal.
 * Handles location selection, machine fetching, validation, and entry management.
 */

'use client';

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
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { calculateDefaultCollectionTime } from '@/lib/utils/collection';
import { calculateMachineMovement } from '@/lib/utils/movement';
import { validateCollectionReportPayload } from '@/lib/utils/validation';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

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

  const [hasChanges, setHasChanges] = useState(false);
  const selectedLocationName = useCollectionModalStore(state => state.selectedLocationName);
  
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState<
    string | undefined
  >(undefined);

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

  const setCurrentMetersIn = (val: string) => setStoreFormData({ metersIn: val });
  const setCurrentMetersOut = (val: string) => setStoreFormData({ metersOut: val });
  const setCurrentRamClearMetersIn = (val: string) => setStoreFormData({ ramClearMetersIn: val });
  const setCurrentRamClearMetersOut = (val: string) => setStoreFormData({ ramClearMetersOut: val });
  const setCurrentMachineNotes = (val: string) => setStoreFormData({ notes: val });
  const setCurrentRamClear = (val: boolean) => setStoreFormData({ ramClear: val });
  const setCurrentCollectionTime = (val: Date) => setStoreFormData({ collectionTime: val });
  const setShowAdvancedSas = (val: boolean | ((p: boolean) => boolean)) => {
    const newVal = typeof val === 'function' ? val(showAdvancedSas) : val;
    const updates: Partial<typeof storeFormData> = { showAdvancedSas: newVal };

    // If turning on and times are null, set reasonable defaults
    if (newVal) {
      const locationIdToUse = lockedLocationId || selectedLocationId;
      const location = locations.find(l => String(l._id) === locationIdToUse);
      const machine = locations
        .flatMap(l => l.machines || [])
        .find(m => String(m._id) === selectedMachineId);

      if (!sasStartTime) {
        let defaultStart = new Date();
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
        defaultEnd.setHours(gameDayOffset - 1, 59, 59, 0);
        updates.sasEndTime = defaultEnd;
      }
    }

    setStoreFormData(updates);
  };
  const setSasStartTime = (val: Date | null) => setStoreFormData({ sasStartTime: val });
  const setSasEndTime = (val: Date | null) => setStoreFormData({ sasEndTime: val });
  const [isFirstCollection, setIsFirstCollection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showMachineRolloverWarning, setShowMachineRolloverWarning] =
    useState(false);
  const [pendingMachineSubmission, setPendingMachineSubmission] = useState<
    (() => void) | null
  >(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showViewMachineConfirmation, setShowViewMachineConfirmation] =
    useState(false);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);
  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);
  const [previousCollectionTime, setPreviousCollectionTime] = useState<
    string | Date | undefined
  >(undefined);
  const [isLoadingExistingCollections, setIsLoadingExistingCollections] =
    useState(false);
  const [baseBalanceCorrection, setBaseBalanceCorrection] =
    useState<string>('0');
  const [updateAllSasStartDate, setUpdateAllSasStartDate] = useState<Date | undefined>(undefined);
  const [updateAllSasEndDate, setUpdateAllSasEndDate] = useState<Date | undefined>(undefined);

  const selectedLocation = useMemo(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    return locations.find(l => String(l._id) === locationIdToUse);
  }, [locations, selectedLocationId, lockedLocationId]);

  // Extract primitive values from selectedLocation to prevent unnecessary effect triggers
  const locationCollectionBalance = useMemo(
    () => selectedLocation?.collectionBalance ?? 0,
    [selectedLocation?.collectionBalance]
  );

  const locationProfitShare = useMemo(
    () => selectedLocation?.profitShare ?? 50,
    [selectedLocation?.profitShare]
  );

  const anyConfirmationOpen = !!(
    showUpdateConfirmation ||
    showMachineRolloverWarning ||
    showDeleteConfirmation ||
    showViewMachineConfirmation ||
    showCreateReportConfirmation
  );

  // Update location name when location changes
  // Handled by the store now via selectedLocationName being reactive
  useEffect(() => {
    // This effect is mostly kept for machines fetching which depends on the IDs
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
  }, [selectedLocationId, lockedLocationId, locations]);

  const sortMachinesAlphabetically = useCallback(
    <T extends { name?: string; serialNumber?: string }>(
      machines: T[]
    ): T[] => {
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
    },
    []
  );

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
  }, [
    machinesOfSelectedLocation,
    machineSearchTerm,
    sortMachinesAlphabetically,
  ]);

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

  const inputsEnabled = useMemo(
    () => !!machineForDataEntry || !!selectedMachineId,
    [machineForDataEntry, selectedMachineId]
  );

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
    financials.taxes,
    financials.variance,
    financials.advance,
    financials.balanceCorrection,
    financials.collectedAmount,
    locationCollectionBalance,
    locationProfitShare,
    locations,
    isLoadingExistingCollections,
  ]);

  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  // Update collection time when location changes
  // Use selectedLocationId/lockedLocationId instead of selectedLocation to avoid dependency on locations array
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

  const fetchExistingCollections = useCallback(
    async (locationId?: string) => {
      try {
        setIsLoadingExistingCollections(true);
        let url = `/api/collections?incompleteOnly=true&_t=${Date.now()}`;
        if (locationId) url += `&location=${locationId}`;
        if (userId) url += `&collector=${userId}`;

        const response = await axios.get(url);
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
        } else {
          // If no collections found, don't force a clear here as it might be a genuinely new report starting
          // But if we're resolving state on open, we might want to ensure it's clean
        }
      } catch (error) {
        console.error('Error fetching existing collections:', error);
      } finally {
        setIsLoadingExistingCollections(false);
      }
    },
    [locations, getLocationIdFromMachine, userId, setSelectedLocation, setLockedLocation, setCollectedMachineEntries, setCurrentCollectionTime, setFinancials]
  );

  // Fetch existing collections when modal opens
  const hasFetchedOnOpenRef = useRef(false);
  const fetchExistingCollectionsRef = useRef(fetchExistingCollections);
  useEffect(() => {
    fetchExistingCollectionsRef.current = fetchExistingCollections;
  }, [fetchExistingCollections]);

  useEffect(() => {
    if (show) {
      if (!hasFetchedOnOpenRef.current) {
        fetchExistingCollectionsRef.current(undefined);
        hasFetchedOnOpenRef.current = true;
      }
    } else {
      hasFetchedOnOpenRef.current = false;
    }
  }, [show]);

  // Attempt to resolve location if machines were fetched before locations were ready
  useEffect(() => {
    if (show && collectedMachineEntries.length > 0 && !selectedLocationId && locations.length > 0) {
      const firstCollection = collectedMachineEntries[0];
      const properLocationId = getLocationIdFromMachine(firstCollection.machineId);
      if (properLocationId) {
        const locationData = locations.find(loc => String(loc._id) === properLocationId);
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
    setFinancials
  ]);

  // Use refs for callbacks to prevent re-triggering on callback reference changes
  const onRefreshRef = useRef(onRefresh);
  const onRefreshLocationsRef = useRef(onRefreshLocations);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onRefreshLocationsRef.current = onRefreshLocations;
  });

  useEffect(() => {
    if (show) {
      if (onRefreshLocationsRef.current) onRefreshLocationsRef.current();
      if (onRefreshRef.current) onRefreshRef.current();

      // Ensure we have a clean state for location if no machines are in the list
      // This helps with the "Select Location" issue
      if (collectedMachineEntries.length === 0 && !selectedLocationId && !lockedLocationId) {
        // Just refresh to be safe
      }
    }
  }, [show]);

  // Consolidating redundant effects: Handled by the effect at line 159
  /*
  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    if (locationIdToUse) {
      ...
    }
  }, [selectedLocationId, lockedLocationId]);
  */

  useEffect(() => {
    if (selectedMachineId && machineForDataEntry) {
      const existingEntry = collectedMachineEntries.find(
        entry => entry.machineId === selectedMachineId
      );
      if (existingEntry) {
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
        
        // Populate SAS times if available - BUT DON'T SELECT BY DEFAULT as per user request
        if (existingEntry.sasMeters?.sasStartTime) {
          setSasStartTime(new Date(existingEntry.sasMeters.sasStartTime));
        } else {
          setSasStartTime(null);
        }
        
        if (existingEntry.sasMeters?.sasEndTime) {
          setSasEndTime(new Date(existingEntry.sasMeters.sasEndTime));
        } else {
          setSasEndTime(null);
        }

        // Ensure advanced is NOT selected by default when editing
        setShowAdvancedSas(false);
      } else {
        if (machineForDataEntry.collectionMeters) {
          setPrevIn(machineForDataEntry.collectionMeters.metersIn || 0);
          setPrevOut(machineForDataEntry.collectionMeters.metersOut || 0);
        } else {
          setPrevIn(0);
          setPrevOut(0);
        }
        setCurrentMetersIn('');
        setCurrentMetersOut('');
        setCurrentMachineNotes('');
        setCurrentRamClear(false);
      }
      const loc = locations.find(
        l => String(l._id) === (lockedLocationId || selectedLocationId)
      );
      setPreviousCollectionTime(loc?.previousCollectionTime);
    } else {
      if (
        selectedMachineId === undefined &&
        machinesOfSelectedLocation.length > 0
      ) {
        setPrevIn(null);
        setPrevOut(null);
      }
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

  const handleClose = useCallback(() => {
    if (hasChanges && onRefresh) {
      onRefresh();
    }

    // Always clear the state completely when closing
    setCollectedMachineEntries([]);
    setSelectedLocation(undefined, '');
    setSelectedMachineId(undefined);
    setLockedLocation(undefined);
    setMachineSearchTerm('');
    setHasChanges(false);
    resetStoreState();
    setMachinesOfSelectedLocation([]);
    setCurrentMetersIn('');
    setCurrentMetersOut('');
    setCurrentMachineNotes('');
    setCurrentRamClear(false);
    setSasStartTime(null);
    setSasEndTime(null);
    setShowAdvancedSas(false);

    onClose();
  }, [hasChanges, onRefresh, onClose, resetStoreState]);

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
        collectionTime: currentCollectionTime, // KEEP IN SYNC
        collector: userId,
        notes: currentMachineNotes,
        // sasEndTime always saved: advanced uses user-set value, simple uses collectionTime
        sasEndTime: showAdvancedSas && sasEndTime ? sasEndTime : currentCollectionTime,
        ...(showAdvancedSas && sasStartTime ? { sasStartTime } : {}),
        ...(showAdvancedSas && sasEndTime ? { timestamp: sasEndTime, collectionTime: sasEndTime } : {}),
        ...(currentRamClear
          ? {
              ramClearMetersIn: Number(currentRamClearMetersIn),
              ramClearMetersOut: Number(currentRamClearMetersOut),
            }
          : {}),
      };

      const createdCollection = await addMachineCollection(entryData);
      setCollectedMachineEntries([...collectedMachineEntries, createdCollection]);
      setLockedLocation(selectedLocationId);
      setHasChanges(true);
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

      toast.success('Machine added to list', { position: 'top-left' });
      if (selectedLocationName) {
        await logActivityCallback(
          'create',
          'collection',
          String(createdCollection._id),
          `${machineForDataEntry?.name || selectedMachineId} at ${selectedLocationName}`,
          `Added machine ${machineForDataEntry?.name || selectedMachineId} to collection list`,
          null,
          createdCollection as unknown as Record<string, unknown>
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
    isFirstCollection,
    sasStartTime,
    sasEndTime,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    logActivityCallback,
    selectedMachineId,
    showAdvancedSas,
  ]);

  const handleAddEntry = useCallback(() => {
    if (!isAddMachineEnabled || isProcessing) return;
    
    const onConfirm = () => executeAddEntry();
    
    if (prevIn !== null && Number(currentMetersIn) < prevIn) {
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
    executeAddEntry,
  ]);

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
        ...(currentRamClear
          ? {
              ramClearMetersIn: Number(currentRamClearMetersIn),
              ramClearMetersOut: Number(currentRamClearMetersOut),
            }
          : { ramClearMetersIn: undefined, ramClearMetersOut: undefined }),
        // sasEndTime always saved: advanced uses user-set value, simple uses collectionTime
        sasEndTime: showAdvancedSas && sasEndTime ? sasEndTime : currentCollectionTime,
        ...(showAdvancedSas && sasStartTime ? { sasStartTime } : {}),
        ...(showAdvancedSas && sasEndTime ? { timestamp: sasEndTime, collectionTime: sasEndTime } : {}),
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
      setSelectedMachineId(undefined);
      setCurrentMetersIn('');
      setCurrentMetersOut('');
      setCurrentRamClearMetersIn('');
      setCurrentRamClearMetersOut('');
      setCurrentMachineNotes('');
      setCurrentRamClear(false);
      setPrevIn(null);
      setPrevOut(null);
      toast.success('Machine updated successfully!');

      if (selectedLocationName) {
        await logActivityCallback(
          'update',
          'collection',
          editingEntryId,
          `${entryToUpdate.machineCustomName} at ${selectedLocationName}`,
          `Updated collection entry for machine: ${entryToUpdate.machineCustomName} at ${selectedLocationName}`,
          entryToUpdate as unknown as Record<string, unknown>,
          updatedCollection as unknown as Record<string, unknown>
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
    setCollectedMachineEntries,
    setHasChanges,
    setEditingEntryId,
    setSelectedMachineId,
    setCurrentMetersIn,
    setCurrentMetersOut,
    setCurrentRamClearMetersIn,
    setCurrentRamClearMetersOut,
    setCurrentMachineNotes,
    setCurrentRamClear,
    setPrevIn,
    setPrevOut,
  ]);

  const confirmUpdateEntry = useCallback(async () => {
    if (!editingEntryId) return;
    
    const onConfirm = () => executeUpdateEntry();
    
    if (prevIn !== null && Number(currentMetersIn) < prevIn) {
      setPendingMachineSubmission(() => onConfirm);
      setShowMachineRolloverWarning(true);
      return;
    }
    onConfirm();
  }, [editingEntryId, prevIn, currentMetersIn, executeUpdateEntry]);

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
        setSelectedMachineId(undefined);
        setCurrentMetersIn('');
        setCurrentMetersOut('');
        setCurrentMachineNotes('');
        setCurrentRamClear(false);
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

  const confirmCreateReports = async () => {
    try {
      setIsProcessing(true);
      const locationIdToUse = lockedLocationId || selectedLocationId;
      if (!locationIdToUse || collectedMachineEntries.length === 0) return;

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

      const reportId = uuidv4();

      const payload: CreateCollectionReportPayload = {
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        currentBalance: 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected: Number(financials.collectedAmount) || Number(financials.amountToCollect) || 0,
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
        totalSasGross: 0,
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
        subtractJackpot: selectedLocation?.subtractJackpot || false,
        machines: collectedMachineEntries.map(e => ({
          machineId: String(e.machineId),
          metersIn: e.metersIn,
          metersOut: e.metersOut,
          prevMetersIn: e.prevIn || 0,
          prevMetersOut: e.prevOut || 0,
          timestamp: e.timestamp,
          locationReportId: reportId,
        })),
        collectionIds: collectedMachineEntries.map(e => String(e._id)),
      };

      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        console.error('❌ [NewCollection] Validation failed:', {
          errors: validation.errors,
          payload,
        });
        toast.error(`Validation Error: ${validation.errors.join(', ')}`);
        return;
      }

      const result = await createCollectionReport(payload);
      await logActivityCallback(
        'create',
        'collection-report',
        String(result.report._id),
        `Collection Report for ${selectedLocationName}`,
        `Created collection report for ${collectedMachineEntries.length} machines at ${selectedLocationName}`,
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

  const handleLocationChange = useCallback(
    (value: string) => {
      const selectedLoc = locations.find(loc => String(loc._id) === value);
      setSelectedLocation(value, selectedLoc?.name || '');
      if (selectedLoc) {
        setFinancials({
          previousBalance: (selectedLoc.collectionBalance || 0).toString(),
        });
      }
    },
    [locations, setSelectedLocation, setFinancials]
  );

  const handleDisabledFieldClick = useCallback(() => {
    if (!inputsEnabled) {
      toast.warning('Please select a machine first', {
        duration: 3000,
        position: 'top-left',
      });
    }
  }, [inputsEnabled]);

  const handleAddOrUpdateEntry = useCallback(() => {
    if (editingEntryId) setShowUpdateConfirmation(true);
    else handleAddEntry();
  }, [editingEntryId, handleAddEntry]);

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

        // CRITICAL: Reset to simple mode BEFORE setting collection time so the store
        // auto-sync correctly sets sasEndTime = collectionTime in simple mode.
        // Advanced mode must never be selected by default when editing.
        // Pre-load sasMeters times so that when the user clicks Advanced, the correct
        // times appear rather than auto-generated defaults.
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

        // Set collection time — store auto-sync will set sasEndTime = this value
        setCurrentCollectionTime(
          entry.timestamp ? new Date(entry.timestamp) : new Date()
        );

        toast.info('Editing machine collection entry');
      }
    },
    [collectedMachineEntries]
  );

  const handleDeleteCollectedEntry = useCallback((id: string) => {
    setEntryToDelete(id);
    setShowDeleteConfirmation(true);
  }, []);

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

  const handleCancelEdit = useCallback(() => {
    setEditingEntryId(null);
    setSelectedMachineId(undefined);
    setCurrentMetersIn('');
    setCurrentMetersOut('');
    setCurrentMachineNotes('');
    setCurrentRamClear(false);
    setSasStartTime(showAdvancedSas ? sasStartTime : null);
    setSasEndTime(showAdvancedSas ? sasEndTime : null);
    setShowAdvancedSas(showAdvancedSas);
    toast.info('Edit cancelled');
  }, []);

  const handleApplyAllDates = useCallback(async () => {
    if (!updateAllSasStartDate && !updateAllSasEndDate) return;
    if (collectedMachineEntries.length < 2) return;
    try {
      setIsProcessing(true);
      const axios = (await import('axios')).default;
      const patchData: Record<string, string> = {};
      if (updateAllSasStartDate) patchData.sasStartTime = updateAllSasStartDate.toISOString();
      if (updateAllSasEndDate) patchData.sasEndTime = updateAllSasEndDate.toISOString();
      const results = await Promise.allSettled(
        collectedMachineEntries.map(async entry => {
          if (!entry._id) return;
          return await axios.patch(`/api/collections?id=${entry._id}`, patchData);
        })
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`${failed} machine${failed > 1 ? 's' : ''} failed to update`);
        return;
      }
      toast.success('All SAS times updated successfully!');
      setUpdateAllSasStartDate(undefined);
      setUpdateAllSasEndDate(undefined);
    } catch {
      toast.error('Failed to update SAS times');
    } finally {
      setIsProcessing(false);
    }
  }, [updateAllSasStartDate, updateAllSasEndDate, collectedMachineEntries]);

  return {
    selectedLocationId,
    selectedLocationName,
    machinesOfSelectedLocation,
    machineSearchTerm,
    setMachineSearchTerm,
    lockedLocationId,
    selectedMachineId,
    setSelectedMachineId,
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
    isFirstCollection,
    setIsFirstCollection,
    collectedMachineEntries,
    isProcessing,
    editingEntryId,
    showUpdateConfirmation,
    setShowUpdateConfirmation,
    showMachineRolloverWarning,
    setShowMachineRolloverWarning,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    entryToDelete,
    setEntryToDelete,
    showViewMachineConfirmation,
    setShowViewMachineConfirmation,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    financials,
    setFinancials,
    baseBalanceCorrection,
    setBaseBalanceCorrection,
    prevIn,
    prevOut,
    previousCollectionTime,
    isLoadingExistingCollections,
    filteredMachines,
    machineForDataEntry,
    inputsEnabled,
    isAddMachineEnabled,
    debouncedCurrentMetersIn,
    debouncedCurrentMetersOut,
    debouncedCurrentRamClearMetersIn,
    debouncedCurrentRamClearMetersOut,
    handleLocationChange,
    handleClose,
    handleDisabledFieldClick,
    handleAddOrUpdateEntry,
    handleEditCollectedEntry,
    handleDeleteCollectedEntry,
    confirmUpdateEntry,
    confirmDeleteEntry,
    confirmCreateReports,
    handleConfirmMachineRollover,
    handleCancelMachineRollover,
    handleCancelEdit,
    handleAddEntry,
    anyConfirmationOpen,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    handleApplyAllDates,
  };
}

