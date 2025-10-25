'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocationActionsStore } from '@/lib/store/locationActionsStore';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { useUserStore } from '@/lib/store/userStore';

import type { EditLocationModalProps } from '@/lib/types/components';
// Activity logging will be handled via API calls
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { Licensee } from '@/lib/types/licensee';

import { fetchCountries } from '@/lib/helpers/countries';
import type { Country } from '@/lib/helpers/countries';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';

import LocationPickerMap from './LocationPickerMap';
import { SelectedLocation } from '@/lib/types/maps';

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
  createdAt?: Date | string;
};

export default function EditLocationModal({
  onLocationUpdated,
}: EditLocationModalProps) {
  const { isEditModalOpen, selectedLocation, closeEditModal } =
    useLocationActionsStore();
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
    country: 'Guyana',
    profitShare: '50',
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
      const licenseesData = await fetchLicensees();
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
        country: 'Guyana', // Default since AggregatedLocation doesn't have this
        profitShare: '50', // Will be loaded from locationDetails
        licencee: '', // Will be loaded from locationDetails
        isLocalServer: selectedLocation.isLocalServer || false,
        latitude: '8.909985', // Will be loaded from locationDetails
        longitude: '-58.186204', // Will be loaded from locationDetails
        dayStartTime: '08:00', // Will be loaded from locationDetails
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
    setFormData(prev => ({
      ...prev,
      latitude: location.lat.toFixed(6),
      longitude: location.lng.toFixed(6),
      ...(location.city && { city: location.city }),
      ...(location.country && { country: location.country }),
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

  // Update form data when location details are fetched
  useEffect(() => {
    if (locationDetails) {
      // Convert gameDayOffset to time format (e.g., 11 -> "11:00")
      const gameDayOffset = locationDetails.gameDayOffset || 8; // Default to 8 AM
      const dayStartTime = `${gameDayOffset.toString().padStart(2, '0')}:00`;

      setFormData(prev => ({
        ...prev,
        name: locationDetails.name || prev.name,
        street: locationDetails.address?.street || prev.street,
        city: locationDetails.address?.city || prev.city,
        country: locationDetails.country || prev.country,
        profitShare:
          locationDetails.profitShare?.toString() || prev.profitShare,
        licencee: locationDetails.rel?.licencee || prev.licencee,
        isLocalServer: locationDetails.isLocalServer || prev.isLocalServer,
        latitude:
          locationDetails.geoCoords?.latitude?.toString() || prev.latitude,
        longitude:
          locationDetails.geoCoords?.longitude?.toString() || prev.longitude,
        dayStartTime: dayStartTime,
        billValidatorOptions:
          locationDetails.billValidatorOptions || prev.billValidatorOptions,
      }));
    }
  }, [locationDetails]);

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

      const locationData = {
        locationName: locationIdentifier,
        name: formData.name,
        address: {
          street: formData.street,
          city: formData.city,
        },
        country: formData.country,
        profitShare: parseInt(formData.profitShare),
        gameDayOffset: gameDayOffset,
        rel: {
          licencee: formData.licencee,
        },
        isLocalServer: formData.isLocalServer,
        geoCoords: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        },
        billValidatorOptions: formData.billValidatorOptions,
      };

      // Detect actual changes between old and new location data
      const changes = detectChanges(selectedLocation, locationData);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      // Only proceed if there are actual changes
      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        setLoading(false);
        return;
      }

      await axios.put('/api/locations', locationData);

      // Log the update activity with proper change tracking
      const changesSummary = getChangesSummary(meaningfulChanges);
      await logActivity(
        'update',
        'location',
        locationIdentifier,
        formData.name,
        `Updated location: ${changesSummary}`,
        selectedLocation, // Previous data
        locationData, // New data
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
      toast.error('Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen || !selectedLocation) return null;

  // Desktop View Modal Content
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Responsive Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4">
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

                  {/* Map Toggle */}
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
                          ⚠️ Map hasn&apos;t loaded properly. Please uncheck and
                          check the &quot;Use Map&quot; button again. ⚠️ Map
                          hasn&apos;t loaded properly. Please uncheck and check
                          the &quot;Use Map&quot; button again.
                        </p>
                      </div>
                    )}
                    <LocationPickerMap
                      initialLat={
                        formData.latitude
                          ? parseFloat(formData.latitude)
                          : 10.6599
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
                )}

                {/* Bill Validator Options */}
                <div className="mb-4">
                  <div className="mb-3 flex justify-center">
                    <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                      <Checkbox
                        id="billValidatorOptions"
                        checked={Object.values(
                          formData.billValidatorOptions
                        ).some(checked => checked)}
                        className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                        disabled
                      />
                      <Label
                        htmlFor="billValidatorOptions"
                        className="text-sm font-medium"
                      >
                        Bill Validator Options
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
                            formData.billValidatorOptions[
                              `denom${denom}` as keyof typeof formData.billValidatorOptions
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
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    className="h-12 w-full bg-button px-6 py-3 text-base text-primary-foreground hover:bg-button/90 sm:w-auto"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full border-button px-6 py-3 text-base text-button hover:bg-button/10 sm:w-auto"
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
