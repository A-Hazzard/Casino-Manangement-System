/**
 * Locations Edit Location Modal Component
 *
 * Modal for editing existing location details.
 *
 * @module components/locations/LocationsEditLocationModal
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { useLocationsActionsStore } from '@/lib/store/locationActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import axios from 'axios';
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { EditLocationModalProps } from '@/lib/types/components';
// Activity logging will be handled via API calls
import { fetchLicensees } from '@/lib/helpers/client';
import type { Licensee } from '@/lib/types/common';

import { fetchCountries } from '@/lib/helpers/countries';
import type { Country } from '@/lib/types/common';
import {
    detectChanges,
    filterMeaningfulChanges,
    getChangesSummary,
} from '@/lib/utils/changeDetection';

import { SelectedLocation } from '@/lib/types/location';
import LocationsLocationPickerMap from '../LocationsLocationPickerMap';

type LocationDetails = {
  _id: string;
  name: string;
  address?: {
    street: string;
    city: string;
  };
  country?: string;
  profitShare?: number;
  gameDayOffset?: number;
  rel?: {
    licencee: string;
  };
  isLocalServer?: boolean;
  geoCoords?: {
    latitude: number;
    longitude: number;
  };
  billValidatorOptions?: {
    denom1: boolean;
    denom2: boolean;
    denom5: boolean;
    denom10: boolean;
    denom20: boolean;
    denom50: boolean;
    denom100: boolean;
    denom200: boolean;
    denom500: boolean;
    denom1000: boolean;
    denom2000: boolean;
    denom5000: boolean;
    denom10000: boolean;
  };
  membershipEnabled?: boolean;
  locationMembershipSettings?: {
    locationLimit?: number;
    freePlayAmount?: number;
    enablePoints?: boolean;
    enableFreePlays?: boolean;
    pointsRatioMethod?: string;
    pointMethodValue?: number;
    gamesPlayedRatio?: number;
    pointsMethodGameTypes?: string[];
    freePlayGameTypes?: string[];
    freePlayCreditsTimeout?: number;
  };
  createdAt?: Date | string;
};

export default function LocationsEditLocationModal({
  onLocationUpdated,
}: EditLocationModalProps) {
  const { isEditModalOpen, selectedLocation, closeEditModal } =
    useLocationsActionsStore();
  const { user } = useUserStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [locationDetails, setLocationDetails] =
    useState<LocationDetails | null>(null);
  const [locationDetailsLoading, setLocationDetailsLoading] = useState(false);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [licenseesLoading, setLicenseesLoading] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  const [useMap, setUseMap] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  const isDeveloper = Array.isArray(user?.roles)
    ? user?.roles.includes('developer')
    : false;
  useEffect(() => {
    if (!isDeveloper && useMap) {
      setUseMap(false);
    }
  }, [isDeveloper, useMap]);

  // Store original form data exactly as loaded from API for accurate comparison
  const [originalFormData, setOriginalFormData] = useState<
    any | null
  >(null);
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

  const [formData, setFormData] = useState({
    name: '',
    street: '',
    city: '',
    country: '',
    profitShare: '',
    licencee: '',
    isLocalServer: false,
    latitude: '',
    longitude: '',
    dayStartTime: '08:00', // Default to 8:00 AM
    billValidatorOptions: {
      denom1: false,
      denom2: false,
      denom5: false,
      denom10: false,
      denom20: false,
      denom50: false,
      denom100: false,
      denom200: false,
      denom500: false,
      denom1000: false,
      denom2000: false,
      denom5000: false,
      denom10000: false,
    },
    // Membership settings
    membershipEnabled: false,
    locationMembershipSettings: {
      locationLimit: 0,
      freePlayAmount: 0,
      enablePoints: false,
      enableFreePlays: false,
      pointsRatioMethod: '',
      pointMethodValue: 0,
      gamesPlayedRatio: 0,
      pointsMethodGameTypes: [] as string[],
      freePlayGameTypes: [] as string[],
      freePlayCreditsTimeout: 0,
    },
  });

  // Generate time options for day start time dropdown (hourly intervals only)
  const generateTimeOptions = () => {
    const options = [];

    // Add previous day options (18:00 to 23:00) - hourly only
    for (let hour = 18; hour <= 23; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      options.push({
        value: `prev-${timeStr}`, // Unique key for previous day
        label: `Prev. day, ${timeStr}`,
        hour: hour,
        minute: 0,
        displayValue: timeStr, // Store the actual time value separately
      });
    }

    // Add midnight
    options.push({
      value: 'midnight-00:00', // Unique key for midnight
      label: 'Midnight, 00:00',
      hour: 0,
      minute: 0,
      displayValue: '00:00', // Store the actual time value separately
    });

    // Add current day options (01:00 to 23:00) - hourly only
    for (let hour = 1; hour <= 23; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      options.push({
        value: `curr-${timeStr}`, // Unique key for current day
        label: `Curr. day, ${timeStr}`,
        hour: hour,
        minute: 0,
        displayValue: timeStr, // Store the actual time value separately
      });
    }

    return options;
  };

  const timeOptions = generateTimeOptions();

  // Fetch full location details when modal opens
  const fetchLocationDetails = async (locationId: string) => {
    setLocationDetailsLoading(true);
    try {
      const response = await axios.get(`/api/locations/${locationId}`);
      if (response.data.success) {
        setLocationDetails(response.data.location);
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      toast.error('Failed to load location details');
    } finally {
      setLocationDetailsLoading(false);
    }
  };

  // Load licensees
  const loadLicensees = async () => {
    setLicenseesLoading(true);
    try {
      const result = await fetchLicensees();
      const licenseesData = Array.isArray(result.licensees)
        ? result.licensees
        : [];
      setLicensees(licenseesData);
    } catch (error) {
      console.error('Failed to fetch licensees:', error);
      toast.error('Failed to load licensees');
    } finally {
      setLicenseesLoading(false);
    }
  };

  // Load countries
  const loadCountries = async () => {
    setCountriesLoading(true);
    try {
      const countriesData = await fetchCountries();

      // Remove duplicates based on country name using Map for better performance
      const uniqueCountriesMap = new Map();
      countriesData.forEach(country => {
        if (!uniqueCountriesMap.has(country.name)) {
          uniqueCountriesMap.set(country.name, country);
        }
      });
      const uniqueCountries = Array.from(uniqueCountriesMap.values());

      setCountries(uniqueCountries as unknown as Country[]);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      toast.error('Failed to load countries');
    } finally {
      setCountriesLoading(false);
    }
  };

  // Initialize form data when a location is selected
  useEffect(() => {
    if (selectedLocation && selectedLocation.location) {
      // Fetch full location details to get billValidatorOptions and other fields
      fetchLocationDetails(selectedLocation.location);

      setFormData({
        name: selectedLocation.locationName || '',
        street: '', // Will be loaded from locationDetails
        city: '', // Will be loaded from locationDetails
        country: '', // Will be loaded from locationDetails
        profitShare: '', // Will be loaded from locationDetails
        licencee: '', // Will be loaded from locationDetails
        isLocalServer: selectedLocation.isLocalServer || false,
        latitude: '', // Will be loaded from locationDetails
        longitude: '', // Will be loaded from locationDetails
        dayStartTime: '08:00', // Will be loaded from locationDetails (default 8 AM)
        billValidatorOptions: {
          denom1: false,
          denom2: false,
          denom5: false,
          denom10: false,
          denom20: false,
          denom50: false,
          denom100: false,
          denom200: false,
          denom500: false,
          denom1000: false,
          denom2000: false,
          denom5000: false,
          denom10000: false,
        },
        // Membership settings
        membershipEnabled: false,
        locationMembershipSettings: {
          locationLimit: 0,
          freePlayAmount: 0,
          enablePoints: false,
          enableFreePlays: false,
          pointsRatioMethod: '',
          pointMethodValue: 0,
          gamesPlayedRatio: 0,
          pointsMethodGameTypes: [] as string[],
          freePlayGameTypes: [] as string[],
          freePlayCreditsTimeout: 0,
        },
      });
    }
  }, [selectedLocation]);

  // Load licensees and countries when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      loadLicensees();
      loadCountries();
    }
  }, [isEditModalOpen]);

  // Detect user location

  // Handle location selection from map
  const handleLocationSelect = (location: SelectedLocation) => {
    // Map returns country NAME, but we need country ID
    // Find the matching country ID from the countries list
    let countryId = '';
    if (location.country) {
      const matchingCountry = countries.find(
        c => c.name.toLowerCase() === location.country?.toLowerCase()
      );
      if (matchingCountry) {
        countryId = matchingCountry._id;
        console.warn(
          `🗺️ MAP: Mapped country "${location.country}" to ID:`,
          countryId
        );
      } else {
        console.warn(
          `🗺️ MAP: Could not find country ID for "${location.country}"`
        );
      }
    }

    setFormData(prev => ({
      ...prev,
      latitude: location.lat.toFixed(6),
      longitude: location.lng.toFixed(6),
      ...(location.city && { city: location.city }),
      ...(countryId && { country: countryId }), // Use country ID, not name
    }));
  };

  const handleMapLoadError = () => {
    setMapLoadError(true);
  };

  const handleMapLoadSuccess = () => {
    setMapLoadError(false);
  };

  // Note: getCurrentLocation is NOT used in edit mode
  // Coordinates should only come from the database or manual entry
  // For new locations, use the NewLocationModal which has geolocation support

  // Update form data when location details are fetched
  useEffect(() => {
    if (locationDetails) {
      console.warn('🔍 LOCATION DETAILS LOADED:', {
        name: locationDetails.name,
        country: locationDetails.country,
        countryType: typeof locationDetails.country,
        billValidatorOptions: locationDetails.billValidatorOptions,
        hasBillValidatorOptions: !!locationDetails.billValidatorOptions,
      });

      // Convert gameDayOffset to time format (e.g., 11 -> "11:00")
      const gameDayOffset = locationDetails.gameDayOffset || 8; // Default to 8 AM
      const dayStartTime = `${gameDayOffset.toString().padStart(2, '0')}:00`;

      // Extract country ID - handle both string and ObjectId formats
      let countryId = '';
      if (locationDetails.country) {
        if (typeof locationDetails.country === 'string') {
          countryId = locationDetails.country;
        } else if (
          typeof locationDetails.country === 'object' &&
          '_id' in locationDetails.country
        ) {
          countryId = (locationDetails.country as { _id: string })._id;
        }
      }

      console.warn('🔍 COUNTRY ID EXTRACTED:', countryId);

      // Validate country ID - check if it exists in the countries list
      if (countryId && countries.length > 0) {
        const countryExists = countries.some(c => c._id === countryId);
        if (!countryExists) {
          console.error('⚠️ INVALID COUNTRY ID:', countryId);
          toast.warning(
            'This location has an invalid country ID. Please select a valid country if you need to update this location.',
            { duration: 5000 }
          );
          // Set country to empty string to avoid sending invalid ID
          countryId = '';
        }
      }

      const loadedFormData = {
        name: locationDetails.name || '',
        street: locationDetails.address?.street || '',
        city: locationDetails.address?.city || '',
        country: countryId || '',
        profitShare: locationDetails.profitShare?.toString() || '',
        licencee: locationDetails.rel?.licencee || '',
        isLocalServer: locationDetails.isLocalServer || false,
        latitude: locationDetails.geoCoords?.latitude?.toString() || '',
        longitude: locationDetails.geoCoords?.longitude?.toString() || '',
        dayStartTime: dayStartTime,
        billValidatorOptions: {
          denom1: locationDetails.billValidatorOptions?.denom1 || false,
          denom2: locationDetails.billValidatorOptions?.denom2 || false,
          denom5: locationDetails.billValidatorOptions?.denom5 || false,
          denom10: locationDetails.billValidatorOptions?.denom10 || false,
          denom20: locationDetails.billValidatorOptions?.denom20 || false,
          denom50: locationDetails.billValidatorOptions?.denom50 || false,
          denom100: locationDetails.billValidatorOptions?.denom100 || false,
          denom200: locationDetails.billValidatorOptions?.denom200 || false,
          denom500: locationDetails.billValidatorOptions?.denom500 || false,
          denom1000: locationDetails.billValidatorOptions?.denom1000 || false,
          denom2000: locationDetails.billValidatorOptions?.denom2000 || false,
          denom5000: locationDetails.billValidatorOptions?.denom5000 || false,
          denom10000: locationDetails.billValidatorOptions?.denom10000 || false,
        },
        // Membership settings
        membershipEnabled: locationDetails.membershipEnabled || false,
        locationMembershipSettings: {
          locationLimit: locationDetails.locationMembershipSettings?.locationLimit || 0,
          freePlayAmount: locationDetails.locationMembershipSettings?.freePlayAmount || 0,
          enablePoints: locationDetails.locationMembershipSettings?.enablePoints || false,
          enableFreePlays: locationDetails.locationMembershipSettings?.enableFreePlays || false,
          pointsRatioMethod: locationDetails.locationMembershipSettings?.pointsRatioMethod || '',
          pointMethodValue: locationDetails.locationMembershipSettings?.pointMethodValue || 0,
          gamesPlayedRatio: locationDetails.locationMembershipSettings?.gamesPlayedRatio || 0,
          pointsMethodGameTypes: locationDetails.locationMembershipSettings?.pointsMethodGameTypes || [],
          freePlayGameTypes: locationDetails.locationMembershipSettings?.freePlayGameTypes || [],
          freePlayCreditsTimeout: locationDetails.locationMembershipSettings?.freePlayCreditsTimeout || 0,
        },
      };

      // Store original form data for comparison on submit
      setOriginalFormData(loadedFormData);
      setFormData(loadedFormData);
    }
  }, [locationDetails, countries]);

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
    // Modal closed
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special handling for profit share to only allow numbers
    if (name === 'profitShare') {
      // Only allow digits and empty string
      const numericValue = value.replace(/[^0-9]/g, '');
      // Ensure value is between 0 and 100
      const numValue = parseInt(numericValue) || 0;
      const clampedValue = Math.min(Math.max(numValue, 0), 100);
      setFormData(prev => ({ ...prev, [name]: clampedValue.toString() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleBillValidatorChange = (denom: string, checked: boolean) => {
    setFormData(prev => {
      const newBillValidatorOptions = { ...prev.billValidatorOptions };
      newBillValidatorOptions[denom as keyof typeof newBillValidatorOptions] =
        checked;
      return {
        ...prev,
        billValidatorOptions: newBillValidatorOptions,
      };
    });
  };

  const handleMembershipSettingsChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      locationMembershipSettings: {
        ...prev.locationMembershipSettings,
        [name]: value,
      },
    }));
  };

  const handleGameTypeToggle = (setting: 'pointsMethodGameTypes' | 'freePlayGameTypes', gameType: string) => {
    setFormData(prev => {
      const current = prev.locationMembershipSettings[setting as keyof typeof prev.locationMembershipSettings] as string[] || [];
      const updated = current.includes(gameType)
        ? current.filter(t => t !== gameType)
        : [...current, gameType];
      
      return {
        ...prev,
        locationMembershipSettings: {
          ...prev.locationMembershipSettings,
          [setting]: updated,
        },
      };
    });
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.error('No location selected');
      }
      return;
    }

    if (!formData.name) {
      toast.error('Location name is required');
      return;
    }

    try {
      setLoading(true);

      // Use the location field from AggregatedLocation as identifier
      const locationIdentifier = selectedLocation.location;

      if (!locationIdentifier) {
        toast.error('Location identifier not found');
        return;
      }

      // Convert dayStartTime (HH:MM) back to gameDayOffset (number of hours)
      const gameDayOffset = parseInt(formData.dayStartTime.split(':')[0]);

      // Parse and validate coordinates
      const latitude = formData.latitude
        ? parseFloat(formData.latitude)
        : undefined;
      const longitude = formData.longitude
        ? parseFloat(formData.longitude)
        : undefined;

      if (!originalFormData) {
        toast.error('Location details not loaded');
        setLoading(false);
        return;
      }

      // Build comparison object from ORIGINAL form data (as loaded from API)
      const originalData = {
        name: originalFormData.name,
        address: {
          street: originalFormData.street,
          city: originalFormData.city,
        },
        country: originalFormData.country,
        profitShare: parseInt(originalFormData.profitShare) || 0,
        gameDayOffset:
          parseInt(originalFormData.dayStartTime.split(':')[0]) || 8,
        rel: {
          licencee: originalFormData.licencee,
        },
        isLocalServer: originalFormData.isLocalServer,
        geoCoords:
          originalFormData.latitude && originalFormData.longitude
            ? {
                latitude: parseFloat(originalFormData.latitude),
                longitude: parseFloat(originalFormData.longitude),
              }
            : undefined,
        billValidatorOptions: originalFormData.billValidatorOptions,
        membershipEnabled: originalFormData.membershipEnabled,
        locationMembershipSettings: originalFormData.locationMembershipSettings,
      };

      const formDataComparison = {
        name: formData.name,
        address: {
          street: formData.street,
          city: formData.city,
        },
        country: formData.country,
        profitShare: parseInt(formData.profitShare) || 0,
        gameDayOffset: gameDayOffset,
        rel: {
          licencee: formData.licencee,
        },
        isLocalServer: formData.isLocalServer,
        geoCoords:
          latitude !== undefined &&
          longitude !== undefined &&
          !Number.isNaN(latitude) &&
          !Number.isNaN(longitude) &&
          latitude !== 0 &&
          longitude !== 0
            ? {
                latitude: latitude,
                longitude: longitude,
              }
            : undefined,
        billValidatorOptions: formData.billValidatorOptions,
        membershipEnabled: formData.membershipEnabled,
        locationMembershipSettings: formData.locationMembershipSettings,
      };

      // Detect changes by comparing original loaded data with current form data
      const changes = detectChanges(originalData, formDataComparison);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      console.warn('🔍 ORIGINAL DATA:', originalData);
      console.warn('🔍 CURRENT FORM DATA:', formDataComparison);
      console.warn('🔍 ALL DETECTED CHANGES:', changes.length, changes);
      console.warn(
        '🔍 MEANINGFUL CHANGES (after filtering):',
        meaningfulChanges.length,
        meaningfulChanges
      );

      // Only proceed if there are actual changes
      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        setLoading(false);
        return;
      }

      // Build update payload with ONLY changed fields
      const updatePayload: Record<string, unknown> = {
        locationName: locationIdentifier, // Required for API to identify location (actually the ID)
      };

      // Add only the fields that actually changed
      meaningfulChanges.forEach(change => {
        const fieldPath = change.path; // Use full path, not just field name

        // Handle nested fields (e.g., "address.street", "billValidatorOptions.denom5")
        if (fieldPath.includes('.')) {
          const [parent, child] = fieldPath.split('.');

          // Special handling for objects that should be sent in full if any child changes
          if (parent === 'billValidatorOptions' || parent === 'locationMembershipSettings') {
            updatePayload[parent] = (formData as any)[parent];
          } else {
            // For other nested fields (like address.street), build nested object
            if (!updatePayload[parent]) {
              updatePayload[parent] = {};
            }
            (updatePayload[parent] as Record<string, unknown>)[child] =
              change.newValue;
          }
        } else {
          updatePayload[fieldPath] = change.newValue;
        }
      });

      console.warn(
        '🔍 UPDATE PAYLOAD:',
        JSON.stringify(updatePayload, null, 2)
      );

      console.warn('🔍 CALLING PUT /api/locations...');
      const updateResponse = await axios.put('/api/locations', updatePayload);
      console.warn(
        '🔍 UPDATE RESPONSE:',
        updateResponse.status,
        updateResponse.data
      );

      // Log the update activity with proper change tracking
      const changesSummary = getChangesSummary(meaningfulChanges);
      await logActivity(
        'update',
        'location',
        locationIdentifier,
        formData.name,
        `Updated location: ${changesSummary}`,
        locationDetails, // Previous data (actual location document)
        updatePayload, // New data (only changed fields)
        meaningfulChanges.map(change => ({
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        }))
      );

      toast.success(`Location updated successfully: ${changesSummary}`);
      console.warn('Calling onLocationUpdated callback');
      onLocationUpdated?.();
      handleClose();
    } catch (error) {
      console.error('Error updating location:', error);

      // Extract detailed error message from axios error
      let errorMessage = 'Failed to update location';

      if (typeof error === 'object' && error !== null) {
        const axiosError = error as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };

        // Try to get the most specific error message
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen || !selectedLocation) return null;

  // Modal Content - full viewport overlay with high z-index to cover sidebar
  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Responsive Modal */}
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-2 md:items-center md:p-4">
        <div
          ref={modalRef}
          className="max-h-[95vh] w-full max-w-xl overflow-hidden rounded-md bg-container shadow-lg md:max-h-[90vh] lg:max-w-4xl"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <h2 className="flex-1 text-center text-xl font-semibold">
              Edit {selectedLocation.locationName || 'Location'} Details
            </h2>
          </div>

          {/* Form Content */}
          <div className="max-h-[calc(95vh-120px)] space-y-4 overflow-y-auto px-4 pb-4 md:max-h-[calc(90vh-120px)] md:px-8 md:pb-8">
            {locationDetailsLoading ? (
              // Show skeleton content while loading
              <>
                {/* Location Name */}
                <div className="mb-4">
                  <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                </div>

                {/* Address */}
                <div className="mb-4">
                  <div className="mb-2 h-4 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                </div>

                {/* City */}
                <div className="mb-4">
                  <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                </div>

                {/* Licensee */}
                <div className="mb-4">
                  <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                </div>

                {/* Profit Share and Day Start Time */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center">
                    <div className="h-12 w-24 animate-pulse rounded-l-md bg-gray-200" />
                    <div className="h-12 flex-1 animate-pulse rounded-r-md bg-gray-200" />
                  </div>
                  <div className="flex items-center">
                    <div className="h-12 w-24 animate-pulse rounded-l-md bg-gray-200" />
                    <div className="h-12 flex-1 animate-pulse rounded-r-md bg-gray-200" />
                  </div>
                </div>

                {/* No SMIB Location Checkbox */}
                <div className="mb-4 flex justify-center">
                  <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                    <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>

                {/* GEO Coordinates */}
                <div className="mb-4">
                  <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center">
                      <div className="h-12 w-20 animate-pulse rounded-l-md bg-gray-200" />
                      <div className="h-12 flex-1 animate-pulse rounded-r-md bg-gray-200" />
                    </div>
                    <div className="flex items-center">
                      <div className="h-12 w-20 animate-pulse rounded-l-md bg-gray-200" />
                      <div className="h-12 flex-1 animate-pulse rounded-r-md bg-gray-200" />
                    </div>
                  </div>
                </div>

                {/* Bill Validator Options */}
                <div className="mb-4">
                  <div className="mb-3 flex justify-center">
                    <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                      <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {Array.from({ length: 13 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-2 rounded-lg bg-gray-50 p-2"
                      >
                        <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-8 animate-pulse rounded bg-gray-200" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <div className="h-12 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="h-12 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </>
            ) : (
              // Show actual form content when loaded
              <>
                {/* Location ID & Creation Date Display */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">
                        Location ID
                      </h3>
                      <p className="mt-1 font-mono text-sm text-gray-600">
                        {locationDetails?._id ||
                          selectedLocation.location ||
                          'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-sm font-medium text-gray-700">
                        Created
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {locationDetails?.createdAt
                          ? new Date(
                              locationDetails.createdAt
                            ).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Name */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    Location Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-12 w-full border-border bg-container text-base"
                  />
                </div>

                {/* Address */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    Address
                  </label>
                  <Input
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Street"
                    className="h-12 w-full border-border bg-container text-base"
                  />
                </div>

                {/* City */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    City
                  </label>

                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="h-12 w-full border-border bg-container text-base"
                  />
                </div>

                {/* Country and Profit Share - Mobile: Stacked, Desktop: Side by side */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Country */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={e =>
                        handleSelectChange('country', e.target.value)
                      }
                      className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                    >
                      <option value="">Select Country</option>
                      {countriesLoading ? (
                        <option value="" disabled>
                          Loading countries...
                        </option>
                      ) : (
                        countries.map(country => (
                          <option key={country._id} value={country._id}>
                            {country.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Profit Share */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Profit Share (%)
                    </label>
                    <div className="relative">
                      <Input
                        name="profitShare"
                        type="text"
                        value={formData.profitShare}
                        onChange={handleInputChange}
                        onKeyDown={e => {
                          // Prevent non-numeric characters except backspace, delete, tab, escape, enter
                          if (
                            !/[0-9]/.test(e.key) &&
                            ![
                              'Backspace',
                              'Delete',
                              'Tab',
                              'Escape',
                              'Enter',
                              'ArrowLeft',
                              'ArrowRight',
                            ].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                        className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 pr-12 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 transform text-base text-gray-500">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Licensee */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    Licensee <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="licencee"
                    value={formData.licencee}
                    onChange={e =>
                      handleSelectChange('licencee', e.target.value)
                    }
                    className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                    required
                  >
                    <option value="">Select Licensee</option>
                    {licenseesLoading ? (
                      <option value="" disabled>
                        Loading licensees...
                      </option>
                    ) : (
                      licensees.map(licensee => (
                        <option key={licensee._id} value={licensee._id}>
                          {licensee.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Day Start Time */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-grayHighlight">
                    Day Start Time
                  </label>
                  <select
                    name="dayStartTime"
                    value={
                      timeOptions.find(
                        opt => opt.displayValue === formData.dayStartTime
                      )?.value || ''
                    }
                    onChange={e => {
                      const selectedOption = timeOptions.find(
                        opt => opt.value === e.target.value
                      );
                      handleSelectChange(
                        'dayStartTime',
                        selectedOption?.displayValue || e.target.value
                      );
                    }}
                    className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                  >
                    {timeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Membership Configuration Section */}
                <div className="mb-4 rounded-lg border border-gray-200 p-4">
                  <div className="mb-4 flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                    <Checkbox
                      id="membershipEnabled"
                      checked={formData.membershipEnabled}
                      onCheckedChange={checked =>
                        handleCheckboxChange('membershipEnabled', checked === true)
                      }
                      className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                    />
                    <Label
                      htmlFor="membershipEnabled"
                      className="text-lg font-semibold text-gray-800"
                    >
                      Membership Enabled
                    </Label>
                  </div>

                  {formData.membershipEnabled && (
                    <div className="mt-4 space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                            Location Limit
                          </Label>
                          <Input
                            type="number"
                            value={formData.locationMembershipSettings.locationLimit}
                            onChange={e => handleMembershipSettingsChange('locationLimit', parseInt(e.target.value) || 0)}
                            className="h-12 w-full border-border bg-container text-base"
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                            Free Play Amount
                          </Label>
                          <Input
                            type="number"
                            value={formData.locationMembershipSettings.freePlayAmount}
                            onChange={e => handleMembershipSettingsChange('freePlayAmount', parseInt(e.target.value) || 0)}
                            className="h-12 w-full border-border bg-container text-base"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                          <Checkbox
                            id="enablePoints"
                            checked={formData.locationMembershipSettings.enablePoints}
                            onCheckedChange={checked =>
                              handleMembershipSettingsChange('enablePoints', checked === true)
                            }
                          />
                          <Label htmlFor="enablePoints">Enable Points</Label>
                        </div>
                        <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                          <Checkbox
                            id="enableFreePlays"
                            checked={formData.locationMembershipSettings.enableFreePlays}
                            onCheckedChange={checked =>
                              handleMembershipSettingsChange('enableFreePlays', checked === true)
                            }
                          />
                          <Label htmlFor="enableFreePlays">Enable Free Plays</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                            Points Ratio Method
                          </Label>
                          <select
                            value={formData.locationMembershipSettings.pointsRatioMethod}
                            onChange={e => handleMembershipSettingsChange('pointsRatioMethod', e.target.value)}
                            className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                          >
                            <option value="">Select Method</option>
                            <option value="Wager">Wager</option>
                            <option value="Games Played">Games Played</option>
                          </select>
                        </div>
                        <div>
                          <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                            Point Method Value
                          </Label>
                          <Input
                            type="number"
                            value={formData.locationMembershipSettings.pointMethodValue}
                            onChange={e => handleMembershipSettingsChange('pointMethodValue', parseInt(e.target.value) || 0)}
                            className="h-12 w-full border-border bg-container text-base"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                            Games Played Ratio
                          </Label>
                          <Input
                            type="number"
                            value={formData.locationMembershipSettings.gamesPlayedRatio}
                            onChange={e => handleMembershipSettingsChange('gamesPlayedRatio', parseInt(e.target.value) || 0)}
                            className="h-12 w-full border-border bg-container text-base"
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                            Free Play Credits Timeout (min)
                          </Label>
                          <Input
                            type="number"
                            value={formData.locationMembershipSettings.freePlayCreditsTimeout}
                            onChange={e => handleMembershipSettingsChange('freePlayCreditsTimeout', parseInt(e.target.value) || 0)}
                            className="h-12 w-full border-border bg-container text-base"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                          Points Method Game Types
                        </Label>
                        <div className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-3">
                          {['IGT', 'Aristocrat', 'Novomatic', 'Bally', 'Ainsworth', 'EGT', 'Amatic', 'Apollo', 'Apex', 'Spintec', 'Interblock', 'Other'].map(type => (
                            <div key={`points-${type}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`points-${type}`}
                                checked={formData.locationMembershipSettings.pointsMethodGameTypes?.includes(type)}
                                onCheckedChange={() => handleGameTypeToggle('pointsMethodGameTypes', type)}
                              />
                              <Label htmlFor={`points-${type}`} className="text-xs">{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                          Free Play Game Types
                        </Label>
                        <div className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-3">
                          {['IGT', 'Aristocrat', 'Novomatic', 'Bally', 'Ainsworth', 'EGT', 'Amatic', 'Apollo', 'Apex', 'Spintec', 'Interblock', 'Other'].map(type => (
                            <div key={`freeplay-${type}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`freeplay-${type}`}
                                checked={formData.locationMembershipSettings.freePlayGameTypes?.includes(type)}
                                onCheckedChange={() => handleGameTypeToggle('freePlayGameTypes', type)}
                              />
                              <Label htmlFor={`freeplay-${type}`} className="text-xs">{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkboxes - Mobile: Stacked, Desktop: Side by side */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* No SMIB Location Checkbox */}
                  <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                    <Checkbox
                      id="isLocalServer"
                      checked={formData.isLocalServer}
                      onCheckedChange={checked =>
                        handleCheckboxChange('isLocalServer', checked === true)
                      }
                      className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                    />

                    <Label
                      htmlFor="isLocalServer"
                      className="flex-1 text-sm font-medium"
                    >
                      No SMIB Location
                    </Label>
                  </div>

                  {isDeveloper && (
                    <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                      <Checkbox
                        id="useMap"
                        checked={useMap}
                        onCheckedChange={checked => {
                          setUseMap(checked === true);
                          // In edit mode, don't auto-get current location
                          // User can manually pick from the map or enter coordinates
                        }}
                        className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                      />
                      <Label
                        htmlFor="useMap"
                        className="flex-1 text-sm font-medium"
                      >
                        Use Map to Select Location
                      </Label>
                    </div>
                  )}
                </div>

                {/* GEO Coordinates - Mobile: Stacked, Desktop: Side by side */}
                <div className="mb-4">
                  <p className="mb-3 text-sm font-medium">GEO Coordinates</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center">
                      <div className="min-w-[80px] rounded-l-md bg-button px-4 py-3 text-primary-foreground">
                        <span className="text-sm font-medium">Latitude</span>
                      </div>
                      <Input
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        readOnly={useMap}
                        className="h-12 flex-1 rounded-r-md border border-l-0 border-border bg-container text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="min-w-[80px] rounded-l-md bg-button px-4 py-3 text-primary-foreground">
                        <span className="text-sm font-medium">Longitude</span>
                      </div>
                      <Input
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        readOnly={useMap}
                        className="h-12 flex-1 rounded-r-md border border-l-0 border-border bg-container text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Map Component */}
                {useMap && (
                  <div className="mt-4">
                    {/* Map Load Error Indicator */}
                    {mapLoadError && (
                      <div className="relative z-10 mb-2 rounded-md border border-yellow-200 bg-yellow-50 p-2">
                        <p className="text-xs text-yellow-700">
                          ?? Map hasn&apos;t loaded properly. Please uncheck and
                          check the &quot;Use Map&quot; button again. ?? Map
                          hasn&apos;t loaded properly. Please uncheck and check
                          the &quot;Use Map&quot; button again.
                        </p>
                      </div>
                    )}
                    <LocationsLocationPickerMap
                      initialLat={
                        formData.latitude
                          ? parseFloat(formData.latitude)
                          : 10.6599 // Trinidad center for map display when no coords
                      }
                      initialLng={
                        formData.longitude
                          ? parseFloat(formData.longitude)
                          : -61.5199 // Trinidad center for map display when no coords
                      }
                      mapType="street"
                      onLocationSelect={handleLocationSelect}
                      onMapLoadError={handleMapLoadError}
                      onMapLoadSuccess={handleMapLoadSuccess}
                    />
                  </div>
                )}

                {/* Bill Validator Options */}
                <div className="mb-4">
                  <div className="mb-3 flex justify-center">
                    <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                      <Checkbox
                        id="billValidatorOptions"
                        checked={Object.values(
                          formData.billValidatorOptions
                        ).every(checked => checked)}
                        onCheckedChange={checked => {
                          // Toggle all bill validator options
                          const allChecked = checked === true;
                          setFormData(prev => ({
                            ...prev,
                            billValidatorOptions: {
                              denom1: allChecked,
                              denom2: allChecked,
                              denom5: allChecked,
                              denom10: allChecked,
                              denom20: allChecked,
                              denom50: allChecked,
                              denom100: allChecked,
                              denom200: allChecked,
                              denom500: allChecked,
                              denom1000: allChecked,
                              denom2000: allChecked,
                              denom5000: allChecked,
                              denom10000: allChecked,
                            },
                          }));
                        }}
                        className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                      />
                      <Label
                        htmlFor="billValidatorOptions"
                        className="text-sm font-medium"
                      >
                        Bill Validator Options (Check All)
                      </Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {[
                      { denom: 1, label: '$1' },
                      { denom: 2, label: '$2' },
                      { denom: 5, label: '$5' },
                      { denom: 10, label: '$10' },
                      { denom: 20, label: '$20' },
                      { denom: 50, label: '$50' },
                      { denom: 100, label: '$100' },
                      { denom: 200, label: '$200' },
                      { denom: 500, label: '$500' },
                      { denom: 1000, label: '$1,000' },
                      { denom: 2000, label: '$2,000' },
                      { denom: 5000, label: '$5,000' },
                      { denom: 10000, label: '$10,000' },
                    ].map(({ denom, label }) => (
                      <div
                        key={denom}
                        className="flex items-center space-x-2 rounded-lg bg-gray-50 p-2"
                      >
                        <Checkbox
                          id={`denom-${denom}`}
                          checked={
                            (formData.billValidatorOptions as any)[
                              `denom${denom}`
                            ]
                          }
                          onCheckedChange={checked =>
                            handleBillValidatorChange(
                              `denom${denom}`,
                              checked === true
                            )
                          }
                          className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                        />
                        <Label
                          htmlFor={`denom-${denom}`}
                          className="flex-1 text-sm font-medium"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Actions */}
                <div className="mt-6 flex flex-row justify-center gap-3">
                  <Button
                    className="h-12 flex-1 bg-button px-6 py-3 text-base text-primary-foreground hover:bg-button/90 sm:w-auto sm:flex-initial"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 flex-1 border-button px-6 py-3 text-base text-button hover:bg-button/10 sm:w-auto sm:flex-initial"
                    onClick={handleClose}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
