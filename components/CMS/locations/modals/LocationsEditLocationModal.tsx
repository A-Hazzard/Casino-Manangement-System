/**
 * Locations Edit Location Modal Component
 *
 * Modal for editing existing location details.
 *
 * @module components/locations/LocationsEditLocationModal
 */
'use client';

import { ChangeEvent } from 'react';
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
import { fetchLicencees } from '@/lib/helpers/client';
import type { Licencee } from '@/lib/types/common';

import { fetchCountries } from '@/lib/helpers/countries';
import type { Country } from '@/lib/types/common';
import {
  detectChanges,
  filterMeaningfulChanges,
} from '@/lib/utils/changeDetection';

import type { AggregatedLocation } from '@/shared/types';
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
  aceEnabled?: boolean;
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
  googleMapsLink?: string;
  googleMapsIframe?: string;
  previousCollectionTime?: string | Date;
  createdAt?: Date | string;
};

export default function LocationsEditLocationModal({
  onLocationUpdated,
}: EditLocationModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { isEditModalOpen, selectedLocation, closeEditModal } =
    useLocationsActionsStore();
  const { user } = useUserStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [locationDetails, setLocationDetails] =
    useState<LocationDetails | null>(null);
  const [locationDetailsLoading, setLocationDetailsLoading] = useState(false);
  const [licencees, setLicencees] = useState<Licencee[]>([]);
  const [licenceesLoading, setLicenceesLoading] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  const [useMap, setUseMap] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  const isDeveloper = Array.isArray(user?.roles)
    ? user?.roles.includes('developer')
    : false;
 
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
    googleMapsLink: '',
    googleMapsIframe: '',
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
    aceEnabled: false,
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
    previousCollectionTime: '',
  });
 
  // Store original form data exactly as loaded from API for accurate comparison
  const [originalFormData, setOriginalFormData] = useState<
    typeof formData | null
  >(null);
  // Auto-extract coordinates from Google Maps link
  useEffect(() => {
    if (!formData.googleMapsLink) return;

    // 1. Try to find the !3d...!4d pattern (usually more accurate marker position in long URLs)
    const dataMatch = formData.googleMapsLink.match(/!3d([-0-9.]+)!4d([-0-9.]+)/);
    // 2. Try to find the @lat,lng pattern (viewport center)
    const atMatch = formData.googleMapsLink.match(/@([-0-9.]+),([-0-9.]+)/);
    // 3. Try to find query params q=lat,lng or ll=lat,lng
    const qMatch = formData.googleMapsLink.match(/[?&](?:q|ll)=([-0-9.]+),([-0-9.]+)/);
    // 4. Try to find search or place patterns
    const searchMatch = formData.googleMapsLink.match(/\/(?:search|place)\/([-0-9.]+),([-0-9.]+)/);

    const match = dataMatch || atMatch || qMatch || searchMatch;

    if (match && match.length >= 3) {
      const lat = match[1];
      const lng = match[2];
      
      // Only update if they are actually different to avoid infinite loops or unnecessary re-renders
      if (lat !== formData.latitude || lng !== formData.longitude) {
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        toast.info(`Extracted coordinates: ${lat}, ${lng}`);
      }
    }
  }, [formData.googleMapsLink, formData.latitude, formData.longitude]);
 
  useEffect(() => {
    if (!isDeveloper && useMap) {
      setUseMap(false);
    }
  }, [isDeveloper, useMap]);

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

  // ============================================================================
  // Computed
  // ============================================================================
  const timeOptions = generateTimeOptions();

  // ============================================================================
  // Handlers
  // ============================================================================
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

  // Load licencees
  const loadLicencees = async () => {
    setLicenceesLoading(true);
    try {
      const result = await fetchLicencees();
      const licenceesData = Array.isArray(result.licencees)
        ? result.licencees
        : [];
      setLicencees(licenceesData);
    } catch (error) {
      console.error('Failed to fetch licencees:', error);
      toast.error('Failed to load licencees');
    } finally {
      setLicenceesLoading(false);
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

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (!isEditModalOpen) return;

    const locationId =
      (selectedLocation._id as string) ||
      (selectedLocation.location as string) ||
      (typeof selectedLocation.location === 'string'
        ? selectedLocation.location
        : '') ||
      (selectedLocation as AggregatedLocation & { id?: string }).id;

    if (locationId && typeof locationId === 'string' && locationId.length > 5) {
      // Fetch full location details to get billValidatorOptions and other fields
      fetchLocationDetails(locationId);
    } else if (isEditModalOpen) {
      // Only log error if the modal is actually open and we can't find an ID
      console.error(
        '[EditLocationModal] Invalid locationId:',
        locationId,
        selectedLocation
      );
    }

    setFormData({
      name: selectedLocation.locationName || '',
      street: '', // Will be loaded from locationDetails
      city: '', // Will be loaded from locationDetails
      country: selectedLocation.country || '', // Use country from selectedLocation if available
      profitShare: '', // Will be loaded from locationDetails
      licencee: selectedLocation.rel?.licencee || '', // Use licencee from selectedLocation
      isLocalServer: selectedLocation.isLocalServer || false,
      latitude:
        selectedLocation.geoCoords?.latitude?.toString() ||
        selectedLocation.geoCoords?.lat?.toString() ||
        '',
      longitude:
        selectedLocation.geoCoords?.longitude?.toString() ||
        selectedLocation.geoCoords?.lng?.toString() ||
        '',
      googleMapsLink: selectedLocation.googleMapsLink || '',
      googleMapsIframe: selectedLocation.googleMapsIframe || '',
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
      membershipEnabled: selectedLocation.membershipEnabled || false,
      aceEnabled: selectedLocation.aceEnabled || false,
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
      previousCollectionTime: '',
    });
  }, [selectedLocation, isEditModalOpen]);

  // Load licencees and countries when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      loadLicencees();
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

  // Get user's current location when map is enabled
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
      },
      error => {
        console.error('Error getting current location:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 600000, // 5 minutes
      }
    );
  };

  useEffect(() => {
    if (locationDetails) {
      console.warn('🔍 LOCATION DETAILS LOADED:', {
        name: locationDetails.name,
        country: locationDetails.country,
        _id: locationDetails._id,
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
        googleMapsLink: locationDetails.googleMapsLink || '',
        googleMapsIframe: locationDetails.googleMapsIframe || '',
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
        aceEnabled: locationDetails.aceEnabled || false,
        locationMembershipSettings: {
          locationLimit:
            locationDetails.locationMembershipSettings?.locationLimit || 0,
          freePlayAmount:
            locationDetails.locationMembershipSettings?.freePlayAmount || 0,
          enablePoints:
            locationDetails.locationMembershipSettings?.enablePoints || false,
          enableFreePlays:
            locationDetails.locationMembershipSettings?.enableFreePlays ||
            false,
          pointsRatioMethod:
            locationDetails.locationMembershipSettings?.pointsRatioMethod || '',
          pointMethodValue:
            locationDetails.locationMembershipSettings?.pointMethodValue || 0,
          gamesPlayedRatio:
            locationDetails.locationMembershipSettings?.gamesPlayedRatio || 0,
          pointsMethodGameTypes:
            locationDetails.locationMembershipSettings?.pointsMethodGameTypes ||
            [],
          freePlayGameTypes:
            locationDetails.locationMembershipSettings?.freePlayGameTypes || [],
          freePlayCreditsTimeout:
            locationDetails.locationMembershipSettings
              ?.freePlayCreditsTimeout || 0,
        },
        previousCollectionTime: locationDetails.previousCollectionTime
          ? new Date(locationDetails.previousCollectionTime)
              .toISOString()
              .slice(0, 16)
          : '',
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


  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleMembershipSettingsChange = (
    name: string,
    value: string | number | boolean | string[]
  ) => {
    setFormData(prev => ({
      ...prev,
      locationMembershipSettings: {
        ...prev.locationMembershipSettings,
        [name]: value,
      },
    }));
  };

  const handleGameTypeToggle = (
    setting: 'pointsMethodGameTypes' | 'freePlayGameTypes',
    gameType: string
  ) => {
    setFormData(prev => {
      const current =
        (prev.locationMembershipSettings[
          setting as keyof typeof prev.locationMembershipSettings
        ] as string[]) || [];
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
        aceEnabled: originalFormData.aceEnabled,
        locationMembershipSettings: originalFormData.locationMembershipSettings,
        googleMapsLink: originalFormData.googleMapsLink,
        googleMapsIframe: originalFormData.googleMapsIframe,
        previousCollectionTime: originalFormData.previousCollectionTime ? new Date(originalFormData.previousCollectionTime).toISOString() : null,
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
        aceEnabled: formData.aceEnabled,
        googleMapsLink: formData.googleMapsLink,
        googleMapsIframe: formData.googleMapsIframe,
        locationMembershipSettings: formData.locationMembershipSettings,
        previousCollectionTime: formData.previousCollectionTime ? new Date(formData.previousCollectionTime).toISOString() : null,
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
          if (
            parent === 'billValidatorOptions' ||
            parent === 'locationMembershipSettings'
          ) {
            updatePayload[parent] = (formData as Record<string, unknown>)[
              parent
            ];
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

      toast.success('Location updated successfully');
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

  // ============================================================================
  // Render
  // ============================================================================
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
          className="edit-location-modal max-h-[95vh] w-full max-w-xl overflow-hidden rounded-md bg-container shadow-lg md:max-h-[90vh] lg:max-w-4xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <h2 className="flex-1 text-center text-xl font-semibold">
              Edit {selectedLocation.locationName || 'Location'} Details
            </h2>
          </div>

          {/* Form Content */}
          <div className="max-h-[calc(95vh-120px)] space-y-4 overflow-y-auto px-4 pb-4 md:max-h-[calc(90vh-120px)] md:px-8 md:pb-8">
            {/* Form Fields Section */}
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
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-700">
                    Last Collection Time
                  </h3>
                  <div className="mt-1 font-mono text-sm text-gray-600">
                    {locationDetailsLoading ? (
                      <div className="h-4 w-32 animate-pulse mx-auto rounded bg-gray-200" />
                    ) : formData.previousCollectionTime ? (
                      new Date(formData.previousCollectionTime).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      'Unknown'
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-medium text-gray-700">Created</h3>
                  <div className="mt-1 text-sm text-gray-600">
                    {locationDetailsLoading && !locationDetails?.createdAt ? (
                      <div className="h-4 w-24 animate-pulse ml-auto rounded bg-gray-200" />
                    ) : locationDetails?.createdAt ? (
                      new Date(locationDetails.createdAt).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                    ) : (
                      'Unknown'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Name */}
            <div className="mb-4">
              <Label
                htmlFor="edit-location-name"
                className="mb-2 block text-sm font-medium text-grayHighlight"
              >
                Location Name
              </Label>
              <Input
                id="edit-location-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="h-12 w-full border-border bg-container text-base"
              />
            </div>
 


            {/* Address */}
            <div className="mb-4">
              <Label
                htmlFor="edit-location-street"
                className="mb-2 block text-sm font-medium text-grayHighlight"
              >
                Address
              </Label>
              {locationDetailsLoading && !formData.street ? (
                <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
              ) : (
                <Input
                  id="edit-location-street"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Street"
                  className="h-12 w-full border-border bg-container text-base"
                />
              )}
            </div>

            {/* City */}
            <div className="mb-4">
              <Label
                htmlFor="edit-location-city"
                className="mb-2 block text-sm font-medium text-grayHighlight"
              >
                City
              </Label>
              {locationDetailsLoading && !formData.city ? (
                <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
              ) : (
                <Input
                  id="edit-location-city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="City"
                  className="h-12 w-full border-border bg-container text-base"
                />
              )}
            </div>

            {/* Country and Profit Share */}
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Country */}
              <div>
                <label
                  htmlFor="edit-country"
                  className="mb-2 block text-sm font-medium text-grayHighlight"
                >
                  Country
                </label>
                {countriesLoading ||
                (locationDetailsLoading && !formData.country) ? (
                  <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                ) : (
                  <select
                    id="edit-country"
                    name="country"
                    title="Select country"
                    value={formData.country}
                    onChange={e =>
                      handleSelectChange('country', e.target.value)
                    }
                    className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country._id} value={country._id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Profit Share */}
              <div>
                <Label
                  htmlFor="edit-profit-share"
                  className="mb-2 block text-sm font-medium text-grayHighlight"
                >
                  Profit Share (%)
                </Label>
                {locationDetailsLoading && !formData.profitShare ? (
                  <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                ) : (
                  <div className="relative">
                    <input
                      id="edit-profit-share"
                      name="profitShare"
                      type="text"
                      title="Profit Share percentage"
                      placeholder="0"
                      value={formData.profitShare}
                      onChange={handleInputChange}
                      onKeyDown={e => {
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
                )}
              </div>
            </div>

            {/* Licencee */}
            <div className="mb-4">
              <label
                htmlFor="edit-licencee"
                className="mb-2 block text-sm font-medium text-grayHighlight"
              >
                Licencee <span className="text-red-500">*</span>
              </label>
              {licenceesLoading ? (
                <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
              ) : (
                <select
                  id="edit-licencee"
                  name="licencee"
                  title="Select licencee"
                  value={formData.licencee}
                  onChange={e => handleSelectChange('licencee', e.target.value)}
                  className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                  required
                >
                  <option value="">Select Licencee</option>
                  {licencees.map(licencee => (
                    <option key={licencee._id} value={licencee._id}>
                      {licencee.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Day Start Time */}
            <div className="mb-4">
              <label
                htmlFor="edit-dayStartTime"
                className="mb-2 block text-sm font-medium text-grayHighlight"
              >
                Day Start Time
              </label>
              {locationDetailsLoading && !formData.dayStartTime ? (
                <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
              ) : (
                <select
                  id="edit-dayStartTime"
                  name="dayStartTime"
                  title="Select day start time"
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
              )}
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

              <div className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <Checkbox
                  id="aceEnabled"
                  checked={formData.aceEnabled}
                  onCheckedChange={checked =>
                    handleCheckboxChange('aceEnabled', checked === true)
                  }
                  className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                />
                <Label
                  htmlFor="aceEnabled"
                  className="text-lg font-semibold text-gray-800"
                >
                  Ace Enabled
                </Label>
              </div>

              {formData.membershipEnabled && (
                <div className="mt-4 space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                        Location Limit
                      </Label>
                      {locationDetailsLoading ? (
                        <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                      ) : (
                        <Input
                          type="number"
                          value={
                            formData.locationMembershipSettings.locationLimit
                          }
                          onChange={e =>
                            handleMembershipSettingsChange(
                              'locationLimit',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-12 w-full border-border bg-container text-base"
                        />
                      )}
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                        Free Play Amount
                      </Label>
                      {locationDetailsLoading ? (
                        <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                      ) : (
                        <Input
                          type="number"
                          value={
                            formData.locationMembershipSettings.freePlayAmount
                          }
                          onChange={e =>
                            handleMembershipSettingsChange(
                              'freePlayAmount',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-12 w-full border-border bg-container text-base"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                      <Checkbox
                        id="enablePoints"
                        checked={
                          formData.locationMembershipSettings.enablePoints
                        }
                        onCheckedChange={checked =>
                          handleMembershipSettingsChange(
                            'enablePoints',
                            checked === true
                          )
                        }
                      />
                      <Label htmlFor="enablePoints">Enable Points</Label>
                    </div>
                    <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                      <Checkbox
                        id="enableFreePlays"
                        checked={
                          formData.locationMembershipSettings.enableFreePlays
                        }
                        onCheckedChange={checked =>
                          handleMembershipSettingsChange(
                            'enableFreePlays',
                            checked === true
                          )
                        }
                      />
                      <Label htmlFor="enableFreePlays">Enable Free Plays</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="edit-pointsRatioMethod"
                        className="mb-2 block text-sm font-medium text-grayHighlight"
                      >
                        Points Ratio Method
                      </Label>
                      {locationDetailsLoading ? (
                        <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                      ) : (
                        <select
                          id="edit-pointsRatioMethod"
                          title="Select points ratio method"
                          value={
                            formData.locationMembershipSettings
                              .pointsRatioMethod
                          }
                          onChange={e =>
                            handleMembershipSettingsChange(
                              'pointsRatioMethod',
                              e.target.value
                            )
                          }
                          className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                        >
                          <option value="">Select Method</option>
                          <option value="Wager">Wager</option>
                          <option value="Games Played">Games Played</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                        Point Method Value
                      </Label>
                      {locationDetailsLoading ? (
                        <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                      ) : (
                        <Input
                          type="number"
                          value={
                            formData.locationMembershipSettings.pointMethodValue
                          }
                          onChange={e =>
                            handleMembershipSettingsChange(
                              'pointMethodValue',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-12 w-full border-border bg-container text-base"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                        Games Played Ratio
                      </Label>
                      {locationDetailsLoading ? (
                        <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                      ) : (
                        <Input
                          type="number"
                          value={
                            formData.locationMembershipSettings.gamesPlayedRatio
                          }
                          onChange={e =>
                            handleMembershipSettingsChange(
                              'gamesPlayedRatio',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-12 w-full border-border bg-container text-base"
                        />
                      )}
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                        Free Play Credits Timeout (min)
                      </Label>
                      {locationDetailsLoading ? (
                        <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
                      ) : (
                        <Input
                          type="number"
                          value={
                            formData.locationMembershipSettings
                              .freePlayCreditsTimeout
                          }
                          onChange={e =>
                            handleMembershipSettingsChange(
                              'freePlayCreditsTimeout',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-12 w-full border-border bg-container text-base"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Points Method Game Types
                    </Label>
                    {locationDetailsLoading ? (
                      <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-3">
                        {['Slot', 'Roulette', 'Pulse'].map(type => (
                          <div
                            key={`points-${type}`}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`points-${type}`}
                              checked={formData.locationMembershipSettings.pointsMethodGameTypes?.includes(
                                type
                              )}
                              onCheckedChange={() =>
                                handleGameTypeToggle(
                                  'pointsMethodGameTypes',
                                  type
                                )
                              }
                            />
                            <Label
                              htmlFor={`points-${type}`}
                              className="text-xs"
                            >
                              {type}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Free Play Game Types
                    </Label>
                    {locationDetailsLoading ? (
                      <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-3">
                        {['Slot', 'Roulette', 'Pulse'].map(type => (
                          <div
                            key={`freeplay-${type}`}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`freeplay-${type}`}
                              checked={formData.locationMembershipSettings.freePlayGameTypes?.includes(
                                type
                              )}
                              onCheckedChange={() =>
                                handleGameTypeToggle('freePlayGameTypes', type)
                              }
                            />
                            <Label
                              htmlFor={`freeplay-${type}`}
                              className="text-xs"
                            >
                              {type}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Checkboxes */}
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* SMIB Type — read-only, auto-computed by the API based on machine relayId values */}
              <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium">SMIB Type</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      selectedLocation?.fullSMIBs
                        ? 'bg-blue-100 text-blue-700'
                        : selectedLocation?.semiSMIBs
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedLocation?.fullSMIBs
                      ? 'Full SMIB'
                      : selectedLocation?.semiSMIBs
                        ? 'Semi SMIB'
                        : 'No SMIB'}
                  </span>
                </div>
              </div>

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
                  Local Server
                </Label>
              </div>

              {isDeveloper && (
                <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                  <Checkbox
                    id="useMap"
                    checked={useMap}
                    onCheckedChange={checked => {
                      setUseMap(checked === true);
                      if (checked === true) {
                        getCurrentLocation();
                      }
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

            {/* Google Maps Integration Section */}
            <div className="mb-6 space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
              <h3 className="flex items-center text-sm font-semibold text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Google Maps Integration
              </h3>
              
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Google Maps Link */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-blue-700">
                    Google Maps URL (Auto-fills Coordinates)
                  </label>
                  <Input
                    name="googleMapsLink"
                    value={formData.googleMapsLink}
                    onChange={handleInputChange}
                    placeholder="https://www.google.com/maps/place/..."
                    className="h-10 w-full border-blue-200 bg-white text-sm focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>

                {/* Google Maps Iframe */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-blue-700">
                    Google Maps Iframe (Optional Embed Code)
                  </label>
                  <Input
                    name="googleMapsIframe"
                    value={formData.googleMapsIframe}
                    onChange={handleInputChange}
                    placeholder='<iframe src="..." ...></iframe>'
                    className="h-10 w-full border-blue-200 bg-white text-sm focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
              </div>
              
              {(formData.googleMapsLink || formData.googleMapsIframe) && (
                <div className="mt-2 text-[10px] text-blue-600">
                  {formData.googleMapsLink && !formData.latitude && (
                    <p>?? Tip: If coordinates didn&apos;t extract, try copying the URL directly from your browser&apos;s address bar while viewing the location.</p>
                  )}
                  {formData.googleMapsIframe && (
                    <p>? Iframe detected. This will be used for the location preview below.</p>
                  )}
                </div>
              )}
            </div>

            {/* GEO Coordinates */}
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

            {/* Map Component or Iframe Preview */}
            {(useMap || (formData.latitude && formData.longitude) || formData.googleMapsIframe) && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                {useMap || (formData.latitude && formData.longitude && formData.googleMapsLink) ? (
                  <div className="relative">
                    {mapLoadError && (
                      <div className="relative z-10 mb-2 rounded-md border border-yellow-200 bg-yellow-50 p-2">
                        <p className="text-xs text-yellow-700">
                          ⚠️ Map hasn&apos;t loaded properly. Please uncheck and
                          check the &quot;Use Map&quot; button again.
                        </p>
                      </div>
                    )}
                    <LocationsLocationPickerMap
                      initialLat={
                        formData.latitude ? parseFloat(formData.latitude) : 10.6599
                      }
                      initialLng={
                        formData.longitude
                          ? parseFloat(formData.longitude)
                          : -61.5199
                      }
                      mapType="street"
                      onLocationSelect={handleLocationSelect}
                      onMapLoadError={handleMapLoadError}
                      onMapLoadSuccess={handleMapLoadSuccess}
                    />
                  </div>
                ) : formData.googleMapsIframe ? (
                  <div 
                    className="h-[300px] w-full"
                    dangerouslySetInnerHTML={{ 
                      __html: formData.googleMapsIframe.replace(/width="[0-9%]+"/, 'width="100%"').replace(/height="[0-9]+"/, 'height="300"') 
                    }} 
                  />
                ) : null}
              </div>
            )}

            {/* Bill Validator Options */}
            <div className="mb-4">
              <div className="mb-3 flex justify-center">
                <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                  <Checkbox
                    id="billValidatorOptions"
                    checked={Object.values(formData.billValidatorOptions).every(
                      checked => checked
                    )}
                    onCheckedChange={checked => {
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
                {locationDetailsLoading
                  ? Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-10 w-full animate-pulse rounded bg-gray-200"
                      />
                    ))
                  : [
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
                            (
                              formData.billValidatorOptions as Record<
                                string,
                                unknown
                              >
                            )[`denom${denom}`] as boolean
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
          </div>
        </div>
      </div>
    </div>
  );
}
