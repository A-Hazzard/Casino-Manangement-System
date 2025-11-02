'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import type { GamingMachine } from '@/shared/types/entities';
type CabinetFormData = Partial<GamingMachine>;
import { fetchCabinetById, updateCabinet } from '@/lib/helpers/cabinets';
import { fetchManufacturers } from '@/lib/helpers/manufacturers';
import { toast } from 'sonner';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';

export const EditCabinetModal = ({
  onCabinetUpdated,
}: {
  onCabinetUpdated?: () => void;
}) => {
  const { isEditModalOpen, selectedCabinet, closeEditModal } =
    useCabinetActionsStore();
  const { activeMetricsFilter } = useDashBoardStore();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [cabinetDataLoading, setCabinetDataLoading] = useState(false);
  const [userModifiedFields, setUserModifiedFields] = useState<Set<string>>(
    new Set()
  );
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

  const [formData, setFormData] = useState<CabinetFormData>({
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
  });

  useEffect(() => {
    // Initial form data setup from selected cabinet
    if (selectedCabinet) {
      // console.log("Selected cabinet gameType:", selectedCabinet.gameType);
      const initialFormData = {
        _id: selectedCabinet._id,
        assetNumber: selectedCabinet.assetNumber || '',
        installedGame: selectedCabinet.installedGame || '',
        gameType: selectedCabinet.gameType || 'Slot',
        accountingDenomination: String(
          selectedCabinet.accountingDenomination || '1'
        ),
        collectionMultiplier: selectedCabinet.collectionMultiplier || '1',
        locationId: selectedCabinet.locationId || '',
        smbId: selectedCabinet.smbId || '',
        status: selectedCabinet.status || 'functional',
        isCronosMachine: selectedCabinet.isCronosMachine || false,
        manufacturer: selectedCabinet.manufacturer || '',
        custom: selectedCabinet.custom || { name: '' },
        createdAt: selectedCabinet.createdAt,
      };
      // console.log("Initial form data gameType:", initialFormData.gameType);
      setFormData(initialFormData);

      // Fetch locations and manufacturers data when modal opens
      fetchLocations();
      fetchManufacturersData();

      // Fetch additional cabinet details if needed
      if (selectedCabinet._id && activeMetricsFilter) {
        setCabinetDataLoading(true);
        fetchCabinetById(selectedCabinet._id, activeMetricsFilter)
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
                  gameType: userModifiedFields.has('gameType')
                    ? prevData.gameType
                    : cabinetDetails.gameType || prevData.gameType,
                  // Only update manufacturer if user hasn't modified it
                  manufacturer: userModifiedFields.has('manufacturer')
                    ? prevData.manufacturer
                    : cabinetDetails.manufacturer || prevData.manufacturer,
                  accountingDenomination: String(
                    cabinetDetails.accountingDenomination ||
                      prevData.accountingDenomination
                  ),
                  collectionMultiplier:
                    cabinetDetails.collectionMultiplier ||
                    prevData.collectionMultiplier,
                  status: cabinetDetails.status || prevData.status,
                  isCronosMachine:
                    cabinetDetails.isCronosMachine || prevData.isCronosMachine,
                  createdAt: cabinetDetails.createdAt || prevData.createdAt,
                };
                // console.log(
                //   "Updated form data with gameType:",
                //   newData.gameType,
                //   "User modified gameType:",
                //   userModifiedFields.has("gameType")
                // );
                return newData;
              });
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
    userModifiedFields,
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
      if (
        !formData.collectionMultiplier ||
        String(formData.collectionMultiplier).trim().length === 0
      ) {
        setCollectionMultiplierError('Collection multiplier is required');
        errors.push('collectionMultiplier');
      } else if (isNaN(Number(formData.collectionMultiplier))) {
        setCollectionMultiplierError('Collection multiplier must be a number');
        errors.push('collectionMultiplierNaN');
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

      // Detect actual changes between old and new cabinet data
      const changes = detectChanges(selectedCabinet, formData);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      // Only proceed if there are actual changes
      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        setLoading(false);
        return;
      }

      // Build update payload with only changed fields + required _id
      const updatePayload: Record<string, unknown> = { _id: formData._id };
      meaningfulChanges.forEach(change => {
        const key = change.field as keyof typeof formData;
        updatePayload[key] = formData[key];
      });

      // Pass only the changed fields to reduce unnecessary updates and logging
      const success = await updateCabinet(updatePayload, activeMetricsFilter);
      if (success) {
        // Log the cabinet update activity with proper change tracking
        const changesSummary = getChangesSummary(meaningfulChanges);
        await logActivity(
          'update',
          'machine',
          selectedCabinet._id,
          `${
            selectedCabinet.installedGame || selectedCabinet.game || 'Unknown'
          } - ${
            selectedCabinet.assetNumber ||
            getSerialNumberIdentifier(selectedCabinet) ||
            'Unknown'
          }`,
          `Updated cabinet: ${changesSummary}`,
          selectedCabinet, // Previous data
          formData, // New data
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

  // Desktop View Modal Content
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Desktop Modal */}
      <div className="fixed inset-0 flex items-start md:items-center justify-center p-0 md:p-4">
        <div
          ref={modalRef}
          className="flex flex-col h-full w-full md:max-h-[98vh] md:max-w-2xl md:rounded-md bg-container shadow-lg md:shadow-lg"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
        >
          <div className="flex items-center border-b border-border p-3 sm:p-4 flex-shrink-0">
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
            <div className="space-y-4">
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

                {/* Serial Number & Installed Game */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Serial Number
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <Input
                          id="assetNumber"
                          name="assetNumber"
                          value={formData.assetNumber}
                          onChange={handleChange}
                          placeholder="Enter serial number"
                          className={`border-border bg-container ${
                            serialNumberError ? 'border-red-500' : ''
                          }`}
                        />
                        {serialNumberError && (
                          <p className="mt-1 text-xs text-red-500">
                            {serialNumberError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Installed Game
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <Input
                          id="installedGame"
                          name="installedGame"
                          value={formData.installedGame}
                          onChange={handleChange}
                          placeholder="Enter installed game name"
                          className={`border-border bg-container ${
                            installedGameError ? 'border-red-500' : ''
                          }`}
                        />
                        {installedGameError && (
                          <p className="mt-1 text-xs text-red-500">
                            {installedGameError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Game Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    Game Type
                  </label>
                  {cabinetDataLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={formData.gameType}
                      onValueChange={value => {
                        // console.log("GameType changed to:", value);
                        setUserModifiedFields(
                          prev => new Set([...prev, 'gameType'])
                        );
                        setFormData(prev => {
                          const newData = { ...prev, gameType: value };
                          // console.log("New form data:", newData);
                          return newData;
                        });
                      }}
                    >
                      <SelectTrigger className="border-border bg-container">
                        <SelectValue placeholder="Select Game Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Slot">Slot</SelectItem>
                        <SelectItem value="Video Poker">Video Poker</SelectItem>
                        <SelectItem value="Table Game">Table Game</SelectItem>
                        <SelectItem value="Roulette">Roulette</SelectItem>
                        <SelectItem value="Blackjack">Blackjack</SelectItem>
                        <SelectItem value="Poker">Poker</SelectItem>
                        <SelectItem value="Baccarat">Baccarat</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    Manufacturer
                  </label>
                  {manufacturersLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={formData.manufacturer}
                      onValueChange={value => {
                        // Prevent setting the disabled "no-manufacturers" value
                        if (value !== 'no-manufacturers') {
                          setUserModifiedFields(
                            prev => new Set([...prev, 'manufacturer'])
                          );
                          setFormData(prev => ({
                            ...prev,
                            manufacturer: value,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 border-border bg-container">
                        <SelectValue placeholder="Select Manufacturer" />
                      </SelectTrigger>
                      <SelectContent>
                        {manufacturers.length > 0 ? (
                          manufacturers.map(manufacturer => (
                            <SelectItem key={manufacturer} value={manufacturer}>
                              {manufacturer}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-manufacturers" disabled>
                            No manufacturers found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Accounting Denomination & Collection Multiplier */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Accounting Denomination
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <Input
                          id="accountingDenomination"
                          name="accountingDenomination"
                          value={formData.accountingDenomination}
                          onChange={handleChange}
                          placeholder="Enter denomination"
                          className={`border-border bg-container ${
                            accountingDenominationError ? 'border-red-500' : ''
                          }`}
                        />
                        {accountingDenominationError && (
                          <p className="mt-1 text-xs text-red-500">
                            {accountingDenominationError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Collection Report Multiplier
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <Input
                          id="collectionMultiplier"
                          name="collectionMultiplier"
                          value={formData.collectionMultiplier}
                          onChange={handleChange}
                          placeholder="Enter multiplier value"
                          className={`border-border bg-container ${
                            collectionMultiplierError ? 'border-red-500' : ''
                          }`}
                        />
                        {collectionMultiplierError && (
                          <p className="mt-1 text-xs text-red-500">
                            {collectionMultiplierError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Location & SMIB Board */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Location
                    </label>
                    {locationsLoading || cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        value={formData.locationId || undefined}
                        onValueChange={locationId => {
                          setLocationError('');
                          setFormData(prev => ({
                            ...prev,
                            locationId: locationId,
                          }));
                        }}
                      >
                        <SelectTrigger
                          className={`w-full border-border bg-container ${
                            locationError ? 'border-red-500' : ''
                          }`}
                        >
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations
                            .filter(
                              location =>
                                location.id && location.id.trim() !== ''
                            )
                            .map(location => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      SMIB Board
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <Input
                          id="smbId"
                          name="smbId"
                          value={formData.smbId}
                          onChange={handleChange}
                          placeholder="Enter SMIB Board"
                          className={`border-border bg-container ${
                            relayIdError ? 'border-red-500' : ''
                          }`}
                          maxLength={12}
                        />
                        {relayIdError && (
                          <p className="mt-1 text-xs text-red-500">
                            {relayIdError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Status Field */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    Status
                  </label>
                  {cabinetDataLoading ? (
                    <div className="flex space-x-4">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ) : (
                    <div className="flex space-x-4">
                      {[
                        { value: 'functional', label: 'Functional' },
                        { value: 'non_functional', label: 'Non Functional' },
                      ].map(({ value, label }) => (
                        <label key={value} className="inline-flex items-center">
                          <input
                            type="radio"
                            name="status"
                            checked={formData.status === value}
                            onChange={() =>
                              setFormData(prev => ({
                                ...prev,
                                status: value,
                              }))
                            }
                            className="h-4 w-4 border-border text-button focus:ring-button"
                          />
                          <span className="ml-2">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Name Field - Only show if no valid serial number */}
                {!hasValidSerialNumber(selectedCabinet) && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Custom Name <span className="text-red-500">*</span>
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Input
                        id="customName"
                        name="customName"
                        value={formData.custom?.name || ''}
                        onChange={e => {
                          setFormData(prev => ({
                            ...prev,
                            custom: {
                              ...prev.custom,
                              name: e.target.value,
                            },
                          }));
                        }}
                        placeholder="Enter custom name for this machine"
                        className="border-border bg-container"
                      />
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Since this machine doesn&apos;t have a valid serial
                      number, you can set a custom name to identify it.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-row justify-center gap-3 sm:gap-4 flex-shrink-0 pb-4">
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
};
