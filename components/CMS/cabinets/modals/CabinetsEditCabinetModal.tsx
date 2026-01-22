/**
 * Cabinets Edit Cabinet Modal Component
 *
 * Modal for editing existing cabinet details.
 *
 * @module components/cabinets/CabinetsEditCabinetModal
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import EditCabinetBasicInfo from '../EditCabinetModal/EditCabinetBasicInfo';
import EditCabinetCollectionSettings from '../EditCabinetModal/EditCabinetCollectionSettings';
import EditCabinetLocationConfig from '../EditCabinetModal/EditCabinetLocationConfig';
import { fetchCabinetById, updateCabinet } from '@/lib/helpers/cabinets';
import { fetchManufacturers } from '@/lib/helpers/machines';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import {
  normalizeGameTypeValue,
  normalizeStatusValue,
} from '@/lib/utils/cabinet';
import {
    detectChanges,
    filterMeaningfulChanges,
    getChangesSummary,
} from '@/lib/utils/changeDetection';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import type { GamingMachine } from '@/shared/types/entities';
import { Cross2Icon } from '@radix-ui/react-icons';
import axios from 'axios';
import { gsap } from 'gsap';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type CabinetFormData = Partial<GamingMachine>;

export default function CabinetsEditCabinetModal({
  onCabinetUpdated,
}: {
  onCabinetUpdated?: () => void;
}) {
  const { isEditModalOpen, selectedCabinet, closeEditModal } =
    useCabinetsActionsStore();
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();
  const { user } = useUserStore();
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
  const [relayIdError, setRelayIdError] = useState<string>('');
  const [serialNumberError, setSerialNumberError] = useState<string>('');
  const [installedGameError, setInstalledGameError] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');
  const [accountingDenominationError, setAccountingDenominationError] =
    useState<string>('');
  const [collectionMultiplierError, setCollectionMultiplierError] =
    useState<string>('');

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!user) return 'Unknown User';

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }

    // Fallback
    return 'Unknown User';
  };

  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null,
    changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>
  ) => {
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          resourceName,
          details,
          userId: user?._id || 'unknown',
          username: getUserDisplayName(),
          userRole: 'user',
          previousData: previousData || null,
          newData: newData || null,
          changes: changes || [], // Use provided changes or empty array
        }),
      });

      if (!response.ok) {
        console.error('Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // SMIB Board validation function
  const validateSmibBoard = (value: string): string => {
    if (!value) return '';

    // Check length
    if (value.length !== 12) {
      return 'SMIB Board must be exactly 12 characters long';
    }

    // Check if it's hexadecimal and lowercase
    const hexPattern = /^[0-9a-f]+$/;
    if (!hexPattern.test(value)) {
      return 'SMIB Board must contain only lowercase hexadecimal characters (0-9, a-f)';
    }

    // Check if it ends with 0, 4, 8, or c
    const lastChar = value.charAt(11);
    if (!['0', '4', '8', 'c'].includes(lastChar)) {
      return 'SMIB Board must end with 0, 4, 8, or c';
    }

    return ''; // No error
  };

  // Serial Number validation function
  const validateSerialNumber = (value: string): string => {
    if (!value) return '';

    if (value.trim().length < 3) {
      return 'Serial number must be at least 3 characters long';
    }

    return ''; // No error
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

  // Helper function to check if serial number is valid (not empty or just whitespace)
  const hasValidSerialNumber = (cabinet: GamingMachine | null): boolean => {
    if (!cabinet) return false;

    return Boolean(cabinet.serialNumber && cabinet.serialNumber.trim() !== '');
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
        (loc: Record<string, unknown>) => ({
          id: loc._id as string,
          name: loc.name as string,
          sasEnabled:
            ((loc as Record<string, unknown>).sasEnabled as boolean) || false,
        })
      );
      setLocations(mappedLocations);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
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
    } catch (error) {
      console.error('Failed to fetch manufacturers:', error);
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
    collectionSettings?: CollectionSettingsForm;
  };

  const [formData, setFormData] = useState<ExtendedCabinetFormData>({
    _id: '',
    assetNumber: '',
    installedGame: '',
    gameType: 'Slot',
    accountingDenomination: '1',
    collectionMultiplier: '1',
    locationId: '',
    smbId: '',
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
  });

  useEffect(() => {
    userModifiedFieldsRef.current = userModifiedFields;
  }, [userModifiedFields]);

  useEffect(() => {
    // Initial form data setup from selected cabinet
    if (selectedCabinet) {
      // console.log("Selected cabinet gameType:", selectedCabinet.gameType);
      const initialCollectionTime = selectedCabinet.collectionTime
        ? new Date(selectedCabinet.collectionTime)
        : new Date();
      setCollectionTime(initialCollectionTime);

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
        collectionSettings: {
          multiplier: selectedCabinet.collectionMultiplier || '1',
          lastCollectionTime: initialCollectionTime.toISOString(),
          lastMetersIn: selectedCabinet.collectionMeters
            ? String(selectedCabinet.collectionMeters.metersIn ?? '')
            : '',
          lastMetersOut: selectedCabinet.collectionMeters
            ? String(selectedCabinet.collectionMeters.metersOut ?? '')
            : '',
        },
      };
      // console.log("Initial form data gameType:", initialFormData.gameType);
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
                      cabinetDetails.collectionMeters &&
                      cabinetDetails.collectionMeters.metersIn !== undefined
                        ? String(cabinetDetails.collectionMeters.metersIn)
                        : prevData.collectionSettings?.lastMetersIn || '',
                    lastMetersOut:
                      cabinetDetails.collectionMeters &&
                      cabinetDetails.collectionMeters.metersOut !== undefined
                        ? String(cabinetDetails.collectionMeters.metersOut)
                        : prevData.collectionSettings?.lastMetersOut || '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Auto-capitalize serial number letters
    if (name === 'assetNumber') {
      const upperCaseValue = value.toUpperCase();

      // Validate the serial number
      const error = validateSerialNumber(upperCaseValue);
      setSerialNumberError(error);

      setFormData(prev => ({ ...prev, [name]: upperCaseValue }));
    } else if (name === 'smbId') {
      // Special handling for SMIB Board with validation
      // Convert to lowercase and remove any non-hex characters
      const cleanValue = value.toLowerCase().replace(/[^0-9a-f]/g, '');

      // Limit to 12 characters
      const limitedValue = cleanValue.slice(0, 12);

      // Validate the value
      const error = validateSmibBoard(limitedValue);
      setRelayIdError(error);

      setFormData(prev => ({ ...prev, [name]: limitedValue }));
    } else {
      if (name === 'installedGame') setInstalledGameError('');
      if (name === 'accountingDenomination') setAccountingDenominationError('');
      if (name === 'collectionMultiplier') setCollectionMultiplierError('');
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
          lastMetersIn: selectedCabinet.collectionMeters
            ? String(selectedCabinet.collectionMeters.metersIn ?? '')
            : '',
          lastMetersOut: selectedCabinet.collectionMeters
            ? String(selectedCabinet.collectionMeters.metersOut ?? '')
            : '',
        },
      };

      const formDataComparison = {
        assetNumber: formData.assetNumber,
        installedGame: formData.installedGame,
        gameType: formData.gameType,
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
          updatePayload[fieldPath] =
            formData[fieldPath as keyof typeof formData];
        }
      });

      if (pendingCollectionSettings) {
        const { lastCollectionTime, lastMetersIn, lastMetersOut } =
          pendingCollectionSettings;

        if (lastCollectionTime) {
          updatePayload.collectionTime = lastCollectionTime;
        }

        const metersInVal = lastMetersIn;
        const metersOutVal = lastMetersOut;
        const collectionMetersPayload: Record<string, number> = {};

        if (metersInVal !== undefined && metersInVal !== '') {
          collectionMetersPayload.metersIn = Number(metersInVal) || 0;
        }
        if (metersOutVal !== undefined && metersOutVal !== '') {
          collectionMetersPayload.metersOut = Number(metersOutVal) || 0;
        }

        if (Object.keys(collectionMetersPayload).length > 0) {
          updatePayload.collectionMeters = collectionMetersPayload;
        }
      }

      // Pass only the changed fields to reduce unnecessary updates and logging
      // Convert customDateRange to DateRange format expected by updateCabinet
      const dateRangeForUpdate =
        customDateRange?.startDate && customDateRange?.endDate
        ? { from: customDateRange.startDate, to: customDateRange.endDate }
        : undefined;
      const success = await updateCabinet(
        updatePayload,
        activeMetricsFilter,
        dateRangeForUpdate
      );
      if (success) {
        // Log the cabinet update activity with proper change tracking
        const changesSummary = getChangesSummary(meaningfulChanges);
        await logActivity(
          'update',
          'machine',
          selectedCabinet._id,
          `${
            selectedCabinet.installedGame ||
              selectedCabinet.game ||
              '(game name not provided)'
          } - ${
            selectedCabinet.assetNumber ||
            getSerialNumberIdentifier(selectedCabinet) ||
            'Unknown'
          }`,
          `Updated cabinet: ${changesSummary}`,
          originalData, // Previous data (only editable fields)
          updatePayload, // New data (only changed fields)
          meaningfulChanges.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          }))
        );

        // Call the callback to refresh data
        onCabinetUpdated?.();

        // Clear user modified fields after successful update
        setUserModifiedFields(new Set());

        // Show success feedback
        toast.success(`Cabinet updated successfully: ${changesSummary}`);

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
          className="flex max-h-[95vh] w-full flex-col bg-container shadow-lg md:max-w-2xl md:rounded-md md:shadow-lg"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
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
                      <p className="mt-1 text-sm text-gray-600">
                        {formData.createdAt
                          ? formatCreationDate(formData.createdAt)
                          : 'Unknown'}
                      </p>
                    </div>
                    <div className="flex-1 text-left sm:text-right">
                      <h3 className="text-sm font-medium text-gray-700">
                        Machine ID
                      </h3>
                      <p className="mt-1 break-all font-mono text-sm text-gray-600">
                        {formData._id || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                <EditCabinetBasicInfo
                  formData={{
                    assetNumber: formData.assetNumber || '',
                    installedGame: formData.installedGame || '',
                    gameType: formData.gameType || '',
                    manufacturer: formData.manufacturer || '',
                    cabinetType: formData.cabinetType || 'Standing',
                    isCronosMachine: formData.isCronosMachine || false,
                    accountingDenomination: String(
                      formData.accountingDenomination || ''
                    ),
                  }}
                  cabinetDataLoading={cabinetDataLoading}
                  manufacturersLoading={manufacturersLoading}
                  manufacturers={manufacturers}
                  serialNumberError={serialNumberError}
                  installedGameError={installedGameError}
                  onFormDataChange={(updates: Record<string, unknown>) => {
                    if ('assetNumber' in updates) {
                      handleChange({
                        target: {
                          name: 'assetNumber',
                          value: updates.assetNumber,
                        },
                      } as React.ChangeEvent<HTMLInputElement>);
                    } else if ('installedGame' in updates) {
                      handleChange({
                        target: {
                          name: 'installedGame',
                          value: updates.installedGame,
                        },
                      } as React.ChangeEvent<HTMLInputElement>);
                    } else if ('accountingDenomination' in updates) {
                      handleChange({
                        target: {
                          name: 'accountingDenomination',
                          value: updates.accountingDenomination,
                        },
                      } as React.ChangeEvent<HTMLInputElement>);
                    } else {
                      setFormData(prev => ({ ...prev, ...updates }));
                    }
                  }}
                  onUserModifiedFieldsChange={(field: string) =>
                    setUserModifiedFields(prev => new Set([...prev, field]))
                  }
                />

                <EditCabinetLocationConfig
                  formData={{
                    accountingDenomination: String(
                      formData.accountingDenomination || ''
                    ),
                    locationId: formData.locationId || '',
                    smbId: formData.smbId || '',
                    status: formData.status || 'functional',
                    custom: formData.custom,
                  }}
                  locations={locations}
                  cabinetDataLoading={cabinetDataLoading}
                  locationsLoading={locationsLoading}
                  accountingDenominationError={accountingDenominationError}
                  locationError={locationError}
                  relayIdError={relayIdError}
                  hasValidSerialNumber={hasValidSerialNumber(selectedCabinet)}
                  onFormDataChange={(updates: Record<string, unknown>) => {
                    if ('accountingDenomination' in updates) {
                      handleChange({
                        target: {
                          name: 'accountingDenomination',
                          value: updates.accountingDenomination,
                        },
                      } as React.ChangeEvent<HTMLInputElement>);
                    } else if ('smbId' in updates) {
                      handleChange({
                        target: { name: 'smbId', value: updates.smbId },
                      } as React.ChangeEvent<HTMLInputElement>);
                    } else {
                      setFormData(prev => {
                        const updated: ExtendedCabinetFormData = { ...prev };
                        // Handle custom field updates
                        if ('custom' in updates) {
                          const customValue = updates.custom;
                          if (customValue && typeof customValue === 'object' && 'name' in customValue) {
                            updated.custom = {
                              name: (customValue.name as string) || prev.custom?.name || '',
                            };
                          } else {
                            updated.custom = undefined;
                          }
                        }
                        // Handle other field updates
                        if ('locationId' in updates) {
                          updated.locationId = updates.locationId as string | undefined;
                        }
                        if ('status' in updates) {
                          updated.status = updates.status as string | undefined;
                        }
                        return updated;
                      });
                    }
                  }}
                  onLocationErrorChange={setLocationError}
                />

                <EditCabinetCollectionSettings
                  formData={{
                    collectionSettings: formData.collectionSettings,
                    collectionMultiplier: formData.collectionMultiplier,
                  }}
                  collectionTime={collectionTime}
                  collectionMultiplierError={collectionMultiplierError}
                  onFormDataChange={(updates: Record<string, unknown>) => {
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

