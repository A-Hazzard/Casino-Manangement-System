/**
 * useMobileNewData Hook
 *
 * Manages data state and operations for the mobile collection modal.
 * Handles machine selection, collection entry management, form data, and financial calculations.
 *
 * @module lib/hooks/collectionReport/useMobileNewData
 */

'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import axios, { type AxiosError } from 'axios';
import { validateMachineEntry } from '@/lib/helpers/collectionReport';
import { sortMachinesAlphabetically } from '@/lib/helpers/collectionReport/editCollectionModalHelpers';
import { logActivity } from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { calculateCabinetMovement } from '@/lib/utils/movement';
import { calculateDefaultCollectionTime } from '@/lib/utils/collection';
import { isWowMachine } from '@/shared/utils/wowMachine';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { toast } from 'sonner';
import type { MobileNavigationState } from './types';



type SetModalStateType = React.Dispatch<React.SetStateAction<MobileNavigationState>>;

type UseMobileNewDataProps = {
  show: boolean;
  locations: CollectionReportLocationWithMachines[];
  modalState: MobileNavigationState;
  setModalState: SetModalStateType;
  user: { _id: string; username: string } | null;
};

export function useMobileNewData({
  show,
  locations,
  modalState,
  setModalState,
  user,
}: UseMobileNewDataProps) {
  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  const {
    selectedLocationId: selectedLocation,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines: storeCollectedMachines,
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

  const setStoreSelectedMachineExposed = setStoreSelectedMachine;
  const setStoreSelectedMachineDataExposed = setStoreSelectedMachineData;

  const hasFetchedOnOpenRef = useRef(false);
  const isUpdatingFromModalStateRef = useRef(false);

  // ============================================================================
  // Helper: Resolve location ID from collection's location field
  // ============================================================================

  const getLocationIdFromMachine = useCallback(
    (locationIdentifier: string) => {
      const matchingLoc = locationsRef.current.find(
        (location) =>
          String(location._id) === locationIdentifier ||
          location.name === locationIdentifier
      );
      return matchingLoc ? String(matchingLoc._id) : null;
    },
    []
  );

  // ============================================================================
  // Collection Discovery & Initialization
  // ============================================================================

  const fetchExistingCollections = useCallback(
    async (locationId?: string) => {
      setModalState((prev) => ({ ...prev, isLoadingCollections: true }));
      try {
        let url = '/api/collection-reports/collections';
        if (locationId) {
          url += `?locationId=${locationId}`;
        }
        url += `${locationId ? '&' : '?'}incompleteOnly=true`;
        if (user?._id) {
          url += `&collector=${user._id}`;
        }

        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
          setStoreCollectedMachines(response.data);
          setModalState((prev) => ({
            ...prev,
            collectedMachines: response.data,
          }));

          const firstCollection = response.data[0];
          if (firstCollection.location) {
            const machineLocationId = getLocationIdFromMachine(
              firstCollection.location
            );
            if (machineLocationId) {
              const matchingLocation = locationsRef.current.find(
                (loc) => String(loc._id) === machineLocationId
              );
              if (matchingLocation) {
                setStoreSelectedLocation(
                  machineLocationId,
                  matchingLocation.name
                );
                setStoreLockedLocation(machineLocationId);
                setModalState((prev) => ({
                  ...prev,
                  lockedLocationId: machineLocationId,
                }));
              }
            }
          }
        } else {
          setStoreCollectedMachines([]);
          setModalState((prev) => ({
            ...prev,
            collectedMachines: [],
          }));
        }
      } catch (error) {
        console.error('Error fetching existing collections:', error);
        setStoreCollectedMachines([]);
        setModalState((prev) => ({
          ...prev,
          collectedMachines: [],
        }));
      } finally {
        setModalState((prev) => ({ ...prev, isLoadingCollections: false }));
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

  useEffect(() => {
    if (show && locations.length > 0) {
      if (!hasFetchedOnOpenRef.current) {
        console.warn(
          '🔄 Mobile: Modal opened - fetching fresh collections data'
        );
        fetchExistingCollections(undefined);
        hasFetchedOnOpenRef.current = true;
      }
    } else if (!show) {
      hasFetchedOnOpenRef.current = false;
    }
  }, [show, fetchExistingCollections, locations.length]);

  // ============================================================================
  // Location Management
  // ============================================================================

  const handleLocationChange = useCallback(
    (locationId: string) => {
      const location = locationsRef.current.find(
        (loc) => String(loc._id) === locationId
      );
      const locationName = location?.name || '';

      setStoreSelectedLocation(locationId, locationName);

      if (location) {
        setStoreFinancials({
          previousBalance: (location.collectionBalance || 0).toString(),
        });

        if (location.gameDayOffset !== undefined) {
          const defaultTime = calculateDefaultCollectionTime(
            location.gameDayOffset
          );
          setStoreFormData({ collectionTime: defaultTime });
        }
      }

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

  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocation;
    let cancelled = false;

    if (locationIdToUse) {
      setModalState((prev) => ({ ...prev, isLoadingMachines: true }));
      const fetchMachinesForLocation = async () => {
        try {
          const response = await axios.get(
            `/api/cabinets?locationId=${locationIdToUse}&_t=${Date.now()}`
          );
          if (cancelled) return;
          if (response.data?.success && response.data?.data) {
            setStoreAvailableMachines(response.data.data);
          } else {
            setStoreAvailableMachines([]);
          }
        } catch (error) {
          if (cancelled) return;
          console.error('Error fetching machines for location:', error);
          setStoreAvailableMachines([]);
        } finally {
          if (!cancelled) {
            setModalState((prev) => ({ ...prev, isLoadingMachines: false }));
          }
        }
      };
      fetchMachinesForLocation();
    } else {
      setStoreAvailableMachines([]);
      setModalState((prev) => ({ ...prev, isLoadingMachines: false }));
    }

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, lockedLocationId, setStoreAvailableMachines]);

  // Auto-populate prevIn/prevOut when a machine is selected
  useEffect(() => {
    if (!selectedMachineData) return;

    if (isWowMachine(selectedMachineData)) {
      const machineId = String(selectedMachineData._id);
      const startHint = selectedMachineData.collectionTime
        ? new Date(selectedMachineData.collectionTime).toISOString()
        : '';
      const nowIso = new Date().toISOString();
      axios
        .get(
          `/api/collection-reports/collections/wow-meters?machineId=${machineId}` +
            (startHint ? `&startTime=${startHint}` : '') +
            `&endTime=${nowIso}`
        )
        .then((res) => {
          const wow = res.data?.data;
          if (wow) {
            setStoreFormData({
              metersIn: wow.metersIn != null ? String(wow.metersIn) : '',
              metersOut: wow.metersOut != null ? String(wow.metersOut) : '',
              prevIn: wow.prevIn != null ? String(wow.prevIn) : '',
              prevOut: wow.prevOut != null ? String(wow.prevOut) : '',
            });
          }
        })
        .catch((wowErr) => {
          console.error(
            '[useMobileNewData] WOW meters fetch failed:',
            wowErr instanceof Error ? wowErr.message : 'Unknown error'
          );
        });
      return;
    }

    const prevInValue = (() => {
      const collectionIn = selectedMachineData.collectionMeters?.metersIn;
      return collectionIn !== null &&
        collectionIn !== undefined &&
        collectionIn > 0
        ? collectionIn.toString()
        : '';
    })();

    const prevOutValue = (() => {
      const collectionOut = selectedMachineData.collectionMeters?.metersOut;
      return collectionOut !== null &&
        collectionOut !== undefined &&
        collectionOut > 0
        ? collectionOut.toString()
        : '';
    })();

    setStoreFormData({
      prevIn: prevInValue,
      prevOut: prevOutValue,
    });
  }, [selectedMachineData, setStoreFormData]);

  // ============================================================================
  // Financial Calculations
  // ============================================================================

  const calculateAmountToCollect = useCallback(() => {
    if (modalState.collectedMachines.length === 0) {
      if (financials.amountToCollect !== '0') {
        setStoreFinancials({ amountToCollect: '0' });
      }
      return;
    }

    const totalMovementData = modalState.collectedMachines.map((entry) => {
      const movement = calculateCabinetMovement(
        entry.metersIn || 0,
        entry.metersOut || 0,
        entry.prevIn || 0,
        entry.prevOut || 0,
        entry.ramClear || false,
        undefined,
        undefined,
        entry.ramClearMetersIn ?? undefined,
        entry.ramClearMetersOut ?? undefined
      );
      return { gross: movement.gross };
    });

    const totalGross = totalMovementData.reduce(
      (sum, machineEntry) => sum + machineEntry.gross,
      0
    );

    const location = locationsRef.current.find(
      (loc) => String(loc._id) === (lockedLocationId || selectedLocation)
    );
    const profitShare = location?.profitShare ?? 50;
    const baseBalance = location?.collectionBalance ?? 0;
    const balanceCorrection = Number(financials.balanceCorrection) || 0;
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;

    const partnerProfit =
      ((totalGross - variance - advance) * profitShare) / 100 - taxes;

    const amountToCollect =
      totalGross -
      variance -
      advance -
      partnerProfit +
      baseBalance +
      balanceCorrection;

    const collectedAmount = Number(financials.collectedAmount) || 0;

    const nextAmountToCollect = amountToCollect.toFixed(2);
    const nextPreviousBalance = (collectedAmount - amountToCollect).toFixed(2);

    if (
      financials.amountToCollect !== nextAmountToCollect ||
      financials.previousBalance !== nextPreviousBalance
    ) {
      setStoreFinancials({
        amountToCollect: nextAmountToCollect,
        previousBalance: nextPreviousBalance,
      });
    }
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

  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const inputsEnabled = useMemo(() => {
    return !!selectedMachine && !!selectedMachineData;
  }, [selectedMachine, selectedMachineData]);

  const isAddMachineEnabled = useMemo(() => {
    if (!selectedMachineData) return false;
    if (!storeFormData.metersIn || !storeFormData.metersOut) return false;
    if (
      storeFormData.ramClear &&
      (!storeFormData.ramClearMetersIn || !storeFormData.ramClearMetersOut)
    ) {
      return false;
    }
    if (storeFormData.ramClear && selectedMachineData) {
      const currentMetersIn =
        selectedMachineData.collectionMeters?.metersIn ?? 0;
      const currentMetersOut =
        selectedMachineData.collectionMeters?.metersOut ?? 0;

      if (
        Number(storeFormData.ramClearMetersIn) < Number(currentMetersIn) ||
        Number(storeFormData.ramClearMetersOut) < Number(currentMetersOut)
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
  }, [
    selectedMachineData,
    modalState.formData.metersIn,
    modalState.formData.metersOut,
    modalState.formData.ramClear,
    modalState.formData.ramClearMetersIn,
    modalState.formData.ramClearMetersOut,
    modalState.formData.showAdvancedSas,
    modalState.formData.sasStartTime,
    modalState.formData.sasEndTime,
  ]);

  const isCreateReportsEnabled = useMemo(() => {
    if (modalState.collectedMachines.length === 0) return false;
    const allMachinesHaveRequiredData = modalState.collectedMachines.every(
      (machine) =>
        machine.metersIn !== undefined &&
        machine.metersIn !== null &&
        machine.metersOut !== undefined &&
        machine.metersOut !== null
    );
    if (!allMachinesHaveRequiredData) return false;
    const amountToCollectHasValue =
      financials.amountToCollect !== undefined &&
      financials.amountToCollect !== null &&
      financials.amountToCollect.toString().trim() !== '';
    const balanceCorrectionHasValue =
      financials.balanceCorrection !== undefined &&
      financials.balanceCorrection !== null &&
      financials.balanceCorrection.toString().trim() !== '';
    return amountToCollectHasValue && balanceCorrectionHasValue;
  }, [modalState.collectedMachines, financials]);

  // ============================================================================
  // Machine Collection Operations
  // ============================================================================

  const addMachineToList = useCallback(async () => {
    if (!selectedMachineData || modalState.isProcessing) return;

    const isEditing = !!modalState.editingEntryId;

    const validationPrevIn =
      modalState.formData.prevIn !== ''
        ? Number(modalState.formData.prevIn)
        : selectedMachineData.collectionMeters?.metersIn ?? 0;
    const validationPrevOut =
      modalState.formData.prevOut !== ''
        ? Number(modalState.formData.prevOut)
        : selectedMachineData.collectionMeters?.metersOut ?? 0;
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
      toast.error(
        validation.error || 'Invalid machine data. Please check your inputs.',
        { duration: 5000 }
      );
      return;
    }

    setModalState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const timeForMobile =
        modalState.formData.sasEndTime || modalState.formData.collectionTime;

      const collectionPayload = {
        machineId: String(selectedMachineData._id),
        location: selectedLocation || '',
        collector: user?._id || '',
        notes: modalState.formData.notes,
        ramClear: modalState.formData.ramClear,
        ramClearMetersIn: modalState.formData.ramClearMetersIn
          ? Number(modalState.formData.ramClearMetersIn)
          : undefined,
        ramClearMetersOut: modalState.formData.ramClearMetersOut
          ? Number(modalState.formData.ramClearMetersOut)
          : undefined,
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
        metersIn: Number(modalState.formData.metersIn),
        metersOut: Number(modalState.formData.metersOut),
        prevIn: validationPrevIn,
        prevOut: validationPrevOut,
        locationReportId: '',
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

      setModalState((prev) => {
        const newCollectedMachines = isEditing
          ? prev.collectedMachines.map((collectedEntry) =>
              collectedEntry._id === modalState.editingEntryId
                ? (enrichedCollection as unknown as MobileNavigationState['collectedMachines'][number])
                : collectedEntry
            )
          : [...prev.collectedMachines, enrichedCollection as unknown as MobileNavigationState['collectedMachines'][number]];

        const newLockedLocationId =
          prev.collectedMachines.length === 0 && !isEditing
            ? selectedLocation || undefined
            : prev.lockedLocationId;

        const newStack = [...prev.navigationStack];
        if (newStack[newStack.length - 1] === 'form') {
          newStack.pop();
        }

        const topPanel =
          newStack.length > 0 ? newStack[newStack.length - 1] : null;

        return {
          ...prev,
          collectedMachines: newCollectedMachines,
          lockedLocationId: newLockedLocationId,
          isFormVisible: false,
          isMachineListVisible:
            topPanel === 'machine-list' || topPanel === null,
          isCollectedListVisible: topPanel === 'list',
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
            showAdvancedSas: prev.formData.showAdvancedSas,
            sasStartTime: prev.formData.showAdvancedSas
              ? prev.formData.sasStartTime
              : null,
            sasEndTime: prev.formData.showAdvancedSas
              ? prev.formData.sasEndTime
              : null,
            prevIn: '',
            prevOut: '',
          },
        };
      });

      setStoreFormData({
        metersIn: '',
        metersOut: '',
        ramClear: false,
        ramClearMetersIn: '',
        ramClearMetersOut: '',
        notes: '',
        showAdvancedSas: modalState.formData.showAdvancedSas,
        sasStartTime: modalState.formData.showAdvancedSas
          ? typeof modalState.formData.sasStartTime === 'string'
            ? new Date(modalState.formData.sasStartTime)
            : modalState.formData.sasStartTime
          : null,
        sasEndTime: modalState.formData.showAdvancedSas
          ? typeof modalState.formData.sasEndTime === 'string'
            ? new Date(modalState.formData.sasEndTime)
            : modalState.formData.sasEndTime
          : null,
        prevIn: '',
        prevOut: '',
      });

      setStoreCollectedMachines(
        (isEditing
          ? modalState.collectedMachines.map((machineEntry) =>
              machineEntry._id === modalState.editingEntryId
                ? enrichedCollection
                : machineEntry
            )
          : [...modalState.collectedMachines, enrichedCollection]) as unknown as CollectionDocument[]
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

      if (selectedLocationName) {
        const machineName =
          selectedMachineData?.name ||
          selectedMachineData?.serialNumber ||
          String(selectedMachineData?._id || '');
        const metersIn = Number(modalState.formData.metersIn);
        const metersOut = Number(modalState.formData.metersOut);
        const ramClear = modalState.formData.ramClear;
        const notes = modalState.formData.notes;
        if (isEditing) {
          const prevEntry = modalState.collectedMachines.find(
            (collectedMachine) =>
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
            `PrevIn: ${validationPrevIn}`,
            `PrevOut: ${validationPrevOut}`,
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
              prevIn: validationPrevIn,
              prevOut: validationPrevOut,
              ramClear,
              notes: notes || undefined,
            }
          );
        }
      }
    } catch (error: unknown) {
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
      setModalState((prev) => ({ ...prev, isProcessing: false }));
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

  const editMachineInList = useCallback(
    (entry: CollectionDocument) => {
      let machine = availableMachines.find(
        (m) => String(m._id) === entry.machineId
      );

      if (!machine && entry.location) {
        const location = locationsRef.current.find(
          (loc) => loc.name === entry.location
        );
        if (location && location.machines) {
          machine = location.machines.find(
            (m) => String(m._id) === entry.machineId
          );

          setStoreAvailableMachines(location.machines || []);
          setStoreSelectedLocation(String(location._id), location.name);
        }
      }

      if (!machine) {
        toast.error('Machine data not found. Please refresh and try again.');
        return;
      }

      const initialFormData = {
        metersIn: entry.metersIn.toString(),
        metersOut: entry.metersOut.toString(),
        ramClear: entry.ramClear || false,
        ramClearMetersIn: entry.ramClearMetersIn?.toString() || '',
        ramClearMetersOut: entry.ramClearMetersOut?.toString() || '',
        notes: entry.notes || '',
        collectionTime: new Date(entry.timestamp),
        showAdvancedSas: false,
        sasStartTime: entry.sasMeters?.sasStartTime ?? null,
        sasEndTime: entry.sasMeters?.sasEndTime ?? null,
        prevIn: entry.prevIn?.toString() || '',
        prevOut: entry.prevOut?.toString() || '',
      };

      setModalState((prev) => ({
        ...prev,
        selectedMachine: String(machine!._id),
        selectedMachineData: machine!,
        editingEntryId: entry._id,
        isFormVisible: true,
        isCollectedListVisible: false,
        formData: initialFormData,
        navigationStack: [...prev.navigationStack, 'form'],
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

  const deleteMachineFromList = useCallback(
    async (entryId: string) => {
      setModalState((prev) => ({ ...prev, isProcessing: true }));

      try {
        const entryToDeleteData = modalState.collectedMachines.find(
          (entry) => entry._id === entryId
        );

        await axios.delete(
          `/api/collection-reports/collections?id=${entryId}`
        );

        setModalState((prev) => {
          const newCollectedMachines = prev.collectedMachines.filter(
            (machine) => machine._id !== entryId
          );
          const newLockedLocationId =
            newCollectedMachines.length === 0
              ? undefined
              : prev.lockedLocationId;

          return {
            ...prev,
            collectedMachines: newCollectedMachines,
            lockedLocationId: newLockedLocationId,
            isProcessing: false,
          };
        });

        setStoreCollectedMachines(
          modalState.collectedMachines.filter(
            (collectedMachine) => collectedMachine._id !== entryId
          ) as unknown as CollectionDocument[]
        );

        if (modalState.collectedMachines.length === 1) {
          setStoreLockedLocation(undefined);
        }

        toast.success(
          entryToDeleteData?.machineCustomName
            ? `Removed ${entryToDeleteData.machineCustomName} from collection`
            : 'Collection removed successfully'
        );
      } catch (error) {
        console.error('📱 Mobile: Failed to delete collection:', error);
        setModalState((prev) => ({ ...prev, isProcessing: false }));
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
  // State Synchronization
  // ============================================================================

  useEffect(() => {
    if (
      !show ||
      modalState.isLoadingCollections ||
      isUpdatingFromModalStateRef.current
    ) {
      return;
    }

    if (
      modalState.collectedMachines.length !== storeCollectedMachines.length ||
      modalState.collectedMachines.some(
        (machine, index) => machine._id !== storeCollectedMachines[index]?._id
      )
    ) {
      isUpdatingFromModalStateRef.current = true;
      setStoreCollectedMachines(modalState.collectedMachines as unknown as CollectionDocument[]);

      if (modalState.lockedLocationId !== lockedLocationId) {
        if (modalState.lockedLocationId) {
          setStoreLockedLocation(modalState.lockedLocationId);
        } else {
          setStoreLockedLocation(undefined);
        }
      }

      queueMicrotask(() => {
        isUpdatingFromModalStateRef.current = false;
      });
    }
  }, [
    show,
    modalState.collectedMachines,
    modalState.lockedLocationId,
    modalState.isLoadingCollections,
    storeCollectedMachines,
    lockedLocationId,
    setStoreCollectedMachines,
    setStoreLockedLocation,
  ]);

  // ============================================================================
  // Form Data Change Handler
  // ============================================================================

  const onFormDataChange = useCallback(
    (field: string, value: unknown) => {
      const currentFormData = { ...storeFormData };
      let newFormData = { ...currentFormData, [field]: value };

      if (field === 'showAdvancedSas' && value === true) {
        const location = locationsRef.current.find(
          (location) => String(location._id) === selectedLocation
        );
        const machine = selectedMachineData;

        if (!newFormData.sasStartTime) {
          let defaultStart = new Date();
          if (machine?.collectionTime) {
            defaultStart = new Date(machine.collectionTime);
          } else if (location?.previousCollectionTime) {
            defaultStart = new Date(location.previousCollectionTime);
          }
          newFormData = { ...newFormData, sasStartTime: defaultStart };
        }

        if (!newFormData.sasEndTime) {
          const gameDayOffset = location?.gameDayOffset ?? 8;
          const defaultEnd = new Date(
            newFormData.collectionTime || new Date()
          );
          if (defaultEnd.getHours() < gameDayOffset) {
            defaultEnd.setDate(defaultEnd.getDate() - 1);
          }
          defaultEnd.setHours(gameDayOffset - 1, 59, 59, 0);
          newFormData = { ...newFormData, sasEndTime: defaultEnd };
        }
      }

      setStoreFormData(newFormData as Partial<typeof storeFormData>);
      setModalState((prev) => ({
        ...prev,
        formData: newFormData,
      }));
    },
    [
      storeFormData,
      setStoreFormData,
      selectedLocation,
      selectedMachineData,
    ]
  );

  return {
    selectedLocation,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines: modalState.collectedMachines,
    selectedMachine,
    selectedMachineData,
    financials,
    handleLocationChange,
    addMachineToList,
    editMachineInList,
    deleteMachineFromList,
    inputsEnabled,
    isAddMachineEnabled,
    isCreateReportsEnabled,
    sortMachinesAlphabetically,
    setStoreFinancials,
    setStoreSelectedMachine: setStoreSelectedMachineExposed,
    setStoreSelectedMachineData: setStoreSelectedMachineDataExposed,
    baseBalanceCorrection: modalState.baseBalanceCorrection,
    onBaseBalanceCorrectionChange: (value: string) => {
      setModalState((prev) => ({ ...prev, baseBalanceCorrection: value }));
    },
    getLocationIdFromMachine,
    fetchExistingCollections,
    onFormDataChange,
    storeFormData,
    setStoreFormData,
  };
}