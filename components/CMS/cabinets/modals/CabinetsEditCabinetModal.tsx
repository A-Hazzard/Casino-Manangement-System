/**
 * Cabinets Edit Cabinet Modal Component
 *
 * Modal for editing existing cabinet details.
 *
 * @module components/cabinets/CabinetsEditCabinetModal
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { fetchCabinetById, updateCabinet } from '@/lib/helpers/cabinets';
import { fetchManufacturers } from '@/lib/helpers/cabinets';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import {
  normalizeGameTypeValue,
  normalizeStatusValue,
} from '@/lib/utils/cabinet';
import {
  detectChanges,
  filterMeaningfulChanges,
} from '@/lib/utils/changeDetection';
import type { GamingMachine } from '@/shared/types/entities';
import { Cross2Icon } from '@radix-ui/react-icons';
import axios from 'axios';
import { gsap } from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import EditCabinetBasicInfo from '../EditCabinetModal/EditCabinetBasicInfo';
import EditCabinetCollectionSettings from '../EditCabinetModal/EditCabinetCollectionSettings';
import EditCabinetLocationConfig from '../EditCabinetModal/EditCabinetLocationConfig';

type CabinetFormData = Partial<GamingMachine>;

export default function CabinetsEditCabinetModal({
  onCabinetUpdated,
}: {
  onCabinetUpdated?: () => void;
}) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { isEditModalOpen, selectedCabinet, closeEditModal } =
    useCabinetsActionsStore();
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [cabinetDataLoading, setCabinetDataLoading] = useState(false);
  const [userModifiedFields, setUserModifiedFields] = useState<Set<string>>(
    new Set()
  );
  const userModifiedFieldsRef = useRef<Set<string>>(new Set());
  const [locations, setLocations] = useState<
    { id: string; name: string; sasEnabled: boolean }[]
  >([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(false);
  const [isAddingManufacturer, setIsAddingManufacturer] = useState(false);
  const [relayIdError, setRelayIdError] = useState<string>('');
  const [serialNumberError, setSerialNumberError] = useState<string>('');
  const [customNameError, setCustomNameError] = useState<string>('');
  const [installedGameError, setInstalledGameError] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');
  const [accountingDenominationError, setAccountingDenominationError] =
    useState<string>('');
  const [collectionMultiplierError, setCollectionMultiplierError] =
    useState<string>('');

  // ============================================================================
  // Helpers & Handlers
  // ============================================================================
  const checkSerialNumberAvailability = async (serialNumber: string) => {
    if (!serialNumber || serialNumber.trim().length < 3) return;
    if (!formData._id) return;

    try {
      const response = await fetch(
        `/api/cabinets?checkSerial=${encodeURIComponent(
          serialNumber.trim()
        )}&excludeId=${formData._id}`
      );
      const result = await response.json();

      if (result.success && !result.available) {
        setSerialNumberError('Serial number already exists');
      }
    } catch (_id) {
      console.error('Failed to check serial number availability:', _id);
    }
  };

  const checkSmibAvailability = async (smib: string) => {
    if (!smib || smib.trim().length !== 12) return;
    if (!formData._id) return;

    try {
      const response = await fetch(
        `/api/cabinets?checkSmib=${encodeURIComponent(
          smib.trim()
        )}&excludeId=${formData._id}`
      );
      const result = await response.json();

      if (result.success && !result.available) {
        setRelayIdError('SMIB board already exists');
      }
    } catch (_id) {
      console.error('Failed to check SMIB availability:', _id);
    }
  };

  const checkCustomNameAvailability = async (name: string) => {
    if (!name || name.trim().length === 0) return;
    if (!formData._id) return;

    try {
      const response = await fetch(
        `/api/cabinets?checkCustomName=${encodeURIComponent(
          name.trim()
        )}&excludeId=${formData._id}`
      );
      const result = await response.json();

      if (result.success && !result.available) {
        setCustomNameError('Machine custom name already exists');
      }
    } catch (_id) {
      console.error('Failed to check custom name availability:', _id);
    }
  };

  // Helper function to get display serial number
  const getDisplaySerialNumber = (cabinet: GamingMachine | null): string => {
    if (!cabinet) return 'Unknown';

    // Check if serialNumber exists and is not just whitespace
    if (cabinet.serialNumber && cabinet.serialNumber.trim() !== '') {
      return cabinet.serialNumber;
    }

    // Check if custom.name exists and is not just whitespace
    if (cabinet.custom?.name && cabinet.custom.name.trim() !== '') {
      return cabinet.custom.name;
    }

    // Check if machineId exists and is not just whitespace
    if (cabinet.machineId && cabinet.machineId.trim() !== '') {
      return cabinet.machineId;
    }

    return 'Unknown';
  };

  // Helper function to format creation date
  const formatCreationDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  // Fetch locations data
  const fetchLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);
      const response = await axios.get('/api/locations');
      const locationsData = response.data.locations || [];
      const mappedLocations = locationsData.map(
        (loc: { _id: string; name: string; sasEnabled?: boolean }) => ({
          id: loc._id,
          name: loc.name,
          sasEnabled: loc.sasEnabled || false,
        })
      );
      setLocations(mappedLocations);
    } catch (_id) {
      console.error('Failed to fetch locations:', _id);
      toast.error('Failed to load locations');
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  // Fetch manufacturers data
  const fetchManufacturersData = useCallback(async () => {
    try {
      setManufacturersLoading(true);
      const fetchedManufacturers = await fetchManufacturers();
      setManufacturers(fetchedManufacturers);
    } catch (_id) {
      console.error('Failed to fetch manufacturers:', _id);
      toast.error('Failed to load manufacturers');
      setManufacturers([]);
    } finally {
      setManufacturersLoading(false);
    }
  }, []);

  type CollectionSettingsForm = {
    multiplier?: string;
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };

  const [collectionTime, setCollectionTime] = useState<Date>(new Date());

  type ExtendedCabinetFormData = CabinetFormData & {
    cabinetType?: string;
    otherGameType?: string;
    collectionSettings?: CollectionSettingsForm;
  };

  const [formData, setFormData] = useState<ExtendedCabinetFormData>({
    _id: '',
    assetNumber: '',
    installedGame: '',
    gameType: 'slot',
    accountingDenomination: '1',
    collectionMultiplier: '1',
    locationId: '',
    smbId: '',
    otherGameType: '',
    status: 'functional',
    isCronosMachine: false,
    manufacturer: '',
    cabinetType: 'Standing',
    collectionSettings: {
      multiplier: '1',
      lastCollectionTime: '',
      lastMetersIn: '',
      lastMetersOut: '',
    },
    custom: { name: '' },
    gameConfig: {
      theoreticalRtp: 0,
      maxBet: '0',
      payTableId: '',
      additionalId: '',
      gameOptions: '',
      progressiveGroup: '',
    },
  });

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    userModifiedFieldsRef.current = userModifiedFields;
  }, [userModifiedFields]);

  useEffect(() => {
    // Initial form data setup from selected cabinet
    if (selectedCabinet) {
      setCabinetDataLoading(true);
      // console.log("Selected cabinet gameType:", selectedCabinet.gameType);
      const initialCollectionTime = selectedCabinet.collectionTime
        ? new Date(selectedCabinet.collectionTime)
        : new Date();
      setCollectionTime(initialCollectionTime);

      console.log(
        `[CabinetsEditCabinetModal] selectedCabinet status:`,
        selectedCabinet.status
      );
      console.log(
        `[CabinetsEditCabinetModal] selectedCabinet assetStatus:`,
        selectedCabinet.assetStatus
      );
      console.log(
        `[CabinetsEditCabinetModal] selectedCabinet machineStatus:`,
        selectedCabinet.machineStatus
      );
      const initialFormData: ExtendedCabinetFormData = {
        _id: selectedCabinet._id,
        assetNumber: selectedCabinet.assetNumber || '',
        installedGame: selectedCabinet.installedGame || '',
        gameType: normalizeGameTypeValue(selectedCabinet.gameType),
        accountingDenomination: String(
          selectedCabinet.accountingDenomination || '1'
        ),
        collectionMultiplier: selectedCabinet.collectionMultiplier || '1',
        locationId: selectedCabinet.locationId || '',
        smbId: selectedCabinet.smbId || '',
        status: normalizeStatusValue(
          selectedCabinet.assetStatus || selectedCabinet.status
        ),
        isCronosMachine: selectedCabinet.isCronosMachine || false,
        manufacturer: selectedCabinet.manufacturer || '',
        custom: selectedCabinet.custom || { name: '' },
        createdAt: selectedCabinet.createdAt,
        cabinetType: selectedCabinet.cabinetType || 'Standing',
        otherGameType: !['slot', 'roulette', 'pulse'].includes(
          normalizeGameTypeValue(selectedCabinet.gameType)
        )
          ? selectedCabinet.gameType
          : '',
        collectionSettings: {
          multiplier: selectedCabinet.collectionMultiplier || '1',
          lastCollectionTime: initialCollectionTime.toISOString(),
          lastMetersIn: selectedCabinet.collectionMeters
            ? String(selectedCabinet.collectionMeters.metersIn ?? 0)
            : '0',
          lastMetersOut: selectedCabinet.collectionMeters
            ? String(selectedCabinet.collectionMeters.metersOut ?? 0)
            : '0',
        },
      };
      setFormData(initialFormData);

      // Fetch locations and manufacturers data when modal opens
      fetchLocations();
      fetchManufacturersData();

      // Fetch additional cabinet details if needed
      if (selectedCabinet._id && activeMetricsFilter) {
        // Skip if Custom filter is selected but date range is not available
        if (activeMetricsFilter === 'Custom') {
          if (
            !customDateRange ||
            !customDateRange.startDate ||
            !customDateRange.endDate
          ) {
            console.warn(
              '[EditCabinetModal] Skipping fetch: Custom filter selected but date range not available',
              {
                hasCustomDateRange: !!customDateRange,
                hasStartDate: !!customDateRange?.startDate,
                hasEndDate: !!customDateRange?.endDate,
              }
            );
            setCabinetDataLoading(false);
            return;
          }
        }

        setCabinetDataLoading(true);
        // Convert customDateRange to DateRange format expected by fetchCabinetById
        const dateRangeForFetch =
          customDateRange?.startDate && customDateRange?.endDate
            ? { from: customDateRange.startDate, to: customDateRange.endDate }
            : undefined;
        fetchCabinetById(
          selectedCabinet._id,
          activeMetricsFilter,
          dateRangeForFetch
        )
          .then(cabinetDetails => {
            if (cabinetDetails) {
              // console.log("Cabinet details gameType:", cabinetDetails.gameType);
              // console.log(
              //   "Cabinet details manufacturer:",
              //   cabinetDetails.manufacturer
              // );
              // console.log("Full cabinet details:", cabinetDetails);
              setFormData(prevData => {
                // console.log(
                //   "User modified fields:",
                //   Array.from(userModifiedFields)
                // );
                // console.log(
                //   "Will override gameType:",
                //   !userModifiedFields.has("gameType")
                // );
                // console.log("API gameType:", cabinetDetails.gameType);
                // console.log("Current form gameType:", prevData.gameType);

                const newData = {
                  ...prevData,
                  installedGame:
                    cabinetDetails.installedGame || prevData.installedGame,
                  // Only update gameType if user hasn't modified it
                  gameType: userModifiedFieldsRef.current.has('gameType')
                    ? prevData.gameType
                    : normalizeGameTypeValue(
                        cabinetDetails.gameType || prevData.gameType
                      ),
                  // Only update manufacturer if user hasn't modified it
                  manufacturer: userModifiedFieldsRef.current.has(
                    'manufacturer'
                  )
                    ? prevData.manufacturer
                    : cabinetDetails.manufacturer || prevData.manufacturer,
                  accountingDenomination: String(
                    cabinetDetails.accountingDenomination ||
                      prevData.accountingDenomination
                  ),
                  collectionMultiplier:
                    cabinetDetails.collectionMultiplier ||
                    prevData.collectionMultiplier,
                  status: normalizeStatusValue(
                    cabinetDetails.status || prevData.status
                  ),
                  isCronosMachine:
                    cabinetDetails.isCronosMachine || prevData.isCronosMachine,
                  createdAt: cabinetDetails.createdAt || prevData.createdAt,
                  cabinetType:
                    cabinetDetails.cabinetType || prevData.cabinetType,
                  collectionSettings: {
                    multiplier:
                      cabinetDetails.collectionMultiplier ||
                      prevData.collectionSettings?.multiplier ||
                      '1',
                    lastCollectionTime:
                      (cabinetDetails.collectionTime
                        ? new Date(cabinetDetails.collectionTime).toISOString()
                        : prevData.collectionSettings?.lastCollectionTime) ||
                      initialCollectionTime.toISOString(),
                    lastMetersIn:
                      cabinetDetails.collectionMeters?.metersIn !== undefined
                        ? String(cabinetDetails.collectionMeters.metersIn)
                        : prevData.collectionSettings?.lastMetersIn || '0',
                    lastMetersOut:
                      cabinetDetails.collectionMeters?.metersOut !== undefined
                        ? String(cabinetDetails.collectionMeters.metersOut)
                        : prevData.collectionSettings?.lastMetersOut || '0',
                  },
                  otherGameType: userModifiedFieldsRef.current.has('gameType')
                    ? prevData.otherGameType
                    : !['slot', 'roulette', 'pulse'].includes(
                          normalizeGameTypeValue(
                            cabinetDetails.gameType || prevData.gameType
                          )
                        )
                      ? cabinetDetails.gameType || prevData.gameType
                      : '',
                  // Ensure SMIB board fields are updated from detail fetch
                  smbId:
                    userModifiedFieldsRef.current.has('smbId') ||
                    userModifiedFieldsRef.current.has('relayId')
                      ? prevData.smbId
                      : cabinetDetails.smbId || prevData.smbId,
                  relayId:
                    userModifiedFieldsRef.current.has('relayId') ||
                    userModifiedFieldsRef.current.has('smbId')
                      ? prevData.relayId
                      : cabinetDetails.relayId || prevData.relayId,
                  smibBoard:
                    userModifiedFieldsRef.current.has('smbId') ||
                    userModifiedFieldsRef.current.has('relayId')
                      ? prevData.smibBoard
                      : cabinetDetails.relayId || prevData.smibBoard,
                  gameConfig: {
                    theoreticalRtp:
                      cabinetDetails.gameConfig?.theoreticalRtp ??
                      prevData.gameConfig?.theoreticalRtp ??
                      0,
                    maxBet:
                      cabinetDetails.gameConfig?.maxBet ||
                      prevData.gameConfig?.maxBet ||
                      '0',
                    payTableId:
                      cabinetDetails.gameConfig?.payTableId ||
                      prevData.gameConfig?.payTableId ||
                      '',
                    additionalId:
                      cabinetDetails.gameConfig?.additionalId ||
                      prevData.gameConfig?.additionalId ||
                      '',
                    gameOptions:
                      cabinetDetails.gameConfig?.gameOptions ||
                      prevData.gameConfig?.gameOptions ||
                      '',
                    progressiveGroup:
                      cabinetDetails.gameConfig?.progressiveGroup ||
                      prevData.gameConfig?.progressiveGroup ||
                      '',
                  },
                };
                // console.log(
                //   "Updated form data with gameType:",
                //   newData.gameType,
                //   "User modified gameType:",
                //   userModifiedFields.has("gameType")
                // );
                return newData;
              });
              if (cabinetDetails.collectionTime) {
                setCollectionTime(new Date(cabinetDetails.collectionTime));
              }
            }
          })
          .catch(error => {
            // Log error for debugging in development
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching cabinet details:', error);
            }
          })
          .finally(() => {
            setCabinetDataLoading(false);
          });
      }
    }
  }, [
    selectedCabinet,
    fetchLocations,
    fetchManufacturersData,
    activeMetricsFilter,
    customDateRange,
  ]);

  useEffect(() => {
    if (isEditModalOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: true,
        }
      );
      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  }, [isEditModalOpen]);

  // ============================================================================
  // Additional Handlers
  // ============================================================================
  const handleClose = () => {
    // Clear user modified fields when closing modal
    setUserModifiedFields(new Set());

    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: 'power2.in',
      overwrite: true,
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      overwrite: true,
      onComplete: closeEditModal,
    });
  };

  const handleSubmit = async () => {
    if (!selectedCabinet) return;
    try {
      setLoading(true);

      // Required-field validations
      const errors: string[] = [];
      if (!formData.assetNumber || formData.assetNumber.trim().length === 0) {
        setSerialNumberError('Serial number is required');
        errors.push('assetNumber');
      } else if (formData.assetNumber.trim().length < 3) {
        setSerialNumberError(
          'Serial number must be at least 3 characters long'
        );
        errors.push('assetNumberLen');
      }
      if (
        !formData.installedGame ||
        formData.installedGame.trim().length === 0
      ) {
        setInstalledGameError('Installed game is required');
        errors.push('installedGame');
      }
      if (
        !formData.accountingDenomination ||
        String(formData.accountingDenomination).trim().length === 0
      ) {
        setAccountingDenominationError('Accounting denomination is required');
        errors.push('accountingDenomination');
      } else if (isNaN(Number(formData.accountingDenomination))) {
        setAccountingDenominationError(
          'Accounting denomination must be a number'
        );
        errors.push('accountingDenominationNaN');
      }
      const multiplierValue =
        formData.collectionSettings?.multiplier ||
        formData.collectionMultiplier ||
        '';

      if (!multiplierValue || multiplierValue.trim().length === 0) {
        setCollectionMultiplierError('Collection multiplier is required');
        errors.push('collectionMultiplier');
      } else if (isNaN(Number(multiplierValue))) {
        setCollectionMultiplierError('Collection multiplier must be a number');
        errors.push('collectionMultiplierNaN');
      } else {
        formData.collectionMultiplier = multiplierValue;
      }
      if (!formData.locationId || formData.locationId.trim().length === 0) {
        setLocationError('Location is required');
        errors.push('location');
      }
      if (relayIdError) {
        errors.push('relayId');
      }
      if (errors.length > 0) {
        toast.error('Please fix the highlighted fields before saving');
        setLoading(false);
        return;
      }

      // Debug: Log the form data being sent
      // console.log("Submitting form data:", JSON.stringify(formData, null, 2));
      // console.log("Sending to updateCabinet:", formData);

      // Build comparison objects with ONLY editable fields
      const originalData = {
        assetNumber: selectedCabinet.assetNumber,
        installedGame: selectedCabinet.installedGame,
        gameType: selectedCabinet.gameType,
        accountingDenomination: selectedCabinet.accountingDenomination,
        collectionMultiplier: selectedCabinet.collectionMultiplier,
        locationId: selectedCabinet.locationId,
        smbId: selectedCabinet.smbId,
        status: normalizeStatusValue(selectedCabinet.status),
        isCronosMachine: selectedCabinet.isCronosMachine,
        manufacturer: selectedCabinet.manufacturer,
        custom: selectedCabinet.custom,
        cabinetType: selectedCabinet.cabinetType,
        collectionSettings: {
          lastCollectionTime: selectedCabinet.collectionTime
            ? new Date(selectedCabinet.collectionTime).toISOString()
            : '',
          // Align with the initialization logic in useEffect and detail fetch:
          // Prefer sasMeters (source of truth for CR baseline) over collectionMeters.
          lastMetersIn:
            selectedCabinet.sasMeters?.drop != null &&
            selectedCabinet.sasMeters.drop > 0
              ? String(selectedCabinet.sasMeters.drop)
              : selectedCabinet.collectionMeters
                ? String(selectedCabinet.collectionMeters.metersIn ?? '')
                : '',
          lastMetersOut:
            selectedCabinet.sasMeters?.totalCancelledCredits != null &&
            selectedCabinet.sasMeters.totalCancelledCredits > 0
              ? String(selectedCabinet.sasMeters.totalCancelledCredits)
              : selectedCabinet.collectionMeters
                ? String(selectedCabinet.collectionMeters.metersOut ?? '')
                : '',
        },
      };

      const formDataComparison = {
        assetNumber: formData.assetNumber,
        installedGame: formData.installedGame,
        gameType: (
          (formData.gameType === 'other'
            ? formData.otherGameType
            : formData.gameType) || ''
        )
          .toLowerCase()
          .trim(),
        accountingDenomination: formData.accountingDenomination,
        collectionMultiplier: formData.collectionMultiplier,
        locationId: formData.locationId,
        smbId: formData.smbId,
        status: formData.status,
        isCronosMachine: formData.isCronosMachine,
        manufacturer: formData.manufacturer,
        custom: formData.custom,
        cabinetType: formData.cabinetType,
        collectionSettings: {
          lastCollectionTime:
            formData.collectionSettings?.lastCollectionTime || '',
          lastMetersIn: formData.collectionSettings?.lastMetersIn || '',
          lastMetersOut: formData.collectionSettings?.lastMetersOut || '',
        },
        gameConfig: {
          theoreticalRtp: formData.gameConfig?.theoreticalRtp || '',
          maxBet: formData.gameConfig?.maxBet || '',
          payTableId: formData.gameConfig?.payTableId || '',
          additionalId: formData.gameConfig?.additionalId || '',
          gameOptions: formData.gameConfig?.gameOptions || '',
          progressiveGroup: formData.gameConfig?.progressiveGroup || '',
        },
      };

      // Detect changes by comparing ONLY editable fields
      const changes = detectChanges(originalData, formDataComparison);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      // Only proceed if there are actual changes
      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        setLoading(false);
        return;
      }

      console.log(
        `[CabinetsEditCabinetModal] Meaningful changes:`,
        JSON.stringify(meaningfulChanges, null, 2)
      );
      console.log(
        `[CabinetsEditCabinetModal] Form data status:`,
        formData.status
      );
      console.log(
        `[CabinetsEditCabinetModal] Form data assetStatus:`,
        formData.assetStatus
      );
      console.log(
        `[CabinetsEditCabinetModal] Selected cabinet status:`,
        selectedCabinet.status
      );
      console.log(
        `[CabinetsEditCabinetModal] Selected cabinet assetStatus:`,
        selectedCabinet.assetStatus
      );
      console.log(
        `[CabinetsEditCabinetModal] Original data normalized status:`,
        normalizeStatusValue(selectedCabinet.status)
      );
      console.log(
        `[CabinetsEditCabinetModal] Form data comparison status:`,
        formData.status
      );
      console.log(
        `[CabinetsEditCabinetModal] Status fields are equal:`,
        normalizeStatusValue(selectedCabinet.status) === formData.status
      );

      // Build update payload with only changed fields + required _id
      const updatePayload: Record<string, unknown> = { _id: formData._id };
      let pendingCollectionSettings: Partial<CollectionSettingsForm> | null =
        null;

      meaningfulChanges.forEach(change => {
        const fieldPath = change.path; // Use full path for nested fields

        // Handle nested fields (e.g., "custom.name")
        if (fieldPath.includes('.')) {
          const [parent, child] = fieldPath.split('.');

          // Special handling for objects that must be sent whole
          if (parent === 'custom') {
            updatePayload.custom = formData.custom;
          } else if (parent === 'gameConfig') {
            updatePayload.gameConfig = formData.gameConfig;
          } else if (parent === 'collectionSettings') {
            if (!pendingCollectionSettings) {
              pendingCollectionSettings = {};
            }
            const key = child as keyof CollectionSettingsForm;
            (pendingCollectionSettings as Partial<CollectionSettingsForm>)[
              key
            ] = formData.collectionSettings?.[key];
          } else {
            if (!updatePayload[parent]) {
              updatePayload[parent] = {};
            }
            (updatePayload[parent] as Record<string, unknown>)[child] =
              change.newValue;
          }
        } else {
          // Special handling for gameType to ensure it's lowercased and uses otherGameType if needed
          if (fieldPath === 'gameType') {
            updatePayload.gameType = (
              (formData.gameType === 'other'
                ? formData.otherGameType
                : formData.gameType) || ''
            )
              .toLowerCase()
              .trim();
          } else {
            updatePayload[fieldPath] =
              formData[fieldPath as keyof typeof formData];
          }
        }
      });

      if (pendingCollectionSettings) {
        // Map collectionSettings back to backend-expected format
        // We send what's in formData.collectionSettings if ANY part of it changed
        updatePayload.collectionTime =
          formData.collectionSettings?.lastCollectionTime ||
          formData.collectionTime;

        updatePayload.collectionMeters = {
          metersIn: Number(formData.collectionSettings?.lastMetersIn) || 0,
          metersOut: Number(formData.collectionSettings?.lastMetersOut) || 0,
        };
      }

      console.log(
        `[CabinetsEditCabinetModal] Update payload being sent:`,
        JSON.stringify(updatePayload, null, 2)
      );

      // Pass only the changed fields to reduce unnecessary updates and logging
      // Convert customDateRange to DateRange format expected by updateCabinet
      const success = await updateCabinet(updatePayload);
      if (success) {
        // Call the callback to refresh data
        onCabinetUpdated?.();

        // Clear user modified fields after successful update
        setUserModifiedFields(new Set());

        // Show success feedback
        toast.success('Cabinet updated successfully');

        // Close the modal
        handleClose();
      }
    } catch (error) {
      console.error('Error updating cabinet:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update cabinet';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  if (!isEditModalOpen || !selectedCabinet) return null;

  // Modal Content - full viewport overlay with high z-index to cover sidebar
  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-2 md:items-center md:p-4">
        <div
          ref={modalRef}
          className="modal-initial flex max-h-[95vh] w-full flex-col bg-container shadow-lg md:max-w-2xl md:rounded-md md:shadow-lg"
        >
          <div className="flex flex-shrink-0 items-center border-b border-border p-3 sm:p-4">
            <h2 className="flex-1 text-center text-xl font-semibold">
              Edit {getDisplaySerialNumber(selectedCabinet)} Details
            </h2>
            <Button
              onClick={handleClose}
              variant="ghost"
              className="ml-2 text-grayHighlight hover:bg-buttonInactive/10"
              size="icon"
              aria-label="Close"
            >
              <Cross2Icon className="h-5 w-5" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-8 sm:pb-8">
            <div className="space-y-6">
              <div className="space-y-6">
                {/* Creation Date Display */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-700">
                        Machine Created
                      </h3>
                      {cabinetDataLoading ? (
                        <Skeleton className="mt-2 h-4 w-32" />
                      ) : (
                        <p className="mt-1 text-sm text-gray-600">
                          {formData.createdAt
                            ? formatCreationDate(formData.createdAt)
                            : 'Unknown'}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 text-left sm:text-right">
                      <h3 className="text-sm font-medium text-gray-700">
                        Machine ID
                      </h3>
                      {cabinetDataLoading ? (
                        <Skeleton className="mt-2 h-4 w-40 sm:ml-auto" />
                      ) : (
                        <p className="mt-1 break-all font-mono text-sm text-gray-600">
                          {formData._id || 'Unknown'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <EditCabinetBasicInfo
                  formData={{
                    assetNumber: formData.assetNumber || '',
                    installedGame: formData.installedGame || '',
                    gameType: formData.gameType || 'slot',
                    manufacturer: formData.manufacturer || '',
                    cabinetType: formData.cabinetType || 'Standing',
                    isCronosMachine: formData.isCronosMachine || false,
                    accountingDenomination: String(
                      formData.accountingDenomination || ''
                    ),
                    otherGameType: formData.otherGameType,
                    custom: formData.custom || { name: '' },
                  }}
                  cabinetDataLoading={cabinetDataLoading}
                  manufacturersLoading={manufacturersLoading}
                  manufacturers={manufacturers}
                  serialNumberError={serialNumberError}
                  customNameError={customNameError}
                  installedGameError={installedGameError}
                  isAddingManufacturer={isAddingManufacturer}
                  onAddManufacturerToggle={setIsAddingManufacturer}
                  onFormDataChange={updates => {
                    const fieldKeys = Object.keys(updates);
                    fieldKeys.forEach(field => {
                      if (field === 'assetNumber' && serialNumberError) {
                        setSerialNumberError('');
                      }
                      if (field === 'custom' && customNameError) {
                        setCustomNameError('');
                      }
                      setUserModifiedFields(prev => {
                        const next = new Set(prev);
                        next.add(field);
                        return next;
                      });
                    });
                    setFormData(prev => ({ ...prev, ...updates }));
                  }}
                  onSerialNumberBlur={checkSerialNumberAvailability}
                  onCustomNameBlur={checkCustomNameAvailability}
                  onUserModifiedFieldsChange={field => {
                    setUserModifiedFields(prev => {
                      const next = new Set(prev);
                      next.add(field);
                      return next;
                    });
                  }}
                />

                {/* Game Configuration Section Removed as per requirements */}

                <EditCabinetLocationConfig
                  formData={{
                    accountingDenomination: String(
                      formData.accountingDenomination || ''
                    ),
                    locationId: formData.locationId || '',
                    smbId: formData.relayId || formData.smbId || '',
                    status: formData.status || 'functional',
                    custom: formData.custom,
                  }}
                  locations={locations}
                  cabinetDataLoading={cabinetDataLoading}
                  locationsLoading={locationsLoading}
                  accountingDenominationError={accountingDenominationError}
                  locationError={locationError}
                  relayIdError={relayIdError}
                  hasValidSerialNumber={
                    !!formData.assetNumber && formData.assetNumber.length >= 3
                  }
                  onFormDataChange={updates => {
                    if ('smbId' in updates && relayIdError) {
                      setRelayIdError('');
                    }
                    if (updates.custom && customNameError) {
                      setCustomNameError('');
                    }

                    // Map smbId back to relayId and smibBoard for formData
                    // We also ensure smbId itself is updated so detectChanges works correctly
                    const formDataUpdates: Partial<ExtendedCabinetFormData> =
                      {};

                    if ('smbId' in updates) {
                      const smibValue = updates.smbId || '';
                      formDataUpdates.relayId = smibValue;
                      formDataUpdates.smibBoard = smibValue;
                      formDataUpdates.smbId = smibValue;
                    }

                    if (updates.status) {
                      console.log(
                        `[CabinetsEditCabinetModal] Status change detected in onFormDataChange:`,
                        updates.status
                      );
                      formDataUpdates.status = updates.status;
                      formDataUpdates.assetStatus = updates.status;
                    }

                    if (updates.locationId) {
                      formDataUpdates.locationId = updates.locationId;
                    }

                    if (updates.accountingDenomination) {
                      formDataUpdates.accountingDenomination =
                        updates.accountingDenomination;
                    }

                    if (updates.custom) {
                      formDataUpdates.custom = {
                        name: updates.custom.name || '',
                      };
                    }

                    const fieldKeys = Object.keys(formDataUpdates);
                    fieldKeys.forEach(field => {
                      setUserModifiedFields(prev => {
                        const next = new Set(prev);
                        next.add(field);
                        return next;
                      });
                    });

                    setFormData(prev => ({ ...prev, ...formDataUpdates }));
                  }}
                  onLocationErrorChange={setLocationError}
                  onSmibBlur={checkSmibAvailability}
                  onCustomNameBlur={checkCustomNameAvailability}
                />

                <EditCabinetCollectionSettings
                  formData={{
                    collectionSettings: formData.collectionSettings,
                    collectionMultiplier: formData.collectionMultiplier,
                  }}
                  cabinetDataLoading={cabinetDataLoading}
                  collectionTime={collectionTime}
                  collectionMultiplierError={collectionMultiplierError}
                  onFormDataChange={(updates) => {
                    setFormData(prev => ({ ...prev, ...updates }));
                  }}
                  onCollectionTimeChange={(date: Date) => {
                    setCollectionTime(date);
                    setFormData(prev => ({
                      ...prev,
                      collectionSettings: {
                        ...prev.collectionSettings,
                        lastCollectionTime: date.toISOString(),
                      },
                    }));
                  }}
                  onCollectionMultiplierErrorChange={
                    setCollectionMultiplierError
                  }
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-shrink-0 flex-row justify-center gap-3 pb-4 sm:gap-4">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-button px-8 text-container hover:bg-button/90 sm:flex-initial"
              >
                {loading ? 'Saving...' : 'SAVE'}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={loading}
                className="flex-1 px-8 sm:flex-initial"
              >
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
