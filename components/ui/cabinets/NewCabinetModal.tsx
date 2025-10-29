'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useNewCabinetStore } from '@/lib/store/newCabinetStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { NewCabinetFormData } from '@/shared/types/entities';
import { createCabinet } from '@/lib/helpers/cabinets';
import { fetchManufacturers } from '@/lib/helpers/manufacturers';
import { toast } from 'sonner';
import { PCDateTimePicker } from '@/components/ui/pc-date-time-picker';
import { useUserStore } from '@/lib/store/userStore';

type NewCabinetModalProps = {
  locations?: { _id: string; name: string }[];
  currentLocationName?: string;
  onCreated?: () => void;
};

export const NewCabinetModal = ({
  locations,
  currentLocationName,
  onCreated,
}: NewCabinetModalProps) => {
  const { isCabinetModalOpen, locationId, closeCabinetModal } =
    useNewCabinetStore();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const [relayIdError, setRelayIdError] = useState<string>('');
  const [serialNumberError, setSerialNumberError] = useState<string>('');
  const [collectionTime, setCollectionTime] = useState<Date>(new Date());
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(false);

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
    newData?: Record<string, unknown> | null
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
          changes: [], // Will be calculated by the API
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

  // Serial number validation function
  const validateSerialNumber = (value: string): string => {
    if (!value) return '';

    // Check length
    if (value.length < 3) {
      return 'Serial number must be at least 3 characters long';
    }

    return ''; // No error
  };

  const [formData, setFormData] = useState<NewCabinetFormData>({
    serialNumber: '',
    game: '',
    gameType: 'Slot',
    isCronosMachine: false,
    accountingDenomination: '',
    cabinetType: 'Standing',
    assetStatus: 'functional',
    gamingLocation: locationId || '',
    relayId: '',
    manufacturer: '',
    collectionSettings: {
      multiplier: '1',
      lastCollectionTime: collectionTime.toISOString().slice(0, 16),
      lastMetersIn: '0',
      lastMetersOut: '0',
    },
  });

  // Update gaming location when locationId changes
  useEffect(() => {
    if (locationId) {
      setFormData(prev => ({
        ...prev,
        gamingLocation: locationId,
      }));
    }
  }, [locationId]);

  useEffect(() => {
    if (isCabinetModalOpen) {
      // Reset collection time to current date/time when modal opens
      const currentDateTime = new Date();
      setCollectionTime(currentDateTime);
      setFormData(prev => ({
        ...prev,
        collectionSettings: {
          ...prev.collectionSettings,
          lastCollectionTime: currentDateTime.toISOString().slice(0, 16),
        },
      }));

      // Fetch manufacturers when modal opens
      const loadManufacturers = async () => {
        setManufacturersLoading(true);
        try {
          const fetchedManufacturers = await fetchManufacturers();
          setManufacturers(fetchedManufacturers);
        } catch (error) {
          console.error('Failed to fetch manufacturers:', error);
          toast.error('Failed to load manufacturers');
        } finally {
          setManufacturersLoading(false);
        }
      };

      loadManufacturers();

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
  }, [isCabinetModalOpen]);

  const handleClose = () => {
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
      onComplete: closeCabinetModal,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate SMIB Board before submission
      const smibError = validateSmibBoard(formData.relayId);
      if (smibError) {
        setRelayIdError(smibError);
        toast.error('Please fix the SMIB Board validation errors');
        setLoading(false);
        return;
      }

      // Validate serial number before submission
      const serialError = validateSerialNumber(formData.serialNumber);
      if (serialError) {
        setSerialNumberError(serialError);
        toast.error('Please fix the serial number validation errors');
        setLoading(false);
        return;
      }

      // Debug: Log the form data being sent
      // console.log("Form data being sent:", formData);

      const success = await createCabinet(formData);
      if (success) {
        // Log the cabinet creation activity
        await logActivity(
          'create',
          'machine',
          formData.serialNumber || 'Unknown',
          `${formData.game} - ${formData.serialNumber}`,
          `Created new cabinet: ${formData.game} (${formData.serialNumber}) at location ${formData.gamingLocation}`,
          null, // No previous data for creation
          formData // New data
        );

        toast.success('Cabinet created successfully!');
        handleClose();
        // Reset form after successful submission
        resetForm();
        onCreated?.(); // Call the onCreated callback
      }
    } catch (err) {
      console.error('Failed to create cabinet:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create cabinet';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serialNumber: '',
      game: '',
      gameType: 'Slot',
      isCronosMachine: false,
      accountingDenomination: '',
      cabinetType: 'Standing',
      assetStatus: 'functional',
      gamingLocation: locationId || '',
      relayId: '',
      manufacturer: '',
      collectionSettings: {
        multiplier: '1',
        lastCollectionTime: collectionTime.toISOString().slice(0, 16),
        lastMetersIn: '0',
        lastMetersOut: '0',
      },
    });

    setCollectionTime(new Date()); // Reset to current date/time
    setRelayIdError(''); // Clear any validation errors
    setSerialNumberError(''); // Clear any validation errors
  };

  // Define a consistent change handler to fix the typing issues
  const handleInputChange = (
    field: keyof Omit<NewCabinetFormData, 'collectionSettings'>,
    value: string
  ) => {
    // Special handling for SMIB Board with validation
    if (field === 'relayId') {
      // Convert to lowercase and remove any non-hex characters
      const cleanValue = value.toLowerCase().replace(/[^0-9a-f]/g, '');

      // Limit to 12 characters
      const limitedValue = cleanValue.slice(0, 12);

      // Validate the value
      const error = validateSmibBoard(limitedValue);
      setRelayIdError(error);

      setFormData((prev: NewCabinetFormData) => ({
        ...prev,
        [field]: limitedValue,
      }));
    } else if (field === 'serialNumber') {
      // Auto-capitalize serial number letters
      const upperCaseValue = value.toUpperCase();

      // Validate the serial number
      const error = validateSerialNumber(upperCaseValue);
      setSerialNumberError(error);

      setFormData((prev: NewCabinetFormData) => ({
        ...prev,
        [field]: upperCaseValue,
      }));
    } else {
      setFormData((prev: NewCabinetFormData) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev: NewCabinetFormData) => ({
      ...prev,
      isCronosMachine: checked,
    }));
  };

  const handleCollectionTimeChange = (date: Date | undefined) => {
    if (date) {
      setCollectionTime(date);
      setFormData((prev: NewCabinetFormData) => ({
        ...prev,
        collectionSettings: {
          ...prev.collectionSettings,
          lastCollectionTime: date.toISOString().slice(0, 16),
        },
      }));
    }
  };

  const handleCollectionSettingChange = (
    field: keyof NewCabinetFormData['collectionSettings'],
    value: string
  ) => {
    setFormData((prev: NewCabinetFormData) => ({
      ...prev,
      collectionSettings: {
        ...prev.collectionSettings,
        [field]: value,
      },
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    // console.log(`NewCabinet handleSelectChange: ${field} = ${value}`);
    setFormData((prev: NewCabinetFormData) => {
      const newData = {
        ...prev,
        [field]: value,
      };
      // console.log("NewCabinet new form data:", newData);
      return newData;
    });
  };

  if (!isCabinetModalOpen) return null;

  // Desktop View
  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 opacity-0"
        onClick={handleClose}
      />
      <div className="fixed inset-0 flex items-start md:items-center justify-center p-0 md:p-4">
        <div
          ref={modalRef}
          className="flex flex-col h-full w-full md:max-h-[90vh] md:max-w-2xl md:rounded-md bg-container shadow-lg md:shadow-lg"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-4 flex-shrink-0">
            <h2 className="text-xl font-semibold">New Cabinet</h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <Cross2Icon className="h-4 w-4" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="border-b border-border pb-2 text-sm font-medium text-buttonActive">
                  Basic Information
                </h3>

                {/* Serial Number & Installed Game */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-buttonActive">
                      Serial Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="serialNumber"
                      placeholder="Enter Serial Number"
                      value={formData.serialNumber}
                      onChange={e =>
                        handleInputChange('serialNumber', e.target.value)
                      }
                      className={`h-10 border-border bg-container ${
                        serialNumberError ? 'border-red-500' : ''
                      }`}
                    />
                    {serialNumberError ? (
                      <p className="mt-1 text-xs text-red-500">
                        {serialNumberError}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Enter the serial number for this cabinet
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-buttonActive">
                      Installed Game <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="game"
                      placeholder="Enter Game Name"
                      value={formData.game}
                      onChange={e => handleInputChange('game', e.target.value)}
                      className="h-10 border-border bg-container"
                    />
                  </div>
                </div>

                {/* Game Type & Cabinet Type */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-buttonActive">
                      Game Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.gameType}
                      onValueChange={value => {
                        // console.log("NewCabinet GameType changed to:", value);
                        handleSelectChange('gameType', value);
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
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-buttonActive">
                      Cabinet Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.cabinetType}
                      onValueChange={value =>
                        handleSelectChange('cabinetType', value)
                      }
                    >
                      <SelectTrigger className="border-border bg-container">
                        <SelectValue placeholder="Select Cabinet Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standing">Standing</SelectItem>
                        <SelectItem value="Slant Top">Slant Top</SelectItem>
                        <SelectItem value="Bar Top">Bar Top</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-buttonActive">
                    Manufacturer
                  </label>
                  {manufacturersLoading ? (
                    <div className="h-10 animate-pulse rounded-md bg-gray-100" />
                  ) : (
                    <Select
                      value={formData.manufacturer}
                      onValueChange={value => {
                        // Prevent setting the disabled "no-manufacturers" value
                        if (value !== 'no-manufacturers') {
                          handleSelectChange('manufacturer', value);
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

                {/* Cronos Machine Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isCronosMachine"
                    checked={formData.isCronosMachine}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <label
                    htmlFor="isCronosMachine"
                    className="text-sm font-medium text-buttonActive"
                  >
                    Cronos Machine
                  </label>
                </div>

                {/* Accounting Denomination (Conditional) */}
                {formData.isCronosMachine && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-buttonActive">
                      Accounting Denomination (Only Cronos){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="accountingDenomination"
                      placeholder="The denomination the machine uses when sending meter values"
                      value={formData.accountingDenomination}
                      onChange={e =>
                        handleInputChange(
                          'accountingDenomination',
                          e.target.value
                        )
                      }
                      className="h-10 border-border bg-container"
                    />
                  </div>
                )}
              </div>

              {/* Location & Configuration Section */}
              <div className="space-y-4">
                <h3 className="border-b border-border pb-2 text-sm font-medium text-buttonActive">
                  Location & Configuration
                </h3>

                {/* Location & SMIB Board */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    {locationId ? (
                      <div className="space-y-1">
                        <span className="block text-sm font-medium text-buttonActive">
                          Location
                        </span>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            {currentLocationName || 'Selected Location'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <label className="mb-2 block text-sm font-medium text-buttonActive">
                          Location
                        </label>
                        <Select
                          value={formData.gamingLocation}
                          onValueChange={value =>
                            handleSelectChange('gamingLocation', value)
                          }
                        >
                          <SelectTrigger className="h-10 border-border bg-container">
                            <SelectValue placeholder="Select Location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations && locations.length > 0 ? (
                              locations.map(location => (
                                <SelectItem
                                  key={location._id}
                                  value={location._id}
                                >
                                  {location.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-locations" disabled>
                                No locations available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-buttonActive">
                      SMIB Board <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="relayId"
                      placeholder="Enter Relay ID"
                      value={formData.relayId}
                      onChange={e =>
                        handleInputChange('relayId', e.target.value)
                      }
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
                    <p className="mt-1 text-xs text-gray-500">
                      Must be 12 characters, lowercase hex, ending with 0, 4, 8,
                      or c
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-buttonActive">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.assetStatus}
                    onValueChange={value =>
                      handleSelectChange('assetStatus', value)
                    }
                  >
                    <SelectTrigger className="border-border bg-container">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="functional">Functional</SelectItem>
                      <SelectItem value="non_functional">
                        Non Functional
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Collection Settings */}
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="mb-4 text-sm font-medium text-buttonActive">
                  Collection Settings
                </h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Collection Report Multiplier
                    </label>
                    <Input
                      id="multiplier"
                      placeholder="Enter multiplier (default: 1)"
                      value={formData.collectionSettings.multiplier}
                      onChange={e =>
                        handleCollectionSettingChange(
                          'multiplier',
                          e.target.value
                        )
                      }
                      className="h-10 border-border bg-container"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Last Collection Time
                    </label>
                    <PCDateTimePicker
                      date={collectionTime}
                      setDate={handleCollectionTimeChange}
                      disabled={loading}
                      placeholder="Select collection time"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Last Meters In
                    </label>
                    <Input
                      id="metersIn"
                      placeholder="Enter last meters in"
                      value={formData.collectionSettings.lastMetersIn}
                      onChange={e =>
                        handleCollectionSettingChange(
                          'lastMetersIn',
                          e.target.value
                        )
                      }
                      className="h-10 border-border bg-container"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Last Meters Out
                    </label>
                    <Input
                      id="metersOut"
                      placeholder="Enter last meters out"
                      value={formData.collectionSettings.lastMetersOut}
                      onChange={e =>
                        handleCollectionSettingChange(
                          'lastMetersOut',
                          e.target.value
                        )
                      }
                      className="h-10 border-border bg-container"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex justify-center space-x-3 flex-shrink-0 pb-4">
              <Button
                onClick={handleSubmit}
                className="bg-button px-8 text-container hover:bg-button/90"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Save'}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={loading}
                className="px-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
