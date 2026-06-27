/**
 * useMobileEditData Hook
 *
 * Handles data fetching and CRUD operations for the Mobile Edit Collection Modal:
 * - Loading existing report data
 * - Fetching machines for a location
 * - Adding/updating/deleting machine entries
 * - WOW meter syncing
 */

'use client';

import axios, { type AxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState, useMemo, Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useUserStore } from '@/lib/store/userStore';
import { validateMachineEntry } from '@/lib/helpers/collectionReport';
import { sortMachinesAlphabetically } from '@/lib/helpers/collectionReport/mobileEditCollectionModalHelpers';
import { logActivity } from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { isWowMachine } from '@/shared/utils/wowMachine';
import type {
  CollectionReportLocationWithMachines,
} from '@/lib/types/api';
import type { CollectionDocument as StoreCollectionDocument } from '@/lib/types/collection';
import type { CollectionDocument, MobileModalState } from './types';
import type { SubStepProgress } from '@/components/shared/ui/ProcessingPhaseBar';

type UseMobileEditDataProps = {
  show: boolean;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  onClose: () => void;
  modalState: MobileModalState;
  setModalState: Dispatch<SetStateAction<MobileModalState>>;
};

export function useMobileEditData({
  show,
  reportId,
  locations,
  modalState,
  setModalState,
}: UseMobileEditDataProps) {
  // ============================================================================
  // Refs & Store
  // ============================================================================
  const user = useUserStore(state => state.user);
  const locationsRef = useRef(locations);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  const {
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    collectionTime,
    financials,
    formData: storeFormData,
    setSelectedLocation: setStoreSelectedLocation,
    setLockedLocation: setStoreLockedLocation,
    setAvailableMachines: setStoreAvailableMachines,
    setCollectedMachines: setStoreCollectedMachines,
    calculateCarryover: setStoreCalculateCarryover,
  } = useCollectionModalStore();

  // ============================================================================
  // Local UI State
  // ============================================================================
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
  const [currentSubStep, setCurrentSubStep] = useState<SubStepProgress | null>(null);
  const [currentEditPhase, setCurrentEditPhase] = useState<string | undefined>(
    undefined
  );

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);

  // State for unsaved changes warning
  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);

  // ============================================================================
  // Initialize availableMachines from locations when modal opens
  // ============================================================================
  useEffect(() => {
    if (
      show &&
      locations &&
      locations.length > 0 &&
      (!availableMachines || availableMachines.length === 0)
    ) {
      const locationWithMachines = locations.find(
        loc => loc.machines && loc.machines.length > 0
      );
      if (locationWithMachines?.machines) {
        setStoreAvailableMachines(locationWithMachines.machines);
        if (!selectedLocationId && !lockedLocationId) {
          setStoreSelectedLocation(
            String(locationWithMachines._id),
            locationWithMachines.name
          );
        }
      }
    }
  }, [
    show,
    locations,
    availableMachines,
    selectedLocationId,
    lockedLocationId,
    setStoreAvailableMachines,
    setStoreSelectedLocation,
  ]);

  // ============================================================================
  // WOW Meter Sync
  // ============================================================================
  const wowSelectedMachineId = modalState.selectedMachine;
  const wowSelected = isWowMachine(modalState.selectedMachineData);
  const wowStartTime = modalState.formData.sasStartTime;
  const wowEndTime = modalState.formData.sasEndTime;
  const wowMachineCollectionTime = modalState.selectedMachineData?.collectionTime;

  useEffect(() => {
    if (!show || !wowSelectedMachineId || !wowSelected) return;

    const startHint = wowStartTime
      ? (wowStartTime instanceof Date ? wowStartTime.toISOString() : new Date(wowStartTime).toISOString())
      : wowMachineCollectionTime
        ? new Date(wowMachineCollectionTime).toISOString()
        : '';
    const endIso = wowEndTime
      ? (wowEndTime instanceof Date ? wowEndTime.toISOString() : new Date(wowEndTime).toISOString())
      : new Date().toISOString();
    let cancelled = false;

    axios
      .get(
        `/api/collection-reports/collections/wow-meters?machineId=${wowSelectedMachineId}` +
          (startHint ? `&startTime=${startHint}` : '') +
          `&endTime=${endIso}`
      )
      .then(res => {
        if (cancelled) return;
        const wow = res.data?.data;
        if (!wow) return;
        setModalState(prev => ({
          ...prev,
          formData: {
            ...prev.formData,
            metersIn: wow.metersIn != null ? String(wow.metersIn) : '',
            metersOut: wow.metersOut != null ? String(wow.metersOut) : '',
            prevIn: wow.prevIn != null ? String(wow.prevIn) : '',
            prevOut: wow.prevOut != null ? String(wow.prevOut) : '',
          },
        }));
      })
      .catch(wowErr => {
        console.error(
          '[useMobileEditData] WOW meters fetch failed:',
          wowErr instanceof Error ? wowErr.message : 'Unknown error'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    show,
    wowSelectedMachineId,
    wowSelected,
    wowStartTime,
    wowEndTime,
    wowMachineCollectionTime,
    setModalState,
  ]);

  // ============================================================================
  // Debounced Values
  // ============================================================================
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

  // ============================================================================
  // Computed Values
  // ============================================================================
  const inputsEnabled = modalState.selectedMachineData || modalState.selectedMachine;

  const isAddMachineEnabled = (() => {
    if (!modalState.selectedMachineData) return false;
    if (!modalState.formData.metersIn || !modalState.formData.metersOut)
      return false;
    if (
      modalState.formData.ramClear &&
      (!modalState.formData.ramClearMetersIn ||
        !modalState.formData.ramClearMetersOut)
    ) {
      return false;
    }
    if (modalState.formData.ramClear && modalState.selectedMachineData) {
      const currentMetersIn =
        modalState.selectedMachineData.collectionMeters?.metersIn ?? 0;
      const currentMetersOut =
        modalState.selectedMachineData.collectionMeters?.metersOut ?? 0;
      if (
        Number(modalState.formData.ramClearMetersIn) < Number(currentMetersIn) ||
        Number(modalState.formData.ramClearMetersOut) < Number(currentMetersOut)
      ) {
        return false;
      }
    }
    if (
      modalState.formData.showAdvancedSas &&
      modalState.formData.sasStartTime &&
      modalState.formData.sasEndTime &&
      modalState.formData.sasStartTime > modalState.formData.sasEndTime
    ) {
      return false;
    }
    return true;
  })();

  const isCreateReportsEnabled = modalState.collectedMachines.length > 0;

  // ============================================================================
  // Helpers
  // ============================================================================
  const getLocationIdFromMachine = useCallback(
    (locationIdentifier: string) => {
      const matchingLoc = locations.find(
        location =>
          String(location._id) === locationIdentifier ||
          location.name === locationIdentifier
      );
      return matchingLoc ? String(matchingLoc._id) : null;
    },
    [locations]
  );

  // ============================================================================
  // Add/Update Machine Entry
  // ============================================================================
  const addMachineToList = useCallback(async () => {
    console.log('[addMachineToList] Called:', {
      selectedMachineData: !!modalState.selectedMachineData,
      isProcessing: modalState.isProcessing,
      editingEntryId: modalState.editingEntryId,
    });

    if (!modalState.selectedMachineData || modalState.isProcessing) {
      console.log(
        '[addMachineToList] Early return - no selected machine or processing'
      );
      return;
    }

    const msd = modalState.selectedMachineData;
    const valPrevIn =
      modalState.formData.prevIn !== ''
        ? Number(modalState.formData.prevIn)
        : (() => {
            const sasDrop = msd.sasMeters?.drop ?? null;
            const collectionIn = msd.collectionMeters?.metersIn;
            return collectionIn !== null &&
              collectionIn !== undefined &&
              collectionIn > 0
              ? collectionIn
              : sasDrop !== null && sasDrop > 0
                ? sasDrop
                : 0;
          })();
    const valPrevOut =
      modalState.formData.prevOut !== ''
        ? Number(modalState.formData.prevOut)
        : (() => {
            const sasCancelled = msd.sasMeters?.totalCancelledCredits ?? null;
            const collectionOut = msd.collectionMeters?.metersOut;
            return collectionOut !== null &&
              collectionOut !== undefined &&
              collectionOut > 0
              ? collectionOut
              : sasCancelled !== null && sasCancelled > 0
                ? sasCancelled
                : 0;
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
      toast.error(
        validation.error || 'Invalid machine data. Please check your inputs.',
        { duration: 5000 }
      );
      return;
    }

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      const isEditing = !!modalState.editingEntryId;
      const existingEntry = isEditing
        ? modalState.collectedMachines.find(
            m => m._id === modalState.editingEntryId
          )
        : null;

      const timeForMobile =
        modalState.formData.sasEndTime || modalState.formData.collectionTime;

      const collectionPayload = {
        machineId:
          isEditing && existingEntry
            ? existingEntry.machineId
            : String(modalState.selectedMachineData._id),
        machineName:
          isEditing && existingEntry
            ? existingEntry.machineName || ''
            : modalState.selectedMachineData.name || '',
        machineCustomName:
          isEditing && existingEntry
            ? existingEntry.machineCustomName || ''
            : modalState.selectedMachineData.custom?.name || '',
        serialNumber:
          isEditing && existingEntry
            ? existingEntry.serialNumber || ''
            : modalState.selectedMachineData.serialNumber || '',
        game:
          isEditing && existingEntry
            ? existingEntry.game || ''
            : modalState.selectedMachineData.game || '',
        location: selectedLocationId || '',
        collector: user?._id || '',
        metersIn: Number(modalState.formData.metersIn),
        metersOut: Number(modalState.formData.metersOut),
        prevIn: valPrevIn,
        prevOut: valPrevOut,
        notes: modalState.formData.notes,
        ...(modalState.formData.sasStartTime
          ? { sasStartTime: modalState.formData.sasStartTime }
          : {}),
        sasEndTime:
          timeForMobile instanceof Date
            ? timeForMobile
            : new Date(timeForMobile),
        timestamp: (timeForMobile instanceof Date
          ? timeForMobile
          : new Date(timeForMobile)
        ).toISOString(),
        collectionTime: (timeForMobile instanceof Date
          ? timeForMobile
          : new Date(timeForMobile)
        ).toISOString(),
        ramClear: modalState.formData.ramClear,
        ramClearMetersIn: modalState.formData.ramClearMetersIn
          ? Number(modalState.formData.ramClearMetersIn)
          : undefined,
        ramClearMetersOut: modalState.formData.ramClearMetersOut
          ? Number(modalState.formData.ramClearMetersOut)
          : undefined,
        locationReportId: isEditing
          ? modalState.collectedMachines.find(
              collectedEntry => collectedEntry._id === modalState.editingEntryId
            )?.locationReportId || reportId
          : reportId,
        isCompleted: false,
      };

      console.log(
        '[mobileModal] collectionPayload being sent:',
        JSON.stringify(collectionPayload, null, 2)
      );

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

      console.log(
        '[mobileModal] API response createdCollection:',
        JSON.stringify(createdCollection, null, 2)
      );

      const newCollectedMachines = isEditing
        ? modalState.collectedMachines.map(machineEntry =>
            machineEntry._id === modalState.editingEntryId
              ? createdCollection
              : machineEntry
          )
        : [...modalState.collectedMachines, createdCollection];

      const newLockedLocationId =
        modalState.collectedMachines.length === 0 && !isEditing
          ? modalState.selectedLocation || undefined
          : modalState.lockedLocationId;

      setStoreCollectedMachines(newCollectedMachines as unknown as StoreCollectionDocument[]);
      if (
        newLockedLocationId &&
        newLockedLocationId !== modalState.lockedLocationId
      ) {
        setStoreLockedLocation(newLockedLocationId);
      }

      if (selectedLocationName) {
        const machineName =
          modalState.selectedMachineData?.name ||
          modalState.selectedMachineData?.serialNumber ||
          String(modalState.selectedMachineData?._id || '');
        const metersIn = Number(modalState.formData.metersIn);
        const metersOut = Number(modalState.formData.metersOut);
        const ramClear = modalState.formData.ramClear;
        const notes = modalState.formData.notes;
        if (isEditing) {
          const prevEntry = modalState.collectedMachines.find(
            collectedMachine =>
              collectedMachine._id === modalState.editingEntryId
          );
          const changes: string[] = [];
          if (prevEntry && prevEntry.metersIn !== metersIn)
            changes.push(`MIn: ${prevEntry.metersIn} → ${metersIn}`);
          if (prevEntry && prevEntry.metersOut !== metersOut)
            changes.push(`MOut: ${prevEntry.metersOut} → ${metersOut}`);
          if (prevEntry && prevEntry.ramClear !== ramClear)
            changes.push(
              `RAM Clear: ${prevEntry.ramClear ? 'Yes' : 'No'} → ${ramClear ? 'Yes' : 'No'}`
            );
          if (prevEntry && (prevEntry.notes || '') !== (notes || ''))
            changes.push(
              `Notes: "${prevEntry.notes || ''}" → "${notes || ''}"`
            );
          const detailStr =
            changes.length > 0 ? changes.join(', ') : 'No meter changes';
          await logActivity(
            'update',
            'collection',
            modalState.editingEntryId || String(createdCollection._id),
            `${machineName} at ${selectedLocationName}`,
            `Updated machine ${machineName} at ${selectedLocationName} — ${detailStr}`,
            user?._id as string,
            user?.username || 'unknown',
            prevEntry
              ? {
                  metersIn: prevEntry.metersIn,
                  metersOut: prevEntry.metersOut,
                  ramClear: prevEntry.ramClear,
                  notes: prevEntry.notes,
                }
              : null,
            { metersIn, metersOut, ramClear, notes: notes || undefined }
          );
        } else {
          const detailParts = [
            `MIn: ${metersIn}`,
            `MOut: ${metersOut}`,
            `PrevIn: ${valPrevIn}`,
            `PrevOut: ${valPrevOut}`,
            `RAM Clear: ${ramClear ? 'Yes' : 'No'}`,
          ];
          if (ramClear)
            detailParts.push(
              `RC MIn: ${Number(modalState.formData.ramClearMetersIn) || 0}`,
              `RC MOut: ${Number(modalState.formData.ramClearMetersOut) || 0}`
            );
          if (notes) detailParts.push(`Notes: ${notes}`);
          await logActivity(
            'create',
            'collection',
            String(createdCollection._id),
            `${machineName} at ${selectedLocationName}`,
            `Added machine ${machineName} to collection at ${selectedLocationName} — ${detailParts.join(', ')}`,
            user?._id as string,
            user?.username || 'unknown',
            null,
            {
              metersIn,
              metersOut,
              prevIn: valPrevIn,
              prevOut: valPrevOut,
              ramClear,
              notes: notes || undefined,
            }
          );
        }
      }

      setModalState(prev => {
        const newStack = [...prev.navigationStack];
        if (newStack[newStack.length - 1] === 'form') {
          newStack.pop();
        }

        return {
          ...prev,
          collectedMachines: newCollectedMachines,
          lockedLocationId: newLockedLocationId,
          isFormVisible: false,
          isCollectedListVisible: true,
          isMachineListVisible: false,
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
    selectedLocationId,
    reportId,
    setModalState,
  ]);

  // ============================================================================
  // Delete Machine Entry
  // ============================================================================
  const deleteMachineFromList = useCallback(
    (entryId: string) => {
      if (modalState.collectedMachines.length === 1) {
        toast.error(
          'Cannot delete the last collection. A collection report must have at least one machine.'
        );
        return;
      }
      setEntryToDelete(entryId);
      setShowDeleteConfirmation(true);
    },
    [modalState.collectedMachines.length]
  );

  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete) return;

    setModalState(prev => ({ ...prev, isProcessing: true }));

    try {
      await axios.delete(`/api/collection-reports/collections?id=${entryToDelete}`);

      const newCollectedMachines = modalState.collectedMachines.filter(
        machine => machine._id !== entryToDelete
      );
      const newLockedLocationId =
        newCollectedMachines.length === 0
          ? undefined
          : modalState.lockedLocationId;

      setModalState(prev => ({
        ...prev,
        collectedMachines: newCollectedMachines,
        originalCollections: prev.originalCollections.filter(
          machine => machine._id !== entryToDelete
        ),
        lockedLocationId: newLockedLocationId,
        isProcessing: false,
      }));

      setStoreCollectedMachines(newCollectedMachines as unknown as StoreCollectionDocument[]);
      if (newCollectedMachines.length === 0) setStoreLockedLocation(undefined);

      setShowDeleteConfirmation(false);
      setEntryToDelete(null);

      toast.success('Collection removed successfully');
    } catch (error) {
      console.error('Failed to delete collection:', error);
      setModalState(prev => ({ ...prev, isProcessing: false }));
      toast.error('Failed to remove collection. Please try again.');
    }
  }, [
    entryToDelete,
    modalState.collectedMachines,
    modalState.lockedLocationId,
    setStoreCollectedMachines,
    setStoreLockedLocation,
    setModalState,
  ]);

  // ============================================================================
  // Edit Machine Entry
  // ============================================================================
  const editMachineInList = useCallback(
    async (entry: CollectionDocument) => {
      let machine = modalState.availableMachines.find(
        m => m._id === entry.machineId
      );

      if (!machine && entry.location) {
        const foundLocation = locations.find(
          loc => loc.name === entry.location
        );
        if (foundLocation && foundLocation.machines) {
          machine = foundLocation.machines.find(
            m => String(m._id) === entry.machineId
          );

          setModalState(prev => ({
            ...prev,
            availableMachines: foundLocation.machines || [],
            selectedLocation: String(foundLocation._id),
            selectedLocationName: foundLocation.name,
          }));

          setStoreAvailableMachines(foundLocation.machines || []);
          setStoreSelectedLocation(
            String(foundLocation._id),
            foundLocation.name
          );
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
          collectionTime:
            entry.sasMeters?.sasEndTime ?? new Date(entry.timestamp),
          showAdvancedSas: false,
          sasStartTime: entry.sasMeters?.sasStartTime ?? null,
          sasEndTime: entry.sasMeters?.sasEndTime ?? null,
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
      setModalState,
    ]
  );

  // ============================================================================
  // Sync mobile state with Zustand store
  // ============================================================================
  useEffect(() => {
    setModalState(prev => ({
      ...prev,
      selectedLocation: selectedLocationId || null,
      selectedLocationName,
      lockedLocationId,
      availableMachines,
      collectedMachines: collectedMachines as unknown as CollectionDocument[],
    }));
  }, [
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    setModalState,
  ]);

  // ============================================================================
  // Load existing report data for edit mode
  // ============================================================================
  useEffect(() => {
    if (show && reportId) {
      const loadReportData = async () => {
        try {
          setModalState(prev => ({
            ...prev,
            isLoadingCollections: true,
            isLoadingMachines: true,
          }));

          const reportResponse = await axios.get(
            `/api/collection-reports/${reportId}`
          );
          const reportData = reportResponse.data;

          const collectionsResponse = await axios.get(
            `/api/collection-reports/collections?locationReportId=${reportId}&_t=${Date.now()}`
          );
          const collections = collectionsResponse.data;

          const matchingLocation = locationsRef.current.find(
            loc => loc.name === reportData.locationName
          );

          if (matchingLocation) {
            setStoreSelectedLocation(
              String(matchingLocation._id),
              matchingLocation.name
            );
            setStoreAvailableMachines(matchingLocation.machines || []);

            const machineMap = new Map(
              (matchingLocation.machines || []).map(machine => [
                String(machine._id),
                machine,
              ])
            );
            const normalizedCollections = collections.map(
              (col: CollectionDocument) => {
                const machine = col.machineId
                  ? machineMap.get(String(col.machineId))
                  : null;
                if (machine && (!col.machineName || !col.serialNumber)) {
                  return {
                    ...col,
                    machineName: col.machineName || machine.name || '',
                    machineCustomName:
                      col.machineCustomName || machine.custom?.name || '',
                    serialNumber:
                      col.serialNumber || machine.serialNumber || '',
                    game: col.game || machine.game || '',
                  };
                }
                return col;
              }
            );

            flushSync(() => {
              setStoreCollectedMachines(normalizedCollections as unknown as StoreCollectionDocument[]);
            });

            setModalState(prev => ({
              ...prev,
              selectedLocation: String(matchingLocation._id),
              selectedLocationName: matchingLocation.name,
              collectedMachines: normalizedCollections,
              originalCollections: JSON.parse(
                JSON.stringify(normalizedCollections)
              ),
              availableMachines: matchingLocation.machines || [],
              hasUnsavedEdits: false,
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
          } else if (reportData.locationId) {
            setStoreLockedLocation(String(reportData.locationId));
            setStoreCollectedMachines(collections as unknown as StoreCollectionDocument[]);

            setModalState(prev => ({
              ...prev,
              selectedLocation: String(reportData.locationId),
              selectedLocationName: reportData.locationName || '',
              lockedLocationId: String(reportData.locationId),
              collectedMachines: collections,
              originalCollections: JSON.parse(JSON.stringify(collections)),
              isLoadingCollections: false,
              isLoadingMachines: false,
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
    setStoreSelectedLocation,
    setStoreAvailableMachines,
    setStoreCollectedMachines,
    setStoreLockedLocation,
    setModalState,
  ]);

  // ============================================================================
  // Fetch machines when location changes
  // ============================================================================
  useEffect(() => {
    const locationIdToUse =
      modalState.lockedLocationId || modalState.selectedLocation;
    if (locationIdToUse && show) {
      setModalState(prev => ({ ...prev, isLoadingMachines: true }));
      const fetchMachinesForLocation = async () => {
        try {
          const response = await axios.get(
            `/api/cabinets?locationId=${locationIdToUse}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            setStoreAvailableMachines(response.data.data);
            setModalState(prev => ({
              ...prev,
              availableMachines: response.data.data,
              isLoadingMachines: false,
            }));
          } else {
            setStoreAvailableMachines([]);
            setModalState(prev => ({
              ...prev,
              availableMachines: [],
              isLoadingMachines: false,
            }));
          }
        } catch (error) {
          console.error('Error fetching machines for location:', error);
          setStoreAvailableMachines([]);
          setModalState(prev => ({
            ...prev,
            availableMachines: [],
            isLoadingMachines: false,
          }));
        }
      };
      fetchMachinesForLocation();
    }
  }, [
    modalState.selectedLocation,
    modalState.lockedLocationId,
    show,
    setStoreAvailableMachines,
    setModalState,
  ]);

  // ============================================================================
  // Detect unsaved changes (dirty state tracking)
  // ============================================================================
  useEffect(() => {
    if (
      modalState.originalCollections.length === 0 ||
      collectedMachines.length === 0
    ) {
      if (modalState.hasUnsavedEdits) {
        setModalState(prev => ({ ...prev, hasUnsavedEdits: false }));
      }
      return;
    }

    let hasChanges = false;
    const originalIds = new Set(
      modalState.originalCollections.map(collection => collection._id)
    );

    for (const current of collectedMachines) {
      if (!originalIds.has(current._id)) {
        hasChanges = true;
        break;
      }

      const original = modalState.originalCollections.find(
        orig => orig._id === current._id
      );
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

    if (hasChanges !== modalState.hasUnsavedEdits) {
      setModalState(prev => ({ ...prev, hasUnsavedEdits: hasChanges }));
    }
  }, [collectedMachines, modalState.originalCollections, setModalState]);

  // ============================================================================
  // Auto-populate "Update All SAS Times" pickers
  // ============================================================================
  useEffect(() => {
    if (collectedMachines.length === 0) return;
    const toDate = (val: Date | string | undefined | null): Date | null => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val as string);
      return isNaN(d.getTime()) ? null : d;
    };
    const starts = collectedMachines
      .map(entry => toDate(entry.sasMeters?.sasStartTime))
      .filter((date): date is Date => date !== null);
    const ends = collectedMachines
      .map(entry => toDate(entry.sasMeters?.sasEndTime))
      .filter((date): date is Date => date !== null);
    if (starts.length > 0) {
      setUpdateAllSasStartDate(
        new Date(Math.min(...starts.map(date => date.getTime())))
      );
    }
    if (ends.length > 0) {
      setUpdateAllSasEndDate(
        new Date(Math.max(...ends.map(date => date.getTime())))
      );
    }
  }, [collectedMachines]);

  // ============================================================================
  // Clear unsaved edits
  // ============================================================================
  const clearUnsavedEdits = useCallback(() => {
    setModalState(prev => ({ ...prev, hasUnsavedEdits: false }));
  }, [setModalState]);

  // ============================================================================
  // New machine IDs computation
  // ============================================================================
  const newMachineIds = useMemo(() => {
    const originalIds = new Set(
      modalState.originalCollections.map(collection => collection._id)
    );
    return collectedMachines
      .filter(machine => !originalIds.has(machine._id))
      .map(machine => machine._id)
      .filter(Boolean);
  }, [collectedMachines, modalState.originalCollections]);

  // ============================================================================
  // Apply All SAS Times
  // ============================================================================
  const handleApplyAllDates = useCallback(async () => {
    if (!updateAllSasStartDate && !updateAllSasEndDate) return;
    if (modalState.collectedMachines.length < 1) return;
    try {
      setModalState(prev => ({ ...prev, isProcessing: true }));
      const patchData: Record<string, string> = {};

      const startTimeISO = updateAllSasStartDate?.toISOString();
      const endTimeISO = updateAllSasEndDate?.toISOString();

      if (startTimeISO) patchData.sasStartTime = startTimeISO;
      if (endTimeISO) patchData.sasEndTime = endTimeISO;

      const total = modalState.collectedMachines.length;
      setSasUpdateProgress({ completed: 0, total });
      const results = await Promise.allSettled(
        modalState.collectedMachines.map(async entry => {
          if (!entry._id) {
            setSasUpdateProgress(prev =>
              prev ? { ...prev, completed: prev.completed + 1 } : null
            );
            return;
          }
          const result = await axios.patch(
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

      const updated = modalState.collectedMachines.map(entry => ({
        ...entry,
        sasMeters: {
          ...entry.sasMeters,
          sasStartTime: startTimeISO
            ? new Date(startTimeISO)
            : typeof entry.sasMeters?.sasStartTime === 'string'
              ? new Date(entry.sasMeters.sasStartTime)
              : entry.sasMeters?.sasStartTime,
          sasEndTime: endTimeISO
            ? new Date(endTimeISO)
            : typeof entry.sasMeters?.sasEndTime === 'string'
              ? new Date(entry.sasMeters.sasEndTime)
              : entry.sasMeters?.sasEndTime,
        },
      }));

      setModalState(prev => ({
        ...prev,
        collectedMachines: updated as typeof prev.collectedMachines,
        isProcessing: false,
      }));

      toast.success('All SAS times updated successfully!');
      setUpdateAllSasStartDate(undefined);
      setUpdateAllSasEndDate(undefined);
    } catch {
      toast.error('Failed to update SAS times');
    } finally {
      setModalState(prev => ({ ...prev, isProcessing: false }));
      setSasUpdateProgress(null);
    }
  }, [
    updateAllSasStartDate,
    updateAllSasEndDate,
    modalState.collectedMachines,
    setModalState,
  ]);

  return {
    // State
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
    sasUpdateProgress,
    currentSubStep,
    currentEditPhase,
    setCurrentSubStep,
    setCurrentEditPhase,
    newMachineIds,

    // Store state
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    collectionTime,
    financials,
    formData: storeFormData,
    setStoreSelectedLocation,
    setStoreLockedLocation,
    setStoreAvailableMachines,
    setStoreCollectedMachines,
    setStoreCalculateCarryover,

    // Debounced values
    debouncedSelectedMachineData,
    debouncedEditingEntryId,
    debouncedFormDataMetersIn,
    debouncedFormDataMetersOut,
    debouncedFormDataNotes,

    // Computed
    inputsEnabled,
    isAddMachineEnabled,
    isCreateReportsEnabled,

    // Helpers
    sortMachinesAlphabetically,
    getLocationIdFromMachine,

    // CRUD operations
    addMachineToList,
    deleteMachineFromList,
    confirmDeleteEntry,
    editMachineInList,
    clearUnsavedEdits,
    handleApplyAllDates,
  };
}